import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { seedUsers } from '@/data/seed'
import { useUsers } from './useUsers'

const KEY = 'nexo.v1.studio.presence.v1'

export type AgentProvider = 'OpenAI' | 'Claude' | 'Gemini' | 'DeepSeek'
export type FeedKind = 'prompt' | 'draft' | 'join' | 'leave'

export interface AgentInfo {
  provider: AgentProvider
  model: string
}

export interface CursorState {
  frameId: string
  x: number
  y: number
}

export interface Colaborador {
  userId: string
  name: string
  initials: string
  color: string
  online: boolean
  cursor: CursorState | null
  selection: string[]
  agent: AgentInfo
}

export interface FeedEvent {
  id: string
  actorUserId: string
  kind: FeedKind
  detalhe: string
  at: number
}

export interface RegistrarEvento {
  actorUserId: string
  kind: FeedKind
  detalhe: string
  at?: number
}

// Faixa de agentes (faixa pen.dev: OpenAI/Claude/Gemini/DeepSeek). Modelos
// exibidos seguem docs/PEN-DEV.md (demo strip + placeholder Model ID).
export const AGENTES: AgentInfo[] = [
  { provider: 'OpenAI', model: 'GPT 5.6' },
  { provider: 'Claude', model: 'Claude Opus 5' },
  { provider: 'Gemini', model: 'Gemini 3 Pro' },
  { provider: 'DeepSeek', model: 'DeepSeek Chat' }
]

const CORES = ['#1D4ED8', '#0D9488', '#047857', '#B45309', '#BE123C', '#0E7490', '#4D7C0F']
const ONLINE_DEFAULT = ['u-pm', 'u-ux', 'u-dev']
const MAX_FEED = 30

interface PresencePersist {
  online: Record<string, boolean>
  agents: Record<string, AgentInfo>
  feed: FeedEvent[]
}

function hashStr(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function corDe(userId: string): string {
  const idx = seedUsers.findIndex((u) => u.id === userId)
  const i = idx >= 0 ? idx : hashStr(userId)
  return CORES[i % CORES.length]
}

export function iniciaisDe(nome: string): string {
  const partes = nomeCurto(nome).split(/\s+/).filter(Boolean)
  if (partes.length >= 2) return `${partes[0][0] ?? ''}${partes[1][0] ?? ''}`.toUpperCase()
  return (partes[0] ?? '?').slice(0, 2).toUpperCase()
}

export function nomeCurto(nome: string): string {
  return nome.replace(/\(.*?\)/g, '').trim() || nome
}

function agenteDefault(userId: string): AgentInfo {
  const idx = seedUsers.findIndex((u) => u.id === userId)
  const i = idx >= 0 ? idx : hashStr(userId)
  return AGENTES[i % AGENTES.length]
}

function loadPersist(): PresencePersist {
  const vazio: PresencePersist = { online: {}, agents: {}, feed: [] }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return vazio
    const p = JSON.parse(raw) as Partial<PresencePersist>
    return {
      online: p.online ?? {},
      agents: p.agents ?? {},
      feed: Array.isArray(p.feed) ? p.feed.slice(0, MAX_FEED) : []
    }
  } catch {
    return vazio
  }
}

export function tempoRel(at: number, agora = Date.now()): string {
  const s = Math.max(0, Math.floor((agora - at) / 1000))
  if (s < 60) return 'agora mesmo'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} dias`
}

export const usePresence = defineStore('studioPresence', () => {
  const users = useUsers()
  const saved = loadPersist()

  const online = ref<Record<string, boolean>>(saved.online)
  const agents = ref<Record<string, AgentInfo>>(saved.agents)
  // Cursores/seleção são transitórios (60fps via rAF) e não persistem.
  const cursors = ref<Record<string, CursorState | null>>({})
  const selections = ref<Record<string, string[]>>({})
  const feed = ref<FeedEvent[]>(saved.feed)

  // Defaults para usuários sem override persistido.
  for (const u of seedUsers) {
    if (!(u.id in online.value)) online.value[u.id] = ONLINE_DEFAULT.includes(u.id)
    if (!(u.id in agents.value)) agents.value[u.id] = agenteDefault(u.id)
  }

  function persist() {
    try {
      const p: PresencePersist = { online: online.value, agents: agents.value, feed: feed.value.slice(0, MAX_FEED) }
      localStorage.setItem(KEY, JSON.stringify(p))
    } catch {
      // storage cheio/bloqueado: presença segue em memória
    }
  }

  if (localStorage.getItem(KEY) == null) persist()

  const roster = computed<Colaborador[]>(() =>
    users.state.usuarios.map((u) => ({
      userId: u.id,
      name: u.nome,
      initials: iniciaisDe(u.nome),
      color: corDe(u.id),
      online: online.value[u.id] ?? false,
      cursor: cursors.value[u.id] ?? null,
      selection: selections.value[u.id] ?? [],
      agent: agents.value[u.id] ?? agenteDefault(u.id)
    }))
  )

  const onlineUsers = computed(() => roster.value.filter((c) => c.online))
  const offlineUsers = computed(() => roster.value.filter((c) => !c.online))

  function isOnline(userId: string): boolean {
    return online.value[userId] ?? false
  }

  function toggleOnline(userId: string) {
    const agoraOnline = !isOnline(userId)
    online.value[userId] = agoraOnline
    if (!agoraOnline) {
      cursors.value[userId] = null
      selections.value[userId] = []
    }
    registrarEvento({ actorUserId: userId, kind: agoraOnline ? 'join' : 'leave', detalhe: '' })
    persist()
  }

  function setCursor(userId: string, cursor: CursorState | null) {
    cursors.value[userId] = cursor
  }

  function setSelection(userId: string, selection: string[]) {
    selections.value[userId] = selection
  }

  function setAgent(userId: string, provider: AgentProvider, model: string) {
    agents.value[userId] = { provider, model }
    persist()
  }

  function agenteDe(userId: string): AgentInfo {
    return agents.value[userId] ?? agenteDefault(userId)
  }

  function registrarEvento(e: RegistrarEvento) {
    feed.value.unshift({
      id: `ev-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      actorUserId: e.actorUserId,
      kind: e.kind,
      detalhe: e.detalhe,
      at: e.at ?? Date.now()
    })
    if (feed.value.length > MAX_FEED) feed.value.length = MAX_FEED
    persist()
  }

  // Assinatura de autoria do prompt (formato alinhado com Engenheiro 2 —
  // Frente B): 'Author: Nome (Model)' na 1a linha, sem mudar o formato M3E.
  function assinaturaAutor(userId?: string): string {
    const id = userId ?? users.state.currentUserId
    const u = users.state.usuarios.find((x) => x.id === id)
    const nome = u ? nomeCurto(u.nome) : id
    return `Author: ${nome} (${agenteDe(id).model})`
  }

  function verbo(ev: FeedEvent): string {
    if (ev.kind === 'prompt') return `gerou prompt ${ev.detalhe}`.trim()
    if (ev.kind === 'draft') return `gerou rascunho ${ev.detalhe}`.trim()
    return ev.kind === 'join' ? 'entrou no Studio' : 'saiu do Studio'
  }

  function atividadeTexto(ev: FeedEvent, agora = Date.now()): string {
    const u = users.state.usuarios.find((x) => x.id === ev.actorUserId)
    const nome = u ? nomeCurto(u.nome) : ev.actorUserId
    return `${nome} · ${verbo(ev)} · ${tempoRel(ev.at, agora)}`
  }

  return {
    roster,
    onlineUsers,
    offlineUsers,
    feed,
    isOnline,
    toggleOnline,
    setCursor,
    setSelection,
    setAgent,
    agenteDe,
    registrarEvento,
    assinaturaAutor,
    atividadeTexto,
    persist
  }
})
