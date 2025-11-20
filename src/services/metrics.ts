type Timer = {
  id: string;
  label: string;
  start: number;
  end?: number;
  meta?: any;
};

const timers = new Map<string, Timer>();
const counters: Record<string, number> = {};
const events: Array<{ name: string; time: string; payload?: any }> = [];

function nowMs() { return Date.now(); }

// Persistence / Upload support (opt-in)
import { db, getCurrentUserId, isSupabaseDemoMode } from './supabase';

// Edge function URL (optional). Prefer function endpoint to avoid direct DB writes from client.
const RECEIVE_METRICS_URL = import.meta.env.VITE_RECEIVE_METRICS_URL as string | undefined;

const UPLOAD_FLAG_KEY = 'metrics.upload.opt_in';
const LAST_UPLOAD_KEY = 'metrics.last_upload_at';
const MIN_UPLOAD_INTERVAL_MS = 1000 * 60 * 10; // 10 minutes
let uploadIntervalHandle: number | null = null;

async function uploadSnapshot() {
  try {
    const optIn = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(UPLOAD_FLAG_KEY) === '1';
    if (!optIn) return { ok: false, reason: 'opt-out' };
    if (!db) return { ok: false, reason: 'no-db' };
    if (isSupabaseDemoMode) return { ok: false, reason: 'demo-mode' };

    const last = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(LAST_UPLOAD_KEY) : null;
    if (last) {
      const lastTs = new Date(last).getTime();
      if (Date.now() - lastTs < MIN_UPLOAD_INTERVAL_MS) return { ok: false, reason: 'rate-limited' };
    }

    const snapshot = getMetrics();
    const userId = await getCurrentUserId();

    // Prefer posting to Edge Function endpoint if configured
    if (RECEIVE_METRICS_URL) {
      try {
        const res = await fetch(RECEIVE_METRICS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, metrics: snapshot }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          recordEvent('metrics.upload.failure', { status: res.status, text });
          return { ok: false, reason: 'function-error', status: res.status, text };
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LAST_UPLOAD_KEY, new Date().toISOString());
        }
        recordEvent('metrics.upload.success', { uploadedBy: userId ?? 'anonymous', via: 'function' });
        return { ok: true };
      } catch (e) {
        recordEvent('metrics.upload.failure', { error: (e instanceof Error ? e.message : e), via: 'function' });
        // fallthrough to DB fallback if available
      }
    }

    // Fallback: directly insert into DB (legacy). This requires db client and is less secure.
    if (db) {
      try {
        await db.from('app_metrics').insert({ user_id: userId, metrics: snapshot, source: 'client' });
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LAST_UPLOAD_KEY, new Date().toISOString());
        }
        recordEvent('metrics.upload.success', { uploadedBy: userId ?? 'anonymous', via: 'db' });
        return { ok: true };
      } catch (e) {
        recordEvent('metrics.upload.failure', { error: (e instanceof Error ? e.message : e), via: 'db' });
        return { ok: false, reason: 'db-insert-failed', error: e };
      }
    }

    return { ok: false, reason: 'no-endpoint-or-db' };
  } catch (err) {
    recordEvent('metrics.upload.error', { error: (err instanceof Error ? err.message : err) });
    return { ok: false, reason: 'exception', error: err };
  }
}

export function enablePersistentUpload(enable: boolean, intervalMs = MIN_UPLOAD_INTERVAL_MS) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    if (enable) {
      window.localStorage.setItem(UPLOAD_FLAG_KEY, '1');
      // immediate attempt
      uploadSnapshot().catch(() => {});
      // schedule periodic uploads
      if (uploadIntervalHandle) clearInterval(uploadIntervalHandle);
      uploadIntervalHandle = window.setInterval(() => {
        uploadSnapshot().catch(() => {});
      }, Math.max(intervalMs, MIN_UPLOAD_INTERVAL_MS));
    } else {
      window.localStorage.removeItem(UPLOAD_FLAG_KEY);
      if (uploadIntervalHandle) {
        clearInterval(uploadIntervalHandle);
        uploadIntervalHandle = null;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function uploadMetricsNow() {
  return uploadSnapshot();
}

export function startTimer(label: string, meta?: any) {
  const id = `${label}:${crypto.randomUUID()}`;
  timers.set(id, { id, label, start: nowMs(), meta });
  return id;
}

export function endTimer(id: string, payload?: any) {
  const t = timers.get(id);
  if (!t) return null;
  t.end = nowMs();
  const elapsed = t.end - t.start;
  // emit an event for convenience
  recordEvent(`${t.label}.timer`, { id: t.id, elapsed, meta: t.meta, payload });
  // keep timer for inspection
  return { id: t.id, label: t.label, elapsed, meta: t.meta };
}

export function incrementCounter(name: string, delta = 1) {
  counters[name] = (counters[name] || 0) + delta;
}

export function recordEvent(name: string, payload?: any) {
  try {
    events.push({ name, time: new Date().toISOString(), payload });
  } catch (e) {
    // ignore
  }
}

export function getMetrics() {
  return {
    counters: { ...counters },
    events: events.slice(-500),
    timers: Array.from(timers.values()).slice(-200),
    timestamp: new Date().toISOString(),
  };
}

export function resetMetrics() {
  timers.clear();
  for (const k of Object.keys(counters)) delete counters[k];
  events.length = 0;
}

// Expose simple DevTools helper
if (typeof window !== 'undefined') {
  try {
    (window as any).__metrics = {
      startTimer,
      endTimer,
      incrementCounter,
      recordEvent,
      getMetrics,
      resetMetrics,
    };
  } catch (e) {
    // noop
  }
}

export default {
  startTimer,
  endTimer,
  incrementCounter,
  recordEvent,
  getMetrics,
  resetMetrics,
};
