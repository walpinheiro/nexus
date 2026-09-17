<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const entradas = computed(() => {
  const t = props.item.tabs as { icon?: string; label: string }[] | undefined
  return t && t.length > 0 ? t : [{ icon: 'add', label: 'Nova' }]
})
</script>

<template>
  <div class="flex w-[220px] flex-col gap-1.5" role="menu" aria-label="FAB menu">
    <span
      v-for="(t, i) in entradas"
      :key="i"
      role="menuitem"
      class="flex h-14 items-center justify-end gap-2"
    >
      <span class="rounded-badge px-2 py-1 text-xs" :style="{ background: scheme.surfaceContainerHigh, color: scheme.onSurface }">{{ t.label }}</span>
      <span class="m3-elev-2 flex h-14 w-14 items-center justify-center" :style="{ background: scheme.primaryContainer, color: scheme.onPrimaryContainer, borderRadius: '16px' }">
        <M3Icon :name="t.icon ?? 'add'" :size="24" />
      </span>
    </span>
  </div>
</template>
