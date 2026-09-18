import { computed } from 'vue'
import { usePresence, AGENTES, type AgentProvider, type Colaborador } from '@/stores/studioPresence'
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
}

export function useStudioAuthors() {
  const presence = usePresence()
  const users = useUsers()

  const authors = computed<StudioAuthor[]>(() => {
    return presence.roster.map((c: Colaborador) => ({
      userId: c.userId,
      name: c.name,
      initials: c.initials,
      color: c.color,
      provider: c.agent.provider,
      model: c.agent.model,
      online: c.online
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
