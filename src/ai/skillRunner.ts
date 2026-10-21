// SkillRunner QUEEN-MOTOR O2/O5 + FIX-REAL-OLLAMA R1/R2.
// FATO PROVADO PELO DONO: o servidor real em :11434 é llama.cpp (llama-server) servindo
// Ternary-Bonsai-2-27B, NÃO Ollama oficial. Por isso o motor usa o client dual
// (chatComProvedor: /api/chat → /v1/chat/completions, model EFETIVO via /v1/models).
// Offline (OllamaOffline) → fallback local HONESTO: diz "servidor inalcançável" e faz a
// pergunta da próxima falta — NUNCA menu de comandos (o mock que o dono viu).
// Retorno inclui SEMPRE provider:'ollama'|'llama.cpp'|'local-fallback' + model EFETIVO.
//
// CONTRATO INTERNO O5 (Bússola) — LEIA ANTES DE USAR NA UX:
// - A seleção de skill é 100% INTERNA por gateId (ver `selecionarSkillInterna`): o MOTOR
//   escolhe sozinho qual skill cobre as faltas diagnosticadas. O campo `skillId` existe no
//   tipo APENAS para rastreabilidade interna (logs/telemetria) — a UX NÃO deve exibir
//   nome/id de skill, badge de skill, nem seletor de skill. A sessão apresenta-se como
//   "IA do Gate {gateId}".
// - Ordem de providers (O5): tenta Ollama PRIMEIRO (`chat` → http://localhost:11434,
//   model queen via `getConfig()`); qualquer `OllamaOffline` → fallback local SILENCIOSO
//   (sem toast/erro), marcado `provider:'local-fallback', model:'local'`.
// - `papelUsuario` (O5, OPCIONAL e retrocompatível): adapta o ROTEIRO ao papel do usuário
//   logado — MANTÉM TODAS as perguntas do gate (nenhum check é removido), mudando apenas
//   ORDEM + TOM + EXEMPLOS (ver `ordenarFaltasPorPapel` + `linhaTomPorPapel`).
//   Ex.: Dev em G2 vê FTR-007/008 (BDD/contrato) primeiro com tom técnico; PM em G2 vê
//   FTR-001/002 (narrativa/escopo) primeiro com tom de negócio. Ausente → ordem normativa.

import type { GateId, NexoObject, PatchMudanca, Role } from '@/types/nexo'
import {
  diagnosticarFaltasGate,
  obterSkillsDoGate,
  type FaltaGate
} from '@/ai/gateSkills'
import { chatComProvedor, OllamaOffline, type OllamaMessage } from '@/ai/ollamaClient'

export type SkillRunnerProvider = 'ollama' | 'llama.cpp' | 'local-fallback'

export interface SkillRunnerResult {
  skillId: string
  respostasColetadas: Record<string, string>
  faltasRestantes: FaltaGate[]
  outputParcial: string
  patchProposto: { justificativa: string; mudancas: PatchMudanca[] } | null
  provider: SkillRunnerProvider
  model: string
}

/**
 * R2/R5 — grill-me via LLM de verdade (PROVADO no server real do dono).
 * O system carrega a SKILL do gate de fato: skill interna selecionada (nome interno),
 * checks cobertos, perguntas do DICIONARIO (pergunta/porQueBloqueia/exemplo), estado
 * resumido do objeto e faltas diagnosticadas. O LLM é instruído a conduzir UMA pergunta
 * por vez, extrair respostas do histórico e confirmar antes de propor patch.
 * Sem menu de comandos: a instrução PROÍBE responder com lista de comandos
 * ("experimente pedir...") — isso era o mock que o dono viu.
 * G2 (pedido do dono): o system inclui o PORTFÓLIO de features do G0/épico para o LLM
 * estimar quantas features faltam (previsão), mas a CONDUÇÃO continua 1 feature por vez:
 * `featureFoco` = a feature em pauta; `outrasFeatures` = contexto p/ previsão de escopo.
 */
function montarSystemGrill(
  gateId: GateId,
  skillId: string,
  faltasRoteiro: FaltaGate[],
  objeto: NexoObject,
  papelUsuario?: Role,
  contextoG2?: { epico?: NexoObject | null; features?: NexoObject[] }
): string {
  const skills = obterSkillsDoGate(gateId)
  const skill = skills.find((s) => s.id === skillId) ?? skills[0]
  const checksLinha = (skill?.checks ?? []).join(', ') || '(nenhum)'
  const perguntas = faltasRoteiro
    .map((f) => `- [${f.codigo}] campoAlvo=${f.campoAlvo} (${f.severidade}): ${f.pergunta} Por que bloqueia: ${f.porQueBloqueia} Exemplo: "${f.exemplo}"`)
    .join('\n')
  const linhaPapel = linhaTomPorPapel(gateId, papelUsuario)
  // G2 (pedido do dono): portfólio p/ previsão de escopo — quantas features o G0 prevê.
  let blocoPortifolio = ''
  if (gateId === 'G2' && contextoG2) {
    const feats = (contextoG2.features ?? []).filter((x) => x.id !== objeto.id)
    const linhasFeats = feats.length > 0
      ? feats.map((x) => `- ${x.titulo} (id=${x.id}, status=${x.status}, v${x.versao})`).join('\n')
      : '(nenhuma outra feature no grafo)'
    const epi = contextoG2.epico
    blocoPortifolio = [
      '',
      `PORTFÓLIO G2 (contexto p/ previsão de escopo — CONDUZA SÓ "${objeto.titulo}"):`,
      `Épico de origem: ${epi ? `"${epi.titulo}" — ${epi.descricao}` : 'não informado'}.`,
      'Outras features já mapeadas:',
      linhasFeats,
      'Com base no épico + no que já existe, ao final (quando as faltas zerarem) estime em 1 frase quantas features no TOTAL o G0 prevê e quais faltam detalhar. NUNCA conduza 2 features na mesma resposta.'
    ].join('\n')
  }
  return [
    `Você é a IA de apoio ao Gate ${gateId} do NEXO (100% local, PT-BR).`,
    `Skill interna em uso: ${skill?.nome ?? skillId} [${skillId}] — checks: ${checksLinha}.`,
    `Estado atual do objeto "${objeto.titulo}" (tipo=${objeto.tipo}, id=${objeto.id}):`,
    JSON.stringify(objeto, null, 1).slice(0, 2500),
    '',
    'Faltas diagnosticadas (ROTEIRO — conduza nesta ordem, UMA pergunta por vez):',
    perguntas || '(nenhuma — todos os checks OK; confirme o estado e elogie objetivamente)',
    blocoPortifolio,
    '',
    linhaPapel,
    'REGRAS DURAS:',
    '1. Faça UMA única pergunta por resposta — sempre a próxima falta do roteiro acima.',
    '2. Quando o usuário responder, extraia o valor para o campoAlvo e CONFIRME ("Anotei X para [CODIGO]") antes de avançar.',
    '3. NUNCA responda com menu/lista de comandos como "experimente pedir: ..." — isso é proibido.',
    '4. Para cada falta cite o código do check, o campoAlvo e o valor sugerido entre aspas.',
    '5. Se perguntarem "qual o seu modelo?", responda apenas com fatos da conversa; nunca invente nome de modelo.',
    '6. Resposta com no máximo 8 linhas,PT-BR,zero emoji (sem pictogramas).'
  ].join('\n')
}

function montarUser(objeto: NexoObject, gateId: GateId, historico: OllamaMessage[]): string {
  const diag = diagnosticarFaltasGate(objeto, gateId)
  const linhas = diag.faltas
    .map((f) => `- ${f.codigo} [${f.severidade}] campoAlvo=${f.campoAlvo}: ${f.descricao} Pergunta: ${f.pergunta}`)
    .join('\n')
  const hist = (historico ?? [])
    .filter((m) => m.role !== 'system')
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
  return [
    `Objeto "${objeto.titulo}" (tipo=${objeto.tipo}, id=${objeto.id}, gate=${gateId}):`,
    JSON.stringify(objeto, null, 1).slice(0, 4000),
    '',
    'Faltas diagnosticadas:',
    linhas || '(nenhuma — todos os checks OK)',
    '',
    hist ? `Histórico recente:\n${hist}\n` : '',
    'Extraia do histórico/texto do usuário o valor de cada campoAlvo (ex: FTR-003→precondicoes, FTR-005→regras de negócio, FTR-006→gatilho, EPC-004→personas, EPC-005→objetivo, EPC-006→kpis extras, ENQ-002→personas, ENQ-003→hipótese, ENQ-005→escopo, ENQ-006→riscos, ARC-003..008→contrato/adr/nfr/segurança/e2e).'
  ].join('\n')
}

/** Heurística local: extrai "campoAlvo: valor" ou "codigo: valor" do texto (cobre buracos FTR-003/005/006, EPC-004/005/006, ENQ-002/003/005/006, ARC-003..008). */
export function extrairRespostasDoTexto(texto: string, faltas: FaltaGate[]): Record<string, string> {
  const out: Record<string, string> = {}
  const linhas = String(texto ?? '').split(/\r?\n/)
  for (const ln of linhas) {
    const m = ln.match(/^\s*([A-Za-z0-9_.-]+)\s*[:=]\s*(.{3,})\s*$/)
    if (!m) continue
    const chave = m[1].trim()
    const valor = m[2].trim()
    for (const f of faltas) {
      if (
        f.codigo.toLowerCase() === chave.toLowerCase() ||
        f.campoAlvo.toLowerCase() === chave.toLowerCase()
      ) {
        if (!out[f.codigo]) out[f.codigo] = valor
      }
    }
  }
  // fallback: texto corrido >= 15 chars preenche a primeira falta sem resposta
  if (Object.keys(out).length === 0 && texto.trim().length >= 15 && faltas.length > 0) {
    out[faltas[0].codigo] = texto.trim().slice(0, 500)
  }
  return out
}

/**
 * REGRA O5 — roteiro adaptado ao papel (retrocompatível):
 * - `papelUsuario` é OPCIONAL; ausente/undefined → ordem normativa do diagnóstico.
 * - NUNCA remove perguntas/checks: `faltasRestantes` contém TODAS as faltas do gate,
 *   apenas REORDENADAS + com TOM/EXEMPLOS ajustados no system prompt (ver
 *   `linhaTomPorPapel`). Ex.: Dev em G2 vê FTR-007/FTR-008 (BDD/contrato) primeiro
 *   com tom técnico; PM em G2 vê FTR-001/FTR-002 (narrativa/escopo) primeiro.
 */
const PRIORIDADE_POR_PAPEL: Record<GateId, Record<string, string[]>> = {
  G0: {
    'Dev|TechLead|Arquiteto': ['ENQ-005', 'ENQ-006', 'ENQ-001', 'ENQ-002', 'ENQ-003', 'ENQ-004'],
    default: ['ENQ-001', 'ENQ-002', 'ENQ-003', 'ENQ-004', 'ENQ-005', 'ENQ-006']
  },
  G1: {
    'Dev|TechLead|Arquiteto|QA': ['EPC-003', 'EPC-006', 'EPC-002', 'EPC-001', 'EPC-004', 'EPC-005'],
    default: ['EPC-001', 'EPC-004', 'EPC-002', 'EPC-003', 'EPC-005', 'EPC-006']
  },
  G2: {
    'Dev|QA|TechLead|Arquiteto': ['FTR-007', 'FTR-008', 'FTR-006', 'FTR-005', 'FTR-003', 'FTR-004', 'FTR-001', 'FTR-002'],
    default: ['FTR-001', 'FTR-002', 'FTR-004', 'FTR-005', 'FTR-003', 'FTR-006', 'FTR-007', 'FTR-008']
  },
  G3: {
    'Seguranca': ['ARC-006', 'ARC-008', 'ARC-007', 'ARC-001', 'ARC-002', 'ARC-003', 'ARC-004', 'ARC-005'],
    default: ['ARC-001', 'ARC-002', 'ARC-003', 'ARC-004', 'ARC-005', 'ARC-006', 'ARC-007', 'ARC-008']
  },
  G4: {
    'Dev|QA|TechLead': ['PBI-ACEITE', 'PBI-TESTE', 'PBI-COND-TESTE', 'PBI-CONTRATO', 'PBI-DEP', 'PBI-BLOQ', 'PBI-ORIGEM', 'PBI-ESCOPO', 'PBI-OWNER', 'PBI-COND-COMPAT', 'PBI-COND-ROLLBACK', 'PBI-COND-TELA'],
    default: ['PBI-ORIGEM', 'PBI-ESCOPO', 'PBI-ACEITE', 'PBI-DEP', 'PBI-OWNER', 'PBI-TESTE', 'PBI-CONTRATO', 'PBI-BLOQ', 'PBI-COND-COMPAT', 'PBI-COND-ROLLBACK', 'PBI-COND-TELA', 'PBI-COND-TESTE']
  },
  G5: {
    'PM|PO|Negocio|UX': ['DON-001', 'DON-004', 'DON-002', 'DON-003', 'DON-005', 'DON-006'],
    default: ['DON-001', 'DON-002', 'DON-003', 'DON-004', 'DON-005', 'DON-006']
  }
}

function prioridadePara(gateId: GateId, papel?: Role): string[] {
  if (!papel) return PRIORIDADE_POR_PAPEL[gateId].default
  const mapa = PRIORIDADE_POR_PAPEL[gateId]
  for (const chave of Object.keys(mapa)) {
    if (chave === 'default') continue
    if (chave.split('|').includes(papel)) return mapa[chave]
  }
  return mapa.default
}

/** Reordena faltas por papel (estável; mantém TODAS — só muda a ordem do roteiro). */
export function ordenarFaltasPorPapel(faltas: FaltaGate[], gateId: GateId, papel?: Role): FaltaGate[] {
  if (!papel || faltas.length <= 1) return [...faltas]
  const prio = prioridadePara(gateId, papel)
  const rank = (codigo: string) => {
    const i = prio.indexOf(codigo)
    return i === -1 ? prio.length : i
  }
  return [...faltas]
    .map((f, idx) => ({ f, idx }))
    .sort((a, b) => rank(a.f.codigo) - rank(b.f.codigo) || a.idx - b.idx)
    .map((x) => x.f)
}

/** Linha de tom/exemplos injetada no system prompt conforme papel (não remove checks). */
function linhaTomPorPapel(gateId: GateId, papel?: Role): string {
  if (!papel) return 'Mantenha tom neutro e exemplos padrão do dicionário do gate.'
  if (['Dev', 'QA', 'TechLead', 'Arquiteto'].includes(papel)) {
    if (gateId === 'G2')
      return `Adapte o roteiro ao papel ${papel}: tom técnico, exemplos com BDD Given/When/Then, contrato, timeout e estados de UI — sem remover nenhuma pergunta do gate.`
    return `Adapte o roteiro ao papel ${papel}: tom técnico com exemplos de contrato, teste e rastreabilidade — sem remover nenhuma pergunta do gate.`
  }
  if (['PM', 'PO', 'Negocio', 'UX'].includes(papel)) {
    if (gateId === 'G2')
      return `Adapte o roteiro ao papel ${papel}: tom de negócio, exemplos com narrativa de benefício, escopo e valor ao usuário — sem remover nenhuma pergunta do gate.`
    return `Adapte o roteiro ao papel ${papel}: tom de negócio com exemplos de narrativa, escopo e valor — sem remover nenhuma pergunta do gate.`
  }
  return `Adapte o roteiro ao papel ${papel} com tom e exemplos adequados — sem remover nenhuma pergunta do gate.`
}

/**
 * Seleção de skill 100% INTERNA por gateId (O5 — invisível ao usuário).
 * Escolhe a skill cuja cobertura de checks tem maior interseção com as faltas
 * diagnosticadas (desempate: primeira do gate). O `skillId` retornado serve
 * APENAS para rastreabilidade interna — a UX NÃO deve exibir seletor, nome ou
 * badge de skill (apresentar-se como "IA do Gate {gateId}").
 */
export function selecionarSkillInterna(gateId: GateId, codigosFaltas: string[]): string {
  const skills = obterSkillsDoGate(gateId)
  if (skills.length === 0) return `gate.${gateId.toLowerCase()}`
  let melhor = skills[0]
  let melhorScore = -1
  for (const s of skills) {
    const score = s.checks.filter((c) => codigosFaltas.includes(c)).length
    if (score > melhorScore) {
      melhorScore = score
      melhor = s
    }
  }
  return melhor.id
}

export interface SkillRunnerContexto {
  /** G2: épico de origem p/ previsão de escopo (pedido do dono). */
  epico?: NexoObject | null
  /** G2: todas as features do grafo (foco = `objeto`, resto = contexto). */
  features?: NexoObject[]
  nos?: NexoObject[]
}

export async function executarSkill(
  gateId: GateId,
  objeto: NexoObject,
  historico: OllamaMessage[],
  papelUsuario?: Role,
  contexto?: SkillRunnerContexto
): Promise<SkillRunnerResult> {
  const diag = diagnosticarFaltasGate(objeto, gateId, undefined, contexto?.nos)
  // O5: skill invisível — seleção 100% interna por gateId; skillId = rastreio interno.
  const skillId = selecionarSkillInterna(gateId, diag.faltas.map((f) => f.codigo))
  // O5: roteiro adaptado ao papel — mantém TODAS as perguntas, só reordena.
  const faltasRoteiro = ordenarFaltasPorPapel(diag.faltas, gateId, papelUsuario)

  // R1/R2: LLM de verdade primeiro (Ollama oficial ou llama.cpp via chat dual,
  // model EFETIVO resolvido em runtime); offline → OllamaOffline → fallback local
  // que DIZ que está offline (sem badgeamento silencioso, sem menu de comandos).
  try {
    const llm = await chatComProvedor(
      [
        { role: 'system', content: montarSystemGrill(gateId, skillId, faltasRoteiro, objeto, papelUsuario, contexto ? { epico: contexto.epico, features: contexto.features } : undefined) },
        { role: 'user', content: montarUser(objeto, gateId, historico) }
      ],
      { timeoutMs: 120000 }
    )
    const resposta = llm.texto
    const respostas: Record<string, string> = {}
    const patch = null
    return {
      skillId,
      respostasColetadas: respostas,
      faltasRestantes: faltasRoteiro,
      outputParcial: resposta.slice(0, 2000),
      patchProposto: patch,
      provider: llm.provider,
      model: llm.model
    }
  } catch (e) {
    if (!(e instanceof OllamaOffline)) throw e
    // Fallback local HONESTO (R2): diz que está offline e faz a pergunta da próxima
    // falta do roteiro + registra — NUNCA menu de comandos ("experimente pedir...").
    const respostas: Record<string, string> = {}
    const patch = null
    const proxima = faltasRoteiro[0]
    const linhas = [`Gate ${gateId} - "${objeto.titulo}" (resposta local - servidor inalcancavel).`]
    if (diag.faltas.length === 0) {
      linhas.push('Checks OK. Solicite a aprovacao da baseline.')
    } else {
      const vis = faltasRoteiro.slice(0, 5).map((f) => `${f.codigo}(${f.campoAlvo})`).join(', ')
      const resto = faltasRoteiro.length > 5 ? ` (+${faltasRoteiro.length - 5})` : ''
      linhas.push(`Faltas: ${vis}${resto}.`)
      linhas.push(`Falta atual: [${proxima.codigo}] ${proxima.pergunta}`.slice(0, 200))
      linhas.push('Registre sua resposta no editor estruturado para propor alteração; exemplos do roteiro são apenas explicativos.')
    }
    const outputParcial = linhas.slice(0, 8).join('\n')
    return {
      skillId,
      respostasColetadas: respostas,
      faltasRestantes: faltasRoteiro,
      outputParcial,
      patchProposto: patch,
      provider: 'local-fallback',
      model: 'local'
    }
  }
}
