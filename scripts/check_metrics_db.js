const { Client } = require('pg');

(async function(){
  const conn = process.env.DB_URL;
  if (!conn) {
    console.error('DB_URL environment variable not set');
    process.exit(2);
  }

  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    const checks = [
      { type: 'table', name: 'app_metrics' },
      { type: 'view', name: 'view_avg_matrix_init_ms' },
      { type: 'view', name: 'view_failure_counts' },
      { type: 'view', name: 'view_last_upload_per_user' },
      { type: 'view', name: 'view_metrics_daily_counts' },
    ];

    for (const ch of checks) {
      if (ch.type === 'table') {
        const res = await client.query("SELECT to_regclass('public." + ch.name + "') as found");
        console.log(ch.type, ch.name, !!res.rows[0].found);
      } else {
        const res = await client.query("select count(*)::int as cnt from pg_views where schemaname='public' and viewname='" + ch.name + "'");
        console.log(ch.type, ch.name, res.rows[0].cnt > 0);
      }
    }

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error checking DB:', err);
    process.exit(1);
  }
})();
