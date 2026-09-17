<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const tabs = computed(() => {
  const t = props.item.tabs as { icon?: string; label: string }[] | undefined
  if (t && t.length > 0) return t.slice(0, 5)
  return [
    { icon: 'home', label: 'Início' },
    { icon: 'search', label: 'Buscar' },
    { icon: 'settings', label: 'Ajustes' }
  ]
})
const sel = computed(() => props.item.selected ?? 0)
</script>

<template>
  <nav
    class="flex h-20 w-full items-stretch justify-around px-2 pb-3 pt-2"
    :style="{ background: scheme.surfaceContainer, color: scheme.onSurfaceVariant }"
  >
    <span v-for="(t, i) in tabs" :key="i" class="flex w-16 flex-col items-center gap-1">
      <span
        class="flex h-8 w-14 items-center justify-center"
        :style="{
          background: i === sel ? scheme.secondaryContainer : 'transparent',
          color: i === sel ? scheme.onSecondaryContainer : scheme.onSurfaceVariant,
          borderRadius: '999px'
        }"
      >
        <M3Icon :name="t.icon ?? 'circle'" :size="22" :fill="i === sel" />
      </span>
      <span class="text-[11px] font-medium">{{ t.label }}</span>
    </span>
  </nav>
</template>
