<script setup lang="ts">
import { VBadge } from 'vueui-nova-kit'

const props = withDefaults(
  defineProps<{
    label: string
    icon?: string
    variant?: 'primary' | 'neutral'
    size?: number
    title?: string
  }>(),
  { icon: 'sparkles', variant: 'neutral', size: 14, title: '' }
)

</script>

<template>
  <VBadge :variant="props.variant === 'primary' ? 'primary' : 'neutral'" size="sm" :icon="icon" :aria-label="title || label" :title="title || label">
    <span class="truncate">{{ label }}</span>
  </VBadge>
</template>
