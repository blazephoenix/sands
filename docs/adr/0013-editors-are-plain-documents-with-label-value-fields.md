# The editors are plain documents with `Label: value` fields

Status: accepted

The Brief editor and the Entry editor are one plain BlockNote document each, with no form controls inside any block. Section headings (Setting, Character, Arc, Ending, Location, Voice, and one per Entry kind) are the only custom blocks; they have no children. The paragraphs after a heading that read `Label: value` are its fields, matched case-insensitively against the kind's known labels; any other label is a custom field (a key fact), and a near miss of a known label is reported as a probable typo. Anything else ends the section and is free prose. Hidden is a text style. Player character, Approve, Remove and Restore live in BlockNote's ⠿ menu, and in a keyboard block menu (`Mod-/`) that offers the same actions, since BlockNote opens the ⠿ menu by mouse only.

The Author chose this from a UI prototype on 2026-09-23: a typed block holding child field blocks (which passed the day-1 test of spec §7.4) worked, but it needed switches, toggles, buttons and label inputs inside blocks, and read as a form rather than a document.

## Considered Options

- **Typed blocks with child field blocks** (the §7.4 prototype): each field a block with `key`, `label` and `hidden` props, custom labels in an `<input>`. Rejected by the Author: form controls inside the document.
- **Plain document with no typed blocks** (sections inferred from standard headings). Rejected: the section kind would depend on heading text, so a renamed heading would silently change what it is.

## Consequences

- Conversion parses text: a label typo becomes a custom field, so it is surfaced as a warning rather than silently lost.
- Because a section is a heading plus the lines after it, moving or deleting a section acts on the whole run: dragging a heading drags its fields, `Shift+Mod+Arrow` and the block menu move whole sections, and "Delete section" removes the heading with its fields.
- Locked Entries are enforced by refusing transactions that touch their heading or fields, not by read-only widgets.
- The UI says Approve/Approved and Remove/Removed/Restore; the stored statuses stay `accepted` and `rejected` (CONTEXT.md).
- The setup review uses this editor only to edit one Entry at a time (ADR-0008); its decisions are made in a review list and card, not in the document.
- Supersedes the "unverified" consequence of ADR-0008: the typed-block question is settled by this design.
