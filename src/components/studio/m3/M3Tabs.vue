<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const tabs = computed(() => {
  const t = props.item.tabs as { label: string }[] | undefined
  return t && t.length > 0 ? t : [{ label: 'Aba 1' }, { label: 'Aba 2' }, { label: 'Aba 3' }]
})
const sel = computed(() => props.item.selected ?? 0)
</script>

<template>
  <div class="flex h-12 w-full items-stretch" :style="{ color: scheme.onSurfaceVariant, borderBottom: `1px solid ${scheme.outlineVariant}` }" role="tablist">
    <span
      v-for="(t, i) in tabs"
      :key="i"
      role="tab"
      :aria-selected="i === sel"
      class="flex flex-1 items-center justify-center text-sm font-medium"
      :style="{ color: i === sel ? scheme.primary : scheme.onSurfaceVariant, borderBottom: i === sel ? `2px solid ${scheme.primary}` : 'none' }"
    >
      {{ t.label }}
    </span>
  </div>
</template>
