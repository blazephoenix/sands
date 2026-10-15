/**
 * The words of the delete-World confirmation. Deleting a World is permanent,
 * so the dialog says "Delete" and names everything that goes with it.
 */
import { worldDisplayName } from "@/domain/world"

/** The dialog's title, naming the World, and what goes with it. */
export function deleteWorldCopy(world: { name: string; sessionCount: number }) {
  const parts = ["the World and its Skeleton"]
  if (world.sessionCount > 0)
    parts.push(
      `its ${world.sessionCount} ${world.sessionCount === 1 ? "Session" : "Sessions"}`
    )
  const name = worldDisplayName(world.name)
  return {
    // Quoted only when it is the Author's own name.
    title: `Delete ${world.name ? `“${name}”` : name}?`,
    description: `This deletes ${parts.join(" and ")}. This cannot be undone.`,
  }
}
