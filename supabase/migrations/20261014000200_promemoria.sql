-- Promemoria push.
-- Ogni ora Supabase Cron chiama studio.invia_promemoria(): calcola quali promemoria sono dovuti
-- e li manda all'app (route /api/promemoria) insieme ai dispositivi iscritti. L'app li invia con Web Push.

set search_path to studio, public;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Indirizzo dell'app e segreto condiviso con Vercel (PROMEMORIA_SEGRETO).
-- Nessuna policy: dal browser non si legge, la usa solo il database.
create table config_promemoria (
  id boolean primary key default true check (id),
  url text not null,
  segreto text not null,
  -- Ultima chiamata all'app: dalla risposta si tolgono i dispositivi non più validi.
  ultima_richiesta bigint
);
alter table config_promemoria enable row level security;
revoke all on config_promemoria from anon, authenticated;

-- Promemoria già mandati, per non ripeterli se il cron gira due volte.
create table promemoria_inviati (
  chiave text primary key,
  inviato_il timestamptz not null default now()
);
alter table promemoria_inviati enable row level security;
revoke all on promemoria_inviati from anon, authenticated;

-- Orari (ora intera, ora italiana) da studio.impostazioni, chiave 'promemoria':
-- {"sera": 20, "partita": 15}. Regole:
--  * alle "sera": cosa c'è da girare domani, e i contenuti che escono domani ma non sono pronti;
--  * alle "partita", il giorno della partita: cosa girare per tutti i contenuti legati;
--  * all'ora di uscita: "è ora di pubblicare" se il contenuto non è programmato.
create or replace function promemoria_dovuti(adesso timestamptz default now())
returns table (chiave text, titolo text, corpo text, url text)
language plpgsql stable set search_path = studio, public as $$
declare
  locale timestamp := adesso at time zone 'Europe/Rome';
  oggi date := locale::date;
  domani date := locale::date + 1;
  ora int := extract(hour from locale);
  cfg jsonb := coalesce((select valore from impostazioni where impostazioni.chiave = 'promemoria'), '{}');
  ora_sera int := coalesce((cfg ->> 'sera')::int, 20);
  ora_partita int := coalesce((cfg ->> 'partita')::int, 15);
begin
  if ora = ora_sera then
    -- Da girare domani: i contenuti legati a una partita si girano alla partita (se escono dopo),
    -- gli altri il giorno in cui escono.
    return query
    with da_girare as (
      select c.id, c.titolo
      from v_contenuti c left join partite p on p.id = c.partita_id
      where c.stato = 'da_girare'
        and case when c.pub_modo = 'partita' and c.giorni_dopo >= 0 and p.id is not null and not p.rimossa
                 then p.data else c.data_uscita end = domani
    )
    select 'sera-girare-' || domani, 'Domani da girare (' || count(*) || ')',
           string_agg('• ' || d.titolo, E'\n' order by d.titolo), '/piano'
    from da_girare d
    having count(*) > 0;

    return query
    select 'sera-uscita-' || c.id || '-' || domani,
           'Domani esce: ' || c.titolo,
           'Non è ancora pronto (' || replace(c.stato::text, '_', ' ') || '). Esce alle '
             || to_char(c.pub_ora, 'HH24:MI') || ' su ' || c.account || '.',
           '/piano/' || c.id
    from v_contenuti c
    where c.data_uscita = domani and c.stato in ('da_girare', 'in_montaggio')
      -- quelli ancora da girare domani sono già nel promemoria precedente
      and not (c.stato = 'da_girare' and not (c.pub_modo = 'partita' and c.giorni_dopo >= 0));
  end if;

  if ora = ora_partita then
    return query
    select 'partita-' || p.id,
           'Oggi: ' || p.casa || ' – ' || p.ospite || ', ore ' || to_char(p.ora, 'HH24:MI'),
           left(coalesce(string_agg('• ' || g.voce, E'\n'), 'Nessuna ripresa in elenco.'), 900),
           '/piano'
    from partite p
    join contenuti c on c.partita_id = p.id and c.stato <> 'pubblicato'
    left join lateral jsonb_array_elements_text(coalesce(c.come_realizzarlo -> 'cosa_girare', '[]')) g(voce) on true
    where p.data = oggi and not p.rimossa
    group by p.id;
  end if;

  return query
  select 'uscita-' || c.id || '-' || c.uscita,
         'È ora di pubblicare: ' || c.titolo,
         'Alle ' || to_char(c.pub_ora, 'HH24:MI') || ' su ' || c.account || '. La caption è pronta in Crea.',
         '/crea?contenuto=' || c.id
  from v_contenuti c
  where c.uscita >= date_trunc('hour', adesso) and c.uscita < date_trunc('hour', adesso) + interval '1 hour'
    and c.stato not in ('programmato', 'pubblicato');
end $$;

create or replace function invia_promemoria() returns int
language plpgsql security definer set search_path = studio, public as $$
declare
  cfg config_promemoria;
  notifiche jsonb;
  iscrizioni jsonb;
  richiesta bigint;
begin
  delete from promemoria_inviati where inviato_il < now() - interval '60 days';
  select * into cfg from config_promemoria;
  if cfg is null then return 0; end if;

  delete from iscrizioni_push where endpoint in (
    select jsonb_array_elements_text(r.content::jsonb -> 'scadute')
    from net._http_response r
    where r.id = cfg.ultima_richiesta and r.status_code = 200
  );

  select jsonb_agg(to_jsonb(d)) into notifiche
  from promemoria_dovuti(now()) d
  where not exists (select 1 from promemoria_inviati i where i.chiave = d.chiave);
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', chiavi)) into iscrizioni from iscrizioni_push;
  if notifiche is null or iscrizioni is null then return 0; end if;

  select net.http_post(
    url := rtrim(cfg.url, '/') || '/api/promemoria',
    body := jsonb_build_object('notifiche', notifiche, 'iscrizioni', iscrizioni),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || cfg.segreto),
    timeout_milliseconds := 15000
  ) into richiesta;
  update config_promemoria set ultima_richiesta = richiesta;
  insert into promemoria_inviati (chiave) select n ->> 'chiave' from jsonb_array_elements(notifiche) n
  on conflict do nothing;
  return jsonb_array_length(notifiche);
end $$;
revoke all on function invia_promemoria() from public, anon, authenticated;

-- Ogni ora, al minuto 0.
select cron.schedule('instagram-studio-promemoria', '0 * * * *', 'select studio.invia_promemoria()');
