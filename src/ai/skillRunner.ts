// SkillRunner QUEEN-MOTOR O2/O5 — executa skill de gate via Ollama local com fallback determinístico.
// Offline (OllamaOffline) → fallback local: diagnosticarFaltasGate + gerarPropostaPatch,
// marcado provider:'local-fallback' (garante determinism diff0 sem rede).
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
  gerarPropostaPatch,
  obterSkillsDoGate,
  type FaltaGate
} from '@/ai/gateSkills'
import { chat, getConfig, OllamaOffline, type OllamaMessage } from '@/ai/ollamaClient'

export type SkillRunnerProvider = 'ollama' | 'local-fallback'

export interface SkillRunnerResult {
  skillId: string
  respostasColetadas: Record<string, string>
  faltasRestantes: FaltaGate[]
  outputParcial: string
  patchProposto: { justificativa: string; mudancas: PatchMudanca[] } | null
  provider: SkillRunnerProvider
  model: string
}

function montarSystem(gateId: GateId, papelUsuario?: Role): string {
  const skills = obterSkillsDoGate(gateId)
  const desc = skills
    .map((s) => `- ${s.id} (${s.nome}): checks [${s.checks.join(', ')}]. ${s.descricao}`)
    .join('\n')
  const linhaPapel = linhaTomPorPapel(gateId, papelUsuario)
  return [
    `Você é a IA de apoio ao Gate ${gateId} do NEXO (100% local, PT-BR).`,
    'Skills disponíveis:',
    desc || '(nenhuma)',
    linhaPapel,
    'Responda de forma objetiva: para cada falta, cite o código do check, o campoAlvo e o valor sugerido entre aspas.'
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

function montarPatchLocal(objeto: NexoObject, faltas: FaltaGate[], respostas: Record<string, string>) {
  for (const f of faltas) {
    const txt = respostas[f.codigo]
    const p = gerarPropostaPatch(objeto, f.codigo, txt)
    if (p) return p
    // Buraco do gerador determinístico: ao menos via campoAlvo genérico
    if (txt && f.campoAlvo) {
      return {
        justificativa: `[IA Gate ${objeto.gate}] Preencher ${f.campoAlvo} para resolver ${f.codigo} (extraído do texto)`,
        mudancas: [{ campo: f.campoAlvo, de: '', para: txt }] as PatchMudanca[]
      }
    }
  }
  return null
}

export async function executarSkill(
  gateId: GateId,
  objeto: NexoObject,
  historico: OllamaMessage[],
  papelUsuario?: Role
): Promise<SkillRunnerResult> {
  const diag = diagnosticarFaltasGate(objeto, gateId)
  // O5: skill invisível — seleção 100% interna por gateId; skillId = rastreio interno.
  const skillId = selecionarSkillInterna(gateId, diag.faltas.map((f) => f.codigo))
  // O5: roteiro adaptado ao papel — mantém TODAS as perguntas, só reordena.
  const faltasRoteiro = ordenarFaltasPorPapel(diag.faltas, gateId, papelUsuario)
  const cfg = getConfig()

  // O5: Ollama primeiro ({http://localhost:11434, model queen} via getConfig);
  // offline → OllamaOffline → fallback local silencioso (provider 'local-fallback').
  try {
    const resposta = await chat(
      [
        { role: 'system', content: montarSystem(gateId, papelUsuario) },
        { role: 'user', content: montarUser(objeto, gateId, historico) }
      ],
      { timeoutMs: 60000 }
    )
    const respostas = extrairRespostasDoTexto(
      [...historico.filter((m) => m.role === 'user').map((m) => m.content), resposta].join('\n'),
      diag.faltas
    )
    const patch = montarPatchLocal(objeto, faltasRoteiro, respostas)
    return {
      skillId,
      respostasColetadas: respostas,
      faltasRestantes: faltasRoteiro,
      outputParcial: resposta.slice(0, 2000),
      patchProposto: patch,
      provider: 'ollama',
      model: cfg.model
    }
  } catch (e) {
    if (!(e instanceof OllamaOffline)) throw e
    // Fallback determinístico local — sem rede, diff0 garantido
    const respostas = extrairRespostasDoTexto(
      historico.filter((m) => m.role === 'user').map((m) => m.content).join('\n'),
      diag.faltas
    )
    const patch = montarPatchLocal(objeto, faltasRoteiro, respostas)
    const outputParcial =
      diag.faltas.length === 0
        ? `Gate ${gateId}: todos os checks OK para "${objeto.titulo}" (fallback local).`
        : `Gate ${gateId} — faltas para "${objeto.titulo}" (fallback local): ` +
          faltasRoteiro.map((f) => `${f.codigo}(${f.campoAlvo})`).join(', ')
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
