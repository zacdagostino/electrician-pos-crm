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

## Notes

- Org selection is stored in an `org_id` cookie after verification.
- All server access should derive org_id from session + cookie, never from client input.
