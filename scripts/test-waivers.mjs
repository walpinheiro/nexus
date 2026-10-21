import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useGraph } from '@/stores/useGraph'
import { avaliarGate, dispensaVigenteNaData, prazoDispensaFuturo } from '@/utils/gates'

const memory = new Map()
const localStorageMock = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null },
  setItem(key, value) { memory.set(String(key), String(value)) },
  removeItem(key) { memory.delete(key) },
  clear() { memory.clear() },
  key(index) { return [...memory.keys()][index] ?? null },
  get length() { return memory.size }
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock })

const today = new Date()
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

assert.equal(dispensaVigenteNaData(todayKey, new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)), true,
  'waiver continua válida até o fim da data civil local')
assert.equal(dispensaVigenteNaData(yesterdayKey, today), false)
assert.equal(prazoDispensaFuturo(tomorrowKey, new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59)), true,
  'amanhã permanece uma data futura mesmo após 21h local')
assert.equal(prazoDispensaFuturo(todayKey, today), false)
assert.equal(dispensaVigenteNaData('2025-02-29', today), false, 'data civil impossível é inválida')

const feature = {
  id: 'feature-1', project_id: 'proj-1', tipo: 'feature', gate: 'G2', titulo: 'Feature', descricao: '', status: 'draft',
  owner: 'u-owner', contribuidores: [], classificacao: 'internal', fonte: 'stated', fonte_refs: [], versao: 1,
  x: 0, y: 0, z: 0, created_at: '', updated_at: '', telas_ids: [], alternativos: []
}
const expired = avaliarGate(feature, [{ codigo: 'FTR-008', prazo: yesterdayKey }]).checks.find((check) => check.codigo === 'FTR-008')
assert.ok(expired)
assert.equal(expired.ok, false)
assert.equal(expired.dispensaExpirada, true)
assert.equal(expired.codigo, 'FTR-008', 'código do critério deve permanecer estável para renovar a dispensa')
assert.equal(expired.prazoDispensaExpirada, yesterdayKey)

const activeToday = avaliarGate(feature, [{ codigo: 'FTR-008', prazo: todayKey }]).checks.find((check) => check.codigo === 'FTR-008')
assert.equal(activeToday?.ok, true, 'dispensa permanece válida durante toda a data de vencimento')

setActivePinia(createPinia())
const graph = useGraph()
const reason = 'Plano de mitigação aprovado pelo responsável.'
const accepted = graph.concederDispensa(feature.id, 'FTR-008', reason, 'u-owner', tomorrowKey)
assert.equal(accepted.ok, true, 'store deve aceitar a data civil de amanhã mesmo no fim do dia')
assert.ok(graph.dispensaVigente(feature.id, 'FTR-008'))
const rejectedToday = graph.concederDispensa(feature.id, 'FTR-008', reason, 'u-owner', todayKey)
assert.equal(rejectedToday.ok, false, 'store exige data posterior à data local de hoje')

console.log('✓ Dispensas mantêm o código original, vencem ao fim do dia civil e aceitam renovação com prazo futuro.')
