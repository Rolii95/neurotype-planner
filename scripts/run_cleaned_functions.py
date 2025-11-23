#!/usr/bin/env python3
"""
Strip embedded `CREATE TYPE ... AS ENUM` statements from PROPOSED FIX blocks
and execute the cleaned function/DO blocks against the DB. Append results to
`scripts/fix_rerun_log.txt` and save cleaned attempts to
`attempted_func_<idx>_cleaned.sql`.

Usage:
  python scripts/run_cleaned_functions.py --host ... --port 5432 --user ... --password ... --dbname ...
"""
import re
from pathlib import Path
from datetime import datetime

try:
    import psycopg2
    import sqlparse
except Exception as e:
    print('Missing dependency:', e)
    raise

ROOT = Path(__file__).resolve().parent
INFILE = ROOT.joinpath('manual_review_fixes.sql')
LOG = ROOT.joinpath('fix_rerun_log.txt')

import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', type=int, default=5432)
parser.add_argument('--user', required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--dbname', required=True)
parser.add_argument('--limit', type=int, default=0)
args = parser.parse_args()

text = INFILE.read_text(encoding='utf-8')
parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
entries = []
for i in range(1, len(parts), 2):
    idx = int(parts[i])
    block = parts[i+1].strip()
    entries.append((idx, block))

if args.limit > 0:
    entries = entries[:args.limit]

with open(LOG, 'a', encoding='utf-8') as logf:
    logf.write(f"\n--- run_cleaned_functions started: {datetime.utcnow().isoformat()}Z ---\n")

for seq, (orig_idx, block) in enumerate(entries, start=1):
    now = datetime.utcnow().isoformat() + 'Z'
    with open(LOG, 'a', encoding='utf-8') as logf:
        logf.write(f"--- Cleaned Function Block {seq} (failing stmt {orig_idx}) | {now} ---\n")

    # Remove any CREATE TYPE ... AS ENUM (...) statements (simple heuristic)
    cleaned = re.sub(r"(?is)CREATE\s+TYPE\s+(IF\s+NOT\s+EXISTS\s+)?[\"\w\.]+\s+AS\s+ENUM\s*\(.*?\)\s*;?", "", block)
    # Also remove leftover blank lines
    cleaned = "\n".join([line for line in cleaned.splitlines() if line.strip()])

    attempt_file = ROOT.joinpath(f'attempted_func_{orig_idx}_cleaned.sql')
    attempt_file.write_text(cleaned + '\n', encoding='utf-8')

    with open(LOG, 'a', encoding='utf-8') as logf:
        logf.write(f"Wrote cleaned SQL to: {attempt_file}\n")

    # Skip empty cleaned blocks
    if not cleaned.strip():
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write('SKIP: cleaned block is empty\n\n')
        continue

    # Execute cleaned block
    try:
        conn = psycopg2.connect(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(cleaned)
        cur.close()
        conn.close()
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write('RESULT: SUCCESS\n\n')
    except Exception as exc:
        err = str(exc).replace('\n', ' | ')
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write(f'ERROR: {err}\n\n')
        try:
            if conn:
                conn.close()
        except Exception:
            pass

with open(LOG, 'a', encoding='utf-8') as logf:
    logf.write(f"--- run_cleaned_functions finished: {datetime.utcnow().isoformat()}Z ---\n")

print('Done. See', LOG)
