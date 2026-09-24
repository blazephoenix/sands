# Editor design — chosen from the prototype

Decided 2026-09-23 by the Author, from the UI prototype on branch `prototype/brief-editor` (variant **D**; run `pnpm prototype:brief` in a checkout of that branch, open `/prototype/brief-editor?variant=D`). The prototype code is throwaway; rebuild it properly.

**The editor looks like BlockNote's basic example: a plain document.** No form controls inside blocks: no switches, toggles, buttons, `<input>`s or card chrome.

## Brief surface

- **Section heading blocks** are the only custom blocks: `setting`, `character`, `arc`, `ending`, `location`, `voice`. Each renders, non-editable, a small muted uppercase kind label with its lucide icon (e.g. `👤 CHARACTER · Player character`), then (for named kinds: Character, Arc, Location) the name as editable inline content in a large semibold line. They have **no children**, so there is no nesting indent or vertical line.
- **Fields are ordinary paragraphs** that follow a section heading and read `Label: value`, with the label bold. A second line inside one field is Shift+Enter (soft break). Labels are case-insensitive; the known labels per kind are the typed fields; any other label is a custom field (becomes `key_facts`); a near-miss of a known label (edit distance ≤ 2, e.g. "Personalty") is reported as a probable typo.
- **Anything that is not `Label: value`** (another paragraph, a heading, a list, a quote) is **free prose** and ends the current section. Free prose is grouped under its nearest standard heading, as before.
- **Hidden is a text style** (`hidden`, boolean), applied to selected text from a button with an eye icon in BlockNote's formatting toolbar, with the tooltip "Hidden: the Writer never states this". A field is Hidden if its value carries the style. Render: muted text with a dashed underline, from tokens.
- **Player character** is a prop on the `character` heading, toggled from the ⠿ drag-handle menu ("Player character", checked state) and shown in the heading's kind label.
- **Slash menu** has a "Brief" group (Setting, Character, Arc, Ending, Location, Voice, each with icon and one-line description) that inserts the heading plus its template `Label:` lines, followed by BlockNote's default items.
- **Conversion** walks the flat document with these rules; errors still carry the block id (the heading's or the field paragraph's) so pages can highlight them.

## Entry surface (Codex pane; and the Edit view of one Entry in setup review)

Same pattern, same look:

- One section heading block per Entry kind. The non-editable label line carries kind icon and kind, plus plain-text status bits: handle (C1), source, status, and a Jev-flag marker (e.g. `🔎 CLUE · C1 · setup · proposed · ⚑ Judge flag`). Hovering the flag marker may show the failed question and probability. The name is the editable inline content.
- Fields are `Label: value` paragraphs, including kind-specific data (`Red herring: yes`, `Min band: normal`, `Requires: @C1, @C3`); conversion validates values per kind and reports bad ones inline.
- **Approve, Remove** (and Restore) live in the ⠿ menu of the Entry heading; pages may add keyboard shortcuts. No buttons in the block. UI wording is Approve/Approved and Remove/Removed/Restore; data statuses stay `accepted`/`rejected`.
- The setup review page is NOT this document view: it is a sidebar list plus one Entry card (`src/app/worlds/[id]/setup`). It uses the Entry editor only to edit a single Entry.
- Locked Entries: heading and fields read-only (the editor refuses edits inside them), shown with a lock icon in the label line, not greyed out.
- `@` mentions are inline content inside field values, limited to existing non-rejected Entries; a mention of a since-rejected Entry renders as broken.
- World / Story logic grouping headings are non-editable section dividers.
