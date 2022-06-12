<script setup lang="ts">
import { computed, inject } from 'vue';
import { AppState } from './State';
import type { Measurement, MeasurementType } from './State';

import Fold from './components/Fold.vue';
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
		state.uploadMeasurementWAV(
			file.name.replace(/\.wav$/, ''),
			await readBinaryFile(file)
		);
	}
}

const calibration = computed(() => state.measurements.find(m => m.type == 'mic-calibration'));

const isChrome = (window as any).chrome;

</script>

<template lang="pug">
.row.h10
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
		Fold(title="Apply Smoothing" v-if="selectedCount()")
			.row
				.col
					label Octaves
						select(v-model.number="state.settings.smooth.octaves" @select="")
							option(:value="1/96") 1/96
							option(:value="1/48") 1/48
							option(:value="1/24") 1/24
							option(:value="1/12") 1/12
							option(:value="1/6")  1/6
							option(:value="1/3")  1/3
							option(:value="1")    1
					label Log Base
						input(type="checkbox" v-model.number="state.settings.smooth.log")
				button(@click="state.generateSmoothed()") Generate
		Fold(title="Generate Correction" v-if="selectedCount('measurement') == 1")
			.row
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
						.sep
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
		.sep
		Fold(title="Upload" :open="state.measurements.length == 0")
			.row
				label.btn.yellow(v-if="!calibration") Upload Mic Calibration
					input(type="file" accept=".txt" @change="uploadMicCalibration($event)")
				label.btn Upload Measurement
					input(type="file" accept=".wav" multiple @change="uploadMeasurement($event)")
		Fold(title="Create Measurement")
			.col
				.box.red(v-if="!isChrome")
					h2 Your browser is not supported!
					p.sm Some browsers (like <b>Firefox</b>) mute all inputs during playback, which makes measurements impossible
					p.sm Measuring only works reliably on Chromium-based browsers.
				.row
					button(@click="state.measure()") Measure
				//- label Calibration
				//- 	select(v-if="state.measurements.some(m => m.type == 'mic-calibration')")
				//- 		option None
				//- 		option(
				//- 			v-for="m of state.measurements.filter(m => m.type == 'mic-calibration')"
				//- 			:value="m"
				//- 		) {{m.name}}
				.col
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
	MeasurementDiagram.w7
</template>
