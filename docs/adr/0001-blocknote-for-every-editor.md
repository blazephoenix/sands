# BlockNote for every editor

Status: accepted

Every surface where the Author edits story text, the Brief editor first, is a BlockNote editor. The project's owner wants a Notion-like authoring experience. BlockNote is a Notion-style block editor built on Tiptap, licensed MPL-2.0, and ships the slash menu, drag handles, nesting and tables we would otherwise build.

This decides the editor, not how a Brief is laid out inside it; [How the skeleton looks in the editor](https://github.com/blazephoenix/sands/issues/36) decides that.

## Considered Options

- **A form styled like a document.** Rejected by the owner: too plain for the authoring experience wanted.
- **An editor hand-built on Tiptap.** Rejected: more work than BlockNote for the same shell.
- **Tiptap's Notion-like template.** Rejected: production use needs a paid Tiptap plan under the Tiptap Pro License.

## Consequences

- Only MPL-2.0 BlockNote packages are used. The `@blocknote/xl-*` packages are GPL-3.0 or commercial.
