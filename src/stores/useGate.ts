import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuditEvent, GateId } from '@/types/nexo'
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

const seed: GateInfo[] = [
  { id: 'G0', titulo: 'Enquadramento', status: 'aprovado' },
  { id: 'G1', titulo: 'Épicos', status: 'aprovado' },
  { id: 'G2', titulo: 'Features', status: 'revisao' },
  { id: 'G3', titulo: 'Arquitetura', status: 'rascunho' },
  { id: 'G4', titulo: 'PBIs', status: 'rascunho' },
  { id: 'G5', titulo: 'Entrega', status: 'rascunho' }
]

function load(): GateInfo[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as GateInfo[]
  } catch {
    // ignora e usa seed
  }
  return seed
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

function loadTent(): TentativaGate[] {
  try {
    const raw = localStorage.getItem(KEY_TENT)
    if (raw) return JSON.parse(raw) as TentativaGate[]
  } catch {
    // ignora
  }
  return []
}

export const useGate = defineStore('gate', () => {
  const gates = ref<GateInfo[]>(load())
  const tentativas = ref<TentativaGate[]>(loadTent())

  function persist() {
    try {
      const pid = useProjects().state.atualId
      if (pid) {
        localStorage.setItem(`nexo.v1.gates.${pid}`, JSON.stringify(gates.value))
        localStorage.setItem(`nexo.v1.gateAttempts.${pid}`, JSON.stringify(tentativas.value))
      }
    } catch {
      // segue com chaves legadas
    }
    localStorage.setItem(KEY, JSON.stringify(gates.value))
    localStorage.setItem(KEY_TENT, JSON.stringify(tentativas.value))
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
    gates.value = g ?? seed.map((s) => ({ ...s }))
    try {
      const raw = localStorage.getItem(`nexo.v1.gateAttempts.${pid}`)
      tentativas.value = raw ? (JSON.parse(raw) as TentativaGate[]) : []
    } catch {
      tentativas.value = []
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
    const ev = avaliarGate(alvo, graph.waivers.filter((w) => w.alvoId === alvoId).map((w) => ({ codigo: w.codigo, prazo: w.prazo })))
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

  return { gates, tentativas, persist, trocarProjeto, aprovarGate }
})
