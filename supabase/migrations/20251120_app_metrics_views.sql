-- Views for aggregating app_metrics
-- Created: 2025-11-20
-- Create views for `app_metrics` if the table exists. This avoids migration failures
-- when the views migration runs before the table migration in some deployment flows.
DO $$
BEGIN
  IF to_regclass('public.app_metrics') IS NOT NULL THEN
    -- Average elapsed time (ms) for matrix.initialize timers per user
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW public.view_avg_matrix_init_ms AS
      SELECT
        user_id,
        avg(((timer->>'end')::bigint - (timer->>'start')::bigint)) AS avg_init_ms,
        count(*) AS samples
      FROM public.app_metrics,
        jsonb_array_elements(metrics->'timers') AS t(timer)
      WHERE (timer->>'label') = 'matrix.initialize' AND (timer->>'end') IS NOT NULL
      GROUP BY user_id;
    $VIEW$;

    -- Count of failure events per user (events with name containing 'failure')
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW public.view_failure_counts AS
      SELECT
        user_id,
        sum(CASE WHEN (event->>'name') IS NOT NULL AND (event->>'name') LIKE '%failure%' THEN 1 ELSE 0 END) AS failure_count
      FROM public.app_metrics,
        jsonb_array_elements(metrics->'events') AS e(event)
      GROUP BY user_id;
    $VIEW$;

    -- Last upload timestamp per user
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW public.view_last_upload_per_user AS
      SELECT
        user_id,
        max(created_at) as last_upload_at,
        count(*) as uploads
      FROM public.app_metrics
      GROUP BY user_id;
    $VIEW$;

    -- Simple activity: number of snapshots per day
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW public.view_metrics_daily_counts AS
      SELECT
        date_trunc('day', created_at) as day,
        count(*) as snapshots
      FROM public.app_metrics
      GROUP BY date_trunc('day', created_at)
      ORDER BY day DESC;
    $VIEW$;
  END IF;
END
$$;
