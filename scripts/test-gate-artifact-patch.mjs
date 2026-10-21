import assert from 'node:assert/strict'
import { dependencyDecisionChanges, linkedRuleRows, mergeEvidenceException, mergeLinkedRuleIds } from '@/utils/gateArtifactPatch'

const initialRules = linkedRuleRows(undefined, ['RG-1', 'RG-not-loaded'], [{
  id: 'RG-1', descricao: 'Regra declarada', fonte: 'stated', fonte_refs: ['DOC-1'], status: 'draft', arquivada: false
}])
assert.equal(initialRules.length, 1)
assert.deepEqual(initialRules[0].fonte_refs, ['DOC-1'])
assert.deepEqual(mergeLinkedRuleIds(['RG-1', 'RG-not-loaded'], initialRules), ['RG-1', 'RG-not-loaded'])
assert.deepEqual(linkedRuleRows([{ id: 'inline', fonte: 'ticket', fonte_refs: [] }], ['RG-1'], []).map((rule) => rule.id), ['inline'])

const noDependencies = dependencyDecisionChanges({}, {
  mode: 'none',
  dependencies: [],
  justification: 'Nenhuma dependência externa foi identificada.'
})
assert.deepEqual(noDependencies.map((patch) => patch.campo), [
  'dependencias', 'dependencias_decisao', 'dependencias_justificativa'
])
assert.equal(noDependencies[0].para, '[]')
assert.equal(noDependencies[1].para, '"nenhuma"')
assert.equal(JSON.parse(noDependencies[2].para), 'Nenhuma dependência externa foi identificada.')

const resolvedDependencies = dependencyDecisionChanges({}, {
  mode: 'list',
  dependencies: ['API-42'],
  justification: 'Contrato da API já publicado e disponível.'
})
assert.equal(resolvedDependencies.find((patch) => patch.campo === 'dependencias_decisao')?.para, '"resolvidas"')
const resolvedPatch = resolvedDependencies.find((patch) => patch.campo === 'dependencias')
assert.ok(resolvedPatch)
assert.deepEqual(JSON.parse(resolvedPatch.para), ['API-42'])
assert.ok(resolvedDependencies.some((patch) => patch.campo === 'dependencias_justificativa'))

const unchanged = dependencyDecisionChanges({
  dependencies: ['API-42'], decision: 'resolvidas', justification: 'Contrato da API já publicado e disponível.'
}, { mode: 'list', dependencies: ['API-42'], justification: 'Contrato da API já publicado e disponível.' })
assert.deepEqual(unchanged, [])

const evidence = { pr_url: 'https://git.example/pull/8', seg_aprovado: false }
const mergedEvidence = mergeEvidenceException(evidence, { owner: 'u-sec', prazo: '2099-01-01', aceite: 'Risco registrado e retorno planejado.' })
assert.deepEqual(mergedEvidence, {
  pr_url: evidence.pr_url,
  seg_aprovado: false,
  excecao: { owner: 'u-sec', prazo: '2099-01-01', aceite: 'Risco registrado e retorno planejado.' }
})
assert.deepEqual(mergeEvidenceException(evidence, {}), evidence)

console.log('Gate artifact patch serialization: ok')
