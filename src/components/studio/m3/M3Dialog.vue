<script setup lang="ts">
import { VCard } from 'vueui-nova-kit'
import NovaAction from '@/components/common/NovaAction.vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
defineProps<{ item: StudioItem; scheme: Scheme }>()
</script>
<template>
  <!-- Preview inline: VDialog abriria um overlay global fora do artboard; VCard representa o modal no próprio canvas. -->
  <VCard variant="elevated" class="w-[312px] p-6" :aria-label="item.label ?? 'Diálogo'">
    <template #title>{{ item.label ?? 'Título' }}</template>
    <template #description>{{ item.supporting ?? '' }}</template>
    <div class="mt-4 flex justify-end gap-2"><NovaAction>Cancelar</NovaAction><NovaAction variant="primary">OK</NovaAction></div>
  </VCard>
</template>
