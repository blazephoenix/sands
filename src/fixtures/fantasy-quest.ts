/** Fixture: a fantasy quest where whom the Player trusts among three factions decides the Ending (Scenario A: choices, consequences, replayability). */
import type { Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

export const fantasyQuest: Skeleton = {
  story: {
    title: "Three Dawns at Thornwick",
    premise:
      "A stranger offers Sable Kerr ninety crowns to fetch the Tidestone, the stolen stone that holds Thornwick's Weir, out of a barrow full of restless dead. In three dawns the Weir breaks and the lower town drowns. The Wardens want the stone set back, the Lantern Guild wants to buy it, and the Reedfolk want it unbound to give back the land the Weir drowned. Each tells Sable a different story about the Weir, and Sable must decide whom to trust with the stone.",
    genre: "Fantasy adventure",
    theme:
      "Who you trust decides who pays: every bargain costs someone who isn't at the table.",
    setting:
      "Thornwick, a river town in a hill valley: the upper town on the ridge, the lower town by the river, and above both the Weir, a warded stone dam holding back the Mere, a lake that drowned the Low Fen sixty years ago.",
    period:
      "An age of lanterns, crossbows and guild foundries; three days in early autumn.",
    basedOn: "Original",
  },
  playSettings: {
    playerCharacter: "Sable Kerr",
    pointOfView:
      "Second person, present tense: the Player is Sable Kerr, “you”.",
    opening:
      "Start in the middle of Corwin Ashe's offer at a corner table of the Crooked Lantern: ten crowns already on the table, ninety more for a blue stone lying in Gallow Barrow, and three dawns before the Weir fails and the lower town drowns. Water is dripping through the ceiling. Before Sable can answer, Ilsa Dorn's Wardens kick in the inn door hunting the thief, and Corwin heads for the kitchen door. Make plain in the first Passage: the stone, where it is, the deadline, and that Warden law hangs whoever holds the stone.",
    offscreenScenes:
      "At most one short cut-away per Arc (two or three lines) of a faction moving: Pell's runner reporting, Ilsa reading the Weir's cracks. Never surface a Secret in one.",
    claims:
      "The Player may state Sable's own deeds and small results: climbing, lighting a lantern, landing a punch on a Guild bravo. Never that another character believes them, hands something over, or that a Secret is true.",
  },
  characters: [
    {
      name: "Sable Kerr",
      aliases: "Kerr",
      role: "The Player character: a sellsword between jobs, two days in Thornwick",
      core: "Practical, quick-handed, owes nobody",
      want: "Enough coin to winter somewhere warm, and to leave Thornwick alive",
      wantPriority: "Alive first, paid second",
      fearOrWeakness: "Cannot swim",
      lines: "Never kills someone who has surrendered.",
      speech:
        "Short and dry. “Ninety crowns buys a fetch. It doesn't buy questions answered wrong.”",
      knows:
        "Nothing of Thornwick's history; has heard the Weir is warded and old.",
      believes: "Everyone in a town like this is selling something.",
      ties: [
        {
          toward: "Corwin Ashe",
          wants: "The pay he promised",
          friction: "He answers every question with a joke",
          startsAs: "Strangers, as of ten minutes ago",
        },
      ],
    },
    {
      name: "Corwin Ashe",
      aliases: "The stranger",
      role: "The stranger who offers the quest",
      core: "Charming, quick, always halfway to the door",
      want: hidden(
        "The four hundred crowns Pell Osk still owes him for the theft, and a boat out of the valley before the barrow dead or the Wardens find him."
      ),
      wantPriority: "His skin first, then the money",
      fearOrWeakness:
        "The barrow dead. He keeps his left hand gloved and flinches at running water.",
      lines:
        "Never sets foot past the Gallow Barrow threshold again.\nNever harms Sable with his own hand; he would rather lie.",
      speech:
        "Fast, friendly, turns every question back. “Who said anything about stealing? I said fetch.”",
      knows: hidden(
        "He and two others stole the Tidestone for Pell Osk, who paid half up front. The other two died in Gallow Barrow when the dead rose, and the dead marked his left palm."
      ),
      believes:
        "His cover story, told as fact: the town council has quietly hired him to recover the stone without a panic. " +
        hidden(
          "He also believes Pell will pay him and let him go; she means to hand him to the Wardens as the thief."
        ),
      ties: [
        {
          toward: "Sable Kerr",
          wants: "The stone out of the barrow and into his hands",
          friction: "He is lying about who he works for",
          startsAs:
            "Strangers; he picked Sable for the sword and the empty purse",
        },
        {
          toward: "Pell Osk",
          wants: "His four hundred crowns",
          friction: "He doesn't trust her, and she knows it",
          startsAs: hidden("Her hired thief, owed the second half"),
        },
        {
          toward: "Ilsa Dorn",
          wants: "Never to meet her",
          friction: "She hangs thieves",
          startsAs: "Strangers; her Wardens have his description",
        },
      ],
    },
    {
      name: "Ilsa Dorn",
      aliases: "The Captain",
      role: "Warden-Captain of the Weir; speaks for the Weirwardens",
      core: "Dutiful, blunt, fair by the letter of the law",
      want: "The Tidestone back in the Weir's socket before the third dawn, and its thief hanged",
      wantPriority: "The stone before the thief",
      fearOrWeakness:
        "That the Weir fails on her watch, as it nearly did under her father",
      lines:
        "Never lets the stone be taken from the Weir or the Weir opened while she believes it protects the town.\nNever takes a bribe.\nNever breaks her word once given before witnesses.",
      speech:
        "Orders, no softening. “You hold it, you hang for it. Unless you bring it to me. Choose.”",
      knows:
        "Where every crack in the Weir runs, and that it holds only until the third dawn without the stone.",
      believes:
        "The Low Fen flooded by accident in the great storm sixty years ago, and the Weir was raised afterwards to save Thornwick; the Wardens' founders were heroes.",
      ties: [
        {
          toward: "Pell Osk",
          wants: "The Guild's money for Weir repairs",
          friction:
            "The Guild pays the Wardens' wages, and Ilsa resents every coin",
          startsAs: "Uneasy allies",
        },
        {
          toward: "Tamsin Rook",
          wants: "The Reedfolk off the Weir road",
          friction: "Ilsa has jailed Reedfolk for trespass on the Weir steps",
          startsAs: "Old enemies",
        },
        {
          toward: "Sable Kerr",
          wants: "The stone, delivered",
          friction: "By her own law Sable hangs",
          startsAs: "Strangers",
        },
      ],
    },
    {
      name: "Pell Osk",
      aliases: "The Guildmistress",
      role: "Guildmistress of the Lantern Guild; speaks for the Guild",
      core: "Gracious, patient, always counting; never raises her voice",
      want:
        "The Tidestone in the Guild's foundry and the old Weir replaced by the Guild's iron sluice: light and work for all of Thornwick, as she tells it. " +
        hidden(
          "In truth the sluice is half-built. She wants the Weir to fail, the lower town to flood, and its ruined land bought cheap for the Guild."
        ),
      wantPriority: "The land, then the stone, then the Wardens humbled",
      fearOrWeakness: "Proof in someone else's hands",
      lines:
        "Never does violence with her own hands; she sends bravos.\nNever puts an admission in writing.",
      speech:
        "Warm, unhurried, full sentences; calls everyone “friend”. “Five hundred crowns, friend, and nobody hangs. Isn't that kinder?”",
      knows: hidden(
        "She hired Corwin Ashe and the two dead thieves to steal the stone. She holds the Weir founders' survey, which orders the Low Fen “cleared by water”: proof the drowning was deliberate."
      ),
      believes:
        "That the Reedfolk are a spent force no one will stand with, and that nobody alive can tie the theft to her once Corwin hangs.",
      ties: [
        {
          toward: "Corwin Ashe",
          wants: hidden("The stone, then Corwin hanged as the only witness"),
          friction: "He knows her name",
          startsAs: hidden("Her hired thief"),
        },
        {
          toward: "Ilsa Dorn",
          wants: "The Wardens disgraced and dependent on Guild coin",
          friction: "Ilsa cannot be bought",
          startsAs: "Uneasy allies",
        },
        {
          toward: "Sable Kerr",
          wants: "The stone sold to her",
          friction: "Sable can say no",
          startsAs: "Strangers",
        },
      ],
    },
    {
      name: "Tamsin Rook",
      aliases: "The Speaker",
      role: "Speaker for the Reedfolk, whose villages lie under the Mere",
      core: "Patient, stubborn, wry; never forgets a debt",
      want: "The Tidestone unbound at the Weir's heart by the Reedfolk rite, so the Mere drains back down its old course over a season and the Low Fen returns",
      wantPriority: "The Fen back, but no one drowns for it",
      fearOrWeakness:
        "That she is the last Speaker and the Fen becomes only a story",
      lines:
        "Never lets the lower town drown to get the Fen back.\nNever lies outright; she refuses to answer instead.",
      speech:
        "Low and dry; answers questions with questions. “Your Weir's sixty years old, Kerr. My grandmother's house is six hundred. Which one's in the way?”",
      knows:
        "The rite of unbinding, and that the Fen was drowned on purpose: her grandmother watched Wardens close the sluices on a dry day. " +
        hidden(
          "The rite needs a bare hand on the stone until it goes quiet, and that hand never feels warmth again. She means to pay it herself and has told no one."
        ),
      believes:
        "That every Warden knows the truth about the Fen and lies about it. Ilsa Dorn does not know.",
      ties: [
        {
          toward: "Ilsa Dorn",
          wants: "The Weir opened",
          friction: "Ilsa has jailed her people",
          startsAs: "Old enemies",
        },
        {
          toward: "Sable Kerr",
          wants: "The stone carried to the Weir and unbound, not set back",
          friction: "Sable is an outsider being paid by someone",
          startsAs: "Strangers",
        },
      ],
    },
  ],
  places: [
    {
      name: "The Crooked Lantern",
      description:
        "A low upper-town inn of black beams; its ceiling weeps every time the Weir groans.",
      connectsTo:
        "The upper town's streets; a kitchen door onto the mill race path",
      whatHappensHere:
        "The Opening: Corwin's offer and the Warden raid. Neutral ground for meetings after.",
    },
    {
      name: "Gallow Barrow",
      description:
        "A grassed hill barrow two miles up the mill race. Its lower hall is flooded to the waist; the Tidestone lies on a stone ledge among the dead.",
      connectsTo: "The mill race path; the ford where the Reedfolk watch",
      whatHappensHere:
        "The descent: the two dead thieves, the Guild-sealed purse, Corwin's knife, and the dead rising as the stone is lifted.",
    },
    {
      name: "The Guildhall",
      description:
        "The Lantern Guild's brass-doored hall in the upper town, with the foundry yard behind it where the iron sluice stands under tarps.",
      connectsTo: "The upper town; the Weir road",
      whatHappensHere:
        "Pell's offers; the archive holding the founders' survey and the Guild ledger; the sluice, which looks finished from the gallery and isn't from the ground.",
    },
    {
      name: "The Drowned Steeple",
      description:
        "A church spire standing out of the Mere, the Reedfolk's punts and reed huts lashed around it; the drowned bell hangs below the waterline.",
      connectsTo: "The ford, by punt; the Weir's outer steps, by water",
      whatHappensHere:
        "Tamsin's story of the Fen; the bell heard underwater; the Reedfolk readying the rite.",
    },
    {
      name: "The Weir",
      description:
        "A wall of green stone across the valley's throat with Wardens on its walk. Inside is the heart chamber: the empty socket and the old sluice log.",
      connectsTo:
        "The Weir road from the upper town; the outer steps down to the Mere; the lower town below its face",
      whatHappensHere:
        "Ilsa's command post; the final confrontation; the stone set back, unbound, or carried away.",
    },
  ],
  worldRules: [
    {
      rule: "The Tidestone commands the water near it.",
      allows:
        "Whoever holds it bare-handed can part, still or push water within a stone's throw: hold back a flooded corridor, calm a current, throw gutter water across an alley.",
      costOrLimit:
        "Each use numbs the holding hand to the wrist for an hour; a third use in one day drops the holder senseless.",
      cannotDo:
        "Make water from nothing, hurt anyone except by moving water, or be broken by blade, hammer or fire.",
      exceptions:
        "Set in its socket at the Weir's heart, it holds the whole Mere. Only the Reedfolk rite releases it, and then the Mere drains slowly over a season.",
    },
    {
      rule: "The dead of Gallow Barrow keep what lies with them.",
      allows:
        "Anyone may enter; the dead stay still until something is lifted from its place.",
      costOrLimit:
        "The dead chase whoever takes something to the threshold. A thief they touch carries a black handprint on the palm, and the dead can follow that mark up any river for a year.",
      cannotDo:
        "Cross the barrow threshold in daylight, or cross water held still by the Tidestone.",
      exceptions: "What the dead are given back, they stop chasing.",
    },
    {
      rule: "Under Warden law, whoever is found holding the Tidestone outside the Weir hangs as its thief.",
      allows: "Any Warden may arrest the holder on sight.",
      costOrLimit:
        "A Warden-Captain can pardon, but only by giving her word before witnesses.",
      cannotDo:
        "Wardens cannot enter the Guildhall or the Drowned Steeple without the Guild's or the Speaker's leave.",
      exceptions:
        "Whoever carries the stone into the Weir's heart chamber of their own will is not its thief.",
    },
  ],
  promises: [
    {
      promise: "Corwin's glove",
      setup:
        "Corwin never takes off his left glove and won't shake hands; near water, it darkens from the inside.",
      payoff:
        "The barrow dead come up the river for his marked hand at the Weir, and Sable decides whether to still the water for him.",
      earliestArc: "The Weir",
    },
    {
      promise: "The weeping ceilings",
      setup:
        "Every time the Weir groans, water seeps through Thornwick's ceilings and cellars, and each groan is louder than the last.",
      payoff: "The Weir splits along its face.",
      earliestArc: "The Weir",
    },
    {
      promise: "The drowned bell",
      setup:
        "The Reedfolk say the drowned church bell rings under the Mere when the water is about to move; Sable hears it faintly at the Drowned Steeple.",
      payoff:
        "The bell rings clear in the open air as the Mere drains, or tolls as the Weir breaks.",
      earliestArc: "The Weir",
    },
  ],
  arcs: [
    {
      name: "The Barrow",
      description:
        "Day one. Sable takes Corwin's job, slips the Wardens, and goes into Gallow Barrow for the stone while every faction learns someone is after it.",
      function: "Sable Kerr has carried the Tidestone out of Gallow Barrow.",
      setPieces:
        "Ilsa's Wardens kick in the Crooked Lantern's door mid-offer\nA chase along the mill race with Wardens or Guild bravos behind\nThe dead rise from the flooded hall as the stone is lifted, and the stone parts the water for Sable's escape",
      mustLandMoments:
        "Corwin stops at the barrow threshold and will not cross; the dark inside reaches for his gloved hand.\nIn the barrow Sable finds the two dead thieves, one with a purse sealed in Lantern Guild wax.",
      stakes:
        "The Mere rises a hand's width every hour the stone is gone, and Sable's neck under Warden law. If the story stalls: a Warden patrol closes in, the barrow water rises over the stone's ledge, or the dead begin to stir early.",
      ifLandedEarly:
        "If Sable learns of the Guild seal or Corwin's mark before the barrow, keep the Agendas: Corwin denies it, then admits only that “a buyer” is paying.",
      agendas: [
        {
          character: "Corwin Ashe",
          want: "The stone out of the barrow and in his hands before any Warden sees it",
          steps:
            "Close the deal before the Wardens reach the inn\nLead Sable out through the kitchen and up the mill race to the barrow\nStop at the threshold and send Sable in alone with a rope and a hooded lantern\nWhen Sable comes out, ask to carry the stone “for safety” and offer the rest of the pay",
          ifBlocked:
            "Stick close, remind Sable the Wardens hang whoever holds it, and steer them toward the Guildhall.",
        },
        {
          character: "Ilsa Dorn",
          want: "Find the thief",
          steps:
            "Raid the Crooked Lantern on a tip\nPost the Warden law at every gate\nRide the barrow road at dusk",
          ifBlocked:
            "Post a reward of one hundred crowns for the stone, brought to the Weir.",
        },
        {
          character: "Pell Osk",
          want: "Know who has the stone",
          steps:
            "Send a Guild runner with a lantern badge after Corwin\nPut two Guild bravos on the barrow road",
          ifBlocked: "Send Sable a written invitation to the Guildhall.",
        },
        {
          character: "Tamsin Rook",
          want: "See who comes out of the barrow",
          steps:
            "Set Reedfolk watchers in the reeds by the ford\nMeet Sable at the ford on the way back and ask them to bring the stone to the Drowned Steeple",
          ifBlocked:
            "Leave a reed token and a message: “Ask the Wardens why the Fen flooded.”",
        },
      ],
    },
    {
      name: "Three Bidders",
      description:
        "Day two. Thornwick knows someone holds the stone. Each faction bids for it in person while Sable digs for who is lying.",
      function:
        "Sable Kerr has heard an offer for the Tidestone in person from each of Ilsa Dorn, Pell Osk and Tamsin Rook, and has told one of them where the stone is going.",
      setPieces:
        "Guild bravos corner Sable in a lamplit alley; the stone throws the gutter water\nTamsin poles Sable out to the Drowned Steeple, where the bell sounds under the water\nIlsa offers a pardon on the Weir walk while the stones groan underfoot",
      mustLandMoments:
        "Pell shows Sable the iron sluice from the Guildhall gallery as proof the Weir can be replaced.\nCorwin's cover breaks: Sable learns he was one of the thieves, from Corwin, Ilsa or Pell.",
      stakes:
        "The seep in the lower town becomes a spout, Sable's freedom, and Corwin's life. If the story stalls: the Weir drops a stone into the lower town, a Warden patrol corners Sable, or Pell's bravos try force.",
      ifLandedEarly:
        "If Corwin is unmasked before an Agenda Step causes it, Pell and Ilsa skip to their next Step at once.",
      agendas: [
        {
          character: "Corwin Ashe",
          want: "Get paid and get out before Pell or the Wardens turn on him",
          steps:
            "Press Sable to sell to Pell and set the meeting at the Guildhall\nTry to take the stone while Sable sleeps",
          ifBlocked:
            "Run to Ilsa and offer to testify against Pell in exchange for his life.",
        },
        {
          character: "Pell Osk",
          want: "Buy the stone, and cut Corwin loose",
          steps:
            "Offer Sable five hundred crowns and a Guild seat\nShow the sluice from the gallery\nTip Ilsa that Corwin is the thief\nSend bravos to take the stone",
          ifBlocked:
            "Offer the founders' survey, proof against the Wardens, in exchange for the stone.",
        },
        {
          character: "Ilsa Dorn",
          want: "The stone delivered to the Weir",
          steps:
            "Find out who holds the stone\nOffer Sable a pardon before witnesses and the reward if it reaches the Weir by the next dusk\nArrest Corwin on Pell's tip",
          ifBlocked:
            "Declare Sable outlaw and double the patrols on the Weir road.",
        },
        {
          character: "Tamsin Rook",
          want: "Win Sable to the rite",
          steps:
            "Bring Sable to the Drowned Steeple and show the drowned village\nTell the Fen's story\nAsk Sable to carry the stone to the Weir's heart at the third dawn",
          ifBlocked:
            "Ready the Reedfolk to meet Sable at the Weir's outer steps anyway.",
        },
      ],
    },
    {
      name: "The Weir",
      description:
        "The last night. The Weir splits and every faction converges on it. The Wardens hold the heart chamber, so the rite can happen only if Ilsa stands aside.",
      function:
        "The Tidestone's fate is settled: set in the Weir's socket, unbound by the rite, or gone out of the valley.",
      setPieces:
        "Water bursts through the Weir's face above the lower town\nPell's bravos storm the Weir gate\nThe barrow dead climb the outer steps for Corwin",
      mustLandMoments:
        "The Weir splits along its face and the Mere starts pouring through before the stone's fate is decided.\nSable faces at least two of Ilsa Dorn, Pell Osk and Tamsin Rook at once at the Weir.",
      stakes:
        "The lower town, within hours. If the story stalls, the crack widens, the lower town's lamps go out one by one under the water, and the dead reach the Weir walk.",
      ifLandedEarly:
        "Let the crack worsen, and keep every Agenda running toward the Weir.",
      agendas: [
        {
          character: "Ilsa Dorn",
          want: "Hold the Weir until the stone is back",
          steps:
            "Bar the Weir gate\nDemand the stone from whoever brings it\nSet it in the socket herself",
          ifBlocked:
            "If shown proof of a Secret, stand aside before witnesses; otherwise fight for the stone.",
        },
        {
          character: "Pell Osk",
          want: "The stone, or the Weir broken",
          steps:
            "Wait in a carriage on the north road\nSend bravos to take the stone at the Weir gate",
          ifBlocked: "Flee north with the land deeds.",
        },
        {
          character: "Tamsin Rook",
          want: "Unbind the stone at the third dawn",
          steps:
            "Gather the Reedfolk at the outer steps\nBegin the rite's chant\nTake the stone in her bare hand",
          ifBlocked:
            "Stand aside and ask Sable to remember the Fen; she will not risk the town.",
        },
        {
          character: "Corwin Ashe",
          want: "Survive the night",
          steps:
            "Make for the river with whatever he was paid\nBeg Sable for the stone's protection when the dead come",
          ifBlocked: "Turn witness to anyone who will shelter him.",
        },
      ],
    },
  ],
  secrets: [
    {
      secret:
        "Pell Osk paid Corwin Ashe and two others to steal the Tidestone, and her iron sluice is half-built: she wants the Weir to fail so the lower town floods and the Guild buys its land.",
      whoKnows: "Pell Osk, all of it. Corwin Ashe, the hiring only.",
      howItSurfaces:
        "The Guild-sealed purse on a dead thief in Gallow Barrow.\nCorwin names his buyer if cornered, threatened with the Wardens, or offered protection.\nFrom the foundry floor the sluice has no gates hung and no footings poured.\nThe Guild ledger: “Barrow work, 200 crowns, C.A.”",
      earliestArc: "Three Bidders",
      whatPlayerCanDo:
        "Show the proof to Ilsa Dorn, who arrests Pell; squeeze Pell for more; or keep quiet and sell anyway.",
    },
    {
      secret:
        "Sixty years ago the Wardens' founders closed the Weir's sluices on a dry day to drown the Reedfolk villages of the Low Fen and take the valley. There was no storm.",
      whoKnows:
        "Tamsin Rook, from her grandmother. Pell Osk, who holds the founders' survey.",
      howItSurfaces:
        "Tamsin tells it at the Drowned Steeple if Sable has not lied to her.\nThe founders' survey in the Guildhall archive: “the Fen to be cleared by water”.\nThe sluice log in the Weir's heart chamber records the sluices closed on a day logged “fair, dry”.",
      earliestArc: "Three Bidders",
      whatPlayerCanDo:
        "Show Ilsa Dorn, who then stands aside for Tamsin's rite; trade it to Pell; or keep it.",
    },
    {
      secret:
        "Corwin Ashe is the third thief, the only one who came out of Gallow Barrow alive. The dead marked his left palm black, and Pell means to hand him to the Wardens.",
      whoKnows: "Corwin Ashe, except Pell's plan. Pell Osk.",
      howItSurfaces:
        "He will not cross the barrow threshold, and the dark reaches for him.\nThe black handprint under his glove.\nOne dead thief still holds a knife with Corwin's initials on the hilt.",
      earliestArc: "The Barrow",
      whatPlayerCanDo:
        "Hand him to Ilsa for the reward; turn him into a witness against Pell; shield him from the dead with the stone; or leave him.",
    },
  ],
  endings: [
    {
      name: "The Truth at the Weir",
      kind: "good",
      trigger:
        "Sable brings the Tidestone into the Weir's heart chamber before the third dawn and it is either set in its socket or unbound by Tamsin Rook's rite, after Sable has put proof of Pell's hiring of the thieves or of the Fen's deliberate drowning in front of Ilsa Dorn.",
      earliestArc: "The Weir",
    },
    {
      name: "Sold Downriver",
      kind: "bad",
      trigger:
        "Sable hands the Tidestone to Pell Osk or her bravos, sells it through Corwin Ashe, lets Corwin carry it off, or carries it out of the valley; the stone leaves Thornwick and the Weir breaks that night.",
      earliestArc: "Three Bidders",
    },
    {
      name: "The Weir Holds",
      kind: "neutral",
      trigger:
        "Sable sets the Tidestone back in the Weir, or gives it to Ilsa Dorn to set, without having shown her proof of either Secret: the town stays dry and nothing else changes.",
      earliestArc: "The Weir",
    },
  ],
  writerMayInventEndings: false,
  stateFlags: [
    {
      flag: "The Weir",
      values: "Holding\nUnbound\nBroken",
      epilogue:
        "The Weir holds. The stone hums in its socket, and the lower town sleeps dry under sixty-year-old walls.\nThe Weir stands open. By midsummer the Mere has shrunk to its old course, and a church roof rises out of the mud of the Low Fen.\nThe Weir is a broken tooth on the hill. The lower town's streets are a lake, and Guild surveyors already pace its edges.",
    },
    {
      flag: "Pell Osk",
      values: "In chains\nStill Guildmistress",
      epilogue:
        "Pell Osk hangs her lantern badge on a cell hook; the Guild votes in a new mistress before the month is out.\nPell Osk is still Guildmistress, still calling everyone “friend”, and still waiting for the Weir's next bad winter.",
    },
    {
      flag: "Corwin Ashe",
      values: "Gone downriver\nHanged\nTurned witness\nTaken by the dead",
      epilogue:
        "Corwin Ashe turns up once more, two valleys over, in a new glove, telling a new story.\nCorwin Ashe hangs at the Weir gate under Warden law, joking all the way up the ladder.\nCorwin Ashe testifies, walks free, and sends Sable a bottle of something terrible.\nThe barrow dead take Corwin Ashe off the Weir steps, and the river never gives him back.",
    },
  ],
  voiceAndCanon: {
    voice:
      "Fast, physical, second person present. Every Passage opens on something happening: a door kicked in, water at the ankles, a blade drawn. Mix the forms: a line of dialogue, a short burst of action, a one-line beat of place or sound. Let characters talk in short exchanges and interrupt each other. The world is solid: rope, lantern oil, the weight of coin. Danger is real; humor is dry and rare.",
    samplePassage:
      "The coin purse hits the table hard enough to slop your ale.\n\n“Ten crowns now,” the stranger says. “Ninety when you bring it back. Three dawns, or the Weir goes and takes the lower town with it.”\n\nAbove you a beam ticks. Water beads along a crack in the plaster and runs down the wall. Nobody else in the Crooked Lantern looks up.\n\n“Bring what back?”\n\n“A blue stone the size of your fist. It's in Gallow Barrow, under the hill.” He keeps his left hand in his lap, gloved. “I'd fetch it myself.”\n\n“But.”\n\n“But I'd rather you did.”\n\nBoots on the porch. Three pairs, iron-shod. The door handle turns.\n\nCorwin is already up. “Back way's through the kitchen. Coming?”",
    fixedFacts:
      "The Weir was raised sixty years ago.\nThe Tidestone is a fist-sized blue stone, cold to the touch, that hums near water.\nThe stone was stolen two nights before the Opening; without it the Weir fails at the third dawn after the Opening.\nCorwin offers ten crowns now and ninety on delivery; Pell offers five hundred; Ilsa's reward is one hundred crowns and a pardon.\nThe money is crowns.",
    writerMayInvent:
      "Townsfolk, Wardens, Guild bravos and clerks, Reedfolk, the barrow's dead and their grave goods, streets and alleys, gear, food, weather.",
    writerMustNotInvent:
      "Another way to save the Weir, a second Tidestone, new factions, a cure for the barrow mark, or a Secret proven without its proof found in play.",
    pacing:
      "Something changes in every Passage. Keep Passages to 120–220 words. Never more than three sentences of description before someone speaks or acts. End every Passage with the next decision in plain sight: who wants what, and where Sable can go. Reach the barrow within three Passages and all three bidders by the end of day two.",
    never:
      "Never open a Passage on weather, scenery or Sable's feelings.\nNever write more than three sentences of description in a row.\nNever write a Passage without spoken dialogue unless Sable is alone.\nNever summarise a conversation; show it.\nNever leave the Player unsure where they can go next.\nNever use “suddenly”, “ancient”, “a sense of” or “little did you know”.",
  },
}
