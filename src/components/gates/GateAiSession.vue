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
  obterSkillsDoGate,
  processarMensagemGate,
  gerarPropostaPatch,
  type FaltaGate
} from '@/ai/gateSkills'
import { getConfig, saude, type OllamaMessage } from '@/ai/ollamaClient'
import { executarSkill } from '@/ai/skillRunner'

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

// Abas da sessão
const tabAtiva = ref<'faltas' | 'skill' | 'chat' | 'governanca'>('skill')
const inputMensagem = ref('')
const historicoChat = ref<{ id: string; autor: 'usuario' | 'ia'; texto: string; timestamp: string }[]>([])
const patchPendente = ref<{
  alvoId: string
  justificativa: string
  mudancas: PatchMudanca[]
} | null>(null)

// Skills ativas para este gate
const skills = computed(() => obterSkillsDoGate(props.gateId))
const skillAtivaIndex = ref(0)
const skillAtiva = computed(() => skills.value[skillAtivaIndex.value] || skills.value[0] || null)

// Inputs inline das perguntas da skill ativa
const inputsSkill = ref<Record<string, string>>({})

// Estado do motor Ollama / Fallback Local
const usarOllama = ref(false)
const ollamaStatus = ref<'online' | 'offline'>('offline')
const ollamaModel = ref('queen')

// Streaming / Output ao vivo
const gerandoOutputAoVivo = ref(false)
const outputAoVivoTexto = ref('')
const checkSendoGerado = ref('')

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

// Verificação de conformidade de check específico
function isCheckOk(codigo: string): boolean {
  if (!diagnostico.value) return false
  const c = diagnostico.value.checks.find((item) => item.codigo === codigo)
  return c ? c.ok : false
}

// Estatísticas de coleta para a Barra Coletado X/Y
const totalChecksSkill = computed(() => skillAtiva.value?.checks.length ?? 0)
const checksSatisfeitosSkill = computed(() => {
  if (!skillAtiva.value || !diagnostico.value) return 0
  return skillAtiva.value.checks.filter((c) => isCheckOk(c)).length
})
const progressoSkillPercent = computed(() => {
  if (totalChecksSkill.value === 0) return 0
  return Math.round((checksSatisfeitosSkill.value / totalChecksSkill.value) * 100)
})

// Faltas restantes que não pertencem à skill ativa
const faltasForaDaSkillAtiva = computed(() => {
  if (!diagnostico.value || !skillAtiva.value) return []
  return diagnostico.value.faltas.filter((f) => !skillAtiva.value?.checks.includes(f.codigo))
})

// Governança, papéis e travas
const governanca = computed(() => {
  return obterGovernancaGate(props.gateId, users.currentUser, props.alvo, gates.gates)
})

// Inicializa ou limpa chat ao trocar de objeto ou gate
watch(
  [() => props.alvoId, () => props.gateId],
  ([novoId]) => {
    patchPendente.value = null
    skillAtivaIndex.value = 0
    inputsSkill.value = {}
    if (!novoId || !props.alvo) {
      const textoBoasVindas =
        props.gateId === 'G5'
          ? 'Bem-vindo à Sessão de IA do Gate G5 (Definition of Done). Nenhum pacote de entrega está selecionado no momento. Promova um entregável para status "validated" no Canvas ou vincule-o ao Gate G5 para diagnosticar os critérios de DoD.'
          : `Bem-vindo à Sessão de IA do Gate ${props.gateId}. Selecione um objeto para que as skills especializadas analisem os critérios de qualidade.`

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
    const skillPrincipal = skills.value[0]?.nome ?? 'Assistente de Gate'

    let msgInicial = `Olá! Sou o **${skillPrincipal}** avaliando o objeto **"${props.alvo.titulo}"** no **Gate ${props.gateId}**.\n\n`
    if (diag.aprovado) {
      msgInicial += `Todos os critérios de qualidade estão atendidos (100% OK). O objeto está apto para aprovação caso a governança e o sequenciamento permitam.`
    } else {
      msgInicial += `Identifiquei **${diag.faltas.length} pendência(s)** que bloqueiam este gate. Posso sugerir correções imediatas via proposta formal de patch.`
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

// Executar Pergunta da Skill via IA (SkillRunner ou Local)
async function executarPerguntaSkill(codigo: string) {
  if (!props.alvo) return
  const entrada = inputsSkill.value[codigo] || ''
  checkSendoGerado.value = codigo
  gerandoOutputAoVivo.value = true
  outputAoVivoTexto.value = `Processando critério [${codigo}]...`

  try {
    if (usarOllama.value && ollamaStatus.value === 'online') {
      outputAoVivoTexto.value = `Consultando Ollama (${ollamaModel.value}) para [${codigo}]...`
      const historico: OllamaMessage[] = [
        ...historicoChat.value.map((h) => ({
          role: (h.autor === 'usuario' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.texto
        })),
        { role: 'user', content: `${codigo}: ${entrada || 'Gerar sugestão para atender este critério'}` }
      ]
      const res = await executarSkill(props.gateId, props.alvo, historico)
      outputAoVivoTexto.value = res.outputParcial || res.patchProposto?.justificativa || 'Resposta recebida da IA.'
      if (res.patchProposto) {
        patchPendente.value = {
          alvoId: props.alvo.id,
          justificativa: res.patchProposto.justificativa,
          mudancas: res.patchProposto.mudancas
        }
        tabAtiva.value = 'chat'
        historicoChat.value.push({
          id: `ia-${Date.now()}`,
          autor: 'ia',
          texto: `[${res.provider}] Proposta de patch gerada para [${codigo}]:\n\n${res.patchProposto.justificativa}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      } else {
        historicoChat.value.push({
          id: `ia-${Date.now()}`,
          autor: 'ia',
          texto: res.outputParcial || `Critério [${codigo}] processado.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      }
    } else {
      // Motor determinístico local
      const prop = gerarPropostaPatch(props.alvo, codigo, entrada)
      if (prop) {
        outputAoVivoTexto.value = `Patch gerado localmente:\n${prop.justificativa}`
        patchPendente.value = {
          alvoId: props.alvo.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        }
        tabAtiva.value = 'chat'
        historicoChat.value.push({
          id: `ia-${Date.now()}`,
          autor: 'ia',
          texto: `Gerei uma proposta de patch para resolver a pendência **[${codigo}]**.\n\n*Entrada:* "${entrada || '(padrão)'}"\n\nRevise e aceite as mudanças abaixo.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      } else {
        enviarMensagem(`Como resolver ${codigo}: ${entrada}`)
      }
    }
  } catch (err) {
    outputAoVivoTexto.value = `Erro ao processar: ${err instanceof Error ? err.message : String(err)}`
  } finally {
    setTimeout(() => {
      gerandoOutputAoVivo.value = false
      checkSendoGerado.value = ''
    }, 1200)
    inputsSkill.value[codigo] = ''
  }
}

// Ações do Chat
function enviarMensagem(textoCustom?: string) {
  const txt = (textoCustom ?? inputMensagem.value).trim()
  if (!txt) return

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

  const resposta = processarMensagemGate(txt, {
    objeto: props.alvo,
    gateId: props.gateId,
    user: users.currentUser,
    gates: gates.gates,
    waivers: graph.waivers
  })

  historicoChat.value.push({
    id: `ia-${Date.now()}`,
    autor: 'ia',
    texto: resposta.texto,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })

  if (resposta.propostaPatch) {
    patchPendente.value = resposta.propostaPatch
    tabAtiva.value = 'chat'
  }
}

// Resolver falta pontual diretamente via IA
function resolverFaltaComIa(falta: FaltaGate) {
  if (!props.alvo) return
  const prop = gerarPropostaPatch(props.alvo, falta.codigo)
  if (prop) {
    patchPendente.value = {
      alvoId: props.alvo.id,
      justificativa: prop.justificativa,
      mudancas: prop.mudancas
    }
    tabAtiva.value = 'chat'
    historicoChat.value.push({
      id: `ia-${Date.now()}`,
      autor: 'ia',
      texto: `Gerei uma proposta de patch para resolver a pendência **[${falta.codigo}] ${falta.descricao}** em "${props.alvo.titulo}". Revise e aceite abaixo.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  } else {
    enviarMensagem(`Como resolver ${falta.codigo}: ${falta.pergunta}`)
  }
}

// Aceitar Proposta de Patch formal gerada pela IA
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
    historicoChat.value.push({
      id: `sys-${Date.now()}`,
      autor: 'ia',
      texto: `[Patch Aceito] O objeto foi promovido para a versão **v${props.alvo.versao}** e o checklist do Gate ${props.gateId} foi recalculado em tempo real.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  }
  patchPendente.value = null
}

// Rejeitar Proposta de Patch
function rejeitarPatch() {
  patchPendente.value = null
  historicoChat.value.push({
    id: `sys-${Date.now()}`,
    autor: 'ia',
    texto: `[Patch Descartado] Proposta descartada pelo usuário. O objeto permaneceu inalterado.`,
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
    <!-- Header do Painel -->
    <header class="flex shrink-0 items-center justify-between border-b border-nexo-border px-4 py-3 bg-nexo-canvas/40">
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-btn bg-nexo-primary/10 text-nexo-primary">
          <LucideIcon name="sparkles" :size="16" />
        </span>
        <div>
          <h2 class="text-sm font-bold text-nexo-text">Sessão IA · Gate {{ props.gateId }}</h2>
          <p class="text-xs text-nexo-muted" :title="skillAtiva?.descricao">
            {{ skillAtiva?.nome ?? 'Gate Copilot' }}
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
    </header>

    <!-- Navegação de Abas Internas -->
    <nav class="flex shrink-0 border-b border-nexo-border bg-nexo-surface text-xs font-medium" aria-label="Abas da Sessão IA">
      <!-- Aba Faltas -->
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

      <!-- Aba Skill Visual -->
      <button
        type="button"
        class="flex-1 py-2 text-center transition-colors"
        :class="tabAtiva === 'skill' ? 'border-b-2 border-nexo-primary font-semibold text-nexo-primary' : 'text-nexo-muted hover:text-nexo-text'"
        @click="tabAtiva = 'skill'"
      >
        Skill Visual
        <span
          v-if="totalChecksSkill > 0"
          class="ml-1 rounded bg-nexo-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-nexo-primary"
        >
          {{ checksSatisfeitosSkill }}/{{ totalChecksSkill }}
        </span>
      </button>

      <!-- Aba Chat -->
      <button
        type="button"
        class="flex-1 py-2 text-center transition-colors"
        :class="tabAtiva === 'chat' ? 'border-b-2 border-nexo-primary font-semibold text-nexo-primary' : 'text-nexo-muted hover:text-nexo-text'"
        @click="tabAtiva = 'chat'"
      >
        Chat Interativo
        <span
          v-if="patchPendente"
          class="ml-1 rounded-full bg-nexo-primary px-1.5 py-0.2 text-[10px] font-bold text-white"
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
      <!-- 1. TAB: SKILL VISUAL -->
      <div v-if="tabAtiva === 'skill'" class="space-y-4">
        <!-- Indicador Ollama & Toggle -->
        <div class="flex items-center justify-between rounded-card border border-nexo-border/80 bg-nexo-canvas/40 px-3 py-2">
          <div class="flex items-center gap-2 text-[11px] text-nexo-text">
            <span
              class="inline-block h-2 w-2 rounded-full"
              :class="ollamaStatus === 'online' ? 'bg-green-500' : 'bg-nexo-muted'"
            />
            <span class="font-semibold">Ollama:</span>
            <span class="text-nexo-muted font-mono text-[10px]">{{ ollamaModel }} ({{ ollamaStatus }})</span>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 text-[11px] font-semibold focus:outline-none"
            :class="usarOllama ? 'text-nexo-primary' : 'text-nexo-muted'"
            @click="usarOllama = !usarOllama"
          >
            <LucideIcon :name="usarOllama ? 'toggle-right' : 'toggle-left'" :size="16" />
            <span>{{ usarOllama ? 'Ollama Ativo' : 'Regras Locais' }}</span>
          </button>
        </div>

        <!-- Seletor de Skill (quando gate possui múltiplas skills) -->
        <div v-if="skills.length > 1" class="flex gap-1 border-b border-nexo-border/50 pb-2">
          <button
            v-for="(sk, idx) in skills"
            :key="sk.id"
            type="button"
            class="rounded-badge px-2.5 py-1 text-[10px] font-semibold border transition-colors"
            :class="skillAtivaIndex === idx
              ? 'border-nexo-primary bg-nexo-primary/10 text-nexo-primary'
              : 'border-nexo-border bg-nexo-surface text-nexo-muted hover:text-nexo-text'"
            @click="skillAtivaIndex = idx"
          >
            {{ sk.nome }}
          </button>
        </div>

        <div v-if="!props.alvo" class="rounded-card border border-dashed border-nexo-border p-4 text-center text-nexo-muted">
          <LucideIcon name="alert-circle" :size="24" class="mx-auto mb-1 text-nexo-muted" />
          <p class="font-medium">Nenhum objeto selecionado</p>
          <p class="mt-1 text-[11px]">Selecione um objeto no gate para visualizar e interagir com as skills.</p>
        </div>

        <div v-else-if="skillAtiva" class="space-y-4">
          <!-- Header da Skill Ativa -->
          <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2 shadow-xs">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="text-xs font-bold text-nexo-text">{{ skillAtiva.nome }}</h3>
                <p class="mt-0.5 text-[11px] text-nexo-muted leading-relaxed">{{ skillAtiva.descricao }}</p>
              </div>
              <div class="flex flex-wrap gap-1 shrink-0">
                <span
                  v-for="role in skillAtiva.roles"
                  :key="role"
                  class="rounded bg-nexo-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-nexo-primary"
                >
                  {{ role }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 text-[10px] text-nexo-muted border-t border-nexo-border/50 pt-2">
              <span class="font-bold text-nexo-text">Autonomia:</span>
              <span class="rounded bg-nexo-canvas px-1.5 py-0.5 font-mono text-[10px]">{{ skillAtiva.autonomia }}</span>
            </div>
          </div>

          <!-- Barra Coletado X/Y -->
          <div class="space-y-1 rounded-card border border-nexo-border bg-white p-3">
            <div class="flex items-center justify-between text-[11px] font-semibold text-nexo-text">
              <span>Critérios Coletados da Skill:</span>
              <span class="text-nexo-primary font-bold">{{ checksSatisfeitosSkill }} de {{ totalChecksSkill }} Concluídos ({{ progressoSkillPercent }}%)</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-nexo-canvas border border-nexo-border/50">
              <div
                class="h-full bg-nexo-primary transition-all duration-300 rounded-full"
                :style="{ width: `${progressoSkillPercent}%` }"
              />
            </div>
          </div>

          <!-- Checklist Interativo da Skill -->
          <div class="space-y-3">
            <div
              v-for="pergunta in skillAtiva.perguntas"
              :key="pergunta.codigo"
              class="rounded-card border p-3 transition-all"
              :class="isCheckOk(pergunta.codigo)
                ? 'border-green-200 bg-green-50/30 text-nexo-text'
                : 'border-nexo-border bg-white shadow-xs'"
            >
              <!-- Nome / Status do Check -->
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-1.5 text-[11px] font-bold">
                  <LucideIcon
                    :name="isCheckOk(pergunta.codigo) ? 'check-circle-2' : 'circle'"
                    :size="14"
                    :class="isCheckOk(pergunta.codigo) ? 'text-green-600' : 'text-nexo-muted'"
                  />
                  <span :class="isCheckOk(pergunta.codigo) ? 'text-green-800 line-through' : 'text-nexo-text'">
                    {{ pergunta.codigo }} · {{ pergunta.campoAlvo }}
                  </span>
                </span>
                <span
                  v-if="isCheckOk(pergunta.codigo)"
                  class="text-[9px] font-bold uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded"
                >
                  Concluído
                </span>
              </div>

              <!-- Pergunta e Justificativa -->
              <p class="mt-2 text-xs font-semibold text-nexo-text">{{ pergunta.pergunta }}</p>
              <p class="mt-1 text-[10px] text-nexo-muted leading-relaxed">
                <span class="font-semibold text-nexo-text">Por que bloqueia:</span> {{ pergunta.porQueBloqueia }}
              </p>

              <!-- Exemplo -->
              <div class="mt-2 rounded bg-nexo-canvas/40 border border-nexo-border/30 p-2 text-[10px] font-mono text-nexo-muted">
                <span class="font-semibold text-nexo-text">Exemplo:</span> {{ pergunta.exemplo }}
              </div>

              <!-- Input Inline + Ação via IA -->
              <div v-if="!isCheckOk(pergunta.codigo)" class="mt-3 space-y-2">
                <!-- Output Parcial ao Vivo -->
                <div
                  v-if="gerandoOutputAoVivo && checkSendoGerado === pergunta.codigo"
                  class="rounded bg-nexo-primary/5 border border-nexo-primary/20 p-2.5 text-[10px] font-mono whitespace-pre-wrap leading-normal"
                >
                  <div class="flex items-center gap-1.5 font-bold text-nexo-primary mb-1">
                    <LucideIcon name="activity" :size="12" class="animate-pulse" />
                    <span>Gerando sugestão...</span>
                  </div>
                  <div>{{ outputAoVivoTexto }}</div>
                </div>

                <div v-else class="flex items-center gap-2">
                  <input
                    v-model="inputsSkill[pergunta.codigo]"
                    type="text"
                    placeholder="Complemento ou resposta inline para a IA..."
                    class="flex-1 rounded-btn border border-nexo-border px-2.5 py-1 text-xs text-nexo-text placeholder:text-nexo-muted focus:border-nexo-primary focus:outline-none bg-white"
                    @keydown.enter.prevent="executarPerguntaSkill(pergunta.codigo)"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-btn bg-nexo-primary px-3 py-1 text-xs font-semibold text-white hover:bg-nexo-primary/95 transition-colors shrink-0"
                    @click="executarPerguntaSkill(pergunta.codigo)"
                  >
                    <LucideIcon name="sparkles" :size="12" />
                    <span>{{ pergunta.acaoLabel }} via IA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Faltas Restantes fora da Skill Ativa -->
          <div v-if="faltasForaDaSkillAtiva.length > 0" class="pt-3 border-t border-nexo-border/50 space-y-3">
            <h4 class="text-xs font-bold text-nexo-text flex items-center gap-1.5">
              <LucideIcon name="alert-circle" :size="13" class="text-amber-600" />
              <span>Outras Pendências do Gate</span>
            </h4>

            <div
              v-for="falta in faltasForaDaSkillAtiva"
              :key="falta.codigo"
              class="rounded-card border border-amber-200 bg-amber-50/20 p-3 space-y-2"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                  {{ falta.codigo }} · {{ falta.severidade }}
                </span>
                <button
                  type="button"
                  class="text-[10px] font-semibold text-nexo-primary hover:underline focus:outline-none"
                  @click="emit('corrigir-no-objeto', props.alvoId)"
                >
                  Abrir no Canvas
                </button>
              </div>

              <div>
                <p class="text-xs font-semibold text-nexo-text">{{ falta.descricao }}</p>
                <p class="mt-0.5 text-[10px] text-nexo-muted leading-snug">{{ falta.pergunta }}</p>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-btn bg-nexo-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-nexo-primary/90"
                  @click="resolverFaltaComIa(falta)"
                >
                  <LucideIcon name="sparkles" :size="11" />
                  <span>{{ falta.acaoLabel }} via IA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. TAB: O QUE FALTA (COMPLETO) -->
      <div v-else-if="tabAtiva === 'faltas'" class="space-y-3">
        <div v-if="!props.alvo" class="rounded-card border border-dashed border-nexo-border p-4 text-center text-nexo-muted">
          <LucideIcon name="alert-circle" :size="24" class="mx-auto mb-1 text-nexo-muted" />
          <p class="font-medium">Nenhum objeto selecionado</p>
          <p class="mt-1 text-[11px]">Selecione um objeto no formulário do gate para que a IA analise as pendências.</p>
        </div>

        <div v-else-if="diagnostico && diagnostico.faltas.length === 0" class="rounded-card border border-green-200 bg-green-50/60 p-4 text-green-900">
          <div class="flex items-center gap-2 font-semibold">
            <LucideIcon name="check-circle-2" :size="16" class="text-green-600" />
            Checklist 100% Conforme
          </div>
          <p class="mt-1 text-[11px] text-green-800">
            O objeto <strong>"{{ props.alvo.titulo }}"</strong> cumpre todos os critérios bloqueantes do Gate {{ props.gateId }}.
          </p>
        </div>

        <div v-else-if="diagnostico" class="space-y-3">
          <p class="font-semibold text-nexo-text">
            Pendências identificadas em "{{ props.alvo.titulo }}":
          </p>

          <article
            v-for="falta in diagnostico.faltas"
            :key="falta.codigo"
            class="rounded-card border p-3 transition-shadow"
            :class="falta.severidade === 'bloqueante' ? 'border-red-200 bg-red-50/40 text-red-950' : 'border-amber-200 bg-amber-50/40 text-amber-950'"
          >
            <div class="flex items-start justify-between gap-2">
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                :class="falta.severidade === 'bloqueante' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ falta.codigo }} · {{ falta.severidade }}
              </span>
              <button
                type="button"
                class="text-[11px] font-medium text-nexo-primary hover:underline"
                @click="emit('corrigir-no-objeto', props.alvoId)"
              >
                Abrir no Canvas
              </button>
            </div>

            <p class="mt-1.5 text-xs font-semibold text-nexo-text">{{ falta.descricao }}</p>

            <div class="mt-2 rounded bg-white/80 p-2 text-[11px] border border-nexo-border/60">
              <p class="font-medium text-nexo-primary">Pergunta reflexiva da IA:</p>
              <p class="mt-0.5 text-nexo-text">{{ falta.pergunta }}</p>
              <p class="mt-1 text-[10px] text-nexo-muted italic">Exemplo esperado: {{ falta.exemplo }}</p>
            </div>

            <div class="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-btn bg-nexo-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-nexo-primary/90"
                @click="resolverFaltaComIa(falta)"
              >
                <LucideIcon name="sparkles" :size="12" />
                {{ falta.acaoLabel }} via IA
              </button>
            </div>
          </article>
        </div>
      </div>

      <!-- 3. TAB: GOVERNANÇA E PAPÉIS -->
      <div v-else-if="tabAtiva === 'governanca'" class="space-y-3">
        <!-- Cadeado Sequencial -->
        <div
          class="rounded-card border p-3"
          :class="governanca.sequenciaOk ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'"
        >
          <div class="flex items-center gap-2 font-semibold">
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
          <p class="font-semibold text-nexo-text">Papéis Aprovadores Exigidos (APROVACAO_GATE):</p>
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
          :class="governanca.bloqueadoPorProponente ? 'border-red-200 bg-red-50/60' : 'border-nexo-border bg-white'"
        >
          <p class="font-semibold text-nexo-text">Segregação de Funções:</p>
          <p class="mt-1 text-[11px] text-nexo-text">
            <strong>Proponente do objeto:</strong> {{ governanca.proponenteNome }}
          </p>
          <p
            v-if="governanca.bloqueadoPorProponente"
            class="mt-1.5 text-[11px] font-medium text-red-700"
          >
            Atenção: O proponente não pode ser o único aprovador. Chame um segundo membro com papel de aprovação para registrar a baseline.
          </p>
          <p v-else-if="props.alvo" class="mt-1 text-[11px] text-green-700">
            Segregação atendida (você não é o único proponente deste objeto).
          </p>
          <p v-else class="mt-1 text-[11px] text-nexo-muted italic">
            Selecione um objeto para verificar a regra de segregação de funções.
          </p>
        </div>
      </div>

      <!-- 4. TAB: CHAT INTERATIVO (COPILOT-LIKE) -->
      <div v-else-if="tabAtiva === 'chat'" class="flex h-full flex-col justify-between space-y-3">
        <!-- Histórico de Mensagens -->
        <div class="flex-1 space-y-3 overflow-y-auto pr-1">
          <div
            v-for="msg in historicoChat"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.autor === 'usuario' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-center gap-1.5 text-[10px] text-nexo-muted mb-0.5">
              <span>{{ msg.autor === 'usuario' ? (users.currentUser?.nome ?? 'Você') : (skills[0]?.nome ?? 'IA Gate') }}</span>
              <span>· {{ msg.timestamp }}</span>
            </div>
            <div
              class="max-w-[92%] rounded-card px-3 py-2 text-xs leading-relaxed"
              :class="msg.autor === 'usuario' ? 'bg-nexo-primary text-white' : 'border border-nexo-border bg-white text-nexo-text'"
            >
              <div class="whitespace-pre-wrap">{{ msg.texto }}</div>
            </div>
          </div>

          <!-- Card de Proposta de Patch Pendente (Diff + Aceitar/Rejeitar) -->
          <div
            v-if="patchPendente"
            class="rounded-card border-2 border-nexo-primary bg-blue-50/40 p-3 text-nexo-text shadow-sm"
          >
            <div class="flex items-center gap-1.5 font-bold text-nexo-primary">
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

        <!-- Chips de Ações Rápidas -->
        <div class="flex flex-wrap gap-1 pt-1 border-t border-nexo-border/60">
          <button
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="enviarMensagem('O que falta para aprovar este gate?')"
          >
            O que falta?
          </button>
          <template v-if="props.gateId === 'G0'">
            <button
              type="button"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
              @click="enviarMensagem('Estruturar hipótese e problema de enquadramento')"
            >
              + Hipótese & Dor
            </button>
            <button
              type="button"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
              @click="enviarMensagem('Definir escopo in e escopo out do enquadramento')"
            >
              + Escopo In/Out
            </button>
          </template>
          <template v-if="props.gateId === 'G1'">
            <button
              type="button"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
              @click="enviarMensagem('Adicionar KPI mensurável')"
            >
              + KPI Mensurável
            </button>
            <button
              type="button"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
              @click="enviarMensagem('Definir escopo in e escopo out do épico')"
            >
              + Escopo In/Out
            </button>
          </template>
          <button
            v-if="props.gateId === 'G2'"
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="enviarMensagem('Gerar critérios BDD Given/When/Then')"
          >
            + Gerar BDD
          </button>
          <button
            v-if="props.gateId === 'G3'"
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="enviarMensagem('Declarar contrato e vincular ADR')"
          >
            + Integração & ADR
          </button>
          <button
            v-if="props.gateId === 'G4'"
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="enviarMensagem('Completar DoR com estratégia de teste')"
          >
            + DoR e Testes
          </button>
          <button
            v-if="props.gateId === 'G5'"
            type="button"
            class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[10px] hover:bg-white"
            @click="enviarMensagem('Validar DoD e evidências de entrega')"
          >
            + Validar DoD & Release
          </button>
        </div>

        <!-- Input de Mensagem -->
        <form class="flex items-center gap-1.5" @submit.prevent="enviarMensagem()">
          <input
            v-model="inputMensagem"
            type="text"
            placeholder="Responda ou peça apoio à IA..."
            class="flex-1 rounded-btn border border-nexo-border px-3 py-1.5 text-xs text-nexo-text placeholder:text-nexo-muted focus:border-nexo-primary focus:outline-none"
          />
          <button
            type="submit"
            class="rounded-btn bg-nexo-primary p-2 text-white hover:bg-nexo-primary/90 disabled:opacity-40"
            :disabled="!inputMensagem.trim()"
            aria-label="Enviar mensagem"
          >
            <LucideIcon name="send" :size="14" />
          </button>
        </form>
      </div>
    </div>
  </aside>
</template>
