'use client';

import { motion } from 'framer-motion';
import type { AnalysisReason } from '@/lib/types';

interface EvidenceCardProps {
  reason: AnalysisReason;
  index: number;
}

const CATEGORY_LABEL: Record<AnalysisReason['category'], string> = {
  voice: 'Voice',
  face: 'Face',
  language: 'Language',
  consistency: 'Consistency',
};

export function EvidenceCard({ reason, index }: EvidenceCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 2.6 + index * 0.12, duration: 0.4 }}
      className="border-l-2 border-mustard pl-4 py-2"
    >
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-1">
        {CATEGORY_LABEL[reason.category]} · weight {Math.abs(reason.weight).toFixed(2)}
      </p>
      <p className="font-display text-base leading-snug">{reason.signal}</p>
      {reason.description ? (
        <p className="font-body text-xs text-fg-muted mt-1 leading-snug">{reason.description}</p>
      ) : null}
    </motion.li>
  );
}
