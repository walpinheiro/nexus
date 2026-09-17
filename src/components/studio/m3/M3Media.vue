<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme; modo?: 'camera' | 'map' }>()
</script>

<template>
  <div
    class="flex items-center justify-center"
    :style="{
      width: (item.size ?? 380) + 'px',
      height: (item.size2 ?? (modo === 'camera' ? 507 : 285)) + 'px',
      background: scheme.surfaceContainerHighest,
      color: scheme.onSurfaceVariant,
      borderRadius: '16px'
    }"
    role="img"
    :aria-label="modo === 'camera' ? 'Prévia da câmera' : 'Mapa'"
  >
    <M3Icon :name="modo === 'camera' ? 'photo_camera' : 'map'" :size="48" />
  </div>
</template>
