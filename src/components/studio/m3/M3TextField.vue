<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const variant = computed(() => props.item.variant ?? 'outlined')
const contorno = computed(() =>
  variant.value === 'filled'
    ? { border: 'none', background: props.scheme.surfaceContainerHighest }
    : { border: `1px solid ${props.scheme.outline}`, background: 'transparent' }
)
</script>

<template>
  <label
    class="relative block h-14 w-full"
    :style="{ background: contorno.background, border: contorno.border, borderRadius: '4px' }"
  >
    <span
      class="absolute -top-2 left-3 px-1 text-xs"
      :style="{ background: scheme.surface, color: scheme.primary }"
    >
      {{ item.label ?? 'Rótulo' }}
    </span>
    <span class="flex h-full items-center gap-2 px-4" :style="{ color: scheme.onSurfaceVariant }">
      <M3Icon v-if="item.icon" :name="item.icon" :size="20" />
      <span class="flex-1" />
      <span
        v-if="variant === 'filled'"
        class="absolute inset-x-0 bottom-0 h-[2px]"
        :style="{ background: scheme.primary }"
        aria-hidden="true"
      />
    </span>
    <span v-if="item.supporting" class="mt-1 block px-4 text-xs" :style="{ color: scheme.onSurfaceVariant }">
      {{ item.supporting }}
    </span>
  </label>
</template>
