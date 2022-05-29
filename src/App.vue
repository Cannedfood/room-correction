<script setup lang="ts">
import { reactive } from 'vue';

import Diagram from './components/diagram/Diagram.vue';
import Grid from './components/diagram/Grid.vue';
import WaveformDiagram from './components/diagram/WaveformDiagram.vue';
import { AudioMeasurementContext } from './audio/Audio';
import { generateSineSweep } from './Wavegen';

const measurements = reactive([]) as Array<{
	selected: boolean,
	name: string,
	sweep: Float32Array,
	left: Float32Array,
	right: Float32Array,
	sweepFFT?: Float32Array,
	leftFFT?: Float32Array,
	rightFFT?: Float32Array,
}>;

async function measureStuff() {
	const a = new AudioMeasurementContext(new AudioContext({ latencyHint: "interactive" }));
	await a.start();

	const sweep = generateSineSweep(a.context.sampleRate, 20, 20000, 1, .8);
	const left  = await a.playAndRecord([ sweep, undefined ], .3);
	const right = await a.playAndRecord([ undefined, sweep ], .3);

	a.stop();

	// console.log(fft([...left]));

	measurements.push({
		name: measurements.length.toString(),
		selected: true,
		sweep,
		left,
		right,
	});
}

</script>

<template lang="pug">
.row
	button(@click="measureStuff()") Add Measurement
.row
	.col.w3
		.row.w10.outline(v-for="m,i in measurements" :class="{ active: m.selected }")
			input.w8(v-model="m.name")
			button.icon(@click="measurements.splice(i, 1)") &times;
	Diagram.w7
		//- Grid.recording(:min-x="0" :max-x="48000")
		//- 	g.measurement(v-for="m in measurements.filter(x => x.selected)")
		//- 		WaveformDiagram(:samples="m.sweep" color="#222")
		//- 		WaveformDiagram(:samples="m.left"  color="red")
		//- 		WaveformDiagram(:samples="m.right" color="green")
		Grid.reponse(:min-x="0" :max-x="24000")
			g.fft(v-for="m in measurements.filter(x => x.selected)")
				WaveformDiagram(:samples="m.sweepFFT"  color="#222")
				WaveformDiagram(:samples="m.leftFFT"  color="red")
				WaveformDiagram(:samples="m.rightFFT" color="green")
</template>
