/**
 * Test data: what a Drafter might answer for the London Brief
 * (`londonBriefDocument`), for the setup run's tests. Used only by tests.
 *
 * `londonWorldDraft` connects two new Locations to Scotland Yard, adds one
 * NPC and fills in the Exit conditions the Brief's second and third Arcs
 * lack. `londonStoryDraft` is solvable on top of it: C1 lies at the Harbour,
 * next to the start location, and Nell reveals C2 at normal Band.
 */
import type { StoryLogicDraft, WorldDraft } from "@/setup/drafter-calls"

export const londonWorldDraft: WorldDraft = {
  locations: [
    {
      name: "The Harbour",
      description: "Cranes, warehouses and fog off the water.",
      connections: ["Scotland Yard", "The Market"],
    },
    {
      name: "The Market",
      description: "Covered stalls, busy before dawn.",
      connections: ["The Harbour"],
    },
  ],
  npcs: [
    {
      name: "Nell Garvey",
      description: "A flower seller who sees everything at dawn.",
      role: "Witness",
      age: "24",
      personality: "Quick to laugh, slow to trust.",
      backstory: "Sells violets outside the market every morning.",
      aliases: ["Nell"],
    },
  ],
  exit_conditions: [
    {
      arc: 2,
      name: "Victims' trade learned",
      condition: "Jacob has learned what the victims had in common.",
    },
    {
      arc: 3,
      name: "Killer caught",
      condition: "The killer has been arrested.",
    },
  ],
}

export const londonStoryDraft: StoryLogicDraft = {
  clues: [
    {
      key: "C1",
      title: "A torn ledger page",
      description: "Caught on a nail by the quay.",
      location: "The Harbour",
      known_by: [],
      reveals: "A ledger page listing all three victims as creditors.",
      points_to_hidden_truth: true,
      red_herring: false,
    },
    {
      key: "C2",
      title: "The young clerk at dawn",
      description: "What Nell saw.",
      location: null,
      known_by: ["Nell Garvey"],
      reveals: "A young man in a clerk's coat left before dawn.",
      points_to_hidden_truth: true,
      red_herring: false,
    },
  ],
  knowledge: [
    {
      name: "Nell saw the clerk",
      description: "She tells someone who treats her fairly.",
      character: "Nell Garvey",
      fact: "She saw a young clerk leave the warehouse at dawn.",
      min_band: "normal",
      clue: "C2",
    },
  ],
  decisive_actions: [
    {
      name: "Arrest Max Rober",
      description: "Arresting the right person wins.",
      verb: "arrest",
      target: "Max Rober",
      requires: ["C1", "C2"],
      clues_needed: null,
      on_success: "win",
    },
  ],
  exit_conditions: [],
}

/** The solvable draft with its Decisive action changed. */
export function withAction(
  change: Partial<StoryLogicDraft["decisive_actions"][number]>
): StoryLogicDraft {
  return {
    ...londonStoryDraft,
    decisive_actions: [{ ...londonStoryDraft.decisive_actions[0], ...change }],
  }
}
