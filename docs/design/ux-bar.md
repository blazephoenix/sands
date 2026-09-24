# UX bar — creation harness UI

Every UI change must meet this bar in addition to its issue's own acceptance criteria. "Delightful" here means **behaviour**, not decoration: the look is stock shadcn `base-nova`. Spec §4 still rules out custom visual polish; interaction quality is in scope.

## Look

- Stock shadcn tokens only. No custom palette, no raw colours (`bg-blue-500`), no manual `dark:` overrides, no custom fonts beyond the scaffold's Geist.
- Compose shadcn components before writing markup: `Empty` for empty states, `Skeleton` for loading, `Spinner` in busy buttons, `Alert` for callouts, `Badge` for status, `Kbd` for shortcuts, `Field`/`FieldGroup` for forms, the base-UI `toast` for toasts.
- Prose reads comfortably: about 65 characters per line, generous leading.

## Four designed states

Every surface that loads or mutates data has all four, each designed on purpose:

1. **Loading:** a `Skeleton` shaped like the real content. No full-page spinner.
2. **Empty:** `Empty` with one sentence and one clear next action.
3. **Error:** what happened and what to do, with a retry that keeps everything the person typed.
4. **Success:** visible confirmation proportional to the action (a status change, a toast only when the change is off-screen or undoable).

Reach every state in the real app before calling a change done: an empty database for Empty, the browser's network throttling for Loading, and offline mode or a stopped dev server for Error.

## Responsiveness

- Every click or key gets visible feedback within 100 ms.
- Entry status changes are optimistic, with an Undo toast. A failed request rolls back and says why.
- Nothing the Author or Player types is ever lost: autosave, input preserved on failure, a guard before leaving with unsaved changes.
- No layout shift when content arrives or state changes: reserve space.

## Keyboard

- Every primary action is reachable by keyboard, with a visible focus ring.
- Focus lands somewhere sensible after a dialog closes, a form submits, or a page loads.
- Single-key shortcuts never fire while typing (reuse the `isTypingTarget` check in the theme provider). `d` already toggles the theme; do not collide with it.
- Shortcuts are discoverable: shown with `Kbd` in the tooltip of the control they trigger.

## Motion

- Purposeful and short: 150–300 ms, via `tw-animate-css` or CSS transitions.
- Under `prefers-reduced-motion: reduce`, every animation is instant and every reveal completes immediately.

## Accessibility

- Every `Dialog`, `Sheet` and `Drawer` has a title (visually hidden if needed).
- Progress and newly arrived content are announced through an `aria-live` region.
- Every control has an accessible name; icon-only buttons get a tooltip and `aria-label`.

## Copy

- UI text uses `CONTEXT.md` vocabulary: Passage (not message), Session (not run), Round (not retry), Entry (not card), Judge (not validator), Author, Player, Codex.
- Plain sentences. No exclamation marks. Errors state the cause and the next step.

## Verification (every ticket)

- `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass.
- Each acceptance criterion is checked in the running app (use the `next-dev-loop` skill), in light and dark theme, with keyboard only, and with reduced motion on.
- Screenshots of the key states are attached to the pull request.
