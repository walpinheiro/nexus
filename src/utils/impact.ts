import type { Edge, ImpactItem, ImpactPlan, NexoObject, OperacaoImpacto } from '@/types/nexo'

// Motor de impacto local — fonte: nexo-especificacoes/04 (grafo/versão/impacto) + 17.
// Percorre realiza/consome/valida/restringe; 'contem' só agrega visualização.
// Limite de profundidade + detecção de ciclo + correlation_id. Reversível por versão.

const REL_IMPACTO = new Set(['realiza', 'consome', 'valida', 'restringe', 'impacta'])
const MAX_PROFUNDIDADE = 6

function rid(): string {
  return 'imp-' + Math.random().toString(36).slice(2, 10)
}

function sugerirOperacao(tipo: string): OperacaoImpacto {
  if (tipo === 'consome' || tipo === 'valida') return 'revisar'
  if (tipo === 'realiza' || tipo === 'restringe' || tipo === 'impacta') return 'regenerar'
  return 'revisar'
}

export function calcularImpacto(
  origemId: string,
  nos: NexoObject[],
  arestas: Edge[],
  nomeOwner: (id: string) => string
): ImpactPlan {
  const porId = new Map(nos.map((n) => [n.id, n]))
  const adj = new Map<string, { via: Edge; vizinho: string }[]>()
  for (const e of arestas) {
    if (!REL_IMPACTO.has(e.tipo)) continue
    if (!adj.has(e.origem_id)) adj.set(e.origem_id, [])
    adj.get(e.origem_id)!.push({ via: e, vizinho: e.destino_id })
    // propaga também no sentido inverso para dependentes (quem consome a origem)
    if (!adj.has(e.destino_id)) adj.set(e.destino_id, [])
  }
  // BFS a partir da origem seguindo arestas de impacto em ambas as direções,
  // exceto 'contem' (já filtrado). Evita ciclo com visitados.
  const visitados = new Set<string>([origemId])
  const fila: { id: string; prof: number; via: string[] }[] = [{ id: origemId, prof: 0, via: [] }]
  const itens: ImpactItem[] = []

  while (fila.length > 0) {
    const atual = fila.shift()!
    if (atual.prof >= MAX_PROFUNDIDADE) continue
    const saidas = arestas.filter(
      (e) => REL_IMPACTO.has(e.tipo) && (e.origem_id === atual.id || e.destino_id === atual.id)
    )
    for (const e of saidas) {
      const viz = e.origem_id === atual.id ? e.destino_id : e.origem_id
      if (visitados.has(viz)) continue
      visitados.add(viz)
      const alvo = porId.get(viz)
      if (!alvo) continue
      const via = [...atual.via, e.tipo]
      itens.push({
        id: viz,
        titulo: alvo.titulo,
        via,
        operacao: sugerirOperacao(e.tipo),
        owner: nomeOwner(alvo.owner),
        aprovado: false,
        aplicado: false,
        statusAnterior: alvo.status,
        versaoAnterior: alvo.versao
      })
      fila.push({ id: viz, prof: atual.prof + 1, via })
    }
  }

  // Remove a própria origem caso tenha entrado por ciclo
  return {
    correlation_id: rid(),
    origem_id: origemId,
    em: new Date().toISOString(),
    itens: itens.filter((i) => i.id !== origemId)
  }
}
