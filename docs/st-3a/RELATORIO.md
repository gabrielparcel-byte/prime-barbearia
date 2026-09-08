# ST-3a · CRM de clientes do staff (só leitura) — Relatório do lab

status: **4 migrations escritas e aplicadas SÓ no lab self-hosted. Produção
intocada. Sem `db push`. Sem merge. `clients_readable_by_barbers` e os grants de
escrita de `clients`/`crm_clients` INALTERADOS (higiene reservada ao cutover).**
branch: `staff/st-3a` (repo `prime-barbearia`), sobre `8fca9aa` (ST-2.7)
data: 2026-09-08
proposta (aprovada, rev.1 `99abd18`): `prime-next@proposta/staff-st3-crm:docs/investigacoes/11-staff-st3-crm.md`
UI: `prime-next@fatia/staff-st3a-crm` — rota `/painel/clientes` + `[ref]`, só leitura
depende de: ST-H (`barber_role()`, coluna `is_barber`), base (`clients`,
`crm_clients.client_id`, `appointments.client_id`).

**Resultado da matriz: `48 OK / 0 FAIL`** (`scripts/st3a-crm-matriz.mjs` —
V papel · AB isolamento · C vendas-sem-financeiro · D admin-sem-sensível ·
P privacidade por campo · E1–E6 anti-enumeração · EV evidências).

Regressões, todas verdes (ordem canônica `agenda → sth-gate1 → st1b → st1b4 →
st1b5 → st2 → st3a`):

| suíte | resultado |
|---|---|
| `scripts/st3a-crm-matriz.mjs` (ST-3a) | **48 OK / 0 FAIL** |
| `scripts/agenda-lab-matriz.mjs` | **40 OK / 0 FAIL** |
| `scripts/sth-gate1-matriz.mjs` (ST-H) | **158 OK / 0 FAIL** |
| `scripts/st1b-lab-matriz.mjs` (ST-1b) | **85 OK / 0 FAIL** (E18 = flake de relógio do harness ST-1b, sem relação — ver RELATORIO da ST-2 §9) |
| `scripts/st1b4-concurrency-matriz.mjs` | **28 OK / 0 FAIL** |
| `scripts/st1b5-agenda-lock-matriz.mjs` | **26 OK / 0 FAIL** |
| `scripts/st2-checkout-matriz.mjs` (ST-2) | **103 OK / 0 FAIL** |
| `prime-next` `check` + `build` | verdes |
| `prime-next` `test:staff-st3a-lab` (REST) · `test:staff-st1b-lab` (após trocar `buscarClientesConta`) · `shots:staff-st3a` (E2E) | verdes |

Lab termina com **37 appointments / 64 sales / 16 clients / 83 crm_clients** —
sem objeto/dado de teste desta tarefa. As 3 RPCs + 4 helpers + 5 índices ficam
**aplicados** (rollout lab-first, igual à ST-H/ST-1b/ST-2).

---

## 1. Numeração

Última migration real aplicada: `20260831001600` (ST-2.7). Data corrente
2026-09-08 → prefixo **`20260908`**, faixa `000100+`. Ordena depois de toda a
ST-2; **não** depende do cutover (`20260829010000`) e **não** o toca.

| # | arquivo | o quê | rollback |
|---|---|---|---|
| **ST-3a.1** | `20260908000100_crm_search_index.sql` | `create extension if not exists pg_trgm`; índices GIN de trigrama em `lower(name)` de `clients`/`crm_clients`; btree funcional de dígitos normalizados (`regexp_replace(phone,'\D','','g')`, IMMUTABLE) para prefixo de telefone; btree `lower(client_name)` em `appointments`. **Índices NORMAIS (não `CONCURRENTLY`)** — o lab tem < 100 linhas e o runner roda cada arquivo numa transação. **Produção futura exige `CREATE INDEX CONCURRENTLY` como operação SEPARADA** (fora do runner, janela de baixo tráfego, retry se `INVALID`) OU a alternativa prefixo/exato — ver proposta §4.4. | `drop index if exists …` (×5); `pg_trgm` fica |
| **ST-3a.2** | `20260908000200_crm_helpers.sql` | `_crm_ctx()` — gate de staff (auth + `barber_role()` + `is_barber`: barbeiro com `is_barber=false` → `NOT_STAFF`, D-ST3-5; admin/vendas passam). `_mask_phone(text)` → `(DD) *****-1234`. `_mask_email(text)` → `j***@dominio`. `_crm_digits(text)` → dígitos, tira DDI 55 quando ≥ 12. Todos `secdef`, `search_path=''`, **owner-only** (`revoke` de toda role externa, sem grant). | `drop function` (×4) |
| **ST-3a.3** | `20260908000300_staff_crm_search.sql` | **`staff_crm_search(text, text, int)`** — CRM privado: escopo por papel (admin/vendas: contas + carteiras; **barbeiro: só a própria carteira + contas que já atendeu**); termo ≥ 3 letras OU ≥ 4 dígitos senão 0 linhas; nome por `lower(name) like '%q%'`, telefone por PREFIXO de dígitos normalizados (`… like v_dig \|\| '%'` e `'55' \|\| v_dig \|\| '%'`, nunca `%q%`); de-dup por `client_id`; telefone mascarado; `LIMIT 20` (clamp) + **cursor keyset opaco** (`base64(lower(nome) ‖ US ‖ ref)`, `> (nome, ref)`, sem `OFFSET`). **`staff_lookup_account_for_booking(text)`** — contrato separado (agendamento): `clients` apenas, **≤ 5**, `{id, nome, telefone_masc}` só, termo mínimo. Ambas `secdef`, `search_path=''`, `revoke all` + `grant authenticated`. | `drop function` (×2) |
| **ST-3a.4** | `20260908000400_staff_crm_ficha.sql` | **`staff_crm_ficha(text, text)`** — `p_ref` `conta:<uuid>` \| `crm:<bigint>`; autorização não-vaza-posse (`NOT_FOUND` — admin/vendas livre; barbeiro: carteira dele OU atendeu a conta); devolve `identificacao` (nome/tipo/tem_conta/na_carteira), `contato` (**telefone e e-mail SEMPRE mascarados**; `age` `null` para vendas — D-ST3-6), `proximo`, `historico` (paginado por dia; `notes` `null` para vendas; keyset `p_hist_cursor='YYYY-MM-DD'` → modo só-histórico), `recorrencia` (`visitas` = `concluido`, `servicos_top` top-3, `barbeiro_top` só cross-barbeiro, `favorito_declarado` = `clients.favorite_barber`). **SEM bloco `financeiro`/`gasto`** (D-ST3-4), **SEM `plano`** (D-ST3-7). **Nunca** `join auth.users`/`sale_payments`/`fiado_charges`/`referral_code`/`rating*` (provado por EV/P). `secdef`, `search_path=''`, `revoke all` + `grant authenticated`. | `drop function` |

`git diff 8fca9aa..HEAD`: as 4 migrations + `scripts/st3a-crm-matriz.mjs` +
`docs/st-3a/RELATORIO.md`. **Nenhuma** policy/grant/coluna existente alterada.

---

## 2. Contrato — 3 RPCs, propósitos distintos (proposta §4.1)

| RPC | propósito | escopo | devolve |
|---|---|---|---|
| `staff_crm_search` | **CRM privado** — quem já é cliente do staff | carteira + atendidos (barbeiro) / todos (admin/vendas) | lista + cursor |
| `staff_crm_ficha` | ficha completa de 1 cliente | idem, por `ref` explícito | jsonb curado |
| `staff_lookup_account_for_booking` | **achar UMA conta p/ marcar horário** | qualquer conta por termo | ≤ 5 mínimos, sem ficha |

O `staff_lookup_account_for_booking` **substitui `buscarClientesConta`** no
`prime-next` — o código novo deixa de ter `SELECT` direto em `clients`. **Não
fecha `clients_readable_by_barbers`** — o `#barberApp` legado continua usando a
policy ampla até o cutover.

---

## 3. Matriz `48 OK / 0 FAIL` (resumo)

- **V1** admin busca prefixo → contas + walk-ins de qualquer barbeiro (6 hits).
- **V2** barbeiro A acha conta que atendeu (de-dup: 1 entrada, `tipo=conta`,
  `cart=true`); ficha com histórico **só de A** (2 concluídos + 1 confirmado; a
  visita antiga de B fica de fora); `visitas=2`; `barbeiro_top=null`.
- **V3** barbeiro A busca conta que só B atendeu → **0**.
- **V4** barbeiro A busca walk-in da carteira de B → **0**.
- **V5** barbeiro A busca walk-in da própria carteira → acha, `tipo=walkin`.
- **V6/V7** vendas: acha contas/carteiras; ficha com histórico (via
  `appointments_vendas_read`), **`age=null`**, **`notes` ausente**, sem
  `financeiro`, sem `plano`.
- **V8** cliente (linha só em `clients`) chama `staff_crm_search` por REST →
  HTTP 400 `{code:'P0001', message:'NOT_STAFF'}`.
- **V9** anon chama `staff_crm_ficha` por REST → permission denied.
- **V10** barbeiro `is_barber=false` → **`NOT_STAFF`** nas 3 RPCs.
- **V11** `staff_lookup` por barbeiro A acha conta que A **nunca atendeu** (≤ 5).
- **V12** `staff_lookup` devolve **só** `{id, nome, telefone_masc}` (chaves
  provadas); telefone mascarado.
- **AB** A abre ficha de conta atendida só por B → `NOT_FOUND`; A abre a que
  **ele** atendeu → OK; A abre walk-in da carteira de B → `NOT_FOUND`; A abre a
  própria carteira ligada (`crm:` ref) → `tipo=conta`, `tem_conta`, `na_carteira`.
- **C** ficha **nunca** traz bloco financeiro/gasto — nem para admin.
- **D** ficha admin não contém `cost`/`unit_price`/`discount_motivo`/`nota_id`/
  `nsu`/`bandeira`/`parcelas`/`fiado`/`referral_code`/`REF-J`/`rating*`; e-mail
  e telefone só mascarados.
- **P** telefone `(DD) *****-NNNN`; e-mail `x***@dominio`; barbeiro vê idade;
  vendas não; vendas não vê `notes`; barbeiro vê a própria nota; `referral`
  ausente; `plano`/`gasto`/`financeiro` ausentes; **grep no corpo das 3 RPCs:
  zero `auth.users` / `auth.identities` / `sale_payments` / `fiado_charges` /
  `.cost`**.
- **E1** termo vazio / 2 letras / 3 dígitos → `[]` (0 query pesada); lookup idem.
- **E2** `p_limit=9999` → clamp 20 + `next_cursor`; 2ª página com o cursor
  keyset traz os 5 restantes, sem repetir.
- **E3** cursor forjado (base64 lixo) → `BAD_INPUT`.
- **E4** loop de buscas `a..z` por barbeiro A **nunca** traz cliente/walk-in
  fora do escopo dele.
- **E5** telefone por PREFIXO: `449999111` casa Joao; `9999` (no meio de vários
  telefones) **não** casa por substring; `449988` casa Maria (DDI 55 removido).
- **E6** `staff_lookup` com 8 casos → devolve **no máximo 5**.
- **EV** 3 RPCs públicas `secdef`+`search_path=""`+`grant authenticated`; 4
  helpers `secdef`+`search_path=""`+owner-only; **`clients_readable_by_barbers`
  inalterada** (regex do baseline); **grants de escrita de `clients` intactos**
  (`INSERT/UPDATE/DELETE` ainda p/ `authenticated`); índices de busca criados.

---

## 4. Decisões de implementação

- **Telefone: prefixo de dígitos normalizados, nunca substring.** `_crm_digits`
  tira DDI 55; o match é `digitos_col like v_dig || '%'` (e `'55' || v_dig`).
  Índice funcional `regexp_replace(coalesce(phone,''),'\D','','g') text_pattern_ops`
  (btree — `regexp_replace` é IMMUTABLE, `normalize_phone_br` NÃO foi tocada).
- **Nome: `lower(name) like '%q%'`** (comportamento do legado) apoiado no GIN
  trigrama. Mínimo 3 caracteres.
- **De-dup conta × carteira:** `staff_crm_search` lista contas de `clients` +
  walk-ins de `crm_clients` **onde `client_id is null`** — uma carteira ligada
  aparece via `clients` com `na_carteira=true`. A ficha aceita `conta:` **e**
  `crm:` (a `crm:` ligada resolve para a conta).
- **`is_barber=false`:** `admin`/`vendas` têm `is_barber=false` por natureza;
  só barbeiro com `is_barber=false` (desativado) é bloqueado — `_crm_ctx()`
  checa `role = 'barbeiro' AND is_barber IS NOT TRUE`.
- **Cursor keyset opaco:** `base64(lower(nome) ‖ chr(31) ‖ ref)`, comparação
  `(lower(nome), ref) > (ck_nome, ck_ref)`, `LIMIT 20+1`. Sem `OFFSET` (evita
  varredura crescente). Cursor malformado → `BAD_INPUT`.
- **Histórico paginado:** keyset por dia (`p_hist_cursor='YYYY-MM-DD'`); a
  chamada com cursor devolve **só** `{historico, historico_next}` (não re-monta
  a ficha). Boundary de mesmo-dia entre 20ª/21ª linha: rara, inofensiva
  (documentada no corpo).
- **`sales` intocada.** A ficha **não** consulta `sales`/`sale_payments`/
  `fiado_*` (a RPC roda como owner mas o corpo não os referencia — provado por
  P/EV). "Gasto" volta na ST-3b.

---

## 5. Ordem de execução das matrizes

Igual à ST-2 §6: `agenda → sth-gate1 → st1b → st1b4 → st1b5 → st2 → st3a`.
`st3a-crm-matriz.mjs` re-aplica `barber_role` + ST-1b.4/.5 + ST-2.1–7 +
ST-3a.1–4 no início — **rodá-la por último restaura a consistência total do
lab** (37/64/16/83).

---

## 6. Rollback (ordem reversa)

```sql
-- ST-3a.4
drop function public.staff_crm_ficha(text, text);
-- ST-3a.3
drop function public.staff_crm_search(text, text, int);
drop function public.staff_lookup_account_for_booking(text);
-- ST-3a.2
drop function public._crm_ctx();
drop function public._mask_phone(text);
drop function public._mask_email(text);
drop function public._crm_digits(text);
-- ST-3a.1
drop index if exists public.clients_name_trgm;
drop index if exists public.clients_phone_digits_idx;
drop index if exists public.crm_clients_name_trgm;
drop index if exists public.crm_clients_phone_digits_idx;
drop index if exists public.appointments_client_name_lower_idx;
-- pg_trgm: `drop extension pg_trgm` só no rollback total (pode ter outros usos).
```

Nenhuma linha de dados criada por estas migrations. Nenhuma policy/grant/coluna
existente alterada → o rollback é puro `drop`.

---

## 7. Fronteiras respeitadas

- Só o lab self-hosted. **Produção intocada.** Sem `db push` remoto. Sem merge.
- `20260829010000_agenda_cutover.sql` continua **não aplicada**.
- `master` do legado **não** recebe as migrations ST-H/ST-1b/ST-2/ST-3a.
- **`clients_readable_by_barbers` INALTERADA** e **grants de escrita de
  `clients`/`crm_clients` INTACTOS** — o `#barberApp` legado (perfil do cliente,
  `baCreateCrmClient`, carteira, `baAtSearchClient`) continua funcionando. Toda
  a higiene (drop policy + revoke) fica reservada ao **cutover de staff/legado**
  (proposta §5.5).
- `.env`/segredos/artefatos fora dos commits. Os 6 arquivos staged pré-existentes
  do repo (`.claude/skills/…`, `CLAUDE.md`, `Flayers/*`, `package-lock.json`)
  **não** entram no commit (pathspec).
