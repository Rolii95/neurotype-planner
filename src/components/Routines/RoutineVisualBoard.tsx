import React, { Suspense, useMemo } from 'react';
import { PhasedCard } from '../PhasedCard';
import { usePhasedView } from '../../hooks/usePhasedView';
import RoutineVisualBoardSkeleton from './RoutineVisualBoardSkeleton';
import RoutineVisualBoardSummary from './RoutineVisualBoardSummary';

const RoutineVisualBoardFull = React.lazy(() => import('./RoutineVisualBoardFull'));

interface Props {
  routineId?: string;
  storageKey?: string;
}

export const RoutineVisualBoard: React.FC<Props> = ({ routineId, storageKey = 'routineViewPhase' }) => {
  const { currentPhase, promotePhase, attachRef, onFocus } = usePhasedView({ storageKey, initial: 'skeleton' });

  // In a real app, summary data would come from a cached selector/store. Keep minimal here.
  const summaryData = useMemo(() => ({ title: 'My Routine', steps: 6, lastRun: '2 days ago' }), []);

  return (
    <div ref={attachRef as any} onFocus={onFocus}>
      <PhasedCard
        phase={currentPhase}
        skeleton={<RoutineVisualBoardSkeleton />}
        summary={<RoutineVisualBoardSummary {...summaryData} />}
        onPromote={(p) => promotePhase(p)}
      >
        <Suspense fallback={<div className="p-4">Loading board…</div>}>
          <RoutineVisualBoardFull />
        </Suspense>
      </PhasedCard>
    </div>
  );
};

export default RoutineVisualBoard;
