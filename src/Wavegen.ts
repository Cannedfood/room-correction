import { WaveFile } from 'wavefile';

export function generateClick(sampleRate: number, decaySeconds?: number, freqHz?: number) {
	decaySeconds ??= .2;
	freqHz ??= 800;

	const decayOffset = .25 / freqHz; // Start decay at first peak of sine wave

	const secondsPerSample = 1 / sampleRate;

	const samples = new Float32Array(decaySeconds * sampleRate);

	let timeSeconds = 0;
	for(let i = 0; i < samples.length; i++) {
		const envelope = Math.min(1, Math.max(0, (decaySeconds - timeSeconds) / decaySeconds + decayOffset));
		const sine = Math.sin(2*Math.PI*timeSeconds*freqHz);
		samples[i] = envelope * sine;
		timeSeconds += secondsPerSample;
	}

	return samples;
}

export function generateSineSweep(sampleRate: number, startFrequency: number, endFrequency: number, durationSeconds: number, gain?: number) {
	gain = gain ?? 1;
	const samples = new Float32Array(durationSeconds * sampleRate);

	// const bassEmphasis = .5;
	const startGain = 1;
	const endGain = 1;

	const one_hertz_timestep = 2*Math.PI / sampleRate;
	let timeCycles = 0;
	for(let i = 0; i < samples.length; i++) {
		const interp          = i / samples.length;
		const frequency       = log_interpolation(startFrequency, endFrequency, interp);
		const bassEmphasisEnv = interp * startGain + (1-interp) * endGain;
		samples[i] = gain * bassEmphasisEnv * Math.sin(timeCycles);

		timeCycles += one_hertz_timestep*frequency;
	}

	return samples;
}

export function generateSine(sampleRate: number, freq: number, seconds: number) {
	const result = new Float32Array(seconds * sampleRate);

	const dt = freq * (2*Math.PI / sampleRate);
	let t = 0;
	for(let i = 0; i < result.length; i++) {
		result[i] = Math.sin(t);
		t += dt;
	}

	return result;
}

function log_interpolation(from: number, to: number, interpolation_factor: number) {
	return Math.pow(to, interpolation_factor) * Math.pow(from, 1 - interpolation_factor);
}

export function saveWave(filename: string, sampleRate: number, samples: Float32Array[]) {
	const wav = new WaveFile();
	wav.fromScratch(
		samples.length,
		sampleRate,
		'32f',
		samples
	);

	saveFile(filename, "audio/wav", wav.toBuffer());
}

export function saveFile(filename: string, mime: string, data: Uint8Array) {
	const blob = new Blob([data], { type: mime });
	const a = document.createElement('a');
	a.href = window.URL.createObjectURL(blob);
	a.download = filename;
	a.click();
}
