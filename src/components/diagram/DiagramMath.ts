export function pointsToPath(
	points: Float32Array,
	width: number,
	height: number)
{
	const result = new Array<string>(points.length / 2);

	for(let i = 0; i < result.length; i++) {
		if(i == 0) result[i] = `M ${points[i*2+0]*width},${points[i*2+1]*height}`;
		else       result[i] = `L ${points[i*2+0]*width},${points[i*2+1]*height}`;
	}

	return result.join(' ');
}

export function pointsToWaveform(
	minima: Float32Array,
	maxima: Float32Array,
	width: number,
	height: number)
{
	const result = [] as string[];

	for(let i = 0; i < minima.length / 2; i++) {
		result.push(
			i == 0?
				`M ${minima[i*2+0]*width},${minima[i*2+1]*height}` :
				`L ${minima[i*2+0]*width},${minima[i*2+1]*height}`
		);
	}
	for(let i = minima.length / 2 - 1; i >= 0; i--) {
		result.push(`L ${maxima[i*2+0]*width},${maxima[i*2+1]*height}`);
	}
	result.push('Z');

	return result.join(' ');
}

export function decimatePoints(samples: Float32Array, points: number)
{
	const min   = new Float32Array(points*2);
	const max   = new Float32Array(points*2);
	const avg   = new Float32Array(points*2);
	const count = new Float32Array(points);
	for(let i = 0; i < points; i++) {
		min [i*2+0] =
		max [i*2+0] =
		avg[i*2+0]  = (i / points);

		min [i*2+1] = Number.POSITIVE_INFINITY;
		max [i*2+1] = Number.NEGATIVE_INFINITY;
		avg[i*2+1] = 0;
		count[i] = 0;
	}

	if(samples) {
		for(let i = 0; i < samples.length / 2; i++) {
			const x = samples[i*2+0];
			const y = samples[i*2+1];

			if(x < 0 || x >= 1) continue;

			const bucket = Math.floor(x*points);

			if(min[bucket*2+1] > y) {
				min[bucket*2+0] = x;
				min[bucket*2+1] = y;
			}
			if(max[bucket*2+1] < y) {
				max[bucket*2+0] = x;
				max[bucket*2+1] = y;
			}
			avg[bucket*2+1] += y;
			count[bucket]   += 1;
		}
		for(let i = 0; i < samples.length / 2; i++) {
			if(count[i] !== 0) {
				avg[i*2+1] /= count[i];
			}
			else {
				avg[i*2+1] = 0;
				min[i*2+1] = 0;
				max[i*2+1] = 0;
			}
		}
	}
	return { min, max, avg };
}
