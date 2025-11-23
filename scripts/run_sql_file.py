#!/usr/bin/env python3
"""Run a single SQL file against a Postgres database (useful for one-off repaired SQL).

Usage:
  python scripts/run_sql_file.py --file <path> --host <host> --user <user> --password <pw> --dbname <db>
"""
import argparse
from pathlib import Path
from datetime import datetime
try:
    import psycopg2
except Exception:
    print("Missing dependency: install psycopg2-binary in your venv (pip install psycopg2-binary)")
    raise

parser = argparse.ArgumentParser()
parser.add_argument('--file', required=True)
parser.add_argument('--host', required=True)
parser.add_argument('--port', type=int, default=5432)
parser.add_argument('--user', required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--dbname', required=True)
parser.add_argument('--statement-timeout', type=int, default=30000)
args = parser.parse_args()

SQL_PATH = Path(args.file)
if not SQL_PATH.exists():
    print('File not found:', SQL_PATH)
    raise SystemExit(2)

sql = SQL_PATH.read_text(encoding='utf-8')
log = SQL_PATH.parent.joinpath('run_sql_file_log.txt')

with open(log, 'a', encoding='utf-8') as lf:
    lf.write(f'--- Run started: {datetime.utcnow().isoformat()}Z file={SQL_PATH.name}\n')
    try:
        conn = psycopg2.connect(
            host=args.host,
            port=args.port,
            user=args.user,
            password=args.password,
            dbname=args.dbname,
            connect_timeout=10,
        )
        conn.autocommit = True
        cur = conn.cursor()
        try:
            cur.execute(f"SET statement_timeout = {int(args.statement_timeout)}")
        except Exception:
            pass
        cur.execute(sql)
        lf.write('RESULT: SUCCESS\n')
        print('SQL file executed successfully.')
    except Exception as exc:
        err = str(exc).replace('\n', ' | ')
        lf.write(f'RESULT: ERROR | {err}\n')
        print('Execution error:', err)
    finally:
        lf.write(f'--- Run finished: {datetime.utcnow().isoformat()}Z\n')
        try:
            cur.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass
