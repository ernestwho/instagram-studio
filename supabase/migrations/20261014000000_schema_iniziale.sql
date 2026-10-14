-- Instagram Studio: schema iniziale.
-- App personale a utente singolo: le policy danno accesso completo a chi ha fatto login.
-- Le registrazioni vanno disattivate su Supabase (Authentication > Sign In / Providers),
-- così l'unico utente è Ernesto.

create type stato_contenuto as enum ('da_girare', 'in_montaggio', 'pronto', 'programmato', 'pubblicato');
create type formato_contenuto as enum ('foto', 'carosello', 'reel', 'storia');

-- Storico dei calendari importati (file originale + riepilogo dell'anteprima applicata).
create table import_calendario (
  id uuid primary key default gen_random_uuid(),
  stagione text not null,
  file jsonb not null,
  riepilogo jsonb not null default '{}'::jsonb,
  importato_il timestamptz not null default now()
);

create table partite (
  id text primary key,
  stagione text not null,
  giornata int not null,
  data date not null,
  ora time not null,
  casa text not null,
  ospite text not null,
  palazzetto text not null,
  indirizzo text not null,
  note text not null default '',
  -- true se la partita non c'è più nell'ultimo calendario importato: non si cancella mai.
  rimossa boolean not null default false,
  aggiornata_il timestamptz not null default now()
);

-- Storico dei piani importati. Uno solo è attivo.
create table piani (
  id uuid primary key default gen_random_uuid(),
  codice text not null,
  nome text not null,
  valido_dal date not null,
  valido_al date not null,
  file jsonb not null,
  riepilogo jsonb not null default '{}'::jsonb,
  attivo boolean not null default false,
  importato_il timestamptz not null default now()
);
create unique index piani_un_solo_attivo on piani (attivo) where attivo;

create table rubriche (
  id text primary key,
  nome text not null,
  colore text not null check (colore ~ '^#[0-9A-Fa-f]{6}$'),
  aggiornata_il timestamptz not null default now()
);

create table contenuti (
  id uuid primary key default gen_random_uuid(),
  -- Codice del file (es. c005). Null per i contenuti extra aggiunti a mano.
  codice text,
  -- Piano di provenienza. Null per i contenuti extra.
  piano_id uuid references piani (id) on delete set null,
  account text not null,
  titolo text not null,
  rubrica_id text references rubriche (id) on update cascade,
  formato formato_contenuto not null,
  -- Regola di uscita: data fissa oppure relativa a una partita.
  pub_modo text not null check (pub_modo in ('data', 'partita')),
  pub_data date,
  partita_id text references partite (id) on update cascade,
  giorni_dopo int,
  pub_ora time not null,
  obiettivo text not null default '',
  come_realizzarlo jsonb not null default '{}'::jsonb,
  caption_bozza text not null default '',
  caption text,
  hashtag text[] not null default '{}',
  stato stato_contenuto not null default 'da_girare',
  link_post text,
  -- Spunte della scheda sul set (indici di "cosa_girare" già fatti).
  spunte int[] not null default '{}',
  modificato_a_mano boolean not null default false,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  constraint regola_data check (pub_modo <> 'data' or pub_data is not null),
  constraint regola_partita check (pub_modo <> 'partita' or (partita_id is not null and giorni_dopo is not null))
);
create index contenuti_piano on contenuti (piano_id);
create index contenuti_partita on contenuti (partita_id);

-- Contenuti con la data di uscita calcolata in ora italiana.
-- È l'unica fonte della data di uscita: se la partita si sposta, la data segue.
create view v_contenuti with (security_invoker = true) as
select
  c.*,
  case c.pub_modo
    when 'data' then c.pub_data
    else p.data + c.giorni_dopo
  end as data_uscita,
  (case c.pub_modo
     when 'data' then c.pub_data
     else p.data + c.giorni_dopo
   end + c.pub_ora) at time zone 'Europe/Rome' as uscita,
  (c.pub_modo = 'partita' and (p.id is null or p.rimossa)) as partita_mancante
from contenuti c
left join partite p on p.id = c.partita_id;

create table modelli_caption (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  testo text not null,
  account text,
  creato_il timestamptz not null default now()
);

create table gruppi_hashtag (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  hashtag text[] not null default '{}',
  creato_il timestamptz not null default now()
);

create table iscrizioni_push (
  endpoint text primary key,
  chiavi jsonb not null,
  dispositivo text not null default '',
  creata_il timestamptz not null default now()
);

create table impostazioni (
  chiave text primary key,
  valore jsonb not null
);

-- Accesso completo agli utenti autenticati (app a utente singolo).
do $$
declare t text;
begin
  foreach t in array array['import_calendario', 'partite', 'piani', 'rubriche', 'contenuti',
                           'modelli_caption', 'gruppi_hashtag', 'iscrizioni_push', 'impostazioni']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy accesso_utente on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

create or replace function tocca_aggiornato_il() returns trigger language plpgsql as $$
begin
  new.aggiornato_il = now();
  return new;
end $$;
create trigger contenuti_aggiornato_il before update on contenuti
  for each row execute function tocca_aggiornato_il();
