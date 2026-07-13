# Prime Barbearia — Roadmap

> Objetivo: transformar a Prime na referência de barbearia digital em Maringá e região.
> Diferencial: app exclusivo com gamificação, fidelidade e experiência premium.

---

## 🏆 Fase 1 — Prime Club (Gamificação + Fidelidade)

### Conquistas / Stickers Colecionáveis
- [x] Sistema base de conquistas (modelo de dados, storage, lógica de desbloqueio)
- [x] Vitrine de stickers no perfil do cliente (grid visual com stickers bloqueados/desbloqueados) *(beta)*
- [x] Animação de desbloqueio (confetti/brilho ao conquistar)
- [x] Conquistas implementadas:
  - [x] "Primeiro Corte" — primeiro agendamento realizado
  - [x] "Fiel" — 5 cortes concluídos *(critério ajustado: total, não "seguidos" — ver nota)*
  - [x] "Madrugador" — agendou no primeiro horário do dia
  - [x] "Combo Master" — fez Corte + Barba + Barbaterapia na mesma visita
  - [x] "Veterano" — 1 ano de cliente
  - [x] "Embaixador" — indicou um amigo *(destravada pelo sistema de indicação da Fase 3)*
  - [x] "Nota 10" — deixou 5 avaliações
  - [x] "VIP" — atingiu nível Ouro
- [x] Sistema de níveis: Bronze → Prata → Ouro → Diamante
- [x] Brinde por fidelidade (a cada 5 cortes, barbeiro decide o mimo)
- [ ] Benefícios por nível (desconto %, prioridade de horário)

### Cartão de Fidelidade Digital
- [ ] Barra de progresso "X de 10 cortes → próximo grátis"
- [ ] Visual de selos/carimbos preenchidos
- [ ] Reset automático ao completar + registrar corte grátis
- [ ] Histórico de cartões completados

---

## 🎨 Fase 2 — Polish Visual / UX

### Animações e Transições
- [x] Micro-animações nos botões (hover lift, press scale, spinner loading) + modais com fade/pop
- [x] Transições suaves entre telas do app (fade+translateY com cubic-bezier)
- [x] Skeleton loading nos cards enquanto carrega dados (`primeSkeletonThen`)
- [x] Animação de entrada do logo ao abrir o app (emblem rotate+scale, wordmark slide-up)

### Refinamento de UI
- [x] Glassmorphism refinado nos cards (backdrop-filter blur+saturate, com @supports fallback)
- [x] Tipografia e espaçamentos revisados para consistência (ba-slabel alinhado com ca-slabel)
- [x] Ícones SVG customizados — sino, estrela, presente, QR, calendário, pessoa (substituem emojis)
- [x] Paleta de cores revisada e documentada — `--dourado-claro` adicionado (faltava), `--erro`/`--alerta`/`--violeta` criados, 29 hex hardcoded → `var()`

### Responsividade
- [x] Testar e ajustar todas as telas em 375px, 390px, 414px (iPhones) — JS overflow scan automatizado
- [x] Testar em tablets (768px) — nav breakpoint corrigido de 760→960px
- [x] PWA básico (manifest.json, ícones 192/512, meta tags, dev server atualizado)

---

## 👤 Fase 3 — Experiência do Cliente

### Perfil e Histórico
- [x] Timeline visual dos cortes anteriores (data, barbeiro, serviço, valor) — "Cortes recentes" na Home (3 últimos) + histórico completo na aba Histórico, com as estrelas da avaliação quando existir. A tela "Histórico" e a seção "Cortes recentes" já existiam na navegação mas mostravam dados fictícios fixos — agora usam o histórico real (`primeClientCuts`)
- [ ] "Meu estilo" — cliente salva fotos de referência de corte *(pulado por enquanto — item mais especulativo da Fase 3, fica pra depois se fizer sentido)*
  > **Regra obrigatória pra quando implementar** *(discutido 2026-07-10)*: toda foto tem que ser **comprimida/redimensionada no navegador antes de subir** (ex: máx. 800px de largura, JPEG ~80% de qualidade — derruba de 2-8MB pra 100-300KB sem perda visível) e a exibição em lista/galeria tem que usar **lazy loading** (só carrega as fotos visíveis na tela, não todas de uma vez). Sem isso, o Supabase Storage (cota grátis pequena) enche rápido e a galeria fica lenta. Essas duas práticas entram desde a primeira versão da feature, não como otimização posterior.
- [x] Barbeiro favorito com destaque no agendamento *(já estava implementado de uma sessão anterior, só não tinha sido marcado — estrela ★ no wizard de agendamento em ambos os modos, card "Seu barbeiro" na Home, troca manual no Perfil, e vira favorito automático no primeiro agendamento)*

### Avaliação e Feedback
- [x] **Corrigido bug**: cliente nunca conseguia avaliar o barbeiro — o card "Finalizar" só aparecia em agendamentos ainda não concluídos, mas o barbeiro sempre marcava `concluido` primeiro (ao finalizar o carrinho), fazendo o agendamento sumir da tela do cliente antes dele poder avaliar. Agora existe um card separado "Avalie seu último corte" que aparece pra qualquer atendimento concluído ainda sem nota do cliente, independente do status. O cliente não marca mais o atendimento como concluído (só o barbeiro faz isso, evita bypassar o carrinho/estoque).
- [x] Notificação pós-corte pedindo avaliação — quando o barbeiro finaliza, o cliente recebe "⭐ Como foi seu atendimento? Toque aqui pra avaliar", clicável, abre a avaliação direto (antes a notificação existia mas o texto não convidava a avaliar e não era clicável)
- [x] Avaliações visíveis no perfil público do barbeiro — nota média + estrelas + comentários dos clientes no modal de perfil (landing page), nome do cliente parcial por privacidade ("Rafael S.")
- [x] Resposta do barbeiro à avaliação — botão "Responder" nas Vendas → Avaliações, aparece pro cliente notificado e no perfil público do barbeiro ("Resposta de Nathan: ...")

### Indicação
- [x] Código de indicação único por cliente — gerado no Perfil, com botão de compartilhar no WhatsApp; campo opcional pra inserir o código no cadastro
- [x] Recompensa para quem indica e quem é indicado — mimo de indicação decidido pelo barbeiro (mesma lógica do brinde de fidelidade: ponto violeta na lista, card "Elegível a mimo de indicação", "Marcar como dado" independente pra cada lado). Barbeiro também pode vincular manualmente "indicado por" quando o código não foi usado no cadastro
- [x] Contador de indicações no perfil — "Você já indicou N amigos" + desbloqueia a conquista "Embaixador" automaticamente

---

## 💈 Fase 4 — Área do Barbeiro (Dashboard)

### Financeiro Visual
- [x] Gráfico de barras — faturamento por dia (7/14/30 dias, seletor de período)
- [x] Gráfico de linha — evolução mensal (3/6/12 meses, seletor de período)
- [x] Meta mensal com barra de progresso "R$ X de R$ Y" (definida pelo admin por barbeiro)
- [x] Comparativo com mês anterior (% crescimento)

### Gestão Inteligente
- [x] Ranking entre barbeiros (atendimentos, feedbacks, resumo por serviço — só admin, ordenável, sem valores em R$)
- [x] Alerta "cliente sumiu" — ponto âmbar na lista, filtro "Sumidos", banner no detalhe com atalho pro WhatsApp (30+ dias sem visita)
- [x] Relatório mensal exportável — PDF (via impressão, com logo e cores da marca, detalhado item a item por barbeiro/cliente/despesa) + resumo compartilhável no WhatsApp *(exportação em XLSX ficou pra depois — só faz sentido se sentir falta de mexer nos números numa planilha; PDF/impressão não precisa de biblioteca externa, XLSX bonito precisaria)*
- [x] Agenda com cores por tipo de serviço (pontinho colorido por serviço na timeline + legenda)

### Admin / Barbearia
- [x] Dashboard geral da barbearia (toggle "Minha visão / Barbearia toda", só admin — consolida comparativo, barras e linha de todos os barbeiros)
- [x] Controle de despesas básico (nome, valor, data — cadastro e remoção, só admin, no Dashboard)
- [x] Lucro líquido estimado (faturamento de toda a equipe − comissões de cada barbeiro − despesas, só admin)
- [x] Catálogo de produtos com estoque (cerveja, cremes, gel, etc.) — só admin cadastra/edita/repõe, alerta de estoque baixo
- [x] Carrinho ao vivo durante o atendimento — barbeiro clica "Iniciar" num agendamento confirmado, adiciona produtos à vontade enquanto atende, e "Finaliza" gerando uma nota única (serviço + produtos) com desconto automático de estoque
- [x] Auto-início do atendimento — se o barbeiro esquecer de clicar "Iniciar", o sistema inicia sozinho 6 minutos após o horário agendado (registra o início no horário marcado, não no momento da detecção)
- [x] Corrigido: agendamentos feitos pelo cliente no site agora **geram venda de verdade** ao serem finalizados (antes só a aba "Atendimento" avulsa registrava vendas — todo o histórico de agendamento "sumia" financeiramente)

---

## 🚀 Fase 5 — Diferenciação Competitiva

### vs AppBarber
- [x] QR Code no balcão → botão "📱 QR Code pro balcão" no Perfil do barbeiro, gera uma página pra imprimir (logo, marca, QR) apontando pro link real do site (`location.origin`, funciona em qualquer domínio); usa a API gratuita do QR Server, sem precisar de biblioteca extra
- [x] Notificações push (via service worker) ✅ *(2026-07-13)* — migração das notificações (`primeNotifs`) de `localStorage` pra tabelas `notifications`/`push_subscriptions` no Supabase (o bug original: notificação só existia no aparelho de quem disparou a ação, nunca chegava no aparelho do destinatário). Primeira Edge Function do projeto (`send-push`, Deno + `npm:web-push`), disparada por Database Webhook no INSERT de `notifications`. Botão "Ativar notificações" no Perfil (cliente e barbeiro); Service Worker (`sw.js`) registrado com escopo relativo (`./`, necessário por causa do subpath do GitHub Pages). Todos os 9 pontos de disparo migrados; RLS testada (dono lê/edita só a própria notificação/inscrição). *(Fase D, que já previa migrar notificações, foi puxada pra dentro desta tarefa.)*
- [ ] Modo offline básico (ver agenda mesmo sem internet)
- [ ] Compartilhar conquista nas redes sociais (story template)

### Marketing
- [ ] Landing page com depoimentos reais
- [ ] Seção "Galeria" com fotos de cortes realizados
- [ ] Instagram feed integrado (embed posts)
- [x] SEO técnico otimizado — 1 `<h1>` só por página (antes tinha 2), dados estruturados Schema.org (`HairSalon`, endereço, horário, telefone — aparece no card local do Google), Open Graph + Twitter Card (link bonito ao compartilhar no WhatsApp/Instagram), `robots.txt` + `sitemap.xml`, link canônico *(o resto do SEO — Google Meu Negócio, depoimentos reais, conteúdo — depende de ação fora do código ou de material que ainda não temos)*

---

## 🗄️ Fase 6 — Backend Real & Conformidade LGPD

> Contexto: hoje TUDO (roster de barbeiros, clientes, vendas, agendamentos, achievements, brindes) vive no `localStorage` do navegador. Isso significa que cada barbeiro só enxerga os próprios dados no próprio aparelho — não há sincronização entre dispositivos nem backup real. Essa fase é a maior mudança estrutural do projeto: não é um "adicional", é trocar a fundação de armazenamento. Rollout em sub-fases (A/B/C/D) pra não travar o app no meio do caminho.

### Fase A — Fundação: Auth + Roster de barbeiros ✅ *(concluída 2026-07-11)*
- [x] Projeto Supabase criado (Postgres + Auth), schema `barbers`/`clients`/`barber_invites` com Row Level Security
- [x] Autenticação real via Supabase Auth (substitui comparação de senha em texto puro) — cliente e barbeiro
- [x] Roster de barbeiros migrado de `localStorage` pra tabela `barbers` (leitura pública, escrita restrita a admin via RLS)
- [x] Fluxo de convite pra criar novo barbeiro (admin gera código, convidado se auto-cadastra — sem precisar de service_role/Edge Function)
- [x] Redefinição de senha por e-mail (`resetPasswordForEmail`) substituindo a edição direta de senha em texto puro
- [x] Sessão persistente entre reloads (Supabase Auth), testado ponta a ponta: login/logout/signup/RLS negativo/regressão em agenda-vendas-clientes
- Banco começou zerado (sem migrar dados de teste do localStorage); Nathan e Lucas recriados como usuários reais

### Fase B — Agendamentos ✅ *(concluída 2026-07-11)*
- [x] Tabela `appointments` no Postgres (id bigint, `client_id`/`barber_id` como FK reais, RLS por dono + admin)
- [x] Wizard de agendamento migrado pro Supabase (`primeCreateAppointment`), thread do `barberId`/`clientId` desde a seleção
- [x] Agenda do barbeiro (pendentes, aceitar, iniciar atendimento, carrinho, auto-start) migrada — cada barbeiro só vê os próprios agendamentos, agora sincronizado entre aparelhos
- [x] Encaixe (walk-in) corrigido pra buscar na tabela real `clients` da Fase A (antes usava uma lista separada e desatualizada); novo caminho pra cliente sem cadastro
- [x] Cancelamento/reagendamento do cliente vira soft-update (`status='cancelado'`) — histórico preservado, antes era apagado
- [x] Avaliação (cliente↔barbeiro, resposta do barbeiro) migrada, mantendo as duas direções na mesma linha
- [x] View pública `public_reviews` (SECURITY DEFINER, colunas curadas) pra avaliações aparecerem na landing page sem exigir login — RLS da tabela principal não permite leitura anônima
- [x] Testado ponta a ponta: reserva completa, RLS negativo (barbeiro não vê agenda de outro, cliente não acessa agendamento alheio), fluxo aceitar→iniciar→concluir→avaliar, cancelamento preservando histórico, encaixe com e sem conta vinculada, renomear barbeiro sem precisar propagar em `appointments`
- Banco começou zerado; sem policy de DELETE em `appointments`/`clients` (decisão deliberada — só dá pra apagar via SQL Editor/service_role, nunca pelo app)

### Fase C — Vendas, despesas, produtos e carteira de clientes ✅ *(concluída 2026-07-11)*
- [x] Tabelas `sales`, `expenses`, `products`, `crm_clients`, `cart_items` no Postgres — zero dado de negócio sobrando em localStorage
- [x] Vendas com `barber_id` (FK real, não mais nome em texto) e `appointment_id` opcional (liga a venda ao agendamento de origem, corrige um dedup frágil por nome+data que existia)
- [x] Estoque de produtos continua único/compartilhado entre barbeiros; decremento no checkout agora é atômico via função `decrement_product_stock` (RPC `security definer`) — testado sob concorrência, sem estoque negativo nem decremento duplicado
- [x] Carteira de clientes do barbeiro (`crm_clients`) fundida conceitualmente com a tabela real `clients`: cada barbeiro mantém sua própria carteira privada (RLS), mas com `client_id` opcional linkando pra conta real quando existe — resolve a duplicação de identidade sem quebrar o modelo "cada barbeiro só vê os próprios clientes"
- [x] Carrinho ativo (`cart_items`) também migrado — atendimento em andamento agora sincroniza entre aparelhos
- [x] Dashboard financeiro (gráficos, ranking, lucro líquido, relatório PDF) migrado com padrão "busca uma vez por período, agrega em memória" — evita 1 fetch por dia/mês dentro dos gráficos
- [x] Despesas e criação de produtos são admin-only por RLS de verdade (antes só escondido na UI, qualquer um podia chamar a função direto)
- [x] Testado ponta a ponta: checkout completo (venda + baixa de estoque + limpeza do carrinho), venda avulsa/balcão, atribuição de plano, corrida de estoque (RPC atômica segura), RLS negativo (vendas/despesas/carteira de outro barbeiro bloqueadas), renomear barbeiro sem propagar nome em nenhuma tabela nova
- Banco começou zerado; `sales`/`crm_clients` seguem sem policy de DELETE pelo app, mesma decisão da Fase B

### Fase D — Achievements, indicações e brindes ✅ *(concluída 2026-07-13)*
- [x] Migrar notificações (`primeNotifs`) pro banco — feito junto com o push da Fase 5, ver acima
- [x] Migrar achievements, indicações e brindes (gamificação da Fase 1/3) pro Supabase — última fatia de dado de negócio que ainda vivia em `localStorage`; mesmo bug de sincronização entre aparelhos que as fases anteriores corrigiram. Tabelas `achievements`/`referrals`/`loyalty_gifts`/`loyalty_gift_options`, RLS "dono vê/edita o próprio + barbeiro vê/edita qualquer um" (mesma postura de `clients`/`notifications`)
- [x] Corrigidas duas inconsistências que só apareceram ao migrar: achievements e indicações eram chaveados por **e-mail** (agora `client_id` uuid, como o resto do app); brindes eram chaveados **duas vezes** (nome no lado do barbeiro, e-mail no lado do cliente, com escrita duplicada pra manter sincronia) — agora uma única linha por `client_id`
- [x] Nova RPC `find_referral_owner` (`security definer`) — descoberta em teste ponta a ponta: cliente não consegue ler o perfil de outro cliente por RLS, então a busca do dono de um código de indicação (cliente lendo dado de outro cliente) precisava de uma função com privilégio elevado, mesmo padrão do `redeem_barber_invite` da Fase A
- [x] Brinde/indicação só são rastreáveis pra clientes com conta vinculada (`crm_clients.client_id` não nulo) — cliente de encaixe sem cadastro simplesmente não participa, mesma decisão já tomada pra notificações na Fase 5
- [x] Testado ponta a ponta: indicação completa (código → cadastro → vínculo), conquista "Embaixador" desbloqueada automaticamente, fila de conquistas pendentes consumida uma única vez, elegibilidade de brinde recalculada corretamente após marcar como dado, RLS negativo (cliente não lê/edita conquista ou brinde de outro), config de brindes (admin adiciona/remove opção)
- [ ] Filtro de clientes por período (semana/mês/intervalo) — hoje limitado pelo que dá pra fazer client-side; com banco fica trivial via query
- [ ] Backup automático / histórico não se perde ao limpar o navegador
- [ ] Drift de preço histórico no app do cliente (`caHistItemHtml` mostra o preço atual da tabela, não o valor realmente cobrado na época) — precisaria de uma coluna de preço na tabela `appointments`

### Hospedagem & Custos *(discutido 2026-07-08 — plano, nada contratado ainda)*
- [ ] Banco de dados: **Supabase** (grátis pra começar — 500MB cobre bem o volume de uma barbearia; se crescer muito, plano pago é ~US$25/mês). Zero administração de servidor — Supabase cuida de backup, segurança e atualização.
- [ ] Site: manter no **GitHub Pages** (já funciona, grátis) ou migrar pra **Vercel/Netlify** (também grátis, com a vantagem de deploy automático a cada `git push` + domínio próprio mais fácil de configurar). Não é obrigatório trocar.
- [ ] Domínio próprio (opcional): tipo `primebarbearia.com.br` via registro.br, ~R$40-60/ano — só estética/profissionalismo, não é necessário pro sistema funcionar.
- [ ] **Decisão explícita: NÃO comprar servidor próprio (VPS/dedicado).** Exigiria administrar sistema operacional, banco de dados, backup e segurança manualmente — trabalho de sysadmin em tempo integral, isso é overkill total pro tamanho do negócio. Um serviço gerenciado (Supabase) resolve tudo isso por uma fração do custo/risco.
- Custo total estimado: **R$0 pra começar** (Supabase free + Pages/Vercel/Netlify free), só o domínio opcional (~R$40-60/ano) se quiser; escalar pra ~R$125/mês (Supabase Pro) só quando o negócio já estiver crescendo o suficiente pra bancar fácil.

### LGPD e segurança
- [x] Política de privacidade ✅ *(2026-07-11)* — modal acessível pelo rodapé, cobre dados coletados, finalidade/base legal (art. 7º), compartilhamento (Supabase como operadora), retenção, direitos do titular (art. 18) e canal de contato. Baseada em pesquisa da Lei 13.709/2018 e Resolução CD/ANPD nº 2/2022 (regras simplificadas pra pequeno porte) — **rascunho informado, não é parecer jurídico; recomendo revisão de um advogado antes de tratar como definitiva**, principalmente se o negócio crescer ou passar a processar pagamento no site
- [x] Consentimento explícito no cadastro do cliente ✅ *(2026-07-11)* — checkbox próprio e destacado (não embutido em outro texto), obrigatório pra criar conta, conforme art. 9º
- [x] Minimização de dados — já coletamos só o essencial (nome, telefone, e opcionalmente idade/e-mail/Instagram); sem CPF, endereço completo ou dado sensível
- [x] Direito do cliente a solicitar exportação e exclusão dos próprios dados ✅ *(2026-07-11)* — no Perfil: "Exportar meus dados" baixa um JSON com perfil+agendamentos (self-service real, via RLS); "Solicitar exclusão da conta" formaliza o pedido por WhatsApp (exclusão em si continua manual — tabelas não têm policy de DELETE de propósito, decisão da Fase 6B pra preservar histórico)
- [x] Controle de acesso — RLS real no banco desde a Fase 6A/6B: cada barbeiro só lê/edita os próprios agendamentos; cliente só os próprios dados. *(nota: a policy `clients_readable_by_barbers` ainda deixa qualquer barbeiro logado ler o perfil de qualquer cliente, não só os que ele atendeu — considerar restringir numa fase futura)*
- [x] Criptografia em trânsito e em repouso — padrão do Supabase (TLS + AES-256), nenhuma configuração adicional necessária
- [x] Plano básico de resposta a incidente ✅ *(2026-07-11)* — ver `PLANO-RESPOSTA-INCIDENTE.md`: passo a passo de contenção, avaliação, comunicação a titulares/ANPD, e checklist de prevenção
- [x] **Vulnerabilidade corrigida** ✅ *(2026-07-12)* — a policy de leitura de `barber_invites` (`using (used_at is null)`) permitia que **qualquer visitante anônimo** listasse todos os convites em aberto via `select('*')` direto do console do navegador, incluindo o `code` e o `role` — expondo, entre outros, um convite de admin ainda não usado (risco de auto-registro como admin). Corrigido removendo a policy pública e trocando a validação client-side por uma RPC `security definer` (`redeem_barber_invite`) que só retorna `role`/`name_hint` pra um código exato, nunca lista a tabela. O convite exposto foi invalidado manualmente. Verificado depois: `select('*')` anônimo em `barber_invites` retorna 0 linhas.
- [x] **Bug corrigido** ✅ *(2026-07-13)* — descoberto ao testar a correção acima: o cadastro via convite nunca tinha funcionado de verdade, porque a RLS de `barbers` só permite `INSERT` por admin, mas quem precisa inserir a própria linha nesse fluxo é o barbeiro recém-convidado. Corrigido com outra RPC `security definer` (`complete_barber_invite`) que valida o código e insere a linha atomicamente. Testado ponta a ponta (convite → cadastro → login automático).

---

## ✅ Já Feito

- [x] Landing page responsiva com seções (proposta, serviços, equipe, contato)
- [x] Sistema de agendamento (wizard multi-step com escolha de serviço, barbeiro, dia, horário)
- [x] App do cliente (Minha Conta: próximo corte, histórico, planos, feedback)
- [x] App do barbeiro — Prime Staff (agenda, vendas, clientes, perfil)
- [x] Agenda visual com timeline e slots de horário
- [x] Sistema de encaixe (walk-in) com busca de cliente e notificação
- [x] Vendas com filtros (hoje/semana/mês/período), resumo diário, previsão
- [x] Comissão configurável por barbeiro
- [x] Horário de trabalho/folga por barbeiro por dia da semana
- [x] CRUD de barbeiros (editar/remover com cascata de rename)
- [x] Aba "Atendimento" — registra venda avulsa de balcão (cliente novo ou existente, serviço opcional, produtos opcionais, valor, horário de término — dá pra vender só produto, sem serviço nenhum)
- [x] Auto-push horário para GitHub
- [x] Booking wizard respeita horários individuais dos barbeiros
- [x] **Corrigido bug de fuso horário**: o app usava `toISOString().slice(0,10)` (converte pra UTC) pra descobrir "que dia é hoje" em ~16 lugares — entre ~21h e meia-noite (GMT-3), o sistema achava que já era o dia seguinte (afetava agenda, vendas "de hoje", dashboard, conquistas, brindes, relatórios). Criada `primeLocalDate()` que usa hora local de verdade, substituída em todo o código.

---

*Última atualização: 2026-07-13 (Fase D concluída — app 100% no Supabase, zero dado de negócio em localStorage)*
