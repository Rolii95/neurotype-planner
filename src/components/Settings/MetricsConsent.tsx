import React, { useEffect, useState } from 'react';
import { enablePersistentUpload, uploadMetricsNow, getMetrics } from '../../services/metrics';

const UPLOAD_FLAG_KEY = 'metrics.upload.opt_in';

export const MetricsConsent: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(UPLOAD_FLAG_KEY) === '1';
    } catch (e) {
      return false;
    }
  });
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    // ensure metrics module is synced with localStorage
    try {
      enablePersistentUpload(enabled);
    } catch (e) {
      // ignore
    }
  }, [enabled]);

  const onToggle = () => {
    const next = !enabled;
    try {
      const ok = enablePersistentUpload(next);
      if (ok) {
        setEnabled(next);
      } else {
        setLastResult('Failed to change setting');
      }
    } catch (e) {
      setLastResult('Error toggling setting');
    }
  };

  const onUploadNow = async () => {
    try {
      setLastResult('Uploading...');
      const res: any = await uploadMetricsNow();
      if (res && res.ok) {
        setLastResult('Upload successful');
      } else {
        setLastResult(`Upload skipped: ${res?.reason ?? 'unknown'}`);
      }
    } catch (e) {
      setLastResult('Upload failed');
    }
  };

  const onShowSnapshot = () => {
    try {
      // getMetrics isn't exported directly from metrics via window.__metrics, but we can try
      // @ts-ignore
      const snap = (window as any).__metrics?.getMetrics ? (window as any).__metrics.getMetrics() : null;
      if (snap) {
        // open a new window with formatted JSON
        const w = window.open('', '_blank');
        if (w) {
          w.document.title = 'Metrics Snapshot';
          w.document.body.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word">${JSON.stringify(snap, null, 2)}</pre>`;
        }
      } else {
        setLastResult('No snapshot available');
      }
    } catch (e) {
      setLastResult('Failed to get snapshot');
    }
  };

  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">Help improve the app (optional)</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Opt in to upload anonymized performance metrics to help diagnose issues like slow cache hydration and sync failures.</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <label className="inline-flex items-center">
            <input type="checkbox" checked={enabled} onChange={onToggle} className="mr-2" />
            <span className="text-sm">Upload metrics</span>
          </label>
          <div className="flex gap-2 mt-2">
            <button onClick={onUploadNow} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Upload now</button>
            <button onClick={onShowSnapshot} className="px-3 py-2 rounded-lg border">View snapshot</button>
          </div>
        </div>
      </div>
      {lastResult && <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{lastResult}</div>}
    </div>
  );
};

export default MetricsConsent;
