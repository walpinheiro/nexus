<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { GateId, NexoObject, PatchMudanca } from '@/types/nexo'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { useGate } from '@/stores/useGate'
import LucideIcon from '@/components/common/LucideIcon.vue'
import {
  diagnosticarFaltasGate,
  obterGovernancaGate,
  processarMensagemGate,
  gerarPropostaPatch,
  DICIONARIO_PERGUNTAS,
  type FaltaGate
} from '@/ai/gateSkills'
import { getConfig, saude, type OllamaMessage } from '@/ai/ollamaClient'
import { executarSkill, extrairRespostasDoTexto, ordenarFaltasPorPapel } from '@/ai/skillRunner'

interface Props {
  gateId: GateId
  alvoId: string
  alvo: NexoObject | null
  bloqueado: boolean
  motivoBloqueio: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'fechar'): void
  (e: 'corrigir-no-objeto', id: string): void
}>()

const graph = useGraph()
const users = useUsers()
const gates = useGate()

// Abas da sessão (chat-first como solicitado: chat padrão, faltas e governanca)
const tabAtiva = ref<'chat' | 'faltas' | 'governanca'>('chat')
const inputMensagem = ref('')
const historicoChat = ref<{ id: string; autor: 'usuario' | 'ia'; texto: string; timestamp: string }[]>([])
const patchPendente = ref<{
  alvoId: string
  justificativa: string
  mudancas: PatchMudanca[]
} | null>(null)

// Estado do motor Ollama / Fallback Local (default Ollama queen; toggle local só se já existir)
const usarOllama = ref(true)
const ollamaStatus = ref<'online' | 'offline'>('offline')
const ollamaModel = ref('queen')

// Streaming / Output ao vivo
const gerandoOutputAoVivo = ref(false)
const outputAoVivoTexto = ref('')

async function checarOllama() {
  try {
    const res = await saude(1500)
    ollamaStatus.value = res.ok ? 'online' : 'offline'
    const cfg = getConfig()
    ollamaModel.value = cfg.model || 'queen'
  } catch {
    ollamaStatus.value = 'offline'
  }
}

onMounted(() => {
  checarOllama()
})

// Diagnóstico de conformidade reativo em tempo real
const diagnostico = computed(() => {
  if (!props.alvo) return null
  return diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers)
})

// Pergunta ativa conduzida pela IA: UMA por vez do dicionário da skill do gate
const perguntaAtual = computed<FaltaGate | null>(() => {
  if (!diagnostico.value || diagnostico.value.faltas.length === 0) return null
  return diagnostico.value.faltas[0]
})


// Helper para formatar valores no painel Preenchido (somente-leitura)
function obterValorPreenchido(campo: string, objeto: NexoObject | null): string {
  if (!objeto) return ''
  const val = (objeto as unknown as Record<string, unknown>)[campo]
  if (val === undefined || val === null || val === '') return ''
  if (Array.isArray(val)) {
    if (val.length === 0) return ''
    if (typeof val[0] === 'string') return val.join(', ')
    return JSON.stringify(val, null, 2)
  }
  if (typeof val === 'object') {
    return JSON.stringify(val, null, 2)
  }
  return String(val)
}

// Lista de itens preenchidos para o painel Somente-Leitura
const itensPreenchidos = computed(() => {
  if (!props.alvo || !diagnostico.value) return []
  const preenchidos: { codigo: string; campoAlvo: string; valor: string }[] = []
  diagnostico.value.checks
    .filter((c) => c.ok)
    .forEach((c) => {
      const dic = DICIONARIO_PERGUNTAS[c.codigo]
      const campo = dic?.campoAlvo ?? 'descricao'
      const valor = obterValorPreenchido(campo, props.alvo)
      if (valor) {
        preenchidos.push({
          codigo: c.codigo,
          campoAlvo: campo,
          valor
        })
      }
    })
  return preenchidos
})

// Governança, papéis e travas
const governanca = computed(() => {
  return obterGovernancaGate(props.gateId, users.currentUser, props.alvo, gates.gates)
})

// Inicializa ou atualiza o chat conduzido pela IA ao trocar de objeto ou gate
watch(
  [() => props.alvoId, () => props.gateId],
  ([novoId]) => {
    patchPendente.value = null
    if (!novoId || !props.alvo) {
      const textoBoasVindas =
        props.gateId === 'G5'
          ? 'Bem-vindo à Sessão de IA do Gate G5 (Definition of Done). Nenhum pacote de entrega está selecionado no momento. Promova um entregável para status "validated" no Canvas ou vincule-o ao Gate G5 para diagnosticar os critérios de DoD.'
          : `Bem-vindo à Sessão de IA do Gate ${props.gateId}. Selecione um objeto para iniciarmos a interação.`

      historicoChat.value = [
        {
          id: 'init-empty',
          autor: 'ia',
          texto: textoBoasVindas,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
      return
    }

    const diag = diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers)

    let msgInicial = `Olá! Sou a IA de apoio para o **Gate ${props.gateId}**.\n`
    msgInicial += `Analisando o objeto **"${props.alvo.titulo}"** (seu papel atual: **${users.currentUser?.papel || 'Colaborador'}**):\n\n`

    if (diag.aprovado) {
      msgInicial += `🎉 Todos os critérios de qualidade estão 100% preenchidos! O objeto está apto para aprovação formal de baseline.`
    } else {
      const faltas = ordenarFaltasPorPapel(diag.faltas, props.gateId, users.currentUser?.papel)
      const primeira = faltas[0]
      msgInicial += `Identifiquei **${diag.faltas.length} critério(s) pendente(s)**.\n`
      msgInicial += `Vamos preenchê-los por conversa, uma pergunta por vez:\n\n`
      msgInicial += `👉 **[${primeira.codigo}] ${primeira.pergunta}**\n\n`
      msgInicial += `*Exemplo de resposta:* "${primeira.exemplo}"`
    }

    historicoChat.value = [
      {
        id: `init-${novoId}-${props.gateId}`,
        autor: 'ia',
        texto: msgInicial,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  },
  { immediate: true }
)

// Envio de mensagem e extração conversacional
async function enviarMensagem(textoCustom?: string) {
  const txt = (textoCustom ?? inputMensagem.value).trim()
  if (!txt || !props.alvo) return

  const agora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  historicoChat.value.push({
    id: `u-${Date.now()}`,
    autor: 'usuario',
    texto: txt,
    timestamp: agora
  })

  if (!textoCustom) {
    inputMensagem.value = ''
  }

  gerandoOutputAoVivo.value = true
  outputAoVivoTexto.value = 'Processando sua resposta...'

  try {
    const falta = perguntaAtual.value

    if (falta) {
      const codigo = falta.codigo

      if (usarOllama.value && ollamaStatus.value === 'online') {
        outputAoVivoTexto.value = `Consultando Ollama (${ollamaModel.value}) para [${codigo}]...`
        const historico: OllamaMessage[] = [
          ...historicoChat.value.map((h) => ({
            role: (h.autor === 'usuario' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: h.texto
          }))
        ]
        const res = await executarSkill(props.gateId, props.alvo, historico, users.currentUser?.papel)
        if (res.patchProposto) {
          patchPendente.value = {
            alvoId: props.alvo.id,
            justificativa: res.patchProposto.justificativa,
            mudancas: res.patchProposto.mudancas
          }
          historicoChat.value.push({
            id: `ia-${Date.now()}`,
            autor: 'ia',
            texto: `Anotado para **[${codigo}]** (${falta.campoAlvo}) via Ollama.\n\n${res.patchProposto.justificativa}\n\nGerei a proposta formal de patch abaixo. Revise e aceite para aplicarmos ao objeto.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })
          return
        }
      }

      // Motor local conversacional
      const extraidos = extrairRespostasDoTexto(txt, [falta])
      const valor = extraidos[codigo] || txt
      const prop = gerarPropostaPatch(props.alvo, codigo, valor)

      if (prop) {
        patchPendente.value = {
          alvoId: props.alvo.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        }
        historicoChat.value.push({
          id: `ia-${Date.now()}`,
          autor: 'ia',
          texto: `Entendido! Anotei para **[${codigo}]** (${falta.campoAlvo}):\n> "${valor}"\n\nGerei a proposta formal de patch abaixo com as alterações correspondentes. Revise e clique em **Aceitar** para prosseguirmos para a próxima pergunta.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      } else {
        const resp = processarMensagemGate(txt, {
          objeto: props.alvo,
          gateId: props.gateId,
          user: users.currentUser,
          gates: gates.gates,
          waivers: graph.waivers
        })
        historicoChat.value.push({
          id: `ia-${Date.now()}`,
          autor: 'ia',
          texto: resp.texto,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      }
    } else {
      // Sem faltas pendentes — chat livre com o copilot
      const resp = processarMensagemGate(txt, {
        objeto: props.alvo,
        gateId: props.gateId,
        user: users.currentUser,
        gates: gates.gates,
        waivers: graph.waivers
      })
      historicoChat.value.push({
        id: `ia-${Date.now()}`,
        autor: 'ia',
        texto: resp.texto,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
      if (resp.propostaPatch) {
        patchPendente.value = resp.propostaPatch
      }
    }
  } catch (err) {
    historicoChat.value.push({
      id: `err-${Date.now()}`,
      autor: 'ia',
      texto: `Erro ao processar mensagem: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  } finally {
    gerandoOutputAoVivo.value = false
    outputAoVivoTexto.value = ''
  }
}

// Aceitar Proposta de Patch formal gerada pela IA e avançar para a próxima pergunta
function aceitarPatch() {
  if (!patchPendente.value || !props.alvo) return
  const autorId = users.currentUser?.id ?? 'u-anonimo'
  const prop = graph.proporPatch(
    patchPendente.value.alvoId,
    patchPendente.value.mudancas,
    patchPendente.value.justificativa,
    autorId
  )

  if (prop) {
    graph.aceitarPatch(prop.patch_id, autorId)
    patchPendente.value = null

    // Recalcula o diagnóstico e avança a IA para a próxima pergunta
    const novoDiag = diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers)
    if (novoDiag.faltas.length > 0) {
      const faltas = ordenarFaltasPorPapel(novoDiag.faltas, props.gateId, users.currentUser?.papel)
      const prox = faltas[0]
      historicoChat.value.push({
        id: `sys-${Date.now()}`,
        autor: 'ia',
        texto: `✅ **Patch aceito!** O objeto foi atualizado para **v${props.alvo.versao}**.\n\nPróxima pergunta da IA do Gate:\n👉 **[${prox.codigo}] ${prox.pergunta}**\n\n*Exemplo sugerido:* "${prox.exemplo}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    } else {
      historicoChat.value.push({
        id: `sys-${Date.now()}`,
        autor: 'ia',
        texto: `🎉 **Todos os critérios da IA do Gate ${props.gateId} foram preenchidos com sucesso!**\nO objeto está 100% em conformidade e pronto para solicitar aprovação formal.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    }
  }
}

// Rejeitar Proposta de Patch
function rejeitarPatch() {
  patchPendente.value = null
  historicoChat.value.push({
    id: `sys-${Date.now()}`,
    autor: 'ia',
    texto: `[Patch Rejeitado] Nenhuma alteração foi realizada. Você pode formular uma nova resposta no chat.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}
</script>

<template>
  <aside
    class="flex h-full flex-col rounded-card border border-nexo-border bg-nexo-surface shadow-sm"
    role="region"
    aria-label="Sessão de IA do Gate"
  >
    <!-- Header do Painel: Skill Ativa (nome + papéis) + Badge Ollama (queen) + Toggle Local/Ollama -->
    <header class="flex shrink-0 flex-col gap-2 border-b border-nexo-border px-4 py-3 bg-nexo-canvas/40">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-btn bg-nexo-primary/10 text-nexo-primary">
            <LucideIcon name="sparkles" :size="16" />
          </span>
          <div>
            <h2 class="text-sm font-bold text-nexo-text">Sessão IA · Gate {{ props.gateId }}</h2>
            <p class="text-[11px] text-nexo-muted font-medium">
              {{ users.currentUser?.nome || 'Usuário' }} ({{ users.currentUser?.papel || 'Colaborador' }})
            </p>
          </div>
        </div>

        <button
          type="button"
          class="rounded-btn p-1.5 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text focus:outline-none"
          aria-label="Fechar painel de IA"
          @click="emit('fechar')"
        >
          <LucideIcon name="x" :size="16" />
        </button>
      </div>

      <!-- Barra de Status do Motor: Badge Ollama online/offline queen + Toggle Local/Ollama -->
      <div class="flex items-center justify-between rounded border border-nexo-border/80 bg-white px-2.5 py-1.5 text-[11px]">
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-2 w-2 rounded-full"
            :class="ollamaStatus === 'online' ? 'bg-green-500' : 'bg-nexo-muted'"
          />
          <span class="font-semibold text-nexo-text">Ollama:</span>
          <span class="font-mono text-[10px]" :class="ollamaStatus === 'online' ? 'text-green-700 font-bold' : 'text-nexo-muted'">
            {{ ollamaModel }} ({{ ollamaStatus }})
          </span>
        </div>

        <button
          type="button"
          class="flex items-center gap-1 font-semibold focus:outline-none transition-colors"
          :class="usarOllama ? 'text-nexo-primary' : 'text-nexo-muted hover:text-nexo-text'"
          :title="usarOllama ? 'Usando modelo Ollama local (queen)' : 'Usando motor determinístico local'"
          @click="usarOllama = !usarOllama"
        >
          <LucideIcon :name="usarOllama ? 'toggle-right' : 'toggle-left'" :size="16" />
          <span>{{ usarOllama ? 'Ollama Ativo' : 'Regras Locais' }}</span>
        </button>
      </div>
    </header>

    <!-- Navegação de Abas: Faltas | Chat | Governança (Chat-First) -->
    <nav class="flex shrink-0 border-b border-nexo-border bg-nexo-surface text-xs font-medium" aria-label="Abas da Sessão IA">
      <!-- Aba Faltas (Painéis Somente-Leitura) -->
      <button
        type="button"
        class="flex-1 py-2 text-center transition-colors"
        :class="tabAtiva === 'faltas' ? 'border-b-2 border-nexo-primary font-semibold text-nexo-primary' : 'text-nexo-muted hover:text-nexo-text'"
        @click="tabAtiva = 'faltas'"
      >
        O que falta
        <span
          v-if="diagnostico && diagnostico.faltas.length > 0"
          class="ml-1 rounded-full bg-nexo-blocked/10 px-1.5 py-0.2 text-[10px] font-bold text-nexo-blocked"
        >
          {{ diagnostico.faltas.length }}
        </span>
      </button>

      <!-- Aba Chat (Padrão / Chat-First) -->
      <button
        type="button"
        class="flex-1 py-2 text-center transition-colors"
        :class="tabAtiva === 'chat' ? 'border-b-2 border-nexo-primary font-semibold text-nexo-primary' : 'text-nexo-muted hover:text-nexo-text'"
        @click="tabAtiva = 'chat'"
      >
        Chat Interativo
        <span
          v-if="patchPendente"
          class="ml-1 rounded-full bg-nexo-primary px-1.5 py-0.2 text-[10px] font-bold text-white animate-pulse"
        >
          Patch
        </span>
      </button>

      <!-- Aba Governança -->
      <button
        type="button"
        class="flex-1 py-2 text-center transition-colors"
        :class="tabAtiva === 'governanca' ? 'border-b-2 border-nexo-primary font-semibold text-nexo-primary' : 'text-nexo-muted hover:text-nexo-text'"
        @click="tabAtiva = 'governanca'"
      >
        Governança
        <span
          v-if="!governanca.aptoParaAprovacao"
          class="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500"
          title="Atenção à governança"
        />
      </button>
    </nav>

    <!-- Conteúdo das Abas -->
    <div class="flex-1 overflow-y-auto p-4 text-xs">
      <!-- 1. TAB: CHAT INTERATIVO (CONDUÇÃO DA IA UMA PERGUNTA POR VEZ) -->
      <div v-if="tabAtiva === 'chat'" class="flex h-full flex-col space-y-3">
        <!-- Card Foco da Pergunta Atual (se houver critério pendente) -->
        <div
          v-if="perguntaAtual"
          class="rounded-card border border-nexo-primary/30 bg-nexo-primary/5 p-2.5 space-y-1 shrink-0"
        >
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-nexo-primary flex items-center gap-1">
              <LucideIcon name="help-circle" :size="13" />
              Pergunta Atual da IA do Gate (1 por vez)
            </span>
            <span class="rounded bg-nexo-primary/10 text-nexo-primary px-1.5 py-0.2 font-mono text-[9px] font-bold">
              {{ perguntaAtual.codigo }}
            </span>
          </div>
          <p class="text-xs font-semibold text-nexo-text leading-snug">
            {{ perguntaAtual.pergunta }}
          </p>
          <p class="text-[10px] text-nexo-muted italic truncate" :title="perguntaAtual.exemplo">
            Exemplo: {{ perguntaAtual.exemplo }}
          </p>
        </div>

        <!-- Histórico do Chat -->
        <div class="flex-1 space-y-3 overflow-y-auto pr-1">
          <div
            v-for="msg in historicoChat"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.autor === 'usuario' ? 'items-end' : 'items-start'"
          >
            <div
              class="max-w-[85%] rounded-card p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-xs"
              :class="msg.autor === 'usuario'
                ? 'bg-nexo-primary text-white rounded-br-none'
                : 'bg-white border border-nexo-border/80 text-nexo-text rounded-bl-none'"
            >
              <div v-if="msg.autor === 'ia'" class="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-nexo-primary">
                <LucideIcon name="sparkles" :size="11" />
                <span>IA Assistente</span>
                <span class="text-nexo-muted font-normal ml-auto">{{ msg.timestamp }}</span>
              </div>
              <div v-else class="text-[10px] text-white/80 font-medium mb-0.5 text-right">
                Você · {{ msg.timestamp }}
              </div>
              <div>{{ msg.texto }}</div>
            </div>
          </div>

          <!-- Indicador de streaming/geração ao vivo -->
          <div v-if="gerandoOutputAoVivo" class="flex items-center gap-2 text-nexo-primary text-xs font-medium animate-pulse">
            <LucideIcon name="activity" :size="14" />
            <span>{{ outputAoVivoTexto }}</span>
          </div>

          <!-- Card de Proposta Formal de Patch (Diff) -->
          <div
            v-if="patchPendente"
            class="rounded-card border-2 border-nexo-primary bg-nexo-primary-soft/40 p-3 shadow-sm"
          >
            <div class="flex items-center gap-1.5 font-bold text-nexo-primary text-xs">
              <LucideIcon name="file-diff" :size="14" />
              <span>Proposta Formal de Patch (Diff)</span>
            </div>
            <p class="mt-1 text-[11px] text-nexo-muted">{{ patchPendente.justificativa }}</p>

            <div class="mt-2 space-y-1.5 rounded border border-nexo-border/80 bg-white p-2">
              <div
                v-for="(m, i) in patchPendente.mudancas"
                :key="i"
                class="border-b border-nexo-border/40 pb-1.5 last:border-none last:pb-0 font-mono text-[11px]"
              >
                <div class="font-bold text-nexo-text">Campo: {{ m.campo }}</div>
                <div class="text-red-700 line-through truncate max-h-12 overflow-hidden text-[10px]">- {{ m.de || '(vazio)' }}</div>
                <div class="text-green-700 whitespace-pre-wrap max-h-24 overflow-y-auto text-[10px]">+ {{ m.para }}</div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-btn border border-nexo-border px-3 py-1 text-xs font-semibold hover:bg-nexo-canvas"
                @click="rejeitarPatch()"
              >
                Rejeitar
              </button>
              <button
                type="button"
                class="rounded-btn bg-nexo-primary px-3 py-1 text-xs font-semibold text-white hover:bg-nexo-primary/90"
                @click="aceitarPatch()"
              >
                Aceitar (nova versão)
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Chips (Atalhos de Fala da Conversa) -->
        <div class="flex flex-wrap gap-1 pt-2 border-t border-nexo-border/60 shrink-0">
          <template v-if="perguntaAtual">
            <button
              type="button"
              class="rounded-badge border border-nexo-primary/40 bg-nexo-primary/5 px-2 py-0.5 text-[10px] text-nexo-primary hover:bg-nexo-primary/10 max-w-[210px] truncate"
              :title="perguntaAtual.exemplo"
              @click="enviarMensagem(perguntaAtual.exemplo)"
            >
              💬 {{ perguntaAtual.exemplo.slice(0, 32) }}...
            </button>
            <button
              type="button"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
              @click="enviarMensagem(perguntaAtual.acaoLabel)"
            >
              💬 {{ perguntaAtual.acaoLabel }}
            </button>
          </template>
          <button
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="enviarMensagem('O que falta para aprovar este gate?')"
          >
            O que falta?
          </button>
          <button
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="tabAtiva = 'faltas'"
          >
            Ver documento
          </button>
        </div>

        <!-- Input de Mensagem -->
        <form class="flex items-center gap-1.5 shrink-0" @submit.prevent="enviarMensagem()">
          <input
            v-model="inputMensagem"
            type="text"
            placeholder="Responda em texto livre à IA..."
            class="flex-1 rounded-btn border border-nexo-border px-3 py-1.5 text-xs text-nexo-text placeholder:text-nexo-muted focus:border-nexo-primary focus:outline-none bg-white"
          />
          <button
            type="submit"
            class="rounded-btn bg-nexo-primary p-2 text-white hover:bg-nexo-primary/90 disabled:opacity-40"
            :disabled="!inputMensagem.trim() || gerandoOutputAoVivo"
            aria-label="Enviar mensagem"
          >
            <LucideIcon name="send" :size="14" />
          </button>
        </form>
      </div>

      <!-- 2. TAB: O QUE FALTA (PAINÉIS SOMENTE-LEITURA: PREENCHIDO + FALTANDO + DOCUMENTO) -->
      <div v-else-if="tabAtiva === 'faltas'" class="space-y-4">
        <div v-if="!props.alvo" class="rounded-card border border-dashed border-nexo-border p-4 text-center text-nexo-muted">
          <LucideIcon name="alert-circle" :size="24" class="mx-auto mb-1 text-nexo-muted" />
          <p class="font-medium">Nenhum objeto selecionado</p>
          <p class="mt-1 text-[11px]">Selecione um objeto no gate para visualizar os painéis de leitura.</p>
        </div>

        <template v-else>
          <!-- Painel SOMENTE-LEITURA: 'Faltando' (códigos) -->
          <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
            <div class="flex items-center justify-between border-b border-nexo-border/50 pb-1.5">
              <span class="font-bold text-xs text-nexo-text flex items-center gap-1.5">
                <LucideIcon name="alert-circle" :size="14" class="text-red-600" />
                Faltando (Códigos Bloqueantes)
              </span>
              <span class="rounded bg-red-100 text-red-800 px-1.5 py-0.2 text-[10px] font-bold">
                {{ diagnostico?.faltas.length ?? 0 }} pendência(s)
              </span>
            </div>

            <div v-if="diagnostico && diagnostico.faltas.length > 0" class="space-y-1.5">
              <div
                v-for="falta in diagnostico.faltas"
                :key="falta.codigo"
                class="rounded bg-nexo-canvas/40 p-2 border border-nexo-border/50 text-[11px] space-y-0.5"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-nexo-text font-mono text-[10px]">{{ falta.codigo }}</span>
                  <span class="text-[9px] uppercase font-semibold text-red-700 bg-red-50 px-1 py-0.2 rounded">
                    {{ falta.severidade }}
                  </span>
                </div>
                <p class="text-nexo-text font-medium">{{ falta.descricao }}</p>
                <p class="text-[10px] text-nexo-muted leading-tight">{{ falta.pergunta }}</p>
              </div>
            </div>
            <p v-else class="text-xs text-green-700 italic">
              Nenhum código pendente. Todos os critérios foram preenchidos!
            </p>
          </div>

          <!-- Painel SOMENTE-LEITURA: 'Preenchido' (requisito: valor) -->
          <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
            <div class="flex items-center justify-between border-b border-nexo-border/50 pb-1.5">
              <span class="font-bold text-xs text-nexo-text flex items-center gap-1.5">
                <LucideIcon name="check-circle-2" :size="14" class="text-green-600" />
                Preenchido (Requisito: Valor)
              </span>
              <span class="rounded bg-green-100 text-green-800 px-1.5 py-0.2 text-[10px] font-bold">
                {{ itensPreenchidos.length }} atendido(s)
              </span>
            </div>

            <div v-if="itensPreenchidos.length > 0" class="space-y-1.5">
              <div
                v-for="it in itensPreenchidos"
                :key="it.codigo"
                class="rounded bg-green-50/30 p-2 border border-green-200/60 text-[11px] space-y-0.5"
              >
                <div class="flex items-center justify-between text-[10px]">
                  <span class="font-bold text-green-900 font-mono">{{ it.codigo }}</span>
                  <span class="text-nexo-muted font-mono">{{ it.campoAlvo }}</span>
                </div>
                <div class="text-nexo-text text-[10px] whitespace-pre-wrap font-mono max-h-20 overflow-y-auto bg-white p-1 rounded border border-green-200/40">
                  {{ it.valor }}
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-nexo-muted italic">
              Nenhum requisito preenchido ainda. Use o Chat para responder às perguntas da IA.
            </p>
          </div>

          <!-- Área SOMENTE-LEITURA: 'Documento' do Gate (one-pager/PRD/fluxo+BDD/artefato/DoR/stepper) -->
          <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
            <div class="flex items-center justify-between border-b border-nexo-border/50 pb-1.5">
              <span class="font-bold text-xs text-nexo-text flex items-center gap-1.5">
                <LucideIcon name="file-text" :size="14" class="text-nexo-primary" />
                Documento Sintetizado do Gate (Somente Leitura)
              </span>
              <span class="text-[10px] text-nexo-muted font-mono">v{{ props.alvo.versao }}</span>
            </div>

            <!-- G0: One-Pager -->
            <div v-if="props.gateId === 'G0'" class="space-y-1.5 text-[11px]">
              <div><strong>Dor:</strong> <span class="text-nexo-muted">{{ props.alvo.descricao || '(vazio)' }}</span></div>
              <div><strong>Hipótese:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).hipotese || '(vazio)' }}</span></div>
              <div><strong>Owner:</strong> <span class="text-nexo-muted">{{ props.alvo.owner || '(não definido)' }}</span></div>
              <div><strong>Personas:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).personas || []).join(', ') || '(vazio)' }}</span></div>
              <div><strong>Escopo In:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).escopo_in || []).join(', ') || '(vazio)' }}</span></div>
              <div><strong>Escopo Out:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).escopo_out || []).join(', ') || '(vazio)' }}</span></div>
            </div>

            <!-- G1: PRD -->
            <div v-else-if="props.gateId === 'G1'" class="space-y-1.5 text-[11px]">
              <div><strong>Problema:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).problema || props.alvo.descricao }}</span></div>
              <div><strong>Objetivo:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).objetivo || '(vazio)' }}</span></div>
              <div><strong>Escopo In:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).escopo_in || []).join(', ') || '(vazio)' }}</span></div>
              <div><strong>Escopo Out:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).escopo_out || []).join(', ') || '(vazio)' }}</span></div>
              <div><strong>KPIs:</strong> <span class="text-nexo-muted">{{ JSON.stringify((props.alvo as any).kpis || []) }}</span></div>
            </div>

            <!-- G2: Fluxo + BDD -->
            <div v-else-if="props.gateId === 'G2'" class="space-y-1.5 text-[11px]">
              <div><strong>Ator / Narrativa:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).ator || props.alvo.descricao }}</span></div>
              <div><strong>Fluxo Feliz:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).fluxo_feliz || '(vazio)' }}</span></div>
              <div><strong>Estados de Tela:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).telas_estados || []).join(', ') || '(vazio)' }}</span></div>
              <div><strong>Cenários BDD:</strong></div>
              <div v-if="(props.alvo as any).criterios_bdd?.length" class="space-y-1 pl-2 border-l border-nexo-border">
                <div v-for="(ac, idx) in (props.alvo as any).criterios_bdd" :key="idx" class="text-[10px] text-nexo-text">
                  <span class="font-bold">[{{ ac.id || idx + 1 }}]</span> Given {{ ac.given }} | When {{ ac.when }} | Then {{ ac.then }}
                </div>
              </div>
              <div v-else class="text-nexo-muted italic text-[10px] pl-2">(Nenhum cenário BDD cadastrado)</div>
            </div>

            <!-- G3: Arquitetura & ADR -->
            <div v-else-if="props.gateId === 'G3'" class="space-y-1.5 text-[11px]">
              <div><strong>OpenAPI / Contratos:</strong> <span class="text-nexo-muted font-mono text-[10px]">{{ JSON.stringify((props.alvo as any).openapi || {}) }}</span></div>
              <div><strong>ADR Vinculada:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).adr_id || '(nenhuma)' }}</span></div>
              <div><strong>Persistência:</strong> <span class="text-nexo-muted font-mono text-[10px]">{{ JSON.stringify((props.alvo as any).persistencia || {}) }}</span></div>
              <div><strong>Integrações:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).integracoes || []).join(', ') || '(nenhuma)' }}</span></div>
            </div>

            <!-- G4: DoR & PBIs -->
            <div v-else-if="props.gateId === 'G4'" class="space-y-1.5 text-[11px]">
              <div><strong>Owner:</strong> <span class="text-nexo-muted">{{ props.alvo.owner || '(não atribuído)' }}</span></div>
              <div><strong>Estratégia de Teste:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).estrategia_teste || '(vazio)' }}</span></div>
              <div><strong>Escopo Delimitado:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).escopo_in || []).join(', ') || '(vazio)' }}</span></div>
            </div>

            <!-- G5: Stepper do Gate & Evidências DoD -->
            <div v-else-if="props.gateId === 'G5'" class="space-y-1.5 text-[11px]">
              <div><strong>Status de Entrega:</strong> <span class="font-bold text-green-700">{{ props.alvo.status }}</span></div>
              <div><strong>Pull Request:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).evidencia?.pr_url || '(não vinculado)' }}</span></div>
              <div><strong>Pipeline CI:</strong> <span class="text-nexo-muted">{{ ((props.alvo as any).evidencia?.checks_ci || []).join(', ') || '(não executada)' }}</span></div>
              <div><strong>Testes Automatizados:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).evidencia?.testes_verdes ? 'Verdes (100%)' : 'Pendentes' }}</span></div>
              <div><strong>Aceite Registrado:</strong> <span class="text-nexo-muted">{{ (props.alvo as any).evidencia?.aceite_registrado ? 'Sim (PO/QA)' : 'Pendente' }}</span></div>
            </div>
          </div>
        </template>
      </div>

      <!-- 3. TAB: GOVERNANÇA E PAPÉIS -->
      <div v-else-if="tabAtiva === 'governanca'" class="space-y-3">
        <!-- Cadeado Sequencial -->
        <div
          class="rounded-card border p-3"
          :class="governanca.sequenciaOk ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'"
        >
          <div class="flex items-center gap-2 font-semibold text-xs">
            <LucideIcon :name="governanca.sequenciaOk ? 'unlock' : 'lock'" :size="14" :class="governanca.sequenciaOk ? 'text-green-600' : 'text-amber-600'" />
            <span>Cadeado Sequencial: {{ governanca.sequenciaOk ? 'Desbloqueado' : 'Bloqueado' }}</span>
          </div>
          <p class="mt-1 text-[11px] text-nexo-text">
            {{ governanca.sequenciaOk ? `O Gate anterior foi aprovado com baseline versionada.` : governanca.motivoSequencia }}
          </p>
          <RouterLink
            v-if="!governanca.sequenciaOk && governanca.gateAnteriorId"
            :to="`/gates/${governanca.gateAnteriorId}`"
            class="mt-1 inline-block text-[11px] font-medium text-nexo-primary underline"
          >
            Ir para Gate {{ governanca.gateAnteriorId }}
          </RouterLink>
        </div>

        <!-- Papéis Aprovadores -->
        <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
          <p class="font-semibold text-nexo-text text-xs">Papéis Aprovadores Exigidos (APROVACAO_GATE):</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="papel in governanca.aprovadoresExigidos"
              :key="papel"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[11px] font-semibold text-nexo-text"
            >
              {{ papel }}
            </span>
          </div>

          <div class="mt-2 border-t border-nexo-border/60 pt-2">
            <p class="text-[11px] text-nexo-muted">Seu usuário logado:</p>
            <p class="font-medium text-nexo-text">
              {{ governanca.usuarioAtual?.nome ?? 'Anônimo' }} ({{ governanca.usuarioAtual?.papel ?? 'Sem Papel' }})
            </p>
            <p
              class="mt-1 text-[11px] font-semibold"
              :class="governanca.papelOk ? 'text-green-700' : 'text-red-700'"
            >
              {{ governanca.papelOk ? 'Papel apto para aprovação' : 'Seu papel atual não possui autorização para aprovar este gate' }}
            </p>
          </div>
        </div>

        <!-- Regra de Segregação: Proponente != Aprovador -->
        <div
          class="rounded-card border p-3"
          :class="!governanca.bloqueadoPorProponente ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'"
        >
          <div class="flex items-center gap-2 font-semibold text-xs">
            <LucideIcon :name="!governanca.bloqueadoPorProponente ? 'check-circle-2' : 'alert-triangle'" :size="14" :class="!governanca.bloqueadoPorProponente ? 'text-green-600' : 'text-amber-600'" />
            <span>Segregação de Funções (SoD): {{ !governanca.bloqueadoPorProponente ? 'Conforme' : 'Aviso' }}</span>
          </div>
          <p class="mt-1 text-[11px] text-nexo-text">
            {{ governanca.bloqueadoPorProponente ? `Atenção: O usuário logado é o proponente/owner do objeto (${governanca.proponenteNome}). Pela regra SoD, outro aprovador deve homologar.` : 'Regra de Segregação de Funções (SoD) atendida: o proponente não é o único aprovador.' }}
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
