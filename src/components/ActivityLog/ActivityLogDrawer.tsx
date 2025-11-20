import React, { useState } from 'react';
import { useActivityLog } from '../../contexts/ActivityLogContext';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const ActivityLogDrawer: React.FC = () => {
  const { activities, clear } = useActivityLog();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700"
          aria-label="Open activity log"
          title="Activity log"
        >
          <ClockIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Activity</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-60 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="ml-auto w-full max-w-md bg-white h-full shadow-2xl p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Activity log drawer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { clear(); }} className="text-sm text-red-600">Clear</button>
                <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100" aria-label="Close activity log">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activities.length === 0 && <div className="text-sm text-gray-500">No recent activity.</div>}
              {activities.map((a) => (
                <div key={a.id} className="p-3 rounded border bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{a.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(a.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-gray-400">{a.type}</div>
                  </div>
                  {a.meta && <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(a.meta, null, 2)}</pre>}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default ActivityLogDrawer;
