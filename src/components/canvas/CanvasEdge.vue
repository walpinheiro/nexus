<script setup lang="ts">
import { computed } from 'vue'
import type { Edge, NexoObject } from '@/types/nexo'
import { edgePath, facingHandles, handlePoint, NODE_DEFAULT_HEIGHT, NODE_WIDTH, type CanvasRect } from './geometry'

const props = defineProps<{
  aresta: Edge
  origem: NexoObject
  destino: NexoObject
  origemSize?: { width: number; height: number }
  destinoSize?: { width: number; height: number }
  selecionada: boolean
}>()

const emit = defineEmits<{ (e: 'selecionar-aresta', id: string): void }>()

const rects = computed<[CanvasRect, CanvasRect]>(() => [
  { x: props.origem.x, y: props.origem.y, width: props.origemSize?.width ?? NODE_WIDTH, height: props.origemSize?.height ?? NODE_DEFAULT_HEIGHT },
  { x: props.destino.x, y: props.destino.y, width: props.destinoSize?.width ?? NODE_WIDTH, height: props.destinoSize?.height ?? NODE_DEFAULT_HEIGHT }
])
const sides = computed(() => {
  const [autoSource, autoTarget] = facingHandles(...rects.value)
  return [props.aresta.origemHandle ?? autoSource, props.aresta.destinoHandle ?? autoTarget] as const
})
const path = computed(() => edgePath(rects.value[0], rects.value[1], sides.value[0], sides.value[1]))
const mid = computed(() => {
  const a = handlePoint(rects.value[0], sides.value[0])
  const b = handlePoint(rects.value[1], sides.value[1])
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
})

const cor = computed(() => {
  switch (props.aresta.tipo) {
    case 'contem':
      return 'var(--v-color-text-muted)'
    case 'realiza':
    case 'consome':
      return 'var(--v-color-primary)'
    case 'valida':
      return 'var(--v-color-success-strong)'
    case 'restringe':
      return 'var(--v-color-error-strong)'
    case 'impacta':
      return 'var(--v-color-warning-strong)'
    default:
      return 'var(--v-color-primary)'
  }
})

const tracejada = computed(() =>
  ['valida', 'restringe', 'impacta'].includes(props.aresta.tipo) ? '6 4' : undefined
)

const rotulo = computed(() => `${props.aresta.tipo} · ${props.origem.titulo} → ${props.destino.titulo}`)

function onKeydown(ev: KeyboardEvent) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return
  ev.preventDefault()
  ev.stopPropagation()
  emit('selecionar-aresta', props.aresta.edge_id)
}
</script>

<template>
  <g
    role="button"
    tabindex="0"
    :aria-label="rotulo"
    :aria-pressed="selecionada"
    class="canvas-edge-action"
    @click.stop="emit('selecionar-aresta', aresta.edge_id)"
    @keydown="onKeydown"
  >
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
      :cx="mid.x"
      :cy="mid.y"
      r="4"
      :fill="selecionada ? cor : 'var(--v-color-surface)'"
      :stroke="cor"
      stroke-width="2"
    />
  </g>
</template>

<style scoped>
.canvas-edge-action:focus-visible > path:first-of-type {
  stroke: var(--v-color-primary);
  stroke-opacity: 0.28;
  stroke-width: 16px;
}
</style>
