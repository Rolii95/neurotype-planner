#!/usr/bin/env python3
"""
Execute PROPOSED FIX blocks from `scripts/manual_review_fixes.sql` that look like
functions or DO $$ blocks. On execution error, fall back to the original
statement range from the migration (if present) and try executing that joined
statement set.

Results are appended to `scripts/fix_rerun_log.txt` and attempted SQL is
written to `attempted_func_<idx>.sql` and `attempted_func_<idx>_orig.sql`.

Usage:
  python scripts/run_proposed_functions.py --host ... --port 5432 --user ... --password ... --dbname ...

CAUTION: This will execute DDL against the DB. It continues on errors.
"""
import re
import sys
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
MIGRATION = ROOT.parent.joinpath('supabase', 'migrations', '20251120_all_migrations_gap_fix.sql')
LOG = ROOT.joinpath('fix_rerun_log.txt')

import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', type=int, default=5432)
parser.add_argument('--user', required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--dbname', required=True)
parser.add_argument('--limit', type=int, default=0, help='Limit number of blocks to run (0 = all)')
args = parser.parse_args()

text = INFILE.read_text(encoding='utf-8')
# Split into blocks: pattern used previously
parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
entries = []
for i in range(1, len(parts), 2):
    idx = int(parts[i])
    block = parts[i+1].strip()
    # Try to find original range in preceding comment (search backwards)
    # We'll search for the header line we inserted earlier
    header_pat = re.compile(rf"-- PROPOSED FIX: Reassembled function for failing statement {idx} \(original statements (\d+)\.\.(\d+)\)")
    m = header_pat.search(text)
    orig_range = None
    if m:
        orig_range = (int(m.group(1)), int(m.group(2)))
    entries.append((idx, block, orig_range))

if not entries:
    print('No proposed fix blocks found in', INFILE)
    sys.exit(0)

if args.limit > 0:
    entries = entries[:args.limit]

# Prepare migration statements (for fallback)
migration_stmts = sqlparse.split(MIGRATION.read_text(encoding='utf-8'))

with open(LOG, 'a', encoding='utf-8') as logf:
    logf.write(f"\n--- run_proposed_functions started: {datetime.utcnow().isoformat()}Z ---\n")

for seq, (orig_idx, block, orig_range) in enumerate(entries, start=1):
    now = datetime.utcnow().isoformat() + 'Z'
    with open(LOG, 'a', encoding='utf-8') as logf:
        logf.write(f"--- Function Block {seq} (failing stmt {orig_idx}) | {now} ---\n")
        # Quick check: only process blocks that look like functions or DO blocks
        if not re.search(r"(?is)(CREATE\s+(OR\s+REPLACE\s+)?FUNCTION|DO\s+\$\$|CREATE\s+OR\s+REPLACE\s+PROCEDURE)", block):
            logf.write("SKIP: Block does not look like a function/DO block\n\n")
            continue

        # Write attempted block file
        attempt_file = ROOT.joinpath(f'attempted_func_{orig_idx}.sql')
        attempt_file.write_text(block + '\n', encoding='utf-8')
        logf.write(f"Wrote attempted SQL to: {attempt_file}\n")

    # Try executing the block
    try:
        conn = psycopg2.connect(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(block)
        cur.close()
        conn.close()
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write('RESULT: SUCCESS\n\n')
        continue
    except Exception as exc:
        err = str(exc).replace('\n', ' | ')
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write(f'FIRST ATTEMPT ERROR: {err}\n')

    # Fallback: if original migration range is available, try executing the joined original statements
    if orig_range:
        s_idx, e_idx = orig_range
        s_idx0 = max(1, s_idx) - 1
        e_idx0 = min(len(migration_stmts), e_idx) - 1
        joined = '\n'.join(migration_stmts[s_idx0:e_idx0+1])
        orig_file = ROOT.joinpath(f'attempted_func_{orig_idx}_orig.sql')
        orig_file.write_text(joined + '\n', encoding='utf-8')
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write(f'Tried fallback original statements {s_idx}..{e_idx} written to {orig_file}\n')
        try:
            conn = psycopg2.connect(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(joined)
            cur.close()
            conn.close()
            with open(LOG, 'a', encoding='utf-8') as logf:
                logf.write('FALLBACK RESULT: SUCCESS\n\n')
            continue
        except Exception as exc2:
            err2 = str(exc2).replace('\n', ' | ')
            with open(LOG, 'a', encoding='utf-8') as logf:
                logf.write(f'FALLBACK ERROR: {err2}\n\n')
            continue
    else:
        with open(LOG, 'a', encoding='utf-8') as logf:
            logf.write('No original range available; skipping fallback\n\n')

with open(LOG, 'a', encoding='utf-8') as logf:
    logf.write(f"--- run_proposed_functions finished: {datetime.utcnow().isoformat()}Z ---\n")

print('Done. See', LOG)
