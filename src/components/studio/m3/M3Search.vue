<script setup lang="ts">
import { computed } from 'vue'
import { VSearchField } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
const props = defineProps<{ item: StudioItem; scheme: Scheme }>()
const value = computed(() => String(props.item.label ?? ''))
</script>
<template><VSearchField :model-value="value" :placeholder="item.supporting || item.label || 'Buscar'" disabled size="md" aria-label="Busca no protótipo" /></template>
