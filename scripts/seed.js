/* eslint-disable no-console */
require('dotenv').config();
const dns = require('node:dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Video = require('../src/models/Video');

/**
 * Fill an empty Viora with a believable catalogue, and grant admin to one account.
 *
 *   node scripts/seed.js                        100 videos, keeps anything already there
 *   node scripts/seed.js --count=40             fewer
 *   node scripts/seed.js --admin=you@mail.com   also promote that account
 *   node scripts/seed.js --reset                delete existing videos first
 *
 * WHY A SCRIPT RATHER THAN THE API: uploading through POST /api/videos sends a real file
 * to Cloudinary. A hundred of those is slow, costs storage, and gives nothing a seed needs.
 * These rows point at open-licensed films that are already hosted, so the catalogue is
 * full in seconds and the player has something real to play.
 *
 * EVERY VIDEO FILE HERE IS FREELY LICENSED: Blender Foundation open movies (CC BY) and
 * the standard test clips from test-videos.co.uk. Nothing copyrighted is copied anywhere.
 */

// --- the media pool ----------------------------------------------------------
// Real files with their real lengths, so the duration on a card matches playback.
const MEDIA = [
  // Full-length Blender Foundation open movies (CC BY). `weight` is how often a file is
  // picked relative to the others: the short clips existed for quick autoplay testing, and
  // with equal weighting they took 60% of the catalogue, so two thirds of every grid read
  // "0:10". Real catalogues have varied lengths; weighting restores that.
  { key: 'bunnyFull', url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4', seconds: 596, weight: 4 },
  { key: 'dream', url: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4', seconds: 653, weight: 4 },
  { key: 'steel', url: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4', seconds: 734, weight: 4 },
  { key: 'sintel', url: 'https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4', seconds: 888, weight: 4 },
  // 10-second clips: still here, still useful for testing "Up next" autoplay without
  // waiting fifteen minutes — just no longer the majority.
  { key: 'bunny', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4', seconds: 10, weight: 1 },
  { key: 'sintelClip', url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4', seconds: 10, weight: 1 },
  { key: 'jellyfish', url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4', seconds: 10, weight: 1 },
];

// Expanded once, so picking is a plain index lookup rather than a running total each time.
const MEDIA_POOL = MEDIA.flatMap((m) => Array.from({ length: m.weight }, () => m));

// Deterministic placeholder images: the same seed always returns the same picture, so a
// re-seed does not reshuffle every thumbnail.
const thumbnail = (seed) => `https://picsum.photos/seed/${seed}/1280/720`;

// --- the channels ------------------------------------------------------------
const CHANNELS = [
  { name: 'Lagos Beats', email: 'lagosbeats@viora.app', categories: ['Music'] },
  { name: 'PixelPlay NG', email: 'pixelplay@viora.app', categories: ['Gaming'] },
  { name: 'Campus Notes', email: 'campusnotes@viora.app', categories: ['Education'] },
  { name: 'Laugh Out Lagos', email: 'laughoutlagos@viora.app', categories: ['Comedy'] },
  { name: 'Naija Dev', email: 'naijadev@viora.app', categories: ['Tech'] },
  { name: 'Sideline Sports', email: 'sideline@viora.app', categories: ['Sports'] },
  { name: 'Kitchen Chronicles', email: 'kitchen@viora.app', categories: ['Food'] },
  { name: 'Road & Rail', email: 'roadandrail@viora.app', categories: ['Travel'] },
];

// --- titles ------------------------------------------------------------------
// Written out rather than generated from templates: "Jollof, Three Ways" reads like a real
// video, "Music Video 37" does not, and a catalogue of the second kind makes the whole app
// look like a placeholder.
const TITLES = {
  Music: [
    ['Afrobeats Live Session — Full Rooftop Set in Lekki', 'An hour-long rooftop set recorded at sunset, with a live band and three surprise guests.'],
    ['How the Talking Drum Actually Talks', 'A master drummer shows how pitch and rhythm copy the tones of Yoruba speech.'],
    ['Making a Beat From Scratch in 10 Minutes', 'One loop, one bassline, and a snare that took longer than everything else combined.'],
    ['Highlife Guitar: The Two-Finger Pattern', 'The pattern behind half of West African guitar, slowed right down.'],
    ['Studio Tour — Where the Album Was Recorded', 'A converted bedroom, one good microphone, and a lot of duvets on the walls.'],
    ['Why Nigerian Pop Sounds Different Now', 'Producers explain the shift from 2010 club records to today’s softer, slower sound.'],
    ['Live Band vs Backing Track', 'The same song performed twice, so you can hear exactly what a drummer adds.'],
    ['Street Percussion in Balogun Market', 'Buckets, bottles and a bicycle wheel, recorded at six in the morning.'],
    ['Choir Rehearsal: Four Parts, One Room', 'Thirty voices learning a new arrangement from nothing in ninety minutes.'],
    ['Sampling Old Records Without Getting Sued', 'What clearance actually costs, and the legal alternatives nobody mentions.'],
    ['The Bassline That Carries the Whole Song', 'Eight notes, repeated. Here is why they work.'],
    ['Recording Vocals in a Noisy Flat', 'Generator outside, traffic below, and a usable take by the end.'],
    ['Alte Scene: A Short Introduction', 'Where it came from, who started it, and what separates it from mainstream Afropop.'],
  ],
  Gaming: [
    ['World-Record Speedrun Attempt (Live Commentary)', 'Four hours of attempts condensed into the one that worked.'],
    ['Every Secret in the First Level', 'Twelve of them. Most players find two.'],
    ['Building a Gaming PC on a Lagos Budget', 'Parts sourced locally, prices in naira, and what to buy used.'],
    ['Why This Boss Is Harder Than It Looks', 'Frame-by-frame breakdown of the attack nobody dodges first time.'],
    ['Playing With 300ms Ping', 'What high latency actually does to aim, and how players compensate.'],
    ['The Patch That Broke Everything', 'A balance update, three days of chaos, and the hotfix that followed.'],
    ['First Hour: No Commentary', 'Just the opening, unedited, for anyone deciding whether to buy it.'],
    ['Local Tournament Finals — Full Match', 'Two rounds, one upset, and a crowd that would not sit down.'],
    ['Modding for Complete Beginners', 'Installing your first mod without breaking the save file.'],
    ['Controller vs Keyboard, Settled', 'Timed trials on the same course, same player, both inputs.'],
    ['The Game That Took Ten Years to Make', 'A short history of the longest development cycle in the studio’s history.'],
    ['Speedrun Glitches, Explained Properly', 'Why walking into a wall at the right angle skips twenty minutes.'],
  ],
  Education: [
    ['Understanding Compound Interest in 8 Minutes', 'One graph that explains why starting early matters more than saving more.'],
    ['How to Read a Scientific Paper', 'Abstract, methods, results — and which one to read first.'],
    ['The Water Cycle, Drawn by Hand', 'No animation, no music, just a whiteboard and a clear explanation.'],
    ['Why Algebra Is Taught the Way It Is', 'A short history of a subject most people meet at the wrong time.'],
    ['Note-Taking That Actually Works', 'Three methods compared, with the research behind each.'],
    ['Nigerian History: 1960 to 1970', 'Ten years in twenty minutes, with primary sources on screen.'],
    ['How Vaccines Work, Without the Jargon', 'From exposure to immunity, step by step.'],
    ['Learning a Language as an Adult', 'What actually transfers from classroom study, and what does not.'],
    ['Statistics People Get Wrong Daily', 'Correlation, base rates, and the one error that appears in every newspaper.'],
    ['Exam Technique for Long-Answer Papers', 'Planning, timing and the marks most candidates leave behind.'],
    ['What an Engineer Actually Does All Day', 'A week on a real site, filmed by the engineer.'],
    ['Reading Financial Statements', 'Three documents, what each tells you, and where companies hide things.'],
  ],
  Comedy: [
    ['When the Danfo Conductor Has No Change', 'Every Lagos commuter has lived this exact conversation.'],
    ['NEPA Brought Light for 5 Minutes', 'A short film about collective joy and its immediate withdrawal.'],
    ['Every Group Project Ever', 'Five people, one deadline, and the one who does everything.'],
    ['My Mother on a Video Call', 'The camera is pointed at the ceiling for the entire conversation.'],
    ['Nigerian Parents and School Reports', 'A dramatic reading of a conversation most of us survived.'],
    ['Trying to Explain My Job to My Uncle', '"So you just press computer?"'],
    ['The Wedding Guest Who Knows Nobody', 'Filmed at an actual wedding, with permission, mostly.'],
    ['Waiting for a Delivery That Says 2PM', 'A real-time documentary of nine hours.'],
    ['When Someone Says "Let’s Split the Bill"', 'The maths, the silence, and the man who ordered three plates.'],
    ['Office Small Talk: A Study', 'Fourteen ways to say "how was your weekend" and mean nothing.'],
    ['My Flatmate Thinks He Can Cook', 'He cannot. This is the evidence.'],
    ['Church Announcements That Never End', 'Twelve minutes of notices before a thirty-minute sermon.'],
  ],
  Tech: [
    ['Building a REST API in One Sitting', 'From empty folder to working endpoints, with the mistakes left in.'],
    ['Why Your Site Is Slow', 'Four causes, measured with the browser tools everyone already has.'],
    ['Git: The Five Commands You Need', 'Everything else can wait until you need it.'],
    ['Deploying to Production for the First Time', 'What breaks, why, and how to tell which half is at fault.'],
    ['Databases: Rows vs Documents', 'When each one is the right answer, with a real example of both.'],
    ['Reading Error Messages Properly', 'The top line is usually the answer. Here is why people skip it.'],
    ['What Actually Happens When You Type a URL', 'DNS, TCP, TLS, HTTP — in the order they occur.'],
    ['Authentication Without the Mystery', 'Sessions, tokens, and what each one costs you.'],
    ['My First Year as a Developer', 'What I expected, what happened, and what I would skip.'],
    ['Testing Code You Did Not Write', 'Where to start when the codebase is large and the docs are gone.'],
    ['Why Everyone Uses TypeScript Now', 'A short argument, with the counter-argument included.'],
    ['Debugging in Production Safely', 'Logs, feature flags, and the things you must never do live.'],
    ['Cloud Bills That Surprise People', 'Three services that cost nothing until suddenly they do.'],
  ],
  Sports: [
    ['Derby Day Highlights — All Goals and Big Moments', 'A seven-goal thriller decided in stoppage time.'],
    ['How to Take a Proper Free Kick', 'Approach, plant foot, contact point — filmed at 240 frames a second.'],
    ['Training Session: A Full Warm-Up', 'Forty minutes, unedited, as run by a semi-professional side.'],
    ['Why That Offside Call Was Correct', 'Three angles and the rule as actually written.'],
    ['Running Your First 10K', 'Twelve weeks of training compressed into one honest account.'],
    ['Street Football in Ajegunle', 'No referee, no pitch markings, and better close control than most academies.'],
    ['Goalkeeper Drills You Can Do Alone', 'A wall, a ball, and twenty minutes.'],
    ['The Tactical Change That Won the Match', 'One substitution, explained with the formation on screen.'],
    ['Athletics Trials — Full 400m Final', 'Eight runners, one photo finish.'],
    ['Recovering From a Hamstring Injury', 'A physiotherapist walks through the twelve-week protocol.'],
    ['Basketball Shooting Form, Corrected', 'Before and after, with the three changes that mattered.'],
    ['Table Tennis: Reading Spin', 'Slowed footage of six serves, and what the wrist is doing in each.'],
    ['Why Pre-Season Matters', 'A coach explains what six weeks of running actually buys you in March.'],
  ],
  Food: [
    ['Smoky Party Jollof — The Secret Is the Bottom Pot', 'The technique that separates party jollof from everything else.'],
    ['Egusi Soup From First Principles', 'Every ingredient explained, including the ones usually skipped.'],
    ['Suya Spice: The Full Blend', 'Measured properly, so you can make it the same way twice.'],
    ['Bread From a Gas Oven', 'No stand mixer, no proving drawer, still a good loaf.'],
    ['Cooking for the Week in 90 Minutes', 'Five meals, one shop, and realistic portion sizes.'],
    ['Moi Moi Without Leaves', 'What changes when you use tins, and how to compensate.'],
    ['Why Your Rice Is Always Soggy', 'Water ratios, pot choice, and the lid you should not lift.'],
    ['Street Food Tour: Yaba at Night', 'Six stalls, one evening, filmed with the vendors’ permission.'],
    ['Pepper Soup for a Cold Evening', 'A short recipe and a long argument about which fish is correct.'],
    ['Baking With Children', 'Half the recipe ends up on the floor. The rest is edible.'],
    ['Pounded Yam the Easy Way', 'A comparison of three methods, judged by someone’s grandmother.'],
    ['Zobo, Properly Made', 'Hibiscus, ginger, pineapple skin — and why boiling it too long ruins everything.'],
    ['Cooking on One Burner', 'Four dishes for a student kitchen with no oven and limited gas.'],
  ],
  Travel: [
    ['Lagos to Ibadan by Road', 'Four hours, two checkpoints, and the best roadside stop on the route.'],
    ['Obudu Cattle Ranch in the Rain', 'The cable car, the cold, and why the timing was a mistake.'],
    ['A Weekend in Calabar', 'What it costs, where to stay, and what is worth skipping.'],
    ['Train Journey: Lagos to Abeokuta', 'Filmed from the window, start to finish, with ambient sound.'],
    ['Packing for Two Weeks in One Bag', 'Everything laid out, weighed, and justified.'],
    ['Yankari Game Reserve, Early Morning', 'The warm spring at sunrise, before anyone else arrives.'],
    ['Olumo Rock, Top to Bottom', 'The climb, the view, and the history explained by a local guide.'],
    ['Travelling on a Nigerian Passport', 'Visa realities, paperwork, and the queues nobody warns you about.'],
    ['Idanre Hills: 660 Steps', 'A slow walk up, with a rest every hundred steps, honestly filmed.'],
    ['Coastal Road to Badagry', 'Three hours of coastline, markets and the slave-route museum.'],
    ['Erin Ijesha Waterfall, All Seven Levels', 'A climb most visitors abandon at level three.'],
    ['Abuja on Foot', 'A capital built for cars, explored the hard way over two days.'],
  ],
};

// --- helpers -----------------------------------------------------------------
const arg = (name, fallback) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : fallback;
};
const has = (name) => process.argv.includes(`--${name}`);

/**
 * A deterministic pseudo-random number from a string.
 *
 * Views and likes should look varied but be the SAME on every re-seed: a catalogue whose
 * numbers change each run makes it impossible to tell a real change from noise.
 */
function hashInt(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // unsigned, so the modulo below is never negative
}

/** 0–1, for numbers that only need to look varied (views, likes, dates). */
const hashed = (seed) => hashInt(seed) / 2 ** 32;

/**
 * Pick one item deterministically.
 *
 * Integer modulo, not Math.floor(random * length): scaling a float then flooring it
 * clusters badly when the list is short, and a first attempt at this left one of the
 * four films with zero videos out of a hundred.
 */
const pick = (seed, list) => list[hashInt(seed) % list.length];

async function main() {
  const uri = arg('uri', process.env.MONGO_URI || process.env.MONGODB_URI);
  if (!uri) {
    console.error('No database URI. Set MONGO_URI in .env, or pass --uri="mongodb+srv://..."');
    process.exit(1);
  }

  // Some ISP resolvers cannot answer the SRV lookup that mongodb+srv:// needs.
  if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

  const count = Number(arg('count', 100));
  const adminEmail = arg('admin', null);

  console.log(`Connecting to ${uri.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  console.log('Connected.\n');

  // --- 1. the admin, if asked ------------------------------------------------
  if (adminEmail) {
    const result = await User.updateOne({ email: adminEmail }, { $set: { role: 'admin' } });
    if (result.matchedCount) {
      console.log(`Admin: ${adminEmail} is now an admin.`);
      console.log('       Sign out and in again — your role lives in the token, so an old');
      console.log('       token still says "user" until a new one is issued.\n');
    } else {
      console.log(`Admin: no account found for ${adminEmail}. Register it first, then re-run.\n`);
    }
  }

  // --- 2. the channels -------------------------------------------------------
  // A shared password nobody is meant to log in with; these exist to own videos.
  const channelPassword = await bcrypt.hash('Viora-Channel-2026!', await bcrypt.genSalt(10));
  const channels = [];
  for (const channel of CHANNELS) {
    const existing = await User.findOne({ email: channel.email });
    if (existing) {
      channels.push({ ...channel, id: existing._id });
    } else {
      const created = await User.create({
        name: channel.name,
        email: channel.email,
        password: channelPassword,
        role: 'user',
      });
      channels.push({ ...channel, id: created._id });
    }
  }
  console.log(`Channels: ${channels.length} ready.`);

  // --- 3. the videos ---------------------------------------------------------
  if (has('reset')) {
    const removed = await Video.deleteMany({});
    console.log(`Reset: removed ${removed.deletedCount} existing videos.`);
  }

  const existingTitles = new Set((await Video.find({}, { title: 1 }).lean()).map((v) => v.title));

  // Flatten every category's titles into one list, round-robin so the catalogue is mixed
  // rather than twelve Music videos followed by twelve Gaming ones.
  const pool = [];
  const categories = Object.keys(TITLES);
  const longest = Math.max(...categories.map((c) => TITLES[c].length));
  for (let i = 0; i < longest; i += 1) {
    for (const category of categories) {
      if (TITLES[category][i]) pool.push({ category, entry: TITLES[category][i] });
    }
  }

  const now = Date.now();
  const docs = [];
  for (let i = 0; docs.length < count && i < pool.length * 3; i += 1) {
    const { category, entry } = pool[i % pool.length];
    const pass = Math.floor(i / pool.length);
    const [baseTitle, description] = entry;
    const title = pass === 0 ? baseTitle : `${baseTitle} (Part ${pass + 1})`;
    if (existingTitles.has(title)) continue;

    const r = hashed(title);
    const media = pick(`${title}-media`, MEDIA_POOL);
    const channel = channels.find((c) => c.categories.includes(category)) ?? channels[0];

    docs.push({
      title,
      description,
      category,
      videoUrl: media.url,
      // Seeded rows were never uploaded to Cloudinary. The field is required, so it is
      // marked clearly rather than faked with a plausible id — deleting one of these
      // will log a Cloudinary failure, which is correct and harmless.
      publicId: `seed/${media.key}/${i}`,
      thumbnailUrl: thumbnail(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)),
      thumbnailPublicId: '',
      duration: media.seconds,
      views: Math.floor(r * 480000) + 120,
      likes: Math.floor(r * 24000) + 3,
      uploadedBy: channel.id,
      // Spread over the last ~120 days so "newest first" and the New badge both have
      // something to sort by.
      createdAt: new Date(now - Math.floor(hashed(`${title}-date`) * 120) * 86400000),
      updatedAt: new Date(),
    });
  }

  if (!docs.length) {
    console.log('Videos: nothing to add — the catalogue already has these titles.');
  } else {
    await Video.insertMany(docs, { ordered: false });
    console.log(`Videos: inserted ${docs.length}.`);
  }

  // --- 4. what the catalogue looks like now ----------------------------------
  const total = await Video.countDocuments();
  const byCategory = await Video.aggregate([
    { $group: { _id: '$category', n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log(`\nCatalogue now holds ${total} videos:`);
  for (const row of byCategory) console.log(`  ${String(row._id).padEnd(12)} ${row.n}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((error) => {
  console.error('\nSeed failed:', error.message);
  process.exit(1);
});
