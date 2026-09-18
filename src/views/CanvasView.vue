<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useProject } from '@/stores/useProject'
import { useUI } from '@/stores/useUI'
import NexoCanvas from '@/components/canvas/NexoCanvas.vue'
import DetailPanel from '@/components/canvas/DetailPanel.vue'
import Minimap from '@/components/layout/Minimap.vue'
import StudioView from '@/views/StudioView.vue'
import { decodeShare } from '@/utils/share'
import type { NivelZoom } from '@/types/nexo'

const graph = useGraph()
const project = useProject()
const ui = useUI()
const route = useRoute()
const router = useRouter()
const canvasComp = ref<{ fit: () => void; navegarPara: (x: number, y: number) => void } | null>(null)

const vista = computed(() => (route.query.view === 'studio' ? 'studio' : route.query.view === 'canvas' ? 'canvas' : 'contexto'))
const comPainel = computed(() => vista.value === 'canvas' && !!graph.state.selecionadoId)

function irVista(v: 'canvas' | 'studio' | 'contexto') {
  router.replace({ path: '/canvas', query: { ...route.query, view: v } })
}

function navegarMinimap(x: number, y: number) {
  canvasComp.value?.navegarPara(x, y)
}

function limparBusca() {
  ui.state.buscaTexto = ''
  ui.state.filtroEstado = ''
  ui.state.filtroOwner = ''
  ui.persist()
}

// deep-link #hash (share-link) reconstrói layout
const hash = typeof route.hash === 'string' ? route.hash : ''
if (hash && hash.length > 1) {
  const st = decodeShare(hash)
  if (st) {
    graph.aplicarLayout(st.nos)
    if (st.sel) graph.selecionar(st.sel)
    router.replace({ path: '/canvas', query: { ...route.query, view: 'canvas', selecionado: st.sel } })
  }
}

// seletor de contexto (modo sem grafo)
const nivelSel = ref<NivelZoom>('feature')
const objetoSel = ref(graph.state.selecionadoId ?? '')

const objetosDoNivel = computed(() => {
  if (nivelSel.value === 'epico') return graph.state.nos.filter((n) => n.tipo === 'epico')
  if (nivelSel.value === 'feature') return graph.state.nos.filter((n) => n.tipo === 'feature')
  if (nivelSel.value === 'pbi') return graph.state.nos.filter((n) => n.tipo === 'pbi')
  return graph.state.nos
})

// G7: aba Telas (Studio) só existe via-feature (query feature= ou seleção feature)
const podeVerTelas = computed(() => {
  const q = route.query.feature
  if (typeof q === 'string' && q) return true
  const selId = (typeof route.query.selecionado === 'string' && route.query.selecionado)
    || objetoSel.value
    || graph.state.selecionadoId
  if (!selId) return false
  return graph.noPorId(selId)?.tipo === 'feature'
})

function abrirGrafo() {
  project.abrirNivel(nivelSel.value)
  if (objetoSel.value && graph.noPorId(objetoSel.value)) graph.selecionar(objetoSel.value)
  router.replace({
    path: '/canvas',
    query: { view: 'canvas', selecionado: graph.state.selecionadoId ?? undefined }
  })
}
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-2">
    <div class="flex shrink-0 items-center gap-2 text-sm" role="tablist" aria-label="Vista do canvas">
      <button type="button" role="tab" :aria-selected="vista !== 'studio'" class="rounded-btn border px-3 py-1" :class="vista !== 'studio' ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="irVista('canvas')">Grafo NEXO</button>
      <button v-if="podeVerTelas" type="button" role="tab" :aria-selected="vista === 'studio'" class="rounded-btn border px-3 py-1" :class="vista === 'studio' ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="irVista('studio')">Telas (Studio)</button>
    </div>

    <template v-if="vista === 'studio' && podeVerTelas">
      <StudioView />
    </template>

    <template v-else-if="vista === 'contexto'">
      <div class="rounded-card border border-nexo-border bg-white p-6">
        <h1 class="text-lg font-bold">Canvas sob demanda</h1>
        <p class="mt-1 text-sm text-nexo-muted">Escolha o contexto (nível + objeto) para abrir o grafo. O grafo não monta neste modo.</p>
        <div class="mt-3 flex flex-wrap gap-2 text-sm">
          <label>Nível
            <select v-model="nivelSel" class="ml-1 rounded-btn border border-nexo-border px-2 py-1.5">
              <option value="projeto">Projeto</option>
              <option value="epico">Épico</option>
              <option value="feature">Feature</option>
              <option value="pbi">PBI</option>
            </select>
          </label>
          <label>Objeto
            <select v-model="objetoSel" class="ml-1 rounded-btn border border-nexo-border px-2 py-1.5">
              <option value="">(atual)</option>
              <option v-for="n in objetosDoNivel" :key="n.id" :value="n.id">{{ n.titulo }}</option>
            </select>
          </label>
          <button type="button" class="rounded-btn bg-nexo-primary px-4 py-1.5 font-semibold text-white" @click="abrirGrafo()">Abrir grafo</button>
        </div>
        <p class="mt-2 text-xs text-nexo-muted">{{ graph.state.nos.length }} nós · {{ graph.state.arestas.length }} arestas no nível atual.</p>
      </div>
    </template>

    <template v-else>
      <div class="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <input
          v-model="ui.state.buscaTexto"
          placeholder="Filtrar canvas por título/id/owner…"
          aria-label="Filtrar canvas"
          class="w-64 rounded-btn border border-nexo-border bg-white px-3 py-1.5"
        />
        <select v-model="ui.state.filtroEstado" aria-label="Filtrar por estado" class="rounded-btn border border-nexo-border bg-white px-2 py-1.5">
          <option value="">Todos os estados</option>
          <option value="draft">Rascunho</option>
          <option value="review">Em revisão</option>
          <option value="approved">Aprovado</option>
          <option value="stale">Desatualizado</option>
        </select>
        <select v-model="ui.state.filtroOwner" aria-label="Filtrar por owner" class="rounded-btn border border-nexo-border bg-white px-2 py-1.5">
          <option value="">Todos os owners</option>
          <option v-for="u in ['u-pm','u-ux','u-arq','u-tl','u-dev','u-qa','u-sec']" :key="u" :value="u">{{ u }}</option>
        </select>
        <button v-if="ui.state.buscaTexto || ui.state.filtroEstado || ui.state.filtroOwner" type="button" class="underline" @click="limparBusca()">limpar filtros</button>
        <span class="ml-auto text-nexo-muted">{{ graph.state.nos.length }} nós · {{ graph.state.arestas.length }} arestas</span>
      </div>

      <div class="flex min-h-0 h-full w-full flex-1 gap-0">
        <div class="flex min-h-0 h-full w-full min-w-0 flex-1 flex-col" data-export-root>
          <NexoCanvas ref="canvasComp" />
        </div>
        <DetailPanel v-if="comPainel" class="ml-3 hidden h-full min-h-0 lg:flex" />
      </div>

      <DetailPanel v-if="comPainel" class="lg:hidden" />

      <div class="flex shrink-0 items-center gap-3">
        <Minimap @navegar="navegarMinimap" />
        <span class="text-xs text-nexo-muted">Minimap clicável · filtros só alteram a vista · duplo-clique no vazio cria nó · arraste handle para conectar</span>
      </div>
    </template>
  </div>
</template>
