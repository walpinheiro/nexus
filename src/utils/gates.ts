import type { GateCheck, GateId, NexoObject } from '@/types/nexo'

// Regras bloqueantes por gate — fonte: nexo-especificacoes/05..10.
// Cada check retorna ok=false quando a regra bloqueante falha.

export interface GateEval {
  gate: GateId
  checks: GateCheck[]
  bloqueantesOk: boolean
  bloqueantesFaltando: string[]
}

function isFeature(o: NexoObject): boolean {
  return o.tipo === 'feature'
}

function getFeatureFields(o: NexoObject): {
  ator: string
  fluxo: string
  bdd: number
  regras: number
  owner: string
} {
  const f = o as unknown as Record<string, unknown>
  const bdd = Array.isArray(f['criterios_bdd']) ? (f['criterios_bdd'] as unknown[]).length : 0
  const regras = Array.isArray(f['regras_ids']) ? (f['regras_ids'] as unknown[]).length : 0
  return {
    ator: String(f['ator'] ?? ''),
    fluxo: String(f['fluxo_feliz'] ?? ''),
    bdd,
    regras,
    owner: o.owner ?? ''
  }
}

export function avaliarGate(objeto: NexoObject, waivers?: { codigo: string; prazo: string }[]): GateEval {
  const checks: GateCheck[] = []
  const gate = objeto.gate
  if (gate === 'G0') {
    const o = objeto as unknown as Record<string, unknown>
    const desc = String(objeto.descricao ?? '')
    const prob = String(o['problema'] ?? '')
    const personas = Array.isArray(o['personas']) ? (o['personas'] as unknown[]) : []
    checks.push({
      codigo: 'ENQ-001',
      descricao: 'Problema ou oportunidade descrito (mín. 20 caracteres)',
      severidade: 'bloqueante',
      ok: desc.trim().length >= 20 || prob.trim().length >= 20
    })
    checks.push({
      codigo: 'ENQ-002',
      descricao: 'Público-alvo ou personas identificadas',
      severidade: 'bloqueante',
      ok: personas.length >= 1 || String(o['ator'] ?? '').trim().length > 0 || desc.toLowerCase().includes('para') || desc.toLowerCase().includes('usuário')
    })
    checks.push({
      codigo: 'ENQ-003',
      descricao: 'Hipótese de valor com métrica observável',
      severidade: 'bloqueante',
      ok: String(o['objetivo'] ?? '').trim().length >= 10 || desc.toLowerCase().includes('métrica') || desc.toLowerCase().includes('kpi') || desc.trim().length >= 30
    })
    checks.push({
      codigo: 'ENQ-004',
      descricao: 'Owner/sponsor definido',
      severidade: 'bloqueante',
      ok: (objeto.owner ?? '').trim().length > 0
    })
  }

  if (gate === 'G1') {
    const e = objeto as unknown as Record<string, unknown>
    const kpis = Array.isArray(e['kpis']) ? (e['kpis'] as unknown[]) : []
    const problema = String(e['problema'] ?? '')
    checks.push({
      codigo: 'EPC-001',
      descricao: 'Épico possui problema/público descrito (mín. 30 caracteres)',
      severidade: 'bloqueante',
      ok: problema.trim().length >= 30
    })
    checks.push({
      codigo: 'EPC-002',
      descricao: 'Épico possui ao menos 1 KPI com nome, unidade, alvo e responsável',
      severidade: 'bloqueante',
      ok:
        kpis.length >= 1 &&
        kpis.every((k) => {
          const kk = k as Record<string, unknown>
          return kk['nome'] && kk['unidade'] && kk['alvo'] && kk['responsavel']
        })
    })
    const scopeIn = Array.isArray(e['escopo_in']) ? (e['escopo_in'] as unknown[]) : []
    const scopeOut = Array.isArray(e['escopo_out']) ? (e['escopo_out'] as unknown[]) : []
    checks.push({
      codigo: 'EPC-003',
      descricao: 'Escopo dentro/fora explícito',
      severidade: 'bloqueante',
      ok: scopeIn.length >= 1 && scopeOut.length >= 1
    })
  }

  if (gate === 'G2' || (isFeature(objeto) && gate >= 'G2')) {
    const f = getFeatureFields(objeto)
    checks.push({
      codigo: 'FTR-001',
      descricao: 'Narrativa contém ator, capacidade e benefício',
      severidade: 'bloqueante',
      ok: f.ator.trim().length > 0 && objeto.descricao.trim().length > 0
    })
    checks.push({
      codigo: 'FTR-002',
      descricao: 'Fluxo feliz com entrada, ação e resultado observável',
      severidade: 'bloqueante',
      ok: f.fluxo.trim().length >= 10
    })
    checks.push({
      codigo: 'FTR-007',
      descricao: 'Ao menos 1 critério BDD verificável',
      severidade: 'bloqueante',
      ok: f.bdd >= 1
    })
    checks.push({
      codigo: 'FTR-004',
      descricao: 'Owner definido',
      severidade: 'bloqueante',
      ok: f.owner.trim().length > 0
    })
    checks.push({
      codigo: 'FTR-008',
      descricao: 'Ação sensível/financeira possui cenário de abuso/erro',
      severidade: 'aviso',
      ok: ((): boolean => {
        const ff = objeto as unknown as Record<string, unknown>
        const alt = Array.isArray(ff['alternativos']) ? (ff['alternativos'] as unknown[]) : []
        return alt.length >= 1
      })()
    })
  }

  if (gate === 'G3') {
    const f = objeto as unknown as Record<string, unknown>
    const integ = Array.isArray(f['integracoes']) ? (f['integracoes'] as unknown[]) : []
    checks.push({
      codigo: 'ARC-001',
      descricao: 'Contrato/OpenAPI ou integração declarada (ou dispensa registrada)',
      severidade: 'bloqueante',
      ok: integ.length >= 1 || String(f['contrato_dispensa'] ?? '') !== ''
    })
    checks.push({
      codigo: 'ARC-002',
      descricao: 'ADR/decisão de arquitetura vinculada',
      severidade: 'bloqueante',
      ok: (f['adr_id'] as string | undefined) != null && String(f['adr_id'] ?? '') !== ''
    })
  }

  if (gate === 'G4') {
    const p = objeto as unknown as Record<string, unknown>
    const bdd = Array.isArray(p['criterios_bdd']) ? (p['criterios_bdd'] as unknown[]) : []
    checks.push({
      codigo: 'PBI-001',
      descricao: 'Definition of Ready: aceite + escopo + dependências + owner + teste',
      severidade: 'bloqueante',
      ok:
        bdd.length >= 1 &&
        objeto.owner.trim() !== '' &&
        String(p['estrategia_teste'] ?? '').trim() !== ''
    })
  }

  if (gate === 'G5') {
    checks.push({
      codigo: 'DON-001',
      descricao: 'Definition of Done: evidência de aceite + testes verdes + rastreabilidade',
      severidade: 'bloqueante',
      ok: objeto.status === 'validated' || objeto.status === 'published'
    })
  }

  // Dispensa vigente de aviso (DELTA Passo 4): considera o check OK até o prazo.
  const dispensas = waivers ?? (objeto as unknown as { __waivers?: { codigo: string; prazo: string }[] }).__waivers
  for (const c of checks) {
    if (c.severidade !== 'aviso' || c.ok) continue
    const w = dispensas?.find((x) => x.codigo === c.codigo)
    if (w && new Date(w.prazo).getTime() > Date.now()) c.ok = true
    else if (w) c.codigo = `${c.codigo}-EXP` as typeof c.codigo
  }

  const faltando = checks.filter((c) => c.severidade === 'bloqueante' && !c.ok).map((c) => c.codigo)
  return { gate, checks, bloqueantesOk: faltando.length === 0, bloqueantesFaltando: faltando }
}

// Papéis que podem aprovar cada gate (02-pessoas-e-permissoes + plano §5).
export function aprovadoresDoGate(gate: GateId): string[] {
  switch (gate) {
    case 'G0':
    case 'G1':
      return ['PM']
    case 'G2':
      return ['PM', 'UX', 'TechLead']
    case 'G3':
      return ['Arquiteto', 'TechLead', 'Seguranca', 'Dev']
    case 'G4':
      return ['PO', 'Dev', 'QA']
    case 'G5':
      return ['Dev', 'QA', 'TechLead']
    default:
      return []
  }
}

// Gates sequenciais com cadeado (DELTA Passo 2): G(n) só abre com G(n-1) aprovado + baseline.
export const ORDEM_GATES: GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5']

export interface GateResumo {
  id: GateId
  status: string
  baselineVersao?: number | null
}

export function gateDesbloqueado(gateId: GateId, gates: GateResumo[]): boolean {
  const idx = ORDEM_GATES.indexOf(gateId)
  if (idx <= 0) return true
  const ant = gates.find((g) => g.id === ORDEM_GATES[idx - 1])
  if (!ant) return false
  return ant.status === 'aprovado' && ant.baselineVersao != null
}

export function gateAnterior(gateId: GateId): GateId | null {
  const idx = ORDEM_GATES.indexOf(gateId)
  return idx > 0 ? ORDEM_GATES[idx - 1] : null
}
