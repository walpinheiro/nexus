import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuditEvent, GateId, SolicitacaoGate } from '@/types/nexo'
import { ORDEM_GATES, aprovadoresDoGate, avaliarGate, gateDesbloqueado } from '@/utils/gates'
import { useGraph } from '@/stores/useGraph'
import { useProjects } from '@/stores/useProjects'
import { useUsers } from '@/stores/useUsers'

const KEY = 'nexo.v1.gates'

export interface GateInfo {
  id: GateId
  titulo: string
  status: 'rascunho' | 'revisao' | 'aprovado'
  baselineVersao?: number | null
  aprovadoPor?: string | null
  aprovadoEm?: string | null
}

import { seedGates } from '@/data/seed'

const seed: GateInfo[] = seedGates

// Backfill sem perda: LS legado com G0/G1 aprovado mas sem baseline
// migra para baseline do seed (tentativas/solicitações preservadas).
function backfillBaseline(gates: GateInfo[]): GateInfo[] {
  for (const g of gates) {
    const ref = seedGates.find((s) => s.id === g.id)
    if (g.status === 'aprovado' && g.baselineVersao == null && ref?.baselineVersao != null) {
      g.baselineVersao = ref.baselineVersao
      g.aprovadoPor = g.aprovadoPor ?? ref.aprovadoPor ?? null
      g.aprovadoEm = g.aprovadoEm ?? ref.aprovadoEm ?? null
    }
  }
  return gates
}

function load(): GateInfo[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return backfillBaseline(JSON.parse(raw) as GateInfo[])
  } catch {
    // ignora e usa seed
  }
  return seed.map((s) => ({ ...s }))
}

export interface TentativaGate {
  em: string
  gate: GateId
  alvoId: string
  atorId: string
  ok: boolean
  motivo: string
}

const KEY_TENT = 'nexo.v1.gateAttempts'
const KEY_SOL = 'nexo.v1.gateRequests'

function loadTent(): TentativaGate[] {
  try {
    const raw = localStorage.getItem(KEY_TENT)
    if (raw) return JSON.parse(raw) as TentativaGate[]
  } catch {
    // ignora
  }
  return []
}

function loadSol(): SolicitacaoGate[] {
  try {
    const raw = localStorage.getItem(KEY_SOL)
    if (raw) return JSON.parse(raw) as SolicitacaoGate[]
  } catch {
    // ignora
  }
  return []
}

export const useGate = defineStore('gate', () => {
  const gates = ref<GateInfo[]>(load())
  const tentativas = ref<TentativaGate[]>(loadTent())
  const solicitacoes = ref<SolicitacaoGate[]>(loadSol())

  function persist() {
    try {
      const pid = useProjects().state.atualId
      if (pid) {
        localStorage.setItem(`nexo.v1.gates.${pid}`, JSON.stringify(gates.value))
        localStorage.setItem(`nexo.v1.gateAttempts.${pid}`, JSON.stringify(tentativas.value))
        localStorage.setItem(`nexo.v1.gateRequests.${pid}`, JSON.stringify(solicitacoes.value))
      }
    } catch {
      // segue com chaves legadas
    }
    localStorage.setItem(KEY, JSON.stringify(gates.value))
    localStorage.setItem(KEY_TENT, JSON.stringify(tentativas.value))
    localStorage.setItem(KEY_SOL, JSON.stringify(solicitacoes.value))
  }

  if (localStorage.getItem(KEY) == null) persist()

  function trocarProjeto(pid: string): void {
    const g = (() => {
      try {
        const raw = localStorage.getItem(`nexo.v1.gates.${pid}`)
        if (raw) return JSON.parse(raw) as GateInfo[]
      } catch {
        // usa seed
      }
      return null
    })()
    gates.value = g ? backfillBaseline(g) : seed.map((s) => ({ ...s }))
    try {
      const raw = localStorage.getItem(`nexo.v1.gateAttempts.${pid}`)
      tentativas.value = raw ? (JSON.parse(raw) as TentativaGate[]) : []
    } catch {
      tentativas.value = []
    }
    try {
      const raw = localStorage.getItem(`nexo.v1.gateRequests.${pid}`)
      solicitacoes.value = raw ? (JSON.parse(raw) as SolicitacaoGate[]) : []
    } catch {
      solicitacoes.value = []
    }
    persist()
  }

  function negar(gateId: GateId, alvoId: string, atorId: string, motivo: string): { ok: boolean; motivo: string } {
    tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId, ok: false, motivo })
    persist()
    return { ok: false, motivo }
  }

  function aprovarGate(gateId: GateId, alvoId: string, proponenteId?: string): { ok: boolean; motivo: string } {
    const graph = useGraph()
    const users = useUsers()
    const ator = users.currentUser
    const alvo = graph.noPorId(alvoId)
    if (!ator) return { ok: false, motivo: 'Nenhum usuário atual selecionado.' }
    if (!alvo) return { ok: false, motivo: 'Objeto alvo não encontrado.' }
    // (1) sequencial primeiro — DELTA Passo 2
    if (!gateDesbloqueado(gateId, gates.value)) {
      const idx = ORDEM_GATES.indexOf(gateId)
      const ant = idx > 0 ? ORDEM_GATES[idx - 1] : null
      const motivo = ant
        ? `Gate ${gateId} bloqueado: aprove ${ant} primeiro (baseline não registrada).`
        : `Gate ${gateId} bloqueado.`
      const r = negar(gateId, alvoId, ator.id, motivo)
      const ev: AuditEvent = { id: `a-${Date.now()}`, em: new Date().toISOString(), ator_id: ator.id, acao: 'GateDenied', alvo_id: alvoId, detalhe: motivo }
      graph.audit.unshift(ev)
      graph.persist()
      return r
    }
    const permitidos = aprovadoresDoGate(gateId)
    if (!permitidos.includes(ator.papel)) {
      const motivo = `${ator.nome} (${ator.papel}) não pode aprovar ${gateId}; permitido: ${permitidos.join(', ')}.`
      tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId: ator.id, ok: false, motivo })
      const ev: AuditEvent = { id: `a-${Date.now()}`, em: new Date().toISOString(), ator_id: ator.id, acao: 'GateDenied', alvo_id: alvoId, detalhe: motivo }
      graph.audit.unshift(ev)
      persist()
      graph.persist()
      return { ok: false, motivo }
    }
    if (proponenteId && proponenteId === ator.id) {
      const motivo = 'Proponente não pode ser o único aprovador; chame um segundo aprovador do gate.'
      tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId: ator.id, ok: false, motivo })
      persist()
      return { ok: false, motivo }
    }
    const ev = avaliarGate(alvo, graph.waivers.filter((w) => w.alvoId === alvoId).map((w) => ({ codigo: w.codigo, prazo: w.prazo })), gateId)
    if (!ev.bloqueantesOk) {
      const motivo = `Checklist bloqueante incompleto: ${ev.bloqueantesFaltando.join(', ')}.`
      tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId: ator.id, ok: false, motivo })
      persist()
      return { ok: false, motivo }
    }
    // aprova: baseline = versão atual, status approved
    graph.aplicarStatus(alvoId, 'approved', ator.id)
    const g = gates.value.find((x) => x.id === gateId)
    if (g) {
      g.status = 'aprovado'
      g.baselineVersao = graph.noPorId(alvoId)?.versao ?? null
      g.aprovadoPor = ator.id
      g.aprovadoEm = new Date().toISOString()
    }
    tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId: ator.id, ok: true, motivo: `Aprovado; baseline v${g?.baselineVersao}.` })
    graph.registrar('GateApproved', `${gateId} aprovado para "${alvo.titulo}" por ${ator.nome}`, alvoId, ator.id)
    persist()
    return { ok: true, motivo: `Gate ${gateId} aprovado; baseline registrada.` }
  }

  function solicitarApprove(
    gateId: GateId,
    alvoId: string,
    solicitanteId: string
  ): { ok: boolean; motivo: string; solicitacao?: SolicitacaoGate } {
    const graph = useGraph()
    const alvo = graph.noPorId(alvoId)
    if (!alvo) {
      return { ok: false, motivo: 'Objeto alvo não encontrado.' }
    }

    if (!gateDesbloqueado(gateId, gates.value)) {
      const idx = ORDEM_GATES.indexOf(gateId)
      const ant = idx > 0 ? ORDEM_GATES[idx - 1] : null
      const motivo = ant
        ? `Gate ${gateId} bloqueado: aprove ${ant} primeiro (baseline não registrada).`
        : `Gate ${gateId} bloqueado.`
      return { ok: false, motivo }
    }

    const duplicada = solicitacoes.value.find(
      (s) => s.gate === gateId && s.alvoId === alvoId && s.status === 'pendente'
    )
    if (duplicada) {
      return { ok: false, motivo: 'Já existe uma solicitação pendente para este objeto e gate.' }
    }

    const nova: SolicitacaoGate = {
      id: `sol-gate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gate: gateId,
      alvoId,
      solicitanteId,
      em: new Date().toISOString(),
      status: 'pendente'
    }

    solicitacoes.value.unshift(nova)

    const g = gates.value.find((x) => x.id === gateId)
    if (g && g.status === 'rascunho') {
      g.status = 'revisao'
    }

    graph.registrar(
      'GateApprovalRequested',
      `Solicitação de aprovação de ${gateId} para "${alvo.titulo}" criada por ${solicitanteId}`,
      alvoId,
      solicitanteId
    )

    persist()
    return { ok: true, motivo: 'Solicitação de aprovação submetida com sucesso.', solicitacao: nova }
  }

  function decidirSolicitacao(
    solicitacaoId: string,
    aprovada: boolean,
    decisorId: string,
    motivo?: string
  ): { ok: boolean; motivo: string } {
    const solicitacao = solicitacoes.value.find((s) => s.id === solicitacaoId)
    if (!solicitacao) {
      return { ok: false, motivo: 'Solicitação não encontrada.' }
    }
    if (solicitacao.status !== 'pendente') {
      return { ok: false, motivo: `Solicitação já foi ${solicitacao.status}.` }
    }

    const graph = useGraph()
    const users = useUsers()
    const decisor = users.state.usuarios.find((u) => u.id === decisorId) ?? users.currentUser
    if (!decisor) {
      return { ok: false, motivo: 'Decisor não encontrado.' }
    }

    const agora = new Date().toISOString()

    if (!aprovada) {
      const motivoFinal = motivo || 'Solicitação rejeitada pelo decisor.'
      solicitacao.status = 'negada'
      solicitacao.decididaPor = decisorId
      solicitacao.decididaEm = agora
      solicitacao.motivo = motivoFinal

      negar(solicitacao.gate, solicitacao.alvoId, decisorId, motivoFinal)
      graph.registrar('GateRequestDenied', `Solicitação de ${solicitacao.gate} negada: ${motivoFinal}`, solicitacao.alvoId, decisorId)
      persist()
      return { ok: true, motivo: motivoFinal }
    }

    // Segregação de Funções (SoD): passa o solicitanteId como proponenteId.
    const r = aprovarGate(solicitacao.gate, solicitacao.alvoId, solicitacao.solicitanteId)
    if (!r.ok) {
      return { ok: false, motivo: r.motivo }
    }

    solicitacao.status = 'aprovada'
    solicitacao.decididaPor = decisorId
    solicitacao.decididaEm = agora
    solicitacao.motivo = motivo || r.motivo

    persist()
    return { ok: true, motivo: r.motivo }
  }

  const solicitacoesPendentes = computed(() =>
    solicitacoes.value.filter((s) => s.status === 'pendente')
  )

  function pendentesPorGate(gateId: GateId): SolicitacaoGate[] {
    return solicitacoes.value.filter((s) => s.gate === gateId && s.status === 'pendente')
  }

  function pendentesPorAlvo(alvoId: string): SolicitacaoGate[] {
    return solicitacoes.value.filter((s) => s.alvoId === alvoId && s.status === 'pendente')
  }

  function temSolicitacaoPendente(gateId: GateId, alvoId: string): boolean {
    return solicitacoes.value.some((s) => s.gate === gateId && s.alvoId === alvoId && s.status === 'pendente')
  }

  const solicitacoesAguardandoMeuJulgamento = computed(() => {
    const users = useUsers()
    const atual = users.currentUser
    if (!atual) return []
    return solicitacoes.value.filter((s) => {
      if (s.status !== 'pendente') return false
      const permitidos = aprovadoresDoGate(s.gate)
      const papelAutorizado = permitidos.includes(atual.papel)
      const naoEhProponente = s.solicitanteId !== atual.id
      return papelAutorizado && naoEhProponente
    })
  })

  return {
    gates,
    tentativas,
    solicitacoes,
    solicitacoesPendentes,
    solicitacoesAguardandoMeuJulgamento,
    pendentesPorGate,
    pendentesPorAlvo,
    temSolicitacaoPendente,
    persist,
    trocarProjeto,
    aprovarGate,
    solicitarApprove,
    decidirSolicitacao
  }
})
