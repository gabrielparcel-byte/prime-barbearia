/**
 * ST-3a · matriz do CRM de clientes do staff (só leitura) contra o LAB
 * (localhost:8100 / supabase-db).
 *
 * Cobre as 4 migrations `20260908000100..000400`:
 *   pg_trgm + índices · _crm_ctx/_mask_phone/_mask_email/_crm_digits ·
 *   staff_crm_search · staff_lookup_account_for_booking · staff_crm_ficha.
 *
 * - V : matriz por papel (admin / barbeiro A·B / vendas / cliente / anon /
 *       barbeiro desativado) + lookup separado (V11/V12)
 * - AB: isolamento A/B (barbeiro não lê ficha de cliente de outro)
 * - C : vendas sem policy de `sales` → ficha nunca tem financeiro
 * - D : admin — nada de cost/unit_price/payments/fiado/referral/rating/auth
 * - P : privacidade por campo (mascaramento, ausências)
 * - E : anti-enumeração (termo mínimo, clamp de limite, cursor forjado,
 *       telefone por prefixo, lookup ≤ 5)
 * - EV: evidências (secdef / search_path / grants / sem join em auth.users)
 *
 * Re-aplica barber_role + ST-1b.4/.5 + ST-2.1–7 + ST-3a.1–4 (idempotente) e
 * deixa APLICADAS. Semeia usuários/agendamentos/carteiras de teste e LIMPA no
 * fim — lab volta a 37 appts / 64 sales / 16 clients / 83 crm_clients.
 * Nunca toca produção / db push / cutover.
 *
 * Uso: node scripts/st3a-crm-matriz.mjs
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const LAB = 'http://localhost:8100'
const MIG = new URL('../supabase/migrations/', import.meta.url)
const FILES = [
  '20260830000000_barber_role.sql',
  '20260831000400_staff_write_row_lock.sql',
  '20260831000500_agenda_lock_protocol.sql',
  '20260831001000_sales_nota_sequence.sql',
  '20260831001100_st2_schema.sql',
  '20260831001200_checkout_helpers.sql',
  '20260831001300_staff_cart_rpcs.sql',
  '20260831001400_staff_checkout.sql',
  '20260831001500_checkout_grants_hygiene.sql',
  '20260831001600_checkout_input_guards.sql',
  '20260908000100_crm_search_index.sql',
  '20260908000200_crm_helpers.sql',
  '20260908000300_staff_crm_search.sql',
  '20260908000400_staff_crm_ficha.sql',
]
const AK = readFileSync('/home/gabrielparcel/projetos/prime-next/.env.local', 'utf8')
  .split('\n').find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1].trim()
const anonH = { apikey: AK, 'Content-Type': 'application/json' }

const PSQL = ['exec', '-i', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-qtAX', '-v', 'ON_ERROR_STOP=1']
const psql = (s) => execFileSync('docker', PSQL, { input: s, encoding: 'utf8' }).trim()
const psqlNotice = (sql) => execFileSync('bash', ['-c',
  'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qX 2>&1'], { input: sql, encoding: 'utf8' })
const psqlFile = (p) => psqlNotice(readFileSync(p, 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const reloadPgrst = async () => { psql("notify pgrst, 'reload schema';"); await sleep(500) }

const wrapAs = (uid, sql) => {
  const claims = uid ? `{"sub":"${uid}","role":"authenticated"}` : `{"role":"anon"}`
  return `begin;\nset local role ${uid ? 'authenticated' : 'anon'};\nset local request.jwt.claims to '${claims}';\n${sql}\ncommit;`
}
const callAs = (uid, sql) => execFileSync('docker', PSQL, { input: wrapAs(uid, sql), encoding: 'utf8' }).trim()
const tryAs = (uid, sql) => {
  try { return { ok: true, out: callAs(uid, sql) } }
  catch (e) { return { ok: false, err: ((e.stderr || '') + (e.stdout || '') || e.message).toString() } }
}
const j = (r) => { try { return JSON.parse(r.out) } catch { return null } }

const rid = Math.random().toString(36).slice(2, 7)
const PFX = `st3a-${rid}`
let pass = 0, fail = 0
const ok = (n, c, extra = '') => {
  c ? pass++ : fail++
  console.log(`  ${c ? 'OK  ' : 'FAIL'} ${n}${extra ? `  — ${String(extra).replace(/\s+/g, ' ').slice(0, 180)}` : ''}`)
}
const CODES = /NOT_AUTH|NOT_STAFF|NOT_FOUND|BAD_INPUT|permission denied/
const errOf = (m) => (String(m).match(CODES) || ['?'])[0]

// helpers de chamada
const SEARCH = (q, cur = null, lim = 20) =>
  `select coalesce(jsonb_agg(jsonb_build_object('ref',ref,'nome',nome,'tel',telefone_masc,'tipo',tipo,'ult',ultimo_atendimento,'cart',na_carteira,'nc',next_cursor) order by nome),'[]') from public.staff_crm_search(${q === null ? 'null' : `'${q}'`}, ${cur === null ? 'null' : `'${cur}'`}, ${lim});`
const LOOKUP = (q) =>
  `select coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',nome,'tel',telefone_masc)),'[]') from public.staff_lookup_account_for_booking(${q === null ? 'null' : `'${q}'`});`
const FICHA = (ref, cur = null) =>
  `select public.staff_crm_ficha('${ref}'${cur ? `, '${cur}'` : ''});`

let A, B, ADM, VEND, DES, CLI            // uids
let CC1, CC2, CC3, CCd                   // client uuids (contas)
let W_A, W_B                             // crm_clients ids (walk-ins)
let W_A_LINK                             // crm_clients id ligado a CC1 na carteira de A

async function signup(tag) {
  const email = `${PFX}-${tag}@prime-lab.local`
  const r = await fetch(`${LAB}/auth/v1/signup`, { method: 'POST', headers: anonH, body: JSON.stringify({ email, password: 'Test-1234!' }) })
  const d = await r.json()
  if (!d.user?.id) throw new Error(`signup ${tag}: ${JSON.stringify(d)}`)
  return { uid: d.user.id, email, token: d.access_token }
}

async function seed() {
  const a = await signup('a'); const b = await signup('b'); const adm = await signup('adm')
  const v = await signup('v'); const des = await signup('des'); const cli = await signup('cli')
  A = a.uid; B = b.uid; ADM = adm.uid; VEND = v.uid; DES = des.uid; CLI = cli.uid
  global.CLI_TOKEN = cli.token
  psql(`insert into public.barbers (id,name,email,role,is_barber,commission_pct) values
    ('${A}','${PFX} BarbA','${a.email}','barbeiro',true,0.6),
    ('${B}','${PFX} BarbB','${b.email}','barbeiro',true,0.6),
    ('${ADM}','${PFX} Adm','${adm.email}','admin',false,null),
    ('${VEND}','${PFX} Vend','${v.email}','vendas',false,null),
    ('${DES}','${PFX} Desativado','${des.email}','barbeiro',false,0.6);`)
  // contas
  CC1 = psql(`insert into public.clients (id,email,name,phone,age,instagram,referral_code) values
    ('${(await signup('c1')).uid}','${PFX}-c1@x','${PFX} Joao Atendido','44999911111',33,'@joao','REF-J') returning id;`)
  CC2 = psql(`insert into public.clients (id,email,name,phone,age) values
    ('${(await signup('c2')).uid}','${PFX}-c2@x','${PFX} Maria Vendas','5544998822222',28) returning id;`)
  CC3 = psql(`insert into public.clients (id,email,name,phone) values
    ('${(await signup('c3')).uid}','${PFX}-c3@x','${PFX} Pedro SoB','44999933333') returning id;`)
  CCd = psql(`insert into public.clients (id,email,name,phone) values
    ('${(await signup('cd')).uid}','${PFX}-cd@x','${PFX} Ana Livre','44999944444') returning id;`)
  // A atendeu CC1 (2x concluído + 1 futuro confirmado, 1 com nota) e CC2 (1x)
  psql(`insert into public.appointments (client_id,barber_id,services,day,day_label,time,duration,status,client_name,notes) values
    ('${CC1}','${A}',array['Corte Degradê'],current_date-20,'x','10:00',45,'concluido','${PFX} Joao Atendido','nota interna do A'),
    ('${CC1}','${A}',array['Corte Degradê','Barba'],current_date-5,'x','11:00',60,'concluido','${PFX} Joao Atendido',null),
    ('${CC1}','${A}',array['Corte Degradê'],current_date+3,'x','15:00',45,'confirmado','${PFX} Joao Atendido',null),
    ('${CC2}','${A}',array['Corte Social'],current_date-3,'x','09:00',30,'concluido','${PFX} Maria Vendas',null),
    ('${CC1}','${B}',array['Barba'],current_date-40,'x','16:00',30,'concluido','${PFX} Joao Atendido',null),
    ('${CC3}','${B}',array['Barba'],current_date-2,'x','14:00',30,'concluido','${PFX} Pedro SoB',null);`)
  // walk-ins
  W_A = psql(`insert into public.crm_clients (barber_id,client_id,name,phone) values ('${A}',null,'${PFX} Walkin A','44988877777') returning id;`)
  W_B = psql(`insert into public.crm_clients (barber_id,client_id,name,phone) values ('${B}',null,'${PFX} Walkin B','44988866666') returning id;`)
  W_A_LINK = psql(`insert into public.crm_clients (barber_id,client_id,name,phone) values ('${A}','${CC1}','${PFX} Joao Atendido','44999911111') returning id;`)
  // uma venda "solta" ligada a CC1 (para provar que a ficha NÃO expõe financeiro)
  psql(`insert into public.sales (barber_id,client_name,service,value,cost,unit_price,date,type) values
    ('${A}','${PFX} Joao Atendido','Corte Degradê',45,12,45,current_date-5,null);`)
}

function limpar() {
  psql(`
    delete from public.notifications where appt_id in (select id from public.appointments where client_name like '${PFX} %');
    delete from public.sales where barber_id in (select id from auth.users where email like '${PFX}-%');
    delete from public.appointments where client_name like '${PFX} %' or barber_id in (select id from auth.users where email like '${PFX}-%') or client_id in (select id from auth.users where email like '${PFX}-%');
    delete from public.crm_clients where name like '${PFX} %' or barber_id in (select id from auth.users where email like '${PFX}-%');
    delete from public.clients where id in (select id from auth.users where email like '${PFX}-%');
    delete from public.barbers where id in (select id from auth.users where email like '${PFX}-%');
    delete from auth.users where email like '${PFX}-%';`)
  const c = psql(`select count(*)||' appts / '||(select count(*) from public.sales)||' sales / '||(select count(*) from public.clients)||' clients / '||(select count(*) from public.crm_clients)||' crm' from public.appointments;`)
  console.log(`(limpeza concluída — ${c})`)
}

async function main() {
  console.log(`\n╔══ ST-3a — matriz do CRM (lab, prefixo ${PFX}) ══╗`)
  console.log('· aplicando barber_role + ST-1b.4/.5 + ST-2.1–7 + ST-3a.1–4 (idempotente) ...')
  for (const f of FILES) psqlFile(new URL(f, MIG).pathname)
  await reloadPgrst()
  await seed()
  console.log(`· seed ok — A=${A.slice(0, 8)} B=${B.slice(0, 8)} CC1=${CC1.slice(0, 8)} W_A=${W_A} W_B=${W_B}\n`)

  // ════════════ V — papel ════════════
  console.log('── V — papel ──')
  {
    const r = j(tryAs(ADM, SEARCH(PFX)))
    ok('V1 admin busca prefixo → contas + walk-ins de qualquer barbeiro',
      r && r.length >= 6 && r.some((x) => x.ref.startsWith('conta:')) && r.some((x) => x.tipo === 'walkin')
      && r.some((x) => x.nome.includes('Pedro SoB')) && r.some((x) => x.nome.includes('Walkin B')),
      `${r?.length} resultados`)

    const a2 = j(tryAs(A, SEARCH('Joao Atendido')))
    ok('V2 barbeiro A acha conta que atendeu; de-dup (1 entrada, tipo=conta, cart=true)',
      a2 && a2.length === 1 && a2[0].ref.startsWith('conta:') && a2[0].tipo === 'conta' && a2[0].cart === true)
    const fA = j(tryAs(A, FICHA(`conta:${CC1}`)))
    ok('V2 ficha: histórico só dos atendimentos de A (2 concluídos + 1 confirmado; nada do B)',
      fA && fA.historico.length === 3 && fA.recorrencia.visitas === 2
      && !fA.historico.some((h) => h.day && h.day < '2000-01-01') && fA.recorrencia.barbeiro_top === null)

    const a3 = j(tryAs(A, SEARCH('Pedro SoB')))
    ok('V3 barbeiro A busca conta que só B atendeu → 0', a3 && a3.length === 0)

    const a4 = j(tryAs(A, SEARCH('Walkin B')))
    ok('V4 barbeiro A busca walk-in da carteira de B → 0', a4 && a4.length === 0)

    const a5 = j(tryAs(A, SEARCH('Walkin A')))
    ok('V5 barbeiro A busca walk-in da própria carteira → acha, tipo=walkin, cart=true',
      a5 && a5.length === 1 && a5[0].tipo === 'walkin' && a5[0].cart === true)

    const v6 = j(tryAs(VEND, SEARCH(PFX)))
    ok('V6 vendas busca → acha contas/carteiras', v6 && v6.length >= 5 && v6.some((x) => x.ref.startsWith('conta:')))

    const v7 = j(tryAs(VEND, FICHA(`conta:${CC1}`)))
    ok('V7 vendas ficha: historico presente, age=null, notes ausente, sem financeiro/plano',
      v7 && Array.isArray(v7.historico) && v7.historico.length > 0
      && v7.contato.age === null
      && v7.historico.every((h) => h.notes === null)
      && v7.financeiro === undefined && v7.gasto === undefined && v7.plano === undefined)

    // V8 — cliente por REST
    const rc = await fetch(`${LAB}/rest/v1/rpc/staff_crm_search`, {
      method: 'POST', headers: { apikey: AK, Authorization: `Bearer ${global.CLI_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_q: PFX }),
    })
    const rcb = await rc.json()
    ok('V8 cliente (linha só em clients) chama staff_crm_search por REST → P0001 NOT_STAFF',
      rc.status === 400 && rcb.code === 'P0001' && rcb.message === 'NOT_STAFF', `${rc.status} ${JSON.stringify(rcb).slice(0, 90)}`)

    // V9 — anon por REST
    const ra = await fetch(`${LAB}/rest/v1/rpc/staff_crm_ficha`, {
      method: 'POST', headers: anonH, body: JSON.stringify({ p_ref: `conta:${CC1}` }),
    })
    ok('V9 anon chama staff_crm_ficha por REST → permission denied', ra.status === 401 || ra.status === 403 || ra.status === 404, `HTTP ${ra.status}`)

    // V10 — barbeiro desativado
    const d1 = tryAs(DES, SEARCH(PFX)); const d2 = tryAs(DES, FICHA(`conta:${CC1}`)); const d3 = tryAs(DES, LOOKUP('Joao'))
    ok('V10 barbeiro is_barber=false → NOT_STAFF nas 3 RPCs',
      !d1.ok && errOf(d1.err) === 'NOT_STAFF' && !d2.ok && errOf(d2.err) === 'NOT_STAFF' && !d3.ok && errOf(d3.err) === 'NOT_STAFF')

    // V11 — lookup: barbeiro A acha conta que nunca atendeu
    const l11 = j(tryAs(A, LOOKUP('Ana Livre')))
    ok('V11 lookup por barbeiro A acha conta que A nunca atendeu (Ana Livre), ≤ 5',
      l11 && l11.length === 1 && l11.length <= 5 && l11[0].nome.includes('Ana Livre'))

    // V12 — lookup só devolve {id, nome, telefone_masc}
    const l12keys = tryAs(A, `select coalesce(string_agg(distinct k,','),'-') from (select jsonb_object_keys(to_jsonb(t)) k from public.staff_lookup_account_for_booking('Joao') t) x;`)
    ok('V12 lookup devolve só id,nome,telefone_masc (sem email/age/instagram/referral/histórico)',
      l12keys.ok && l12keys.out.split(',').sort().join(',') === 'id,nome,telefone_masc', l12keys.out)
    const l12tel = j(tryAs(A, LOOKUP('Joao Atendido')))
    ok('V12 telefone do lookup vem mascarado', l12tel && l12tel[0] && /^\(\d\d\) \*\*\*\*\*-\d{4}$/.test(l12tel[0].tel))
  }

  // ════════════ AB — isolamento ════════════
  console.log('\n── AB — isolamento ──')
  {
    const aPedro = tryAs(A, FICHA(`conta:${CC3}`))   // CC3 = Pedro, atendido só por B
    ok('AB barbeiro A abre ficha de conta atendida só por B → NOT_FOUND (não vaza posse)',
      !aPedro.ok && errOf(aPedro.err) === 'NOT_FOUND')
    const vMaria = tryAs(A, FICHA(`conta:${CC2}`))   // CC2 = Maria, atendida só por A
    ok('AB barbeiro A abre ficha de conta que ELE atendeu → OK', vMaria.ok && j(vMaria)?.identificacao?.nome?.includes('Maria'))
    const bCrm = tryAs(A, FICHA(`crm:${W_B}`))
    ok('AB barbeiro A abre ficha de walk-in da carteira de B → NOT_FOUND', !bCrm.ok && errOf(bCrm.err) === 'NOT_FOUND')
    // A abre a própria carteira ligada (crm ref) e vê a conta
    const aLink = j(tryAs(A, FICHA(`crm:${W_A_LINK}`)))
    ok('AB barbeiro A abre a própria carteira ligada (crm ref) → tipo=conta, tem_conta=true, na_carteira=true',
      aLink && aLink.identificacao.tipo === 'conta' && aLink.identificacao.tem_conta === true && aLink.identificacao.na_carteira === true)
  }

  // ════════════ C — vendas sem sales ════════════
  console.log('\n── C — vendas sem financeiro ──')
  {
    const vFicha = j(tryAs(VEND, FICHA(`conta:${CC1}`)))
    const adFicha = j(tryAs(ADM, FICHA(`conta:${CC1}`)))
    ok('C ficha (qualquer papel) nunca traz bloco financeiro/gasto — nem admin',
      vFicha && adFicha && vFicha.financeiro === undefined && adFicha.financeiro === undefined
      && !('gasto' in vFicha) && !('gasto' in adFicha))
  }

  // ════════════ D — admin, nada sensível ════════════
  console.log('\n── D — admin: sem cost/pagamento/fiado/referral/rating/auth ──')
  {
    const t = tryAs(ADM, `select public.staff_crm_ficha('conta:${CC1}')::text;`)
    const s = String(t.out)
    ok('D ficha admin não contém cost / unit_price / discount_motivo / sale_payments / nsu / fiado',
      t.ok && !/"cost"|"unit_price"|"discount_motivo"|"nota_id"|"nsu"|"bandeira"|"parcelas"|"fiado"/.test(s))
    ok('D ficha admin não contém referral_code nem rating do cliente',
      t.ok && !/"referral_code"|REF-J|"rating"|"rating_comment"|"rating_by"/.test(s))
    ok('D ficha admin não contém e-mail cru nem telefone cru (só mascarados)',
      t.ok && !s.includes('44999911111') && !s.includes(`${PFX}-c1@x`) && /\(\d\d\) \*\*\*\*\*-/.test(s))
  }

  // ════════════ P — privacidade por campo ════════════
  console.log('\n── P — privacidade ──')
  {
    const f = j(tryAs(A, FICHA(`conta:${CC1}`)))
    ok('P-phone telefone mascarado (DD) *****-NNNN', f && /^\(\d\d\) \*\*\*\*\*-1111$/.test(f.contato.telefone_masc))
    ok('P-email e-mail mascarado j***@dominio', f && /^.\*\*\*@/.test(f.contato.email_masc))
    ok('P-age barbeiro vê idade (33)', f && f.contato.age === 33)
    const fv = j(tryAs(VEND, FICHA(`conta:${CC1}`)))
    ok('P-age-vendas vendas NÃO vê idade', fv && fv.contato.age === null)
    ok('P-notes-vendas vendas NÃO vê notes', fv && fv.historico.every((h) => h.notes === null))
    ok('P-notes-barbeiro barbeiro vê a própria nota', f && f.historico.some((h) => h.notes && h.notes.includes('nota interna')))
    ok('P-referral referral_code ausente da ficha (qualquer papel)', f && !JSON.stringify(f).includes('referral') && !JSON.stringify(f).includes('REF-J'))
    ok('P-plano/gasto ausentes', f && !('plano' in f) && !('gasto' in f) && !('financeiro' in f))
    const body = psql(`select pg_get_functiondef('public.staff_crm_ficha(text,text)'::regprocedure)||pg_get_functiondef('public.staff_crm_search(text,text,int)'::regprocedure)||pg_get_functiondef('public.staff_lookup_account_for_booking(text)'::regprocedure);`)
    ok('P-authusers nenhuma das 3 RPCs referencia auth.users / auth.identities / sale_payments / fiado_charges',
      !/auth\.users|auth\.identities|sale_payments|fiado_charges|\.cost\b/.test(body))
  }

  // ════════════ E — anti-enumeração ════════════
  console.log('\n── E — anti-enumeração ──')
  {
    ok('E1 termo vazio → []', (j(tryAs(A, SEARCH(''))) || null)?.length === 0)
    ok('E1 termo "ab" (2) → []', (j(tryAs(A, SEARCH('ab'))) || null)?.length === 0)
    ok('E1 telefone "999" (3 díg) → []', (j(tryAs(A, SEARCH('999'))) || null)?.length === 0)
    ok('E1 lookup termo curto → []', (j(tryAs(A, LOOKUP('ab'))) || null)?.length === 0)

    // E2 clamp — cria 25 walk-ins na carteira de A e pede limit 9999
    for (let i = 0; i < 25; i++) psql(`insert into public.crm_clients (barber_id,client_id,name,phone) values ('${A}',null,'${PFX} Lote ${String(i).padStart(2, '0')}','4490000${String(1000 + i)}');`)
    const big = j(tryAs(A, SEARCH(`${PFX} Lote`, null, 9999)))
    ok('E2 p_limit=9999 → clampado a 20 + next_cursor presente', big && big.length === 20 && big[19].nc)
    const pg2 = j(tryAs(A, SEARCH(`${PFX} Lote`, big[19].nc, 20)))
    ok('E2 cursor keyset → 2ª página com 5 restantes, sem repetir', pg2 && pg2.length === 5 && !pg2.some((x) => big.some((y) => y.ref === x.ref)))

    ok('E3 cursor forjado (base64 lixo) → BAD_INPUT', errOf(tryAs(A, SEARCH(`${PFX} Lote`, '!!nao-base64!!', 20)).err) === 'BAD_INPUT')

    // E4 — loop de buscas por A não reconstrói a base: 'a'..'z' nunca traz Pedro SoB / Walkin B
    let vazouV4 = false
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      const rr = j(tryAs(A, SEARCH(`${PFX} ${ch}`)))
      if (rr && rr.some((x) => x.nome.includes('Pedro SoB') || x.nome.includes('Walkin B'))) vazouV4 = true
    }
    ok('E4 loop de buscas por barbeiro A nunca traz cliente/walk-in fora do escopo dele', !vazouV4)

    // E5 — telefone por PREFIXO, não substring
    const pref = j(tryAs(A, SEARCH('449999111')))
    ok('E5 telefone: prefixo "449999111" casa Joao (44999911111)', pref && pref.length === 1 && pref[0].nome.includes('Joao'))
    const mid = j(tryAs(ADM, SEARCH('9999')))   // 4 díg no meio de vários telefones
    ok('E5 "9999" (dígitos que aparecem no MEIO de vários telefones) NÃO casa por substring',
      mid && !mid.some((x) => x.nome.includes('Joao Atendido') && x.tipo === 'conta'), `${mid?.length} hits`)
    const suf55 = j(tryAs(ADM, SEARCH('449988')))
    ok('E5 "449988" casa Maria (armazenada como 5544998822222 → tira DDI)', suf55 && suf55.some((x) => x.nome.includes('Maria')))

    // E6 — lookup ≤ 5 sempre
    for (let i = 0; i < 8; i++) psql(`insert into public.clients (id,email,name,phone) values ('${(await signup('lk' + i)).uid}','${PFX}-lk${i}@x','${PFX} Lookup ${i}','4491111${String(2000 + i)}');`)
    const lk = j(tryAs(A, LOOKUP(`${PFX} Lookup`)))
    ok('E6 lookup com 8 casos → devolve no máximo 5', lk && lk.length === 5)
  }

  // ════════════ EV — evidências ════════════
  console.log('\n── EV — evidências ──')
  const ev = psql(`select p.proname||'|secdef='||p.prosecdef||'|sp='||coalesce(array_to_string(p.proconfig,','),'-')||'|exec='||
      coalesce((select string_agg(g.rolname,',' order by g.rolname) from aclexplode(p.proacl) a join pg_roles g on g.oid=a.grantee
        where a.privilege_type='EXECUTE' and g.rolname not in ('postgres','supabase_admin')),'owner')
    from pg_proc p where p.pronamespace='public'::regnamespace
      and p.proname in ('staff_crm_search','staff_crm_ficha','staff_lookup_account_for_booking','_crm_ctx','_mask_phone','_mask_email','_crm_digits')
    order by p.proname;`)
  console.log(ev.split('\n').map((l) => '  ' + l).join('\n'))
  ok('EV 3 RPCs públicas: secdef + search_path="" + grant authenticated',
    (ev.match(/(staff_crm_search|staff_crm_ficha|staff_lookup_account_for_booking)\|secdef=true\|sp=search_path=""\|exec=authenticated/g) || []).length === 3)
  ok('EV 4 helpers: secdef + search_path="" + só owner',
    (ev.match(/(_crm_ctx|_mask_phone|_mask_email|_crm_digits)\|secdef=true\|sp=search_path=""\|exec=owner/g) || []).length === 4)
  const pol = psql(`select coalesce(qual,'-') from pg_policies where tablename='clients' and policyname='clients_readable_by_barbers';`)
  ok('EV clients_readable_by_barbers INALTERADA (baseline — a ST-3a não fecha a policy)',
    /EXISTS \( SELECT 1\s+FROM barbers b\s+WHERE \(b\.id = auth\.uid\(\)\)\)/.test(pol.replace(/\s+/g, ' ')))
  const gr = psql(`select coalesce(string_agg(distinct privilege_type,',' order by privilege_type),'-') from information_schema.role_table_grants where table_schema='public' and table_name='clients' and grantee='authenticated';`)
  ok('EV grants de escrita de `clients` INTACTOS (INSERT/UPDATE/DELETE ainda p/ authenticated — higiene fica no cutover)',
    gr.includes('INSERT') && gr.includes('UPDATE') && gr.includes('DELETE'))
  const idx = psql(`select coalesce(string_agg(indexname,',' order by indexname),'-') from pg_indexes where schemaname='public' and (tablename='clients' or tablename='crm_clients') and indexname like '%trgm%' or indexname like '%phone_digits%';`)
  ok('EV índices de busca criados (trgm de nome + digits de telefone)', /clients_name_trgm/.test(idx) && /clients_phone_digits_idx/.test(idx))

  const finalCount = psql(`select count(*)||' appts / '||(select count(*) from public.sales)||' sales / '||(select count(*) from public.clients)||' clients / '||(select count(*) from public.crm_clients)||' crm' from public.appointments;`)
  console.log(`\n${fail === 0 ? '✅ TODOS OS TESTES PASSARAM' : '❌ HÁ FALHAS'} — ${pass} ok / ${fail} falhas   (${finalCount})\n`)
}

try { await main() } catch (e) { console.error('\nERRO FATAL:', e.stack || e.message); fail++ }
finally { try { limpar() } catch (e) { console.error('limpeza falhou:', e.message) } }
process.exit(fail === 0 ? 0 : 1)
