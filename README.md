# LedgerLens — AI Finance Controller

LedgerLens is a local MVP foundation for deterministic financial reconciliation. It contains a Next.js interface, SQLite/Prisma data model, a 560-record synthetic dataset generator with known truth labels, and a modular reconciliation decision interface that can later be backed by an LLM without weakening deterministic safeguards.

## Setup

1. Copy `.env.example` to `.env`.
2. Install packages: `npm install`.
3. Generate Prisma client: `npm run db:generate`.
4. Create the SQLite database and migration: `npm run db:migrate -- --name init`. The command creates an empty SQLite file first when needed.
5. Seed synthetic data: `npm run db:seed`.
6. Start the application: `npm run dev`.

Open `http://localhost:3000`.

## AI Finance Controller

Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in `.env` to enable server-side Gemini recommendations on exception detail pages. Without a key, or when Gemini fails or returns invalid output, LedgerLens uses an explicitly labeled deterministic fallback based on matching evidence. Recommendations are advisory and never modify financial records.

## Checks

Run `npm test` for reconciliation-engine unit tests and `npm run build` for the production build.

## Current first-stage scope

The shell provides navigation for Dashboard, Records, Exceptions, Audit Log, and Evaluation. The schema retains financial records and immutable reconciliation decisions. The next stage is wiring database queries, batch processing, calculated evaluation metrics, and Recharts dashboards into these pages.
