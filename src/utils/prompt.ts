import type { CriterioBdd, Edge, NexoObject } from '@/types/nexo'

// Gera prompt em linguagem natural do grafo (todo ou subgrafo do selecionado).
// Inclui título, descrição, BDD, regras, fontes, decisões pendentes, arestas e tokens.

export interface PromptOpts {
  alvo: 'vue' | 'ruby'
  escopo: 'tudo' | 'selecao'
  idioma: 'pt' | 'en'
}

const TOKENS = `Tema/tokens: fundo #F7F8FB, superfície #FFFFFF, primário #1D4ED8, texto #0F172A/#64748B, borda #E2E8F0, âmbar stale #F59E0B/#FFFBEB, raios 12/8/6px.`

export function bddTexto(c: CriterioBdd): string {
  return `${c.id}: Dado ${c.given} Quando ${c.when} Então ${c.then} [${c.prioridade}]`
}

export function gerarPrompt(
  nos: NexoObject[],
  arestas: Edge[],
  selecionadoId: string | null,
  opts: PromptOpts
): string {
  const pt = opts.idioma === 'pt'
  const alvoTxt =
    opts.alvo === 'vue'
      ? pt
        ? 'Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia'
        : 'Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia'
      : 'Ruby on Rails API (OpenAPI, controller, service, serializer, RSpec)'
  const noSel = nos.find((n) => n.id === selecionadoId) ?? null
  const conjunto =
    opts.escopo === 'selecao' && noSel
      ? [
          noSel,
          ...nos.filter((n) =>
            arestas.some(
              (e) =>
                (e.origem_id === noSel.id && e.destino_id === n.id) ||
                (e.destino_id === noSel.id && e.origem_id === n.id)
            )
          )
        ]
      : nos
  const ids = new Set(conjunto.map((n) => n.id))
  const arestasSel = arestas.filter((e) => ids.has(e.origem_id) && ids.has(e.destino_id))

  const linhas: string[] = []
  linhas.push(
    pt
      ? `Implemente no alvo ${alvoTxt} o seguinte escopo NEXO (${opts.escopo === 'selecao' ? 'nó selecionado + vizinhos' : 'design inteiro'}):`
      : `Implement in ${alvoTxt} the following NEXO scope (${opts.escopo === 'selecao' ? 'selected node + neighbors' : 'whole design'}):`
  )
  linhas.push('')
  for (const n of conjunto) {
    linhas.push(`## [${n.tipo}/${n.gate}/${n.status}] ${n.titulo} (id=${n.id}, v${n.versao})`)
    linhas.push(n.descricao)
    const f = n as unknown as Record<string, unknown>
    if (typeof f['ator'] === 'string' && f['ator']) linhas.push(`Ator: ${f['ator']}`)
    if (typeof f['fluxo_feliz'] === 'string' && f['fluxo_feliz']) linhas.push(`Fluxo feliz: ${f['fluxo_feliz']}`)
    const bdd = f['criterios_bdd'] as CriterioBdd[] | undefined
    if (bdd && bdd.length > 0) {
      linhas.push(pt ? 'Critérios BDD:' : 'BDD criteria:')
      for (const c of bdd) linhas.push(`- ${bddTexto(c)}`)
    }
    if (Array.isArray(f['regras_ids']) && (f['regras_ids'] as unknown[]).length > 0)
      linhas.push(`Regras: ${(f['regras_ids'] as string[]).join(', ')}`)
    if (Array.isArray(f['integracoes']) && (f['integracoes'] as string[]).length > 0)
      linhas.push(`Integrações: ${(f['integracoes'] as string[]).join('; ')}`)
    linhas.push(`Fonte: ${n.fonte} | Owner: ${n.owner} | Classificação: ${n.classificacao}`)
    if (n.status === 'stale') linhas.push(`Decisão pendente: revisar causa "${n.causa_stale ?? 'não informada'}" antes de gerar código.`)
    linhas.push('')
  }
  if (arestasSel.length > 0) {
    linhas.push(pt ? 'Relações:' : 'Relations:')
    for (const e of arestasSel)
      linhas.push(`- ${e.origem_id} --[${e.tipo}/${e.forca}]--> ${e.destino_id} (${e.justificativa})`)
    linhas.push('')
  }
  linhas.push(TOKENS)
  linhas.push(
    pt
      ? 'Entregue arquivos, diffs, comandos de validação e evidências; não invente requisitos; marque inferências como pendentes.'
      : 'Deliver files, diffs, validation commands and evidence; do not invent requirements; mark inferences as pending.'
  )
  return linhas.join('\n')
}

export function gerarAgentMd(): string {
  return `# NEXO agent\n\nVocê é um agente implementador NEXO (Vue 3 + TS + Tailwind + Pinia, sem backend).\n\nRegras:\n- Leia o prompt colado (gerado em Copiar prompt) como especificação.\n- Não invente requisitos; marque inferências como pendentes.\n- Respeite tokens: #F7F8FB, #FFFFFF, #1D4ED8, #0F172A, #E2E8F0, âmbar #F59E0B/#FFFBEB.\n- Entregue arquivos + diffs + comandos (npm run dev, vue-tsc --noEmit, npm run build).\n- Gates: só avance com checklist bloqueante 100% e papel permitido.\n`
}
