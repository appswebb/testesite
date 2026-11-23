# freq. — conversa ao vivo, sem enrolação

**freq.** é uma aplicação web original, responsiva e funcional para conversar em salas públicas em tempo real. Não é uma interface estática ou simulação: quando duas pessoas abrem o site no mesmo servidor, elas trocam mensagens e veem a presença uma da outra instantaneamente.

![Ícone da freq.](public/favicon.svg)

## 🌐 Site no GitHub Pages

**Endereço do site:** https://appswebb.github.io/testesite/

O nome **testesite** é exclusivamente o nome do repositório. A identidade do site é **freq.**

A versão pronta para GitHub Pages está na pasta [docs](docs/). O GitHub Actions publica essa pasta no endereço acima, sem necessidade de Vercel ou Node.js para servir as páginas. As mensagens ao vivo são encaminhadas por um **broker público MQTT de terceiros** (`wss://broker.emqx.io:8084/mqtt`). Assim, pessoas em dispositivos diferentes podem conversar sem servidor próprio nesta fase. O navegador pode demorar alguns segundos para carregar as salas na primeira conexão.

⚠️ **Importante:** essa é uma versão pública experimental. Conversas e presença são públicas no serviço MQTT, sem criptografia ponta a ponta, autenticação ou garantias de retenção/disponibilidade. **Não compartilhe dados pessoais ou sensíveis.** Não use esse broker de testes para um lançamento comercial. A implementação Node original continua em `public/` + `server.mjs` para migrar para backend privado posteriormente.

### Publicação do site

O workflow `.github/workflows/pages.yml` tenta habilitar GitHub Pages automaticamente e publica `docs/` quando há alterações em `main`. Se GitHub Pages estiver desabilitado nas configurações e a permissão do workflow não permitir ativá-lo, vá a **Settings → Pages → Build and deployment → Source: GitHub Actions** e execute novamente o workflow **Publish freq. to GitHub Pages** na aba Actions.

## Recursos incluídos

- **Salas ao vivo**: Praça central, No repeat, Fora da caixa, Depois das 00h, Sem contexto, além de novas salas criadas pelos usuários.
- **Mensagens em tempo real**: entrega instantânea usando Server-Sent Events (SSE) para receber atualizações e HTTP POST para enviar.
- **Pessoas online**: lista de pessoas conectadas na sala, com contador obtido diretamente das conexões ativas; várias abas da mesma sessão contam como uma pessoa.
- **Indicador de digitação**: aparece quando alguém está escrevendo; desaparece após poucos segundos.
- **Histórico real**: mensagens, salas e sessões gravadas em arquivo JSON no servidor, com gravação atômica.
- **Responder, editar e excluir** mensagens próprias, além de reagir com ❤️ 🔥 😂 👏 ⚡.
- **Acesso simples**: apelido sem exigir cadastro; sessão mantida em cookie HttpOnly.
- **Criar salas**, escolher ícones e compartilhar links para convidar pessoas.
- **Interface própria**, adaptada para computador e celular; menu lateral no mobile, animações sutis, contador de caracteres e navegação por teclado.
- **Reconexão automática** com atualização das mensagens recentes após perda de conexão.
- **Sem dependências de terceiros no servidor**; não é necessário configurar banco de dados externo ou chave de API.

## Iniciar no computador

É necessário **Node.js 20 ou superior**.

```bash
# Entre na pasta do projeto
cd freq-live

# Execute diretamente. Não é necessário npm install.
npm start
```

Abra **http://localhost:3000**. Para testar o tempo real, abra o endereço em duas janelas diferentes ou em dois dispositivos na mesma rede, usando o IP acessível do computador que roda o servidor (e liberando a porta na rede, se necessário).

> O arquivo `public/index.html` isolado NÃO oferece conversa real. O servidor `server.mjs` precisa estar executando.

### Modo desenvolvimento

```bash
npm run dev
```

O Node reinicia o servidor quando arquivos observados mudam. Recarregue o navegador para ver alterações de HTML/CSS/JS.

### Executar testes

```bash
npm test
```

Os testes sobem um servidor isolado e verificam comunicação entre dois usuários, presença, entrega das mensagens, digitação, edição, permissões, reações, exclusão, novas salas e persistência em disco.

## Executar com Docker

```bash
docker compose up --build -d
```

Abra `http://localhost:3000`. O volume nomeado `freq_data` preserva as mensagens após a recriação do contêiner.

## Hospedar na internet

Use uma hospedagem que execute **um processo Node.js continuamente** (VPS, Render com instância persistente, Railway com volume, etc.).

1. Publique este repositório no GitHub.
2. Conecte-o a um serviço que suporte um servidor Node rodando continuamente.
3. Configure o comando `npm start`, Node.js 20+, porta por `PORT` e HTTPS no domínio público.
4. Configure **armazenamento persistente** montado em `/app/data` (Docker) ou ajuste `DATA_DIR` para o diretório persistente disponível no provedor.
5. Use **uma única instância** desta versão do servidor; dados e presença são mantidos no processo local.

**A versão Node com SSE não roda no GitHub Pages**: somente a alternativa estática em `docs/` funciona no Pages, com comunicação por um broker externo. Funções serverless com execução curta também não são adequadas para conexões SSE duradouras.

### Variáveis de ambiente

| Variável | Padrão | O que faz |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do site |
| `HOST` | `0.0.0.0` | Interface em que o servidor escuta |
| `DATA_DIR` | `./data` | Pasta onde fica `store.json` |

No ambiente público, use um proxy reverso com HTTPS. Configure o proxy para **não fazer buffer das respostas `text/event-stream`**, permitindo conexões duradouras. O servidor envia heartbeats a cada 20 segundos.

## Estrutura

```text
freq-live/
├── public/
│   ├── index.html       # Layout e janelas da interface
│   ├── styles.css       # Estilo, animações e responsividade
│   ├── app.js           # Lógica da interface e eventos em tempo real
│   └── favicon.svg      # Identidade visual
├── server.mjs           # HTTP, API, SSE, presença e persistência
├── tests/
│   └── integration.test.mjs
├── data/
│   └── .gitkeep         # O store.json é criado automaticamente
├── Dockerfile
├── compose.yaml
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

## Como o tempo real funciona

Cada navegador se conecta a `GET /api/events?room=...` via `EventSource`. O servidor transmite os eventos `ready`, `presence`, `rooms`, `message`, `message_update` e `typing`. Quando alguém envia uma mensagem (`POST /api/rooms/:id/messages`), o servidor a armazena e publica a mensagem imediatamente para quem está naquela sala.

A lista de online é derivada das conexões SSE ativas; não há contadores ou pessoas inventadas. Mensagens antigas ficam salvas em `data/store.json`. O histórico é paginado em blocos de 60 mensagens.

### Endpoints relevantes

| Método | Endpoint | Função |
|---|---|---|
| `POST` | `/api/session` | Entrar com apelido |
| `GET` | `/api/me` | Recuperar sessão atual |
| `PATCH` | `/api/profile` | Alterar apelido |
| `POST` | `/api/logout` | Encerrar sessão |
| `GET` / `POST` | `/api/rooms` | Listar / criar salas |
| `GET` | `/api/rooms/:id/messages` | Consultar mensagens |
| `POST` | `/api/rooms/:id/messages` | Enviar mensagem |
| `PATCH` / `DELETE` | `/api/rooms/:id/messages/:messageId` | Editar / excluir mensagem própria |
| `POST` | `/api/rooms/:id/reactions` | Adicionar/remover reação |
| `POST` | `/api/rooms/:id/typing` | Avisar que está digitando |
| `GET` | `/api/events?room=:id` | Receber eventos ao vivo (SSE) |
| `GET` | `/api/health` | Saúde do servidor |

## Proteções já implementadas

Cookies de sessão `HttpOnly` com `SameSite=Lax` e `Secure` quando em HTTPS; cabeçalhos HTTP de segurança; validação de nome de usuário, texto e ícones; renderização de conteúdo com `textContent` para evitar inserção de HTML; limitação básica de frequência para mensagens, entradas e novas salas; verificação de origem para métodos de alteração; somente o autor pode editar/apagar suas mensagens.

## Limitações e próximos passos para lançamento amplo

Esta versão é uma **base funcional para comunidades pequenas em uma única instância**. Não representa um mensageiro privado nem uma plataforma de grande escala. As salas são públicas para quem obtém acesso ao site; não há criptografia de ponta a ponta. O acesso por apelido não prova a identidade de alguém e a sessão depende de um cookie no navegador.

- Os dados ficam no `store.json`, sem backups automáticos. **Se o diretório de dados for apagado, as mensagens serão perdidas.** Provedores com disco temporário exigem volume persistente.
- Máximo de **40 salas** e **3.000 mensagens por sala**, com descarte das mais antigas. Cada usuário vê até 60 mensagens por página do histórico.
- A presença vale para o processo Node atual; para múltiplas instâncias seria necessário um backend compartilhado, como PostgreSQL + Redis pub/sub.
- Não há moderação por administradores, denúncia/bloqueio de usuários, recuperação de contas, DM privado, verificação de e-mail, anexos ou filtros antispam avançados.
- As sessões ficam armazenadas no servidor e são apagadas quando o usuário seleciona sair, porém o histórico enviado permanece. A exclusão completa de dados pessoais e regras de retenção precisariam ser implementadas antes de uso comercial.
- O armazenamento síncrono em JSON é adequado a testes e baixo tráfego, não a alta concorrência. Para produção em larga escala, migre a persistência para um banco de dados gerenciado.

## Licença

MIT — consulte `LICENSE`.
