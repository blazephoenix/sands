# Drizzle stays on the stable 0.x line

Status: accepted

The project uses `drizzle-orm` 0.45 and `drizzle-kit` 0.31, the `latest` tags on npm, over `better-sqlite3`. Drizzle 1.0 exists only as a release candidate (rc.4, June 2026) that has not moved since, while 0.x still receives releases. 1.0 changes the relational query syntax and the migrations folder layout, and most documentation still describes 0.x; the schema here is four tables with simple queries, so nothing in 1.0 would save time.

## Considered Options

- **Drizzle 1.0 release candidate.** Rejected for now: unreleased, stalled, and an API most docs do not cover yet. Revisit when 1.0 is tagged `latest`.
