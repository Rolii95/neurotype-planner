#!/usr/bin/env python3
"""
Extract statements that caused syntax-like errors from
`scripts/migration_errors.txt`, pull the original SQL statement
from the big migration file by splitting with sqlparse, apply a
targeted fix for common CREATE TYPE patterns, then re-run the
fixed statements against the DB and log results.

Produces:
- scripts/failing_statements.sql         (original failing statements)
- scripts/failing_statements_fixed.sql   (fixed statements, with notes)
- scripts/fix_rerun_log.txt              (execution log)

Usage: python scripts/fix_and_rerun_failures.py --host ... --user ... --password ... --dbname ...
"""
import argparse
import re
import sys
from pathlib import Path

try:
    import sqlparse
    import psycopg2
except Exception as e:
    print("Missing dependency:, install with: pip install sqlparse psycopg2-binary")
    raise


ROOT = Path(__file__).resolve().parent.parent
MIGRATION = ROOT / 'supabase' / 'migrations' / '20251120_all_migrations_gap_fix.sql'
ERRORS = ROOT / 'scripts' / 'migration_errors.txt'
OUT_FAIL = ROOT / 'scripts' / 'failing_statements.sql'
OUT_FIXED = ROOT / 'scripts' / 'failing_statements_fixed.sql'
LOG = ROOT / 'scripts' / 'fix_rerun_log.txt'


def parse_error_indices(err_file: Path):
    """Return sorted unique indices for errors that look like syntax/unterminated issues."""
    idxs = set()
    pattern = re.compile(r'EXEC\s+(\d+)/(\d+)\s+ERROR: (.+)', re.IGNORECASE)
    keywords = ['syntax error', 'unterminated', 'at or near', 'invalid input', 'unterminated /*', 'unexpected']
    for line in err_file.read_text(encoding='utf-8', errors='ignore').splitlines():
        m = pattern.search(line)
        if not m:
            continue
        idx = int(m.group(1))
        msg = m.group(3).lower()
        if any(k in msg for k in keywords):
            idxs.add(idx)
    return sorted(idxs)


def split_statements(sql_file: Path):
    text = sql_file.read_text(encoding='utf-8', errors='ignore')
    # sqlparse.split returns list of statements
    stmts = sqlparse.split(text)
    return stmts


def apply_targeted_fix(stmt: str):
    """Apply safe, idempotent fixes for known patterns.
    Currently: convert CREATE TYPE IF NOT EXISTS problematic forms
    into a DO $$ BEGIN IF NOT EXISTS (...) THEN CREATE TYPE ...; END IF; END $$;
    If no fix applied, return None.
    """
    s = stmt.strip()
    # handle CREATE TYPE <name> AS ENUM (...) (with or without IF NOT EXISTS)
    m = re.match(r"CREATE\s+TYPE\s+(IF\s+NOT\s+EXISTS\s+)?([\w\.\"]+)\s+AS\s+ENUM\s*\((.*)\)\s*;?$",
                 s, re.IGNORECASE | re.DOTALL)
    if m:
        name = m.group(2).strip()
        enum_vals = m.group(3).strip()
        # normalize type name for pg_type.typname grabbing: strip schema and quotes
        simple = name.split('.')[-1].replace('"', '')
        fixed = (f"DO $$\nBEGIN\nIF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{simple}') THEN\n"
                 f"    CREATE TYPE {name} AS ENUM ({enum_vals});\nEND IF;\nEND$$;\n")
        return fixed
    return None


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument('--host', required=True)
    p.add_argument('--port', default=5432, type=int)
    p.add_argument('--user', required=True)
    p.add_argument('--password', required=True)
    p.add_argument('--dbname', required=True)
    p.add_argument('--sslmode', default='require')
    args = p.parse_args(argv)

    if not ERRORS.exists():
        print(f"Error file not found: {ERRORS}")
        return 2
    if not MIGRATION.exists():
        print(f"Migration file not found: {MIGRATION}")
        return 2

    idxs = parse_error_indices(ERRORS)
    if not idxs:
        print("No syntax-like error indices found to fix.")
        return 0
    print(f"Found {len(idxs)} suspect statement indices (examples): {idxs[:10]}")

    stmts = split_statements(MIGRATION)
    total = len(stmts)
    print(f"Migration split into {total} statements")

    selected = []
    for i in idxs:
        if 1 <= i <= total:
            selected.append((i, stmts[i-1]))
        else:
            print(f"Index {i} out of range (1..{total})")

    OUT_FAIL.write_text('', encoding='utf-8')
    OUT_FIXED.write_text('', encoding='utf-8')
    LOG.write_text('', encoding='utf-8')

    for idx, stmt in selected:
        header = f"-- STATEMENT {idx}/{total}\n"
        OUT_FAIL.write_text(header + stmt.strip() + '\n\n', encoding='utf-8', append=False) if False else None
        # append without truncating each time
        with OUT_FAIL.open('a', encoding='utf-8') as fh:
            fh.write(header)
            fh.write(stmt.strip() + '\n\n')

        fixed = apply_targeted_fix(stmt)
        if fixed:
            note = f"-- FIXED (applied CREATE TYPE idempotent wrapper) for statement {idx}\n"
            with OUT_FIXED.open('a', encoding='utf-8') as fh:
                fh.write(note)
                fh.write(fixed + '\n')
            to_run = fixed
        else:
            note = f"-- MANUAL REVIEW REQUIRED for statement {idx}\n"
            with OUT_FIXED.open('a', encoding='utf-8') as fh:
                fh.write(note)
                fh.write(stmt.strip() + '\n\n')
            to_run = None

        # If we have an automatic fix, try to execute it
        if to_run:
            try:
                conn = psycopg2.connect(host=args.host, port=args.port, user=args.user,
                                        password=args.password, dbname=args.dbname, sslmode=args.sslmode)
                conn.autocommit = True
                cur = conn.cursor()
                cur.execute(to_run)
                LOG.write_text(f"[{idx}] OK\n", encoding='utf-8', append=False) if False else None
                with LOG.open('a', encoding='utf-8') as lf:
                    lf.write(f"[{idx}] OK\n")
            except Exception as e:
                with LOG.open('a', encoding='utf-8') as lf:
                    lf.write(f"[{idx}] ERROR: {e}\n")
            finally:
                try:
                    cur.close()
                except Exception:
                    pass
                try:
                    conn.close()
                except Exception:
                    pass

    print(f"Wrote failing statements to {OUT_FAIL}")
    print(f"Wrote fixed statements to {OUT_FIXED}")
    print(f"Execution log at {LOG}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
