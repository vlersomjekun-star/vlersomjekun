# VlersoMjekun

Platformë e pavarur vlerësimesh për mjekë dhe klinika në Shqipëri — "Trustpilot për mjekët".
Pa monetizim, pa rezervime, pa chat. Trilingue: **sq** (default), **en**, **it**.

## Stack

- Next.js 15 (App Router, Turbopack) + TypeScript strict
- PostgreSQL + Prisma 6
- Tailwind CSS 4
- next-intl (routing: `/` sq, `/en`, `/it`)
- Zod, bcryptjs, lucide-react
- SMS OTP: `MockSmsProvider` (dev, logga il codice in console) / `TwilioSmsProvider` (prod)

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

**Troubleshooting DB locale**: se il sito dà 500 con "Can't reach database server at localhost:51218", il processo `prisma dev` è morto. Riavvialo con `npx prisma dev --name vlersomjekun`. Se dice "already running" ma l'errore persiste, oppure "Lock file is already being held": termina il processo node zombie che occupa le porte 51217-51219 (`Get-NetTCPConnection -LocalPort 51218 -State Listen` → `Stop-Process -Id <pid> -Force`), elimina le cartelle `.lock` in `%LOCALAPPDATA%\prisma-dev-nodejs\Data\*\` e rilancia. I dati non si perdono (restano in `.pglite`).

Admin: `/admin` — credenziali da `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.
In dev il codice OTP appare nella console del server (`[MockSmsProvider] OTP për ... : 123456`).

## Deploy (Vercel + Neon)

1. Crea un DB Neon, imposta `DATABASE_URL` (pooled) su Vercel.
2. `npx prisma migrate deploy` (le migration sono in `prisma/migrations/`).
3. `npx prisma db seed` una volta.
4. Env obbligatorie: `DATABASE_URL`, `PHONE_HASH_SALT`, `AUTH_SECRET`, `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `NEXT_PUBLIC_BASE_URL=https://vlersomjekun.al`.
5. `PHONE_HASH_SALT` non va MAI cambiato dopo il lancio (romperebbe il vincolo 1-recensione-per-numero).

## Regole architetturali (non negoziabili)

- Numeri di telefono MAI in chiaro nel DB — solo SHA-256 con salt (`phoneHash`).
- 1 recensione per medico per numero ogni 12 mesi (application layer, `/api/reviews`).
- Le recensioni flaggate dai filtri automatici vanno in `PENDING` (moderazione), mai bloccate.
- `avgRating`/`reviewCount` denormalizzati, ricalcolati in transaction a ogni publish/remove.
- I 30 medici del seed sono FITTIZI — da sostituire con dati reali prima del lancio.
- Niente login utenti, prenotazioni, chat, notifiche, dark mode.
