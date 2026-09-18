// Payload gate→Studio (QUEEN-MOTOR O3) — heurística documentada, SEM mock:
// - fluxo_feliz vira 2-3 telas (ex: pagar → QR + timer + confirmação);
// - cada alternativo vira 1 tela;
// - cada AC BDD vira transição/asserção anotada na navegação.
// Tudo derivado do objeto Feature + PBIs vinculados (feature_id). Sem rede.

import type {
  Feature,
  FeatureParaStudio,
  GateId,
  NavegacaoParaStudio,
  NexoObject,
  TelaParaStudio
} from '@/types/nexo'
import { gateDesbloqueado } from '@/utils/gates'

export interface GateResumo {
  id: GateId
  status: string
  baselineVersao?: number | null
}

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

export function montarEntradaStudio(featureId: string, nos: NexoObject[]): FeatureParaStudio | null {
  const alvo = nos.find((n) => n.id === featureId)
  if (!alvo || !ehFeature(alvo)) return null
  const f = alvo
  const telas: TelaParaStudio[] = []
  const navegacao: NavegacaoParaStudio[] = []

  // 1. fluxo_feliz → 2-3 telas
  const passos = passosDoFluxo(f.fluxo_feliz)
  passos.forEach((p, i) => {
    telas.push({
      id: `${f.id}-t${i + 1}`,
      nome: `${f.titulo} — passo ${i + 1}`,
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
  ;(f.alternativos ?? []).forEach((alt, i) => {
    const id = `${f.id}-alt${i + 1}`
    telas.push({ id, nome: `${f.titulo} — exceção ${i + 1}`, origem: 'alternativo', descricao: alt })
    navegacao.push({ de: ultimaFluxo, para: id, gatilho: alt.slice(0, 120) })
  })

  // 3. cada AC BDD → transição/asserção anotada (sem criar tela nova)
  ;(f.criterios_bdd ?? []).forEach((ac) => {
    const chave = slug(`${ac.when} ${ac.then}`)
    navegacao.push({
      de: ultimaFluxo,
      para: ultimaFluxo,
      gatilho: `[${ac.id}] quando ${ac.when} → ${ac.then} (dado ${ac.given}) #${chave}`
    })
  })

  const pbiIds = nos
    .filter((n) => n.tipo === 'pbi' && (n as unknown as { feature_id?: string }).feature_id === f.id)
    .map((n) => n.id)

  return {
    featureId: f.id,
    titulo: f.titulo,
    ator: f.ator,
    telas,
    navegacao,
    contexto: {
      fluxo_feliz: f.fluxo_feliz,
      alternativos: [...(f.alternativos ?? [])],
      criterios_bdd: [...(f.criterios_bdd ?? [])],
      integracoes: [...(f.integracoes ?? [])],
      pbiIds
    }
  }
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
