/** Fixture: a murder investigation, to test structured progression, tracking what the Player has found, and three Endings that turn on one accusation. */
import type { Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

const ARC_1 = "First Statements"
const ARC_2 = "The Evidence Turns"
const ARC_3 = "The Accusation"

export const murderMystery: Skeleton = {
  story: {
    title: "The Midnight Line",
    premise:
      "The manager of a small regional radio station is found dead in its record library during the station's live late-night phone-in. Four people were in the building. Detective Inspector Ruth Ashdown has until dawn to work out which of them did it and prove it, before the suspects go home and the case goes cold.",
    genre: "Murder mystery",
    theme:
      "A voice everyone heard is not the same as a man everyone saw. What we take as proof is often only what we were told.",
    setting:
      "Kestrel House: Radio Kestrel's offices and studio on the top three floors of a converted wool mill in the northern market town of Carrow. Rain on the windows, the lift that groans, the smell of warm valves and cigarette smoke.",
    period: "The night of Friday 20 November 1964, from 12:20 a.m. to dawn.",
    basedOn: "Original",
  },
  playSettings: {
    playerCharacter: "Ruth Ashdown",
    pointOfView: "Second person, present tense: you are Ruth Ashdown.",
    opening:
      "Cold open at 12:20 a.m. You step out of the lift on the third floor into the Record Library. Leonard Vass lies face down between the shelves, the back of his head broken; a bronze award plaque lies beside him on the lino. The tannoy over the door hisses dead air: the station went off at midnight. Maud Pennick, who found him, stands in the doorway twisting her cardigan. Danny Royce, still in his shirtsleeves from the show, leans on the frame with a cup of tea and offers to help. Within the first exchange Maud blurts the first lead: at ten o'clock Mr Vass told her to put no calls through to his office because he had 'a sacking to do Monday and the papers to get ready for it'. End the Opening with the Manager's Office door down the corridor, and three people still to question.",
    offscreenScenes:
      "What suspects do while Ashdown is not with them happens off the page. Show its results when she next comes upon them: a reel moved, a towel gone, a coat on instead of off.",
    claims:
      "The Player may state Ashdown's own words and actions. They may not state what she finds, what a suspect admits, or what a test or tape shows; those are Attempts.",
  },
  characters: [
    {
      name: "Ruth Ashdown",
      aliases: "The Inspector; Mrs Ashdown",
      role: "Detective Inspector, Carrow CID; the investigator",
      core: "Patient, exact, unimpressed by charm. Writes everything down in a black notebook.",
      want: "To name the killer before dawn, with evidence that will hold.",
      wantPriority: "The truth over a quick result.",
      fearOrWeakness:
        "She has been passed over twice; a wrong arrest would finish her.",
      lines:
        "Never plants or invents evidence.\nNever strikes a suspect.\nNever lets a suspect see her notebook.",
      speech:
        "Short questions, no small talk, a dry pause before the one that matters. 'Start at eleven o'clock. Leave nothing out.'",
      knows:
        "Carrow and its people. She has heard The Midnight Line on her kitchen wireless more nights than she would admit.",
      believes: "",
      ties: [
        {
          toward: "Danny Royce",
          wants: "A straight account, not a performance.",
          friction: "He talks to her as if she were a caller.",
          startsAs: "Strangers; she knows his voice, not his face",
        },
      ],
    },
    {
      name: "Danny Royce",
      aliases: "Danny; the voice of The Midnight Line",
      role: "Presenter of The Midnight Line, 10 p.m. to midnight",
      core: "Warm, quick, helpful to a fault; always performing for an audience of one.",
      want: hidden(
        "To keep his career: get rid of the insert reel and the towel, and make sure someone else is charged."
      ),
      wantPriority: hidden(
        "Not being caught over everything; then pinning it on Frank; then his career."
      ),
      fearOrWeakness:
        "Silence. He fills every pause, and talks himself past the point of safety when pressed.",
      lines:
        "Never harms Ashdown.\nNever confesses unless shown both that the phone-in was not live and why Vass meant to sack him.\nNever leaves Kestrel House before dawn while Ashdown is watching.",
      speech:
        "Easy broadcaster's patter, first names, a little joke on every answer. 'Ten thousand people heard me at a quarter past eleven, Inspector. Ask any of them.'",
      knows: hidden(
        "He killed Vass. Vass had found out Royce was taking cash from a record promoter to play his records, and was going to sack him and report him to the Authority at nine on Monday. At four that afternoon Royce recorded a fake twenty-minute phone-in with friends as callers. At 11:15 he started it on Deck B, left Studio A by the fire door, went down the Back Stairs to the Record Library, struck Vass with the plaque, wiped it with his studio towel, dropped the towel in the fire bucket on the Back Stairs landing, and was back at the microphone by 11:35. After midnight he hid the reel in the Tape Store in a box marked 'Brass Bands 1958'."
      ),
      believes:
        "His cover story: he never left Studio A from ten until midnight; the 11:15 phone-in was live; he last saw Vass at 9:30 and they parted friends.",
      ties: [
        {
          toward: "Frank Tilley",
          wants: "Frank to look guilty.",
          friction: "Frank thinks him a fake and says so.",
          startsAs: "Colleagues who dislike each other",
        },
        {
          toward: "Maud Pennick",
          wants: "Her to keep backing his story about the calls.",
          friction: "She adores him, and he uses it.",
          startsAs: "Fond, on her side",
        },
        {
          toward: "Celia Marsh",
          wants: "Her suspicion on Frank, away from him.",
          friction: "She has never trusted his audience figures.",
          startsAs: "Polite rivals",
        },
      ],
    },
    {
      name: "Maud Pennick",
      aliases: "Mrs Pennick",
      role: "Night switchboard operator and receptionist",
      core: "Loyal, frightened, house-proud about her ledger.",
      want: "To keep her job and stay out of trouble.",
      wantPriority: "",
      fearOrWeakness:
        "Vass had cut her hours; she was heard calling him 'a dead man walking' at ten o'clock.",
      lines:
        "Never lies about what her ledger says once Ashdown reads it.\nNever speaks against Danny Royce until she has seen evidence against him.",
      speech:
        "Fast, apologetic, half the sentences start with 'I'm sure I don't know'. 'I'm sure I don't know, love, I never leave my board.'",
      knows: hidden(
        "She left her board at 11:30 for five minutes to smoke on the roof, a sacking offence. From the roof door she saw a man in shirtsleeves on the Back Stairs landing going down. Her ledger shows no call put through to the studio between 11:08 and 11:41."
      ),
      believes:
        "Her cover story: she never left her board. She believes the phone-in callers came through on some studio line of their own.",
      ties: [
        {
          toward: "Danny Royce",
          wants: "His good opinion.",
          friction: "None she will admit.",
          startsAs: "Devoted fan",
        },
        {
          toward: "Celia Marsh",
          wants: "To be left alone.",
          friction: "Celia once reported her for knitting at the board.",
          startsAs: "Wary",
        },
      ],
    },
    {
      name: "Frank Tilley",
      aliases: "Frank",
      role: "Night engineer; runs the transmitter and the logger",
      core: "Blunt, proud of his machines, slow to trust.",
      want: "To keep his notice quiet and his pension safe.",
      wantPriority: "",
      fearOrWeakness:
        "Vass gave him notice that week; his Capstan cigarette end is in the Record Library.",
      lines:
        "Never lies about his machines.\nNever lets anyone touch the transmitter or the logger without him.",
      speech:
        "Few words, all technical, a grunt for yes. 'Deck B. Counter's moved. Somebody ran it.'",
      knows: hidden(
        "He went to the Record Library at 11:05 to argue about his notice; Vass was alive and said 'Royce is next, on Monday.' He left at 11:10. At midnight Deck B's counter stood twenty minutes past where he had set it at ten."
      ),
      believes:
        "His cover story: he was in the Transmitter Room on the roof from ten to midnight. He believes a thief came up the Back Stairs from the yard.",
      ties: [
        {
          toward: "Danny Royce",
          wants: "Nothing; to be rid of him.",
          friction: "Thinks Royce a fraud and a cheat.",
          startsAs: "Open contempt",
        },
        {
          toward: "Celia Marsh",
          wants: "Her to speak for him about his notice.",
          friction: "She signed it.",
          startsAs: "Resentful respect",
        },
      ],
    },
    {
      name: "Celia Marsh",
      aliases: "Miss Marsh",
      role: "Head of Programmes; Vass's deputy",
      core: "Cool, ambitious, precise; impatient with anyone slower than her.",
      want: "To leave tonight with her papers and her new job intact.",
      wantPriority: "",
      fearOrWeakness:
        "With Vass dead she gets his job, and everyone in the building knows it.",
      lines:
        "Never raises her voice.\nNever gives up the papers in her case without being made to.",
      speech:
        "Clipped, formal, corrects your grammar. 'I left at half past ten. You may confirm it with my husband, who is waiting.'",
      knows: hidden(
        "She did not leave at 10:30. She stayed in the Manager's Office until 11:20 copying audience figures to take to a rival station she joins in January. Vass told her he had 'a sacking to do Monday' but not whom."
      ),
      believes:
        "Her cover story: she left at 10:30. She believes the sacking was Frank's, and that Frank killed him over it.",
      ties: [
        {
          toward: "Frank Tilley",
          wants: "Him to stay out of her way.",
          friction: "She signed his notice.",
          startsAs: "Cold",
        },
        {
          toward: "Danny Royce",
          wants: "Him gone from the schedule.",
          friction: "She thinks his figures are cooked.",
          startsAs: "Polite rivals",
        },
      ],
    },
  ],
  places: [
    {
      name: "The Record Library",
      description:
        "Third floor. Steel shelving to the ceiling, ten thousand records, one green-shaded lamp. Vass's body; the bronze plaque; a cold cup of coffee.",
      connectsTo: "The Studio Corridor and the Back Stairs.",
      whatHappensHere:
        "The body and the weapon. The plaque has been wiped clean. A Capstan cigarette end in the ashtray (Frank's). The key to Vass's desk drawer is in his waistcoat pocket.",
    },
    {
      name: "Studio A",
      description:
        "Off the Studio Corridor. A glass control booth, two tape decks (A and B), a red ON AIR lamp, the studio clock. A fire door at the back opens onto the Back Stairs.",
      connectsTo: "The Studio Corridor and, by the fire door, the Back Stairs.",
      whatHappensHere:
        "Royce's ground. Deck B's counter. Royce's towel hook, empty. Where the suspects are gathered for the accusation.",
    },
    {
      name: "The Manager's Office",
      description:
        "End of the Studio Corridor. Leather chair, desk diary, a locked drawer, Celia's attaché case under the visitor's chair.",
      connectsTo: "The Studio Corridor.",
      whatHappensHere:
        "Vass's diary: 'Mon 9 a.m. D.R. Bring envelopes. Ring the Authority.' In the locked drawer, six cash envelopes from a record promoter with Royce's name on them. Celia's copied audience figures.",
    },
    {
      name: "The Switchboard",
      description:
        "Ground floor lobby. Maud's board of plugs and lamps, her call ledger in blue ink, a paraffin heater, the lift.",
      connectsTo: "The lift and the main stairs to the third floor; the yard.",
      whatHappensHere:
        "Maud's ledger: every call put through, with times. The studio has no outside line except through this board.",
    },
    {
      name: "The Tape Store",
      description:
        "A windowless room of archive reels in brown boxes, a bulk eraser on the bench.",
      connectsTo: "The Back Stairs.",
      whatHappensHere: hidden(
        "The insert reel, in a box marked 'Brass Bands 1958', with 'MID-LINE 11.15' pencilled on the leader in Royce's hand."
      ),
    },
    {
      name: "The Back Stairs",
      description:
        "Concrete fire stairs from the yard up past the Tape Store and the Record Library to Studio A's fire door and the roof, where the Transmitter Room hums. A red fire bucket of sand on the third-floor landing.",
      connectsTo:
        "Studio A, the Record Library, the Tape Store, the yard, and the Transmitter Room on the roof.",
      whatHappensHere:
        "The route no one at the Switchboard can see. In the Transmitter Room, Frank's logger: a slow reel that records everything the station broadcast tonight.",
    },
  ],
  worldRules: [
    {
      rule: "Ashdown may question anyone in Kestrel House and search any room.",
      allows:
        "Keeping all four suspects in the building, searching rooms and bags, and taking anything as evidence.",
      costOrLimit:
        "At 6 a.m. Superintendent Hale arrives; anyone not charged by then goes home, and the case passes out of her hands.",
      cannotDo:
        "Force a confession or make anyone speak; a suspect who refuses simply refuses.",
      exceptions:
        "A suspect caught in a lie on the page can be held for a formal interview in the Manager's Office.",
    },
    {
      rule: "An accusation is final.",
      allows:
        "Ashdown may name the killer to the suspects at any point after the first statements.",
      costOrLimit:
        "Once she names someone in front of a witness, that person is arrested and the others are sent home; it cannot be taken back.",
      cannotDo:
        "A charge without evidence of both how and why does not hold: the accused goes free by Monday.",
      exceptions:
        "Before the first statements are taken, an accusation is only a hunch said aloud: suspects scoff and grow guarded.",
    },
    {
      rule: "Tapes are evidence you can hear.",
      allows:
        "Any reel can be played on Deck A or Deck B, or on the logger with Frank's help.",
      costOrLimit: "A reel takes its own running time to play.",
      cannotDo:
        "A reel passed over the bulk eraser is blank for good and proves nothing.",
      exceptions: "The logger reel cannot be erased without Frank noticing.",
    },
  ],
  promises: [
    {
      promise: "The logger hears everything the station sends out.",
      setup:
        "Early on, Frank mentions in passing that the logger on the roof records every minute of broadcast.",
      payoff:
        "Played back, the 11:15 phone-in has the Carrow town hall clock striking four behind the second caller.",
      earliestArc: ARC_2,
    },
    {
      promise: "Vass's Monday appointment.",
      setup:
        "Maud repeats in the Opening that Vass had 'a sacking to do Monday'; Celia assumes it was Frank's.",
      payoff:
        "The diary and the envelopes in the locked drawer show the sacking was Royce's.",
      earliestArc: ARC_1,
    },
    {
      promise: "The Capstan in the ashtray.",
      setup: "A cigarette end in the Record Library ashtray, Frank's brand.",
      payoff:
        "Frank admits he was there at 11:05 and Vass was alive, which narrows the time of death to after 11:10.",
      earliestArc: ARC_2,
    },
  ],
  arcs: [
    {
      name: ARC_1,
      description:
        "Ashdown takes the scene and the four suspects' first accounts. Everyone has an alibi; two of them are already lying.",
      function:
        "Ashdown has examined the body and the plaque, and has heard each of Danny Royce, Maud Pennick, Frank Tilley and Celia Marsh say where they were between 11:00 and 11:45.",
      setPieces:
        "Royce offering tea and charm in the doorway.\nCelia Marsh coming down the corridor in her coat, case in hand, saying she must go.\nFrank refusing to leave the roof until the transmitter is shut down properly.",
      mustLandMoments:
        "Ashdown sees the wiped plaque and the wound.\nRoyce states his alibi aloud: on air, live, the whole hour.\nCelia says she left at 10:30, and Ashdown notices her coat is dry though it has rained since eleven.",
      stakes:
        "Every suspect is free to wander the building. If the story stalls, Celia reaches the yard and her car; then Frank starts tidying the Record Library 'to keep it decent', and the ashtray is emptied.",
      ifLandedEarly:
        "If Royce volunteers his alibi before he is asked, let him: it is the habit of a man who rehearsed it.",
      agendas: [
        {
          character: "Danny Royce",
          want: "To be the helpful one, and to fix his alibi in Ashdown's mind first.",
          steps:
            "Offer tea and help in the Opening.\nState his alibi before anyone asks.\nMention Frank's notice, as if by accident.",
          ifBlocked:
            "Goes quiet and watches; asks if he may 'tidy the studio', meaning the Back Stairs.",
        },
        {
          character: "Celia Marsh",
          want: "To leave with her case unopened.",
          steps:
            "Give her 10:30 story briskly.\nAsk to go home to her husband.\nTry the yard door.",
          ifBlocked: "Demands a solicitor and sits on her case.",
        },
        {
          character: "Frank Tilley",
          want: "To keep his visit to the Record Library to himself.",
          steps:
            "Stay on the roof as long as he can.\nSay he never came down all night.",
          ifBlocked:
            "Shuts up entirely, which looks worse than anything he could say.",
        },
      ],
    },
    {
      name: ARC_2,
      description:
        "The alibis start to crack. Frank and Maud are caught in small lies that turn out to matter; the evidence that the phone-in was not live is in the building, and Royce is moving to get rid of it.",
      function:
        "Frank has admitted being in the Record Library at 11:05 with Vass alive, and Ashdown has found at least one Clue that the 11:15 phone-in was not live.",
      setPieces:
        "Playing the logger in the Transmitter Room while the rain drums on the roof.\nRoyce found in the Tape Store with a reel in his hand, smiling.\nMaud, in tears, admitting she went up to the roof for a cigarette.",
      mustLandMoments:
        "Frank admits he saw Vass alive at 11:05, and what Vass said.\nAshdown learns that the studio has no outside line except through the Switchboard.",
      stakes:
        "The evidence against Royce is physical and he is free to move. If the story stalls, he first burns the towel in the boiler, then erases the insert reel. Maud's ledger and the logger reel survive whatever he does.",
      ifLandedEarly:
        "If Ashdown finds the insert reel before Royce reaches it, he does not try the Tape Store again; he turns to blaming Frank aloud.",
      agendas: [
        {
          character: "Danny Royce",
          want: hidden("To destroy the towel and the insert reel."),
          steps: hidden(
            "Ask to use the Gents, and take the Back Stairs to the fire bucket.\nCarry the towel to the boiler in the yard.\nGo to the Tape Store and put the insert reel over the bulk eraser.\nTell Ashdown about Frank's cigarette end."
          ),
          ifBlocked:
            "Bluffs: invites Ashdown to listen to the logger herself, betting she will not hear the clock.",
        },
        {
          character: "Maud Pennick",
          want: "To keep her trip to the roof secret.",
          steps:
            "Swear she never left her board.\nOffer her ledger as proof of how careful she is.",
          ifBlocked:
            "Breaks down, admits the roof, and tells what she saw on the Back Stairs.",
        },
        {
          character: "Celia Marsh",
          want: "To keep her papers secret.",
          steps:
            "Point Ashdown at Frank's notice.\nMove her case out of the Manager's Office.",
          ifBlocked:
            "Admits she stayed until 11:20 and saw no one in the corridor, which means no one used it.",
        },
      ],
    },
    {
      name: ARC_3,
      description:
        "Dawn is coming. Ashdown gathers the suspects in Studio A under the dead ON AIR lamp and names a killer, or decides she cannot.",
      function:
        "Ashdown has named someone as the killer in front of the suspects, or has told them the case stays open and let them go.",
      setPieces:
        "The suspects lined up in Studio A, the red lamp off, the clock loud.\nRoyce offering, too brightly, to play everyone the logger.\nSuperintendent Hale's car lights sweeping the yard at six.",
      mustLandMoments:
        "Ashdown confronts the suspect she believes guilty, face to face, with what she has.",
      stakes:
        "A train ticket to London for the 6:40 is in Royce's coat. If the story stalls, Hale arrives at six and takes the case; the suspects go home.",
      ifLandedEarly:
        "If Ashdown confronts Royce before the gathering, play it where she stands; the others hear it through the open door.",
      agendas: [
        {
          character: "Danny Royce",
          want: "To walk out at dawn.",
          steps:
            "Put on his coat.\nOffer to play the logger.\nAccuse Frank to his face.",
          ifBlocked:
            "Talks too much: names a caller who could not have rung, then falls silent.",
        },
        {
          character: "Frank Tilley",
          want: "To be believed.",
          steps: "Repeat what Vass said at 11:05: 'Royce is next.'",
          ifBlocked: "Walks out to the roof and will not come down.",
        },
      ],
    },
  ],
  secrets: [
    {
      secret: hidden(
        "Vass meant to sack Danny Royce at nine on Monday for taking a record promoter's cash, and report him to the Authority."
      ),
      whoKnows:
        "Danny Royce. Frank heard Vass say 'Royce is next'. Celia knows only that a sacking was coming.",
      howItSurfaces:
        "Vass's desk diary in the Manager's Office ('Mon 9 a.m. D.R. Bring envelopes. Ring the Authority.'); the six envelopes with Royce's name in the locked drawer, opened with the key from Vass's waistcoat; Frank's testimony once he admits his visit.",
      earliestArc: ARC_1,
      whatPlayerCanDo:
        "Name Royce's motive; it gives him a reason, though not yet the means against his alibi.",
    },
    {
      secret:
        "No call reached the studio between 11:08 and 11:41, yet the phone-in had three callers.",
      whoKnows:
        "Maud, without seeing what it means. Frank knows the studio has no line of its own.",
      howItSurfaces:
        "Maud's call ledger at the Switchboard, blank for that half-hour; Maud's testimony if asked whether she put callers through to the studio; Frank's testimony about the lines.",
      earliestArc: ARC_2,
      whatPlayerCanDo: "Show that the phone-in was not live.",
    },
    {
      secret: hidden(
        "The phone-in was recorded at four that afternoon and played from Deck B while Royce was out of the studio."
      ),
      whoKnows:
        "Danny Royce. Frank knows Deck B's counter moved twenty minutes that he did not run.",
      howItSurfaces:
        "The logger reel in the Transmitter Room: the town hall clock strikes four behind the second caller; the insert reel in the Tape Store, in the box marked 'Brass Bands 1958', 'MID-LINE 11.15' on its leader in Royce's hand; Frank's testimony about Deck B.",
      earliestArc: ARC_2,
      whatPlayerCanDo:
        "Break Royce's alibi outright, and confront him with his own voice.",
    },
    {
      secret: hidden(
        "Royce went down the Back Stairs from Studio A's fire door at about 11:20 and wiped the plaque with his studio towel."
      ),
      whoKnows:
        "Danny Royce. Maud saw a man in shirtsleeves on the Back Stairs landing at 11:30 from the roof door.",
      howItSurfaces:
        "His towel, stitched 'D.R.' and stained, pushed into the sand of the fire bucket on the third-floor landing of the Back Stairs; the empty towel hook in Studio A; Maud's testimony once she admits leaving her board.",
      earliestArc: ARC_2,
      whatPlayerCanDo:
        "Put Royce on the route to the body during the phone-in, and tie him to the weapon.",
    },
  ],
  endings: [
    {
      name: "Off the Air",
      kind: "good",
      trigger:
        "Ashdown names Danny Royce as the killer in front of a witness, having found the motive (the Monday sacking) and at least one Secret showing the phone-in was not live.",
      earliestArc: ARC_3,
    },
    {
      name: "Dead Air",
      kind: "bad",
      trigger:
        "Ashdown names Maud Pennick, Frank Tilley or Celia Marsh as the killer in front of a witness. The accused is arrested; Royce goes home.",
      earliestArc: ARC_2,
    },
    {
      name: "Case Open",
      kind: "neutral",
      trigger:
        "Ashdown names Danny Royce without having found both the motive and a Secret showing the phone-in was not live, so the charge cannot hold; or she tells the suspects the case stays open and lets them go home.",
      earliestArc: ARC_2,
    },
  ],
  writerMayInventEndings: false,
  stateFlags: [
    {
      flag: "Royce's fate",
      values: "charged\nfree\nunder suspicion",
      epilogue:
        "Danny Royce is tried at Leeds Assizes in March. The Midnight Line is never broadcast again.\nDanny Royce reads the news of the arrest on air on Monday night, and takes three calls about it.\nDanny Royce leaves Carrow for London. Nobody can prove a thing, and everybody knows.",
    },
    {
      flag: "Wrongly accused",
      values: "nobody\nMaud Pennick\nFrank Tilley\nCelia Marsh",
      epilogue:
        "No innocent person spends a night in the cells.\nMaud Pennick is released for want of evidence; she never works a switchboard again.\nFrank Tilley is released by Monday, but the station does not take him back.\nCelia Marsh is released, joins the rival station in January, and never speaks of Kestrel House.",
    },
    {
      flag: "Ashdown's standing",
      values: "commended\nreprimanded\nunchanged",
      epilogue:
        "Ruth Ashdown is commended by the Chief Constable, and the next promotion is hers.\nRuth Ashdown is reprimanded, and the case is reopened by someone else.\nRuth Ashdown files her report, and goes on listening to the wireless at night.",
    },
  ],
  voiceAndCanon: {
    voice:
      "Fast and close. Start every Passage inside an action or a line of dialogue, never with scenery or reflection. Mix the forms: a line of dialogue, a short paragraph of what Ashdown sees, a one-line paragraph that lands. Suspects talk in their own Speech; let them interrupt each other. Physical detail is concrete and small (a warm reel, a dry coat, a blank page in blue ink). Every Passage ends with a clear lead: who to question or where to look next.",
    samplePassage:
      "Royce gets there first.\n\n'Terrible business, Inspector. Tea?' He holds out the cup. His hand is steady. His cuffs are rolled to the elbow.\n\nYou step past him. Vass lies on his face between the shelves, one arm under him. The plaque lies by his shoulder: Northern Wireless Award, 1959. Its bronze is bright. Somebody has polished it.\n\n'I was on air the whole hour,' Royce says behind you. 'Ten thousand people can tell you.'\n\nMaud makes a small noise in the doorway. 'He said he had a sacking to do Monday. Mr Vass did. At ten o'clock.'\n\n'Whose?'\n\nShe looks at Royce. Then at the floor.\n\nDown the corridor, the Manager's Office door stands open, and the light is still on.",
    fixedFacts: `Victim: Leonard Vass, 52, station manager of Radio Kestrel.\nFound by Maud Pennick at 11:50 p.m., Friday 20 November 1964, in the Record Library.\nCause of death: one blow to the back of the head with the bronze Northern Wireless Award plaque, 1959. Death between 11:00 and 11:45 p.m. by the police surgeon's estimate.\nThe Midnight Line runs 10 p.m. to midnight; its phone-in went out 11:15 to 11:35.\nThe station closes down at midnight; Ashdown arrives at 12:20 a.m.; Superintendent Hale arrives at 6 a.m.\nThe studio has no outside line except through the Switchboard.\n${hidden("Royce recorded the phone-in at 4 p.m. that day. The Back Stairs from Studio A's fire door to the Record Library take ninety seconds each way.")}`,
    writerMayInvent:
      "The records played tonight, the weather, the uniformed constable on the door, the furniture of rooms, the names of listeners and the callers on the fake phone-in.",
    writerMustNotInvent:
      "Any new person in the building; any evidence pointing at anyone other than the listed Clues; a confession from anyone but Royce, and his only as his Lines allow; any way for a suspect to leave the building before dawn except Celia's yard door in the first Arc.",
    pacing:
      "Something must change on the page every Passage: a new fact, a lie caught, a suspect moving. Keep Passages short: 120 to 220 words. No more than three paragraphs of narration in a row without a line of dialogue. Put the next lead in the Passage's last line, and make the choices name concrete people and places.",
    never:
      "Never open a Passage with the weather, the time of night, or Ashdown's thoughts.\nNever write a Passage that is all paragraphs of narration.\nNever recap what Ashdown has already found.\nNever end a Passage on a mood instead of a lead.\nNever have Ashdown reason aloud to herself for more than a sentence.",
  },
}
