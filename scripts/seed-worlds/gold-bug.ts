/**
 * "The Gold-Bug", Edgar Allan Poe (Philadelphia Dollar Newspaper, 1843).
 *
 * Source: Project Gutenberg #2147, The Works of Edgar Allan Poe, Volume 1,
 * https://www.gutenberg.org/ebooks/2147
 * Licence: public domain everywhere (Poe died 1849).
 *
 * Adaptation choices (not in the text):
 * - Legrand is the Player character; the story is told by his friend.
 * - Arc boundaries, Exit conditions and the win condition.
 * - It opens the moment the death's-head appears; the evening before it is
 *   Legrand's backstory.
 * - Jupiter is written in standard English, without Poe's dialect caricature.
 * - The friend and the plantation guide are unnamed in the text, so they are
 *   named by role.
 * - Legrand's closing inferences (that the parchment is Kidd's, and that Kidd
 *   killed his helpers) are treated as the truth of this World.
 * Everything else, including the cipher and its reading, comes from the text.
 */
import { briefSection, headingBlock, paragraphBlock } from "@/brief/to-document"

import type { SeedStory } from "./story"

const CIPHER =
  "53‡‡†305))6*;4826)4‡.)4‡);806*;48†8¶60))85;1‡(;:‡*8†83(88)5*†;46(;88*96*?;8)*‡(;485);5*†2:*‡(;4956*2(5*—4)8¶8*;4069285);)6†8)4‡‡;1(‡9;48081;8:8‡1;48†85;4)485†528806*81(‡9;48;(88;4(‡?34;48)4‡;161;:188;‡?;"

export const goldBug: SeedStory = {
  name: "The Gold-Bug",
  document: (ids) => [
    ...briefSection(
      "setting",
      {
        place:
          "Sullivan's Island near Charleston, South Carolina: sand, palmetto and dense sweet-myrtle thicket, with Fort Moultrie at the western end. Across a marshy creek, the wild, desolate hills of the mainland",
        period:
          "October and November of a year in the early nineteenth century",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "William Legrand",
        role: "A reclusive naturalist living on Sullivan's Island",
        personality:
          "Well educated, with unusual powers of mind. Misanthropic, and given to moods of alternating enthusiasm and melancholy. Proud of his drawing. Loves riddles and has solved ciphers far harder than most.",
        backstory:
          "Of an ancient Huguenot family of New Orleans, once wealthy, now reduced to want. He left the city to avoid the shame and built a hut in the myrtle thicket near the eastern end of the island.\nHe spends his days shooting, fishing and collecting shells and insects. Today, on the mainland coast, he and Jupiter caught a heavy, brilliant gold scarabæus unknown to naturalists. It bit him. Jupiter wrapped it in a scrap of what looked like dirty paper that lay half buried in the sand. On the way home he lent the beetle to Lieutenant G——, but kept the scrap in his pocket without noticing.\nThis evening he came home to find his friend from Charleston waiting by a rare fire. With no paper in the hut, he sketched the beetle on the scrap and handed it over. As his friend held it low by the fire, Wolf bounded in and leapt on him; then the friend handed it back, calling the drawing a very passable skull. Nettled, Legrand was about to crumple it into the fire when he saw it: a death's-head on the scrap, where he is certain there was nothing when he drew.",
        aliases: ["Legrand", "Will"],
      },
      {
        ids,
        isPlayer: true,
        keyFacts: [
          {
            label: "Goal",
            text: "Find out what this scrap is, and how a skull came to be on it.",
            hidden: false,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "Jupiter",
        role: "Legrand's devoted old companion",
        personality:
          "Stubborn, protective and fearless in a tree. Refuses, whatever is threatened or promised, to leave Legrand's side. Convinced the beetle is solid gold and that its bite has turned his master's head; will not touch it with his fingers.",
        backstory:
          "Freed before the Legrand family's fortunes fell, he stayed with Legrand by his own choice. Legrand's relatives may have encouraged him to keep watch over a man they think unsettled.",
        aliases: ["Jup"],
      },
      {
        ids,
        keyFacts: [
          {
            label: "Left and right",
            text: "Jupiter is left-handed and muddles left and right on anything but his own body. Asked to use the skull's left eye, he will use the right.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "Legrand's friend",
        role: "Legrand's friend from Charleston, who acts as his physician",
        personality:
          "Kind, sceptical and practical. Quick to suspect Legrand has lost his reason; humours him to get him home.",
        backstory:
          "Lives in Charleston, nine miles away, and visits the hut every few weeks. Arrives this chilly October evening while Legrand is out, and waits by the fire.",
        aliases: ["the friend", "the doctor"],
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Lieutenant G——",
        role: "Officer at Fort Moultrie",
        personality: "An enthusiast for everything in natural history.",
        backstory:
          "Borrowed the gold beetle from Legrand this evening and took it to the fort. Will return it in the morning.",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Wolf",
        role: "Legrand's Newfoundland dog",
        personality:
          "Large, affectionate and excitable. Leaps on visitors he likes and digs at anything that interests him.",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "The old woman of the Bessop plantation",
        role: "One of the oldest people living on the old Bessop plantation",
        backstory:
          "Has heard of a place called Bessop's Castle and can guide someone there for pay. She knows it is neither a castle nor a tavern but a high rock.",
      },
      { ids, hiddenFields: ["backstory"] }
    ),
    ...briefSection(
      "character",
      {
        name: "Captain Kidd",
        role: "A pirate, long dead",
        backstory:
          "Rumours along the Atlantic coast say he buried great plunder somewhere and never recovered it. The stories are all of treasure-seekers, never finders.",
      },
      {
        ids,
        keyFacts: [
          {
            label: "The lost memorandum",
            text: "Kidd wrote the place of his treasure on a slip of parchment in invisible ink that shows red only when heated, sealed with a death's-head at one corner and signed with a kid (a young goat) at the other. It was lost near a ship's longboat on the mainland coast. It is the scrap in Legrand's pocket.",
            hidden: true,
          },
          {
            label: "The cipher",
            text: `Between the death's-head and the kid, in red, with no breaks between words: ${CIPHER}`,
            hidden: true,
          },
          {
            label: "The key",
            text: "A simple substitution cipher in English (the pun on Kidd is English). 8 is e, the most frequent character; ;48 is 'the'. Other symbols: 5 a, † d, 3 g, 4 h, 6 i, * n, ‡ o, ( r, ; t, ? u.",
            hidden: true,
          },
          {
            label: "The message",
            text: "A good glass in the Bishop's hostel in the Devil's seat — forty-one degrees and thirteen minutes — northeast and by north — main branch seventh limb east side — shoot from the left eye of the death's-head — a bee-line from the tree through the shot fifty feet out.",
            hidden: true,
          },
          {
            label: "The helpers",
            text: "Two men helped Kidd bury the chest. He killed them and left their bones in the pit above it.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "location",
      {
        name: "Legrand's hut",
        description:
          "A small hut deep in the myrtle thicket near the eastern end of Sullivan's Island. A hearth where, this rare cold evening, a fire is blazing. A small table with pen and ink but no paper, a sea-chest, a locked writing-desk, a glass case for specimens. The key hangs in a hiding place Legrand's friends know.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "The mainland coast",
        description:
          "The shore of the mainland about a mile east of the island, just above high-water mark, where the gold beetle was caught. The rotted remains of a ship's longboat lie in the sand, so old the timbers can scarcely be traced.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "Fort Moultrie",
        description:
          "The fort at the western end of Sullivan's Island, with some poor frame buildings around it used by summer visitors from Charleston. Lieutenant G—— is stationed here.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "Charleston",
        description:
          "The city nine miles from the island, reached by boat to a cove north of Fort Moultrie. Legrand's friend lives here. Jupiter buys scythes and spades here.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "The Bessop plantation",
        description:
          "An ancient manor-house about four miles north of the island, held time out of mind by the Bessop family.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "Bessop's Castle",
        description:
          "An irregular mass of cliffs and rocks in the hills, one rock remarkably tall and isolated. A yard below its summit, on the eastern face, a narrow ledge about eighteen inches deep, with a niche above it, like a hollow-backed chair: the Devil's seat. It can be sat on in only one position.",
      },
      {
        ids,
        hiddenFields: ["name", "description"],
        keyFacts: [
          {
            label: "The view",
            text: "From the Devil's seat, a telescope pointed north-east by north at forty-one degrees and thirteen minutes above the horizon shows a circular gap in the foliage of a tall distant tree, with a human skull in it. The gap can be seen from no other point.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "location",
      {
        name: "The tulip-tree plateau",
        description:
          "A table land near the summit of an almost inaccessible hill, north-west of the creek through desolate country: dense woods, loose crags propped against trees, deep ravines, brambles that need a scythe. An enormous tulip-tree stands among eight or ten oaks, taller and grander than any of them.",
      },
      {
        ids,
        hiddenFields: ["name", "description"],
        keyFacts: [
          {
            label: "The skull",
            text: "On the main branch, seventh limb, east side, a human skull is nailed face outwards. The limb is dead but will bear a careful climber.",
            hidden: true,
          },
          {
            label: "The treasure",
            text: "Drop a weight from the skull's left eye, drive a peg where it falls, and run a straight line from the nearest point of the trunk through the peg, fifty feet out. Beneath that point: two skeletons, a Spanish knife and loose coins, then an iron-bound chest with six rings, too heavy for three people to lift until partly emptied. It holds gold coin, diamonds, rubies, emeralds, sapphires, gold ornaments, crucifixes and watches, worth well over a million and a half dollars.",
            hidden: true,
          },
          {
            label: "The wrong eye",
            text: "A weight dropped through the right eye puts the peg a few inches off, and fifty feet out the dig misses the chest by several yards.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "arc",
      {
        name: "The Death's-Head",
        description:
          "The hut, a rare cold evening, the fire high. A death's-head has just appeared on the scrap in Legrand's hand. His friend thinks it a joke about his drawing; Jupiter is at the fire with the supper; Wolf is still excited.",
        exitConditions: [
          "Legrand has discovered that heat brings out hidden markings on the parchment.",
        ],
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The Cipher",
        description:
          "The scrap has shown a mark. What it is, who made it, where it was found and what more heat would bring out are all open. Jupiter fears the beetle has turned his master's head.",
        exitConditions: [
          "Legrand has deciphered the message on the parchment.",
        ],
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The Bishop's Hostel",
        description:
          "The message names places no one on the island has heard of, in a sailor's language. Old families and the oldest people of the district remember names the maps have lost.",
        exitConditions: [
          "Legrand has sighted the skull in the tree from the Devil's seat.",
        ],
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The Dig",
        description:
          "The hills north-west of the creek are wild, the brambles thick and the daylight short. Tools, helpers and a climber may all be needed, and the friend thinks Legrand is mad and wants him home in bed.",
        exitConditions: ["The treasure chest has been unearthed."],
      },
      { ids }
    ),
    ...briefSection(
      "ending",
      {
        condition: "Legrand unearths Captain Kidd's buried treasure.",
      },
      { ids }
    ),
    ...briefSection(
      "voice",
      {
        guidelines:
          "Close third person on Legrand, past tense. Plain, modern prose, with no archaic or ornate phrasing. Dialogue sounds natural to a modern reader. Never write in the first person, and never as another character's narration. Legrand's reasoning is shown step by step. Jupiter speaks in plain standard English, never in dialect.",
      },
      { ids }
    ),
    headingBlock(ids(), "Notes for the Writer"),
    paragraphBlock(
      ids(),
      "The friend believes Legrand is mad until the chest appears. Legrand enjoys letting him think so."
    ),
  ],
}
