# 18 — Arquitetura da plataforma

## Componentes

1. **Vue 3 + TypeScript:** Canvas, painel de detalhe, colaboração e Design System.
2. **Rails API:** domínio, workflows, permissões, versões e integrações.
3. **Banco relacional + grafo lógico:** objetos, relações, histórico e análise de impacto.
4. **Orquestrador de IA:** roteamento de skills, schemas, guardrails e filas.
5. **Conhecimento/RAG:** documentos aprovados, padrões corporativos, design system e repositórios permitidos.
6. **Sandbox de geração:** workspaces efêmeros, Git, lint, testes e scanners.
7. **Conectores:** Entra ID, Azure DevOps/GitHub, Boards/Jira, Figma e observabilidade.

## Interfaces críticas

- API de grafo e versionamento.
- API de conversa/propostas com schema validado.
- Webhook/eventos de alteração e cascata.
- API de exportação/importação de backlog.
- API de execução isolada de geração/validação.

## Decisão em aberto

Definir o sistema mestre de backlog: NEXO, Azure Boards ou Jira. A integração deve preservar IDs e links de rastreabilidade em ambos os sentidos.

## Comandos e eventos essenciais

| Comando | Resultado |
|---|---|
| `CreateObject` | cria rascunho |
| `ProposePatch` / `AcceptPatch` | cria/aplica diff em nova versão |
| `SubmitGate` / `ApproveGate` | executa checklist e cria baseline |
| `RequestImpact` / `AcceptImpactPlan` | calcula e agenda revisão/regeneração |
| `GenerateImplementation` | abre workspace isolado de geração |

Eventos: `ObjectVersionCreated`, `PatchProposed`, `GateApproved`, `ObjectMarkedStale`, `ImpactPlanCreated`, `GenerationStarted`, `GenerationValidated` e `SecurityExceptionGranted`.

Toda mutação usa idempotency key, retorna ID/versão/evento e aplica concorrência otimista por versão (`409` com diff em conflito). Consulta do Canvas é paginada por nível de zoom e não carrega o grafo completo.
