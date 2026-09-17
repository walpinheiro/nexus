<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import Media from './M3Media.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <Media :item="item" :scheme="scheme" modo="map" />
</template>
