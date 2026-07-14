# Plano de Resposta a Incidente de Segurança — Prime Barbearia

> Documento interno. Não é conteúdo jurídico definitivo — é um guia prático baseado na LGPD (Lei nº 13.709/2018) e na Resolução CD/ANPD nº 2/2022 (regras simplificadas pra agentes de tratamento de pequeno porte). Revisão por advogado recomendada se o negócio crescer.

## O que conta como incidente

Qualquer evento que exponha, altere ou destrua dados pessoais de clientes ou barbeiros sem autorização. Exemplos concretos pro nosso sistema:

- Vazamento de credenciais do Supabase (URL + chave anon/service_role expostas indevidamente, ou a chave `service_role` sendo publicada por engano em algum commit/print)
- Acesso indevido ao banco de dados (ex: uma policy de RLS mal configurada expondo dados de um cliente pra outro)
- Perda de acesso ao próprio painel do Supabase (conta comprometida)
- Celular/computador de um barbeiro com sessão logada sendo roubado ou perdido
- Envio de dados de cliente pro destinatário errado (ex: WhatsApp)

## Passo a passo — o que fazer nas primeiras horas

1. **Conter.** Se for uma chave exposta: trocar a chave no Supabase Dashboard (Project Settings → API → gerar nova). Se for uma policy de RLS com brecha: corrigir a policy imediatamente no SQL Editor (RLS é a primeira linha de defesa desse sistema — ver `C:\Users\Usuario\Downloads\prime\index.html` pras policies atuais de `barbers`, `clients`, `appointments`).
2. **Avaliar o alcance.** Quantos registros foram expostos? Que tipo de dado (nome/telefone é menos grave que senha ou dado sensível)? Use o SQL Editor pra checar `created_at`/logs de acesso se necessário.
3. **Documentar.** Anote data/hora que percebeu, o que aconteceu, quantos titulares afetados, e as ações tomadas — mesmo que informalmente (um documento, um e-mail pra você mesmo). Isso vira a base de qualquer comunicado depois.
4. **Avisar os titulares afetados**, se o risco for relevante (ex: exposição de senha, dado que permita fraude). Canal: WhatsApp/e-mail direto. Seja claro sobre o que aconteceu e o que a pessoa pode fazer (trocar senha, etc).
5. **Avaliar se precisa avisar a ANPD.** A lei exige comunicação à Autoridade Nacional de Proteção de Dados em caso de incidente que possa acarretar risco ou dano relevante aos titulares (art. 48 da LGPD). Como agente de pequeno porte, o prazo de comunicação é ampliado em relação ao padrão geral — mas não elimina a obrigação em casos graves. Na dúvida, é melhor notificar do que não notificar.

## Contatos e canais

- Painel do Supabase: `https://supabase.com/dashboard/project/yojvzwkvtedxqlohpuug` — troca de chaves, RLS, logs
- Repositório do código: `https://github.com/gabrielparcel-byte/prime-barbearia`
- Canal de contato com titulares: WhatsApp/Instagram informados no rodapé do site (mesmo canal da Política de Privacidade)
- ANPD (se necessário notificar): `https://www.gov.br/anpd/`

## Prevenção — checklist de rotina

- [ ] Nunca commitar a chave `service_role` do Supabase no código (só a chave `anon`/`publishable` é segura pra ficar no front-end — ver `index.html`)
- [ ] Revisar periodicamente as RLS policies das tabelas `barbers`, `clients`, `appointments` no SQL Editor
- [ ] Senhas de barbeiros não devem ser compartilhadas entre pessoas — cada um com a própria conta (já é assim desde a Fase 6A)
- [ ] Ao remover um barbeiro da equipe, confirmar que ele não consegue mais logar (roster removido = login rejeitado, mas a conta de auth ainda existe — ver limitação documentada na Fase 6A do `ROADMAP.md`)
- [ ] Revisar de tempos em tempos quem tem acesso de admin no Supabase Dashboard

---
*Criado em 2026-07-11. Atualizar sempre que a arquitetura do sistema mudar de forma relevante (ex: quando vendas/financeiro migrarem pro Supabase na Fase 6C).*
