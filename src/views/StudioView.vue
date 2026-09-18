<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudio } from '@/stores/useStudio'
import { useProjects } from '@/stores/useProjects'
import PartsPalette from '@/components/studio/PartsPalette.vue'
import StudioStage from '@/components/studio/StudioStage.vue'
import StudioInspector from '@/components/studio/StudioInspector.vue'
import StudioToolbar from '@/components/studio/StudioToolbar.vue'
import LayersPanel from '@/components/studio/LayersPanel.vue'
import FramePanel from '@/components/studio/FramePanel.vue'
import PreviewModal from '@/components/studio/PreviewModal.vue'
import NewFrameDialog from '@/components/studio/NewFrameDialog.vue'
import AiTube from '@/components/studio/AiTube.vue'
import StudioIconRail, { type RailTab } from '@/components/studio/StudioIconRail.vue'
import PresenceAvatars from '@/components/studio/PresenceAvatars.vue'
import M3Icon from '@/components/studio/m3/M3Icon.vue'
import { gerarPromptStudio } from '@/utils/studioPrompt'
import { useGraph } from '@/stores/useGraph'
import { usePresence } from '@/stores/studioPresence'
import { useUsers } from '@/stores/useUsers'

const studio = useStudio()
const projects = useProjects()
const graph = useGraph()
const presence = usePresence()
const users = useUsers()
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
      <span class="flex items-baseline text-[18px] font-extrabold tracking-tight" aria-label="NEXO Studio">NEXO <span class="ml-1 text-sm font-semibold text-nexo-muted">Studio</span></span>
      <span class="hidden text-sm text-nexo-muted sm:inline">{{ projetoNome }}</span>
      <span class="ml-auto flex items-center gap-2">
        <PresenceAvatars />
        <span class="hidden text-xs text-nexo-muted md:inline">voltando para {{ origemLabel }}</span>
        <button type="button" class="inline-flex items-center gap-1 rounded-btn border border-nexo-border px-3 py-1.5 text-sm" @click="voltar()">
          <M3Icon name="arrow_back" :size="16" label="Voltar" /> Voltar
        </button>
      </span>
    </header>
    <div class="flex h-12 shrink-0 items-center border-b border-nexo-border bg-nexo-surface px-3" role="toolbar" aria-label="Toolbar do Studio">
      <StudioToolbar v-model:ferramenta="ferramentaStage" @preview="abrirPreview()" @abrir-prompt="abrirPromptPainel()" @abrir-ask="askAiAberto = true" />
    </div>
    <div class="relative min-h-0 flex-1">
      <div class="flex h-full min-h-0">
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
              <button type="button" class="w-full truncate text-left" :title="`${fr.name} ${fr.w}×${fr.h}`" @click="studio.screenId = fr.id; studio.persist()">
                {{ renomeando === fr.id ? '' : fr.name }} <span class="text-nexo-muted">{{ fr.w }}×{{ fr.h }}</span>
              </button>
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
      <StudioStage ref="stageRef" v-model:ferramenta="ferramentaStage" class="m-2" @preview="abrirPreview()" />
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
