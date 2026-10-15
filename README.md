# sands — Creation Harness

Tests whether an AI can write a creative story inside human-authored constraints. An Author writes a Skeleton; the Writer (Grok) plays it with a Player, one Passage and a few Choices at a time. Vocabulary: `CONTEXT.md`.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in XAI_API_KEY and WRITER_MODEL
docker compose up -d         # Postgres on localhost:5432
pnpm seed:fixtures           # optional: three playable test Worlds
pnpm dev
```

Tests need no database: they run on PGlite in memory.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Checks |
| `pnpm test` / `pnpm test:watch` | Vitest (`src/**/*.test.ts`) |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations (Postgres at `DATABASE_URL`; the server also applies them on start) |
| `pnpm seed:fixtures` | Store the fixture Skeletons as Worlds (`--replace` overwrites them) |

Add shadcn components with `pnpm dlx shadcn@latest add <component>`.
