<script setup lang="ts">
import type { NexoObject } from '@/types/nexo'

defineProps<{ no: NexoObject; selecionado: boolean; teal?: boolean; preview?: boolean }>()

const emit = defineEmits<{
  (e: 'selecionar', id: string): void
  (e: 'aprofundar', id: string): void
  (e: 'iniciar-conexao', id: string, lado: 'l' | 'r' | 't' | 'b', ev: PointerEvent): void
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

function onPointerDownCard(id: string, ev: PointerEvent) {
  if ((ev.target as HTMLElement).closest('[data-handle]')) return
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  const sx = ev.clientX
  const sy = ev.clientY
  let dx = 0
  let dy = 0
  let moveu = false
  const move = (m: PointerEvent) => {
    dx = m.clientX - sx
    dy = m.clientY - sy
    if (Math.abs(dx) + Math.abs(dy) > 3) moveu = true
    emit('mover', id, dx, dy)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (!moveu) emit('selecionar', id)
    else emit('fim-mover', id)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onKeydown(id: string, ev: KeyboardEvent) {
  if (ev.key === 'Enter') {
    ev.preventDefault()
    if (ev.shiftKey) emit('aprofundar', id)
    else emit('selecionar', id)
  }
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="`${no.titulo}, ${no.tipo}, ${estadoRotulo[no.status] ?? no.status}`"
    :aria-pressed="selecionado"
    class="relative w-[280px] select-none rounded-card border bg-white p-4 shadow-card focus-visible:outline-2 focus-visible:outline-nexo-primary"
    :class="
      no.status === 'stale'
        ? 'border-dashed border-nexo-stale-border bg-nexo-stale-bg/40'
        : selecionado
          ? 'border-2 border-nexo-primary shadow-node-selected'
          : 'border-nexo-border'
    "
    @pointerdown="onPointerDownCard(no.id, $event)"
    @dblclick="emit('aprofundar', no.id)"
    @keydown="onKeydown(no.id, $event)"
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
      <span v-if="selecionado" class="text-nexo-muted" aria-hidden="true">···</span>
    </div>

    <p class="mt-2 text-[15px] font-semibold leading-snug text-nexo-text">{{ no.titulo }}</p>
    <p class="mt-1 text-[13.5px] leading-relaxed text-nexo-muted">{{ no.descricao }}</p>

    <div class="mt-3 flex items-center justify-between">
      <span
        v-if="no.status === 'stale'"
        class="rounded-badge bg-nexo-stale-bg px-2 py-0.5 text-xs font-medium text-nexo-stale"
      >
        ⚠ Desatualizada
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
    <span v-if="no.grupo" class="mt-2 inline-block rounded-badge bg-nexo-draft-bg px-2 py-0.5 text-[11px] text-nexo-draft">
      {{ no.grupo }}
    </span>

    <!-- handles de conexão (4 lados), sempre visíveis no hover/seleção -->
    <template v-if="!preview">
      <button
        v-for="lado in (['l', 'r', 't', 'b'] as const)"
        :key="lado"
        type="button"
        data-handle
        :aria-label="`Conectar a partir de ${no.titulo} (${lado})`"
        class="absolute h-3 w-3 rounded-full border-2 border-nexo-primary bg-white hover:bg-nexo-primary"
        :class="{
          'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2': lado === 't',
          'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2': lado === 'b',
          'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2': lado === 'l',
          'right-0 top-1/2 -translate-x-1/2 translate-y-1/2': lado === 'r'
        }"
        :style="{ opacity: selecionado ? 1 : undefined }"
        @pointerdown.stop="emit('iniciar-conexao', no.id, lado, $event)"
      />
    </template>
  </div>
</template>

<style scoped>
div[role='button']:not(:focus-within) > button[data-handle]:not(:hover) {
  opacity: 0;
}
div[role='button']:hover > button[data-handle],
div[role='button']:focus-within > button[data-handle] {
  opacity: 1;
}
</style>
