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
import { VButton, VBadge, VTextInput, VSelect, VEmptyState, VDialog, VCard } from 'vueui-nova-kit'

const graph = useGraph()
const users = useUsers()
const gatesStore = useGate()
const router = useRouter()
const filtro = ref('')
const filtroEstado = ref('')
const checklistAlvo = ref('')
const checklistAberto = ref(false)
const estados = [
  { value: '', label: 'Todos os estados' }, { value: 'draft', label: 'Rascunho' }, { value: 'review', label: 'Em revisão' },
  { value: 'approved', label: 'Aprovado' }, { value: 'baseline', label: 'Baseline' }, { value: 'stale', label: 'Desatualizado' },
  { value: 'regenerated', label: 'Regenerado' }, { value: 'validated', label: 'Validado' }, { value: 'published', label: 'Publicado' }
]
const estadoLabel = (status: string) => estados.find((e) => e.value === status)?.label ?? status
function estadoVariant(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'outlined' {
  if (status === 'approved' || status === 'baseline' || status === 'validated' || status === 'published') return 'success'
  if (status === 'stale' || status === 'regenerated') return 'warning'
  if (status === 'review') return 'neutral'
  if (status === 'blocked') return 'danger'
  return 'outlined'
}

function nomeResponsavel(ownerId: string): string {
  return users.state.usuarios.find((user) => user.id === ownerId)?.nome ?? 'Responsável não identificado'
}

function rotuloTipo(no: NexoObject): string {
  return no.tipo === 'epico' && no.gate === 'G0' ? 'Enquadramento G0' : no.tipo === 'epico' ? 'Épico' : no.tipo.toUpperCase()
}

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

function verChecklist(id: string) {
  checklistAlvo.value = id
  checklistAberto.value = true
}

function checklistDo(no: NexoObject) {
  return avaliarGate(no, waiversDe(no.id)).checks
}

function resumoChecklist(no: NexoObject) {
  const checks = checklistDo(no)
  const pendentes = checks.filter((check) => !check.ok)
  return {
    checks,
    total: checks.length,
    completos: checks.length - pendentes.length,
    pendentes: pendentes.length,
    bloqueantes: pendentes.filter((check) => check.severidade === 'bloqueante').length,
    avisos: pendentes.filter((check) => check.severidade === 'aviso').length
  }
}

function limparFiltros() {
  filtro.value = ''
  filtroEstado.value = ''
}

// G7: label Ver-telas/Gerar-telas por feature (via-feature; destino com feature= preservado)
function temTelas(featureId: string): boolean {
  return graph.telasDaFeature(featureId).length > 0
}
</script>

<template>
  <div class="backlog-page space-y-4">
    <header class="border-b border-nexo-border pb-3">
      <h1 class="text-xl font-bold text-nexo-text">Backlog do projeto</h1>
      <p class="mt-1 text-sm text-nexo-text">Refine épicos, features e PBIs, avance pelos gates e abra os artefatos relacionados.</p>
    </header>

    <div class="backlog-filter-grid grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]" role="search" aria-label="Filtrar backlog">
      <VTextInput v-model="filtro" label="Buscar por título" placeholder="Digite um título…" type="search" class="min-w-0 w-full" />
      <VSelect v-model="filtroEstado" label="Estado" :options="estados" class="min-w-0 w-full" />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-nexo-text">
      <p>{{ itens.length }} {{ itens.length === 1 ? 'item' : 'itens' }} nesta visão</p>
      <VButton v-if="filtro || filtroEstado" type="button" variant="ghost" size="sm" @click="limparFiltros">Limpar filtros</VButton>
    </div>

    <div v-if="itens.length === 0" class="rounded-card border border-nexo-border bg-white p-4">
      <VEmptyState title="Nenhum item corresponde aos filtros" description="Remova o texto ou escolha outro estado para ver itens deste projeto." variant="default" :action="(filtro || filtroEstado) ? { label: 'Limpar filtros' } : undefined" @action="limparFiltros" />
    </div>
    <p v-else-if="hierarquia.length === 0" class="rounded-card border border-nexo-border bg-white p-3 text-sm text-nexo-text">
      Não há épicos, features ou PBIs correspondentes. Outros itens do filtro aparecem abaixo.
    </p>

    <!-- Hierarquia do modelo: Épico/Enquadramento G0 → Feature → PBI. -->
    <VCard v-for="grupo in hierarquia" :key="grupo.no.id" class="backlog-epic-card overflow-hidden" variant="outlined" :aria-label="rotuloTipo(grupo.no)">
      <section class="backlog-object-head border-b border-nexo-border px-3 py-3 sm:px-4">
        <div class="backlog-epic-head-row flex min-w-0 flex-wrap items-start gap-2">
          <div class="backlog-epic-head-content min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <VBadge variant="neutral" size="sm">{{ rotuloTipo(grupo.no) }}</VBadge>
              <VBadge variant="outlined" size="sm">{{ grupo.no.gate }}</VBadge>
              <VBadge :variant="estadoVariant(grupo.no.status)" size="sm">{{ estadoLabel(grupo.no.status) }}</VBadge>
            </div>
            <div class="backlog-title-row mt-1 flex min-w-0 items-start gap-1.5">
              <template v-if="editId === grupo.no.id && editCampo === 'titulo'">
                <VTextInput v-model="editValor" label="Título" class="min-w-0 flex-1" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" />
                <VButton size="sm" variant="outline" @click="confirmarEdicao">Salvar</VButton>
                <VButton size="sm" variant="ghost" @click="cancelarEdicao">Cancelar</VButton>
              </template>
              <h2 v-else class="min-w-0 break-words text-sm font-semibold text-nexo-text" :title="grupo.no.id">{{ grupo.no.titulo }}</h2>
              <VButton v-if="editId !== grupo.no.id" variant="ghost" size="sm" class="shrink-0" aria-label="Editar título" @click="iniciarEdicao(grupo.no, 'titulo')">Editar</VButton>
            </div>
            <span v-if="editErro && editId === grupo.no.id" class="text-xs text-nexo-blocked">{{ editErro }}</span>
            <p v-if="grupo.no.descricao" class="backlog-description mt-1 text-sm text-nexo-text">{{ grupo.no.descricao }}</p>
          </div>
          <div class="backlog-epic-head-actions flex shrink-0 flex-wrap items-center gap-1.5">
            <VButton type="button" variant="outline" size="sm" @click="abrirNoCanvas(grupo.no.id)">Canvas</VButton>
            <RouterLink :to="{ path: `/gates/${grupo.no.gate}`, query: { alvo: grupo.no.id } }" class="backlog-action-link">Abrir {{ grupo.no.gate }}</RouterLink>
          </div>
        </div>
        <div class="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-sm text-nexo-text">
          <span>Responsável: <strong>{{ nomeResponsavel(grupo.no.owner) }}</strong></span>
          <template v-if="editId === grupo.no.id && (editCampo === 'owner' || editCampo === 'gate')">
            <VSelect v-if="editCampo === 'owner'" v-model="editValor" label="Responsável" :options="users.state.usuarios.map((user) => ({ value: user.id, label: user.nome }))" class="min-w-[180px]" />
            <VSelect v-else v-model="editValor" label="Gate" :options="['G0', 'G1', 'G2', 'G3', 'G4', 'G5'].map((gate) => ({ value: gate, label: gate }))" class="min-w-[120px]" />
            <VButton type="button" variant="outline" size="sm" @click="confirmarEdicao">Salvar</VButton>
            <VButton type="button" variant="ghost" size="sm" @click="cancelarEdicao">Cancelar</VButton>
          </template>
          <template v-else>
            <VButton type="button" variant="ghost" size="sm" class="h-auto min-h-0 px-1 py-0 text-xs text-nexo-text" aria-label="Alterar responsável" @click="iniciarEdicao(grupo.no, 'owner')">Alterar responsável</VButton>
            <VButton type="button" variant="ghost" size="sm" class="h-auto min-h-0 px-1 py-0 text-xs text-nexo-text" aria-label="Editar gate" @click="iniciarEdicao(grupo.no, 'gate')">Editar gate</VButton>
          </template>
        </div>
        <div v-if="editErro && editCampo !== 'titulo' && editId === grupo.no.id" class="mt-1 text-xs text-nexo-blocked">{{ editErro }}</div>
      </section>

      <div class="space-y-3 p-3 sm:p-4">
        <section class="backlog-check-summary border-y border-nexo-border py-2" :aria-label="`Resumo dos critérios de ${rotuloTipo(grupo.no)}`">
          <div class="flex min-w-0 flex-wrap items-center gap-2 text-xs text-nexo-text">
            <span class="font-medium">{{ resumoChecklist(grupo.no).completos }}/{{ resumoChecklist(grupo.no).total }} critérios</span>
            <VBadge :variant="resumoChecklist(grupo.no).pendentes ? 'warning' : 'success'" size="xs">{{ resumoChecklist(grupo.no).pendentes ? `${resumoChecklist(grupo.no).pendentes} pendentes · ${resumoChecklist(grupo.no).bloqueantes} bloqueantes` : 'Completo' }}</VBadge>
            <div class="h-1.5 min-w-[72px] flex-1 overflow-hidden rounded-full bg-nexo-canvas" role="progressbar" :aria-valuenow="resumoChecklist(grupo.no).completos" aria-valuemin="0" :aria-valuemax="resumoChecklist(grupo.no).total" :aria-label="`Critérios atendidos: ${resumoChecklist(grupo.no).completos} de ${resumoChecklist(grupo.no).total}`">
              <div class="h-full rounded-full bg-nexo-approved" :style="{ width: `${resumoChecklist(grupo.no).total ? (resumoChecklist(grupo.no).completos / resumoChecklist(grupo.no).total) * 100 : 0}%` }" />
            </div>
            <VButton type="button" variant="outline" size="sm" class="shrink-0" @click="verChecklist(grupo.no.id)">Ver critérios e dispensas</VButton>
          </div>
        </section>

        <div v-if="grupo.features.length === 0 && grupo.no.gate !== 'G0'" class="rounded-btn border border-dashed border-nexo-border px-3 py-2 text-xs text-nexo-text">
          {{ filtro || filtroEstado ? 'Nenhuma feature corresponde aos filtros atuais.' : 'Este épico ainda não tem features.' }}
        </div>

        <VCard v-for="fg in grupo.features" :key="fg.no.id" class="backlog-feature-card min-w-0" variant="outlined" aria-label="Feature">
          <section class="px-3 py-3 sm:px-4">
            <div class="backlog-feature-head-row flex min-w-0 flex-wrap items-start gap-2">
              <div class="backlog-feature-head-content min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <VBadge variant="neutral" size="sm">Feature</VBadge>
                  <VBadge variant="outlined" size="sm">{{ fg.no.gate }}</VBadge>
                  <VBadge :variant="estadoVariant(fg.no.status)" size="sm">{{ estadoLabel(fg.no.status) }}</VBadge>
                </div>
                <div class="backlog-title-row mt-1 flex min-w-0 items-start gap-1.5">
                  <template v-if="editId === fg.no.id && editCampo === 'titulo'">
                    <VTextInput v-model="editValor" label="Título da feature" class="min-w-0 flex-1" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" />
                    <VButton size="sm" variant="outline" @click="confirmarEdicao">Salvar</VButton><VButton size="sm" variant="ghost" @click="cancelarEdicao">Cancelar</VButton>
                  </template>
                  <h3 v-else class="min-w-0 break-words text-sm font-semibold text-nexo-text" :title="fg.no.id">{{ fg.no.titulo }}</h3>
                  <VButton v-if="editId !== fg.no.id" type="button" variant="ghost" size="sm" class="shrink-0 px-1" aria-label="Editar título da feature" @click="iniciarEdicao(fg.no, 'titulo')">Editar</VButton>
                </div>
                <span v-if="editErro && editId === fg.no.id" class="text-xs text-nexo-blocked">{{ editErro }}</span>
                <p v-if="fg.no.descricao" class="backlog-description mt-1 text-sm text-nexo-text">{{ fg.no.descricao }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-nexo-text">
                  <span>Responsável: <strong>{{ nomeResponsavel(fg.no.owner) }}</strong></span>
                  <template v-if="editId === fg.no.id && (editCampo === 'owner' || editCampo === 'gate')">
                    <VSelect v-if="editCampo === 'owner'" v-model="editValor" label="Responsável" :options="users.state.usuarios.map((user) => ({ value: user.id, label: user.nome }))" class="min-w-[180px]" />
                    <VSelect v-else v-model="editValor" label="Gate" :options="['G0', 'G1', 'G2', 'G3', 'G4', 'G5'].map((gate) => ({ value: gate, label: gate }))" class="min-w-[120px]" />
                    <VButton type="button" variant="outline" size="sm" @click="confirmarEdicao">Salvar</VButton><VButton type="button" variant="ghost" size="sm" @click="cancelarEdicao">Cancelar</VButton>
                  </template>
                  <template v-else>
                    <VButton type="button" variant="ghost" size="sm" class="h-auto min-h-0 px-1 py-0 text-xs text-nexo-text" aria-label="Alterar responsável da feature" @click="iniciarEdicao(fg.no, 'owner')">Alterar responsável</VButton>
                    <VButton type="button" variant="ghost" size="sm" class="h-auto min-h-0 px-1 py-0 text-xs text-nexo-text" aria-label="Editar gate da feature" @click="iniciarEdicao(fg.no, 'gate')">Editar gate</VButton>
                  </template>
                </div>
                <span v-if="editErro && editCampo !== 'titulo' && editId === fg.no.id" class="text-xs text-nexo-blocked">{{ editErro }}</span>
              </div>
              <div class="backlog-feature-head-actions flex shrink-0 flex-wrap items-center gap-1.5">
                <VButton type="button" variant="outline" size="sm" @click="abrirNoCanvas(fg.no.id)">Canvas</VButton>
                <RouterLink :to="{ path: `/gates/${fg.no.gate}`, query: { alvo: fg.no.id } }" class="backlog-action-link">Abrir {{ fg.no.gate }}</RouterLink>
              </div>
            </div>

            <section class="backlog-check-summary mt-2 border-y border-nexo-border py-2" :aria-label="`Resumo dos critérios da feature ${fg.no.titulo}`">
              <div class="flex min-w-0 flex-wrap items-center gap-2 text-xs text-nexo-text">
                <span class="font-medium">{{ resumoChecklist(fg.no).completos }}/{{ resumoChecklist(fg.no).total }} critérios</span>
                <VBadge :variant="resumoChecklist(fg.no).pendentes ? 'warning' : 'success'" size="xs">{{ resumoChecklist(fg.no).pendentes ? `${resumoChecklist(fg.no).pendentes} pendentes · ${resumoChecklist(fg.no).bloqueantes} bloqueantes` : 'Completo' }}</VBadge>
                <div class="h-1.5 min-w-[72px] flex-1 overflow-hidden rounded-full bg-nexo-canvas" role="progressbar" :aria-valuenow="resumoChecklist(fg.no).completos" aria-valuemin="0" :aria-valuemax="resumoChecklist(fg.no).total" :aria-label="`Critérios atendidos: ${resumoChecklist(fg.no).completos} de ${resumoChecklist(fg.no).total}`"><div class="h-full rounded-full bg-nexo-approved" :style="{ width: `${resumoChecklist(fg.no).total ? (resumoChecklist(fg.no).completos / resumoChecklist(fg.no).total) * 100 : 0}%` }" /></div>
                <VButton type="button" variant="outline" size="sm" class="shrink-0" @click="verChecklist(fg.no.id)">Ver critérios e dispensas</VButton>
              </div>
            </section>

            <div class="mt-3 flex flex-wrap items-center gap-1.5 pt-2">
              <VButton type="button" variant="outline" size="sm" @click="abrirStoryModal(fg.no as Feature)">Ver story</VButton>
              <RouterLink :to="{ path: '/studio-full', query: { feature: fg.no.id, from: 'backlog' } }" class="backlog-action-link">{{ temTelas(fg.no.id) ? 'Abrir telas no Studio' : 'Criar telas no Studio' }}</RouterLink>
              <VButton type="button" variant="outline" size="sm" @click="abrirPreview(fg.no.id)">Preview</VButton>
              <VButton type="button" variant="outline" size="sm" :title="`Exportar wiki da feature ${fg.no.titulo}`" @click="baixarFeatureWiki(fg.no.id)">Exportar wiki</VButton>
            </div>
          </section>

          <section class="border-t border-nexo-border bg-nexo-surface/50 px-3 py-2 sm:px-4">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-xs font-semibold text-nexo-text">PBIs vinculados ({{ fg.pbis.length }})</h4>
              <span v-if="fg.pbis.length" class="text-xs text-nexo-text">{{ fg.pbis.length === 1 ? '1 item' : `${fg.pbis.length} itens` }}</span>
            </div>
            <p v-if="fg.pbis.length === 0" class="mt-1 text-xs text-nexo-text">
              {{ filtro || filtroEstado ? 'Nenhum PBI corresponde aos filtros atuais.' : 'Esta feature ainda não tem PBIs.' }}
            </p>
            <ul v-else class="mt-2 space-y-2">
              <li v-for="pbi in fg.pbis" :key="pbi.id" class="backlog-pbi-card rounded-btn border border-nexo-border bg-white px-3 py-2" :title="pbi.id">
                <div class="flex min-w-0 flex-wrap items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <VBadge variant="neutral" size="sm">PBI</VBadge><VBadge variant="outlined" size="sm">{{ pbi.gate }}</VBadge><VBadge :variant="estadoVariant(pbi.status)" size="sm">{{ estadoLabel(pbi.status) }}</VBadge>
                    </div>
                    <template v-if="editId === pbi.id && editCampo === 'titulo'">
                      <VTextInput v-model="editValor" label="Título do PBI" class="mt-1 w-full" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" />
                      <div class="mt-1 flex gap-2"><VButton size="sm" variant="outline" @click="confirmarEdicao">Salvar</VButton><VButton size="sm" variant="ghost" @click="cancelarEdicao">Cancelar</VButton></div>
                    </template>
                    <h5 v-else class="mt-1 break-words text-sm font-medium text-nexo-text">{{ pbi.titulo }}</h5>
                    <span v-if="editErro && editId === pbi.id" class="text-xs text-nexo-blocked">{{ editErro }}</span>
                    <p v-if="pbi.descricao" class="backlog-description mt-0.5 text-sm text-nexo-text">{{ pbi.descricao }}</p>
                    <div class="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-nexo-text">
                      <span>Responsável: <strong>{{ nomeResponsavel(pbi.owner) }}</strong></span>
                      <VButton type="button" variant="ghost" size="sm" class="h-auto min-h-0 px-1 py-0 text-xs text-nexo-text" aria-label="Editar título do PBI" @click="iniciarEdicao(pbi, 'titulo')">Editar</VButton>
                      <VButton type="button" variant="outline" size="sm" @click="abrirNoCanvas(pbi.id)">Canvas</VButton>
                      <RouterLink :to="{ path: `/gates/${pbi.gate}`, query: { alvo: pbi.id } }" class="backlog-action-link">Abrir {{ pbi.gate }}</RouterLink>
                    </div>
                  </div>
                  <div class="backlog-pbi-progress min-w-0 flex-1 sm:max-w-[200px]">
                    <span class="text-xs text-nexo-text">{{ resumoChecklist(pbi).completos }}/{{ resumoChecklist(pbi).total }} critérios</span>
                    <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-nexo-canvas" role="progressbar" :aria-valuenow="resumoChecklist(pbi).completos" aria-valuemin="0" :aria-valuemax="resumoChecklist(pbi).total" :aria-label="`Critérios atendidos: ${resumoChecklist(pbi).completos} de ${resumoChecklist(pbi).total}`">
                      <div class="h-full rounded-full bg-nexo-approved" :style="{ width: `${resumoChecklist(pbi).total ? (resumoChecklist(pbi).completos / resumoChecklist(pbi).total) * 100 : 0}%` }" />
                    </div>
                  </div>
                </div>
                <VButton type="button" variant="outline" size="sm" class="mt-2" @click="verChecklist(pbi.id)">Ver critérios e dispensas · {{ resumoChecklist(pbi).pendentes }} pendentes</VButton>
              </li>
            </ul>
          </section>
        </VCard>
      </div>
    </VCard>

    <!-- Outros tipos (sem hierarquia épico/feature/pbi) -->
    <VCard v-if="outrosItens.length > 0" class="p-3" variant="outlined" aria-label="Outros itens">
      <h2 class="text-sm font-semibold text-nexo-text">Outros itens ({{ outrosItens.length }})</h2>
      <ul class="mt-2 space-y-2">
        <li v-for="n in outrosItens" :key="n.id" class="rounded-btn border border-nexo-border p-3">
          <div class="flex min-w-0 flex-wrap items-start gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <VBadge variant="neutral" size="sm">{{ n.tipo }}</VBadge>
                <VBadge variant="outlined" size="sm">{{ n.gate }}</VBadge>
                <VBadge :variant="estadoVariant(n.status)" size="sm">{{ estadoLabel(n.status) }}</VBadge>
              </div>
              <template v-if="editId === n.id && editCampo === 'titulo'">
                <VTextInput v-model="editValor" label="Título" class="mt-1 min-w-0 w-full" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" />
                <div class="mt-1 flex gap-2"><VButton size="sm" variant="outline" @click="confirmarEdicao">Salvar</VButton><VButton size="sm" variant="ghost" @click="cancelarEdicao">Cancelar</VButton></div>
              </template>
              <h3 v-else class="mt-1 break-words text-sm font-semibold text-nexo-text" :title="n.id">{{ n.titulo }}</h3>
              <span v-if="editErro && editId === n.id" class="text-xs text-nexo-blocked">{{ editErro }}</span>
              <p v-if="n.descricao" class="backlog-description mt-1 text-sm text-nexo-text">{{ n.descricao }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-nexo-text">
                <span>Responsável: <strong>{{ nomeResponsavel(n.owner) }}</strong></span>
                <VButton type="button" variant="ghost" size="sm" class="h-auto min-h-0 px-1 py-0 text-xs text-nexo-text" aria-label="Editar título" @click="iniciarEdicao(n, 'titulo')">Editar título</VButton>
                <RouterLink :to="{ path: `/gates/${n.gate}`, query: { alvo: n.id } }" class="backlog-action-link">Abrir {{ n.gate }}</RouterLink>
                <VButton type="button" variant="outline" size="sm" @click="abrirNoCanvas(n.id)">Canvas</VButton>
              </div>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 border-t border-nexo-border pt-2 text-xs text-nexo-text">
            <span>{{ resumoChecklist(n).completos }}/{{ resumoChecklist(n).total }} critérios · {{ resumoChecklist(n).bloqueantes }} bloqueantes pendentes</span>
            <VButton type="button" variant="outline" size="sm" class="ml-auto" @click="verChecklist(n.id)">Ver critérios e dispensas</VButton>
          </div>
        </li>
      </ul>
    </VCard>

    <VDialog v-if="checklistAlvo && checklistAberto" v-model="checklistAberto" :title="`Critérios e dispensas — ${graph.noPorId(checklistAlvo)?.titulo ?? 'item'}`" description="Critérios do gate atual e dispensas de avisos com justificativa." size="lg" variant="form" :show-close="true" @close="checklistAberto = false">
      <div class="max-h-[70vh] min-w-0 overflow-y-auto p-1">
        <GateChecklist :alvo-id="checklistAlvo" />
      </div>
    </VDialog>

    <div class="rounded-card border border-nexo-border bg-white p-3 text-sm text-nexo-text">
      <p class="text-sm font-semibold text-nexo-text">Auditoria (últimas):</p>
      <ul class="mt-1 space-y-1 text-sm">
        <li v-for="a in graph.audit.slice(0, 10)" :key="a.id">{{ a.em }} — {{ a.ator_id }} — {{ a.acao }} — {{ a.detalhe }}</li>
      </ul>
    </div>

    <!-- Modal Ver-Story (Doc) -->
    <VDialog v-if="storySelecionada" v-model="storyModalAberto" :title="storySelecionada.titulo" description="Detalhes da story da feature selecionada." size="lg" variant="basic" :show-close="false">
      <div class="max-w-xl w-full space-y-4 max-h-[70vh] overflow-y-auto">
        <div class="flex items-start justify-between border-b border-nexo-border pb-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <VBadge variant="neutral" size="sm" :title="storySelecionada.id">Feature</VBadge>
              <span class="rounded-badge bg-nexo-canvas px-2 py-0.5 text-xs font-medium text-nexo-text">{{ storySelecionada.gate }}</span>
              <VBadge :variant="estadoVariant(storySelecionada.status)" size="sm">{{ estadoLabel(storySelecionada.status) }}</VBadge>
            </div>
            <h2 class="text-base font-bold text-nexo-text mt-1">{{ storySelecionada.titulo }}</h2>
          </div>
          <VButton type="button" variant="ghost" size="sm" class="inline-flex h-8 w-8 min-h-0 min-w-0 items-center justify-center p-0" aria-label="Fechar story" @click="storyModalAberto = false">
            <LucideIcon name="x" :size="18" />
          </VButton>
        </div>

        <!-- Conteúdo da Story -->
        <div class="space-y-3 text-sm leading-relaxed text-nexo-text">
          <div class="rounded-card bg-nexo-canvas/40 p-3 border border-nexo-border/60 space-y-1">
            <p><strong class="text-nexo-text">Como:</strong> {{ storySelecionada.ator || 'usuário do sistema' }}</p>
            <p><strong class="text-nexo-text">Quero:</strong> {{ storySelecionada.beneficio || storySelecionada.descricao }}</p>
            <p><strong class="text-nexo-text">Para:</strong> {{ storySelecionada.gatilho || 'alcançar o objetivo planejado' }}</p>
          </div>

          <div v-if="storySelecionada.fluxo_feliz">
            <h4 class="font-bold text-nexo-text mb-1 text-sm">Fluxo Principal (Happy Path):</h4>
            <p class="text-sm text-nexo-text pl-2 border-l-2 border-nexo-border">{{ storySelecionada.fluxo_feliz }}</p>
          </div>

          <div v-if="storySelecionada.alternativos && storySelecionada.alternativos.length > 0">
            <h4 class="font-bold text-nexo-text mb-1 text-sm">Fluxos Alternativos & Exceções:</h4>
            <ul class="list-disc list-inside space-y-0.5 text-sm text-nexo-text">
              <li v-for="(alt, idx) in storySelecionada.alternativos" :key="idx">{{ alt }}</li>
            </ul>
          </div>

          <div v-if="storySelecionada.criterios_bdd && storySelecionada.criterios_bdd.length > 0">
            <h4 class="font-bold text-nexo-text mb-1 text-sm">Critérios de Aceite (BDD):</h4>
            <div class="space-y-2">
              <div v-for="c in storySelecionada.criterios_bdd" :key="c.id" class="rounded-card border border-nexo-border/80 p-2 bg-white space-y-0.5">
                <span class="font-mono text-xs font-bold text-nexo-primary">{{ c.id }}</span>
                <p class="text-sm"><strong class="text-nexo-text">Dado</strong> {{ c.given }}</p>
                <p class="text-sm"><strong class="text-nexo-text">Quando</strong> {{ c.when }}</p>
                <p class="text-sm"><strong class="text-nexo-text">Então</strong> {{ c.then }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-nexo-border pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink
              :to="{ path: '/studio-full', query: { feature: storySelecionada.id, from: 'backlog' } }"
              class="backlog-action-link"
              @click="storyModalAberto = false"
            >
              <LucideIcon name="layout" :size="14" />
              Ver Tela no Studio
            </RouterLink>
            <VButton
              type="button"
              variant="outline"
              size="sm"
              @click="storyModalAberto = false; abrirPreview(storySelecionada.id)"
            >
              <LucideIcon name="eye" :size="14" />
              Preview Interativo
            </VButton>
            <VButton
              type="button"
              variant="outline"
              size="sm"
              :title="`Exportar wiki da feature ${storySelecionada.titulo}`"
              @click="baixarFeatureWiki(storySelecionada.id)"
            >
              <LucideIcon name="download" :size="14" />
              Exportar wiki
            </VButton>
            <RouterLink
              :to="{ path: '/gates/G2', query: { alvo: storySelecionada.id } }"
              class="backlog-action-link"
              @click="storyModalAberto = false"
            >
              Ir para Gate G2
            </RouterLink>
          </div>
          <VButton type="button" variant="ghost" size="sm" @click="storyModalAberto = false">
            Fechar
          </VButton>
        </div>
      </div>
    </VDialog>

    <!-- Modal de Preview Interativo -->
    <PreviewModal
      v-if="previewAberto"
      :inicio-id="previewInicioId"
      @fechar="previewAberto = false"
    />
  </div>
</template>

<style scoped>
/* VCard defaults to generous body padding; these two nested hierarchy cards
   already own their internal spacing in the template. */
.backlog-epic-card,
.backlog-feature-card {
  padding: 0 !important;
}

.backlog-title-row {
  width: 100%;
  max-width: 100%;
  word-break: normal;
  overflow-wrap: break-word;
}

.backlog-epic-head-row,
.backlog-feature-head-row {
  align-items: center;
}

@media (max-width: 640px) {
  .backlog-epic-head-row,
  .backlog-feature-head-row {
    align-items: stretch;
    flex-direction: column;
  }

  .backlog-epic-head-content,
  .backlog-feature-head-content {
    width: 100%;
    flex: none;
  }

  .backlog-epic-head-actions,
  .backlog-feature-head-actions {
    width: 100%;
    flex: none;
    justify-content: flex-start;
  }
}

.backlog-action-link {
  @apply inline-flex min-h-8 items-center rounded-btn border border-nexo-border px-3 py-1.5 text-sm font-medium text-nexo-text no-underline;
}

.backlog-action-link:hover {
  @apply bg-nexo-surface;
}
</style>
