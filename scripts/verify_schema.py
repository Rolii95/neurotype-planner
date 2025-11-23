import argparse
import json
from pathlib import Path
import psycopg2

OUT = Path('scripts/schema_verification.txt')

QUERIES = [
    ("public_tables", "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"),
    ("enum_types", "SELECT n.nspname AS schema, t.typname AS name FROM pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE t.typtype='e' ORDER BY t.typname;"),
    ("triggers", "SELECT tgname, tgrelid::regclass::text AS table_name FROM pg_trigger WHERE NOT tgisinternal;"),
    ("policies", "SELECT polname, polrelid::regclass::text AS table_name FROM pg_policy ORDER BY polrelid::regclass::text, polname;"),
    ("rls_enabled_tables", "SELECT relname FROM pg_class WHERE relkind='r' AND relname IN (SELECT table_name FROM information_schema.tables WHERE table_schema='public') AND relrowsecurity;"),
    ("functions", "SELECT routine_name, routine_schema FROM information_schema.routines WHERE routine_schema NOT IN ('pg_catalog','information_schema') ORDER BY routine_schema, routine_name;")
]


def run_queries(conn_params):
    out = []
    conn = psycopg2.connect(**conn_params)
    try:
        cur = conn.cursor()
        for name, q in QUERIES:
            cur.execute(q)
            rows = cur.fetchall()
            out.append({'name': name, 'count': len(rows), 'rows': rows})
    finally:
        conn.close()
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--host', required=True)
    p.add_argument('--port', type=int, default=5432)
    p.add_argument('--user', required=True)
    p.add_argument('--password', required=True)
    p.add_argument('--dbname', required=True)
    args = p.parse_args()

    conn_params = dict(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname, sslmode='require')
    results = run_queries(conn_params)
    # write human readable and JSON
    txt = []
    for r in results:
        txt.append(f"== {r['name']} ({r['count']}) ==")
        for row in r['rows']:
            txt.append(str(row))
        txt.append('')

    OUT.write_text('\n'.join(txt), encoding='utf-8')
    print('Wrote schema verification to', OUT)


if __name__ == '__main__':
    main()
