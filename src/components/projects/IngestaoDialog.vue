<script setup lang="ts">
import { ref } from 'vue'
import { analisarIngestao, type AnaliseIngestao } from '@/ai/ingestao'
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
const arquivoNome = ref('')
const repoUrl = ref('')
const wikiUrl = ref('')
const owner = ref(users.currentUser?.id ?? users.state.usuarios[0]?.id ?? '')
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
  analise.value = analisarIngestao(texto.value)
  analisado.value = true
}

function criar() {
  erros.value = []
  const fonte: IngestaoDoc['fonte'] = arquivoNome.value
    ? 'arquivo'
    : repoUrl.value.trim()
      ? 'repo'
      : wikiUrl.value.trim()
        ? 'wiki'
        : 'texto'
  const a = analise.value ?? analisarIngestao(texto.value)
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
  const atorId = users.currentUser?.id ?? owner.value
  const res = projects.criarProjetoExistente(
    {
      titulo: titulo.value,
      owner: owner.value,
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

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Ingestão de projeto existente"
    @click.self="emit('cancelar')"
  >
    <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white p-4 shadow-card">
      <h2 class="text-base font-bold text-slate-900">Ingestão de projeto existente</h2>
      <p class="mt-1 text-xs text-slate-600">Cole texto livre, anexe arquivo ou informe repo/wiki. Analise antes de criar.</p>

      <label class="mt-3 block text-xs font-semibold text-slate-700">Texto livre
        <textarea
          v-model="texto"
          rows="6"
          placeholder="Descreva o projeto existente: problema, objetivo, público, restrições, riscos..."
          class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </label>

      <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label class="block text-xs font-semibold text-slate-700">Arquivo
          <input
            type="file"
            class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            @change="onArquivoSelecionado"
          />
          <span v-if="arquivoNome" class="mt-1 flex items-center gap-2 text-xs font-normal text-slate-600">
            <span class="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs">{{ arquivoNome }}</span>
            <button type="button" class="text-xs text-slate-600 underline" @click="limparArquivo()">remover</button>
          </span>
        </label>
        <label class="block text-xs font-semibold text-slate-700">Quem é o usuário (owner)
          <select v-model="owner" class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900">
            <option value="" disabled>Selecione</option>
            <option v-for="u in users.state.usuarios" :key="u.id" :value="u.id">
              {{ u.nome }} ({{ u.papel }})
            </option>
          </select>
        </label>
      </div>

      <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label class="block text-xs font-semibold text-slate-700">Repo URL
          <input v-model="repoUrl" placeholder="https://..." class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">Wiki URL
          <input v-model="wikiUrl" placeholder="https://..." class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
        </label>
      </div>

      <fieldset class="mt-3 rounded-btn border border-slate-300 p-2">
        <legend class="px-1 text-xs font-semibold text-slate-700">Contexto parcial</legend>
        <label class="block text-xs font-semibold text-slate-700">Título
          <input v-model="titulo" placeholder="Nome do projeto existente" class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
        </label>
        <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <label class="block text-xs font-semibold text-slate-700">Problema (opcional)
            <input v-model="problemaManual" placeholder="Dor principal" class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
          </label>
          <label class="block text-xs font-semibold text-slate-700">Objetivo (opcional)
            <input v-model="objetivoManual" placeholder="Meta esperada" class="mt-1 w-full rounded-btn border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
          </label>
        </div>
      </fieldset>

      <div v-if="analisado && analise" class="mt-3 rounded-btn border border-slate-300 bg-slate-50 p-2">
        <h3 class="text-xs font-bold text-slate-800">Prévia da análise</h3>
        <p class="mt-1 text-xs text-slate-700"><span class="font-semibold">Problema:</span> {{ analise.problema || '—' }}</p>
        <p class="mt-1 text-xs text-slate-700"><span class="font-semibold">Objetivo:</span> {{ analise.objetivo || '—' }}</p>
        <div class="mt-1">
          <span class="text-xs font-semibold text-slate-700">Público: </span>
          <span v-if="analise.publico.length === 0" class="text-xs text-slate-500">—</span>
          <span v-for="p in analise.publico" :key="p" class="mr-1 inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700">{{ p }}</span>
        </div>
        <div class="mt-1">
          <span class="text-xs font-semibold text-slate-700">Restrições: </span>
          <span v-if="analise.restricoes.length === 0" class="text-xs text-slate-500">—</span>
          <span v-for="r in analise.restricoes" :key="r" class="mr-1 inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700">{{ r }}</span>
        </div>
        <div class="mt-1">
          <span class="text-xs font-semibold text-slate-700">Riscos: </span>
          <span v-if="analise.riscos.length === 0" class="text-xs text-slate-500">—</span>
          <span v-for="r in analise.riscos" :key="r" class="mr-1 inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700">{{ r }}</span>
        </div>
        <div class="mt-1">
          <span class="text-xs font-semibold text-slate-700">BDD: </span>
          <span v-if="analise.bdd.length === 0" class="text-xs text-slate-500">—</span>
          <ul v-else class="mt-1 space-y-1">
            <li v-for="(b, i) in analise.bdd" :key="i" class="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700">
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
          class="min-h-[32px] rounded-btn border border-slate-300 px-3 py-1.5 text-sm text-slate-800"
          @click="analisar()"
        >
          Analisar
        </button>
        <button
          type="button"
          class="min-h-[32px] flex-1 rounded-btn bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
          @click="criar()"
        >
          Criar projeto existente
        </button>
        <button
          type="button"
          class="min-h-[32px] rounded-btn border border-slate-300 px-3 py-1.5 text-sm text-slate-800"
          @click="emit('cancelar')"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>
