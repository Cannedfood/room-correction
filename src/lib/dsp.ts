import _ from 'lodash';
import { resize } from './vector'
import { transform as fft_in_place, inverseTransform as ifft_in_place, convolveReal } from './fft';

export function calcMagnitudes(real: Float32Array, imag: Float32Array) {
	const mag = new Float32Array(real.length);
	for(let k = 0; k < real.length; k++) {
		mag[k] = Math.hypot(real[k], imag[k]);
	}
	return mag;
}

export function calcPhase(real: Float32Array, imag: Float32Array) {
	const phase = new Float32Array(real.length);
	for(let k = 0; k < real.length; k++) {
		phase[k] = Math.atan(imag[k]/real[k]);
	}
	return phase;
}

export function fft(data: Float32Array) {
	const real = new Float32Array(data);
	const imag = new Float32Array(data.length);
	fft_in_place(real, imag);

	const magnitude = calcMagnitudes(real, imag);
	const phase     = calcPhase(real, imag);

	return { real, imag, magnitude, phase };
}

export function ifft_c2r(fftReal: Float32Array, fftImag: Float32Array) {
	const real = new Float32Array(fftReal);
	const imag = new Float32Array(fftImag);
	ifft_in_place(real, imag);
	return real;
}

export function vectorMultiply(...vectors: Float32Array[]) {
	if(vectors.length == 0)
		throw new Error("vectorMultiply expects at least one argument");

	const maxLen = _.max(vectors.map(v => v.length))!;

	const result = new Float32Array(maxLen);
	result.fill(1);
	for(const v of vectors) {
		for(let i = 0; i < v.length; i++)
			result[i] *= v[i];
	}
	return result;
}

export function convolve(a: Float32Array, b: Float32Array) {
	const maxLen = Math.max(a.length, b.length);

	const a2     = resize(a, maxLen);
	const b2     = resize(b, maxLen);
	const result = new Float32Array(maxLen);

	convolveReal(a2, b2, result);

	for(let i = 0; i < result.length; i++) {
		result[i] /= maxLen;
	}

	return result;
}

export function db(decibel: number) {
	return Math.pow(10, decibel / 20);
}
export function to_db(gain: number) {
	return 20 * Math.log10(gain);
}

export function smooth(data: Float32Array, octaves: number) {
	const octaveMultiplier = Math.pow(2, octaves);

	const copy = new Float32Array(data);
	for(let i = 0; i < copy.length; i++) {
		const windowStart = Math.floor(i / octaveMultiplier);
		const windowEnd   = Math.floor(i * octaveMultiplier) + 1;
		const trueStart = Math.max(0, windowStart);
		const trueEnd   = Math.min(data.length, windowEnd);

		copy[i] = average(
			data,
			trueStart, trueEnd
		);
	}
	return copy;
}

export function psychoacousticSmooth(amp: Float32Array) {
	const result = smooth(amp, 1.0);
	for(let i = 0; i < result.length; i++) {
		result[i] = Math.max(
			amp[i],
			result[i]
		);
	}
	return result;
}

export function generateCorrectionCurve2(
	sampleRate: number,
	lowCutoffHz: number,
	highCutoffHz: number,
	maxBoost: number,
	maxCut: number,
	...amps: Float32Array[])
{
	amps = amps.map(m => psychoacousticSmooth(m));

	const len        = amps[0].length;
	const lowCutoff  = lowCutoffHz  * len / sampleRate;
	const highCutoff = highCutoffHz * len / sampleRate;
	const avg        = average(amps.map(
		a => average(a, lowCutoff, highCutoff)
	));
	console.log("Cutoffs", {lowCutoff, highCutoff, avg, len})

	const results = [] as Float32Array[];
	for(const amp of amps) {
		const correction = new Float32Array(len);
		correction.fill(1);
		for(let i = lowCutoff; i < highCutoff; i++) {
			const f = avg / amp[i];
			correction[i] = f;
			// correction[i] = Math.max(Math.min(f, maxBoost), maxCut);
		}
		results.push(correction);
	}

	console.log("Total average: ", {
		average_db: to_db(average(results.map(r => average(r)))),
		min_db:     to_db(min(results.map(r => min(r)))),
		max_db:     to_db(max(results.map(r => max(r)))),
	});

	return results;
}

function average(
	values: number[]|Float32Array,
	start?: number,
	end?: number)
{
	start ??= 0;
	end   ??= values.length;

	let result = 0;
	for(let i = start; i < end; i++) {
		result += values[i];
	}
	return result / (end - start);
}

function max(values: number[]|Float32Array, start?: number, end?: number) {
	start ??= 0;
	end   ??= values.length;

	let result = Number.NEGATIVE_INFINITY;
	for(let i = start; i < end; i++) {
		result = Math.max(result, values[i]);
	}
	return result;
}

function min(values: number[]|Float32Array, start?: number, end?: number) {
	start ??= 0;
	end   ??= values.length;

	let result = Number.POSITIVE_INFINITY;
	for(let i = start; i < end; i++) {
		result = Math.min(result, values[i]);
	}
	return result;
}

export function generateFirFilter(amplitudes: Float32Array, length: number, windowFn: WindowingFunction = 'hann') {
	let real = new Float32Array(amplitudes);
	let imag = new Float32Array(amplitudes.length);
	ifft_in_place(real, imag);
	for(let i = 0; i < real.length; i++)
		real[i] /= real.length;

	let windowedAndShifted = new Float32Array(length);
	for(let i = 0; i < windowedAndShifted.length / 2; i++) {
		windowedAndShifted[windowedAndShifted.length/2+i] = real[i];
		windowedAndShifted[i] = real[real.length - windowedAndShifted.length/2 + i];
	}
	applyWindowInplace(windowedAndShifted, windowFn);

	return windowedAndShifted;
}

export type WindowingFunction = 'hann' | 'hemming' | 'blackman';
export function applyWindowInplace(data: Float32Array, windowingFunction: WindowingFunction) {
	const N = data.length;
	for(let n = 0; n < data.length; n++) {
		const f = Math.sin(Math.PI * n/N);
		data[n] *= f*f;
	}
	return data;
}
