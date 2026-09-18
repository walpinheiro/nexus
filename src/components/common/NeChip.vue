<script setup lang="ts">
import LucideIcon from './LucideIcon.vue'

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

const base =
  'inline-flex min-h-[32px] items-center gap-1.5 rounded-badge border px-3 text-xs font-medium transition-colors'

const porVariante: Record<string, string> = {
  primary:
    'border-nexo-primary/40 bg-nexo-primary/5 text-nexo-primary hover:bg-nexo-primary/10',
  neutral: 'border-nexo-border bg-nexo-canvas text-nexo-text hover:bg-white'
}
</script>

<template>
  <button type="button" :title="title || label" :class="[base, porVariante[props.variant]]">
    <LucideIcon :name="icon" :size="size" class="shrink-0" />
    <span class="truncate">{{ label }}</span>
  </button>
</template>
