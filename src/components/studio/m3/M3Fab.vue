<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const estilo = computed(() => {
  const s = props.scheme
  const v = props.item.variant ?? 'filled'
  if (v === 'tonal') return { background: s.secondaryContainer, color: s.onSecondaryContainer }
  if (v === 'elevated') return { background: s.surfaceContainerLow, color: s.primary }
  return { background: s.primaryContainer, color: s.onPrimaryContainer }
})
</script>

<template>
  <NovaAction
    type="button"
    class="m3-ripple m3-elev-2 flex h-14 w-14 items-center justify-center"
    :style="{
      background: estilo.background,
      color: estilo.color,
      borderRadius: '16px',
      width: (item.w ?? 56) + 'px',
      height: (item.h ?? 56) + 'px'
    }"
    :aria-label="item.label || item.icon || 'fab'"
  >
    <M3Icon :name="item.icon ?? 'add'" :size="24" />
  </NovaAction>
</template>
