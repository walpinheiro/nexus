<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const tabAtiva = ref<'faltas' | 'chat' | 'governanca'>('faltas')
const inputMensagem = ref('')
const historicoChat = ref<{ id: string; autor: 'usuario' | 'ia'; texto: string; timestamp: string }[]>([])
const patchPendente = ref<{
  alvoId: string
  justificativa: string
  mudancas: PatchMudanca[]
} | null>(null)

// Skills ativas para este gate
const skills = computed(() => obterSkillsDoGate(props.gateId))

// Diagnóstico de conformidade reativo em tempo real
const diagnostico = computed(() => {
  if (!props.alvo) return null
  return diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers)
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
    if (!novoId || !props.alvo) {
      const textoBoasVindas =
        props.gateId === 'G5'
          ? 'Bem-vindo à Sessão de IA do **Gate G5 (Definition of Done)**. Nenhum pacote de entrega está selecionado no momento. Promova um entregável para status "validated" no Canvas ou vincule-o ao Gate G5 para diagnosticar os critérios de DoD.'
          : `Bem-vindo à Sessão de IA do **Gate ${props.gateId}**. Selecione um objeto para que as skills especializadas analisem os critérios de qualidade.`

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
      msgInicial += `🎉 **Todos os critérios de qualidade estão atendidos (100% OK).** O objeto está apto para aprovação caso a governança e o sequenciamento permitam.`
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
      texto: `✅ **Patch aceito com sucesso!** O objeto foi promovido para a versão **v${props.alvo.versao}** e o checklist do Gate ${props.gateId} foi recalculado em tempo real.`,
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
    texto: `❌ Proposta de patch descartada pelo usuário. O objeto permaneceu inalterado.`,
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
          <p class="text-xs text-nexo-muted" :title="skills[0]?.descricao">
            {{ skills[0]?.nome ?? 'Gate Copilot' }}
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
    </nav>

    <!-- Conteúdo das Abas -->
    <div class="flex-1 overflow-y-auto p-4 text-xs">
      <!-- 1. TAB: O QUE FALTA -->
      <div v-if="tabAtiva === 'faltas'" class="space-y-3">
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

      <!-- 2. TAB: GOVERNANÇA E PAPÉIS -->
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
              {{ governanca.papelOk ? '✓ Papel apto para aprovação' : '✗ Seu papel atual não possui autorização para aprovar este gate' }}
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
            ⚠️ O proponente não pode ser o único aprovador. Chame um segundo membro com papel de aprovação para registrar a baseline.
          </p>
          <p v-else-if="props.alvo" class="mt-1 text-[11px] text-green-700">
            ✓ Segregação atendida (você não é o único proponente deste objeto).
          </p>
          <p v-else class="mt-1 text-[11px] text-nexo-muted italic">
            Selecione um objeto para verificar a regra de segregação de funções.
          </p>
        </div>
      </div>

      <!-- 3. TAB: CHAT INTERATIVO (COPILOT-LIKE) -->
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
