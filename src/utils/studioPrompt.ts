import type { StudioDoc } from '@/types/studio'

export interface StudioPromptAuthor {
  authorName?: string
  model?: string
  provider?: string
}

// Prompt PT-BR do Studio: design inteiro ou 1 tela, com labels, notes, actions e tema.
export function gerarPromptStudio(
  doc: StudioDoc,
  frameId: string | 'tudo',
  origemNo?: string,
  author?: StudioPromptAuthor | null
): string {
  const frames = frameId === 'tudo' ? doc.frames : doc.frames.filter((f) => f.id === frameId)
  const linhas: string[] = []
  if (author && (author.authorName || author.model)) {
    const modelStr = author.model ? ` (${author.model})` : ''
    const authorStr = author.authorName ?? ''
    linhas.push(`Author: ${authorStr}${modelStr}`.trim())
    linhas.push('')
  }
  linhas.push(`Implemente em Vue 3 + TypeScript + Tailwind CSS as telas abaixo (origem NEXO: ${origemNo ?? '—'}). Não invente conteúdo; use labels e notes literais.`)
  linhas.push('')
  linhas.push(`App: ${doc.title}${doc.brief ? ` — ${doc.brief}` : ''}`)
  linhas.push(`Tema: paleta ${doc.theme.palette}, scheme ${doc.theme.scheme}, tipo ${doc.theme.type}, raio ${doc.theme.radius}, plataforma ${doc.platform}.`)
  linhas.push('')
  for (const f of frames) {
    linhas.push(`## Tela "${f.name}" (id=${f.id}, ${f.w}x${f.h}${f.note ? ` — ${f.note}` : ''})`)
    const itens = doc.groups.flatMap((g) => g.items).filter((i) => i.x >= f.x && i.x < f.x + f.w)
    for (const i of itens) {
      const partes = [`- [${i.kind}] ${i.label ?? ''}`]
      if (i.supporting) partes.push(`apoio: ${i.supporting}`)
      if (i.note) partes.push(`nota: ${i.note}`)
      if (i.action) partes.push(`ao tocar → ${i.action.to} (${i.action.transition})`)
      if (i.tabs) partes.push(`abas: ${(i.tabs as { label: string }[]).map((t) => t.label).join(' | ')}`)
      linhas.push(partes.join(' · '))
    }
    linhas.push('')
  }
  linhas.push('Entregue componentes Vue, responsivo, foco visível e aria-labels PT-BR.')
  return linhas.join('\n')
}
