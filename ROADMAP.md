# Prime Barbearia — Roadmap

> Objetivo: transformar a Prime na referência de barbearia digital em Maringá e região.
> Diferencial: app exclusivo com gamificação, fidelidade e experiência premium.

---

## 🏆 Fase 1 — Prime Club (Gamificação + Fidelidade)

### Conquistas / Stickers Colecionáveis
- [ ] Sistema base de conquistas (modelo de dados, storage, lógica de desbloqueio)
- [ ] Vitrine de stickers no perfil do cliente (grid visual com stickers bloqueados/desbloqueados)
- [ ] Animação de desbloqueio (confetti/brilho ao conquistar)
- [ ] Conquistas implementadas:
  - [ ] "Primeiro Corte" — primeiro agendamento realizado
  - [ ] "Fiel" — 5 cortes seguidos
  - [ ] "Madrugador" — agendou no primeiro horário do dia
  - [ ] "Combo Master" — fez Corte + Barba + Barbaterapia na mesma visita
  - [ ] "Veterano" — 1 ano de cliente
  - [ ] "Embaixador" — indicou um amigo (código de indicação)
  - [ ] "Nota 10" — deixou 5 avaliações
  - [ ] "VIP" — atingiu nível Ouro
- [ ] Sistema de níveis: Bronze → Prata → Ouro → Diamante
- [ ] Benefícios por nível (desconto %, prioridade de horário, brinde)

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
- [ ] Gráfico de barras — faturamento semanal
- [ ] Gráfico de linha — evolução mensal
- [ ] Meta mensal com barra de progresso "R$ X de R$ Y"
- [ ] Comparativo com mês anterior (% crescimento)

### Gestão Inteligente
- [ ] Ranking entre barbeiros (faturamento, avaliação, clientes atendidos)
- [ ] Alerta "cliente sumiu" — não vem há 30+ dias, sugerir contato
- [ ] Relatório mensal exportável (PDF ou compartilhar via WhatsApp)
- [ ] Agenda com cores por tipo de serviço

### Admin / Barbearia
- [ ] Dashboard geral da barbearia (todos os barbeiros consolidado)
- [ ] Controle de despesas básico (aluguel, produtos, etc.)
- [ ] Lucro líquido estimado (faturamento - despesas - comissões)

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
- [x] Auto-push horário para GitHub
- [x] Booking wizard respeita horários individuais dos barbeiros

---

*Última atualização: 2026-07-07*
