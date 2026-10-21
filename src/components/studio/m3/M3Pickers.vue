<script setup lang="ts">
import { VCard } from 'vueui-nova-kit'
import NovaAction from '@/components/common/NovaAction.vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
defineProps<{ item: StudioItem; scheme: Scheme; modo?: 'date' | 'time' }>()
</script>
<template>
  <VCard variant="outlined" class="w-[328px] p-4">
    <template #title>{{ item.label ?? 'Selecionar' }}</template>
    <div class="text-2xl">{{ modo === 'time' ? String(item.value ?? '12:00') : 'Hoje' }}</div>
    <div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-[var(--v-color-text-muted)]" aria-hidden="true">
      <span v-for="d in ['D','S','T','Q','Q','S','S']" :key="d">{{ d }}</span>
      <span v-for="n in 31" :key="n" class="rounded-full py-1" :class="n === 17 ? 'bg-[var(--v-color-primary-text)] text-white' : ''">{{ n }}</span>
    </div>
    <div class="mt-3 flex justify-end gap-2 text-sm font-medium">
      <NovaAction>Cancelar</NovaAction><NovaAction variant="primary">OK</NovaAction>
    </div>
  </VCard>
</template>
