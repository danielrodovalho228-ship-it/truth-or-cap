interface QuestionTapeProps {
  username: string;
  question: string;
  declaredAnswer: 'truth' | 'cap';
  createdAt: string;
}

export function QuestionTape({ username, question, declaredAnswer, createdAt }: QuestionTapeProps) {
  const date = new Date(createdAt);
  const formatted = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="px-6 pt-6 pb-4">
      <div className="tape-stripes h-1 w-32 mb-4" />
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-1">
        @{username} · {formatted}
      </p>
      <h1 className="font-display text-3xl md:text-4xl font-black leading-[0.95] mb-3">
        &ldquo;{question}&rdquo;
      </h1>
      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
        They claim:{' '}
        <span className={declaredAnswer === 'truth' ? 'text-acid' : 'text-blood'}>
          {declaredAnswer.toUpperCase()}
        </span>
      </p>
    </header>
  );
}
