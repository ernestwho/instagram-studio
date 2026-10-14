# Instagram Studio

Piano editoriale e promemoria per i profili Instagram @ernestwhoo e @ernestwhoo.creative.
L'app non pubblica su Instagram: tiene il piano, le schede "Come realizzarlo", l'agenda, le caption
e manda i promemoria. La programmazione dei post si fa dall'app Instagram.

- Next.js (App Router) + Supabase (login e database) + Vercel, tutto nei piani gratuiti.
- Formato dei file di import: [docs/formato-file.md](docs/formato-file.md).
- Dati iniziali: [dati-iniziali/](dati-iniziali/), caricabili al primo avvio da Impostazioni > Importa.

## Sviluppo in locale

```bash
npm install
npx supabase start            # database locale (serve Docker)
cp .env.example .env.local    # e incolla URL e chiave "anon" stampati da supabase start
npm run dev
npm test                      # test della logica di import e delle date
```

Il database si crea dalle migrazioni in `supabase/migrations/`. Tutto sta nello schema `studio`,
così l'app può condividere il progetto Supabase con altre app senza toccarne le tabelle.
Solo gli utenti presenti in `studio.accesso` possono leggere e modificare i dati:

```sql
insert into studio.accesso (user_id) select id from auth.users where email = 'tua@email.it';
```

Su Supabase lo schema `studio` va aggiunto agli "Exposed schemas" della Data API.

## Promemoria push

Ogni ora Supabase Cron esegue `studio.invia_promemoria()` (migrazione `20261014000200_promemoria.sql`): calcola i promemoria dovuti e li manda con pg_net a `POST /api/promemoria`, che li invia con Web Push ai dispositivi in `studio.iscrizioni_push`. I dispositivi non più validi vengono tolti alla chiamata successiva.

Configurazione:

1. Variabili su Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PROMEMORIA_SEGRETO` (vedi `.env.example`).
2. Nel SQL Editor di Supabase: la migrazione, poi
   `insert into studio.config_promemoria (url, segreto) values ('https://<dominio-di-produzione>', '<PROMEMORIA_SEGRETO>');`
3. Nell'app: Impostazioni → Promemoria → "Attiva su questo dispositivo". Su iPhone serve prima l'app installata sulla schermata Home.

Regole (orari modificabili in Impostazioni, ora italiana): la sera prima (20:00) cosa girare domani e cosa esce domani ma non è pronto; il giorno della partita (15:00) l'elenco di cosa girare; all'ora di uscita "è ora di pubblicare" se il contenuto non è programmato.
