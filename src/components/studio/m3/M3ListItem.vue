<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div
    class="flex h-[72px] w-full items-center gap-3 px-4"
    :style="{ background: scheme.surface, color: scheme.onSurface }"
  >
    <span
      v-if="item.icon"
      class="flex h-10 w-10 shrink-0 items-center justify-center"
      :style="{ background: scheme.primaryContainer, color: scheme.onPrimaryContainer, borderRadius: '999px' }"
    >
      <M3Icon :name="item.icon" :size="20" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px]">{{ item.label ?? 'Item' }}</span>
      <span v-if="item.supporting" class="block truncate text-[13px]" :style="{ color: scheme.onSurfaceVariant }">{{ item.supporting }}</span>
    </span>
    <M3Icon v-if="(item as unknown as Record<string, unknown>).icon2" :name="String((item as unknown as Record<string, unknown>).icon2)" :size="20" />
  </div>
</template>
