# The baseline and compare view are cut first

Status: accepted

The first demo's build order is also its cut order, last item first: Jev and BlockNote tests, Brief editor, setup, setup review, Turn loop, harness pane, Codex editing in play, replay, pacing, then baseline mode and the compare view. With the editor taking about a day of two, the baseline (the Brief as a system prompt to Grok with no harness) and the side-by-side compare view are expected to be cut, dropping one acceptance criterion: that the baseline shows at least two violations on the adversarial script.

On 2026-09-23 the Author changed the build order, not the cut order: every UI surface (Worlds home, Brief, setup review, Session) was built first, against the real route handlers of spec §5.2 backed by an in-memory fixture store, so the surfaces could be judged while the engine is written. The engine replaces the store behind each route without changing the UI or the route contracts. Engine work keeps the order above, and the cut order stands.

On 2026-09-24 the fixture store was replaced by SQLite in one step (#2) rather than route by route, because the fixtures' Worlds, Entries and Sessions referenced each other and two stores could not run side by side. Until the setup and Turn engines land (#3, #4), those two routes answer 501 `not_built` instead of streaming; their streaming contracts stand and the UI already shows the error. The fixture scenarios went with the store; UI states are reached in the real app (`docs/design/ux-bar.md`). Setup landed with #3 on 2026-09-24 and now streams; the Turn route followed with #4 the same day, so neither answers 501 any more.

We protected the harness over the comparison because the harness is the thesis; a baseline with nothing solid to compare against proves nothing, and once replay exists the baseline is cheap to add back.

## Considered Options

- **Protect the comparison, thin the harness** (cut pacing, reputation Bands, edit-in-review). Rejected: weakens the thing being demonstrated.
- **Protect authorship, cut losing endings.** Rejected: six acceptance criteria depend on code-decided failure.
