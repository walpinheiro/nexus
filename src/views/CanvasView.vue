<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useProject } from '@/stores/useProject'
import NexoCanvas from '@/components/canvas/NexoCanvas.vue'
import DetailPanel from '@/components/canvas/DetailPanel.vue'
import Minimap from '@/components/layout/Minimap.vue'
import StudioView from '@/views/StudioView.vue'
import { decodeShare } from '@/utils/share'
import type { NivelZoom } from '@/types/nexo'
import { VButton, VSelect } from 'vueui-nova-kit'

const graph = useGraph()
const project = useProject()
const route = useRoute()
const router = useRouter()
const canvasComp = ref<{ fit: () => void; navegarPara: (x: number, y: number) => void; centralizarNo: (id: string) => void; medidasNos: Record<string, { width: number; height: number }> } | null>(null)

const vista = computed(() => (route.query.view === 'studio' ? 'studio' : route.query.view === 'canvas' ? 'canvas' : 'contexto'))
const comPainel = computed(() => vista.value === 'canvas' && !!graph.state.selecionadoId)

function navegarMinimap(x: number, y: number) {
  canvasComp.value?.navegarPara(x, y)
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
const nivelOptions = [
  { value: 'projeto', label: 'Projeto' }, { value: 'epico', label: 'Épico' },
  { value: 'feature', label: 'Feature' }, { value: 'pbi', label: 'PBI' }
]
const objetoOptions = computed(() => [
  { value: '', label: '(atual)' },
  ...objetosDoNivel.value.map(n => ({ value: n.id, label: n.titulo }))
])
watch([nivelSel, () => route.query.selecionado, () => graph.state.selecionadoId], () => {
  const candidato = typeof route.query.selecionado === 'string' ? route.query.selecionado : graph.state.selecionadoId
  objetoSel.value = candidato && objetosDoNivel.value.some((no) => no.id === candidato)
    ? candidato
    : objetosDoNivel.value[0]?.id ?? ''
}, { immediate: true })
watch([() => route.query.view, () => route.query.feature, () => route.query.selecionado], () => {
  if (route.query.view !== 'studio') return
  const requested = typeof route.query.feature === 'string' ? route.query.feature : ''
  const selected = typeof route.query.selecionado === 'string' ? route.query.selecionado : ''
  const candidate = [requested, selected].map((id) => graph.noPorId(id)).find((node) => node?.tipo === 'feature')
    ?? graph.state.nos.find((node) => node.tipo === 'feature')
  if (!candidate) return
  if (graph.state.selecionadoId !== candidate.id) graph.selecionar(candidate.id)
  if (route.query.feature !== candidate.id || route.query.selecionado !== candidate.id) {
    void router.replace({ path: '/canvas', query: { ...route.query, view: 'studio', feature: candidate.id, selecionado: candidate.id } })
  }
}, { immediate: true })

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
  <div class="canvas-view-workspace relative flex h-full min-h-0 w-full min-w-0 overflow-hidden">
    <template v-if="vista === 'studio'">
      <StudioView />
    </template>

    <template v-else-if="vista === 'contexto'">
      <div class="min-w-0 rounded-card border border-nexo-border bg-white p-4 sm:p-6">
        <h1 class="text-lg font-bold">Canvas sob demanda</h1>
        <p class="mt-1 text-sm text-nexo-muted">Escolha o contexto (nível + objeto) para abrir o grafo. O grafo não monta neste modo.</p>
        <div class="mt-3 flex min-w-0 flex-wrap items-end gap-3 text-sm">
          <VSelect v-model="nivelSel" :options="nivelOptions" label="Nível" class="w-56 max-w-full" size="sm" />
          <VSelect v-model="objetoSel" :options="objetoOptions" label="Objeto" class="w-72 max-w-full" size="sm" />
          <VButton class="!h-9 !min-h-9 self-end" variant="primary" size="sm" @click="abrirGrafo()">Abrir grafo</VButton>
        </div>
        <p class="mt-2 text-xs text-nexo-muted">{{ graph.state.nos.length }} nós · {{ graph.state.arestas.length }} arestas no nível atual.</p>
      </div>
    </template>

    <template v-else>
      <div class="absolute inset-0 h-full min-h-0 w-full min-w-0 overflow-hidden" data-export-root>
        <NexoCanvas ref="canvasComp" />
        <Minimap :node-sizes="canvasComp?.medidasNos" :class="comPainel ? 'right-[390px]' : 'right-2'" class="canvas-minimap absolute bottom-2 z-20 h-[70px] w-[110px] cursor-crosshair opacity-90 shadow-card hover:opacity-100" @navegar="navegarMinimap" />
        <DetailPanel
          v-if="comPainel"
          class="canvas-detail-panel absolute right-4 top-[72px] bottom-4 z-40 !h-auto max-h-[calc(100%-88px)] min-h-0 !w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-card border border-nexo-border bg-white shadow-lg"
          @centralizar="canvasComp?.centralizarNo(graph.state.selecionadoId ?? '')"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.canvas-view-workspace {
  container-type: inline-size;
}

@container (max-width: 720px) {
  .canvas-detail-panel {
    top: auto !important;
    right: 16px !important;
    bottom: 16px !important;
    left: 16px !important;
    width: calc(100% - 32px) !important;
    height: 60% !important;
    max-height: 60% !important;
  }

  .canvas-minimap {
    display: none;
  }
}
</style>
