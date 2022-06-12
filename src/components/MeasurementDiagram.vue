<script setup lang="ts">
import { inject, reactive } from 'vue';
import { AppState } from '../State';

import Diagram         from './diagram/Diagram.vue';
import Grid            from './diagram/Grid.vue';
import WaveformDiagram from './diagram/WaveformDiagram.vue';

const state = inject<AppState>('app-state')!;

const channelColors = [ 'red', 'green', 'purple' ];

let range = 70;
let graphSettings = reactive({
	zoom: 1,
	minFreq: 20,
	maxFreq: 24000
});

function onScroll(e: WheelEvent) {
	graphSettings.zoom += e.deltaY / 530;
	e.preventDefault();
	e.stopPropagation();
}
</script>

<template lang="pug">
.stack.h10(@wheel="onScroll($event)")
	Diagram.h10
		Grid.recording(
			v-if="!state.showFrequency"
			:min-x="0" :max-x="48000"
			:min-y="-range*graphSettings.zoom" :max-y="range*graphSettings.zoom" :mark-y="[-1,1]"
		)
			g.measurement(v-for="m in state.measurements.filter(x => x.selected)")
				WaveformDiagram(
					v-for="ch, i of m.channels"
					:samples="ch.impulseResponse"
					color="#2202"
					:sample-rate="m.sampleRate"
				)
				WaveformDiagram(
					v-for="ch, i of m.channels"
					:samples="ch.impulseResponse"
					:color="channelColors[i]"
					:sample-rate="m.sampleRate"
				)
		Grid.reponse(
			v-if="state.showFrequency"
			grid-color="#777"
			:granularity-x="3"
			:min-x="graphSettings.minFreq" :max-x="graphSettings.maxFreq" :log-x="2" :mark-x="[state.settings.correction.lowCutoff, 100, 500, 2000, 10000, state.settings.correction.highCutoff]"
			:min-y="-range*graphSettings.zoom" :max-y="range*graphSettings.zoom" :log-y="2" :mark-y="[1, 4]"
		)
			g.fft(v-for="m in state.measurements.filter(x => x.selected)")
				WaveformDiagram(v-for="ch, i in m.referenceChannels"
					:samples="ch.fftAmp"
					color="#FF03"
					:sample-rate="m.sampleRate"
				)
				WaveformDiagram(v-for="ch, i of m.channels"
					:samples="ch.fftAmp"
					:color="channelColors[i]"
					:sample-rate="m.sampleRate"
				)
	.top.right.col.dark.outline.p1
		label
			input(type="checkbox" v-model="state.showFrequency")
			| Frequency
</template>
