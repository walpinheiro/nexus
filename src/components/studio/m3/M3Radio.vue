<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import { VRadioGroup } from 'vueui-nova-kit'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template><VRadioGroup :model-value="item.checked ? 'selected' : ''" :options="[{ value: 'selected', label: item.label || 'Opção' }]" disabled size="sm" layout="horizontal" /></template>
