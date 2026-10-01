/**
 * "The Most Dangerous Game", Richard Connell (Collier's, January 1924).
 *
 * Source: Wikisource, O. Henry Memorial Award Prize Stories of 1924,
 * https://en.wikisource.org/wiki/O._Henry_Memorial_Award_Prize_Stories_of_1924/The_Most_Dangerous_Game
 * Licence: public domain. Published before 1931 (US); Connell died 1949, so
 * public domain in life+70 countries too.
 *
 * Adaptation choices (not in the text):
 * - Arc boundaries, Exit conditions and the win condition.
 * - It opens at Zaroff's dinner table; the shipwreck and the swim ashore are
 *   Rainsford's backstory.
 * - Zaroff's racist list of the men he hunts is reduced to "sailors from
 *   wrecked ships".
 * Everything else comes from the text.
 */
import { briefSection } from "@/brief/to-document"

import type { SeedStory } from "./story"

export const mostDangerousGame: SeedStory = {
  name: "The Most Dangerous Game",
  document: (ids) => [
    ...briefSection(
      "setting",
      {
        place:
          "Ship-Trap Island, a jungle island in the Caribbean with a château on a high bluff",
        period:
          "The 1920s, a few years after the Great War and the Russian Revolution",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Sanger Rainsford",
        role: "Celebrated big-game hunter from New York",
        personality:
          "Cool-headed in a tight place, strong and resourceful. A realist who believes the world is made up of two classes, the hunters and the huntees, and has never wondered how the quarry feels.",
        backstory:
          "Author of a book on hunting snow leopards in Tibet. Served in the war in France.\nLast night, sailing to Rio with his friend Whitney for jaguar hunting on the Amazon, he heard three shots off Ship-Trap Island, overbalanced on the rail and went into the sea. He swam towards the shots and dragged himself ashore on the rocks. This afternoon he found crushed, bloodstained undergrowth, an empty .22 cartridge and hunting-boot prints, and followed them to a château. A giant with a revolver, Ivan, met him at the door; General Zaroff welcomed him by name, dressed him in evening clothes and sat him down to dinner.\nKnows the lore of the fox hunt and field tricks picked up abroad: the Malay man-catcher, the Burmese tiger pit, a spring-sapling knife trap from Uganda.",
        aliases: ["Rainsford", "Mr. Rainsford"],
      },
      {
        ids,
        isPlayer: true,
        keyFacts: [
          {
            label: "Goal",
            text: "Get off Ship-Trap Island alive and back to the mainland.",
            hidden: false,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "General Zaroff",
        role: "Master of Ship-Trap Island",
        personality:
          "A cultivated, courteous host with a slight accent and an analytical mind. Tall, past middle age, white hair, black brows and moustache, red lips and pointed teeth. Charming, bored, utterly without pity. Gives his word as a gentleman and a sportsman.",
        backstory:
          "A Cossack, son of a rich Crimean landowner; killed his first bear in the Caucasus at ten. Commanded a division of Cossack cavalry for the Tsar, then left Russia after the revolution, his fortune safe in American securities.\nHas hunted every game in every land. A Cape buffalo fractured his skull. Has read Rainsford's book.",
        aliases: ["Zaroff", "the General"],
      },
      {
        ids,
        keyFacts: [
          {
            label: "What he hunts",
            text: "Hunting animals bored him, so he bought the island to hunt men, the one quarry that can reason. His quarry are sailors from wrecked ships. He has never lost.",
            hidden: true,
          },
          {
            label: "Ship-Trap",
            text: "At the press of a button, lights far out at sea mark a channel where there is none; the rocks behind them wreck ships. Survivors become his quarry.",
            hidden: true,
          },
          {
            label: "The game",
            text: "The quarry gets food, a hunting knife and three hours' start; Zaroff follows at dusk with a small-calibre pistol. If the quarry eludes him for three whole days, it wins, and his sloop will land it on the mainland. A man who refuses to hunt is handed to Ivan. When he meets a hard case, he uses the hounds.",
            hidden: true,
          },
          {
            label: "Toying",
            text: "He can follow a trail others cannot. When he finds his quarry early he may pretend not to, and save it for another day's sport.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "Ivan",
        role: "Zaroff's servant",
        personality:
          "A giant, black-bearded to the waist, deaf and mute. Obeys Zaroff's silent orders at once. Carries a revolver.",
        backstory:
          "A Cossack. Once official knouter to the Tsar. Wears a black uniform trimmed with grey astrakhan.",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "The Sanlúcar sailors",
        role: "Captives in the château's cellar",
        backstory:
          "About a dozen men from the Spanish bark Sanlúcar, wrecked on the rocks. Zaroff calls the cellar his 'training school' and feeds them well before each hunt.",
      },
      { ids, hiddenFields: ["backstory"] }
    ),
    ...briefSection(
      "location",
      {
        name: "The château",
        description:
          "A palatial château with pointed towers on a high bluff, cliffs on three sides. A tall spiked iron gate; a gargoyle knocker. A baronial dining hall hung with the heads of lions, tigers, elephants and bears. A library. Tower bedrooms whose doors lock from outside.\nA courtyard where a pack of huge black hounds is let loose at seven every night. Electric light.",
      },
      {
        ids,
        keyFacts: [
          {
            label: "The cellar",
            text: "The 'training school' in the cellar holds the captive sailors.",
            hidden: true,
          },
          {
            label: "The library",
            text: "Zaroff keeps what he calls his new collection of heads in the library, and is eager to show it.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "location",
      {
        name: "The rocky shore",
        description:
          "Jagged crags where the sea breaks, and dense jungle right to the cliff edge. Nearby, crushed undergrowth stained with blood, an empty .22 cartridge and the prints of hunting boots leading along the cliff.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "The jungle",
        description:
          "Snarled jungle with a maze of trails, hills and ridges. Big trees with broad limbs; dead trees leaning on living ones. The sea frames the whole island, so straight flight always ends at the water.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "Death Swamp",
        description:
          "The big swamp in the south-east corner of the island. Soft ground, rank growth, biting insects and quicksand. One of Zaroff's quarry tried it; his best hound, Lazarus, followed and was lost.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "The cliff over the cove",
        description:
          "A gap in the trees opens on the sea, twenty feet above the water. Across the cove stands the grey stone of the château.",
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The General's Table",
        description:
          "Dinner in the baronial hall under the mounted heads, Ivan serving, Zaroff watching his guest as he talks. Zaroff is a gracious host, eager to talk about the hunt. What he hunts lies under the courtesy: in the cellar, in the courtyard and out at sea. He wants a worthy opponent, and a man who refuses the hunt is handed to Ivan.",
        exitConditions: ["Rainsford has left the château as Zaroff's quarry."],
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "Outdoor Chess",
        description:
          "Zaroff follows at dusk with a pistol and a tracker's eye, and he is in no hurry. The island is a frame of water: flight ends at the sea, so the jungle, the swamp and the lie of the land are the only weapons.",
        exitConditions: [
          "Rainsford has survived Zaroff's first day and night of hunting him.",
        ],
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The Pack",
        description:
          "Zaroff returns with Ivan and the pack. On open ground the hounds will run anything down.",
        exitConditions: ["Rainsford has escaped the hounds."],
      },
      { ids }
    ),
    ...briefSection(
      "ending",
      {
        condition:
          "Rainsford ends the hunt alive: he outlasts Zaroff's three days or defeats Zaroff himself.",
      },
      { ids }
    ),
    ...briefSection(
      "voice",
      {
        guidelines:
          "Close third person on Rainsford, past tense. Plain, modern prose, with no archaic or ornate phrasing. Dialogue sounds natural to a modern reader. Never write in the first person, and never as another character's narration. Taut and physical: breath, sweat, the sounds of the jungle. Violence is quick and not lingered on.",
      },
      { ids }
    ),
  ],
}
