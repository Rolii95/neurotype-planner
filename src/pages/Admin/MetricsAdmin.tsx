import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { db } from '../../services/supabase';

interface AvgInitRow { user_id: string | null; avg_init_ms: number | null; samples: number }
interface FailureRow { user_id: string | null; failure_count: number }
interface UploadRow { user_id: string | null; last_upload_at: string | null; uploads: number }
interface DailyRow { day: string; snapshots: number }

const MetricsAdmin: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [avgInit, setAvgInit] = useState<AvgInitRow[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: a }, { data: f }, { data: u }, { data: d }] = await Promise.all([
          db.from('view_avg_matrix_init_ms').select('*'),
          db.from('view_failure_counts').select('*'),
          db.from('view_last_upload_per_user').select('*'),
          db.from('view_metrics_daily_counts').select('*').limit(30),
        ]);
        if (!mounted) return;
        setAvgInit(a || []);
        setFailures(f || []);
        setUploads(u || []);
        setDaily(d || []);
      } catch (err) {
        console.error('Failed to load metrics views', err);
        setError(String((err as any)?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (error) return <div className="p-6 text-red-600">Error loading metrics: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Metrics</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Average Matrix Init (ms)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left"><th>User</th><th>Avg Init (ms)</th><th>Samples</th></tr>
          </thead>
          <tbody>
            {avgInit.map(r => (
              <tr key={r.user_id ?? Math.random()} className="border-t"><td className="py-2">{r.user_id ?? 'anon'}</td><td>{r.avg_init_ms?.toFixed(0) ?? '-'}</td><td>{r.samples}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Failure Counts</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left"><th>User</th><th>Failures</th></tr>
          </thead>
          <tbody>
            {failures.map(r => (
              <tr key={r.user_id ?? Math.random()} className="border-t"><td className="py-2">{r.user_id ?? 'anon'}</td><td>{r.failure_count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Last Uploads</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left"><th>User</th><th>Last Upload</th><th>Uploads</th></tr>
          </thead>
          <tbody>
            {uploads.map(r => (
              <tr key={r.user_id ?? Math.random()} className="border-t"><td className="py-2">{r.user_id ?? 'anon'}</td><td>{r.last_upload_at ?? '-'}</td><td>{r.uploads}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Snapshots (daily)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left"><th>Day</th><th>Snapshots</th></tr>
          </thead>
          <tbody>
            {daily.map(r => (
              <tr key={r.day} className="border-t"><td className="py-2">{new Date(r.day).toLocaleDateString()}</td><td>{r.snapshots}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default MetricsAdmin;
