/** Fixture: a short country-house poisoning adapted from The Mysterious Affair at Styles by Agatha Christie (1920), to test a closed circle, a pair of culprits hidden behind one obvious suspect, and three Endings that turn on one accusation. */
import type { Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

const ARC_1 = "The Locked Room"
const ARC_2 = "The Inquest"
const ARC_3 = "The Accomplices"

export const murderMystery: Skeleton = {
  story: {
    title: "The Mysterious Affair at Styles",
    premise:
      "Emily Inglethorp, mistress of Styles Court, has died of strychnine in a bedroom locked from the inside. Her young second husband, Alfred, inherits and everyone hates him. Hercule Poirot, a Belgian refugee in the village, must find who poisoned her before the police hang the wrong man, or the right one too soon.",
    genre: "Closed-circle detective mystery",
    theme: "The obvious answer can be bait.",
    setting:
      "Styles Court, a country house near Styles St. Mary, Essex, and the village around it.",
    period: "July 1917, during the war. Play runs about a week.",
    basedOn:
      "The Mysterious Affair at Styles by Agatha Christie (1920); Project Gutenberg #863; public domain in the United States",
  },
  playSettings: {
    playerCharacter: "Hercule Poirot",
    pointOfView: "Second person, present tense: you are Hercule Poirot.",
    opening:
      "Start in Emily Inglethorp's bedroom, the morning after she died before dawn of strychnine. Hastings has fetched you. The doors were locked from the inside and the household broke one in. At your feet: a coffee cup ground to powder in the carpet. End on the household waiting on the landing for you to speak.",
    offscreenScenes:
      "Show what the household does elsewhere through what Poirot finds or hears afterwards.",
    claims:
      "The Player may state Poirot's words and actions, not what he finds or what others confess; those the Writer resolves.",
  },
  characters: [
    {
      name: "Hercule Poirot",
      aliases: "Poirot; Monsieur Poirot; the little Belgian",
      role: "A retired Belgian detective, a war refugee lodging in the village, once helped by Emily Inglethorp.",
      core: "Vain, exact and kind. Straightens ornaments when he thinks. Trusts order and method over hunches.",
      want: "To find the truth and see the right people answer for it.",
      wantPriority: "",
      fearOrWeakness:
        "Pride: he keeps his reasoning to himself until he is sure, and that can cost time.",
      lines: "Never accuses without proof.",
      speech:
        "Precise, French phrases, 'mon ami'; the little grey cells. Short questions, sudden certainties.",
      knows:
        "Emily Inglethorp was kind to the Belgian refugees. Strychnine is bitter and acts within an hour or two.",
      believes: "Every fact must have its place.",
      ties: [
        {
          toward: "Arthur Hastings",
          wants: "A sounding board who says the obvious aloud.",
          friction: "Hastings talks too freely.",
          startsAs: "Old friends, fond and teasing.",
        },
      ],
    },
    {
      name: "Arthur Hastings",
      aliases: "Hastings; Captain Hastings",
      role: "An invalided army officer convalescing at Styles as John's guest.",
      core: "Loyal, honest, romantic, quick to conclusions and slow to see through people.",
      want: "To help Poirot and to be right for once.",
      wantPriority: "",
      fearOrWeakness: "He believes whoever is charming.",
      lines: "Never betrays a friend's confidence on purpose.",
      speech: "Plain English, eager, a little pompous. 'I say, Poirot!'",
      knows:
        "The household quarrels; he heard Emily quarrel with someone the afternoon before she died.",
      believes: "Alfred Inglethorp did it; Evelyn Howard is a good sort.",
      ties: [
        {
          toward: "Evelyn Howard",
          wants: "Her good opinion.",
          friction: "",
          startsAs: "Admiring; he trusts her blunt honesty.",
        },
      ],
    },
    {
      name: "Alfred Inglethorp",
      aliases: "Inglethorp; Mr. Inglethorp",
      role: "Emily's husband, twenty years younger, who inherits her money.",
      core: `Smooth, black-bearded, suspiciously calm. ${hidden("A patient schemer who wants to be suspected.")}`,
      want: `To inherit. ${hidden("And to be accused early, on weak evidence, so he can be acquitted and never tried again.")}`,
      wantPriority: "",
      fearOrWeakness: hidden(
        "A letter he wrote to Evelyn survives, torn into spills in the bedroom vase."
      ),
      lines: hidden("Never shows Evelyn warmth in front of anyone."),
      speech: "Soft, polite, evasive. 'I really cannot say.'",
      knows: hidden(
        "Everything: he and Evelyn planned the murder, and Evelyn bought the strychnine dressed as him."
      ),
      believes: "",
      ties: [
        {
          toward: "Evelyn Howard",
          wants: hidden(
            "To keep their partnership hidden until the money is safe."
          ),
          friction: "In public she loathes him.",
          startsAs: `Open enemies. ${hidden("Secret lovers and cousins.")}`,
        },
      ],
    },
    {
      name: "Evelyn Howard",
      aliases: "Miss Howard; Evie",
      role: "Emily's companion, who left Styles after a row about Alfred days before the death.",
      core: `Gruff, mannish, loud in her hatred of Alfred. ${hidden("Every word of that hatred is a performance.")}`,
      want: `To see Alfred hang, she says. ${hidden("To share Emily's money with him.")}`,
      wantPriority: "",
      fearOrWeakness: hidden(
        "She added the bromide that made the tonic deadly and handled the poison register; both can be traced."
      ),
      lines: "Never cries in front of anyone.",
      speech:
        "Clipped, telegraphic, no articles. 'Told her so. Wouldn't listen.'",
      knows: hidden(
        "She bought strychnine at the village chemist disguised as Alfred and signed his name."
      ),
      believes: "",
      ties: [
        {
          toward: "Alfred Inglethorp",
          wants: hidden("Him free and rich, with her."),
          friction: "",
          startsAs: `Sworn enemy, loudly. ${hidden("Partner in murder.")}`,
        },
        {
          toward: "Hercule Poirot",
          wants: "Him to prove Alfred guilty.",
          friction: "She thinks he dithers.",
          startsAs: "Brusque allies.",
        },
      ],
    },
    {
      name: "John Cavendish",
      aliases: "John; Mr. Cavendish",
      role: "Emily's elder stepson, master of Styles in name, poor in fact.",
      core: "Easy-going, stubborn, out of his depth. Hides money troubles and a flirtation.",
      want: "To keep Styles and his marriage.",
      wantPriority: "",
      fearOrWeakness: "He looks guilty: debts, a motive, and a bad temper.",
      lines: "Never accuses his brother.",
      speech: "Short, irritable, gentlemanly.",
      knows:
        "His stepmother made several wills; he does not know which stands.",
      believes: "Alfred did it and will get away with it.",
      ties: [
        {
          toward: "Alfred Inglethorp",
          wants: "Him gone from Styles.",
          friction: "Open contempt.",
          startsAs: "Hostile.",
        },
      ],
    },
  ],
  places: [
    {
      name: "Mrs. Inglethorp's bedroom",
      description:
        "Large, three doors, all bolted that night; a dispatch case, a grate with a burnt paper, a vase of paper spills on the mantel.",
      connectsTo: "The upstairs landing.",
      whatHappensHere: "The death and most of the physical evidence.",
    },
    {
      name: "The village of Styles St. Mary",
      description:
        "Pub, post office, Leastways Cottage where Poirot lodges, and the chemist's shop.",
      connectsTo: "Styles Court, a short walk.",
      whatHappensHere:
        "The poison register; witnesses; the inquest at the Stylites Arms.",
    },
    {
      name: "The drawing room at Styles",
      description: "Where the household gathers and lies to one another.",
      connectsTo: "The hall and the bedroom above.",
      whatHappensHere: "Interviews and the final reckoning.",
    },
  ],
  worldRules: [
    {
      rule: "A man acquitted of a crime cannot be tried again for the same crime.",
      allows: hidden(
        "The conspirators' plan: get Alfred acquitted on weak evidence."
      ),
      costOrLimit:
        "An accusation made too early, on weak proof, frees the guilty for good.",
      cannotDo: "",
      exceptions: "",
    },
    {
      rule: "The police act on evidence, not on Poirot's word.",
      allows: "",
      costOrLimit: "Every accusation needs something Inspector Japp can hold.",
      cannotDo: "",
      exceptions: "",
    },
  ],
  promises: [
    {
      promise: "The smashed coffee cup matters.",
      setup: "Ground into the carpet in the first scene.",
      payoff: `It does: ${hidden("the poison was never in the coffee; the cup is a distraction, and the strychnine was in the tonic.")}`,
      earliestArc: ARC_1,
    },
  ],
  arcs: [
    {
      name: ARC_1,
      description: "Poirot examines the bedroom and questions the household.",
      function: "Plant the clues and make Alfred the obvious suspect.",
      setPieces: "",
      mustLandMoments:
        "The smashed cup.\nThe burnt paper in the grate.\nThe chemist says Alfred bought strychnine on Monday evening.",
      stakes: "The police will soon arrest someone.",
      ifLandedEarly: "",
      agendas: [
        {
          character: "Alfred Inglethorp",
          want: hidden("To look as guilty as possible without proof."),
          steps: hidden(
            "Refuse to account for Monday evening.\nLet the household see him calm."
          ),
          ifBlocked: "",
        },
      ],
    },
    {
      name: ARC_2,
      description: "The inquest at the Stylites Arms returns wilful murder.",
      function: "Test whether Poirot lets Alfred be charged.",
      setPieces: "",
      mustLandMoments:
        "The verdict of wilful murder.\nJapp arrives to arrest someone.",
      stakes: "If Alfred is arrested now, the case is lost.",
      ifLandedEarly: "",
      agendas: [
        {
          character: "Evelyn Howard",
          want: hidden("To get Alfred arrested quickly."),
          steps: hidden(
            "Swear to his guilt loudly.\nPress Poirot and the police to act."
          ),
          ifBlocked: hidden("Shift suspicion onto John."),
        },
      ],
    },
    {
      name: ARC_3,
      description: "Poirot connects the two enemies.",
      function: "Turn the evidence on the pair.",
      setPieces: "",
      mustLandMoments: "The letter in the spill vase is found or lost.",
      stakes: "Name both with proof, or one goes free.",
      ifLandedEarly: "",
      agendas: [
        {
          character: "Alfred Inglethorp",
          want: hidden("To recover the letter before Poirot finds it."),
          steps: hidden("Search the bedroom at night."),
          ifBlocked: hidden("Flee with Evelyn."),
        },
      ],
    },
  ],
  secrets: [
    {
      secret: hidden(
        "Evelyn bought the strychnine disguised as Alfred and forged his signature."
      ),
      whoKnows: "Alfred Inglethorp, Evelyn Howard",
      howItSurfaces:
        "A false black beard in the dressing-up chest; Alfred can prove he was elsewhere on Monday evening; the register signature is not quite his hand.",
      earliestArc: ARC_1,
      whatPlayerCanDo:
        "Clear Alfred of the purchase, and ask who could pass for him.",
    },
    {
      secret: hidden(
        "Evelyn added bromide to the tonic so the last dose held all the strychnine."
      ),
      whoKnows: "Evelyn Howard",
      howItSurfaces:
        "An empty box of bromide powders; the dispenser can explain the chemistry.",
      earliestArc: ARC_2,
      whatPlayerCanDo:
        "Prove the death was planned days ahead, when Evelyn was still in the house.",
    },
    {
      secret: hidden("Alfred and Evelyn are lovers working together."),
      whoKnows: "Alfred Inglethorp, Evelyn Howard",
      howItSurfaces:
        "Torn spills in the bedroom vase, re-straightened in haste, piece together Alfred's letter to Evelyn.",
      earliestArc: ARC_3,
      whatPlayerCanDo: "Accuse both at once with proof.",
    },
  ],
  endings: [
    {
      name: "Both Unmasked",
      kind: "good",
      trigger:
        "Poirot names Alfred Inglethorp and Evelyn Howard together and produces the letter from the spill vase.",
      earliestArc: ARC_3,
    },
    {
      name: "The Wrong Arrest",
      kind: "bad",
      trigger:
        "Poirot accuses an innocent, or accuses Alfred alone before he can be tied to Evelyn, so Alfred is tried, acquitted and safe for ever.",
      earliestArc: ARC_1,
    },
    {
      name: "Not Proven",
      kind: "neutral",
      trigger:
        "Poirot lets the police charge John Cavendish and does not name the pair; John is tried and acquitted and the killers go free.",
      earliestArc: ARC_2,
    },
  ],
  writerMayInventEndings: false,
  stateFlags: [
    {
      flag: "The letter",
      values: "found\nlost",
      epilogue:
        "The letter in Alfred's hand is read aloud at the trial.\nAlfred burns the last scrap of his letter, and Styles never learns why.",
    },
    {
      flag: "John's name",
      values: "cleared\nshadowed",
      epilogue:
        "John and Mary Cavendish keep Styles and their marriage.\nThe village still whispers about John Cavendish.",
    },
  ],
  voiceAndCanon: {
    voice:
      "Fast, crisp detective prose. Short description, much dialogue, put the reader in the action at once.",
    samplePassage:
      'The door hangs from one hinge. You step over the splinters. "Who broke it?" you ask.\n"I did," says John. "All three were bolted."\nYou look down. A coffee cup lies ground to powder in the carpet, a dark stain beside it. You crouch. The fragments are too fine for a fall: someone stood on this, deliberately.\n"Poirot?" Hastings hovers. "Is it important?"\n"Everything is important, mon ami." You straighten a candlestick on the mantel. "Who brought her coffee last night?"',
    fixedFacts:
      "Emily Inglethorp died of strychnine before dawn. Her bedroom doors were locked from the inside.",
    writerMayInvent: "Minor servants, weather, small talk.",
    writerMustNotInvent: "New suspects, new poisons, or a third conspirator.",
    pacing:
      "Too slow is the Author's main complaint: no paragraph-long blocks; scenes open mid-action and end on a question or a find.",
    never: "Never state the Hidden text outright.\nNo long recaps.",
  },
}
