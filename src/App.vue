<script setup lang="ts">
import { computed, inject } from 'vue';
import { AppState } from './State';
import type { Measurement, MeasurementType } from './State';

import MeasurementDiagram from './components/MeasurementDiagram.vue';
import GettingStarted from './components/GettingStarted.vue';

const state = inject<AppState>('app-state')!;

function onSelected(m: Measurement, e: MouseEvent) {
	let othersWereSelected = false;
	let wasSelected = m.selected;
	m.selected = false;
	if(!e.ctrlKey) {
		for(const mm of state.measurements) {
			othersWereSelected ||= mm.selected;
			mm.selected = false;
		}
	}
	m.selected = !wasSelected || othersWereSelected;
}

function selectedCount(...type: MeasurementType[]) {
	return (
		state.measurements
		.filter(m => m.selected && (type.length == 0 || type.includes(m.type)))
		.length
	);
}

function readTextFile(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = e => resolve(e.target?.result as string);
		reader.onerror = e => reject(e);
		reader.readAsText(file);
	});
}
function readBinaryFile(file: File) {
	return new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = e => resolve(e.target?.result as ArrayBuffer);
		reader.onerror = e => reject(e);
		reader.readAsArrayBuffer(file);
	});
}

async function uploadMicCalibration(e: Event) {
	const files = (e.target as HTMLInputElement).files!;
	for(let i = 0; i < files.length; i++) {
		const file = files.item(i)!;
		const fileContent = await readTextFile(file);
		state.parseCalibrationFile(file.name, fileContent);
	}
}

async function uploadMeasurement(e: Event) {
	const files = (e.target as HTMLInputElement).files!;
	for(let i = 0; i < files.length; i++) {
		const file = files.item(i)!;
		state.uploadMeasurementWAV(file.name, await readBinaryFile(file));
	}
}

const calibration = computed(() => state.measurements.find(m => m.type == 'mic-calibration'));

const isChrome = (window as any).chrome;

</script>

<template lang="pug">
.row
	.col.w3
		section(v-if="state.measurements.length == 0")
			GettingStarted
		.row.w10.outline.layer(
			v-for="m,i in state.measurements"
			:class="{ active: m.selected, green: m.type == 'combined-measurement', yellow: m.type == 'mic-calibration' }"
		)
			.icon.clickable(@click="onSelected(m, $event)")
				| {{ m.selected? '🗹' : '☐'}}
			input.w8(v-model="m.name")
			button.icon(v-if="m.channels[0]?.impulseResponse" @click="state.download(m)") ↓
			button.icon(@click="state.measurements.splice(i, 1)") &times;
		.col
			button.green(
				v-if="2 <= selectedCount('measurement', 'combined-measurement')"
				@click="state.averageMeasurements()"
			) Average Measurements
			button.blue(
				v-if="1 == selectedCount('correction') && 2 == selectedCount()"
				@click="state.convolveSelection()"
			) Apply Correction
		.box.red(v-if="!isChrome")
			h2 Warning!
			p.b Measurement only works reliably on Chromium-based browsers.
			p.sm Other browsers may work, but only Firefox and Chromium were tested. Firefox definitely didn't work.
	MeasurementDiagram.w7
.row
	label.btn.yellow(v-if="!calibration") Upload Mic Calibration
		input(type="file" accept=".txt" @change="uploadMicCalibration($event)")
	span.yellow(v-else) Using calibration {{calibration.name}}

.row
	.col
		button(@click="state.measure()") Measure
		//- label Calibration
		//- 	select(v-if="state.measurements.some(m => m.type == 'mic-calibration')")
		//- 		option None
		//- 		option(
		//- 			v-for="m of state.measurements.filter(m => m.type == 'mic-calibration')"
		//- 			:value="m"
		//- 		) {{m.name}}
		label Num Measurements:
			input(type="number" v-model.number="state.settings.numMeasurements")
		label Sweep Duration:
			input.right(type="number" placeholder="seconds" v-model="state.settings.sineSweep.duration")
			| s
		label Start Frequency:
			input.right(type="number" v-model.number="state.settings.sineSweep.startFrequencyHz" min="10" max="48000")
			| Hz
		label End Frequency:
			input.right(type="number" v-model.number="state.settings.sineSweep.endFrequencyHz" min="10" max="48000")
			| Hz
	.col
		label.btn Upload Measurement
			input(type="file" accept=".wav" multiple @change="uploadMeasurement($event)")
.row(v-if="selectedCount()")
	.col
		button(@click="state.generateCorrection()")
			| Generate Correction
		.row
			.col
				b Correction Constraints
				label Low Cutoff
					input.right(type="number" v-model.number="state.settings.correction.lowCutoff")
					| Hz
				label Hi Cutoff
					input.right(type="number" v-model.number="state.settings.correction.highCutoff")
					| Hz
				label Max Boost
					input.right(type="number" v-model.number="state.settings.correction.maxBoostDb" min="0" max="120")
					| db
				label Max Cut
					input.right(type="number" v-model.number="state.settings.correction.maxCutDb" max="0" min="-120")
					| db
			.col
				b Filter Settings
				label Filter Taps
					select(v-model.number="state.settings.correction.filterLength")
						option(
							v-for="o in [32, 64, 128, 256, 512, 1024, 2048, 4096, 8138, 16276, 32552, 48000]"
							:value="o"
						) {{o}}
				label
					input(type="checkbox" v-model="state.settings.correction.linearPhase")
					| Linear Phase
</template>
