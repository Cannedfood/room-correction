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

	const one_hertz_timestep = 2*Math.PI / sampleRate;
	let timeCycles = 0;
	for(let i = 0; i < samples.length; i++) {
		const interp       = i / samples.length;
		const frequency    = log_interpolation(startFrequency, endFrequency, interp);
		const bassEmphasis = 1 - .5*interp;
		samples[i] = gain * bassEmphasis * Math.sin(timeCycles);

		timeCycles += one_hertz_timestep*frequency;
	}

	return samples;
}

function log_interpolation(from: number, to: number, interpolation_factor: number) {
	return Math.pow(to, interpolation_factor) * Math.pow(from, 1 - interpolation_factor);
}
