<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <div
    class="flex h-12 w-[344px] items-center gap-3 px-4 text-sm"
    :style="{ background: scheme.inverseSurface, color: scheme.inverseOnSurface, borderRadius: '8px' }"
    role="status"
  >
    <span class="flex-1 truncate">{{ item.label ?? 'Mensagem' }}</span>
    <button v-if="item.supporting" type="button" class="font-medium" :style="{ color: scheme.inversePrimary }">{{ item.supporting }}</button>
  </div>
</template>
