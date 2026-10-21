<script setup lang="ts">
import NovaField from '@/components/common/NovaField.vue'

import NovaAction from '@/components/common/NovaAction.vue'
import { VDialog } from 'vueui-nova-kit'
import { computed, nextTick, ref, watch } from 'vue'
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

const props = withDefaults(
  defineProps<{
    aberto?: boolean
  }>(),
  {
    aberto: false
  }
)

const emit = defineEmits<{
  (e: 'update:aberto', val: boolean): void
  (e: 'abrir-prompt'): void
  (e: 'abrir-ai-settings'): void
  (e: 'atividade', info: { autor: string; provider: string; prompt: string; at: number }): void
}>()

const studio = useStudio()
const draftHistory = useStudioDraftHistory()
const { authors, atualizarAutorProvider, presence } = useStudioAuthors()

const selectedAuthorId = ref<string>('u-pm')
const currentAuthor = computed(() => {
  return authors.value.find((a) => a.userId === selectedAuthorId.value) || authors.value[0]
})
const generationProvider = 'local'
const generationModel = 'template-ptbr'

const selectedProvider = computed<StudioProvider>({
  get: () => (currentAuthor.value?.provider as StudioProvider) || 'OpenAI',
  set: (p: StudioProvider) => {
    if (currentAuthor.value) {
      atualizarAutorProvider(currentAuthor.value.userId, p)
    }
  }
})

const internoAberto = ref(false)
const aberto = computed({
  get: () => props.aberto || internoAberto.value,
  set: (val: boolean) => {
    internoAberto.value = val
    emit('update:aberto', val)
  }
})
const texto = ref('')
const preview = ref<DraftSpec[]>([])
const pilhaUndo = ref<TubeUndoEntry[]>([])
const aviso = ref('')
const copiadoLink = ref(false)
const copiadoInstrucao = ref(false)
const inputDescricaoRef = ref<HTMLInputElement | null>(null)

watch(aberto, (val) => {
  if (val) {
    nextTick(() => {
      inputDescricaoRef.value?.focus()
    })
  }
})

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
  aviso.value = preview.value.length === 0 ? 'Descreva o que deseja construir (ex.: tela de login com email e senha e botão entrar).' : ''
}

function notificarAtividade(autor: string, provider: string, promptTxt: string, at: number) {
  emit('atividade', { autor, provider, prompt: promptTxt, at })
  presence.registrarEvento({
    actorUserId: currentAuthor.value?.userId || 'u-pm',
    kind: 'draft',
    detalhe: `gerou rascunho via ${provider} (${currentAuthor.value?.model || ''})`,
    at
  })
}

function confirmar() {
  const fr = studio.frameAtual()
  if (!fr || preview.value.length === 0) return
  studio.pushHistory()

  const snapshotDoc = JSON.parse(JSON.stringify(studio.doc)) as typeof studio.doc
  const autorNome = currentAuthor.value?.name || 'Autor'
  const autorId = currentAuthor.value?.userId || 'u-pm'
  const prov = generationProvider
  const mod = generationModel
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

async function copiarLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copiadoLink.value = true
    setTimeout(() => { copiadoLink.value = false }, 2000)
  } catch {}
}

async function copiarInstrucao() {
  const instrucao = `You are a Material 3 design assistant for Maestri Studio. Generate or update design JSON for the requested screen: "${texto.value || 'an app to save and search recipes'}". Ensure compliance with M3 expressive tokens, component heights, and color palettes.`
  try {
    await navigator.clipboard.writeText(instrucao)
    copiadoInstrucao.value = true
    setTimeout(() => { copiadoInstrucao.value = false }, 2000)
  } catch {}
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
  <!-- Dialog Ask an AI (M3E §5 fiel, aberto via toolbar) -->
  <VDialog :model-value="aberto" variant="form" size="lg" :show-close="false" aria-label="Ask an AI" @update:model-value="aberto = $event" @close="aberto = false">
    <div class="flex max-h-full w-full max-w-xl flex-col rounded-card bg-white p-5 shadow-card">
        <!-- Header: Ask an AI + BETA + Copy link + Close -->
        <div class="flex items-center justify-between border-b border-nexo-border pb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-nexo-text">Ask an AI</h2>
            <span class="rounded-full bg-nexo-primary-soft px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-nexo-primary">BETA</span>
          </div>
          <div class="flex items-center gap-2">
            <NovaAction
              type="button"
              class="flex items-center gap-1 rounded-full border border-nexo-border px-2.5 py-1 text-xs text-nexo-muted hover:bg-slate-50 hover:text-nexo-text"
              :title="copiadoLink ? 'Copiado!' : 'Copiar link do projeto'"
              @click="copiarLink()"
            >
              <M3Icon name="link" :size="15" label="Copiar link" />
              <span>{{ copiadoLink ? 'Copiado!' : 'Copy link' }}</span>
            </NovaAction>
            <NovaAction type="button" class="rounded-btn p-1 text-nexo-muted hover:bg-slate-100 hover:text-nexo-text" aria-label="Fechar" @click="aberto = false">
              <M3Icon name="close" :size="18" label="Fechar" />
            </NovaAction>
          </div>
        </div>

        <!-- Parágrafo explicativo normativo M3E -->
        <p class="mt-3 text-xs leading-relaxed text-nexo-muted">
          Este rascunho é montado localmente por regras e modelos em português; não chama os provedores listados. Para geração externa, copie a instrução e use seu agente de IA, depois importe o JSON ou link retornado.
        </p>

        <!-- Seletor de Autor (7 papéis seed) -->
        <div class="mt-3.5">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wider text-nexo-muted">Desenhando como</span>
          <div class="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Selecione o autor da geração">
            <NovaAction
              v-for="a in authors"
              :key="a.userId"
              type="button"
              role="radio"
              :aria-checked="selectedAuthorId === a.userId"
              class="flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
              :class="selectedAuthorId === a.userId ? 'border-nexo-primary bg-nexo-primary-soft font-semibold text-nexo-primary shadow-xs' : 'border-nexo-border bg-white text-nexo-text hover:bg-slate-50'"
              @click="selectedAuthorId = a.userId"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs" :style="{ backgroundColor: a.color }">
                {{ a.initials }}
              </span>
              <span class="max-w-[120px] truncate">{{ a.name }}</span>
            </NovaAction>
          </div>
        </div>

        <!-- Provider radio (OpenAI/Claude/Gemini/DeepSeek) -->
        <div class="mt-2.5">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-nexo-muted">Perfil demonstrativo</span>
            <span class="font-mono text-xs text-nexo-muted">local · template-ptbr</span>
          </div>
          <div class="grid grid-cols-4 gap-1 rounded-btn border border-nexo-border bg-slate-50 p-0.5" role="radiogroup" aria-label="Provedor de IA">
            <NovaAction
              v-for="prov in (['OpenAI', 'Claude', 'Gemini', 'DeepSeek'] as const)"
              :key="prov"
              type="button"
              role="radio"
              :aria-checked="selectedProvider === prov"
              class="rounded-btn py-1.5 min-h-[32px] text-center text-sm font-medium transition"
              :class="selectedProvider === prov ? 'bg-white font-semibold text-nexo-primary shadow-xs' : 'text-nexo-muted hover:text-nexo-text'"
              @click="selectedProvider = prov"
            >
              {{ prov }}
            </NovaAction>
          </div>
        </div>

        <!-- Textbox "What to build" com foco -->
        <div class="mt-3.5">
          <label for="ai-tube-input" class="mb-1 block text-xs font-semibold text-nexo-text">
            What to build (e.g. an app to save and search recipes)
          </label>
          <NovaField
            id="ai-tube-input"
            ref="inputDescricaoRef"
            v-model="texto"
            class="w-full rounded-btn border border-nexo-border px-3 py-2 text-sm focus:border-nexo-primary"
            aria-label="What to build (e.g. an app to save and search recipes)"
            placeholder="e.g. an app to save and search recipes"
            @keydown.enter="gerar()"
          />
        </div>

        <!-- Linha de sub-ações (Add a key / Copy the instruction / AI settings) -->
        <div class="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-nexo-border/60 pt-2 text-xs">
          <span class="text-nexo-muted">Chaves externas não são usadas por esta geração local.</span>
          <div class="flex items-center gap-1.5">
            <NovaAction
              type="button"
              class="flex items-center gap-1 rounded-btn border border-nexo-border px-2.5 py-1 text-xs text-nexo-muted hover:bg-slate-50 hover:text-nexo-text"
              @click="copiarInstrucao()"
            >
              <M3Icon name="content_copy" :size="14" label="Copiar instrução" />
              <span>{{ copiadoInstrucao ? 'Instrução copiada!' : 'Copy the instruction' }}</span>
            </NovaAction>
            <NovaAction
              type="button"
              class="flex items-center gap-1 rounded-btn border border-nexo-border px-2.5 py-1 text-xs text-nexo-muted hover:bg-slate-50 hover:text-nexo-text"
              @click="emit('abrir-ai-settings')"
            >
              <M3Icon name="key" :size="14" label="Configurações de IA" />
              <span>AI settings</span>
            </NovaAction>
          </div>
        </div>

        <!-- Botões de ação principais -->
        <div class="mt-4 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <NovaAction
              type="button"
              class="rounded-btn bg-nexo-primary px-4 py-1.5 min-h-[32px] text-sm font-semibold text-white shadow-xs hover:opacity-95"
              @click="gerar()"
            >
              Gerar rascunho local
            </NovaAction>
            <NovaAction
              v-if="preview.length > 0"
              type="button"
              class="rounded-btn border border-nexo-primary bg-nexo-primary-soft px-3.5 py-1.5 min-h-[32px] text-sm font-semibold text-nexo-primary hover:bg-nexo-primary/10"
              @click="confirmar()"
            >
              Confirmar
            </NovaAction>
            <NovaAction
              v-if="preview.length > 0"
              type="button"
              class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm hover:bg-slate-50"
              @click="descartar()"
            >
              Descartar
            </NovaAction>
            <NovaAction
              v-if="pilhaUndo.length > 0"
              type="button"
              class="flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border px-3 py-1.5 text-sm font-medium text-nexo-text hover:bg-slate-50"
              :title="'Desfazer último rascunho de ' + (ultimoUndo ? ultimoUndo.authorName : '')"
              @click="desfazerTubo()"
            >
              <M3Icon name="undo" :size="14" />
              <span>Desfazer</span>
              <template v-if="ultimoUndo"> ({{ ultimoUndo.authorName }})</template>
            </NovaAction>
          </div>
          <NovaAction
            type="button"
            class="rounded-btn border border-nexo-border px-3.5 py-1.5 min-h-[32px] text-sm font-medium text-nexo-text hover:bg-slate-50"
            @click="descartar(); aberto = false"
          >
            Close
          </NovaAction>
        </div>

        <p v-if="aviso" class="mt-2 text-xs text-nexo-blocked" role="status">{{ aviso }}</p>

        <!-- Preview de peças geradas -->
        <ul v-if="preview.length > 0" class="mt-3 max-h-52 space-y-1 overflow-auto rounded-btn border border-nexo-border p-1" aria-label="Prévia do rascunho">
          <li v-for="(p, i) in preview" :key="i" class="flex items-center gap-2 rounded-badge border border-nexo-border bg-slate-50/50 p-1">
            <span class="flex h-10 w-20 shrink-0 items-center justify-center overflow-hidden" aria-hidden="true">
              <M3Node :item="itemPrev(p, i)" :scheme="scheme" :mini="true" />
            </span>
            <span class="text-xs font-medium">{{ p.kind }} {{ rotuloPrev(p) }}</span>
          </li>
        </ul>
      </div>
  </VDialog>
</template>
