# Formato dei file di import

Instagram Studio importa due tipi di file JSON preparati fuori dall'app. Questo documento descrive il formato
così com'è nei file reali forniti da Ernesto (`dati-iniziali/calendario.json` e `dati-iniziali/piano-editoriale.json`,
14 ottobre 2026). Il formato del calendario è condiviso con l'app "Matchday Shot List" e **non va cambiato**.

Convenzioni comuni:

- Date in formato `AAAA-MM-GG` (es. `2026-10-25`), ore in formato `HH:MM` 24h (es. `18:00`).
- Date e ore sono **ora locale italiana** (Europe/Rome). L'app converte in UTC tenendo conto dell'ora legale
  (attenzione: il 25 ottobre 2026 è il giorno del cambio d'ora, ed è anche il giorno di una partita).
- Il campo `tipo` identifica il file: l'app lo usa per riconoscere cosa stai importando.
- Il campo `versione` (oggi `1`) permette di evolvere il formato in futuro senza rompere i file vecchi.

---

## A) Calendario partite — `tipo: "calendario_partite"`

```json
{
  "tipo": "calendario_partite",
  "versione": 1,
  "stagione": "2026/27",
  "squadra": "Virtus Kleb Ragusa",
  "campionato": "Serie B Interregionale",
  "aggiornato_il": "2026-10-14",
  "partite": [ { ...partita... } ]
}
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `tipo` | stringa | sì | Sempre `"calendario_partite"` |
| `versione` | numero | sì | Oggi `1` |
| `stagione` | stringa | sì | Es. `"2026/27"` |
| `squadra` | stringa | sì | Es. `"Virtus Kleb Ragusa"` |
| `campionato` | stringa | sì | Es. `"Serie B Interregionale"` |
| `aggiornato_il` | data | sì | Data dell'ultima modifica del file |
| `partite` | lista | sì | Le partite (nel file attuale: solo le 13 in casa) |

### Partita

```json
{ "id": "2026-27-g05", "giornata": 5, "data": "2026-10-25", "ora": "18:00",
  "casa": "Virtus Kleb Ragusa", "ospite": "Miwa Energia Benevento",
  "palazzetto": "PalaPadua", "indirizzo": "Via Zama, 97100 Ragusa (RG)", "note": "Gara FIP n. 34" }
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `id` | stringa | sì | Identificativo stabile, schema `AAAA-AA-gNN` (stagione + giornata). È la chiave a cui si agganciano i contenuti del piano: **non deve cambiare** se la partita viene spostata |
| `giornata` | numero | sì | Numero di giornata |
| `data` | data | sì | Giorno della partita |
| `ora` | ora | sì | Ora di inizio |
| `casa` | stringa | sì | Squadra di casa |
| `ospite` | stringa | sì | Squadra ospite |
| `palazzetto` | stringa | sì | Es. `"PalaPadua"` |
| `indirizzo` | stringa | sì | Indirizzo del palazzetto |
| `note` | stringa | no | Testo libero (es. numero gara FIP) |

Regole di validazione: `id` unici nel file; `data` e `ora` valide; nessun campo obbligatorio vuoto.

Quando ricarichi un calendario, l'app confronta le partite per `id`: nuove, modificate (data/ora/avversario),
rimosse. Se una partita cambia data o ora, i contenuti del piano agganciati a lei si spostano da soli.

---

## B) Piano editoriale — `tipo: "piano_editoriale"`

```json
{
  "tipo": "piano_editoriale",
  "versione": 1,
  "id": "piano-autunno-2026",
  "nome": "Piano autunno 2026",
  "valido_dal": "2026-10-19",
  "valido_al": "2026-12-31",
  "rubriche": [ { ...rubrica... } ],
  "contenuti": [ { ...contenuto... } ]
}
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `tipo` | stringa | sì | Sempre `"piano_editoriale"` |
| `versione` | numero | sì | Oggi `1` |
| `id` | stringa | sì | Identificativo del piano (es. `"piano-autunno-2026"`) |
| `nome` | stringa | sì | Nome leggibile |
| `valido_dal`, `valido_al` | data | sì | Periodo coperto dal piano |
| `rubriche` | lista | sì | Le rubriche usate dai contenuti, con il loro colore |
| `contenuti` | lista | sì | I contenuti (nel file attuale: 32) |

### Rubrica

```json
{ "id": "vigilia", "nome": "Vigilia", "colore": "#8A94A6" }
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `id` | stringa | sì | Chiave usata da `contenuto.rubrica` |
| `nome` | stringa | sì | Nome visualizzato |
| `colore` | stringa | sì | Colore esadecimale `#RRGGBB`, usato nell'Agenda |

Rubriche del primo piano: `vigilia`, `live`, `pov-risultato`, `foto-matchday`, `slowmo`, `unposted`, `allenamento`.

I contenuti della rubrica `live` si pubblicano in diretta dal telefono: l'app li mostra come promemoria con la
scheda di cosa girare. L'app non pubblica nulla su Instagram: tutti i contenuti si programmano a mano da Instagram.

### Contenuto

```json
{
  "id": "c005",
  "account": "@ernestwhoo",
  "titolo": "POV → risultato: Virtus Kleb Ragusa – Miwa Energia Benevento",
  "rubrica": "pov-risultato",
  "formato": "reel",
  "pubblicazione": { "modo": "partita", "partita_id": "2026-27-g05", "giorni_dopo": 1, "ora": "19:00" },
  "obiettivo": "Il formato di punta: mostrare il processo e il frame finito. ...",
  "come_realizzarlo": {
    "cosa_girare": ["POV: tu a bordo campo con la camera, ...", "La clip o la foto finita corrispondente, ..."],
    "inquadrature": ["Mani sulla camera e mirino", "Azione vista dal tuo punto", "..."],
    "durata": "8-15 secondi",
    "formato_video": "9:16",
    "gancio": "Primi 2 secondi: il POV dell'azione che parte, ...",
    "audio": "Un pezzo con un drop netto dove cade lo stacco",
    "montaggio": "Una sola azione, un solo stacco. ..."
  },
  "caption_bozza": "Dietro la camera vs dentro il frame.\nVirtus Kleb Ragusa – Miwa Energia Benevento 📍 PalaPadua",
  "hashtag": ["#virtusragusa", "#ragusa", "#basket"]
}
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `id` | stringa | sì | Unico nel piano (es. `c001`…`c032`). Serve a riconoscere lo stesso contenuto tra due versioni del piano |
| `account` | stringa | sì | `"@ernestwhoo"` oppure `"@ernestwhoo.creative"` |
| `titolo` | stringa | sì | |
| `rubrica` | stringa | sì | Deve essere uno degli `id` in `rubriche` |
| `formato` | stringa | sì | Uno tra `foto`, `carosello`, `reel`, `storia` |
| `pubblicazione` | oggetto | sì | Vedi sotto |
| `obiettivo` | stringa | sì | Perché esiste il contenuto |
| `come_realizzarlo` | oggetto | sì | La scheda per il set, vedi sotto |
| `caption_bozza` | stringa | sì (può essere vuota) | Può contenere a capo (`\n`) ed emoji |
| `hashtag` | lista di stringhe | sì (può essere vuota) | Ognuno inizia con `#`. Massimo 30 tra caption e hashtag (limite Instagram) |

### `pubblicazione`

Due modi:

**Data fissa**

```json
{ "modo": "data", "data": "2026-10-20", "ora": "19:00" }
```

**Relativa a una partita**

```json
{ "modo": "partita", "partita_id": "2026-27-g05", "giorni_dopo": 1, "ora": "19:00" }
```

- `partita_id` deve esistere nel calendario caricato nell'app (quindi il calendario va importato prima del piano).
- `giorni_dopo` è un intero: negativo = prima della partita (`-1` = il giorno prima), `0` = il giorno stesso,
  positivo = dopo. Nel primo piano si usano `-1`, `0`, `1`, `3`.
- Data di uscita = data della partita + `giorni_dopo` giorni, all'`ora` indicata (non l'ora della partita).
- Se il calendario cambia la data della partita, la data di uscita si ricalcola da sola.
- Se la partita sparisce dal calendario, il contenuto **non viene cancellato**: viene segnalato come "partita mancante".

### `come_realizzarlo`

| Campo | Tipo | Note |
|---|---|---|
| `cosa_girare` | lista di stringhe | Cosa riprendere/scattare |
| `inquadrature` | lista di stringhe | Inquadrature da fare |
| `durata` | stringa | Testo libero: `"6-12 secondi"`, `"3-5 storie"`… |
| `formato_video` | stringa | Es. `"9:16"` |
| `gancio` | stringa | Come aprire il contenuto |
| `audio` | stringa | Indicazioni sull'audio |
| `montaggio` | stringa | Indicazioni di montaggio e note (es. priorità al club) |

Tutti e sette i campi sono presenti in ogni contenuto del primo piano; l'app li tratta come obbligatori ma accetta
liste vuote o stringhe vuote.

---

## Cosa c'è nel primo piano (14/10/2026)

- 32 contenuti, tutti su `@ernestwhoo`; nessuno ancora su `@ernestwhoo.creative`.
- Formati usati: 9 reel, 5 caroselli, 18 storie (nessuna foto singola).
- 20 contenuti agganciati alle 5 partite casalinghe tra ottobre e dicembre (g05, g07, g09, g11, g13),
  12 a data fissa.
- Il piano parte dal 20/10 (primo contenuto) anche se `valido_dal` è il 19/10.
- Il calendario contiene anche due partite già giocate (g01 il 26/09, g03 l'11/10) e partite fino ad aprile 2027.
