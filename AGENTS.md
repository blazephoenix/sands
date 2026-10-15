<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Domain language and past decisions

- [CONTEXT.md](CONTEXT.md): the ubiquitous language. Read it before naming anything.
- [docs/adr/](docs/adr/): settled decisions, numbered from `0001` again since 2026-10-13. Check for a relevant ADR before re-deciding something.
- **Rebuilding from the core (2026-10-15).** Sands was stripped to the Skeleton editor and a Writer-only play loop, to check the core works before any harness sits on it. The Judge, Setup, the Codex and every engine rule were deleted (tag `pre-strip`); each comes back only when decided fresh. Old ADRs, specs and the map in issue #25 are not precedent.
- How to use these: [docs/agents/domain.md](docs/agents/domain.md). Record new terms and decisions with `/domain-modeling`.
- [docs/design/](docs/design/): the UI bar every change must meet (`ux-bar.md`) and the shared editor's design (`editor-design.md`).
- [docs/research/](docs/research/): checked facts about the libraries we build on (AI SDK 7, Next 16, Drizzle 0.45 on Postgres and PGlite, BlockNote, Jev for when a Judge returns). Read the relevant section before working in `src/models/`, `src/play/`, `src/skeleton/` or `src/db/`; it outranks memory and training data. Update it when you learn more instead of starting a new file.
- Tickets are GitHub issues: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md). There is no `.scratch/`.

## Rules

- Package manager is **pnpm**. Use `pnpm dlx` / `pnpm exec`, never `npm` or `npx`.
- No server actions: the client calls route handlers.
- Dates and times go through dayjs, via `src/lib/time.ts`; never the built-in `Date`.
- Jev work: use the `typesafe-ai` skill; https://docs.typesafe.ai is the source of truth.
