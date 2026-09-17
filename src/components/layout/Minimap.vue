<script setup lang="ts">
import { computed } from 'vue'
import { useGraph } from '@/stores/useGraph'

const props = defineProps<{ largura?: number; altura?: number }>()

const emit = defineEmits<{ (e: 'navegar', x: number, y: number): void }>()

const graph = useGraph()

const W = computed(() => props.largura ?? 180)
const H = computed(() => props.altura ?? 110)

// bounds do mundo
const bounds = computed(() => {
  const xs = graph.state.nos.map((n) => n.x)
  const ys = graph.state.nos.map((n) => n.y)
  const minX = Math.min(0, ...xs) - 60
  const minY = Math.min(0, ...ys) - 60
  const maxX = Math.max(1200, ...xs.map((x) => x + 280)) + 60
  const maxY = Math.max(800, ...ys.map((y) => y + 190)) + 60
  return { minX, minY, maxX, maxY }
})

const escala = computed(() => {
  const b = bounds.value
  return Math.min(W.value / (b.maxX - b.minX), H.value / (b.maxY - b.minY))
})

function paraMini(x: number, y: number): [number, number] {
  const b = bounds.value
  const s = escala.value
  return [(x - b.minX) * s, (y - b.minY) * s]
}

function clicar(ev: MouseEvent) {
  const rect = (ev.currentTarget as SVGElement).getBoundingClientRect()
  const mx = ev.clientX - rect.left
  const my = ev.clientY - rect.top
  const b = bounds.value
  const s = escala.value
  emit('navegar', b.minX + mx / s, b.minY + my / s)
}
</script>

<template>
  <svg
    :width="W"
    :height="H"
    class="rounded-badge border border-nexo-border bg-white"
    role="img"
    aria-label="Minimap — clique para navegar"
    @click="clicar"
  >
    <rect
      v-for="n in graph.state.nos"
      :key="n.id"
      :x="paraMini(n.x, n.y)[0]"
      :y="paraMini(n.x, n.y)[1]"
      :width="Math.max(4, 280 * escala)"
      :height="Math.max(3, 190 * escala)"
      rx="1.5"
      :fill="n.id === graph.state.selecionadoId ? '#1D4ED8' : n.status === 'stale' ? '#F59E0B' : '#CBD5E1'"
    />
  </svg>
</template>
