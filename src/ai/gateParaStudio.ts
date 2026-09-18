// Payload gate→Studio (QUEEN-MOTOR O3) — heurística documentada, SEM mock:
// - fluxo_feliz vira 2-3 telas (ex: pagar → QR + timer + confirmação);
// - cada alternativo vira 1 tela;
// - cada AC BDD vira transição/asserção anotada na navegação.
// Tudo derivado do objeto Feature + PBIs vinculados (feature_id). Sem rede.
//
// W7 — entrada Studio sem tela vazia (puro/determinístico, sem Date/Math.random):
// - artefatos G0/G1/G2 via montarArtefato (tolerando 'não informado') como fonte
//   de fallback para ator, fluxo feliz, alternativos e integrações;
// - conversa IA do draftHistory da feature (extras ou leitura local guardada)
//   vira telas de origem 'bdd' (uma por prompt distinto, ordem estável);
// - studioDraft existente (frames já desenhados da feature) é incorporado por id,
//   sem duplicar telas já derivadas;
// - NUNCA telas vazias: com objeto vazio cai no fallback de 1 pré-tela com id
//   derivado de featureId e descricao na ordem fluxo feliz > BDD[0] > descricao > titulo.
// - mesma assinatura pública: (featureId, nos, extras?) — chamadas com 2 args
//   seguem válidas; campos extras no retorno (artefatos/conversaIA/studioDraft)
//   são aditivos e ignorados pelos chamadores atuais.

import type {
  Artefato,
  CriterioBdd,
  Feature,
  FeatureParaStudio,
  GateId,
  NavegacaoParaStudio,
  NexoObject,
  OrigemTelaStudio,
  TelaParaStudio
} from '@/types/nexo'
import type { StudioDoc, StudioFrame } from '@/types/studio'
import { montarArtefato } from '@/utils/artefatos'
import { gateDesbloqueado } from '@/utils/gates'

export interface GateResumo {
  id: GateId
  status: string
  baselineVersao?: number | null
}

/** Extras opcionais (3o parametro): conversa IA e rascunho Studio já existentes. */
export interface EntradaStudioExtras {
  conversaIA?: unknown
  drafts?: unknown
  telasExistentes?: unknown
  studioDraft?: unknown
  studioDoc?: unknown
}

// Chaves da persistência local (leitura guardada, sem escrita, sem relógio).
// Drafts espelha DRAFTS_STORAGE_KEY de src/stores/studioDraftHistory.ts.
const DRAFTS_KEY = 'nexo.v1.studio.drafts.v1'
const STUDIO_DOC_KEY = 'nexo.v1.studio'

function ehFeature(n: NexoObject): n is Feature {
  return n.tipo === 'feature'
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'tela'
}

/** Divide fluxo_feliz em até 3 passos por pontuação/conjunção (determinístico). */
function passosDoFluxo(fluxo: string): string[] {
  const partes = String(fluxo ?? '')
    .split(/;|—|–|\.|\be depois\b|\be\b/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
  if (partes.length === 0 && fluxo.trim()) return [fluxo.trim()]
  return partes.slice(0, 3)
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function ehNaoInformado(v: string): boolean {
  const t = v.trim().toLowerCase()
  return t === '' || t.includes('não informado') || t.includes('nao informado')
}

/** Lê um item de artefato tolerando 'não informado' (devolve '' quando ausente). */
function valorSecao(artefato: Artefato | null, secaoTitulo: string, rotulo: string): string {
  const secao = artefato?.secoes.find((s) => s.titulo === secaoTitulo)
  const item = secao?.itens.find((i) => i.rotulo === rotulo)
  const v = texto(item?.valor)
  return ehNaoInformado(v) ? '' : v
}

function dividirLista(v: string): string[] {
  return v
    .split(/;|\|/)
    .map((s) => s.trim())
    .filter((s) => s !== '' && !ehNaoInformado(s))
}

/** Origem inferida pelo sufixo do id (padrão dos vínculos seed: -tN / -altN). */
function inferirOrigem(id: string): OrigemTelaStudio {
  if (/-t\d+$/.test(id)) return 'fluxo_feliz'
  if (/-alt\d+$/.test(id)) return 'alternativo'
  return 'bdd'
}

/** Extrai textos de conversa de shapes variados (string, registro de draft, DraftSpec). */
function extrairTextosConversa(raw: unknown, limite: number): string[] {
  const out: string[] = []
  const push = (v: unknown): void => {
    const t = texto(v)
    if (t !== '' && !out.includes(t)) out.push(t)
  }
  const deRegistro = (r: unknown): void => {
    if (typeof r === 'string') {
      push(r)
      return
    }
    if (r && typeof r === 'object') {
      const o = r as Record<string, unknown>
      push(o['prompt'])
      const res = o['result']
      if (Array.isArray(res)) {
        for (const d of res) {
          if (d && typeof d === 'object') {
            const props = (d as Record<string, unknown>)['props'] as Record<string, unknown> | undefined
            if (props && typeof props === 'object') {
              push(props['label'])
              push(props['supporting'])
            }
          }
        }
      }
    }
  }
  if (typeof raw === 'string') {
    push(raw)
  } else if (Array.isArray(raw)) {
    for (const r of raw) deRegistro(r)
  } else if (raw && typeof raw === 'object') {
    deRegistro(raw)
  }
  return out.slice(0, limite)
}

function conversaDosExtras(extras: EntradaStudioExtras | null | undefined): string[] {
  if (!extras) return []
  const bruto: unknown[] = []
  if (extras.conversaIA !== undefined) bruto.push(extras.conversaIA)
  if (extras.drafts !== undefined) bruto.push(extras.drafts)
  const out: string[] = []
  for (const b of bruto) {
    for (const t of extrairTextosConversa(b, 5)) {
      if (!out.includes(t)) out.push(t)
    }
  }
  return out.slice(0, 5)
}

/** Drafts locais da feature: prompt contém o featureId ou o título (ordem de registro). */
function lerDraftsLocais(featureId: string, titulo: string): string[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const bruto = localStorage.getItem(DRAFTS_KEY)
    if (!bruto) return []
    const regs = JSON.parse(bruto) as Array<{ prompt?: unknown }>
    if (!Array.isArray(regs)) return []
    const fid = featureId.trim().toLowerCase()
    const tit = titulo.trim().toLowerCase()
    const out: string[] = []
    for (const r of regs) {
      const p = typeof r?.prompt === 'string' ? r.prompt.trim() : ''
      if (p === '') continue
      const alvo = p.toLowerCase()
      const casa = (fid !== '' && alvo.includes(fid)) || (tit !== '' && alvo.includes(tit))
      if (casa && !out.includes(p)) out.push(p)
    }
    return out.slice(0, 5)
  } catch {
    return []
  }
}

interface TelaExistente {
  id: string
  nome: string
  descricao: string
}

function paraTelaExistente(o: Record<string, unknown>): TelaExistente | null {
  const id = texto(o['id'])
  if (id === '') return null
  const nome = texto(o['nome']) || texto(o['name']) || texto((o['props'] as Record<string, unknown> | undefined)?.['label']) || id
  const descricao =
    texto(o['descricao']) ||
    texto(o['note']) ||
    texto(o['supporting']) ||
    texto(o['brief']) ||
    nome
  return { id, nome, descricao }
}

/** Normaliza telas/frames avulsos ou doc do Studio para {id, nome, descricao}. */
function normalizarTelasExistentes(raw: unknown, limite: number): TelaExistente[] {
  const brutos: Record<string, unknown>[] = []
  const empilhar = (v: unknown): void => {
    if (typeof v === 'string') {
      brutos.push({ id: v })
      return
    }
    if (v && typeof v === 'object') brutos.push(v as Record<string, unknown>)
  }
  if (Array.isArray(raw)) {
    for (const it of raw) empilhar(it)
  } else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const doc = o['doc'] as { frames?: unknown } | undefined
    const framesDoc = (doc && typeof doc === 'object' ? doc.frames : undefined) as unknown
    const frames = o['frames'] as unknown
    const telas = o['telas'] as unknown
    const lista = Array.isArray(framesDoc) ? framesDoc : Array.isArray(frames) ? frames : Array.isArray(telas) ? telas : null
    if (lista) {
      for (const it of lista) empilhar(it)
    } else if (typeof o['id'] === 'string') {
      empilhar(o)
    }
  }
  const vistos = new Set<string>()
  const out: TelaExistente[] = []
  for (const b of brutos) {
    const t = paraTelaExistente(b)
    if (!t || vistos.has(t.id)) continue
    vistos.add(t.id)
    out.push(t)
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out.slice(0, limite)
}

function telasDosExtras(extras: EntradaStudioExtras | null | undefined): TelaExistente[] {
  if (!extras) return []
  const partes: unknown[] = []
  if (extras.telasExistentes !== undefined) partes.push(extras.telasExistentes)
  if (extras.studioDraft !== undefined) partes.push(extras.studioDraft)
  if (extras.studioDoc !== undefined) partes.push(extras.studioDoc)
  const vistos = new Set<string>()
  const out: TelaExistente[] = []
  for (const p of partes) {
    for (const t of normalizarTelasExistentes(p, 12)) {
      if (!vistos.has(t.id)) {
        vistos.add(t.id)
        out.push(t)
      }
    }
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out.slice(0, 12)
}

/** Frames locais da feature (id com prefixo `${featureId}-`), ordem estável por id. */
function lerFramesLocais(featureId: string): TelaExistente[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const bruto = localStorage.getItem(STUDIO_DOC_KEY)
    if (!bruto) return []
    const parsed = JSON.parse(bruto) as { doc?: StudioDoc } & { frames?: StudioFrame[] }
    const frames: StudioFrame[] = Array.isArray(parsed?.doc?.frames)
      ? parsed.doc.frames
      : Array.isArray(parsed?.frames)
        ? parsed.frames
        : []
    const prefixo = `${featureId}-`
    return frames
      .filter((f) => typeof f?.id === 'string' && f.id.startsWith(prefixo))
      .map((f) => paraTelaExistente({ id: f.id, nome: f.name, descricao: f.note }))
      .filter((t): t is TelaExistente => t !== null)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, 12)
  } catch {
    return []
  }
}

/** Descricao do fallback na ordem: fluxo feliz > BDD[0] > descricao > titulo. */
function descricaoFallback(f: Feature, fluxo: string, bdds: CriterioBdd[]): string {
  if (fluxo !== '') return fluxo
  const b0 = bdds[0]
  if (b0) {
    const núcleo = `Quando ${texto(b0.when)} → ${texto(b0.then)} (dado ${texto(b0.given)})`.trim()
    if (texto(b0.when) !== '' || texto(b0.then) !== '' || texto(b0.given) !== '') {
      return `[${texto(b0.id) || 'AC'}] ${núcleo}`
    }
  }
  if (texto(f.descricao) !== '') return f.descricao.trim()
  if (texto(f.titulo) !== '') return f.titulo.trim()
  return 'não informado'
}

export function montarEntradaStudio(
  featureId: string,
  nos: NexoObject[],
  extras?: EntradaStudioExtras | null
): FeatureParaStudio | null {
  const alvo = nos.find((n) => n.id === featureId)
  if (!alvo || !ehFeature(alvo)) return null
  const f = alvo
  const ctx = { nos }

  // Artefatos G0/G1/G2 como fonte de fallback (toleram 'não informado').
  let artG0: Artefato | null = null
  let artG1: Artefato | null = null
  let artG2: Artefato | null = null
  try {
    artG0 = montarArtefato(f, 'G0', ctx)
  } catch {
    artG0 = null
  }
  try {
    artG1 = montarArtefato(f, 'G1', ctx)
  } catch {
    artG1 = null
  }
  try {
    artG2 = montarArtefato(f, 'G2', ctx)
  } catch {
    artG2 = null
  }
  void artG0
  void artG1

  const fluxoDireto = texto(f.fluxo_feliz)
  const fluxoArtefato = valorSecao(artG2, 'Fluxo feliz', 'Fluxo')
  const fluxo = fluxoDireto !== '' ? fluxoDireto : fluxoArtefato

  const alternativosDiretos = (f.alternativos ?? []).map((a) => texto(a)).filter((a) => a !== '')
  const alternativosArtefato = dividirLista(valorSecao(artG2, 'Alternativos', 'Exceções'))
  const alternativos = alternativosDiretos.length > 0 ? alternativosDiretos : alternativosArtefato

  const bdds = [...(f.criterios_bdd ?? [])]

  const integracoesDiretas = (f.integracoes ?? []).map((x) => texto(x)).filter((x) => x !== '')
  const integracoesArtefato = dividirLista(valorSecao(artG2, 'Integrações', 'Integrações (timeout/falha)')).map((x) =>
    x.split(' (')[0].trim()
  ).filter((x) => x !== '')
  const integracoes = integracoesDiretas.length > 0 ? integracoesDiretas : integracoesArtefato

  const atorArtefato = valorSecao(artG2, 'Narrativa', 'Ator')
  const ator = texto(f.ator) !== '' ? f.ator : atorArtefato !== '' ? atorArtefato : f.ator

  const telas: TelaParaStudio[] = []
  const navegacao: NavegacaoParaStudio[] = []

  // 1. fluxo_feliz → 2-3 telas
  const passos = fluxo !== '' ? passosDoFluxo(fluxo) : []
  passos.forEach((p, i) => {
    telas.push({
      id: `${f.id}-t${i + 1}`,
      nome: `${texto(f.titulo) !== '' ? f.titulo : f.id} — passo ${i + 1}`,
      origem: 'fluxo_feliz',
      descricao: p
    })
    if (i > 0) {
      navegacao.push({
        de: `${f.id}-t${i}`,
        para: `${f.id}-t${i + 1}`,
        gatilho: p.slice(0, 120)
      })
    }
  })

  // 2. cada alternativo → 1 tela de exceção ligada à última do fluxo
  const ultimaFluxo = telas.length > 0 ? telas[telas.length - 1].id : `${f.id}-t1`
  alternativos.forEach((alt, i) => {
    const id = `${f.id}-alt${i + 1}`
    telas.push({ id, nome: `${texto(f.titulo) !== '' ? f.titulo : f.id} — exceção ${i + 1}`, origem: 'alternativo', descricao: alt })
    navegacao.push({ de: ultimaFluxo, para: id, gatilho: alt.slice(0, 120) })
  })

  // 3. conversa IA do draftHistory da feature → 1 tela 'bdd' por prompt distinto
  const conversaExtras = conversaDosExtras(extras)
  const conversaLocal = conversaExtras.length > 0 ? [] : lerDraftsLocais(f.id, f.titulo)
  const conversa = [...conversaExtras, ...conversaLocal.filter((t) => !conversaExtras.includes(t))].slice(0, 5)
  conversa.forEach((promptTexto, i) => {
    const id = `${f.id}-ia${i + 1}`
    if (telas.some((t) => t.id === id)) return
    telas.push({
      id,
      nome: `${texto(f.titulo) !== '' ? f.titulo : f.id} — conversa IA ${i + 1}`,
      origem: 'bdd',
      descricao: promptTexto.slice(0, 500)
    })
    const origemNav = telas.length > 1 ? telas[telas.length - 2].id : null
    if (origemNav) {
      navegacao.push({ de: origemNav, para: id, gatilho: promptTexto.slice(0, 120) })
    }
  })

  // 4. studioDraft existente (frames da feature) — incorpora sem duplicar ids
  const rascunhosExtras = telasDosExtras(extras)
  const rascunhosLocais = rascunhosExtras.length > 0 ? [] : lerFramesLocais(f.id)
  const rascunhos = [...rascunhosExtras, ...rascunhosLocais.filter((r) => !rascunhosExtras.some((e) => e.id === r.id))]
  for (const r of rascunhos) {
    if (telas.some((t) => t.id === r.id)) continue
    telas.push({ id: r.id, nome: r.nome, origem: inferirOrigem(r.id), descricao: r.descricao })
  }

  // 5. cada AC BDD → transição/asserção anotada (sem criar tela nova)
  bdds.forEach((ac) => {
    const chave = slug(`${texto(ac.when)} ${texto(ac.then)}`)
    navegacao.push({
      de: ultimaFluxo,
      para: ultimaFluxo,
      gatilho: `[${texto(ac.id) || 'AC'}] quando ${texto(ac.when)} → ${texto(ac.then)} (dado ${texto(ac.given)}) #${chave}`
    })
  })

  // 6. NUNCA telas vazias — fallback de 1 pré-tela mínima
  if (telas.length === 0) {
    telas.push({
      id: `${f.id}-t1`,
      nome: texto(f.titulo) !== '' ? f.titulo : f.id,
      origem: 'fluxo_feliz',
      descricao: descricaoFallback(f, fluxo, bdds)
    })
  }

  const pbiIds = nos
    .filter((n) => n.tipo === 'pbi' && (n as unknown as { feature_id?: string }).feature_id === f.id)
    .map((n) => n.id)

  return {
    featureId: f.id,
    titulo: f.titulo,
    ator,
    telas,
    navegacao,
    contexto: {
      fluxo_feliz: fluxo,
      alternativos: [...alternativos],
      criterios_bdd: [...bdds],
      integracoes: [...integracoes],
      pbiIds
    },
    // Evidência aditiva da composição (ignorada pelos chamadores atuais).
    artefatos: { G0: artG0, G1: artG1, G2: artG2 },
    conversaIA: [...conversa],
    studioDraft: [...rascunhos]
  } as unknown as FeatureParaStudio
}

/** Trava: feature pronta p/ Studio = G2 aprovado com baseline (cadeado existente). */
export function isFeatureProntaParaStudio(featureId: string, gates: GateResumo[]): boolean {
  const g2 = gates.find((g) => g.id === 'G2')
  if (!g2) return false
  void featureId
  return g2.status === 'aprovado' && g2.baselineVersao != null && gateDesbloqueado('G2', gates)
}

export function listarFeaturesElegiveis(nos: NexoObject[], gates: GateResumo[]): Feature[] {
  if (!isFeatureProntaParaStudio('', gates)) return []
  return nos.filter(ehFeature)
}
