// Tipos de domínio NEXO — fonte: nexo-especificacoes/01, 04 + gates 05-10.
// Layout (x/y/z/grupo) e versionamento (patches, auditoria, impacto) incluídos.

export type NexoStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'baseline'
  | 'stale'
  | 'regenerated'
  | 'validated'
  | 'published'

export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5'

export type Classificacao = 'internal' | 'confidential' | 'restricted'

export type Fonte = 'stated' | 'inferred' | 'corporate_standard' | 'pending_decision'

export type Role = 'PM' | 'PO' | 'Negocio' | 'UX' | 'Arquiteto' | 'TechLead' | 'Dev' | 'QA' | 'Seguranca'

export type Acao =
  | 'visualizar'
  | 'comentar'
  | 'propor'
  | 'editar'
  | 'aprovar'
  | 'publicar'
  | 'administrar'

export type EdgeTipo = 'contem' | 'realiza' | 'consome' | 'valida' | 'restringe' | 'impacta'

export type EdgeForca = 'required' | 'optional'

export type TipoNo =
  | 'epico'
  | 'feature'
  | 'pbi'
  | 'regra'
  | 'tela'
  | 'api'
  | 'teste'
  | 'adr'
  | 'decisao'
  | 'risco'

export interface NexoObject {
  id: string
  project_id: string
  tipo: TipoNo
  titulo: string
  descricao: string
  status: NexoStatus
  gate: GateId
  owner: string
  contribuidores: string[]
  classificacao: Classificacao
  fonte: Fonte
  fonte_refs: string[]
  versao: number
  baseline?: number | null
  parent_id?: string | null
  causa_stale?: string | null
  x: number
  y: number
  z: number
  grupo?: string | null
  created_at: string
  updated_at: string
}

export interface Kpi {
  nome: string
  unidade: string
  alvo: string
  janela: string
  responsavel: string
}

export interface RiscoEstruturado {
  probabilidade: string
  impacto: string
  mitigacao: string
  owner: string
}

export interface Epic extends NexoObject {
  tipo: 'epico'
  problema: string
  objetivo: string
  kpis: Kpi[]
  personas: string[]
  escopo_in: string[]
  escopo_out: string[]
  riscos: (string | RiscoEstruturado)[]
}

export interface CriterioBdd {
  id: string
  given: string
  when: string
  then: string
  prioridade: string
}

export interface Feature extends NexoObject {
  tipo: 'feature'
  ator: string
  beneficio: string
  gatilho: string
  precondicoes: string[]
  fluxo_feliz: string
  alternativos: string[]
  regras_ids: string[]
  telas_ids: string[]
  integracoes: string[]
  criterios_bdd: CriterioBdd[]
}

export interface PBI extends NexoObject {
  tipo: 'pbi'
  feature_id: string
  escopo_in: string[]
  escopo_out: string[]
  dependencias: string[]
  estrategia_teste: string
  criterios_bdd: CriterioBdd[]
  estimativa?: string
  flag?: string
  rollout?: string
  rollback?: string
}

// DADOS+REGRAS G2/G3/G5: permissões/policy, telas com estados,
// integrações estruturadas, NFRs e evidências de entrega.

export interface PermissaoPolicy {
  recurso: string
  acao: string
  policy: string
}

export interface TelaEstado {
  tela_id: string
  loading: boolean
  vazio: boolean
  erro: boolean
  sucesso: boolean
}

export interface IntegracaoSpec {
  nome: string
  owner_externo?: string
  timeout_ms?: number
  retry?: boolean
  idempotente?: boolean
  falha?: string
  indisponibilidade?: string
}

export interface NfrSpec {
  medida: string
  alvo: string
  observabilidade: string
}

export interface ExcecaoSeguranca {
  owner: string
  prazo: string
  aceite: string
}

export interface EvidenciaEntrega {
  pr_url?: string
  checks_ci?: string[]
  testes_verdes?: boolean
  aceite_registrado?: boolean
  sast_ok?: boolean
  policy_ok?: boolean
  observabilidade?: string[]
  rastreabilidade?: string[]
  excecao?: ExcecaoSeguranca | null
}

export interface User {
  id: string
  nome: string
  papel: Role
  projeto_ids: string[]
}

export interface Edge {
  edge_id: string
  origem_id: string
  origem_versao: number
  destino_id: string
  destino_versao: number
  tipo: EdgeTipo
  forca: EdgeForca
  autor_id: string
  justificativa: string
}

export type NivelZoom =
  | 'portfolio'
  | 'projeto'
  | 'epico'
  | 'feature'
  | 'pbi'
  | 'implementacao'

export interface BreadcrumbItem {
  rotulo: string
  nivel: NivelZoom
  rota?: string
}

// Versionamento: ProposePatch (rascunho de diff) -> AcceptPatch (nova versão + auditoria).
export interface PatchMudanca {
  campo: string
  de: string
  para: string
}

export interface ProposePatch {
  patch_id: string
  alvo_id: string
  autor_id: string
  criado_em: string
  mudancas: PatchMudanca[]
  justificativa: string
  status: 'pendente' | 'aceito' | 'rejeitado'
}

export interface AuditEvent {
  id: string
  em: string
  ator_id: string
  acao: string
  alvo_id?: string
  detalhe: string
  correlation_id?: string
}

export type OperacaoImpacto = 'revisar' | 'regenerar' | 'sem_acao'

export interface ImpactItem {
  id: string
  titulo: string
  via: string[]
  operacao: OperacaoImpacto
  owner: string
  aprovado?: boolean
  aplicado?: boolean
  statusAnterior: NexoStatus
  versaoAnterior: number
}

export interface ImpactPlan {
  correlation_id: string
  origem_id: string
  em: string
  itens: ImpactItem[]
}

export interface GateCheck {
  codigo: string
  descricao: string
  severidade: 'bloqueante' | 'aviso'
  ok: boolean
}

// Multi-projeto (DELTA Passo 1): escopo isolado por projeto.
export interface Projeto {
  id: string
  titulo: string
  descricao: string
  epicoId: string
  epicoTitulo: string
  owner: string
  classificacao: Classificacao
  createdAt: string
  updatedAt: string
}

// Dispensa de item de checklist de severidade 'aviso' (DELTA Passo 4).
export interface Waiver {
  id: string
  alvoId: string
  codigo: string
  justificativa: string
  owner: string
  prazo: string
  em: string
}

// Solicitação de aprovação de Gate (governança com SoD e fila)
export type SolicitacaoGateStatus = 'pendente' | 'aprovada' | 'negada'

export interface SolicitacaoGate {
  id: string
  gate: GateId
  alvoId: string
  solicitanteId: string
  em: string
  status: SolicitacaoGateStatus
  decididaPor?: string
  decididaEm?: string
  motivo?: string
}

