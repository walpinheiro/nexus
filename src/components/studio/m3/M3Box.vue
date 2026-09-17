<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div
    class="flex min-h-[220px] w-full p-4"
    :style="{ background: scheme.surfaceContainer, color: scheme.onSurfaceVariant, borderRadius: '16px' }"
  >
    <span
      v-if="item.checked"
      class="mx-auto mt-1 h-1 w-10"
      :style="{ background: scheme.outlineVariant, borderRadius: '999px' }"
      aria-hidden="true"
    />
    <span v-else class="text-sm">{{ item.label ?? '' }}</span>
  </div>
</template>
