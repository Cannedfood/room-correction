import { generateClick, generateSineSweep } from '../Wavegen';
import type { MeasureCommand, MeasurementResponse } from './worklet/MeasurementProcessor';
import _ from 'lodash';

import { WaveFile } from 'wavefile'

class BatchCommand {
	private commands = [] as MeasureCommand[];
	private pendingCommands = {} as {
		[commandId: number]: (result?: Float32Array) => void
	}
	private awaitCommand<T>(id: number) {
		return new Promise<T>((resolve, reject) => {
			this.pendingCommands[id] = (result => resolve(result as unknown as T));
		});
	}
	play(sampleChannels: (Float32Array|undefined)[], delaySamples?: number) {
		const id = Math.random();
		this.commands.push({
			type: 'play',
			commandId: id,
			cursor: -(delaySamples ?? 0),
			samples: sampleChannels
		});
		return this.awaitCommand<void>(id);
	}
	record(channel: number, numSamples: number, delaySamples?: number)  {
		const id = Math.random();
		this.commands.push({
			type: 'record',
			channel,
			commandId: id,
			cursor: -(delaySamples ?? 0),
			samples: numSamples
		});
		return this.awaitCommand<Float32Array>(id);
	}
	submit(node: AudioWorkletNode) {
		return new Promise<void>(
			resolve => {
				const onMessage = (e: MessageEvent<MeasurementResponse>) => {
					const res = e.data;
					const callback = this.pendingCommands[res.commandId];
					callback(res.result);
					delete this.pendingCommands[res.commandId];
					if(Object.keys(this.pendingCommands).length == 0) {
						node.port.onmessage = () => {};
						resolve();
					}
				};
				node.port.onmessage = onMessage;
				node.port.postMessage(this.commands);
			}
		)
	}
};

export class AudioMeasurementContext {
	public device:          MediaStream = null!;
	public inputSource:     MediaStreamAudioSourceNode = null!;
	public measurementNode: AudioWorkletNode = null!;

	constructor(public context: AudioContext) {}

	async start() {
		this.device  = await navigator.mediaDevices.getUserMedia({ audio: true });

		this.measurementNode = await createAudioWorklet(this.context, 'measure', {
			channelCount: 2,
			outputChannelCount: [2],
			channelCountMode: 'explicit',
			channelInterpretation: 'speakers',
			numberOfInputs: 1,
			numberOfOutputs: 1,
		});
		this.inputSource = this.context.createMediaStreamSource(this.device);

		connectChain(
			this.inputSource,
			this.measurementNode,
			this.context.destination
		);

		await delay(200);
	}

	stop() {
		if(this.device) {
			this.device.getTracks() // get all tracks from the MediaStream
			.forEach( track => track.stop() );
		}
	}

	async measureDelay(options: { rounds: number, channels: number, minDelaySeconds: number, maxDelaySeconds: number, maxInterChannelDelay: number }) {
		const clickDistance = this.context.sampleRate * options.maxInterChannelDelay;

		// Calculate click times
		const clickChannels = [] as number[];
		const clickTimes    = [] as number[];
		let   totalTime = 0;
		for(let round = 0; round < options.rounds; round++) {
			for(let channel = 0; channel < options.channels; channel++) {
				clickTimes.push(totalTime);
				clickChannels.push(channel);
				totalTime += clickDistance;
			}
		}

		// Play/record clicks
		const click = generateClick(this.context.sampleRate, options.maxInterChannelDelay / 2);
		let recording: Float32Array = undefined!;
		const q = new BatchCommand();
		for(let i = 0; i < clickTimes.length; i++) {
			const stuff = new Array<Float32Array>();
			stuff[clickChannels[i]] = click;
			q.play(stuff, clickTimes[i]);
		}
		q.record(0, totalTime + this.context.sampleRate*options.maxDelaySeconds, 0)
		 .then(r => recording = r!);
		await q.submit(this.measurementNode);

		console.log(`R: ${this.context.sampleRate} Rec: ${recording.length} -> ${recording.length/this.context.sampleRate}s`);

		// Detect clicks in recording
		const peakTimes = findNPeaks(clickTimes.length, recording);

		for(let i = 0; i < peakTimes.length; i++) {
			const v = Math.abs(recording[peakTimes[i]]);
			const delay = 1000 * (peakTimes[i] - clickTimes[i]) / this.context.sampleRate;
			console.log(`Ch: ${clickChannels[i]} Delay: ${delay}ms Confidence: ${v}`);
		}

		// this.saveWav(recording);
		return recording;
	}

	playClicks() {
		const click = generateClick(this.context.sampleRate);
		const numClicks = 2;

		const queue = new BatchCommand();
		for(let i = 0; i < numClicks; i++) {
			queue.play([click, click], i * this.context.sampleRate);
		}
		return queue.submit(this.measurementNode);
	}

	playAndRecord(samples: (Float32Array|undefined)[], delaySeconds: number) {
		const maxLength = _.max(samples.map(s => s?.length ?? 0))!;

		const delaySamples = delaySeconds * this.context.sampleRate;

		const queue = new BatchCommand();
		queue.play(samples, Math.max(0, -delaySamples));
		const recording = queue.record(0, maxLength, Math.max(0, delaySamples));
		queue.submit(this.measurementNode);
		return recording;
	}

	pingAndSweep() {
		const click = generateClick(this.context.sampleRate);
		const sweep = generateSineSweep(this.context.sampleRate, 20, 20000, 1, .8);
		const numClicks = 3;

		const queue = new BatchCommand();

		for(let i = 0; i < numClicks; i++) {
			queue.play([click, click], i * this.context.sampleRate);
		}
		queue.play([sweep, undefined], numClicks * this.context.sampleRate);
		queue.play([undefined, sweep], numClicks * this.context.sampleRate + sweep.length);

		return queue.submit(this.measurementNode);
	}

	saveWav(filename: string, samples: Float32Array | Float32Array[] | number[] | number[][]) {
		const wav = new WaveFile();
		wav.fromScratch(1, this.context.sampleRate, "32f", samples);

		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([wav.toBuffer()], { type: 'audio/x-wav' }));
		link.download = filename;
		link.click();
	}
}

function delay(millis: number) {
	return new Promise(resolve => setTimeout(resolve, millis));
}

function findNPeaks(n: number, samples: Float32Array) {
	const results = [] as number[];

	while(results.length < n) {
		let maxValue = 0;
		let maxIndex = 0;
		for(let i = 0; i < samples.length; i++) {
			const v = Math.abs(samples[i]);
			if(v > maxValue && !results.includes(i)) {
				maxValue = v;
				maxIndex = i;
			}
		}
		results.push(maxIndex);
	}

	return results;
}

function connectChain(...node: AudioNode[]) {
	for(let i = 0; i < node.length - 1; i++) {
		node[i].connect(node[i+1]);
	}
}

import audioWorkletURL from './worklet/MeasurementProcessor.ts?url'

async function createAudioWorklet(context: BaseAudioContext, name: 'measure', options?: AudioWorkletNodeOptions) {
	try { return new AudioWorkletNode(context, name); }
	catch(err) {
		console.log(err);
		console.log("Adding module and retrying...");
		await context.audioWorklet.addModule(audioWorkletURL);
		return new AudioWorkletNode(context, name, options);
	}
}
