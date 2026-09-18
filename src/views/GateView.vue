<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGate } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { aprovadoresDoGate, avaliarGate, gateAnterior, gateDesbloqueado } from '@/utils/gates'
import BlockedReason from '@/components/gates/BlockedReason.vue'
import GateAiSession from '@/components/gates/GateAiSession.vue'
import GateGuide from '@/components/gates/GateGuide.vue'
import GateOutput from '@/components/gates/GateOutput.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import type { GateId } from '@/types/nexo'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const gates = useGate()
const graph = useGraph()
const users = useUsers()

const gate = computed(() => gates.gates.find((g) => g.id === props.id))
const bloqueado = computed(() => !gateDesbloqueado(props.id as GateId, gates.gates))
const anterior = computed(() => gateAnterior(props.id as GateId))
const motivoBloqueio = computed(() =>
  anterior.value ? `Gate ${props.id} bloqueado: aprove ${anterior.value} primeiro (baseline não registrada).` : `Gate ${props.id} bloqueado.`
)

// Filtro estrito de alvos por tipo conforme o Gate, garantindo seed visível no G0 e apenas features no G2
const alvos = computed(() => {
  if (props.id === 'G0') {
    const nosG0 = graph.state.nos.filter((n) => n.gate === 'G0')
    if (nosG0.length > 0) return nosG0
    // Alvo seed G0 derivado do épico de enquadramento de Cobranças
    return graph.state.nos.filter((n) => n.tipo === 'epico')
  }
  if (props.id === 'G1') {
    return graph.state.nos.filter((n) => n.tipo === 'epico')
  }
  if (props.id === 'G2') {
    // Apenas nós do tipo feature no G2 (corrige anomalia que trazia ep-pix)
    return graph.state.nos.filter((n) => n.tipo === 'feature')
  }
  if (props.id === 'G3') {
    return graph.state.nos.filter((n) => n.tipo === 'feature')
  }
  if (props.id === 'G4') {
    return graph.state.nos.filter((n) => n.tipo === 'pbi')
  }
  if (props.id === 'G5') {
    return graph.state.nos.filter((n) => n.tipo === 'pbi' || n.tipo === 'feature')
  }
  return graph.state.nos.filter((n) => n.gate === props.id)
})

const alvoId = ref(typeof route.query.alvo === 'string' ? route.query.alvo : '')
const resultado = ref('')
const sessaoAiAberta = ref(true)
const mensagemSolicitacao = ref('')
const motivoNegacao = ref('')
const solicitacaoNegandoId = ref<string | null>(null)

// Auto-seleciona primeiro alvo se vazio
watch(
  alvos,
  (novos) => {
    if (!alvoId.value && novos.length > 0) {
      alvoId.value = novos[0].id
    }
  },
  { immediate: true }
)

const objetoAlvo = computed(() => (alvoId.value ? graph.noPorId(alvoId.value) ?? null : null))

const pendenciasCount = computed(() => {
  if (!objetoAlvo.value) return 0
  const ev = avaliarGate(objetoAlvo.value, graph.waivers)
  return ev.checks.filter((c) => !c.ok).length
})

// Solicitações pendentes para este Gate
const solicitacoesDesteGate = computed(() => gates.pendentesPorGate(props.id as GateId))
const temSolicitacaoPendenteAlvo = computed(() => gates.temSolicitacaoPendente(props.id as GateId, alvoId.value))

// Permissões do usuário logado
const permitidos = computed(() => aprovadoresDoGate(props.id as GateId))
const podeAprovar = computed(() => {
  if (!users.currentUser) return false
  return permitidos.value.includes(users.currentUser.papel)
})

// SoD: verifica se usuário é o proponente / owner
const ehProponente = computed(() => {
  if (!users.currentUser || !objetoAlvo.value) return false
  return objetoAlvo.value.owner === users.currentUser.id
})

function aprovar() {
  if (bloqueado.value) {
    resultado.value = motivoBloqueio.value
    return
  }
  if (!alvoId.value) {
    resultado.value = 'Selecione o objeto do gate.'
    return
  }
  // Segregação de Funções (SoD) fim-a-fim: passa proponenteId = owner do objeto
  const proponenteId = objetoAlvo.value?.owner ?? ''
  const r = gates.aprovarGate(props.id as GateId, alvoId.value, proponenteId)
  resultado.value = r.motivo
}

function solicitarApprove() {
  if (bloqueado.value) {
    mensagemSolicitacao.value = motivoBloqueio.value
    return
  }
  if (!alvoId.value) {
    mensagemSolicitacao.value = 'Selecione um objeto para solicitar aprovação.'
    return
  }
  const solicitanteId = users.currentUser?.id || 'u-dev'
  const r = gates.solicitarApprove(props.id as GateId, alvoId.value, solicitanteId)
  mensagemSolicitacao.value = r.motivo
}

function aprovarSolicitacao(solId: string) {
  if (!users.currentUser) return
  const r = gates.decidirSolicitacao(solId, true, users.currentUser.id)
  resultado.value = r.motivo
}

function iniciarNegacao(solId: string) {
  solicitacaoNegandoId.value = solId
  motivoNegacao.value = ''
}

function confirmarNegacao(solId: string) {
  if (!users.currentUser) return
  const r = gates.decidirSolicitacao(solId, false, users.currentUser.id, motivoNegacao.value || 'Solicitação rejeitada na revisão.')
  resultado.value = r.motivo
  solicitacaoNegandoId.value = null
  motivoNegacao.value = ''
}

function cancelarNegacao() {
  solicitacaoNegandoId.value = null
  motivoNegacao.value = ''
}

function abrirNoCanvas() {
  const id = alvoId.value || alvos.value[0]?.id
  if (!id) return
  graph.selecionar(id)
  router.push(`/canvas?view=canvas&selecionado=${id}`)
}

function corrigirNoObjeto(id: string) {
  graph.selecionar(id)
  router.push(`/canvas?view=canvas&selecionado=${id}&tab=texto`)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Topbar do Gate -->
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold">Gate {{ props.id }}</h1>
      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-btn border border-nexo-primary/40 bg-nexo-primary/10 px-3 py-1.5 text-sm font-semibold text-nexo-primary hover:bg-nexo-primary/20 transition-colors"
          @click="sessaoAiAberta = !sessaoAiAberta"
        >
          <LucideIcon name="sparkles" :size="14" />
          {{ sessaoAiAberta ? 'Ocultar IA' : 'Sessão IA' }}
          <span
            v-if="pendenciasCount > 0"
            class="ml-0.5 rounded-full bg-nexo-blocked px-1.5 py-0.2 text-[10px] font-bold text-white"
          >
            {{ pendenciasCount }}
          </span>
        </button>
        <button
          type="button"
          class="rounded-btn border border-nexo-border px-3 py-1.5 text-sm hover:bg-nexo-surface"
          @click="abrirNoCanvas()"
        >
          Abrir no Canvas
        </button>
        <RouterLink
          :to="{ path: '/studio-full', query: { from: `gates/${props.id}` } }"
          class="rounded-btn border border-nexo-border px-3 py-1.5 text-sm hover:bg-nexo-surface"
        >
          Abrir Studio
        </RouterLink>
      </div>
    </div>

    <p v-if="gate" class="text-sm text-nexo-muted">
      {{ gate.titulo }} · {{ gate.status }}<span v-if="gate.baselineVersao"> · baseline v{{ gate.baselineVersao }} por {{ gate.aprovadoPor }}</span>
    </p>
    <p v-else class="text-sm text-nexo-blocked">Gate desconhecido.</p>

    <!-- Split view: Checklist & Governança à esquerda + Sessão IA à direita -->
    <div class="flex flex-col lg:flex-row items-start gap-6">
      <div class="flex-1 min-w-0 space-y-4 w-full">
        <BlockedReason
          v-if="bloqueado"
          :gate-id="props.id as GateId"
          :anterior-id="anterior"
          :motivo="motivoBloqueio"
          :anterior-titulo="anterior ? (gates.gates.find((g) => g.id === anterior)?.titulo ?? '') : ''"
        />

        <!-- Seletor de Objeto e Ação de Solicitar Approve -->
        <div class="rounded-card border border-nexo-border bg-white p-3.5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-sm font-semibold text-nexo-text">
              Objeto do gate:
              <select v-model="alvoId" class="rounded-btn border border-nexo-border px-2.5 py-1.5 bg-white text-xs font-normal">
                <option value="">(selecionar)</option>
                <option v-for="n in alvos" :key="n.id" :value="n.id">
                  {{ n.titulo }} ({{ n.status }} v{{ n.versao }})
                </option>
              </select>
            </label>

            <!-- Botão Solicitar Approve -->
            <div class="flex items-center gap-2">
              <span v-if="temSolicitacaoPendenteAlvo" class="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-2 py-1 text-xs font-semibold">
                <LucideIcon name="clock" :size="12" /> Solicitação Pendente
              </span>
              <button
                v-else
                type="button"
                class="rounded-btn border border-nexo-primary bg-nexo-primary/10 text-nexo-primary hover:bg-nexo-primary hover:text-white px-3 py-1.5 text-xs font-semibold transition-colors"
                :disabled="bloqueado || !alvoId"
                @click="solicitarApprove()"
              >
                Solicitar approve
              </button>
            </div>
          </div>

          <p v-if="mensagemSolicitacao" class="text-xs text-nexo-primary font-medium">
            {{ mensagemSolicitacao }}
          </p>
        </div>

        <!-- Fila de Solicitações Pendentes (Governança e SoD) -->
        <div v-if="solicitacoesDesteGate.length > 0" class="rounded-card border border-amber-200 bg-amber-50/40 p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <LucideIcon name="inbox" :size="14" class="text-amber-700" />
              Fila de Solicitações Pendentes ({{ solicitacoesDesteGate.length }})
            </span>
            <span class="text-[10px] text-amber-700 font-medium">Requer aprovação de papel habilitado (SoD)</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="sol in solicitacoesDesteGate"
              :key="sol.id"
              class="rounded border border-amber-200 bg-white p-2.5 text-xs space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <div>
                  <strong class="text-nexo-text">{{ graph.noPorId(sol.alvoId)?.titulo || sol.alvoId }}</strong>
                  <span class="text-[11px] text-nexo-muted ml-1.5">por {{ sol.solicitanteId }} em {{ new Date(sol.em).toLocaleDateString() }}</span>
                </div>
                <span class="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Pendente
                </span>
              </div>

              <!-- Ações da Fila -->
              <div class="pt-1 border-t border-gray-100 flex items-center justify-between gap-2">
                <span v-if="users.currentUser?.id === sol.solicitanteId" class="text-[11px] text-amber-800 italic">
                  Você solicitou este gate. Um segundo aprovador (SoD) deve aprovar.
                </span>
                <span v-else-if="!podeAprovar" class="text-[11px] text-nexo-muted">
                  Seu papel ({{ users.currentUser?.papel }}) não pode julgar este gate. Permitidos: {{ permitidos.join(', ') }}.
                </span>
                <div v-else class="flex items-center gap-2 ml-auto">
                  <!-- Formulário de Negativa Inline -->
                  <div v-if="solicitacaoNegandoId === sol.id" class="flex items-center gap-1.5">
                    <input
                      v-model="motivoNegacao"
                      type="text"
                      placeholder="Motivo da recusa..."
                      class="rounded border border-red-300 px-2 py-1 text-xs w-48"
                    />
                    <button
                      type="button"
                      class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 font-semibold"
                      @click="confirmarNegacao(sol.id)"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      class="text-xs text-gray-500 hover:underline px-1"
                      @click="cancelarNegacao()"
                    >
                      Cancelar
                    </button>
                  </div>
                  <template v-else>
                    <button
                      type="button"
                      class="rounded-btn bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                      @click="aprovarSolicitacao(sol.id)"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      class="rounded-btn border border-red-200 text-red-700 hover:bg-red-50 px-2.5 py-1 text-xs font-semibold"
                      @click="iniciarNegacao(sol.id)"
                    >
                      Negar
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Guia Passo-a-Passo Normativo -->
        <GateGuide
          :gate-id="props.id as GateId"
          :alvo="objetoAlvo"
          :alvo-id="alvoId"
          :waivers="graph.waivers"
          @solicitar="solicitarApprove"
          @corrigir="corrigirNoObjeto"
        />

        <!-- Checklist Bloqueante em Tempo Real -->
        <div v-if="alvoId && graph.noPorId(alvoId)" class="rounded-card border border-nexo-border bg-white p-3 text-xs space-y-2">
          <p class="font-semibold text-nexo-text">Checklist bloqueante (tempo real):</p>
          <ul class="space-y-1">
            <li v-for="c in avaliarGate(graph.noPorId(alvoId)!).checks" :key="c.codigo" class="flex items-center gap-1.5">
              <LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" :class="c.ok ? 'text-green-600' : 'text-red-600'" />
              <span>{{ c.codigo }} — {{ c.descricao }} [{{ c.severidade }}]</span>
              <span v-if="!c.ok && c.severidade === 'bloqueante'">
                · <button type="button" class="text-nexo-primary underline" @click="corrigirNoObjeto(alvoId)">corrigir no objeto</button>
              </span>
              <span v-else-if="c.severidade === 'aviso' && !c.ok" class="text-amber-700"> · dispensável (ver Backlog)</span>
            </li>
          </ul>
          <div class="pt-1 border-t border-nexo-border/60 flex items-center justify-between text-nexo-muted text-[11px]">
            <span>Aprovador atual: <strong class="text-nexo-text">{{ users.currentUser?.nome }} ({{ users.currentUser?.papel }})</strong></span>
            <span v-if="ehProponente" class="text-amber-700 font-medium">Aviso SoD: Você é o owner do objeto.</span>
          </div>
        </div>

        <!-- Ação Direta de Aprovação -->
        <div>
          <button
            type="button"
            class="rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-nexo-primary/90 transition-colors"
            :disabled="bloqueado || ehProponente"
            :aria-disabled="bloqueado || ehProponente"
            :title="bloqueado ? motivoBloqueio : ehProponente ? 'Proponente não pode ser o único aprovador (SoD).' : 'Aprovar gate'"
            @click="aprovar()"
          >
            Aprovar gate
          </button>
          <span v-if="ehProponente" class="ml-3 text-xs text-amber-700 font-medium">
            (SoD: Proponente não pode aprovar diretamente; submeta solicitação para outro aprovador)
          </span>
          <p v-if="resultado" class="mt-2 text-sm" :class="resultado.includes('aprovado') ? 'text-nexo-approved font-semibold' : 'text-nexo-blocked'">
            {{ resultado }}
          </p>
        </div>

        <!-- Painel de Output Formal (Specs 05-10) -->
        <GateOutput
          :gate-id="props.id as GateId"
          :alvo="objetoAlvo"
          :gate-info="gate"
        />

        <!-- Trilha de Auditoria / Tentativas -->
        <div class="rounded-card border border-nexo-border bg-white p-3 text-xs space-y-1">
          <p class="font-semibold text-nexo-text">Tentativas (auditoria de gate):</p>
          <ul class="space-y-1 text-nexo-muted">
            <li v-for="(t, i) in gates.tentativas.filter((x) => x.gate === props.id).slice(0, 10)" :key="i">
              {{ t.em }} — {{ t.atorId }} —
              <span :class="t.ok ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'">{{ t.ok ? 'OK' : 'NEGADA' }}</span>
              — {{ t.motivo }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Coluna da Sessão IA -->
      <div v-if="sessaoAiAberta" class="w-full lg:w-[440px] shrink-0 sticky top-3">
        <GateAiSession
          :gate-id="props.id as GateId"
          :alvo-id="alvoId"
          :alvo="objetoAlvo"
          :bloqueado="bloqueado"
          :motivo-bloqueio="motivoBloqueio"
          @fechar="sessaoAiAberta = false"
          @corrigir-no-objeto="corrigirNoObjeto"
        />
      </div>
    </div>
  </div>
</template>
