import React from 'react';

export const RoutineVisualBoardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border rounded-lg bg-white animate-pulse">
      <div className="h-6 bg-gray-200 rounded mb-3" />
      <div className="h-40 bg-gray-200 rounded" />
    </div>
  );
};

export default RoutineVisualBoardSkeleton;
