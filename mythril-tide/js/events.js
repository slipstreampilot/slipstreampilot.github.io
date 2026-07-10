// MYTHRIL TIDE - events.js : all encounter text & outcomes
'use strict';
// fx: shards,hull,runeshot,crew,loseCrew,weapon,aug,fight:{race,tier,elite,hazard},front,heal,mana,sysUp
// req: {race,sys,aug,shards(cost),runeshot(cost)}

const EVENTS = {};

EVENTS.generic = [
  {
    id: 'driftwood', title: 'WRECKAGE AFLOAT', vig: 'wreck',
    text: 'Splintered crates bob in your wake. Someone had a worse day than you.',
    choices: [
      { label: 'Haul the crates aboard', results: [
        [3, { text: 'Trade goods! You pry them open and count your luck.', shards: 18 }],
        [1, { text: 'Mostly seawater and a very angry crab. Still, a few shards glint at the bottom.', shards: 6 }],
      ]},
      { label: 'Sail on', results: [[1, { text: 'No time for scavenging. The New World won\'t find itself.' }]] },
    ],
  },
  {
    id: 'merchant', title: 'WANDERING TRADER', vig: 'shop',
    text: 'A fat little cog flying friendly colors hails you. "Runeshot! Fresh runeshot! Practically legal!"',
    choices: [
      { label: 'Buy runeshot (15 shards)', req: { shards: 15 }, results: [[1, { text: 'He bites each shard before pocketing it. You get three gleaming runeshot.', runeshot: 3 }]] },
      { label: 'Trade sea stories', results: [
        [2, { text: 'Your tale of the Armada earns a sympathetic whistle and a free runeshot.', runeshot: 1 }],
        [1, { text: 'His stories are longer than yours. You escape with your patience barely intact.' }],
      ]},
      { label: 'Decline politely', results: [[1, { text: 'He sails off, hawking his wares at a passing whale.' }]] },
    ],
  },
  {
    id: 'castaway', title: 'CASTAWAY', vig: 'island',
    text: 'A ragged figure waves from a sandbar, jumping like the sand is hot. It probably is.',
    choices: [
      { label: 'Pick them up', results: [
        [3, { text: 'A grateful sailor joins your crew, swearing eternal loyalty and moderate competence.', crew: 'random' }],
        [1, { text: 'It\'s a trap! Pirates pour from behind the dunes and their sloop rounds the point!', fight: { race: 'pirate', tier: 0 } }],
      ]},
      { label: 'Toss them supplies and wave', results: [[1, { text: 'They salute you with a fish. Karma noted.', shards: 4 }]] },
    ],
  },
  {
    id: 'bottle', title: 'MESSAGE IN A BOTTLE', vig: 'calm',
    text: 'A green bottle clinks against the hull. Inside: a chart fragment and an IOU.',
    choices: [
      { label: 'Study the fragment', results: [
        [2, { text: 'It marks a smuggler\'s cache nearby. You liberate it on principle.', shards: 14 }],
        [1, { text: 'It\'s a child\'s drawing of a kraken. Adorable. Worthless.' }],
      ]},
    ],
  },
  {
    id: 'turtles', title: 'TURTLE CONVOY', vig: 'calm',
    text: 'A procession of giant sea turtles crosses your bow, unbothered by your schedule.',
    choices: [
      { label: 'Follow them through the shallows', results: [[1, { text: 'They know every safe channel. Your hull thanks them.', hull: 3 }]] },
      { label: 'Push through', results: [
        [2, { text: 'You weave between shells, earning several slow, judgmental stares.' }],
        [1, { text: 'You clip a reef the turtles were politely avoiding.', hull: -2 }],
      ]},
    ],
  },
  {
    id: 'ghostship', title: 'A SILENT SHIP', vig: 'fog',
    text: 'A ship drifts ahead, sails slack, deck empty. Your crew goes very quiet.',
    choices: [
      { label: 'Board her', results: [
        [2, { text: 'Empty. Whatever happened took the crew and left the valuables.', shards: 22, runeshot: 1 }],
        [2, { text: 'The lanterns flare blue. The crew you couldn\'t see has noticed you.', fight: { race: 'ghost', tier: 1 } }],
      ]},
      { label: 'Give her a wide berth', results: [[1, { text: 'Some prizes aren\'t worth the nightmares. The crew approves unanimously.' }]] },
    ],
  },
  {
    id: 'minefield', title: 'POWDER KEGS ADRIFT', vig: 'wreck',
    text: 'Floating kegs stamped with naval markings. Either salvage or a very slow ambush.',
    choices: [
      { label: 'Fish them out carefully', results: [
        [2, { text: 'Mostly intact! The powder converts nicely to runeshot.', runeshot: 2, shards: 6 }],
        [1, { text: 'One keg was rigged. The bang takes paint and pride off your hull.', hull: -3 }],
      ]},
      { label: 'Shoot them from a distance', results: [[1, { text: 'A series of satisfying booms. Zero profit, excellent morale.' }]] },
    ],
  },
  {
    id: 'albatross', title: 'THE WHITE ALBATROSS', vig: 'calm',
    text: 'An albatross circles the mainmast three times, then settles on the yard like it pays rent.',
    choices: [
      { label: 'Take it as a good omen', results: [[1, { text: 'The winds favor you all day. Small repairs almost make themselves.', hull: 2 }]] },
      { label: 'Shoo it off', results: [[1, { text: 'It leaves. Somewhere, an old sailor winces.' }]] },
    ],
  },
  {
    id: 'whalesong', title: 'DEEP SONG', vig: 'calm',
    text: 'Something enormous sings beneath the keel. The notes rattle the cutlery.',
    choices: [
      { label: 'Sing back (loudly, badly)', results: [
        [2, { text: 'The whale surfaces, regards you like a confused uncle, and gifts you a barnacle-crusted chest off its back.', shards: 12 }],
        [1, { text: 'The singing stops. You may have insulted someone\'s grandmother in Whale.' }],
      ]},
      { label: 'Listen quietly', results: [[1, { text: 'The song fades. The crew works gently for the rest of the day.', heal: 15 }]] },
    ],
  },
  {
    id: 'floatmarket', title: 'RAFT BAZAAR', vig: 'shop',
    text: 'A dozen rafts lashed together into a floating market. The vendors row alongside, shouting prices.',
    choices: [
      { label: 'Buy hull patches (12 shards)', req: { shards: 12 }, results: [[1, { text: 'Tar, planks, and a dwarf-made sealant that smells illegal. Good as new-ish.', hull: 5 }]] },
      { label: 'Browse without buying', results: [
        [2, { text: 'You haggle for sport and somehow come out ahead.', shards: 5 }],
        [1, { text: 'A vendor\'s monkey steals your hat. The market drifts away, cackling.' }],
      ]},
    ],
  },
];

EVENTS.regional = {
  pirate: [
    {
      id: 'toll', title: 'THE TOLL', vig: 'armada',
      text: 'A pirate brig swings broadside. "Passage tax! Twenty shards or twenty cannonballs, your pick."',
      choices: [
        { label: 'Pay 20 shards', req: { shards: 20 }, results: [[1, { text: 'They salute mockingly and let you pass. Businesslike, for thieves.' }]] },
        { label: 'Pick the cannonballs', results: [[1, { text: 'Wrong answer, apparently.', fight: { race: 'pirate', tier: 1 } }]] },
      ],
    },
    {
      id: 'smuggler', title: 'SMUGGLER\'S COVE', vig: 'island',
      text: 'Lanterns blink a code from a hidden cove. Contraband, cheap and questionable.',
      choices: [
        { label: 'Buy runeshot (10 shards)', req: { shards: 10 }, results: [[1, { text: 'No questions asked, which is exactly the problem and exactly the appeal.', runeshot: 2 }]] },
        { label: 'Inform on them later', results: [[1, { text: 'You memorize the cove\'s location. The Armada pays for tips... but they also get closer.', shards: 15, front: 0.4 }]] },
        { label: 'Sail past', results: [[1, { text: 'The lanterns blink something rude as you go.' }]] },
      ],
    },
    {
      id: 'navywreck', title: 'ARMADA WRECK', vig: 'wreck',
      text: 'An Imperial patrol ship lies broken on the rocks. Recent. Smoldering, even.',
      choices: [
        { label: 'Salvage her arsenal', results: [
          [2, { text: 'You strip a serviceable cannon from the wreck before the tide claims her.', weapon: 'random:human' }],
          [1, { text: 'Salvage parties report only soggy paperwork. So much paperwork.', shards: 8 }],
        ]},
        { label: 'Whoever did this might still be near. Leave.', results: [[1, { text: 'Prudence. The smoke column shrinks behind you.' }]] },
      ],
    },
    {
      id: 'tavern', title: 'LAST PORT TAVERN', vig: 'port',
      text: 'The final friendly port before open ocean. The tavern is loud, the rum is flammable.',
      choices: [
        { label: 'Hire a sailor (25 shards)', req: { shards: 25 }, results: [[1, { text: 'A weathered hand signs on, asking only "which way is away from the Armada?"', crew: 'human' }]] },
        { label: 'Buy a round for rumors', req: { shards: 5 }, results: [[1, { text: 'Three rumors, two fistfights, and a drunk gunner who marks a powder cache on your chart.', runeshot: 4 }]] },
        { label: 'Stock up and go', results: [[1, { text: 'No distractions. The horizon calls.', hull: 2 }]] },
      ],
    },
  ],
  merfolk: [
    {
      id: 'singingreef', title: 'THE SINGING REEF', vig: 'reef',
      text: 'Coral towers hum in the current. The safe channel through is a riddle of color.',
      choices: [
        { label: 'Have your merfolk guide you', req: { race: 'merfolk' }, results: [[1, { text: 'Your merfolk reads the reef like a street map, and points out a pearl bed on the way.', shards: 20 }]] },
        { label: 'Navigate by eye', results: [
          [1, { text: 'Threading the needle! The crew cheers your steady hand.', shards: 8 }],
          [1, { text: 'The reef sings. Your hull screams.', hull: -3 }],
        ]},
      ],
    },
    {
      id: 'netted', title: 'CAUGHT IN THE NETS', vig: 'mermaid',
      text: 'A merfolk youth is tangled in a drift net, thrashing and embarrassed about it.',
      choices: [
        { label: 'Cut them free', results: [[2, { text: 'They surface an hour later with a rescue gift, then ask to sail with you. The sea approves.', crew: 'merfolk', shards: 8 }],
          [1, { text: 'Freed, they vanish with a flick of the tail. Gratitude, merfolk-style.', shards: 12 }]] },
        { label: 'Leave it be', results: [[1, { text: 'The nets aren\'t yours, you reason. The reasoning feels thin all day.' }]] },
      ],
    },
    {
      id: 'tidetemple', title: 'TEMPLE OF THE TIDE', vig: 'ruins',
      text: 'A drowned temple rises at low tide. Merfolk priests trade blessings for shiny things.',
      choices: [
        { label: 'Offer 25 shards', req: { shards: 25 }, results: [
          [2, { text: 'The priests sing your ward-crystals brighter. The hull never felt so loved.', aug: 'tidecaller_pearl' }],
          [1, { text: 'The blessing mostly involves being splashed. Refreshing. The hull does look better.', hull: 5 }],
        ]},
        { label: 'Just observe', results: [[1, { text: 'The ceremony is beautiful. A passing priest fixes a leak out of professional pride.', hull: 2 }]] },
      ],
    },
    {
      id: 'pearldivers', title: 'PEARL DIVERS', vig: 'reef',
      text: 'Merfolk divers offer a wager: match their depth or pay for the show.',
      choices: [
        { label: 'Send your merfolk down', req: { race: 'merfolk' }, results: [[1, { text: 'A photo finish - the prize pearls are split, with honors.', shards: 18 }]] },
        { label: 'Bet on them (10 shards)', req: { shards: 10 }, results: [
          [1, { text: 'They surface with pearls and your winnings.', shards: 25 }],
          [1, { text: 'A barracuda interrupts the contest. All bets are off and gone.' }],
        ]},
        { label: 'Applaud from the rail', results: [[1, { text: 'Free entertainment. The little one waves.' }]] },
      ],
    },
  ],
  lizard: [
    {
      id: 'feast', title: 'TOTEM FEAST', vig: 'jungle',
      text: 'Drums roll across the lagoon. Lizardfolk wave you ashore to a feast around a golden idol.',
      choices: [
        { label: 'Join the feast', results: [
          [2, { text: 'You eat things you cannot name and gain a scaly shipmate who admires your appetite.', crew: 'lizard' }],
          [1, { text: 'You over-toast. The chief keeps your hat as tribute, fondly.', heal: 20 }],
        ]},
        { label: 'Eye the golden idol', results: [[1, { text: 'You grab it and run. The drums change tempo dramatically.', shards: 30, fight: { race: 'lizard', tier: 1 } }]] },
        { label: 'Decline from the boat', results: [[1, { text: 'They shrug, a full-body event for lizardfolk, and feast without you.' }]] },
      ],
    },
    {
      id: 'hatchlings', title: 'HATCHLING BEACH', vig: 'jungle',
      text: 'Hundreds of eggs hatch as gulls circle. Lizardfolk wardens are badly outnumbered.',
      choices: [
        { label: 'Send the crew gull-chasing', results: [[1, { text: 'Your crew waves oars at seabirds for an hour. The wardens\' gratitude is heavy and gold.', shards: 16 }]] },
        { label: 'Fire a cannon to scatter them', results: [
          [2, { text: 'BOOM. Gulls flee. Hatchlings cheer (probably). Wardens salute.', shards: 10 }],
          [1, { text: 'The echo starts a small landslide. The wardens politely suggest you leave.' }],
        ]},
      ],
    },
    {
      id: 'tribute', title: 'RAIDERS\' DUE', vig: 'jungle',
      text: 'War canoes flank a serpent-prowed raider. "The strait belongs to the Scaled. Tribute, or teeth."',
      choices: [
        { label: 'Pay 15 shards', req: { shards: 15 }, results: [[1, { text: 'They take the shards and escort you through, drumming something almost friendly.' }]] },
        { label: 'Show your lizardfolk crew', req: { race: 'lizard' }, results: [[1, { text: 'Your shipmate barks a clan-greeting. Tribute is waived for family. There is also a gift basket.', shards: 10 }]] },
        { label: 'Teeth, then', results: [[1, { text: 'They seem genuinely pleased by your choice.', fight: { race: 'lizard', tier: 1 } }]] },
      ],
    },
    {
      id: 'swampherb', title: 'MIRELIGHT HERBS', vig: 'jungle',
      text: 'A lizardfolk herbalist sells glowing swamp remedies "good for what bites you."',
      choices: [
        { label: 'Buy the green one (10 shards)', req: { shards: 10 }, results: [[1, { text: 'Tastes like regret, works like magic. The crew feels reborn.', heal: 60 }]] },
        { label: 'Buy the bubbling one (8 shards)', req: { shards: 8 }, results: [
          [2, { text: 'Hull sealant! Astonishing. The herbalist looks as surprised as you.', hull: 4 }],
          [1, { text: 'It eats a small hole in the deck. "Ah," says the herbalist. "The OTHER bubbling one."', hull: -1 }],
        ]},
        { label: 'Pass', results: [[1, { text: 'The herbalist licks an eyeball in farewell.' }]] },
      ],
    },
  ],
  djinn: [
    {
      id: 'forgeisle', title: 'THE BURNING FORGE', vig: 'volcano',
      text: 'Djinn smiths work a volcano-vent forge. The heat reshapes the air. And prices.',
      choices: [
        { label: 'Commission a weapon (40 shards)', req: { shards: 40 }, results: [[1, { text: 'They quench it in lava and hand it over still warm.', weapon: 'random:djinn' }]] },
        { label: 'Buy hearthstone charge (30 shards)', req: { shards: 30 }, results: [[1, { text: 'Your mana hearthstone drinks the forge-fire and hums a tone higher.', mana: 1 }]] },
        { label: 'Just warm your hands', results: [[1, { text: 'You leave lightly singed and oddly cheerful.' }]] },
      ],
    },
    {
      id: 'lavafisher', title: 'THE LAVA FISHER', vig: 'volcano',
      text: 'A djinn dangles a line into a lava flow. The "fish" are fighting back, and winning.',
      choices: [
        { label: 'Haul them out', results: [
          [2, { text: 'Soaked in steam, the djinn laughs and signs onto your crew "for drier adventures."', crew: 'djinn' }],
          [1, { text: 'They wave you off and land the magma-eel solo. Respect. And a thank-you gift.', shards: 14 }],
        ]},
        { label: 'Watch the show', results: [[1, { text: 'The eel wins. The djinn takes it well.' }]] },
      ],
    },
    {
      id: 'fireritual', title: 'NIGHT OF EMBERS', vig: 'volcano',
      text: 'The Cinder Isles celebrate. Sky-fire blooms over the water. Outsiders watch from anchor.',
      choices: [
        { label: 'Let your djinn lead you in', req: { race: 'djinn' }, results: [[1, { text: 'As kin of your djinn, you feast as honored guests. The parting gift smokes gently.', weapon: 'random:djinn' }]] },
        { label: 'Anchor and enjoy the show', results: [[1, { text: 'Best fireworks of your life, and free.', heal: 10 }]] },
      ],
    },
    {
      id: 'ashstorm', title: 'ASH STORM', vig: 'storm',
      text: 'A wall of volcanic ash rolls toward you, full of glinting debris from a wrecked djinn convoy.',
      choices: [
        { label: 'Salvage inside the storm', results: [
          [2, { text: 'Coughing pays: you drag out a sealed strongbox.', shards: 26 }],
          [1, { text: 'The ash hides cinders that pit your hull and tempers.', hull: -3, shards: 8 }],
        ]},
        { label: 'Outrun it', results: [[1, { text: 'You ride the storm-front winds clear. Exhilarating, free, fast.' }]] },
      ],
    },
  ],
  stormelf: [
    {
      id: 'skyharp', title: 'THE SKY HARP', vig: 'storm',
      text: 'A cliff-top harp of mast-sized strings hums with the gale. A plaque invites: PLAY ME.',
      choices: [
        { label: 'Play it', results: [
          [2, { text: 'Your chord summons a delighted elf luthier, who tunes your rigging while humming it.', sysUp: 'sails' }],
          [1, { text: 'You play what can only be described as a weather complaint. The sky files a response.', hull: -2 }],
        ]},
        { label: 'Do not touch the giant harp', results: [[1, { text: 'A small elf child plays it instead, perfectly. Shown up, you sail on.' }]] },
      ],
    },
    {
      id: 'windrace', title: 'THE WIND RACE', vig: 'storm',
      text: 'Storm elf skiffs circle, grinning. "Race you to the standing stone! Wager\'s ten shards!"',
      choices: [
        { label: 'Race (10 shards)', req: { shards: 10 }, results: [
          [1, { text: 'You catch a perfect gust and win! They pay double, delighted to lose.', shards: 30 }],
          [1, { text: 'They lap you. Twice. The winnings sting less than the waving.', shards: 0 }],
        ]},
        { label: 'Let your storm elf helm it', req: { race: 'stormelf' }, results: [[1, { text: 'Your elf flies the ship like a kite. The skiffs concede mid-race and tip generously.', shards: 28 }]] },
        { label: 'Decline', results: [[1, { text: '"Suit yourself, slowboat!" They spiral away into the clouds.' }]] },
      ],
    },
    {
      id: 'elfpatrol', title: 'GALE WARDENS', vig: 'storm',
      text: 'An elf patrol corvette matches your speed effortlessly. "Inspection! Mind the static."',
      choices: [
        { label: 'Permit the inspection', results: [
          [2, { text: 'They find your paperwork "adorable" and gift you a spark-charm for the trouble.', runeshot: 1 }],
          [1, { text: 'They confiscate "irregular munitions" with infuriating politeness.', runeshot: -1 }],
        ]},
        { label: 'Run for it', results: [
          [1, { text: 'You actually lose them in a squall! The crew tells this story forever.', shards: 10 }],
          [2, { text: 'Outrunning storm elves. Bold. They board you mid-eye-roll.', fight: { race: 'stormelf', tier: 1 } }],
        ]},
      ],
    },
    {
      id: 'lightningfarm', title: 'LIGHTNING FARM', vig: 'storm',
      text: 'Elves harvest bottled lightning from a chained stormcloud. Surplus stock is going cheap.',
      choices: [
        { label: 'Charge the mana hearthstone (25 shards)', req: { shards: 25 }, results: [[1, { text: 'Your hearthstone gulps a whole bottle and gains a permanent flicker.', mana: 1 }]] },
        { label: 'Buy bottled bolts (12 shards)', req: { shards: 12 }, results: [[1, { text: 'Two bottles, padded heavily, labeled DO NOT.', runeshot: 2 }]] },
        { label: 'Keep clear', results: [[1, { text: 'The cloud growls at you on the way out. Rude.' }]] },
      ],
    },
  ],
  dwarf: [
    {
      id: 'tollgate', title: 'THE IRON TOLL', vig: 'ruins',
      text: 'A sea-fortress chain blocks the strait. Dwarves lean over the parapet. "Twenty-five shards. The chain is non-negotiable. The chain has never negotiated."',
      choices: [
        { label: 'Pay 25 shards', req: { shards: 25 }, results: [[1, { text: 'The chain drops with bureaucratic precision. A receipt is fired over by crossbow.' }]] },
        { label: 'Argue with the chain', results: [[1, { text: 'The dwarves take this personally on the chain\'s behalf.', fight: { race: 'dwarf', tier: 1, elite: true } }]] },
        { label: 'Talk shop with your dwarf', req: { race: 'dwarf' }, results: [[1, { text: 'Your dwarf knows the toll-sergeant\'s cousin. Fee waived, ale shared, hull patched.', hull: 3 }]] },
      ],
    },
    {
      id: 'sunkenvault', title: 'THE SUNKEN VAULT', vig: 'ruins',
      text: 'A drowned dwarven vault door gleams below, still sealed. Still smug about it.',
      choices: [
        { label: 'Send your merfolk down', req: { race: 'merfolk' }, results: [[1, { text: 'Twenty minutes of underwater lock-picking later: the vault yields gloriously.', shards: 40, runeshot: 1 }]] },
        { label: 'Dive with rope and prayer', results: [
          [1, { text: 'You crack it on the third desperate dive. Worth every lungful.', shards: 30 }],
          [1, { text: 'The lock defeats you. The vault somehow looks smugger.', hull: -1 }],
        ]},
        { label: 'Leave it sealed', results: [[1, { text: 'Some doors stay shut. The crew adds it to the "someday" list.' }]] },
      ],
    },
    {
      id: 'drydock', title: 'DEEP DOCK', vig: 'port',
      text: 'A dwarven repair dock cut into the cliff face. The foreman squints at your hull and tuts professionally.',
      choices: [
        { label: 'Full repairs (2 shards per hull)', results: [[1, { text: 'REPAIR_DOCK', special: 'repair2' }]] },
        { label: 'Buy reinforced plating (50 shards)', req: { shards: 50 }, results: [[1, { text: 'They rivet mythril-laced plates to your hull, grumbling about amateurs the whole time.', aug: 'mythril_plating' }]] },
        { label: 'Just passing through', results: [[1, { text: 'The foreman tuts louder as you leave unrepaired.' }]] },
      ],
    },
    {
      id: 'runemarket', title: 'RUNE MARKET', vig: 'port',
      text: 'Deep dwarves trade engraved munitions under a thousand lanterns. Everything smells of oil and ambition.',
      choices: [
        { label: 'Stock runeshot (18 shards)', req: { shards: 18 }, results: [[1, { text: 'Four runeshot, individually wrapped, with care instructions.', runeshot: 4 }]] },
        { label: 'Admire a bombard (75 shards)', req: { shards: 75 }, results: [[1, { text: '"A discerning eye," nods the smith, loading it aboard personally.', weapon: 'runebombard' }]] },
        { label: 'Window shop', results: [[1, { text: 'You memorize three things you cannot afford. Motivation acquired.' }]] },
      ],
    },
  ],
  siren: [
    {
      id: 'thesong', title: 'THE SONG', vig: 'fog',
      text: 'It starts as one voice, then a choir, threading through the fog. Beautiful. Hungry.',
      choices: [
        { label: 'Let your siren answer it', req: { race: 'siren' }, results: [[1, { text: 'Your siren sings back the old counter-melody. The choir laughs, charmed, and tosses gifts aboard.', shards: 24 }]] },
        { label: 'Wax in ears, sail through', results: [[1, { text: 'You read each other\'s exaggerated lips for an hour and survive unsung.' }]] },
        { label: 'Listen, just a little', results: [
          [1, { text: 'One singer takes a shine to your honest face and asks to join your strange, deaf little crew.', crew: 'siren' }],
          [1, { text: 'You wake lashed to the wheel, the ship circling, a sailor missing.', loseCrew: true }],
        ]},
      ],
    },
    {
      id: 'shipgrave', title: 'GRAVEYARD OF SHIPS', vig: 'wreck',
      text: 'Hulks of every nation rot in the fog, drawn here over centuries of song.',
      choices: [
        { label: 'Salvage the nearest wreck', results: [
          [2, { text: 'A captain\'s strongbox, barnacled but unbroken.', shards: 28 }],
          [1, { text: 'The wreck\'s last residents resent the intrusion.', fight: { race: 'ghost', tier: 2 } }],
        ]},
        { label: 'Pay respects and pass', results: [[1, { text: 'The fog parts gently for you. The crew whispers thanks to no one visible.' }]] },
      ],
    },
    {
      id: 'lovers', title: 'THE WIDOW\'S ROCK', vig: 'fog',
      text: 'A lone siren sits on a rock, not singing. That somehow feels more dangerous.',
      choices: [
        { label: 'Ask what\'s wrong', results: [[1, { text: 'Her sailor never returned. You carry her letter to the next port. She gives you her lure - "I won\'t need it."', aug: 'siren_lure' }]] },
        { label: 'Sail past quietly', results: [[1, { text: 'She watches you go. The fog feels heavier for an hour.' }]] },
      ],
    },
    {
      id: 'mirrorfog', title: 'THE MIRROR FOG', vig: 'fog',
      text: 'Out of the fog glides... your own ship. Same patches, same flag, crewed by silhouettes.',
      choices: [
        { label: 'Hail yourself', results: [
          [1, { text: 'The mirror crew waves back in perfect unison, then dissolves. In the fog\'s wake: gifts. From you, to you.', shards: 18, runeshot: 1 }],
          [1, { text: 'Your reflection fires first. Typical you.', fight: { race: 'ghost', tier: 2 } }],
        ]},
        { label: 'Refuse to engage with this nonsense', results: [[1, { text: 'You sail through the illusion. The crew agrees to never discuss it.' }]] },
      ],
    },
  ],
  armada: [
    {
      id: 'blockade', title: 'THE LAST BLOCKADE', vig: 'armada',
      text: 'Armada pickets stretch across the meridian. Beyond them: a glow on the horizon that must be the New World.',
      choices: [
        { label: 'Veil and slip through', req: { sys: 'fogveil' }, results: [[1, { text: 'You drift through their line wrapped in conjured fog, close enough to hear them complain about rations.', shards: 10 }]] },
        { label: 'Punch through', results: [[1, { text: 'The picket ship signals frantically as you bear down.', fight: { race: 'armada', tier: 2, elite: true } }]] },
      ],
    },
    {
      id: 'pilgrim', title: 'PILGRIMS OF THE VEIN', vig: 'city',
      text: 'A battered pilgrim ship limps the same direction as you. "Mythril calls all kinds," their captain shrugs.',
      choices: [
        { label: 'Trade supplies', results: [[1, { text: 'Fair trades and fresh rumors of the Warden. Forewarned is forearmed.', runeshot: 1, hull: 2 }]] },
        { label: 'Race them to the horizon', results: [[1, { text: 'You win handily. Their cheers carry over the water anyway.', heal: 10 }]] },
      ],
    },
    {
      id: 'mythrilcurrent', title: 'THE SILVER CURRENT', vig: 'city',
      text: 'The water itself runs silver here, charged with mythril dust. Your hearthstone sings to it.',
      choices: [
        { label: 'Ride the current', results: [[1, { text: 'The ship surges forward, seams sealing, hearthstone blazing. The New World pulls you in.', hull: 3, mana: 1 }]] },
      ],
    },
  ],
};

EVENTS.distress = [
  {
    id: 'burning', title: 'SHIP AFIRE', vig: 'wreck',
    text: 'A merchantman burns to the waterline, crew clinging to the rails between flames.',
    choices: [
      { label: 'Send your djinn through the fire', req: { race: 'djinn' }, results: [[1, { text: 'Your djinn strolls through the blaze carrying sailors two at a time. The survivors\' gratitude is heavy.', shards: 25, crew: 'random' }]] },
      { label: 'Run rescue lines', results: [
        [2, { text: 'You pull most of them clear. One rescued sailor signs on; the rest reward you from the strongbox they saved.', shards: 15, crew: 'random' }],
        [1, { text: 'You save who you can. Embers scar your deck doing it.', hull: -2, shards: 10 }],
      ]},
      { label: 'Too dangerous. Stand off.', results: [[1, { text: 'The fire wins. The silence afterward is heavier than cargo.' }]] },
    ],
  },
  {
    id: 'sinking', title: 'GOING DOWN', vig: 'wreck',
    text: 'A holed sloop wallows, her pumps losing. Her captain bails with a hat.',
    choices: [
      { label: 'Merfolk hull-patch', req: { race: 'merfolk' }, results: [[1, { text: 'Your merfolk patches her below the waterline in minutes. Her captain pays in shares and tears.', shards: 22 }]] },
      { label: 'Take her crew aboard', results: [[1, { text: 'Her crew crowds your deck. At the next island they buy passage off - except one, who likes your ship better.', crew: 'random', shards: 8 }]] },
      { label: 'Sail on', results: [[1, { text: 'The hat keeps bailing as you go. You don\'t look back. Mostly.' }]] },
    ],
  },
  {
    id: 'plague', title: 'THE FEVER SHIP', vig: 'fog',
    text: 'A ship flying the yellow flag drifts crewed by coughing shadows. "Medicine," they croak. "Or just news."',
    choices: [
      { label: 'Treat them in your infirmary', req: { sys: 'infirmary' }, results: [[1, { text: 'A week of careful quarantine nursing. They recover and insist on emptying their hold for you.', shards: 30 }]] },
      { label: 'Float over supplies', results: [[1, { text: 'They thank you across the gap and pay generously by line and bucket.', shards: 12 }]] },
      { label: 'Keep your distance', results: [[1, { text: 'You shout the news they asked for across the water. It\'s something.' }]] },
    ],
  },
  {
    id: 'wizard', title: 'THE MAROONED SCHOLAR', vig: 'island',
    text: 'A robed figure on a tiny island has arranged rocks to spell THEY WERE WRONG. There is a smaller rock arrow pointing at the first rocks.',
    choices: [
      { label: 'Take them aboard', results: [
        [2, { text: 'A dismissed Imperial artificer! Grateful, they improve your ship with forbidden mathematics.', aug: 'random' }],
        [1, { text: 'They lecture for six hours about ley lines. Eventually they pay you to be dropped off.', shards: 14 }],
      ]},
      { label: 'Leave them to their rocks', results: [[1, { text: 'As you sail off they begin rearranging the rocks into something ruder.' }]] },
    ],
  },
  {
    id: 'krakenprey', title: 'TENTACLES OFF THE BOW', vig: 'kraken',
    text: 'A merchant ship thrashes in a young kraken\'s grip, her cannons popping uselessly.',
    choices: [
      { label: 'Attack the beast', results: [[1, { text: 'Your broadside convinces the kraken to find smaller prey - the grateful merchant pays in full.', shards: 26, hull: -1 }]] },
      { label: 'Create a distraction', results: [
        [1, { text: 'You bang pots, fire flares, and generally insult the kraken\'s mother. It works!', shards: 16 }],
        [1, { text: 'The kraken accepts your invitation instead.', fight: { race: 'pirate', tier: 1, hazard: 'kraken' } }],
      ]},
      { label: 'Not your fight', results: [[1, { text: 'The merchant\'s flag dips below the surface. The sea keeps its accounts.' }]] },
    ],
  },
  {
    id: 'adrift', title: 'THE OPEN BOAT', vig: 'calm',
    text: 'A ship\'s boat, oars shipped, one sunburnt survivor staring at the horizon.',
    choices: [
      { label: 'Bring them aboard', results: [
        [2, { text: '"Captain Voss," she rasps. "My ship\'s at the bottom. My grudge isn\'t." She\'s handy in a fight.', crew: 'random' }],
        [1, { text: 'They recover by evening and pay passage with a hidden money belt.', shards: 18 }],
      ]},
    ],
  },
];

EVENTS.empty = [
  { id: 'calm1', title: 'OPEN WATER', vig: 'calm', text: 'Nothing but horizon in every direction. The crew mends sail and tells lies about home.',
    choices: [{ label: 'Enjoy the quiet', results: [[1, { text: 'A rare gentle day. The crew\'s spirits mend along with the canvas.', heal: 20 }]] }] },
  { id: 'calm2', title: 'FLOTSAM', vig: 'calm', text: 'Scattered debris from some old battle. Picked over, but maybe not perfectly.',
    choices: [{ label: 'Sift through it', results: [[2, { text: 'A few shards missed by earlier scavengers.', shards: 6 }], [1, { text: 'Nothing but kelp and a boot. The boot fits no one.' }]] }] },
  { id: 'calm3', title: 'FAIR WINDS', vig: 'calm', text: 'A clean following wind. The ship practically sails herself.',
    choices: [{ label: 'Make good time', results: [[1, { text: 'The bosun uses the easy day to tighten every seam aboard.', hull: 2 }]] }] },
];

// pick an event; avoids repeats within a run via Game.run.seenEvents
EVENTS.pick = function (kind, regionIdx) {
  let pool;
  if (kind === 'event') {
    const race = DATA.REGIONS[regionIdx].race;
    const reg = EVENTS.regional[race] || [];
    pool = U.chance(0.55) && reg.length ? reg : EVENTS.generic;
  } else if (kind === 'distress') pool = EVENTS.distress;
  else pool = EVENTS.empty;
  const seen = Game.run.seenEvents || (Game.run.seenEvents = []);
  const fresh = pool.filter(e => !seen.includes(e.id));
  const ev = U.pick(fresh.length ? fresh : pool);
  seen.push(ev.id);
  return ev;
};
