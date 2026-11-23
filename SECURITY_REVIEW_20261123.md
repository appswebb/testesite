# entre. — auditoria de segurança e estabilidade (23/11/2026)

## Corrigido nesta alteração
1. **Erro de permissão em `entre_support_tickets`**: política de leitura somente pelo proprietário, com `GRANT SELECT` restrito a `authenticated`. Também resolve a consulta da política de upload de comprovantes, sem tornar os chamados públicos.
2. **Relato sem imagem**: RPC `entre_support_submit` aceita `_paths=[]`, valida a propriedade do chamado e limita a três anexos quando utilizados. Chamados enviados pelo RPC não podem ser reabertos por outro usuário.
3. **Erro de permissão em `entre_presence` ao acessar avatares**: as políticas Storage dependentes de várias tabelas privadas foram substituídas por uma verificação única `entre_avatar_visible_for()`, restrita a usuário autenticado, com checagem de bloqueio, suspensão, conexões e visibilidade permitida. Não foram concedidas permissões de leitura direta sobre moderação ou presença.
4. **Cidade/estado privado**: `entre_member_locations` mantém RLS habilitado e não tem `GRANT SELECT` para `authenticated` ou `anon`. Apenas RPCs restritos à identidade acessam os dados, e latitude/longitude não são armazenadas.
5. **Busca recíproca e modos**: `entre_find_mode_location` valida o modo chat/vídeo de ambas as partes, aplica preferências regionais recíprocas e impede acesso sem conta; as rotas legadas `entre_find` e `entre_find_mode` passam pela mesma proteção.
6. **Pagamento**: clique duplicado bloqueado; retorno `?premium=return` não concede Premium. O webhook existente só habilita Premium após confirmação junto ao Mercado Pago, não por parâmetros do navegador.

## Verificações executadas
- Fluxo de abertura de chamado **sem anexos** sob papel `authenticated`, em transação com `ROLLBACK`: sucesso.
- Leitura de tickets sob papel `authenticated`: só os próprios chamados visíveis.
- Testes de armazenamento de avatars e evidências como usuário autenticado: sem erros de permissão.
- Gravação/leitura de cidade e estado usando JWT simulado em transação com `ROLLBACK`: sucesso.
- Auditoria estática: todas as 18 funções `entre_admin_*` conferidas invocam `entre_admin_check`.
- Testes de regressão e publicação do GitHub Actions são executados na pipeline do repositório.

## Pendências e riscos que não devem ser ignorados
- O verificador Supabase assinala funções `SECURITY DEFINER` acessíveis a contas autenticadas. Isso **não prova uma vulnerabilidade**: as funções RPC necessitam de privilégios para operar sobre tabelas com RLS, mas ainda demandam revisão individual e testes adversariais. A função pública `entre_public_settings()` retorna apenas preferências gerais para exibir o site, logo seu acesso anônimo foi preservado.
- 21 tabelas privadas têm RLS sem políticas diretas; isso é intencional nos fluxos que usam RPC, mas deve ser mantido sob revisão.
- **Leaked password protection** ainda precisa ser habilitada em Supabase → Authentication → Security and Protection, se disponível no plano; alerta do advisor não foi alterado.
- A detecção de município depende de Geolocation API com permissão do usuário e de um serviço externo OpenStreetMap/Nominatim. Em caso de falha, o usuário pode selecionar o local manualmente. Para alta escala é necessário provedor de geocodificação com SLA.
- As rotas de pagamento real não estão liberadas: preço mensal `NULL`, checkout `disabled`. Não ativar até validar conta Mercado Pago, credenciais privadas, webhooks, recorrência, cancelamento e estornos.
- Testes automatizados reduzem riscos, mas não substituem auditoria completa de pentest, carga, privacidade, pagamentos e aparelhos reais.

## Documentação oficial
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/database-linter
- https://supabase.com/docs/guides/auth/password-security
