/**
 * The words of the delete-World confirmation. "Delete", never "Remove":
 * Remove is an Entry's restorable review status, and deleting a World is
 * permanent.
 */
import { worldDisplayName } from "@/domain/world"

/** The dialog's title, naming the World, and what goes with it. */
export function deleteWorldCopy(world: { name: string; sessionCount: number }) {
  const parts = ["the World", "its Brief"]
  if (world.sessionCount > 0)
    parts.push(
      `its ${world.sessionCount} ${world.sessionCount === 1 ? "Session" : "Sessions"}`
    )
  const name = worldDisplayName(world.name)
  return {
    // Quoted only when it is the Author's own name.
    title: `Delete ${world.name ? `“${name}”` : name}?`,
    description: `This deletes ${parts.join(", ")} and every Entry. This cannot be undone.`,
  }
}
