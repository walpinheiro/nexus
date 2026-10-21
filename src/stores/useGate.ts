import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuditEvent, GateId, SolicitacaoGate } from '@/types/nexo'
import { ORDEM_GATES, alvosDoGate, aprovadoresDoGate, avaliarGate, gateDesbloqueado, quorumGate, segregacaoFuncoesOk } from '@/utils/gates'
import { useGraph } from '@/stores/useGraph'
import { useProjects } from '@/stores/useProjects'
import { useUsers } from '@/stores/useUsers'

const KEY = 'nexo.v1.gates'

export interface GateInfo {
  id: GateId
  titulo: string
  status: 'rascunho' | 'revisao' | 'aprovado'
  baselineVersao?: number | null
  baselineAlvoId?: string | null
  aprovadoPor?: string | null
  aprovadoEm?: string | null
}

import { seedEnquadramento, seedGates, seedProjeto } from '@/data/seed'

const seed: GateInfo[] = seedGates

// Backfill sem perda: LS legado com G0/G1 aprovado mas sem baseline
// migra para baseline do seed (tentativas/solicitações preservadas).
function backfillBaseline(gates: GateInfo[]): GateInfo[] {
  for (const g of gates) {
    const ref = seedGates.find((s) => s.id === g.id)
    if (g.status === 'aprovado' && ref) {
      if (g.baselineVersao == null && ref.baselineVersao != null) g.baselineVersao = ref.baselineVersao
      g.baselineAlvoId = g.baselineAlvoId ?? ref.baselineAlvoId ?? null
      // Dados legados do projeto de demonstração apontavam G1 para o alvo G0
      // (enq-pix), embora as features filhas pertençam ao épico refinado ep-pix.
      // Corrige somente essa associação conhecida do seed; projetos reais nunca
      // inferem ou fabricam uma baseline ausente.
      if (g.id === 'G1' && g.baselineAlvoId === seedEnquadramento.id && ref.baselineAlvoId) {
        g.baselineAlvoId = ref.baselineAlvoId
      }
      g.aprovadoPor = g.aprovadoPor ?? ref.aprovadoPor ?? null
      g.aprovadoEm = g.aprovadoEm ?? ref.aprovadoEm ?? null
    }
  }
  return gates
}

function gatesVazios(): GateInfo[] {
  return seed.map((g) => ({ ...g, status: 'rascunho', baselineVersao: null, baselineAlvoId: null, aprovadoPor: null, aprovadoEm: null }))
}

function load(projectId: string): GateInfo[] {
  try {
    const scoped = localStorage.getItem(`${KEY}.${projectId}`)
    if (scoped) return projectId === seedProjeto.id ? backfillBaseline(JSON.parse(scoped) as GateInfo[]) : JSON.parse(scoped) as GateInfo[]
    if (projectId === seedProjeto.id) {
      const raw = localStorage.getItem(KEY)
      if (raw) return backfillBaseline(JSON.parse(raw) as GateInfo[])
    }
  } catch {
    // ignora e usa seed
  }
  return projectId === seedProjeto.id ? seed.map((s) => ({ ...s })) : gatesVazios()
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

function loadTent(projectId: string): TentativaGate[] {
  try {
    const raw = localStorage.getItem(`${KEY_TENT}.${projectId}`) ?? (projectId === seedProjeto.id ? localStorage.getItem(KEY_TENT) : null)
    if (raw) return JSON.parse(raw) as TentativaGate[]
  } catch {
    // ignora
  }
  return []
}

function loadSol(projectId: string): SolicitacaoGate[] {
  try {
    const raw = localStorage.getItem(`${KEY_SOL}.${projectId}`) ?? (projectId === seedProjeto.id ? localStorage.getItem(KEY_SOL) : null)
    if (raw) return JSON.parse(raw) as SolicitacaoGate[]
  } catch {
    // ignora
  }
  return []
}

export const useGate = defineStore('gate', () => {
  const initialProjectId = useProjects().state.atualId
  const gates = ref<GateInfo[]>(load(initialProjectId))
  const tentativas = ref<TentativaGate[]>(loadTent(initialProjectId))
  const solicitacoes = ref<SolicitacaoGate[]>(loadSol(initialProjectId))

  function currentUserInProject(): boolean {
    const user = useUsers().currentUser
    const pid = useProjects().state.atualId
    if (!user || !pid) return false
    const projectIds = Array.isArray(user.projeto_ids) ? user.projeto_ids : []
    return projectIds.includes(pid) || (pid === seedProjeto.id && projectIds.length === 0)
  }

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
    if (useProjects().state.atualId === seedProjeto.id) {
      localStorage.setItem(KEY, JSON.stringify(gates.value))
      localStorage.setItem(KEY_TENT, JSON.stringify(tentativas.value))
      localStorage.setItem(KEY_SOL, JSON.stringify(solicitacoes.value))
    }
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
    gates.value = g ? (pid === seedProjeto.id ? backfillBaseline(g) : g) : pid === seedProjeto.id ? seed.map((s) => ({ ...s })) : gatesVazios()
    try {
      const raw = localStorage.getItem(`nexo.v1.gateAttempts.${pid}`) ?? (pid === seedProjeto.id ? localStorage.getItem(KEY_TENT) : null)
      tentativas.value = raw ? (JSON.parse(raw) as TentativaGate[]) : []
    } catch {
      tentativas.value = []
    }
    try {
      const raw = localStorage.getItem(`nexo.v1.gateRequests.${pid}`) ?? (pid === seedProjeto.id ? localStorage.getItem(KEY_SOL) : null)
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
    const projects = useProjects()
    const ator = users.currentUser
    if (proponenteId !== '__quorum__') return { ok: false, motivo: 'A aprovação requer quorum registrado na solicitação.' }
    const alvo = graph.noPorId(alvoId)
    if (!ator) return { ok: false, motivo: 'Nenhum usuário atual selecionado.' }
    if (!alvo) return { ok: false, motivo: 'Objeto alvo não encontrado.' }
    if (alvo.project_id !== projects.state.atualId) return { ok: false, motivo: 'Objeto pertence a outro projeto.' }
    if (!alvosDoGate(gateId, graph.state.nos, gates.value).some((n) => n.id === alvoId)) {
      return { ok: false, motivo: `Objeto não é elegível para aprovação no ${gateId}.` }
    }
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
    const solic = solicitacoes.value.find((s) => s.gate === gateId && s.alvoId === alvoId && s.status === 'pendente')
    if (!solic || solic.versaoAlvo !== alvo.versao) return { ok: false, motivo: 'Solicitação ausente ou desatualizada para a versão do alvo.' }
    if (!segregacaoFuncoesOk(alvo.owner, solic.solicitanteId, ator.id)) {
      const motivo = 'Owner ou solicitante não pode aprovar a própria proposta; chame um segundo aprovador habilitado.'
      tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId: ator.id, ok: false, motivo })
      persist()
      return { ok: false, motivo }
    }
    const ev = avaliarGate(alvo, graph.waivers.filter((w) => w.alvoId === alvoId).map((w) => ({ codigo: w.codigo, prazo: w.prazo })), gateId, graph.state.nos)
    if (!ev.bloqueantesOk) {
      const motivo = `Gate ${gateId} bloqueado: checklist bloqueante incompleto (${ev.bloqueantesFaltando.join(', ')}).`
      tentativas.value.unshift({ em: new Date().toISOString(), gate: gateId, alvoId, atorId: ator.id, ok: false, motivo })
      const evAudit: AuditEvent = { id: `a-${Date.now()}`, em: new Date().toISOString(), ator_id: ator.id, acao: 'GateDenied', alvo_id: alvoId, detalhe: motivo }
      graph.audit.unshift(evAudit)
      persist()
      graph.persist()
      return { ok: false, motivo }
    }
    // aprova: baseline = versão atual, status approved
    if (!graph.aplicarStatusGate(alvoId, ator.id)) return { ok: false, motivo: 'Falha ao registrar status aprovado para este alvo.' }
    const g = gates.value.find((x) => x.id === gateId)
    if (g) {
      g.status = 'aprovado'
      g.baselineVersao = graph.noPorId(alvoId)?.versao ?? null
      g.baselineAlvoId = alvoId
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
    const users = useUsers()
    const projects = useProjects()
    const alvo = graph.noPorId(alvoId)
    if (!alvo) {
      return { ok: false, motivo: 'Objeto alvo não encontrado.' }
    }
    if (alvo.project_id !== projects.state.atualId) return { ok: false, motivo: 'Objeto pertence a outro projeto.' }
    if (!currentUserInProject()) return { ok: false, motivo: 'Usuário não está associado ao projeto atual.' }
    if (!users.currentUser || users.currentUser.id !== solicitanteId) return { ok: false, motivo: 'Solicitante não corresponde ao usuário atual.' }
    if (!alvosDoGate(gateId, graph.state.nos, gates.value).some((n) => n.id === alvoId)) {
      return { ok: false, motivo: `Objeto não é elegível para solicitar aprovação no ${gateId}.` }
    }

    if (!gateDesbloqueado(gateId, gates.value)) {
      const idx = ORDEM_GATES.indexOf(gateId)
      const ant = idx > 0 ? ORDEM_GATES[idx - 1] : null
      const motivo = ant
        ? `Gate ${gateId} bloqueado: aprove ${ant} primeiro (baseline não registrada).`
        : `Gate ${gateId} bloqueado.`
      return { ok: false, motivo }
    }

    // Solicitação antiga deixa de bloquear uma nova quando o artefato evolui.
    for (const antiga of solicitacoes.value.filter((s) => s.gate === gateId && s.alvoId === alvoId && s.status === 'pendente' && s.versaoAlvo !== alvo.versao)) {
      antiga.status = 'negada'
      antiga.motivo = 'Solicitação expirada: a versão do alvo mudou.'
      graph.registrar('GateRequestExpired', antiga.motivo, alvoId, solicitanteId)
    }
    const duplicada = solicitacoes.value.find(
      (s) => s.gate === gateId && s.alvoId === alvoId && s.status === 'pendente' && s.versaoAlvo === alvo.versao
    )
    if (duplicada) {
      persist()
      return { ok: false, motivo: 'Já existe uma solicitação pendente para este objeto e gate.' }
    }

    const nova: SolicitacaoGate = {
      id: `sol-gate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gate: gateId,
      alvoId,
      solicitanteId,
      em: new Date().toISOString(),
      status: 'pendente',
      versaoAlvo: alvo.versao,
      aprovacoes: []
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
    const decisor = users.currentUser
    if (!decisor || decisor.id !== decisorId) {
      return { ok: false, motivo: 'Decisor não encontrado.' }
    }
    if (!currentUserInProject()) return { ok: false, motivo: 'Usuário não está associado ao projeto atual.' }

    const agora = new Date().toISOString()
    const alvo = graph.noPorId(solicitacao.alvoId)
    if (!alvo || alvo.project_id !== useProjects().state.atualId || alvo.versao !== solicitacao.versaoAlvo) {
      return { ok: false, motivo: 'Alvo ausente, fora do projeto atual ou alterado; solicite revisão novamente.' }
    }
    if (!segregacaoFuncoesOk(alvo.owner, solicitacao.solicitanteId, decisor.id)) return { ok: false, motivo: 'Owner ou solicitante não pode aprovar a própria proposta.' }

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

    if (!aprovadoresDoGate(solicitacao.gate).includes(decisor.papel)) {
      return { ok: false, motivo: `Papel ${decisor.papel} não pode aprovar ${solicitacao.gate}.` }
    }

    const validacao = avaliarGate(alvo, graph.waivers.filter((w) => w.alvoId === alvo.id).map((w) => ({ codigo: w.codigo, prazo: w.prazo })), solicitacao.gate, graph.state.nos)
    if (!validacao.bloqueantesOk) return { ok: false, motivo: `Checklist incompleto; não foi registrado voto. Faltam: ${validacao.bloqueantesFaltando.join(', ')}.` }

    const votes = solicitacao.aprovacoes ?? (solicitacao.aprovacoes = [])
    if (votes.some((v) => v.usuarioId === decisorId || v.papel === decisor.papel)) return { ok: false, motivo: 'Este usuário ou papel já votou nesta solicitação.' }
    votes.push({ usuarioId: decisorId, papel: decisor.papel, em: agora, versao: alvo.versao, motivo })
    const faltam = quorumGate(solicitacao.gate).filter((roles) => !roles.some((role) => votes.some((v) => v.papel === role && v.versao === alvo.versao)))
    if (faltam.length) {
      solicitacao.motivo = `Quorum parcial; faltam ${faltam.map((x) => x.join('/')).join(', ')}.`
      graph.registrar('GateVoteRecorded', `${decisor.papel} aprovou; faltam ${faltam.length} grupos obrigatórios.`, solicitacao.alvoId, decisorId)
      persist()
      return { ok: true, motivo: solicitacao.motivo }
    }
    const r = aprovarGate(solicitacao.gate, solicitacao.alvoId, '__quorum__')
    if (!r.ok) return r
    solicitacao.status = 'aprovada'; solicitacao.decididaPor = decisorId; solicitacao.decididaEm = agora; solicitacao.motivo = motivo || r.motivo
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
      const alvo = useGraph().noPorId(s.alvoId)
      if (!alvo || !currentUserInProject() || !segregacaoFuncoesOk(alvo.owner, s.solicitanteId, atual.id)) return false
      const votos = s.aprovacoes ?? []
      const grupoPendente = quorumGate(s.gate).some((grupo) => grupo.includes(atual.papel) && !grupo.some((papel) => votos.some((v) => v.papel === papel && v.versao === s.versaoAlvo)))
      const aindaNaoVotou = !votos.some((v) => v.usuarioId === atual.id || v.papel === atual.papel)
      return permitidos.includes(atual.papel) && grupoPendente && aindaNaoVotou
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
    solicitarApprove,
    decidirSolicitacao
  }
})
