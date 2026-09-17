<script setup lang="ts">
import { computed } from 'vue'
import type { Edge, NexoObject } from '@/types/nexo'

const props = defineProps<{
  aresta: Edge
  origem: NexoObject
  destino: NexoObject
  selecionada: boolean
}>()

const emit = defineEmits<{ (e: 'selecionar-aresta', id: string): void }>()

// Pontos de ancoragem: centro-direita da origem -> centro-esquerda do destino,
// com fallback vertical quando empilhados.
const path = computed(() => {
  const W = 280
  const H = 190
  const ox = props.origem.x
  const oy = props.origem.y
  const dx = props.destino.x
  const dy = props.destino.y
  let x1 = ox + W
  let y1 = oy + H / 2
  let x2 = dx
  let y2 = dy + H / 2
  if (Math.abs(dy - oy) > Math.abs(dx - ox)) {
    if (dy > oy) {
      y1 = oy + H
      y2 = dy
      x1 = ox + W / 2
      x2 = dx + W / 2
    } else {
      y1 = oy
      y2 = dy + H
      x1 = ox + W / 2
      x2 = dx + W / 2
    }
  }
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
})

const cor = computed(() => {
  switch (props.aresta.tipo) {
    case 'contem':
      return '#64748B'
    case 'realiza':
    case 'consome':
      return '#1D4ED8'
    case 'valida':
      return '#15803D'
    case 'restringe':
      return '#B91C1C'
    case 'impacta':
      return '#D97706'
    default:
      return '#1D4ED8'
  }
})

const tracejada = computed(() =>
  ['valida', 'restringe', 'impacta'].includes(props.aresta.tipo) ? '6 4' : undefined
)

const rotulo = computed(() => `${props.aresta.tipo} · ${props.origem.titulo} → ${props.destino.titulo}`)
</script>

<template>
  <g @click.stop="emit('selecionar-aresta', aresta.edge_id)">
    <title>{{ rotulo }}</title>
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      stroke-width="16"
      style="cursor: pointer"
    />
    <path
      :d="path"
      fill="none"
      :stroke="cor"
      stroke-width="2"
      :stroke-dasharray="tracejada"
      :opacity="selecionada ? 1 : 0.85"
      marker-end="url(#nexo-arrow)"
    />
    <circle
      :cx="(origem.x + destino.x) / 2"
      :cy="(origem.y + destino.y) / 2"
      r="4"
      :fill="selecionada ? cor : '#fff'"
      :stroke="cor"
      stroke-width="2"
    />
  </g>
</template>
