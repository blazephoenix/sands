# Skeleton editor design

Decided 2026-10-15 by the Author from the `?variant=` prototypes for [How the skeleton looks in the editor](https://github.com/blazephoenix/sands/issues/36): variant D (one section at a time), laid out in three panes to use the width. Replaces the Brief and Entry editor design, which went with the strip (tag `pre-strip`).

## Layout: three panes

`/worlds/[id]/skeleton?section=…&row=…`. The section and row live in the URL, so a link (from an issue on the World page, say) opens a row.

1. **Sections**, left: Story, Play settings, Characters, Places, World rules, Promises, Arcs, Hidden truth, Endings, State flags, Voice and canon. A row count for row sections; a mark when the section has issues (destructive when one stops play).
2. **Rows**, middle, for row sections only: each row by name ("Untitled character" when it has none), Arcs numbered in story order, a mark for issues, and a menu with Move up, Move down and Delete. Add from the header's `+` or the button under the list. Endings carries the "Writer may invent endings" switch at the foot. Delete takes effect at once, with Undo in a toast.
3. **Document**, right: one BlockNote document (ADR-0001). Story, Play settings and Voice and canon span the middle and right panes, since they have no rows. Above the document, the issues that belong to it.

Below `md` the panes stack.

## The document

- **A row** is its name as a heading (the placeholder asks for it: "Character name", "The Secret: what is true"), then one `Label: value` paragraph per field, then, for characters and Arcs, a captioned table: Ties (Toward, Wants from them, Friction, Starts as) or Agendas (Character, Want this Arc, Steps in order, If blocked).
- **A field** starts with its label and a colon, in any case. Paragraphs and list items below it continue it, one line each. Text before the first label, or under a heading that isn't the row's name or its table's caption, stays in the document but the Writer won't read it; the editor says so as a note.
- **Hidden text** is a style: select and press Mod-Shift-H, or the eye button in BlockNote's formatting toolbar. It renders muted with a dashed underline, and reaches the Writer as `<hidden>…</hidden>`.
- Everything else is BlockNote as it ships: slash menu, side menu, formatting toolbar, tables with a header row.

Conversion lives in `src/skeleton/document.ts`, works on the documents' JSON (no editor needed, so the server converts what it stores), and round-trips every fixture unchanged.

## Saving

Autosave, debounced, one request at a time, retrying with backoff on failure; the header shows Saving, Saved or Not saved, and is also Save now (Mod-S). Leaving with unsaved edits warns; leaving inside the app saves first. The World's name is the Story's Title.
