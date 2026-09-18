<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
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
import M3Icon from '@/components/studio/m3/M3Icon.vue'

const studio = useStudio()
const projects = useProjects()
const route = useRoute()
const router = useRouter()
const renomeando = ref('')
const abaEsq = ref<'parts' | 'layers'>('parts')
const abaDir = ref<'edit' | 'prompt'>('edit')
const previewAberto = ref(false)
const dialogNovaTela = ref(false)
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
        <span class="hidden text-xs text-nexo-muted md:inline">voltando para {{ origemLabel }}</span>
        <button type="button" class="inline-flex items-center gap-1 rounded-btn border border-nexo-border px-3 py-1.5 text-sm" @click="voltar()">
          <M3Icon name="arrow_back" :size="16" label="Voltar" /> Voltar
        </button>
      </span>
    </header>
    <div class="pointer-events-none absolute left-0 right-0 top-14 z-30 flex justify-center">
      <div class="pointer-events-auto" style="border-radius: 28px">
        <StudioToolbar @preview="abrirPreview()" />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 pt-14">
      <aside class="flex w-60 shrink-0 flex-col border-r border-nexo-border bg-white" aria-label="Paleta e layers">
        <div class="flex gap-1 border-b border-nexo-border p-2 text-xs" role="tablist" aria-label="Abas da esquerda">
          <button type="button" role="tab" :aria-selected="abaEsq === 'parts'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'parts' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaEsq = 'parts'">Parts</button>
          <button type="button" role="tab" :aria-selected="abaEsq === 'layers'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'layers' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaEsq = 'layers'">Layers</button>
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
        <div v-else class="min-h-0 flex-1 overflow-auto p-3 text-xs">
          <p class="font-semibold">Prompt da tela atual</p>
          <p class="mt-1 text-nexo-muted">Use o botão Prompt na toolbar para o design inteiro ou 1 tela (editável antes de copiar).</p>
        </div>
      </aside>
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
  </div>
</template>
