<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const cartoes = computed(() => {
  const t = (props.item.tabs as { label: string }[] | undefined) ?? []
  return t.length > 0 ? t.slice(0, 5) : [{ label: props.item.label ?? 'Destaque' }]
})
</script>

<template>
  <div class="flex w-[380px] gap-2 overflow-hidden" role="list" aria-label="Carousel">
    <article
      v-for="(c, i) in cartoes"
      :key="i"
      role="listitem"
      class="w-40 shrink-0 overflow-hidden"
      :style="{ background: scheme.secondaryContainer, borderRadius: '16px' }"
    >
      <div class="h-20" :style="{ background: scheme.primaryContainer }" />
      <p class="p-2 text-xs font-medium" :style="{ color: scheme.onSecondaryContainer }">{{ c.label }}</p>
    </article>
    <M3Icon v-if="false" name="close" :size="1" />
  </div>
</template>
