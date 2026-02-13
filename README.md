# Electrician POS CRM

Multi-tenant POS + CRM foundation for electrical contractors. This repo scaffolds:

- Auth with credentials (Auth.js)
- Org + membership model (multi-tenant)
- Org selection + scoping helpers
- Onboarding flow (create company + first location)

## Stack

- Next.js (App Router, TypeScript)
- Prisma ORM
- PostgreSQL
- Auth.js (Credentials provider)

## Local setup

1) Install deps

```bash
npm install
```

2) Configure env

```bash
cp .env.example .env
```

Update `.env` with a Postgres connection string and a `NEXTAUTH_SECRET`.
For Google sign-in, also set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

3) Create database schema

```bash
npx prisma migrate dev --name init
```

4) Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Deploy live (Vercel + Neon + Stripe)

1) Prepare production values

- Production database URL (`DATABASE_URL`) from Neon.
- Strong auth secret:

```bash
openssl rand -base64 32
```

- Stripe live keys:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

2) Push this repo to GitHub

3) Create a Vercel project and import the repo

4) In Vercel project settings, add env vars:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your final app URL, for example `https://app.yourdomain.com`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Any optional vars you use (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, etc.)

5) Set build command in Vercel to run migrations on deploy:

```bash
npm run build:prod
```

6) In Stripe dashboard, create webhook endpoint:

- URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- Event: `checkout.session.completed`
- Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel env vars.

7) Redeploy

- After deploy, open `/settings/pos` and confirm Stripe shows as configured.
- Then test `/pos` with a real or Stripe test card.

## Notes

- Org selection is stored in an `org_id` cookie after verification.
- All server access should derive org_id from session + cookie, never from client input.
