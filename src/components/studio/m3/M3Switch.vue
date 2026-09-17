<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <span class="inline-flex h-12 items-center gap-3" :style="{ width: item.w ? item.w + 'px' : undefined }">
    <span
      class="flex h-8 w-[52px] items-center px-1"
      :style="{
        background: item.checked ? scheme.primary : scheme.surfaceContainerHighest,
        border: item.checked ? 'none' : `2px solid ${scheme.outline}`,
        borderRadius: '999px',
        justifyContent: item.checked ? 'flex-end' : 'flex-start'
      }"
      role="switch"
      :aria-checked="!!item.checked"
    >
      <span
        class="block"
        :style="{
          width: item.checked ? '24px' : '16px',
          height: item.checked ? '24px' : '16px',
          background: item.checked ? scheme.onPrimary : scheme.outline,
          borderRadius: '999px'
        }"
      />
    </span>
    <span v-if="item.label" class="text-sm" :style="{ color: scheme.onSurface }">{{ item.label }}</span>
  </span>
</template>
