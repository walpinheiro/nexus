<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const variant = computed(() => props.item.variant ?? 'circular')
const pct = computed(() => (typeof props.item.value === 'number' ? Math.min(100, Math.max(0, props.item.value)) : null))
</script>

<template>
  <div v-if="variant === 'linear'" class="h-6 w-full" role="progressbar" :aria-valuenow="pct ?? undefined">
    <div class="h-1 w-full" :style="{ background: scheme.surfaceContainerHighest, borderRadius: '999px' }">
      <div class="h-full" :style="{ width: (pct ?? 40) + '%', background: scheme.primary, borderRadius: '999px' }" />
    </div>
  </div>
  <div
    v-else
    class="h-12 w-12"
    role="progressbar"
    :aria-valuenow="pct ?? undefined"
    :style="{ borderRadius: '999px', border: `4px solid ${scheme.surfaceContainerHighest}`, borderTopColor: scheme.primary }"
  />
</template>
