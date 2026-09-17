<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div
    class="m3-elev-3 w-[312px] p-6"
    :style="{ background: scheme.surfaceContainerHigh, color: scheme.onSurface, borderRadius: '28px' }"
    role="dialog"
    :aria-label="item.label ?? 'Diálogo'"
  >
    <M3Icon v-if="item.icon" :name="item.icon" :size="24" />
    <h3 class="mt-2 text-2xl">{{ item.label ?? 'Título' }}</h3>
    <p v-if="item.supporting" class="mt-2 text-sm" :style="{ color: scheme.onSurfaceVariant }">{{ item.supporting }}</p>
    <div class="mt-4 flex justify-end gap-2 text-sm font-medium" :style="{ color: scheme.primary }">
      <button type="button">Cancelar</button>
      <button type="button">OK</button>
    </div>
  </div>
</template>
