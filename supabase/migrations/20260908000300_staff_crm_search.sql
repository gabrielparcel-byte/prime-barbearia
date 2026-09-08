-- ST-3a.3 — busca do CRM + lookup de conta para agendamento.
--
--   staff_crm_search(p_q, p_cursor, p_limit)  — CRM privado, escopado por papel
--   staff_lookup_account_for_booking(p_q)     — achar UMA conta p/ marcar horário
--
-- Contratos distintos e deliberadamente separados (proposta §4.1):
--   • CRM: barbeiro vê só a própria carteira + contas que já atendeu; admin e
--     vendas veem contas + carteiras. Devolve lista + cursor keyset.
--   • lookup: qualquer conta por termo, SÓ {id, nome, telefone_masc}, ≤ 5, sem
--     ficha/histórico/e-mail/idade/referral_code/financeiro. Substitui o
--     `buscarClientesConta` do Prime Next (elimina o SELECT direto em `clients`
--     do código novo). NÃO fecha `clients_readable_by_barbers` — o legado
--     continua usando a policy ampla até o cutover.
--
-- Ambas: `security definer`, `search_path=''`, `_crm_ctx()` no início,
-- termo mínimo (3 letras OU 4 dígitos) senão 0 linhas / 0 query pesada,
-- telefone por PREFIXO de dígitos normalizados (nunca `%q%`).
--
-- Rollback:
--   drop function public.staff_crm_search(text, text, int);
--   drop function public.staff_lookup_account_for_booking(text);
-- Impacto no legado: nenhum — funções novas; nenhuma policy/grant de tabela
-- alterada.

-- ── staff_crm_search ───────────────────────────────────────────────────────
create or replace function public.staff_crm_search(
  p_q      text,
  p_cursor text default null,
  p_limit  int  default 20
)
returns table(
  ref                text,
  nome               text,
  telefone_masc      text,
  tipo               text,
  ultimo_atendimento date,
  na_carteira        boolean,
  next_cursor        text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_role   text := public._crm_ctx();
  v_q      text := btrim(coalesce(p_q, ''));
  v_dig    text := public._crm_digits(v_q);
  v_phone  boolean;
  v_name   text := lower(v_q);
  v_lim    int  := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_ck     text;
  v_ck_nom text := '';
  v_ck_ref text := '';
begin
  if length(v_dig) >= 4 then
    v_phone := true;
  elsif length(v_q) >= 3 then
    v_phone := false;
  else
    return;  -- termo curto → nada, sem varrer
  end if;

  if p_cursor is not null and p_cursor <> '' then
    begin
      v_ck     := convert_from(decode(p_cursor, 'base64'), 'utf8');
      v_ck_nom := split_part(v_ck, chr(31), 1);
      v_ck_ref := split_part(v_ck, chr(31), 2);
      if v_ck_ref = '' then raise exception 'bad'; end if;
    exception when others then
      raise exception 'BAD_INPUT' using errcode = 'P0001';
    end;
  end if;

  return query
  with hits as (
    -- CONTAS visíveis ao papel
    select
      ('conta:' || c.id::text)                    as h_ref,
      coalesce(c.name, c.email, 'Cliente')        as h_nome,
      c.phone                                     as h_phone,
      'conta'::text                               as h_tipo,
      c.id                                        as h_cid,
      exists (
        select 1 from public.crm_clients cc
        where cc.client_id = c.id and cc.barber_id = v_uid
      )                                           as h_carteira
    from public.clients c
    where (
        v_role in ('admin', 'vendas')
        or exists (select 1 from public.appointments a
                   where a.client_id = c.id and a.barber_id = v_uid)
        or exists (select 1 from public.crm_clients cc
                   where cc.client_id = c.id and cc.barber_id = v_uid)
      )
      and (
        case when v_phone
          then regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like v_dig || '%'
            or regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like '55' || v_dig || '%'
          else lower(coalesce(c.name, '')) like '%' || v_name || '%'
        end
      )

    union all

    -- WALK-INS (crm_clients sem client_id — linhas ligadas a conta aparecem
    -- acima, via `clients`, para de-dup)
    select
      ('crm:' || cc.id::text),
      cc.name,
      cc.phone,
      'walkin'::text,
      null::uuid,
      (cc.barber_id = v_uid)
    from public.crm_clients cc
    where cc.client_id is null
      and (v_role in ('admin', 'vendas') or cc.barber_id = v_uid)
      and (
        case when v_phone
          then regexp_replace(coalesce(cc.phone, ''), '\D', '', 'g') like v_dig || '%'
            or regexp_replace(coalesce(cc.phone, ''), '\D', '', 'g') like '55' || v_dig || '%'
          else lower(cc.name) like '%' || v_name || '%'
        end
      )
  ),
  page as (
    select
      h.h_ref, h.h_nome, h.h_phone, h.h_tipo, h.h_cid, h.h_carteira,
      (
        select max(a.day) from public.appointments a
        where a.status <> 'cancelado'
          and (v_role in ('admin', 'vendas') or a.barber_id = v_uid)
          and (
            (h.h_cid is not null and a.client_id = h.h_cid)
            or (h.h_cid is null and lower(a.client_name) = lower(h.h_nome)
                and a.barber_id = v_uid)
          )
      ) as h_ultimo
    from hits h
    where (p_cursor is null or p_cursor = '')
       or (lower(h.h_nome), h.h_ref) > (v_ck_nom, v_ck_ref)
    order by lower(h.h_nome), h.h_ref
    limit v_lim + 1
  ),
  numbered as (
    select p.*, row_number() over (order by lower(p.h_nome), p.h_ref) as rn
    from page p
  )
  select
    n.h_ref,
    n.h_nome,
    public._mask_phone(n.h_phone),
    n.h_tipo,
    n.h_ultimo,
    n.h_carteira,
    case
      when (select count(*) from numbered) > v_lim and n.rn = v_lim
        then encode(convert_to(lower(n.h_nome) || chr(31) || n.h_ref, 'utf8'), 'base64')
      else null
    end
  from numbered n
  where n.rn <= v_lim
  order by lower(n.h_nome), n.h_ref;
end;
$$;

revoke execute on function public.staff_crm_search(text, text, int)
  from public, anon, authenticated, service_role;
grant execute on function public.staff_crm_search(text, text, int) to authenticated;

-- ── staff_lookup_account_for_booking ───────────────────────────────────────
create or replace function public.staff_lookup_account_for_booking(p_q text)
returns table(id uuid, nome text, telefone_masc text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := public._crm_ctx();
  v_q    text := btrim(coalesce(p_q, ''));
  v_dig  text := public._crm_digits(v_q);
begin
  if length(v_dig) >= 4 then
    return query
      select c.id, coalesce(c.name, c.email, 'Cliente'), public._mask_phone(c.phone)
      from public.clients c
      where regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like v_dig || '%'
         or regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like '55' || v_dig || '%'
      order by c.name nulls last, c.id
      limit 5;
  elsif length(v_q) >= 3 then
    return query
      select c.id, coalesce(c.name, c.email, 'Cliente'), public._mask_phone(c.phone)
      from public.clients c
      where lower(coalesce(c.name, '')) like '%' || lower(v_q) || '%'
      order by c.name nulls last, c.id
      limit 5;
  else
    return;  -- termo curto → nada
  end if;
end;
$$;

revoke execute on function public.staff_lookup_account_for_booking(text)
  from public, anon, authenticated, service_role;
grant execute on function public.staff_lookup_account_for_booking(text) to authenticated;
