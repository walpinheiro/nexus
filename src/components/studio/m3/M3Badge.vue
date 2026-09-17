<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <span
    class="inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-[11px] font-medium"
    :style="{ background: scheme.error, color: '#fff', borderRadius: '999px' }"
    role="status"
    :aria-label="item.label || 'badge'"
  >
    {{ item.label ?? '' }}
  </span>
</template>
