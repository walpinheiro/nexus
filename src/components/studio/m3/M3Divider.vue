<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div class="w-full" :style="{ background: 'transparent' }" aria-hidden="true">
    <div class="h-4" :style="{ borderTop: `1px solid ${scheme.outlineVariant}` }" />
  </div>
</template>
