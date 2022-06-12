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

export function decimatePoints(samples: Float32Array, points: number) {
	if(!samples || samples.length == 0) {
		return {
			min: new Float32Array(0),
			max: new Float32Array(0),
			avg: new Float32Array(0),
		};
	}

	const min   = new Float32Array(points*2);
	const max   = new Float32Array(points*2);
	const avg   = new Float32Array(points*2);
	const count = new Float32Array(points);
	for(let i = 0; i < points; i++) {
		min[i*2+0] =
		max[i*2+0] =
		avg[i*2+0] = (i / points);

		min [i*2+1] = Number.POSITIVE_INFINITY;
		max [i*2+1] = Number.NEGATIVE_INFINITY;
		avg[i*2+1] = 0;

		count[i] = 0;
	}

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

	// Remove points with count = 0
	let N = 0;
	for(let i = 0; i < count.length; i++) {
		if(count[i] > 0) {
			min[N*2+0] = min[i*2+0];
			min[N*2+1] = min[i*2+1];
			max[N*2+0] = max[i*2+0];
			max[N*2+1] = max[i*2+1];
			avg[N*2+0] = avg[i*2+0];
			avg[N*2+1] = avg[i*2+1] / count[i];
			N++;
		}
	}

	return {
		min: min.subarray(0, N*2),
		max: max.subarray(0, N*2),
		avg: avg.subarray(0, N*2),
	};
}
