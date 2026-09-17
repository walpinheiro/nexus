<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme; modo?: 'date' | 'time' }>()
</script>

<template>
  <div
    class="m3-elev-2 w-[328px] p-4"
    :style="{ background: scheme.surfaceContainerHigh, color: scheme.onSurface, borderRadius: '28px' }"
    role="dialog"
    :aria-label="item.label ?? 'Picker'"
  >
    <p class="text-xs" :style="{ color: scheme.onSurfaceVariant }">{{ item.label ?? 'Selecionar' }}</p>
    <p class="mt-1 text-2xl">{{ modo === 'time' ? String(item.value ?? '12:00') : 'Hoje' }}</p>
    <div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs" :style="{ color: scheme.onSurfaceVariant }" aria-hidden="true">
      <span v-for="d in ['D','S','T','Q','Q','S','S']" :key="d">{{ d }}</span>
      <span v-for="n in 31" :key="n" class="rounded-full py-1" :style="n === 17 ? { background: scheme.primary, color: scheme.onPrimary } : {}">{{ n }}</span>
    </div>
    <div class="mt-3 flex justify-end gap-2 text-sm font-medium" :style="{ color: scheme.primary }">
      <button type="button">Cancelar</button>
      <button type="button">OK</button>
    </div>
    <M3Icon v-if="false" name="close" :size="1" />
  </div>
</template>
