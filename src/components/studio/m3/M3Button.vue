<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const variant = computed(() => props.item.variant ?? 'filled')
const label = computed(() => props.item.label ?? 'Botão')

const estilo = computed(() => {
  const s = props.scheme
  switch (variant.value) {
    case 'tonal':
      return { background: s.secondaryContainer, color: s.onSecondaryContainer, border: 'none', shadow: 'none' }
    case 'elevated':
      return { background: s.surfaceContainerLow, color: s.primary, border: 'none', shadow: '0 1px 3px rgb(0 0 0 / 0.18)' }
    case 'outlined':
      return { background: 'transparent', color: s.primary, border: `1px solid ${s.outline}`, shadow: 'none' }
    case 'text':
      return { background: 'transparent', color: s.primary, border: 'none', shadow: 'none' }
    default:
      return { background: s.primary, color: s.onPrimary, border: 'none', shadow: 'none' }
  }
})
</script>

<template>
  <button
    type="button"
    class="m3-ripple flex h-10 items-center justify-center gap-2 px-5 text-sm font-medium"
    :style="{ background: estilo.background, color: estilo.color, border: estilo.border, boxShadow: estilo.shadow, borderRadius: '999px', minWidth: '120px' }"
  >
    <M3Icon v-if="item.icon" :name="item.icon" :size="18" :fill="variant === 'filled'" />
    {{ label }}
  </button>
</template>
