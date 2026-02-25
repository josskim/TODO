# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Next.js)
npm run build     # Production build
npm run lint      # ESLint

# Prisma
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma generate                    # Regenerate Prisma client after schema change
npx prisma studio                      # Open Prisma Studio (DB GUI)
npx prisma db push                     # Push schema changes without migration (prototyping)
```

## Architecture

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL

### Key conventions

- `@/*` maps to `src/*` (import alias)
- Prisma client is generated to `src/generated/prisma/` (gitignored) — run `npx prisma generate` after schema changes
- Database singleton is at [src/lib/prisma.ts](src/lib/prisma.ts) — import `prisma` from there for all DB access
- Prisma 7 requires a driver adapter — uses `@prisma/adapter-pg` with `pg` Pool; import from `@/generated/prisma/client` (not `@/generated/prisma`)
- App Router pages/layouts live under `src/app/`

### Prisma setup (v7)

Prisma 7 uses `prisma.config.ts` (project root) alongside `prisma/schema.prisma`. The config reads `DATABASE_URL` from `.env`. Uses PostgreSQL — connection string format: `postgresql://USER:PASSWORD@localhost:5432/todo`.

After modifying `prisma/schema.prisma`, always run `npx prisma migrate dev` (or `prisma generate` for client-only changes).

## Project Rules

- All components must be written as function components.
- Props must be defined with `interface` (not `type`).
- All API calls must be wrapped in `try-catch` for error handling.
- All database queries must go through Prisma — no raw SQL or other ORM.
- `.env` must never be committed to Git (`.env*` is gitignored; use `.env.example` for reference).
