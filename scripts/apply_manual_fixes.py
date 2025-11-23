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
parser.add_argument('--connect-timeout', type=int, default=10, help='TCP connect timeout in seconds')
parser.add_argument('--statement-timeout', type=int, default=30000, help='Per-statement timeout in milliseconds (SET statement_timeout)')
parser.add_argument('--limit', type=int, default=0, help='Limit number of blocks to apply (0 = all)')
args = parser.parse_args()

# Safety: avoid accidental use of the generic `postgres` superuser when a
# Supabase pooler username is expected. Require an explicit pooler-mode
# username (e.g. 'postgres.<token>') and fail early to avoid many noisy
# authentication failures and partial application attempts.
user_lower = (args.user or '').lower()
if user_lower == 'postgres':
    print("ERROR: Refusing to run with username 'postgres'. Please supply the pooler-mode username (e.g. 'postgres.<id>').")
    raise SystemExit(2)

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

conn = None
with open(LOGFILE, 'a', encoding='utf-8') as logf:
    logf.write(f"Run started: {datetime.utcnow().isoformat()}Z\n")
    logf.write(f"Found {len(entries)} proposed fix blocks.\n\n")

    for seq, (orig_idx, block) in enumerate(entries, start=1):
        header = f"--- Block {seq} (failing stmt {orig_idx}) ---\n"
        logf.write(header)
        logf.write(f"Timestamp: {datetime.utcnow().isoformat()}Z\n")
        # Save SQL to separate file for traceability
        block_file = ROOT.joinpath(f'attempted_fix_{orig_idx}.sql')
        block_file.write_text(block + '\n', encoding='utf-8')
        logf.write(f"Wrote attempted SQL to: {block_file}\n")

        # If the block appears to contain top-level PL/pgSQL IF/END IF
        # fragments but does not already include a DO/$$ plpgsql wrapper
        # or a CREATE FUNCTION, wrap it in a DO block so the IFs parse.
        def needs_do_wrap(b: str) -> bool:
            # Wrap blocks containing PL/pgSQL IF/END IF fragments so they parse.
            # Avoid wrapping full CREATE FUNCTION blocks.
            has_if = bool(re.search(r"\bIF\b", b, re.IGNORECASE)) or "END IF;" in b
            if not has_if:
                return False
            # If this looks like a full CREATE FUNCTION, do not wrap
            if re.search(r"CREATE\s+FUNCTION", b, re.IGNORECASE):
                return False
            # If the block already contains a DO $$ ... $$ or explicit PL/pgSQL LANGUAGE
            # then it's already a plpgsql block and should not be wrapped again.
            if re.search(r"\bDO\s+\$\w*\$", b, re.IGNORECASE) or re.search(r"LANGUAGE\s+plpgsql", b, re.IGNORECASE):
                return False
            return True

        exec_block = block
        if needs_do_wrap(block):
            exec_block = f"DO $wrap$\nBEGIN\n{block}\nEND\n$wrap$;"
            logf.write("Wrapped block in DO $wrap$ BEGIN/END to allow PL/pgSQL IF parsing.\n")

        try:
            conn = psycopg2.connect(
                host=args.host,
                port=args.port,
                user=args.user,
                password=args.password,
                dbname=args.dbname,
                connect_timeout=args.connect_timeout,
            )
            conn.autocommit = True
            cur = conn.cursor()
            # enforce a per-statement timeout inside Postgres so long-running SQL won't hang
            try:
                cur.execute(f"SET statement_timeout = {int(args.statement_timeout)}")
            except Exception:
                # best-effort; ignore if server doesn't accept the change
                pass
            cur.execute(exec_block)
            logf.write("RESULT: SUCCESS\n\n")
            try:
                cur.close()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass
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
