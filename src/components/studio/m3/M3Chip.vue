<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'
import { VBadge } from 'vueui-nova-kit'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <VBadge :variant="item.variant === 'tonal' ? 'primary' : 'outlined'" size="md" :style="{ width: item.w ? item.w + 'px' : undefined }">
    <M3Icon v-if="item.checked" name="check" :size="16" />
    <M3Icon v-else-if="item.icon" :name="item.icon" :size="16" />
    {{ item.label ?? 'Chip' }}
  </VBadge>
</template>
