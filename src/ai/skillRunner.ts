// SkillRunner QUEEN-MOTOR O2 — executa skill de gate via Ollama local com fallback determinístico.
// Offline (OllamaOffline) → fallback local: diagnosticarFaltasGate + gerarPropostaPatch,
// marcado provider:'local-fallback' (garante determinism diff0 sem rede).

import type { GateId, NexoObject, PatchMudanca } from '@/types/nexo'
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

function montarSystem(gateId: GateId): string {
  const skills = obterSkillsDoGate(gateId)
  const desc = skills
    .map((s) => `- ${s.id} (${s.nome}): checks [${s.checks.join(', ')}]. ${s.descricao}`)
    .join('\n')
  return [
    `Você é a IA de apoio ao Gate ${gateId} do NEXO (100% local, PT-BR).`,
    'Skills disponíveis:',
    desc || '(nenhuma)',
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
  historico: OllamaMessage[]
): Promise<SkillRunnerResult> {
  const skills = obterSkillsDoGate(gateId)
  const skillId = skills[0]?.id ?? `gate.${gateId.toLowerCase()}`
  const diag = diagnosticarFaltasGate(objeto, gateId)
  const cfg = getConfig()

  try {
    const resposta = await chat(
      [
        { role: 'system', content: montarSystem(gateId) },
        { role: 'user', content: montarUser(objeto, gateId, historico) }
      ],
      { timeoutMs: 60000 }
    )
    const respostas = extrairRespostasDoTexto(
      [...historico.filter((m) => m.role === 'user').map((m) => m.content), resposta].join('\n'),
      diag.faltas
    )
    const patch = montarPatchLocal(objeto, diag.faltas, respostas)
    return {
      skillId,
      respostasColetadas: respostas,
      faltasRestantes: diag.faltas,
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
    const patch = montarPatchLocal(objeto, diag.faltas, respostas)
    const outputParcial =
      diag.faltas.length === 0
        ? `Gate ${gateId}: todos os checks OK para "${objeto.titulo}" (fallback local).`
        : `Gate ${gateId} — faltas para "${objeto.titulo}" (fallback local): ` +
          diag.faltas.map((f) => `${f.codigo}(${f.campoAlvo})`).join(', ')
    return {
      skillId,
      respostasColetadas: respostas,
      faltasRestantes: diag.faltas,
      outputParcial,
      patchProposto: patch,
      provider: 'local-fallback',
      model: 'local'
    }
  }
}
