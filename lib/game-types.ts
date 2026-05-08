// =============================================================================
// Game-type catalog — based on truthorcapapp.com production lineup, every
// game uses the same Whisper + Hume + Claude detector pipeline (M04). Each
// game type seeds different questions, durations, and verdict copy.
//
// Questions are organized in three commented tiers per pool:
//   FAMILY   — PG, kid-safe (good for select.audience.family).
//   FRIENDS  — group-night default; chaotic but not graphic.
//   ADULTS   — couples / spicier prompts (still PG-13, never explicit).
// All prompts feed the same flat array since the engine doesn't carry
// per-question metadata. Audience filtering is a game-type-level concern.
// =============================================================================

export type GameType =
  | 'truth_or_lie'
  | 'never_have_i_ever'
  | 'most_likely_to'
  | 'would_you_rather'
  | 'paranoia'
  | 'dare_roulette'
  | 'two_truths_one_lie'
  | 'couples_quiz';

export type Audience = 'family' | 'friends' | 'couples';

/**
 * Visual theme for a game — drives gradient art, emoji icon, and per-game
 * banner accents. Colors are kept on the same blue / teal / coral palette
 * (#5b6cf6 / #14b8a6 / #f87171) but mixed differently per game so each
 * card feels distinct without breaking the brand.
 */
export interface GameTheme {
  /** CSS gradient string used as the card / banner background. */
  gradient: string;
  /** Tailwind text class for the secondary accent (used on chips, badges). */
  accentClass: string;
  /** Big emoji glyph rendered in the card art tile. */
  emoji: string;
  /** Short uppercase eyebrow shown above the title (e.g. "CLASSIC", "DUO"). */
  eyebrow: string;
}

export interface GameTypeMeta {
  id: GameType;
  label: string;
  tagline: string;
  detectorAngle: string; // why the AI matters for THIS game
  format: 'single_answer' | 'multi_statement' | 'binary_choice' | 'partner_question';
  defaultDurationMs: number;
  audience: Audience[];
  questions: ReadonlyArray<string>;
  verdictCopy: {
    high: string;
    mid: string;
    low: string;
  };
  theme: GameTheme;
}

// -----------------------------------------------------------------------------
// QUESTION POOLS — each tuned to the game's vibe.
// -----------------------------------------------------------------------------

const TRUTH_OR_LIE = [
  // ─── FAMILY (PG) ────────────────────────────────────────────────────────
  "Have you ever lied about reading a book everyone's talking about?",
  "Have you ever pretended to laugh at a joke you didn't get?",
  "Did you actually finish the last show you said you finished?",
  "Have you ever lied about being sick to skip something?",
  "Have you ever taken credit for someone else's idea?",
  "Have you ever said \"on my way\" when you hadn't left yet?",
  "Did you actually go to the gym this week, or just say you did?",
  "Have you ever pretended to know a song you were singing along to?",
  "Have you ever told a kid Santa was real way past when you should've?",
  "Have you ever blamed the dog for something you did?",
  "Have you ever lied to your parents about where you were going?",
  "Did you actually wash your hands the last time you said you did?",
  "Have you ever pretended to enjoy a homemade meal?",
  "Did you really brush your teeth this morning, or just rinse?",
  "Have you ever pretended to be asleep so you didn't have to talk?",
  "Have you ever lied about how much screen time you had today?",
  "Did you actually do all your homework, or just the easy parts?",
  "Have you ever blamed Wi-Fi when it was your phone the whole time?",
  "Have you ever told someone their cooking was great when it wasn't?",
  "Have you ever pretended to remember someone's name to avoid asking?",

  // ─── FRIENDS (default) ──────────────────────────────────────────────────
  "Tell us something you've never told your closest friend.",
  "Have you ever ghosted someone and then run into them in person?",
  "Have you ever lied about how much you spent on something?",
  "Have you ever rehearsed a 'casual' text for more than 10 minutes?",
  "Have you ever pretended to read a book to look smarter on a date?",
  "Have you ever fake-laughed at a boss, manager, or in-law?",
  "Have you ever told someone 'I'm five minutes away' when you were 30?",
  "Have you ever lied about who you voted for?",
  "Have you ever hated a friend's outfit and then complimented it?",
  "Have you ever liked someone's old post by accident, then unliked it?",
  "Have you ever started a rumor — true or false — just to see what happened?",
  "Have you ever returned something you'd already worn or used?",
  "Have you ever lied about your zodiac sign to fit a vibe?",
  "Have you ever pretended your phone died to avoid replying?",
  "Have you ever told a friend their ex was the worst, while liking the ex?",
  "Have you ever taken the last slice and lied about who ate it?",
  "Have you ever accepted a meeting just to see who else accepted?",
  "Have you ever blamed traffic when you actually slept in?",
  "Have you ever lied about being vegetarian to skip a dish?",
  "Have you ever told someone their pet was cute when you thought otherwise?",
  "Have you ever cried in an Uber and pretended you weren't?",
  "Have you ever made up a 'family thing' to skip a hangout?",
  "Have you ever pretended to know the rules of a card game halfway in?",
  "Have you ever bought a pricey latte just to post the cup?",
  "Have you ever started a podcast in your head and never recorded it?",
  "Have you ever told a friend a movie was great when you slept through it?",
  "Have you ever lied about loving a gift just to keep the peace?",
  "Have you ever screenshot a friend's text just to send it elsewhere?",
  "Have you ever Googled someone before going to dinner with them?",
  "Have you ever sent the wrong meme to the wrong group chat?",
  "Have you ever pretended to be more drunk than you actually were?",
  "Have you ever pretended to be more sober than you actually were?",
  "Have you ever changed your accent around someone you were attracted to?",
  "Have you ever lied about being 'fine' when you were extremely not?",
  "Have you ever rage-quit a group chat and then asked to be added back?",
  "Have you ever lied about your steps count for a streak?",
  "Have you ever taken a photo at the gym you weren't actually using?",
  "Have you ever told a friend you read their long text when you didn't?",
  "Have you ever pretended to be allergic to skip a food?",
  "Have you ever judged a friend's outfit and then secretly bought it?",

  // ─── ADULTS / COUPLES (PG-13) ──────────────────────────────────────────
  "Have you ever told a date you 'love hiking' because they did?",
  "Have you ever lied about a hobby on a dating app?",
  "Have you ever lied about how many people you've dated?",
  "Have you ever stayed friends with an ex just to keep tabs on them?",
  "Have you ever looked at an ex's profile in the last 30 days?",
  "Have you ever lied about loving your partner's cooking?",
  "Have you ever used the word 'busy' when you just didn't want to go?",
  "Have you ever pretended to like a partner's family more than you do?",
  "Have you ever told a partner 'no it looks great' when it didn't?",
  "Have you ever lied about a salary or raise to a partner or friend?",
  "Have you ever told someone you liked their playlist just to be polite?",
  "Have you ever ghosted a date because of something tiny they said?",
  "Have you ever pretended to be okay with the chore split?",
  "Have you ever told your partner you're not jealous when you actually are?",
  "Have you ever said 'no biggie' when it was, in fact, a biggie?",
  "Have you ever lied about how often you check your dating app?",
  "Have you ever read a partner's notifications across the table?",
  "Have you ever lied about a bad day so you didn't have to explain it?",
  "Have you ever pretended to enjoy a friend's startup pitch?",
  "Have you ever lied about loving the place your partner picked?",
];

const NEVER_HAVE_I_EVER = [
  // ─── FAMILY (PG) ────────────────────────────────────────────────────────
  'Never have I ever pretended to like a homemade gift.',
  'Never have I ever lied about brushing my teeth.',
  'Never have I ever blamed a sibling for something I did.',
  'Never have I ever fallen asleep during a movie everyone said was great.',
  'Never have I ever cried because someone ate my leftovers.',
  'Never have I ever told a kid that the toy was "out of batteries" to end it.',
  'Never have I ever pretended to read the menu when I already knew my order.',
  "Never have I ever told a server it was my birthday when it wasn't.",
  'Never have I ever taken a photo of food and let it get cold.',
  'Never have I ever pretended to forget a chore was my turn.',
  'Never have I ever sung the wrong words to a song with full confidence.',
  'Never have I ever put on perfume instead of showering.',
  'Never have I ever Googled myself in the last month.',
  'Never have I ever pretended my Wi-Fi was bad to leave a video call.',
  'Never have I ever blamed a delay on traffic when I overslept.',

  // ─── FRIENDS (default) ──────────────────────────────────────────────────
  'Never have I ever ghosted someone after a great date.',
  "Never have I ever pretended I'd already seen the movie everyone was hyped about.",
  'Never have I ever fallen asleep mid-conversation on a Zoom call.',
  'Never have I ever stalked an ex on social media this month.',
  "Never have I ever said \"I love you\" and not meant it in the moment.",
  "Never have I ever laughed at a friend's bad idea behind their back.",
  'Never have I ever pretended to like a gift in person.',
  'Never have I ever cried in a public bathroom.',
  'Never have I ever Googled someone before a first date.',
  'Never have I ever lied about my age — to anyone.',
  'Never have I ever liked my own post from an alt account.',
  'Never have I ever returned something after using it once.',
  "Never have I ever forgotten someone's name mid-introduction.",
  'Never have I ever rehearsed a "spontaneous" text for over 10 minutes.',
  'Never have I ever cancelled plans the morning of, with a fake excuse.',
  'Never have I ever cried at a Pixar movie around adults.',
  'Never have I ever lied about going to the gym this week.',
  'Never have I ever told someone I was 5 minutes away when I was 25.',
  'Never have I ever slept past 2pm with no real reason.',
  'Never have I ever sent a text to the wrong person and panicked.',
  'Never have I ever stalked a stranger on Instagram for over an hour.',
  'Never have I ever forwarded a meme as if I made it.',
  'Never have I ever pretended to be on the phone to avoid someone.',
  'Never have I ever changed Spotify mid-listen so the room would respect me.',
  'Never have I ever taken the AirPods out only to nod and pretend.',
  'Never have I ever pretended my battery died to leave a chat.',
  'Never have I ever lied about my hometown to sound cooler.',
  'Never have I ever bought clothes one size smaller as motivation.',
  'Never have I ever judged someone for a song and then added it to my playlist.',
  'Never have I ever liked a band but pretended to hate them in public.',
  'Never have I ever taken credit for a meme my friend sent me first.',
  'Never have I ever told a friend their crush was great while doubting it.',
  'Never have I ever rage-replied to a tweet and immediately deleted it.',
  'Never have I ever ducked into a store to dodge someone on the street.',
  'Never have I ever followed someone, immediately unfollowed, then followed again.',
  'Never have I ever sent a "wyd" with no actual plan.',
  'Never have I ever pretended a typo was on purpose.',
  'Never have I ever pretended to have read a book I quoted in conversation.',
  'Never have I ever told a friend their cooking was good when it was punishment.',
  'Never have I ever blamed my dog for a fart I did.',

  // ─── ADULTS / COUPLES ──────────────────────────────────────────────────
  'Never have I ever lied to a date about my job.',
  'Never have I ever lied about reading a partner\'s text right when it came in.',
  'Never have I ever screenshotted a partner\'s message to a friend.',
  'Never have I ever pretended to enjoy meeting their parents.',
  'Never have I ever fake-laughed through a partner\'s favorite show.',
  'Never have I ever told an ex they were "the only one" while dating someone else.',
  'Never have I ever Googled someone after one bad red flag.',
  'Never have I ever stalked an ex\'s new partner for fun.',
  'Never have I ever lied about how spicy I can handle food on a date.',
  'Never have I ever pretended to enjoy a date\'s playlist all night.',
  'Never have I ever lied about my "type" being someone\'s exact opposite.',
  'Never have I ever made up a reason to skip a partner\'s work event.',
  'Never have I ever told a partner I was working when I was scrolling.',
  'Never have I ever lied about how many followers I have on a private account.',
  'Never have I ever pretended a date\'s weird hobby was "actually so cool".',
];

const MOST_LIKELY_TO = [
  // ─── FAMILY ────────────────────────────────────────────────────────────
  'Who is most likely to fake-laugh at a bad joke just to be polite?',
  'Who is most likely to pretend to listen and immediately ask "what?"',
  'Who is most likely to lose their phone in their own house?',
  'Who is most likely to sing the wrong lyrics with full confidence?',
  'Who is most likely to tell a story they\'ve already told 5 times?',
  'Who is most likely to fall asleep first at a sleepover?',
  'Who is most likely to take the last slice and deny it?',
  'Who is most likely to have a snack hidden in a weird place?',
  'Who is most likely to send a text meant for someone else?',
  'Who is most likely to laugh at their own jokes the loudest?',

  // ─── FRIENDS (default) ──────────────────────────────────────────────────
  'Who in your group is most likely to ghost a date?',
  'Who is most likely to lie about how much they spent on a vacation?',
  'Who is most likely to claim they exercise more than they actually do?',
  "Who is most likely to say \"on my way\" before they've put on shoes?",
  "Who is most likely to forget a friend's birthday and lie about it?",
  'Who is most likely to read a self-help book and pretend to apply it?',
  "Who is most likely to call in sick when they aren't?",
  'Who is most likely to embellish a story to make themselves look better?',
  'Who is most likely to have a private finsta about the friend group?',
  'Who is most likely to start a "huge project" and abandon it in 4 days?',
  "Who is most likely to be on hold with customer service crying about it?",
  'Who is most likely to say "I called it" about something they never called?',
  'Who is most likely to text their ex when bored?',
  'Who is most likely to film for a story and never post it?',
  'Who is most likely to be the last to leave a party — uninvited to do so?',
  'Who is most likely to start a beef in a group chat at 1am?',
  'Who is most likely to "forget their wallet" repeatedly?',
  'Who is most likely to go viral, but for the wrong reason?',
  'Who is most likely to overshare with the Uber driver?',
  'Who is most likely to argue with the GPS out loud?',
  'Who is most likely to start a podcast and quit after 2 episodes?',
  'Who is most likely to take 25 selfies before posting one?',
  'Who is most likely to claim a meme as their own joke?',
  'Who is most likely to start a multi-step skincare routine and quit by day 3?',
  'Who is most likely to live-text the entire drama to a side group?',
  'Who is most likely to fake a phone call to escape a conversation?',
  'Who is most likely to talk in their sleep and confess something wild?',
  'Who is most likely to claim they "called shotgun" telepathically?',
  'Who is most likely to argue about pineapple on pizza for 30 minutes?',
  'Who is most likely to befriend the bartender within 4 minutes?',
  'Who is most likely to be the group\'s "I told you so" person?',
  'Who is most likely to remember the gossip everyone forgot?',
  'Who is most likely to apologize to a piece of furniture they bumped into?',
  'Who is most likely to wear the same outfit two days in a row and lie about it?',
  'Who is most likely to stalk a wedding guest list before going?',
  'Who is most likely to befriend a stranger\'s dog and forget the owner exists?',
  'Who is most likely to pre-stalk a brunch menu the night before?',
  'Who is most likely to take a fake business call to dodge a question?',
  'Who is most likely to make a 9-slide carousel about a 3-day trip?',
  'Who is most likely to claim they "manifested" something obvious?',

  // ─── ADULTS / COUPLES ──────────────────────────────────────────────────
  'Who is most likely to read every dating app message twice before replying?',
  'Who is most likely to "accidentally" hard-launch a relationship?',
  'Who is most likely to say "we should hang out" and never follow up?',
  'Who is most likely to date someone purely off their job title?',
  'Who is most likely to stay too long in a relationship just for the brunches?',
  'Who is most likely to plan a wedding before the third date?',
  'Who is most likely to keep a breakup playlist ready at all times?',
  'Who is most likely to text "u up" and regret it instantly?',
  'Who is most likely to flirt with a barista for free oat milk?',
  'Who is most likely to double-text their ex after 9pm?',
];

// Structured Would-You-Rather catalog — each prompt has explicit A / B
// options so the WYR vote system can track stats per option. The id is
// stable (snake_case slug) so DB rows survive copy edits to the prompts.
//
// IMPORTANT: do NOT change an existing id once it's shipped — historical
// vote rows reference it. Append-only.
export interface WYRPrompt {
  id: string;
  /** Human-readable combined question (used by the legacy flat pool). */
  question: string;
  /** Short label for "A" — what the player picks. */
  optionA: string;
  /** Short label for "B" — the alternative. */
  optionB: string;
  /** Optional vibe tag for filters/insights (not exposed publicly). */
  category: 'funny' | 'embarrassing' | 'relationship' | 'career' | 'hypothetical' | 'spicy';
  /** Audience tier — controls which prompts surface for which vibe. */
  audience: Audience;
}

export const WYR_PROMPTS: ReadonlyArray<WYRPrompt> = [
  // ─── FAMILY ────────────────────────────────────────────────────────────
  { id: 'wyr_phone_or_photos', question: 'Lose your phone for a week, or lose every photo on it forever?', optionA: 'Lose phone for a week', optionB: 'Lose every photo forever', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_late_or_early', question: 'Always be 30 minutes late, or always 30 minutes early?', optionA: '30 minutes late', optionB: '30 minutes early', category: 'funny', audience: 'family' },
  { id: 'wyr_invisible_or_fly', question: 'Be invisible for a day, or be able to fly for a day?', optionA: 'Invisible', optionB: 'Fly', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_summer_or_winter', question: 'Live in eternal summer, or eternal winter?', optionA: 'Eternal summer', optionB: 'Eternal winter', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_pizza_or_tacos', question: 'Only eat pizza forever, or only eat tacos forever?', optionA: 'Pizza forever', optionB: 'Tacos forever', category: 'funny', audience: 'family' },
  { id: 'wyr_dogs_or_cats', question: 'Live in a house full of dogs, or a house full of cats?', optionA: 'All dogs', optionB: 'All cats', category: 'funny', audience: 'family' },
  { id: 'wyr_water_or_chocolate', question: 'Drink only water for a year, or never drink water again?', optionA: 'Only water', optionB: 'Never water', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_swim_or_climb', question: 'Be amazing at swimming, or amazing at climbing?', optionA: 'Swim like a pro', optionB: 'Climb like a pro', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_breakfast_or_dinner', question: 'Only ever eat breakfast foods, or only ever eat dinner foods?', optionA: 'Breakfast only', optionB: 'Dinner only', category: 'funny', audience: 'family' },
  { id: 'wyr_sound_off_movies', question: 'Watch all movies with no sound, or with no picture?', optionA: 'No sound', optionB: 'No picture', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_sing_or_dance_well', question: 'Be the best singer in the world, or the best dancer?', optionA: 'Best singer', optionB: 'Best dancer', category: 'hypothetical', audience: 'family' },
  { id: 'wyr_glitter_or_slime', question: 'Have your hands always covered in glitter, or always covered in slime?', optionA: 'Glitter hands', optionB: 'Slime hands', category: 'funny', audience: 'family' },

  // ─── FRIENDS ───────────────────────────────────────────────────────────
  { id: 'wyr_famous_embarrassing', question: 'Be famous for something embarrassing, or unknown for something amazing?', optionA: 'Famous for cringe', optionB: 'Unknown for greatness', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_know_when_or_how', question: 'Know exactly when you\'ll die, or exactly how?', optionA: 'Know when', optionB: 'Know how', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_read_minds_or_invisible', question: 'Read minds for a day, or be invisible for a day?', optionA: 'Read minds', optionB: 'Be invisible', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_coffee_or_socials', question: 'Give up coffee for a year, or give up social media for a year?', optionA: 'No coffee', optionB: 'No socials', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_truth_or_lie_power', question: 'Always have everyone tell you the truth, or be able to lie convincingly to anyone?', optionA: 'Get the truth', optionB: 'Lie convincingly', category: 'spicy', audience: 'friends' },
  { id: 'wyr_forget_5_or_no_new_5', question: 'Forget the last 5 years of your life, or be unable to remember anything new for 5 years?', optionA: 'Forget the past 5', optionB: 'Stop remembering for 5', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_messages_public', question: 'Have your DMs published publicly, or your search history?', optionA: 'DMs go public', optionB: 'Search history goes public', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_party_central_or_loner', question: 'Be the most-invited person in your city, or never have to attend anything again?', optionA: 'Always invited', optionB: 'Never invited', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_voice_for_a_day', question: 'Sound like a cartoon villain forever, or like a 9-year-old forever?', optionA: 'Cartoon villain', optionB: '9-year-old', category: 'funny', audience: 'friends' },
  { id: 'wyr_rich_lonely_or_loved_broke', question: 'Be filthy rich and have no real friends, or broke but have a great friend group?', optionA: 'Rich and lonely', optionB: 'Broke and loved', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_fight_horse_ducks', question: 'Fight one horse-sized duck, or 100 duck-sized horses?', optionA: 'One huge duck', optionB: '100 tiny horses', category: 'funny', audience: 'friends' },
  { id: 'wyr_clown_or_mime_career', question: 'Have to be a clown for a living, or a mime?', optionA: 'Clown', optionB: 'Mime', category: 'career', audience: 'friends' },
  { id: 'wyr_beach_or_mountain_vacation', question: 'Only do beach vacations forever, or only mountain vacations forever?', optionA: 'Always beach', optionB: 'Always mountain', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_no_phone_or_no_music', question: 'No phone for a month, or no music for a month?', optionA: 'No phone', optionB: 'No music', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_speak_languages_or_instruments', question: 'Speak every language, or play every instrument?', optionA: 'Every language', optionB: 'Every instrument', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_meet_past_or_future', question: 'Have dinner with anyone from the past, or anyone from the future?', optionA: 'Dinner with the past', optionB: 'Dinner with the future', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_ai_assistant_truth', question: 'Have an AI that always tells you the truth, or one that always tells you what you want to hear?', optionA: 'Always truth', optionB: 'Always comforting', category: 'hypothetical', audience: 'friends' },
  { id: 'wyr_shower_alarm_singer', question: 'Have a personal alarm that sings to wake you up badly, or a stranger gently shaking you?', optionA: 'Bad singing alarm', optionB: 'Gentle stranger', category: 'funny', audience: 'friends' },
  { id: 'wyr_one_color_clothes', question: 'Only ever wear one color forever, or only ever wear costumes?', optionA: 'One color', optionB: 'Costumes only', category: 'funny', audience: 'friends' },
  { id: 'wyr_streaming_or_chat_history', question: 'Have your group chat read out loud at your next family dinner, or your streaming history?', optionA: 'Group chat aloud', optionB: 'Streaming history aloud', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_text_only_emoji_or_caps', question: 'Only ever text in emojis, or only in ALL CAPS?', optionA: 'Emojis only', optionB: 'CAPS only', category: 'funny', audience: 'friends' },
  { id: 'wyr_late_to_funeral_or_wedding', question: 'Be 4 hours late to a wedding, or 4 hours late to a job interview?', optionA: 'Late to a wedding', optionB: 'Late to interview', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_voice_text_subtitles', question: 'Have subtitles always under your face IRL, or have your inner monologue audible?', optionA: 'Subtitles', optionB: 'Inner monologue audible', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_camera_glasses', question: 'Wear a camera that records everything, or have everyone read your last 24h of texts?', optionA: 'Wear a recorder', optionB: 'Texts go public', category: 'spicy', audience: 'friends' },
  { id: 'wyr_dance_battle_or_karaoke', question: 'Solve every conflict with a dance battle, or with karaoke?', optionA: 'Dance battle', optionB: 'Karaoke', category: 'funny', audience: 'friends' },

  // ─── CAREER ────────────────────────────────────────────────────────────
  { id: 'wyr_work_remote_or_office', question: 'Work fully remote forever, or fully in-office forever?', optionA: 'Remote forever', optionB: 'Office forever', category: 'career', audience: 'friends' },
  { id: 'wyr_dream_or_double_pay', question: 'Do your dream job for normal pay, or a job you hate for double pay?', optionA: 'Dream job', optionB: 'Hated job, double pay', category: 'career', audience: 'friends' },
  { id: 'wyr_meetings_or_email', question: 'Only do meetings, or only do email — for the rest of your career?', optionA: 'Meetings only', optionB: 'Email only', category: 'career', audience: 'friends' },
  { id: 'wyr_boss_micromanage_or_absent', question: 'Have a boss who micromanages every minute, or one who never replies for weeks?', optionA: 'Micromanager', optionB: 'Ghost boss', category: 'career', audience: 'friends' },
  { id: 'wyr_promotion_no_raise', question: 'Get a promotion with no raise, or a raise but a worse title?', optionA: 'Title, no raise', optionB: 'Raise, worse title', category: 'career', audience: 'friends' },
  { id: 'wyr_4_day_or_remote', question: 'Work a 4-day week in office, or a 5-day week fully remote?', optionA: '4-day office', optionB: '5-day remote', category: 'career', audience: 'friends' },

  // ─── EMBARRASSING ─────────────────────────────────────────────────────
  { id: 'wyr_camera_on_in_meetings', question: 'Always have your camera on in meetings, or always have your mic on?', optionA: 'Camera on', optionB: 'Mic on', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_drunk_speech_wedding_or_funeral', question: 'Give a drunk speech at a wedding, or a sober speech at a funeral?', optionA: 'Drunk wedding speech', optionB: 'Sober funeral speech', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_locked_out_naked_or_grocery_naked', question: 'Get locked out of your house with no clothes, or do groceries with no clothes?', optionA: 'Locked out', optionB: 'Naked groceries', category: 'embarrassing', audience: 'friends' },
  { id: 'wyr_cry_in_uber_or_office', question: 'Cry in a packed Uber, or cry in your office bathroom for an hour?', optionA: 'Cry in the Uber', optionB: 'Cry in office bathroom', category: 'embarrassing', audience: 'friends' },

  // ─── COUPLES / SPICY ──────────────────────────────────────────────────
  { id: 'wyr_partner_reads_dms_or_search', question: 'Let your partner read every DM you ever sent, or your search history?', optionA: 'DMs', optionB: 'Search history', category: 'spicy', audience: 'couples' },
  { id: 'wyr_share_location_forever', question: 'Always share your location with your partner, or never share it ever again?', optionA: 'Always share', optionB: 'Never share', category: 'relationship', audience: 'couples' },
  { id: 'wyr_partner_can_lie_or_truth', question: 'Have a partner who never lies but is harsh, or one who lies a little but is kind?', optionA: 'Brutally honest', optionB: 'Kind little lies', category: 'relationship', audience: 'couples' },
  { id: 'wyr_lose_phone_or_partner_phone', question: 'Lose your phone for a week, or hand your partner full access to it?', optionA: 'Lose your phone', optionB: 'Partner has access', category: 'spicy', audience: 'couples' },
  { id: 'wyr_no_friends_or_no_partner_year', question: 'Spend a year with no friends but a great partner, or no partner but great friends?', optionA: 'Just the partner', optionB: 'Just the friends', category: 'relationship', audience: 'couples' },
  { id: 'wyr_meet_inlaws_more_or_less', question: 'See your in-laws every Sunday, or never see your in-laws again?', optionA: 'Every Sunday', optionB: 'Never again', category: 'relationship', audience: 'couples' },
  { id: 'wyr_argue_or_silent_treatment', question: 'Have a partner who argues constantly but resolves it, or one who goes silent for days?', optionA: 'Argues but resolves', optionB: 'Silent treatment', category: 'relationship', audience: 'couples' },
  { id: 'wyr_breakup_text_or_voicemail', question: 'Get broken up with by text, or by voicemail?', optionA: 'Text breakup', optionB: 'Voicemail breakup', category: 'spicy', audience: 'couples' },
  { id: 'wyr_partner_vs_pet_choose', question: 'Pick: partner has to leave for a year, or your pet has to leave for a year?', optionA: 'Partner leaves', optionB: 'Pet leaves', category: 'spicy', audience: 'couples' },
  { id: 'wyr_kiss_emoji_or_words', question: 'Only ever say "I love you" with words, or only ever with emojis?', optionA: 'Words only', optionB: 'Emojis only', category: 'relationship', audience: 'couples' },
  { id: 'wyr_meet_celebrity_couple', question: 'Have your favorite celeb crush DM you once, or your partner get a $10k bonus?', optionA: 'Celeb DM', optionB: 'Partner gets $10k', category: 'spicy', audience: 'couples' },
];

// Flat array kept for backward compatibility with the legacy pickQuestionFor pipeline.
const WOULD_YOU_RATHER = WYR_PROMPTS.map((p) => p.question);

const PARANOIA = [
  // ─── FRIENDS ───────────────────────────────────────────────────────────
  "Who in this room would you trust LEAST with your phone unlocked?",
  "Of everyone you know, who do you think gossips about you the most?",
  "Who is the friend you'd be most surprised to find out is actually rich?",
  "Who would you call first if you got arrested?",
  "Who in your friend group has the worst hidden secret?",
  "Who in your life would survive a zombie apocalypse the longest? Why are you sure?",
  "Who's the one person you've fake-laughed for the most this year?",
  "Who do you think pretends to like you but actually doesn't?",
  "Who in this room would you trust to bury a body?",
  "Who in your life has the most curated public version of themselves?",
  "Who do you think reads your stories every time but never reacts?",
  "Whose group chat are you secretly afraid of?",
  "Who in your life would you genuinely fight for?",
  "Whose secret do you know that would shock everyone?",
  "Who in your life is one bad week from a complete glow-down?",
  "Who in this room is most likely to have a finsta about the rest of you?",
  "Who in your friend group fakes the busiest schedule?",
  "Who in this room would 'accidentally' read your private DMs first?",
  "Who in your life is hiding the messiest dating history?",
  "Who in your friend group is most likely to lie about their salary?",
  "Who's the friend whose parents secretly run their life?",
  "Whose career do you secretly think is built on luck more than skill?",
  "Whose dating standards are unrealistic to the point of comedy?",

  // ─── ADULTS / COUPLES ──────────────────────────────────────────────────
  "Who do you know that's still in love with their ex and won't admit it?",
  "Whose relationship will end first and they don't see it?",
  "Whose ex are you secretly still curious about?",
  "Who's the friend you'd never set up your single friend with — and why?",
  "Whose wedding would you skip if you were brave enough?",
  "Who in this room would absolutely break the group treaty first?",
];

const DARE_ROULETTE = [
  // ─── FRIENDS ───────────────────────────────────────────────────────────
  'Tell the most embarrassing thing that happened to you this month — sell it like it didn\'t bother you.',
  "Confess your guilty-pleasure song. Look us in the eye while you say it.",
  "What's the last thing you Googled that you'd be ashamed for someone to see?",
  "Imitate someone in your life — without saying who. Make us guess.",
  'Tell us about a time you cheated at something — could be a game, a test, anything.',
  "What's the dumbest argument you ever won?",
  "Describe your most cringe text exchange this year, word for word.",
  'Confess the worst rumor you ever spread (true or false).',
  'Read the last 3 messages in your most-recent DM out loud.',
  'Open Spotify on shuffle. Whatever plays, defend why it\'s actually a great song.',
  'Show the room the last selfie you took but never posted.',
  "Read your most recent voice note out loud — context included.",
  "Recreate a TikTok dance, badly, for 15 seconds.",
  'Send a one-word "thinking of you" text to your 5th most recent contact, no context.',
  'Show your most-used emoji and explain when you started using it that much.',
  "Show your phone screen time and defend the top app.",
  'Read your most embarrassing Notes app entry from the last year.',
  'Tell a 60-second story about your worst haircut.',
  'Imitate your boss / teacher / parent for 30 seconds.',
  'Describe the most petty grudge you currently hold.',
  'Tell us the worst gift you\'ve ever given someone — and what you said.',
  'Show your camera roll from this exact day last year. Explain.',
  'Describe a time you cried because of something extremely small.',
  'Send a screenshot of this game to the most random person in your contacts.',
  'Open your favorite delivery app and tell us your "saved" order.',
  'Show your most-used playlist title without renaming it first.',

  // ─── SPICY ─────────────────────────────────────────────────────────────
  'Tell us about a crush you had on someone in this room — past or present.',
  'Read the last text from your most recent ex, out loud.',
  'Describe the most awkward date you\'ve ever recovered from.',
  "Confess one thing you've lied about on a dating profile.",
];

const TWO_TRUTHS_ONE_LIE = [
  'Tell us three things about your week — two true, one made up. Sell the lie.',
  'Three places you say you\'ve been — but one of them is a lie.',
  'Three skills you claim to have — one is total cap. Convince us.',
  'Three foods you\'ve "tried" — one you\'re lying about.',
  'Three jobs you say you\'ve done — pick one to fake. Make it believable.',
  'Three concerts you\'ve "been to". One you\'ve only seen on YouTube.',
  'Three weird family traditions — one is invented. Sell it.',
  'Three injuries you\'ve had — one is dramatized.',
  'Three exes you\'ve had — one is fictional. Make us doubt all three.',
  'Three apps on your phone you "use every day" — one you opened once.',
  'Three things on your bucket list — two real, one obvious lie pretending hard.',
  'Three childhood pets — one is fake. Names matter.',
  'Three vacations you remember — one you\'re making up.',
  'Three nicknames people have called you — one is invented.',
  'Three school subjects you swear you aced — one is a stretch.',
  'Three conspiracies you "kind of" believe — one is a total bit.',
  'Three concerts on your bucket list — one is a band you can\'t name a song from.',
  'Three things in your fridge right now — one is invented.',
  'Three movies you "loved as a kid" — one you never watched.',
  'Three first dates you\'ve been on — one is fake. Be specific.',
  'Three phobias you have — one is invented for sympathy.',
  'Three jobs your parents had — one is wrong on purpose.',
  'Three dishes you can "actually cook" — one is delusional.',
  'Three TV finales you cried at — one you didn\'t watch.',
  'Three TikToks you\'ve saved — one is a pretend trend.',
  'Three text exchanges you\'ll defend forever — one is hypothetical.',
];

const COUPLES_QUIZ = [
  // ─── PG ───────────────────────────────────────────────────────────────
  "Do you actually love your partner's cooking, or have you been faking it?",
  "Have you ever lied about liking a hobby just because your partner does?",
  "Do you really not have a 'type' anymore?",
  "Are you actually fine with how chores are split, or just keeping the peace?",
  "Has your partner ever bought you a gift you secretly hated?",
  "Have you ever pretended to enjoy meeting their family?",
  "Have you ever lied about loving the show your partner picked tonight?",
  "Is the dishwasher 'argument' actually about the dishwasher?",
  "Do you really like their best friend, or do you tolerate them for love?",
  "Have you ever pretended a movie made you cry to seem more sensitive?",
  "Have you ever silently judged how they fold laundry?",
  "Do you actually love their morning routine, or have you been suffering?",
  "Have you ever lied about being 'fine' so the night wouldn't get ruined?",
  "Have you ever pretended to be okay with the temperature in this room?",
  "Have you ever told your partner their playlist was great and meant it?",
  "Are you really as 'over' your ex as you've claimed?",
  "Have you ever gone along with a vacation idea you secretly hated?",
  "Have you ever told your partner 'no it's nothing' when it was very much something?",
  "Do you have a small thing they do that secretly drives you up the wall?",
  "Have you ever pretended to enjoy a couples-friend hangout?",
  "Have you ever lied about how much screen time you had before bed?",
  "Do you really think their work outfit is 'fire' or have you been kind?",

  // ─── HONEST / SPICY ───────────────────────────────────────────────────
  "Have you ever fake-laughed at one of your partner's jokes — and which one?",
  "Have you ever read your partner's notification screen across the table?",
  "Have you ever stalked an ex while in this relationship?",
  "Have you ever liked a stranger's photo and panicked you'd get caught?",
  "Have you ever pretended you were already asleep when you weren't?",
  "Have you ever told your partner a friend hates them, when actually you do too?",
  "Have you ever told your partner 'we need to talk' just to scare them?",
  "Have you ever pretended to forget something so you didn't have to do it?",
  "Have you ever rated this relationship out of 10 in your head this week?",
  "Have you ever pretended to enjoy their family WhatsApp group?",
  "Have you ever screenshot one of their texts to show a friend?",
  "Have you ever lied about how the date is going right now?",
];

// -----------------------------------------------------------------------------
// GAME META
// -----------------------------------------------------------------------------

export const GAME_TYPES: Record<GameType, GameTypeMeta> = {
  truth_or_lie: {
    id: 'truth_or_lie',
    label: 'Truth or Lie',
    tagline: 'The classic. One question, type your answer, the AI calls your bluff.',
    detectorAngle: 'Claude reads your typed answer for hedging, defensive phrases, and tells. Friends vote on the verdict.',
    format: 'single_answer',
    defaultDurationMs: 30_000,
    audience: ['family', 'friends', 'couples'],
    questions: TRUTH_OR_LIE,
    verdictCopy: {
      high: 'Probably capping.',
      mid: 'On the fence.',
      low: 'Probably truth.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #5b6cf6 0%, #8b5cf6 60%, #f87171 100%)',
      accentClass: 'text-white/90',
      emoji: '🎙️',
      eyebrow: 'CLASSIC',
    },
  },
  never_have_i_ever: {
    id: 'never_have_i_ever',
    label: 'Never Have I Ever',
    tagline: 'Confess. Or pretend. The AI knows the difference.',
    detectorAngle: 'Vague denials leak in writing. Over-explanation reads guilty.',
    format: 'single_answer',
    defaultDurationMs: 20_000,
    audience: ['family', 'friends', 'couples'],
    questions: NEVER_HAVE_I_EVER,
    verdictCopy: {
      high: "You've absolutely done this.",
      mid: 'Suspicious denial.',
      low: 'Genuinely innocent (this time).',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 70%, #5b6cf6 100%)',
      accentClass: 'text-white/90',
      emoji: '🙈',
      eyebrow: 'CONFESS',
    },
  },
  most_likely_to: {
    id: 'most_likely_to',
    label: 'Most Likely To',
    tagline: 'Answer about yourself. Friends vote on who you really are.',
    detectorAngle: 'Self-assessment in writing reveals overconfident denial. Friends decide the rest.',
    format: 'single_answer',
    defaultDurationMs: 25_000,
    audience: ['friends', 'family'],
    questions: MOST_LIKELY_TO,
    verdictCopy: {
      high: "Yeah, that's you.",
      mid: 'Voters split.',
      low: 'Maybe not you.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #f87171 60%, #ec4899 100%)',
      accentClass: 'text-white/90',
      emoji: '👉',
      eyebrow: 'GROUP VOTE',
    },
  },
  would_you_rather: {
    id: 'would_you_rather',
    label: 'Would You Rather',
    tagline: 'Pick A or B. See how the world voted.',
    detectorAngle: 'Live percentages from every player who voted. See if you sided with the crowd or went rogue.',
    format: 'binary_choice',
    defaultDurationMs: 30_000,
    audience: ['family', 'friends', 'couples'],
    questions: WOULD_YOU_RATHER,
    verdictCopy: {
      high: "You don't actually mean that.",
      mid: 'Sort of believable.',
      low: 'Conviction confirmed.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
      accentClass: 'text-white/90',
      emoji: '⚖️',
      eyebrow: 'A or B',
    },
  },
  paranoia: {
    id: 'paranoia',
    label: 'Paranoia',
    tagline: 'Type the answer. The AI decides if you mean it.',
    detectorAngle: 'Writing secrets down spikes hedging — AI catches the tells.',
    format: 'single_answer',
    defaultDurationMs: 25_000,
    audience: ['friends'],
    questions: PARANOIA,
    verdictCopy: {
      high: 'You really meant that.',
      mid: 'Half-honest.',
      low: 'Diplomatic dodge.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 60%, #ec4899 100%)',
      accentClass: 'text-white/90',
      emoji: '👁️',
      eyebrow: 'WHISPER',
    },
  },
  dare_roulette: {
    id: 'dare_roulette',
    label: 'Dare Roulette',
    tagline: 'Random truth-dares. The AI sees if you\'re ducking the real answer.',
    detectorAngle: 'Avoidance language and vague phrasing expose dodging in writing.',
    format: 'single_answer',
    defaultDurationMs: 30_000,
    audience: ['friends'],
    questions: DARE_ROULETTE,
    verdictCopy: {
      high: 'You dodged that one.',
      mid: 'Half-truth detected.',
      low: 'Surprisingly honest.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #f87171 0%, #f59e0b 50%, #ef4444 100%)',
      accentClass: 'text-white/90',
      emoji: '🎲',
      eyebrow: 'CHAOS',
    },
  },
  two_truths_one_lie: {
    id: 'two_truths_one_lie',
    label: 'Two Truths & a Lie',
    tagline: 'Three statements. One is fake. Sell it well.',
    detectorAngle: 'AI watches for the statement that hedges or over-explains — that\'s the lie.',
    format: 'multi_statement',
    defaultDurationMs: 45_000,
    audience: ['friends', 'couples'],
    questions: TWO_TRUTHS_ONE_LIE,
    verdictCopy: {
      high: 'AI smelled the lie.',
      mid: 'AI is suspicious. Voters decide.',
      low: 'You sold it. AI bought it.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 60%, #84cc16 100%)',
      accentClass: 'text-white/90',
      emoji: '🃏',
      eyebrow: 'CALL THE BLUFF',
    },
  },
  couples_quiz: {
    id: 'couples_quiz',
    label: 'Couples Quiz',
    tagline: 'How honest are you really? Date night fuel.',
    detectorAngle: 'When the answer matters socially, your wording gives the truth away.',
    format: 'partner_question',
    defaultDurationMs: 30_000,
    audience: ['couples'],
    questions: COUPLES_QUIZ,
    verdictCopy: {
      high: 'Conversation needed.',
      mid: 'Healthy honesty.',
      low: 'Real talk. Respect.',
    },
    theme: {
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f87171 60%, #f59e0b 100%)',
      accentClass: 'text-white/90',
      emoji: '💞',
      eyebrow: 'DATE NIGHT',
    },
  },
};

export const ALL_GAME_TYPES = Object.values(GAME_TYPES);

export function getGameType(id: string | undefined | null): GameTypeMeta {
  if (!id) return GAME_TYPES.truth_or_lie;
  return (GAME_TYPES as Record<string, GameTypeMeta>)[id] ?? GAME_TYPES.truth_or_lie;
}

export function pickQuestionFor(typeId: GameType, exclude?: string): string {
  const pool = GAME_TYPES[typeId].questions;
  const filtered = exclude ? pool.filter((q) => q !== exclude) : pool;
  const list = filtered.length > 0 ? filtered : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export function gameTypesByAudience(audience: Audience): GameTypeMeta[] {
  return ALL_GAME_TYPES.filter((t) => t.audience.includes(audience));
}

/**
 * Where the "play" button on a game card should land. Most games use the
 * generic /jogo/novo recorder; would_you_rather has its own crowd-vote
 * experience at /wyr.
 */
export function gameTypeHref(
  typeId: GameType,
  opts: { audience?: Audience; locale?: 'en' | 'pt' } = {}
): string {
  const localeBase = opts.locale === 'en' ? '/game/new' : '/jogo/novo';
  if (typeId === 'would_you_rather') {
    return opts.audience ? `/wyr?audience=${opts.audience}` : '/wyr';
  }
  return opts.audience
    ? `${localeBase}?type=${typeId}&audience=${opts.audience}`
    : `${localeBase}?type=${typeId}`;
}

// -----------------------------------------------------------------------------
// WYR helpers — the structured catalog above powers the /wyr vote experience.
// -----------------------------------------------------------------------------

const WYR_BY_ID: Record<string, WYRPrompt> = Object.fromEntries(
  WYR_PROMPTS.map((p) => [p.id, p])
);

export function getWyrPrompt(id: string): WYRPrompt | null {
  return WYR_BY_ID[id] ?? null;
}

export function pickWyrPrompt(opts?: {
  exclude?: string;
  audience?: Audience;
}): WYRPrompt {
  const audience = opts?.audience;
  const pool = audience
    ? WYR_PROMPTS.filter((p) => p.audience === audience)
    : WYR_PROMPTS;
  const filtered = opts?.exclude
    ? pool.filter((p) => p.id !== opts.exclude)
    : pool;
  const list = filtered.length > 0 ? filtered : WYR_PROMPTS;
  return list[Math.floor(Math.random() * list.length)];
}

// =============================================================================
// END OF FILE — buffer comments to absorb any trailing NULL bytes that
// OneDrive sync sometimes injects when shrinking files. Leave this block.
// =============================================================================
