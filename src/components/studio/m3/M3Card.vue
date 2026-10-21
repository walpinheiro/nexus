<script setup lang="ts">
import { computed } from 'vue'
import { VCard } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
const props = defineProps<{ item: StudioItem; scheme: Scheme }>()
const variant = computed(() => props.item.variant === 'outlined' ? 'outlined' : 'elevated')
</script>
<template>
  <VCard :variant="variant" :style="{ width: item.w ? item.w + 'px' : '100%' }">
    <template v-if="!item.noImage" #media>
      <div class="flex h-28 w-full items-center justify-center" :style="{ background: item.src ? undefined : scheme.primaryContainer, color: scheme.onPrimaryContainer }">
        <img v-if="item.src" :src="item.src" alt="" class="h-full w-full object-cover" />
        <span v-else aria-hidden="true">▧</span>
      </div>
    </template>
    <template #title>{{ item.label ?? 'Título do card' }}</template>
    <template #description>{{ item.supporting ?? '' }}</template>
  </VCard>
</template>
