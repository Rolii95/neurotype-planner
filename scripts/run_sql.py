#!/usr/bin/env python3
import argparse
import sys
import os
import traceback
import psycopg2

parser = argparse.ArgumentParser(description='Run SQL file against Postgres')
parser.add_argument('--host', required=True)
parser.add_argument('--port', required=False, default=5432, type=int)
parser.add_argument('--user', required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--dbname', required=True)
parser.add_argument('--file', required=True)
parser.add_argument('--sslmode', required=False, default='require')
parser.add_argument('--tolerate-errors', action='store_true', help='Continue on any SQL error (log and skip).')
args = parser.parse_args()

sql_path = args.file
if not os.path.isabs(sql_path):
    sql_path = os.path.join(os.getcwd(), sql_path)

if not os.path.exists(sql_path):
    print(f"SQL file not found: {sql_path}")
    sys.exit(2)

print(f"Connecting to {args.host}:{args.port}/{args.dbname} as {args.user}")
try:
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql = f.read()
except Exception as e:
    print(f"Failed to read SQL file: {e}")
    sys.exit(3)

try:
    # Preprocess SQL: convert "CREATE TYPE IF NOT EXISTS <name> AS ENUM (...)" into
    # a conditional DO block that works on PostgreSQL versions that lack
    # "IF NOT EXISTS" support for CREATE TYPE. This avoids syntax errors.
    import re

    def _convert_create_type_if_not_exists(sql_text: str) -> str:
        # Find dollar-quoted spans and avoid replacing inside them
        dollar_spans = []
        i = 0
        # locate all $tag$ ... $tag$ spans
        while True:
            m = re.search(r"\$[A-Za-z0-9_]*\$", sql_text[i:])
            if not m:
                break
            start = i + m.start()
            tag = m.group(0)
            end_tag = tag
            # find closing tag after the opening
            j = sql_text.find(end_tag, start + len(tag))
            if j == -1:
                break
            dollar_spans.append((start, j + len(end_tag)))
            i = j + len(end_tag)

        def _inside_dollar(pos: int) -> bool:
            for a, b in dollar_spans:
                if a <= pos < b:
                    return True
            return False

        pattern = re.compile(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;",
                             re.IGNORECASE | re.DOTALL)

        result_parts = []
        last_idx = 0
        for m in pattern.finditer(sql_text):
            s = m.start()
            if _inside_dollar(s):
                continue
            # append text from last_idx up to this match
            result_parts.append(sql_text[last_idx:s])
            name = m.group(1)
            vals = m.group(2).strip()
            repl = (
                f"DO $$ BEGIN\n"
                f"  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN\n"
                f"    CREATE TYPE {name} AS ENUM ({vals});\n"
                f"  END IF;\n"
                f"END $$;"
            )
            result_parts.append(repl)
            last_idx = m.end()

        result_parts.append(sql_text[last_idx:])
        return ''.join(result_parts)

    sql = _convert_create_type_if_not_exists(sql)

    print("Starting execution of SQL file (this may take a while)...")
    # Open run log
    import datetime
    log_path = os.path.join(os.getcwd(), 'scripts', 'migration_run_log.txt')
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    log_f = open(log_path, 'a', encoding='utf-8')
    def _log(line: str):
        ts = datetime.datetime.utcnow().isoformat() + 'Z'
        log_f.write(f"[{ts}] {line}\n")
        log_f.flush()
    _log(f"Starting run against {args.host}:{args.port}/{args.dbname}")
    # Use sqlparse to split into top-level statements while preserving dollar-quoted
    # function bodies and other complex constructs as much as possible.
    import sqlparse

    statements = [s.strip() for s in sqlparse.split(sql) if s and s.strip()]
    print(f"Discovered {len(statements)} SQL statements; executing sequentially...")
    def _is_only_comments(s: str) -> bool:
        for line in s.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            # lines that are only semicolons should be treated as empty
            if stripped.strip(';') == '':
                continue
            if stripped.startswith('--'):
                continue
            if stripped.startswith('/*') and stripped.endswith('*/'):
                continue
            return False
        return True

    for idx, stmt in enumerate(statements, start=1):
        if _is_only_comments(stmt):
            print(f"Skipping statement {idx}/{len(statements)}: comment or empty")
            _log(f"SKIP {idx}/{len(statements)}: comment or empty")
            continue
        try:
            print(f"Executing statement {idx}/{len(statements)} (chars={len(stmt)})")
            _log(f"EXEC {idx}/{len(statements)} START chars={len(stmt)}")
            # Use a fresh connection for each statement to avoid transaction aborts
            with psycopg2.connect(host=args.host, port=args.port, dbname=args.dbname, user=args.user, password=args.password, sslmode=args.sslmode) as _conn:
                _conn.autocommit = True
                with _conn.cursor() as _cur:
                    _cur.execute(stmt)
            _log(f"EXEC {idx}/{len(statements)} OK")
        except Exception as exc:
            msg = str(exc)
            _log(f"EXEC {idx}/{len(statements)} ERROR: {msg}")
            print(f"Error on statement {idx}: {msg}")
            # If tolerate-errors is enabled, continue; otherwise stop
            if args.tolerate_errors:
                print(f"Tolerating error and continuing (statement {idx}).")
                _log(f"TOLERATED {idx}/{len(statements)}: {msg}")
                continue
            else:
                print(f"Halting due to error on statement {idx}.")
                _log(f"HALT {idx}/{len(statements)}: {msg}")
                log_f.close()
                raise
    print("SQL executed successfully (with non-fatal warnings possible).")
    _log("RUN COMPLETE: success")
    log_f.close()
    sys.exit(0)
except Exception as e:
    print("Error while executing SQL:")
    traceback.print_exc()
    sys.exit(1)
