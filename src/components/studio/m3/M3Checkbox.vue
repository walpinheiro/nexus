<script setup lang="ts">
import { VCheckbox } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>
<template><VCheckbox :model-value="!!item.checked" :label="item.label" disabled size="md" /></template>
