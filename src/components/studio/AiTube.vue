<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { gerarDraft, type DraftSpec } from '@/ai/studioDraft'
import M3Icon from './m3/M3Icon.vue'
import M3Node from './m3/M3Node.vue'
import { paletteOf } from './m3/theme'
import type { StudioItem } from '@/types/studio'

const emit = defineEmits<{ (e: 'abrir-prompt'): void }>()

const studio = useStudio()
const aberto = ref(false)
const texto = ref('')
const preview = ref<DraftSpec[]>([])
const pilhaUndo = ref<string[]>([])
const aviso = ref('')

const scheme = computed(() => paletteOf(studio.doc.paletteKey, false))

function alturaDe(kind: string): number {
  const mapa: Record<string, number> = {
    topAppBar: 64, bottomNav: 80, searchBar: 56, button: 56, textField: 56,
    select: 56, card: 223, listItem: 72, dialog: 220, snackbar: 48,
    text: 40, image: 200, box: 200, tabs: 48, slider: 48, loadingIndicator: 48
  }
  return mapa[kind] ?? 80
}

function gerar() {
  preview.value = gerarDraft(texto.value)
  aviso.value = preview.value.length === 0 ? 'Descreva a tela (ex.: tela de login com email e senha e botão entrar).' : ''
}

function confirmar() {
  const fr = studio.frameAtual()
  if (!fr || preview.value.length === 0) return
  studio.pushHistory()
  pilhaUndo.value.push(JSON.stringify({ doc: studio.doc, screenId: studio.screenId }))
  if (pilhaUndo.value.length > 10) pilhaUndo.value.shift()
  let y = fr.y + 110
  const x = fr.x + 16
  const ids: string[] = []
  for (const p of preview.value) {
    const it = studio.criarItemSemHistorico(p.kind, x, y, p.props as Partial<StudioItem>)
    ids.push(it.id)
    y += alturaDe(p.kind) + 16
  }
  studio.selecionados = ids
  studio.persist()
  preview.value = []
  texto.value = ''
  aberto.value = false
  emit('abrir-prompt')
}

function descartar() {
  preview.value = []
  aviso.value = ''
}

function desfazerTubo() {
  const s = pilhaUndo.value.pop()
  if (!s) return
  studio.pushHistory()
  const snap = JSON.parse(s) as { doc: typeof studio.doc; screenId: string }
  studio.doc = snap.doc
  studio.screenId = snap.screenId
  studio.selecionados = []
  studio.persist()
}

function rotuloPrev(p: DraftSpec): string {
  const l = (p.props as { label?: unknown }).label
  return typeof l === 'string' && l ? `— ${l}` : ''
}

function itemPrev(p: DraftSpec, i: number): StudioItem {
  return { id: `draft-${i}`, kind: p.kind, x: 0, y: 0, ...(p.props as Partial<StudioItem>) } as StudioItem
}
</script>

<template>
  <div class="pointer-events-none absolute bottom-4 left-4 z-30 flex">
    <div class="pointer-events-auto flex items-center gap-2 rounded-full border border-nexo-border bg-white px-3 py-1.5 text-xs shadow-card">
      <M3Icon name="auto_awesome" :size="14" label="Assistente de tela" />
      <button type="button" class="rounded-full bg-nexo-primary px-3 py-1 font-semibold text-white" title="Descreva a tela e gere um rascunho" @click="aberto = true">
        Ask an AI
      </button>
      <button v-if="pilhaUndo.length > 0" type="button" class="rounded-full border border-nexo-border px-2 py-0.5" title="Desfazer último rascunho gerado" @click="desfazerTubo()">
        Desfazer
      </button>
    </div>
    <div v-if="aberto" class="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-label="Gerar tela com IA local" @click.self="aberto = false">
      <div class="flex max-h-full w-full max-w-xl flex-col rounded-card bg-white p-4 shadow-card">
        <p class="text-sm font-semibold">Descreva a tela</p>
        <p class="mt-1 text-xs text-nexo-muted">Gerador local (sem API externa). Ex.: "tela de login com email e senha e botão entrar".</p>
        <input v-model="texto" class="mt-2 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm" aria-label="Descrição da tela" placeholder="tela de login com email e senha e botão entrar" @keydown.enter="gerar()" />
        <div class="mt-2 flex gap-1 text-xs">
          <button type="button" class="rounded-btn bg-nexo-primary px-3 py-1.5 font-semibold text-white" @click="gerar()">Gerar</button>
          <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5" @click="descartar(); aberto = false">Descartar</button>
          <button v-if="preview.length > 0" type="button" class="rounded-btn border border-nexo-primary px-3 py-1.5 font-semibold text-nexo-primary" @click="confirmar()">Confirmar</button>
        </div>
        <p v-if="aviso" class="mt-2 text-xs text-nexo-blocked" role="status">{{ aviso }}</p>
        <ul v-if="preview.length > 0" class="mt-2 max-h-64 space-y-1 overflow-auto" aria-label="Prévia do rascunho">
          <li v-for="(p, i) in preview" :key="i" class="flex items-center gap-2 rounded-badge border border-nexo-border p-1">
            <span class="flex h-10 w-20 shrink-0 items-center justify-center overflow-hidden" aria-hidden="true">
              <M3Node :item="itemPrev(p, i)" :scheme="scheme" :mini="true" />
            </span>
            <span class="text-xs">{{ p.kind }} {{ rotuloPrev(p) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
