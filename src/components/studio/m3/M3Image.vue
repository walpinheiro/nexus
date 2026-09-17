<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div
    class="flex h-[200px] w-[200px] items-center justify-center overflow-hidden"
    :style="{ background: scheme.surfaceContainerHighest, color: scheme.onSurfaceVariant, borderRadius: '16px' }"
  >
    <img v-if="item.src" :src="item.src" alt="" class="h-full w-full object-cover" />
    <M3Icon v-else name="image" :size="48" />
  </div>
</template>
