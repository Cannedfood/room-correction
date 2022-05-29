<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { inject } from 'vue';
import { Diagram, Grid } from './DiagramTypes';
import { decimatePoints, pointsToPath, pointsToWaveform } from './DiagramMath'

const grid    = inject<Grid>('grid')!;
const diagram = inject<Diagram>('diagram')!;

const props = defineProps<{
	samples?: Float32Array,
	color?:   string,
}>();

const decimatedSamples = computed(() => {
	const numPoints = diagram.width;

	const result = decimatePoints(grid.samplesToPoints(props.samples!), numPoints);
	console.log(result);
	return result;
});
const minPath = computed(
	() => pointsToPath(
		decimatedSamples.value.min,
		diagram.width,
		diagram.height
	)
);
const maxPath = computed(
	() => pointsToPath(
		decimatedSamples.value.max,
		diagram.width,
		diagram.height
	)
);
const averagePath = computed(
	() => pointsToPath(
		decimatedSamples.value.avg,
		diagram.width,
		diagram.height
	)
);

</script>

<template lang="pug">
path(
	:d="minPath"
	:stroke="props.color ?? '#FFF'"
	fill="none"
	vector-effect="non-scaling-stroke"
	opacity=".5"
)
path(
	:d="maxPath"
	:stroke="props.color ?? '#FFF'"
	fill="none"
	vector-effect="non-scaling-stroke"
	opacity=".5"
)
//- path(
//- 	:d="averagePath"
//- 	fill="none"
//- 	:stroke="props.color ?? '#FFF'"
//- 	vector-effect="non-scaling-stroke"
//- 	opacity=".5"
//- )
</template>
