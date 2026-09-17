<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div
    class="flex h-14 w-full items-center gap-3 px-4"
    :style="{ background: scheme.surfaceContainerHigh, color: scheme.onSurfaceVariant, borderRadius: '999px' }"
  >
    <M3Icon :name="item.icon ?? 'search'" :size="22" />
    <span class="flex-1 text-[15px]">{{ item.label ?? 'Buscar' }}</span>
  </div>
</template>
