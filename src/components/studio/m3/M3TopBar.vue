<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <header
    class="flex h-16 w-full items-center gap-3 px-4"
    :style="{ background: scheme.surface, color: scheme.onSurface }"
  >
    <M3Icon v-if="item.icon" :name="item.icon" :size="24" />
    <span class="flex-1 text-[22px]">{{ item.label ?? 'Título' }}</span>
    <M3Icon v-if="(item as unknown as Record<string, unknown>).icon2" :name="String((item as unknown as Record<string, unknown>).icon2)" :size="24" />
  </header>
</template>
