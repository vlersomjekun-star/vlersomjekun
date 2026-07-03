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

```bash
npm install
cp .env.example .env        # compila i valori

# DB locale senza Docker (Prisma Postgres):
npx prisma dev --name vlersomjekun
# copia la DATABASE_URL stampata in .env, SENZA i parametri extra,
# aggiungendo &pgbouncer=true, es.:
# DATABASE_URL="postgres://postgres:postgres@localhost:51218/template1?sslmode=disable&pgbouncer=true"

npx prisma db push          # sync schema (dev)
npx prisma db seed          # 12 qytete, 20 specialitete, 10 klinika, 30 mjekë placeholder, admin
npm run dev
```

### Anteprima sempre attiva (watchdog)

Il sito è sempre raggiungibile su **http://localhost:3005** grazie a un watchdog automatico:

- **Attività pianificata "VlersoMjekun Dev"** (Task Scheduler, ogni 5 minuti) + **avvio al logon** (`vlersomjekun-dev.vbs` nella cartella Esecuzione automatica): eseguono `scripts/dev-up.ps1`, che riavvia DB (porta 51218) e dev server (porta 3005) se sono giù, pulendo anche i lock stantii.
- Avvio manuale immediato: doppio click su `start-vlersomjekun.cmd` nella root del progetto (apre anche il browser).
- Log: `scripts/dev-up.log`, `scripts/prisma-dev.log`, `scripts/next-dev.log`.
- Per rimuovere il watchdog: `schtasks /Delete /TN "VlersoMjekun Dev" /F` + cancella il file `.vbs` da `shell:startup`.

I dati del DB locale sono persistenti in `%LOCALAPPDATA%\prisma-dev-nodejs\Data\` — nessun riavvio li perde.

Admin: `/admin` — credenziali da `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.
In dev il **link di verifica email** appare nella console del server (`[MockEmailProvider] Verifikim për ... : http://...`).

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
