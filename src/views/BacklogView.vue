<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { useGate } from '@/stores/useGate'
import { avaliarGate } from '@/utils/gates'
import GateChecklist from '@/components/backlog/GateChecklist.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import PreviewModal from '@/components/studio/PreviewModal.vue'
import { montarEntradaStudio } from '@/ai/gateParaStudio'
import { exportarFeatureWiki } from '@/utils/exportWiki'
import type { Feature, NexoObject } from '@/types/nexo'

const graph = useGraph()
const users = useUsers()
const gatesStore = useGate()
const router = useRouter()
const filtro = ref('')
const filtroEstado = ref('')
const checklistRef = ref<{ definirAlvo: (id: string) => void } | null>(null)
const checklistAlvo = ref('')

// Ações W4 por feature
const previewAberto = ref(false)
const previewInicioId = ref<string | null>(null)
const storyModalAberto = ref(false)
const storySelecionada = ref<Feature | null>(null)

function abrirPreview(featureId: string) {
  const vinculos = graph.telasDaFeature(featureId)
  if (vinculos.length > 0) {
    previewInicioId.value = vinculos[0].telaId
  } else {
    const entrada = montarEntradaStudio(featureId, graph.state.nos)
    previewInicioId.value = entrada?.telas[0]?.id ?? null
  }
  previewAberto.value = true
}

function abrirStoryModal(f: Feature) {
  storySelecionada.value = f
  storyModalAberto.value = true
}

function baixarFeatureWiki(featureId: string) {
  const wiki = exportarFeatureWiki(featureId, {
    nos: graph.state.nos,
    gates: gatesStore.gates.map((g) => ({
      id: g.id,
      status: g.status,
      baselineVersao: g.baselineVersao,
      aprovadoPor: g.aprovadoPor ?? undefined,
      aprovadoEm: g.aprovadoEm ?? undefined
    })),
    vinculos: graph.vinculosTela,
    regras: graph.regrasValidacao
  })
  if (!wiki) return
  const blob = new Blob([wiki], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wiki-${featureId}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const itens = computed(() =>
  graph.state.nos.filter((n) => {
    if (filtro.value && !n.titulo.toLowerCase().includes(filtro.value.toLowerCase())) return false
    if (filtroEstado.value && n.status !== filtroEstado.value) return false
    return true
  })
)

// Hierarquia Épico → Feature → PBI (derivada dos filtros ativos).
// Se o épico não casa o filtro mas um filho casa, o épico entra mesmo assim
// para preservar o contexto hierárquico.
interface FeatureGrupo {
  no: NexoObject
  pbis: NexoObject[]
}
interface EpicoGrupo {
  no: NexoObject
  features: FeatureGrupo[]
}

const hierarquia = computed<EpicoGrupo[]>(() => {
  const visiveis = new Set(itens.value.map((n) => n.id))
  const porId = new Map(graph.state.nos.map((n) => [n.id, n]))
  const grupos = new Map<string, EpicoGrupo>()
  const garantirEpico = (id: string | null | undefined): EpicoGrupo | null => {
    if (!id) return null
    const ep = porId.get(id)
    if (!ep || ep.tipo !== 'epico') return null
    let g = grupos.get(id)
    if (!g) {
      g = { no: ep, features: [] }
      grupos.set(id, g)
    }
    return g
  }

  // Épicos que casam o filtro entram primeiro (ordem do grafo).
  for (const n of itens.value) {
    if (n.tipo === 'epico') garantirEpico(n.id)
  }
  // Features visíveis: anexa ao épico pai (mesmo que o épico esteja filtrado fora).
  for (const n of itens.value) {
    if (n.tipo !== 'feature') continue
    const g = garantirEpico((n as NexoObject).parent_id)
    if (g && !g.features.some((f) => f.no.id === n.id)) {
      g.features.push({ no: n, pbis: [] })
    }
  }
  // PBIs visíveis: anexa à feature dona (criando o grupo da feature/épico se preciso).
  for (const n of itens.value) {
    if (n.tipo !== 'pbi') continue
    const featureId = (n as unknown as { feature_id?: string }).feature_id
      ?? (n as NexoObject).parent_id
      ?? null
    const feature = featureId ? porId.get(featureId) : undefined
    const epicoId = feature && feature.tipo === 'feature'
      ? feature.parent_id
      : (n as NexoObject).parent_id
    const g = garantirEpico(epicoId)
    if (!g) continue
    let fg = g.features.find((f) => f.no.id === featureId)
    if (!fg && feature && feature.tipo === 'feature') {
      fg = { no: feature, pbis: [] }
      g.features.push(fg)
    }
    if (fg) {
      if (!fg.pbis.some((p) => p.id === n.id)) fg.pbis.push(n)
    }
  }
  void visiveis
  return [...grupos.values()]
})

// Nós de outros tipos (regra, tela, api, teste, adr, decisao, risco):
// mantidos em seção própria para não perder funcionalidade.
const outrosItens = computed(() =>
  itens.value.filter((n) => n.tipo !== 'epico' && n.tipo !== 'feature' && n.tipo !== 'pbi')
)

function abrirNoCanvas(id: string) {
  graph.selecionar(id)
  router.push(`/canvas?view=canvas&selecionado=${id}`)
}

// edição inline (DELTA Passo 4)
const editId = ref('')
const editCampo = ref<'titulo' | 'descricao' | 'owner' | 'gate' | ''>('')
const editValor = ref('')
const editErro = ref('')

function waiversDe(id: string): { codigo: string; prazo: string }[] {
  return graph.waivers.filter((w) => w.alvoId === id).map((w) => ({ codigo: w.codigo, prazo: w.prazo }))
}

function iniciarEdicao(n: { id: string; titulo: string; descricao: string; owner: string; gate: string }, campo: 'titulo' | 'descricao' | 'owner' | 'gate') {
  editId.value = n.id
  editCampo.value = campo
  editValor.value = campo === 'titulo' ? n.titulo : campo === 'descricao' ? n.descricao : campo === 'owner' ? n.owner : n.gate
  editErro.value = ''
}

function cancelarEdicao() {
  editId.value = ''
  editCampo.value = ''
  editValor.value = ''
  editErro.value = ''
}

function confirmarEdicao() {
  const no = graph.noPorId(editId.value)
  if (!no || !editCampo.value) return
  if (editCampo.value === 'titulo' && (editValor.value.trim().length < 5 || editValor.value.trim().length > 140)) {
    editErro.value = 'OBJ-001: título 5–140 caracteres.'
    return
  }
  graph.atualizarNo(editId.value, { [editCampo.value]: editValor.value.trim() } as never, users.state.currentUserId, `editou ${editCampo.value} inline`)
  cancelarEdicao()
}

function onBlurConfirmar() {
  const no = graph.noPorId(editId.value)
  if (!no || !editCampo.value) return
  const atual = String((no as unknown as Record<string, unknown>)[editCampo.value] ?? '')
  if (editValor.value.trim() !== atual) confirmarEdicao()
  else cancelarEdicao()
}

function verChecklist(id: string) {
  checklistAlvo.value = id
  checklistRef.value?.definirAlvo(id)
}
</script>

<template>
  <div class="space-y-5">
    <div class="border-b border-nexo-border pb-3">
      <h1 class="text-xl font-bold text-nexo-text">Backlog — Épico → Feature → PBI</h1>
      <p class="mt-1 text-sm text-nexo-muted">Hierarquia do discovery ao delivery. Duplo-clique no título, gate ou owner edita inline.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <RouterLink :to="{ path: '/studio-full', query: { from: 'backlog' } }" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-medium text-nexo-text hover:bg-slate-50">
        <LucideIcon name="layout" :size="14" />
        Abrir Studio
      </RouterLink>
      <input v-model="filtro" placeholder="Filtrar por título…" aria-label="Filtrar backlog" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm text-nexo-text" />
      <select v-model="filtroEstado" aria-label="Filtrar por estado" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-2 py-1.5 text-sm text-nexo-text">
        <option value="">Todos os estados</option>
        <option value="draft">Rascunho</option>
        <option value="review">Em revisão</option>
        <option value="approved">Aprovado</option>
        <option value="stale">Desatualizado</option>
      </select>
    </div>

    <p v-if="hierarquia.length === 0" class="rounded-card border border-nexo-border bg-white p-4 text-sm text-nexo-muted">
      Nenhum épico/feature/PBI corresponde aos filtros.
    </p>

    <!-- HIERARQUIA Épico → Feature → PBI -->
    <section v-for="grupo in hierarquia" :key="grupo.no.id" class="overflow-hidden rounded-card border border-nexo-border bg-white shadow-sm" aria-label="Épico">
      <!-- Cabeçalho do ÉPICO -->
      <div class="border-b border-nexo-border bg-slate-50/70 px-4 py-3" tabindex="0" @keydown.enter="iniciarEdicao(grupo.no, 'titulo')">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-badge bg-slate-800 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Épico</span>
          <span class="rounded-badge border border-nexo-border bg-white px-2 py-0.5 font-mono text-xs text-nexo-muted">{{ grupo.no.id }}</span>
          <span class="rounded-badge border border-nexo-border bg-white px-2 py-0.5 text-xs font-medium text-nexo-text">{{ grupo.no.gate }}</span>
          <span class="rounded-badge border border-nexo-border bg-white px-2 py-0.5 text-xs text-nexo-text">{{ grupo.no.status }}</span>
        </div>
        <div class="mt-2">
          <template v-if="editId === grupo.no.id && editCampo === 'titulo'">
            <input v-model="editValor" aria-label="Editar título do épico" class="min-h-[32px] w-full rounded-btn border border-nexo-border bg-white px-2 py-1 text-sm" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar" />
            <span v-if="editErro" class="mt-1 block text-xs text-nexo-blocked">{{ editErro }}</span>
          </template>
          <button v-else type="button" class="text-left text-base font-bold text-nexo-text hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(grupo.no, 'titulo')">{{ grupo.no.titulo }}</button>
        </div>
        <p class="mt-1 text-sm text-nexo-muted">{{ grupo.no.descricao }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-nexo-muted">Owner: <strong class="font-semibold text-nexo-text">{{ grupo.no.owner }}</strong></span>
          <span v-for="c in avaliarGate(grupo.no, waiversDe(grupo.no.id)).checks" :key="c.codigo" class="inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium" :class="c.ok ? 'bg-nexo-approved-bg text-nexo-approved' : 'bg-nexo-blocked-bg text-nexo-blocked'">
            {{ c.codigo }}<LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" />
          </span>
          <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border bg-white px-3 py-1 text-sm text-nexo-text hover:bg-slate-50" @click="verChecklist(grupo.no.id)">Dispensas</button>
          <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1 text-sm text-nexo-text hover:bg-slate-50" @click="abrirNoCanvas(grupo.no.id)">
            <LucideIcon name="layout" :size="14" />
            Canvas
          </button>
          <template v-if="editId === grupo.no.id && (editCampo === 'owner' || editCampo === 'gate')">
            <select v-if="editCampo === 'owner'" v-model="editValor" aria-label="Editar owner" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-2 py-1 text-sm" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar">
              <option v-for="u in users.state.usuarios" :key="u.id" :value="u.id">{{ u.id }}</option>
            </select>
            <select v-else v-model="editValor" aria-label="Editar gate" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-2 py-1 text-sm" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar">
              <option>G0</option><option>G1</option><option>G2</option><option>G3</option><option>G4</option><option>G5</option>
            </select>
            <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn bg-nexo-primary px-3 py-1 text-sm font-semibold text-white" @click="confirmarEdicao">
              <LucideIcon name="check" :size="14" />
              Salvar
            </button>
            <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border px-3 py-1 text-sm" @click="cancelarEdicao">
              <LucideIcon name="x" :size="14" />
              Cancelar
            </button>
          </template>
          <template v-else>
            <button type="button" class="text-xs text-nexo-muted hover:underline" title="Duplo-clique edita gate" @dblclick="iniciarEdicao(grupo.no, 'gate')">Gate: {{ grupo.no.gate }}</button>
            <button type="button" class="text-xs text-nexo-muted hover:underline" title="Duplo-clique edita owner" @dblclick="iniciarEdicao(grupo.no, 'owner')">Owner: {{ grupo.no.owner }}</button>
          </template>
        </div>
      </div>

      <!-- FEATURES do épico -->
      <div class="space-y-3 p-4">
        <p v-if="grupo.features.length === 0" class="text-sm text-nexo-muted">Nenhuma feature neste épico para os filtros atuais.</p>
        <article v-for="fg in grupo.features" :key="fg.no.id" class="rounded-card border border-nexo-border bg-white" aria-label="Feature">
          <div class="border-l-4 border-slate-800 px-4 py-3" tabindex="0" @keydown.enter="iniciarEdicao(fg.no, 'titulo')">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-badge bg-slate-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Feature</span>
              <span class="rounded-badge border border-nexo-border bg-slate-50 px-2 py-0.5 font-mono text-xs text-nexo-muted">{{ fg.no.id }}</span>
              <span class="rounded-badge border border-nexo-border bg-slate-50 px-2 py-0.5 text-xs font-medium text-nexo-text">{{ fg.no.gate }}</span>
              <span class="rounded-badge border border-nexo-border bg-slate-50 px-2 py-0.5 text-xs text-nexo-text">{{ fg.no.status }}</span>
            </div>
            <div class="mt-2">
              <template v-if="editId === fg.no.id && editCampo === 'titulo'">
                <input v-model="editValor" aria-label="Editar título da feature" class="min-h-[32px] w-full rounded-btn border border-nexo-border px-2 py-1 text-sm" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar" />
                <span v-if="editErro" class="mt-1 block text-xs text-nexo-blocked">{{ editErro }}</span>
              </template>
              <button v-else type="button" class="text-left text-sm font-bold text-nexo-text hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(fg.no, 'titulo')">{{ fg.no.titulo }}</button>
            </div>
            <p class="mt-1 text-sm text-nexo-muted">{{ fg.no.descricao }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <template v-if="editId === fg.no.id && (editCampo === 'owner' || editCampo === 'gate')">
                <select v-if="editCampo === 'owner'" v-model="editValor" aria-label="Editar owner" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-2 py-1 text-sm" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar">
                  <option v-for="u in users.state.usuarios" :key="u.id" :value="u.id">{{ u.id }}</option>
                </select>
                <select v-else v-model="editValor" aria-label="Editar gate" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-2 py-1 text-sm" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar">
                  <option>G0</option><option>G1</option><option>G2</option><option>G3</option><option>G4</option><option>G5</option>
                </select>
                <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn bg-nexo-primary px-3 py-1 text-sm font-semibold text-white" @click="confirmarEdicao">
                  <LucideIcon name="check" :size="14" />
                  Salvar
                </button>
                <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border px-3 py-1 text-sm" @click="cancelarEdicao">
                  <LucideIcon name="x" :size="14" />
                  Cancelar
                </button>
              </template>
              <template v-else>
                <button type="button" class="hover:underline" title="Duplo-clique edita gate" @dblclick="iniciarEdicao(fg.no, 'gate')">Gate {{ fg.no.gate }}</button>
                <span aria-hidden="true">·</span>
                <button type="button" class="hover:underline" title="Duplo-clique edita owner" @dblclick="iniciarEdicao(fg.no, 'owner')">{{ fg.no.owner }}</button>
              </template>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span v-for="c in avaliarGate(fg.no, waiversDe(fg.no.id)).checks" :key="c.codigo" class="inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium" :class="c.ok ? 'bg-nexo-approved-bg text-nexo-approved' : 'bg-nexo-blocked-bg text-nexo-blocked'">
                {{ c.codigo }}<LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" />
              </span>
              <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border bg-white px-3 py-1 text-sm text-nexo-text hover:bg-slate-50" @click="verChecklist(fg.no.id)">Dispensas</button>
            </div>
            <!-- Ações por feature (todas preservadas) -->
            <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-nexo-border/70 pt-3">
              <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm text-nexo-text hover:bg-slate-50" @click="abrirNoCanvas(fg.no.id)">
                <LucideIcon name="layout" :size="14" />
                Canvas
              </button>
              <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm text-nexo-text hover:bg-slate-50" @click="abrirStoryModal(fg.no as Feature)">
                <LucideIcon name="eye" :size="14" />
                Ver story
              </button>
              <RouterLink :to="{ path: '/studio-full', query: { feature: fg.no.id, from: 'backlog' } }" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm text-nexo-text hover:bg-slate-50">
                <LucideIcon name="layout" :size="14" />
                Ver tela
              </RouterLink>
              <RouterLink :to="{ path: '/studio-full', query: { feature: fg.no.id, from: 'backlog' } }" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn bg-nexo-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95" :title="`Abrir Studio da feature ${fg.no.titulo}`">
                <LucideIcon name="layout" :size="14" />
                Abrir Studio
              </RouterLink>
              <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm text-nexo-text hover:bg-slate-50" @click="abrirPreview(fg.no.id)">
                <LucideIcon name="eye" :size="14" />
                Preview
              </button>
              <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm text-nexo-text hover:bg-slate-50" :title="`Exportar wiki da feature ${fg.no.titulo}`" @click="baixarFeatureWiki(fg.no.id)">
                <LucideIcon name="download" :size="14" />
                Exportar wiki
              </button>
            </div>
          </div>

          <!-- PBIs da feature -->
          <div class="border-t border-nexo-border/70 bg-slate-50/50 px-4 py-3">
            <p class="mb-2 text-xs font-bold uppercase tracking-wide text-nexo-muted">PBIs ({{ fg.pbis.length }})</p>
            <p v-if="fg.pbis.length === 0" class="text-sm text-nexo-muted">Nenhum PBI vinculado a esta feature.</p>
            <ul v-else class="space-y-2">
              <li v-for="pbi in fg.pbis" :key="pbi.id" class="rounded-card border border-nexo-border bg-white px-3 py-2" tabindex="0" @keydown.enter="iniciarEdicao(pbi, 'titulo')">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-badge border border-nexo-border bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-700">PBI</span>
                  <span class="rounded-badge border border-nexo-border bg-white px-2 py-0.5 font-mono text-xs text-nexo-muted">{{ pbi.id }}</span>
                  <span class="rounded-badge border border-nexo-border bg-white px-2 py-0.5 text-xs text-nexo-text">{{ pbi.gate }}</span>
                  <span class="rounded-badge border border-nexo-border bg-white px-2 py-0.5 text-xs text-nexo-text">{{ pbi.status }}</span>
                </div>
                <template v-if="editId === pbi.id && editCampo === 'titulo'">
                  <input v-model="editValor" aria-label="Editar título do PBI" class="mt-1 min-h-[32px] w-full rounded-btn border border-nexo-border px-2 py-1 text-sm" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar" />
                  <span v-if="editErro" class="mt-1 block text-xs text-nexo-blocked">{{ editErro }}</span>
                </template>
                <button v-else type="button" class="mt-1 text-left text-sm font-semibold text-nexo-text hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(pbi, 'titulo')">{{ pbi.titulo }}</button>
                <p class="mt-0.5 text-sm text-nexo-muted">{{ pbi.descricao }}</p>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span v-for="c in avaliarGate(pbi, waiversDe(pbi.id)).checks" :key="c.codigo" class="inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium" :class="c.ok ? 'bg-nexo-approved-bg text-nexo-approved' : 'bg-nexo-blocked-bg text-nexo-blocked'">
                    {{ c.codigo }}<LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" />
                  </span>
                  <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border bg-white px-3 py-1 text-sm text-nexo-text hover:bg-slate-50" @click="verChecklist(pbi.id)">Dispensas</button>
                  <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1 text-sm text-nexo-text hover:bg-slate-50" @click="abrirNoCanvas(pbi.id)">
                    <LucideIcon name="layout" :size="14" />
                    Canvas
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <!-- Outros tipos (sem hierarquia épico/feature/pbi) -->
    <section v-if="outrosItens.length > 0" class="rounded-card border border-nexo-border bg-white p-4" aria-label="Outros itens">
      <h2 class="text-sm font-bold text-nexo-text">Outros itens ({{ outrosItens.length }})</h2>
      <ul class="mt-2 space-y-2">
        <li v-for="n in outrosItens" :key="n.id" class="flex flex-wrap items-center gap-2 rounded-card border border-nexo-border px-3 py-2" tabindex="0" @keydown.enter="iniciarEdicao(n, 'titulo')">
          <span class="rounded-badge border border-nexo-border bg-slate-100 px-2 py-0.5 text-xs font-medium text-nexo-text">{{ n.tipo }}</span>
          <template v-if="editId === n.id && editCampo === 'titulo'">
            <input v-model="editValor" aria-label="Editar título" class="min-h-[32px] flex-1 rounded-btn border border-nexo-border px-2 py-1 text-sm" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar" />
          </template>
          <button v-else type="button" class="text-left text-sm font-medium text-nexo-text hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(n, 'titulo')">{{ n.titulo }}</button>
          <span class="rounded-badge border border-nexo-border px-2 py-0.5 text-xs text-nexo-text">{{ n.gate }}</span>
          <span class="rounded-badge border border-nexo-border px-2 py-0.5 text-xs text-nexo-text">{{ n.status }}</span>
          <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border px-3 py-1 text-sm hover:bg-slate-50" @click="verChecklist(n.id)">Dispensas</button>
          <button type="button" class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border px-3 py-1 text-sm hover:bg-slate-50" @click="abrirNoCanvas(n.id)">
            <LucideIcon name="layout" :size="14" />
            Canvas
          </button>
        </li>
      </ul>
    </section>

    <GateChecklist v-if="checklistAlvo" ref="checklistRef" :key="checklistAlvo" />
    <div class="rounded-card border border-nexo-border bg-white p-4 text-sm text-nexo-muted">
      <p class="text-sm font-semibold text-nexo-text">Auditoria (últimas):</p>
      <ul class="mt-1 space-y-1 text-sm">
        <li v-for="a in graph.audit.slice(0, 10)" :key="a.id">{{ a.em }} — {{ a.ator_id }} — {{ a.acao }} — {{ a.detalhe }}</li>
      </ul>
    </div>

    <!-- Modal Ver-Story (Doc) -->
    <div
      v-if="storyModalAberto && storySelecionada"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="storyModalAberto = false"
    >
      <div class="max-w-xl w-full rounded-card border border-nexo-border bg-white p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <div class="flex items-start justify-between border-b border-nexo-border pb-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-badge bg-nexo-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-nexo-primary">{{ storySelecionada.id }}</span>
              <span class="rounded-badge bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{{ storySelecionada.gate }}</span>
              <span class="rounded-badge bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{{ storySelecionada.status }}</span>
            </div>
            <h2 class="text-base font-bold text-nexo-text mt-1">{{ storySelecionada.titulo }}</h2>
          </div>
          <button type="button" class="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-btn text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Fechar story" @click="storyModalAberto = false">
            <LucideIcon name="x" :size="18" />
          </button>
        </div>

        <!-- Conteúdo da Story -->
        <div class="space-y-3 text-sm leading-relaxed text-nexo-text">
          <div class="rounded-card bg-nexo-canvas/40 p-3 border border-nexo-border/60 space-y-1">
            <p><strong class="text-nexo-primary">Como:</strong> {{ storySelecionada.ator || 'usuário do sistema' }}</p>
            <p><strong class="text-nexo-primary">Quero:</strong> {{ storySelecionada.beneficio || storySelecionada.descricao }}</p>
            <p><strong class="text-nexo-primary">Para:</strong> {{ storySelecionada.gatilho || 'alcançar o objetivo planejado' }}</p>
          </div>

          <div v-if="storySelecionada.fluxo_feliz">
            <h4 class="font-bold text-nexo-text mb-1 text-sm">Fluxo Principal (Happy Path):</h4>
            <p class="text-sm text-nexo-muted pl-2 border-l-2 border-nexo-primary">{{ storySelecionada.fluxo_feliz }}</p>
          </div>

          <div v-if="storySelecionada.alternativos && storySelecionada.alternativos.length > 0">
            <h4 class="font-bold text-nexo-text mb-1 text-sm">Fluxos Alternativos & Exceções:</h4>
            <ul class="list-disc list-inside space-y-0.5 text-sm text-nexo-muted">
              <li v-for="(alt, idx) in storySelecionada.alternativos" :key="idx">{{ alt }}</li>
            </ul>
          </div>

          <div v-if="storySelecionada.criterios_bdd && storySelecionada.criterios_bdd.length > 0">
            <h4 class="font-bold text-nexo-text mb-1 text-sm">Critérios de Aceite (BDD):</h4>
            <div class="space-y-2">
              <div v-for="c in storySelecionada.criterios_bdd" :key="c.id" class="rounded-card border border-nexo-border/80 p-2 bg-white space-y-0.5">
                <span class="font-mono text-xs font-bold text-nexo-primary">{{ c.id }}</span>
                <p class="text-sm"><strong class="text-slate-700">Dado</strong> {{ c.given }}</p>
                <p class="text-sm"><strong class="text-slate-700">Quando</strong> {{ c.when }}</p>
                <p class="text-sm"><strong class="text-slate-700">Então</strong> {{ c.then }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-nexo-border pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink
              :to="{ path: '/studio-full', query: { feature: storySelecionada.id, from: 'backlog' } }"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn bg-nexo-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95"
              @click="storyModalAberto = false"
            >
              <LucideIcon name="layout" :size="14" />
              Ver Tela no Studio
            </RouterLink>
            <button
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-green-600 bg-white px-3 py-1.5 text-sm font-semibold text-green-800 hover:bg-green-50"
              @click="storyModalAberto = false; abrirPreview(storySelecionada.id)"
            >
              <LucideIcon name="eye" :size="14" />
              Preview Interativo
            </button>
            <button
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-slate-50"
              :title="`Exportar wiki da feature ${storySelecionada.titulo}`"
              @click="baixarFeatureWiki(storySelecionada.id)"
            >
              <LucideIcon name="download" :size="14" />
              Exportar wiki
            </button>
            <RouterLink
              :to="{ path: '/gates/G2', query: { alvo: storySelecionada.id } }"
              class="inline-flex min-h-[32px] items-center text-sm text-nexo-muted hover:underline ml-2"
              @click="storyModalAberto = false"
            >
              Ir para Gate G2
            </RouterLink>
          </div>
          <button type="button" class="inline-flex min-h-[32px] items-center rounded-btn border border-nexo-border px-3 py-1.5 text-sm" @click="storyModalAberto = false">
            Fechar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Preview Interativo -->
    <PreviewModal
      v-if="previewAberto"
      :inicio-id="previewInicioId"
      @fechar="previewAberto = false"
    />
  </div>
</template>
