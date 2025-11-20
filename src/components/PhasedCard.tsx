import React from 'react';
import type { Phase } from '../hooks/usePhasedView';

interface Props {
  phase: Phase;
  skeleton: React.ReactNode;
  summary: React.ReactNode;
  children: React.ReactNode; // full content
  onPromote?: (phase: Phase) => void;
  className?: string;
}

export const PhasedCard: React.FC<Props> = ({ phase, skeleton, summary, children, onPromote, className }) => {
  return (
    <div className={className} tabIndex={0}>
      {phase === 'skeleton' && (
        <div>
          {skeleton}
          <div className="mt-2 text-center text-xs text-gray-500">Loading…</div>
        </div>
      )}

      {phase === 'summary' && (
        <div>
          {summary}
          <div className="mt-2 flex gap-2 justify-end">
            <button
              onClick={() => onPromote?.('full')}
              className="text-sm bg-blue-600 text-white py-1 px-3 rounded"
            >
              Open full view
            </button>
          </div>
        </div>
      )}

      {phase === 'full' && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
};

export default PhasedCard;
