-- ST-3a.1 — índice de busca do CRM (nome / telefone).
--
-- `clients.name` e `clients.phone` não têm índice hoje → `ilike '%q%'` é seq
-- scan. Instala `pg_trgm` e cria índices GIN de trigrama para `name` + um
-- btree funcional de dígitos para telefone (prefixo, sem substring ampla).
--
-- ⚠️ ENTREGA NÃO TRANSACIONAL EM PRODUÇÃO. Aqui os índices são criados
-- NORMAIS (bloqueantes) — o lab tem < 100 linhas e o runner de migrations roda
-- cada arquivo numa transação (onde `CREATE INDEX CONCURRENTLY` falha com
-- 25001). Em PRODUÇÃO futura estes índices exigem `CREATE INDEX CONCURRENTLY`
-- como operação de manutenção SEPARADA (fora do runner, janela de baixo
-- tráfego, retry se `INVALID`), OU a alternativa "prefixo de nome + telefone
-- exato" com btree comum. Ver `prime-next/docs/investigacoes/11-staff-st3-crm.md`
-- §4.4.
--
-- Rollback:
--   drop index if exists public.clients_name_trgm;
--   drop index if exists public.clients_phone_digits_idx;
--   drop index if exists public.crm_clients_name_trgm;
--   drop index if exists public.crm_clients_phone_digits_idx;
--   drop index if exists public.appointments_client_name_lower_idx;
--   -- `pg_trgm` fica (pode ser usada por outros); `drop extension pg_trgm` só
--   -- no rollback total desta camada.
-- Impacto no legado: nenhum — só adiciona índices; nenhuma policy/grant/coluna.

create extension if not exists pg_trgm;

-- nome: trigrama para `lower(name) like '%q%'` (comportamento do legado)
create index if not exists clients_name_trgm
  on public.clients using gin (lower(name) gin_trgm_ops);
create index if not exists crm_clients_name_trgm
  on public.crm_clients using gin (lower(name) gin_trgm_ops);

-- telefone: dígitos normalizados (regexp_replace é IMMUTABLE) → btree de
-- prefixo. A RPC casa `digitos like 'q%'` / `'55'||'q%'`, nunca `%q%`.
create index if not exists clients_phone_digits_idx
  on public.clients (regexp_replace(coalesce(phone, ''), '\D', '', 'g') text_pattern_ops);
create index if not exists crm_clients_phone_digits_idx
  on public.crm_clients (regexp_replace(coalesce(phone, ''), '\D', '', 'g') text_pattern_ops);

-- histórico/frequência de walk-in casa por nome exato (lower)
create index if not exists appointments_client_name_lower_idx
  on public.appointments (lower(client_name));
