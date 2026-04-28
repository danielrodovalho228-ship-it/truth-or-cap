import { requireUser } from '@/lib/auth/guard';
import { VoiceClient } from './VoiceClient';

const NEUTRAL_PHRASE =
  'I am calibrating my voice for the AI detector. The weather is fine. I had cereal for breakfast. My favorite color is blue.';

export default async function VoicePage() {
  await requireUser('/onboarding/voice');

  return (
    <main className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
        STEP 04 — CALIBRATION
      </p>

      <h1 className="font-display text-5xl md:text-6xl font-black leading-[0.9] tracking-tight mb-4">
        Train the AI on<br />
        <span className="italic font-light">your normal voice.</span>
      </h1>

      <p className="font-body text-base text-fg-muted leading-relaxed mb-6 max-w-sm">
        15 seconds. Read this calmly. The detector personalizes — the more it knows your baseline, the
        better it spots when you&apos;re capping.
      </p>

      <div className="border-l-2 border-tape pl-4 py-2 mb-6">
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
          Read this calmly
        </p>
        <p className="font-display text-xl leading-snug">&ldquo;{NEUTRAL_PHRASE}&rdquo;</p>
      </div>

      <VoiceClient />

      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center mt-auto pt-6">
        Audio is private · Used only for personalization
      </p>
    </main>
  );
}
