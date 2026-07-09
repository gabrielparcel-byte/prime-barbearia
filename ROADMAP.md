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
  - [ ] "Embaixador" — indicou um amigo *(dorme até o sistema de indicação, Fase 3)*
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
- [ ] Micro-animações nos botões (hover, press, loading)
- [ ] Transições suaves entre telas do app (slide/fade)
- [ ] Skeleton loading nos cards enquanto carrega dados
- [ ] Animação de entrada do logo ao abrir o app

### Refinamento de UI
- [ ] Glassmorphism refinado nos cards (efeito vidro fosco consistente)
- [ ] Tipografia e espaçamentos revisados para consistência
- [ ] Ícones SVG customizados (substituir emojis por ícones próprios)
- [ ] Paleta de cores revisada e documentada

### Responsividade
- [ ] Testar e ajustar todas as telas em 375px, 390px, 414px (iPhones)
- [ ] Testar em tablets (768px)
- [ ] PWA básico (manifest.json, ícone na home screen)

---

## 👤 Fase 3 — Experiência do Cliente

### Perfil e Histórico
- [ ] Timeline visual dos cortes anteriores (data, barbeiro, serviço, valor)
- [ ] "Meu estilo" — cliente salva fotos de referência de corte
- [ ] Barbeiro favorito com destaque no agendamento

### Avaliação e Feedback
- [ ] Notificação pós-corte pedindo avaliação (estrelas + comentário)
- [ ] Avaliações visíveis no perfil público do barbeiro
- [ ] Resposta do barbeiro à avaliação

### Indicação
- [ ] Código de indicação único por cliente
- [ ] Recompensa para quem indica e quem é indicado
- [ ] Contador de indicações no perfil

---

## 💈 Fase 4 — Área do Barbeiro (Dashboard)

### Financeiro Visual
- [x] Gráfico de barras — faturamento por dia (7/14/30 dias, seletor de período)
- [x] Gráfico de linha — evolução mensal (3/6/12 meses, seletor de período)
- [x] Meta mensal com barra de progresso "R$ X de R$ Y" (definida pelo admin por barbeiro)
- [x] Comparativo com mês anterior (% crescimento)

### Gestão Inteligente
- [x] Ranking entre barbeiros (atendimentos, feedbacks, resumo por serviço — só admin, ordenável, sem valores em R$)
- [ ] Alerta "cliente sumiu" — não vem há 30+ dias, sugerir contato
- [ ] Relatório mensal exportável (PDF ou compartilhar via WhatsApp)
- [ ] Agenda com cores por tipo de serviço

### Admin / Barbearia
- [ ] Dashboard geral da barbearia (todos os barbeiros consolidado)
- [ ] Controle de despesas básico (aluguel, produtos, etc.)
- [ ] Lucro líquido estimado (faturamento - despesas - comissões)
- [ ] Catálogo de produtos com estoque (cerveja, cremes, gel, etc.) — venda combinada com serviço na mesma nota *(decisões já tomadas, protótipo aprovado — ver nota abaixo)*

> **Nota — Produtos & Notas Combinadas** *(anotado 2026-07-08, aguardando sinal pra implementar)*
> Decisões já validadas com o Gabriel:
> - Produtos **têm controle de estoque** (quantidade abaixa a cada venda, avisa quando tá acabando)
> - Serviço e produto **entram juntos na mesma nota** (ex: corte + gel, um recibo só)
> - Cadastro/edição de produtos é **só admin** (mesmo padrão do brinde e da comissão)
> Protótipo visual aprovado: produto esgotado (estoque 0) não aparece na busca do atendimento; quantidade no carrinho trava no máximo do estoque disponível.
> Ideia de implementação (não codada ainda): criar catálogo `barberProducts` (admin-only, como o `primeBrindeOpts`), e reaproveitar o array de vendas existente adicionando `type:'servico'|'produto'`, `qty` e um `notaId` compartilhado entre os itens da mesma nota — assim Vendas/Dashboard/Ranking continuam funcionando sem mudança, pois já somam por `.value`/`.date`/`.barber` sem se importar com o tipo.

---

## 🚀 Fase 5 — Diferenciação Competitiva

### vs AppBarber
- [ ] QR Code no balcão → abre direto o app do cliente
- [ ] Notificações push (via service worker)
- [ ] Modo offline básico (ver agenda mesmo sem internet)
- [ ] Compartilhar conquista nas redes sociais (story template)

### Marketing
- [ ] Landing page com depoimentos reais
- [ ] Seção "Galeria" com fotos de cortes realizados
- [ ] Instagram feed integrado (embed posts)
- [ ] SEO otimizado para "barbearia Maringá"

---

## 🗄️ Fase 6 — Backend Real & Conformidade LGPD

> Contexto: hoje TUDO (roster de barbeiros, clientes, vendas, agendamentos, achievements, brindes) vive no `localStorage` do navegador. Isso significa que cada barbeiro só enxerga os próprios dados no próprio aparelho — não há sincronização entre dispositivos nem backup real. Essa fase é a maior mudança estrutural do projeto: não é um "adicional", é trocar a fundação de armazenamento.

### Migração de dados
- [ ] Escolher backend (recomendado: Supabase — Postgres gerenciado, tier grátis, SDK JS simples de plugar aos poucos, row-level security ajuda no controle de acesso por barbeiro/LGPD; alternativa: Firebase/Firestore, mas o formato dos dados aqui é mais relacional)
- [ ] Modelar tabelas: barbeiros, clientes, vendas, agendamentos, achievements, brindes (hoje já são objetos JS parecidos com linhas de tabela — migração é direta)
- [ ] Trocar todo `localStorage.getItem/setItem` por chamadas ao backend (maior esforço técnico da fase — toca praticamente todo o arquivo)
- [ ] Sincronização entre dispositivos (2 barbeiros em 2 celulares vendo os mesmos dados em tempo real)
- [ ] Filtro de clientes por período (semana/mês/intervalo) — hoje limitado pelo que dá pra fazer client-side; com banco fica trivial via query
- [ ] Backup automático / histórico não se perde ao limpar o navegador

### LGPD e segurança
- [ ] Política de privacidade (o que é coletado, por quê, por quanto tempo)
- [ ] Consentimento explícito no cadastro do cliente (checkbox de aceite)
- [ ] Minimização de dados — hoje já coletamos só o essencial (nome, telefone, e opcionalmente idade/e-mail/Instagram); manter esse princípio no banco
- [ ] Direito do cliente a solicitar exportação e exclusão dos próprios dados
- [ ] Controle de acesso — cada barbeiro só acessa a própria carteira de clientes (hoje já é assim client-side; no banco precisa virar regra de verdade, não só filtro visual)
- [ ] Criptografia em trânsito e em repouso (gerenciado automaticamente por Supabase/Firebase, mas confirmar configuração)
- [ ] Plano básico de resposta a incidente (o que fazer se vazar dado)

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
- [x] Aba "Atendimento" — registra venda avulsa de balcão (cliente novo ou existente, serviço, valor, horário de término)
- [x] Auto-push horário para GitHub
- [x] Booking wizard respeita horários individuais dos barbeiros

---

*Última atualização: 2026-07-08*
