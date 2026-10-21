import assert from 'node:assert/strict'
import { analisarIngestao, sugerirTituloIngestao } from '../src/ai/ingestao.ts'

const texto = 'O time recebe pedidos por email e perde decisões. Objetivo: reduzir retrabalho em 20%. Público: gestores de produto.'
const original = texto
const analise = analisarIngestao(texto)

assert.equal(analise.objetivo, 'reduzir retrabalho em 20%')
assert.deepEqual(analise.publico, ['gestores de produto'])
assert.equal(sugerirTituloIngestao(analise, texto), 'reduzir retrabalho em 20%')
assert.equal(texto, original, 'a análise não deve alterar o texto de origem')

const semRotulos = analisarIngestao('Texto de contexto livre, sem campos identificáveis.')
assert.equal(sugerirTituloIngestao(semRotulos, '  Texto de contexto livre, sem campos identificáveis.  '), 'Texto de contexto livre, sem campos identificáveis.')
assert.equal(sugerirTituloIngestao({ problema: '', objetivo: '' }, 'Objetivo: reduzir retrabalho'), 'reduzir retrabalho')

console.log('test-ingestao: ok')
