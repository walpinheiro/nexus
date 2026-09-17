<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <span class="inline-flex h-10 items-center gap-2">
    <span
      class="flex h-5 w-5 items-center justify-center"
      :style="{ border: `2px solid ${item.checked ? scheme.primary : scheme.onSurfaceVariant}`, borderRadius: '999px' }"
      role="radio"
      :aria-checked="!!item.checked"
    >
      <span
        v-if="item.checked"
        class="block h-2.5 w-2.5"
        :style="{ background: scheme.primary, borderRadius: '999px' }"
      />
    </span>
    <span v-if="item.label" class="text-sm" :style="{ color: scheme.onSurface }">{{ item.label }}</span>
  </span>
</template>
