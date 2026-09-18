<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjects } from '@/stores/useProjects'
import { useGraph } from '@/stores/useGraph'
import { useGate } from '@/stores/useGate'
import { useUsers } from '@/stores/useUsers'
import type { Classificacao } from '@/types/nexo'
import IngestaoDialog from '@/components/projects/IngestaoDialog.vue'

const projects = useProjects()
const graph = useGraph()
const gates = useGate()
const users = useUsers()
const router = useRouter()

const dialogAberto = ref(false)
const titulo = ref('')
const contexto = ref('')
const publico = ref('')
const objetivo = ref('')
const metrica = ref('')
const restricoesTxt = ref('')
const naoObjetivosTxt = ref('')
const owner = ref('u-pm')
const classificacao = ref<Classificacao>('internal')
const erros = ref<{ campo: string; codigo: string; mensagem: string }[]>([])
const avisoG0002 = ref('')
// W1 TIPOS-TELA
const tipoProjeto = ref<'novo' | 'existente'>('novo')

function contagem(pid: string): { nos: number; arestas: number } {
  try {
    const raw = localStorage.getItem(`nexo.v1.graph.${pid}`)
    if (!raw) return { nos: 0, arestas: 0 }
    const g = JSON.parse(raw) as { nos: unknown[]; arestas: unknown[] }
    return { nos: g.nos.length, arestas: g.arestas.length }
  } catch {
    return { nos: 0, arestas: 0 }
  }
}

function resumoGates(pid: string): string {
  try {
    const raw = localStorage.getItem(`nexo.v1.gates.${pid}`)
    if (!raw) return 'gates —'
    const gs = JSON.parse(raw) as { id: string; status: string }[]
    const ap = gs.filter((g) => g.status === 'aprovado').map((g) => g.id)
    const rev = gs.find((g) => g.status === 'revisao')
    return `${ap.length > 0 ? ap.join(',') + ' aprovado' : 'nada aprovado'}${rev ? ` · ${rev.id} em revisão` : ''}`
  } catch {
    return 'gates —'
  }
}

function abrirProjeto(id: string) {
  projects.selecionar(id, users.state.currentUserId)
  graph.trocarProjeto(id)
  gates.trocarProjeto(id)
  router.push('/backlog')
}

function abrirCanvasProjeto(id: string) {
  projects.selecionar(id, users.state.currentUserId)
  graph.trocarProjeto(id)
  gates.trocarProjeto(id)
  const sel = graph.state.nos.find((n) => n.tipo === 'epico')?.id ?? graph.state.selecionadoId
  router.push(`/canvas?view=canvas${sel ? `&selecionado=${sel}` : ''}`)
}

function abrirDialog() {
  tipoProjeto.value = 'novo'
  dialogAberto.value = true
  erros.value = []
  avisoG0002.value = ''
}

// LIGA-TIPOS: recebe payload { projetoId, epicoId } do IngestaoDialog, conclui
// via MOTOR (concluirIngestaoExistente), troca namespaces e navega à rotaGate.
function aoIngestaoConcluido(payload: { projetoId: string; epicoId: string }) {
  const r = projects.concluirIngestaoExistente(payload, users.state.currentUserId)
  if (!r.ok || !r.projetoId || !r.rotaGate) {
    erros.value = r.erros
    return
  }
  graph.trocarProjeto(r.projetoId)
  gates.trocarProjeto(r.projetoId)
  dialogAberto.value = false
  tipoProjeto.value = 'novo'
  router.push(r.rotaGate)
}

function aoIngestaoCancelar() {
  dialogAberto.value = false
  tipoProjeto.value = 'novo'
}

function criar() {
  const r = projects.criarProjeto(
    {
      titulo: titulo.value.trim(),
      contexto: contexto.value,
      publico: publico.value,
      objetivo: objetivo.value,
      metricaNome: metrica.value,
      restricoes: restricoesTxt.value.split('\n').map((s) => s.trim()).filter(Boolean),
      naoObjetivos: naoObjetivosTxt.value.split('\n').map((s) => s.trim()).filter(Boolean),
      owner: owner.value,
      classificacao: classificacao.value
    },
    users.state.currentUserId
  )
  erros.value = r.erros.filter((e) => e.codigo !== 'G0-002')
  avisoG0002.value = r.erros.find((e) => e.codigo === 'G0-002')?.mensagem ?? ''
  if (!r.ok || !r.projeto) return
  graph.trocarProjeto(r.projeto.id)
  gates.trocarProjeto(r.projeto.id)
  dialogAberto.value = false
  titulo.value = contexto.value = publico.value = objetivo.value = metrica.value = ''
  restricoesTxt.value = naoObjetivosTxt.value = ''
  router.push('/backlog')
}

const temProjetos = computed(() => projects.state.projetos.length > 0)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold">Projetos</h1>
      <button type="button" class="ml-auto rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white" @click="abrirDialog()">Novo projeto</button>
    </div>

    <div v-if="!temProjetos" class="rounded-card border border-nexo-border bg-white p-8 text-center">
      <p class="font-semibold">Nenhum projeto ainda.</p>
      <p class="mt-1 text-sm text-nexo-muted">Crie o primeiro projeto respondendo ao enquadramento G0.</p>
      <button type="button" class="mt-4 rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white" @click="abrirDialog()">Criar primeiro projeto</button>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <article
        v-for="p in projects.state.projetos"
        :key="p.id"
        class="rounded-card border bg-white p-4 shadow-card"
        :class="p.id === projects.state.atualId ? 'border-nexo-primary' : 'border-nexo-border'"
      >
        <h2 class="font-bold">{{ p.titulo }}</h2>
        <p class="mt-1 text-sm text-nexo-muted">{{ p.descricao || 'Sem descrição' }}</p>
        <p class="mt-2 text-xs text-nexo-muted">
          Épico: {{ p.epicoTitulo }} · {{ contagem(p.id).nos }} nós · {{ contagem(p.id).arestas }} arestas ·
          {{ resumoGates(p.id) }} · owner {{ p.owner }}
        </p>
        <div class="mt-3 flex gap-2">
          <button type="button" class="rounded-btn bg-nexo-primary px-3 py-1.5 text-sm font-semibold text-white" @click="abrirProjeto(p.id)">
            {{ p.id === projects.state.atualId ? 'Ver backlog' : 'Abrir projeto' }}
          </button>
          <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 text-sm" @click="abrirCanvasProjeto(p.id)">Abrir Canvas</button>
        </div>
      </article>
    </div>

    <div v-if="dialogAberto" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-label="Novo projeto (G0)" @click.self="dialogAberto = false">
      <div class="max-h-full w-full max-w-xl overflow-auto rounded-card bg-white p-4 shadow-card">
        <h2 class="font-bold">Novo projeto — Enquadramento G0</h2>
        <div role="radiogroup" aria-label="Tipo de projeto" class="mt-3 flex gap-2">
          <button
            type="button"
            role="radio"
            :aria-checked="tipoProjeto === 'novo'"
            class="min-h-[32px] flex-1 rounded-btn border px-3 py-1.5 text-sm"
            :class="tipoProjeto === 'novo' ? 'border-nexo-primary bg-nexo-primary-soft font-semibold' : 'border-nexo-border'"
            @click="tipoProjeto = 'novo'"
          >Novo</button>
          <button
            type="button"
            role="radio"
            :aria-checked="tipoProjeto === 'existente'"
            class="min-h-[32px] flex-1 rounded-btn border px-3 py-1.5 text-sm"
            :class="tipoProjeto === 'existente' ? 'border-nexo-primary bg-nexo-primary-soft font-semibold' : 'border-nexo-border'"
            @click="tipoProjeto = 'existente'"
          >Existente</button>
        </div>
        <form v-if="tipoProjeto === 'novo'" @submit.prevent="criar">
        <div class="mt-3 space-y-2 text-sm">
          <label class="block">Título<input v-model="titulo" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <label class="block">Contexto / dor observável (mín. 30 caracteres)<textarea v-model="contexto" rows="2" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <label class="block">Público afetado<input v-model="publico" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <label class="block">Objetivo<input v-model="objetivo" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <label class="block">Métrica inicial (nome)<input v-model="metrica" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <label class="block">Restrições (uma por linha)<textarea v-model="restricoesTxt" rows="2" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <label class="block">Não-objetivos (um por linha)<textarea v-model="naoObjetivosTxt" rows="2" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" /></label>
          <div class="flex gap-2">
            <label class="flex-1">Owner
              <select v-model="owner" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5">
                <option v-for="u in users.state.usuarios" :key="u.id" :value="u.id">{{ u.nome }} — {{ u.papel }}</option>
              </select>
            </label>
            <label>Classificação
              <select v-model="classificacao" class="mt-1 rounded-btn border border-nexo-border px-2 py-1.5">
                <option value="internal">internal</option>
                <option value="confidential">confidential</option>
                <option value="restricted">restricted</option>
              </select>
            </label>
          </div>
        </div>
        <ul v-if="erros.length > 0" class="mt-2 space-y-1 text-xs">
          <li v-for="e in erros" :key="e.codigo + e.campo" class="rounded-badge bg-nexo-blocked-bg px-2 py-1 text-nexo-blocked">{{ e.codigo }} — {{ e.mensagem }}</li>
        </ul>
        <p v-if="avisoG0002" class="mt-2 rounded-badge bg-nexo-stale-bg px-2 py-1 text-xs text-nexo-stale">{{ avisoG0002 }}</p>
        <div class="mt-3 flex gap-2">
          <button type="submit" class="flex-1 rounded-btn bg-nexo-primary px-3 py-2 font-semibold text-white">Criar projeto</button>
          <button type="button" class="rounded-btn border border-nexo-border px-3 py-2" @click="dialogAberto = false">Cancelar</button>
        </div>
        </form>
        <div v-else class="mt-3">
          <IngestaoDialog @concluido="aoIngestaoConcluido" @cancelar="aoIngestaoCancelar" />
        </div>
      </div>
    </div>
  </div>
</template>
