# Weekly Compass

**Weekly Compass** is a calm, opinionated weekly alignment ritual for people who want to detect drift — not track habits, chase streaks, or optimize productivity.

Open it on Sunday. Answer honestly. Move on.

## Philosophy

The Daily Code proved that daily tracking stops being useful once habits become habits.

The real problem is drift.

Weekly Compass helps you answer one question:

**Am I becoming the person I want to become?**

This is not a habit tracker, journaling app, or dashboard. It is a personal operating system — an externalized conscience for a 5–10 minute Sunday ritual.

## What it does

- One review per week (Sunday week start)
- North star alignment check
- Seven principles with lightweight reflection
- Fault pattern detection
- Reality calibration
- Three commitments for next week
- Identity statement
- Trajectory view — patterns over time, no scores or charts

## Built with

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Server Actions

## Local development

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `DATABASE_URL` in `.env` to a running PostgreSQL instance:

```bash
postgresql://postgres:postgres@localhost:5432/weekly_compass?schema=public
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start local dev server |
| `npm run build` | Generate Prisma client, migrate, and build |
| `npm run db:migrate` | Run local Prisma migrations |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

Vercel-friendly. Provision PostgreSQL (Neon, Supabase), set `DATABASE_URL`, deploy. Migrations run during build.

## License

MIT
