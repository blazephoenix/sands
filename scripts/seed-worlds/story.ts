import type { IdFactory } from "@/brief/to-document"
import type { SandsBlock } from "@/editor/schema-config"

/** A public-domain story as a seed World: its name and Brief document. */
export type SeedStory = {
  name: string
  document: (ids: IdFactory) => SandsBlock[]
}
