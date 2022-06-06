export class Diagram {
	width: number = 0;
	height: number = 0;
};

export class Grid {
	minX = 0;
	maxX = 20000;
	minY = -1;
	maxY =  1;
	logX = 0;
	logY = 0;
	granularityX = 1;
	granularityY = 1;

	transformX(x: number) {
		if(this.logX)
			return (Math.log2(1 + x) - Math.log2(this.minX)) / (Math.log2(this.maxX) - Math.log2(this.minX));
		else
			return (x - this.minX) / (this.maxX - this.minX);
	}
	transformY(y: number) {
		if(this.logY) {
			const db = 20*Math.log10(y);
			y = db;
			// return 1 - Math.log2(1 + y - this.minY) / Math.log2(this.maxY - this.minY);
			// return 1 - ((20 * Math.log10(y)) - this.minY) / (this.maxX - this.minY);
		}

		return 1 - (y - this.minY) / (this.maxY - this.minY);
	}

	transformPoints(points: Float32Array) {
		const result = new Float32Array(points.length);
		for(let i = 0; i < result.length/2; i++) {
			result[i*2+0] = this.transformX(points[i*2+0]);
			result[i*2+1] = this.transformY(points[i*2+1]);
		}
		return result;
	}
	samplesToPoints(samples: Float32Array, sampleRate?: number) {
		sampleRate = sampleRate ?? samples.length;

		const points = new Float32Array(samples.length*2);
		for(let i = 0; i < samples.length; i++) {
			points[i*2+0] = this.transformX(i * sampleRate / samples.length);
			points[i*2+1] = this.transformY(samples[i]);
		}
		return points;
	}
};
