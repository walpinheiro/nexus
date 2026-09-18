// Ingestão de texto livre — heurística keyword PT-BR, pura e determinística.
// Sem rede, sem DOM, sem Date/Math.random. Fallback honesto: vazio quando nada extraído.

export interface AnaliseIngestao {
  problema: string
  objetivo: string
  publico: string[]
  restricoes: string[]
  riscos: string[]
  bdd: { given: string; when: string; then: string }[]
}

function normalizarEspacos(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function dividirSentencas(texto: string): string[] {
  return texto
    .split(/[.?!;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function limparValor(v: string, max: number): string {
  return normalizarEspacos(v).replace(/[.]+$/, '').trim().slice(0, max)
}

function primeiroGrupo(sentencas: string[], padroes: RegExp[], max: number): string {
  for (const sent of sentencas) {
    for (const rx of padroes) {
      const m = sent.match(rx)
      if (m && m[1]) {
        const v = limparValor(m[1], max)
        if (v.length >= 2) return v
      }
    }
  }
  return ''
}

function todosGrupos(sentencas: string[], padroes: RegExp[], max: number, limite = 5): string[] {
  const out: string[] = []
  for (const sent of sentencas) {
    for (const rx of padroes) {
      const m = sent.match(rx)
      if (m && m[1]) {
        const v = limparValor(m[1], max)
        if (v.length >= 2 && !out.includes(v)) out.push(v)
        if (out.length >= limite) return out
      }
    }
  }
  return out.slice(0, limite)
}

const RX_PROBLEMA: RegExp[] = [
  /quero (?:um |uma |criar |fazer |montar )?app de (.+)/i,
  /problema (?:é|:)?(.+)/i,
  /(?:a )?dor (?:é|:)?(.+)/i,
  /dificuldade (?:é|de|:)?(.+)/i,
  /oportunidade (?:é|:)?(.+)/i,
  /preciso (?:de )?(.+)/i,
  /quero (.+)/i
]

const RX_OBJETIVO: RegExp[] = [
  /meta (?:é|:)?(.+)/i,
  /objetivo (?:é|:)?(.+)/i,
  /quero alcan[cç]ar (.+)/i,
  /espero (.+)/i,
  /hip[oó]tese (?:é|:)?(.+)/i
]

const RX_PUBLICO: RegExp[] = [
  /meu p[uú]blico (?:alvo )?(?:é|:)?(.+)/i,
  /p[uú]blico (?:alvo )?(?:é|:)?(.+)/i,
  /persona (?:é|:)?(.+)/i,
  /usu[aá]rios? (?:s[aã]o|é|:)?(.+)/i,
  /clientes? (?:s[aã]o|é|:)?(.+)/i
]

const RX_RESTRICAO: RegExp[] = [
  /n[aã]o inclui (.+)/i,
  /n[aã]o quero (.+)/i,
  /fora (?:do escopo )?(?:fica )?:?(.+)/i,
  /exceto (.+)/i,
  /restri[cç][aã]o (?:é|:)?(.+)/i
]

const RX_RISCO: RegExp[] = [
  /risco (?:é|:|de)?(.+)/i,
  /medo (?:é|de|:)?(.+)/i,
  /preocupa[cç][aã]o (?:é|com|:)?(.+)/i,
  /receio (?:é|de|:)?(.+)/i,
  /pode (?:dar errado|falhar|quebrar)(.+)/i
]

/** Analisa texto livre e extrai problema/objetivo/público/restrições/riscos/BDD. */
export function analisarIngestao(texto: string): AnaliseIngestao {
  const limpo = normalizarEspacos(texto ?? '')
  const vazio: AnaliseIngestao = {
    problema: '',
    objetivo: '',
    publico: [],
    restricoes: [],
    riscos: [],
    bdd: []
  }
  if (!limpo) return vazio

  const sentencas = dividirSentencas(limpo)
  if (sentencas.length === 0) return vazio

  const problema = primeiroGrupo(sentencas, RX_PROBLEMA, 200)
  const objetivo = primeiroGrupo(sentencas, RX_OBJETIVO, 200)
  const publico = todosGrupos(sentencas, RX_PUBLICO, 120)
  const restricoes = todosGrupos(sentencas, RX_RESTRICAO, 200)
  const riscos = todosGrupos(sentencas, RX_RISCO, 200)

  const bdd: { given: string; when: string; then: string }[] =
    problema && objetivo && publico.length > 0
      ? [{ given: `que ${publico[0]}`, when: `executa ${problema}`, then: `alcança ${objetivo}` }]
      : []

  return { problema, objetivo, publico, restricoes, riscos, bdd }
}
