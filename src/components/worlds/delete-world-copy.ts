/**
 * The words of the delete-World confirmation. "Delete", never "Remove":
 * Remove is an Entry's restorable review status, and deleting a World is
 * permanent.
 */

/** A World's name as the UI shows it: "Untitled World" when it has none. */
export function worldDisplayName(name: string) {
  return name || "Untitled World"
}

/** The dialog's title, naming the World, and what goes with it. */
export function deleteWorldCopy(world: { name: string; sessionCount: number }) {
  const parts = ["the World", "its Brief"]
  if (world.sessionCount > 0)
    parts.push(
      `its ${world.sessionCount} ${world.sessionCount === 1 ? "Session" : "Sessions"}`
    )
  const last = "every Entry"
  return {
    title: world.name
      ? `Delete “${world.name}”?`
      : `Delete ${worldDisplayName(world.name)}?`,
    description: `This deletes ${parts.join(", ")} and ${last}. This cannot be undone.`,
  }
}
