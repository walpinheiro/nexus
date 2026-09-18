import { computed } from 'vue'
import { usePresence, AGENTES, type AgentProvider, type Colaborador, type FeedEvent } from '@/stores/studioPresence'
import { useUsers } from '@/stores/useUsers'

export type StudioProvider = AgentProvider

export interface StudioAuthor {
  userId: string
  name: string
  initials: string
  color: string
  role?: string
  provider: StudioProvider
  model: string
  online?: boolean
  screenId?: string
}

// Extrai a tela atual do usuário a partir do feed da presence (mesmo formato
// lido por PresenceAvatars/StudioView: "na feature <fid> · IA <provider> · tela <sid>").
// Retorna '' quando não há registro válido (fallback exigido).
function telaDoFeed(feed: FeedEvent[], userId: string): string {
  for (const ev of feed) {
    if (ev.actorUserId !== userId) continue
    const m = /· tela (\S+)/.exec(ev.detalhe ?? '')
    if (!m) continue
    const sid = (m[1] ?? '').trim()
    if (sid === '' || sid === '—') continue
    return sid
  }
  return ''
}

export function useStudioAuthors() {
  const presence = usePresence()
  const users = useUsers()

  const authors = computed<StudioAuthor[]>(() => {
    const feed = presence.feed
    return presence.roster.map((c: Colaborador) => ({
      userId: c.userId,
      name: c.name,
      initials: c.initials,
      color: c.color,
      provider: c.agent.provider,
      model: c.agent.model,
      online: c.online,
      screenId: c.cursor?.frameId ?? telaDoFeed(feed, c.userId)
    }))
  })

  function atualizarAutorProvider(userId: string, provider: StudioProvider, model?: string) {
    const defaultModel = AGENTES.find((a) => a.provider === provider)?.model || 'Default'
    presence.setAgent(userId, provider, model || defaultModel)
  }

  return {
    authors,
    atualizarAutorProvider,
    presence,
    users
  }
}
