// Engine de validação de campos — ONDA2-MOTOR-VALIDAÇÃO (Y1).
// Fecha GAPs Lupa V7 (sem engine de regras) + V8 (sem mensagens de sucesso/erro).
// Funções PURAS, testáveis, SEM DOM: validarCampo(valor, regras) +
// validarFormulario(valores, schema) → {ok, erros, sucessos}.
// O VUE (M3TextField + M3Snackbar) resolve a cópia a exibir: primeira mensagemErro
// do campo em `erros`, ou mensagemSucesso da regra/campo (resolveMensagemSucesso).
// Determinístico: sem Date/Math.random; ordem do schema preservada.

import type {
  RegraValidacao,
  ResultadoValidacao,
  ValidacaoCampo
} from '@/types/nexo'

function texto(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function numeroOuTamanho(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const t = texto(v)
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : t.length
}

function testaRegra(valor: unknown, regra: RegraValidacao): boolean {
  const t = texto(valor).trim()
  switch (regra.tipo) {
    case 'obrigatorio':
      return t.length > 0
    case 'min': {
      const p = Number(regra.parametro)
      if (!Number.isFinite(p)) return true
      const n = numeroOuTamanho(valor)
      if (n == null) return false
      // número puro compara valor; texto compara tamanho
      return typeof valor === 'number' || /^-?\d+([.,]\d+)?$/.test(t) ? n >= p : t.length >= p
    }
    case 'max': {
      const p = Number(regra.parametro)
      if (!Number.isFinite(p)) return true
      const n = numeroOuTamanho(valor)
      if (n == null) return true
      return typeof valor === 'number' || /^-?\d+([.,]\d+)?$/.test(t) ? n <= p : t.length <= p
    }
    case 'regex': {
      if (typeof regra.parametro !== 'string' || regra.parametro === '') return true
      try {
        return new RegExp(regra.parametro).test(t)
      } catch {
        return false
      }
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)
    case 'custom': {
      // custom serializável "op:arg" — sem funções (persiste em localStorage).
      // Ops: 'positivo' (número > 0), 'nao-expirado' (ISO futuro), 'contem:valor'.
      const spec = String(regra.parametro ?? '').trim()
      if (spec === '' || spec === 'positivo') {
        const n = Number(t.replace(',', '.'))
        return Number.isFinite(n) && n > 0
      }
      if (spec === 'nao-expirado') {
        const dt = Date.parse(t)
        return Number.isFinite(dt) && dt > Date.now()
      }
      if (spec.startsWith('contem:')) {
        return t.toLowerCase().includes(spec.slice('contem:'.length).toLowerCase())
      }
      return true
    }
    default:
      return true
  }
}

export interface FalhaCampo {
  campoId: string
  regraId: string
  mensagemErro: string
}

/** Valida um valor contra a lista de regras; retorna as falhas (ordem das regras). */
export function validarCampo(valor: unknown, regras: RegraValidacao[]): FalhaCampo[] {
  const falhas: FalhaCampo[] = []
  for (const r of regras ?? []) {
    if (!testaRegra(valor, r)) {
      falhas.push({ campoId: r.campoId, regraId: r.id, mensagemErro: r.mensagemErro })
    }
  }
  return falhas
}

/**
 * Valida um formulário: valores[campoId] contra schema (ordem preservada).
 * {ok, erros: primeira msg por campo, sucessos: campoIds 100% aprovados}.
 * Campos do schema ausentes em valores validam como '' (obrigatorio falha).
 */
export function validarFormulario(
  valores: Record<string, unknown>,
  schema: ValidacaoCampo[]
): ResultadoValidacao {
  const erros: Record<string, string> = {}
  const sucessos: string[] = []
  for (const campo of schema ?? []) {
    const falhas = validarCampo(valores[campo.campoId], campo.regras)
    if (falhas.length === 0) {
      sucessos.push(campo.campoId)
    } else if (!(campo.campoId in erros)) {
      erros[campo.campoId] = falhas[0].mensagemErro
    }
  }
  return { ok: Object.keys(erros).length === 0, erros, sucessos }
}

/**
 * Totais p/ Preview: conta campos ok/erro. (Assinatura pedida: ValidarCampos →
 * {ok, erros, sucessos}; validarFormulario é a implementação canônica.)
 */
export function ValidarCampos(
  itens: ValidacaoCampo[],
  valores: Record<string, unknown>
): ResultadoValidacao {
  return validarFormulario(valores, itens)
}

/** Resolve a mensagem de sucesso p/ snackbar (regra → campo → default). */
export function resolveMensagemSucesso(
  campo: ValidacaoCampo,
  regra?: RegraValidacao
): string {
  return (
    regra?.mensagemSucesso ??
    campo.mensagemSucesso ??
    'Campo válido com sucesso.'
  )
}
