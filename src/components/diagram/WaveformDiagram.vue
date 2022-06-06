<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { inject } from 'vue';
import { Diagram, Grid } from './DiagramTypes';
import { decimatePoints, pointsToPath } from './DiagramMath'

const grid    = inject<Grid>('grid')!;
const diagram = inject<Diagram>('diagram')!;

const props = defineProps<{
	samples?: Float32Array,
	color?:   string,
	timeScale?: number,
}>();

const decimatedSamples = computed(() => {
	if(!props.samples || props.samples.length == 0) {
		return {
			min: new Float32Array(0),
			max: new Float32Array(0),
			avg: new Float32Array(0),
		};
	}
	const numPoints = diagram.width / grid.granularityX;
	return decimatePoints(grid.samplesToPoints(props.samples!, 48000), numPoints);
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
	v-if="samples && samples.length"
	:d="minPath"
	:stroke="props.color ?? '#FFF'"
	fill="none"
	vector-effect="non-scaling-stroke"
	opacity=".25"
)
path(
	v-if="samples && samples.length"
	:d="maxPath"
	:stroke="props.color ?? '#FFF'"
	fill="none"
	vector-effect="non-scaling-stroke"
	opacity=".25"
)
path(
	:d="averagePath"
	fill="none"
	:stroke="props.color ?? '#FFF'"
	stroke-width="1px"
	vector-effect="non-scaling-stroke"
	opacity=".5"
)
</template>
