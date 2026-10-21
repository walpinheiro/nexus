<script setup lang="ts">
import { computed } from 'vue'
import { VTabs } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
const props = defineProps<{ item: StudioItem; scheme: Scheme }>()
const items = computed(() => {
  const tabs = props.item.tabs as ({ label: string } | string)[] | undefined
  const source = tabs?.length ? tabs : [{ label: 'Aba 1' }, { label: 'Aba 2' }, { label: 'Aba 3' }]
  return source.map((tab, i) => ({ value: String(i), label: typeof tab === 'string' ? tab : tab.label }))
})
const selected = computed(() => String(Math.max(0, Math.min(items.value.length - 1, props.item.selected ?? 0))))
</script>
<template><VTabs :model-value="selected" :items="items" variant="underline" size="sm" :panels="false" aria-label="Abas do protótipo" /></template>
