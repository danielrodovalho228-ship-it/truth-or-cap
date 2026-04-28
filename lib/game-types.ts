// =============================================================================
// Game-type catalog — based on truthorcapapp.com production lineup, every
// game uses the same Whisper + Hume + Claude detector pipeline (M04). Each
// game type seeds different questions, durations, and verdict copy.
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
}

// -----------------------------------------------------------------------------
// QUESTION POOLS — each tuned to the game's vibe.
// -----------------------------------------------------------------------------

const TRUTH_OR_LIE = [
  "Tell us something you've never told your closest friend.",
  "Have you ever lied about reading a book everyone's talking about?",
  "Have you ever pretended to laugh at a joke you didn't get?",
  "Did you actually finish the last show you said you finished?",
  "Have you ever lied about being sick to skip something?",
  "Have you ever ghosted someone and then run into them in person?",
  "Have you ever taken credit for someone else's idea?",
  "Have you ever said \"on my way\" when you hadn't left yet?",
  "Have you ever lied about how much you spent on something?",
  "Did you actually go to the gym this week, or just say you did?",
];

const NEVER_HAVE_I_EVER = [
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
];

const MOST_LIKELY_TO = [
  'Who in your group is most likely to ghost a date?',
  'Who is most likely to lie about how much they spent on a vacation?',
  'Who is most likely to fake-laugh at a bad joke just to be polite?',
  'Who is most likely to claim they exercise more than they actually do?',
  "Who is most likely to say \"on my way\" before they've put on shoes?",
  "Who is most likely to forget a friend's birthday and lie about it?",
  'Who is most likely to read a self-help book and pretend to apply it?',
  "Who is most likely to call in sick when they aren't?",
  'Who is most likely to embellish a story to make themselves look better?',
];

const WOULD_YOU_RATHER = [
  "Would you rather lose your phone for a week, or lose every photo on it forever? Pick one and explain.",
  "Would you rather be famous for something embarrassing, or unknown for something amazing?",
  "Would you rather always be 30 minutes late, or always 30 minutes early?",
  "Would you rather know when you'll die, or how you'll die?",
  "Would you rather read minds for a day, or be invisible for a day?",
  "Would you rather give up coffee or give up social media for a year?",
  "Would you rather have everyone always tell you the truth, or be able to lie convincingly to anyone?",
  "Would you rather forget the last 5 years of your life, or be unable to remember anything new for 5 years?",
];

const PARANOIA = [
  "Who in this room would you trust LEAST with your phone unlocked?",
  "Of everyone you know, who do you think gossips about you the most?",
  "Who is the friend you'd be most surprised to find out is actually rich?",
  "Who would you call first if you got arrested?",
  "Who in your friend group has the worst hidden secret?",
  "Who in your life would survive a zombie apocalypse the longest? Why are you sure?",
  "Who's the one person you've fake-laughed for the most this year?",
  "Who do you think pretends to like you but actually doesn't?",
];

const DARE_ROULETTE = [
  'Tell the most embarrassing thing that happened to you this month — sell it like it didn\'t bother you.',
  "Confess your guilty-pleasure song. Look us in the eye while you say it.",
  "What's the last thing you Googled that you'd be ashamed for someone to see?",
  "Imitate someone in your life — without saying who. Make us guess.",
  'Tell us about a time you cheated at something — could be a game, a test, anything.',
  "What's the dumbest argument you ever won?",
  "Describe your most cringe text exchange this year, word for word.",
  'Confess the worst rumor you ever spread (true or false).',
];

const TWO_TRUTHS_ONE_LIE = [
  'Tell us three things about your week — two true, one made up. Sell the lie.',
  'Three places you say you\'ve been — but one of them is a lie.',
  'Three skills you claim to have — one is total cap. Convince us.',
  'Three foods you\'ve "tried" — one you\'re lying about.',
  'Three jobs you say you\'ve done — pick one to fake. Make it believable.',
];

const COUPLES_QUIZ = [
  "Do you actually love your partner's cooking, or have you been faking it?",
  "Have you ever lied about liking a hobby just because your partner does?",
  "Do you really not have a 'type' anymore?",
  "Are you actually fine with how chores are split, or just keeping the peace?",
  "Has your partner ever bought you a gift you secretly hated?",
  "Have you ever pretended to enjoy meeting their family?",
];

// -----------------------------------------------------------------------------
// GAME META
// -----------------------------------------------------------------------------

export const GAME_TYPES: Record<GameType, GameTypeMeta> = {
  truth_or_lie: {
    id: 'truth_or_lie',
    label: 'Truth or Lie',
    tagline: 'The classic. One question, 30 seconds, the AI calls your bluff.',
    detectorAngle: 'Voice tension + facial micro-expressions + linguistic hedging combine into your SUS LEVEL.',
    format: 'single_answer',
    defaultDurationMs: 30_000,
    audience: ['family', 'friends', 'couples'],
    questions: TRUTH_OR_LIE,
    verdictCopy: {
      high: 'Probably capping.',
      mid: 'On the fence.',
      low: 'Probably truth.',
    },
  },
  never_have_i_ever: {
    id: 'never_have_i_ever',
    label: 'Never Have I Ever',
    tagline: 'Confess. Or pretend. The AI knows the difference.',
    detectorAngle: 'Denial under pressure leaks in micro-expressions. Hesitation = guilt.',
    format: 'single_answer',
    defaultDurationMs: 20_000,
    audience: ['family', 'friends', 'couples'],
    questions: NEVER_HAVE_I_EVER,
    verdictCopy: {
      high: "You've absolutely done this.",
      mid: 'Suspicious denial.',
      low: 'Genuinely innocent (this time).',
    },
  },
  most_likely_to: {
    id: 'most_likely_to',
    label: 'Most Likely To',
    tagline: 'Answer about yourself. Friends vote on who you really are.',
    detectorAngle: 'Self-assessment under camera = nerves leak. AI flags overconfident denial.',
    format: 'single_answer',
    defaultDurationMs: 25_000,
    audience: ['friends', 'family'],
    questions: MOST_LIKELY_TO,
    verdictCopy: {
      high: "Yeah, that's you.",
      mid: 'Voters split.',
      low: 'Maybe not you.',
    },
  },
  would_you_rather: {
    id: 'would_you_rather',
    label: 'Would You Rather',
    tagline: 'Pick A or B. Then defend it. AI judges if you actually mean it.',
    detectorAngle: 'When you defend a choice you don\'t actually believe, hedging language spikes.',
    format: 'binary_choice',
    defaultDurationMs: 30_000,
    audience: ['family', 'friends', 'couples'],
    questions: WOULD_YOU_RATHER,
    verdictCopy: {
      high: "You don't actually mean that.",
      mid: 'Sort of believable.',
      low: 'Conviction confirmed.',
    },
  },
  paranoia: {
    id: 'paranoia',
    label: 'Paranoia',
    tagline: 'Whisper the answer. The AI decides if you mean it.',
    detectorAngle: 'Speaking secrets out loud spikes nervousness — AI catches the tells.',
    format: 'single_answer',
    defaultDurationMs: 25_000,
    audience: ['friends'],
    questions: PARANOIA,
    verdictCopy: {
      high: 'You really meant that.',
      mid: 'Half-honest.',
      low: 'Diplomatic dodge.',
    },
  },
  dare_roulette: {
    id: 'dare_roulette',
    label: 'Dare Roulette',
    tagline: 'Random truth-dares. The AI sees if you\'re ducking the real answer.',
    detectorAngle: 'Avoidance language and pause patterns expose dodging.',
    format: 'single_answer',
    defaultDurationMs: 30_000,
    audience: ['friends'],
    questions: DARE_ROULETTE,
    verdictCopy: {
      high: 'You dodged that one.',
      mid: 'Half-truth detected.',
      low: 'Surprisingly honest.',
    },
  },
  two_truths_one_lie: {
    id: 'two_truths_one_lie',
    label: 'Two Truths & a Lie',
    tagline: 'Three statements. One is fake. Sell it well.',
    detectorAngle: 'AI watches for the moment your face/voice shifts mid-sentence — that\'s the lie.',
    format: 'multi_statement',
    defaultDurationMs: 45_000,
    audience: ['friends', 'couples'],
    questions: TWO_TRUTHS_ONE_LIE,
    verdictCopy: {
      high: 'AI smelled the lie.',
      mid: 'AI is suspicious. Voters decide.',
      low: 'You sold it. AI bought it.',
    },
  },
  couples_quiz: {
    id: 'couples_quiz',
    label: 'Couples Quiz',
    tagline: 'How honest are you really? Date night fuel.',
    detectorAngle: 'When the answer matters socially, micro-expressions speak louder than words.',
    format: 'partner_question',
    defaultDurationMs: 30_000,
    audience: ['couples'],
    questions: COUPLES_QUIZ,
    verdictCopy: {
      high: 'Conversation needed.',
      mid: 'Healthy honesty.',
      low: 'Real talk. Respect.',
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

// =============================================================================
// END OF FILE — buffer comments to absorb any trailing NULL bytes that
// OneDrive sync sometimes injects when shrinking files. Leave this block.
// =============================================================================
