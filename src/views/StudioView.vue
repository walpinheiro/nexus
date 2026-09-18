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
import { useStudioDraftHistory } from '@/stores/studioDraftHistory'

const studio = useStudio()
const projects = useProjects()
const graph = useGraph()
const presence = usePresence()
const users = useUsers()
const draftHistory = useStudioDraftHistory()
const modalPromptFullscreen = ref(false)
const route = useRoute()
const router = useRouter()
const renomeando = ref('')
const abaEsq = ref<'parts' | 'layers'>('parts')
const railTab = ref<RailTab>('parts')
const abaDir = ref<'edit' | 'prompt'>('edit')
const previewAberto = ref(false)
const dialogNovaTela = ref(false)
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
  const draft = draftHistory.ultimoDraft
  const autor = draft
    ? { authorName: draft.authorName, model: draft.model, provider: draft.provider }
    : {
        authorName: users.currentUser ? users.currentUser.nome.replace(/\(.*?\)/g, '').trim() : users.state.currentUserId,
        model: presence.agenteDe(users.state.currentUserId).model,
        provider: presence.agenteDe(users.state.currentUserId).provider
      }
  promptTexto.value = gerarPromptStudio(studio.doc, promptEscopo.value, graph.state.selecionadoId ?? undefined, autor)
}

async function copiarPrompt() {
  if (!promptTexto.value) {
    gerarPrompt()
  }
  presence.registrarEvento({ actorUserId: users.state.currentUserId, kind: 'prompt', detalhe: `via ${presence.agenteDe(users.state.currentUserId).model}` })
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
    <div class="relative min-h-0 flex-1">
      <div class="pointer-events-none absolute left-0 right-0 top-2 z-30 flex justify-center">
        <div class="pointer-events-auto" style="border-radius: 28px">
          <StudioToolbar @preview="abrirPreview()" @abrir-prompt="abrirPromptPainel()" />
        </div>
      </div>
      <div class="pointer-events-none absolute bottom-4 right-4 z-30 flex justify-end">
        <div class="pointer-events-auto flex items-center gap-1 rounded-full border border-nexo-border bg-white px-2 py-1 text-xs shadow-card" role="group" aria-label="Zoom do stage">
          <button type="button" title="Reduzir" aria-label="Reduzir zoom" class="rounded-full px-1.5 py-0.5" @click="studio.zoom = Math.max(0.3, studio.zoom - 0.1)">−</button>
          <span class="min-w-10 text-center" aria-live="polite">{{ Math.round(studio.zoom * 100) }}%</span>
          <button type="button" title="Aproximar" aria-label="Aproximar zoom" class="rounded-full px-1.5 py-0.5" @click="studio.zoom = Math.min(2, studio.zoom + 0.1)">+</button>
          <button type="button" title="Ajustar (0)" aria-label="Ajustar zoom" class="rounded-full border border-nexo-border px-2 py-0.5" @click="studio.zoom = 0.7"><M3Icon name="fit_screen" :size="14" label="Ajustar" /></button>
        </div>
      </div>
      <div class="flex h-full min-h-0">
      <StudioIconRail :ativo="railTab" @selecionar="(t) => { railTab = t; if (t === 'parts' || t === 'layers') abaEsq = t }" />
      <aside class="flex w-60 shrink-0 flex-col border-r border-nexo-border bg-white" aria-label="Paleta e layers">
        <div class="flex gap-1 border-b border-nexo-border p-2 text-xs" role="tablist" aria-label="Abas da esquerda">
          <button type="button" role="tab" :aria-selected="abaEsq === 'parts'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'parts' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaEsq = 'parts'; railTab = 'parts'">Parts</button>
          <button type="button" role="tab" :aria-selected="abaEsq === 'layers'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'layers' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaEsq = 'layers'; railTab = 'layers'">Layers</button>
        </div>
        <PartsPalette v-if="abaEsq === 'parts'" class="min-h-0 flex-1 border-r-0" />
        <LayersPanel v-else class="min-h-0 flex-1" />
      </aside>
      <StudioStage ref="stageRef" class="m-2" @preview="abrirPreview()" />
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

          <!-- Plataforma: Radio Android | Web (M3E paridade) -->
          <div class="mt-2">
            <span class="mb-1 block font-semibold text-nexo-muted">Plataforma</span>
            <div class="flex rounded-btn border border-nexo-border p-0.5" role="radiogroup" aria-label="Plataforma de destino">
              <button
                type="button"
                role="radio"
                :aria-checked="studio.doc.platform === 'android'"
                class="flex flex-1 items-center justify-center gap-1 rounded-btn py-1 text-xs transition"
                :class="studio.doc.platform === 'android' ? 'bg-nexo-primary font-semibold text-white' : 'text-nexo-text hover:bg-slate-50'"
                @click="trocarPlataforma('android')"
              >
                <M3Icon name="android" :size="15" label="Android" /> Android
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="studio.doc.platform === 'web'"
                class="flex flex-1 items-center justify-center gap-1 rounded-btn py-1 text-xs transition"
                :class="studio.doc.platform === 'web' ? 'bg-nexo-primary font-semibold text-white' : 'text-nexo-text hover:bg-slate-50'"
                @click="trocarPlataforma('web')"
              >
                <M3Icon name="language" :size="15" label="Web" /> Web
              </button>
            </div>
          </div>

          <!-- Badge do Autor e Modelo da IA -->
          <div v-if="draftHistory.ultimoDraft" class="mt-2 flex items-center gap-1.5 rounded-badge bg-slate-100 px-2 py-1 text-[11px] text-nexo-muted" role="status">
            <M3Icon name="auto_awesome" :size="14" class="text-nexo-primary" />
            <span class="truncate">
              gerado por <strong class="text-nexo-text">{{ draftHistory.ultimoDraft.authorName }}</strong> · {{ draftHistory.ultimoDraft.model }}
            </span>
          </div>

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
    <div class="flex items-center gap-2 overflow-auto border-t border-nexo-border bg-white p-2 text-xs" aria-label="Telas">
      <button
        v-for="fr in studio.doc.frames"
        :key="fr.id"
        type="button"
        class="shrink-0 rounded-btn border px-3 py-1.5"
        :class="fr.id === studio.screenId ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'"
        @click="studio.screenId = fr.id; studio.persist()"
      >
        {{ renomeando === fr.id ? '' : fr.name }} <span class="text-nexo-muted">{{ fr.w }}×{{ fr.h }}</span>
      </button>
      <span class="flex shrink-0 gap-1">
        <button type="button" title="Criar tela (pergunta mobile ou desktop)" class="rounded-btn border border-nexo-primary px-3 py-1 font-semibold text-nexo-primary" @click="dialogNovaTela = true">+ Nova tela</button>
      </span>
      <span class="ml-auto flex shrink-0 gap-1">
        <button
          v-for="fr in studio.doc.frames"
          :key="'m' + fr.id"
          type="button"
          class="rounded-btn border border-nexo-border px-1.5 py-1"
          :title="`Renomear/duplicar/remover ${fr.name}`"
          @click="renomeando = renomeando === fr.id ? '' : fr.id"
        >
          Editar {{ fr.name }}
        </button>
      </span>
    </div>
    <div v-if="renomeando" class="flex items-center gap-2 border-t border-nexo-border bg-white p-2 text-xs">
      <span>Editar: {{ studio.doc.frames.find((x) => x.id === renomeando)?.name }}</span>
      <input
        :value="studio.doc.frames.find((x) => x.id === renomeando)?.name ?? ''"
        aria-label="Renomear tela"
        class="rounded-btn border border-nexo-border px-2 py-1"
        @change="renomeando && studio.renomearFrame(renomeando, ($event.target as HTMLInputElement).value)"
      />
      <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="renomeando && studio.duplicarFrame(renomeando)">Duplicar</button>
      <button type="button" class="rounded-btn border border-nexo-blocked-border px-2 py-1 text-nexo-blocked" @click="renomeando && confirmarRemocao(renomeando); renomeando = ''">Remover</button>
      <button type="button" class="underline" @click="renomeando = ''">fechar</button>
    </div>
    <PreviewModal v-if="previewAberto" :inicio-id="studio.screenId" @fechar="previewAberto = false" />
    <NewFrameDialog v-if="dialogNovaTela" @fechar="dialogNovaTela = false" @criar="criarDoDialog" />
    <AiTube @abrir-prompt="abrirPromptPainel()" />

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
            <span v-if="draftHistory.ultimoDraft" class="ml-2 rounded-badge bg-slate-100 px-2 py-0.5 text-xs text-nexo-muted">
              gerado por {{ draftHistory.ultimoDraft.authorName }} · {{ draftHistory.ultimoDraft.model }}
            </span>
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
