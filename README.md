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

Il database si crea dalle migrazioni in `supabase/migrations/`.
