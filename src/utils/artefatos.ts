// Artefatos formais por gate — ARTEFATOS-FORMAIS-MOTOR (A1: G0+G1+G2).
// Cada gate tem ARTEFATO normativo (specs 05-10 + fichas 13-16), não wiki.md
// genérica — export .md (exportWiki.ts) vira secundário e é preservado.
// Builders PUROS: dados reais do objeto + ctx (nos/gates/vinculos/regras),
// 'não informado' onde faltar (padrão APROVADO), sem DOM/md.
// Tipo Artefato {gate, titulo, secoes: {titulo, itens: {rotulo, valor}[]}[]}
// em @/types/nexo. Determinístico: sem Date/Math.random; ordem fixa de seções.
// Reaproveita leitura (helpers locais espelham exportWiki sem importar VUE/store).

import type {
  Artefato,
  ArtefatoSecao,
  CriterioBdd,
  Epic,
  Feature,
  GateId,
  MapaRegrasValidacao,
  NexoObject,
  PermissaoPolicy,
  RiscoEstruturado,
  TelaEstado,
  TelaVinculo
} from '@/types/nexo'

export interface ArtefatoContexto {
  gates?: { id: GateId; status: string; baselineVersao?: number | null; aprovadoPor?: string; aprovadoEm?: string }[]
  nos?: NexoObject[]
  vinculos?: TelaVinculo[]
  regras?: MapaRegrasValidacao
}

type Rec = Record<string, unknown>

function rec(objeto: NexoObject | null | undefined): Rec {
  return (objeto as unknown as Rec) ?? {}
}

function txt(v: unknown): string {
  const t = typeof v === 'string' ? v.trim() : ''
  return t !== '' ? t : 'não informado'
}

function juntar(v: unknown): string {
  if (!Array.isArray(v)) return 'não informado'
  const xs = (v as unknown[]).map((x) => String(x ?? '').trim()).filter((x) => x !== '')
  return xs.length > 0 ? xs.join('; ') : 'não informado'
}

function riscoTxt(r: string | RiscoEstruturado): string {
  if (typeof r === 'string') return r
  return `${r.mitigacao || 'Risco'} (prob. ${r.probabilidade || 'não informado'}, impacto ${r.impacto || 'não informado'}, owner ${r.owner || 'não informado'})`
}

function bddValor(c: CriterioBdd): string {
  const camada = txt((c as unknown as Rec)['camada'])
  const fontes = juntar((c as unknown as Rec)['fontes'])
  return `[${c.id || 'sem-id'}|${c.prioridade || 'must'}|camada ${camada}] Given ${txt(c.given)} / When ${txt(c.when)} / Then ${txt(c.then)} (fontes: ${fontes})`
}

function secao(titulo: string, pares: [string, string][]): ArtefatoSecao {
  return { titulo, itens: pares.map(([rotulo, valor]) => ({ rotulo, valor: valor.trim() !== '' ? valor : 'não informado' })) }
}

function cabecalho(objeto: NexoObject, gateId: GateId, titulo: string, ctx?: ArtefatoContexto): ArtefatoSecao[] {
  const g = ctx?.gates?.find((x) => x.id === gateId)
  const base = g
    ? `Status ${g.status} · ${g.baselineVersao != null ? `baseline v${g.baselineVersao}` : 'baseline pendente'}${g.aprovadoPor ? ` · aprovado por ${g.aprovadoPor}${g.aprovadoEm ? ` em ${g.aprovadoEm}` : ''}` : ''}`
    : 'não informado'
  void titulo
  return [
    secao('Identificação', [
      ['Objeto', `${objeto.titulo} (${objeto.tipo} ${objeto.id})`],
      ['Status / versão', `${objeto.status} · v${objeto.versao}`],
      ['Owner', txt(objeto.owner)],
      ['Baseline do gate', base]
    ])
  ]
}

// ── G0 (spec 05): contexto/dor, público, hipótese+métrica, owner,
// restrições/não-objetivos, suposições/riscos, candidatas a épico ─────────────
export function montarArtefatoG0(objeto: NexoObject, ctx?: ArtefatoContexto): Artefato {
  const r = rec(objeto)
  const e = objeto as unknown as Partial<Epic>
  const riscos = Array.isArray(e.riscos) && e.riscos.length > 0
    ? (e.riscos as (string | RiscoEstruturado)[]).map(riscoTxt).join('; ')
    : juntar(r['riscos'])
  const candidatas = (ctx?.nos ?? []).filter((n) => n.tipo === 'epico' && n.id !== objeto.id)
  return {
    gate: 'G0',
    titulo: `Enquadramento — ${objeto.titulo}`,
    secoes: [
      ...cabecalho(objeto, 'G0', '', ctx),
      secao('Contexto e dor', [
        ['Dor observável', txt((r['problema'] as string) ?? objeto.descricao)],
        ['Evidência', txt(r['evidencia_dor'])]
      ]),
      secao('Público', [
        ['Personas', juntar(r['personas'])],
        ['Ator', txt(r['ator'])]
      ]),
      secao('Hipótese e métrica', [
        ['Hipótese', txt(r['objetivo'])],
        ['Métrica (nome+alvo)', (() => {
          const kpis = Array.isArray(r['kpis']) ? (r['kpis'] as Rec[]) : []
          return kpis.length > 0
            ? kpis.map((k) => `${txt(k['nome'])}: ${txt(k['alvo'])} ${txt(k['unidade'])} em ${txt(k['janela'])} (resp. ${txt(k['responsavel'])})`).join('; ')
            : 'não informado'
        })()]
      ]),
      secao('Owner', [['Sponsor/owner', txt(objeto.owner)]]),
      secao('Restrições e não-objetivos', [
        ['Escopo in', juntar(r['escopo_in'] ?? (e as Rec)['escopo_in'])],
        ['Escopo out', juntar(r['escopo_out'] ?? (e as Rec)['escopo_out'])]
      ]),
      secao('Suposições e riscos', [['Riscos', riscos]]),
      secao('Candidatas a épico', [
        ['Épicos', candidatas.length > 0 ? candidatas.map((x) => `${x.titulo} (${x.status} v${x.versao})`).join('; ') : 'não informado']
      ])
    ]
  }
}

// ── G1 (spec 06 + ficha 13): problema, objetivo/KPI, personas, proposta valor,
// capacidades, regras/limites, dependências, prioridade/risco/owner/DoD ────────
export function montarArtefatoG1(objeto: NexoObject, ctx?: ArtefatoContexto): Artefato {
  const r = rec(objeto)
  const e = objeto as unknown as Partial<Epic>
  const kpis = Array.isArray(e.kpis) ? e.kpis : []
  return {
    gate: 'G1',
    titulo: `PRD do épico — ${objeto.titulo}`,
    secoes: [
      ...cabecalho(objeto, 'G1', '', ctx),
      secao('Problema', [
        ['Problema', txt((r['problema'] as string) ?? objeto.descricao)],
        ['Público', juntar(r['personas'])]
      ]),
      secao('Objetivo e KPIs', [
        ['Objetivo', txt(r['objetivo'])],
        ['KPIs (unidade+alvo+janela+responsável)', kpis.length > 0
          ? kpis.map((k) => `${txt(k.nome)}: ${txt(k.unidade)} alvo ${txt(k.alvo)} janela ${txt(k.janela)} resp. ${txt(k.responsavel)}`).join('; ')
          : 'não informado']
      ]),
      secao('Personas', [['Personas', juntar(r['personas'])]]),
      secao('Proposta de valor', [
        ['Proposta', txt(r['proposta_valor'])],
        ['Benefício', txt(r['beneficio'])]
      ]),
      secao('Capacidades', [['Capacidades', juntar(r['capacidades'])]]),
      secao('Regras e limites', [
        ['Regras', juntar(r['regras_ids'])],
        ['Limites', juntar(r['limites'])]
      ]),
      secao('Dependências', [['Dependências', juntar(r['dependencias'])]]),
      secao('Prioridade, risco, owner e DoD', [
        ['Prioridade', txt(r['prioridade'])],
        ['Riscos', Array.isArray(e.riscos) && e.riscos.length > 0 ? (e.riscos as (string | RiscoEstruturado)[]).map(riscoTxt).join('; ') : 'não informado'],
        ['Owner', txt(objeto.owner)],
        ['DoD do épico', txt(r['dod'])]
      ])
    ]
  }
}

// ── G2 (spec 07 + ficha 14): narrativa, gatilho/pré-condições, fluxo feliz,
// alternativos, regras c/ fonte, permissões, telas+estados, integrações,
// BDD id+Given/When/Then+prioridade+camada+fontes ─────────────────────────────
export function montarArtefatoG2(objeto: NexoObject, ctx?: ArtefatoContexto): Artefato {
  const f = objeto as unknown as Partial<Feature> & Rec
  const bdds = Array.isArray(f.criterios_bdd) ? (f.criterios_bdd as CriterioBdd[]) : []
  const regrasIds = juntar(f['regras_ids'])
  const regrasDet = Array.isArray(f['regras'])
    ? (f['regras'] as Rec[]).map((x) => `${txt(x['id'] ?? x['nome'])} (fonte ${txt(x['fonte'])}${x['arquivada'] === true ? ', ARQUIVADA' : ''})`).join('; ')
    : 'não informado'
  const perms = Array.isArray(f['permissoes'])
    ? (f['permissoes'] as PermissaoPolicy[]).map((p) => `${txt(p.recurso)}:${txt(p.acao)} [${txt(p.policy)}]`).join('; ')
    : 'não informado'
  const vinculos = (ctx?.vinculos ?? []).filter((v) => v.featureId === objeto.id)
  const estados = Array.isArray(f['telas_estados']) ? (f['telas_estados'] as TelaEstado[]) : []
  const telasValor = vinculos.length > 0
    ? vinculos.map((v) => {
      const est = estados.find((t) => t.tela_id === v.telaId)
      const cov = est
        ? `loading ${est.loading ? 'ok' : 'falta'}/vazio ${est.vazio != null ? 'ok' : 'falta'}/erro ${est.erro ? 'ok' : 'falta'}/sucesso ${est.sucesso ? 'ok' : 'falta'}`
        : 'estados não informado'
      return `${v.telaId} (origem ${v.origem}${v.passoRef ? `/${v.passoRef}` : ''}; ${cov})`
    }).join('; ')
    : juntar(f['telas_ids'])
  const integ = Array.isArray(f['integracoes']) ? (f['integracoes'] as unknown[]) : []
  const integValor = integ.length > 0
    ? integ.map((x) => {
      if (typeof x === 'string') return `${x} (timeout/falha: não informado)`
      const xi = x as Rec
      return `${txt(xi['nome'])} (timeout ${xi['timeout_ms'] != null ? `${xi['timeout_ms']}ms` : 'não informado'}, falha ${txt(xi['falha'])}, indisponibilidade ${txt(xi['indisponibilidade'])})`
    }).join('; ')
    : 'não informado'
  return {
    gate: 'G2',
    titulo: `Especificação da feature — ${objeto.titulo}`,
    secoes: [
      ...cabecalho(objeto, 'G2', '', ctx),
      secao('Narrativa', [
        ['Ator', txt(f.ator)],
        ['Capacidade', txt(objeto.descricao)],
        ['Benefício', txt(f.beneficio)]
      ]),
      secao('Gatilho e pré-condições', [
        ['Gatilho', txt(f.gatilho)],
        ['Pré-condições', juntar(f.precondicoes)]
      ]),
      secao('Fluxo feliz', [['Fluxo', txt(f.fluxo_feliz)]]),
      secao('Alternativos', [['Exceções', juntar(f.alternativos)]]),
      secao('Regras de negócio', [
        ['Regras vinculadas', regrasIds],
        ['Fontes', regrasDet]
      ]),
      secao('Permissões', [['Policies', perms]]),
      secao('Telas e estados', [['Telas (loading/vazio/erro/sucesso)', telasValor]]),
      secao('Integrações', [['Integrações (timeout/falha)', integValor]]),
      secao('Critérios BDD', [
        ['Cenários (id+Given/When/Then+prioridade+camada+fontes)', bdds.length > 0 ? bdds.map(bddValor).join(' | ') : 'não informado']
      ])
    ]
  }
}
