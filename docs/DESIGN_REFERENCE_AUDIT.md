# Adaptação visual do entre. a partir da cópia original do Once (23/11/2026)

## Origem realmente inspecionada

Arquivo entregue: `www.getonce.com-copia-completa(1).zip` (68 entradas, 1 página HTML capturada + folhas de estilo, scripts, imagens, fontes e arquivos de documentação). A cópia contém a **landing pública**, não páginas internas autenticadas do Once. Não confundir elementos visíveis no ZIP com componentes não capturados.

O HTML e o CSS da página fornecida mostram:

- **Tipografia de verdade**: Open Sans para textos e controles, Paytone One para títulos display compactos, Yellowtail para acentos cursivos. A versão anterior do entre. usava majoritariamente Plus Jakarta Sans e não reproduzia a hierarquia de títulos da referência.
- **Composição**: blocos de cores nítidas, fotografias recortadas em cards sobrepostos, contornos em rosa/verde/ciano, estrelas/adesivos, recortes e títulos com contorno escuro. A versão anterior desenhava somente duas figuras abstratas.
- **Cadastro**: fluxo visual guiado por etapas (identidade, preferência, interesses, idade e conta), ações claras e campos grandes, com formas compactas em celular. Não copiar o fluxo de dados/identidade nem enfraquecer as validações do entre.
- **Secções editoriais**: convite inicial, benefícios com colagens e fundos decorativos, ênfase em comunidade e CTA, rodapé. O entre. incorpora esses padrões à sua homepage e às áreas correspondentes: encontro privado, salas, lives e Feed.
- **Responsividade**: no telefone há menos elementos por linha, fotos sobrepostas, colagens reduzidas e ações em largura adequada. Não replicar posição fixa que force rolagem horizontal.
- **Movimento**: introduções, destaques de estrelas e colagens com animação sutil; preferências `prefers-reduced-motion` e a opção manual do entre. têm prioridade.
- **Cores de referência**: preto/branco, amarelo, turquesa, magenta e verde cítrico. **Não fixar essa paleta**: o usuário pediu temas claro, escuro e personalizado. A cor escolhida é o acento; os tons secundários permanecem decorativos e de baixo contraste.

## Mapa de aplicação ao aplicativo

| Elemento da cópia | Componente entre. | Regra de implementação |
| --- | --- | --- |
| Primeira tela com sobreposição de retratos | Landing e Pessoas online | Cards com destaque visual, fotos/avatares de origem própria; nenhum retrato do Once é redistribuído |
| Tipografia display / acento cursivo | Landing, títulos de todas as abas, seções, planos e ADM | Open Sans + Paytone One + Yellowtail via fontes públicas, sem copiar arquivos do ZIP |
| Formulários por etapas e chamadas fortes | Login, cadastro, completar perfil, filtros Ao Vivo, configurações | Padrão visual consistente; não remover validações, nem criar escolhas de conta não suportadas |
| Botões amplos e contornos compactos | Todas as abas, menus, modais e formulários | Área tocável mínima sem botão de senha gigante |
| Cards coloridos de benefícios | Cards de Feed, Premium, Salas e Lives | Retângulos e badges com acento do tema |
| Interação de seções e estrelas | Entrada nas abas, notificações e encontros | Animação leve opcional, acessível e sem afetar dimensionamento |
| Janela de login/redefinição | Login, recuperar senha, confirmar e-mail | Card central, formulários de altura adequada e feedback de erro |
| Composição editorial da seção "par de conversa" | Home do entre. e encontro privado | Redação própria para 5 minutos e decisão recíproca |
| Navegação superior / menu responsivo | Barra lateral e barra flutuante | Navegação sem perder busca, notificações, dados e perfil |
| Separação página pública / conteúdo interno | Perfil compartilhado, avisos, políticas, ADM | Mesmos tokens e componentes, mesmo sem login |

## Limites

O ZIP não fornece o design de mensagens, Lives, painel ADM ou assinaturas de dentro do Once. Essas telas são adaptações originais coerentes com os padrões realmente observados. Fluxos Supabase, login, autorização, manutenção, pagamentos, privacy e RTC não devem ser substituídos por JS ou endpoints do Once.

## Checklist de qualidade

- [ ] Light/dark/custom persistem após atualização e cor possui texto com contraste adaptado.
- [ ] CSS da landing aplicada sem copiar fotografias, logo, assets proprietários ou conteúdo do Once.
- [ ] Teclado móvel e modo retrato: 320, 360, 390 e 430 px sem overflow horizontal.
- [ ] Menu lateral, cápsula inferior e filtro de Ao Vivo não encobrem CTAs.
- [ ] Novo visual de recuperação de senha compacto.
- [ ] Perfil compartilhado apresenta avatares e CTAs para visitantes.
- [ ] ADM, Salas, Lives, Conversas, Feed, notificações e Premium adotam os mesmos componentes.
- [ ] GitHub Actions e deploy bem-sucedidos após merge.
