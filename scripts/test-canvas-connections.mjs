import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useGraph } from '../src/stores/useGraph'

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
}

setActivePinia(createPinia())
const graph = useGraph()
const initialCount = graph.state.arestas.length

const existing = graph.criarAresta('ft-pagar', 'ft-confirmar', 'consome')
assert.equal(existing?.edge_id, 'e1', 'retrying an existing seed connection returns the same edge')
assert.equal(graph.state.arestas.length, initialCount, 'an exact retry does not add an edge')

const ports = { origemHandle: 'r', destinoHandle: 'l' }
const first = graph.criarAresta('ft-pagar', 'ft-confirmar', 'consome', 'u-pm', '', ports)
const retry = graph.criarAresta('ft-pagar', 'ft-confirmar', 'consome', 'u-pm', '', ports)
assert.ok(first)
assert.equal(retry?.edge_id, first.edge_id, 'retry with explicit handles returns the saved edge')
assert.equal(graph.state.arestas.length, initialCount + 1, 'explicit-handle retry adds exactly one edge')

console.log('Canvas connections: duplicate retries are idempotent and port-aware.')
