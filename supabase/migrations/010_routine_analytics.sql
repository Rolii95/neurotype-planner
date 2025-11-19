-- Routine analytics view to drive dashboard hero stats
DROP VIEW IF EXISTS routine_analytics_view;

CREATE VIEW routine_analytics_view AS
WITH routine_stats AS (
  SELECT
    user_id,
    COUNT(*) AS total_routines,
    COALESCE(SUM(total_duration), 0) AS total_minutes,
    COUNT(DISTINCT DATE(started_at)) AS days_tracked,
    MAX(DATE(started_at)) AS last_tracked_date
  FROM routine_executions
  GROUP BY user_id
),
step_stats AS (
  SELECT
    re.user_id,
    COUNT(*) FILTER (WHERE se.status = 'completed') AS total_steps,
    COALESCE(SUM(COALESCE(se.actual_duration, 0)), 0) AS total_step_minutes
  FROM step_executions se
  INNER JOIN routine_executions re ON re.id = se.routine_execution_id
  GROUP BY re.user_id
)
SELECT
  rs.user_id,
  rs.total_routines,
  COALESCE(ss.total_steps, 0) AS total_steps,
  rs.total_minutes,
  COALESCE(ss.total_step_minutes, 0) AS total_step_minutes,
  rs.days_tracked,
  rs.last_tracked_date
FROM routine_stats rs
LEFT JOIN step_stats ss ON ss.user_id = rs.user_id;

-- Grant usage via existing RLS policies on the underlying tables
GRANT SELECT ON routine_analytics_view TO authenticated;
