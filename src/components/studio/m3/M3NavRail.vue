<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const expandido = computed(() => (props.item as unknown as Record<string, unknown>).railExpanded === true)
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
    class="flex min-h-[300px] flex-col items-center gap-2 py-3"
    :style="{ background: scheme.surfaceContainer, color: scheme.onSurfaceVariant, width: expandido ? '220px' : '80px' }"
  >
    <M3Icon name="menu" :size="24" />
    <span v-for="(t, i) in tabs" :key="i" class="flex flex-col items-center gap-1">
      <span
        class="flex h-8 items-center justify-center"
        :style="{
          width: expandido ? '200px' : '56px',
          background: i === sel ? scheme.secondaryContainer : 'transparent',
          color: i === sel ? scheme.onSecondaryContainer : scheme.onSurfaceVariant,
          borderRadius: '999px'
        }"
      >
        <M3Icon :name="t.icon ?? 'circle'" :size="22" :fill="i === sel" />
      </span>
      <span class="text-[11px]">{{ t.label }}</span>
    </span>
  </nav>
</template>
