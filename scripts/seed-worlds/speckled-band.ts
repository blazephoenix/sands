/**
 * "The Adventure of the Speckled Band", Arthur Conan Doyle (Strand Magazine,
 * February 1892; collected in The Adventures of Sherlock Holmes).
 *
 * Source: Project Gutenberg #1661, https://www.gutenberg.org/ebooks/1661
 * Licence: public domain. Published before 1931 (US); Doyle died 1930, so
 * public domain in life+70 countries too.
 *
 * Adaptation choices (not in the text):
 * - Holmes is the Player character; the story is told by Watson.
 * - It opens at Stoke Moran; the Baker Street scenes are Holmes's backstory.
 * - Arc boundaries, Exit conditions and the win condition.
 * - "Gipsies" is rendered as Romani travellers.
 * Everything else, including every clue, comes from the text.
 */
import { briefSection, headingBlock, paragraphBlock } from "@/brief/to-document"

import type { SeedStory } from "./story"

export const speckledBand: SeedStory = {
  name: "The Speckled Band",
  document: (ids) => [
    ...briefSection(
      "setting",
      {
        place:
          "London (Baker Street) and Stoke Moran, a decaying manor on the western border of Surrey",
        period: "An afternoon and a night in early April 1883",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Sherlock Holmes",
        role: "Consulting detective",
        personality:
          "Cool, cheerful and exact. Reads a stranger's history from mud on a sleeve or a ticket in a glove.\nWorks for the love of the unusual, not for money. Imperturbable under threat, and quietly ruthless once he is sure.",
        backstory:
          "Shares rooms at Baker Street with Dr. Watson, in the early days of their association.\nThis morning Helen Stoner came to Baker Street, sent by a former client, Mrs. Farintosh, and told him everything she knows. Minutes after she left, Dr. Roylott burst in, called Holmes a meddler, bent the steel poker in his hands and warned him off. Holmes straightened the poker and came down to Surrey with Watson by the next train from Waterloo.",
        aliases: ["Holmes", "Mr. Holmes"],
      },
      {
        ids,
        isPlayer: true,
        keyFacts: [
          {
            label: "Goal",
            text: "Find out what killed Julia Stoner before Helen sleeps another night in the room where her sister died.",
            hidden: false,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "Dr. Watson",
        role: "Holmes's friend and fellow lodger",
        personality:
          "Loyal, brave and steady. Sees what Holmes sees but does not draw the same conclusions. Carries his revolver when asked.",
        aliases: ["Watson"],
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Helen Stoner",
        role: "The client; Dr. Roylott's stepdaughter",
        age: "About thirty",
        personality:
          "Frightened to the point of exhaustion, but brave and precise about details. Will do exactly as Holmes asks. Loyal to her stepfather even while she fears him.",
        backstory:
          "Twin sister of the late Julia Stoner. Her mother, the widow of Major-General Stoner of the Bengal Artillery, married Dr. Roylott in India and died eight years ago in a railway accident near Crewe.\nShe is engaged to Percy Armitage and will marry in the spring. Two days ago, repairs to the west wing forced her to move into the room where Julia died. Last night she heard the low whistle that came before Julia's death.\nShe told Holmes all of this at Baker Street this morning and came home ahead of him by the noon train.",
      },
      {
        ids,
        keyFacts: [
          {
            label: "Bruises",
            text: "Five livid finger marks on her wrist, left by her stepfather. She hides them and will not mention them unless they are noticed.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "Dr. Grimesby Roylott",
        role: "Helen's stepfather; last of the Roylotts of Stoke Moran",
        personality:
          "Huge, violent and cunning. A man of immense strength, uncontrollable in anger; the terror of the village. Clever, with a doctor's nerve and knowledge.",
        backstory:
          "Took a medical degree and built a large practice in Calcutta, until he beat his native butler to death and served a long prison term. Returned to England morose and disappointed.\nKeeps a cheetah and a baboon that roam the grounds, has Indian animals sent to him by a correspondent, and lets Romani travellers camp on his land, sometimes wandering off with them for weeks.\nThe family estate is ruined and mortgaged; he lives on his late wife's money.",
        aliases: ["Roylott", "the Doctor"],
      },
      {
        ids,
        keyFacts: [
          {
            label: "Motive",
            text: "His late wife's will leaves him her income, now no more than £750 a year, but each daughter may claim £250 a year on marriage. One marriage would cripple him; two would leave him a pittance. Julia died a fortnight before her wedding; Helen is now engaged.",
            hidden: true,
          },
          {
            label: "Method",
            text: "He killed Julia with a swamp adder, the deadliest snake in India, whose poison no chemical test detects. He sends it through the ventilator from his room; it crawls down the dummy bell-rope onto the bed, which is clamped to the floor. He recalls it with a low whistle, trained with milk, and shuts it in his iron safe. The clang Helen heard was the safe door.",
            hidden: true,
          },
          {
            label: "Tonight",
            text: "He moved Helen into Julia's room on the pretext of repairs so the snake can reach her. He will try again tonight.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "character",
      {
        name: "Julia Stoner",
        role: "Helen's twin sister, dead two years",
        age: "Thirty at her death",
        backstory:
          "Engaged to a half-pay major of marines she met at her aunt's in Harrow. A fortnight before the wedding she heard a low whistle at three in the morning, several nights running.\nOn a stormy night she screamed, came out of her locked room, and died crying, 'Oh, my God! Helen! It was the band! The speckled band!', pointing towards the Doctor's room. She held a burnt match and a match-box. The coroner found no cause of death.",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Mrs. Hudson",
        role: "Landlady at Baker Street",
      },
      { ids }
    ),
    ...briefSection(
      "character",
      {
        name: "Percy Armitage",
        role: "Helen's fiancé",
        backstory:
          "Second son of Mr. Armitage of Crane Water, near Reading. Kind, but treats Helen's fears as the fancies of a nervous woman.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "Stoke Moran Manor",
        description:
          "Grey, lichen-blotched stone, a high central block and two curving wings like the claws of a crab. One wing is in ruins. The inhabited wing has three ground-floor bedrooms off one whitewashed corridor, each window on the lawn: Roylott's, then Julia's old room (where Helen now sleeps), then Helen's own. Scaffolding stands against the end wall, though it needs no repair.\nJulia's room: low ceiling, gaping fireplace, a bed clamped to the floor, a thick bell-rope whose tassel lies on the pillow, and a small ventilator high in the wall. Shutters with broad iron bars.\nRoylott's room: a camp-bed, technical books, an armchair, a plain wooden chair against the wall, a round table and a large iron safe.",
      },
      {
        ids,
        keyFacts: [
          {
            label: "Clue: the bell-rope",
            text: "The bell-rope is a dummy. It is not attached to any wire; it is fastened to a hook just above the ventilator. It was put up two years ago, about when the ventilator was made.",
            hidden: true,
          },
          {
            label: "Clue: the ventilator",
            text: "The ventilator opens into Roylott's room, not the outside air. Julia could smell his cigars through it.",
            hidden: true,
          },
          {
            label: "Clue: the bed",
            text: "The bed is clamped to the floor, so it always lies beneath the rope and the ventilator.",
            hidden: true,
          },
          {
            label: "Clue: Roylott's room",
            text: "A saucer of milk sits on the iron safe, though there is no cat. The seat of the wooden chair shows he stands on it. A small dog lash hangs on the bed, tied into a loop of whipcord.",
            hidden: true,
          },
          {
            label: "Clue: the shutters",
            text: "Barred, the shutters cannot be forced from outside; there is no slit to raise the bar. Nothing enters by the window.",
            hidden: true,
          },
        ],
      }
    ),
    ...briefSection(
      "location",
      {
        name: "221B Baker Street",
        description:
          "Holmes and Watson's sitting-room. A fire, a desk with Holmes's case-book, a steel poker by the grate.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "Doctors' Commons",
        description:
          "The London office where wills are kept. The will of the late Mrs. Stoner can be read here.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "The Crown Inn",
        description:
          "The village inn opposite Stoke Moran. Its upper rooms look onto the avenue gate and the inhabited wing of the manor.",
      },
      { ids }
    ),
    ...briefSection(
      "location",
      {
        name: "The grounds of Stoke Moran",
        description:
          "An ill-trimmed lawn, a heavily timbered park, laurel bushes and gaps in the old park wall. Romani travellers camp in the plantation. The cheetah and the baboon roam free at night.",
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The House",
        description:
          "Stoke Moran, early afternoon. Holmes and Watson have just come over the stile from the lane, and Helen is hurrying across the lawn to meet them. Roylott is in town until evening, so the manor can be examined unseen: the shutters, Julia's old room where Helen now sleeps, and Roylott's own room. The housekeeper can be got out of the way. Roylott drives home at dusk.",
        exitConditions: [
          "Holmes has found that the bell-rope is a dummy hanging beside a ventilator into Roylott's room.",
        ],
      },
      { ids }
    ),
    ...briefSection(
      "arc",
      {
        name: "The Night",
        description:
          "Night at Stoke Moran. Roylott is home, the cheetah and the baboon are loose in the grounds, and Helen is to sleep in the room where Julia died. Whatever killed Julia will come again tonight.",
        exitConditions: [
          "Whatever comes through the ventilator has been met and driven back.",
        ],
      },
      { ids }
    ),
    ...briefSection(
      "ending",
      {
        condition:
          "Helen Stoner is safe from her stepfather, and Holmes has uncovered how Julia Stoner died.",
      },
      { ids }
    ),
    ...briefSection(
      "voice",
      {
        guidelines:
          "Close third person on Holmes, past tense. Plain, modern prose, with no archaic or ornate phrasing. Dialogue sounds natural to a modern reader. Never write in the first person, and never as another character's narration. Dread builds through small sounds and silences, not descriptions of horror.",
      },
      { ids }
    ),
    headingBlock(ids(), "Notes for the Writer"),
    paragraphBlock(
      ids(),
      "The Romani travellers and the word 'band' are a false trail: Holmes first suspects a band of people, then discards it once he sees no one could pass the door or the barred window."
    ),
  ],
}
