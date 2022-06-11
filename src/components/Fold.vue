<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const props = defineProps<{
	title: string,
	open?: boolean
}>();

const folded = ref(false);
watchEffect(() => folded.value = !props.open);

</script>

<template lang="pug">
.fold.col(:class="{ folded }")
	.title.clickable(@click="folded = !folded")
		.chevron
		span {{title}}
	slot.fold-content(v-if="!folded")
</template>

<style lang="scss">
.rotate-90 {
	display: inline-block;
	transform: rotate(90deg);
}
.fold {
	border-top:    1px solid #FFF2;
	border-bottom: 1px solid #FFF2;

	padding-left: .5em;
	padding-bottom: .45em;

	transition: border-left 200ms;
	border-left: 2px solid #FFF8;
	&.folded {
		border-left: 2px solid #FFF0;
	}

	.title {
		font-size: 1.1em;
		font-weight: bold;
	}

	.chevron {
		margin-inline: .4em;
		display: inline-block;
		transition: transform 100ms;
		&::before { content: '›'; }
	}
	.chevron { transform: rotate(90deg); }
	&.folded .chevron { transform: rotate(0deg); }
}

</style>
