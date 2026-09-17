<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const pct = computed(() => Math.min(100, Math.max(0, props.item.value ?? 40)))
</script>

<template>
  <div
    class="flex h-11 w-full items-center"
    role="slider"
    :aria-valuenow="pct"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <span class="relative h-1 w-full" :style="{ background: scheme.surfaceContainerHighest, borderRadius: '999px' }">
      <span class="absolute inset-y-0 left-0" :style="{ width: pct + '%', background: scheme.primary, borderRadius: '999px' }" />
      <span
        class="absolute top-1/2 h-5 w-1.5 -translate-y-1/2"
        :style="{ left: `calc(${pct}% - 3px)`, background: scheme.primary, borderRadius: '2px' }"
      />
    </span>
  </div>
</template>
