<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const tabs = computed(() => {
  const t = props.item.tabs as { label: string }[] | undefined
  return t && t.length > 0 ? t : [{ label: '' }]
})
const sel = computed(() => props.item.selected ?? 0)
const valor = computed(() => tabs.value[sel.value]?.label ?? props.item.label ?? 'Opção')
</script>

<template>
  <label
    class="relative block h-14 w-full"
    :style="{ border: `1px solid ${scheme.outline}`, borderRadius: '4px' }"
  >
    <span
      class="absolute -top-2 left-3 px-1 text-xs"
      :style="{ background: scheme.surface, color: scheme.primary }"
    >
      {{ item.label ?? 'Opção' }}
    </span>
    <span class="flex h-full items-center gap-2 px-4" :style="{ color: scheme.onSurface }">
      <span class="flex-1 truncate text-[15px]">{{ valor }}</span>
      <M3Icon name="arrow_drop_down" :size="22" />
    </span>
  </label>
</template>
