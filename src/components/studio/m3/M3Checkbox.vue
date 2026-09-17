<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <span class="inline-flex h-10 items-center gap-2">
    <span
      class="flex h-[18px] w-[18px] items-center justify-center"
      :style="{
        background: item.checked ? scheme.primary : 'transparent',
        color: scheme.onPrimary,
        border: item.checked ? 'none' : `2px solid ${scheme.onSurfaceVariant}`,
        borderRadius: '3px'
      }"
      role="checkbox"
      :aria-checked="!!item.checked"
    >
      <M3Icon v-if="item.checked" name="check" :size="14" />
    </span>
    <span v-if="item.label" class="text-sm" :style="{ color: scheme.onSurface }">{{ item.label }}</span>
  </span>
</template>
