# entre. — Uma pessoa. Cinco minutos. Uma escolha dos dois.

Um site de conexões privadas **1 a 1**, reconstruído do zero. O nome do repositório (`testesite`) não é a marca do site.

## URL

https://appswebb.github.io/testesite/

## O que existe

- Homepage pública, editorial, responsiva e animada — não é uma página de documentação.
- Cadastro com Google OAuth exclusivamente e onboarding 18+, sem campos de senha.
- Login exclusivo pelo Google, logout, recuperação da sessão, perfil editável e preferências de gênero.
- Fila de busca real e recíproca, transação atômica para encontrar parceiro compatível.
- Conversa privada de 5 minutos e cronômetro validado pelo servidor.
- Cada participante vota separadamente: **sim + sim** salva a conversa permanente; caso contrário encerra a sessão temporária.
- Mensagens persistentes e atualizações em tempo real via Supabase Realtime, com checagem periódica de sincronização.
- Conversas permanentes com menu compacto para fixar, arquivar, organizar ou apagar apenas da própria conta. Mensagens apagadas não ficam legíveis para quem apagou, mas continuam disponíveis ao outro participante.
- Matchmaking não repete pares que já têm um follow aceito ou conversa permanente, mesmo que o chat esteja oculto.
- Encontros temporários sem match não viram contatos nem ficam em uma seção de conexões; conversas permanentes só surgem após match ou aceite de seguir.
- Avisos oficiais com respostas privadas à administração e enquetes com voto único obrigatório, ambos por 24 horas e com notificações para todos os perfis cadastrados. Notificações pessoais continuam no sino e expiram em 24 horas.
- Esquema próprio com tabelas `entre_*` e políticas RLS (sem modificar as tabelas existentes).

## Login exclusivamente pelo Google

O frontend não oferece autenticação por senha. O botão inicia `db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` e redireciona de volta à URL atual.
A configuração do Google OAuth não pode ser substituída por frontend: é preciso ativar o provider e cadastrar o site nos sistemas Google/Supabase.

1. No [Google Cloud Auth Platform](https://console.cloud.google.com/auth/clients), crie um OAuth Client do tipo **Web application**. Origem autorizada: `https://appswebb.github.io`. URI de redirecionamento do OAuth: `https://trrakyybnvxpdhxwgjrz.supabase.co/auth/v1/callback`.
2. No [Supabase > Authentication > Providers > Google](https://supabase.com/dashboard/project/trrakyybnvxpdhxwgjrz/auth/providers), ative Google e informe Client ID e Client Secret. Nunca exponha o Client Secret no repositório.
3. No [Supabase > Authentication > URL Configuration](https://supabase.com/dashboard/project/trrakyybnvxpdhxwgjrz/auth/url-configuration), inclua na lista de Redirect URLs: `https://appswebb.github.io/testesite/`. Preserve as URLs de outros aplicativos do projeto compartilhado.
4. Em janela anônima, abra o site, clique em **Continuar com Google**, selecione a conta, retorne para completar o perfil 18+ e teste o logout.

Como este projeto Supabase hospeda autenticação para outro aplicativo, **não desative os outros provedores globalmente**; isso poderia interromper o acesso dos demais usuários. Este site oferece apenas o fluxo Google.

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
4. Google OAuth requer ativação do provedor e autorização de redirect URL no painel do Supabase. Sem isso, o botão de login não poderá concluir a autenticação.
5. Não são criados usuários ou mensagens falsos para aparentar atividade.
6. A busca considera preferências de ambos e evita usuários bloqueados. A presença na fila tem validade curta, renovada pelo navegador a cada 3,5s; conexão perdida pode ocasionar nova busca.
7. As mensagens de encontros sem match são apagadas quando a sessão termina no servidor. Sem match, a pessoa não é mantida em uma lista de contatos. Seguir pode ser solicitado pela área Online, e só o aceite libera um chat normal separado. Mensagens de conversas permanentes expiram após 10 dias de inatividade, mas o match continua.

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

## Painel administrativo entre.

O painel está disponível em https://appswebb.github.io/testesite/admin/. O administrador autorizado no Supabase é l.demelo2004@gmail.com, verificado com Google OAuth e funções SQL protegidas por RLS. O painel permite gerenciar usuários, banimentos, denúncias, sessões de matches, avisos com respostas, enquetes obrigatórias com totalização dos votos e o status do matchmaking. Conteúdos de conversas privadas não aparecem no painel. Todas as operações administrativas exigem validação no servidor. Funciona no desktop e no mobile.

## Modo atualização (controle manual)

Em `/admin/` → **Atualização**, o administrador ativa ou desativa a tela especial de manutenção. Personaliza o título e a mensagem. Visitantes veem uma tela responsiva de alta qualidade com verificação automática de estado (`entre_public_settings`); após desativar o modo, o cliente recarrega com `?released=` para obter a nova versão do GitHub Pages. Durante a manutenção, o Supabase suspende matchmaking, votação e leitura/envio de mensagens (RLS + RPC), exceto para administradores autorizados. A atualização só deve ser finalizada depois de confirmado o deploy no GitHub. O controle não faz o deploy por si só. O modo é **desativado por padrão**.
