<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { GateId, NexoObject, PatchMudanca } from '@/types/nexo'
import { dependencyDecisionChanges, linkedRuleRows, mergeEvidenceException, mergeLinkedRuleIds } from '@/utils/gateArtifactPatch'
import { useGraph } from '@/stores/useGraph'
import { VBadge, VButton, VCard, VSelect, VTextInput, VTextarea } from 'vueui-nova-kit'

type Natureza = 'fato' | 'hipotese' | 'evidencia' | 'decisao-pendente'
type ControlKind = 'text' | 'textarea' | 'lines' | 'rows' | 'group' | 'dependencies' | 'select'
type ColumnKind = 'text' | 'textarea' | 'boolean'
interface ColumnSpec { key: string; label: string; kind?: ColumnKind; placeholder?: string }
interface FieldSpec { campo: string; label: string; kind: ControlKind; help?: string; columns?: ColumnSpec[]; options?: { value: string; label: string }[] }
interface ProposePayload { mudancas: PatchMudanca[]; natureza: Natureza; referencia?: string }

const props = defineProps<{
  gateId: GateId
  alvo: NexoObject
  codigo: string
  pergunta: string
  porQueBloqueia: string
}>()
const graph = useGraph()
const emit = defineEmits<{ (event: 'propose', payload: ProposePayload): void }>()

const natureza = reactive<{ value: Natureza | '' }>({ value: '' })
const referencia = reactive({ value: '' })
const erro = ref('')
const draft = reactive<Record<string, any>>({})
const regraDraftInicial = ref<Record<string, unknown>[]>([])

const naturezaOptions = [
  { value: '', label: 'Selecione a natureza' },
  { value: 'fato', label: 'Fato declarado' },
  { value: 'hipotese', label: 'Hipótese' },
  { value: 'evidencia', label: 'Referência de evidência' },
  { value: 'decisao-pendente', label: 'Decisão pendente' }
]
const simNaoOptions = [
  { value: '', label: 'Não informado' },
  { value: 'true', label: 'Sim — declarado pelo usuário' },
  { value: 'false', label: 'Não — declarado pelo usuário' }
]
const dependenciasOptions = [
  { value: '', label: 'Escolha uma opção' },
  { value: 'none', label: 'Não há dependências (decisão explícita)' },
  { value: 'list', label: 'Há dependências para registrar' }
]

const schemas: Record<string, FieldSpec[]> = {
  'ENQ-001': [{ campo: 'problema', label: 'Problema ou oportunidade', kind: 'textarea' }],
  'ENQ-002': [
    { campo: 'personas', label: 'Público afetado', kind: 'lines', help: 'Uma persona ou grupo por linha.' },
    { campo: 'ator', label: 'Ator principal', kind: 'text' }
  ],
  'ENQ-003': [
    { campo: 'objetivo', label: 'Resultado desejado', kind: 'textarea' },
    { campo: 'kpis', label: 'Métricas (KPI)', kind: 'rows', columns: [
      { key: 'nome', label: 'Nome' }, { key: 'unidade', label: 'Unidade' }, { key: 'alvo', label: 'Alvo refutável' },
      { key: 'janela', label: 'Janela de medição' }, { key: 'responsavel', label: 'Responsável' }
    ] }
  ],
  'ENQ-004': [{ campo: 'owner', label: 'Responsável (ID da pessoa)', kind: 'text' }],
  'ENQ-005': [
    { campo: 'escopo_in', label: 'Inclui', kind: 'lines' },
    { campo: 'escopo_out', label: 'Não inclui', kind: 'lines' }
  ],
  'ENQ-006': [{ campo: 'riscos', label: 'Riscos e suposições', kind: 'rows', columns: [
    { key: 'descricao', label: 'Risco / suposição', kind: 'textarea' }, { key: 'probabilidade', label: 'Probabilidade' },
    { key: 'impacto', label: 'Impacto' }, { key: 'mitigacao', label: 'Mitigação' }, { key: 'owner', label: 'Responsável' }
  ] }],
  'EPC-001': [{ campo: 'problema', label: 'Problema e público', kind: 'textarea' }],
  'EPC-002': [{ campo: 'kpis', label: 'Métricas (KPI)', kind: 'rows', columns: [
    { key: 'nome', label: 'Nome' }, { key: 'unidade', label: 'Unidade' }, { key: 'alvo', label: 'Alvo' },
    { key: 'janela', label: 'Janela' }, { key: 'responsavel', label: 'Responsável' }
  ] }],
  'EPC-003': [
    { campo: 'escopo_in', label: 'Dentro do escopo', kind: 'lines' },
    { campo: 'escopo_out', label: 'Fora do escopo', kind: 'lines' }
  ],
  'EPC-004': [{ campo: 'objetivo', label: 'Resultado observável', kind: 'textarea' }],
  'EPC-005': [{ campo: 'riscos', label: 'Riscos', kind: 'rows', columns: [
    { key: 'descricao', label: 'Risco', kind: 'textarea' }, { key: 'probabilidade', label: 'Probabilidade' },
    { key: 'impacto', label: 'Impacto' }, { key: 'mitigacao', label: 'Mitigação' }, { key: 'owner', label: 'Responsável' }
  ] }],
  'EPC-006': [
    { campo: 'problema', label: 'Problema', kind: 'textarea' }, { campo: 'objetivo', label: 'Objetivo', kind: 'textarea' },
    { campo: 'personas', label: 'Público afetado', kind: 'lines' }, { campo: 'escopo_in', label: 'Dentro do escopo', kind: 'lines' },
    { campo: 'escopo_out', label: 'Fora do escopo', kind: 'lines' }, { campo: 'kpis', label: 'Métricas', kind: 'rows', columns: [
      { key: 'nome', label: 'Nome' }, { key: 'unidade', label: 'Unidade' }, { key: 'alvo', label: 'Alvo' },
      { key: 'janela', label: 'Janela' }, { key: 'responsavel', label: 'Responsável' }
    ] }
  ],
  'FTR-001': [
    { campo: 'ator', label: 'Ator', kind: 'text' }, { campo: 'beneficio', label: 'Benefício esperado', kind: 'textarea' },
    { campo: 'descricao', label: 'Capacidade da feature', kind: 'textarea' }
  ],
  'FTR-002': [{ campo: 'fluxo_feliz', label: 'Fluxo feliz', kind: 'textarea', help: 'Descreva entrada, ação e resultado observável.' }],
  'FTR-003': [{ campo: 'regras', label: 'Regras de negócio vinculadas', kind: 'rows', help: 'Declare ID, fonte e referências. O registro da fonte não verifica sua veracidade nem se a regra está ativa.', columns: [
    { key: 'id', label: 'ID da regra' }, { key: 'descricao', label: 'Regra resumida', kind: 'textarea' },
    { key: 'fonte', label: 'Fonte declarada' }, { key: 'fonte_refs', label: 'Referências (separe por ;)' },
    { key: 'status', label: 'Estado informado' }, { key: 'arquivada', label: 'Arquivada?', kind: 'boolean' }
  ] }],
  'FTR-004': [{ campo: 'permissoes', label: 'Permissões / policies', kind: 'rows', help: 'Cada item identifica recurso, ação e policy/condição.', columns: [
    { key: 'recurso', label: 'Recurso' }, { key: 'acao', label: 'Ação permitida' }, { key: 'policy', label: 'Policy / condição', kind: 'textarea' }
  ] }, { campo: 'owner', label: 'Responsável pela feature (ID da pessoa)', kind: 'text' }],
  'FTR-005': [
    { campo: 'telas_ids', label: 'IDs das telas', kind: 'lines' },
    { campo: 'telas_estados', label: 'Estados por tela', kind: 'rows', columns: [
      { key: 'tela_id', label: 'ID da tela' }, { key: 'loading', label: 'Loading?', kind: 'boolean' },
      { key: 'vazio', label: 'Estado vazio coberto?', kind: 'boolean' }, { key: 'erro', label: 'Estado de erro coberto?', kind: 'boolean' }, { key: 'sucesso', label: 'Estado de sucesso coberto?', kind: 'boolean' }
    ] }
  ],
  'FTR-006': [
    { campo: 'integracoes_decisao', label: 'Existência de integrações externas', kind: 'select', help: 'Uma frase na descrição não substitui esta decisão estruturada.', options: [
      { value: 'com_integracoes', label: 'Há integrações externas' }, { value: 'nenhuma', label: 'Foi analisado e não há integrações externas' }
    ] },
    { campo: 'integracoes_justificativa', label: 'Justificativa da decisão', kind: 'textarea', help: 'Explique a decisão, inclusive quando não houver integrações.' },
    { campo: 'integracoes', label: 'Integrações externas', kind: 'rows', columns: [
    { key: 'nome', label: 'Nome da integração' }, { key: 'owner_externo', label: 'Responsável externo' },
    { key: 'timeout_ms', label: 'Timeout (ms)' }, { key: 'retry', label: 'Retry descrito' }, { key: 'idempotente', label: 'Idempotência' },
    { key: 'falha', label: 'Tratamento de falha', kind: 'textarea' }, { key: 'indisponibilidade', label: 'Tratamento de indisponibilidade', kind: 'textarea' }
  ] }
  ],
  'FTR-007': [{ campo: 'criterios_bdd', label: 'Critérios de aceite BDD', kind: 'rows', columns: [
    { key: 'id', label: 'ID' }, { key: 'given', label: 'Dado (Given)', kind: 'textarea' },
    { key: 'when', label: 'Quando (When)', kind: 'textarea' }, { key: 'then', label: 'Então (Then)', kind: 'textarea' },
    { key: 'camada', label: 'Camada exercitada (ex.: interface, API, persistência)' }, { key: 'fonte', label: 'Fonte ou referência do critério' }, { key: 'prioridade', label: 'Prioridade' }
  ] }],
  'FTR-008': [{ campo: 'alternativos', label: 'Cenários alternativos, erro e abuso', kind: 'lines' }],
  'ARC-001': [{ campo: 'contrato_dispensa', label: 'Dispensa registrada (se não há contrato/integração)', kind: 'textarea', help: 'Justifique a dispensa; o validador considera qualquer declaração não vazia.' }, { campo: 'integracoes', label: 'Integrações e contratos', kind: 'rows', columns: [
    { key: 'nome', label: 'Nome' }, { key: 'owner_externo', label: 'Owner externo' }, { key: 'timeout_ms', label: 'Timeout (ms)' },
    { key: 'retry', label: 'Retry' }, { key: 'idempotente', label: 'Idempotência' }, { key: 'falha', label: 'Falha', kind: 'textarea' },
    { key: 'indisponibilidade', label: 'Indisponibilidade', kind: 'textarea' }
  ] }],
  'ARC-002': [{ campo: 'adr_id', label: 'ID da ADR ou decisão de arquitetura', kind: 'text' }],
  'ARC-003': [{ campo: 'contrato_dispensa', label: 'Dispensa de contrato OpenAPI (se aplicável)', kind: 'textarea', help: 'Justifique a dispensa; o validador considera qualquer declaração não vazia.' }, { campo: 'openapi', label: 'Contrato de API', kind: 'group', columns: [
    { key: 'v2xx', label: 'Respostas 2xx' }, { key: 'v4xx', label: 'Respostas 4xx' }, { key: 'v5xx', label: 'Respostas 5xx' },
    { key: 'auth', label: 'Autenticação / autorização' }, { key: 'compat', label: 'Compatibilidade / versão' }, { key: 'consumidor', label: 'Consumidor do contrato' }
  ] }],
  'ARC-004': [{ campo: 'persistencia', label: 'Plano de persistência', kind: 'group', columns: [
    { key: 'entidade', label: 'Entidade / modelo' }, { key: 'validacoes', label: 'Validações' }, { key: 'migration', label: 'Migration versionada' },
    { key: 'indice', label: 'Índices' }, { key: 'plano_dados', label: 'Volumetria e plano de dados', kind: 'textarea' }
  ] }],
  'ARC-005': [{ campo: 'contrato_dispensa', label: 'Dispensa de integração (se não há integração)', kind: 'textarea', help: 'Justifique a dispensa; o validador considera qualquer declaração não vazia.' }, { campo: 'integracoes', label: 'Integrações externas', kind: 'rows', columns: [
    { key: 'nome', label: 'Nome' }, { key: 'owner_externo', label: 'Owner externo' }, { key: 'timeout_ms', label: 'Timeout (ms)' },
    { key: 'retry', label: 'Retry' }, { key: 'idempotente', label: 'Idempotência' }, { key: 'falha', label: 'Falha', kind: 'textarea' },
    { key: 'indisponibilidade', label: 'Indisponibilidade', kind: 'textarea' }
  ] }],
  'ARC-006': [{ campo: 'dado_pessoal', label: 'Tratamento de dados pessoais', kind: 'group', columns: [
    { key: 'classificacao', label: 'Classificação' }, { key: 'finalidade', label: 'Finalidade' }, { key: 'retencao', label: 'Retenção / descarte' }, { key: 'acesso', label: 'Acesso / controles' }
  ] }],
  'ARC-007': [{ campo: 'nfrs', label: 'Requisitos não funcionais (NFR)', kind: 'rows', columns: [
    { key: 'medida', label: 'Medida' }, { key: 'alvo', label: 'Alvo mensurável' }, { key: 'observabilidade', label: 'Como será observado' }
  ] }],
  'ARC-008': [
    { campo: 'seguranca', label: 'Modelo de ameaças', kind: 'group', columns: [
      { key: 'threat', label: 'Threat model / ameaças' }, { key: 'matriz', label: 'Matriz de controles' }
    ] },
    { campo: 'excecao_seg', label: 'Exceção de segurança (se houver)', kind: 'group', columns: [
      { key: 'owner', label: 'Owner aprovador' }, { key: 'prazo', label: 'Prazo ISO (AAAA-MM-DD)' }, { key: 'aceite', label: 'Risco e aceite explícito', kind: 'textarea' }
    ] }
  ],
  'PBI-ACEITE': [{ campo: 'criterios_bdd', label: 'Critérios de aceite BDD', kind: 'rows', columns: [
    { key: 'id', label: 'ID' }, { key: 'given', label: 'Dado (Given)', kind: 'textarea' },
    { key: 'when', label: 'Quando (When)', kind: 'textarea' }, { key: 'then', label: 'Então (Then)', kind: 'textarea' }, { key: 'prioridade', label: 'Prioridade' }
  ] }],
  'PBI-ORIGEM': [{ campo: 'feature_id', label: 'Feature de origem (ID)', kind: 'text' }, { campo: 'owner', label: 'Responsável (ID)', kind: 'text' }],
  'PBI-ESCOPO': [{ campo: 'escopo_in', label: 'Dentro do escopo', kind: 'lines' }, { campo: 'escopo_out', label: 'Fora do escopo', kind: 'lines' }],
  'PBI-DEP': [{ campo: 'dependencias', label: 'Dependências', kind: 'dependencies', help: 'Informe dependências reais resolvidas e uma justificativa de pelo menos 10 caracteres para a decisão escolhida.' }],
  'PBI-OWNER': [{ campo: 'owner', label: 'Responsável (ID)', kind: 'text' }],
  'PBI-TESTE': [{ campo: 'estrategia_teste', label: 'Estratégia de testes', kind: 'textarea' }, { campo: 'referencias_teste', label: 'IDs ou referências de teste', kind: 'lines' }],
  'PBI-CONTRATO': [{ campo: 'contrato', label: 'Contrato', kind: 'group', columns: [
    { key: 'status', label: 'Estado de aprovação/dispensa' }, { key: 'publico', label: 'Contrato público? (sim/não)' },
    { key: 'compatibilidade', label: 'Compatibilidade' }, { key: 'consumidor', label: 'Consumidor' }, { key: 'versao', label: 'Versão' }
  ] }],
  'PBI-BLOQ': [
    { campo: 'bloqueador_aberto', label: 'Existe bloqueador aberto?', kind: 'select', options: [
      { value: 'true', label: 'Sim, existe bloqueador aberto' }, { value: 'false', label: 'Não, foi avaliado e não há bloqueador aberto' }
    ] },
    { campo: 'flag', label: 'Registro/justificativa da avaliação', kind: 'textarea', help: 'Descreva o impedimento ou a análise realizada. Para declarar ausência de bloqueador, inclua a justificativa.' }
  ],
  'PBI-COND-COMPAT': [{ campo: 'contrato', label: 'Compatibilidade de contrato público', kind: 'group', columns: [
    { key: 'publico', label: 'Contrato público? (sim/não)' }, { key: 'compatibilidade', label: 'Compatibilidade retroativa' }, { key: 'consumidor', label: 'Consumidores identificados' }
  ] }],
  'PBI-COND-ROLLBACK': [{ campo: 'rollback', label: 'Plano de rollback e retorno', kind: 'textarea' }, { campo: 'plano_dados', label: 'Plano de dados', kind: 'textarea' }],
  'PBI-COND-TELA': [{ campo: 'contrato', label: 'Contrato vinculado à tela', kind: 'group', columns: [
    { key: 'versao', label: 'Versão do contrato' }, { key: 'status', label: 'Estado informado' }, { key: 'consumidor', label: 'Tela / consumidor' }
  ] }],
  'PBI-COND-TESTE': [{ campo: 'estrategia_teste', label: 'Estratégia de testes automatizados', kind: 'textarea' }],
  'DON-001': [{ campo: 'evidencia', label: 'Aceite, testes e rastreabilidade declarados', kind: 'group', columns: [
    { key: 'aceite_registrado', label: 'Aceite funcional registrado?', kind: 'boolean' }, { key: 'testes_verdes', label: 'Testes vinculados verdes?', kind: 'boolean' },
    { key: 'rastreabilidade', label: 'Referências objetivo → código (separe por ;)' }
  ] }],
  'DON-002': [{ campo: 'evidencia', label: 'Pull request', kind: 'group', columns: [
    { key: 'pr_url', label: 'URL real do PR', kind: 'text' }, { key: 'pr_merged', label: 'PR merged?', kind: 'boolean' },
    { key: 'aprovacao_humana', label: 'Aprovação humana registrada?', kind: 'boolean' }
  ] }],
  'DON-003': [{ campo: 'evidencia', label: 'CI, segurança e policy', kind: 'group', columns: [
    { key: 'checks_ci', label: 'Checks/IDs e estado real informado (separe por ;)', kind: 'textarea' },
    { key: 'sast_ok', label: 'SAST aprovado?', kind: 'boolean' }, { key: 'policy_ok', label: 'Policy aprovada?', kind: 'boolean' }
  ] }],
  'DON-004': [{ campo: 'evidencia', label: 'Aceite funcional e testes', kind: 'group', columns: [
    { key: 'aceite_registrado', label: 'Aceite registrado?', kind: 'boolean' }, { key: 'testes_verdes', label: 'Testes verdes?', kind: 'boolean' },
    { key: 'testes_refs', label: 'IDs/referências de execução de testes (separe por ;)' }
  ] }],
  'DON-005': [{ campo: 'evidencia', label: 'Segurança e exceção', kind: 'group', columns: [
    { key: 'seg_aprovado', label: 'Segurança aprovada?', kind: 'boolean' }
  ] }, { campo: 'evidencia_excecao', label: 'Exceção vigente (se aplicável)', kind: 'group', columns: [
    { key: 'owner', label: 'Owner aprovador' }, { key: 'prazo', label: 'Prazo ISO (AAAA-MM-DD)' }, { key: 'aceite', label: 'Risco aceito e plano de retorno' }
  ] }],
  'DON-006': [{ campo: 'evidencia', label: 'Observabilidade e rastreabilidade', kind: 'group', columns: [
    { key: 'observabilidade', label: 'Dashboards, alertas, logs ou traces (separe por ;)' },
    { key: 'rastreabilidade', label: 'Referências objetivo → código (separe por ;)' }
  ] }]
}

const fields = computed(() => schemas[props.codigo] ?? [])
const requiresReference = computed(() => natureza.value === 'fato' || natureza.value === 'evidencia')
const referenceOptionsHint = computed(() => requiresReference.value
  ? 'Informe a origem declarada (link, ID de documento, ticket ou referência). A interface não verifica o conteúdo.'
  : natureza.value === 'decisao-pendente'
    ? 'Descreva a decisão ainda pendente ou o responsável/fórum que deverá deliberar.'
    : 'Opcional: registre a base da hipótese. Referências informadas são declarações ainda não verificadas.')

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function sourceValue(campo: string): unknown {
  if (campo === 'evidencia_excecao') return (props.alvo as unknown as Record<string, any>).evidencia?.excecao ?? {}
  if (campo === 'regras') {
    const alvo = props.alvo as unknown as Record<string, unknown>
    const graphRules = graph.state.nos.filter((node) => node.tipo === 'regra').map((node) => ({
      id: node.id,
      descricao: node.descricao,
      fonte: node.fonte,
      fonte_refs: node.fonte_refs,
      status: node.status,
      arquivada: false
    }))
    return linkedRuleRows(alvo.regras, alvo.regras_ids, graphRules)
  }
  return (props.alvo as unknown as Record<string, unknown>)[campo]
}
function newRow(field: FieldSpec): Record<string, any> {
  return Object.fromEntries((field.columns ?? []).map((column) => [column.key, column.kind === 'boolean' ? '' : '']))
}
function resetDraft() {
  for (const key of Object.keys(draft)) delete draft[key]
  natureza.value = ''
  referencia.value = ''
  erro.value = ''
  for (const field of fields.value) {
    const current = sourceValue(field.campo)
    if (field.kind === 'lines') {
      draft[field.campo] = Array.isArray(current) ? current.map((v) => typeof v === 'string' ? v : String(v)).join('\n') : ''
    } else if (field.kind === 'rows') {
      draft[field.campo] = Array.isArray(current) ? clone(current).map((row) => {
        const copy = { ...(row as Record<string, unknown>) }
        if (Array.isArray(copy.fonte_refs)) copy.fonte_refs = copy.fonte_refs.join('\n')
        return copy
      }) : []
    } else if (field.kind === 'group') {
      const value = field.campo === 'evidencia' ? ((props.alvo as unknown as Record<string, any>).evidencia ?? {}) : current
      draft[field.campo] = field.campo === 'evidencia_excecao' ? clone((props.alvo as unknown as Record<string, any>).evidencia?.excecao ?? {}) : clone(value && typeof value === 'object' ? value : {})
    } else if (field.kind === 'dependencies') {
      draft.dependencyMode = ''
      draft.dependencyReason = ''
      draft[field.campo] = Array.isArray(current) ? current.join('\n') : ''
    } else if (field.kind === 'select') {
      draft[field.campo] = current === true || current === false ? String(current) : typeof current === 'string' ? current : ''
    } else {
      draft[field.campo] = typeof current === 'string' ? current : current == null ? '' : String(current)
    }
  }
  if (props.codigo === 'FTR-003') {
    const rules = sourceValue('regras')
    const ids = sourceValue('regras_ids')
    if (!Array.isArray(rules) || rules.length === 0) {
      draft.regras = Array.isArray(ids) ? ids.map((id) => ({ id: String(id) })) : []
    }
    regraDraftInicial.value = clone((draft.regras ?? []) as Record<string, unknown>[])
  }
}
watch(() => [props.codigo, props.alvo], resetDraft, { immediate: true })

function addRow(field: FieldSpec) {
  const rows = draft[field.campo] as Record<string, any>[]
  rows.push(newRow(field))
}
function removeRow(field: FieldSpec, index: number) {
  const rows = draft[field.campo] as Record<string, any>[]
  rows.splice(index, 1)
}
function asLines(value: unknown): string[] {
  return String(value ?? '').split(/[\n;]/).map((item) => item.trim()).filter(Boolean)
}
function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return undefined
}
function cleanRows(field: FieldSpec): Record<string, unknown>[] {
  const rows = (draft[field.campo] ?? []) as Record<string, any>[]
    return rows.map((row) => {
    const result: Record<string, unknown> = {}
    for (const column of field.columns ?? []) {
      const value = row[column.key]
      if (column.kind === 'boolean') {
        const parsed = parseBoolean(value)
        if (parsed !== undefined) result[column.key] = parsed
      } else if (column.key === 'fonte_refs') {
        const refs = asLines(value)
        if (refs.length) result[column.key] = refs
      } else if (String(value ?? '').trim()) {
        result[column.key] = String(value).trim()
      }
    }
    return result
  }).filter((row) => Object.keys(row).length > 0)
}
function normalizeField(field: FieldSpec): unknown {
  if (field.campo === 'bloqueador_aberto') return parseBoolean(draft[field.campo])
  if (field.kind === 'select') return String(draft[field.campo] ?? '').trim()
  if (field.kind === 'lines') return asLines(draft[field.campo])
  if (field.kind === 'rows') {
    const rows = cleanRows(field)
    if (field.campo === 'regras') return rows
    return rows
  }
  if (field.kind === 'group') {
    const raw = (draft[field.campo] ?? {}) as Record<string, any>
    const result: Record<string, unknown> = {}
    for (const column of field.columns ?? []) {
      const value = raw[column.key]
      if (column.kind === 'boolean') {
        const parsed = parseBoolean(value)
        if (parsed !== undefined) result[column.key] = parsed
      } else if (column.key === 'checks_ci' || column.key === 'observabilidade' || column.key === 'rastreabilidade' || column.key === 'testes_refs' || column.key === 'fonte_refs') {
        const values = asLines(value)
        if (values.length) result[column.key] = values
      } else if (String(value ?? '').trim()) {
        result[column.key] = String(value).trim()
      }
    }
    if (field.campo === 'evidencia_excecao' && Object.keys(result).length) return result
    if (field.campo === 'evidencia_excecao') return undefined
    return result
  }
  if (field.kind === 'dependencies') {
    const mode = draft.dependencyMode as string
    return mode === 'none' ? [] : asLines(draft[field.campo])
  }
  return String(draft[field.campo] ?? '').trim()
}
function normalizeValue(field: FieldSpec): unknown {
  const next = normalizeField(field)
  if (field.campo === 'evidencia_excecao') return undefined
  return next
}
function meaningful(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return typeof value === 'boolean' || typeof value === 'number'
}
function serialized(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(value)
}
const changes = computed<PatchMudanca[]>(() => {
  const out: PatchMudanca[] = []
  for (const field of fields.value) {
    if (field.kind === 'dependencies') {
      const mode = draft.dependencyMode as string
      if (!mode) continue
      const alvo = props.alvo as unknown as Record<string, unknown>
      out.push(...dependencyDecisionChanges(
        { dependencies: sourceValue('dependencias'), decision: alvo.dependencias_decisao, justification: alvo.dependencias_justificativa },
        { mode: mode as 'none' | 'list', dependencies: asLines(draft.dependencias), justification: String(draft.dependencyReason ?? '') }
      ))
      continue
    }
    if (field.campo === 'evidencia_excecao') continue
    const next = normalizeValue(field)
    const current = sourceValue(field.campo)
    if (props.codigo === 'FTR-003' && field.campo === 'regras' && serialized(next) === serialized(regraDraftInicial.value)) continue
    if (props.codigo === 'DON-005' && field.campo === 'evidencia' && next && typeof next === 'object') {
      const exceptionField = fields.value.find((candidate) => candidate.campo === 'evidencia_excecao')
      const exception = exceptionField ? normalizeField(exceptionField) : undefined
      if (exception && meaningful(exception)) Object.assign(next, mergeEvidenceException(next as Record<string, unknown>, exception as Record<string, unknown>))
    }
    if (!meaningful(next) && !meaningful(current)) continue
    if (serialized(current) !== serialized(next)) {
      out.push({ campo: field.campo, de: serialized(current) || '""', para: serialized(next) })
    }
  }
  if (props.codigo === 'FTR-003') {
    const rules = (draft.regras ?? []) as Record<string, unknown>[]
    const current = sourceValue('regras_ids')
    const ids = mergeLinkedRuleIds(current, rules)
    if ((ids.length || meaningful(current)) && serialized(current) !== serialized(ids)) out.push({ campo: 'regras_ids', de: serialized(current) || '[]', para: serialized(ids) })
  }
  return out
})
const canPropose = computed(() => {
  if (!natureza.value || changes.value.length === 0) return false
  if ((requiresReference.value || natureza.value === 'decisao-pendente') && !referencia.value.trim()) return false
  if (props.codigo === 'PBI-DEP') {
    if (!draft.dependencyMode) return false
    if (String(draft.dependencyReason ?? '').trim().length < 10) return false
    if (draft.dependencyMode === 'list' && asLines(draft.dependencias).length === 0) return false
  }
  return true
})
function pretty(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) return parsed.map((item) => typeof item === 'string' ? item : Object.entries(item as Record<string, unknown>).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`).join(' · ')).join('; ')
    if (parsed && typeof parsed === 'object') return Object.entries(parsed as Record<string, unknown>).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`).join(' · ')
    return String(parsed ?? '—')
  } catch { return value || '—' }
}
function labelFor(campo: string): string {
  return fields.value.find((field) => field.campo === campo)?.label ?? campo
}
function propose() {
  erro.value = ''
  if (!canPropose.value || !natureza.value) {
    erro.value = props.codigo === 'PBI-DEP' && String(draft.dependencyReason ?? '').trim().length < 10
      ? 'Registre uma justificativa de pelo menos 10 caracteres para a decisão de dependências.'
      : 'Informe a natureza da proposta, os campos alterados e a referência exigida.'
    return
  }
  const payload: ProposePayload = { mudancas: clone(changes.value), natureza: natureza.value }
  if (referencia.value.trim()) payload.referencia = referencia.value.trim()
  emit('propose', payload)
}

function campoAninhado(campo: string, key: string): unknown {
  if (campo === 'evidencia_excecao') return (draft.evidencia_excecao ?? {})[key]
  return (draft[campo] ?? {})[key]
}
function updateNested(campo: string, key: string, value: unknown) {
  if (!draft[campo] || typeof draft[campo] !== 'object') draft[campo] = {}
  draft[campo][key] = value
}
</script>

<template>
  <div class="gate-artifact-editor space-y-4">
    <VCard variant="outlined" class="editor-question">
      <template #title><span>{{ codigo }} · {{ pergunta }}</span></template>
      <template #default><p class="text-sm text-nexo-muted">{{ porQueBloqueia }}</p></template>
      <template #footer><div class="flex flex-wrap items-center gap-2"><VBadge variant="warning" size="sm">Proposta pendente de revisão</VBadge><VBadge variant="neutral" size="sm">Não aplica nem aprova mudanças</VBadge></div></template>
    </VCard>

    <VCard v-if="fields.length" variant="outlined" title="Dados para a proposta" description="Preencha apenas o que foi informado. Campos vazios não entram no diff.">
      <div class="space-y-4">
        <section v-for="field in fields" :key="field.campo" class="editor-field">
          <div class="mb-2"><h3 class="text-sm font-semibold text-nexo-text">{{ field.label }}</h3><p v-if="field.help" class="text-xs text-nexo-muted">{{ field.help }}</p></div>
          <VTextInput v-if="field.kind === 'text'" v-model="draft[field.campo]" :label="field.label" />
          <VSelect v-else-if="field.kind === 'select'" v-model="draft[field.campo]" :label="field.label" :options="field.options ?? []" />
          <VTextarea v-else-if="field.kind === 'textarea'" v-model="draft[field.campo]" :label="field.label" :rows="3" auto-resize />
          <VTextarea v-else-if="field.kind === 'lines'" v-model="draft[field.campo]" :label="field.label" helper-text="Uma informação por linha." :rows="3" auto-resize />

          <template v-else-if="field.kind === 'rows'">
            <div v-if="(draft[field.campo] as unknown[]).length" class="space-y-3">
              <VCard v-for="(row, index) in (draft[field.campo] as Record<string, any>[])" :key="`${field.campo}-${index}`" variant="filled" class="editor-row">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <template v-for="column in field.columns" :key="column.key">
                    <VTextarea v-if="column.kind === 'textarea'" v-model="row[column.key]" :label="column.label" :rows="2" auto-resize />
                    <VSelect v-else-if="column.kind === 'boolean'" :model-value="String(row[column.key] ?? '')" :label="column.label" :options="simNaoOptions" @update:model-value="row[column.key] = $event" />
                    <VTextInput v-else v-model="row[column.key]" :label="column.label" :placeholder="column.placeholder" />
                  </template>
                  <div class="sm:col-span-2 flex justify-end"><VButton variant="ghost" size="sm" :aria-label="`Remover linha ${index + 1} de ${field.label}`" @click="removeRow(field, index)">Remover linha</VButton></div>
                </div>
              </VCard>
            </div>
            <VButton variant="outline" size="sm" class="mt-2" @click="addRow(field)">Adicionar {{ field.label.toLowerCase() }}</VButton>
          </template>

          <div v-else-if="field.kind === 'group'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <template v-for="column in field.columns" :key="column.key">
              <VTextarea v-if="column.kind === 'textarea'" :model-value="String(campoAninhado(field.campo, column.key) ?? '')" :label="column.label" :rows="2" auto-resize @update:model-value="updateNested(field.campo, column.key, $event)" />
              <VSelect v-else-if="column.kind === 'boolean'" :model-value="campoAninhado(field.campo, column.key) === true ? 'true' : campoAninhado(field.campo, column.key) === false ? 'false' : ''" :label="column.label" :options="simNaoOptions" @update:model-value="updateNested(field.campo, column.key, $event)" />
              <VTextarea v-else-if="['checks_ci', 'observabilidade', 'rastreabilidade', 'testes_refs'].includes(column.key)" :model-value="Array.isArray(campoAninhado(field.campo, column.key)) ? (campoAninhado(field.campo, column.key) as string[]).join('\n') : String(campoAninhado(field.campo, column.key) ?? '')" :label="column.label" helper-text="Uma referência por linha." :rows="2" auto-resize @update:model-value="updateNested(field.campo, column.key, $event)" />
              <VTextInput v-else :model-value="String(campoAninhado(field.campo, column.key) ?? '')" :label="column.label" @update:model-value="updateNested(field.campo, column.key, $event)" />
            </template>
          </div>

          <div v-else-if="field.kind === 'dependencies'" class="space-y-3">
            <VSelect v-model="draft.dependencyMode" label="Decisão de dependências" :options="dependenciasOptions" />
            <VTextarea v-if="draft.dependencyMode === 'list'" v-model="draft[field.campo]" label="Dependências técnicas resolvidas" helper-text="IDs ou nomes rastreáveis, uma dependência por linha. Não marque dependências abertas como resolvidas." :rows="3" auto-resize />
            <VTextarea v-if="draft.dependencyMode" v-model="draft.dependencyReason" :label="draft.dependencyMode === 'none' ? 'Justificativa para ausência de dependências' : 'Justificativa de como as dependências foram resolvidas'" :rows="2" auto-resize />
          </div>
        </section>
      </div>
    </VCard>
    <VCard v-else variant="outlined" title="Editor indisponível para este critério" description="Este critério ainda não tem um formulário tipado. Nenhum patch será emitido." />

    <VCard variant="outlined" title="Natureza e referência" description="A natureza é uma classificação declarada por quem propõe; não é uma verificação independente.">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <VSelect v-model="natureza.value" label="Natureza da informação" :options="naturezaOptions" />
        <VTextInput v-model="referencia.value" :label="natureza.value === 'decisao-pendente' ? 'Decisão pendente / responsável' : 'Fonte ou referência declarada'" :helper-text="referenceOptionsHint" :required="requiresReference || natureza.value === 'decisao-pendente'" placeholder="URL, ID, documento, ticket ou justificativa" />
      </div>
      <p class="mt-3 text-xs text-nexo-muted">Fontes, URLs, PRs, resultados de CI/testes e aprovações são informados pelo usuário e permanecem não verificados nesta interface. O status de entrega não é editado por este formulário.</p>
    </VCard>

    <VCard v-if="changes.length" variant="filled" title="Prévia do diff proposto" :description="`${changes.length} campo(s) alterado(s); a revisão humana ainda é necessária.`">
      <ul class="space-y-3">
        <li v-for="change in changes" :key="change.campo" class="rounded-lg border border-nexo-border bg-white p-3">
          <strong class="text-sm text-nexo-text">{{ labelFor(change.campo) }}</strong>
          <div class="mt-1 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"><span class="break-words text-nexo-muted"><b>Atual:</b> {{ pretty(change.de) }}</span><span class="break-words text-nexo-text"><b>Proposto:</b> {{ pretty(change.para) }}</span></div>
        </li>
      </ul>
    </VCard>
    <p v-if="erro" class="rounded-lg border border-nexo-blocked-border bg-nexo-blocked-bg p-3 text-sm text-nexo-blocked" role="alert">{{ erro }}</p>
    <div class="flex flex-wrap items-center justify-between gap-3"><span class="text-xs text-nexo-muted">A proposta só será emitida para revisão; o artefato e o estado do gate não mudam aqui.</span><VButton variant="primary" :disabled="!canPropose" @click="propose">Propor alterações para revisão</VButton></div>
  </div>
</template>

<style scoped>
.gate-artifact-editor{min-width:0}.editor-field{min-width:0;padding-bottom:14px;border-bottom:1px solid var(--v-color-border)}.editor-field:last-child{border-bottom:0;padding-bottom:0}.editor-row{min-width:0}
</style>
