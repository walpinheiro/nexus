<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  Hand,
  LayoutGrid,
  ListFilter,
  Link2,
  MessageCircle,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Scan,
  Undo2
} from 'lucide-vue-next'
import { VButton, VSearchField, VSelect, VToolbar, VToolbarDivider, VToolbarGroup } from 'vueui-nova-kit'
import { useUI } from '@/stores/useUI'
import type { Edge } from '@/types/nexo'

const ui = useUI()
const props = defineProps<{ tipoConexao: Edge['tipo'] }>()
const emit = defineEmits<{
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'fit'): void
  (e: 'tidy'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'adicionar'): void
  (e: 'update:tipoConexao', value: Edge['tipo']): void
}>()

const connectionMenuOpen = ref(false)
const filtersOpen = ref(false)
const ferramentaAtiva = computed(() => ui.state.ferramenta)
const filtrosAtivos = computed(() => !!(ui.state.buscaTexto || ui.state.filtroEstado || ui.state.filtroOwner))
const tipoLabel = computed(() => tiposConexao.find(({ value }) => value === props.tipoConexao)?.label ?? 'realiza')
const tiposConexao: Array<{ value: Edge['tipo']; label: string }> = [
  { value: 'contem', label: 'Contém' }, { value: 'realiza', label: 'Realiza' },
  { value: 'consome', label: 'Consome' }, { value: 'valida', label: 'Valida' },
  { value: 'restringe', label: 'Restringe' }, { value: 'impacta', label: 'Impacta' }
]
const estados = [
  { value: '', label: 'Todos os estados' }, { value: 'draft', label: 'Rascunho' },
  { value: 'review', label: 'Em revisão' }, { value: 'approved', label: 'Aprovado' },
  { value: 'stale', label: 'Desatualizado' }
]
const owners = [
  { value: '', label: 'Todos os owners' },
  ...['u-pm', 'u-ux', 'u-arq', 'u-tl', 'u-dev', 'u-qa', 'u-sec'].map((owner) => ({ value: owner, label: owner }))
]

function escolherFerramenta(id: 'select' | 'hand' | 'connect' | 'comment') {
  ui.setFerramenta(id)
}

function escolherTipo(tipo: Edge['tipo']) {
  emit('update:tipoConexao', tipo)
  connectionMenuOpen.value = false
}

function limparFiltros() {
  ui.state.buscaTexto = ''
  ui.state.filtroEstado = ''
  ui.state.filtroOwner = ''
  ui.persist()
}

function onToolbarKeydown(event: KeyboardEvent) {
  event.stopPropagation()
  if (event.key === 'ArrowDown' && (event.target as HTMLElement).closest('.canvas-connection-trigger')) {
    event.preventDefault()
    connectionMenuOpen.value = true
    void nextTick(() => document.querySelector<HTMLButtonElement>('[data-connection-option]')?.focus({ preventScroll: true }))
    return
  }
  if (event.key !== 'Escape') return
  event.preventDefault()
  if (connectionMenuOpen.value) {
    connectionMenuOpen.value = false
    document.querySelector<HTMLButtonElement>('.canvas-connection-trigger')?.focus({ preventScroll: true })
  } else if (filtersOpen.value) filtersOpen.value = false
}

function onConnectionMenuKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  const options = [...document.querySelectorAll<HTMLButtonElement>('[data-connection-option]')]
  if (!options.length) return
  const index = options.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'Home' ? 0
    : event.key === 'End' ? options.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length
  options[next]?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="canvas-toolbar-wrap" @pointerdown.stop @wheel.stop @keydown="onToolbarKeydown">
    <VToolbar class="canvas-tools-toolbar" variant="floating" size="sm" aria-label="Ferramentas do canvas">
      <VToolbarGroup class="canvas-tools-group" aria-label="Modo de interação">
        <VButton variant="outline" size="sm" class="canvas-tool-button" :class="{ 'is-active': ferramentaAtiva === 'select' }" aria-label="Selecionar (V)" title="Selecionar (V)" :aria-pressed="ferramentaAtiva === 'select'" @click="escolherFerramenta('select')"><MousePointer2 :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" :class="{ 'is-active': ferramentaAtiva === 'hand' }" aria-label="Mover canvas (H)" title="Mover canvas (H)" :aria-pressed="ferramentaAtiva === 'hand'" @click="escolherFerramenta('hand')"><Hand :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" :class="{ 'is-active': ferramentaAtiva === 'connect' }" aria-label="Conectar nós arrastando entre portas" title="Conectar nós arrastando entre portas" :aria-pressed="ferramentaAtiva === 'connect'" @click="escolherFerramenta('connect')"><Link2 :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" :class="{ 'is-active': ferramentaAtiva === 'comment' }" aria-label="Selecionar nó para abrir Copilot" title="Selecionar nó para abrir Copilot" :aria-pressed="ferramentaAtiva === 'comment'" @click="escolherFerramenta('comment')"><MessageCircle :size="18" /></VButton>
      </VToolbarGroup>

      <VToolbarDivider />

      <VToolbarGroup class="canvas-tools-group" aria-label="Zoom e enquadramento">
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Aproximar" title="Aproximar" @click="emit('zoom-in')"><Plus :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Afastar" title="Afastar" @click="emit('zoom-out')"><Minus :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Ajustar à tela" title="Ajustar à tela" @click="emit('fit')"><Scan :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Organizar em grade" title="Organizar em grade" @click="emit('tidy')"><LayoutGrid :size="18" /></VButton>
      </VToolbarGroup>

      <VToolbarDivider />

      <VToolbarGroup class="canvas-tools-group" aria-label="Edição">
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Novo nó" title="Novo nó" @click="emit('adicionar')"><Plus :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)" @click="emit('undo')"><Undo2 :size="18" /></VButton>
        <VButton variant="outline" size="sm" class="canvas-tool-button" aria-label="Refazer (Ctrl+Shift+Z)" title="Refazer (Ctrl+Shift+Z)" @click="emit('redo')"><Redo2 :size="18" /></VButton>
      </VToolbarGroup>

      <VToolbarDivider />

      <VToolbarGroup class="canvas-tools-group" aria-label="Filtros e tipo de conexão">
        <div class="canvas-toolbar-anchor">
          <VButton variant="outline" size="sm" class="canvas-tool-button" :class="{ 'is-active': filtersOpen || filtrosAtivos }" :aria-expanded="filtersOpen" aria-label="Filtros do canvas" title="Filtros do canvas" @click="filtersOpen = !filtersOpen; connectionMenuOpen = false"><ListFilter :size="18" /></VButton>
          <div v-if="filtersOpen" class="canvas-filter-popover" aria-label="Filtrar nós do canvas">
            <VSearchField v-model="ui.state.buscaTexto" placeholder="Título, id ou owner" aria-label="Filtrar canvas por título, id ou owner" class="w-full min-w-0" size="sm" />
            <VSelect v-model="ui.state.filtroEstado" :options="estados" label="Estado" class="w-full min-w-0" size="sm" />
            <VSelect v-model="ui.state.filtroOwner" :options="owners" label="Owner" class="w-full min-w-0" size="sm" />
            <VButton v-if="filtrosAtivos" variant="ghost" size="sm" class="canvas-clear-filters" @click="limparFiltros">Limpar filtros</VButton>
          </div>
        </div>
        <div class="canvas-toolbar-anchor">
          <VButton variant="outline" size="sm" class="canvas-tool-button canvas-connection-trigger" :aria-expanded="connectionMenuOpen" aria-haspopup="listbox" :aria-label="`Tipo de conexão: ${tipoLabel}`" :title="`Conexão: ${tipoLabel}`" @click="connectionMenuOpen = !connectionMenuOpen; filtersOpen = false"><Link2 :size="18" /></VButton>
          <div v-if="connectionMenuOpen" class="canvas-connection-options" role="listbox" aria-label="Tipo de conexão" @keydown="onConnectionMenuKeydown">
            <VButton
              v-for="tipo in tiposConexao"
              :key="tipo.value"
              role="option"
              class="canvas-connection-option"
              :aria-selected="tipoConexao === tipo.value"
              :data-connection-option="tipo.value"
              @click="escolherTipo(tipo.value)"
            >
              <Link2 :size="15" aria-hidden="true" />
              <span>{{ tipo.label }}</span>
            </VButton>
          </div>
        </div>
      </VToolbarGroup>
    </VToolbar>
  </div>
</template>

<style scoped>
.canvas-toolbar-wrap {
  position: relative;
  z-index: 60;
  width: max-content;
  max-width: 100%;
  pointer-events: auto;
}

.canvas-tools-toolbar {
  position: relative;
  display: flex;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.75rem;
  background: var(--v-color-surface);
  box-shadow: var(--v-shadow-md);
}

.canvas-tools-group {
  display: flex;
  width: auto;
  min-width: 0;
  flex: 0 0 auto;
  gap: 0.1rem;
}

.canvas-tool-button {
  display: inline-flex;
  flex: 0 0 34px !important;
  width: 34px !important;
  min-width: 34px !important;
  max-width: 34px !important;
  height: 34px !important;
  min-height: 34px !important;
  max-height: 34px !important;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  border-radius: 0.5rem;
}

.canvas-tool-button :deep(.v-button__label) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.canvas-tool-button.is-active {
  color: var(--v-color-primary-text);
  border-color: var(--v-color-primary-200);
  background: var(--v-color-primary-50);
}

.canvas-toolbar-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.canvas-filter-popover,
.canvas-connection-options {
  position: absolute;
  z-index: 80;
  top: calc(100% + 0.5rem);
  bottom: auto;
  right: 0;
  display: flex;
  width: min(320px, calc(100vw - 32px));
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.65rem;
  border: 1px solid var(--v-color-border);
  border-radius: 0.75rem;
  background: var(--v-color-surface);
  box-shadow: var(--v-shadow-md);
}

.canvas-connection-options {
  width: 184px;
  gap: 0.1rem;
  padding: 0.35rem;
}

.canvas-connection-option {
  display: inline-flex;
  width: 100%;
  min-height: 32px;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  padding: 0 0.5rem;
  border-color: transparent;
  background: transparent;
  color: var(--v-color-text);
  font-size: 0.75rem;
}

.canvas-connection-option:hover,
.canvas-connection-option[aria-selected="true"] {
  background: var(--v-color-primary-50);
  color: var(--v-color-primary-text);
}

.canvas-clear-filters {
  align-self: flex-start;
}

.canvas-tools-toolbar :deep(.v-toolbar__group) {
  min-width: 0;
  flex: 0 0 auto;
  gap: 0.1rem;
  padding: 0;
}

.canvas-tools-toolbar :deep(.v-toolbar__divider) {
  display: block;
  width: 1px;
  min-width: 1px;
  height: 20px;
  min-height: 20px;
  margin: 0 0.1rem;
}

@container (max-width: 720px) {
  .canvas-tools-toolbar {
    width: 100%;
    max-width: 100%;
    flex-wrap: wrap;
    overflow: visible;
  }

  .canvas-tool-button {
    flex-basis: 32px !important;
    width: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
  }
}
</style>
