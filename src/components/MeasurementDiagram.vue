<script setup lang="ts">
import { inject, ref   } from 'vue';
import { AppState } from '../State';

import Diagram         from './diagram/Diagram.vue';
import Grid            from './diagram/Grid.vue';
import WaveformDiagram from './diagram/WaveformDiagram.vue';

const state = inject<AppState>('app-state')!;

const channelColors = [ 'red', 'green', 'purple' ];

let range = 70;
let zoom = ref(1);

function onScroll(e: WheelEvent) {
	zoom.value += e.deltaY / 530;
	e.preventDefault();
	e.stopPropagation();
}
</script>

<template lang="pug">
.stack(@wheel="onScroll($event)")
	Diagram
		Grid.recording(
			v-if="!state.showFrequency"
			:min-x="0" :max-x="48000"
		)
			g.measurement(v-for="m in state.measurements.filter(x => x.selected)")
				WaveformDiagram(
					v-for="ch, i of m.channels"
					:samples="ch.impulseResponse"
					color="#2202"
				)
				WaveformDiagram(
					v-for="ch, i of m.channels"
					:samples="ch.impulseResponse"
					:color="channelColors[i]"
				)
		Grid.reponse(
			v-if="state.showFrequency"
			grid-color="#777"
			:granularity-x="1"
			:min-x="10" :max-x="24000" :log-x="2" :mark-x="[state.settings.correction.lowCutoff, 100, 500, 2000, 10000, state.settings.correction.highCutoff]"
			:min-y="-range*zoom" :max-y="range*zoom" :log-y="2" :mark-y="[1, 4]"
		)
			g.fft(v-for="m in state.measurements.filter(x => x.selected)")
				WaveformDiagram(v-for="ch, i in m.referenceChannels"
					:samples="ch.fftAmp"
					color="#FF03"
				)
				WaveformDiagram(v-for="ch, i of m.channels"
					:samples="ch.fftAmp"
					:color="channelColors[i]"
				)
	.top.right.col.dark.outline.p1
		label
			input(type="checkbox" v-model="state.showFrequency")
			| Frequency
</template>
