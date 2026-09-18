<script setup lang="ts">
import { computed, ref } from 'vue'
import { ingerirWikiDados, type AnaliseIngestao } from '@/ai/ingestao'
import { wizardCriacaoIterativo } from '@/ai/gateSkills'
import { useProjects } from '@/stores/useProjects'
import { useUsers } from '@/stores/useUsers'
import type { IngestaoDoc } from '@/types/nexo'

const emit = defineEmits<{
  (e: 'concluido', payload: { projetoId: string; epicoId: string }): void
  (e: 'cancelar'): void
}>()

const projects = useProjects()
const users = useUsers()

const texto = ref('')
const wikiDados = ref('')
const sugestaoIa = ref('')
const arquivoNome = ref('')
const repoUrl = ref('')
const wikiUrl = ref('')
// Item6 FIXGERAL-TELA: sem select owner — responsável sempre = usuário logado.
const usuarioResponsavel = computed(() => {
  const u = users.state.usuarios.find((x) => x.id === users.state.currentUserId)
  return u ? `${u.nome} — ${u.papel}` : users.state.currentUserId
})
const titulo = ref('')
const problemaManual = ref('')
const objetivoManual = ref('')

const analise = ref<AnaliseIngestao | null>(null)
const analisado = ref(false)
const erros = ref<{ campo: string; codigo: string; mensagem: string }[]>([])

function onArquivoSelecionado(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  arquivoNome.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    texto.value = typeof reader.result === 'string' ? reader.result : ''
    analisado.value = false
  }
  reader.readAsText(file)
}

function limparArquivo() {
  arquivoNome.value = ''
}

function analisar() {
  const a = ingerirWikiDados(texto.value, wikiDados.value)
  analise.value = a
  sugestaoIa.value = wizardCriacaoIterativo('', texto.value, wikiDados.value, null, 'G0').texto
  if (!titulo.value.trim()) {
    const base = (a.problema || a.objetivo || texto.value).trim().replace(/\s+/g, ' ')
    titulo.value = base.slice(0, 60)
  }
  if (!problemaManual.value.trim() && a.problema) problemaManual.value = a.problema
  if (!objetivoManual.value.trim() && a.objetivo) objetivoManual.value = a.objetivo
  analisado.value = true
}

function criar() {
  erros.value = []
  if (!titulo.value.trim()) {
    erros.value.push({ campo: 'titulo', codigo: 'G0-001', mensagem: 'Título é obrigatório (G0-001).' })
  }
  if (!texto.value.trim()) {
    erros.value.push({ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Infos principais são obrigatórias (G0-004).' })
  }
  if (erros.value.length > 0) return
  const fonte: IngestaoDoc['fonte'] = arquivoNome.value
    ? 'arquivo'
    : repoUrl.value.trim()
      ? 'repo'
      : wikiUrl.value.trim()
        ? 'wiki'
        : 'texto'
  const a = analise.value ?? ingerirWikiDados(texto.value, wikiDados.value)
  analise.value = a
  analisado.value = true
  const ingestao: IngestaoDoc = {
    fonte,
    texto: texto.value,
    projetoId: ''
  }
  if (arquivoNome.value) ingestao.arquivoNome = arquivoNome.value
  if (repoUrl.value.trim()) ingestao.repoUrl = repoUrl.value.trim()
  if (wikiUrl.value.trim()) ingestao.wikiUrl = wikiUrl.value.trim()
  // Item6 FIXGERAL-TELA: owner sempre = usuário logado (sem select owner).
  const atorId = users.state.currentUserId
  const res = projects.criarProjetoExistente(
    {
      titulo: titulo.value,
      owner: atorId,
      ingestao,
      contextoParcial: {
        titulo: titulo.value.trim(),
        problema: problemaManual.value.trim() || a.problema,
        objetivo: objetivoManual.value.trim() || a.objetivo,
        personas: a.publico,
        escopo_out: a.restricoes,
        riscos: a.riscos
      }
    },
    atorId
  )
  if (res.ok && res.projeto) {
    emit('concluido', { projetoId: res.projeto.id, epicoId: res.projeto.epicoId })
    return
  }
  erros.value = res.erros
}
</script>

<!-- Item A FIXTIPOS: bloco inline sem overlay fixed próprio (o overlay é o do HomeView) -->
<template>
  <div class="w-full rounded-card border border-nexo-border bg-white p-3">
      <h2 class="text-base font-bold text-nexo-text">Ingestão de projeto existente</h2>
      <p class="mt-1 text-xs text-nexo-muted">Cole texto livre, anexe arquivo ou informe repo/wiki. Analise antes de criar.</p>

      <label class="mt-3 block text-xs font-semibold text-nexo-text">Infos principais
        <textarea
          v-model="texto"
          rows="6"
          placeholder="Descreva o projeto existente: problema, objetivo, público, restrições, riscos..."
          class="mt-1 w-full rounded-btn border border-nexo-border bg-white px-2 py-1.5 text-sm text-nexo-text"
        />
      </label>

      <label class="mt-2 block text-xs font-semibold text-nexo-text">Wiki/dados
        <textarea
          v-model="wikiDados"
          rows="4"
          placeholder="Cole aqui conteúdo de wiki, repo ou dados de apoio..."
          class="mt-1 w-full rounded-btn border border-nexo-border bg-white px-2 py-1.5 text-sm text-nexo-text"
        />
      </label>

      <div v-if="sugestaoIa" class="mt-2 rounded-btn border border-nexo-border bg-white p-2">
        <p class="text-xs text-nexo-text">{{ sugestaoIa }}</p>
      </div>

      <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label class="block text-xs font-semibold text-nexo-text">Arquivo
          <input
            type="file"
            class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm text-nexo-text"
            @change="onArquivoSelecionado"
          />
          <span v-if="arquivoNome" class="mt-1 flex items-center gap-2 text-xs font-normal text-nexo-muted">
            <span class="rounded border border-nexo-border bg-white px-1.5 py-0.5 text-xs">{{ arquivoNome }}</span>
            <button type="button" class="text-xs text-nexo-muted underline" @click="limparArquivo()">remover</button>
          </span>
        </label>
        <!-- Item6 FIXGERAL-TELA: sem select owner — responsável sempre = usuário logado -->
        <p class="rounded-btn border border-nexo-border bg-nexo-canvas px-2 py-1.5 text-xs text-nexo-muted">Responsável: usuário logado ({{ usuarioResponsavel }})</p>
      </div>

      <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label class="block text-xs font-semibold text-nexo-text">Repo URL
          <input v-model="repoUrl" placeholder="https://..." class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm text-nexo-text" />
        </label>
        <label class="block text-xs font-semibold text-nexo-text">Wiki URL
          <input v-model="wikiUrl" placeholder="https://..." class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm text-nexo-text" />
        </label>
      </div>

      <fieldset class="mt-3 rounded-btn border border-nexo-border p-2">
        <legend class="px-1 text-xs font-semibold text-nexo-text">Contexto parcial</legend>
        <label class="block text-xs font-semibold text-nexo-text">Título
          <input v-model="titulo" placeholder="Nome do projeto existente" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm text-nexo-text" />
        </label>
        <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <label class="block text-xs font-semibold text-nexo-text">Problema (opcional)
            <input v-model="problemaManual" placeholder="Dor principal" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm text-nexo-text" />
          </label>
          <label class="block text-xs font-semibold text-nexo-text">Objetivo (opcional)
            <input v-model="objetivoManual" placeholder="Meta esperada" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm text-nexo-text" />
          </label>
        </div>
      </fieldset>

      <div v-if="analisado && analise" class="mt-3 rounded-btn border border-nexo-border bg-white p-2">
        <h3 class="text-xs font-bold text-nexo-text">Prévia da análise</h3>
        <p class="mt-1 text-xs text-nexo-text"><span class="font-semibold">Problema:</span> {{ analise.problema || '—' }}</p>
        <p class="mt-1 text-xs text-nexo-text"><span class="font-semibold">Objetivo:</span> {{ analise.objetivo || '—' }}</p>
        <div class="mt-1">
          <span class="text-xs font-semibold text-nexo-text">Público: </span>
          <span v-if="analise.publico.length === 0" class="text-xs text-nexo-muted">—</span>
          <span v-for="p in analise.publico" :key="p" class="mr-1 inline-block rounded border border-nexo-border bg-white px-1.5 py-0.5 text-xs text-nexo-text">{{ p }}</span>
        </div>
        <div class="mt-1">
          <span class="text-xs font-semibold text-nexo-text">Restrições: </span>
          <span v-if="analise.restricoes.length === 0" class="text-xs text-nexo-muted">—</span>
          <span v-for="r in analise.restricoes" :key="r" class="mr-1 inline-block rounded border border-nexo-border bg-white px-1.5 py-0.5 text-xs text-nexo-text">{{ r }}</span>
        </div>
        <div class="mt-1">
          <span class="text-xs font-semibold text-nexo-text">Riscos: </span>
          <span v-if="analise.riscos.length === 0" class="text-xs text-nexo-muted">—</span>
          <span v-for="r in analise.riscos" :key="r" class="mr-1 inline-block rounded border border-nexo-border bg-white px-1.5 py-0.5 text-xs text-nexo-text">{{ r }}</span>
        </div>
        <div class="mt-1">
          <span class="text-xs font-semibold text-nexo-text">BDD: </span>
          <span v-if="analise.bdd.length === 0" class="text-xs text-nexo-muted">—</span>
          <ul v-else class="mt-1 space-y-1">
            <li v-for="(b, i) in analise.bdd" :key="i" class="rounded border border-nexo-border bg-white px-1.5 py-1 text-xs text-nexo-text">
              Dado {{ b.given }}, quando {{ b.when }}, então {{ b.then }}
            </li>
          </ul>
        </div>
      </div>

      <ul v-if="erros.length > 0" class="mt-3 rounded-btn border border-red-300 bg-red-50 p-2" aria-label="Erros de validação">
        <li v-for="e in erros" :key="e.codigo + e.campo" class="text-xs text-red-700">
          {{ e.codigo }} — {{ e.mensagem }}
        </li>
      </ul>

      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="min-h-[32px] rounded-btn border border-nexo-border px-3 py-1.5 text-sm text-nexo-text"
          @click="analisar()"
        >
          Analisar e pré-preencher
        </button>
        <button
          type="button"
          class="min-h-[32px] flex-1 rounded-btn bg-nexo-primary px-3 py-1.5 text-sm font-semibold text-white"
          @click="criar()"
        >
          Criar projeto existente
        </button>
        <button
          type="button"
          class="min-h-[32px] rounded-btn border border-nexo-border px-3 py-1.5 text-sm text-nexo-text"
          @click="emit('cancelar')"
        >
          Cancelar
        </button>
      </div>
  </div>
</template>
