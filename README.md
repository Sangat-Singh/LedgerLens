# LedgerLens — AI Finance Controller

LedgerLens is a Next.js application for deterministic financial reconciliation. It uses Prisma with hosted PostgreSQL, a 560-record synthetic dataset generator with known truth labels, and a modular Gemini recommendation interface without weakening deterministic safeguards.

## Setup

1. Copy `.env.example` to `.env`.
2. Copy the Neon pooled connection string to `DATABASE_URL` and the Neon direct connection string to `DATABASE_URL_UNPOOLED`.
3. Install packages: `npm install`.
4. Generate Prisma client: `npm run db:generate`.
5. Apply the PostgreSQL migrations: `npm run db:migrate`.
6. Seed synthetic data: `npm run db:seed`.
7. Start the application: `npm run dev`.

Open `http://localhost:3000`.

## AI Finance Controller

Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in `.env` to enable server-side Gemini recommendations on exception detail pages. Without a key, or when Gemini fails or returns invalid output, LedgerLens uses an explicitly labeled deterministic fallback based on matching evidence. Recommendations are advisory and never modify financial records.

## Checks

Run `npm test` for reconciliation-engine unit tests and `npm run build` for the production build.

For Vercel, set `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `GEMINI_API_KEY`, and `GEMINI_MODEL` in the project environment. `DATABASE_URL` is the pooled Neon runtime connection; `DATABASE_URL_UNPOOLED` is used by Prisma for direct migration connections. Run migrations and seeding only after both Neon database variables are configured locally or through a secure deployment workflow.

## Current first-stage scope

The shell provides navigation for Dashboard, Records, Exceptions, Audit Log, and Evaluation. The schema retains financial records and immutable reconciliation decisions. The next stage is wiring database queries, batch processing, calculated evaluation metrics, and Recharts dashboards into these pages.
