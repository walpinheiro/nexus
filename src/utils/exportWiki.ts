// Export wiki/markdown dos gates — ONDA3-MOTOR-EXPORT (Z1: export-gate).
// Fecha GAP Lupa V3 (sem export md/download, sem wiki) no MOTOR.
// Funções PURAS, sem DOM, sem download (o VUE faz blob/clipboard a partir da string):
// - exportarGateMarkdown(objeto, gateId, ctx?) — md do documento do gate a partir dos
//   dados REAIS do objeto + gates: one-pager G0, PRD G1, fluxo+BDD G2, artefato G3,
//   DoR G4, pipeline G5. Espelha GateOutput.vue sem duplicar regra (só formata).
// - Blocos via BlocoWiki {titulo, corpo} → `## titulo\n\ncorpo`.
// Fallback honesto 'não informado' (padrão já APROVADO no GateOutput).
// Determinístico: sem Date/Math.random; ordem fixa de seções.

import type {
  BlocoWiki,
  CriterioBdd,
  Epic,
  EvidenciaEntrega,
  ExcecaoSeguranca,
  Feature,
  GateId,
  IntegracaoSpec,
  NexoObject,
  NfrSpec,
  PBI,
  RiscoEstruturado
} from '@/types/nexo'

export interface GateWikiContexto {
  gates?: { id: GateId; status: string; baselineVersao?: number | null; aprovadoPor?: string; aprovadoEm?: string }[]
  nos?: NexoObject[]
}

type Rec = Record<string, unknown>

function rec(objeto: NexoObject | null | undefined): Rec {
  return (objeto as unknown as Rec) ?? {}
}

function str(v: unknown, fallback = 'não informado'): string {
  const t = typeof v === 'string' ? v.trim() : ''
  return t !== '' ? t : fallback
}

function lista(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return (v as unknown[]).map((x) => String(x ?? '').trim()).filter((x) => x !== '')
}

function riscoTxt(r: string | RiscoEstruturado): string {
  if (typeof r === 'string') return r
  return `${r.mitigacao || 'Risco'} (impacto ${r.impacto || 'médio'}, prob. ${r.probabilidade || 'média'}, owner ${r.owner || 'não informado'})`
}

function bddTxt(c: CriterioBdd, i: number): string {
  return `**${c.id || `AC-00${i + 1}`}** (${c.prioridade || 'must'})\n- Given: ${str(c.given)}\n- When: ${str(c.when)}\n- Then: ${str(c.then)}`
}

/** Compõe blocos em markdown `## titulo` (ordem dada, pula corpo vazio). */
export function comporMarkdown(tituloDoc: string, blocos: BlocoWiki[]): string {
  const partes = [`# ${tituloDoc}`, '']
  for (const b of blocos) {
    if (!b || b.corpo.trim() === '') continue
    partes.push(`## ${b.titulo}`, '', b.corpo.trim(), '')
  }
  return partes.join('\n').trimEnd() + '\n'
}

function blocoBaseline(gateId: GateId, ctx?: GateWikiContexto): BlocoWiki | null {
  const g = ctx?.gates?.find((x) => x.id === gateId)
  if (!g) return null
  const base = g.baselineVersao != null ? `Baseline v${g.baselineVersao}` : 'Baseline pendente'
  const ap = g.aprovadoPor ? ` — aprovado por ${g.aprovadoPor}${g.aprovadoEm ? ` em ${g.aprovadoEm}` : ''}` : ''
  return { titulo: 'Baseline', corpo: `Status: ${g.status} · ${base}${ap}.` }
}

function blocoG0(objeto: NexoObject): BlocoWiki[] {
  const r = rec(objeto)
  const e = objeto as unknown as Partial<Epic>
  const riscos = lista(r['riscos']).length > 0
    ? lista(r['riscos']).join('; ')
    : Array.isArray(e.riscos) && e.riscos.length > 0
      ? (e.riscos as (string | RiscoEstruturado)[]).map(riscoTxt).join('; ')
      : 'não informado'
  return [
    { titulo: 'Contexto e dor observável', corpo: str((r['problema'] as string) ?? objeto.descricao) },
    { titulo: 'Público afetado / Personas', corpo: (lista(r['personas']).join(', ') || 'não informado') },
    { titulo: 'Hipótese e métrica inicial', corpo: str(r['objetivo'] as string) },
    { titulo: 'Sponsor / Owner', corpo: str(objeto.owner) },
    { titulo: 'Riscos iniciais e fronteiras', corpo: riscos }
  ]
}

function blocoG1(objeto: NexoObject, ctx?: GateWikiContexto): BlocoWiki[] {
  const r = rec(objeto)
  const e = objeto as unknown as Partial<Epic>
  const kpis = Array.isArray(e.kpis) ? e.kpis : []
  const kpiCorpo = kpis.length > 0
    ? kpis.map((k) => `- ${k.nome}: meta ${k.alvo} ${k.unidade} em ${k.janela} (resp. ${k.responsavel})`).join('\n')
    : 'não informado'
  const escIn = lista(e.escopo_in)
  const escOut = lista(e.escopo_out)
  const feats = (ctx?.nos ?? []).filter((n) => n.tipo === 'feature')
  return [
    { titulo: 'Outcome de negócio', corpo: str((r['objetivo'] as string) ?? (r['problema'] as string) ?? objeto.descricao) },
    { titulo: 'Personas atendidas', corpo: lista(r['personas']).join(', ') || 'não informado' },
    { titulo: 'Métricas de sucesso (KPIs)', corpo: kpiCorpo },
    { titulo: 'Dentro do escopo (In)', corpo: escIn.length > 0 ? escIn.map((x) => `- ${x}`).join('\n') : 'não informado' },
    { titulo: 'Fora do escopo (Out)', corpo: escOut.length > 0 ? escOut.map((x) => `- ${x}`).join('\n') : 'não informado' },
    { titulo: 'Features vinculadas', corpo: feats.length > 0 ? feats.map((f) => `- ${f.titulo} (${f.status} v${f.versao})`).join('\n') : 'não informado' }
  ]
}

function blocoG2(objeto: NexoObject): BlocoWiki[] {
  const f = objeto as unknown as Partial<Feature>
  const bdds = Array.isArray(f.criterios_bdd) ? (f.criterios_bdd as CriterioBdd[]) : []
  const alts = lista(f.alternativos)
  return [
    { titulo: 'Narrativa', corpo: `Como ${str(f.ator)}: ${str(objeto.descricao)} (benefício: ${str(f.beneficio as string)}).` },
    { titulo: 'Fluxo feliz', corpo: str(f.fluxo_feliz as string) },
    { titulo: 'Fluxos alternativos / exceções', corpo: alts.length > 0 ? alts.map((x) => `- ${x}`).join('\n') : 'não informado' },
    { titulo: 'Cenários BDD (Given/When/Then)', corpo: bdds.length > 0 ? bdds.map(bddTxt).join('\n\n') : 'não informado' },
    { titulo: 'Integrações declaradas', corpo: lista(f.integracoes).join('; ') || 'não informado' }
  ]
}

function blocoG3(objeto: NexoObject): BlocoWiki[] {
  const r = rec(objeto)
  const openapi = r['openapi'] as Rec | undefined
  const persist = r['persistencia'] as Rec | undefined
  const integRaw = r['integracoes']
  const integ: IntegracaoSpec[] = Array.isArray(integRaw)
    ? (integRaw as unknown[]).map((x) => (typeof x === 'string' ? { nome: x } : (x as IntegracaoSpec)))
    : []
  const nfrs: NfrSpec[] = Array.isArray(r['nfrs']) ? (r['nfrs'] as NfrSpec[]) : []
  const seg = r['seguranca'] as Rec | undefined
  const dado = r['dado_pessoal'] as Rec | undefined
  const exc = r['excecao_seg'] as ExcecaoSeguranca | undefined
  return [
    {
      titulo: 'Contratos de interface e OpenAPI (ARC-001/003)',
      corpo: openapi
        ? `2xx: ${str(openapi['v2xx'])} · 4xx: ${str(openapi['v4xx'])} · 5xx: ${str(openapi['v5xx'])}\nAuth: ${str(openapi['auth'])}\nCompat: ${str(openapi['compat'])}\nConsumidores: ${str(openapi['consumidor'])}`
        : `Dispensa: ${str(r['contrato_dispensa'], 'não informado')}`
    },
    {
      titulo: 'Persistência e migrations (ARC-004)',
      corpo: persist
        ? `Entidade: ${str(persist['entidade'])}\nMigration: ${str(persist['migration'])}\nÍndices: ${str(persist['indice'])}\nPlano de dados: ${str(persist['plano_dados'])}`
        : 'não informado'
    },
    {
      titulo: 'Integrações e resiliência (ARC-005)',
      corpo: integ.length > 0
        ? integ.map((x) => `- ${x.nome} (owner ${str(x.owner_externo)}; timeout ${x.timeout_ms != null ? `${x.timeout_ms}ms` : 'não informado'}; retry ${x.retry === false ? 'não' : x.retry != null ? 'sim' : 'não informado'}; idempotente ${x.idempotente === false ? 'não' : x.idempotente != null ? 'sim' : 'não informado'})`).join('\n')
        : 'não informado'
    },
    {
      titulo: 'NFRs mensuráveis (ARC-007)',
      corpo: nfrs.length > 0
        ? nfrs.map((n) => `- ${n.medida}: meta ${n.alvo} (telemetria ${n.observabilidade})`).join('\n')
        : 'não informado'
    },
    {
      titulo: 'Threat model, segurança e LGPD (ARC-006/008)',
      corpo: `Threat: ${str(seg?.['threat'])}${exc ? `\nExceção vigente até ${exc.prazo} (owner ${exc.owner})` : ''}\nDado pessoal: ${str(dado?.['classificacao'])} · retenção ${str(dado?.['retencao'])}`
    },
    { titulo: 'ADR vinculada (ARC-002)', corpo: str(r['adr_id'] as string) }
  ]
}

function blocoG4(objeto: NexoObject, ctx?: GateWikiContexto): BlocoWiki[] {
  const pbis = (ctx?.nos ?? []).filter((n): n is PBI & NexoObject => {
    if (n.tipo !== 'pbi') return false
    const p = n as unknown as PBI
    return p.feature_id === objeto.id || p.id === objeto.id
  })
  if (pbis.length === 0) {
    return [{ titulo: 'Backlog de PBIs (DoR)', corpo: 'não informado' }]
  }
  return [
    {
      titulo: 'Backlog de PBIs (DoR)',
      corpo: pbis.map((p) => {
        const bdds = Array.isArray(p.criterios_bdd) ? (p.criterios_bdd as CriterioBdd[]) : []
        return `### ${p.titulo} (${p.status})\n${str(p.descricao)}\nEstratégia de teste: ${str(p.estrategia_teste)}\n${bdds.length > 0 ? bdds.map(bddTxt).join('\n\n') : 'Sem critérios BDD.'}`
      }).join('\n\n')
    }
  ]
}

function blocoG5(objeto: NexoObject): BlocoWiki[] {
  const ev = (rec(objeto)['evidencia'] as (EvidenciaEntrega & Rec) | undefined) ?? {}
  const checks = Array.isArray(ev.checks_ci) ? (ev.checks_ci as string[]) : []
  const obs = lista(ev.observabilidade)
  const rast = lista(ev.rastreabilidade)
  return [
    { titulo: 'Status de entrega', corpo: objeto.status },
    { titulo: 'Pull Request (DON-002)', corpo: typeof ev.pr_url === 'string' && ev.pr_url ? String(ev.pr_url) : 'não informado' },
    { titulo: 'Pipeline CI e SAST (DON-003)', corpo: checks.length > 0 ? checks.map((c) => `- ${c}`).join('\n') + `\nSAST: ${ev.sast_ok !== false ? 'aprovado' : 'pendente'}` : 'não informado' },
    { titulo: 'Testes automatizados (DON-004)', corpo: ev.testes_verdes === true ? 'Verde — 100% da suíte passando.' : 'não informado' },
    { titulo: 'Aceite homologado (DON-004)', corpo: ev.aceite_registrado === true ? 'Aprovado por QA/PO.' : 'não informado' },
    { titulo: 'Telemetria e rastreabilidade (DON-006)', corpo: obs.length + rast.length > 0 ? `Telemetria: ${obs.join(', ') || 'não informado'}\nRastreabilidade: ${rast.join(', ') || 'não informado'}` : 'não informado' }
  ]
}

const TITULOS_GATE: Record<GateId, string> = {
  G0: 'One-pager de enquadramento',
  G1: 'PRD — Especificação de épico',
  G2: 'Story map e cenários BDD',
  G3: 'Artefato arquitetural e contratos',
  G4: 'Backlog de PBIs (Definition of Ready)',
  G5: 'Pipeline de entrega e evidências DoD'
}

/**
 * Z1 — markdown do documento do gate a partir dos dados REAIS do objeto + gates.
 * Retorna null quando objeto é nulo (VUE mantém EmptyState).
 */
export function exportarGateMarkdown(
  objeto: NexoObject | null,
  gateId: GateId,
  ctx?: GateWikiContexto
): string | null {
  if (!objeto) return null
  const porGate: Record<GateId, BlocoWiki[]> = {
    G0: blocoG0(objeto),
    G1: blocoG1(objeto, ctx),
    G2: blocoG2(objeto),
    G3: blocoG3(objeto),
    G4: blocoG4(objeto, ctx),
    G5: blocoG5(objeto)
  }
  const base: BlocoWiki = {
    titulo: 'Objeto',
    corpo: `${objeto.titulo} (${objeto.tipo} ${objeto.id} · status ${objeto.status} · v${objeto.versao} · owner ${str(objeto.owner)})`
  }
  const baseline = blocoBaseline(gateId, ctx)
  return comporMarkdown(
    `${TITULOS_GATE[gateId]} — ${objeto.titulo}`,
    [base, ...(baseline ? [baseline] : []), ...porGate[gateId]]
  )
}
