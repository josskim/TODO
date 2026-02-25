# db-pro Agent Memory

## Project Overview
- Stack: Next.js 16 (App Router), Prisma 7, SQLite (dev), TypeScript
- Schema: `prisma/schema.prisma`
- Config: `prisma.config.ts` at project root
- DB singleton: `src/lib/prisma.ts` — always import `prisma` from here
- Client output: `src/generated/prisma/` (gitignored)

## Current Schema State
- Models: `User`, `Todo` (as of initial review)
- `User`: id(String/cuid), email(unique), name(nullable), todos relation
- `Todo`: id(String/cuid), title, description?, completed, priority(String), dueDate?, deletedAt? (soft delete), userId FK

## Key Architectural Decisions Confirmed
- `id` type: `String @default(cuid())` preferred over `Int @default(autoincrement())` for URL safety and cursor pagination
- Soft delete pattern: `deletedAt DateTime?` — always filter with `{ deletedAt: null }` in active-record queries
- Email uniqueness: store as `email.toLowerCase()` at application layer (SQLite has no COLLATE NOCASE support in Prisma)
- `onDelete: Cascade` required on Todo->User relation (missing in original schema — critical fix)

## SQLite-Specific Rules
- No native enum support — use `String` + app-layer validation for enum-like fields (priority: "LOW"|"MEDIUM"|"HIGH")
- Foreign key enforcement: Prisma 7 sets `PRAGMA foreign_keys = ON` automatically on connection
- `@updatedAt` is Prisma-managed only, not a DB trigger — raw SQL bypasses it (forbidden by project rules anyway)
- No `@db.VarChar` support — length validation must be at application layer

## Index Strategy for Todo App
- `@@index([userId])` — primary FK index (SQLite does NOT auto-index FK columns)
- `@@index([userId, completed])` — most common dashboard query pattern
- `@@index([userId, createdAt])` — sort by recency queries
- `@@index([userId, deletedAt])` — soft-delete aware filtering

## Migration History
- No migrations exist yet (clean project as of first conversation)
- Migration naming convention: `npx prisma migrate dev --name <verb>-<noun>-<detail>`
  - Example: `add-todo-enhancements-and-indexes`

## Common Pitfalls
- Missing `onDelete` defaults to RESTRICT — User delete throws FK violation if Todos exist
- See `patterns.md` for detailed query patterns
