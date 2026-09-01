# finances-app

> i spend too much money, this app might track it idk

A single-user personal finance tracker that connects to your bank accounts through
[Plaid](https://plaid.com), pulls in transactions and balances, and shows you where
the money goes.

## Stack

| Layer     | Choice                                                      |
| --------- | ---------------------------------------------------------- |
| Frontend  | React 18 + TypeScript + Vite + Material UI v6 + TanStack Query |
| Backend   | Node + Fastify + TypeScript                                |
| Database  | SQLite via Prisma (swap to Postgres later — one line)       |
| Bank data | Plaid (`/transactions/sync`)                               |
| Auth      | One app password → signed session cookie                    |

Monorepo with npm workspaces: [`api/`](api/) and [`web/`](web/).

## Prerequisites

You need **Node 20+ installed inside WSL** (the Windows Node on your PATH won't
work for this). Install it with nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
exec $SHELL
nvm install 22
```

## Setup

1. **Get Plaid keys** — sign up at <https://dashboard.plaid.com>, then
   Team Settings → Keys. The sandbox environment is free and needs no approval.

2. **Configure env:**

   ```bash
   cp .env.example api/.env
   # generate the two secrets:
   node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
   node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
   ```

   Paste those into `api/.env` along with your Plaid `PLAID_CLIENT_ID` /
   `PLAID_SECRET` and pick an `APP_PASSWORD`.

3. **Install + init the database:**

   ```bash
   npm install
   npm run db:migrate        # creates api/prisma/dev.db
   ```

4. **Run it:**

   ```bash
   npm run dev               # api on :4000, web on :5173
   ```

   Open <http://localhost:5173>, log in with your `APP_PASSWORD`, click
   **Connect a bank**. In Plaid sandbox use username `user_good`, password
   `pass_good`, and any 6-digit code if prompted.

## Plaid webhooks (optional, for auto-refresh)

The server also polls every 6 hours and has a **Sync now** button, so webhooks
aren't required. To get near-real-time updates in dev, expose the API with a tunnel:

```bash
npx cloudflared tunnel --url http://localhost:4000
# then set PLAID_WEBHOOK_URL=https://<tunnel>/api/plaid/webhook in api/.env
```

## Notes / design decisions

- **Money is stored as integer cents** everywhere. Plaid's `amount` is a float in
  dollars and **positive means money left the account** — the UI flips the sign.
- **Plaid access tokens are encrypted at rest** (AES-256-GCM, `ENCRYPTION_KEY`).
  Losing that key means re-linking every bank.
- **Switching to Postgres:** change `provider` in
  [`api/prisma/schema.prisma`](api/prisma/schema.prisma) to `postgresql`, point
  `DATABASE_URL` at your database, delete `api/prisma/migrations/`, re-run
  `npm run db:migrate`.
- **Going to production with Plaid** requires requesting Production access in the
  Plaid dashboard, and you should verify the `Plaid-Verification` JWT on the
  webhook endpoint (currently just logged).

## Layout

```
api/
  prisma/schema.prisma     data model
  src/
    server.ts              Fastify bootstrap + scheduled sync
    plaid.ts               Plaid client
    sync.ts                /transactions/sync logic
    crypto.ts              access-token encryption
    auth.ts                password + cookie session
    routes/                auth, plaid, accounts, transactions
web/
  src/
    lib/api.ts             fetch wrapper + types
    lib/queries.ts         TanStack Query hooks
    pages/                 Login, Dashboard, Transactions, Accounts
    components/            Layout, PlaidLinkButton
```
