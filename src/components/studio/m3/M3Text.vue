<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <p
    :style="{
      color: scheme.onSurface,
      fontSize: (item.size ?? 28) + 'px',
      fontWeight: (item as unknown as Record<string, unknown>).bold ? 700 : 400,
      lineHeight: 1.2
    }"
  >
    {{ item.label ?? 'Texto' }}
  </p>
</template>
