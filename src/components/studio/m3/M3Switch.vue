<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import { VSwitch } from 'vueui-nova-kit'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template><VSwitch :model-value="!!item.checked" :label="item.label || 'Alternância'" disabled size="sm" /></template>
