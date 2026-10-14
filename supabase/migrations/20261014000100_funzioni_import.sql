-- Applicazione degli import in una sola transazione.
-- L'anteprima e i dati da applicare li calcola l'app (src/lib/import/anteprima.ts).

create or replace function applica_calendario(dati jsonb) returns uuid
language plpgsql security invoker as $$
declare
  nuovo_id uuid;
begin
  insert into partite (id, stagione, giornata, data, ora, casa, ospite, palazzetto, indirizzo, note, rimossa, aggiornata_il)
  select p.id, p.stagione, p.giornata, p.data, p.ora, p.casa, p.ospite, p.palazzetto, p.indirizzo, coalesce(p.note, ''), false, now()
  from jsonb_populate_recordset(null::partite, dati -> 'partite') p
  on conflict (id) do update set
    stagione = excluded.stagione, giornata = excluded.giornata, data = excluded.data, ora = excluded.ora,
    casa = excluded.casa, ospite = excluded.ospite, palazzetto = excluded.palazzetto,
    indirizzo = excluded.indirizzo, note = excluded.note, rimossa = false, aggiornata_il = now();

  -- Le partite della stagione che non sono più nel file restano, marcate come rimosse.
  update partite set rimossa = true, aggiornata_il = now()
  where stagione = dati ->> 'stagione'
    and not rimossa
    and id not in (select x ->> 'id' from jsonb_array_elements(dati -> 'partite') x);

  insert into import_calendario (stagione, file, riepilogo)
  values (dati ->> 'stagione', dati -> 'file', coalesce(dati -> 'riepilogo', '{}'::jsonb))
  returning id into nuovo_id;
  return nuovo_id;
end $$;

create or replace function applica_piano(dati jsonb) returns uuid
language plpgsql security invoker as $$
declare
  nuovo_id uuid;
begin
  update piani set attivo = false where attivo;
  insert into piani (codice, nome, valido_dal, valido_al, file, riepilogo, attivo)
  select x ->> 'codice', x ->> 'nome', (x ->> 'valido_dal')::date, (x ->> 'valido_al')::date,
         x -> 'file', coalesce(x -> 'riepilogo', '{}'::jsonb), true
  from (select dati -> 'piano' as x) s
  returning id into nuovo_id;

  insert into rubriche (id, nome, colore)
  select r.id, r.nome, r.colore from jsonb_populate_recordset(null::rubriche, dati -> 'rubriche') r
  on conflict (id) do update set nome = excluded.nome, colore = excluded.colore, aggiornata_il = now();

  delete from contenuti
  where id in (select (e #>> '{}')::uuid from jsonb_array_elements(dati -> 'elimina') e)
    and stato <> 'pubblicato';

  -- Aggiorna solo i campi che vengono dal file: stato, caption finale, spunte e link restano.
  update contenuti c set
    piano_id = nuovo_id,
    account = u.account, titolo = u.titolo, rubrica_id = u.rubrica_id, formato = u.formato,
    pub_modo = u.pub_modo, pub_data = u.pub_data, partita_id = u.partita_id,
    giorni_dopo = u.giorni_dopo, pub_ora = u.pub_ora, obiettivo = u.obiettivo,
    come_realizzarlo = u.come_realizzarlo, caption_bozza = u.caption_bozza, hashtag = u.hashtag,
    modificato_a_mano = false
  from jsonb_populate_recordset(null::contenuti, dati -> 'aggiorna') u
  where c.id = u.id and c.stato <> 'pubblicato';

  insert into contenuti (codice, piano_id, account, titolo, rubrica_id, formato, pub_modo, pub_data,
                         partita_id, giorni_dopo, pub_ora, obiettivo, come_realizzarlo, caption_bozza, hashtag)
  select i.codice, nuovo_id, i.account, i.titolo, i.rubrica_id, i.formato, i.pub_modo, i.pub_data,
         i.partita_id, i.giorni_dopo, i.pub_ora, i.obiettivo, i.come_realizzarlo, i.caption_bozza, i.hashtag
  from jsonb_populate_recordset(null::contenuti, dati -> 'inserisci') i;

  return nuovo_id;
end $$;

-- Contenuti con il codice del piano di provenienza, come li legge l'anteprima.
create view v_contenuti_import with (security_invoker = true) as
select c.*, p.codice as piano_codice
from contenuti c left join piani p on p.id = c.piano_id;
