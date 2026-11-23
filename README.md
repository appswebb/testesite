# entre. — Uma pessoa. Cinco minutos. Uma escolha dos dois.

Um site de conexões privadas **1 a 1**, reconstruído do zero. O nome do repositório (`testesite`) não é a marca do site.

## URL

https://appswebb.github.io/testesite/

## O que existe

- Homepage pública, editorial, responsiva e animada — não é uma página de documentação.
- Cadastro com e-mail/senha (confirmar e-mail se o provedor exigir) e onboarding 18+.
- Login, logout, recuperação da sessão, perfil editável e preferências de gênero.
- Fila de busca real e recíproca, transação atômica para encontrar parceiro compatível.
- Conversa privada de 5 minutos e cronômetro validado pelo servidor.
- Cada participante vota separadamente: **sim + sim** salva a conversa permanente; caso contrário encerra a sessão temporária.
- Mensagens persistentes e atualizações em tempo real via Supabase Realtime, com checagem periódica de sincronização.
- Aba de conversas permanentes, bloqueio, configurações e exclusão definitiva dos dados pertencentes ao aplicativo.
- Esquema próprio com tabelas `entre_*` e políticas RLS (sem modificar as tabelas existentes).

## Arquitetura

- `index.html`, `styles.css`, `app.js`, `favicon.svg`: frontend estático para GitHub Pages.
- `docs/`: cópia de produção para a publicação do GitHub Pages pelo workflow atual.
- Backend: Supabase Auth + PostgreSQL RLS + Realtime + funções RPC server-side.
- `DESIGN_REFERENCES.md`: referências externas e regras de microinteração.

**GitHub Pages não executa backend.** A autenticação, a fila e as mensagens dependem da instância Supabase configurada no frontend. Não existe modo de chat fingido nem pessoas de mentira. Se ninguém compatível estiver procurando, a busca vai continuar esperando.

## Privacidade e limites importantes

1. Esta versão usa **um projeto Supabase compartilhado com outro aplicativo**, mas mantém os dados próprios em tabelas isoladas `entre_*`. O gerenciamento de identidade (`auth.users`) continua compartilhado. Por isso, **Excluir meus dados** apaga o perfil, as mensagens e os matches dentro do `entre.`, mas não elimina a identidade global de autenticação. Antes de um lançamento público, migre para um projeto Supabase dedicado para permitir exclusão completa do usuário sem afetar outros aplicativos.
2. Não há verificação independente de idade: somente autodeclaração de 18+.
3. Não há moderação humana, detecção de abuso, proteção anti-bot/anti-spam ou criptografia ponta a ponta. Não publique dados sensíveis neste MVP.
4. Se o provedor Supabase exigir confirmação por e-mail, o novo usuário deverá confirmar o e-mail antes do primeiro login. Se o cadastro estiver pendente, conclua o perfil após entrar.
5. Não são criados usuários ou mensagens falsos para aparentar atividade.
6. A busca considera preferências de ambos e evita usuários bloqueados. A presença na fila tem validade curta, renovada pelo navegador a cada 3,5s; conexão perdida pode ocasionar nova busca.
7. As mensagens de encontros não correspondidos são descartadas quando a sessão for encerrada no backend. Conversas de match mútuo permanecem salvas até exclusão dos dados.

## Executar

Qualquer servidor estático basta para visualizar o frontend, mas login/chat exigem conexão à instância Supabase configurada em `app.js`.

```bash
python -m http.server 8000
```

Acesse http://localhost:8000/. Para publicar, GitHub Actions envia a pasta `docs/` ao GitHub Pages.

## Testes

`node --check app.js` verifica sintaxe; testes de banco e RLS devem ser repetidos em um projeto de teste isolado com contas criadas exclusivamente para esse fim. O sistema real de matchmaking não pode ser validado apenas com um navegador sem duas contas distintas.

## Marca

**entre.** — fundo quente `#f8f5ef`, tinta `#191b19`, coral `#f17e60`, acentos lima e lavanda, Space Grotesk + Instrument Serif, formas semicirculares em encontro, animações de espera com ondas concêntricas, respeitando `prefers-reduced-motion`.
