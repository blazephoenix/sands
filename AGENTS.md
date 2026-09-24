<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Domain language and past decisions

- [CONTEXT.md](CONTEXT.md): the ubiquitous language. Read it before naming anything.
- [docs/adr/](docs/adr/): settled decisions. Check for a relevant ADR before re-deciding something.
- [docs/superpowers/specs/2026-09-23-creation-harness-design.md](docs/superpowers/specs/2026-09-23-creation-harness-design.md): the design. It and the ADRs take precedence over `docs/requirements.md`.
- How to use these: [docs/agents/domain.md](docs/agents/domain.md). Record new terms and decisions with `/domain-modeling`.
- [docs/design/](docs/design/): the UI bar every change must meet (`ux-bar.md`) and the shared editor's design (`editor-design.md`).
- Tickets are GitHub issues: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md). There is no `.scratch/`.

## Rules

- Package manager is **pnpm**. Use `pnpm dlx` / `pnpm exec`, never `npm` or `npx`.
- No server actions: the client calls route handlers (ADR-0010).
- Jev work: use the `typesafe-ai` skill; https://docs.typesafe.ai is the source of truth.
