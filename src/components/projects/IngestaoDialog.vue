<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ingerirWikiDados, sugerirTituloIngestao, type AnaliseIngestao } from '@/ai/ingestao'
import { useProjects } from '@/stores/useProjects'
import { useUsers } from '@/stores/useUsers'
import type { IngestaoDoc } from '@/types/nexo'
import { VButton, VTextInput, VTextarea, VCard, VFileUpload } from 'vueui-nova-kit'

const emit = defineEmits<{
  (e: 'concluido', payload: { projetoId: string; epicoId: string }): void
  (e: 'cancelar'): void
}>()

const projects = useProjects()
const users = useUsers()

const texto = ref('')
const wikiDados = ref('')
const arquivoNome = ref('')
const arquivosSelecionados = ref<File[]>([])
const erroArquivo = ref('')
const repoUrl = ref('')
const wikiUrl = ref('')
const titulo = ref('')
const problemaManual = ref('')
const objetivoManual = ref('')
const analise = ref<AnaliseIngestao | null>(null)
const conteudoAnalisado = ref('')
const etapa = ref<'entrada' | 'revisao'>('entrada')
const erros = ref<{ campo: string; codigo: string; mensagem: string }[]>([])
let fileReader: FileReader | null = null

const usuarioResponsavel = computed(() => {
  const u = users.state.usuarios.find((x) => x.id === users.state.currentUserId)
  return u ? `${u.nome} — ${u.papel}` : users.state.currentUserId
})
const conteudoAtual = computed(() => JSON.stringify([texto.value.trim(), wikiDados.value.trim()]))
const analiseAtual = computed(() => etapa.value === 'revisao' && conteudoAnalisado.value === conteudoAtual.value && analise.value !== null)
const contextoRevisado = computed(() => ({
  problema: problemaManual.value.trim() || analise.value?.problema || '',
  objetivo: objetivoManual.value.trim() || analise.value?.objetivo || '',
  publico: analise.value?.publico ?? [],
  restricoes: analise.value?.restricoes ?? [],
  riscos: analise.value?.riscos ?? [],
  bdd: analise.value?.bdd ?? []
}))

watch([texto, wikiDados], () => {
  if (etapa.value === 'revisao') etapa.value = 'entrada'
}, { flush: 'sync' })

function onArquivoSelecionado(files: File[]) {
  const file = files[0]
  if (!file) return
  fileReader?.abort()
  arquivosSelecionados.value = [file]
  arquivoNome.value = file.name
  erroArquivo.value = ''
  const reader = new FileReader()
  fileReader = reader
  reader.onload = () => {
    if (fileReader !== reader) return
    texto.value = typeof reader.result === 'string' ? reader.result : ''
    fileReader = null
    etapa.value = 'entrada'
  }
  reader.onerror = () => {
    if (fileReader !== reader) return
    fileReader = null
    erroArquivo.value = 'Não foi possível ler este arquivo. Tente um arquivo de texto.'
  }
  reader.readAsText(file)
}

function limparArquivo() {
  fileReader?.abort()
  fileReader = null
  arquivosSelecionados.value = []
  arquivoNome.value = ''
  erroArquivo.value = ''
  // O conteúdo importado permanece no resumo para não descartar texto sem aviso.
}

function analisar() {
  erros.value = []
  if (!texto.value.trim()) {
    erros.value.push({ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Informe um resumo do projeto existente antes de analisar (G0-004).' })
    return
  }

  const resultado = ingerirWikiDados(texto.value, wikiDados.value)
  analise.value = resultado
  if (!titulo.value.trim()) {
    titulo.value = sugerirTituloIngestao(resultado, texto.value)
  }
  if (!problemaManual.value.trim()) problemaManual.value = resultado.problema
  if (!objetivoManual.value.trim()) objetivoManual.value = resultado.objetivo
  conteudoAnalisado.value = conteudoAtual.value
  etapa.value = 'revisao'
}

function voltarParaEdicao() {
  erros.value = []
  etapa.value = 'entrada'
}

function criar() {
  erros.value = []
  if (!analiseAtual.value || !analise.value) {
    etapa.value = 'entrada'
    erros.value.push({ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Analise novamente o resumo antes de criar o projeto (G0-004).' })
    return
  }
  if (!titulo.value.trim()) {
    erros.value.push({ campo: 'titulo', codigo: 'G0-001', mensagem: 'Título é obrigatório (G0-001).' })
  }
  if (!texto.value.trim()) {
    erros.value.push({ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Resumo do projeto é obrigatório (G0-004).' })
  }
  if (erros.value.length > 0) return

  const fonte: IngestaoDoc['fonte'] = arquivoNome.value
    ? 'arquivo'
    : repoUrl.value.trim()
      ? 'repo'
      : wikiUrl.value.trim()
        ? 'wiki'
        : 'texto'
  const ingestao: IngestaoDoc = {
    fonte,
    texto: texto.value,
    projetoId: ''
  }
  if (arquivoNome.value) ingestao.arquivoNome = arquivoNome.value
  if (repoUrl.value.trim()) ingestao.repoUrl = repoUrl.value.trim()
  if (wikiUrl.value.trim()) ingestao.wikiUrl = wikiUrl.value.trim()

  const atorId = users.state.currentUserId
  const res = projects.criarProjetoExistente(
    {
      titulo: titulo.value.trim(),
      owner: atorId,
      ingestao,
      contextoParcial: {
        titulo: titulo.value.trim(),
        problema: contextoRevisado.value.problema,
        objetivo: contextoRevisado.value.objetivo,
        personas: contextoRevisado.value.publico,
        escopo_out: contextoRevisado.value.restricoes,
        riscos: contextoRevisado.value.riscos
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
  <VCard
    class="ingestao-card w-full min-w-0"
    variant="outlined"
    title="Projeto existente"
    description="Importe contexto, confira a prévia e crie o projeto quando estiver pronto."
  >
    <div class="ingestao-content min-w-0 space-y-4">
      <template v-if="etapa === 'entrada'">
        <div class="space-y-3">
          <VTextarea
            v-model="texto"
            label="Resumo do projeto existente (obrigatório)"
            helper-text="Descreva o problema, objetivo e contexto conhecido. Este resumo é necessário mesmo se adicionar URLs ou arquivo."
            :rows="5"
            auto-resize
            placeholder="Ex.: O time recebe pedidos por e-mail e perde o histórico das decisões..."
          />
          <VTextarea
            v-model="wikiDados"
            label="Conteúdo de apoio (opcional)"
            helper-text="Cole trechos de wiki ou documentação para complementar o resumo."
            :rows="3"
            auto-resize
            placeholder="Trechos relevantes de wiki, documentação ou dados de apoio..."
          />
        </div>

        <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="min-w-0">
            <VFileUpload
              v-model="arquivosSelecionados"
              label="Arquivo de texto (opcional)"
              button-label="Escolher arquivo"
              helper-text="O conteúdo do arquivo será carregado no resumo acima."
              variant="button"
              @change="onArquivoSelecionado"
            />
            <div v-if="arquivoNome" class="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs">
              <span class="max-w-full break-all rounded border border-nexo-border bg-white px-2 py-1 text-nexo-text">{{ arquivoNome }}</span>
              <VButton type="button" variant="ghost" size="sm" class="shrink-0" @click="limparArquivo()">Remover referência</VButton>
            </div>
            <p v-if="erroArquivo" class="mt-1 text-xs text-nexo-blocked" role="alert">{{ erroArquivo }}</p>
          </div>
          <p class="self-end rounded-btn border border-nexo-border bg-nexo-canvas px-3 py-2 text-xs text-nexo-muted">
            Responsável: usuário logado ({{ usuarioResponsavel }})
          </p>
        </div>

        <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <VTextInput v-model="repoUrl" type="url" label="URL do repositório (opcional)" placeholder="https://..." />
          <VTextInput v-model="wikiUrl" type="url" label="URL da wiki (opcional)" placeholder="https://..." />
        </div>
      </template>

      <template v-else>
        <section class="space-y-3 rounded-btn border border-nexo-border bg-nexo-canvas p-3" aria-labelledby="ingestao-review-title">
          <div>
            <h3 id="ingestao-review-title" class="text-sm font-semibold text-nexo-text">Revise os dados do novo projeto</h3>
            <p class="mt-1 text-xs text-nexo-muted">A extração abaixo usa regras locais determinísticas; não consulta um serviço de IA. Edite os campos antes de criar.</p>
          </div>
          <VTextInput v-model="titulo" label="Título do projeto" required />
          <VTextInput v-model="problemaManual" label="Problema (pode completar no Gate G0)" />
          <VTextInput v-model="objetivoManual" label="Objetivo (pode completar no Gate G0)" />

          <div class="space-y-2 border-t border-nexo-border pt-3 text-xs text-nexo-text">
            <p><strong>Público:</strong> {{ contextoRevisado.publico.length ? contextoRevisado.publico.join(', ') : 'não identificado no texto' }}</p>
            <p><strong>Restrições:</strong> {{ contextoRevisado.restricoes.length ? contextoRevisado.restricoes.join('; ') : 'não identificadas no texto' }}</p>
            <p><strong>Riscos:</strong> {{ contextoRevisado.riscos.length ? contextoRevisado.riscos.join('; ') : 'não identificados no texto' }}</p>
            <div>
              <strong>BDD:</strong>
              <span v-if="contextoRevisado.bdd.length === 0" class="ml-1 text-nexo-muted">nenhum critério foi identificado.</span>
              <ul v-else class="mt-1 list-inside list-disc space-y-1">
                <li v-for="(item, index) in contextoRevisado.bdd" :key="index">Dado {{ item.given }}, quando {{ item.when }}, então {{ item.then }}</li>
              </ul>
            </div>
          </div>
          <p class="rounded-badge bg-white px-2 py-1.5 text-xs text-nexo-muted">
            Fonte: {{ arquivoNome || repoUrl || wikiUrl || 'texto colado' }} · responsável: {{ usuarioResponsavel }}
          </p>
        </section>
      </template>

      <ul v-if="erros.length > 0" class="space-y-1 rounded-btn border border-nexo-blocked-border bg-nexo-blocked-bg p-3" aria-label="Erros de validação" role="alert">
        <li v-for="erro in erros" :key="erro.codigo + erro.campo" class="text-xs text-nexo-blocked">
          {{ erro.codigo }} — {{ erro.mensagem }}
        </li>
      </ul>

      <div class="flex min-w-0 flex-col gap-2 border-t border-nexo-border pt-3 sm:flex-row sm:justify-end">
        <VButton
          v-if="etapa === 'entrada'"
          type="button"
          variant="primary"
          class="w-full sm:order-2 sm:w-auto"
          @click="analisar()"
        >
          Analisar informações
        </VButton>
        <VButton
          v-else
          type="button"
          variant="primary"
          class="w-full sm:order-2 sm:w-auto"
          :disabled="!analiseAtual"
          @click="criar()"
        >
          Criar projeto existente
        </VButton>
        <VButton
          v-if="etapa === 'revisao'"
          type="button"
          variant="outline"
          class="w-full sm:order-1 sm:w-auto"
          @click="voltarParaEdicao()"
        >
          Editar informações
        </VButton>
        <VButton
          type="button"
          variant="ghost"
          class="w-full sm:order-3 sm:w-auto"
          @click="emit('cancelar')"
        >
          Cancelar
        </VButton>
      </div>
    </div>
  </VCard>
</template>

<style scoped>
.ingestao-content,
.ingestao-card {
  min-width: 0;
}

.ingestao-card :deep(.v-card__content) {
  min-width: 0;
}
</style>
