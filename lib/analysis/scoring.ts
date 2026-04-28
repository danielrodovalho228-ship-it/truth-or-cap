import type { AnalysisReason } from '@/lib/types';
import type { VoiceAnalysis } from './voice';
import type { FaceAnalysis } from './face';
import type { LinguisticAnalysis } from './linguistic';

interface AggregateInput {
  voice: VoiceAnalysis | null;
  face: FaceAnalysis | null;
  linguistic: LinguisticAnalysis | null;
  duration_ms: number;
}

export interface AggregateOutput {
  susLevel: number;
  reasons: AnalysisReason[];
  confidence: 'low' | 'medium' | 'high';
  weights: { voice: number; face: number; linguistic: number };
}

const BASE_WEIGHTS = { voice: 0.35, face: 0.30, linguistic: 0.35 } as const;

/**
 * Combine partial analyses into a single SUS LEVEL. Handles graceful
 * degradation: if one provider fails, weights are renormalised across
 * the surviving inputs so we still produce a valid score.
 */
export function aggregateScore(input: AggregateInput): AggregateOutput {
  const { voice, face, linguistic, duration_ms } = input;

  // Renormalise weights based on which signals we actually got back.
  const present: Array<keyof typeof BASE_WEIGHTS> = [];
  if (voice) present.push('voice');
  if (face) present.push('face');
  if (linguistic) present.push('linguistic');

  const weights = { voice: 0, face: 0, linguistic: 0 };
  if (present.length === 0) {
    // Nothing came back. Bail to neutral 50.
    return { susLevel: 50, reasons: [], confidence: 'low', weights };
  }

  const totalBase = present.reduce((sum, key) => sum + BASE_WEIGHTS[key], 0);
  for (const key of present) {
    weights[key] = BASE_WEIGHTS[key] / totalBase;
  }

  const baseSus =
    (voice?.score ?? 0) * weights.voice +
    (face?.score ?? 0) * weights.face +
    (linguistic?.score ?? 0) * weights.linguistic;

  // Short clips have less signal — pull score toward neutral 50.
  const durationFactor = Math.min(1, duration_ms / 10_000);
  const susLevel = Math.round(baseSus * durationFactor + 50 * (1 - durationFactor));

  const reasons: AnalysisReason[] = [];

  if (voice) {
    if (voice.score > 60) {
      reasons.push({
        category: 'voice',
        signal: 'high voice tension',
        weight: voice.score / 100,
        description: 'Voice showed elevated stress markers',
      });
    } else if (voice.score < 30) {
      reasons.push({
        category: 'voice',
        signal: 'calm voice',
        weight: -voice.score / 100,
        description: 'Voice sounded relaxed and confident',
      });
    }
  }

  if (face) {
    if (face.score > 60) {
      reasons.push({
        category: 'face',
        signal: 'tense expressions',
        weight: face.score / 100,
        description: 'Facial expressions showed discomfort',
      });
    } else if (face.score < 30) {
      reasons.push({
        category: 'face',
        signal: 'composed expressions',
        weight: -face.score / 100,
        description: 'Facial expressions remained composed',
      });
    }
  }

  if (linguistic) {
    for (const s of linguistic.signals.slice(0, 2)) {
      reasons.push({
        category: 'language',
        signal: s.signal,
        weight: s.weight,
        description: s.evidence
          ? `"${s.evidence.slice(0, 80)}${s.evidence.length > 80 ? '…' : ''}"`
          : 'Pattern detected in speech',
      });
    }
  }

  const confidence: 'low' | 'medium' | 'high' =
    duration_ms < 5_000 ? 'low' :
    reasons.length < 2 ? 'low' :
    reasons.length < 4 ? 'medium' :
    'high';

  return {
    susLevel: Math.max(0, Math.min(100, susLevel)),
    reasons,
    confidence,
    weights,
  };
}
