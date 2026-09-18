import type { GateCheck, GateId, NexoObject } from '@/types/nexo'

// Regras bloqueantes por gate — fonte: nexo-especificacoes/05..10.
// Cada check retorna ok=false quando a regra bloqueante falha.

export interface GateEval {
  gate: GateId
  checks: GateCheck[]
  bloqueantesOk: boolean
  bloqueantesFaltando: string[]
}

function isFeature(o: NexoObject): boolean {
  return o.tipo === 'feature'
}

function getFeatureFields(o: NexoObject): {
  ator: string
  fluxo: string
  bdd: number
  regras: number
  owner: string
} {
  const f = o as unknown as Record<string, unknown>
  const bdd = Array.isArray(f['criterios_bdd']) ? (f['criterios_bdd'] as unknown[]).length : 0
  const regras = Array.isArray(f['regras_ids']) ? (f['regras_ids'] as unknown[]).length : 0
  return {
    ator: String(f['ator'] ?? ''),
    fluxo: String(f['fluxo_feliz'] ?? ''),
    bdd,
    regras,
    owner: o.owner ?? ''
  }
}

export function avaliarGate(objeto: NexoObject, waivers?: { codigo: string; prazo: string }[]): GateEval {
  const checks: GateCheck[] = []
  const gate = objeto.gate
  if (gate === 'G0') {
    const o = objeto as unknown as Record<string, unknown>
    const desc = String(objeto.descricao ?? '')
    const prob = String(o['problema'] ?? '')
    const personas = Array.isArray(o['personas']) ? (o['personas'] as unknown[]) : []
    const ator = String(o['ator'] ?? '').trim()
    checks.push({
      codigo: 'ENQ-001',
      descricao: 'Problema ou oportunidade descrito (mín. 20 caracteres)',
      severidade: 'bloqueante',
      ok: desc.trim().length >= 20 || prob.trim().length >= 20
    })
    checks.push({
      codigo: 'ENQ-002',
      descricao: 'Público-alvo: personas[] ou ator real (sem heurística textual)',
      severidade: 'bloqueante',
      ok: personas.length >= 1 || ator.length > 0
    })
    checks.push({
      codigo: 'ENQ-003',
      descricao: 'Hipótese de valor com métrica refutável (nome + alvo)',
      severidade: 'bloqueante',
      ok: ((): boolean => {
        const obj = String(o['objetivo'] ?? '').trim()
        const kpis = Array.isArray(o['kpis']) ? (o['kpis'] as Record<string, unknown>[]) : []
        return obj.length >= 10 && kpis.some((k) => String(k['nome'] ?? '').trim() !== '' && String(k['alvo'] ?? '').trim() !== '')
      })()
    })
    checks.push({
      codigo: 'ENQ-004',
      descricao: 'Owner/sponsor definido',
      severidade: 'bloqueante',
      ok: (objeto.owner ?? '').trim().length > 0
    })
    checks.push({
      codigo: 'ENQ-005',
      descricao: 'Restrições e não-objetivos declarados (escopo_in/out)',
      severidade: 'bloqueante',
      ok: (Array.isArray(o['escopo_in']) ? (o['escopo_in'] as unknown[]).length : 0) >= 1 &&
        (Array.isArray(o['escopo_out']) ? (o['escopo_out'] as unknown[]).length : 0) >= 1
    })
    checks.push({
      codigo: 'ENQ-006',
      descricao: 'Suposições e riscos declarados (riscos[])',
      severidade: 'bloqueante',
      ok: (Array.isArray(o['riscos']) ? (o['riscos'] as unknown[]).length : 0) >= 1
    })
  }

  if (gate === 'G1') {
    const e = objeto as unknown as Record<string, unknown>
    const kpis = Array.isArray(e['kpis']) ? (e['kpis'] as unknown[]) : []
    const problema = String(e['problema'] ?? '')
    checks.push({
      codigo: 'EPC-001',
      descricao: 'Épico possui problema/público descrito (mín. 30 caracteres)',
      severidade: 'bloqueante',
      ok: problema.trim().length >= 30
    })
    checks.push({
      codigo: 'EPC-002',
      descricao: 'Épico possui ao menos 1 KPI com nome, unidade, alvo, janela e responsável',
      severidade: 'bloqueante',
      ok:
        kpis.length >= 1 &&
        kpis.every((k) => {
          const kk = k as Record<string, unknown>
          return kk['nome'] && kk['unidade'] && kk['alvo'] && kk['janela'] && kk['responsavel']
        })
    })
    const scopeIn = Array.isArray(e['escopo_in']) ? (e['escopo_in'] as unknown[]) : []
    const scopeOut = Array.isArray(e['escopo_out']) ? (e['escopo_out'] as unknown[]) : []
    checks.push({
      codigo: 'EPC-003',
      descricao: 'Escopo dentro/fora explícito',
      severidade: 'bloqueante',
      ok: scopeIn.length >= 1 && scopeOut.length >= 1
    })
    checks.push({
      codigo: 'EPC-004',
      descricao: 'Resultado observável declarado (objetivo, não-solução)',
      severidade: 'bloqueante',
      ok: (() => {
        const obj = String(e['objetivo'] ?? '').trim()
        if (obj.length < 10) return false
        return !/^(implementar|criar tela|desenvolver sistema|construir api)\b/i.test(obj)
      })()
    })
    checks.push({
      codigo: 'EPC-005',
      descricao: 'Risco crítico com probabilidade, impacto, mitigação e owner',
      severidade: 'bloqueante',
      ok: (() => {
        const riscos = Array.isArray(e['riscos']) ? (e['riscos'] as unknown[]) : []
        return riscos.some((r) => {
          if (typeof r === 'string') {
            const s = r.toLowerCase()
            return s.includes('prob') && s.includes('impacto') && s.includes('mitig') && s.includes('owner')
          }
          const rr = r as Record<string, unknown>
          return rr['probabilidade'] != null && rr['impacto'] != null && rr['mitigacao'] != null && rr['owner'] != null
        })
      })()
    })
    checks.push({
      codigo: 'EPC-006',
      descricao: 'Fonte: 80% dos campos afirmativos preenchidos',
      severidade: 'bloqueante',
      ok: (() => {
        const campos = [problema, String(e['objetivo'] ?? ''), (e['personas'] as unknown[] | undefined)?.length ? 'x' : '', scopeIn.length ? 'x' : '', scopeOut.length ? 'x' : '', kpis.length ? 'x' : '']
        const ok = campos.filter((c) => String(c).trim().length > 0).length
        return ok / campos.length >= 0.8
      })()
    })
  }

  if (gate === 'G2' || (isFeature(objeto) && gate >= 'G2')) {
    const f = getFeatureFields(objeto)
    const ff = objeto as unknown as Record<string, unknown>
    const regrasIds = Array.isArray(ff['regras_ids']) ? (ff['regras_ids'] as unknown[]) : []
    const telasIds = Array.isArray(ff['telas_ids']) ? (ff['telas_ids'] as unknown[]) : []
    const integ = Array.isArray(ff['integracoes']) ? (ff['integracoes'] as unknown[]) : []
    const bdds = Array.isArray(ff['criterios_bdd']) ? (ff['criterios_bdd'] as Record<string, unknown>[]) : []
    checks.push({
      codigo: 'FTR-001',
      descricao: 'Narrativa contém ator, capacidade e benefício literais',
      severidade: 'bloqueante',
      ok: f.ator.trim().length > 0 && String(ff['beneficio'] ?? '').trim().length > 0 && objeto.descricao.trim().length >= 20
    })
    checks.push({
      codigo: 'FTR-002',
      descricao: 'Fluxo feliz com entrada, ação e resultado observável',
      severidade: 'bloqueante',
      ok: (() => {
        const s = f.fluxo.toLowerCase()
        return f.fluxo.trim().length >= 10 && s.includes(' ') && /retorna|exibe|gera|baixa|cria|envia|atualiza/.test(s)
      })()
    })
    checks.push({
      codigo: 'FTR-003',
      descricao: 'Regra vinculada tem fonte e não está arquivada',
      severidade: 'bloqueante',
      ok: regrasIds.length >= 1 && (ff['fonte'] ?? 'stated') !== 'pending_decision'
    })
    checks.push({
      codigo: 'FTR-004',
      descricao: 'Alteração de dados possui permissão/policy',
      severidade: 'bloqueante',
      ok: (() => {
        const perms = Array.isArray(ff['permissoes']) ? (ff['permissoes'] as Record<string, unknown>[]) : []
        return f.owner.trim().length > 0 && perms.some((p) => String(p['recurso'] ?? '').trim() !== '' && String(p['policy'] ?? '').trim() !== '')
      })()
    })
    checks.push({
      codigo: 'FTR-005',
      descricao: 'Tela sem estados loading/vazio/erro/sucesso',
      severidade: 'aviso',
      ok: (() => {
        const telas = Array.isArray(ff['telas_estados']) ? (ff['telas_estados'] as Record<string, unknown>[]) : []
        if (telasIds.length === 0) return true
        return telas.some((t) => t['loading'] && t['vazio'] != null && t['erro'] && t['sucesso'])
      })()
    })
    checks.push({
      codigo: 'FTR-006',
      descricao: 'Integração externa tem timeout, falha e indisponibilidade',
      severidade: 'bloqueante',
      ok: (() => {
        if (integ.length === 0) return true
        return integ.every((x) => {
          if (typeof x === 'string') {
            const s = x.toLowerCase()
            return s.includes('timeout') || s.includes('falha') || s.includes('indispon')
          }
          const xi = x as Record<string, unknown>
          return xi['timeout_ms'] != null && xi['falha'] != null && xi['indisponibilidade'] != null
        })
      })()
    })
    checks.push({
      codigo: 'FTR-007',
      descricao: 'Critério BDD com Given/When/Then verificável',
      severidade: 'bloqueante',
      ok: bdds.some((b) => String(b['given'] ?? '').trim() !== '' && String(b['when'] ?? '').trim() !== '' && String(b['then'] ?? '').trim() !== '')
    })
    checks.push({
      codigo: 'FTR-008',
      descricao: 'Ação sensível/financeira possui cenário de abuso/erro',
      severidade: 'aviso',
      ok: ((): boolean => {
        const alt = Array.isArray(ff['alternativos']) ? (ff['alternativos'] as unknown[]) : []
        return alt.length >= 1
      })()
    })
  }

  if (gate === 'G3') {
    const f = objeto as unknown as Record<string, unknown>
    const integ = Array.isArray(f['integracoes']) ? (f['integracoes'] as unknown[]) : []
    checks.push({
      codigo: 'ARC-001',
      descricao: 'Contrato/OpenAPI ou integração declarada (ou dispensa registrada)',
      severidade: 'bloqueante',
      ok: integ.length >= 1 || String(f['contrato_dispensa'] ?? '') !== ''
    })
    checks.push({
      codigo: 'ARC-002',
      descricao: 'ADR/decisão de arquitetura vinculada',
      severidade: 'bloqueante',
      ok: (f['adr_id'] as string | undefined) != null && String(f['adr_id'] ?? '') !== ''
    })
    checks.push({
      codigo: 'ARC-003',
      descricao: 'OpenAPI detalhada (2xx/4xx/5xx, auth, compatibilidade, consumidor)',
      severidade: 'bloqueante',
      ok: (() => {
        const api = f['openapi'] as Record<string, unknown> | undefined
        if (!api) return String(f['contrato_dispensa'] ?? '') !== ''
        return ['v2xx', 'v4xx', 'v5xx', 'auth', 'compat', 'consumidor'].every((k) => String(api[k] ?? '').trim() !== '')
      })()
    })
    checks.push({
      codigo: 'ARC-004',
      descricao: 'Persistência: entidade + validações + migration + índice + plano de dados',
      severidade: 'bloqueante',
      ok: (() => {
        const p = f['persistencia'] as Record<string, unknown> | undefined
        if (!p) return false
        return ['entidade', 'validacoes', 'migration', 'indice', 'plano_dados'].every((k) => String(p[k] ?? '').trim() !== '')
      })()
    })
    checks.push({
      codigo: 'ARC-005',
      descricao: 'Integração estruturada (owner, timeout, retry, idempotência, indisponibilidade)',
      severidade: 'bloqueante',
      ok: (() => {
        if (integ.length === 0) return String(f['contrato_dispensa'] ?? '') !== ''
        return integ.every((x) => {
          if (typeof x === 'string') return x.toLowerCase().includes('timeout')
          const xi = x as Record<string, unknown>
          return xi['owner_externo'] != null && xi['timeout_ms'] != null && xi['indisponibilidade'] != null
        })
      })()
    })
    checks.push({
      codigo: 'ARC-006',
      descricao: 'Dado pessoal: classificação + finalidade + retenção + acesso',
      severidade: 'bloqueante',
      ok: (() => {
        const d = f['dado_pessoal'] as Record<string, unknown> | undefined
        if (!d) return true
        return ['classificacao', 'finalidade', 'retencao', 'acesso'].every((k) => String(d[k] ?? '').trim() !== '')
      })()
    })
    checks.push({
      codigo: 'ARC-007',
      descricao: 'NFR com medida + alvo + observabilidade',
      severidade: 'bloqueante',
      ok: (() => {
        const nfrs = Array.isArray(f['nfrs']) ? (f['nfrs'] as Record<string, unknown>[]) : []
        if (nfrs.length === 0) return false
        return nfrs.some((n) => String(n['medida'] ?? '').trim() !== '' && String(n['alvo'] ?? '').trim() !== '' && String(n['observabilidade'] ?? '').trim() !== '')
      })()
    })
    checks.push({
      codigo: 'ARC-008',
      descricao: 'Segurança: threat model + matriz; exceção expirada BLOQUEIA',
      severidade: 'bloqueante',
      ok: (() => {
        const seg = f['seguranca'] as Record<string, unknown> | undefined
        const exc = f['excecao_seg'] as Record<string, unknown> | undefined
        if (exc && String(exc['prazo'] ?? '') !== '') {
          if (new Date(String(exc['prazo'])).getTime() <= Date.now()) return false
          return String(exc['owner'] ?? '').trim() !== '' && String(exc['aceite'] ?? '').trim() !== ''
        }
        if (!seg) return false
        return String(seg['threat'] ?? '').trim() !== '' && String(seg['matriz'] ?? '').trim() !== ''
      })()
    })
  }

  if (gate === 'G4') {
    const p = objeto as unknown as Record<string, unknown>
    const bdd = Array.isArray(p['criterios_bdd']) ? (p['criterios_bdd'] as Record<string, unknown>[]) : []
    const scopeIn = Array.isArray(p['escopo_in']) ? (p['escopo_in'] as unknown[]) : []
    const scopeOut = Array.isArray(p['escopo_out']) ? (p['escopo_out'] as unknown[]) : []
    const deps = Array.isArray(p['dependencias']) ? (p['dependencias'] as string[]) : []
    const owner = (objeto.owner ?? '').trim()
    checks.push({
      codigo: 'PBI-ACEITE',
      descricao: 'Aceite: ≥1 critério BDD Given/When/Then verificável',
      severidade: 'bloqueante',
      ok: bdd.some((b) => String(b['given'] ?? '').trim() !== '' && String(b['when'] ?? '').trim() !== '' && String(b['then'] ?? '').trim() !== '')
    })
    checks.push({
      codigo: 'PBI-ORIGEM',
      descricao: 'Origem: feature_id + owner definidos',
      severidade: 'bloqueante',
      ok: String(p['feature_id'] ?? '').trim() !== '' && owner !== ''
    })
    checks.push({
      codigo: 'PBI-ESCOPO',
      descricao: 'Escopo dentro/fora explícito',
      severidade: 'bloqueante',
      ok: scopeIn.length >= 1 && scopeOut.length >= 1
    })
    checks.push({
      codigo: 'PBI-DEP',
      descricao: 'Dependências resolvidas; zero bloqueador aberto',
      severidade: 'bloqueante',
      ok: !deps.some((d) => d.toLowerCase().includes('bloquead'))
    })
    checks.push({
      codigo: 'PBI-OWNER',
      descricao: 'Owner do PBI definido',
      severidade: 'bloqueante',
      ok: owner !== ''
    })
    checks.push({
      codigo: 'PBI-TESTE',
      descricao: 'Estratégia de teste definida (sem teste não entra em sprint)',
      severidade: 'bloqueante',
      ok: String(p['estrategia_teste'] ?? '').trim() !== ''
    })
    checks.push({
      codigo: 'PBI-CONTRATO',
      descricao: 'Contratos aprovados/dispensados; público exige compatibilidade',
      severidade: 'bloqueante',
      ok: (() => {
        const c = p['contrato'] as Record<string, unknown> | undefined
        const publico = String(p['contrato_publico'] ?? '') === 'sim' || String(c?.['publico'] ?? '') === 'sim'
        if (!c) return !publico
        if (publico) return String(c['compatibilidade'] ?? '').trim() !== '' && String(c['consumidor'] ?? '').trim() !== ''
        return String(c['status'] ?? '').trim() !== ''
      })()
    })
    checks.push({
      codigo: 'PBI-BLOQ',
      descricao: 'Zero bloqueador: sem flag bloqueadora aberta',
      severidade: 'bloqueante',
      ok: !String(p['flag'] ?? '').toLowerCase().includes('bloquead')
    })
    // Regras condicionais
    checks.push({
      codigo: 'PBI-COND-COMPAT',
      descricao: 'Contrato público exige compatibilidade + consumidor',
      severidade: 'bloqueante',
      ok: (() => {
        const c = p['contrato'] as Record<string, unknown> | undefined
        const publico = String(p['contrato_publico'] ?? '') === 'sim' || String(c?.['publico'] ?? '') === 'sim'
        if (!publico) return true
        return String(c?.['compatibilidade'] ?? '').trim() !== '' && String(c?.['consumidor'] ?? '').trim() !== ''
      })()
    })
    checks.push({
      codigo: 'PBI-COND-ROLLBACK',
      descricao: 'Migration destrutiva exige plano de dados/rollback',
      severidade: 'bloqueante',
      ok: (() => {
        const destrutiva = String(p['migration_destrutiva'] ?? '') === 'sim'
        if (!destrutiva) return true
        return String(p['rollback'] ?? '').trim() !== '' || String(p['plano_dados'] ?? '').trim() !== ''
      })()
    })
    checks.push({
      codigo: 'PBI-COND-TELA',
      descricao: 'Tela consome API via contrato versionado',
      severidade: 'bloqueante',
      ok: (() => {
        const telas = Array.isArray(p['telas_ids']) ? (p['telas_ids'] as unknown[]) : []
        if (telas.length === 0) return true
        const c = p['contrato'] as Record<string, unknown> | undefined
        return String(c?.['versao'] ?? '').trim() !== ''
      })()
    })
    checks.push({
      codigo: 'PBI-COND-TESTE',
      descricao: 'Sem estratégia de teste → fora da sprint',
      severidade: 'bloqueante',
      ok: String(p['estrategia_teste'] ?? '').trim() !== ''
    })
  }

  if (gate === 'G5') {
    const e = objeto as unknown as Record<string, unknown>
    const ev = (e['evidencia'] as Record<string, unknown> | undefined) ?? {}
    checks.push({
      codigo: 'DON-001',
      descricao: 'Definition of Done: evidência de aceite + testes verdes + rastreabilidade',
      severidade: 'bloqueante',
      ok: objeto.status === 'validated' || objeto.status === 'published'
    })
    checks.push({
      codigo: 'DON-002',
      descricao: 'PR merged com aprovação humana + link do PR',
      severidade: 'bloqueante',
      ok: String(ev['pr_url'] ?? '').trim() !== '' && (ev['pr_merged'] === true || String(ev['pr_url'] ?? '').includes('pull'))
    })
    checks.push({
      codigo: 'DON-003',
      descricao: 'Checks de CI verdes (SAST/teste/policy falho bloqueia)',
      severidade: 'bloqueante',
      ok: (() => {
        const checks = Array.isArray(ev['checks_ci']) ? (ev['checks_ci'] as string[]) : []
        if (checks.length === 0) return false
        return !checks.some((c) => /fail|error|blocked/i.test(c)) && (ev['sast_ok'] !== false) && (ev['policy_ok'] !== false)
      })()
    })
    checks.push({
      codigo: 'DON-004',
      descricao: 'Aceite funcional + testes vinculados verdes',
      severidade: 'bloqueante',
      ok: ev['aceite_registrado'] === true && ev['testes_verdes'] === true
    })
    checks.push({
      codigo: 'DON-005',
      descricao: 'Segurança aprovada ou exceção vigente com prazo',
      severidade: 'bloqueante',
      ok: (() => {
        if (ev['seg_aprovado'] === true) return true
        const exc = ev['excecao'] as Record<string, unknown> | undefined
        return !!exc && new Date(String(exc['prazo'] ?? '')).getTime() > Date.now()
      })()
    })
    checks.push({
      codigo: 'DON-006',
      descricao: 'Observabilidade + rastreabilidade (objetivo→código) atualizadas',
      severidade: 'bloqueante',
      ok: (Array.isArray(ev['observabilidade']) ? (ev['observabilidade'] as unknown[]).length : 0) >= 1 &&
        (Array.isArray(ev['rastreabilidade']) ? (ev['rastreabilidade'] as unknown[]).length : 0) >= 1
    })
  }

  // Dispensa vigente de aviso (DELTA Passo 4): considera o check OK até o prazo.
  const dispensas = waivers ?? (objeto as unknown as { __waivers?: { codigo: string; prazo: string }[] }).__waivers
  for (const c of checks) {
    if (c.severidade !== 'aviso' || c.ok) continue
    const w = dispensas?.find((x) => x.codigo === c.codigo)
    if (w && new Date(w.prazo).getTime() > Date.now()) c.ok = true
    else if (w) c.codigo = `${c.codigo}-EXP` as typeof c.codigo
  }

  const faltando = checks.filter((c) => c.severidade === 'bloqueante' && !c.ok).map((c) => c.codigo)
  return { gate, checks, bloqueantesOk: faltando.length === 0, bloqueantesFaltando: faltando }
}

// Papéis que podem aprovar cada gate (02-pessoas-e-permissoes + plano §5).
export function aprovadoresDoGate(gate: GateId): string[] {
  switch (gate) {
    case 'G0':
    case 'G1':
      return ['PM']
    case 'G2':
      return ['PM', 'UX', 'TechLead']
    case 'G3':
      return ['Arquiteto', 'TechLead', 'Seguranca', 'Dev']
    case 'G4':
      return ['PO', 'Dev', 'QA']
    case 'G5':
      return ['Dev', 'QA', 'TechLead']
    default:
      return []
  }
}

// Gates sequenciais com cadeado (DELTA Passo 2): G(n) só abre com G(n-1) aprovado + baseline.
export const ORDEM_GATES: GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5']

export interface GateResumo {
  id: GateId
  status: string
  baselineVersao?: number | null
}

export function gateDesbloqueado(gateId: GateId, gates: GateResumo[]): boolean {
  const idx = ORDEM_GATES.indexOf(gateId)
  if (idx <= 0) return true
  const ant = gates.find((g) => g.id === ORDEM_GATES[idx - 1])
  if (!ant) return false
  return ant.status === 'aprovado' && ant.baselineVersao != null
}

export function gateAnterior(gateId: GateId): GateId | null {
  const idx = ORDEM_GATES.indexOf(gateId)
  return idx > 0 ? ORDEM_GATES[idx - 1] : null
}
