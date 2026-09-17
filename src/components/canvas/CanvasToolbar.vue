<script setup lang="ts">
import { useUI } from '@/stores/useUI'

const ui = useUI()
const emit = defineEmits<{
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'fit'): void
  (e: 'tidy'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'adicionar'): void
}>()

const botoes = [
  { id: 'select', titulo: 'Selecionar (V)', icone: 'cursor' },
  { id: 'hand', titulo: 'Mover canvas — arrastar o fundo (H)', icone: 'hand' },
  { id: 'connect', titulo: 'Conectar nós — arraste de um handle a outro', icone: 'branch' },
  { id: 'comment', titulo: 'Comentar nó selecionado (abre Copilot)', icone: 'comment' }
] as const

function clicar(id: (typeof botoes)[number]['id']) {
  ui.setFerramenta(id === 'comment' ? 'comment' : id)
  if (id === 'comment') emit('adicionar')
}
</script>

<template>
  <div
    class="flex flex-col gap-1 rounded-card border border-nexo-border bg-white p-1.5 shadow-card"
    role="toolbar"
    aria-label="Ferramentas do canvas"
    aria-orientation="vertical"
  >
    <button
      v-for="b in botoes"
      :key="b.id"
      type="button"
      :title="b.titulo"
      :aria-label="b.titulo"
      :aria-pressed="ui.state.ferramenta === b.id"
      class="rounded-badge p-2"
      :class="ui.state.ferramenta === b.id ? 'bg-nexo-primary-soft text-nexo-primary' : 'text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text'"
      @click="clicar(b.id)"
    >
      <svg v-if="b.icone === 'hand'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-5.5v-1a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.8a6 6 0 0 1-4.7-2.3L3.6 15a1.6 1.6 0 0 1 2.5-2L8 14.5" />
      </svg>
      <svg v-else-if="b.icone === 'cursor'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
        <path d="m5 3 14 7-6.5 1.5L9 18 5 3z" />
      </svg>
      <svg v-else-if="b.icone === 'branch'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="12" r="2.5" />
        <path d="M8 7.5C12 9 12 10.5 15.5 11M8 16.5c4-1.5 4-3 7.5-4" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
      </svg>
    </button>

    <div class="mx-1 border-t border-nexo-border" aria-hidden="true" />

    <button type="button" title="Aproximar (+)" aria-label="Aproximar" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('zoom-in')">+</button>
    <button type="button" title="Afastar (-)" aria-label="Afastar" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('zoom-out')">−</button>
    <button type="button" title="Ajustar à tela (0)" aria-label="Ajustar à tela" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('fit')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
    </button>
    <button type="button" title="Organizar em grade (tidy)" aria-label="Organizar em grade" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('tidy')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>
    <button type="button" title="Novo nó (duplo-clique no vazio também cria)" aria-label="Novo nó" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('adicionar')">＋</button>

    <div class="mx-1 border-t border-nexo-border" aria-hidden="true" />

    <button type="button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('undo')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
      </svg>
    </button>
    <button type="button" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" class="rounded-badge p-2 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text" @click="emit('redo')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 14 5-5-5-5" />
        <path d="M20 9H10a6 6 0 0 0 0 12h3" />
      </svg>
    </button>
  </div>
</template>
