<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { avaliarGate } from '@/utils/gates'
import GateChecklist from '@/components/backlog/GateChecklist.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import PreviewModal from '@/components/studio/PreviewModal.vue'
import { montarEntradaStudio } from '@/ai/gateParaStudio'
import type { Feature } from '@/types/nexo'

const graph = useGraph()
const users = useUsers()
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

const itens = computed(() =>
  graph.state.nos.filter((n) => {
    if (filtro.value && !n.titulo.toLowerCase().includes(filtro.value.toLowerCase())) return false
    if (filtroEstado.value && n.status !== filtroEstado.value) return false
    return true
  })
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
  <div class="space-y-4">
    <h1 class="text-xl font-bold">Backlog — Épico → Feature → PBI</h1>
    <div class="flex gap-2 text-sm">
      <RouterLink :to="{ path: '/studio-full', query: { from: 'backlog' } }" class="rounded-btn border border-nexo-border px-3 py-1.5">Abrir Studio</RouterLink>
      <input v-model="filtro" placeholder="Filtrar por título…" aria-label="Filtrar backlog" class="rounded-btn border border-nexo-border px-3 py-1.5" />
      <select v-model="filtroEstado" aria-label="Filtrar por estado" class="rounded-btn border border-nexo-border px-2 py-1.5">
        <option value="">Todos</option>
        <option value="draft">Rascunho</option>
        <option value="review">Em revisão</option>
        <option value="approved">Aprovado</option>
        <option value="stale">Desatualizado</option>
      </select>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-nexo-muted">
          <th class="py-2">Título</th>
          <th>Tipo</th>
          <th>Gate</th>
          <th>Owner</th>
          <th>Estado</th>
          <th>Checklist</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in itens" :key="n.id" class="border-t border-nexo-border" tabindex="0" @keydown.enter="iniciarEdicao(n, 'titulo')">
          <td class="py-2">
            <template v-if="editId === n.id && editCampo === 'titulo'">
              <input v-model="editValor" aria-label="Editar título" class="w-full rounded-btn border border-nexo-border px-1 py-0.5" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar" />
              <span v-if="editErro" class="text-xs text-nexo-blocked">{{ editErro }}</span>
            </template>
            <button v-else type="button" class="text-left hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(n, 'titulo')">{{ n.titulo }}</button>
          </td>
          <td>{{ n.tipo }}</td>
          <td>
            <template v-if="editId === n.id && editCampo === 'gate'">
              <select v-model="editValor" aria-label="Editar gate" class="rounded-btn border border-nexo-border px-1 py-0.5" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar">
                <option>G0</option><option>G1</option><option>G2</option><option>G3</option><option>G4</option><option>G5</option>
              </select>
            </template>
            <button v-else type="button" class="hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(n, 'gate')">{{ n.gate }}</button>
          </td>
          <td>
            <template v-if="editId === n.id && editCampo === 'owner'">
              <select v-model="editValor" aria-label="Editar owner" class="rounded-btn border border-nexo-border px-1 py-0.5" @keydown.enter="confirmarEdicao" @keydown.escape="cancelarEdicao" @blur="onBlurConfirmar">
                <option v-for="u in users.state.usuarios" :key="u.id" :value="u.id">{{ u.id }}</option>
              </select>
            </template>
            <button v-else type="button" class="hover:underline" title="Duplo-clique edita" @dblclick="iniciarEdicao(n, 'owner')">{{ n.owner }}</button>
          </td>
          <td>{{ n.status }}</td>
          <td class="text-xs">
            <span v-for="c in avaliarGate(n, waiversDe(n.id)).checks" :key="c.codigo" class="mr-1 inline-flex items-center gap-0.5 rounded-badge px-1" :class="c.ok ? 'bg-nexo-approved-bg text-nexo-approved' : 'bg-nexo-blocked-bg text-nexo-blocked'">{{ c.codigo }}<LucideIcon :name="c.ok ? 'check' : 'x'" :size="10" /></span>
            <button type="button" class="ml-1 underline" @click="verChecklist(n.id)">dispensas</button>
          </td>
          <td class="space-x-2 whitespace-nowrap text-xs">
            <button type="button" class="text-nexo-primary hover:underline" @click="abrirNoCanvas(n.id)">Canvas</button>
            <template v-if="n.tipo === 'feature'">
              <button type="button" class="text-nexo-primary hover:underline" @click="abrirStoryModal(n as Feature)">ver-story</button>
              <RouterLink :to="{ path: '/studio-full', query: { feature: n.id, from: 'backlog' } }" class="text-nexo-primary hover:underline">ver-tela</RouterLink>
              <button type="button" class="text-nexo-primary hover:underline" @click="abrirPreview(n.id)">preview</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <GateChecklist v-if="checklistAlvo" ref="checklistRef" :key="checklistAlvo" />
    <div class="text-xs text-nexo-muted">
      <p class="font-semibold">Auditoria (últimas):</p>
      <ul>
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
        <div class="flex items-start justify-between border-b pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded bg-nexo-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-nexo-primary">{{ storySelecionada.id }}</span>
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">{{ storySelecionada.gate }}</span>
              <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">{{ storySelecionada.status }}</span>
            </div>
            <h2 class="text-base font-bold text-nexo-text mt-1">{{ storySelecionada.titulo }}</h2>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-700" @click="storyModalAberto = false">
            <LucideIcon name="x" :size="18" />
          </button>
        </div>

        <!-- Conteúdo da Story -->
        <div class="space-y-3 text-xs leading-relaxed text-nexo-text">
          <div class="rounded bg-nexo-canvas/40 p-3 border border-nexo-border/60 space-y-1">
            <p><strong class="text-nexo-primary">Como:</strong> {{ storySelecionada.ator || 'usuário do sistema' }}</p>
            <p><strong class="text-nexo-primary">Quero:</strong> {{ storySelecionada.beneficio || storySelecionada.descricao }}</p>
            <p><strong class="text-nexo-primary">Para:</strong> {{ storySelecionada.gatilho || 'alcançar o objetivo planejado' }}</p>
          </div>

          <div v-if="storySelecionada.fluxo_feliz">
            <h4 class="font-bold text-nexo-text mb-1">Fluxo Principal (Happy Path):</h4>
            <p class="text-nexo-muted pl-2 border-l-2 border-nexo-primary">{{ storySelecionada.fluxo_feliz }}</p>
          </div>

          <div v-if="storySelecionada.alternativos && storySelecionada.alternativos.length > 0">
            <h4 class="font-bold text-nexo-text mb-1">Fluxos Alternativos & Exceções:</h4>
            <ul class="list-disc list-inside space-y-0.5 text-nexo-muted">
              <li v-for="(alt, idx) in storySelecionada.alternativos" :key="idx">{{ alt }}</li>
            </ul>
          </div>

          <div v-if="storySelecionada.criterios_bdd && storySelecionada.criterios_bdd.length > 0">
            <h4 class="font-bold text-nexo-text mb-1">Critérios de Aceite (BDD):</h4>
            <div class="space-y-2">
              <div v-for="c in storySelecionada.criterios_bdd" :key="c.id" class="rounded border border-nexo-border/80 p-2 bg-white space-y-0.5">
                <span class="font-mono text-[10px] font-bold text-nexo-primary">{{ c.id }}</span>
                <p class="text-[11px]"><strong class="text-gray-700">Dado</strong> {{ c.given }}</p>
                <p class="text-[11px]"><strong class="text-gray-700">Quando</strong> {{ c.when }}</p>
                <p class="text-[11px]"><strong class="text-gray-700">Então</strong> {{ c.then }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div class="flex items-center justify-between border-t pt-3">
          <div class="flex items-center gap-2">
            <RouterLink
              :to="{ path: '/studio-full', query: { feature: storySelecionada.id, from: 'backlog' } }"
              class="inline-flex items-center gap-1 rounded-btn bg-nexo-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-nexo-primary/90"
              @click="storyModalAberto = false"
            >
              <LucideIcon name="layout" :size="13" />
              Ver Tela no Studio
            </RouterLink>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-btn border border-green-600 bg-white px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-50"
              @click="storyModalAberto = false; abrirPreview(storySelecionada.id)"
            >
              <LucideIcon name="eye" :size="13" />
              Preview Interativo
            </button>
            <RouterLink
              :to="{ path: '/gates/G2', query: { alvo: storySelecionada.id } }"
              class="inline-flex items-center gap-1 text-xs text-nexo-muted hover:underline ml-2"
              @click="storyModalAberto = false"
            >
              Ir para Gate G2
            </RouterLink>
          </div>
          <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 text-xs" @click="storyModalAberto = false">
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
