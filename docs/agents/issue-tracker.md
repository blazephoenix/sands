# Issue tracker

Tickets are GitHub issues on [`blazephoenix/sands`](https://github.com/blazephoenix/sands/issues). Use the `gh` CLI. Do not keep tickets in local files; `.scratch/` is gone.

## Reading

- Pending work: `gh issue list` (open issues).
- One ticket: `gh issue view <n> --comments`.

## Writing a ticket

- Title: what it delivers, in `CONTEXT.md` vocabulary.
- Body: **What to build**, then **Acceptance criteria** as a checklist. UI tickets also meet [`docs/design/ux-bar.md`](../design/ux-bar.md).
- Dependencies: a `Blocked by: #<n>` line.
- Create with `gh issue create --title "…" --body-file <file>`.

## Closing a ticket

- Work lands through a pull request whose body says `Closes #<n>`.
- Put the completion note (what changed, anything added beyond the ticket, screenshots of key states) in the pull request.
