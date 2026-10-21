<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import { onBeforeUnmount } from 'vue'
import type { NexoObject } from '@/types/nexo'
import LucideIcon from '@/components/common/LucideIcon.vue'

defineProps<{ no: NexoObject; selecionado: boolean; teal?: boolean; preview?: boolean }>()

const emit = defineEmits<{
  (e: 'selecionar', id: string): void
  (e: 'aprofundar', id: string): void
  (e: 'iniciar-conexao', id: string, lado: 'l' | 'r' | 't' | 'b', ev: PointerEvent): void
  (e: 'ativar-handle', id: string, lado: 'l' | 'r' | 't' | 'b'): void
  (e: 'mover', id: string, dx: number, dy: number): void
  (e: 'fim-mover', id: string): void
}>()

const estadoRotulo: Record<string, string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  approved: 'Aprovada',
  baseline: 'Baseline',
  stale: 'Desatualizada',
  regenerated: 'Regenerada',
  validated: 'Validada',
  published: 'Publicada'
}
const ladoRotulo: Record<'l' | 'r' | 't' | 'b', string> = {
  l: 'esquerda', r: 'direita', t: 'superior', b: 'inferior'
}

type NodeGesture = {
  pointerId: number
  id: string
  startX: number
  startY: number
  moved: boolean
  element: HTMLElement
  onMove: (event: PointerEvent) => void
  onUp: (event: PointerEvent) => void
  onCancel: (event: PointerEvent) => void
  onLostCapture: (event: PointerEvent) => void
}

let activeGesture: NodeGesture | null = null

function finishGesture(gesture: NodeGesture, cancelled: boolean) {
  if (activeGesture !== gesture) return
  activeGesture = null
  window.removeEventListener('pointermove', gesture.onMove)
  window.removeEventListener('pointerup', gesture.onUp)
  window.removeEventListener('pointercancel', gesture.onCancel)
  gesture.element.removeEventListener('lostpointercapture', gesture.onLostCapture)

  if (gesture.moved) emit('fim-mover', gesture.id)
  else if (!cancelled) emit('selecionar', gesture.id)
}

function onPointerDownCard(id: string, ev: PointerEvent) {
  if (ev.button !== 0) return
  if ((ev.target as HTMLElement).closest('[data-handle], [data-node-action]')) return
  if (activeGesture) finishGesture(activeGesture, true)

  const element = ev.currentTarget as HTMLElement
  try {
    element.setPointerCapture(ev.pointerId)
  } catch {
    // Window listeners still handle the gesture if pointer capture is unavailable.
  }
  const sx = ev.clientX
  const sy = ev.clientY
  const gesture = {} as NodeGesture
  gesture.pointerId = ev.pointerId
  gesture.id = id
  gesture.startX = sx
  gesture.startY = sy
  gesture.moved = false
  gesture.element = element
  gesture.onMove = (moveEvent) => {
    if (moveEvent.pointerId !== gesture.pointerId) return
    const dx = moveEvent.clientX - gesture.startX
    const dy = moveEvent.clientY - gesture.startY
    if (!gesture.moved && Math.hypot(dx, dy) <= 3) return
    gesture.moved = true
    emit('mover', gesture.id, dx, dy)
  }
  gesture.onUp = (upEvent) => {
    if (upEvent.pointerId === gesture.pointerId) finishGesture(gesture, false)
  }
  gesture.onCancel = (cancelEvent) => {
    if (cancelEvent.pointerId === gesture.pointerId) finishGesture(gesture, true)
  }
  gesture.onLostCapture = (lostEvent) => {
    if (lostEvent.pointerId === gesture.pointerId) finishGesture(gesture, true)
  }
  activeGesture = gesture
  window.addEventListener('pointermove', gesture.onMove)
  window.addEventListener('pointerup', gesture.onUp)
  window.addEventListener('pointercancel', gesture.onCancel)
  element.addEventListener('lostpointercapture', gesture.onLostCapture)
}

onBeforeUnmount(() => {
  if (activeGesture) finishGesture(activeGesture, true)
})

function onNodeActionKeydown(id: string, ev: KeyboardEvent) {
  if (ev.key === 'Enter' && ev.shiftKey) {
    ev.preventDefault()
    emit('aprofundar', id)
  }
}
</script>

<template>
  <div
    role="group"
    :aria-label="`${no.titulo}, ${no.tipo}, ${estadoRotulo[no.status] ?? no.status}`"
    class="relative w-[280px] select-none rounded-card border bg-white p-4 shadow-card"
    :style="{ '--canvas-node-border-width': selecionado ? '2px' : '1px' }"
    :class="
      no.status === 'stale'
        ? 'border-dashed border-nexo-stale-border bg-nexo-stale-bg/40'
        : selecionado
          ? 'border-2 border-nexo-primary shadow-node-selected'
          : 'border-nexo-border'
    "
    @pointerdown.stop="onPointerDownCard(no.id, $event)"
    @dblclick="emit('aprofundar', no.id)"
  >
    <div class="flex items-start justify-between">
      <span
        class="flex h-8 w-8 items-center justify-center rounded-badge"
        :class="
          no.id === 'ft-confirmar'
            ? 'bg-nexo-primary-soft text-nexo-primary'
            : teal
              ? 'bg-nexo-teal-bg text-nexo-teal'
              : no.status === 'stale'
                ? 'bg-nexo-stale-bg text-nexo-stale-accent'
                : 'bg-nexo-primary-soft text-nexo-primary'
        "
        aria-hidden="true"
      >
        <svg
          v-if="no.id === 'ft-confirmar'"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2 4 5.5v5.7c0 5 3.4 8.6 8 10.3 4.6-1.7 8-5.3 8-10.3V5.5L12 2z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <svg
          v-else-if="no.id === 'ft-criar'"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <svg
          v-else-if="no.status === 'stale'"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3 2.5 19.5h19L12 3z" />
          <line x1="12" y1="9" x2="12" y2="13.5" />
          <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
        </svg>
        <svg
          v-else
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 2h9l5 5v15H6V2z" />
          <path d="M14 2v6h6" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      </span>
      <button
        type="button"
        data-node-action
        :aria-label="`${no.titulo}, ${no.tipo}, ${estadoRotulo[no.status] ?? no.status}`"
        :aria-pressed="selecionado"
        class="pointer-events-none absolute right-2 top-2 z-10 rounded-btn px-2 py-1 text-xs text-nexo-muted opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nexo-primary"
        @pointerdown.stop
        @click.stop="emit('selecionar', no.id)"
        @keydown="onNodeActionKeydown(no.id, $event)"
      >
        Selecionar
      </button>
    </div>

    <p class="mt-2 text-[15px] font-semibold leading-snug text-nexo-text">{{ no.titulo }}</p>
    <p class="mt-1 text-[13.5px] leading-relaxed text-nexo-muted">{{ no.descricao }}</p>

    <div class="mt-3 flex items-center justify-between">
      <span
        v-if="no.status === 'stale'"
        class="inline-flex items-center gap-1 rounded-badge bg-nexo-stale-bg px-2 py-0.5 text-xs font-medium text-nexo-stale"
      >
        <LucideIcon name="alert" :size="12" /> Desatualizada
      </span>
      <span
        v-else
        class="rounded-badge px-2 py-0.5 text-xs font-medium capitalize"
        :class="teal ? 'bg-nexo-teal-bg text-nexo-teal' : 'bg-nexo-primary-soft text-nexo-primary'"
      >
        {{ no.tipo }}
      </span>
      <span class="flex items-center gap-1 text-xs text-nexo-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 14.6c2.9.3 5.5 2.4 5.5 5.4" />
        </svg>
        {{ no.contribuidores.length }}
      </span>
    </div>
    <span v-if="no.grupo" class="mt-2 inline-block rounded-badge bg-nexo-draft-bg px-2 py-0.5 text-xs text-nexo-draft">
      {{ no.grupo }}
    </span>

    <!-- handles de conexão (4 lados), sempre visíveis no hover/seleção -->
    <template v-if="!preview">
      <NovaAction
        v-for="lado in (['l', 'r', 't', 'b'] as const)"
        :key="lado"
        type="button"
      variant="icon"
      empty
        :data-handle="lado"
        :aria-label="`Iniciar ou concluir conexão em ${no.titulo}, lado ${ladoRotulo[lado]}`"
        class="canvas-node-handle absolute h-6 w-6 rounded-full"
        :class="{
          'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2': lado === 't',
          'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2': lado === 'b',
          'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2': lado === 'l',
          'right-0 top-1/2 translate-x-1/2 -translate-y-1/2': lado === 'r'
        }"
      :style="{
        width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', padding: '0',
        left: lado === 'l' ? 'calc(0px - var(--canvas-node-border-width))' : undefined,
        right: lado === 'r' ? 'calc(0px - var(--canvas-node-border-width))' : undefined,
        top: lado === 't' ? 'calc(0px - var(--canvas-node-border-width))' : undefined,
        bottom: lado === 'b' ? 'calc(0px - var(--canvas-node-border-width))' : undefined,
        opacity: selecionado ? 1 : undefined
      }"
        @pointerdown.stop="emit('iniciar-conexao', no.id, lado, $event)"
        @keydown.enter.prevent.stop="emit('ativar-handle', no.id, lado)"
        @keydown.space.prevent.stop="emit('ativar-handle', no.id, lado)"
      />
    </template>
  </div>
</template>

<style scoped>
:deep(.canvas-node-handle) {
  border: 0;
  background: transparent;
  box-shadow: none;
}

:deep(.canvas-node-handle:hover) {
  background: transparent;
}

:deep(.canvas-node-handle::before) {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border: 2px solid var(--v-color-primary);
  border-radius: 9999px;
  background: var(--v-color-surface);
  content: '';
  pointer-events: none;
}

:deep(.canvas-node-handle:hover::before) {
  background: var(--v-color-primary);
}

[role='group']:not(:focus-within) > button[data-handle]:not(:hover) {
  opacity: 0;
}
[role='group']:hover > button[data-handle],
[role='group']:focus-within > button[data-handle] {
  opacity: 1;
}
</style>
