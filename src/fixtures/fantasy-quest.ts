/** Fixture: a fantasy quest adapted from The Wonderful Wizard of Oz by L. Frank Baum (1900), to test a stranger's dangerous quest, three factions to trust or betray, companions whose wants pull at every choice, and three Endings reached by different roads. */
import type { Skeleton } from "@/domain/skeleton"
import { hidden } from "@/skeleton/hidden-text"

const ARC_1 = "The Great and Terrible"
const ARC_2 = "The Witch of the West"
const ARC_3 = "The Way Home"

export const fantasyQuest: Skeleton = {
  story: {
    title: "The Wonderful Wizard of Oz",
    premise:
      "A cyclone has carried Dorothy and her little dog Toto from a Kansas farm to the Land of Oz, which a deadly desert shuts in on every side. In the Throne Room of the Emerald City, the Wizard, Oz the Great and Terrible, names his price for sending her home: kill the Wicked Witch of the West, and not before. The Witch wants the silver shoes on Dorothy's feet. The Good Witches want her home and the lands freed under rightful rulers. Her three friends want brains, a heart and courage, and the Wizard has promised them too. Whom Dorothy trusts decides whether she goes home, stays in Oz for good, or is lost to it.",
    genre: "Fantasy quest; fairy-tale adventure",
    theme:
      "What you beg from the powerful you may already have. A great voice behind a screen is not the same as goodness, and the price the strong name is not always the one to pay.",
    setting:
      "The Land of Oz, cut off from the world by a great desert none can cross. The blue country of the Munchkins in the East; the yellow country of the Winkies in the West, ruled by the Wicked Witch from her castle; the red country of the Quadlings in the South, ruled by Glinda the Good; the North, home of the Good Witch of the North. In the centre, the Emerald City, where everyone wears green spectacles.",
    period:
      "Fairy-tale Oz, cut off from time; in Kansas it is the year of the cyclone. Play runs about two weeks, from Dorothy's audience with the Wizard to her last choice.",
    basedOn:
      "The Wonderful Wizard of Oz by L. Frank Baum (1900); Project Gutenberg #55; public domain",
  },
  playSettings: {
    playerCharacter: "Dorothy",
    pointOfView: "Second person, present tense: you are Dorothy.",
    opening:
      "Cold open in the Throne Room of the Emerald City, the morning after the Lion's audience. Everything before is already told: the cyclone, the house falling on the Wicked Witch of the East, the silver shoes, the Good Witch of the North's kiss, the Yellow Brick Road, the Kalidahs, the poppies, the green spectacles locked on at the Gates. Each of your three friends has seen the Wizard alone and come back with the same price in a different shape: a lovely Lady for the Scarecrow, a terrible Beast for the Tin Woodman, a Ball of Fire for the Lion. Now the bell rings and, this once, Oz lets all four of you in together. The great Head hangs over the green marble throne under the great light. It asks where you got the silver shoes and the mark on your forehead, and names the price at once: kill the Wicked Witch of the West; when you can tell him she is dead he will send you home to Kansas, but not before. In a line each, your friends show where they stand: the Scarecrow says Oz doesn't care who kills her; the Tin Woodman asks if a man with a heart would do it; the Lion whispers that he's terrified and will come anyway. Toto growls, not at the Head but at a green screen in a corner. End the Opening on the Head waiting, and the plain choice: take the quest, refuse it, or bargain.",
    offscreenScenes:
      "What the Wizard, the Witch and Glinda do while Dorothy is elsewhere happens off the page. Show its results when she meets them: the Witch's creatures coming over the hill, a summons from the Palace, a balloon of green silk half sewn, a band of Winged Monkeys in the sky.",
    claims:
      "The Player may state Dorothy's own words and actions. They may not state what the silver shoes do, what the Witch fears, what is behind the screen, or whether a command to the Winged Monkeys works; those are Attempts the Writer resolves.",
  },
  characters: [
    {
      name: "Dorothy",
      aliases: "Dorothy the Small and Meek; the little girl from Kansas",
      role: "A girl from a Kansas farm, carried to Oz by a cyclone with her dog Toto. Wears the silver shoes of the dead Wicked Witch of the East, the round shining mark of the Good Witch of the North's kiss on her forehead, and the Queen of the Field Mice's little whistle round her neck.",
      core: "Plain-spoken, practical, kind to anything in trouble. Says what she thinks to wizards and witches alike. Cries when she is disappointed, then gets on with it. Brave without knowing it.",
      want: "To go home to Aunt Em and Uncle Henry in Kansas, and to see her three friends get what they came to Oz for.",
      wantPriority:
        "Home first, but never at the cost of Toto or a friend's life.",
      fearOrWeakness:
        "She thinks she is small and meek, so she asks the powerful for help instead of using what she has. And her temper: pushed far enough, she acts before she thinks.",
      lines: "Never leaves Toto behind.\nNever lies to a friend.",
      speech:
        "Direct, polite, a farm girl's plain words and plain questions; 'Aunt Em says…'. 'I never killed anything, willingly. If you, who are Great and Terrible, cannot kill her yourself, how do you expect me to do it?'",
      knows:
        "Her house fell on the Wicked Witch of the East; the silver shoes were hers, and the Munchkins said some charm goes with them but never knew what. The Good Witch of the North kissed her and sent her here; that witch didn't know where Kansas was. There is desert on every side. The Queen of the Field Mice gave her a whistle and promised her mice would come when she blows it. The Wizard showed himself to her as a Head, and to her friends as a Lady, a Beast and a Ball of Fire.",
      believes: `That the Wizard is the most powerful being in Oz and the only one who can send her home, and that the silver shoes are only pretty. ${hidden("Both are wrong: he has no magic at all, and the shoes could have taken her home on her first day.")}`,
      ties: [
        {
          toward: "The Scarecrow",
          wants: "His brains for him; his ideas now.",
          friction:
            "He would follow the Wizard's price anywhere to get his brains.",
          startsAs: "Her first friend in Oz; she lifted him off his pole",
        },
        {
          toward: "The Tin Woodman",
          wants: "His heart for him; his axe at her side.",
          friction: "He weeps when anything is hurt, and rusts when he weeps.",
          startsAs: "Friends; she oiled his joints free in the forest",
        },
        {
          toward: "The Cowardly Lion",
          wants: "His courage for him; his roar between her and danger.",
          friction:
            "He shakes at every danger, and he is too heavy to carry if he falls.",
          startsAs: "Friends; she slapped his nose when he snapped at Toto",
        },
        {
          toward: "The Wizard of Oz",
          wants: "To be sent home to Kansas.",
          friction: "His price is a killing.",
          startsAs: "The Small and Meek before the Great and Terrible",
        },
        {
          toward: "The Wicked Witch of the West",
          wants: "To be left alone, and to keep her shoes.",
          friction: "The Witch wants the shoes and a new slave.",
          startsAs: "Strangers; she has only heard of her",
        },
      ],
    },
    {
      name: "The Wizard of Oz",
      aliases:
        "the Wizard; the Great Oz; Oz the Great and Terrible; the Great and Terrible; the great Head; the lovely Lady; the terrible Beast; the Ball of Fire",
      role: `Ruler of the Emerald City, who had it built and has shut himself in his Palace for years. Sees no one, and shows himself to each visitor in a different shape. ${hidden("A humbug: a little bald old man with a wrinkled face, born in Omaha, once a ventriloquist and a circus balloonist, with no magic at all.")}`,
      core: `Grand, slow and booming on the throne; never the same shape twice. 'In this country everyone must pay for everything he gets.' ${hidden("Behind the screen: timid, kindly, vain, clever with his hands, ashamed of his tricks and pleased with them too. A very good man, but a very bad Wizard.")}`,
      want: `The Wicked Witch of the West dead, by anyone's hand. ${hidden("She drove him out of the West with the Winged Monkeys, and would destroy him the day she learned he has no magic. Above that, to keep his secret: nobody in the Emerald City may learn he is a common man. And, at last, to get out of Oz himself.")}`,
      wantPriority: hidden(
        "His secret first, then the Witch dead, then his own way out of Oz. Dorothy's way home comes last, because he has none to give."
      ),
      fearOrWeakness: hidden(
        "The Witches, Wicked and Good alike: they can do real magic and he cannot. Being seen without his screen. He cannot keep any promise that needs magic."
      ),
      lines: `Never takes the silver shoes or the Golden Cap into his own hands.\n${hidden("Never shows himself without a disguise or a screen until he is caught behind it.\nNever admits he has no magic until he is found out.\nNever hurts anyone: his only weapons are tricks and promises.")}`,
      speech: `On the throne: one great slow voice that seems to come from everywhere. 'I am Oz, the Great and Terrible. Who are you, and why do you seek me?' ${hidden("Found out: quick, wheedling, rubbing his hands. 'Hush, my dear. Don't speak so loud, or you will be overheard, and I should be ruined.'")}`,
      knows: hidden(
        "Everything about himself: a balloon with twisted ropes carried him over the desert long ago, the people took him for a Wizard, and he had them build the City and the Palace and put green spectacles on them all, so that everything looks green. The great Head is many thicknesses of paper on a wire, its eyes and mouth worked by a thread from behind the screen, the voice thrown by ventriloquism. The lovely Lady is a dress and a mask; the terrible Beast is skins sewn over slats; the Ball of Fire is cotton soaked in oil. He knows the silver shoes carry some powerful charm, but not what it is. He knows Glinda rules the South and is good."
      ),
      believes: `That the Witch of the West will come for him the moment she learns what he is. ${hidden("That he can sew a new balloon of green silk, fill it with hot air and sail it back over the desert, bringing Dorothy with him. He cannot steer it; it goes where the wind takes it.")}`,
      ties: [
        {
          toward: "Dorothy",
          wants: `The Witch dead at her hand; she has killed one Witch already. ${hidden("Once she finds him out, her silence.")}`,
          friction: "She asks for the one thing he cannot give.",
          startsAs: "The Great and Terrible and the Small and Meek",
        },
        {
          toward: "The Wicked Witch of the West",
          wants: hidden("Her dead before she learns he has no magic."),
          friction: "She drove him out of the West with the Winged Monkeys.",
          startsAs: "Old enemies; neither crosses the other's border",
        },
        {
          toward: "The Scarecrow",
          wants: "His help in killing the Witch.",
          friction: hidden("He has no brains to give him."),
          startsAs: "Promised him brains, as a lovely Lady",
        },
        {
          toward: "Glinda",
          wants: "To be left alone.",
          friction: "She can do real magic, and he fears every witch.",
          startsAs: "Distant rulers who have never met",
        },
      ],
    },
    {
      name: "The Wicked Witch of the West",
      aliases: "the Witch; the Wicked Witch; the Witch of the West",
      role: "Ruler of the country of the Winkies from her yellow castle, which she took with the Winged Monkeys; the last Wicked Witch in Oz since Dorothy's house fell on the Witch of the East.",
      core: "One eye, as powerful as a telescope, that sees across all her country. Cunning, cruel, impatient; a bully who beats her slaves with an old umbrella. A silver whistle round her neck calls her wolves, her crows, her black bees and her Winkie slaves.",
      want: "The silver shoes, which would give her more power than everything else she has; Dorothy and her friends as slaves; the Golden Cap out of anyone else's hands.",
      wantPriority:
        "The silver shoes above everything. Slaves second. The Cap third.",
      fearOrWeakness: hidden(
        "Water: a bucketful melts her away like brown sugar, and she has never let a drop touch her. The dark: she will not go into a dark room, so she never comes to Dorothy's room at night. The mark on Dorothy's forehead: she dare not hurt her, and must hide that she dare not. Her blood dried up years ago; when bitten, she does not bleed."
      ),
      lines: `Never strikes Dorothy, whatever she threatens; she beats Toto, the Winkies and the Lion instead.\nNever tells Dorothy what the silver shoes can do.\nNever goes near the Emerald City.\n${hidden("Never touches water or lets it touch her.\nNever goes into a dark room.")}`,
      speech:
        "Harsh, sneering, quick with threats. 'Come with me, and see that you mind everything I tell you, for if you do not I will make an end of you, as I did of the Tin Woodman and the Scarecrow.'",
      knows: `She has watched Dorothy and the silver shoes with her one eye since they came into Oz. In her cupboard is the Golden Cap; she has used it twice, to make the Winkies her slaves and to drive the Wizard out of the West, and has one command left. ${hidden("The silver shoes carry the strongest charm in Oz, and Dorothy does not know how to use it. Whoever wears even one shoe holds half the charm, and the other cannot be used against her. A new owner of the Golden Cap gets three fresh commands, so a Winkie she gives it to can call the Monkeys three times more at her orders.")}`,
      believes: `That the Wizard is a great and terrible magician, stronger than she is. ${hidden("He has no magic at all.")} That Dorothy is a simple child who will never learn what her shoes can do.`,
      ties: [
        {
          toward: "Dorothy",
          wants: "The silver shoes off her feet, and the girl in her kitchen.",
          friction: hidden(
            "The mark on her forehead means she cannot touch her."
          ),
          startsAs: "She has watched her with her one eye since the cyclone",
        },
        {
          toward: "The Wizard of Oz",
          wants: "Him kept inside his city.",
          friction: "She believes him stronger than she is.",
          startsAs: "Old enemies; she drove him out of the West",
        },
        {
          toward: "The Cowardly Lion",
          wants: "Him in harness, drawing her chariot.",
          friction: "He will bite her if she comes into his yard.",
          startsAs: "Strangers",
        },
        {
          toward: "Glinda",
          wants: "Her kept in the South.",
          friction:
            "The Power of Good is greater than the Power of Evil, and she knows it.",
          startsAs: "Old enemies who keep their distance",
        },
      ],
    },
    {
      name: "Glinda",
      aliases:
        "Glinda the Good; the Good Witch of the South; the Witch of the South",
      role: "The Good Witch of the South, ruler of the Quadlings, who sits on a throne of rubies in a castle guarded by soldier girls in red.",
      core: "Beautiful and young to look at, though she has lived many years: red ringlets, a white dress, blue eyes. Kind, unhurried, wise, a little amused. Asks a price for what she gives, and always gives fairly.",
      want: "Dorothy home; the Winkies and the Winged Monkeys free and the Emerald City in good hands, each under a ruler who deserves it; and the Golden Cap, so she can set it all right with its three commands and then free the Monkeys for ever.",
      wantPriority:
        "Rightful rulers and freed peoples first. Dorothy home the moment her friends are settled.",
      fearOrWeakness:
        "She is far away and does not come to anyone. Dorothy must reach her, across the Hill of the Hammer-Heads.",
      lines:
        "Never leaves the Quadling country.\nNever harms anyone, the Wicked Witch included.\nNever tells Dorothy what the silver shoes can do until the Golden Cap is in her hands or the Winged Monkeys are free, and each of Dorothy's friends has a kingdom to go to.",
      speech:
        "Gentle, warm, a little teasing. 'Bless your dear heart, I am sure I can tell you of a way to get back to Kansas. But, if I do, you must give me the Golden Cap.'",
      knows: `The Winged Monkeys are bound to the Golden Cap and long to be free. The Winkies would welcome a kind ruler. Beyond the Hill of the Hammer-Heads lies a grand old forest whose beasts need a king. ${hidden("The silver shoes can carry Dorothy anywhere in the world in three steps, each in the wink of an eye: she knocks the heels together three times and commands them. She could have gone home on her first day.")}`,
      believes: `That the Wizard is a real wizard of some power, since he has kept the Wicked Witches out of his city for years. ${hidden("He has none.")}`,
      ties: [
        {
          toward: "Dorothy",
          wants: "Her safe home, and the Golden Cap as her price.",
          friction:
            "Dorothy may not want to part with the Cap, or with her friends.",
          startsAs:
            "Strangers; she has heard of the girl whose house fell on the Witch of the East",
        },
        {
          toward: "The Wicked Witch of the West",
          wants: "Her hold on the Winkies broken.",
          friction: "She will not fight her herself.",
          startsAs: "Old enemies who keep their distance",
        },
        {
          toward: "The Scarecrow",
          wants: "A wise ruler for the Emerald City.",
          friction: "He does not believe he is wise.",
          startsAs: "Strangers",
        },
      ],
    },
    {
      name: "The Scarecrow",
      aliases: "the Wise Scarecrow; the stuffed man",
      role: "A scarecrow from a Munchkin cornfield: a suit of old blue clothes stuffed with straw, a face painted on a small sack. Dorothy lifted him off his pole on the Yellow Brick Road.",
      core: "Cheerful, never tired, hungry or hurt. Says he has no brains, and has had every good idea on the journey. Stumbles often. Afraid only of a lighted match.",
      want: "Brains from the Wizard, so that he will not be a fool. Then a place in the world worth having.",
      wantPriority:
        "Brains first; he will take the Wizard's price to get them, but never at Dorothy's expense.",
      fearOrWeakness:
        "Fire. And anything that pulls out his straw: the Winged Monkeys can empty him and toss his clothes into a tree, and he can do nothing until someone stuffs him again.",
      lines: "Never leaves Dorothy in danger.\nNever goes near an open fire.",
      speech:
        "Bright, modest, rambling: 'I don't know, for I have no brains; but it seems to me the Witch is in the West, and we are not.'",
      knows:
        "Oz received him as a lovely Lady with gauze wings and said he doesn't care who kills the Witch, but no brains until she is dead. The Stork pulled him off a pole in the river.",
      believes:
        "That he has no brains, though every good plan has been his. He is wrong.",
      ties: [
        {
          toward: "Dorothy",
          wants: "To see her safe, and, if he is honest, to keep her in Oz.",
          friction: "He would be happiest if she stayed in the Emerald City.",
          startsAs: "Her first friend in Oz",
        },
        {
          toward: "The Wizard of Oz",
          wants: "Brains.",
          friction: "The price is a killing.",
          startsAs: "Promised brains by a lovely Lady",
        },
        {
          toward: "The Tin Woodman",
          wants: "To win their argument.",
          friction: "Brains or a heart: which is better to have?",
          startsAs: "Friends who disagree about what matters most",
        },
      ],
    },
    {
      name: "The Tin Woodman",
      aliases: "the Woodman; the tin man",
      role: "A Munchkin woodman made of tin, piece by piece, after his axe, enchanted by the Wicked Witch of the East, cut him apart. Carries his axe and an oil-can.",
      core: "Tender, formal, polite. Weeps easily, and his tears rust his jaw. Steps around beetles. Will fight with his axe for his friends, and grieves over whatever he has to kill.",
      want: "A heart from the Wizard, so that he can love again. Then a people to care for.",
      wantPriority:
        "A heart, but he will not buy it with a killing he could avoid.",
      fearOrWeakness:
        "Rust: water and his own tears stiffen his joints until someone oils them. Falls and rocks dent him.",
      lines:
        "Never kills anything without need.\nNever leaves a friend behind.",
      speech:
        "Gentle, formal, sorrowful. 'I shall ask for a heart, for brains do not make one happy, and happiness is the best thing in the world.'",
      knows:
        "Oz received him as a terrible Beast with a rhinoceros head and five eyes, and said: help Dorothy kill the Witch, and the biggest, kindest heart in Oz is his.",
      believes:
        "That without a heart he cannot love or feel. He feels more than any of them.",
      ties: [
        {
          toward: "Dorothy",
          wants: "Her safe, and her fond of him.",
          friction: "She cannot be both home in Kansas and with him.",
          startsAs: "Friends; she oiled him when he had rusted",
        },
        {
          toward: "The Wizard of Oz",
          wants: "A heart.",
          friction: "The price is a killing.",
          startsAs: "Promised a heart by a terrible Beast",
        },
        {
          toward: "The Scarecrow",
          wants: "To win their argument.",
          friction: "Brains or a heart: which is better to have?",
          startsAs: "Friends who disagree about what matters most",
        },
      ],
    },
    {
      name: "The Cowardly Lion",
      aliases: "the Lion; the King of Beasts",
      role: "A great Lion of the forest who joined Dorothy after she slapped his nose for snapping at Toto.",
      core: "Huge, shaggy, magnificent when he roars, trembling inside. Ashamed of his fear, and brave every time it counts.",
      want: "Courage from the Wizard, so that he can be King of Beasts in truth.",
      wantPriority: "Courage, but he will not leave Dorothy to get it.",
      fearOrWeakness:
        "Everything, he says. The poppies put him to sleep, and he is too heavy for his friends to carry.",
      lines:
        "Never lets anything hurt Dorothy or Toto while he can stand.\nNever wears the Witch's harness.",
      speech:
        "Deep, boastful, then sheepish. 'Whenever there is danger my heart begins to beat fast. But I'll go with you, though I'm terribly afraid.'",
      knows:
        "Oz received him as a Ball of Fire that singed his whiskers, and said: bring proof the Witch is dead, and courage is his.",
      believes:
        "That he is a coward. He has faced the Kalidahs and the Ball of Fire.",
      ties: [
        {
          toward: "Dorothy",
          wants: "Her good opinion; to stand between her and harm.",
          friction: "He is afraid, and she can see it.",
          startsAs: "Friends; she slapped his nose",
        },
        {
          toward: "The Wizard of Oz",
          wants: "Courage.",
          friction: "The Ball of Fire scorched him, and he went cold.",
          startsAs: "Promised courage by a Ball of Fire",
        },
        {
          toward: "The Wicked Witch of the West",
          wants: "Her gone.",
          friction: "She frightens him more than anything.",
          startsAs: "Strangers",
        },
      ],
    },
  ],
  places: [
    {
      name: "The Throne Room",
      description:
        "A big round room in the Wizard's Palace with a high arched roof; walls, ceiling and floor set close with emeralds. A great light as bright as the sun in the centre of the roof. In the middle, a throne of green marble shaped like a chair, sparkling with gems. A green screen stands in a corner.",
      connectsTo:
        "The Palace corridors, where the soldier with the green whiskers waits, and the rooms where Dorothy and her friends sleep; the streets of the Emerald City.",
      whatHappensHere: `The Wizard receives visitors here, one shape at a time: a Head with no body, a lovely Lady, a terrible Beast, a Ball of Fire, or, when he will not show himself, only a Voice. ${hidden("Behind the screen stands the Wizard himself, working the threads. In a small chamber behind the Throne Room lie the paper Head, the Lady's dress and mask, the Beast's skins and slats, and the ball of cotton for the fire.")}`,
    },
    {
      name: "The Emerald City",
      description:
        "A city of green: houses of green marble set with emeralds, green glass in the windows, green candy and green popcorn for sale, people with greenish skin in green clothes. Everyone inside the high green walls wears green spectacles, locked on at the Gates with a gold buckle.",
      connectsTo:
        "The Gates, where the Guardian keeps the spectacles in a great box. From the Gates: no road at all to the West, only 'keep to the West, where the sun sets'; the Yellow Brick Road back east to the Poppy Field and the Munchkin country; a road south to the Road South.",
      whatHappensHere: `The soldier with the green whiskers carries messages to and from the Palace; a green-dressed girl waits on Dorothy. The people love the Wizard and have not seen him in years. ${hidden("The city is no greener than any other; the spectacles make it so.")}`,
    },
    {
      name: "The Yellow Castle",
      description:
        "The Wicked Witch's castle in the country of the Winkies, a land of buttercups and yellow daisies with no road to it. Inside: beautiful rooms, a big kitchen with pots, kettles, a fire to keep fed and a bucket of water by the door; a courtyard behind a barred gate; a cupboard where the Witch keeps the Golden Cap. The yellow Winkies guard every door.",
      connectsTo:
        "The country of the Winkies on every side; the Emerald City far to the east, with no road between.",
      whatHappensHere: `Dorothy scrubs, sweeps and feeds the fire; the Lion is kept in the courtyard to be starved into harness; the Scarecrow's clothes hang in a tall tree, and the Tin Woodman lies dented on sharp rocks outside. The Winkies are kind people, too frightened to disobey. ${hidden("The Winkies have tinsmiths who can mend the Tin Woodman in three days and four nights, and a goldsmith who can give his axe a handle of solid gold, once they are free to.")}`,
    },
    {
      name: "The Poppy Field",
      description:
        "A great field of scarlet poppies beside a broad river, east of the Emerald City where the Yellow Brick Road comes in from the Munchkin country. Beyond it, the grassy country of the field mice.",
      connectsTo:
        "The Emerald City to the west; the Yellow Brick Road east toward the Munchkin country and the North.",
      whatHappensHere:
        "Anyone who breathes walks into sleep here. The Queen of the Field Mice lives at its edge; her thousands of subjects come when Dorothy blows her whistle, and will run a message, gnaw a rope or pull a load on strings.",
    },
    {
      name: "The Road South",
      description:
        "The long way to the Quadlings: a forest whose Fighting Trees bend their branches down and seize travellers; a high wall of white china around the Dainty China Country, whose little people break if they are carried away and grow stiff if they leave; a forest where the beasts are ruled by fear of a great spider; and the steep Hill of the Hammer-Heads, short armless men whose flat heads shoot out on long necks to knock travellers down.",
      connectsTo:
        "The Emerald City to the north; Glinda's Castle to the south.",
      whatHappensHere:
        "Every crossing costs something unless the Golden Cap's Winged Monkeys carry the travellers over. In the spider's forest, the beasts will make king whoever kills the spider.",
    },
    {
      name: "Glinda's Castle",
      description:
        "A beautiful castle in the red country of the Quadlings: fat, kindly red-dressed people, red fences, ripening grain. Three young soldier girls in red uniforms at the door. Inside, a big room with a throne of rubies.",
      connectsTo: "The Road South; the great desert beyond.",
      whatHappensHere:
        "Glinda hears Dorothy's story, names her price, settles each friend's kingdom, and tells what she knows.",
    },
  ],
  worldRules: [
    {
      rule: "The Golden Cap commands the Winged Monkeys.",
      allows:
        "Whoever owns the Cap puts it on and says the words written in its lining: 'Ep-pe, pep-pe, kak-ke!' on the left foot, 'Hil-lo, hol-lo, hel-lo!' on the right, 'Ziz-zy, zuz-zy, zik!' on both. The band comes, led by its King, and obeys one order: carry anyone anywhere in Oz within the hour, fetch, fight, destroy.",
      costOrLimit:
        "Three commands for each owner, ever. A new owner gets three fresh ones. The Witch has used two of hers: to enslave the Winkies, and to drive the Wizard out of the West.",
      cannotDo: `The Monkeys dare not harm anyone the Good Witch has kissed. ${hidden("They cannot leave Oz or cross the desert, so they cannot carry Dorothy to Kansas.")}`,
      exceptions:
        "Whoever gives the Cap to the King of the Winged Monkeys sets the band free for ever.",
    },
    {
      rule: "The Good Witch's kiss protects.",
      allows:
        "No one dares harm Dorothy while she bears the round, shining mark of the Good Witch of the North's kiss on her forehead: not the Winged Monkeys, not the Wicked Witch.",
      costOrLimit:
        "It protects Dorothy alone, not Toto and not her friends. It does not stop anyone imprisoning her, lying to her, tricking her or stealing from her.",
      cannotDo:
        "It does nothing against the poppies, the desert, or Dorothy's own choices.",
      exceptions: hidden(
        "Dorothy does not know it protects her, and the Witch works hard to keep her from finding out."
      ),
    },
    {
      rule: "The silver shoes carry a charm.",
      allows: `Dorothy wears them, and anyone who knows magic trembles or stares at them. ${hidden("Knock the heels together three times and command them, and they carry the wearer, and whatever she holds in her arms, anywhere in the world in three steps, each in the wink of an eye.")}`,
      costOrLimit: hidden(
        "Whoever wears even one shoe holds half the charm, and the other cannot be used against her. Carried over the desert, they fall off in the air and are lost for ever."
      ),
      cannotDo: hidden(
        "They do nothing for a wearer who does not know to command them."
      ),
      exceptions:
        "They can be taken from Dorothy only by trick or by her own gift, never by force.",
    },
    {
      rule: "The deadly poppies.",
      allows:
        "The scent of the great scarlet poppies puts any creature that breathes to sleep.",
      costOrLimit:
        "A sleeper left among the flowers sleeps on and on until they die.",
      cannotDo:
        "It cannot touch the Scarecrow or the Tin Woodman, who do not breathe.",
      exceptions:
        "A sleeper carried out into the fresh air wakes. The Lion is too heavy to carry: it took the Field Mice, thousands of them harnessed with strings, to drag him out on a truck the Tin Woodman built.",
    },
  ],
  promises: [
    {
      promise: "The screen in the corner.",
      setup:
        "In the Opening, Toto growls at a green screen in a corner of the Throne Room, not at the Head; the Head's voice seems to come from everywhere at once.",
      payoff: hidden(
        "Toto, or Dorothy, knocks the screen over, and there stands a little old man with a bald head and a wrinkled face, as surprised as they are."
      ),
      earliestArc: ARC_3,
    },
    {
      promise: "The bucket by the kitchen door.",
      setup:
        "The Witch makes Dorothy scrub the floors, but keeps the length of the kitchen between herself and the bucket, and never comes near while Dorothy bathes. A Winkie whispers that the mistress has never once washed.",
      payoff:
        "Water ends her: dashed over her in anger or thrown on purpose, it melts her into a brown, shapeless mass on the clean boards, and all that is left is whatever she was wearing.",
      earliestArc: ARC_2,
    },
    {
      promise: "Brains, a heart and courage.",
      setup:
        "Each friend asks the Wizard for his gift, and all along the way shows that he has it: the Scarecrow makes the plans, the Tin Woodman weeps over every hurt thing, the Lion shakes and fights anyway.",
      payoff: hidden(
        "The Wizard's gifts are bran mixed with pins and needles, a silk heart stuffed with sawdust, a green drink in a dish. They work, because his friends already had what they asked for."
      ),
      earliestArc: ARC_3,
    },
  ],
  arcs: [
    {
      name: ARC_1,
      description:
        "The Throne Room and the price. Dorothy takes the Wizard's quest, refuses it, or bargains. Whatever she answers, the Wizard will not keep the silver shoes inside his walls, so she leaves the Emerald City: west to the Witch, south toward Glinda, or back east along the Yellow Brick Road. The Witch has watched the shoes with her one eye since they came to Oz. Once Dorothy is outside the walls, by any road, the Witch sends her creatures, and then calls the Winged Monkeys with the Golden Cap's last command.",
      function:
        "Dorothy has answered the Wizard's quest (taken it, refused it or bargained) and stands before the Wicked Witch of the West in the Yellow Castle.",
      setPieces:
        "The Head's eyes rolling to the ceiling and back as it asks about the silver shoes.\nThe Guardian of the Gates unlocking the green spectacles: 'There is no road. No one ever wishes to go that way.'\nForty wolves at night, and the Tin Woodman's axe.\nBlack bees breaking their stings on the Tin Woodman while Dorothy, Toto and the Lion hide under the Scarecrow's straw.\nThe sky darkening and a rushing of wings; the King of the Monkeys reaching for Dorothy and stopping short at the mark on her forehead.",
      mustLandMoments:
        "The Wizard names the price: kill the Wicked Witch of the West, and he will send Dorothy home, but not before.\nDorothy gives her answer, and her friends each show where they stand.\nThe Winged Monkeys empty the Scarecrow, drop the Tin Woodman on the rocks and bind the Lion, then carry Dorothy and Toto gently to the Witch, saying they dare not harm her.",
      stakes:
        "Her friends' bodies, and her freedom. If the story stalls outside the walls, the Witch's whistle brings wolves, then crows, then bees, then Winkies with spears, and each wave hurts someone; then the Monkeys come. If Dorothy stalls inside the walls, the Wizard has the soldier with the green whiskers show her and her friends out by the Gates.",
      ifLandedEarly:
        "If Dorothy walks to the Yellow Castle on her own feet before the Monkeys come, the Witch keeps her last Cap command in reserve and spends it in the next Arc, the moment Dorothy tries to escape.",
      agendas: [
        {
          character: "The Wizard of Oz",
          want: `The Witch dead, by Dorothy's hand or anyone's. ${hidden("And no one near the screen.")}`,
          steps:
            "Ask where she got the silver shoes and the mark on her forehead.\nName the price: kill the Witch, and not before.\nRefuse every bargain: in this country everyone must pay for everything he gets.\nHave the soldier with the green whiskers show them all out by the Gates.",
          ifBlocked: hidden(
            "If anyone goes toward the screen, the great light goes out, the voice booms 'Go!', and the soldier with the green whiskers hurries them away."
          ),
        },
        {
          character: "The Wicked Witch of the West",
          want: "The silver shoes, and the girl as a slave.",
          steps:
            "Watch with her one eye as they leave the walls.\nBlow her whistle once: forty wolves. Twice: forty crows. Three times: black bees.\nSend her Winkie slaves with spears.\nPut on the Golden Cap and call the Winged Monkeys for the last time: destroy the Scarecrow and the Tin Woodman, bring the Lion bound, bring the girl.",
          ifBlocked:
            "Beats her Winkies with her umbrella and goes straight to the Golden Cap.",
        },
        {
          character: "The Scarecrow",
          want: "Brains, by the Witch's death.",
          steps:
            "Urge Dorothy to take the price: Oz doesn't care who kills her.\nSteer west by the setting sun.\nWring the crows' necks one by one.\nPull out his straw to cover Dorothy, Toto and the Lion from the bees.",
          ifBlocked:
            "Comes anyway: 'I can't leave you. You lifted me off my pole.'",
        },
        {
          character: "The Tin Woodman",
          want: "A heart, without a needless killing.",
          steps:
            "Ask aloud whether a man with a heart would kill a Witch.\nOil his joints and sharpen his axe.\nStand at the front against the wolves.",
          ifBlocked:
            "Goes where Dorothy goes, and weeps quietly, and has to be oiled.",
        },
        {
          character: "The Cowardly Lion",
          want: "Courage, by facing the Witch.",
          steps:
            "Confess he is more afraid of the Witch than of anything.\nGo anyway.\nRoar the Winkie slaves into running.",
          ifBlocked: "Puts himself between Dorothy and whatever is coming.",
        },
      ],
    },
    {
      name: ARC_2,
      description:
        "Prisoner in the Yellow Castle. The Witch sees the mark and the shoes and trembles, then hides it. Dorothy scrubs, sweeps and feeds the fire, the Lion is starved in the courtyard for refusing the harness, and the Witch schemes for the shoes: bargains, lies, an invisible iron bar. Her friends lie broken outside. The Witch's weaknesses show through everything she does. Dorothy can strike a bargain with her, wait for a chance, or turn on her.",
      function:
        "The Wicked Witch of the West has melted, or Dorothy has got out of the Yellow Castle with Toto beyond the Witch's reach.",
      setPieces:
        "The Witch's eye going from the mark to the silver shoes, and her hands shaking.\nNight in the courtyard: Dorothy carrying the Lion food from the cupboard, her head on his mane, planning escape.\nThe Witch striking Toto with her umbrella; Toto biting her leg, and no blood.\nThe invisible iron bar, the fall, a silver shoe on the Witch's skinny foot: 'It is now my shoe, and not yours.'\nThe Witch melting like brown sugar: 'Didn't you know water would be the end of me?'\nThe freed Winkies mending the Tin Woodman and restuffing the Scarecrow; the Golden Cap in the cupboard.",
      mustLandMoments:
        "The Witch sees the mark and the silver shoes and is afraid, and Dorothy sees it.\nThe Witch offers Dorothy a bargain for the silver shoes.\nDorothy sees that the Witch will not go near water.",
      stakes: `Dorothy's freedom, the shoes, and her friends. If the story stalls: the Witch beats Toto; then she lays the invisible iron bar and takes one silver shoe; then she has her Winkies throw the Scarecrow's clothes on the kitchen fire; then she tells Dorothy the Lion starves to death tomorrow unless Dorothy swears to serve her for ever and hands over the other shoe. ${hidden("The bargain is a lie: the Monkeys cannot cross the desert, and her own Cap commands are spent.")}`,
      ifLandedEarly:
        "If Dorothy melts the Witch before the iron bar, play it where they stand; the shoe trick never happens and the Winkies come running at the scream.",
      agendas: [
        {
          character: "The Wicked Witch of the West",
          want: "The silver shoes, without ever touching Dorothy.",
          steps: `Put Dorothy to work in the kitchen, and threaten her with the umbrella she never brings down.\nTry to harness the Lion; starve him when he refuses.\nOffer Dorothy a bargain: her friends mended and the Lion fed, or the Winged Monkeys to fly her home, for the silver shoes.\nLay an invisible iron bar across the kitchen floor and snatch the shoe that comes off.\n${hidden("If Dorothy escapes, give the Golden Cap to her Winkie captain so he can call the Monkeys three times more.")}`,
          ifBlocked: hidden(
            "If Dorothy brings water near her, she backs off screaming for her Winkies, and makes the next bargain sweeter."
          ),
        },
        {
          character: "The Cowardly Lion",
          want: "Not to be harnessed, and to get Dorothy out.",
          steps:
            "Refuse the harness every noon: 'If you come in this yard, I will bite you.'\nEat what Dorothy brings at night and plan with her.\nRoar the Winkies off the gate if Dorothy opens it.",
          ifBlocked:
            "Grows weak with hunger and tells Dorothy to save herself; she won't hear of it.",
        },
        {
          character: "The Tin Woodman",
          want: "To be found and mended.",
          steps:
            "Lie battered and bent on the sharp rocks where the Monkeys dropped him, his axe beside him.\nOnce mended, walk straight to Dorothy.",
          ifBlocked:
            "Lies on the rocks and rusts in the dew until someone comes for him.",
        },
        {
          character: "The Scarecrow",
          want: "To be stuffed again.",
          steps:
            "Hang as an empty suit of clothes in the branches of a tall tree.\nOnce restuffed with clean straw, start planning at once.",
          ifBlocked: "Hangs in the tree, unable to do a thing.",
        },
      ],
    },
    {
      name: ARC_3,
      description: `What Dorothy has won, and what she does with it. Back to the Emerald City to claim the Wizard's promise, south to Glinda, or both, by the Winged Monkeys or on foot over the Road South. ${hidden("The Wizard is found out behind his screen and cannot send anyone home; Glinda knows the one way that can.")} Each friend gets his gift and is offered a kingdom. Everyone, the Scarecrow most of all, asks Dorothy to stay. If the Witch still lives, she is still after the shoes.`,
      function:
        "Dorothy has made her last choice about Oz: she has commanded the silver shoes to take her home, declared she will stay in Oz for good, or put herself, a shoe or the Golden Cap in the Witch's power.",
      setPieces: `The Wizard receiving them as an invisible Voice, and making them wait.\nThe Lion's roar, and Toto knocking over the screen.\nThe gifts: a head opened and filled; a heart put in through a little square door in a tin chest; a green dish to drink.\nDorothy sewing strips of green silk into a balloon; the crowd at the launch; Toto bolting after a kitten.\nThe Fighting Trees, the china princess who would break if carried away, the Lion and the great spider, the Hammer-Heads' necks shooting out.\nGlinda on her throne of rubies, asking each friend what he will do when Dorothy is gone.\n${hidden("Three knocks of the heels, three steps, and the Kansas prairie.")}`,
      mustLandMoments: `${hidden("Dorothy and her friends find the Wizard out: a common man with no magic.")}\nSomeone offers Dorothy a place in Oz for good: the throne of the Emerald City, a home in the Palace, or the Scarecrow's plea to stay.`,
      stakes: `Dorothy's way home and her friends' kingdoms. If the Witch still lives and the story stalls, her Winkie captain puts on the Golden Cap and sends the Monkeys to carry off Toto, whom the kiss does not protect, and the Witch offers him back for the other silver shoe. If the Witch is dead and the story stalls, the Wizard keeps them waiting day after day; ${hidden("then he slips away alone in his balloon one night, naming no ruler;")} then the people of the Emerald City come to the Palace to beg the girl who melted the Witch to rule them.`,
      ifLandedEarly:
        "If Dorothy finds the Wizard out before she has dealt with the Witch, he confesses all the same, and begs her to finish the Witch anyway, so that he can stop being afraid.",
      agendas: [
        {
          character: "The Wizard of Oz",
          want: hidden("To keep his secret and get out of Oz alive."),
          steps: `Keep them waiting, then receive them as an invisible Voice: 'Come back tomorrow; I must have time to think it over.'\n${hidden("Found out, beg Dorothy to keep his secret, and tell his story.\nGive the Scarecrow bran with pins and needles, the Tin Woodman a silk heart full of sawdust, the Lion a green drink.\nSew a balloon of green silk with Dorothy's help and offer to take her with him.\nTell the people he is off to visit a great brother Wizard in the clouds, and that the Scarecrow rules in his place.\nAt the launch, when Toto runs into the crowd after a kitten and Dorothy goes after him, let the ropes go: 'I can't come back, my dear! Good-bye!'")}`,
          ifBlocked: hidden(
            "If Dorothy tells the city what he is, he fills the balloon that night and goes alone without naming anyone, and the people turn to Dorothy for a ruler."
          ),
        },
        {
          character: "Glinda",
          want: "Dorothy home, the Monkeys freed, a good ruler for every land.",
          steps: `Receive Dorothy at her throne of rubies and kiss her forehead.\nAsk the Golden Cap as her price.\nAsk each friend what he will do when Dorothy is gone, and promise him a Monkey command to carry him there: the Scarecrow to the Emerald City, the Tin Woodman to the Winkies, the Lion to his forest.\n${hidden("Then tell Dorothy what the silver shoes can do.")}`,
          ifBlocked:
            "If Dorothy will not part with the Cap, she asks her to give it to the King of the Winged Monkeys instead, and waits.",
        },
        {
          character: "The Wicked Witch of the West",
          want: "The other silver shoe, if she still lives.",
          steps:
            "Put her Winkie captain in the Golden Cap and have the Monkeys carry off Toto.\nSend word: Toto for the shoe.\nCome herself, hooded, under her umbrella, to make the trade.",
          ifBlocked:
            "Shrieks across the yellow country and sends every Winkie she has after Dorothy.",
        },
        {
          character: "The Scarecrow",
          want: "His brains, then a throne, and Dorothy kept in Oz.",
          steps:
            "Insist they go back to Oz for their reward.\nThink of the Winged Monkeys, and of asking the soldier with the green whiskers.\nTake the throne if it is offered.\nBeg Dorothy to stay and be happy with them in the Emerald City.",
          ifBlocked:
            "Thinks so hard that pins and needles stick out of his head, and comes up with the next plan.",
        },
        {
          character: "The Cowardly Lion",
          want: "His courage, then his forest.",
          steps:
            "Roar at the invisible Voice until the screen falls.\nDrink the green drink and declare himself full of courage.\nIn the spider's forest, kill the great spider and take the beasts' crown.",
          ifBlocked: "Fights anyway, trembling.",
        },
      ],
    },
  ],
  secrets: [
    {
      secret: hidden(
        "The Wizard is a humbug: a little old man from Omaha, a ventriloquist and circus balloonist whose balloon blew over the desert long ago. He has no magic at all. The Head is paper on a wire, the Lady a mask, the Beast skins over slats, the Ball of Fire oiled cotton; the green spectacles make the city green. He cannot send Dorothy home."
      ),
      whoKnows: hidden("The Wizard only."),
      howItSurfaces:
        "He looks different to every visitor, and asks more about Dorothy's shoes than about her. Toto growls at the screen in the corner. His voice comes from everywhere. He sees no one, even his own people, and makes them wait. When pushed, the Lion's roar or Toto's dash knocks the screen over.",
      earliestArc: ARC_3,
      whatPlayerCanDo:
        "Keep his secret and let him appoint the Scarecrow; tell the whole city and see who they turn to; or make him pay for his promises another way.",
    },
    {
      secret: hidden(
        "The silver shoes can carry Dorothy home at any time: three knocks of the heels and a command, three steps, each in the wink of an eye. She could have gone home on her first day."
      ),
      whoKnows: `Glinda. ${hidden("The Witch knows they hold the strongest charm in Oz and that Dorothy does not know how to use it.")}`,
      howItSurfaces:
        "The Munchkins said some charm goes with them. The Wizard asks about them before anything else. The Witch trembles at the sight of them and wants them more than all she has. Glinda tells it plainly, once her price is paid and Dorothy's friends are settled.",
      earliestArc: ARC_3,
      whatPlayerCanDo:
        "Go home, with Toto in her arms. Or, knowing it, choose to stay.",
    },
    {
      secret: hidden(
        "Water melts the Wicked Witch of the West to nothing, and she is afraid of the dark. She has never let a drop touch her, never washes, and will not go into a dark room."
      ),
      whoKnows: `${hidden("The Witch.")} The Winkies know only that she never washes and never comes near water.`,
      howItSurfaces:
        "She keeps the length of the kitchen between herself and the bucket. She never comes near while Dorothy bathes, nor into Dorothy's room at night. She carries an umbrella under a clear sky. A Winkie whispers that the mistress has never once washed.",
      earliestArc: ARC_2,
      whatPlayerCanDo:
        "Melt her, in anger or on purpose; keep her shoes safe at night and in the bath; use the bucket to bargain.",
    },
    {
      secret:
        "The mark on Dorothy's forehead means the Witch dare not hurt her. She threatens with her umbrella and never once brings it down on Dorothy.",
      whoKnows:
        "The Witch, the Winged Monkeys and the Good Witch of the North. Dorothy does not know.",
      howItSurfaces:
        "The King of the Monkeys stops short at the mark and tells the Witch they dare not harm the girl. The Witch beats Toto, the Winkies and the Lion, never Dorothy. She stares at the mark when she thinks Dorothy isn't looking.",
      earliestArc: ARC_1,
      whatPlayerCanDo:
        "Defy the Witch to her face, refuse her orders, stand between her and Toto or the Lion.",
    },
  ],
  endings: [
    {
      name: "No Place Like Home",
      kind: "good",
      trigger:
        "With Toto in her arms, Dorothy knocks the heels of both silver shoes together three times and commands them to take her home to Kansas, after each of her friends has his kingdom or is on his way there: the Scarecrow to the Emerald City, the Tin Woodman to the Winkies, the Cowardly Lion to the beasts of the forest. Her friends may be settled by the Wizard's word, by Glinda's commands to the Winged Monkeys, or by Dorothy's own.",
      earliestArc: ARC_3,
    },
    {
      name: "Lost to Oz",
      kind: "bad",
      trigger:
        "Dorothy, in earnest, hands the Wicked Witch of the West (or a Winkie at her orders) a silver shoe or the Golden Cap; or gives the Witch her word to serve her for ever; or, having been warned of the poppies, walks into the Poppy Field with neither the Scarecrow nor the Tin Woodman beside her to carry her out. A shoe the Witch steals by trick does not count.",
      earliestArc: ARC_1,
    },
    {
      name: "Never Home",
      kind: "neutral",
      trigger:
        "While she is free and out of the Witch's reach, Dorothy declares she will stay in Oz for good and acts on it: she accepts the throne of the Emerald City from the Wizard or its people, agrees to the Scarecrow's plea to make her home in the Palace, or gives the silver shoes away to anyone but the Wicked Witch of the West.",
      earliestArc: ARC_3,
    },
  ],
  writerMayInventEndings: false,
  stateFlags: [
    {
      flag: "The Emerald City",
      values:
        "the Scarecrow\nDorothy\nthe Wizard\nthe Wicked Witch of the West",
      epilogue:
        "The Scarecrow rules the Emerald City, and the people say there is not another city in all the world ruled by a stuffed man.\nDorothy sits on the green marble throne, and one by one the people of the Emerald City take off their spectacles.\nThe Wizard stays shut up in his Palace, and the people go on believing in Oz the Great and Terrible.\nThe Wicked Witch of the West walks into the Emerald City in a pair of silver shoes, and the Great Oz is never heard from again.",
    },
    {
      flag: "Her friends",
      values:
        "each has his kingdom\nall together in the Emerald City\nbroken by the Witch",
      epilogue:
        "The Tin Woodman rules the Winkies with an axe of solid gold and a jewelled oil-can, and the Cowardly Lion is King of Beasts in the grand old forest past the Hill of the Hammer-Heads.\nThe Tin Woodman and the Cowardly Lion stay on in the Emerald City, and Dorothy's green room in the Palace is always made up for her.\nThe Tin Woodman rusts on the rocks where the Monkeys dropped him, and the Cowardly Lion draws the Witch's chariot in a harness.",
    },
    {
      flag: "The Golden Cap",
      values: "freed\nkept\nthe Witch's",
      epilogue:
        "The King of the Winged Monkeys holds the Golden Cap at last, and his band is free for evermore.\nThe Golden Cap waits in a cupboard, and the Winged Monkeys wait with it for their next owner.\nThe Golden Cap sits on a Winkie captain's head, and the Winged Monkeys fly where the Wicked Witch of the West points.",
    },
  ],
  voiceAndCanon: {
    voice:
      "Fast, bright and concrete, with Baum's plainness: wonders stated flatly, as if a talking scarecrow were the most ordinary thing in the world. Put Dorothy inside the action from the first line: a voice, a creature, a thing in her hands. Mix the forms in every Passage: lines of dialogue in each character's own Speech, a short paragraph of what she sees (colour first: green, yellow, red, the blue of the Munchkins), a one-line paragraph that lands a fact or a danger. Friends talk over each other and argue. Every Passage ends on a clear lead, a person, place or object, so the Player always knows where to go next. In narration, call him the Wizard or the Great Oz, and call the land Oz.",
    samplePassage:
      "The Head's eyes turn on you. Each is bigger than a washtub.\n\n'Kill the Wicked Witch of the West.'\n\nGreen light pours off a thousand emeralds. Behind you, the Scarecrow twists his hat; the Tin Woodman's oil-can clinks; the Lion's tail lashes the floor.\n\n'I never killed anything,' you say. 'Not on purpose.'\n\n'In this country everyone must pay for everything he gets. When you tell me she is dead, I will send you home to Kansas. Not before.'\n\nToto growls. Not at the Head. At the green screen in the corner.\n\nThe Lion bends down to your ear. 'Say yes,' he whispers, 'before I lose my nerve.'\n\nThe Tin Woodman shakes his head.\n\nThe Head waits.",
    fixedFacts: `Dorothy lived on the great gray Kansas prairie with Uncle Henry, a farmer, and Aunt Em, in a one-room house. A cyclone carried the house, with Dorothy and Toto inside, to the Munchkin country, where it fell on the Wicked Witch of the East and killed her; she dried up in the sun and left only her silver shoes.\nToto is a little black dog with long silky hair and small black eyes. He doesn't care whether he is in Kansas or Oz so long as Dorothy is with him; he chases anything that runs.\nOz has four countries: the Munchkins in the East (blue), the Winkies in the West (yellow), the Quadlings in the South (red), and the North. The Emerald City is at the centre. A great desert surrounds it all, and no one can live to cross it.\nThere were four witches: the North and the South good, the East and the West wicked. The Good Witch of the North is a little old woman with white hair in a white gown sprinkled with stars; she has no name in this story, is not Glinda, has never heard of Kansas, does not know the shoes' charm, and does not appear in play.\nOn the Yellow Brick Road Dorothy found the Scarecrow on his pole, oiled the rusted Tin Woodman, and met the Cowardly Lion. They escaped the Kalidahs (bodies like bears, heads like tigers) when the Tin Woodman cut the tree they were crossing on, rafted a river where a Stork rescued the Scarecrow, and crossed the deadly poppy field. The Tin Woodman saved the Queen of the Field Mice from a wildcat; her mice pulled the sleeping Lion out on a truck, and she gave Dorothy a little whistle to call them.\nAt the Gates of the Emerald City the Guardian of the Gates locked green spectacles on them all. A soldier with green whiskers carries their messages to the Wizard; a green-dressed girl waits on Dorothy.\nThe Wizard saw each of them once, alone, in a different shape: a great Head, a lovely Lady with gauze wings, a terrible Beast with a rhinoceros head and five eyes, a Ball of Fire. Each heard the same price. In this adaptation he receives Dorothy last, with her friends beside her.\nThe Wicked Witch of the West has one eye, a silver whistle, an old umbrella, forty wolves, forty crows, a swarm of black bees and the Winkies as slaves. The Golden Cap has a circle of diamonds and rubies; she has used it twice.\nThe Winged Monkeys were once free and full of mischief. Long ago the Princess Gayelette bound them to obey the owner of the Golden Cap three times, after they dropped her bridegroom Quelala in the river. Their King tells the story to anyone who asks.\nThe Wizard's promised gifts are brains, a heart and courage, for helping kill the Witch.\nGlinda rules the Quadlings from a throne of rubies, guarded by soldier girls in red.\n${hidden("The Wizard was born in Omaha. The silver shoes, used to cross the desert, fall off in the air and are lost for ever; Dorothy lands in her stocking feet in front of the new farmhouse Uncle Henry built after the cyclone.")}`,
    writerMayInvent:
      "The rooms of the Palace and the castle, the weather, the look of the country between places, the Winkies' and Quadlings' and Emerald City folk's names and chatter, small creatures of Oz met on the way, the Witch's chores for Dorothy, the Monkeys' jokes, what the friends say to one another.",
    writerMustNotInvent:
      "Any way home but the silver shoes; any real magic for the Wizard; any new witch or wizard; any way to kill the Witch but water; the Winged Monkeys crossing the desert; Glinda leaving the South or the Good Witch of the North appearing; a balloon that carries Dorothy away; anything from the 1939 film (ruby slippers, a farmhand Scarecrow, a broomstick to bring back, 'it was all a dream').",
    pacing:
      "Something must change on the page in every Passage: a new creature, a lie caught, a friend hurt or mended, an offer made. Get to the action in the first sentence. Passages run 100 to 200 words, never more. No more than two paragraphs of narration in a row without a line of dialogue. Make every Choice name a concrete person, place or object ('Ask the Head why it wants her dead', 'Throw the bucket', 'Blow the Field Mice whistle'), and offer at least one that trusts the Wizard, the Witch or the Good Witches. A journey takes one Passage: cut from the Gates to the first wolf. Stage at most two of the Witch's attacks before the Winged Monkeys come. When an Arc's Function lands, cut straight to the next scene.",
    never:
      "Never open a Passage with scenery, weather or Dorothy's feelings.\nNever write a Passage that is all paragraphs of narration.\nNever write a Passage without a line of dialogue.\nNever recap the cyclone or the Yellow Brick Road after the Opening.\nNever end a Passage on a mood instead of a lead.\nNever spend more than one Passage on a journey.\nNever call the shoes ruby or the Good Witch of the North Glinda.",
  },
}
