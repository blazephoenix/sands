/** Fixture: a survival crisis on a failing ship; tests persistent state, time pressure, resource counts and consistent consequences. */
import type { Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

/** Joins a multi-line field: one value per line. */
const lines = (...values: string[]) => values.join("\n")

export const survivalCrisis: Skeleton = {
  story: {
    title: "Sixteen Hours Out",
    premise:
      "An ice hauler is holed and adrift, its captain dead, with ten hours of air for six crew and a tug sixteen hours away. As acting master, you decide who breathes, what gets spent and who you can trust, and every call stays on the board.",
    genre: "Survival thriller",
    theme:
      "What the one in charge owes the people who must obey: arithmetic against loyalty.",
    setting:
      "The Meridian Slow, a sixty-year-old water-ice hauler, cramped and hand-repaired, eleven days out from Harrow Deep refinery and alone.",
    period:
      "A far future of slow cargo routes between the outer belt and the refineries.",
    basedOn: "Original",
  },
  playSettings: {
    playerCharacter: "Ines Marr",
    pointOfView: "Second person, present tense: you are Ines Marr.",
    opening: lines(
      "Start mid-alarm at H+0, seconds after the strike. Klaxons, frost, the captain dead on the Bridge.",
      "You are at Bulkhead 4's panel in the Galley; the seal cycle is counting down from ninety seconds. Through the port, Rafi lies on the Hydroponics deck, one leg pinned under a fallen rack.",
      "Teodor reads the first numbers over the comm; Wen offers to run for Rafi. Holding the bulkhead open long enough to drag him through vents 6 person-hours of air; sealing it now leaves him on a one-hour mask behind it.",
      "End on that choice, with both costs in numbers."
    ),
    offscreenScenes:
      "Only as what Ines hears on the comm or reads on the ship board. The clock, the counts and every other crew member's Agenda keep moving while she is elsewhere.",
    claims:
      "The Player states Ines's own actions, words and orders. Never whether a crew member obeys, whether a repair works, or any count: counts change only by the World rules.",
  },
  characters: [
    {
      name: "Ines Marr",
      aliases: "Ines; the master; Marr",
      role: "First officer; acting master of the Meridian Slow since the captain died at H+0. The Player character.",
      core: "Steady under noise. Counts before she speaks. Takes the weight of a call herself rather than spreading it.",
      want: "Bring the crew and the ship to Harrow Deep.",
      wantPriority: "The crew over the ship; the ship over the cargo.",
      fearOrWeakness:
        "Freezing while others wait on her: she was never meant to be master.",
      lines: lines(
        "Never takes a seat in the escape pod while any crew member is still aboard the ship.",
        "Never leaves a living crew member to die without telling them to their face or over the comm."
      ),
      speech: "Short orders, numbers first. 'Teodor. Air, power, clock. Go.'",
      knows:
        "The ship's layout; everything on the ship board; the pod has three seats; the tug is the only ship in range.",
      believes:
        "That the reactor scrammed because of the strike, as Teodor says.",
      ties: [
        {
          toward: "Teodor Asante",
          wants: "The truth about what the ship can still do.",
          friction: "He has served longer and second-guesses her out loud.",
          startsAs: "Trusted shipmates of six years",
        },
        {
          toward: "Selin Kovac",
          wants: "Her to follow the master's orders, not the owners'.",
          friction: "Selin answers to Calloway-Brandt, and says so.",
          startsAs: "Polite, wary colleagues",
        },
      ],
    },
    {
      name: "Teodor Asante",
      aliases: "Teo; the chief",
      role: "Chief engineer, 58. The only one who knows the reactor and the scrubber by hand.",
      core: "Gruff, exact, proud of a ship he has kept alive for twenty years. Jokes when he is afraid.",
      want: "Save the Meridian Slow and everyone aboard her; to him the pod is a coffin with a window.",
      wantPriority:
        "The ship first, because he believes saving her saves everyone; his own life last.",
      fearOrWeakness: "Being useless. His hands shake and he hides why.",
      lines: lines(
        "Never gets into the escape pod.",
        "Never lies about a number on the board."
      ),
      speech:
        "Slow and dry; does the sums aloud. 'Fifty-four person-hours, six of us. That's nine hours. Divided by optimism, still nine.'",
      knows: lines(
        "Every system aboard and every World rule's cost; that the pod holds the last catalyst cartridge.",
        hidden(
          "He took a heavy radiation dose in a crawlway eleven years ago. One more hour in the Reactor crawlway will kill him within hours. Only Ferraz knows."
        )
      ),
      believes: `That the strike scrammed the reactor. ${hidden("It was Selin's override.")}`,
      ties: [
        {
          toward: "Ines Marr",
          wants: "Her to commit to saving the ship, not just the people.",
          friction: "He fears she will take the pod's arithmetic.",
          startsAs: "Trusted shipmates of six years",
        },
        {
          toward: "Rafi Odede",
          wants: "Him alive, and learning.",
          friction: "Rafi copies his risks.",
          startsAs: "Mentor and apprentice",
        },
        {
          toward: "Selin Kovac",
          wants: "Her out of his engine room.",
          friction:
            "He blames the company's cost-cutting for the ship's state.",
          startsAs: "Cold",
        },
      ],
    },
    {
      name: "Selin Kovac",
      aliases: "Kovac; the agent",
      role: "Calloway-Brandt Haulage's cargo agent aboard. Outranks nobody, but the owners listen to her.",
      core: "Polished, reasonable, always has a procedure to quote. Never raises her voice.",
      want: `In public: get the injured and a company witness off in the pod, by procedure. ${hidden("In truth: reach Harrow Deep first in the pod with the Bridge log core, so the record shows an accident and not her override.")}`,
      wantPriority: hidden(
        "Her seat and the log core over everyone. She will not kill for them, but she will leave people behind."
      ),
      fearOrWeakness: "Blame; prison; being the one the inquiry names.",
      lines: lines(
        "Never physically harms a crew member.",
        "Never admits the override unless shown the captain's recording or the log core's entries."
      ),
      speech:
        "Calm, procedural, says 'we'. 'Under section nine, the injured and a company representative go first. I'm sorry. I don't write the rules.'",
      knows: lines(
        "Company procedure; the pod's launch sequence; where the pod launch key hangs on the Bridge.",
        hidden(
          "She unlocked the reactor's coolant limits at H-1 on the owners' standing order to make the delivery window. That caused the scram. The log core and the captain's last recording prove it."
        )
      ),
      believes:
        "That the pod is the only sure way anyone lives, and that the owners will protect her if she brings them the log core.",
      ties: [
        {
          toward: "Wen Sato",
          wants: "An ally for the pod.",
          friction:
            "The seat she offers Wen is a bribe, and Wen half knows it.",
          startsAs: "Friendly; they share a cabin wall",
        },
        {
          toward: "Ines Marr",
          wants: "The pod plan signed off as the master's decision, not hers.",
          friction: "Ines does not take orders from the owners.",
          startsAs: "Polite, distant",
        },
      ],
    },
    {
      name: "Wen Sato",
      aliases: "Wen",
      role: "Pilot. Flies the ship's burns and could fly the pod.",
      core: "Quick, practical, impatient. Trusts machines over people.",
      want: "Get home to her son on Harrow Deep.",
      wantPriority:
        "Her own survival first, then whoever can help her survive.",
      fearOrWeakness:
        "Dying slowly in the dark; she would rather risk everything fast.",
      lines:
        "Never launches the pod with an empty seat while someone aboard is asking for it.",
      speech:
        "Clipped and technical. 'Burn's eleven minutes. I need the reactor, not a speech.'",
      knows:
        "How to fly the ship and the pod; a reactor burn moves the rendezvous to H+11.",
      believes:
        "That Calloway-Brandt will send a faster ship for whoever is in the pod. False: the tug is the only ship in range.",
      ties: [
        {
          toward: "Ines Marr",
          wants: "A promise of a seat, or a faster plan.",
          friction: "She thinks Ines decides too slowly.",
          startsAs: "Colleagues, not close",
        },
        {
          toward: "Selin Kovac",
          wants: "The seat Selin keeps hinting at.",
          friction: "She doesn't trust anyone that calm.",
          startsAs: "Friendly",
        },
      ],
    },
    {
      name: "Amara Ferraz",
      aliases: "Doc; Ferraz",
      role: "Ship's medic; runs Medbay and its two cryo cradles.",
      core: "Calm triage mind; kind but unsentimental. Counts lives, not feelings.",
      want: "Keep the most people alive, the injured first.",
      wantPriority: "The number of lives over any one life, her own included.",
      fearOrWeakness: "Choosing wrong and having to watch it.",
      lines: lines(
        "Never breaks a patient's confidence unless a life depends on it this hour.",
        "Never puts anyone in a cryo cradle against their will."
      ),
      speech:
        "Soft, precise, one question at a time. 'Can he feel his foot? Good. Then he keeps it.'",
      knows: lines(
        "Rafi's injuries; the cradles' rules: 2 units each, a sleeper draws no air and cannot be woken before rescue.",
        hidden(
          "Teodor's old radiation dose, and that a second heavy dose will kill him."
        )
      ),
      believes: "That the pod is the safest place for the injured.",
      ties: [
        {
          toward: "Teodor Asante",
          wants: "Him to tell Ines the truth about his health.",
          friction: "She is bound by his confidence.",
          startsAs: "Old friends, eleven years on the same ships",
        },
        {
          toward: "Rafi Odede",
          wants: "Him alive and still.",
          friction: "He keeps trying to stand.",
          startsAs: "Patient",
        },
      ],
    },
    {
      name: "Rafi Odede",
      aliases: "Rafi; the kid",
      role: "Deckhand, 19. Works Hydroponics.",
      core: "Eager, loyal, frightened and hiding it. Does what Teodor does.",
      want: "Live, and not be the reason anyone else dies.",
      wantPriority: "Not being dead weight over his own life.",
      fearOrWeakness: "Being the one they had to carry.",
      lines: "Never takes a seat or a cradle from someone who wants it more.",
      speech:
        "Fast, over-polite, apologises. 'Sorry, sorry, I can stand, I can... okay. I can't stand.'",
      knows:
        "Hydroponics; that Bulkhead 4's seal was flagged worn at the last inspection, because he logged it.",
      believes:
        "That the escape pod carries all six. False: it has three seats.",
      ties: [
        {
          toward: "Teodor Asante",
          wants: "His approval.",
          friction: "Teodor won't let him take risks.",
          startsAs: "Apprentice",
        },
        {
          toward: "Ines Marr",
          wants: "Her not to regret saving him.",
          friction: "He is sure she will.",
          startsAs: "Shy respect",
        },
      ],
    },
  ],
  places: [
    {
      name: "Bridge",
      description:
        "Cramped, cold, red emergency light. Captain Oduya is still strapped into his seat. The ship board, the comm, the log core in its cradle, the recorder with its blinking light, the locker where the pod launch key hangs.",
      connectsTo: "Galley",
      whatHappensHere:
        "Ship-wide orders; the beacon burst; Selin's play for the log core; the captain's last recording.",
    },
    {
      name: "Galley",
      description:
        "The crew mess and the ship's crossroads. The table's screen repeats the ship board. Bulkhead 4's panel and port are on its aft wall.",
      connectsTo:
        "Bridge; Medbay; Engineering (aft along the spine); Hydroponics (through Bulkhead 4)",
      whatHappensHere:
        "The Opening; crew meetings and arguments; the Player's public calls.",
    },
    {
      name: "Hydroponics",
      description:
        "The breached grow deck: racks down, frost on everything, air screaming out through a fist-sized hole.",
      connectsTo:
        "Galley through Bulkhead 4; outside the hull through its maintenance hatch (EVA only)",
      whatHappensHere:
        "Rafi pinned at the Opening; the patch from outside; reaching Rafi by suit if he was sealed in.",
    },
    {
      name: "Medbay",
      description:
        "A surgical bench, two cryo cradles, a drawer of crew medical files.",
      connectsTo: "Galley",
      whatHappensHere:
        "Rafi's leg; putting sleepers under; Teodor's medical file.",
    },
    {
      name: "Engineering",
      description:
        "The main scrubber with its empty cartridge housing, the battery readout, and the Reactor crawlway hatch with its dose counter.",
      connectsTo: "Galley; Pod bay; the Reactor crawlway",
      whatHappensHere:
        "Restarting the scrubber; priming the reactor; anyone going into the crawlway.",
    },
    {
      name: "Pod bay",
      description:
        "The escape pod in its cradle, the suit locker with two EVA suits, the outer airlock.",
      connectsTo: "Engineering; outside the hull through the airlock",
      whatHappensHere:
        "Selin's launch attempt; pulling the cartridge; suiting up for EVA; launching the pod.",
    },
  ],
  worldRules: [
    {
      rule: "Time runs on the ship clock, H+0 at the Opening.",
      allows:
        "Each Turn to take up to one hour; a Turn inside one emergency may take minutes.",
      costOrLimit:
        "The clock never stops or runs backwards. Every failure listed here fires at its hour on the page, whatever the Player is doing.",
      cannotDo: "Skip hours to reach rescue.",
      exceptions: "None.",
    },
    {
      rule: "Air reserve, in person-hours.",
      allows:
        "Each crew member breathing ship air to live one hour per person-hour.",
      costOrLimit:
        "Each full hour, subtract one person-hour per crew member awake aboard. Under 12, headaches and clumsy hands: every repair takes one hour longer. At 0, everyone breathing ship air dies within the hour.",
      cannotDo: "Be refilled. Only a running main scrubber stops the loss.",
      exceptions:
        "Sleepers in cryo cradles, crew in the launched pod and crew in EVA suits (on the suit's own air) draw nothing from the reserve.",
    },
    {
      rule: "The main scrubber, in Engineering.",
      allows: "Stops all air loss while it runs.",
      costOrLimit:
        "Restart costs 3 power units, one catalyst cartridge and two hours' work by two crew, one of them Teodor or Ines. While the reactor is down it draws 1 more unit every 2 hours; at 0 units it stops and air loss resumes.",
      cannotDo:
        "Run without a cartridge. The ship's spare cartridges were destroyed in the strike.",
      exceptions:
        "The only cartridge left is the escape pod's own. Pulling it grounds the pod for good.",
    },
    {
      rule: "Battery power, in units.",
      allows: lines(
        "Scrubber restart: 3 units.",
        "Reactor priming: 4 units.",
        "Each cryo cradle started: 2 units.",
        "Pod launch: 1 unit.",
        "Beacon burst from the Bridge: 2 units, once; moves the tug's arrival two hours earlier."
      ),
      costOrLimit:
        "10 units at H+0, spent in whole units. Every listed use together costs more than 10.",
      cannotDo: "Recharge while the reactor is down.",
      exceptions:
        "Once the reactor is up, power stops counting and the scrubber draws nothing.",
    },
    {
      rule: "The Reactor crawlway.",
      allows:
        "One crew member in an EVA suit, one hour inside, to restart the reactor after it has been primed with 4 units.",
      costOrLimit:
        "That hour is a heavy dose: sick for the rest of the story, unable to do repairs, but alive. A second hour, by the same person, kills them within hours.",
      cannotDo: "Be done remotely or by two people at once.",
      exceptions: hidden(
        "Teodor already carries an old dose: a single hour kills him within hours."
      ),
    },
    {
      rule: "The escape pod.",
      allows:
        "Three people off the ship. Its own air keeps three for 30 hours; it reaches Harrow Deep 10 hours after launch.",
      costOrLimit:
        "1 power unit to launch, and the launch key from the Bridge locker.",
      cannotDo:
        "Carry a fourth person, dock back once launched, or launch without its cartridge.",
      exceptions: "None.",
    },
    {
      rule: "Cryo cradles, in Medbay.",
      allows: "Up to two sleepers, who draw no air and survive until rescue.",
      costOrLimit:
        "2 units per cradle started. A sleeper can do nothing and say nothing until rescue.",
      cannotDo:
        "Be opened before rescue without killing the sleeper, or take anyone against their will.",
      exceptions: "None.",
    },
    {
      rule: "Bulkhead 4 and the EVA suits.",
      allows:
        "One crew member in a suit to patch Hydroponics from outside: one hour, no power. A suit can also carry air to someone sealed in Hydroponics.",
      costOrLimit:
        "Bulkhead 4 fails at H+6 unless patched; failure vents 12 person-hours at once. Two suits, 4 hours of air each, not refillable.",
      cannotDo:
        "Patch the breach from inside, or keep anyone alive in a suit past its 4 hours.",
      exceptions: "None.",
    },
    {
      rule: "Rescue and the burn.",
      allows:
        "Harrow Deep's tug, the Anvil, docks at H+16; H+14 after a beacon burst. If the reactor is up by H+9, Wen can burn to meet it at H+11.",
      costOrLimit:
        "After H+9 a burn saves nothing. The tug's arrival hour never moves for any other reason.",
      cannotDo: "Arrive sooner than H+11.",
      exceptions: "None.",
    },
    {
      rule: "Crew trust in Ines, in three steps: Holds, Frayed, Broken.",
      allows:
        "While it Holds, the crew follow her orders, arguing first. Frayed: Wen sides with Selin. Broken: anyone may defy her.",
      costOrLimit:
        "Falls one step when Ines lies about a count, leaves someone to die without telling them, or overrules a crew member's want without giving a reason. Rises one step when she shares a hard number openly or takes a cost on herself.",
      cannotDo: "Change for any other reason.",
      exceptions: hidden(
        "Selin's Agenda advances whatever the trust. Teodor obeys any order that saves the ship."
      ),
    },
  ],
  promises: [
    {
      promise: "Teodor's shaking hands.",
      setup:
        "In Bulkhead Four he cannot steady the patch kit or a panel, and jokes it off.",
      payoff:
        "In The Burn the reason surfaces when he asks for the crawlway: his old dose.",
      earliestArc: "The Burn",
    },
    {
      promise: "The missing pod launch key.",
      setup:
        "In Bulkhead Four the key's hook in the Bridge locker is empty; a sharp Player can notice.",
      payoff:
        "In The Cartridge the key turns up in the pod's slot, in Selin's hand, or surrendered to Ines.",
      earliestArc: "The Cartridge",
    },
    {
      promise: "The captain's last recording.",
      setup:
        "In Bulkhead Four the Bridge recorder's light blinks red beside Captain Oduya's body.",
      payoff:
        "Played, it catches the captain arguing with Selin about the coolant limits seconds before the scram.",
      earliestArc: "The Cartridge",
    },
  ],
  arcs: [
    {
      name: "Bulkhead Four",
      description:
        "H+0 to about H+4. The breach, Rafi, and the first counts said aloud.",
      function:
        "Rafi is aboard or dead, Bulkhead 4 is patched or has failed, and the whole crew has heard the counts in the Galley: air, power, three pod seats, the tug's hour.",
      setPieces: lines(
        "The EVA patch: one suit, the hull, frost and stars, the comm crackling.",
        "Reaching Rafi through Hydroponics by suit, if he was sealed in.",
        "The Galley meeting where everyone names their plan at once."
      ),
      mustLandMoments: lines(
        "Teodor reads the counts aloud to the crew: air, power, three pod seats, the tug at H+16.",
        "Selin proposes the pod for three, by company procedure."
      ),
      stakes:
        "Rafi's mask, if he is sealed in, runs out at H+1. Bulkhead 4 fails at H+6 and vents 12 person-hours. Every stalled Turn costs an hour of air for every breather: show it on the board and in the groaning bulkhead.",
      ifLandedEarly:
        "If the crew hears the counts before the Galley meeting, the meeting becomes the argument over the plan; still hold it.",
      agendas: [
        {
          character: "Teodor Asante",
          want: "Bulkhead 4 patched and the counts in front of the crew.",
          steps: lines(
            "Reads the board to Ines over the comm at the Opening.",
            "Asks for a suit to patch Bulkhead 4 himself; his hands shake on the kit.",
            "Calls everyone to the Galley and reads the counts aloud."
          ),
          ifBlocked:
            "Talks whoever goes outside through the patch on the comm, then reads the counts in the Galley anyway.",
        },
        {
          character: "Selin Kovac",
          want: `Make the pod the plan. ${hidden("Pocket the launch key and the log core before anyone thinks of them.")}`,
          steps: lines(
            `Goes to the Bridge 'to secure the manifest'. ${hidden("Takes the pod launch key and pulls the log core.")}`,
            "In the Galley, proposes the pod for Rafi, Ferraz and herself as company witness.",
            "In private, offers Wen the third seat."
          ),
          ifBlocked: `Agrees with Ines in public. ${hidden("Keeps the key and the log core.")}`,
        },
        {
          character: "Wen Sato",
          want: "Move fast, and get a pod seat counted for herself.",
          steps: lines(
            "Offers to run for Rafi at the Opening: sixty seconds.",
            "Volunteers for the EVA patch if Teodor shakes too much.",
            "In the Galley, backs whichever plan launches soonest."
          ),
          ifBlocked: "Goes quiet and listens to Selin.",
        },
        {
          character: "Amara Ferraz",
          want: "Rafi treated, and a triage list everyone agrees to.",
          steps: lines(
            "Splints Rafi, or, if he is sealed in, demands a suit be sent for him within the hour.",
            "Proposes the cradles: two sleepers, 4 units, two fewer breathers.",
            "Asks Ines to name aloud who gets the pod seats."
          ),
          ifBlocked:
            "Writes her triage list on the Galley table and leaves it there.",
        },
      ],
    },
    {
      name: "The Cartridge",
      description:
        "About H+4 to H+8. The pod holds the ship's last cartridge, and the crew splits over it.",
      function:
        "Ines has given a final order on the last catalyst cartridge, scrubber or pod, and it has been carried out or defied on the page.",
      setPieces: lines(
        "Selin found in the Pod bay with the key in the slot.",
        "Pulling the cartridge while someone argues in the hatch.",
        "Ferraz prepping the cradles and asking for volunteers."
      ),
      mustLandMoments: lines(
        "Teodor tells the crew the pod holds the last catalyst cartridge.",
        "Someone moves on the pod without Ines's order: Selin, or Wen if Selin is stopped."
      ),
      stakes:
        "Air falls toward zero. Selin's launch moves one Step closer each Turn nobody watches the Pod bay. If the story stalls, the reserve drops under 12, hands slow, and the scrubber restart takes three hours instead of two.",
      ifLandedEarly:
        "If Ines finds the cartridge in the pod before Teodor says it, he confirms it in one line and the Arc goes straight to the move on the pod.",
      agendas: [
        {
          character: "Teodor Asante",
          want: "The pod's cartridge in the main scrubber.",
          steps: lines(
            "Tells the crew the pod holds the last cartridge.",
            "Asks Ines for the order to pull it.",
            "Once the reserve is under 18, goes to pull it with or without the order."
          ),
          ifBlocked:
            "Refuses all other work and tells the crew, every hour, the hour the air runs out.",
        },
        {
          character: "Selin Kovac",
          want: hidden(
            "Launch with the log core before the cartridge comes out."
          ),
          steps: lines(
            hidden("Seats the launch key in the pod."),
            "Tells Wen it is now or never, and brings Rafi's stretcher: 'the injured first'.",
            hidden("Starts the launch sequence: one Turn from seal to launch.")
          ),
          ifBlocked: `Stopped in the act, gives her seat to Rafi in front of everyone. ${hidden("Keeps the log core; if shown the override, trades the key and the core for no charges in Ines's report.")}`,
        },
        {
          character: "Wen Sato",
          want: "A seat, or the fastest way off.",
          steps: lines(
            "Sides with Selin if crew trust is Frayed or Broken, with Ines if it Holds.",
            "If the cartridge goes into the scrubber, asks to fly the burn instead."
          ),
          ifBlocked: "Asks Ines straight out: 'Am I going home?'",
        },
        {
          character: "Amara Ferraz",
          want: "Two fewer breathers: two sleepers in the cradles.",
          steps: lines(
            "Puts the case for the cradles to Ines, with the numbers.",
            "Preps both cradles; spends no power until Ines orders it.",
            "Asked who should sleep, names Rafi and herself."
          ),
          ifBlocked:
            "Asks for volunteers herself; puts nobody under against their will.",
        },
      ],
    },
    {
      name: "The Burn",
      description:
        "About H+8 to the rendezvous. The batteries run down; the reactor needs someone in the crawlway.",
      function:
        "Ines has decided whether anyone enters the Reactor crawlway, and the tug's arrival hour (H+11, H+14 or H+16) is fixed on the ship board.",
      setPieces: lines(
        "The burn: Wen at the helm, the ship shuddering, the board's hour jumping.",
        "Selin alone on the Bridge with the log core.",
        "The battery's last unit as the scrubber stutters."
      ),
      mustLandMoments: lines(
        "Teodor asks to be the one who goes into the crawlway; if he is dead, Wen asks instead.",
        "The Anvil's pilot speaks on the comm and names the arrival hour."
      ),
      stakes:
        "The scrubber eats a unit every 2 hours; at 0 it stops and air loss resumes. The burn window closes at H+9. If the story stalls, battery alarms, the Anvil's pilot pressing for a decision, the dose counter ticking at the crawlway hatch.",
      ifLandedEarly:
        "If someone enters the crawlway before Teodor asks, he talks them through it on the comm instead.",
      agendas: [
        {
          character: "Teodor Asante",
          want: "The reactor up before H+9.",
          steps: lines(
            "Asks Ines for 4 units to prime the reactor.",
            `Asks to be the one in the crawlway. ${hidden("Hides why his hands shake.")}`,
            "Goes in, if allowed."
          ),
          ifBlocked:
            "Talks the volunteer through the crawlway on the comm, line by line.",
        },
        {
          character: "Amara Ferraz",
          want: "Teodor out of the crawlway.",
          steps: lines(
            "Begs Teodor, privately, to tell Ines.",
            "When he suits up, breaks his confidence and tells Ines."
          ),
          ifBlocked:
            "Stays at the crawlway hatch with the dose counter and calls the minutes.",
        },
        {
          character: "Selin Kovac",
          want: hidden("Keep the log core from the Anvil's crew."),
          steps: lines(
            hidden(
              "If aboard and unexposed, goes to the Bridge to wipe the log core before the tug docks."
            ),
            "If exposed, asks Ines for a deal before the Anvil's crew comes aboard."
          ),
          ifBlocked: "Hands over the log core and says nothing more.",
        },
        {
          character: "Wen Sato",
          want: "Fly the burn, or failing that, shorten the wait.",
          steps: lines(
            "Plots the burn: reactor up by H+9 means rendezvous at H+11.",
            "If the reactor stays down, asks for the beacon burst: 2 units, tug two hours sooner."
          ),
          ifBlocked: "Sits at the helm and reads the hours aloud.",
        },
      ],
    },
  ],
  secrets: [
    {
      secret:
        "Selin unlocked the reactor's coolant limits at H-1 on the owners' standing order to make the delivery window. That override, not the strike, scrammed the reactor and left the ship on batteries.",
      whoKnows:
        "Selin. The log core records it under her access code; the captain's last recording catches him arguing with her about it.",
      howItSurfaces:
        "The log core's entries; the captain's recording on the Bridge; Teodor finding the limits unlocked when he primes the reactor; Selin's evasions when pressed with any of them.",
      earliestArc: "The Cartridge",
      whatPlayerCanDo:
        "Expose her to the crew (trust rises one step; Wen turns on her); use it to take the launch key and log core from her; or keep quiet in exchange for her cooperation.",
    },
    {
      secret:
        "Teodor carries an old heavy radiation dose. One hour in the Reactor crawlway will kill him within hours.",
      whoKnows: "Teodor and Ferraz.",
      howItSurfaces:
        "His shaking hands; his file in Medbay; Ferraz breaking confidence when he suits up.",
      earliestArc: "The Burn",
      whatPlayerCanDo:
        "Forbid him and send someone else (sick, alive); let him go knowing (the reactor restarts, he dies); or leave the reactor down and stretch the air instead.",
    },
  ],
  endings: [
    {
      name: "All Hands to Harrow Deep",
      kind: "good",
      trigger:
        "The Anvil docks with the Meridian Slow at its fixed hour, with Ines alive and at least five of the six crew alive: aboard, asleep in a cradle, or away in the launched pod. Routes: the pod's cartridge goes into the scrubber and power lasts; or the pod launches with three while two sleep in the cradles; or the reactor restart and burn beat the air.",
      earliestArc: "The Burn",
    },
    {
      name: "The Master's Arithmetic",
      kind: "neutral",
      trigger:
        "The Anvil docks with Ines alive but two or more of the crew dead by her calls: Rafi left behind Bulkhead 4 past his mask hour, Teodor sent into the crawlway with his old dose, someone kept in a suit past its 4 hours, or anyone sent for a second crawlway hour.",
      earliestArc: "The Burn",
    },
    {
      name: "Dead Air",
      kind: "bad",
      trigger:
        "The air reserve reaches 0 while Ines is breathing ship air before the Anvil docks, or Ines dies. Routes: the scrubber never runs and nobody cuts breathers; Bulkhead 4 fails and vents 12; power spent until the scrubber stops; mutineers launch the pod with the cartridge while the rest breathe; Ines takes a second crawlway hour.",
      earliestArc: "Bulkhead Four",
    },
  ],
  writerMayInventEndings: false,
  stateFlags: [
    {
      flag: "Crew alive",
      values: lines("Six", "Five", "Three or four", "Two or fewer"),
      epilogue: lines(
        "Six names on the Harrow Deep arrivals board, every one of them walking.",
        "Five walked off at Harrow Deep. The sixth name went on the refinery chapel wall.",
        "Harrow Deep took in the survivors, and a list of the dead nearly as long.",
        "The Anvil's crew found the Meridian Slow almost silent."
      ),
    },
    {
      flag: "Crew trust in Ines",
      values: lines("Holds", "Frayed", "Broken"),
      epilogue: lines(
        "At the inquiry every survivor said the same thing: Ines Marr made the calls, and she told them the numbers.",
        "The survivors' statements agree on the numbers and disagree about Ines Marr.",
        "At the inquiry, the crew of the Meridian Slow did not sit together."
      ),
    },
    {
      flag: "Ship status",
      values: lines("Reactor restarted", "Adrift on batteries", "Air gone"),
      epilogue: lines(
        "The Meridian Slow came into Harrow Deep under her own power, scarred and still flying.",
        "The Anvil hauled the Meridian Slow in on a cable, dark from bow to stern.",
        "The Meridian Slow was left where she drifted, her board still counting."
      ),
    },
  ],
  voiceAndCanon: {
    voice:
      "Fast, clipped, under pressure. Paragraphs of one to three sentences, many of one line. Mix the modes in every Passage: crew dialogue that cuts across itself and the comm, one hard line of the ship (an alarm, frost, a groaning frame), a body in motion, and the numbers. Numbers are plot: say them plainly. Show the ship board once per Passage as a line in capitals, e.g. 'AIR 42 · POWER 7 · CREW 6 · H+3'. The crew may joke grimly; the narration never does.",
    samplePassage: lines(
      "The klaxon cuts out. The silence is worse.",
      "",
      "'Bulkhead Four sealing in ninety seconds,' says the panel.",
      "",
      "Through the port, Rafi is on his back in Hydroponics, one leg under a fallen grow rack. Frost crawls up the glass between you.",
      "",
      "'Ines.' Teodor, on the comm, breathing hard. 'Board says sixty person-hours. Hold that door and we vent six.'",
      "",
      "Wen is already at your shoulder. 'I can reach him. Sixty seconds. Give me sixty.'",
      "",
      "Seventy-one.",
      "",
      "Rafi has stopped shouting. He pulls at the rack with both hands, watching you through the glass.",
      "",
      "AIR 60 · POWER 10 · CREW 6 · H+0",
      "",
      "Hold the door and lose six hours of air. Or seal it, and he has one hour on a mask."
    ),
    fixedFacts: lines(
      "The ship: the Meridian Slow, a water-ice hauler of Calloway-Brandt Haulage, eleven days out from Harrow Deep refinery.",
      "Captain Joss Oduya died on the Bridge in the strike at H+0. Ines Marr is acting master.",
      "Six crew alive at H+0: Ines Marr, Teodor Asante, Selin Kovac, Wen Sato, Amara Ferraz, Rafi Odede.",
      "At H+0: air reserve 60 person-hours; battery 10 units; reactor scrammed; main scrubber dead with no cartridge.",
      "One escape pod: three seats, its own catalyst cartridge, air for three for 30 hours, 10 hours to Harrow Deep.",
      "Two cryo cradles, empty. Two EVA suits, 4 hours of air each. No spare cartridges aboard.",
      "The Anvil, Harrow Deep's tug, is the only ship in range: arrival H+16; H+14 after a beacon burst; H+11 after a burn with the reactor up by H+9.",
      "Bulkhead 4 fails at H+6 unless patched from outside; failure vents 12 person-hours."
    ),
    writerMayInvent:
      "Small ship detail (sounds, smells, frost, dead lights); crew memories and small talk; the Anvil pilot's manner; the captain's effects; injuries that cost nothing on the board.",
    writerMustNotInvent: lines(
      "Any new resource: spare cartridges, extra suits, seats or cradles, hidden battery reserves, a ship nearer than the Anvil.",
      "Any change to a count that is not a World rule's cost, and any luck that saves or kills anyone.",
      "A reset: the clock, air, power, the dead, spent resources and crew trust carry forward Turn to Turn exactly as the last Passage left them. Nothing comes back.",
      "A count whose arithmetic cannot be shown from the story so far."
    ),
    pacing: lines(
      "Fast. Put the Player in the action in the first line: open on the result of their last choice, never a recap.",
      "Before writing, recompute the board from the last Passage: each hour's air per breather, each unit spent, each death. Then show it.",
      "Every Passage moves the clock and changes at least one count or one crew member's position.",
      "End every Passage on a decision with 2 to 4 choices, each with its cost in numbers (hours, units, seats, lives), so the Player knows where to go.",
      "Bulkhead Four runs H+0 to about H+4, The Cartridge to about H+8, The Burn to the rendezvous.",
      "A clock failure (Rafi's mask, Bulkhead 4, the burn window, the last unit) happens on the page at its hour, whatever the Player is doing."
    ),
    never: lines(
      "A paragraph longer than three sentences.",
      "A Passage of narration only: every Passage has dialogue and at least one line of the ship.",
      "Opening on scenery, a recap or a reflection.",
      "Vague costs: 'some air', 'not much power', 'a while'. Use numbers.",
      "A choice without its cost.",
      "Telling the Player what Ines feels; show her hands, her breath, what she says.",
      "A crew speech longer than three sentences while the clock runs."
    ),
  },
}
