<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import Pickers from './M3Pickers.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <Pickers :item="item" :scheme="scheme" modo="date" />
</template>
