export class Diagram {
	width: number = 0;
	height: number = 0;
};

export class Grid {
	minX = 0;
	maxX = 20000;
	minY = -1;
	maxY =  1;

	transformX(x: number) {
		return (x - this.minX) / (this.maxX - this.minX);
	}
	transformY(y: number) {
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
	samplesToPoints(samples: Float32Array) {
		const points = new Float32Array(samples.length*2);
		for(let i = 0; i < samples.length; i++) {
			points[i*2+0] = this.transformX(i);
			points[i*2+1] = this.transformY(samples[i]);
		}
		return points;
	}
};
