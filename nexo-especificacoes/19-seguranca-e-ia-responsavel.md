# 19 — Segurança e IA responsável

## Controles mínimos

- Microsoft Entra ID com OIDC/OAuth 2.0, PKCE e validação de JWT.
- RBAC por projeto e ABAC para classificação/dados sensíveis.
- Criptografia em trânsito e repouso; chaves no Key Vault.
- Isolamento de tenant e workspace efêmero para geração.
- Segredos redigidos antes de RAG/prompt; allowlist de conectores.
- Auditoria de acesso, prompt, fonte, modelo, decisão e publicação.

## Política de IA

- Toda saída exibe skill/modelo/versão e fontes consultadas quando possível.
- Dados de projeto só vão a modelos aprovados pela organização.
- Conteúdo sensível exige classificação e política correspondente.
- Merge, mudança de contrato, ação produtiva e exceção de segurança exigem revisão humana.

## Testes

Teste de isolamento, autorização, vazamento por RAG, prompt injection, auditoria e redaction fazem parte do Gate 5 da própria plataforma.

## Qualidade e observabilidade

RAG DEVE filtrar por tenant, projeto, classificação e permissão antes da busca por similaridade. Cada saída de IA registra fontes, modelo e versão de skill. Instruções encontradas em conteúdo recuperado são tratadas como dados, nunca como comandos.

Releases exigem evidências funcionais BDD, SAST/dependências/autorização, testes de confiabilidade, acessibilidade, logs/métricas/trace e rastreabilidade objetivo → aceite → teste → código. SLOs sugeridos: 99,9% de disponibilidade de leitura do Canvas e 95% das consultas de subgrafo em até 2 segundos.
