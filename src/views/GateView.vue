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
import PreviewModal from '@/components/studio/PreviewModal.vue'
import { montarEntradaStudio } from '@/ai/gateParaStudio'
import type { GateId, NexoObject, Feature } from '@/types/nexo'
import { seedEnquadramento } from '@/data/seed'
import { exportarFeatureWiki } from '@/utils/exportWiki'

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
const alvos = computed<NexoObject[]>(() => {
  if (props.id === 'G0') {
    const nosG0 = graph.state.nos.filter((n) => n.gate === 'G0' || n.id === 'enq-pix')
    if (nosG0.length > 0) return nosG0
    return [seedEnquadramento as NexoObject]
  }
  if (props.id === 'G1') {
    return graph.state.nos.filter((n) => n.tipo === 'epico' && n.id !== 'enq-pix' && n.gate !== 'G0')
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
    const emG5 = graph.state.nos.filter((n) => n.gate === 'G5')
    if (emG5.length > 0) return emG5
    const validados = graph.state.nos.filter((n) => (n.tipo === 'pbi' || n.tipo === 'feature') && (n.status === 'validated' || n.status === 'published'))
    if (validados.length > 0) return validados
    return []
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

const objetoAlvo = computed(() => {
  if (alvoId.value) {
    const no = graph.noPorId(alvoId.value)
    if (no) return no
    if (props.id === 'G0' && alvoId.value === 'enq-pix') return seedEnquadramento as NexoObject
  }
  return null
})

const pendenciasCount = computed(() => {
  if (!objetoAlvo.value) return 0
  const ev = avaliarGate(objetoAlvo.value, graph.waivers, props.id as GateId)
  return ev.checks.filter((c) => !c.ok).length
})

const checklistAlvo = computed(() => {
  if (!objetoAlvo.value) return []
  return avaliarGate(objetoAlvo.value, graph.waivers, props.id as GateId).checks
})

const codigosFaltantes = computed(() => checklistAlvo.value.filter((c) => !c.ok).map((c) => c.codigo))

// Solicitações pendentes para este Gate
const solicitacoesDesteGate = computed(() => gates.pendentesPorGate(props.id as GateId))
const temSolicitacaoPendenteAlvo = computed(() => gates.temSolicitacaoPendente(props.id as GateId, alvoId.value))

// Todas as solicitações aguardando julgamento pelo usuário atual
const solicitacoesAguardandoJulgamento = computed(() => gates.solicitacoesAguardandoMeuJulgamento)

function selecionarAlvoSolicitacao(solAlvoId: string, solGateId?: GateId) {
  // Item C FIXTIPOS: propaga query modo=wizard (projeto existente) nos router.push
  const modo = route.query.modo === 'wizard' ? { modo: 'wizard' } : {}
  if (solGateId && solGateId !== props.id) {
    router.push({ path: `/gates/${solGateId}`, query: modo })
    return
  }
  alvoId.value = solAlvoId
}

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
  // Item C FIXTIPOS: preserva query atual (modo=wizard) nos router.push
  const q = route.query.modo === 'wizard' ? '&modo=wizard' : ''
  if (!id) {
    router.push(`/canvas?view=canvas${q}`)
    return
  }
  graph.selecionar(id)
  router.push(`/canvas?view=canvas&selecionado=${id}${q}`)
}

function corrigirNoObjeto(id: string) {
  graph.selecionar(id)
  // Item C FIXTIPOS: preserva query atual (modo=wizard) nos router.push
  const q = route.query.modo === 'wizard' ? '&modo=wizard' : ''
  router.push(`/canvas?view=canvas&selecionado=${id}&tab=texto${q}`)
}

function abrirStudioParaFeature() {
  const id = alvoId.value || alvos.value[0]?.id || ''
  // Item3 FIXGERAL-TELA: propaga query modo=wizard (padrão linhas 112/189/201)
  const query: Record<string, string> = { feature: id, from: `gates/${props.id}` }
  if (route.query.modo === 'wizard') query['modo'] = 'wizard'
  router.push({ path: '/studio-full', query })
}

// Ações W4 por feature no G2
const modalPreviewAberto = ref(false)
const previewTelaId = ref<string | null>(null)
const storyModalAberto = ref(false)

function abrirPreview(telaId?: string) {
  if (telaId) {
    previewTelaId.value = telaId
  } else {
    const fId = alvoId.value || alvos.value[0]?.id
    if (fId) {
      const vinculos = graph.telasDaFeature(fId)
      if (vinculos.length > 0) {
        previewTelaId.value = vinculos[0].telaId
      } else {
        const entrada = montarEntradaStudio(fId, graph.state.nos)
        previewTelaId.value = entrada?.telas[0]?.id ?? null
      }
    } else {
      previewTelaId.value = null
    }
  }
  modalPreviewAberto.value = true
}

function abrirVerStory() {
  storyModalAberto.value = true
}

function baixarFeatureWiki(featureId: string) {
  const wiki = exportarFeatureWiki(featureId, {
    nos: graph.state.nos,
    gates: gates.gates.map((g) => ({
      id: g.id,
      status: g.status,
      baselineVersao: g.baselineVersao,
      aprovadoPor: g.aprovadoPor ?? undefined,
      aprovadoEm: g.aprovadoEm ?? undefined
    })),
    vinculos: graph.vinculosTela,
    regras: graph.regrasValidacao
  })
  if (!wiki) return
  const blob = new Blob([wiki], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wiki-${featureId}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Topbar do Gate -->
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold">Gate {{ props.id }}</h1>
      <div
        v-if="solicitacoesAguardandoJulgamento.length > 0"
        class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs text-amber-900 font-semibold"
      >
        <span class="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
        <LucideIcon name="inbox" :size="13" class="text-amber-700" />
        {{ solicitacoesAguardandoJulgamento.length }} aguardando sua decisão
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-btn border border-nexo-primary/40 bg-nexo-primary/10 px-3 py-1.5 min-h-[32px] text-sm font-semibold text-nexo-primary hover:bg-nexo-primary/20 transition-colors"
          @click="sessaoAiAberta = !sessaoAiAberta"
        >
          <LucideIcon name="sparkles" :size="14" />
          {{ sessaoAiAberta ? 'Ocultar IA' : 'Sessão IA' }}
          <span
            v-if="pendenciasCount > 0"
            class="ml-0.5 rounded-full bg-nexo-blocked px-1.5 py-0.2 text-xs font-bold text-white"
          >
            {{ pendenciasCount }}
          </span>
        </button>
        <button
          type="button"
          class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm hover:bg-nexo-surface"
          @click="abrirNoCanvas()"
        >
          Abrir no Canvas
        </button>
      </div>
    </div>

    <p v-if="gate" class="text-sm text-nexo-muted">
      {{ gate.titulo }} · {{ gate.status }}<span v-if="gate.baselineVersao"> · baseline v{{ gate.baselineVersao }} por {{ gate.aprovadoPor }}</span>
    </p>
    <p v-else class="text-sm text-nexo-blocked">Gate desconhecido.</p>

    <!-- Notificação Visível: Solicitações Aguardando Meu Julgamento -->
    <div
      v-if="solicitacoesAguardandoJulgamento.length > 0"
      class="rounded-card border border-amber-300 bg-amber-50/90 p-3 text-xs space-y-2 shadow-sm"
    >
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 font-bold text-amber-900">
          <LucideIcon name="alert-circle" :size="15" class="text-amber-700" />
          Atenção: Você possui {{ solicitacoesAguardandoJulgamento.length }} solicitação(ões) pendente(s) aguardando sua decisão
        </span>
        <span class="text-xs text-amber-800 font-medium">Clique no item para selecionar o objeto</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in solicitacoesAguardandoJulgamento"
          :key="s.id"
          type="button"
          class="flex items-center gap-1.5 rounded bg-white px-3 py-1.5 min-h-[32px] border text-sm font-medium transition-colors hover:border-amber-400 hover:bg-amber-100/50"
          :class="s.alvoId === alvoId ? 'border-amber-500 text-amber-900 font-bold ring-1 ring-amber-400' : 'border-amber-200 text-nexo-text'"
          @click="selecionarAlvoSolicitacao(s.alvoId, s.gate)"
        >
          <span class="rounded bg-amber-200 text-amber-950 px-1 py-0.2 text-xs font-bold">{{ s.gate }}</span>
          <span>{{ graph.noPorId(s.alvoId)?.titulo || s.alvoId }}</span>
          <span class="text-xs text-nexo-muted">({{ s.solicitanteId }})</span>
        </button>
      </div>
    </div>

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
              <select v-model="alvoId" class="min-h-[32px] rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-normal text-nexo-text">
                <option value="">{{ alvos.length === 0 ? '(nenhum item elegível para este gate)' : '(selecionar)' }}</option>
                <option v-for="n in alvos" :key="n.id" :value="n.id">
                  {{ n.titulo }} ({{ n.status }} v{{ n.versao }})
                </option>
              </select>
            </label>

            <!-- Ações por Feature no Gate G2 e Botão Solicitar Approve -->
            <div class="flex items-center gap-2 flex-wrap">
              <template v-if="props.id === 'G2' && objetoAlvo && objetoAlvo.tipo === 'feature'">
                <button
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface shadow-xs transition-colors"
                  @click="abrirVerStory()"
                >
                  <LucideIcon name="file-text" :size="13" />
                  ver-story
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface shadow-xs transition-colors"
                  @click="abrirStudioParaFeature()"
                >
                  <LucideIcon name="layout" :size="13" />
                  ver-tela
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-green-600 bg-white px-3 py-1.5 text-sm font-semibold text-green-800 hover:bg-green-50 shadow-xs transition-colors"
                  @click="abrirPreview()"
                >
                  <LucideIcon name="eye" :size="13" />
                  preview
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface shadow-xs transition-colors"
                  :title="`Exportar wiki consolidada da feature ${objetoAlvo.titulo}`"
                  @click="baixarFeatureWiki(objetoAlvo.id)"
                >
                  <LucideIcon name="download" :size="13" />
                  Exportar wiki
                </button>
              </template>

              <span v-if="temSolicitacaoPendenteAlvo" class="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-2 py-1 text-xs font-semibold">
                <LucideIcon name="clock" :size="12" /> Solicitação Pendente
              </span>
              <button
                v-else
                type="button"
                class="rounded-btn border border-nexo-primary bg-nexo-primary/10 text-nexo-primary hover:bg-nexo-primary hover:text-white px-3 py-1.5 min-h-[32px] text-sm font-semibold transition-colors"
                :disabled="bloqueado || !alvoId"
                @click="solicitarApprove()"
              >
                Solicitar approve
              </button>
            </div>
          </div>

          <div v-if="props.id === 'G5' && alvos.length === 0" class="rounded border border-dashed border-nexo-border/80 bg-nexo-canvas/40 p-4 text-center space-y-2">
            <p class="text-xs font-semibold text-nexo-text">Nenhum pacote de entrega pronto para o Gate G5</p>
            <p class="text-[11px] text-nexo-muted max-w-md mx-auto">
              O Gate G5 valida a Definition of Done (DoD) de itens que completaram o ciclo nos gates anteriores (G0 a G4). Para qualificar um entregável sem mocks, selecione uma Feature ou PBI no Canvas e promova seu status para 'validated' ou vincule o nó ao Gate G5.
            </p>
            <div class="pt-1">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-btn bg-nexo-primary text-white hover:bg-nexo-primary/90 transition-colors"
                @click="abrirNoCanvas()"
              >
                <LucideIcon name="external-link" :size="13" />
                Criar / Promover item no Canvas
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
            <span class="text-xs text-amber-700 font-medium">Requer aprovação de papel habilitado (SoD)</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="sol in solicitacoesDesteGate"
              :key="sol.id"
              class="rounded border bg-white p-2.5 text-xs space-y-1.5 transition-colors"
              :class="users.currentUser?.id !== sol.solicitanteId && podeAprovar ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/20' : 'border-amber-200'"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="font-bold text-nexo-text hover:text-nexo-primary hover:underline text-left cursor-pointer"
                    title="Clique para selecionar este objeto no Gate"
                    @click="selecionarAlvoSolicitacao(sol.alvoId)"
                  >
                    {{ graph.noPorId(sol.alvoId)?.titulo || sol.alvoId }}
                  </button>
                  <span class="text-xs text-nexo-muted">por {{ sol.solicitanteId }} em {{ new Date(sol.em).toLocaleDateString() }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="users.currentUser?.id !== sol.solicitanteId && podeAprovar"
                    class="rounded bg-amber-600 text-white px-1.5 py-0.2 text-xs font-bold uppercase"
                  >
                    Aguardando sua decisão
                  </span>
                  <span class="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold uppercase">
                    Pendente
                  </span>
                </div>
              </div>

              <!-- Ações da Fila -->
              <div class="pt-1 border-t border-gray-100 flex items-center justify-between gap-2">
                <span v-if="users.currentUser?.id === sol.solicitanteId" class="text-xs text-amber-800 italic">
                  Você solicitou este gate. Um segundo aprovador (SoD) deve aprovar.
                </span>
                <span v-else-if="!podeAprovar" class="text-xs text-nexo-muted">
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
                      class="rounded bg-red-600 px-3 py-1.5 min-h-[32px] text-sm text-white hover:bg-red-700 font-semibold"
                      @click="confirmarNegacao(sol.id)"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      class="text-sm text-gray-500 hover:underline px-2 py-1.5 min-h-[32px]"
                      @click="cancelarNegacao()"
                    >
                      Cancelar
                    </button>
                  </div>
                  <template v-else>
                    <button
                      type="button"
                      class="rounded-btn bg-green-600 px-3 py-1.5 min-h-[32px] text-sm font-semibold text-white hover:bg-green-700"
                      @click="aprovarSolicitacao(sol.id)"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      class="rounded-btn border border-red-200 text-red-700 hover:bg-red-50 px-3 py-1.5 min-h-[32px] text-sm font-semibold"
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
          @abrir-studio="abrirStudioParaFeature"
        />

        <!-- Checklist Bloqueante em Tempo Real -->
        <div v-if="objetoAlvo" class="rounded-card border border-nexo-border bg-white p-3 text-xs space-y-2">
          <p class="font-semibold text-nexo-text">Checklist bloqueante (tempo real):</p>
          <ul class="space-y-1">
            <li v-for="c in checklistAlvo" :key="c.codigo" class="flex items-center gap-1.5">
              <LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" :class="c.ok ? 'text-green-600' : 'text-red-600'" />
              <span>{{ c.codigo }} — {{ c.descricao }} [{{ c.severidade }}]</span>
              <span v-if="!c.ok && c.severidade === 'bloqueante'">
                ·                 <button type="button" class="text-nexo-primary underline text-sm px-1 py-1" @click="corrigirNoObjeto(alvoId)">corrigir no objeto</button>
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
            :disabled="bloqueado || ehProponente || pendenciasCount > 0"
            :aria-disabled="bloqueado || ehProponente || pendenciasCount > 0"
            :title="bloqueado ? motivoBloqueio : ehProponente ? 'Proponente não pode ser o único aprovador (SoD).' : pendenciasCount > 0 ? `Faltam ${pendenciasCount} critérios: ${codigosFaltantes.join(', ')}` : 'Aprovar gate'"
            @click="aprovar()"
          >
            Aprovar gate
          </button>
          <span v-if="ehProponente" class="ml-3 text-xs text-amber-700 font-medium">
            (SoD: Proponente não pode aprovar diretamente; submeta solicitação para outro aprovador)
          </span>
          <span v-if="pendenciasCount > 0" class="ml-3 text-xs text-amber-700 font-medium">
            (Pendente: {{ pendenciasCount }} critérios — {{ codigosFaltantes.join(', ') }})
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
          @preview="abrirPreview"
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

        <!-- Como testar por gate (guia manual) -->
        <details class="rounded-card border border-nexo-border bg-white p-3 text-xs text-nexo-muted">
          <summary class="cursor-pointer text-sm font-semibold text-nexo-text">Como testar por gate (passo a passo manual)</summary>
          <ol class="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
            <li>Em Usuários, clique em "Usar este papel" conforme o gate: PM para G0, G1 ou G2; Arquiteto para G3; QA para G5.</li>
            <li>Abra o gate correspondente e selecione o objeto do gate no seletor.</li>
            <li>Responda as perguntas da IA no chat da Sessão IA até concluir a coleta.</li>
            <li>Verifique o progresso no checklist bloqueante e o artefato gerado no painel de saída.</li>
            <li>Clique em "Solicitar approve" e, com outro papel aprovador, julgue na fila (SoD: proponente não aprova o próprio item).</li>
          </ol>
        </details>
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

    <!-- Modal Ver-Story (Doc) do Gate G2 -->
    <div
      v-if="storyModalAberto && objetoAlvo && objetoAlvo.tipo === 'feature'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="storyModalAberto = false"
    >
      <div class="max-w-xl w-full rounded-card border border-nexo-border bg-white p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <div class="flex items-start justify-between border-b pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded bg-nexo-primary/10 px-1.5 py-0.5 text-xs font-mono font-bold text-nexo-primary">{{ objetoAlvo.id }}</span>
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">{{ objetoAlvo.gate }}</span>
              <span class="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">{{ objetoAlvo.status }}</span>
            </div>
            <h2 class="text-base font-bold text-nexo-text mt-1">{{ objetoAlvo.titulo }}</h2>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-700" @click="storyModalAberto = false">
            <LucideIcon name="x" :size="18" />
          </button>
        </div>

        <!-- Conteúdo da Story -->
        <div class="space-y-3 text-xs leading-relaxed text-nexo-text">
          <div class="rounded bg-nexo-canvas/40 p-3 border border-nexo-border/60 space-y-1">
            <p><strong class="text-nexo-primary">Como:</strong> {{ (objetoAlvo as Feature).ator || 'usuário do sistema' }}</p>
            <p><strong class="text-nexo-primary">Quero:</strong> {{ (objetoAlvo as Feature).beneficio || objetoAlvo.descricao }}</p>
            <p><strong class="text-nexo-primary">Para:</strong> {{ (objetoAlvo as Feature).gatilho || 'alcançar o objetivo planejado' }}</p>
          </div>

          <div v-if="(objetoAlvo as Feature).fluxo_feliz">
            <h4 class="font-bold text-nexo-text mb-1">Fluxo Principal (Happy Path):</h4>
            <p class="text-nexo-muted pl-2 border-l-2 border-nexo-primary">{{ (objetoAlvo as Feature).fluxo_feliz }}</p>
          </div>

          <div v-if="(objetoAlvo as Feature).alternativos && (objetoAlvo as Feature).alternativos.length > 0">
            <h4 class="font-bold text-nexo-text mb-1">Fluxos Alternativos & Exceções:</h4>
            <ul class="list-disc list-inside space-y-0.5 text-nexo-muted">
              <li v-for="(alt, idx) in (objetoAlvo as Feature).alternativos" :key="idx">{{ alt }}</li>
            </ul>
          </div>

          <div v-if="(objetoAlvo as Feature).criterios_bdd && (objetoAlvo as Feature).criterios_bdd.length > 0">
            <h4 class="font-bold text-nexo-text mb-1">Critérios de Aceite (BDD):</h4>
            <div class="space-y-2">
              <div v-for="c in (objetoAlvo as Feature).criterios_bdd" :key="c.id" class="rounded border border-nexo-border/80 p-2 bg-white space-y-0.5">
                <span class="font-mono text-xs font-bold text-nexo-primary">{{ c.id }}</span>
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
            <button
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn bg-nexo-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-nexo-primary/90"
              @click="storyModalAberto = false; abrirStudioParaFeature()"
            >
              <LucideIcon name="layout" :size="13" />
              Ver Tela no Studio
            </button>
            <button
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-green-600 bg-white px-3 py-1.5 text-sm font-semibold text-green-800 hover:bg-green-50"
              @click="storyModalAberto = false; abrirPreview()"
            >
              <LucideIcon name="eye" :size="13" />
              Preview Interativo
            </button>
            <button
              v-if="objetoAlvo"
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-slate-50"
              :title="`Exportar wiki da feature ${objetoAlvo.titulo}`"
              @click="baixarFeatureWiki(objetoAlvo.id)"
            >
              <LucideIcon name="download" :size="13" />
              Exportar wiki
            </button>
          </div>
          <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm" @click="storyModalAberto = false">
            Fechar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Preview Interativo -->
    <PreviewModal
      v-if="modalPreviewAberto"
      :inicio-id="previewTelaId"
      @fechar="modalPreviewAberto = false"
    />
  </div>
</template>
