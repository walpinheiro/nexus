<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const estilo = computed(() => {
  const s = props.scheme
  if ((props.item.variant ?? 'outlined') === 'tonal')
    return { background: s.secondaryContainer, color: s.onSecondaryContainer, border: 'none' }
  return { background: 'transparent', color: s.onSurfaceVariant, border: `1px solid ${s.outline}` }
})
</script>

<template>
  <span
    class="inline-flex h-8 items-center gap-1.5 px-3 text-[13px] font-medium"
    :style="{
      background: estilo.background,
      color: estilo.color,
      border: estilo.border,
      borderRadius: '8px',
      width: item.w ? item.w + 'px' : undefined
    }"
  >
    <M3Icon v-if="item.checked" name="check" :size="16" />
    <M3Icon v-else-if="item.icon" :name="item.icon" :size="16" />
    {{ item.label ?? 'Chip' }}
  </span>
</template>
