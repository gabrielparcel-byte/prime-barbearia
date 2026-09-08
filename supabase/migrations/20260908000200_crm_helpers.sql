-- ST-3a.2 — helpers internos do CRM (owner-only).
--
--   _crm_ctx()      — gate de staff: auth + papel + is_barber. barbeiro
--                     desativado (is_barber=false) → NOT_STAFF (D-ST3-5).
--                     admin/vendas (is_barber=false por natureza) passam.
--   _mask_phone(t)  — '(DD) *****-1234' (DDD + 4 últimos; resto oculto).
--   _mask_email(t)  — 'j***@dominio.com'.
--   _crm_digits(t)  — dígitos do termo, tira DDI 55 quando 12+ dígitos.
--
-- Todos: `security definer`, `set search_path = ''`, `revoke execute` de toda
-- role externa (só as 3 RPCs públicas, owner, os chamam). Erros P0001.
--
-- Rollback:
--   drop function public._crm_ctx();
--   drop function public._mask_phone(text);
--   drop function public._mask_email(text);
--   drop function public._crm_digits(text);
-- Impacto no legado: nenhum — funções novas, sem grant externo.

-- ── _crm_ctx — gate de staff do CRM ────────────────────────────────────────
create or replace function public._crm_ctx()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
  v_isb  boolean;
begin
  if v_uid is null then
    raise exception 'NOT_AUTH' using errcode = 'P0001';
  end if;
  select role, is_barber into v_role, v_isb
  from public.barbers where id = v_uid;
  if v_role is null then
    raise exception 'NOT_STAFF' using errcode = 'P0001';
  end if;
  -- D-ST3-5: barbeiro com is_barber=false ("não atende") não acessa o CRM.
  -- admin/vendas têm is_barber=false por natureza — liberados.
  if v_role = 'barbeiro' and v_isb is not true then
    raise exception 'NOT_STAFF' using errcode = 'P0001';
  end if;
  return v_role;
end;
$$;

revoke execute on function public._crm_ctx()
  from public, anon, authenticated, service_role;

-- ── _mask_phone ────────────────────────────────────────────────────────────
create or replace function public._mask_phone(p text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if p is null or v_d = '' then return null; end if;
  -- tira DDI 55 (12+ dígitos)
  if length(v_d) >= 12 and left(v_d, 2) = '55' then v_d := substr(v_d, 3); end if;
  if length(v_d) < 4 then return '****'; end if;
  if length(v_d) >= 10 then
    return '(' || substr(v_d, 1, 2) || ') *****-' || right(v_d, 4);
  end if;
  return '*****-' || right(v_d, 4);
end;
$$;

revoke execute on function public._mask_phone(text)
  from public, anon, authenticated, service_role;

-- ── _mask_email ────────────────────────────────────────────────────────────
create or replace function public._mask_email(p text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  if p is null or position('@' in p) = 0 then return null; end if;
  return left(split_part(p, '@', 1), 1) || '***@' || split_part(p, '@', 2);
end;
$$;

revoke execute on function public._mask_email(text)
  from public, anon, authenticated, service_role;

-- ── _crm_digits — dígitos do termo (tira DDI 55 quando 12+) ─────────────────
create or replace function public._crm_digits(p text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if length(v_d) >= 12 and left(v_d, 2) = '55' then v_d := substr(v_d, 3); end if;
  return v_d;
end;
$$;

revoke execute on function public._crm_digits(text)
  from public, anon, authenticated, service_role;
