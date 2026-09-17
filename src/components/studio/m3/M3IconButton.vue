<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const estilo = computed(() => {
  const s = props.scheme
  const v = props.item.variant ?? 'tonal'
  if (v === 'filled') return { background: s.primary, color: s.onPrimary }
  if (v === 'outlined') return { background: 'transparent', color: s.onSurfaceVariant, border: `1px solid ${s.outline}` }
  if (v === 'text') return { background: 'transparent', color: s.onSurfaceVariant }
  return { background: s.secondaryContainer, color: s.onSecondaryContainer }
})
</script>

<template>
  <button
    type="button"
    class="m3-ripple flex h-12 w-12 items-center justify-center"
    :style="{ background: estilo.background, color: estilo.color, border: (estilo as Record<string, string>).border ?? 'none', borderRadius: '999px' }"
    :aria-label="item.label || item.icon || 'icon button'"
  >
    <M3Icon :name="item.icon ?? 'favorite'" :size="22" :fill="item.variant === 'filled'" />
  </button>
</template>
