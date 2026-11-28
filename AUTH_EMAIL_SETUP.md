# Cadastro e login por e-mail — entre.

O site usa exclusivamente e-mail e senha no Supabase Auth (SDK 2.117.1), sem processar ou armazenar senhas no backend do site. Os formulários estão em `docs/email-auth.js`.

## Configuração obrigatória antes de abrir cadastros ao público

1. No Supabase → Authentication → Providers → Email, habilitar cadastro por e-mail e **Confirm email**. Sem confirmação, o servidor pode aceitar cadastro usando e-mails não verificados; validação só no JavaScript não substitui esta configuração.
2. Em Authentication → URL Configuration, definir o Site URL oficial: `https://joinconnectbr.vercel.app/`. Adicionar à lista de Redirect URLs, individualmente:
   - `https://joinconnectbr.vercel.app/`
   - `https://joinconnectbr.vercel.app/?auth=recovery`
   Mantenha endereços antigos somente se ainda forem necessários para fluxos de autenticação em andamento; nunca os use em novos compartilhamentos.
3. Em Authentication → SMTP Settings, configurar e validar um provedor de e-mail confiável para mensagens de confirmação e redefinição. O serviço de e-mails padrão do Supabase não é adequado para escala de produção (limites e destinatários permitidos).
4. Em Authentication → Security and Protection, usar política mínima de senha de 12 caracteres, se disponível, proteção contra senhas vazadas, limitação de requisições e CAPTCHA (por exemplo Turnstile). Um CAPTCHA exige configurar a integração no dashboard e passar o token do widget nas chamadas de Auth; não ativar a exigência sem conectar um widget, pois isso bloquearia login/cadastro.
5. Exigir HTTPS (GitHub Pages/Vercel já o oferecem). Não disponibilizar chaves `service_role` ou segredos no frontend; só chaves publicáveis. Manter RLS em tabelas expostas e validar privilégios administrativos no banco.

## Fluxos

- Cadastro: `auth.signUp({email,password,options:{emailRedirectTo}})`, mostra confirmação sem revelar existência da conta se uma sessão não for criada.
- Login: `auth.signInWithPassword`, seguido de `auth.getUser` para validar a sessão atual e verificar status de suspensão.
- Recuperação: `auth.resetPasswordForEmail`, `?auth=recovery`, sessão autenticada recebida pelo cliente, `auth.updateUser({password})`, encerramento da sessão local e novo login.
- Google: removido do aplicativo. Desative também Authentication → Providers → Google no Supabase, para bloquear novos logins OAuth por esse provedor.\n- Painel administrativo: requer conta com e-mail confirmado, identidade `email` do Supabase e presença ativa em `entre_admin_allowlist`, verificadas por `entre_admin_check()` no servidor. Os endereços autorizados ficam exclusivamente na lista privada do Supabase.\n- As contas antigas de autenticação Google são excluídas na migração operacional, mas o endereço autorizado em `entre_admin_allowlist` permanece. É necessário criar uma nova conta com esse mesmo e-mail e uma nova senha, e confirmar o endereço.

A aplicação aplica um mínimo de senha e confirmação de termos na interface, mas restrições antifraude e confirmação do e-mail são controladas pelo Supabase, não pelo navegador. Para testes, não enviar senhas reais, tokens de sessão ou segredos para terceiros.

Referências: https://supabase.com/docs/guides/auth/passwords e https://supabase.com/docs/guides/security/production-checklist
