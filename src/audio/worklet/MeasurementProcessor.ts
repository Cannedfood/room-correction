interface Playback {
	commandId: number;
	cursor: number;
	samples: (Float32Array|undefined)[];
};

interface Recording {
	commandId: number;
	cursor: number;
	samples: Float32Array|number;
	channel: number;
};

interface PlaybackCommand  extends Playback  { type: 'play'; }
interface RecordCommand extends Recording { type: 'record'; }
interface CancelCommand { commandId: number; type: 'cancel'; }

export type MeasureCommand  = PlaybackCommand | RecordCommand | CancelCommand;

export interface MeasurementResponse {
	commandId: number;
	result?: Float32Array;
};

export class MeasurementProcessor
	extends AudioWorkletProcessor
	implements AudioWorkletProcessorImpl
{
	private playbacks:  Playback[]  = [];
	private recordings: Recording[] = [];

	constructor() {
		super();
		this.port.onmessage = (
			e => this.handleMessage(e.data as MeasureCommand)
		);
	}

	private handleMessage(data: MeasureCommand|Array<MeasureCommand>) {
		const commands: Array<MeasureCommand> = Array.isArray(data)? data : [data];

		for(const cmd of commands) {
			switch(cmd.type) {
				case 'play':
					this.playbacks.push(cmd);
					break;
				case 'record':
					if(typeof cmd.samples == 'number') {
						cmd.samples = new Float32Array(cmd.samples);
					}
					this.recordings.push(cmd);
					break;
				case 'cancel':
					this.playbacks  = this.playbacks .filter(p => p.commandId != cmd.commandId);
					this.recordings = this.recordings.filter(p => p.commandId != cmd.commandId);
					break;
			}
		}
	}

	private sendDone(commandId: number, result?: Float32Array) {
		this.port.postMessage({ commandId, result });
	}

	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>): boolean
	{
		if(outputs.length && outputs[0].length) {
			for(const pb of this.playbacks) {
				const c = pb.cursor;
				for(let channelIdx = 0; channelIdx < pb.samples.length; channelIdx++) {
					const samples = pb.samples[channelIdx];
					if(!samples) continue;

					const out = outputs[0][channelIdx];
					if(!out) continue;

					for(let i = 0; i < out.length; i++) {
						if(c + i < 0) continue;
						if(c + i >= samples.length) break;
						out[i] += samples[c + i];
					}
				}
				pb.cursor += outputs[0][0].length;
			}
			this.playbacks = this.playbacks.filter(p => {
				const done = !p.samples.some(s => s && p.cursor < s.length);
				if(done) this.sendDone(p.commandId);
				return !done;
			});
		}

		if(inputs.length && inputs[0].length) {
			for(const rec of this.recordings) {
				const input = inputs[0][rec.channel];
				const samples = rec.samples as Float32Array;
				for(let i = 0; i < input.length; i++) {
					if(rec.cursor + i < 0) continue;
					if(rec.cursor + i >= samples.length) break;
					samples[rec.cursor + i] = input[i];
				}
				rec.cursor += input.length;
			}
			this.recordings = this.recordings.filter(r => {
				const samples = r.samples as Float32Array;
				const done = r.cursor >= samples.length;
				if(done) this.sendDone(r.commandId, samples);
				return !done;
			});
		}

		// Returns whether this node may be stopped
		// return this.recordings.length > 0 || this.playbacks.length > 0;
		return true;
	}
}

registerProcessor("measure", MeasurementProcessor);
