import type {
  GateCheck,
  GateId,
  NexoObject,
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
    campoAlvo: 'permissoes',
    pergunta: 'Qual recurso é alterado e qual policy autoriza essa ação? Cite papel/condição e regra de autorização aplicada.',
    porQueBloqueia: 'Alterações de dados sem policy explícita podem permitir acesso não autorizado.',
    exemplo: '{"permissoes":[{"recurso":"cobrança","acao":"confirmar","policy":"somente titular autenticado"}]}',
    acaoLabel: 'Definir permissão/policy'
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
    pergunta: 'Foi declarada a existência de integrações? Para cada integração, quais são o timeout positivo, o tratamento de falha e o tratamento de indisponibilidade?',
    porQueBloqueia: 'Integrações omitidas ou sem limites e respostas distintas para falha/indisponibilidade não permitem avaliar resiliência.',
    exemplo: 'Use o formulário para registrar uma decisão real e os campos de resiliência. Não copie um exemplo como evidência.',
    acaoLabel: 'Configurar Resiliência'
  },
  'FTR-007': {
    codigo: 'FTR-007',
    campoAlvo: 'criterios_bdd',
    pergunta: 'Quais critérios Given/When/Then foram declarados, em que camada serão verificados e qual é a fonte/referência de cada critério?',
    porQueBloqueia: 'Sem cenário verificável, camada e origem declaradas não há base rastreável para validar o aceite.',
    exemplo: 'Informe cenário, camada e referência reais no formulário. Não copie um exemplo como evidência.',
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
    pergunta: 'Foi avaliada e registrada a decisão de existir ou não um bloqueador aberto? Se houver, qual impedimento continua pendente?',
    porQueBloqueia: 'Texto livre ambíguo pode inverter a leitura de “sem bloqueador”; o estado precisa de decisão explícita e justificativa.',
    exemplo: 'Registre a decisão e a justificativa reais no formulário; não copie um exemplo como evidência.',
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
  waivers?: { codigo: string; prazo: string }[],
  nos?: NexoObject[]
): {
  checks: GateCheck[]
  faltas: FaltaGate[]
  bloqueantesFaltando: string[]
  aprovado: boolean
} {
  const ev = avaliarGate(objeto, waivers, gateId, nos)
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

// G0 DINAMICO (puro/deterministico: sem DOM, sem Date, sem Math.random)
// Extracao em tempo real de respostas G0 a partir de texto livre.

const STOPWORDS_G0 = new Set([
  'para', 'com', 'uma', 'esse', 'essa', 'este', 'esta', 'isso', 'isto',
  'eles', 'elas', 'nosso', 'nossa', 'seus', 'suas', 'meu', 'minha',
  'como', 'mais', 'menos', 'muito', 'quando', 'onde', 'qual', 'quais',
  'entre', 'sobre', 'depois', 'antes', 'todos', 'todas', 'desse'
])

function normalizarEspacos(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function primeiraSentenca(texto: string): string {
  const partes = texto.split(/[.?!;\n]+/).map((s) => s.trim()).filter((s) => s.length > 0)
  return partes.length > 0 ? partes[0] : ''
}

function capturarPadroes(sentencas: string[], padroes: RegExp[]): string {
  for (const sent of sentencas) {
    const low = sent.toLowerCase()
    for (const rx of padroes) {
      const m = low.match(rx)
      if (m && m[1]) {
        const v = normalizarEspacos(m[1]).replace(/[.]+$/, '')
        if (v.length >= 2) return v.slice(0, 200)
      }
    }
  }
  return ''
}

function capitalizar(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Extrai valores G0 de texto livre sem codigo formal. */
export function extrairRespostasG0DoTexto(texto: string): Record<string, string> {
  const out: Record<string, string> = {}
  const limpo = normalizarEspacos(texto ?? '')
  if (!limpo) return out
  const sentencas = limpo.split(/[.?!;\n]+/).map((s) => s.trim()).filter((s) => s.length > 0)
  const lowers = sentencas.map((s) => s.toLowerCase())

  const problema = capturarPadroes(sentencas, [
    /quero (?:um |uma |criar |fazer |montar )?app de (.+)/,
    /quero (.+)/,
    /preciso (?:de )?(.+)/,
    /problema (?:é|:)?(.+)/,
    /(?:a )?dor (?:é|:)?(.+)/,
    /dificuldade (?:é|de|:)?(.+)/,
    /oportunidade (?:é|:)?(.+)/
  ])
  if (problema) {
    out['problema'] = problema.slice(0, 200)
    out['descricao'] = problema.slice(0, 200)
  } else {
    const fb = primeiraSentenca(limpo)
    if (fb.length >= 20) {
      out['problema'] = fb.slice(0, 200)
      out['descricao'] = fb.slice(0, 200)
    }
  }

  const personas = capturarPadroes(sentencas, [
    /meu p[uú]blico (?:alvo )?(?:é|:)?(.+)/,
    /p[uú]blico (?:alvo )?(?:é|:)?(.+)/,
    /persona (?:é|:)?(.+)/,
    /usu[aá]rios? (?:s[aã]o|é|:)?(.+)/,
    /clientes? (?:s[aã]o|é|:)?(.+)/,
    /para ([a-zà-ú ]{3,80})/
  ])
  if (personas) out['personas'] = personas.slice(0, 120)
  else {
    const idx = lowers.findIndex((s) => s.includes('lojista') || s.includes('varej') || s.includes('cliente') || s.includes('usuário') || s.includes('usuario'))
    if (idx >= 0) out['personas'] = sentencas[idx].slice(0, 120)
  }

  const objetivo = capturarPadroes(sentencas, [
    /meta (?:é|:)?(.+)/,
    /objetivo (?:é|:)?(.+)/,
    /quero alcan[cç]ar (.+)/,
    /espero (.+)/,
    /hip[oó]tese (?:é|:)?(.+)/
  ])
  if (objetivo) out['objetivo'] = objetivo.slice(0, 200)

  const sentKpi = sentencas.find((s) => /%/.test(s) || /(meta|kpi|convers[aã]o|adoc[aã]o|aumentar|reduzir).*\d+/.test(s.toLowerCase()))
  if (sentKpi) out['kpis'] = sentKpi.slice(0, 200)

  const owner = capturarPadroes(sentencas, [
    /(?:sou (?:o |a )?)(.+)/,
    /respons[aá]vel (?:é|:)?(.+)/,
    /owner (?:é|:)?(.+)/,
    /sponsor (?:é|:)?(.+)/,
    /quem cuida (?:é|:)?(.+)/
  ])
  if (owner) out['owner'] = owner.slice(0, 60)

  const escIn = capturarPadroes(sentencas, [
    /(?:o )?escopo.*inclui (.+)/,
    /inclui(?:r)? (.+)/,
    /precisa ter (.+)/,
    /dentro (?:do escopo )?(.+)/
  ])
  if (escIn) out['escopo_in'] = escIn.slice(0, 200)

  const escOut = capturarPadroes(sentencas, [
    /n[aã]o inclui (.+)/,
    /fora (?:do escopo )?(?:fica )?:?(.+)/,
    /exceto (.+)/,
    /n[aã]o quero (.+)/
  ])
  if (escOut) out['escopo_out'] = escOut.slice(0, 200)

  const risco = capturarPadroes(sentencas, [
    /risco (?:é|:|de)?(.+)/,
    /medo (?:é|de|:)?(.+)/,
    /preocupa[cç][aã]o (?:é|com|:)?(.+)/,
    /receio (?:é|de|:)?(.+)/,
    /pode (?:dar errado|falhar|quebrar)(.+)/
  ])
  if (risco) out['riscos'] = risco.slice(0, 200)

  return out
}

/** Deriva problema e objetivo candidatos de texto livre (frases curtas PT-BR). */
export function inferirProblemaObjetivo(texto: string, titulo?: string): { problema: string; objetivo: string } {
  const limpo = normalizarEspacos(texto ?? '')
  const tit = normalizarEspacos(titulo ?? '')
  let nucleo = ''
  const low = limpo.toLowerCase()
  const mQuero = low.match(/quero (?:um |uma |criar |fazer |montar )?(.+)/)
  const mApp = low.match(/app de (.+)/)
  const origem = mQuero && mQuero[1] ? mQuero[1] : mApp && mApp[1] ? mApp[1] : primeiraSentenca(limpo) || tit || limpo
  nucleo = normalizarEspacos(origem).replace(/[.]+$/, '').slice(0, 120)

  let problema = primeiraSentenca(limpo).slice(0, 140)
  if (problema.length < 20) {
    problema = (`Clientes enfrentam dificuldade com ${nucleo || tit || 'a operação atual'}.`).slice(0, 140)
  }
  let objetivo = (`Permitir ${nucleo || tit || 'a operação principal'} com rapidez e segurança.`).slice(0, 140)
  if (objetivo.length < 10) objetivo = 'Permitir a operação principal com rapidez e segurança.'
  return { problema: capitalizar(problema), objetivo: capitalizar(objetivo) }
}

function palavrasDominio(fonte: string): string[] {
  return (fonte.toLowerCase().match(/[a-zà-ú]{4,}/g) ?? []).filter((w) => !STOPWORDS_G0.has(w)).slice(0, 12)
}

/** Sugere nao-objetivos concretos derivados do dominio (max 5). */
export function sugerirNaoObjetivos(tituloDescricao: string): string[] {
  const low = (tituloDescricao ?? '').toLowerCase()
  const out: string[] = []
  const push = (s: string): void => {
    if (out.length >= 5) return
    if (!out.includes(s)) out.push(s)
  }
  if (/pix|pagamento|cobran|fatura/.test(low)) {
    push('estorno automático')
    push('suporte a cartão')
    push('parcelamento ou Pix crédito')
  }
  if (/app|mobile|checkout|web/.test(low)) {
    push('versão iOS nativa dedicada')
    push('modo offline completo')
  }
  if (/relat|dashboard|bi|concilia/.test(low)) {
    push('BI customizável por usuário')
    push('exportação de legado histórico')
  }
  if (/integra|legado|api|webhook/.test(low)) {
    push('integração com legado fora do padrão')
    push('migração de histórico antigo')
  }
  if (/boleto|cart[aã]o/.test(low)) push('suporte a boleto e cartão')
  push('customizações pontuais fora do padrão')
  push('suporte multilíngue')
  push('auditoria externa certificada')
  const dom = palavrasDominio(tituloDescricao)
  if (out.length < 3 && dom.length > 0) {
    push(`expansão para ${dom.slice(0, 2).join(' ')} em outros canais`)
  }
  return out.slice(0, 5)
}

/** Sugere riscos que o usuario nao ve, derivados do dominio (max 5). */
export function sugerirRiscos(tituloDescricao: string): string[] {
  const low = (tituloDescricao ?? '').toLowerCase()
  const out: string[] = []
  const push = (s: string): void => {
    if (out.length >= 5) return
    if (!out.includes(s)) out.push(s)
  }
  if (/pix|pagamento|psp|bacen|cobran/.test(low)) {
    push('Indisponibilidade do PSP ou Bacen em pico')
    push('Fraude com QR copiado ou webhook falso')
  }
  push('Exposição de dados pessoais (LGPD)')
  push('Baixa adoção pelos usuários no início')
  push('Latência alta em horário de pico')
  if (/legado|integra|api/.test(low)) push('Dependência de integração legada instável')
  else push('Mudança de regra do arranjo Pix')
  return out.slice(0, 5)
}

function listaCurta(itens: string[], max = 5): string {
  const vis = itens.slice(0, max)
  const resto = itens.length - vis.length
  return resto > 0 ? `${vis.join('; ')} (+${resto})` : vis.join('; ')
}

/** Monta patch parcial G0: so campos inferidos, sem zerar o resto. */
export function gerarPatchParcialG0(
  objeto: NexoObject,
  extraido: Record<string, string>
): { justificativa: string; mudancas: PatchMudanca[] } | null {
  const mudancas: PatchMudanca[] = []
  const rec = objeto as unknown as Record<string, unknown>
  const titulo = objeto.titulo || 'Objeto'

  const probAtual = String(rec['problema'] ?? objeto.descricao ?? '')
  if (extraido['problema'] && probAtual.trim().length < 20) {
    const v = extraido['problema'].slice(0, 200)
    mudancas.push({ campo: 'problema', de: String(rec['problema'] ?? ''), para: v })
    if (objeto.descricao !== v) mudancas.push({ campo: 'descricao', de: objeto.descricao, para: v })
  }
  const persAtual = Array.isArray(rec['personas']) ? (rec['personas'] as unknown[]) : []
  const atorAtual = String(rec['ator'] ?? '').trim()
  if (extraido['personas'] && persAtual.length === 0 && !atorAtual) {
    mudancas.push({ campo: 'personas', de: JSON.stringify(persAtual), para: JSON.stringify([extraido['personas']]) })
  }
  const objAtual = String(rec['objetivo'] ?? '').trim()
  if (extraido['objetivo'] && objAtual.length < 10) {
    mudancas.push({ campo: 'objetivo', de: objAtual, para: extraido['objetivo'].slice(0, 200) })
  } else if (!extraido['objetivo'] && extraido['problema'] && objAtual.length < 10) {
    const inf = inferirProblemaObjetivo(extraido['problema'], titulo)
    mudancas.push({ campo: 'objetivo', de: objAtual, para: inf.objetivo })
  }
  const kpisAtual = Array.isArray(rec['kpis']) ? (rec['kpis'] as unknown[]) : []
  if (extraido['kpis'] && kpisAtual.length === 0) {
    const mNum = extraido['kpis'].match(/(\d+\s?%|\d+)/)
    const alvo = mNum && mNum[1] ? mNum[1].replace('%', '').trim() : '40'
    const novo = { nome: 'Meta relatada pelo usuário', unidade: '%', alvo, janela: '90d', responsavel: objeto.owner || 'u-pm' }
    mudancas.push({ campo: 'kpis', de: JSON.stringify(kpisAtual), para: JSON.stringify([...kpisAtual, novo], null, 2) })
  }
  if (extraido['owner'] && !(objeto.owner ?? '').trim()) {
    mudancas.push({ campo: 'owner', de: objeto.owner ?? '', para: extraido['owner'].slice(0, 60) })
  }
  const inAtual = Array.isArray(rec['escopo_in']) ? (rec['escopo_in'] as unknown[]) : []
  if (extraido['escopo_in'] && inAtual.length === 0) {
    mudancas.push({ campo: 'escopo_in', de: JSON.stringify(inAtual), para: JSON.stringify([...inAtual, extraido['escopo_in'].slice(0, 200)], null, 2) })
  }
  const outAtual = Array.isArray(rec['escopo_out']) ? (rec['escopo_out'] as unknown[]) : []
  if (extraido['escopo_out'] && outAtual.length === 0) {
    mudancas.push({ campo: 'escopo_out', de: JSON.stringify(outAtual), para: JSON.stringify([...outAtual, extraido['escopo_out'].slice(0, 200)], null, 2) })
  }
  const riscosAtual = Array.isArray(rec['riscos']) ? (rec['riscos'] as unknown[]) : []
  if (extraido['riscos'] && riscosAtual.length === 0) {
    mudancas.push({ campo: 'riscos', de: JSON.stringify(riscosAtual), para: JSON.stringify([...riscosAtual, extraido['riscos'].slice(0, 200)], null, 2) })
  }

  if (mudancas.length === 0) return null
  return { justificativa: `[IA Gate G0] Patch parcial com ${mudancas.length} campo(s) inferido(s) de texto livre`, mudancas }
}

const SUGESTAO_CLICAVEL_G0: Record<string, string> = {
  'ENQ-001': 'O problema é clientes demoram para pagar faturas fora do horário comercial',
  'ENQ-002': 'Meu público é pequenos varejistas no checkout web',
  'ENQ-003': 'A meta é aumentar a conversão em 15% em 4 semanas',
  'ENQ-004': 'O responsável é u-pm',
  'ENQ-005': 'Dentro: Pix cobrança imediata. Fora: Pix crédito parcelado',
  'ENQ-006': 'Risco: indisponibilidade do PSP com retry em fila'
}

/** Sugestão clicável F4 para um código de check (G0 do dicionário, demais do exemplo). */
export function gerarSugestaoG0(codigo: string, objeto?: NexoObject | null): string {
  const clicavel = SUGESTAO_CLICAVEL_G0[codigo]
  if (clicavel) return clicavel
  const dic = DICIONARIO_PERGUNTAS[codigo]
  const ex = typeof dic?.exemplo === 'string' ? dic.exemplo.trim() : ''
  if (ex !== '') return ex.slice(0, 160)
  void objeto
  return ''
}

/** Resposta G0 sucinta F4: max 8 linhas, 1 falta por vez + 1 sugestao clicavel, sem emoji, PT-BR. */
export function formatarRespostaG0Sucinta(
  objetoTitulo: string,
  falta: FaltaGate,
  restantes: number,
  _dicaExtra?: string
): string {
  const linhas: string[] = []
  linhas.push(`Gate G0 - falta 1 de ${restantes}: ${falta.codigo}.`)
  linhas.push(`Pergunta: ${falta.pergunta}`)
  linhas.push(`Por que bloqueia: ${falta.porQueBloqueia}`)
  linhas.push('Registre sua resposta no formulário tipado para revisar um diff. A conversa não altera o artefato.')
  linhas.push(`Objeto: ${objetoTitulo}`)
  return linhas.slice(0, 8).join('\n')
}

// Gerador determinístico de propostas de patch estruturadas
export function gerarPropostaPatch(
  objeto: NexoObject,
  codigoCheck: string,
  textoUsuario?: string
): { justificativa: string; mudancas: PatchMudanca[] } | null {
  // Nunca completa schemas com exemplos inventados. Patch só parte de JSON
  // explicitamente escrito pelo usuário; conversa livre fica como anotação.
  return parsearPatchExplicito(objeto, codigoCheck, textoUsuario ?? '')

  
}

const CAMPOS_PATCH_EXPLICITO: Record<string, string[]> = {
  'ENQ-001': ['problema'], 'EPC-001': ['problema'],
  'ENQ-002': ['personas'], 'ENQ-003': ['objetivo', 'kpis'], 'ENQ-004': ['owner'],
  'ENQ-005': ['escopo_in', 'escopo_out'], 'ENQ-006': ['riscos'],
  'EPC-002': ['kpis'], 'EPC-003': ['escopo_in', 'escopo_out'], 'EPC-004': ['objetivo'], 'EPC-005': ['riscos'],
  'FTR-001': ['ator', 'beneficio', 'descricao'], 'FTR-002': ['fluxo_feliz'], 'FTR-003': ['regras_ids'],
  'FTR-004': ['permissoes'], 'FTR-005': ['telas_estados'], 'FTR-006': ['integracoes'],
  'FTR-007': ['criterios_bdd'], 'FTR-008': ['alternativos'],
  'ARC-001': ['integracoes'], 'ARC-002': ['adr_id'], 'ARC-003': ['openapi'], 'ARC-004': ['persistencia'],
  'ARC-005': ['integracoes'], 'ARC-006': ['dado_pessoal'], 'ARC-007': ['nfrs'], 'ARC-008': ['seguranca'],
  'PBI-ACEITE': ['criterios_bdd'], 'PBI-ORIGEM': ['feature_id', 'owner'], 'PBI-ESCOPO': ['escopo_in', 'escopo_out'],
  'PBI-DEP': ['dependencias'], 'PBI-OWNER': ['owner'], 'PBI-TESTE': ['estrategia_teste'],
  'PBI-CONTRATO': ['contrato'], 'PBI-BLOQ': ['flag'], 'PBI-COND-COMPAT': ['contrato'],
  'PBI-COND-ROLLBACK': ['rollback'], 'PBI-COND-TELA': ['contrato'], 'PBI-COND-TESTE': ['estrategia_teste'],
  'DON-001': ['evidencia'], 'DON-002': ['evidencia'], 'DON-003': ['evidencia'],
  'DON-004': ['evidencia'], 'DON-005': ['evidencia'], 'DON-006': ['evidencia']
}

function valorSemPlaceholder(valor: unknown): boolean {
  if (typeof valor === 'string') return valor.trim().length > 0 && !/^(a definir|não informado|nao informado|tbd|todo|placeholder|n\/a|-)$/i.test(valor.trim())
  if (Array.isArray(valor)) return valor.length > 0 && valor.every(valorSemPlaceholder)
  if (valor && typeof valor === 'object') {
    const campos = Object.values(valor as Record<string, unknown>)
    return campos.length > 0 && campos.every(valorSemPlaceholder)
  }
  return typeof valor === 'number' ? Number.isFinite(valor) : typeof valor === 'boolean'
}

function parsearPatchExplicito(objeto: NexoObject, codigo: string, texto: string): { justificativa: string; mudancas: PatchMudanca[] } | null {
  const permitidos = CAMPOS_PATCH_EXPLICITO[codigo]
  if (!permitidos || !texto.trim().startsWith('{')) return null
  let payload: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(texto)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    payload = parsed as Record<string, unknown>
  } catch { return null }
  const keys = Object.keys(payload).sort()
  if (keys.length !== permitidos.length || keys.some((k) => !permitidos.includes(k))) return null
  const atual = objeto as unknown as Record<string, unknown>
  const mudancas: PatchMudanca[] = []
  for (const campo of permitidos) {
    const novo = payload[campo]
    if (!valorSemPlaceholder(novo)) return null
    if (['problema'].includes(campo) && (typeof novo !== 'string' || novo.trim().length < 30)) return null
    if (campo === 'objetivo' && (typeof novo !== 'string' || novo.trim().length < 10)) return null
    if (campo === 'fluxo_feliz' && (typeof novo !== 'string' || novo.trim().length < 10)) return null
    if (campo === 'kpis' && (!Array.isArray(novo) || !novo.every((k) => {
      if (!k || typeof k !== 'object') return false
      const row = k as Record<string, unknown>
      return ['nome', 'unidade', 'alvo', 'janela', 'responsavel'].every((f) => typeof row[f] === 'string' && valorSemPlaceholder(row[f]))
    }))) return null
    if (['escopo_in', 'escopo_out', 'personas', 'regras_ids', 'alternativos', 'dependencias'].includes(campo) && (!Array.isArray(novo) || !novo.every((x) => typeof x === 'string' && valorSemPlaceholder(x)))) return null
    mudancas.push({ campo, de: JSON.stringify(atual[campo] ?? ''), para: JSON.stringify(novo) })
  }
  return { justificativa: `Proposta baseada somente nos valores fornecidos para ${codigo}; requer revisão humana e não comprova evidência externa.`, mudancas }
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

  // 1b. G0 DINAMICO + F4 SUCINTO (intercepta todo gateId G0: max 8 linhas,
  // 1 falta por vez + 1 sugestao clicavel, sem emoji, PT-BR, patch parcial).
  if (gateId === 'G0') {
    const extraido = extrairRespostasG0DoTexto(mensagem)
    const ehStatus =
      msg.includes('o que falta') ||
      msg.includes('pendencias') ||
      msg.includes('pendências') ||
      msg.includes('status') ||
      msg.includes('ajuda') ||
      msg.includes('como aprovar')
    const dicaPara = (codigo: string): string | undefined => {
      if (codigo === 'ENQ-005') return `Não-objetivos: ${listaCurta(sugerirNaoObjetivos(`${objeto.titulo} ${objeto.descricao ?? ''}`))}`
      if (codigo === 'ENQ-006') return `Riscos: ${listaCurta(sugerirRiscos(`${objeto.titulo} ${objeto.descricao ?? ''}`))}`
      if (codigo === 'ENQ-003') return inferirProblemaObjetivo(mensagem || objeto.titulo, objeto.titulo).objetivo
      if (codigo === 'ENQ-001') return inferirProblemaObjetivo(mensagem || objeto.titulo, objeto.titulo).problema
      return undefined
    }
    if (ehStatus) {
      if (diag.aprovado) {
        const linhas = [
          `Gate G0 - "${objeto.titulo}": checks OK.`,
          gov.sequenciaOk ? 'Sequência liberada.' : `Sequência bloqueada: ${gov.motivoSequencia}`.slice(0, 160),
          gov.papelOk ? 'Papel apto a aprovar.' : `Papel atual sem permissão. Exige: ${gov.aprovadoresExigidos.join(', ')}.`,
          'Solicite a aprovação da baseline.'
        ]
        return { texto: linhas.slice(0, 8).join('\n') }
      }
      const primeira = diag.faltas[0]
      return { texto: formatarRespostaG0Sucinta(objeto.titulo, primeira, diag.faltas.length, dicaPara(primeira.codigo)) }
    }
    let codigoAlvo: string | null = null
    if (msg.includes('risco') || msg.includes('suposi') || msg.includes('medo') || msg.includes('receio') || msg.includes('lgpd') || msg.includes('fraude')) codigoAlvo = 'ENQ-006'
    else if (msg.includes('nao-objetivo') || msg.includes('não-objetivo') || msg.includes('nao objetivo') || msg.includes('fora') || msg.includes('escopo') || msg.includes('restri')) codigoAlvo = 'ENQ-005'
    else if (msg.includes('publico') || msg.includes('público') || msg.includes('persona') || msg.includes('ator') || msg.includes('cliente') || msg.includes('usuário') || msg.includes('usuario')) codigoAlvo = 'ENQ-002'
    else if (msg.includes('hipotese') || msg.includes('hipótese') || msg.includes('meta') || msg.includes('kpi') || msg.includes('objetivo') || msg.includes('convers')) codigoAlvo = 'ENQ-003'
    else if (msg.includes('responsavel') || msg.includes('responsável') || msg.includes('owner') || msg.includes('sponsor') || msg.includes('sou ')) codigoAlvo = 'ENQ-004'
    else if (msg.includes('problema') || msg.includes('dor') || msg.includes('quero') || msg.includes('app de') || msg.includes('preciso') || msg.includes('ideia')) codigoAlvo = 'ENQ-001'
    else if (diag.faltas.length > 0) codigoAlvo = diag.faltas[0].codigo
    if (codigoAlvo) {
      const prop = gerarPropostaPatch(objeto, codigoAlvo, mensagem)
      const parcial = gerarPatchParcialG0(objeto, extraido)
      const vistos = new Set((prop?.mudancas ?? []).map((mm: PatchMudanca) => mm.campo))
      const extras = (parcial?.mudancas ?? []).filter((mm: PatchMudanca) => !vistos.has(mm.campo))
      const mudancas = [...(prop?.mudancas ?? []), ...extras]
      if (mudancas.length > 0) {
        const falta = diag.faltas.find((f) => f.codigo === codigoAlvo)
        const clicavel = (codigoAlvo && SUGESTAO_CLICAVEL_G0[codigoAlvo]) || 'O problema é clientes demoram para pagar faturas fora do horário comercial'
        const linhas = [
          `Gate G0 - proposta para ${codigoAlvo}.`,
          `Campos: ${mudancas.map((mm: PatchMudanca) => mm.campo).join(', ').slice(0, 120)}.`,
          falta ? `Falta atual: ${falta.pergunta}`.slice(0, 160) : 'Avanco no enquadramento.',
          `Responda com: "${clicavel}"`,
          `Objeto: ${objeto.titulo}`,
          'Aceite o patch para aplicar.'
        ]
        return {
          texto: linhas.slice(0, 8).join('\n'),
          propostaPatch: {
            alvoId: objeto.id,
            justificativa: prop?.justificativa ?? parcial?.justificativa ?? `[IA Gate G0] Patch parcial para ${codigoAlvo}`,
            mudancas
          },
          checksAfetados: [codigoAlvo]
        }
      }
    }
    if (diag.faltas.length > 0) {
      const proxima = diag.faltas[0]
      return { texto: formatarRespostaG0Sucinta(objeto.titulo, proxima, diag.faltas.length, dicaPara(proxima.codigo)) }
    }
    return { texto: `Gate G0 - "${objeto.titulo}": checks OK.\nSolicite a aprovacao da baseline.` }
  }

  // 1. Perguntas de status / o que falta / governança
  // NOTA ANTI-MOCK (dono): este ramo só responde DIAGNÓSTICO (checks reais do
  // avaliarGate). A condução pergunta-a-pergunta é feita pelo LLM real via
  // executarSkill (GateAiSession sempre chama o LLM primeiro); este fallback só
  // aparece quando o servidor está inalcançável — e mesmo assim SEM menu de
  // comandos, só diagnóstico + próxima pergunta (ver fallback no fim do arquivo).
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

  // 7. Pedidos de Enquadramento (G0 sucinto F4: max 8 linhas, sem emoji, 1 sugestao)
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
        texto: `Gate G0 - proposta para ENQ-001.\nCampos: ${prop.mudancas.map((mm: PatchMudanca) => mm.campo).join(', ').slice(0, 120)}.\nResponda com: "${SUGESTAO_CLICAVEL_G0['ENQ-001']}"\nObjeto: ${objeto.titulo}\nAceite o patch para aplicar.`,
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

  // Fallback: proxima falta (G0 tratado acima em formato sucinto F4).
  if (diag.faltas.length > 0) {
    const proxima = diag.faltas[0]
    return {
      texto: `Falta ${proxima.codigo} em "${objeto.titulo}".\nPergunta: ${proxima.pergunta}\nPor que bloqueia: ${proxima.porQueBloqueia}\nResponda com: "${proxima.exemplo}"\nObjeto: ${objeto.titulo}\nResponda em texto livre que eu registro a pendência.`
    }
  }
  return {
    texto: `Gate ${gateId} - "${objeto.titulo}": checks OK.\nSolicite a aprovacao da baseline.`
  }
}

// Wizard (1 falta por vez): reaproveita diagnosticarFaltasGate, sem alterar
// o bloco G0 atual nem processarMensagemGate. Max 8 linhas, 1 falta por vez,
// zero emoji, PT-BR.
export function processarMensagemWizard(
  mensagem: string,
  contexto: {
    objeto: NexoObject | null
    gateId: GateId
    user: User | null
    gates: { id: GateId; status: string; baselineVersao?: number | null }[]
    waivers?: { codigo: string; prazo: string }[]
  }
): GateChatResult {
  void mensagem
  const { objeto, gateId, user, gates, waivers } = contexto

  if (!objeto) {
    return {
      texto: `Nenhum objeto selecionado no Gate ${gateId}. Selecione um objeto na lista para iniciar o wizard.`
    }
  }

  const diag = diagnosticarFaltasGate(objeto, gateId, waivers)

  if (diag.aprovado) {
    const gov = obterGovernancaGate(gateId, user, objeto, gates)
    const linhas = [
      `Gate ${gateId} - "${objeto.titulo}": checks OK.`,
      gov.sequenciaOk ? 'Sequencia liberada.' : `Sequencia bloqueada: ${gov.motivoSequencia}`.slice(0, 160),
      gov.papelOk ? 'Papel apto a aprovar.' : `Papel atual sem permissao. Exige: ${gov.aprovadoresExigidos.join(', ')}.`,
      'Solicite a aprovacao da baseline.'
    ]
    return { texto: linhas.slice(0, 4).join('\n') }
  }

  const primeira = diag.faltas[0]
  if (!primeira) {
    return { texto: `Gate ${gateId} - "${objeto.titulo}": checks OK.\nSolicite a aprovacao da baseline.` }
  }

  if (gateId === 'G0') {
    return { texto: formatarRespostaG0Sucinta(objeto.titulo, primeira, diag.faltas.length) }
  }

  const linhas = [
    `Gate ${gateId} - falta 1 de ${diag.faltas.length}: [${primeira.codigo}].`,
    `Pergunta: ${primeira.pergunta}`,
    `Por que bloqueia: ${primeira.porQueBloqueia}`,
    'Use o formulário tipado para propor uma resposta como diff revisável. A conversa não altera o artefato.',
    `Objeto: ${objeto.titulo}`,
    `Restam ${diag.faltas.length} pendências.`
  ]
  return { texto: linhas.slice(0, 8).join('\n') }
}

// Wizard de criacao CRIACAOIA-1 (tela de novo projeto): 5 PASSOS SEM passo
// usuario (responsavel sempre = usuario logado): problema, objetivo,
// usuarios, escopo, metrica. Uma pergunta por vez. Reaproveita
// diagnosticarFaltasGate + inferencia G0DIN, sem alterar
// processarMensagemWizard nem o bloco G0. Max 8 linhas, zero emoji, PT-BR.
export interface PassoWizardCriacao {
  id: 'problema' | 'objetivo' | 'usuarios' | 'escopo' | 'metrica'
  pergunta: string
  ajuda: string
}

export const PASSOS_WIZARD_CRIACAO: PassoWizardCriacao[] = [
  {
    id: 'problema',
    pergunta: 'Qual problema o projeto resolve?',
    ajuda: 'Descreva a dor com ao menos 10 caracteres.'
  },
  {
    id: 'objetivo',
    pergunta: 'Qual objetivo mensuravel esperado?',
    ajuda: 'Ex.: aumentar a conversao em 15% em 4 semanas.'
  },
  {
    id: 'usuarios',
    pergunta: 'Quem sao os usuarios do projeto?',
    ajuda: 'Ex.: pequenos varejistas no checkout web.'
  },
  {
    id: 'escopo',
    pergunta: 'O que entra e o que fica fora do escopo?',
    ajuda: 'Opcional. Ex.: Dentro: Pix imediato. Fora: Pix credito.'
  },
  {
    id: 'metrica',
    pergunta: 'Qual metrica mede o sucesso?',
    ajuda: 'Ex.: Adoção inicial, conversão, tempo de liquidação.'
  }
]

function proximoPassoCriacao(passoId: PassoWizardCriacao['id']): PassoWizardCriacao | null {
  const idx = PASSOS_WIZARD_CRIACAO.findIndex((p) => p.id === passoId)
  if (idx < 0 || idx + 1 >= PASSOS_WIZARD_CRIACAO.length) return null
  return PASSOS_WIZARD_CRIACAO[idx + 1]
}

function resumirWizard(s: string, max = 120): string {
  return normalizarEspacos(s).slice(0, max)
}

/** Valida um passo do wizard de criacao e responde em ate 8 linhas PT-BR sem emoji. */
export function wizardCriacao(
  mensagem: string,
  passoId: PassoWizardCriacao['id'],
  objeto: NexoObject | null,
  gateId: GateId
): GateChatResult {
  const texto = normalizarEspacos(mensagem ?? '')
  const passo = PASSOS_WIZARD_CRIACAO.find((p) => p.id === passoId) ?? null
  const proximo = proximoPassoCriacao(passoId)

  // Reaproveita o diagnostico do gate quando ha objeto (nao bloqueia o wizard).
  let pendencias = 0
  if (objeto) {
    const diag = diagnosticarFaltasGate(objeto, gateId)
    pendencias = diag.faltas.length
  }

  // Validacao do passo: problema/objetivo/usuarios/metrica min 10;
  // escopo opcional. Sem passo usuario: responsavel sempre = usuario logado.
  if (passoId === 'escopo') {
    if (!texto) {
      const linhas = [
        'Anotei: escopo ficara para revisao.',
        proximo ? `Proxima: ${proximo.pergunta}` : 'Wizard concluido, revise e crie o projeto.',
        proximo ? `Ajuda: ${proximo.ajuda}` : 'Confira os 5 pontos na tela antes de criar.'
      ]
      return { texto: linhas.slice(0, 8).join('\n') }
    }
  } else {
    if (texto.length < 10) {
      const linhas = [
        'Resposta curta demais: use ao menos 10 caracteres.',
        `Pergunta: ${passo?.pergunta ?? 'Detalhe um pouco mais.'}`,
        `Ajuda: ${passo?.ajuda ?? 'Descreva com ao menos 10 caracteres.'}`,
        'Responda em texto livre para avancar.'
      ]
      return { texto: linhas.slice(0, 8).join('\n') }
    }
  }

  // Enriquece a confirmacao com a inferencia G0DIN quando houver texto.
  // Sem passo usuario: responsavel sempre = usuario logado (atorId na criacao).
  const extraido = extrairRespostasG0DoTexto(texto)
  const inferido = inferirProblemaObjetivo(texto, objeto?.titulo ?? '')
  let detalhe = resumirWizard(texto)
  if (passoId === 'problema') {
    detalhe = resumirWizard(extraido['problema'] || inferido.problema || texto)
  } else if (passoId === 'objetivo') {
    detalhe = resumirWizard(extraido['objetivo'] || inferido.objetivo || texto)
  } else if (passoId === 'usuarios') {
    detalhe = resumirWizard(extraido['personas'] || texto, 120)
  } else if (passoId === 'escopo') {
    const dentro = extraido['escopo_in'] ? `Dentro: ${extraido['escopo_in']}. ` : ''
    const fora = extraido['escopo_out'] ? `Fora: ${extraido['escopo_out']}.` : ''
    const combinado = resumirWizard(`${dentro}${fora}`.trim() || texto)
    if (combinado) detalhe = combinado
  }
  void pendencias

  const linhas: string[] = []
  linhas.push(`Anotei ${passoId}: "${detalhe}".`)
  if (proximo) {
    linhas.push(`Proxima: ${proximo.pergunta}`)
    linhas.push(`Ajuda: ${proximo.ajuda}`)
  } else {
    linhas.push('Wizard concluido, revise e crie o projeto.')
    linhas.push('Confira os 5 pontos na tela antes de criar.')
  }
  return { texto: linhas.slice(0, 8).join('\n') }
}

// Wizard de criacao iterativo: ingestao autonoma a partir de infos + wiki/dados.
// Nao altera PASSOS_WIZARD_CRIACAO, wizardCriacao, processarMensagemWizard nem o bloco G0.
// Junta infos + wikiDados (+ mensagem atual), analisa via extrairRespostasG0DoTexto +
// inferirProblemaObjetivo + diagnosticarFaltasGate (quando ha objeto, sem bloquear).
// Responde em ate 8 linhas PT-BR sem emoji, como pre-preenchido inferido.
export function wizardCriacaoIterativo(
  mensagem: string,
  infos: string,
  wikiDados: string,
  objeto: NexoObject | null,
  gateId: GateId
): GateChatResult {
  const combinado = normalizarEspacos(`${infos ?? ''} ${mensagem ?? ''} ${wikiDados ?? ''}`)

  if (!combinado) {
    return {
      texto: 'Nada anotado ainda: informe o resumo e os dados wiki para eu montar o pre-preenchido.'
    }
  }

  const extraido = extrairRespostasG0DoTexto(combinado)
  const inferido = inferirProblemaObjetivo(combinado, objeto?.titulo ?? '')
  const problema = resumirWizard(extraido['problema'] || inferido.problema || combinado, 120)
  const objetivo = resumirWizard(extraido['objetivo'] || inferido.objetivo || '', 120)
  const publico = resumirWizard(extraido['personas'] || '', 120)
  const dentro = resumirWizard(extraido['escopo_in'] || '', 80)
  const fora = resumirWizard(extraido['escopo_out'] || '', 80)
  const restricoes = fora ? `Fora: ${fora}.` : dentro ? `Dentro: ${dentro}.` : ''
  const riscos = resumirWizard(extraido['riscos'] || '', 120)

  let pendencias = 0
  let primeiraFalta: FaltaGate | null = null
  if (objeto) {
    const diag = diagnosticarFaltasGate(objeto, gateId)
    pendencias = diag.faltas.length
    primeiraFalta = diag.faltas[0] ?? null
  }

  const faltantes: string[] = []
  if (!problema) faltantes.push('problema')
  if (!objetivo) faltantes.push('objetivo')
  if (!publico) faltantes.push('publico')
  if (!restricoes) faltantes.push('restricoes')
  if (!riscos) faltantes.push('riscos')

  const linhas: string[] = []
  linhas.push(`Anotei pre-preenchido: problema "${problema}"; objetivo "${objetivo || 'a definir'}".`)
  linhas.push(`Publico: ${publico || 'nao informado'}.`)
  linhas.push(`Restricoes: ${restricoes || 'a definir'}.`)
  linhas.push(`Riscos: ${riscos || 'a mapear'}.`)
  if (primeiraFalta) {
    linhas.push(`Falta: ${primeiraFalta.codigo} em "${objeto?.titulo ?? 'objeto'}".`)
    linhas.push(`Sugestao: ${resumirWizard(primeiraFalta.exemplo, 120)}`)
  } else if (faltantes.length > 0) {
    linhas.push(`Falta: ${faltantes.join(', ')}.`)
    linhas.push(`Sugestao: informe ${faltantes[0]} em texto livre para completar o pre-preenchido.`)
  } else {
    linhas.push('Falta: nenhuma, pre-preenchido completo para revisao.')
    linhas.push('Sugestao: revise os 5 pontos na tela e crie o projeto.')
  }
  if (pendencias > 1) {
    linhas.push(`Restam ${pendencias} pendencias no Gate ${gateId}.`)
  }
  return { texto: linhas.slice(0, 8).join('\n') }
}
