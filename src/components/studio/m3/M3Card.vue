<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const estilo = computed(() => {
  const s = props.scheme
  const v = props.item.variant ?? 'tonal'
  if (v === 'elevated') return { background: s.surfaceContainerLow, shadow: '0 1px 3px rgb(0 0 0 / 0.18)', border: 'none' }
  if (v === 'outlined') return { background: s.surface, shadow: 'none', border: `1px solid ${s.outlineVariant}` }
  return { background: s.secondaryContainer, shadow: 'none', border: 'none' }
})
</script>

<template>
  <article
    class="w-full overflow-hidden"
    :style="{ background: estilo.background, boxShadow: estilo.shadow, border: estilo.border, borderRadius: '16px' }"
  >
    <div
      v-if="!item.noImage"
      class="flex h-28 w-full items-center justify-center"
      :style="{ background: item.src ? undefined : scheme.primaryContainer, color: scheme.onPrimaryContainer }"
    >
      <img v-if="item.src" :src="item.src" alt="" class="h-full w-full object-cover" />
      <M3Icon v-else name="image" :size="28" />
    </div>
    <div class="p-4">
      <h3 class="text-base font-medium" :style="{ color: scheme.onSurface }">{{ item.label ?? 'Título do card' }}</h3>
      <p v-if="item.supporting" class="mt-1 text-[13px]" :style="{ color: scheme.onSurfaceVariant }">{{ item.supporting }}</p>
    </div>
  </article>
</template>
