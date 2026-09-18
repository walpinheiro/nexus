import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Acao, GateId, NexoObject, Role, User } from '@/types/nexo'
import { seedUsers } from '@/data/seed'

const KEY = 'nexo.v1.users'

interface UsersState {
  usuarios: User[]
  currentUserId: string
}

function load(): UsersState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as UsersState
      // backfill sem perda: garante u-po (PO) e u-neg (Negócio) em bases antigas
      if (!s.usuarios.some((u) => u.id === 'u-po')) {
        s.usuarios.push({ id: 'u-po', nome: 'Paulo (PO)', papel: 'PO', projeto_ids: ['proj-cobrancas'] })
      }
      if (!s.usuarios.some((u) => u.id === 'u-neg')) {
        s.usuarios.push({ id: 'u-neg', nome: 'Nina (Negócio)', papel: 'Negocio', projeto_ids: ['proj-cobrancas'] })
      }
      return s
    }
  } catch {
    // ignora e usa seed
  }
  return { usuarios: seedUsers, currentUserId: 'u-pm' }
}

// Matriz papel x ação base (gate refina aprovação em useGate).
const MATRIZ: Record<Role, Acao[]> = {
  PM: ['visualizar', 'comentar', 'propor', 'editar', 'aprovar', 'publicar'],
  PO: ['visualizar', 'comentar', 'propor', 'editar', 'aprovar'],
  Negocio: ['visualizar', 'comentar', 'aprovar'],
  UX: ['visualizar', 'comentar', 'propor', 'editar'],
  Arquiteto: ['visualizar', 'comentar', 'propor', 'editar', 'aprovar'],
  TechLead: ['visualizar', 'comentar', 'propor', 'editar', 'aprovar'],
  Dev: ['visualizar', 'comentar', 'propor', 'editar'],
  QA: ['visualizar', 'comentar', 'propor', 'editar'],
  Seguranca: ['visualizar', 'comentar', 'aprovar']
}

const APROVACAO_GATE: Record<GateId, Role[]> = {
  G0: ['PM'],
  G1: ['Negocio', 'PM'],
  G2: ['PM', 'UX', 'TechLead'],
  G3: ['Arquiteto', 'TechLead', 'Seguranca', 'Dev'],
  G4: ['PO', 'Dev', 'QA'],
  G5: ['Dev', 'QA', 'TechLead']
}

export const useUsers = defineStore('users', () => {
  const state = ref<UsersState>(load())

  const currentUser = computed<User | null>(
    () => state.value.usuarios.find((u) => u.id === state.value.currentUserId) ?? null
  )

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state.value))
  }

  if (localStorage.getItem(KEY) == null) persist()

  function trocarUsuario(id: string) {
    state.value.currentUserId = id
    persist()
  }

  function pode(acao: Acao, objeto?: NexoObject): boolean {
    const u = currentUser.value
    if (!u) return false
    if (acao === 'aprovar' && objeto) return APROVACAO_GATE[objeto.gate].includes(u.papel)
    return MATRIZ[u.papel].includes(acao)
  }

  function motivoNegacao(acao: Acao, objeto?: NexoObject): string {
    const u = currentUser.value
    if (!u) return 'Nenhum usuário atual.'
    if (acao === 'aprovar' && objeto)
      return `${u.papel} não aprova ${objeto.gate}; permitido: ${APROVACAO_GATE[objeto.gate].join(', ')}.`
    return `${u.papel} não tem permissão "${acao}".`
  }

  function criarUsuario(nome: string, papel: Role): User {
    const id = `u-${Date.now().toString(36)}`
    const u: User = { id, nome, papel, projeto_ids: ['proj-cobrancas'] }
    state.value.usuarios.push(u)
    persist()
    return u
  }

  function editarUsuario(id: string, nome: string, papel: Role): boolean {
    const u = state.value.usuarios.find((x) => x.id === id)
    if (!u) return false
    u.nome = nome
    u.papel = papel
    persist()
    return true
  }

  function removerUsuario(id: string): boolean {
    if (state.value.usuarios.length <= 1) return false
    state.value.usuarios = state.value.usuarios.filter((x) => x.id !== id)
    if (state.value.currentUserId === id) state.value.currentUserId = state.value.usuarios[0].id
    persist()
    return true
  }

  return { state, currentUser, trocarUsuario, persist, pode, motivoNegacao, criarUsuario, editarUsuario, removerUsuario }
})
