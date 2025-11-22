#!/usr/bin/env python3
"""
Execute PROPOSED FIX blocks from `scripts/manual_review_fixes.sql` one-by-one
against the provided Postgres database and write a detailed log to
`scripts/fix_rerun_log.txt`.

Usage:
  python scripts/apply_manual_fixes.py --host <host> --port 5432 --user <user> --password <pw> --dbname <db>

CAUTION: This will execute DDL and may modify your database. Only run after
confirming you want these fixes applied.
"""
import argparse
import re
from pathlib import Path
from datetime import datetime

try:
    import psycopg2
except Exception:
    print("Missing dependency: install psycopg2-binary in your venv (pip install psycopg2-binary)")
    raise

ROOT = Path(__file__).resolve().parent
INFILE = ROOT.joinpath('manual_review_fixes.sql')
LOGFILE = ROOT.joinpath('fix_rerun_log.txt')

parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', type=int, default=5432)
parser.add_argument('--user', required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--dbname', required=True)
parser.add_argument('--limit', type=int, default=0, help='Limit number of blocks to apply (0 = all)')
args = parser.parse_args()

text = INFILE.read_text(encoding='utf-8')
# Split into blocks starting with -- PROPOSED FIX
parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
# The split will produce: ['', idx1, block1, idx2, block2, ...]
entries = []
for i in range(1, len(parts), 2):
    idx = parts[i]
    block = parts[i+1].strip()
    entries.append((int(idx), block))

if not entries:
    print('No PROPOSED FIX blocks found in', INFILE)
    raise SystemExit(0)

if args.limit > 0:
    entries = entries[:args.limit]

LOGFILE.write_text('')

conn = None
for stmt_idx, (orig_idx, block) in enumerate(entries, start=1):
    header = f"=== Block {stmt_idx} (failing stmt {orig_idx}) | {datetime.utcnow().isoformat()}Z ===\n"
    LOGFILE.write_text(header, encoding='utf-8', append=True) if False else None

# We'll open/append using with open
with open(LOGFILE, 'a', encoding='utf-8') as logf:
    logf.write(f"Run started: {datetime.utcnow().isoformat()}Z\n")
    logf.write(f"Found {len(entries)} proposed fix blocks.\n\n")

    for seq, (orig_idx, block) in enumerate(entries, start=1):
        logf.write(f"--- Block {seq} (failing stmt {orig_idx}) ---\n")
        logf.write(f"Timestamp: {datetime.utcnow().isoformat()}Z\n")
        # Save SQL to separate file for traceability
        block_file = ROOT.joinpath(f'attempted_fix_{orig_idx}.sql')
        block_file.write_text(block + '\n', encoding='utf-8')
        logf.write(f"Wrote attempted SQL to: {block_file}\n")

        try:
            conn = psycopg2.connect(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(block)
            logf.write("RESULT: SUCCESS\n\n")
            cur.close()
            conn.close()
        except Exception as exc:
            err = str(exc).replace('\n', ' | ')
            logf.write(f"RESULT: ERROR | {err}\n\n")
            # Close connection if open
            try:
                if conn:
                    conn.close()
            except Exception:
                pass

    logf.write(f"Run finished: {datetime.utcnow().isoformat()}Z\n")

print(f"Execution finished. See {LOGFILE} for details.")
