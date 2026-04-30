// Question pool for /game/new. PG-13 max — App Store reviewers reject
// content involving drugs, violence, or sexual material, so we keep things
// in the "everyday awkward" zone.
//
// Pull a random one with `pickRandomQuestion()`, OR use the index helpers
// to power a "↻ different question" reroll button.

export const CHALLENGE_QUESTIONS: ReadonlyArray<string> = [
  "Have you ever lied about reading a book everyone's talking about?",
  'Have you ever pretended to laugh at a joke you didn’t get?',
  "Have you ever ghosted someone and then run into them in person?",
  "Did you actually finish the last show you said you finished?",
  "Have you ever lied about being sick to skip something?",
  "Have you ever looked up an ex on social media this week?",
  "Have you ever pretended to know a song while singing along?",
  "Have you ever taken credit for someone else's idea at work or school?",
  "Have you ever lied about how much you spent on something?",
  "Have you ever said “on my way” when you hadn’t left yet?",
  "Have you ever finished a snack you bought to share, before sharing it?",
  "Have you ever tagged someone in a photo just to make them jealous?",
  "Have you ever lied about your age — to anyone, ever?",
  "Have you ever sent a screenshot of a conversation to a third person today?",
  "Have you ever pretended to like a gift in front of the person who gave it to you?",
];

export function pickRandomQuestion(exclude?: string): string {
  const pool = exclude
    ? CHALLENGE_QUESTIONS.filter((q) => q !== exclude)
    : CHALLENGE_QUESTIONS;
  const i = Math.floor(Math.random() * pool.length);
  return pool[i];
}

export function questionAt(index: number): string {
  return CHALLENGE_QUESTIONS[index % CHALLENGE_QUESTIONS.length];
}
