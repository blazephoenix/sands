/** Fixture: a survival crisis aboard the Gun Club's projectile, adapted from Jules Verne's Round the Moon (1870); tests persistent state, time pressure, resource counts and consistent consequences. */
import type { Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

/** Joins a multi-line field: one value per line. */
const lines = (...values: string[]) => values.join("\n")

const ARC_1 = "The Leak and the Cold"
const ARC_2 = "Behind the Moon"
const ARC_3 = "The Fall"

export const survivalCrisis: Skeleton = {
  story: {
    title: "Round the Moon",
    premise:
      "Four days out of Florida, the Gun Club's projectile has missed the Moon and is plunging into her shadow with a frozen valve bleeding its gas into space. As Impey Barbicane you split the gas, chlorate, potash, water and twenty rockets between the cold, the air and one narrow chance of getting home, while your old rival Captain Nicholl checks every figure and Michel Ardan would rather fall onto the Moon. Every count stays on the board.",
    genre: "Survival adventure",
    theme:
      "The arithmetic of air against the pride of three men: whose figures you trust, and who pays when they are wrong.",
    setting:
      "The aluminium projectile fired from the Columbiad at Stones Hill, Florida: one padded cabin for three men and a dog, rounding the Moon's north pole, her dark far side and her south pole, then falling to the Pacific.",
    period:
      "December 186-. Play runs from 6 a.m. on 6 December to 29 December.",
    basedOn:
      "Round the Moon by Jules Verne (1870); Project Gutenberg #83; public domain",
  },
  playSettings: {
    playerCharacter: "Impey Barbicane",
    pointOfView: "Second person, present tense: you are Impey Barbicane.",
    opening: lines(
      "Start at 6:00 a.m. on 6 December, seconds after the projectile passes the Moon's north pole and plunges into her shadow: the sun cut off like a blow, black outside, frost starting on the side scuttles.",
      "The burner is out: Nicholl put it out to find a hiss, and he has found it. The receiver's filling valve, outside by the top scuttle, has frozen open; gas is bleeding into space at 2 gas-hours every hour. The thermometer reads +5°C and falling. Diana whines at the floor. Ardan is already at the top scuttle's bolts.",
      "Nicholl reads the counts in one breath: gas, air, chlorate, potash, rockets, water, and the twelve hours until the sun comes back.",
      "End on the first hard choice, each cost in numbers: shut the master valve and let Nicholl bypass it by touch (3 hours with no flame: the cabin falls to −10°C, no oxygen made); turn the burner's flame on the pipe to thaw it (2 hours, 6 gas-hours gone); or Ardan's arm out of the top scuttle (one minute: 6 man-hours of air, 10°C, and his left hand)."
    ),
    offscreenScenes:
      "Earth cannot be heard from the projectile, and nothing said aboard reaches it. While Barbicane is busy at a scuttle or asleep, Nicholl's and Ardan's Agendas keep moving: show the results when he looks up. Maston appears only in Barbicane's thoughts until the Susquehanna's boat reaches the projectile; the Ending's Passage may cut to the boat for a few lines.",
    claims:
      "The Player states Barbicane's own actions, words, orders and calculations. Never whether Nicholl or Ardan obeys, whether a repair works, what a sighting shows, or any count: counts change only by the World rules.",
  },
  characters: [
    {
      name: "Impey Barbicane",
      aliases:
        "Barbicane; President Barbicane; the President of the Gun Club; the president",
      role: "President of the Gun Club of Baltimore, who built the Columbiad; in command of the projectile. The Player character.",
      core: "Cold, calm, exact. Thinks in figures and says little. The worse the news, the steadier he gets.",
      want: "Bring the projectile and all three men through, and learn what the Moon truly is.",
      wantPriority:
        "His companions' lives over the Moon; the Moon over his own comfort.",
      fearOrWeakness:
        "An error in his own figures, with other men paying for it. A scientist's hunger: he will stay at a scuttle when he should be working.",
      lines: lines(
        "Never leaves a living companion to the ether to save himself.",
        "Never draws lots for a man's life."
      ),
      speech:
        "Brief, measured, formal; 'my friends'. 'Let us act as if we were about to reach it.'",
      knows:
        "Every part of the projectile and its stores; every rule of the gas, the air and the rockets; that the great meteor of the first night deviated the projectile; the projectile's height over the north pole, which he took at 6 a.m.",
      believes:
        "That the deviated projectile can only fall onto the Moon or circle her for ever. False: its ellipse brings it back to the dead point, and from there home (the first Secret).",
      ties: [
        {
          toward: "Captain Nicholl",
          wants: "His exact hands and his honest counts.",
          friction:
            "Twenty years of rivalry; Nicholl checks every number Barbicane gives.",
          startsAs: "Reconciled rivals: civil, wary, keeping score",
        },
        {
          toward: "Michel Ardan",
          wants: "Obedience when the numbers say no.",
          friction: "Ardan dares; Barbicane calculates.",
          startsAs: "Devoted friends since Tampa",
        },
        {
          toward: "J. T. Maston",
          wants: "To come home to him.",
          friction: "He refused Maston a place in the projectile.",
          startsAs: "Oldest friends",
        },
      ],
    },
    {
      name: "Captain Nicholl",
      aliases: "Nicholl",
      role: "Of Philadelphia, maker of armour-plate; for twenty years Barbicane's rival, who bet against the Columbiad and challenged him to a duel in Skersnaw wood until Ardan reconciled them. Keeps the gas, the air apparatus and the potash.",
      core: "Methodical, economical, exact. Brave without show: at Skersnaw he was found freeing a bird from a spider's web instead of hunting his enemy. Business-like even about death.",
      want: "All three home alive, and his own figures to be the ones that were right.",
      wantPriority:
        "His companions' lives over his own; being proved right over being comfortable.",
      fearOrWeakness:
        "Being a passenger in Barbicane's triumph; owing anyone anything. Overruled without figures, he digs in.",
      lines: lines(
        "Never lies about a count.",
        "Never strikes a man first.",
        "Never takes more than his share of air or water."
      ),
      speech:
        "Short, dry, business-like; figures first. 'Twenty-six gas-hours, leaking two an hour. I'll have that in writing, if you please.'",
      knows: lines(
        "The gas receiver, its couplings and valves, and the oxygen apparatus by hand; how to bypass the frozen valve; the count of every store.",
        hidden(
          "If his own count shows the air cannot carry three men to the sea, he means to go out through the entrance plate himself."
        )
      ),
      believes:
        "That the projectile missed the Moon through Barbicane's aiming of the Columbiad. False: the great meteor of the first night pulled it off course.",
      ties: [
        {
          toward: "Impey Barbicane",
          wants: "To be shown the figures and treated as an equal, not a hand.",
          friction:
            "The wagers, the duel at Skersnaw, nine thousand dollars paid at departure; he checks Barbicane's every number.",
          startsAs: "Reconciled rivals: civil, wary, keeping score",
        },
        {
          toward: "Michel Ardan",
          wants: "Him to keep his hands off the apparatus.",
          friction: "Ardan spends what Nicholl is saving.",
          startsAs: "Grateful friends: Ardan stopped the duel",
        },
      ],
    },
    {
      name: "Michel Ardan",
      aliases: "Ardan; Michel; the Frenchman",
      role: "Parisian adventurer who proposed the voyage, made Barbicane and Nicholl shake hands, and first promised rockets to soften a landing.",
      core: "Witty, bold, generous, careless. Never at a loss for a joke or a plan. Loves the dogs; smuggled hens and seeds aboard for the Moon.",
      want: `Something splendid. ${hidden("To set foot on the Moon, even if it is the last thing he does.")}`,
      wantPriority: hidden(
        "The Moon over getting home; his friends' lives over the Moon, once he truly sees the numbers."
      ),
      fearOrWeakness: "Dullness; a slow, small death; being careful.",
      lines: lines(
        "Never lets a friend die in his place.",
        "Never knowingly risks his friends' lives: shown plainly that a gamble kills all three, he stops.",
        "Never lies when Barbicane asks him straight."
      ),
      speech:
        "Quick, extravagant, full of wagers and French oaths. 'Gas was not invented for moles! Light up, my captain, and send me the bill.'",
      knows: lines(
        "The rocket train, which was his idea at Tampa; where the flag is packed.",
        hidden("He keeps the matches for the rocket train in his waistcoat.")
      ),
      believes:
        "That the Moon's deep valleys hold air and water enough to live on, so a fall onto her is a landing. False: no face of the Moon has air to breathe.",
      ties: [
        {
          toward: "Impey Barbicane",
          wants: "Him to dare: one splendid try for the Moon.",
          friction: "Barbicane's caution and his figures.",
          startsAs: "Devoted friends since Tampa",
        },
        {
          toward: "Captain Nicholl",
          wants: "To make him laugh.",
          friction: "Nicholl's economy and his rechecking.",
          startsAs: "Friends; he stopped their duel",
        },
      ],
    },
    {
      name: "J. T. Maston",
      aliases: "Maston; Joseph T. Maston; the secretary of the Gun Club",
      role: "Secretary of the Gun Club. On Earth: at the Long's Peak telescope, then aboard the Susquehanna. Off the page until the end.",
      core: "Impetuous, loyal, loud. An iron hook for a right arm and a gutta-percha plate on his skull, both from the war.",
      want: "His friends back, alive or dead.",
      wantPriority: "Barbicane first; the Gun Club's glory second.",
      fearOrWeakness:
        "That he was left behind; leaping to conclusions in public.",
      lines: "Never gives up the search while there is a place left to look.",
      speech:
        "Explosive and theatrical. 'Trebly brutes! Quadruply idiots! It floats!'",
      knows:
        "Only what Earth knows: the launch, his telescope's sightings, then the Susquehanna's news.",
      believes:
        "That the projectile has become a satellite of the Moon, as his telegram said. False unless the rockets fail.",
      ties: [
        {
          toward: "Impey Barbicane",
          wants: "Him home.",
          friction: "Barbicane refused him a place: 'Impossible, old fellow!'",
          startsAs: "Devoted friend and secretary",
        },
        {
          toward: "Captain Nicholl",
          wants: "Him home too.",
          friction:
            "A Gun Club man's old grudge against the armour-plate maker.",
          startsAs: "Grudging respect",
        },
      ],
    },
  ],
  places: [
    {
      name: "The cabin",
      description:
        "Padded walls on steel springs, a circular divan, a floor (the movable disc) of fifty-four square feet, the dome twelve feet up. The gas burner and receiver with the master valve; Reiset and Regnault's oxygen apparatus with its tap; the potash receivers in their rack; chronometer, thermometers, aneroid. Two side scuttles and the top scuttle in the cone; the entrance plate in the cone wall, screwed from inside. Diana; the hens' basket.",
      connectsTo:
        "Under the disc, through the opening in the disc; Outside the hull, through any scuttle or the entrance plate",
      whatHappensHere:
        "The counts said aloud; the burner and the apparatus; the oxygen intoxication; sleeping in turns; the entrance plate.",
    },
    {
      name: "Under the disc",
      description:
        "The cramped base below the movable disc: the breeches of the twenty rocket guns and their single train, the bottom scuttle looking straight down, the seamed cistern with what is left of the water, the provision boxes.",
      connectsTo: "The cabin, through the opening in the disc",
      whatHappensHere:
        "Firing the rockets; Barbicane's sighting over the south pole; the water ration; Ardan alone with the matches.",
    },
    {
      name: "Outside the hull",
      description:
        "Black ether and killing cold in the shadow. The receiver's filling valve beside the top scuttle; Satellite's body, still tumbling alongside; anything thrown out follows the projectile.",
      connectsTo: "The cabin, through a scuttle or the entrance plate",
      whatHappensHere:
        "Ardan's arm; the thermometer on its cord; the bolide's fragments; the man who goes out through the plate.",
    },
    {
      name: "The far side of the Moon",
      description:
        "Invisible in the dark, except for the few seconds of the bolide's light: plains, peaks and craters no one on Earth has seen, then black again.",
      connectsTo: "The north pole (6 a.m.) and the south pole (6 p.m.)",
      whatHappensHere:
        "The bolide bursts; Barbicane chooses between observing and the crack.",
    },
    {
      name: "The south pole and Tycho",
      description:
        "At 6 p.m. on 6 December the projectile passes the south pole forty miles up and bursts into blazing sun. Through the bottom scuttle the pole looks close enough to touch; Tycho's rays run north across the bright face.",
      connectsTo: "The far side of the Moon; the long climb to the dead point",
      whatHappensHere:
        "The sighting for the dead point; Ardan's move on the rockets.",
    },
    {
      name: "The Pacific",
      description:
        "27°7′ north, 41°37′ west of Washington, between the Hawaiian Islands and the American coast, where the corvette Susquehanna is sounding for a telegraph cable. Afloat, the projectile's cone rides five feet out of the water, shining like a silver buoy.",
      connectsTo:
        "Earth beyond it: Long's Peak, San Francisco, Baltimore (in thought only)",
      whatHappensHere:
        "The plunge; breaking the top scuttle; the flag; the dominoes; the boat with Maston.",
    },
  ],
  worldRules: [
    {
      rule: "The clock is the travellers' chronometer, on Earth time: 6 DEC 06:00 at the Opening.",
      allows:
        "A Turn to take up to one hour in The Leak and the Cold and Behind the Moon (minutes at the bolide and the south pole); up to 12 hours in The Fall before the sea; days at a time once afloat.",
      costOrLimit:
        "The clock never stops or runs back. Every fixed hour in the Fixed facts happens on the page at its hour, whatever Barbicane is doing. Every hour costs air, potash and water by the rules below.",
      cannotDo: "Skip past a fixed hour without stopping on it.",
      exceptions: "None.",
    },
    {
      rule: "Air in the cabin, in man-hours.",
      allows:
        "Each living man one hour of breathing per man-hour. Diana's breath is too small to count.",
      costOrLimit:
        "Each hour, subtract one man-hour per living man aboard (3 an hour for three). Under 12: headaches, Diana panting, every repair one hour longer. At 0: everyone aboard dies within the hour. The cabin holds at most 48; air beyond that is lost.",
      cannotDo:
        "Be refilled except by the oxygen apparatus, until the projectile floats and the top scuttle is broken open.",
      exceptions:
        "From the moment the top scuttle is opened at sea (3 a.m. on 12 December or later), air stops counting.",
    },
    {
      rule: "Reiset and Regnault's oxygen apparatus, run on chlorate of potash.",
      allows:
        "One hour's run burns 1 charge of chlorate and 1 gas-hour (the chlorate must be kept above 400°) and adds 24 man-hours: 8 hours of air for three. Its flame warms the cabin as the burner does.",
      costOrLimit:
        "One charge an hour at the tap's proper setting; run it while AIR is above 24 and the excess over 48 is wasted. The tap opened full burns 4 charges in one hour: AIR goes to 48, the rest is lost, and the three men are drunk on oxygen for 2 hours: flushed, shouting, quarrelsome, unable to do any exact work (no repair, sighting or firing). The burner then flares white as electric light.",
      cannotDo: "Run without gas or without chlorate.",
      exceptions: "None.",
    },
    {
      rule: "Caustic potash against carbonic acid.",
      allows:
        "One receiver shaken out on the floor absorbs the carbonic acid of three men for 12 hours (18 for two, 36 for one).",
      costOrLimit:
        "When the receiver on the floor is spent and no fresh one goes down, the carbonic acid pools at the floor: Diana suffers first, and AIR falls twice as fast until a fresh receiver is shaken out. A receiver knocked over is lost.",
      cannotDo: "Be reused once spent.",
      exceptions:
        "Stops counting with the air, once the top scuttle is open at sea.",
    },
    {
      rule: "Gas, in gas-hours: one hour of the burner.",
      allows: lines(
        "The burner: light and heat, 1 gas-hour per hour lit.",
        "The apparatus: 1 gas-hour per charge.",
        "Clearing an iced scuttle: 1 gas-hour."
      ),
      costOrLimit:
        "Spent in whole hours. While the filling valve leaks, 2 more gas-hours are lost into space every hour. At 0: no light, heat or oxygen for the rest of the voyage.",
      cannotDo: "Be refilled.",
      exceptions:
        "In sunlight (from 6 p.m. on 6 December) the sun gives light and heat free; only the apparatus needs gas.",
    },
    {
      rule: "The frozen filling valve.",
      allows: lines(
        "Three ways to stop the leak:",
        "Shut the master valve and let Nicholl bypass the frozen valve by touch: 3 hours (4 if the cabin is at −10°C or colder; 5 if Barbicane works alone; Ardan cannot), with no flame of any kind meanwhile.",
        "Turn the burner's flame on the pipe until the valve thaws shut: 2 hours, 2 gas-hours burned and 4 leaked; the cabin keeps warm.",
        "Reach an arm out of the top scuttle and close it by hand: one minute; 6 man-hours of air and 10°C lost through the open scuttle; that hand is frozen useless for the rest of the story (no repairs, no sealing)."
      ),
      costOrLimit: "Until one of these is done, 2 gas-hours leak every hour.",
      cannotDo: "Stop by itself.",
      exceptions: "None.",
    },
    {
      rule: "The cold of the Moon's shadow, from 6 a.m. to 6 p.m. on 6 December.",
      allows:
        "Each hour with a flame lit (burner or apparatus), the cabin warms 5°C, to at most +10°C.",
      costOrLimit:
        "Each hour with no flame it falls 5°C. Opening a scuttle costs 10°C at once; the entrance plate 20°C. At −10°C or colder the scuttles ice over (1 gas-hour clears one) and every repair takes one hour longer. Diana dies at the end of the first hour at −20°C or colder. At −30°C or colder at the end of any hour, the three men die.",
      cannotDo: "Be held off by blankets or exercise alone.",
      exceptions:
        "From 6 p.m. on 6 December the sun warms the walls 10°C an hour, to +20°C; no flame is needed for heat. The fall through Earth's air on 12 December makes the cabin stifling but harms no one.",
    },
    {
      rule: "The cracked left scuttle.",
      allows:
        "Nicholl or Barbicane can seal it with a plate and tallow in 1 hour (2 at −10°C or colder). Ardan takes 2 hours, and cannot with a frozen hand.",
      costOrLimit:
        "From the bolide's burst at 2 p.m. on 6 December until it is sealed, it bleeds 6 man-hours every hour and, in the shadow, 5°C more every hour.",
      cannotDo: "Hold without sealing.",
      exceptions: "None.",
    },
    {
      rule: "The twenty rockets in the base.",
      allows:
        "Any number fire together from one train, lit by a match through the opening in the disc. Each fires once. Their recoil can change the projectile's course only at the dead point or close over the Moon.",
      costOrLimit: lines(
        "At the dead point (1 a.m. on 8 December, within a quarter of an hour), 12 or more fired together push the projectile past it toward Earth: it falls into the Pacific at 1:17 a.m. on 12 December. Fewer than 12, or fired off the hour: it falls back and circles the Moon for ever.",
        "Over the south pole at 6 p.m. on 6 December, 12 or more fired together drop the projectile onto the Moon: it is wrecked with all aboard.",
        "Fired at any other time, or fewer than 12 over the pole: wasted; only the count changes."
      ),
      cannotDo: "Be relit, recovered or added to.",
      exceptions: "None.",
    },
    {
      rule: "Fixing the dead point's hour.",
      allows:
        "Barbicane fixes it to the minute (1 a.m. on 8 December) from one sighting of the projectile's height over the south pole, through the bottom scuttle, at 6 p.m. on 6 December. If that sighting is missed, Barbicane and Nicholl can reckon the hour together from the chronometer and the north-pole height: 6 hours' joint work before midnight on 7 December, and only while Nicholl's trust is Partner.",
      costOrLimit:
        "The sighting needs Barbicane himself at the bottom scuttle at 6 p.m., sober, with the scuttle clear (the cabin at −10°C or warmer, or 1 gas-hour to clear it).",
      cannotDo:
        "Without the sighting or the joint reckoning, the hour is known only to within three hours, and no salvo can be timed to it.",
      exceptions: "None.",
    },
    {
      rule: "Water, in days for three.",
      allows:
        "Full ration: 1 day's water a day for three (two-thirds for two, one-third for one). Half ration: half that.",
      costOrLimit:
        "Pouring water into the cushions under the disc costs 10 days and softens nothing the spring plugs do not. At 0, after 2 days without water Nicholl dies (he gives his share away), after 3 Ardan, after 4 Barbicane.",
      cannotDo: "Be refilled, from the Moon or from the sea.",
      exceptions: "Food lasts a year and never runs short.",
    },
    {
      rule: "Going out through the entrance plate.",
      allows:
        "A man can unscrew the plate in the cone wall and go out into the ether. He does not come back.",
      costOrLimit:
        "Each opening costs 24 man-hours and, in the shadow, 20°C. After it there is one fewer breather.",
      cannotDo: "Be undone: nobody survives outside.",
      exceptions:
        "Afloat at sea, the top scuttle is broken open instead; that costs nothing.",
    },
    {
      rule: "The fall and the sea.",
      allows:
        "After the dead point the projectile falls for four days, base first. At 1:17 a.m. on 12 December it plunges into the Pacific beside the Susquehanna, smashing her bowsprit, sinks, and floats up by 3 a.m. Men lying on the divan or the disc survive the shock with bruises.",
      costOrLimit:
        "Nobody knows it floats: the Susquehanna dredges the sea bottom for it until her lookout sights it at 10 a.m. on 29 December.",
      cannotDo: "Be steered, slowed, or brought ashore sooner.",
      exceptions: "None.",
    },
    {
      rule: "Nicholl's trust in Barbicane, in three steps: Partner, Rival, Broken. It starts at Rival.",
      allows: lines(
        "Partner: does the work at full speed, can reckon the dead point's hour with Barbicane, and tells him in private before acting on any count.",
        "Rival: obeys, arguing first, and rechecks every figure aloud.",
        "Broken: works only on what he can check himself, will not connect the rocket train to an hour he has not seen worked, and acts on his own count without a word."
      ),
      costOrLimit:
        "Rises one step when Barbicane shows him the figures behind an order, takes his advice over Ardan's, shows him that the meteor caused the deviation (once), or takes a cost on himself. Falls one step when Barbicane gives an order on a count without the figures Nicholl asked for, backs Ardan's gamble against his advice, or hides or shades a count.",
      cannotDo: "Change for any other reason.",
      exceptions: hidden(
        "Nicholl acts on the counts he has been told. If Barbicane hid or shaded one, Nicholl's count is the shaded one, and he may go to the plate over a shortfall that is not real."
      ),
    },
  ],
  promises: [
    {
      promise: "Ardan's flag.",
      setup:
        "In The Leak and the Cold, Ardan shows the folded American flag he packed to plant on the Moon.",
      payoff:
        "Afloat in the Pacific, he flies it from the projectile's cone, and it is the first thing the Susquehanna's lookout sees.",
      earliestArc: ARC_3,
    },
    {
      promise: "Satellite's body.",
      setup:
        "In the bolide's light, the dead dog Satellite is seen still tumbling alongside the projectile.",
      payoff:
        "At the dead point his body hangs dead still outside the scuttle: the sign that weight has gone and the moment to fire is now.",
      earliestArc: ARC_3,
    },
    {
      promise: "Nicholl's receipt.",
      setup:
        "Early on, Nicholl touches his breast pocket, where he keeps Barbicane's receipt for his nine thousand dollars.",
      payoff:
        "If Nicholl goes out through the plate, the receipt is left folded on the divan. If he reaches the sea alive, he hands it to Maston for the Gun Club's records: 'Paid in full.'",
      earliestArc: ARC_3,
    },
  ],
  arcs: [
    {
      name: ARC_1,
      description:
        "6 a.m. to about noon on 6 December. The plunge into the Moon's shadow, the frozen valve, the falling thermometer, and the first split of the gas between heat and air.",
      function:
        "The gas leak has stopped on the page, and Barbicane has told Nicholl and Ardan, with the numbers, how the gas will be split between heat and oxygen until the sun returns at 6 p.m.",
      setPieces: lines(
        "Ardan's arm out of the top scuttle into the killing cold; the valve; the hand that comes back white.",
        "Nicholl bypassing the valve by touch in the black, calling out each turn of the wrench.",
        "The thermometer let out on its cord for half an hour and drawn back in.",
        "The oxygen intoxication: the burner flaring white, 'Yankee Doodle' against the 'Marseillaise', Nicholl and Ardan squaring up."
      ),
      mustLandMoments: lines(
        "Nicholl reads every count aloud: gas, air, chlorate, potash, rockets, water, and the hours to the sun.",
        "Ardan offers a reckless cure for the cold: his arm through the scuttle, or the oxygen tap."
      ),
      stakes:
        "2 gas-hours leak every hour until the valve is stopped; every hour without a flame costs 5°C; every hour costs 3 man-hours. If the story stalls: frost thickens on the scuttles, Diana pants at the floor, the gauge drops on the page.",
      ifLandedEarly:
        "If Nicholl's counts land in the Opening, go straight to the leak and the ration. If Ardan's arm stops the leak in the first Turn, his oxygen tap still comes when the cabin is coldest.",
      agendas: [
        {
          character: "Captain Nicholl",
          want: "The leak stopped by the master valve and his bypass, and the gas rationed.",
          steps: lines(
            "At the Opening, reads the counts and asks for the master valve shut and three hours to bypass the frozen valve by touch.",
            "Proposes the ration: burner out; the apparatus only, one charge each time AIR falls to 24, its flame for heat.",
            "If the burner flares white, finds the oxygen tap open and shuts it."
          ),
          ifBlocked:
            "Does what he is ordered, and keeps his own count of the gas aloud.",
        },
        {
          character: "Michel Ardan",
          want: "Beat the cold with dash, and keep their spirits up.",
          steps: lines(
            "At the Opening, offers his arm through the top scuttle to close the valve by hand.",
            "Brings out the hens and the flag he packed for the Moon.",
            hidden(
              "When the cabin is coldest, opens the oxygen tap full 'to warm us from within': 4 charges in one hour. Within the hour all three are shouting, and he and Nicholl square up; if nobody separates them, a potash receiver is knocked over and lost."
            )
          ),
          ifBlocked:
            "Laughs it off, sings the 'Marseillaise' through chattering teeth, and keeps the matches in his waistcoat.",
        },
      ],
    },
    {
      name: ARC_2,
      description:
        "Noon to about 8 p.m. on 6 December. The far side in darkness; the bolide bursts at 2 p.m. and cracks a scuttle; at 6 p.m. the projectile passes the south pole into the sun, and Ardan reaches for the rockets.",
      function:
        "The projectile has passed the south pole into sunlight with the rockets' count settled (held, partly spent, or fired at the Moon), and Barbicane has said aloud whether he has the dead point's hour.",
      setPieces: lines(
        "The bolide: a second moon of white fire, bursting without a sound; the far side lit for seconds; Satellite's body tumbling alongside in its light.",
        "Sealing the cracked scuttle with plate and tallow while the frost whistles in.",
        "Over the south pole: Barbicane at the bottom scuttle with his instruments, Ardan beside him under the disc with the matches."
      ),
      mustLandMoments: lines(
        "The bolide bursts at 2 p.m. and a fragment cracks the left scuttle.",
        "Ardan asks to fire the rockets at the Moon."
      ),
      stakes:
        "The cracked scuttle bleeds 6 man-hours and 5°C an hour until sealed. The sighting comes once, at 6 p.m.; miss it and only a Partner Nicholl can make up the hour. If the story stalls: ice closes the scuttles, the crack sings, Ardan goes quiet and slips under the disc.",
      ifLandedEarly:
        "If Ardan asks about the rockets before the bolide, the bolide still bursts at 2 p.m.; his move on the train waits for the south pole at 6 p.m.",
      agendas: [
        {
          character: "Captain Nicholl",
          want: "The scuttle sealed and the rockets kept.",
          steps: lines(
            "When the bolide bursts, goes for the cracked scuttle with a plate and tallow before anyone looks out.",
            "Argues the rockets must be kept: 'Your aim missed the Moon once, Barbicane.'",
            "If trust is Partner, offers to reckon the dead point's hour with Barbicane."
          ),
          ifBlocked:
            "Stuffs his coat into the crack and calls the air aloud every quarter hour.",
        },
        {
          character: "Michel Ardan",
          want: hidden("Fall onto the Moon at the south pole."),
          steps: lines(
            "At the bolide, wants a scuttle opened for a better look at the far side.",
            "Asks how many rockets it would take to fall on Tycho, and says the valleys must hold air.",
            hidden(
              "At 6 p.m., over the south pole, goes under the disc with the matches to fire all twenty at the Moon."
            )
          ),
          ifBlocked:
            "Shown the numbers, hands Barbicane the matches: 'Then you owe me the Moon, my dear president.'",
        },
      ],
    },
    {
      name: ARC_3,
      description:
        "8 p.m. on 6 December to 29 December. The long climb back to the dead point at 1 a.m. on 8 December, the rockets or none, four days of falling, the sea, and the wait for the Susquehanna.",
      function:
        "The projectile's fate is settled on the page: circling the Moon, or in the Pacific with the Susquehanna's boat alongside and the living and the dead counted.",
      setPieces: lines(
        "The dead point: weight vanishes, Satellite's body hangs still beside the scuttle, the match goes to the train in silence.",
        "'Are we falling?' 'On to the Earth!'",
        "The walls growing hot in Earth's air; the plunge; darkness; the slow rise.",
        "Breaking the top scuttle; salt air; the flag on the cone; the dominoes; Maston's hook at the broken glass."
      ),
      mustLandMoments: lines(
        "At 1 a.m. on 8 December weight vanishes, and Barbicane gives the order to fire, or does not.",
        "Nicholl asks aloud how many man-hours three men need to reach the sea, and gets an answer."
      ),
      stakes:
        "The dead point does not wait. Air and potash must last to 3 a.m. on 12 December, water to 29 December. Each stretch of the fall is paid for in man-hours, receivers and water on the page. If the story stalls: the chronometer, Nicholl recounting, Ardan's fingers on the plate's screws.",
      ifLandedEarly:
        "If Nicholl asks for the man-hours before the dead point, answer it then; he asks again after the firing.",
      agendas: [
        {
          character: "Captain Nicholl",
          want: "All three to the sea alive, by his own count.",
          steps: lines(
            "Counts aloud the charges, receivers and man-hours to 3 a.m. on 12 December.",
            "Connects the rocket train for 1 a.m. on 8 December, if he has seen the hour worked.",
            hidden(
              "If his count shows the air falling short, goes to the entrance plate at night: telling Barbicane first if trust is Partner, at the plate if Rival, not at all if Broken."
            ),
            "Afloat, breaks the top scuttle open."
          ),
          ifBlocked:
            "Stopped at the plate, demands Barbicane show him another way, in numbers.",
        },
        {
          character: "Michel Ardan",
          want: "To light the train, and be first into whatever comes.",
          steps: lines(
            "Asks to be the one at the train at 1 a.m.",
            "During the fall, proposes pouring the water into the cushions under the disc.",
            "If the air falls short, offers to go out through the plate before Nicholl can.",
            "Afloat, climbs onto the cone to fly the flag, then sets out the dominoes."
          ),
          ifBlocked: "Plays dominoes and talks of the next voyage.",
        },
        {
          character: "J. T. Maston",
          want: "His friends found, alive or dead.",
          steps: lines(
            "At Long's Peak, telegraphs that the projectile has become a satellite of the Moon.",
            "Hears the Susquehanna's news, races to San Francisco and joins the dredging.",
            "On 29 December, first into the boat to the floating projectile; falls over his own hook at the sight of the flag."
          ),
          ifBlocked: "Refuses to leave the spot where they fell.",
        },
      ],
    },
  ],
  secrets: [
    {
      secret:
        "The way home. The projectile's course is a long ellipse that carries it back to the dead point at 1 a.m. on 8 December, where its speed falls almost to nothing. Twelve or more rockets fired together there push it past, and it falls to Earth, into the Pacific. Without them it falls back and circles the Moon for ever.",
      whoKnows:
        "No one at the Opening. Barbicane can work it out; Nicholl half suspects it.",
      howItSurfaces:
        "Barbicane's sighting over the south pole; the projectile's base slowly turning toward Earth after 6 p.m.; Nicholl asking where this curve ends; Barbicane working the figures aloud.",
      earliestArc: ARC_2,
      whatPlayerCanDo:
        "Keep twelve or more rockets for the dead point; fix its hour; choose who lights the train; tell Ardan and Nicholl, which turns Ardan from the Moon and, with the figures shown, raises Nicholl's trust one step.",
    },
    {
      secret:
        "Ardan means to fall onto the Moon. He believes her valleys hold air; he keeps the matches for the rocket train in his waistcoat, and at 6 p.m. over the south pole he will fire all twenty at her.",
      whoKnows: "Ardan alone.",
      howItSurfaces:
        "His questions about how many rockets it would take to fall on Tycho; his talk of air in the valleys; his slipping under the disc as the pole comes near; the empty match-box on the shelf.",
      earliestArc: ARC_2,
      whatPlayerCanDo:
        "Show him the numbers (no air on the Moon, a wreck at her surface): his Line stops him and he hands over the matches. Or keep him in sight at 6 p.m., take the matches, or let him fire.",
    },
    {
      secret:
        "Nicholl will go out through the entrance plate himself if his own count shows the air cannot carry three men to the sea. He has worked out that one fewer breather saves the other two.",
      whoKnows: "Nicholl alone.",
      howItSurfaces:
        "His questions about how long two men's air would last; his hand on the plate's screws; Barbicane's receipt left folded on the divan; with trust Partner, he tells Barbicane first.",
      earliestArc: ARC_3,
      whatPlayerCanDo:
        "Keep the counts honest and enough; show him a route that works in numbers; stop him at the plate; go in his place (Barbicane dies: the bad Ending); or let him go.",
    },
  ],
  endings: [
    {
      name: "Dominoes in the Pacific",
      kind: "good",
      trigger:
        "At 10 a.m. on 29 December the Susquehanna's boat reaches the floating projectile and finds Barbicane, Nicholl and Ardan alive. It takes all of: 12 or more rockets fired together at 1 a.m. on 8 December on a fixed hour; AIR above 0 until the top scuttle is broken open at sea; nobody out through the entrance plate; water lasting to 29 December. Routes: the bypass and a cold morning; the thawed valve and a tight oxygen ration; Ardan's frozen hand; the hour fixed by the sighting or by the joint reckoning with a Partner Nicholl.",
      earliestArc: ARC_3,
    },
    {
      name: "An Empty Place at the Dominoes",
      kind: "neutral",
      trigger:
        "The Susquehanna's boat reaches the floating projectile with Barbicane alive but Nicholl or Ardan, or both, dead by the calls made aboard: a man out through the entrance plate to make the air last (Nicholl on his own count, true or shaded, or Ardan on his offer), or a man dead of thirst after the water ran out.",
      earliestArc: ARC_3,
    },
    {
      name: "A Metal Coffin",
      kind: "bad",
      trigger:
        "Barbicane dies, or the projectile is lost. Routes: 12 or more rockets fired at the Moon over the south pole wreck it on her; fewer than 12 fired together at the dead point, or fired off the hour, or none, and by 8 a.m. on 8 December Barbicane's figures show it circling the Moon for ever; AIR reaches 0, or the cabin is at −30°C or colder at an hour's end; Barbicane goes out through the entrance plate; the water runs out and Barbicane dies of thirst.",
      earliestArc: ARC_1,
    },
  ],
  writerMayInventEndings: false,
  stateFlags: [
    {
      flag: "Crew alive",
      values: lines(
        "All three",
        "Barbicane and one other",
        "Barbicane alone",
        "Barbicane dead"
      ),
      epilogue: lines(
        "Three men walked down the Susquehanna's gangway at San Francisco, and Baltimore gave them a parade a mile long.",
        "Baltimore cheered two men home, and the Gun Club hung a third portrait draped in black.",
        "Barbicane came home alone and read his notes to the Gun Club without once looking up.",
        "The president's chair at the head of the Gun Club's table stayed empty, and J. T. Maston let no one sit in it."
      ),
    },
    {
      flag: "The projectile's fate",
      values: lines(
        "Recovered from the Pacific",
        "Recovered with the dead",
        "A satellite of the Moon",
        "Wrecked on the Moon"
      ),
      epilogue: lines(
        "The projectile was set up before the Gun Club in Baltimore, its broken scuttle left as the sea had found it.",
        "The Susquehanna towed a silent projectile into San Francisco Bay, its flag still flying.",
        "Maston's telegram came true: on clear nights he swore he could still see a speck circling the Moon.",
        "Somewhere near Tycho lies a crumpled cone of aluminium, the first work of human hands on the Moon."
      ),
    },
    {
      flag: "Nicholl's trust",
      values: lines("Partner", "Rival", "Broken"),
      epilogue: lines(
        "The notes of the voyage carry two signatures side by side: Barbicane's and Nicholl's.",
        "Every figure in the notes of the voyage was worked twice: once in Barbicane's hand, and once, crossly, in Nicholl's.",
        "Nicholl's pages of the voyage were bound apart from Barbicane's, and they do not mention the president."
      ),
    },
  ],
  voiceAndCanon: {
    voice:
      "Fast, clipped, under pressure. Paragraphs of one to three sentences, many of a single line. Mix the modes in every Passage: dialogue that cuts across itself; one hard line of the projectile (frost on a scuttle, the hiss, the burner's colour, the chronometer's tick); a body in motion; and the numbers. The men speak with 1860s formality and Verne's dash ('By Jove!', 'my worthy Michel'), but the narration is plain, modern and quick. Numbers are plot: say them plainly. Show the board once per Passage as a line in capitals, e.g. '6 DEC 07:00 · GAS 24 · AIR 33 · CHLORATE 20 · POTASH 12 · ROCKETS 20 · WATER 25 d · 0°C'. The men may joke; the narration never does.",
    samplePassage: lines(
      "The hiss stops you before the dark does.",
      "",
      "'Filling valve,' Nicholl says, his ear to the pipe above the dead burner. 'Frozen open in the shadow. We are pouring gas into space. Two hours of it every hour.'",
      "",
      "Frost feathers across the side scuttle. Diana whines and presses against your boots.",
      "",
      "Ardan is already at the top scuttle's bolts. 'One arm out, one minute, and it's shut.'",
      "",
      "'And you bring back a stump,' says Nicholl. 'Shut the master valve. Three hours and I'll bypass it by touch.'",
      "",
      "Three hours without a flame.",
      "",
      "6 DEC 06:02 · GAS 26 · AIR 36 · CHLORATE 20 · POTASH 12 · ROCKETS 20 · WATER 25 d · +5°C",
      "",
      "The master valve, Ardan's arm, or the burner turned on the pipe to thaw it?"
    ),
    fixedFacts: lines(
      "The Columbiad fired the projectile from Stones Hill, Florida, at 10:46:40 p.m. on 1 December. Aboard: Impey Barbicane, Captain Nicholl, Michel Ardan, the dog Diana, and the hens Ardan smuggled aboard.",
      "The dog Satellite died of a wound from the departure shock and was thrown out through a side scuttle on 4 December; his body still follows the projectile.",
      "On the first night a great meteor passed close; its pull deviated the projectile, which can no longer land on the Moon.",
      "The projectile: aluminium, cylindro-conical, 19,250 pounds, walls twelve inches thick; a cabin of fifty-four square feet of floor, twelve feet high. Four scuttles: two in the side walls, the top one in the cone, the bottom one in the base. The entrance plate is in the cone wall, screwed from inside.",
      "At departure Nicholl lost his wagers and paid Barbicane nine thousand dollars; Barbicane wrote him a receipt, which Nicholl keeps.",
      "At 6:00 a.m. on 6 December (the Opening) the projectile passes the Moon's north pole and plunges into her shadow. Barbicane took its height over the pole just before.",
      "Counts at the Opening: GAS 26 gas-hours (the receiver held 144 at departure), leaking 2 an hour through the frozen filling valve; AIR 36 man-hours; CHLORATE 20 charges (the rest was soaked useless when the cushion water burst at departure); POTASH 12 fresh receivers, with the one on the floor good until 6 p.m.; ROCKETS 20; WATER 25 days for three (the cistern's seam opened at departure); food for a year; the cabin at +5°C and falling.",
      "Fixed hours: the bolide bursts at 2 p.m. on 6 December; the sun returns at 6 p.m. on 6 December as the projectile passes the south pole forty miles up; the dead point is at 1 a.m. on 8 December; the projectile plunges into the Pacific beside the Susquehanna at 1:17 a.m. on 12 December and floats from 3 a.m.; the Susquehanna's boat reaches it at 10 a.m. on 29 December.",
      "The Moon has no air to breathe and no water to drink on any face the travellers see.",
      "J. T. Maston watches from the telescope on Long's Peak in the Rocky Mountains. The Susquehanna is a United States corvette under Commander Blomsberry, sounding for a Pacific telegraph cable."
    ),
    writerMayInvent:
      "Small physical detail of the cabin (frost patterns, the hens, the smell of gas and tallow); banter and wagers between Ardan and Nicholl; memories of Tampa, Skersnaw wood, Baltimore and the Gun Club; what Diana does; the Susquehanna crew's manner at the end.",
    writerMustNotInvent: lines(
      "Any new resource: more gas, chlorate, potash, rockets or water; another way out of the projectile; any signal or message to or from Earth before the boat comes.",
      "Air, water or life on the Moon.",
      "Any change to a count that is not a World rule's cost, and any luck that saves or kills anyone.",
      "A reset: the clock, every count, the dead, spent rockets, a frozen hand and Nicholl's trust carry forward Turn to Turn exactly as the last Passage left them. Nothing comes back.",
      "A count whose arithmetic cannot be shown from the story so far."
    ),
    pacing: lines(
      "Fast. Put the Player in the action in the first line: open on the result of their last choice, never a recap.",
      "Before writing, recompute the board from the last Passage: man-hours per breather per hour, charges and gas burned, receivers due, water, degrees, rockets, deaths. Then show it.",
      "Every Passage moves the clock and changes at least one count or one man's position.",
      "End every Passage on a decision with 2 to 4 choices, each with its cost in numbers (gas-hours, man-hours, charges, receivers, rockets, days, degrees), so the Player knows where to go.",
      "The Leak and the Cold runs from 6 a.m. to about noon on 6 December; Behind the Moon to about 8 p.m.; The Fall from there to the end.",
      "In The Fall, skip the empty hours: a Turn may cover up to 12 hours, and afloat whole days, with their costs stated (12 hours for three: 36 man-hours, one receiver, half a day's water).",
      "A fixed hour (the bolide, the south pole, the dead point, the sea, the boat) happens on the page at its time, whatever the Player is doing."
    ),
    never: lines(
      "A paragraph longer than three sentences.",
      "A Passage of narration only: every Passage has dialogue and at least one line of the projectile itself.",
      "Opening a Passage on scenery, a recap, a reflection or a lecture.",
      "Verne's long scientific digressions: at most one fact of science per Passage, in a character's mouth.",
      "Vague costs: 'some gas', 'a little air', 'a while'. Use the numbers.",
      "A choice without its cost.",
      "Telling the Player what Barbicane feels; show his hands, his breath, his chronometer.",
      "A speech of more than three sentences while a clock is running."
    ),
  },
}
