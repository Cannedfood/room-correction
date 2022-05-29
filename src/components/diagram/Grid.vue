<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { inject, provide, reactive, watchEffect } from 'vue';
import { Diagram, Grid } from './DiagramTypes';

const props = defineProps<{
	minX?: number,
	maxX?: number,
	minY?: number,
	maxY?: number,
}>();

const diagram = inject<Diagram>('diagram')!;
const grid    = reactive(new Grid());
watchEffect(() => {
	grid.minX = props.minX ?? 0;
	grid.maxX = props.maxX ?? 20000;
	grid.minY = props.minY ?? -1;
	grid.maxY = props.maxY ?? 1;
});
provide('grid', grid);

interface Axis {
	lines: Array<{
		x1: number, y1: number,
		x2: number, y2: number,
	}>;
	texts: Array<{
		text: string,
		x: number, y: number,
		align: string
	}>;
}

const xAxis = computed(() => {
	const result: Axis = { lines: [], texts: [] };
	result.lines.push({
		x1: 0,
		x2: diagram.width,
		y1: grid.transformY(0) * diagram.height,
		y2: grid.transformY(0) * diagram.height,
	});
	return result;
});
const yAxis = computed(() => {
	const result: Axis = { lines: [], texts: [] };
	result.lines.push({
		y1: 0,
		y2: diagram.height,
		x1: grid.transformX(0) * diagram.width,
		x2: grid.transformX(0) * diagram.width,
	});
	return result;
});

</script>

<template lang="pug">
g.x-axis
	line(
		v-for="l in xAxis.lines"
		stroke="white" vector-effect="non-scaling-stroke"
		:x1="l.x1" :x2="l.x2" :y1="l.y1" :y2="l.y2"
	)
g.y-axis
	line(
		v-for="l in yAxis.lines"
		stroke="white" vector-effect="non-scaling-stroke"
		:x1="l.x1" :x2="l.x2" :y1="l.y1" :y2="l.y2"
	)
slot
</template>
