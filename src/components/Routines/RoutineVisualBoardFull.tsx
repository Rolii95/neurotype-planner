import React, { useEffect } from 'react';

// Heavy full visual board: place DnD/Recharts imports here to keep bundle separate
const RoutineVisualBoardFull: React.FC = () => {
  useEffect(() => {
    // Placeholder for initialization logic (hydrate, init DnD, etc.)
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="text-sm text-gray-500">Full routine board (heavy UI) — lazy loaded.</div>
      {/* Replace with actual DnD grid and controls. */}
    </div>
  );
};

export default RoutineVisualBoardFull;
