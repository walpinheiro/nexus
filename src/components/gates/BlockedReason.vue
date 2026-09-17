<script setup lang="ts">
import type { GateId } from '@/types/nexo'
import { gateAnterior } from '@/utils/gates'

const props = defineProps<{ gateId: GateId; anteriorId: GateId | null; motivo: string; anteriorTitulo?: string }>()
const anterior = gateAnterior(props.gateId)
</script>

<template>
  <div class="rounded-badge border border-nexo-border bg-nexo-draft-bg p-3 text-sm" role="alert">
    <p class="flex items-center gap-2 font-semibold text-nexo-draft">
      <span aria-hidden="true">🔒</span> Gate {{ props.gateId }} bloqueado
    </p>
    <p class="mt-1">{{ props.motivo }}</p>
    <p v-if="anterior" class="mt-1">
      Pré-requisito: Gate {{ anterior }}<span v-if="props.anteriorTitulo"> — {{ props.anteriorTitulo }}</span> (baseline não registrada).
      <RouterLink :to="`/gates/${anterior}`" class="text-nexo-primary underline">Ir para {{ anterior }}</RouterLink>
    </p>
  </div>
</template>
