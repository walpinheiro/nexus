<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { avaliarGate } from '@/utils/gates'
import GateChecklist from '@/components/backlog/GateChecklist.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'

const graph = useGraph()
const users = useUsers()
const router = useRouter()
const filtro = ref('')
const filtroEstado = ref('')
const checklistRef = ref<{ definirAlvo: (id: string) => void } | null>(null)
const checklistAlvo = ref('')

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
          <th></th>
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
          <td><button type="button" class="text-nexo-primary underline" @click="abrirNoCanvas(n.id)">Abrir Canvas</button></td>
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
  </div>
</template>
