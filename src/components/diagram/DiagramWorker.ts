import { declareWorker } from '../../lib/worker'

import { Diagram, Grid } from './DiagramTypes'
import { decimatePoints } from './DiagramMath'
import { pointsToPath } from './DiagramMath'

const workerDefinition = declareWorker({
	processWave(
		diagram: Diagram,
		grid: Grid,
		samples: Float32Array, sampleRate?: number)
	{
		const numPoints = diagram.width / 3;

		const points    = grid.samplesToPoints(samples, sampleRate);
		const decimated = decimatePoints(points, numPoints);

		return {
			min: pointsToPath(decimated.min, diagram.width, diagram.height),
			max: pointsToPath(decimated.max, diagram.width, diagram.height),
			avg: pointsToPath(decimated.avg, diagram.width, diagram.height),
		};
	}
});
export type DiagramWorker = typeof workerDefinition;
