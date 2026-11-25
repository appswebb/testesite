# CONNECT Android · cliente nativo

**Status: código em desenvolvimento, ainda não compilado nem aprovado para distribuição.** O aplicativo usa Activity/View do Android (Java), Kotlin para LiveKit, HTTPS e WebSocket para Supabase. Não existe WebView, PWA ou shell HTML na interface. O site e o painel atuais permanecem independentes.

## Compilação manual e publicação

- Abra a pasta `android/` no Android Studio. JDK 17, Android SDK Platform 35, Build Tools 34.0.0, Gradle 8.9 e Android Gradle Plugin 8.7.3. Android mínimo API 26.
- Dependências fixadas: Kotlin 1.9.25, LiveKit Android 2.11.1, coroutines 1.8.1, OkHttp 4.12.0.
- Com o Gradle instalado, execute `gradle :app:assembleDebug :app:lintDebug`. O APK de testes será gerado em `app/build/outputs/apk/debug/app-debug.apk` somente após sucesso.
- Para distribuir, gere um APK release assinado no Android Studio. Guarde a chave de assinatura de forma segura, fora do repositório. Use a mesma chave e o mesmo applicationId nas atualizações, incrementando versionCode.
- Não distribua um APK de debug como release oficial. Confirme o identificador final `com.connect.community` antes da primeira assinatura.

## Integração com a produção

Usa o mesmo Supabase do CONNECT e somente a chave pública publishable. RLS e RPCs já existentes controlam acesso, moderação, retenção e Premium. Não foi criado outro banco. As sessões são criptografadas com AES-GCM/Android Keystore e renovadas pelo servidor.

O navegador é aberto somente para o CAPTCHA Cloudflare (página isolada `docs/android-captcha.html`), documentos legais, fluxo externo de recuperação/compra e confirmação por e-mail. Não renderiza nenhuma tela principal do aplicativo. O CAPTCHA deve ser publicado no domínio autorizado antes dos testes de login; o retorno usa nonce aleatório mantido em memória, não envia senha nem sessão ao navegador. Revisar App Links verificados antes da distribuição.

## Código implementado nesta branch

- Cadastro, consentimento, perfil, escolha de plano e retomada de inscrição; sessão criptografada e última tela por conta.
- Feed, likes, edição/exclusão, comentários e stories; seleção de mídia pelo Android, compressão WebP e visualização via URL assinada.
- Conversas permanentes, texto, edição/exclusão, mídia, leitura, fixação/arquivamento, bloqueio e denúncia.
- Busca por texto/vídeo, gênero Premium e campos de localização gratuitos; cancelamento coordenado com servidor, cronômetro, match e encerramento.
- SDK Android LiveKit para videochamadas e lives, permissões de câmera/microfone, controle de áudio/vídeo, pedidos de convidado, comentários e corações.
- Sala global/estadual/municipal, busca de pessoas, solicitações de seguir e conversar, notificações e avisos, suporte, preferências sincronizadas, perfil e visitas.
- Canal WebSocket Realtime autenticado e recarregamento de conversa/sala, presença limitada ao primeiro plano e verificações periódicas de manutenção.

## Pendências obrigatórias e limites

O código ainda **não foi compilado**. O ambiente usado para implementação não dispõe de Gradle/SDK Android e não conseguiu baixar os componentes por rede. Validação realizada: inspeção estática de delimitadores, ausência de WebView e correspondência de 65 RPCs literais com funções existentes e permissões authenticated no banco. Isso não demonstra execução bem-sucedida.

Antes de liberar, testar build/lint, telas em dispositivos reais, login/CAPTCHA, sessão expirada, RLS, encerramento e reconexão, mídia, chamadas entre Android e navegador, eventos Realtime, cancelamento concorrente e fluxo completo de cadastro. Completar paridade das funções restantes: recorte interativo de todas as imagens (atualmente compressão e corte central de avatar), gravação de voz, edição/denúncia de todos os tipos de conteúdo, banner GIF, controle completo de lives/co-stream, filtros de localização com seleção oficial e detecção automática, notificações push em segundo plano, exclusão de conta com confirmação e demais fluxos de configurações e moderação do site. Revisar UX e acessibilidade. Não declarar equivalência integral ao site até concluir esses pontos.

## Política de release

Trabalhar em `android-native`. Não alterar workflows do GitHub Actions nem disparar builds ou distribuição sem pedido explícito. A branch contém uma página de instalação preparada, mas sem link fictício de APK. Somente após testes e autorização, publicar os assets de autenticação, o APK release assinado e atualizar o link de instalação com o arquivo real. Não modificar o site de produção inadvertidamente.
