<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { gerarDraft, type DraftSpec } from '@/ai/studioDraft'
import { useStudioDraftHistory } from '@/stores/studioDraftHistory'
import { useStudioAuthors, type StudioProvider } from '@/composables/useStudioAuthors'
import M3Icon from './m3/M3Icon.vue'
import M3Node from './m3/M3Node.vue'
import { paletteOf } from './m3/theme'
import type { StudioItem } from '@/types/studio'

interface TubeUndoEntry {
  doc: typeof studio.doc
  screenId: string
  authorUserId: string
  authorName: string
  provider: string
  model: string
  prompt: string
  result: DraftSpec[]
  at: number
}

const emit = defineEmits<{
  (e: 'abrir-prompt'): void
  (e: 'atividade', info: { autor: string; provider: string; prompt: string; at: number }): void
}>()

const studio = useStudio()
const draftHistory = useStudioDraftHistory()
const { authors, atualizarAutorProvider, presence } = useStudioAuthors()

const selectedAuthorId = ref<string>('u-pm')
const currentAuthor = computed(() => {
  return authors.value.find((a) => a.userId === selectedAuthorId.value) || authors.value[0]
})

const selectedProvider = computed<StudioProvider>({
  get: () => (currentAuthor.value?.provider as StudioProvider) || 'OpenAI',
  set: (p: StudioProvider) => {
    if (currentAuthor.value) {
      atualizarAutorProvider(currentAuthor.value.userId, p)
    }
  }
})

const aberto = ref(false)
const texto = ref('')
const preview = ref<DraftSpec[]>([])
const pilhaUndo = ref<TubeUndoEntry[]>([])
const aviso = ref('')

const ultimoUndo = computed(() => pilhaUndo.value[pilhaUndo.value.length - 1] ?? null)
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

function notificarAtividade(autor: string, provider: string, promptTxt: string, at: number) {
  emit('atividade', { autor, provider, prompt: promptTxt, at })
  try {
    presence.registrarEvento({
      actorUserId: currentAuthor.value?.userId || 'u-pm',
      kind: 'draft',
      detalhe: `gerou rascunho via ${provider} (${currentAuthor.value?.model || ''})`,
      at
    })
  } catch {}
}

function confirmar() {
  const fr = studio.frameAtual()
  if (!fr || preview.value.length === 0) return
  studio.pushHistory()

  const snapshotDoc = JSON.parse(JSON.stringify(studio.doc)) as typeof studio.doc
  const autorNome = currentAuthor.value?.name || 'Autor'
  const autorId = currentAuthor.value?.userId || 'u-pm'
  const prov = currentAuthor.value?.provider || 'OpenAI'
  const mod = currentAuthor.value?.model || 'gpt-5.6-luna'
  const agora = Date.now()

  pilhaUndo.value.push({
    doc: snapshotDoc,
    screenId: studio.screenId,
    authorUserId: autorId,
    authorName: autorNome,
    provider: prov,
    model: mod,
    prompt: texto.value,
    result: [...preview.value],
    at: agora
  })
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

  draftHistory.registrarDraft({
    authorUserId: autorId,
    authorName: autorNome,
    provider: prov,
    model: mod,
    prompt: texto.value,
    result: [...preview.value],
    at: agora
  })

  notificarAtividade(autorNome, prov, texto.value, agora)

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
  studio.doc = s.doc
  studio.screenId = s.screenId
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
      <button v-if="pilhaUndo.length > 0" type="button" class="rounded-full border border-nexo-border px-2 py-0.5 text-xs font-medium text-nexo-text hover:bg-slate-50" :title="'Desfazer último rascunho de ' + (ultimoUndo ? ultimoUndo.authorName : '')" @click="desfazerTubo()">
        Desfazer<template v-if="ultimoUndo"> ({{ ultimoUndo.authorName }})</template>
      </button>
    </div>
    <div v-if="aberto" class="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-label="Gerar tela com IA local" @click.self="aberto = false">
      <div class="flex max-h-full w-full max-w-xl flex-col rounded-card bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">Descreva a tela</p>
          <button type="button" class="rounded-btn p-1 text-nexo-muted hover:bg-slate-100" aria-label="Fechar" @click="aberto = false">
            <M3Icon name="close" :size="18" label="Fechar" />
          </button>
        </div>
        <p class="mt-0.5 text-xs text-nexo-muted">Gerador local (sem API externa). Ex.: "tela de login com email e senha e botão entrar".</p>

        <!-- Seletor de Autor (7 papéis seed) -->
        <div class="mt-3">
          <span class="mb-1 block text-[11px] font-semibold text-nexo-muted uppercase tracking-wider">Desenhando como</span>
          <div class="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Selecione o autor da geração">
            <button
              v-for="a in authors"
              :key="a.userId"
              type="button"
              role="radio"
              :aria-checked="selectedAuthorId === a.userId"
              class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition"
              :class="selectedAuthorId === a.userId ? 'border-nexo-primary bg-nexo-primary-soft font-semibold text-nexo-primary shadow-xs' : 'border-nexo-border bg-white text-nexo-text hover:bg-slate-50'"
              @click="selectedAuthorId = a.userId"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs" :style="{ backgroundColor: a.color }">
                {{ a.initials }}
              </span>
              <span class="truncate max-w-[120px]">{{ a.name }}</span>
            </button>
          </div>
        </div>

        <!-- Provider radio (OpenAI/Claude/Gemini/DeepSeek - como aba AI M3E) -->
        <div class="mt-2.5">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[11px] font-semibold text-nexo-muted uppercase tracking-wider">Provedor de IA</span>
            <span class="font-mono text-[11px] text-nexo-muted">{{ currentAuthor?.model }}</span>
          </div>
          <div class="grid grid-cols-4 gap-1 rounded-btn border border-nexo-border bg-slate-50 p-0.5" role="radiogroup" aria-label="Provedor de IA">
            <button
              v-for="prov in (['OpenAI', 'Claude', 'Gemini', 'DeepSeek'] as const)"
              :key="prov"
              type="button"
              role="radio"
              :aria-checked="selectedProvider === prov"
              class="rounded-btn py-1 text-center text-xs font-medium transition"
              :class="selectedProvider === prov ? 'bg-white font-semibold text-nexo-primary shadow-xs' : 'text-nexo-muted hover:text-nexo-text'"
              @click="selectedProvider = prov"
            >
              {{ prov }}
            </button>
          </div>
        </div>

        <!-- Input de texto do prompt -->
        <input v-model="texto" class="mt-3 w-full rounded-btn border border-nexo-border px-2.5 py-2 text-sm focus:border-nexo-primary" aria-label="Descrição da tela" placeholder="tela de login com email e senha e botão entrar" @keydown.enter="gerar()" />

        <!-- Botões de ação -->
        <div class="mt-2.5 flex items-center gap-1.5 text-xs">
          <button type="button" class="rounded-btn bg-nexo-primary px-3.5 py-1.5 font-semibold text-white shadow-xs hover:opacity-95" @click="gerar()">
            Draft with AI
          </button>
          <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 hover:bg-slate-50" @click="descartar(); aberto = false">
            Descartar
          </button>
          <button v-if="preview.length > 0" type="button" class="rounded-btn border border-nexo-primary px-3.5 py-1.5 font-semibold text-nexo-primary hover:bg-nexo-primary-soft" @click="confirmar()">
            Confirmar
          </button>
        </div>

        <p v-if="aviso" class="mt-2 text-xs text-nexo-blocked" role="status">{{ aviso }}</p>

        <!-- Preview de peças geradas -->
        <ul v-if="preview.length > 0" class="mt-2.5 max-h-56 space-y-1 overflow-auto rounded-btn border border-nexo-border p-1" aria-label="Prévia do rascunho">
          <li v-for="(p, i) in preview" :key="i" class="flex items-center gap-2 rounded-badge border border-nexo-border bg-slate-50/50 p-1">
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
