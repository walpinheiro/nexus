<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import { VAlert } from 'vueui-nova-kit'
import NovaAction from '@/components/common/NovaAction.vue'

const props = withDefaults(
  defineProps<{
    item: StudioItem
    scheme: Scheme
    tipo?: 'sucesso' | 'erro' | 'normal'
  }>(),
  { tipo: 'normal' }
)

const emit = defineEmits<{
  (e: 'fechar'): void
}>()
</script>

<template>
  <VAlert :title="item.label ?? 'Mensagem'" :description="item.supporting" :variant="props.tipo === 'sucesso' ? 'success' : props.tipo === 'erro' ? 'danger' : 'neutral'" size="sm" class="w-[344px] max-w-[90vw]" @dismiss="emit('fechar')">
    <template #action v-if="item.supporting"><NovaAction type="button" class="font-semibold text-xs underline" @click="emit('fechar')">{{ item.supporting }}</NovaAction></template>
  </VAlert>
</template>
