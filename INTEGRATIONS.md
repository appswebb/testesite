# Integrações de produção — entre.

## Situação atual

O frontend, banco e as Edge Functions estão preparados. **A cobrança recorrente ainda não está ativa:** o preço mensal inicia vazio, o checkout desabilitado e nenhum status Premium é concedido sem confirmação do Mercado Pago. O formulário de suporte salva protocolos e provas privadas independentemente do envio de e-mails, mas a entrega à caixa de entrada só funciona após configurar o provedor de e-mail.

## 1. Mercado Pago — assinatura recorrente

Configure os segredos de produção nas **Edge Functions** do projeto Supabase `trrakyybnvxpdhxwgjrz`, nunca no repositório ou JavaScript público:

- `MERCADOPAGO_ACCESS_TOKEN`: token privado da conta recebedora.
- `MERCADOPAGO_WEBHOOK_SECRET`: segredo da assinatura de webhooks criada no Mercado Pago.

Use a notificação da assinatura recorrente (pagamento autorizado) apontando para:

`https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/entre-premium-webhook`

O frontend chama `entre-premium-checkout`; essa função cria uma assinatura `preapproval` pendente. O webhook só autoriza Premium após validar a assinatura HMAC, consultar o pagamento **aprovado** e confirmar no Mercado Pago a assinatura **autorizada**, vinculada à conta e ao prazo pago. A interface nunca altera o status de assinatura.

No painel, abra **Premium**, informe o preço mensal em reais e marque a habilitação apenas após configurar tokens, eventos e confirmar o funcionamento do checkout e do webhook com contas de teste do Mercado Pago. É necessário implementar e testar também o tratamento de cancelamentos, reembolsos e falhas de renovação antes de abrir vendas reais. Até lá, mantenha o checkout desativado. Para impedir renovação automática indevida, integre o cancelamento/gestão da assinatura no provedor.

As vantagens só aparecem quando `status='authorized'` e `paid_until>now()`. O filtro exato por gênero é verificado pelo servidor; o selo, o brilho e o WhatsApp de atendimento prioritário são liberados com a mesma verificação.

## 2. Suporte por e-mail

O e-mail de destino é **connectapp.w@gmail.com**, separado do login administrativo. Para entregar mensagens, configure:

- `RESEND_API_KEY`: chave privada do serviço Resend.
- `ENTRE_SUPPORT_FROM`: remetente verificado no Resend, por exemplo `suporte@seu-dominio-verificado.com`.

A Edge Function `entre-support-email` aceita somente uma conta autenticada e um chamado **daquela conta** enviado com pelo menos uma prova. Ela gera URLs temporárias para os anexos do bucket privado `entre-support-evidence` e tenta enviar a notificação ao destinatário. Com as variáveis ausentes ou falha do serviço, o protocolo fica no painel **Suporte** e o sistema informa que não houve entrega confirmada por e-mail.

O formulário exige de 1 a 3 imagens (PNG/JPEG/WebP) ou PDFs, até 5 MB cada. Faça um envio real com conta de teste e confirme chegada ao e-mail, acesso restrito às provas e proteção contra envio repetido antes de abrir para todos.

## 3. Chamada de vídeo

O modo **Vídeo** usa WebRTC com canais de sinalização privados no Supabase Realtime. A política do banco aceita sinalização somente entre os dois participantes de um encontro ativo de cinco minutos. O aplicativo não grava a mídia; ao encerrar, deve desligar câmera/microfone e fechar a sessão.

É indispensável testar com **duas contas reais em dispositivos e redes diferentes**, câmera/microfone autorizados e HTTPS. A configuração básica usa STUN público; redes corporativas, CGNAT e NAT simétrico podem precisar de **servidor TURN confiável**. Antes de disponibilizar vídeo amplamente, configure TURN, verifique sua política de privacidade, qualidade e custos, e valide o encerramento em caso de conexão perdida.

## 4. Validação e segurança

Execute `node --test tests/social-ui-regression.test.mjs`, a auditoria móvel do GitHub Actions e testes reais de ponta a ponta de pagamento, vídeo e entrega de suporte. O site usa GitHub Pages; **chaves privadas** devem ficar apenas nas configurações seguras do Supabase.

Essas integrações precisam de ativação e ensaio externos antes de ser consideradas prontas para faturamento ou atendimento por e-mail.
