<script setup lang="ts">
import { computed } from 'vue'
import { VSlider } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
const props = defineProps<{ item: StudioItem; scheme: Scheme }>()
const value = computed(() => Math.min(100, Math.max(0, props.item.value ?? 40)))
</script>
<template><VSlider :model-value="value" :min="0" :max="100" :show-value="false" disabled size="md" aria-label="Valor de exemplo" /></template>
