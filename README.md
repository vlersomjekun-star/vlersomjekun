# VlersoMjekun

Platformë e pavarur vlerësimesh për mjekë dhe klinika në Shqipëri — "Trustpilot për mjekët".
Pa monetizim, pa rezervime, pa chat. Trilingue: **sq** (default), **en**, **it**.

## Stack

- Next.js 15 (App Router, Turbopack) + TypeScript strict
- PostgreSQL + Prisma 6
- Tailwind CSS 4
- next-intl (routing: `/` sq, `/en`, `/it`)
- **NextAuth v5 (Auth.js)**: Credentials (email+password, bcrypt) + Google OAuth
- Email verifica: `MockEmailProvider` (dev, logga il link in console) / `ResendEmailProvider` (prod)
- Zod, lucide-react

## Autenticazione e gating

- Le recensioni richiedono un **account con email verificata + nickname** (niente più OTP SMS).
- Gating dei contenuti: profili, rating e **prima recensione** visibili a tutti (SEO); le recensioni dal secondo in poi e i commenti sono **sfocati via CSS** per i non registrati — il testo resta nell'HTML server-side, quindi Google lo indicizza.
- Il login viene chiesto **solo al click** su un'azione protetta (modal login/signup).
- Recensioni legacy (era OTP): assegnate all'utente placeholder `legacy-otp-user`; il loro nickname originale è conservato in `Review.nickname` (snapshot), quindi in UI nulla cambia.

## Setup locale

Database: **PostgreSQL 17 reale**, installato come servizio Windows via winget
(`postgresql-x64-17`, avvio automatico). Non usiamo più `prisma dev` (pglite/WASM
— motore sperimentale che crashava periodicamente con `Aborted()`, causa di tutti
i "500 Can't reach database server" storici — vedi commit "Migrazione a PostgreSQL
reale" per i dettagli e la migrazione dati).

```bash
npm install
cp .env.example .env        # compila i valori

# DB: PostgreSQL reale su porta 5432 (servizio Windows, sempre attivo)
# .env di default: postgresql://postgres:postgres@localhost:5432/vlersomjekun

npx prisma migrate deploy   # applica tutte le migration
npx prisma db seed          # 12 qytete, 20 specialitete, 10 klinika, 30 mjekë placeholder, admin
npm run dev
```

Se il servizio PostgreSQL non è attivo: `Start-Service postgresql-x64-17` (PowerShell,
richiede privilegi admin la prima volta) — ma è impostato su avvio automatico, quindi
normalmente non serve toccarlo mai.

### Avvio del dev server

Nessun watchdog/task automatico in background (rimosso il 04/07/2026 — non necessario:
PostgreSQL gira comunque come servizio Windows sempre attivo, l'unica cosa da avviare
al bisogno è il dev server Next.js).

- Avvio manuale: `npm run dev -- --port 3005`, oppure doppio click su `start-vlersomjekun.cmd`
  nella root del progetto (avvia anche PostgreSQL se fosse fermo e apre il browser).
- `scripts/dev-up.ps1` / `scripts/run-hidden.vbs` restano nel repo come logica di supporto
  di `start-vlersomjekun.cmd` (lancio silenzioso senza finestre che lampeggiano) — non sono
  più schedulati, si eseguono solo quando lanci lo script manualmente.

I dati del DB sono in PostgreSQL reale (`C:\Program Files\PostgreSQL\17\data`), persistenti come qualunque installazione Postgres standard, e restano tali indipendentemente da quando il dev server è acceso o spento.

Admin: `/admin` — credenziali da `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.
In dev il **link di verifica email** appare nella console del server (`[MockEmailProvider] Verifikim për ... : http://...`).

## Claim del profilo ("Je ky mjek?")

Un medico può richiedere di gestire la propria scheda, ma solo dopo **approvazione manuale di un admin** — nessuna verifica automatica dell'identità (non abbiamo accesso alle API degli ordini professionali).

- Utente loggato+verificato clicca "Je ky mjek?" sul profilo → `DoctorClaim` PENDING (con messaggio opzionale: nr. licenza, email di lavoro, ecc.)
- Admin rivede in `/admin/claims` → Aprovo/Refuzo. Approvando: `Doctor.claimedByUserId` = utente, e ogni altra richiesta PENDING per lo stesso medico viene rifiutata automaticamente (1 solo proprietario)
- Il medico verificato vede "Menaxho profilin" e può modificare: foto, sotto-specialità, clinica, indirizzo, telefono — **non** nome/cognome/specialità (restano controllati dall'admin per evitare abusi)
- Badge pubblico "Profil i verifikuar nga mjeku" quando il profilo è rivendicato
- `addressSource: DOCTOR_VERIFIED` è la fonte con priorità massima — mai sovrascritta da OSM/scraper (vedi Fase 4/6)

## Deploy (Vercel + Neon)

1. Crea un DB Neon, imposta `DATABASE_URL` (pooled) su Vercel.
2. `npx prisma migrate deploy` (le migration sono in `prisma/migrations/`, inclusa `users_replace_otp` con il backfill legacy).
3. `npx prisma db seed` una volta.
4. Env obbligatorie: `DATABASE_URL`, `PHONE_HASH_SALT`, `AUTH_SECRET`, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `NEXT_PUBLIC_BASE_URL=https://vlersomjekun.al`.
5. Google OAuth (opzionale ma consigliato): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — redirect URI: `https://vlersomjekun.al/api/auth/callback/google`. Se mancano, il bottone Google non appare.
6. `PHONE_HASH_SALT` e `AUTH_SECRET` non vanno MAI cambiati dopo il lancio.

## Regole architetturali (non negoziabili)

- 1 recensione per medico per **account** ogni 12 mesi (application layer, `/api/reviews`).
- Filtri automatici → `PENDING` (moderazione), mai blocco: multi-target stesso giorno, testo duplicato ≥80%, 3+ da stesso IP/24h, **account più giovane di 24h**, blacklist.
- Il testo delle recensioni sfocate NON va mai rimosso dall'HTML server-side (solo blur CSS) — requisito SEO.
- Nessun profilo utente pubblico: solo il nickname è visibile.
- `avgRating`/`reviewCount` denormalizzati, ricalcolati in transaction a ogni publish/remove.
- I 30 medici del seed sono FITTIZI — da sostituire con dati reali prima del lancio.
- Niente prenotazioni, chat, notifiche, dark mode, login Facebook/Apple.
