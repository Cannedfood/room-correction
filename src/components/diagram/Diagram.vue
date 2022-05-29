<script setup lang="ts">
import { provide, reactive } from 'vue';
import { Diagram } from './DiagramTypes';

const diagram = reactive(new Diagram());
diagram.width = 1000;
diagram.height = 700;
provide('diagram', diagram);
</script>

<template lang="pug">
svg(:viewBox="`0 0 ${diagram.width} ${diagram.height}`")
	rect(width="100%" height="100%" fill="black")
	slot
</template>
