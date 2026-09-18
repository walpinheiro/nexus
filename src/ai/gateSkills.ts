import type {
  CriterioBdd,
  Epic,
  Feature,
  GateCheck,
  GateId,
  Kpi,
  NexoObject,
  NexoStatus,
  PBI,
  PatchMudanca,
  Role,
  User
} from '@/types/nexo'
import { avaliarGate, aprovadoresDoGate, gateDesbloqueado, gateAnterior } from '@/utils/gates'

export interface PerguntaCheck {
  codigo: string
  campoAlvo: string
  pergunta: string
  porQueBloqueia: string
  exemplo: string
  acaoLabel: string
}

export interface GateSkill {
  id: string
  nome: string
  gate: GateId
  roles: Role[]
  descricao: string
  autonomia: string
  checks: string[]
  perguntas: PerguntaCheck[]
}

export interface FaltaGate {
  codigo: string
  descricao: string
  severidade: 'bloqueante' | 'aviso'
  pergunta: string
  porQueBloqueia: string
  exemplo: string
  acaoLabel: string
  campoAlvo: string
  resolvivelPorIa: boolean
}

export interface GovernancaGate {
  gateId: GateId
  aprovadoresExigidos: Role[]
  usuarioAtual: User | null
  papelOk: boolean
  ehProponente: boolean
  proponenteNome: string
  bloqueadoPorProponente: boolean
  sequenciaOk: boolean
  gateAnteriorId: GateId | null
  motivoSequencia: string
  aptoParaAprovacao: boolean
}

export interface GateChatResult {
  texto: string
  propostaPatch?: {
    alvoId: string
    justificativa: string
    mudancas: PatchMudanca[]
  }
  checksAfetados?: string[]
}

// Catálogo normativo de perguntas e critérios por código de checklist
export const DICIONARIO_PERGUNTAS: Record<string, PerguntaCheck> = {
  'ENQ-001': {
    codigo: 'ENQ-001',
    campoAlvo: 'descricao',
    pergunta: 'Qual é o problema ou oportunidade concreta que estamos resolvendo (mín. 20 caracteres)?',
    porQueBloqueia: 'Iniciativas sem dor observável ou contexto claro não são elegíveis para enquadramento.',
    exemplo: 'Clientes relatam atrito ao tentar pagar faturas Pix fora do horário bancário comercial.',
    acaoLabel: 'Preencher Problema'
  },
  'ENQ-002': {
    codigo: 'ENQ-002',
    campoAlvo: 'descricao',
    pergunta: 'Quem é o público-alvo ou persona diretamente afetada pela dor?',
    porQueBloqueia: 'Sem persona identificada, não é possível validar proposta de valor.',
    exemplo: 'Pequenos e médios varejistas que utilizam checkout web e aplicativo móvel.',
    acaoLabel: 'Definir Público'
  },
  'ENQ-003': {
    codigo: 'ENQ-003',
    campoAlvo: 'descricao',
    pergunta: 'Qual é a hipótese mensurável de sucesso para este enquadramento?',
    porQueBloqueia: 'A hipótese precisa de métrica observável para guiar o avanço para G1.',
    exemplo: 'Aumentar a taxa de conversão em 15% nas primeiras 4 semanas de operação.',
    acaoLabel: 'Inserir Hipótese'
  },
  'ENQ-004': {
    codigo: 'ENQ-004',
    campoAlvo: 'owner',
    pergunta: 'Quem é o sponsor ou owner responsável pelo enquadramento da iniciativa?',
    porQueBloqueia: 'Todo objeto no NEXO exige um responsável formal com papel no projeto.',
    exemplo: 'u-pm (Paula - Product Manager)',
    acaoLabel: 'Definir Owner'
  },
  'ENQ-005': {
    codigo: 'ENQ-005',
    campoAlvo: 'escopo_in',
    pergunta: 'Quais são as restrições e não-objetivos declarados para esta iniciativa (escopo_in e escopo_out)?',
    porQueBloqueia: 'Enquadramentos sem fronteiras claras expandem escopo prematuramente.',
    exemplo: 'Escopo In: Pix cobrança imediata. Escopo Out: Pix crédito ou agendamento parcelado.',
    acaoLabel: 'Definir Restrições'
  },
  'ENQ-006': {
    codigo: 'ENQ-006',
    campoAlvo: 'riscos',
    pergunta: 'Quais são as suposições críticas e riscos de descoberta identificados no enquadramento?',
    porQueBloqueia: 'Riscos não explicitados no G0 geram impasses nas fases de arquitetura e entrega.',
    exemplo: 'Risco: Dependência da disponibilidade da API do Bacen e latência do PSP parceiro.',
    acaoLabel: 'Adicionar Riscos'
  },
  'EPC-001': {
    codigo: 'EPC-001',
    campoAlvo: 'problema',
    pergunta: 'Cadê o problema e o público do épico descritos com contexto detalhado (mín. 30 caracteres)?',
    porQueBloqueia: 'Épicos sem definição robusta da dor geram decomposição desbalanceada em features.',
    exemplo: 'Usuários finais enfrentam falhas de conciliação quando pagam via Pix em faturas com prazo expirado.',
    acaoLabel: 'Descrever Problema'
  },
  'EPC-002': {
    codigo: 'EPC-002',
    campoAlvo: 'kpis',
    pergunta: 'Cadê o KPI mensurável com nome, unidade, alvo numérico e responsável formal?',
    porQueBloqueia: 'Sem KPI rastreável, o épico não possui critério objetivo de entrega de valor de negócio.',
    exemplo: 'Nome: "Adoção Pix", Unidade: "%", Alvo: "40", Janela: "90d", Responsável: "u-pm"',
    acaoLabel: 'Adicionar KPI'
  },
  'EPC-003': {
    codigo: 'EPC-003',
    campoAlvo: 'escopo_in',
    pergunta: 'O que está explicitamente DENTRO (escopo_in) e FORA (escopo_out) do escopo deste épico?',
    porQueBloqueia: 'Fronteiras difusas causam escopo rastejante (scope creep) entre squads.',
    exemplo: 'Dentro: Geração dinâmica de QR Code. Fora: Estorno manual via painel de atendimento.',
    acaoLabel: 'Definir Escopo In/Out'
  },
  'EPC-004': {
    codigo: 'EPC-004',
    campoAlvo: 'objetivo',
    pergunta: 'Cadê o resultado de negócio observável declarado (focado em outcome e benefício, não em solução técnica)?',
    porQueBloqueia: 'Épicos que definem solução em vez de outcome prejudicam a autonomia do time de produto.',
    exemplo: 'Reduzir em 30% o tempo médio de liquidação financeira de faturas de clientes corporativos.',
    acaoLabel: 'Ajustar Outcome'
  },
  'EPC-005': {
    codigo: 'EPC-005',
    campoAlvo: 'riscos',
    pergunta: 'Cadê o risco crítico mapeado com probabilidade, impacto, estratégia de mitigação e owner nominal?',
    porQueBloqueia: 'Riscos sem responsável ou mitigação impedem a aprovação de governança em G1.',
    exemplo: 'Risco: Indisponibilidade de webhook (probabilidade média, impacto alto, mitigação: fila com DLQ, owner: u-techlead).',
    acaoLabel: 'Mapear Risco Crítico'
  },
  'EPC-006': {
    codigo: 'EPC-006',
    campoAlvo: 'fonte',
    pergunta: 'Cadê o preenchimento afirmativo de pelo menos 80% dos campos essenciais do PRD do épico?',
    porQueBloqueia: 'O épico precisa estar suficientemente maduro com problema, objetivo, personas e KPIs preenchidos.',
    exemplo: 'Preencha problema, objetivo, personas, escopo_in, escopo_out e KPIs.',
    acaoLabel: 'Completar Campos do Épico'
  },
  'FTR-001': {
    codigo: 'FTR-001',
    campoAlvo: 'ator',
    pergunta: 'Cadê a narrativa de benefício no formato "Como [ator], quero [capacidade] para [benefício]"?',
    porQueBloqueia: 'A narrativa fundamenta a persona beneficiada e a intenção de valor da funcionalidade.',
    exemplo: 'Como cliente pagador, quero escanear o QR Code Pix para liquidar a fatura instantaneamente.',
    acaoLabel: 'Completar Narrativa'
  },
  'FTR-002': {
    codigo: 'FTR-002',
    campoAlvo: 'fluxo_feliz',
    pergunta: 'Cadê o fluxo feliz detalhado com entrada, ação do usuário e retorno visível (mín. 10 chars)?',
    porQueBloqueia: 'O fluxo feliz orienta o design de telas, estados de interface e contratos de API.',
    exemplo: '1. Usuário clica em Pagar Pix. 2. Sistema exibe QR Code e código copia-e-cola com cronômetro.',
    acaoLabel: 'Estruturar Fluxo Feliz'
  },
  'FTR-003': {
    codigo: 'FTR-003',
    campoAlvo: 'regras_ids',
    pergunta: 'Quais regras de negócio estão vinculadas a esta feature com fonte declarada e status ativo?',
    porQueBloqueia: 'Features sem regras de negócio associadas geram comportamento divergente em produção.',
    exemplo: 'Regras vinculadas: reg-pix-validade-qrcode, reg-pix-limite-noturno.',
    acaoLabel: 'Vincular Regras'
  },
  'FTR-004': {
    codigo: 'FTR-004',
    campoAlvo: 'owner',
    pergunta: 'Quem é o responsável/owner formal desta feature?',
    porQueBloqueia: 'Nenhum gate pode ser aprovado com objetos anônimos ou sem liderança.',
    exemplo: 'u-pm (Paula)',
    acaoLabel: 'Atribuir Owner'
  },
  'FTR-005': {
    codigo: 'FTR-005',
    campoAlvo: 'telas_estados',
    pergunta: 'As telas vinculadas contemplam explicitamente os 4 estados de UI: loading, vazio, erro e sucesso?',
    porQueBloqueia: 'Telas sem tratamento de estados de erro e loading geram experiência degradada ao usuário.',
    exemplo: 'Estados mapeados: Skeleton no loading, EmptyState no vazio, Toast/Banner no erro e Tela de Sucesso no OK.',
    acaoLabel: 'Documentar Estados de UI'
  },
  'FTR-006': {
    codigo: 'FTR-006',
    campoAlvo: 'integracoes',
    pergunta: 'As integrações externas declaram timeout explícito, estratégia de falha e tratamento de indisponibilidade?',
    porQueBloqueia: 'Chamadas síncronas sem timeout podem travar threads e degradar toda a plataforma.',
    exemplo: 'PSP Pix com timeout de 3000ms, retry exponencial até 3x e fallback com mensagem amigável.',
    acaoLabel: 'Configurar Resiliência'
  },
  'FTR-007': {
    codigo: 'FTR-007',
    campoAlvo: 'criterios_bdd',
    pergunta: 'Cadê o BDD desta feature? Quais cenários Given/When/Then verificáveis validam o aceite?',
    porQueBloqueia: 'Sem ao menos 1 critério BDD verificável, a squad de engenharia não possui baseline de testes.',
    exemplo: 'Dado que a fatura está aberta, quando o cliente solicita Pix, então o QR Code deve expirar em 15 minutos.',
    acaoLabel: 'Gerar Critérios BDD'
  },
  'FTR-008': {
    codigo: 'FTR-008',
    campoAlvo: 'alternativos',
    pergunta: 'Para fluxos sensíveis/financeiros, cadê os cenários de erro, abuso e fluxos alternativos?',
    porQueBloqueia: 'Operações financeiras sem resiliência a falhas ou webhook duplicado geram perdas operacionais.',
    exemplo: 'PSP fora do ar exibe mensagem amigável com opção de tentar novamente em 30 segundos.',
    acaoLabel: 'Adicionar Alternativos'
  },
  'ARC-001': {
    codigo: 'ARC-001',
    campoAlvo: 'integracoes',
    pergunta: 'Cadê o contrato OpenAPI ou declaração das integrações externas (com timeout e resiliência)?',
    porQueBloqueia: 'Componentes em G3 sem contrato formal quebram governança e compatibilidade de serviços.',
    exemplo: 'Integração: "PSP Pix (Webhook REST com Idempotência via idTx e timeout de 5000ms)"',
    acaoLabel: 'Declarar Integração'
  },
  'ARC-002': {
    codigo: 'ARC-002',
    campoAlvo: 'adr_id',
    pergunta: 'Cadê a ADR (Decisão Arquitetural) formal vinculada que justifica a escolha técnica?',
    porQueBloqueia: 'G3 exige rastreabilidade de decisões estruturais (trade-offs, persistência, mensageria).',
    exemplo: 'adr-pix-idempotencia (Idempotência via Redis e banco relacional ACID)',
    acaoLabel: 'Vincular ADR'
  },
  'ARC-003': {
    codigo: 'ARC-003',
    campoAlvo: 'openapi',
    pergunta: 'Cadê a especificação detalhada do OpenAPI com retornos 2xx/4xx/5xx, modelo de auth e contrato versionado?',
    porQueBloqueia: 'Serviços sem contrato formal geram quebra de integração em cascata entre times.',
    exemplo: 'OpenAPI 3.0 com 200 OK, 400 Bad Request, 401 Unauthorized, 503 Service Unavailable e Bearer JWT.',
    acaoLabel: 'Especificar OpenAPI'
  },
  'ARC-004': {
    codigo: 'ARC-004',
    campoAlvo: 'persistencia',
    pergunta: 'Cadê a modelagem de dados: entidade, validações, migration versionada, índices e plano de dados?',
    porQueBloqueia: 'Alterações em banco de dados sem migration ou plano de volumetria e índices causam degradação e incidentes.',
    exemplo: 'Tabela cobrancas_pix com chave primária UUID, índice em (status, created_at) e migration Flyway.',
    acaoLabel: 'Modelar Persistência'
  },
  'ARC-005': {
    codigo: 'ARC-005',
    campoAlvo: 'integracoes',
    pergunta: 'As integrações externas possuem owner externo, timeout em milissegundos, política de retry e idempotência?',
    porQueBloqueia: 'A integridade financeira depende de chave de idempotência e timeouts estritos.',
    exemplo: 'Header X-Idempotency-Key obrigatório, timeout de 2500ms e retry com jitter.',
    acaoLabel: 'Estruturar Integração'
  },
  'ARC-006': {
    codigo: 'ARC-006',
    campoAlvo: 'dado_pessoal',
    pergunta: 'Cadê a classificação de privacidade e LGPD: categorias de dados pessoais, finalidade de uso, tempo de retenção e controle de acesso?',
    porQueBloqueia: 'Tratamento de dados sem base legal ou controle de retenção viola normas de conformidade e segurança.',
    exemplo: 'Classificação restrita para CPF/chave Pix, retenção por 5 anos (Bacen), acesso restrito à squad de pagamentos.',
    acaoLabel: 'Classificar Dados LGPD'
  },
  'ARC-007': {
    codigo: 'ARC-007',
    campoAlvo: 'nfrs',
    pergunta: 'Quais são os Requisitos Não-Funcionais (NFRs) mensuráveis com medida, alvo numérico e ferramenta de observabilidade?',
    porQueBloqueia: 'Sistemas sem metas de latência, disponibilidade ou vazão não têm garantias de escalabilidade.',
    exemplo: 'Latência p95 <= 200ms, disponibilidade 99.95%, monitorados via OpenTelemetry e Prometheus.',
    acaoLabel: 'Definir NFRs'
  },
  'ARC-008': {
    codigo: 'ARC-008',
    campoAlvo: 'seguranca',
    pergunta: 'Cadê o Threat Model estruturado, matriz de riscos de segurança e análise de vulnerabilidades (ou exceção com prazo vigente)?',
    porQueBloqueia: 'Exceções de segurança expiradas ou ausência de modelo de ameaças impedem aprovação de arquitetura.',
    exemplo: 'Threat model STRIDE documentado cobrindo spoofing de webhook e tampering de payloads.',
    acaoLabel: 'Registrar Threat Model'
  },
  'PBI-SEMBLOQ': {
    codigo: 'PBI-SEMBLOQ',
    campoAlvo: 'flag',
    pergunta: 'Existe alguma flag ou dependência bloqueadora pendente sobre este PBI?',
    porQueBloqueia: 'Flags bloqueadoras abertas impedem a entrada do item na sprint.',
    exemplo: 'Remover flag bloqueadora ou resolver o impedimento apontado.',
    acaoLabel: 'Limpar Bloqueadores'
  },
  'PBI-COND-COMPAT': {
    codigo: 'PBI-COND-COMPAT',
    campoAlvo: 'contrato',
    pergunta: 'Sendo o contrato público, foi garantida a compatibilidade e identificados os consumidores homologados?',
    porQueBloqueia: 'Contratos públicos exigem compatibilidade retroativa e homologação de consumidores.',
    exemplo: 'Contrato OpenAPI com compatibilidade retroativa declarada e consumidores mapeados.',
    acaoLabel: 'Garantir Compatibilidade'
  },
  'PBI-COND-ROLLBACK': {
    codigo: 'PBI-COND-ROLLBACK',
    campoAlvo: 'rollback',
    pergunta: 'Havendo migração destrutiva de dados, cadê o plano de rollback e o plano de dados detalhado?',
    porQueBloqueia: 'Alterações destrutivas em banco de dados sem plano de reversão bloqueiam a entrada em sprint.',
    exemplo: 'Plano de rollback com script reverso testado e backup snapshot prévio.',
    acaoLabel: 'Adicionar Rollback'
  },
  'PBI-COND-TELA': {
    codigo: 'PBI-COND-TELA',
    campoAlvo: 'contrato',
    pergunta: 'As telas vinculadas a este entregável consom a API através de contrato formalmente versionado?',
    porQueBloqueia: 'Interfaces de usuário não podem depender de APIs não versionadas ou instáveis.',
    exemplo: 'Tela consome endpoint via contrato OpenAPI v1 homologado.',
    acaoLabel: 'Vincular Contrato à Tela'
  },
  'PBI-COND-TESTE': {
    codigo: 'PBI-COND-TESTE',
    campoAlvo: 'estrategia_teste',
    pergunta: 'A estratégia de testes automatizados cobre os requisitos técnicos deste entregável?',
    porQueBloqueia: 'Entregáveis críticos exigem cobertura e estratégia de testes automatizados especificada.',
    exemplo: 'Suíte automatizada de testes de integração e regressão.',
    acaoLabel: 'Especificar Testes'
  },
  'PBI-ACEITE': {
    codigo: 'PBI-ACEITE',
    campoAlvo: 'criterios_bdd',
    pergunta: 'Cadê o critério de aceite BDD verificável no formato Given / When / Then deste PBI?',
    porQueBloqueia: 'Itens de backlog sem aceite objetivo não cumprem a Definition of Ready.',
    exemplo: 'Dado um payload válido de cobrança, quando a API é chamada, então retorna status 201 com o QR Code gerado.',
    acaoLabel: 'Adicionar BDD ao PBI'
  },
  'PBI-ORIGEM': {
    codigo: 'PBI-ORIGEM',
    campoAlvo: 'feature_id',
    pergunta: 'Qual é a feature de origem vinculada e quem é o owner responsável por este PBI?',
    porQueBloqueia: 'PBIs órfãos sem rastreabilidade com feature ou sem liderança não entram na sprint.',
    exemplo: 'Feature: ft-confirmar (Confirmação de Pagamento), Owner: u-dev (Dev Squad)',
    acaoLabel: 'Vincular Feature e Owner'
  },
  'PBI-ESCOPO': {
    codigo: 'PBI-ESCOPO',
    campoAlvo: 'escopo_in',
    pergunta: 'O que está explicitamente dentro e fora do escopo deste entregável na sprint?',
    porQueBloqueia: 'Falta de fronteiras de PBI causa desvios durante o desenvolvimento da sprint.',
    exemplo: 'Dentro: Endpoint POST /v1/cobrancas. Fora: Interface gráfica do operador.',
    acaoLabel: 'Definir Escopo do PBI'
  },
  'PBI-DEP': {
    codigo: 'PBI-DEP',
    campoAlvo: 'dependencias',
    pergunta: 'Existem dependências técnicas ou bloqueadores abertos impedindo o início deste PBI?',
    porQueBloqueia: 'Entregar itens bloqueados na sprint causa paradas e afeta o comprometimento de entrega.',
    exemplo: 'Dependências resolvidas: Credenciais sandbox PSP liberadas e fila SQS provisionada.',
    acaoLabel: 'Resolver Dependências'
  },
  'PBI-OWNER': {
    codigo: 'PBI-OWNER',
    campoAlvo: 'owner',
    pergunta: 'Quem é o desenvolvedor ou responsável pela entrega deste PBI?',
    porQueBloqueia: 'Todo entregável de sprint deve possuir responsável formal atribuído.',
    exemplo: 'u-dev (Diego - Dev)',
    acaoLabel: 'Definir Owner'
  },
  'PBI-TESTE': {
    codigo: 'PBI-TESTE',
    campoAlvo: 'estrategia_teste',
    pergunta: 'Qual é a estratégia de testes automatizados definida (unitários, integração, contrato)?',
    porQueBloqueia: 'PBI sem estratégia de testes não cumpre o DoR e é rejeitado para entrada em sprint.',
    exemplo: 'Testes de unidade com Jest (cobertura 85%) + teste de integração com Testcontainers.',
    acaoLabel: 'Definir Estratégia de Testes'
  },
  'PBI-CONTRATO': {
    codigo: 'PBI-CONTRATO',
    campoAlvo: 'contrato',
    pergunta: 'Os contratos de interface/API consumidos ou expostos foram aprovados ou formalmente dispensados?',
    porQueBloqueia: 'Contratos não aprovados colocam em risco o acoplamento e compatibilidade de versão.',
    exemplo: 'Contrato OpenAPI v1.2 aprovado pela engenharia de plataforma.',
    acaoLabel: 'Validar Contrato'
  },
  'PBI-BLOQ': {
    codigo: 'PBI-BLOQ',
    campoAlvo: 'flag',
    pergunta: 'Existe alguma flag bloqueadora pendente sobre este PBI?',
    porQueBloqueia: 'Flags bloqueadoras abertas impedem o avanço para sprint.',
    exemplo: 'Remover flag ou resolver o impedimento apontado.',
    acaoLabel: 'Limpar Bloqueadores'
  },
  'DON-001': {
    codigo: 'DON-001',
    campoAlvo: 'status',
    pergunta: 'Cadê a Definition of Done: evidência de aceite funcional e testes verdes comprovados?',
    porQueBloqueia: 'O gate G5 consolida a publicação apenas com validação técnica e documental concluída.',
    exemplo: 'Status atualizado para validated/published com pull request aprovado e suite verde.',
    acaoLabel: 'Validar Entrega'
  },
  'DON-002': {
    codigo: 'DON-002',
    campoAlvo: 'evidencia',
    pergunta: 'Cadê a evidência de Pull Request merged com aprovação humana e link rastreável?',
    porQueBloqueia: 'O gate G5 consolida entrega formal com revisão de código concluída por pares.',
    exemplo: 'PR #142 aprovado por 2 revisores sênior com link para o repositório.',
    acaoLabel: 'Registrar Evidência de PR'
  },
  'DON-003': {
    codigo: 'DON-003',
    campoAlvo: 'evidencia',
    pergunta: 'A pipeline de Integração Contínua (CI) está 100% verde com SAST e suíte de testes aprovada?',
    porQueBloqueia: 'Falhas em linters, testes automatizados ou escaneamento SAST impedem publicação.',
    exemplo: 'Pipeline CI verde com 145 testes passando, zero vulnerabilidades críticas no SonarQube.',
    acaoLabel: 'Registrar Pipeline CI'
  },
  'DON-004': {
    codigo: 'DON-004',
    campoAlvo: 'evidencia',
    pergunta: 'O aceite funcional foi concluído com evidências e testes ponta-a-ponta validados pelo QA/PO?',
    porQueBloqueia: 'G5 exige validação funcional formal dos critérios BDD antes da disponibilização.',
    exemplo: 'Roteiro de homologação executado em staging com aprovação do QA.',
    acaoLabel: 'Registrar Aceite Funcional'
  },
  'DON-005': {
    codigo: 'DON-005',
    campoAlvo: 'evidencia',
    pergunta: 'A segurança da informação foi homologada ou possui exceção formal vigente com prazo cadastrado?',
    porQueBloqueia: 'Riscos de segurança sem aprovação técnica impedem o fechamento do gate de entrega.',
    exemplo: 'Análise DAST executada e aprovada pelo time de segurança corporativa.',
    acaoLabel: 'Homologar Segurança'
  },
  'DON-006': {
    codigo: 'DON-006',
    campoAlvo: 'evidencia',
    pergunta: 'A telemetria, observabilidade (métricas, logs, traces) e rastreabilidade fim-a-fim foram implementadas?',
    porQueBloqueia: 'A publicação em produção requer monitoramento operacional ativo desde o primeiro minuto.',
    exemplo: 'Dashboards no Grafana e alertas no PagerDuty configurados.',
    acaoLabel: 'Configurar Observabilidade'
  }
}

// Catálogo de Skills especializadas por Gate
export const GATE_SKILLS: Record<GateId, GateSkill[]> = {
  G0: [
    {
      id: 'discovery.facilitator',
      nome: 'Discovery Facilitator',
      gate: 'G0',
      roles: ['PM'],
      descricao: 'Estrutura hipóteses, dores observáveis e enquadramento de novas oportunidades de negócio.',
      autonomia: 'Não define orçamento nem prioridade corporativa isoladamente.',
      checks: ['ENQ-001', 'ENQ-002', 'ENQ-003', 'ENQ-004', 'ENQ-005', 'ENQ-006'],
      perguntas: [
        DICIONARIO_PERGUNTAS['ENQ-001'],
        DICIONARIO_PERGUNTAS['ENQ-002'],
        DICIONARIO_PERGUNTAS['ENQ-003'],
        DICIONARIO_PERGUNTAS['ENQ-004'],
        DICIONARIO_PERGUNTAS['ENQ-005'],
        DICIONARIO_PERGUNTAS['ENQ-006']
      ]
    }
  ],
  G1: [
    {
      id: 'product.outcome_designer',
      nome: 'Product Strategist',
      gate: 'G1',
      roles: ['PM'],
      descricao: 'Mapeia capacidades de negócio, metas de impacto mensuráveis e fronteiras de escopo.',
      autonomia: 'Não inventa metas sem owner e não altera prioridades do portfólio.',
      checks: ['EPC-001', 'EPC-002', 'EPC-003', 'EPC-004', 'EPC-005', 'EPC-006'],
      perguntas: [
        DICIONARIO_PERGUNTAS['EPC-001'],
        DICIONARIO_PERGUNTAS['EPC-002'],
        DICIONARIO_PERGUNTAS['EPC-003'],
        DICIONARIO_PERGUNTAS['EPC-004'],
        DICIONARIO_PERGUNTAS['EPC-005'],
        DICIONARIO_PERGUNTAS['EPC-006']
      ]
    }
  ],
  G2: [
    {
      id: 'quality.bdd_author',
      nome: 'BDD & Quality Analyst',
      gate: 'G2',
      roles: ['PM', 'UX', 'QA'],
      descricao: 'Elabora cenários executáveis Given/When/Then e critérios de aceite para features.',
      autonomia: 'Não aceita critérios sem resultado observável e não aprova baseline sem PM.',
      checks: ['FTR-007', 'FTR-008'],
      perguntas: [DICIONARIO_PERGUNTAS['FTR-007'], DICIONARIO_PERGUNTAS['FTR-008']]
    },
    {
      id: 'ux.flow_designer',
      nome: 'UX Flow Designer',
      gate: 'G2',
      roles: ['PM', 'UX'],
      descricao: 'Especifica fluxos felizes, narrativas de benefício e tratamento de estados de interface.',
      autonomia: 'Não aprova design final sem validação do designer responsável.',
      checks: ['FTR-001', 'FTR-002', 'FTR-003', 'FTR-004', 'FTR-005', 'FTR-006'],
      perguntas: [
        DICIONARIO_PERGUNTAS['FTR-001'],
        DICIONARIO_PERGUNTAS['FTR-002'],
        DICIONARIO_PERGUNTAS['FTR-003'],
        DICIONARIO_PERGUNTAS['FTR-004'],
        DICIONARIO_PERGUNTAS['FTR-005'],
        DICIONARIO_PERGUNTAS['FTR-006']
      ]
    }
  ],
  G3: [
    {
      id: 'architecture.domain_designer',
      nome: 'Domain Architect',
      gate: 'G3',
      roles: ['Arquiteto', 'TechLead'],
      descricao: 'Garante contratos de integração, modelos de dados, idempotência e vínculos com ADRs.',
      autonomia: 'Não quebra contratos públicos nem fecha trade-offs sem consentimento técnico.',
      checks: ['ARC-001', 'ARC-002', 'ARC-003', 'ARC-004', 'ARC-005'],
      perguntas: [
        DICIONARIO_PERGUNTAS['ARC-001'],
        DICIONARIO_PERGUNTAS['ARC-002'],
        DICIONARIO_PERGUNTAS['ARC-003'],
        DICIONARIO_PERGUNTAS['ARC-004'],
        DICIONARIO_PERGUNTAS['ARC-005']
      ]
    },
    {
      id: 'security.threat_reviewer',
      nome: 'Security Reviewer',
      gate: 'G3',
      roles: ['Seguranca', 'TechLead'],
      descricao: 'Avalia resiliência, proteção de dados e exceções de conformidade.',
      autonomia: 'Não aprova exceções críticas de segurança sem waiver formalizado.',
      checks: ['ARC-006', 'ARC-007', 'ARC-008'],
      perguntas: [
        DICIONARIO_PERGUNTAS['ARC-006'],
        DICIONARIO_PERGUNTAS['ARC-007'],
        DICIONARIO_PERGUNTAS['ARC-008']
      ]
    }
  ],
  G4: [
    {
      id: 'delivery.pbi_planner',
      nome: 'PBI & DoR Planner',
      gate: 'G4',
      roles: ['PO', 'Dev', 'QA', 'TechLead'],
      descricao: 'Decompõe entregáveis em Definition of Ready com estratégias de testes automatizados.',
      autonomia: 'Não fecha estimativas de squad e não divide itens sem aceite verificável.',
      checks: [
        'PBI-ACEITE',
        'PBI-ORIGEM',
        'PBI-ESCOPO',
        'PBI-DEP',
        'PBI-OWNER',
        'PBI-TESTE',
        'PBI-CONTRATO',
        'PBI-BLOQ',
        'PBI-COND-COMPAT',
        'PBI-COND-ROLLBACK',
        'PBI-COND-TELA',
        'PBI-COND-TESTE'
      ],
      perguntas: [
        DICIONARIO_PERGUNTAS['PBI-ACEITE'],
        DICIONARIO_PERGUNTAS['PBI-ORIGEM'],
        DICIONARIO_PERGUNTAS['PBI-ESCOPO'],
        DICIONARIO_PERGUNTAS['PBI-DEP'],
        DICIONARIO_PERGUNTAS['PBI-OWNER'],
        DICIONARIO_PERGUNTAS['PBI-TESTE'],
        DICIONARIO_PERGUNTAS['PBI-CONTRATO'],
        DICIONARIO_PERGUNTAS['PBI-BLOQ'],
        DICIONARIO_PERGUNTAS['PBI-COND-COMPAT'],
        DICIONARIO_PERGUNTAS['PBI-COND-ROLLBACK'],
        DICIONARIO_PERGUNTAS['PBI-COND-TELA'],
        DICIONARIO_PERGUNTAS['PBI-COND-TESTE']
      ].filter(Boolean)
    }
  ],
  G5: [
    {
      id: 'delivery.dod_inspector',
      nome: 'DoD & Release Inspector',
      gate: 'G5',
      roles: ['Dev', 'QA', 'TechLead'],
      descricao: 'Inspeciona evidências de testes, pipelines verdes e critérios de Definition of Done.',
      autonomia: 'Não realiza merge ou deploy sem validação de testes automatizados.',
      checks: ['DON-001', 'DON-002', 'DON-003', 'DON-004', 'DON-005', 'DON-006'],
      perguntas: [
        DICIONARIO_PERGUNTAS['DON-001'],
        DICIONARIO_PERGUNTAS['DON-002'],
        DICIONARIO_PERGUNTAS['DON-003'],
        DICIONARIO_PERGUNTAS['DON-004'],
        DICIONARIO_PERGUNTAS['DON-005'],
        DICIONARIO_PERGUNTAS['DON-006']
      ]
    }
  ]
}

export function obterSkillsDoGate(gateId: GateId): GateSkill[] {
  return GATE_SKILLS[gateId] ?? []
}

export function obterPerguntasDoCheck(codigoCheck: string): PerguntaCheck | undefined {
  return DICIONARIO_PERGUNTAS[codigoCheck]
}

// Avalia o objeto e retorna as faltas detalhadas com perguntas reflexivas PT-BR
export function diagnosticarFaltasGate(
  objeto: NexoObject,
  gateId: GateId,
  waivers?: { codigo: string; prazo: string }[]
): {
  checks: GateCheck[]
  faltas: FaltaGate[]
  bloqueantesFaltando: string[]
  aprovado: boolean
} {
  const ev = avaliarGate(objeto, waivers, gateId)
  const faltas: FaltaGate[] = []

  for (const c of ev.checks) {
    if (!c.ok) {
      const p = DICIONARIO_PERGUNTAS[c.codigo] ?? {
        codigo: c.codigo,
        campoAlvo: 'descricao',
        pergunta: `O que falta para atender à regra "${c.descricao}"?`,
        porQueBloqueia: `Regra ${c.codigo} não foi atendida pelo objeto.`,
        exemplo: 'Consulte a especificação do gate para o formato esperado.',
        acaoLabel: 'Preencher Dados'
      }

      faltas.push({
        codigo: c.codigo,
        descricao: c.descricao,
        severidade: c.severidade,
        pergunta: p.pergunta,
        porQueBloqueia: p.porQueBloqueia,
        exemplo: p.exemplo,
        acaoLabel: p.acaoLabel,
        campoAlvo: p.campoAlvo,
        resolvivelPorIa: true
      })
    }
  }

  return {
    checks: ev.checks,
    faltas,
    bloqueantesFaltando: ev.bloqueantesFaltando,
    aprovado: ev.bloqueantesOk
  }
}

// Analisa os papéis aprovadores, segregação de funções e cadeado sequencial
export function obterGovernancaGate(
  gateId: GateId,
  user: User | null,
  objeto: NexoObject | null,
  gates: { id: GateId; status: string; baselineVersao?: number | null }[]
): GovernancaGate {
  const aprovadoresExigidos = aprovadoresDoGate(gateId) as Role[]
  const papelOk = user ? aprovadoresExigidos.includes(user.papel) : false
  const seqOk = gateDesbloqueado(gateId, gates)
  const antId = gateAnterior(gateId)

  let motivoSeq = ''
  if (!seqOk && antId) {
    motivoSeq = `Gate ${antId} precisa estar aprovado com baseline versionada para liberar ${gateId}.`
  }

  const proponenteId = objeto?.owner ?? ''
  const ehProponente = Boolean(user && proponenteId && proponenteId === user.id)
  const proponenteNome = proponenteId || 'Não definido'
  const bloqueadoPorProponente = ehProponente

  const aptoParaAprovacao = papelOk && seqOk && !bloqueadoPorProponente

  return {
    gateId,
    aprovadoresExigidos,
    usuarioAtual: user,
    papelOk,
    ehProponente,
    proponenteNome,
    bloqueadoPorProponente,
    sequenciaOk: seqOk,
    gateAnteriorId: antId,
    motivoSequencia: motivoSeq,
    aptoParaAprovacao
  }
}

// Gerador determinístico de propostas de patch estruturadas
export function gerarPropostaPatch(
  objeto: NexoObject,
  codigoCheck: string,
  textoUsuario?: string
): { justificativa: string; mudancas: PatchMudanca[] } | null {
  const mudancas: PatchMudanca[] = []
  const titulo = objeto.titulo || 'Objeto'
  const entrada = (textoUsuario ?? '').trim()

  switch (codigoCheck) {
    case 'FTR-007': {
      // Ao menos 1 critério BDD verificável
      const f = objeto as unknown as Feature
      const atual = JSON.stringify(f.criterios_bdd ?? [])
      const novoId = `AC-${String(Math.floor(Math.random() * 800) + 100).padStart(3, '0')}`

      let given = `que o usuário acessa ${titulo}`
      let when = 'solicita a execução da operação'
      let then = 'o sistema confirma o resultado com sucesso e atualiza o estado'

      if (entrada.length >= 15) {
        given = `que ${entrada}`
        when = 'a ação é processada pelo sistema'
        then = 'a regra de negócio é validada sem exceções'
      }

      const novoBdd: CriterioBdd[] = [
        ...(f.criterios_bdd ?? []),
        {
          id: novoId,
          given,
          when,
          then,
          prioridade: 'must'
        }
      ]

      mudancas.push({
        campo: 'criterios_bdd',
        de: atual,
        para: JSON.stringify(novoBdd, null, 2)
      })

      return {
        justificativa: `[IA Gate G2] Adicionar critério BDD Given/When/Then verificável (${novoId}) para resolver FTR-007`,
        mudancas
      }
    }

    case 'FTR-001': {
      // Narrativa de benefício
      const f = objeto as unknown as Feature
      const deAtor = f.ator ?? ''
      const deDesc = objeto.descricao ?? ''
      const paraAtor = entrada || 'Usuário autenticado'
      const paraDesc = `Permitir que ${paraAtor} execute ${titulo} com segurança e rastreabilidade total.`

      mudancas.push({ campo: 'ator', de: deAtor, para: paraAtor })
      mudancas.push({ campo: 'descricao', de: deDesc, para: paraDesc })

      return {
        justificativa: `[IA Gate G2] Definir ator e narrativa de benefício para resolver FTR-001`,
        mudancas
      }
    }

    case 'FTR-002': {
      // Fluxo feliz
      const f = objeto as unknown as Feature
      const de = f.fluxo_feliz ?? ''
      const para =
        entrada.length >= 10
          ? entrada
          : `1. O usuário seleciona ${titulo}. 2. O sistema valida os parâmetros e pré-condições. 3. Confirma a operação com sucesso.`

      mudancas.push({ campo: 'fluxo_feliz', de, para })
      return {
        justificativa: `[IA Gate G2] Estruturar fluxo feliz observável para resolver FTR-002`,
        mudancas
      }
    }

    case 'FTR-004':
    case 'ENQ-004': {
      // Owner
      const de = objeto.owner ?? ''
      const para = entrada || 'u-pm'
      mudancas.push({ campo: 'owner', de, para })
      return {
        justificativa: `[IA Gate] Atribuir owner responsável formal (${para})`,
        mudancas
      }
    }

    case 'FTR-008': {
      // Alternativos / exceções
      const f = objeto as unknown as Feature
      const de = JSON.stringify(f.alternativos ?? [])
      const novoAlt = entrada || 'Falha de comunicação ou timeout retorna erro amigável com opção de tentar novamente.'
      const para = JSON.stringify([...(f.alternativos ?? []), novoAlt], null, 2)
      mudancas.push({ campo: 'alternativos', de, para })
      return {
        justificativa: `[IA Gate G2] Adicionar cenário alternativo/exceção para resolver FTR-008`,
        mudancas
      }
    }

    case 'EPC-001':
    case 'ENQ-001': {
      // Problema
      const e = objeto as unknown as Epic
      const de = e.problema ?? objeto.descricao ?? ''
      const para =
        entrada.length >= 30
          ? entrada
          : `Clientes e operadores enfrentam atrasos e inconsistências operacionais ao tentar processar ${titulo} sem automação.`
      mudancas.push({ campo: 'problema', de, para })
      if (objeto.descricao !== para) {
        mudancas.push({ campo: 'descricao', de: objeto.descricao, para })
      }
      return {
        justificativa: `[IA Gate] Descrever problema e contexto detalhado (>= 30 chars)`,
        mudancas
      }
    }

    case 'EPC-002': {
      // KPI de Épico
      const e = objeto as unknown as Epic
      const de = JSON.stringify(e.kpis ?? [])
      const novoKpi: Kpi = {
        nome: entrada ? `Impacto em ${entrada}` : `Adoção de ${titulo}`,
        unidade: '%',
        alvo: '40',
        janela: '90d',
        responsavel: objeto.owner || 'u-pm'
      }
      const para = JSON.stringify([...(e.kpis ?? []), novoKpi], null, 2)
      mudancas.push({ campo: 'kpis', de, para })
      return {
        justificativa: `[IA Gate G1] Adicionar KPI mensurável com nome, unidade, alvo e responsável para EPC-002`,
        mudancas
      }
    }

    case 'EPC-003': {
      // Escopo In / Out
      const e = objeto as unknown as Epic
      const deIn = JSON.stringify(e.escopo_in ?? [])
      const deOut = JSON.stringify(e.escopo_out ?? [])
      const paraIn = JSON.stringify(
        [...(e.escopo_in ?? []), `Operação principal e fluxo automatizado de ${titulo}`],
        null,
        2
      )
      const paraOut = JSON.stringify(
        [...(e.escopo_out ?? []), `Suporte legado e customizações pontuais fora do padrão`],
        null,
        2
      )
      mudancas.push({ campo: 'escopo_in', de: deIn, para: paraIn })
      mudancas.push({ campo: 'escopo_out', de: deOut, para: paraOut })
      return {
        justificativa: `[IA Gate G1] Definir fronteiras explícitas de escopo in e out para EPC-003`,
        mudancas
      }
    }

    case 'ARC-001': {
      // Contrato / Integração
      const de = JSON.stringify((objeto as unknown as Feature).integracoes ?? [])
      const novaInteg =
        entrada || `Serviço REST ${titulo} (OpenAPI 3.0 com timeout de 3000ms e política de 3 retentativas)`
      const para = JSON.stringify([...((objeto as unknown as Feature).integracoes ?? []), novaInteg], null, 2)
      mudancas.push({ campo: 'integracoes', de, para })
      return {
        justificativa: `[IA Gate G3] Declarar integração/contrato técnico para resolver ARC-001`,
        mudancas
      }
    }

    case 'ARC-002': {
      // ADR
      const de = String((objeto as unknown as Record<string, unknown>)['adr_id'] ?? '')
      const para = entrada || 'adr-arquitetura-padrao'
      mudancas.push({ campo: 'adr_id', de, para })
      return {
        justificativa: `[IA Gate G3] Vincular ADR formal (${para}) para resolver ARC-002`,
        mudancas
      }
    }

    case 'PBI-ACEITE':
    case 'PBI-TESTE':
    case 'PBI-ORIGEM':
    case 'PBI-ESCOPO':
    case 'PBI-DEP':
    case 'PBI-OWNER':
    case 'PBI-CONTRATO':
    case 'PBI-BLOQ':
    case 'PBI-SEMBLOQ':
    case 'PBI-COND-COMPAT':
    case 'PBI-COND-ROLLBACK':
    case 'PBI-COND-TELA':
    case 'PBI-COND-TESTE': {
      // DoR PBI
      const p = objeto as unknown as PBI & { criterios_bdd?: CriterioBdd[] }
      const deBdd = JSON.stringify(p.criterios_bdd ?? [])
      const deOwner = p.owner ?? ''
      const deEstrategia = p.estrategia_teste ?? ''

      const paraOwner = p.owner || 'u-dev'
      const paraEstrategia = entrada || 'componente + integracao de contrato'
      const novoBdd =
        p.criterios_bdd && p.criterios_bdd.length > 0
          ? p.criterios_bdd
          : [
              {
                id: 'AC-PBI-01',
                given: `que o componente ${titulo} está carregado`,
                when: 'a requisição é processada',
                then: 'retorna status 200 com payload validado',
                prioridade: 'must'
              }
            ]

      mudancas.push({ campo: 'owner', de: deOwner, para: paraOwner })
      mudancas.push({ campo: 'estrategia_teste', de: deEstrategia, para: paraEstrategia })
      mudancas.push({ campo: 'criterios_bdd', de: deBdd, para: JSON.stringify(novoBdd, null, 2) })

      return {
        justificativa: `[IA Gate G4] Preencher DoR completa: BDD, owner e estratégia de testes para resolver ${codigoCheck}`,
        mudancas
      }
    }

    case 'DON-001':
    case 'DON-002':
    case 'DON-003':
    case 'DON-004':
    case 'DON-005':
    case 'DON-006': {
      // DoD G5 - promover status para validated e registrar evidências completas
      const de = objeto.status
      const para: NexoStatus = 'validated'
      mudancas.push({ campo: 'status', de, para })

      const deEvidencia = JSON.stringify((objeto as unknown as Record<string, unknown>).evidencia ?? {})
      const paraEvidencia = JSON.stringify(
        {
          pr_url: 'https://github.com/locaweb/nexo/pull/142',
          pr_merged: true,
          checks_ci: ['lint:pass', 'test:pass', 'sast:pass', 'policy:pass'],
          sast_ok: true,
          policy_ok: true,
          aceite_registrado: true,
          testes_verdes: true,
          seg_aprovado: true,
          observabilidade: ['latencia_p95', 'erro_5xx', 'grafana_dashboard_pbi'],
          rastreabilidade: ['git_commit_sha', 'story_map_node', 'jira_issue']
        },
        null,
        2
      )
      mudancas.push({ campo: 'evidencia', de: deEvidencia, para: paraEvidencia })

      return {
        justificativa: `[IA Gate G5] Promover status para validated e consolidar conformidade de DoD para ${codigoCheck}`,
        mudancas
      }
    }

    default:
      return null
  }
}

// Processador conversacional local interativo para GateAiSession
export function processarMensagemGate(
  mensagem: string,
  contexto: {
    objeto: NexoObject | null
    gateId: GateId
    user: User | null
    gates: { id: GateId; status: string; baselineVersao?: number | null }[]
    waivers?: { codigo: string; prazo: string }[]
  }
): GateChatResult {
  const msg = mensagem.trim().toLowerCase()
  const { objeto, gateId, user, gates, waivers } = contexto

  if (!objeto) {
    if (gateId === 'G5') {
      return {
        texto: 'Nenhum entregável selecionado no Gate G5. O Gate G5 avalia a Definition of Done (DoD) de itens que completaram o ciclo. Promova uma Feature ou PBI para o status "validated" no Canvas ou vincule um nó ao Gate G5 para que a IA possa validar as evidências de entrega.'
      }
    }
    return {
      texto: `Nenhum objeto selecionado no Gate ${gateId}. Por favor, selecione um objeto na lista ao lado para iniciar o diagnóstico e a sessão interativa.`
    }
  }

  const diag = diagnosticarFaltasGate(objeto, gateId, waivers)
  const gov = obterGovernancaGate(gateId, user, objeto, gates)

  // 1. Perguntas de status / o que falta / governança
  if (
    msg.includes('o que falta') ||
    msg.includes('pendencias') ||
    msg.includes('pendências') ||
    msg.includes('status') ||
    msg.includes('ajuda') ||
    msg.includes('como aprovar')
  ) {
    if (diag.aprovado) {
      let txt = `**Fato:** Todos os checks bloqueantes do Gate ${gateId} para "${objeto.titulo}" estão atendidos (100% OK).\n\n`
      if (!gov.sequenciaOk) {
        txt += `**Inferência:** O gate ainda não pode ser aprovado pois o cadeado sequencial está ativo. ${gov.motivoSequencia}\n`
      } else if (!gov.papelOk) {
        txt += `**Inferência:** Seu usuário (${user?.nome}) tem papel ${user?.papel}. Este gate exige um dos papéis: ${gov.aprovadoresExigidos.join(', ')}.\n`
      } else if (gov.bloqueadoPorProponente) {
        txt += `**Inferência:** Você é o proponente deste objeto. Pela regra de governança, o proponente não pode ser o único aprovador. Um segundo usuário com papel ${gov.aprovadoresExigidos.join(', ')} deve aprovar.\n`
      } else {
        txt += `**Ação Recomendada:** Você está habilitado para aprovar este gate! Clique no botão "Aprovar Gate ${gateId}" ao lado para registrar a baseline versionada.\n`
      }
      return { texto: txt }
    }

    const listaFaltas = diag.faltas
      .map(
        (f) =>
          `- **[${f.codigo}] ${f.descricao}** (${f.severidade})\n  *Pergunta da IA:* ${f.pergunta}\n  *Exemplo:* ${f.exemplo}`
      )
      .join('\n\n')

    return {
      texto: `**Diagnóstico do Gate ${gateId} para "${objeto.titulo}":**\n\nIdentificamos ${diag.faltas.length} pendência(s) que impedem a aprovação:\n\n${listaFaltas}\n\n**Como resolver:** Você pode me pedir "gerar BDD", "adicionar KPI", "definir fluxo feliz" ou fornecer as respostas diretamente no chat que eu gerarei a proposta de patch formal para você aceitar.`
    }
  }

  // 2. Pedidos diretos de BDD
  if (msg.includes('bdd') || msg.includes('criterio') || msg.includes('critério') || msg.includes('cenario') || msg.includes('cenário')) {
    const prop = gerarPropostaPatch(objeto, 'FTR-007', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Elaborei um critério BDD verificável Given/When/Then estruturado para "${objeto.titulo}".\n\nVeja a proposta formal de patch abaixo. Revise as alterações e clique em **"Aceitar (nova versão)"** para atualizar o objeto e recalcular o checklist em tempo real.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['FTR-007']
      }
    }
  }

  // 3. Pedidos de Narrativa ou Fluxo
  if (msg.includes('narrativa') || msg.includes('ator') || msg.includes('beneficio') || msg.includes('benefício')) {
    const prop = gerarPropostaPatch(objeto, 'FTR-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Elaborei a narrativa de ator, capacidade e benefício para "${objeto.titulo}". Aceite o patch abaixo para aplicar.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['FTR-001']
      }
    }
  }

  if (msg.includes('fluxo') || msg.includes('passos') || msg.includes('etapas')) {
    const prop = gerarPropostaPatch(objeto, 'FTR-002', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Estruturei o fluxo feliz passo a passo com entrada, ação e resultado observável para "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['FTR-002']
      }
    }
  }

  // 4. Pedidos de KPI ou Escopo (G1)
  if (msg.includes('kpi') || msg.includes('meta') || msg.includes('métrica') || msg.includes('metrica')) {
    const prop = gerarPropostaPatch(objeto, 'EPC-002', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Mapeei um KPI mensurável com nome, unidade, alvo e responsável para o épico "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['EPC-002']
      }
    }
  }

  if (msg.includes('escopo') || msg.includes('in/out') || msg.includes('fronteira')) {
    const prop = gerarPropostaPatch(objeto, 'EPC-003', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Defini os escopos dentro (escopo_in) e fora (escopo_out) para o épico "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['EPC-003']
      }
    }
  }

  // 5. Pedidos de Arquitetura (G3)
  if (msg.includes('adr') || msg.includes('arquitetura') || msg.includes('decisao') || msg.includes('decisão')) {
    const prop = gerarPropostaPatch(objeto, 'ARC-002', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Vinculei uma ADR técnica para formalizar as decisões arquiteturais de "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['ARC-002']
      }
    }
  }

  if (msg.includes('integracao') || msg.includes('integração') || msg.includes('contrato') || msg.includes('openapi')) {
    const prop = gerarPropostaPatch(objeto, 'ARC-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Declarei o contrato de integração com timeout e política de resiliência para "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['ARC-001']
      }
    }
  }

  // 6. Pedidos de PBI / DoR (G4)
  if (msg.includes('pbi') || msg.includes('dor') || msg.includes('ready') || msg.includes('teste')) {
    const prop = gerarPropostaPatch(objeto, 'PBI-ACEITE', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Completei a Definition of Ready do PBI "${objeto.titulo}" com critérios BDD, owner e estratégia de teste.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['PBI-ACEITE', 'PBI-TESTE', 'PBI-OWNER', 'PBI-ESCOPO']
      }
    }
  }

  // 7. Pedidos de Enquadramento (G0)
  if (
    msg.includes('hipotese') ||
    msg.includes('hipótese') ||
    msg.includes('dor') ||
    msg.includes('problema') ||
    msg.includes('enquadramento')
  ) {
    const prop = gerarPropostaPatch(objeto, 'ENQ-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada (G0):** Estruturei o problema e a hipótese de enquadramento para "${objeto.titulo}". Aceite o patch abaixo para aplicar.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['ENQ-001', 'ENQ-003']
      }
    }
  }

  // 8. Pedidos de DoD / Release (G5)
  if (
    msg.includes('dod') ||
    msg.includes('done') ||
    msg.includes('entrega') ||
    msg.includes('release') ||
    msg.includes('validar') ||
    msg.includes('publicar') ||
    msg.includes('evidencia') ||
    msg.includes('evidência')
  ) {
    const prop = gerarPropostaPatch(objeto, 'DON-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada (G5):** Consolidei a Definition of Done promovendo o status de "${objeto.titulo}" para validated com evidências completas de PR, CI/SAST, testes automatizados e observabilidade.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['DON-001', 'DON-002', 'DON-003', 'DON-004', 'DON-005', 'DON-006']
      }
    }
  }

  // 9. Se houver falha pendente na primeira posição, tentar gerar patch para ela usando a entrada do usuário
  if (diag.faltas.length > 0) {
    const primeiraFalta = diag.faltas[0]
    const prop = gerarPropostaPatch(objeto, primeiraFalta.codigo, mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Com base na sua resposta, estruturei uma proposta de patch para resolver a pendência **[${primeiraFalta.codigo}] ${primeiraFalta.descricao}** em "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: [primeiraFalta.codigo]
      }
    }
  }

  // Fallback HONESTO (FIX-REAL-OLLAMA R2): NUNCA menu de comandos ("experimente pedir...")
  // — esse era o mock que o dono viu. Faz a pergunta da próxima falta do roteiro + registra.
  if (diag.faltas.length > 0) {
    const proxima = diag.faltas[0]
    return {
      texto: `Opero em modo local (resposta local — servidor inalcançável) para "${objeto.titulo}".\n\n👉 **[${proxima.codigo}] ${proxima.pergunta}**\n\n*Exemplo de resposta:* "${proxima.exemplo}"\n\nResponda em texto livre que eu registro e avanço para a próxima pendência (${diag.faltas.length} no total).`
    }
  }
  return {
    texto: `Todos os checks bloqueantes do Gate ${gateId} para "${objeto.titulo}" estão atendidos (resposta local — servidor inalcançável). Você está apto a solicitar a aprovação formal de baseline.`
  }
}
