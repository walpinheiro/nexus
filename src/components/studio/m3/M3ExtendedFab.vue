<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>

<template>
  <NovaAction
    type="button"
    class="m3-ripple m3-elev-2 flex h-14 items-center gap-2 px-5 text-sm font-medium"
    :style="{ background: scheme.primaryContainer, color: scheme.onPrimaryContainer, borderRadius: '16px' }"
  >
    <M3Icon :name="item.icon ?? 'edit'" :size="22" />
    {{ item.label ?? 'Criar' }}
  </NovaAction>
</template>
