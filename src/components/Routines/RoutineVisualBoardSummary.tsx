import React from 'react';

interface Props {
  title?: string;
  steps?: number;
  lastRun?: string | null;
}

export const RoutineVisualBoardSummary: React.FC<Props> = ({ title = 'Routine', steps = 0, lastRun = null }) => {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-gray-500">{steps} steps</span>
      </div>
      <div className="text-sm text-gray-600">Last run: {lastRun ?? '—'}</div>
    </div>
  );
};

export default RoutineVisualBoardSummary;
