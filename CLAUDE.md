@AGENTS.md

## Domain language and past decisions

- [CONTEXT.md](CONTEXT.md): the ubiquitous language. Read it before naming anything.
- [docs/adr/](docs/adr/): settled decisions. Check for a relevant ADR before re-deciding something.
- [docs/superpowers/specs/2026-09-23-creation-harness-design.md](docs/superpowers/specs/2026-09-23-creation-harness-design.md): the design. It and the ADRs take precedence over `docs/requirements.md`.
- How to use these: [docs/agents/domain.md](docs/agents/domain.md). Record new terms and decisions with `/domain-modeling`.

## Rules

- Package manager is **pnpm**. Use `pnpm dlx` / `pnpm exec`, never `npm` or `npx`.
- No server actions: the client calls route handlers (ADR-0010).
- Jev work: use the `typesafe-ai` skill; https://docs.typesafe.ai is the source of truth.
