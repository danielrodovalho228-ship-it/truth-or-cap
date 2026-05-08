interface TextAnswerEvidenceProps {
  text: string;
  declaredAnswer: 'truth' | 'cap';
}

/**
 * Evidence display for text-mode games — replaces VideoEvidence.
 * The typed answer is the artifact under review; this renders it as a
 * tape-style transcript card matching the rest of the result page.
 */
export function TextAnswerEvidence({ text, declaredAnswer }: TextAnswerEvidenceProps) {
  return (
    <div className="relative bg-bg-card border-2 border-line overflow-hidden">
      <div className="ruler-marks absolute inset-0 opacity-10 pointer-events-none" />
      <div className="relative px-5 py-6">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Statement on the record ·{' '}
          <span className={declaredAnswer === 'truth' ? 'text-acid' : 'text-blood'}>
            {declaredAnswer.toUpperCase()}
          </span>
        </p>
        <p className="font-body text-base text-fg leading-relaxed whitespace-pre-wrap break-words">
          &ldquo;{text}&rdquo;
        </p>
      </div>
    </div>
  );
}
