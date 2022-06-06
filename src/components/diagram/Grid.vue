<script setup lang="ts">
import { computed } from '@vue/reactivity';
import { inject, provide, reactive, watchEffect } from 'vue';
import { Diagram, Grid } from './DiagramTypes';

const props = defineProps<{
	minX?: number,
	maxX?: number,
	logX?: number,
	markX?: number[],
	granularityX?: number,

	minY?: number,
	maxY?: number,
	logY?: number,
	markY?: number[],
	granularityY?: number,

	gridColor?: string;
}>();

const diagram = inject<Diagram>('diagram')!;
const grid    = reactive(new Grid());
watchEffect(() => {
	grid.minX = props.minX ?? 0;
	grid.maxX = props.maxX ?? 20000;
	grid.logX = props.logX ?? 0;
	grid.minY = props.minY ?? -1;
	grid.maxY = props.maxY ?? 1;
	grid.logY = props.logY ?? 0;
	grid.granularityX = props.granularityX ?? 1;
	grid.granularityY = props.granularityY ?? 1;
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
	if(props.markX) {
		for(const m of props.markX) {
			result.lines.push({
				y1: 0,
				y2: diagram.height,
				x1: grid.transformX(m) * diagram.width,
				x2: grid.transformX(m) * diagram.width,
			});
			result.texts.push({
				x: grid.transformX(m) * diagram.width,
				y: 0,
				align: '',
				text: m.toString()
			});
		}
	}
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
	if(props.markY) {
		for(const m of props.markY) {
			result.lines.push({
				x1: 0,
				x2: diagram.width,
				y1: grid.transformY(m) * diagram.height,
				y2: grid.transformY(m) * diagram.height,
			});
			result.texts.push({
				x: 0,
				y: grid.transformY(m) * diagram.height,
				align: '',
				text: m.toString()
			});
		}
	}
	return result;
});

</script>

<template lang="pug">
g.grid
	g.x-axis
		line(
			v-for="l in xAxis.lines"
			:stroke="gridColor ?? 'white'" vector-effect="non-scaling-stroke"
			:x1="l.x1" :x2="l.x2" :y1="l.y1" :y2="l.y2"
		)
		text(
			v-for="l in xAxis.texts"
			dominant-baseline="hanging"
			:fill="gridColor ?? 'white'"
			:x="l.x" :y="l.y"
			dx="4" dy="4"
		) {{l.text}}
	g.y-axis
		line(
			v-for="l in yAxis.lines"
			:stroke="gridColor ?? 'white'" vector-effect="non-scaling-stroke"
			:x1="l.x1" :x2="l.x2" :y1="l.y1" :y2="l.y2"
		)
		text(
			v-for="l in yAxis.texts"
			dominant-baseline="auto"
			:fill="gridColor ?? 'white'"
			:x="l.x" :y="l.y"
			dx="4" dy="-4"
		) {{l.text}}
	slot
</template>
