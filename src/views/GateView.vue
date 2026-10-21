<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGate } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { alvosDoGate, alvosVisiveisDoGate, avaliarGate, gateAnterior, gateDesbloqueado, quorumGate } from '@/utils/gates'
import BlockedReason from '@/components/gates/BlockedReason.vue'
import GateAiSession from '@/components/gates/GateAiSession.vue'
import GateGuide from '@/components/gates/GateGuide.vue'
import GateOutput from '@/components/gates/GateOutput.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import PreviewModal from '@/components/studio/PreviewModal.vue'
import { montarEntradaStudio } from '@/ai/gateParaStudio'
import type { GateId, NexoObject, Feature } from '@/types/nexo'
import { exportarFeatureWiki } from '@/utils/exportWiki'
import { VButton, VSelect, VTextInput, VTimeline } from 'vueui-nova-kit'

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
const timelineGates = computed(() => {
  const firstOpen = gates.gates.findIndex((g) => g.status !== 'aprovado' || !g.baselineVersao)
  return gates.gates.map((g, i) => {
    const state: 'complete' | 'current' | 'upcoming' | 'error' = g.status === 'aprovado' && g.baselineVersao
      ? 'complete'
      : g.id === props.id ? (bloqueado.value ? 'error' : 'current')
        : i === firstOpen ? 'current' : 'upcoming'
    const detail = g.status === 'aprovado' && g.baselineVersao
      ? `Baseline v${g.baselineVersao}${g.aprovadoEm ? ` · ${new Date(g.aprovadoEm).toLocaleDateString()}` : ''}`
      : g.id === props.id && bloqueado.value ? `Bloqueado: ${motivoBloqueio.value}` : `Status: ${g.status}`
    return { id: g.id, title: `${g.id} · ${g.titulo}`, description: detail, time: g.aprovadoPor ? `Aprovador ${g.aprovadoPor}` : undefined, state }
  })
})

// Filtra objetos reais do projeto. A seleção de um gate nunca injeta dados seed.
const alvosElegiveis = computed<NexoObject[]>(() => alvosDoGate(props.id as GateId, graph.state.nos, gates.gates))
const alvos = computed<NexoObject[]>(() => alvosVisiveisDoGate(props.id as GateId, graph.state.nos, gates.gates))
const alvoElegivel = computed(() => !!alvoId.value && alvosElegiveis.value.some((no) => no.id === alvoId.value))
const opcoesAlvo = computed(() => alvos.value.map((no) => ({
  value: no.id,
  label: `${no.titulo} (${no.status} v${no.versao})${alvosElegiveis.value.some((eligible) => eligible.id === no.id) ? '' : ' · inspeção, baseline não vinculada'}`
})))
const motivoElegibilidade = computed(() => {
  if (alvoElegivel.value) return ''
  if (!alvosElegiveis.value.length && alvos.value.length) {
    const ant = gateAnterior(props.id as GateId)
    return ant
      ? `Alvo legado disponível para inspeção, mas não elegível para aprovação. Registre novamente a baseline vinculada em ${ant}; nenhum estado ou evidência foi alterado.`
      : 'Este alvo pode ser inspecionado, mas precisa ser associado a uma baseline válida antes da aprovação.'
  }
  return ''
})

const alvoId = ref(typeof route.query.alvo === 'string' ? route.query.alvo : '')
const resultado = ref('')
const sessaoAiAberta = ref(true)
const mensagemSolicitacao = ref('')
const motivoNegacao = ref('')
const solicitacaoNegandoId = ref<string | null>(null)

// Auto-seleciona primeiro alvo se vazio
watch(
  [alvos, () => props.id, () => route.query.alvo],
  ([novos]) => {
    const solicitado = typeof route.query.alvo === 'string' ? route.query.alvo : ''
    if (solicitado && novos.some((n) => n.id === solicitado)) {
      alvoId.value = solicitado
      return
    }
    if (!novos.some((n) => n.id === alvoId.value)) alvoId.value = novos[0]?.id ?? ''
  },
  { immediate: true }
)

const objetoAlvo = computed(() => {
  if (alvoId.value) {
    const no = graph.noPorId(alvoId.value)
    if (no) return no
  }
  return null
})

const pendenciasCount = computed(() => {
  if (!objetoAlvo.value) return 0
  const ev = avaliarGate(objetoAlvo.value, graph.waivers, props.id as GateId, graph.state.nos)
  return ev.checks.filter((c) => !c.ok).length
})

const checklistAlvo = computed(() => {
  if (!objetoAlvo.value) return []
  return avaliarGate(objetoAlvo.value, graph.waivers, props.id as GateId, graph.state.nos).checks
})

const codigosFaltantes = computed(() => checklistAlvo.value.filter((c) => !c.ok).map((c) => c.codigo))

// Solicitações pendentes para este Gate
const solicitacoesDesteGate = computed(() => gates.pendentesPorGate(props.id as GateId))
const temSolicitacaoPendenteAlvo = computed(() => gates.temSolicitacaoPendente(props.id as GateId, alvoId.value))

// Todas as solicitações aguardando julgamento pelo usuário atual
const solicitacoesAguardandoJulgamento = computed(() => gates.solicitacoesAguardandoMeuJulgamento)

function selecionarAlvoSolicitacao(solAlvoId: string, solGateId?: GateId) {
  // Item C FIXTIPOS: propaga query modo=wizard (projeto existente) nos router.push
  const modo = route.query.modo === 'wizard' ? { modo: 'wizard', alvo: solAlvoId } : { alvo: solAlvoId }
  if (solGateId && solGateId !== props.id) {
    router.push({ path: `/gates/${solGateId}`, query: modo })
    return
  }
  alvoId.value = solAlvoId
}

// Permissões do usuário logado
function usuarioPodeVotar(sol: { id: string }): boolean {
  return gates.solicitacoesAguardandoMeuJulgamento.some((item) => item.id === sol.id)
}

// SoD: verifica se usuário é o proponente / owner
const ehProponente = computed(() => {
  if (!users.currentUser || !objetoAlvo.value) return false
  return objetoAlvo.value.owner === users.currentUser.id
})

function aprovar() {
  solicitarApprove()
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

function papeisPendentes(sol: { gate: GateId; aprovacoes?: { papel: string; versao: number }[]; versaoAlvo?: number }): string[] {
  const votes = sol.aprovacoes ?? []
  return quorumGate(sol.gate).filter((group) => !group.some((role) => votes.some((vote) => vote.papel === role && vote.versao === sol.versaoAlvo))).map((group) => group.join('/'))
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

function avancarFilho() {
  const alvo = objetoAlvo.value
  const ator = users.currentUser?.id
  if (!alvo || !ator) { resultado.value = 'Selecione um alvo e um usuário atual para criar o próximo rascunho.'; return }
  if (gate.value?.status !== 'aprovado' || !gate.value.baselineVersao || alvo.versao !== gate.value.baselineVersao) { resultado.value = `Conclua o quorum e baseline desta versão do alvo em ${props.id} antes de criar o próximo item.`; return }
  if (!['approved', 'baseline'].includes(alvo.status)) { resultado.value = 'Este alvo ainda não tem aprovação própria. Selecione o item que concluiu o quorum.'; return }
  if (props.id === 'G1' && alvo.tipo === 'epico') {
    const feature = graph.criarNo({ tipo: 'feature', titulo: `Feature — ${alvo.titulo}`, descricao: '', parent_id: alvo.id }, ator)
    resultado.value = `Feature rascunho criada e vinculada ao épico: ${feature.titulo}.`
    router.push({ path: '/gates/G2', query: { alvo: feature.id } })
    return
  }
  if (props.id === 'G3' && alvo.tipo === 'feature') {
    const pbiDados: Parameters<typeof graph.criarNo>[0] & { feature_id: string; escopo_in: string[]; escopo_out: string[]; dependencias: string[]; estrategia_teste: string; criterios_bdd: never[] } = {
      tipo: 'pbi', titulo: `PBI — ${alvo.titulo}`, descricao: '', parent_id: alvo.id, feature_id: alvo.id,
      escopo_in: [], escopo_out: [], dependencias: [], estrategia_teste: '', criterios_bdd: []
    }
    const pbi = graph.criarNo(pbiDados, ator)
    resultado.value = `PBI rascunho criado e vinculado à feature. Complete os campos antes de solicitar G4.`
    router.push({ path: '/gates/G4', query: { alvo: pbi.id } })
    return
  }
  if (props.id === 'G4' && alvo.tipo === 'pbi') {
    graph.atualizarNo(alvo.id, { gate: 'G5' }, ator, 'preparou pacote de evidências G5 em rascunho')
    resultado.value = 'O mesmo PBI foi encaminhado a G5. Nenhum status de entrega ou evidência foi preenchido.'
    router.push({ path: '/gates/G5', query: { alvo: alvo.id } })
  }
}

function corrigirNoObjeto(id: string) {
  graph.selecionar(id)
  // Item C FIXTIPOS: preserva query atual (modo=wizard) nos router.push
  const q = route.query.modo === 'wizard' ? '&modo=wizard' : ''
  router.push(`/canvas?view=canvas&selecionado=${id}&tab=texto${q}`)
}

function abrirNoCanvas() {
  const id = alvoId.value || alvos.value[0]?.id
  const query: Record<string, string> = { view: 'canvas' }
  if (id) { graph.selecionar(id); query.selecionado = id }
  if (typeof route.query.modo === 'string') query.modo = route.query.modo
  router.push({ path: '/canvas', query })
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
        class="inline-flex items-center gap-1.5 rounded-full bg-nexo-stale-bg border border-nexo-stale-border px-2.5 py-0.5 text-xs text-nexo-stale font-semibold"
      >
        <span class="flex h-2 w-2 rounded-full bg-nexo-stale-accent animate-ping" />
        <LucideIcon name="inbox" :size="13" class="text-nexo-stale" />
        {{ solicitacoesAguardandoJulgamento.length }} aguardando sua decisão
      </div>
      <div class="ml-auto flex items-center gap-2">
        <VButton
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
        </VButton>
        <VButton
          type="button"
          class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm hover:bg-nexo-surface"
          @click="abrirNoCanvas()"
        >
          Abrir no Canvas
        </VButton>
      </div>
    </div>

    <p v-if="gate" class="text-sm text-nexo-muted">
      {{ gate.titulo }} · {{ gate.status }}<span v-if="gate.baselineVersao"> · baseline v{{ gate.baselineVersao }} por {{ gate.aprovadoPor }}</span>
    </p>
    <p v-else class="text-sm text-nexo-blocked">Gate desconhecido.</p>
    <details class="rounded-card border border-nexo-border bg-white px-3 py-2">
      <summary class="cursor-pointer text-sm font-semibold">Progresso dos gates G0–G5</summary>
      <VTimeline :items="timelineGates" variant="steps" size="sm" aria-label="Progresso e bloqueios dos gates">
        <template #title="{ item }">
          <RouterLink :to="`/gates/${item.id}`" class="font-medium text-nexo-primary hover:underline">{{ item.title }}</RouterLink>
        </template>
      </VTimeline>
    </details>

    <!-- Notificação Visível: Solicitações Aguardando Meu Julgamento -->
    <div
      v-if="solicitacoesAguardandoJulgamento.length > 0"
      class="rounded-card border border-nexo-stale-border bg-nexo-stale-bg/90 p-3 text-xs space-y-2 shadow-sm"
    >
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 font-bold text-nexo-stale">
          <LucideIcon name="alert-circle" :size="15" class="text-nexo-stale" />
          Atenção: Você possui {{ solicitacoesAguardandoJulgamento.length }} solicitação(ões) pendente(s) aguardando sua decisão
        </span>
        <span class="text-xs text-nexo-stale font-medium">Clique no item para selecionar o objeto</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <VButton
          v-for="s in solicitacoesAguardandoJulgamento"
          :key="s.id"
          type="button"
          class="flex items-center gap-1.5 rounded bg-white px-3 py-1.5 min-h-[32px] border text-sm font-medium transition-colors hover:border-nexo-stale-border hover:bg-nexo-stale-bg/50"
          :class="s.alvoId === alvoId ? 'border-nexo-stale-border text-nexo-stale font-bold ring-1 ring-nexo-stale-accent' : 'border-nexo-stale-border text-nexo-text'"
          @click="selecionarAlvoSolicitacao(s.alvoId, s.gate)"
        >
          <span class="rounded bg-nexo-stale-bg text-nexo-text px-1 py-0.2 text-xs font-bold">{{ s.gate }}</span>
          <span>{{ graph.noPorId(s.alvoId)?.titulo || s.alvoId }}</span>
          <span class="text-xs text-nexo-muted">({{ s.solicitanteId }})</span>
        </VButton>
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

        <div v-if="objetoAlvo && !alvoElegivel" class="rounded-card border border-nexo-stale-border bg-nexo-stale-bg p-3 text-sm text-nexo-text" role="status">
          <p class="font-semibold">Alvo histórico disponível para inspeção; aprovação bloqueada</p>
          <p class="mt-1 text-xs">{{ motivoElegibilidade || 'O alvo ainda não está vinculado à baseline aprovada desta etapa.' }} Reabra o gate anterior para revalidar a relação e registrar uma baseline associada. O checklist deste objeto não equivale a elegibilidade.</p>
          <VButton v-if="anterior" class="mt-2" variant="outline" size="sm" @click="router.push(`/gates/${anterior}`)">Revisar {{ anterior }}</VButton>
        </div>

        <!-- Seletor de objeto e ação de solicitação -->
        <div class="rounded-card border border-nexo-border bg-white p-3.5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <VSelect v-model="alvoId" :options="opcoesAlvo" label="Objeto do gate" :placeholder="alvos.length === 0 ? 'Nenhum item elegível' : 'Selecione um objeto'" size="sm" />

            <!-- Ações por Feature no Gate G2 e Botão Solicitar Approve -->
            <div class="flex items-center gap-2 flex-wrap">
              <VButton
                v-if="['G1', 'G3', 'G4'].includes(props.id) && objetoAlvo && ((props.id === 'G1' && objetoAlvo.tipo === 'epico') || (props.id === 'G3' && objetoAlvo.tipo === 'feature') || (props.id === 'G4' && objetoAlvo.tipo === 'pbi'))"
                type="button" variant="secondary" size="sm"
                :disabled="gate?.status !== 'aprovado' || !gate.baselineVersao || objetoAlvo?.versao !== gate.baselineVersao || !['approved', 'baseline'].includes(objetoAlvo?.status ?? 'draft')"
                @click="avancarFilho()"
              >
                {{ props.id === 'G1' ? 'Detalhar em feature rascunho' : props.id === 'G3' ? 'Decompor em PBI rascunho' : 'Preparar o mesmo PBI para G5' }}
              </VButton>
              <template v-if="props.id === 'G2' && objetoAlvo && objetoAlvo.tipo === 'feature'">
                <VButton
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface shadow-xs transition-colors"
                  @click="abrirVerStory()"
                >
                  <LucideIcon name="file-text" :size="13" />
                  Ver história
                </VButton>
                <VButton
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface shadow-xs transition-colors"
                  @click="abrirStudioParaFeature()"
                >
                  <LucideIcon name="layout" :size="13" />
                  Ver tela
                </VButton>
                <VButton
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-approved-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-approved hover:bg-nexo-approved-bg shadow-xs transition-colors"
                  @click="abrirPreview()"
                >
                  <LucideIcon name="eye" :size="13" />
                  preview
                </VButton>
                <VButton
                  type="button"
                  class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface shadow-xs transition-colors"
                  :title="`Exportar wiki consolidada da feature ${objetoAlvo.titulo}`"
                  @click="baixarFeatureWiki(objetoAlvo.id)"
                >
                  <LucideIcon name="download" :size="13" />
                  Exportar wiki
                </VButton>
              </template>

              <span v-if="temSolicitacaoPendenteAlvo" class="inline-flex items-center gap-1 rounded bg-nexo-stale-bg text-nexo-stale px-2 py-1 text-xs font-semibold">
                <LucideIcon name="clock" :size="12" /> Solicitação Pendente
              </span>
              <VButton
                v-else
                type="button"
                class="rounded-btn border border-nexo-primary bg-nexo-primary/10 text-nexo-primary hover:bg-nexo-primary hover:text-white px-3 py-1.5 min-h-[32px] text-sm font-semibold transition-colors"
                :disabled="bloqueado || !alvoElegivel || pendenciasCount > 0"
                @click="solicitarApprove()"
              >
                Solicitar aprovação
              </VButton>
            </div>
          </div>

          <div v-if="props.id === 'G5' && alvos.length === 0" class="rounded border border-dashed border-nexo-border/80 bg-nexo-canvas/40 p-4 text-center space-y-2">
            <p class="text-xs font-semibold text-nexo-text">Nenhum pacote de entrega pronto para o Gate G5</p>
            <p class="text-[11px] text-nexo-muted max-w-md mx-auto">O pacote G5 reutiliza o PBI aprovado em G4. Abra G4, selecione o PBI e use “Preparar o mesmo PBI para G5”; as evidências permanecem vazias até serem informadas e revisadas.</p>
            <div class="pt-1">
              <VButton
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-btn bg-nexo-primary text-white hover:bg-nexo-primary/90 transition-colors"
                @click="router.push('/gates/G4')"
              >
                <LucideIcon name="external-link" :size="13" />
                Selecionar PBI aprovado em G4
              </VButton>
            </div>
          </div>
          <div v-else-if="props.id !== 'G5' && alvos.length === 0" class="rounded-card border border-dashed border-nexo-border bg-nexo-stale-bg p-4 text-center space-y-2" role="status">
            <p class="text-sm font-semibold text-nexo-text">Nenhum objeto elegível para {{ props.id }}</p>
            <p class="text-xs text-nexo-muted">{{ props.id === 'G0' ? 'Crie ou selecione um épico de enquadramento no projeto atual.' : `Registre primeiro uma baseline vinculada no gate ${anterior}; este gate não cria alvo nem reutiliza dados de demonstração.` }}</p>
            <VButton v-if="anterior" variant="outline" size="sm" @click="router.push(`/gates/${anterior}`)">Revisar {{ anterior }}</VButton>
            <VButton v-else variant="outline" size="sm" @click="abrirNoCanvas()">Abrir Canvas do projeto</VButton>
          </div>

          <p v-if="mensagemSolicitacao" class="text-xs text-nexo-primary font-medium">
            {{ mensagemSolicitacao }}
          </p>
        </div>

        <!-- Fila de Solicitações Pendentes (Governança e SoD) -->
        <div v-if="solicitacoesDesteGate.length > 0" class="rounded-card border border-nexo-stale-border bg-nexo-stale-bg/40 p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-xs font-bold text-nexo-stale">
              <LucideIcon name="inbox" :size="14" class="text-nexo-stale" />
              Fila de Solicitações Pendentes ({{ solicitacoesDesteGate.length }})
            </span>
            <span class="text-xs text-nexo-stale font-medium">Requer aprovação de papel habilitado (SoD)</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="sol in solicitacoesDesteGate"
              :key="sol.id"
              class="rounded border bg-white p-2.5 text-xs space-y-1.5 transition-colors"
              :class="usuarioPodeVotar(sol) ? 'border-nexo-stale-border ring-1 ring-nexo-stale-accent bg-nexo-stale-bg/20' : 'border-nexo-stale-border'"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <VButton
                    type="button"
                    class="font-bold text-nexo-text hover:text-nexo-primary hover:underline text-left cursor-pointer"
                    title="Clique para selecionar este objeto no Gate"
                    @click="selecionarAlvoSolicitacao(sol.alvoId)"
                  >
                    {{ graph.noPorId(sol.alvoId)?.titulo || sol.alvoId }}
                  </VButton>
                  <span class="text-xs text-nexo-muted">por {{ sol.solicitanteId }} em {{ new Date(sol.em).toLocaleDateString() }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="usuarioPodeVotar(sol)"
                    class="rounded bg-nexo-stale text-white px-1.5 py-0.2 text-xs font-bold uppercase"
                  >
                    Aguardando sua decisão
                  </span>
                  <span class="rounded bg-nexo-stale-bg text-nexo-stale px-2 py-0.5 text-xs font-bold uppercase">
                    Pendente
                  </span>
                </div>
              </div>

              <div class="text-xs text-nexo-muted">
                Versão solicitada: v{{ sol.versaoAlvo ?? 'legada' }} · Votos: {{ sol.aprovacoes?.length ?? 0 }} · Faltam: {{ papeisPendentes(sol).join(', ') || 'nenhum' }}
              </div>

              <!-- Ações da Fila -->
              <div class="pt-1 border-t border-nexo-border flex items-center justify-between gap-2">
                <span v-if="users.currentUser?.id === sol.solicitanteId" class="text-xs text-nexo-stale italic">
                  Você solicitou esta revisão; o quorum exige votos de papéis distintos e SoD.
                </span>
                <span v-else-if="!usuarioPodeVotar(sol)" class="text-xs text-nexo-muted">
                  Votos registrados: {{ sol.aprovacoes?.map((v) => v.papel).join(', ') || 'nenhum' }}. Faltam: {{ papeisPendentes(sol).join(', ') || 'nenhum' }}.
                </span>
                <div v-else class="flex items-center gap-2 ml-auto">
                  <!-- Formulário de Negativa Inline -->
                  <div v-if="solicitacaoNegandoId === sol.id" class="flex items-center gap-1.5">
                    <VTextInput
                      v-model="motivoNegacao"
                      type="text"
                      placeholder="Motivo da recusa..."
                      label="Motivo da recusa"
                      size="sm"
                    />
                    <VButton
                      type="button"
                      class="rounded bg-nexo-blocked px-3 py-1.5 min-h-[32px] text-sm text-white hover:bg-nexo-blocked/90 font-semibold"
                      @click="confirmarNegacao(sol.id)"
                    >
                      Confirmar
                    </VButton>
                    <VButton
                      type="button"
                      class="text-sm text-nexo-muted hover:underline px-2 py-1.5 min-h-[32px]"
                      @click="cancelarNegacao()"
                    >
                      Cancelar
                    </VButton>
                  </div>
                  <template v-else>
                    <VButton
                      type="button"
                      class="rounded-btn bg-nexo-approved px-3 py-1.5 min-h-[32px] text-sm font-semibold text-white hover:bg-nexo-approved/90"
                      @click="aprovarSolicitacao(sol.id)"
                    >
                      Aprovar
                    </VButton>
                    <VButton
                      type="button"
                      class="rounded-btn border border-nexo-blocked-border text-nexo-blocked hover:bg-nexo-blocked-bg px-3 py-1.5 min-h-[32px] text-sm font-semibold"
                      @click="iniciarNegacao(sol.id)"
                    >
                      Negar
                    </VButton>
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
          :nos="graph.state.nos"
          :alvo-id="alvoId"
          :alvo-elegivel="alvoElegivel"
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
              <LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" :class="c.ok ? 'text-nexo-approved' : 'text-nexo-blocked'" />
              <span>{{ c.codigo }} — {{ c.descricao }} [{{ c.severidade }}]</span>
              <span v-if="!c.ok && c.severidade === 'bloqueante'">
                ·                 <VButton type="button" class="text-nexo-primary underline text-sm px-1 py-1" @click="corrigirNoObjeto(alvoId)">corrigir no objeto</VButton>
              </span>
              <span v-else-if="c.severidade === 'aviso' && !c.ok" class="text-nexo-stale"> · dispensável (ver Backlog)</span>
            </li>
          </ul>
          <div class="pt-1 border-t border-nexo-border/60 flex items-center justify-between text-nexo-muted text-[11px]">
            <span>Aprovador atual: <strong class="text-nexo-text">{{ users.currentUser?.nome }} ({{ users.currentUser?.papel }})</strong></span>
            <span v-if="ehProponente" class="text-nexo-stale font-medium">Você pode solicitar a revisão; seu próprio voto não contará para o quorum (SoD).</span>
          </div>
        </div>

        <!-- Ação Direta de Aprovação -->
        <div>
          <VButton
            type="button"
            class="rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-nexo-primary/90 transition-colors"
            :disabled="bloqueado || !alvoElegivel || pendenciasCount > 0"
            :aria-disabled="bloqueado || pendenciasCount > 0"
            :title="bloqueado ? motivoBloqueio : pendenciasCount > 0 ? `Faltam ${pendenciasCount} critérios: ${codigosFaltantes.join(', ')}` : 'Enviar para aprovação por quorum'"
            @click="aprovar()"
          >
            Solicitar aprovação formal
          </VButton>
          <span v-if="ehProponente" class="ml-3 text-xs text-nexo-stale font-medium">
            (A solicitação pede votos dos papéis obrigatórios; seus votos como owner/solicitante não contam.)
          </span>
          <span v-if="pendenciasCount > 0" class="ml-3 text-xs text-nexo-stale font-medium">
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
              <span :class="t.ok ? 'text-nexo-approved font-semibold' : 'text-nexo-blocked font-semibold'">{{ t.ok ? 'OK' : 'NEGADA' }}</span>
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
            <li>Clique em "Solicitar aprovação" e, com outro papel aprovador, julgue na fila (SoD: proponente não aprova o próprio item).</li>
          </ol>
        </details>
      </div>

      <!-- Coluna da Sessão IA -->
      <div v-if="sessaoAiAberta" class="w-full lg:w-[440px] shrink-0 sticky top-3">
        <GateAiSession
          :gate-id="props.id as GateId"
          :alvo-id="alvoId"
          :alvo="objetoAlvo"
          :alvo-elegivel="alvoElegivel"
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
              <span class="rounded bg-nexo-draft-bg px-1.5 py-0.5 text-xs font-medium text-nexo-draft">{{ objetoAlvo.gate }}</span>
              <span class="rounded bg-nexo-approved-bg px-1.5 py-0.5 text-xs font-medium text-nexo-approved">{{ objetoAlvo.status }}</span>
            </div>
            <h2 class="text-base font-bold text-nexo-text mt-1">{{ objetoAlvo.titulo }}</h2>
          </div>
          <VButton type="button" class="text-nexo-muted hover:text-nexo-text" @click="storyModalAberto = false">
            <LucideIcon name="x" :size="18" />
          </VButton>
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
                <p class="text-[11px]"><strong class="text-nexo-text">Dado</strong> {{ c.given }}</p>
                <p class="text-[11px]"><strong class="text-nexo-text">Quando</strong> {{ c.when }}</p>
                <p class="text-[11px]"><strong class="text-nexo-text">Então</strong> {{ c.then }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div class="flex items-center justify-between border-t pt-3">
          <div class="flex items-center gap-2">
            <VButton
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn bg-nexo-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-nexo-primary/90"
              @click="storyModalAberto = false; abrirStudioParaFeature()"
            >
              <LucideIcon name="layout" :size="13" />
              Ver Tela no Studio
            </VButton>
            <VButton
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-approved-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-approved hover:bg-nexo-approved-bg"
              @click="storyModalAberto = false; abrirPreview()"
            >
              <LucideIcon name="eye" :size="13" />
              Preview Interativo
            </VButton>
            <VButton
              v-if="objetoAlvo"
              type="button"
              class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-nexo-surface"
              :title="`Exportar wiki da feature ${objetoAlvo.titulo}`"
              @click="baixarFeatureWiki(objetoAlvo.id)"
            >
              <LucideIcon name="download" :size="13" />
              Exportar wiki
            </VButton>
          </div>
          <VButton type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm" @click="storyModalAberto = false">
            Fechar
          </VButton>
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
