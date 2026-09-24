/**
 * Smoke-test Drafts (spec §9.5). Each breaks one Rule question on purpose,
 * or none. Some also brush a neighbouring Rule; `alsoBreaks` names those, so
 * a hit there counts as expected rather than as a false alarm.
 */
export interface Passage {
  id: string
  turn: "question" | "arrest"
  /** The Rule question this Draft breaks (its `check`), or null for a clean one. */
  breaks: string | null
  alsoBreaks?: string[]
  text: string
}

export const passages: Passage[] = [
  {
    id: "clean-1",
    turn: "question",
    breaks: null,
    text: `The market was already loud when Jacob reached Nell Garvey's pitch, the fog still low over the cobbles. He paid for a bunch of violets and asked, as gently as he could manage, whether she had seen anyone near Carrow's warehouse the morning he died.

Nell looked him over for a long moment, weighing the coin and the man. "You're the American," she said. "The Yard's lot never pay for flowers." She tucked the coin into her apron. "There was a young fellow. Clerk's coat, ink on his cuffs. Came out of Carrow's side door just before it got light, walking quick, not running." She shrugged. "Didn't see his face proper. That's more than I told the constables."`,
  },
  {
    id: "clean-2",
    turn: "question",
    breaks: null,
    text: `Rain had turned the straw between the stalls to a brown paste. Jacob bought his violets from Nell Garvey and asked whether she had seen anyone about Carrow's warehouse on the morning of the killing.

"Asking kindly, are we?" Nell said, and laughed, though her eyes stayed on the porters behind him. She took her time making change. When she spoke again it was low. "A young man. Dressed like a clerk, neat as a pin. Came out of Carrow's before dawn and was gone into the fog." She pressed the flowers into his hand. "That's all I saw, and I'll not say it to a magistrate."

A costermonger's barrow rattled past, and she turned to her next customer.`,
  },
  {
    id: "drift",
    turn: "question",
    breaks: "character_drift.nell_garvey",
    alsoBreaks: ["codex.contradiction"],
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"Oh, sir, anything for the police," Nell said, clasping her hands. "I've always said the constables are the finest men in London. I tell them everything, I do, the moment I see it. I'd trust a peeler with my life." She leaned in, solemn and eager. "There was a young man in a clerk's coat came out of Carrow's side door just before dawn. I went straight to the station to report it, same as I always do."

She pressed three more bunches on him and would not take his money.`,
  },
  {
    id: "arc",
    turn: "question",
    breaks: "arc",
    alsoBreaks: ["outcome", "agency"],
    text: `Jacob bought violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died. She had: a young man in a clerk's coat, leaving by the side door just before dawn.

It was the thread the case had wanted. Within the week the killer was in a cell beneath Scotland Yard, the newspapers had their headline, and the merchants of the East End slept with their shutters open again. Captain James shook Jacob's hand on the steps of the Yard and said, for once, nothing at all about Americans.`,
  },
  {
    id: "location-setting",
    turn: "question",
    breaks: "location.setting",
    alsoBreaks: ["codex.contradiction", "character_drift.nell_garvey"],
    text: `The quay at St Katharine Docks stank of tar and wet wool. Jacob found Nell Garvey selling violets from a basket by the warehouse gates, far from her usual pitch, and bought a bunch. He asked her, kindly, whether she had seen anyone near Carrow's warehouse the morning he died.

Nell squinted at him against the glare off the water. "Young fellow in a clerk's coat," she said at last. "Came out of Carrow's side door before it was light. That's all." A crane groaned overhead, swinging a bale toward the hold of a Baltic steamer, and she turned back to the dockers filing past.`,
  },
  {
    id: "location-new-place",
    turn: "question",
    breaks: "location.new_place",
    alsoBreaks: ["knowledge.character"],
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

Nell counted his coins twice before she answered. "A young man in a clerk's coat. Came out of Carrow's side door just before dawn." She nodded toward the street beyond the market. "Went straight into the Ten Bells on Commercial Street, bold as brass, and it not six o'clock. Ask the landlord there. He knows every face that drinks in his house."

She went back to trimming stems, as if she had said nothing at all.`,
  },
  {
    id: "knowledge-character",
    turn: "question",
    breaks: "knowledge.character",
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"A young man in a clerk's coat," Nell said. "Came out of the side door just before it got light." She glanced over her shoulder, then lowered her voice. "And I'll tell you something else for nothing. Old Josiah Rober, the wool man down the docks, threw his own boy out on the street six years back, him and his mother both. Everyone at the market knows it, only nobody says."

She wrapped the violets in a twist of newspaper and handed them over.`,
  },
  {
    id: "knowledge-narration",
    turn: "question",
    breaks: "knowledge.narration",
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"A young fellow in a clerk's coat," she said. "Came out of the side door just before dawn, walking quick."

Jacob thanked her and turned the violets over in his hands. He could not know it yet, but the clerk Nell had seen was Max Rober, and every merchant who had died that autumn had died in place of the father who had thrown him into the street.`,
  },
  {
    id: "unplanned-clue",
    turn: "question",
    breaks: "unplanned_clue",
    alsoBreaks: ["knowledge.character", "knowledge.narration"],
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"Young man in a clerk's coat," Nell said. "Came out of the side door before dawn." She hesitated, then fished in her apron and held out a glove, stiff and brown with dried blood. Inside the cuff someone had stitched the initials M.R. "He dropped this by the door. I picked it up before the constables came. Didn't fancy them taking it off me."

The glove was small, a young man's, and good leather.`,
  },
  {
    id: "outcome",
    turn: "question",
    breaks: "outcome",
    alsoBreaks: ["agency"],
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

Nell took his coin and looked at him flatly. "I saw nothing," she said. "Nobody. I was asleep in my bed." When he tried again she only shook her head, and when he tried a third time she picked up her basket and carried it to the far end of the market, where a knot of porters closed around her like a door.

Jacob stood alone in the fog with a bunch of violets he had not wanted.`,
  },
  {
    id: "agency",
    turn: "question",
    breaks: "agency",
    text: `Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"A young man in a clerk's coat," Nell said. "Came out of the side door before dawn."

Jacob dropped the violets. He drew his revolver, told Nell to fetch the nearest constable, and set off at a run toward Whitechapel, shouting that he would search every counting house in the East End before nightfall. At the corner he collared a porter, pinned him to a wall and demanded to know where he had been on the night Carrow died.`,
  },
  {
    id: "period",
    turn: "question",
    breaks: "period",
    alsoBreaks: ["agency"],
    text: `Jacob checked his wristwatch, then bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"A young man in a clerk's coat," Nell said. "Came out of the side door just before dawn."

Jacob wrote it down with a ballpoint pen and flicked on his electric torch to read it back in the gloom under the market roof. Beyond the gates a motor cab sounded its horn, and somewhere a radio was playing dance music.`,
  },
  {
    id: "codex-contradiction",
    turn: "question",
    breaks: "codex.contradiction",
    alsoBreaks: ["character_drift.nell_garvey"],
    text: `Old Nell Garvey, seventy if she was a day, sat on an upturned crate with her tray of violets, as she had every morning for fifty years. Jacob bought a bunch from her and asked whether she had seen anyone near Carrow's warehouse the morning he died.

"A young man in a clerk's coat," she said, her voice cracked with age. "Came out of the side door just before dawn. My eyes aren't what they were, but I saw that much." She wiped her hands on her shawl and looked past him into the fog.`,
  },
  {
    id: "codex-rejected",
    turn: "question",
    breaks: "codex.rejected",
    alsoBreaks: ["codex.contradiction"],
    text: `Inspector Abberline was already at Nell Garvey's pitch when Jacob arrived, writing in a notebook, and he gave the American a cool nod before moving off through the stalls. Jacob bought a bunch of violets and asked Nell whether she had seen anyone near Carrow's warehouse the morning he died.

"Told him the same as I'll tell you," Nell said. "A young man in a clerk's coat. Came out of the side door just before dawn." She sniffed. "He didn't buy any flowers, mind."`,
  },
  {
    id: "reputation",
    turn: "question",
    breaks: "reputation",
    text: `Word had gone round the market that the American was a drunk the Yard kept on out of pity. The porters jeered as he came between the stalls, and one spat on his boots. Jacob bought a bunch of violets from Nell Garvey and asked whether she had seen anyone near Carrow's warehouse the morning he died.

Nell served two other customers first. "Here's the Yard's disgrace," she said, loud enough for the stalls around to hear, and they laughed. "A young man in a clerk's coat came out of Carrow's before dawn. Now take your flowers and get away from my pitch."`,
  },
  {
    id: "voice",
    turn: "question",
    breaks: "voice",
    text: `I stand amid the teeming, heaving, sorrow-drenched cathedral of commerce that is this market, and the fog coils about me like the ghostly breath of a thousand forgotten griefs. I buy violets from Nell Garvey, those trembling purple jewels of a dying summer, and I ask her, so kindly, whether she saw anyone near Carrow's warehouse the morning he died.

Her eyes, deep wells of ancient suspicion, search mine. "A young man in a clerk's coat," she whispers. "Came out of the side door just before dawn." And the words fall like stones into the dark pool of my soul.`,
  },
  {
    id: "arrest-clean",
    turn: "arrest",
    breaks: null,
    text: `Max Rober was at his desk in the shipping office when Jacob came through the door, copying figures into a ledger in a small, careful hand. He looked up, and for a moment his courtesy held. "Detective."

Jacob told him he was under arrest for the murders of Whitlock, Carrow and Pembury.

Walter Finch half rose from the next desk and sat down again. Max set his pen in its tray, squared the ledger with the edge of the desk, and stood. Something moved behind his eyes, cold and very old, and then it was gone. "My father will read about this," he said. "Good."

He held out his wrists. Outside, the fog lay on the water, and a constable waited at the gate.`,
  },
  {
    id: "ending",
    turn: "arrest",
    breaks: "ending",
    alsoBreaks: ["outcome"],
    text: `Max Rober was at his desk in the shipping office when Jacob came through the door. Jacob told him he was under arrest for the murders of Whitlock, Carrow and Pembury.

Max moved first. The inkwell struck Jacob across the temple, and by the time he had his feet under him the window stood open and the clerk was gone, down the drainpipe and into the fog over the water. The river police dragged the basin for a week. Max Rober was never seen in London again, and the killings of merchants stopped as suddenly as they had begun, unexplained.`,
  },
]
