#!/usr/bin/env python3
"""
Wrap CREATE TYPE ... AS ENUM blocks from attempted_fix_*.sql into a safe
DO/EXECUTE wrapper and re-run them against the database. Appends results to
`scripts/fix_rerun_log.txt`.

Usage:
  python scripts/wrap_and_rerun.py --host ... --port 5432 --user ... --password ... --dbname ...

This will NOT alter original attempted files; it writes attempted_fix_<idx>_wrapped.sql files.
"""
import argparse
import re
from pathlib import Path
from datetime import datetime
import glob

try:
    import psycopg2
except Exception:
    print('Missing dependency: install psycopg2-binary')
    raise

ROOT = Path(__file__).resolve().parent
LOGFILE = ROOT.joinpath('fix_rerun_log.txt')

parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', type=int, default=5432)
parser.add_argument('--user', required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--dbname', required=True)
parser.add_argument('--limit', type=int, default=0)
args = parser.parse_args()

files = sorted(ROOT.glob('attempted_fix_*.sql'))
if not files:
    print('No attempted_fix_*.sql files found in', ROOT)
    raise SystemExit(0)

if args.limit > 0:
    files = files[:args.limit]

def make_wrapped_sql(typname, enum_list):
    # enum_list is the inner text like '"a","b"' or 'a','b'
    # Normalize: split on comma not inside quotes
    # We'll produce a quoted, escaped list for EXECUTE
    items = [i.strip() for i in re.split(r",(?=(?:[^']*'[^']*')*[^']*$)", enum_list)]
    safe_items = []
    for it in items:
        # remove surrounding quotes
        it2 = it.strip()
        if it2.startswith("'") and it2.endswith("'"):
            val = it2[1:-1]
        elif it2.startswith('"') and it2.endswith('"'):
            val = it2[1:-1]
        else:
            val = it2
        # escape single quotes
        val_esc = val.replace("'", "''")
        safe_items.append("'" + val_esc + "'")
    enum_sql = ",".join(safe_items)
    exec_sql = f"CREATE TYPE {typname} AS ENUM ({enum_sql});"
    # Wrap in DO block and use EXECUTE
    wrapped = "DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '%s') THEN\n    EXECUTE E'%s';\n  END IF;\nEND$$;\n" % (typname, exec_sql.replace("'", "''"))
    return wrapped

with open(LOGFILE, 'a', encoding='utf-8') as logf:
    logf.write(f"\n--- wrap_and_rerun run started: {datetime.utcnow().isoformat()}Z ---\n")

    for fpath in files:
        idx = fpath.stem.split('_')[-1]
        content = fpath.read_text(encoding='utf-8')
        # Try to find CREATE TYPE ... AS ENUM (...)
        m = re.search(r"(?is)CREATE\s+TYPE\s+(IF\s+NOT\s+EXISTS\s+)?(\"?)([\w\.]+)\2\s+AS\s+ENUM\s*\((.*?)\)\s*;?", content)
        if not m:
            logf.write(f"File {fpath} - no CREATE TYPE AS ENUM found, skipping\n")
            continue
        typname = m.group(3)
        enum_list = m.group(4)
        wrapped_sql = make_wrapped_sql(typname, enum_list)
        wrapped_file = fpath.with_name(f"{fpath.stem}_wrapped.sql")
        wrapped_file.write_text(wrapped_sql, encoding='utf-8')
        logf.write(f"Prepared wrapped file {wrapped_file}\n")

        # Execute wrapped SQL
        try:
            conn = psycopg2.connect(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(wrapped_sql)
            logf.write(f"{fpath.name}: WRAPPED EXECUTE SUCCESS\n")
            cur.close()
            conn.close()
        except Exception as exc:
            msg = str(exc).replace('\n', ' | ')
            logf.write(f"{fpath.name}: WRAPPED EXECUTE ERROR | {msg}\n")
            try:
                if conn:
                    conn.close()
            except Exception:
                pass

    logf.write(f"--- wrap_and_rerun finished: {datetime.utcnow().isoformat()}Z ---\n")

print('Done. See', LOGFILE)
