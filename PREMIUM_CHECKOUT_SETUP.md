# entre. Premium — ativação de assinaturas
Status em 23/11/2026: implementação integrada; **cobranças ainda desativadas** no banco.

## O que já existe
- Frontend: botão na aba Premium, estados de carregamento e retorno de checkout sem aprovação automática.
- Supabase Edge Function `entre-premium-checkout`: exige JWT válido, consulta valor mensal habilitado e obtém um link seguro de assinatura do Mercado Pago.
- Supabase Edge Function `entre-premium-webhook`: valida assinatura da notificação e confirma o pagamento consultando a API do Mercado Pago, antes de liberar Premium.
- Banco: `entre_premium_settings`, `entre_premium_subscriptions` e RPCs com regras de autorização. O preço e o sinalizador de checkout estão sob controle do painel administrativo.

## Para ativar cobrança real, com valor autorizado
1. Definir **o valor mensal em reais** e as condições comerciais que o site exibirá. Não colocar valor inventado ou implícito.
2. No Supabase Dashboard → Edge Functions → Secrets, conferir que `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` estão configurados para **a mesma conta Mercado Pago**. Nunca colocar esses segredos no GitHub, no frontend ou no chat.
3. No Mercado Pago Developers, configurar a URL do webhook: `https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/entre-premium-webhook`; habilitar as notificações de pagamentos autorizados de assinaturas. Confirmar assinatura HMAC com os eventos reais. Links de retorno para o GitHub Pages devem estar liberados na conta Mercado Pago.
4. Validar em ambiente de testes um fluxo de assinatura completa, incluindo pagamento, cobrança recorrente, cancelamento e estorno. Conferir que somente assinaturas com pagamento verificado recebem Premium.
5. Somente depois, abrir o painel administrativo do entre. → **Premium**, configurar o valor e habilitar o checkout. Até então a interface mostra "Aguardando ativação do checkout".

## Segurança e privacidade
- O front-end não armazena dados de cartão nem concede Premium por parâmetros da URL.
- Um retorno `?premium=return` exibe aviso de análise; o privilégio só aparece após confirmação do servidor.
- O token de acesso do Mercado Pago só deve existir como segredo da Edge Function.
- O usuário não é cobrado se o checkout permanecer desativado ou o link não puder ser validado.
- Apenas a função de webhook deve atualizar o estado autorizado da assinatura depois de conferir o pagamento com a API oficial.

Documentação:
- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post
