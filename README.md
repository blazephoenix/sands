# sands — Creation Harness

Tests whether an AI can write a creative story inside human-authored constraints. Design: `docs/superpowers/specs/2026-09-23-creation-harness-design.md`. Requirements: `docs/requirements.md`.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in API keys
pnpm dev
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Checks |
| `pnpm test` / `pnpm test:watch` | Vitest (`src/**/*.test.ts`) |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations (SQLite at `DB_URL`) |

Add shadcn components with `pnpm dlx shadcn@latest add <component>`.
