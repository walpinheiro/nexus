import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useProjects } from '@/stores/useProjects'

const memory = new Map()
const localStorageMock = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null },
  setItem(key, value) { memory.set(String(key), String(value)) },
  removeItem(key) { memory.delete(String(key)) },
  clear() { memory.clear() },
  key(index) { return [...memory.keys()][index] ?? null },
  get length() { return memory.size }
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock })
setActivePinia(createPinia())

const projects = useProjects()
const respostas = {
  titulo: 'Painel de pagamentos realizados',
  classificacao: 'confidential',
  problema: 'Clientes não conseguem consultar o histórico das faturas pagas no portal.',
  objetivo: 'Exibir histórico das faturas pagas para clientes',
  usuarios: 'Clientes com conta ativa no portal',
  escopo: 'Histórico até 24 meses',
  metrica: 'Adoção mensal',
  naoObjetivos: 'Não altera regras de liquidação.'
}
const reviewed = projects.criarProjetoComIA(respostas, 'u-pm')
assert.equal(reviewed.ok, true)
assert.equal(reviewed.projeto?.titulo, respostas.titulo)
assert.equal(reviewed.projeto?.classificacao, 'confidential')
const reviewedGraph = JSON.parse(localStorageMock.getItem(projects.graphKey(reviewed.projeto.id)))
const reviewedEpic = reviewedGraph.nos.find((node) => node.id === reviewed.projeto.epicoId)
assert.equal(reviewedEpic.classificacao, 'confidential')
assert.equal(reviewedEpic.problema, respostas.problema)
assert.equal(reviewedEpic.descricao, respostas.problema)
assert.equal(reviewedEpic.objetivo, respostas.objetivo)
assert.deepEqual(reviewedEpic.personas, [respostas.usuarios])
assert.deepEqual(reviewedEpic.escopo_in, [respostas.escopo])
assert.deepEqual(reviewedEpic.escopo_out, [respostas.naoObjetivos])
assert.equal(reviewedEpic.kpis[0].nome, respostas.metrica)

// Clearing a required field in final review must reject without persistence.
const requiredReview = { ...respostas }
const beforeInvalidCount = projects.state.projetos.length
const invalidNamespacesBefore = [...memory.keys()].filter((key) => key.startsWith('nexo.v1.graph.')).length
for (const field of ['problema', 'objetivo', 'usuarios', 'metrica']) {
  const rejected = projects.criarProjetoComIA({ ...requiredReview, [field]: '' }, 'u-pm')
  assert.equal(rejected.ok, false, `${field} must remain required after review edits`)
  assert.ok(rejected.erros.some((error) => error.codigo === 'G0-001'))
}
const rejectedTitle = projects.criarProjetoComIA({ ...requiredReview, titulo: '' }, 'u-pm')
assert.equal(rejectedTitle.ok, false)
assert.equal(projects.state.projetos.length, beforeInvalidCount)
assert.equal([...memory.keys()].filter((key) => key.startsWith('nexo.v1.graph.')).length, invalidNamespacesBefore)

// Missing optional scope is a real G0-002 warning, not a fabricated placeholder.
const scopePending = projects.criarProjetoComIA({ ...respostas, titulo: 'Projeto com escopo pendente', escopo: '' }, 'u-pm')
assert.equal(scopePending.ok, true)
assert.ok(scopePending.erros.some((error) => error.codigo === 'G0-002'))
const pendingGraph = JSON.parse(localStorageMock.getItem(projects.graphKey(scopePending.projeto.id)))
const pendingEpic = pendingGraph.nos.find((node) => node.id === scopePending.projeto.epicoId)
assert.deepEqual(pendingEpic.escopo_in, [])
assert.deepEqual(pendingEpic.escopo_out, [respostas.naoObjetivos])

// Legacy callers without reviewed title/classification retain their old defaults.
const legacy = projects.criarProjetoComIA({
  problema: 'Usuários não têm uma visão clara do status dos pagamentos.',
  objetivo: 'Mostrar o status dos pagamentos no perfil',
  usuarios: 'Usuários com perfil verificado',
  escopo: 'Apenas o perfil',
  metrica: 'Consultas ao perfil'
}, 'u-pm')
assert.equal(legacy.ok, true)
assert.equal(legacy.projeto?.titulo, 'Mostrar o status dos pagamentos no perfil')
assert.equal(legacy.projeto?.classificacao, 'internal')

console.log('✓ Wizard estrito preserva respostas revisadas, rejeita campos essenciais vazios e mantém aviso G0-002 real.')