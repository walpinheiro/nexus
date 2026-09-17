<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <span class="inline-flex items-center" role="group" aria-label="Split button">
    <span
      class="m3-ripple flex h-10 items-center px-4 text-sm font-medium"
      :style="{ background: scheme.primary, color: scheme.onPrimary, borderRadius: '999px 4px 4px 999px' }"
    >
      {{ item.label ?? 'Opções' }}
    </span>
    <span class="w-[2px]" aria-hidden="true" />
    <span
      class="m3-ripple flex h-10 w-10 items-center justify-center"
      :style="{ background: scheme.primary, color: scheme.onPrimary, borderRadius: '4px 999px 999px 4px' }"
    >
      <M3Icon :name="item.icon ?? 'arrow_drop_down'" :size="20" />
    </span>
  </span>
</template>
