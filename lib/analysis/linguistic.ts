import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const claude = apiKey ? new Anthropic({ apiKey }) : null;

export interface LinguisticSignal {
  signal: string;
  weight: number;
  evidence: string;
}

export interface LinguisticAnalysis {
  score: number;
  signals: LinguisticSignal[];
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM_PROMPT = 'You are a linguistic analyst evaluating verbal cues in a spoken response. This is for an entertainment game called "Truth or Cap" - output a fun "sus level" score, NOT a real lie detection verdict.\n\nAnalyze for these linguistic signals:\n1. Hedging language ("maybe", "kind of", "I think")\n2. Excessive qualifiers / over-explanation\n3. Distancing language (avoiding "I", using passive voice)\n4. Inconsistencies in details\n5. Defensive phrases ("honestly", "to be honest", "trust me")\n6. Tense shifts (past -> present unexpectedly)\n7. Lack of specific details\n8. Repetition / hesitation markers ("um", "uh", "you know")\n\nOutput JSON ONLY (no preamble, no code fences):\n{ "score": <0-100>, "signals": [ {"signal": "hedging", "weight": 0.0-1.0, "evidence": "exact quote"} ] }\n\nIf the transcription is empty or too short to analyze, return {"score": 0, "signals": []}.';

export async function analyzeLinguistic(input: {
  transcription: string;
  question: string;
  declaredAnswer: 'truth' | 'cap';
}): Promise<LinguisticAnalysis> {
  if (!claude) throw new Error('ANTHROPIC_API_KEY not configured');

  if (!input.transcription || input.transcription.trim().length < 5) {
    return { score: 0, signals: [], inputTokens: 0, outputTokens: 0 };
  }

  const userMessage =
    'Question asked: "' + input.question + '"\n' +
    'Speaker declared their answer is: ' + input.declaredAnswer.toUpperCase() + '\n' +
    'Transcription of their response: "' + input.transcription + '"\n\n' +
    'Analyze and respond with JSON only.';

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  const block = response.content[0];
  const text = block?.type === 'text' ? block.text : '{}';
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as { score?: number; signals?: LinguisticSignal[] };
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 5) : [],
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    console.error('[linguistic] JSON parse failed:', err);
    return { score: 0, signals: [], inputTokens, outputTokens };
  }
}
