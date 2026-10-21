<script setup lang="ts">
import { computed } from 'vue'
import { VSelect } from 'vueui-nova-kit'
import type { VSelectOption } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
const props = defineProps<{ item: StudioItem; scheme: Scheme }>()
const options = computed<VSelectOption[]>(() => {
  const tabs = props.item.tabs as ({ label: string } | string)[] | undefined
  const result = tabs?.map((tab, i) => ({ value: String(i), label: typeof tab === 'string' ? tab : tab.label })) ?? []
  if (!result.length) result.push({ value: '0', label: props.item.label ?? 'Opção' })
  return result
})
const selected = computed(() => String(Math.max(0, Math.min(options.value.length - 1, props.item.selected ?? 0))))
</script>
<template><VSelect :model-value="selected" :options="options" :label="item.label ?? 'Opção'" disabled size="md" /></template>
