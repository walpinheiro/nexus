<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudio } from '@/stores/useStudio'
import { useProjects } from '@/stores/useProjects'
import PartsPalette from '@/components/studio/PartsPalette.vue'
import StudioStage from '@/components/studio/StudioStage.vue'
import StudioInspector from '@/components/studio/StudioInspector.vue'
import LayersPanel from '@/components/studio/LayersPanel.vue'
import FramePanel from '@/components/studio/FramePanel.vue'
import PreviewModal from '@/components/studio/PreviewModal.vue'
import NewFrameDialog from '@/components/studio/NewFrameDialog.vue'
import AiTube from '@/components/studio/AiTube.vue'
import StudioIconRail, { type RailTab } from '@/components/studio/StudioIconRail.vue'
import PresenceAvatars from '@/components/studio/PresenceAvatars.vue'
import M3Icon from '@/components/studio/m3/M3Icon.vue'
import NexoLogo from '@/components/common/NexoLogo.vue'
import { gerarPromptStudio } from '@/utils/studioPrompt'
import { useGraph } from '@/stores/useGraph'
import { usePresence } from '@/stores/studioPresence'
import { useUsers } from '@/stores/useUsers'
import { useGate } from '@/stores/useGate'
import { montarEntradaStudio, listarFeaturesElegiveis } from '@/ai/gateParaStudio'
import type { StudioFrame, StudioGroup } from '@/types/studio'

const studio = useStudio()
const projects = useProjects()
const graph = useGraph()
const presence = usePresence()
const users = useUsers()
const gates = useGate()
const modalPromptFullscreen = ref(false)
const route = useRoute()
const router = useRouter()
const renomeando = ref('')
const abaEsq = ref<'parts' | 'layers' | 'telas'>('parts')
const railTab = ref<RailTab>('parts')
const abaDir = ref<'edit' | 'prompt'>('edit')
const ferramentaStage = ref<'select' | 'hand'>('select')
const previewAberto = ref(false)
const dialogNovaTela = ref(false)
const askAiAberto = ref(false)
const promptEscopo = ref<string>('tudo')
const promptTexto = ref('')
const promptCopiado = ref('')
const menuAberto = ref(false)
const menuBtn = ref<HTMLButtonElement | null>(null)
const itemMenuAberto = ref<number>(0)
const itensMenu = ['voltar', 'backlog', 'gates', 'canvas', 'fechar'] as const
const stageRef = ref<{ $el: HTMLElement } | null>(null)

// Integração Condicional com Features do Gate G2 (V2/O-STUDIO)
const featureId = computed(() => (typeof route.query.feature === 'string' ? route.query.feature : ''))
const featureSelecionadaId = ref(featureId.value)
const featureAtual = computed(() => {
  if (!featureId.value) return null
  return graph.state.nos.find((n) => n.id === featureId.value) ?? null
})
// Seletor mostra SÓ G2-aprovadas com baseline (gateParaStudio.ts:111-121)
const featuresDisponiveis = computed(() => listarFeaturesElegiveis(graph.state.nos, gates.gates))
const entradaStudio = computed(() => (featureId.value ? montarEntradaStudio(featureId.value, graph.state.nos) : null))
const mensagemGeracao = ref('')

function origemDaTela(telaId: string): string | undefined {
  const v = graph.vinculosTela.find((x) => x.telaId === telaId)
  if (v) return v.origem
  const t = entradaStudio.value?.telas.find((x) => x.id === telaId)
  if (t) return t.origem
  const fr = studio.doc.frames.find((x) => x.id === telaId)
  const m = fr?.note?.match(/origem:\s*([a-z_]+)/)
  return m ? m[1] : undefined
}

function formatarOrigem(o?: string): string {
  if (!o) return ''
  if (o === 'fluxo_feliz') return 'Fluxo Principal'
  if (o === 'alternativo') return 'Alternativo'
  if (o === 'bdd') return 'BDD'
  return o
}

function badgeOrigemClass(o?: string): string {
  if (o === 'fluxo_feliz') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (o === 'alternativo') return 'bg-amber-50 text-amber-700 border border-amber-200'
  if (o === 'bdd') return 'bg-blue-50 text-blue-700 border border-blue-200'
  return 'bg-slate-100 text-slate-700 border border-slate-200'
}

// Identificadores dos frames padrão gerados pelo seedDoc() de useStudio
const SEED_FRAME_IDS = new Set(['checkout', 'pagpix'])

// Rastreia se o usuário interagiu explicitamente para trabalhar no canvas existente
const usuarioTrabalhouNoCanvas = ref(false)

// Telas criadas ativamente pelo usuário (exclui os frames estáticos do seedDoc)
const framesCriadosPeloUsuario = computed(() => {
  return studio.doc.frames.filter((f) => !SEED_FRAME_IDS.has(f.id))
})

// EmptyState honesto + seletor: exibido quando NÃO há ?feature= E o usuário NÃO criou telas nem optou por trabalhar no canvas seed
const exibirEmptyState = computed(() => {
  if (featureId.value || entradaStudio.value) return false
  if (framesCriadosPeloUsuario.value.length > 0 || usuarioTrabalhouNoCanvas.value) return false
  return true
})

watch(featureId, (novo) => {
  if (novo) featureSelecionadaId.value = novo
})

function selecionarFeature(fId: string) {
  featureSelecionadaId.value = fId
  router.replace({ path: route.path, query: { ...route.query, feature: fId || undefined } })
}

function gerarNoCanvas() {
  if (!entradaStudio.value) return
  usuarioTrabalhouNoCanvas.value = true
  const entrada = entradaStudio.value
  studio.pushHistory()

  let curX = studio.doc.frames.reduce((m, f) => Math.max(m, f.x + f.w), 0)
  if (curX > 0) curX += 120

  entrada.telas.forEach((t, i) => {
    const frameId = t.id
    const frameExistente = studio.doc.frames.find((f) => f.id === frameId)
    const x = frameExistente ? frameExistente.x : curX + i * (412 + 80)
    const y = frameExistente ? frameExistente.y : 0

    const frame: StudioFrame = {
      id: frameId,
      name: t.nome,
      x,
      y,
      w: 412,
      h: 892,
      preset: 'phone',
      note: `${t.descricao} (origem: ${t.origem})`
    }

    const idxF = studio.doc.frames.findIndex((f) => f.id === frameId)
    if (idxF >= 0) studio.doc.frames[idxF] = frame
    else studio.doc.frames.push(frame)

    // Barra de topo
    const gBarId = `g-bar-${frameId}`
    const gBar: StudioGroup = {
      id: gBarId,
      x,
      y,
      axis: 'x',
      order: 1,
      items: [
        {
          id: `bar-${frameId}`,
          kind: 'topAppBar',
          label: t.nome.split('—')[1]?.trim() || t.nome,
          icon: i > 0 ? 'arrow_back' : 'menu',
          variant: 'filled',
          x,
          y,
          w: 412
        }
      ]
    }
    const idxB = studio.doc.groups.findIndex((g) => g.id === gBarId)
    if (idxB >= 0) studio.doc.groups[idxB] = gBar
    else studio.doc.groups.push(gBar)

    // Card de contexto
    const gCardId = `g-card-${frameId}`
    const gCard: StudioGroup = {
      id: gCardId,
      x: x + 16,
      y: y + 96,
      axis: 'y',
      order: 2,
      items: [
        {
          id: `c-${frameId}`,
          kind: 'card',
          label: t.origem === 'fluxo_feliz' ? `Passo ${i + 1}` : 'Exceção',
          supporting: t.descricao,
          variant: 'filled',
          x: x + 16,
          y: y + 96,
          w: 380
        }
      ]
    }
    const idxC = studio.doc.groups.findIndex((g) => g.id === gCardId)
    if (idxC >= 0) studio.doc.groups[idxC] = gCard
    else studio.doc.groups.push(gCard)

    // Transição de tela
    const transicao = entrada.navegacao.find((nav) => nav.de === frameId && nav.para !== frameId)
    if (transicao) {
      const gBtnId = `g-btn-${frameId}`
      const gBtn: StudioGroup = {
        id: gBtnId,
        x: x + 16,
        y: y + 720,
        axis: 'x',
        order: 3,
        items: [
          {
            id: `btn-${frameId}`,
            kind: 'button',
            label: transicao.gatilho.slice(0, 32) || 'Avançar',
            variant: 'filled',
            size: 380,
            w: 380,
            action: { to: transicao.para, transition: 'slide' },
            note: transicao.gatilho,
            x: x + 16,
            y: y + 720
          }
        ]
      }
      const idxBtn = studio.doc.groups.findIndex((g) => g.id === gBtnId)
      if (idxBtn >= 0) studio.doc.groups[idxBtn] = gBtn
      else studio.doc.groups.push(gBtn)
    }
  })

  if (entrada.telas.length > 0) {
    studio.screenId = entrada.telas[0].id
  }
  // ONDA1 W1 — vincula cada tela gerada à feature no grafo
  graph.vincularEntradaStudio(entrada, users.state.currentUserId)
  studio.persist()
  gerarPrompt()
  mensagemGeracao.value = `${entrada.telas.length} telas geradas no canvas!`
  setTimeout(() => {
    mensagemGeracao.value = ''
  }, 4000)
}

const fromRaw = computed(() => (typeof route.query.from === 'string' ? route.query.from : ''))
const origemLabel = computed(() => {
  if (fromRaw.value === 'backlog') return 'Backlog'
  if (fromRaw.value === 'canvas') return 'Canvas'
  if (fromRaw.value.startsWith('gates/')) return `Gates ${fromRaw.value.split('/')[1] ?? ''}`.trim()
  if (fromRaw.value === 'studio') return 'Studio'
  return 'Backlog'
})
const origemRota = computed(() => {
  if (fromRaw.value === 'canvas') return '/canvas?view=canvas'
  if (fromRaw.value.startsWith('gates/')) return `/${fromRaw.value}`
  if (fromRaw.value === 'backlog') return '/backlog'
  return '/backlog'
})
const projetoNome = computed(() => projects.atual?.titulo ?? 'Sem projeto')

function irParaAbaEsq(t: 'parts' | 'layers' | 'telas') {
  abaEsq.value = t
  if (t === 'parts' || t === 'layers') railTab.value = t
}

function criarDoDialog(v: { nome: string; preset: 'phone' | 'desktop' }) {
  if (v.preset === 'phone') studio.adicionarFrame(412, 892, v.nome || 'Nova tela')
  else studio.adicionarFrame(1280, 800, v.nome || 'Nova tela web')
  dialogNovaTela.value = false
}

function confirmarRemocao(id: string) {
  if (window.confirm('Remover esta tela? Actions para ela viram "back".')) studio.removerFrame(id)
}

function abrirPreview() {
  previewAberto.value = true
}

function abrirPromptPainel() {
  abaDir.value = 'prompt'
  gerarPrompt()
}

watch(abaDir, (novaAba) => {
  if (novaAba === 'prompt') {
    gerarPrompt()
  }
})

function gerarPrompt() {
  promptTexto.value = gerarPromptStudio(studio.doc, promptEscopo.value, graph.state.selecionadoId ?? undefined)
}

async function copiarPrompt() {
  if (!promptTexto.value) {
    gerarPrompt()
  }
  presence.registrarEvento({ actorUserId: users.state.currentUserId, kind: 'prompt', detalhe: 'copiou prompt' })
  try {
    await navigator.clipboard.writeText(promptTexto.value)
    promptCopiado.value = 'Prompt copiado.'
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = promptTexto.value
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      promptCopiado.value = ok ? 'Prompt copiado.' : 'Não foi possível copiar — verifique a permissão do navegador.'
    } catch {
      promptCopiado.value = 'Não foi possível copiar — verifique a permissão do navegador.'
    }
  }
  setTimeout(() => (promptCopiado.value = ''), 2500)
}

function voltar() {
  menuAberto.value = false
  router.push(origemRota.value)
  nextTick(() => {
    const alvo = document.querySelector('a[href="/backlog"], a[href="/canvas"], main a, main button') as HTMLElement | null
    ;(alvo ?? document.querySelector('main'))?.focus?.()
  })
}

function abrirMenu() {
  menuAberto.value = true
  itemMenuAberto.value = 0
  nextTick(() => focarItemMenu(0))
}

function fecharMenu(focarBotao = true) {
  menuAberto.value = false
  if (focarBotao) menuBtn.value?.focus()
}

function focarItemMenu(i: number) {
  const n = itensMenu.length
  itemMenuAberto.value = ((i % n) + n) % n
  nextTick(() => {
    const el = document.querySelector(`[data-menuitem="${itensMenu[itemMenuAberto.value]}"]`) as HTMLElement | null
    el?.focus?.()
  })
}

function onKeyMenu(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focarItemMenu(itemMenuAberto.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focarItemMenu(itemMenuAberto.value - 1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    focarItemMenu(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    focarItemMenu(itensMenu.length - 1)
  }
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  const digitando = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
  if (e.key === 'Escape') {
    if (menuAberto.value) {
      menuAberto.value = false
      menuBtn.value?.focus()
      return
    }
    if (!previewAberto.value && !dialogNovaTela.value && !digitando) voltar()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (studio.doc.frames && studio.doc.frames.length > 0) {
    gerarPrompt()
  }
  nextTick(() => {
    setTimeout(() => {
      const el = (stageRef.value?.$el ?? document.querySelector('[role="application"]')) as HTMLElement | null
      el?.focus?.()
    }, 320)
  })
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="studio-panel relative flex h-full min-h-[560px] flex-col bg-nexo-canvas">
    <header class="flex h-12 shrink-0 items-center gap-2 border-b border-nexo-border bg-nexo-surface px-3">
      <div class="relative">
        <button
          ref="menuBtn"
          type="button"
          aria-label="Menu voltar"
          aria-haspopup="menu"
          :aria-expanded="menuAberto"
          class="rounded-btn p-2 hover:bg-nexo-canvas"
          @click="menuAberto ? fecharMenu() : abrirMenu()"
        >
          <M3Icon name="menu" :size="20" label="Menu voltar" />
        </button>
        <div
          v-if="menuAberto"
          role="menu"
          aria-label="Voltar para"
          class="absolute left-0 top-11 z-50 w-56 rounded-card border border-nexo-border bg-white p-1 shadow-card"
          @keydown="onKeyMenu"
          @keydown.escape="fecharMenu(true)"
        >
          <button type="button" data-menuitem="voltar" role="menuitem" class="flex w-full items-center gap-2 rounded-badge px-3 py-2 text-left text-sm hover:bg-nexo-canvas" @click="voltar()">
            <M3Icon name="arrow_back" :size="16" label="Voltar" /> Voltar para {{ origemLabel }}
          </button>
          <RouterLink data-menuitem="backlog" role="menuitem" to="/backlog" class="block rounded-badge px-3 py-2 text-sm hover:bg-nexo-canvas" @click="menuAberto = false">Ir para Backlog</RouterLink>
          <RouterLink data-menuitem="gates" role="menuitem" to="/gates/G2" class="block rounded-badge px-3 py-2 text-sm hover:bg-nexo-canvas" @click="menuAberto = false">Ir para Gates G2</RouterLink>
          <RouterLink data-menuitem="canvas" role="menuitem" to="/canvas?view=canvas" class="block rounded-badge px-3 py-2 text-sm hover:bg-nexo-canvas" @click="menuAberto = false">Ir para Canvas</RouterLink>
          <button type="button" data-menuitem="fechar" class="flex w-full items-center gap-1 rounded-badge px-3 py-2 text-left text-sm text-nexo-muted hover:bg-nexo-canvas" @click="fecharMenu(true)">
            <M3Icon name="close" :size="16" label="Fechar menu" /> Fechar menu
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink
          to="/"
          class="flex items-center gap-1.5 rounded focus:outline-none focus:ring-2 focus:ring-nexo-primary"
          aria-label="NEXO Studio — início"
        >
          <NexoLogo compact :size="22" />
          <span class="text-sm font-semibold text-nexo-muted">Studio</span>
        </RouterLink>
        <span class="hidden text-xs text-nexo-border sm:inline" aria-hidden="true">/</span>
        <span class="hidden text-sm font-medium text-nexo-text sm:inline" :title="projetoNome">
          {{ projetoNome }}
        </span>

        <!-- Chip Linkback Studio → Feature no Gate G2 -->
        <RouterLink
          v-if="featureAtual"
          :to="{ path: '/gates/G2', query: { alvo: featureAtual.id } }"
          class="inline-flex items-center gap-1.5 rounded-full border border-nexo-primary/30 bg-nexo-primary/10 px-2.5 py-0.5 text-xs font-semibold text-nexo-primary hover:bg-nexo-primary/20 hover:border-nexo-primary transition-colors shrink-0 ml-1.5"
          :title="`Voltar ao Gate G2 da Feature: ${featureAtual.titulo}`"
        >
          <M3Icon name="arrow_back" :size="14" />
          <span>Feature: {{ featureAtual.titulo }}</span>
        </RouterLink>
      </div>
      <span class="ml-auto flex items-center gap-2">
        <PresenceAvatars />
        <span class="hidden text-xs text-nexo-muted md:inline">voltando para {{ origemLabel }}</span>
        <button type="button" class="inline-flex items-center gap-1 rounded-btn border border-nexo-border px-3 py-1.5 text-sm" @click="voltar()">
          <M3Icon name="arrow_back" :size="16" label="Voltar" /> Voltar
        </button>
      </span>
    </header>

    <!-- Banner Condicional de Feature & Pré-Load Gate G2 (V2) -->
    <div
      v-if="entradaStudio"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-nexo-primary/30 bg-nexo-primary/5 px-4 py-2 text-xs"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="rounded bg-nexo-primary text-white px-2 py-0.5 text-[10px] font-bold">Gate G2 Pré-load</span>
        <span class="font-bold text-nexo-text">{{ entradaStudio.titulo }}</span>
        <span class="text-nexo-muted">({{ entradaStudio.ator }})</span>
        <span class="rounded bg-nexo-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-nexo-primary">
          {{ entradaStudio.telas.length }} telas · {{ entradaStudio.navegacao.length }} transições BDD
        </span>
      </div>

      <div class="flex items-center gap-2">
        <span v-if="mensagemGeracao" class="text-nexo-approved font-semibold text-[11px] animate-pulse">
          {{ mensagemGeracao }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-btn bg-nexo-primary px-3 py-1 font-semibold text-white shadow-xs hover:bg-nexo-primary/90 transition-colors"
          @click="gerarNoCanvas()"
        >
          <M3Icon name="auto_awesome" :size="15" label="Gerar no canvas" />
          Gerar no canvas
        </button>
      </div>
    </div>

    <div class="relative min-h-0 flex-1">
      <!-- EmptyState Condicional quando não há telas do usuário nem pré-load (V2/O-STUDIO) -->
      <div
        v-if="exibirEmptyState"
        class="flex flex-1 h-full items-center justify-center p-8 bg-nexo-canvas"
      >
        <div class="max-w-md w-full rounded-card border border-nexo-border bg-white p-6 text-center space-y-4 shadow-sm">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-nexo-primary/10 text-nexo-primary">
            <M3Icon name="layers" :size="24" label="Nenhuma tela" />
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-bold text-nexo-text">Nenhuma Feature Selecionada no Studio</h3>
            <p class="text-xs text-nexo-muted leading-relaxed">
              O Studio monta o protótipo de telas navegáveis a partir das features aprovadas do Gate G2 ou permite criar telas livres no canvas.
            </p>
          </div>
          <div v-if="featuresDisponiveis.length > 0" class="space-y-2 pt-2 text-left">
            <label class="block text-xs font-semibold text-nexo-text">
              Carregar telas de uma feature elegível (G2 aprovada):
              <select
                v-model="featureSelecionadaId"
                class="mt-1 w-full rounded-btn border border-nexo-border bg-white p-2 text-xs"
                @change="selecionarFeature(featureSelecionadaId)"
              >
                <option value="">(Selecione uma feature)</option>
                <option v-for="f in featuresDisponiveis" :key="f.id" :value="f.id">
                  {{ f.titulo }} ({{ f.id }})
                </option>
              </select>
            </label>
          </div>
          <div v-else class="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 text-left">
            Nenhuma feature aprovada no Gate G2 com baseline disponível no momento. Homologue features no Gate G2 para carregar telas automaticamente.
          </div>
          <div class="pt-2 flex items-center justify-center gap-2">
            <RouterLink
              to="/gates/G2"
              class="inline-flex items-center gap-1.5 rounded-btn border border-nexo-border px-3 py-1.5 text-xs font-semibold text-nexo-text hover:bg-nexo-canvas"
            >
              Ir para Gate G2
            </RouterLink>
            <button
              type="button"
              class="rounded-btn border border-nexo-border px-3 py-1.5 text-xs font-semibold text-nexo-text hover:bg-nexo-canvas"
              @click="usuarioTrabalhouNoCanvas = true"
            >
              Continuar no canvas seed
            </button>
            <button
              type="button"
              class="rounded-btn bg-nexo-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-nexo-primary/90"
              @click="dialogNovaTela = true; usuarioTrabalhouNoCanvas = true"
            >
              Criar tela em branco
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex h-full min-h-0">
      <StudioIconRail :ativo="railTab" @selecionar="(t) => { railTab = t; if (t === 'parts' || t === 'layers') abaEsq = t }" />
      <aside class="flex w-60 shrink-0 flex-col border-r border-nexo-border bg-white" aria-label="Paleta, layers e telas">
        <div class="flex gap-1 border-b border-nexo-border p-2 text-xs" role="tablist" aria-label="Abas laterais">
          <button type="button" role="tab" :aria-selected="abaEsq === 'parts'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'parts' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="irParaAbaEsq('parts')">Parts</button>
          <button type="button" role="tab" :aria-selected="abaEsq === 'layers'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'layers' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="irParaAbaEsq('layers')">Layers</button>
          <button type="button" role="tab" :aria-selected="abaEsq === 'telas'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'telas' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="irParaAbaEsq('telas')">Telas</button>
        </div>
        <PartsPalette v-if="abaEsq === 'parts'" class="min-h-0 flex-1 border-r-0" />
        <LayersPanel v-else-if="abaEsq === 'layers'" class="min-h-0 flex-1" />
        <div v-else class="flex min-h-0 flex-1 flex-col overflow-auto p-2 text-xs" aria-label="Telas">
          <ul class="space-y-1">
            <li
              v-for="fr in studio.doc.frames"
              :key="fr.id"
              class="rounded-badge px-2 py-1.5"
              :class="fr.id === studio.screenId ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'bg-nexo-canvas'"
            >
              <div class="flex items-center justify-between gap-1">
                <button type="button" class="truncate text-left font-medium" :title="`${fr.name} ${fr.w}×${fr.h}`" @click="studio.screenId = fr.id; studio.persist()">
                  {{ renomeando === fr.id ? '' : fr.name }} <span class="text-nexo-muted font-normal">{{ fr.w }}×{{ fr.h }}</span>
                </button>
                <span
                  v-if="origemDaTela(fr.id)"
                  class="rounded-full px-1.5 py-0.2 text-[9px] font-mono font-medium shrink-0"
                  :class="badgeOrigemClass(origemDaTela(fr.id))"
                  :title="`Origem da tela: ${origemDaTela(fr.id)}`"
                >
                  {{ formatarOrigem(origemDaTela(fr.id)) }}
                </span>
              </div>
              <div class="mt-1 flex gap-1">
                <button type="button" class="flex-1 rounded-btn border border-nexo-border px-1.5 py-0.5" :title="`Renomear ${fr.name}`" @click="renomeando = renomeando === fr.id ? '' : fr.id">Renomear</button>
                <button type="button" class="flex-1 rounded-btn border border-nexo-border px-1.5 py-0.5" :title="`Duplicar ${fr.name}`" @click="studio.duplicarFrame(fr.id)">Duplicar</button>
                <button type="button" class="flex-1 rounded-btn border border-nexo-blocked-border px-1.5 py-0.5 text-nexo-blocked" :title="`Remover ${fr.name}`" @click="confirmarRemocao(fr.id)">Remover</button>
              </div>
              <input
                v-if="renomeando === fr.id"
                :value="fr.name"
                aria-label="Renomear tela"
                class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1"
                @change="renomeando && studio.renomearFrame(renomeando, ($event.target as HTMLInputElement).value); renomeando = ''"
              />
            </li>
          </ul>
          <button type="button" title="Criar tela (abre diálogo)" class="mt-2 rounded-btn border border-nexo-primary px-3 py-1.5 font-semibold text-nexo-primary" @click="dialogNovaTela = true">+ Nova tela</button>
        </div>
      </aside>
      <StudioStage ref="stageRef" v-model:ferramenta="ferramentaStage" class="m-2" @preview="abrirPreview()" @abrir-prompt="abrirPromptPainel()" @abrir-ask="askAiAberto = true" />
      <aside class="flex w-72 shrink-0 flex-col border-l border-nexo-border bg-white" aria-label="Painel direito">
        <div class="flex gap-1 border-b border-nexo-border p-2 text-xs" role="tablist" aria-label="Abas da direita">
          <button type="button" role="tab" :aria-selected="abaDir === 'edit'" class="flex-1 rounded-btn px-2 py-1" :class="abaDir === 'edit' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaDir = 'edit'">Editar</button>
          <button type="button" role="tab" :aria-selected="abaDir === 'prompt'" class="flex-1 rounded-btn px-2 py-1" :class="abaDir === 'prompt' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaDir = 'prompt'">Prompt</button>
        </div>
        <div v-if="abaDir === 'edit'" class="min-h-0 flex-1 overflow-auto">
          <FramePanel />
          <StudioInspector />
        </div>
        <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden p-3 text-xs">
          <p class="font-semibold">Prompt da tela</p>
          <p class="mt-1 text-nexo-muted">Destino: Web (Vue 3 + TS + Tailwind).</p>

          <label class="mt-2 block">Escopo
            <select v-model="promptEscopo" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="gerarPrompt()">
              <option value="tudo">Design inteiro</option>
              <option v-for="fr in studio.doc.frames" :key="fr.id" :value="fr.id">1 tela: {{ fr.name }}</option>
            </select>
          </label>

          <textarea v-model="promptTexto" rows="12" class="mt-2 w-full flex-1 resize-none rounded-btn border border-nexo-border p-2 font-mono text-[11px] leading-relaxed" aria-label="Prompt editável" />
          <p class="mt-1 text-nexo-muted">{{ promptTexto.length }} caracteres</p>

          <div class="mt-2 flex flex-col gap-1.5">
            <button type="button" class="flex items-center justify-center gap-1.5 rounded-btn bg-nexo-primary px-3 py-2 font-semibold text-white shadow-xs hover:opacity-95" @click="copiarPrompt()">
              <M3Icon name="content_copy" :size="16" label="Copiar" /> Copiar prompt
            </button>
            <button type="button" class="flex items-center justify-center gap-1.5 rounded-btn border border-nexo-border px-3 py-1.5 font-medium text-nexo-text hover:bg-slate-50" @click="modalPromptFullscreen = true">
              <M3Icon name="open_in_full" :size="16" label="Tela cheia" /> Edit full screen
            </button>
          </div>
          <p v-if="promptCopiado" class="mt-1 text-center text-nexo-approved" role="status">{{ promptCopiado }}</p>
        </div>
      </aside>
      </div>
    </div>
    <PreviewModal v-if="previewAberto" :inicio-id="studio.screenId" @fechar="previewAberto = false" />
    <NewFrameDialog v-if="dialogNovaTela" @fechar="dialogNovaTela = false" @criar="criarDoDialog" />
    <AiTube v-model:aberto="askAiAberto" @abrir-prompt="abrirPromptPainel()" />

    <!-- Modal Edit Full Screen do Prompt (M3E paridade) -->
    <div
      v-if="modalPromptFullscreen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Editar prompt em tela cheia"
      @keydown.escape="modalPromptFullscreen = false"
    >
      <div class="flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-card bg-white p-5 shadow-card">
        <div class="flex items-center justify-between border-b border-nexo-border pb-3">
          <div class="flex items-center gap-2">
            <M3Icon name="auto_awesome" :size="20" class="text-nexo-primary" />
            <h2 class="text-base font-bold">Prompt do Studio</h2>
          </div>
          <button type="button" class="rounded-btn p-1.5 text-nexo-muted hover:bg-slate-100 hover:text-nexo-text" aria-label="Fechar" @click="modalPromptFullscreen = false">
            <M3Icon name="close" :size="20" label="Fechar" />
          </button>
        </div>
        <textarea v-model="promptTexto" class="mt-4 flex-1 w-full resize-none rounded-btn border border-nexo-border p-3 font-mono text-xs leading-relaxed focus:border-nexo-primary" aria-label="Prompt em tela cheia" />
        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-nexo-muted">{{ promptTexto.length }} caracteres</span>
          <div class="flex gap-2">
            <button type="button" class="rounded-btn border border-nexo-border px-4 py-2 text-sm hover:bg-slate-50" @click="modalPromptFullscreen = false">Fechar</button>
            <button type="button" class="flex items-center gap-1.5 rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95" @click="copiarPrompt()">
              <M3Icon name="content_copy" :size="16" label="Copiar" /> Copiar prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
