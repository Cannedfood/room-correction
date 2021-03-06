import _, { isNumber } from 'lodash';
import { WaveFile } from 'wavefile';
import { AudioMeasurementContext } from './audio/Audio';
import { fft, generateFirFilter, generateCorrectionCurve, db, ifft_c2r, calcPhase, calcMagnitudes, convolve, smooth } from './lib/dsp';
import { vectorAverage } from './lib/vector';
import { generateSineSweep, saveWave } from './Wavegen';

export interface MeasurementChannel {
	impulseResponse: Float32Array;
	fftReal:         Float32Array;
	fftImag:         Float32Array;
	fftAmp:          Float32Array;
	fftPhase:        Float32Array;
}

export type MeasurementType =
	'measurement' |
	'combined-measurement' |
	'house-curve' |
	'mic-calibration' |
	'correction';

export interface Measurement {
	selected: boolean,
	type: MeasurementType,
	name: string,
	sampleRate: number;
	referenceChannels: MeasurementChannel[],
	channels: MeasurementChannel[],
}

export class AppState {
	showFrequency = true;
	measurements = [] as Measurement[];

	settings = {
		numMeasurements: 1,
		sineSweep: {
			startFrequencyHz: 20,
			endFrequencyHz: 20000,
			duration: 1,
		},
		correction: {
			linearPhase: true,
			filterLength: 48000,
			lowCutoff: 30,
			highCutoff: 20000,
			maxBoostDb: 10,
			maxCutDb: -100,
		},
		smooth: {
			octaves: 1/96.0,
			log: true,
		}
	}

	download(m: Measurement) {
		saveWave(`${m.name}.wav`, m.sampleRate, m.channels.map(c => c.impulseResponse!));
	}

	uploadMeasurementWAV(name: string, data: ArrayBuffer) {
		const wav = new WaveFile();
		wav.fromBuffer(new Uint8Array(data));
		const samples = wav.getSamples(false, Float32Array) as unknown as Float32Array[];
		if(!Array.isArray(samples)) throw new Error("What??");

		this.measurements.push({
			name,
			type: 'measurement',
			sampleRate: (wav.fmt as any).sampleRate,
			referenceChannels: [],
			channels: samples.map(s => fromImpulseResponse(s)),
			selected: true,
		})
	}

	async measure() {
		if(!(window as any).chrome && !confirm("Measurement only works reliably in chromium-based browsers, measure anyways?")) {
			return;
		}

		const a = new AudioMeasurementContext(new AudioContext({ latencyHint: "interactive" }));
		await a.start();

		const sampleRate = a.context.sampleRate;

		const sweep = generateSineSweep(
			sampleRate,
			this.settings.sineSweep.startFrequencyHz,
			this.settings.sineSweep.endFrequencyHz,
			this.settings.sineSweep.duration,
			.8
		);

		for(let i = 0; i < this.settings.numMeasurements; i++) {
			await a.playClicks();

			const left  = await a.playAndRecord([ sweep, undefined ], .3);
			const right = await a.playAndRecord([ undefined, sweep ], .3);
			// saveWave("sweep.wav", sampleRate, sweep);

			const sweepM = fromImpulseResponse(sweep);

			const sweepFFT = fft(sweep).magnitude;
			const leftFFT  = fft(left).magnitude;
			const rightFFT = fft(right).magnitude;
			for(let i = 0; i < sweepFFT.length; i++) {
				leftFFT[i]  /= sweepFFT[i];
				rightFFT[i] /= sweepFFT[i];
			}
			this.measurements.push({
				name: 'measurement-' + this.measurements.length.toString(),
				type: 'measurement',
				selected: this.settings.numMeasurements == 1,
				sampleRate,
				referenceChannels: [
					sweepM
				],
				channels: [
					fromImpulseResponse(left, sweepM),
					fromImpulseResponse(right, sweepM)
				],
			});
		}

		a.stop();

		if(this.settings.numMeasurements > 1) {
			this.averageMeasurements();
		}
	}

	averageMeasurements() {
		const measmts     = this.measurements.filter(m => m.type == 'measurement');
		if(measmts.length == 0)
			throw new Error("No measurements selected");
		const sampleRate = measmts[0].sampleRate;
		if(measmts.some(m => m.sampleRate != sampleRate))
			throw new Error("Channel count mismatch");
		const numChannels = _.max(measmts.map(m => m.channels.length))!;
		if(measmts.some(m => m.channels.length != numChannels))
			throw new Error("Channel count mismatch");

		const channels = [] as MeasurementChannel[];
		for(let i = 0; i < numChannels; i++) {
			const ampAverage = vectorAverage('logarithmic', ...measmts.map(m => m.channels[i].fftAmp));
			const ampImag    = new Float32Array(ampAverage.length);

			channels.push(fromFFT(
				ampAverage,
				ampImag
			));
		}

		for(let m of this.measurements) {
			m.selected = false;
		}
		this.measurements.push({
			selected: true,
			name: "Average",
			type: 'combined-measurement',
			sampleRate,
			referenceChannels: [],
			channels
		});
	}

	generateSmoothed() {
		for(let m of this.measurements.filter(m => m.selected)) {
			m.selected = false;
			this.measurements.push({
				name: `${m.name} (smoothed)`,
				referenceChannels: [],
				channels: m.channels.map(c => {
					const smoothed = smooth(c.fftAmp, this.settings.smooth.octaves, this.settings.smooth.log);

					const real = new Float32Array(c.fftReal);
					const imag = new Float32Array(c.fftImag);
					for(let i = 0; i < smoothed.length; i++) {
						const factor = smoothed[i] / c.fftAmp[i];
						real[i] *= factor;
						imag[i] *= factor;
					}
					return fromFFT(real, imag);
				}),
				sampleRate: m.sampleRate,
				selected: true,
				type: m.type,
			});
		}
	}

	generateCorrection() {
		const [amplitudeResponse] = this.measurements.filter(m => m.selected);
		if(!amplitudeResponse)
			return;

		const correctionCurves = generateCorrectionCurve(
			amplitudeResponse.sampleRate,
			this.settings.correction.lowCutoff,
			this.settings.correction.highCutoff,
			db(this.settings.correction.maxBoostDb),
			db(this.settings.correction.maxCutDb),
			...amplitudeResponse.channels.map(c => c.fftAmp)
		);

		const refChannels = correctionCurves.map(c => <MeasurementChannel>{
			fftAmp: c
		});

		const channels = correctionCurves.map(
			amplitudeResponse => fromImpulseResponse(
				generateFirFilter(
					amplitudeResponse,
					this.settings.correction.filterLength
				)
			)
		);

		this.measurements.push({
			name: "Correction Filter" + amplitudeResponse.name,
			selected: true,
			type: 'correction',
			sampleRate: amplitudeResponse.sampleRate,
			referenceChannels: refChannels,
			channels,
		});

		this.convolveSelection();
	}

	convolveSelection() {
		const [a, b] = this.measurements.filter(m => m.selected);

		const irs = [] as MeasurementChannel[];
		for(let i = 0; i < a.channels.length; i++) {
			const ir = convolve(
				a.channels[i].impulseResponse!,
				b.channels[i].impulseResponse!
			);

			irs.push(fromImpulseResponse(ir));
		}

		for(let i = 0; i < a.channels.length; i++) {
			const aa = a.channels[i];
			const bb = b.channels[i];
			if(aa.fftAmp.length != bb.fftAmp.length)
				continue;

			const c = new Float32Array(Math.max(
				aa.fftAmp.length,
				bb.fftAmp.length
			));
			c.fill(1);
			for(let j = 0; j < aa.fftAmp.length; j++)
				c[j] *= aa.fftAmp[j];
			for(let j = 0; j < bb.fftAmp.length; j++)
				c[j] *= bb.fftAmp[j];
			irs.push({
				fftAmp: c,
				fftImag: new Float32Array(),
				fftPhase: new Float32Array(),
				fftReal: new Float32Array(),
				impulseResponse: new Float32Array()
			});
		}

		this.measurements.push(<Measurement> {
			name: `${a.name} x ${b.name}`,
			type: 'combined-measurement',
			channels: irs,
			selected: true,
		});
	}

	parseCalibrationFile(name: string, file: string) {
		const frequencies = [] as number[];
		const gains = [] as number[];
		for(const line of file.split(/\n\r?/)) {
			const [freq, gain] = line.split(/\s/);
			const freqN = Number.parseFloat(freq);
			const gainN = Number.parseFloat(gain);
			if(!Number.isNaN(freqN) && !Number.isNaN(freqN)) {
				frequencies.push(freqN);
				gains.push(db(gainN));
			}
		}

		const sampleRate = 48000;
		const amplitude = new Float32Array(sampleRate);
		amplitude.fill(1);
		for(let i = 0; i < frequencies.length - 1; i++) {
			const start = Math.floor(frequencies[i]);
			const end   = Math.floor(frequencies[i+1])+1;
			const step  = (gains[i+1] - gains[i]) / (end - start);

			const startError = frequencies[i] - start;
			let gain = gains[i] + startError * step;
			for(let j = start; j < end; j++) {
				amplitude[j] = gain;
				gain += step;
			}
		}

		const imag = new Float32Array(amplitude.length);
		const ch = fromFFT(amplitude, imag);

		this.measurements.push({
			name,
			selected: true,
			sampleRate,
			referenceChannels: [],
			channels: [ch, ch],
			type: 'mic-calibration',
		});
	}
}

function fromFFT(real: Float32Array, imag: Float32Array) {
	const phase = calcPhase(real, imag);
	const mag   = calcMagnitudes(real, imag);
	const ir    = ifft_c2r(real, imag);

	return <MeasurementChannel>{
		fftAmp: mag,
		fftImag: imag,
		fftPhase: phase,
		fftReal: real,
		impulseResponse: ir
	};
}

function fromImpulseResponse(
	data: Float32Array,
	...corrections: MeasurementChannel[]): MeasurementChannel
{
	const freq = fft(data);

	if(corrections) {
		for(const correction of corrections) {
			const minLen = Math.min(correction.fftAmp.length, freq.magnitude.length);

			for(let i = 0; i < minLen; i++) {
				freq.magnitude[i] /= correction.fftAmp[i];
				if(correction.fftReal && correction.fftImag) {
					[freq.real[i], freq.imag[i]] = complexDivide(
						freq.real[i], freq.imag[i],
						correction.fftReal[i], correction.fftReal[i]
					);
				}
				else {
					freq.real[i] /= correction.fftAmp[i];
					freq.imag[i] /= correction.fftAmp[i];
				}
			}
		}

		return fromFFT(freq.real, freq.imag);
	}

	return {
		impulseResponse: data,
		fftImag:  freq.imag,
		fftReal:  freq.real,
		fftAmp:   freq.magnitude,
		fftPhase: freq.phase,
	}
}

function complexDivide(a: number, b: number, c: number, d: number, amp?: number) {
	const cd2 = c*c + d*d;
	return [
		(a*c + b*d) / cd2,
		(b*c - a*d) / cd2
	];
}
