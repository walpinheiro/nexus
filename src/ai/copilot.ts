// Copilot local rule-based (offline, sem chave): interpreta PT-BR e opera o grafo.
// Comandos: criar feature/pbi/regra/tela/api/teste/adr/decisão/risco/epico;
// 'criar pbi Y ligado a X'; 'ligar A a B como <tipo>'; 'mudar status de X para <status>';
// 'listar pendências do gate G2'; 'ajuda'.

import type { EdgeTipo, GateId, NexoObject, NexoStatus, TipoNo } from '@/types/nexo'
import { avaliarGate } from '@/utils/gates'

export interface CopilotResult {
  texto: string
  pendencias?: { noId: string; codigo: string; titulo: string }[]
  acao?:
    | { kind: 'criar'; tipo: TipoNo; titulo: string; ligarEm?: string; edgeTipo?: EdgeTipo }
    | { kind: 'ligar'; de: string; para: string; tipo: EdgeTipo }
    | { kind: 'status'; alvo: string; status: NexoStatus }
    | { kind: 'listar'; gate?: GateId }
}

const TIPOS: { nomes: string[]; tipo: TipoNo }[] = [
  { nomes: ['epico', 'épico'], tipo: 'epico' },
  { nomes: ['feature', 'funcionalidade'], tipo: 'feature' },
  { nomes: ['pbi'], tipo: 'pbi' },
  { nomes: ['regra'], tipo: 'regra' },
  { nomes: ['tela'], tipo: 'tela' },
  { nomes: ['api'], tipo: 'api' },
  { nomes: ['teste'], tipo: 'teste' },
  { nomes: ['adr'], tipo: 'adr' },
  { nomes: ['decisao', 'decisão'], tipo: 'decisao' },
  { nomes: ['risco'], tipo: 'risco' }
]

const STATUS: NexoStatus[] = [
  'draft',
  'review',
  'approved',
  'baseline',
  'stale',
  'regenerated',
  'validated',
  'published'
]

const EDGE_TIPOS: EdgeTipo[] = ['contem', 'realiza', 'consome', 'valida', 'restringe', 'impacta']

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function acharTipo(texto: string): TipoNo | null {
  const n = normalizar(texto)
  for (const t of TIPOS) if (t.nomes.some((x) => n.includes(x))) return t.tipo
  return null
}

function acharEdgeTipo(texto: string): EdgeTipo | null {
  const n = normalizar(texto)
  for (const t of EDGE_TIPOS) if (n.includes(t)) return t
  return null
}

function acharStatus(texto: string): NexoStatus | null {
  const n = normalizar(texto)
  const mapa: Record<string, NexoStatus> = {
    rascunho: 'draft',
    draft: 'draft',
    revisao: 'review',
    'em revisao': 'review',
    review: 'review',
    aprovado: 'approved',
    aprovada: 'approved',
    approved: 'approved',
    baseline: 'baseline',
    desatualizado: 'stale',
    desatualizada: 'stale',
    stale: 'stale',
    regenerado: 'regenerated',
    validado: 'validated',
    publicado: 'published'
  }
  for (const [k, v] of Object.entries(mapa)) if (n.includes(k)) return v
  return null
}

export function buscarPorNome(nos: NexoObject[], nome: string): NexoObject | null {
  const n = normalizar(nome)
  if (!n) return null
  return (
    nos.find((x) => normalizar(x.titulo) === n) ??
    nos.find((x) => normalizar(x.titulo).includes(n)) ??
    nos.find((x) => x.id === nome.trim()) ??
    null
  )
}

export function interpretarCopilot(input: string, nos: NexoObject[]): CopilotResult {
  const texto = input.trim()
  const n = normalizar(texto)

  if (/^(ajuda|help|o que voce sabe|comandos)/.test(n)) {
    return {
      texto: [
        'Fato: comandos disponíveis (todos criam nó/aresta REAL após Confirmar):',
        '1. "criar feature Nome" — ex.: criar feature Notificação',
        '2. "criar feature Nome ligada a Pagar fatura com Pix"',
        '3. "criar pbi Nome" — ex.: criar pbi Dedup por idTx (gate G4)',
        '4. "criar pbi Nome ligada a Confirmação idempotente"',
        '5. "ligar A a B como realiza" — tipos: contem, realiza, consome, valida, restringe, impacta',
        '6. "mudar status de X para review" — estados: rascunho, review, aprovado, desatualizado…',
        '7. "listar pendências do gate G2" — checklist real por nó'
      ].join('\n'),
      acao: { kind: 'listar' }
    }
  }

  const mPend = n.match(/pendencias?.*gate\s*(g[0-5])/)
  if (/pendencia|pendente/.test(n) && mPend) {
    const gate = mPend[1].toUpperCase() as GateId
    const alvos = nos.filter((x) => x.gate === gate)
    const pendencias: { noId: string; codigo: string; titulo: string }[] = []
    for (const a of alvos) {
      const ev = avaliarGate(a)
      for (const c of ev.checks) {
        if (!c.ok) pendencias.push({ noId: a.id, codigo: c.codigo, titulo: a.titulo })
      }
    }
    if (pendencias.length === 0) {
      return {
        texto: `Fato: gate ${gate} sem pendências (${alvos.length} objeto(s) avaliados).\nInferência: pronto para aprovação (ver papel permitido).\nPendências: nenhuma.`,
        pendencias: [],
        acao: { kind: 'listar', gate }
      }
    }
    const linhas = pendencias.slice(0, 12).map((p) => `• ${p.codigo} em "${p.titulo}"`)
    return {
      texto: [
        `Fatos: gate ${gate} com ${pendencias.length} pendência(s) em ${alvos.length} objeto(s).`,
        ...linhas,
        pendencias.length > 12 ? `…e mais ${pendencias.length - 12}.` : '',
        'Inferência: bloqueantes impedem aprovação; avisos aceitam dispensa no Backlog.',
        'Pendências: clique num item acima para abrir o nó (ou corrija via tab Texto).'
      ].filter(Boolean).join('\n'),
      pendencias,
      acao: { kind: 'listar', gate }
    }
  }

  const mLigar = texto.match(/ligar\s+(.+?)\s+a\s+(.+?)(?:\s+como\s+(\w+))?\s*$/i)
  if (/^ligar\b/i.test(texto) && mLigar) {
    const de = buscarPorNome(nos, mLigar[1])
    const para = buscarPorNome(nos, mLigar[2])
    const tipo = acharEdgeTipo(mLigar[3] ?? '') ?? 'realiza'
    if (!de || !para)
      return { texto: `Fato: não encontrei "${mLigar[1]}" ou "${mLigar[2]}" no grafo. Pendência: informe títulos exatos.` }
    return {
      texto: [
        `Fatos: "${de.titulo}" [${de.tipo}/${de.gate}] e "${para.titulo}" [${para.tipo}/${para.gate}] existem.`,
        `Proposta: ligar "${de.titulo}" a "${para.titulo}" como ${tipo}.`,
        'Inferência: a aresta entra no cálculo de impacto (exceto contem, que só agrega).',
        'Pendências: confirme para criar a aresta real.'
      ].join('\n'),
      acao: { kind: 'ligar', de: de.id, para: para.id, tipo }
    }
  }

  const mStatus = texto.match(/(?:mudar|alterar|atualizar)\s+(?:o\s+)?status\s+(?:de|do|da)?\s*(.+?)\s+para\s+(\w[\w\s]*)$/i)
  if (mStatus) {
    const alvo = buscarPorNome(nos, mStatus[1])
    const st = acharStatus(mStatus[2])
    if (!alvo) return { texto: `Fato: "${mStatus[1].trim()}" não existe no grafo. Pendência: informe o título exato.` }
    if (!st) return { texto: `Fato: status "${mStatus[2].trim()}" inválido. Use: ${STATUS.join(', ')}.` }
    return {
      texto: [
        `Fato: "${alvo.titulo}" está ${alvo.status} (v${alvo.versao}).`,
        `Proposta: status ${alvo.status} → ${st}.`,
        'Inferência: aplica nova versão + auditoria; aprovado via patch vira baseline no gate.',
        'Pendências: confirme para aplicar.'
      ].join('\n'),
      acao: { kind: 'status', alvo: alvo.id, status: st }
    }
  }

  const mCriar = texto.match(/cria\w*\s+(?:um[a]?\s+)?(epico|épico|feature|funcionalidade|pbi|regra|tela|api|teste|adr|decisao|decisão|risco)\s+(.+)$/i)
  if (mCriar) {
    const tipo = acharTipo(mCriar[1]) ?? 'feature'
    let resto = mCriar[2].trim()
    let ligarEm: string | undefined
    let edgeTipo: EdgeTipo = tipo === 'pbi' ? 'realiza' : 'contem'
    const mLiga = resto.match(/(.+?)\s+(?:ligad[oa]\s+(?:a|em)\s+)(.+)$/i)
    if (mLiga) {
      resto = mLiga[1].trim()
      const ref = buscarPorNome(nos, mLiga[2])
      if (ref) ligarEm = ref.id
      const et = acharEdgeTipo(mLiga[2])
      if (et) edgeTipo = et
    }
    const titulo = resto.replace(/^["'“”]+|["'“”]+$/g, '').trim()
    if (!titulo) return { texto: 'Pendência: informe o título do novo nó.' }
    const ehPbi = tipo === 'pbi'
    return {
      texto: [
        `Fato: comando "criar ${tipo}" reconhecido.`,
        `Proposta: criar ${tipo} "${titulo}"${ligarEm ? ` ligado a "${nos.find((x) => x.id === ligarEm)?.titulo}" como ${edgeTipo}` : ehPbi ? ' (sem feature vinculada — Pendência: informe "ligada a <feature>" ou preencha feature_id depois)' : ''} (gate ${ehPbi ? 'G4' : tipo === 'epico' ? 'G1' : 'G2'}).`,
        'Inferência: o nó nasce em rascunho (draft) e entra no checklist do gate.',
        'Pendências: confirme para criar (nó real + auditoria).'
      ].join('\n'),
      acao: { kind: 'criar', tipo, titulo, ligarEm, edgeTipo }
    }
  }

  // Pergunta genérica sobre um nó: responde com fatos/inferências/pendências
  const citado = buscarPorNome(nos, texto.replace(/^(o que|qual|como|por que|porque|explique|sobre)\s+/i, ''))
  if (citado) {
    const f = citado as unknown as Record<string, unknown>
    const bdd = Array.isArray(f['criterios_bdd']) ? (f['criterios_bdd'] as unknown[]).length : 0
    return {
      texto: [
        `Fatos: "${citado.titulo}" [${citado.tipo}/${citado.gate}/${citado.status}] v${citado.versao}, owner ${citado.owner}.`,
        citado.descricao,
        `Inferência: ${bdd > 0 ? `${bdd} critério(s) BDD vinculado(s); pronto para detalhar testes.` : 'sem BDD vinculado — provavelmente bloqueia G2 (FTR-007).'}`,
        `Pendências: ${citado.status === 'stale' ? `revisar causa "${citado.causa_stale ?? 'não informada'}". ` : ''}Confirme owner e fonte (${citado.fonte}).`
      ].join('\n')
    }
  }

  return {
    texto: `Não entendi. Fato: comando fora do catálogo. Tente "criar feature Nome", "ligar A a B como realiza" ou "ajuda".`
  }
}
