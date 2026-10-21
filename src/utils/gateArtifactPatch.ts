import type { PatchMudanca } from '@/types/nexo'

export type DependencyMode = 'none' | 'list'
export interface LinkedRuleRecord {
  id: string
  descricao: string
  fonte: string
  fonte_refs: string[]
  status: string
  arquivada: boolean
}

/** Resolves linked rule records for edit defaults without dropping stale/unloaded relationship ids. */
export function linkedRuleRows(
  inlineRules: unknown,
  linkedIds: unknown,
  graphRules: LinkedRuleRecord[]
): LinkedRuleRecord[] | Record<string, unknown>[] {
  if (Array.isArray(inlineRules)) return inlineRules as Record<string, unknown>[]
  const ids = Array.isArray(linkedIds) ? linkedIds.map(String) : []
  return graphRules.filter((rule) => ids.includes(rule.id)).map((rule) => ({ ...rule }))
}

export function mergeLinkedRuleIds(existingIds: unknown, rows: Record<string, unknown>[]): string[] {
  const existing = Array.isArray(existingIds) ? existingIds.map(String) : []
  const edited = rows.map((row) => String(row.id ?? '').trim()).filter(Boolean)
  return [...new Set([...existing, ...edited])]
}

function serialized(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(value)
}

function addChange(out: PatchMudanca[], campo: string, current: unknown, next: unknown, empty: string): void {
  if (serialized(current) !== serialized(next)) {
    out.push({ campo, de: serialized(current) || empty, para: serialized(next) })
  }
}

/** Serializes one PBI dependency decision in the exact fields consumed by avaliarGate. */
export function dependencyDecisionChanges(
  current: { dependencies?: unknown; decision?: unknown; justification?: unknown },
  next: { mode: DependencyMode; dependencies: string[]; justification: string }
): PatchMudanca[] {
  const out: PatchMudanca[] = []
  addChange(out, 'dependencias', current.dependencies, next.mode === 'none' ? [] : next.dependencies, '[]')
  addChange(out, 'dependencias_decisao', current.decision, next.mode === 'none' ? 'nenhuma' : 'resolvidas', '""')
  const justification = next.justification.trim()
  if (justification) addChange(out, 'dependencias_justificativa', current.justification, justification, '""')
  return out
}

/** Keeps G5 evidence in one nested object when recording its security exception. */
export function mergeEvidenceException(evidence: Record<string, unknown>, exception: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(exception).length > 0 ? { ...evidence, excecao: exception } : evidence
}
