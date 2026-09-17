import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NivelZoom } from '@/types/nexo'

const KEY = 'nexo.v1.ui'

interface UiState {
  sidebarAberta: boolean
  buscaAberta: boolean
  painelTab: 'detalhes' | 'copilot' | 'impacto' | 'texto'
  ferramenta: 'select' | 'hand' | 'connect' | 'comment'
  preview: boolean
  zoomNivel: NivelZoom
  buscaTexto: string
  filtroEstado: string
  filtroOwner: string
}

function load(): UiState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as UiState
  } catch {
    // ignora
  }
  return {
    sidebarAberta: true,
    buscaAberta: false,
    painelTab: 'detalhes',
    ferramenta: 'select',
    preview: false,
    zoomNivel: 'feature',
    buscaTexto: '',
    filtroEstado: '',
    filtroOwner: ''
  }
}

export const useUI = defineStore('ui', () => {
  const state = ref<UiState>(load())

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state.value))
  }

  if (localStorage.getItem(KEY) == null) persist()

  function alternarSidebar() {
    state.value.sidebarAberta = !state.value.sidebarAberta
    persist()
  }

  function abrirBusca() {
    state.value.buscaAberta = true
    persist()
  }

  function fecharBusca() {
    state.value.buscaAberta = false
    persist()
  }

  function setTab(t: UiState['painelTab']) {
    state.value.painelTab = t
    persist()
  }

  function setFerramenta(f: UiState['ferramenta']) {
    state.value.ferramenta = f
    persist()
  }

  function alternarPreview() {
    state.value.preview = !state.value.preview
    persist()
  }

  function limparFiltros() {
    state.value.buscaTexto = ''
    state.value.filtroEstado = ''
    state.value.filtroOwner = ''
    persist()
  }

  return { state, alternarSidebar, abrirBusca, fecharBusca, setTab, setFerramenta, alternarPreview, limparFiltros, persist }
})
