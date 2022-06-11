<script setup lang="ts">
import { onBeforeUnmount, provide, reactive, ref, watch, watchEffect } from 'vue';
import { Diagram } from './DiagramTypes';

const diagram = reactive(new Diagram());
diagram.width = 1000;
diagram.height = 700;
provide('diagram', diagram);

const sizeObserver = new ResizeObserver((entries, observer) => {
	const { blockSize, inlineSize } = entries[0].borderBoxSize[0];
	diagram.width = inlineSize;
	diagram.height = blockSize;
});
onBeforeUnmount(() => sizeObserver.disconnect());

const diagramElement = ref<HTMLElement>();
watchEffect(() => {
	sizeObserver.disconnect();

	if(!diagramElement.value)
		return;

	sizeObserver.observe(diagramElement.value);
});

</script>

<template lang="pug">
.diagram(ref="diagramElement")
	svg(:viewBox="`0 0 ${diagram.width} ${diagram.height}`")
		rect(width="100%" height="100%" fill="black")
		slot
</template>

<style lang="scss">
.diagram {
	width: 100%;
	height: 100%;

	svg {
		width: 100%;
		height: 100%;
	}
}
</style>
