#!/usr/bin/env python3
"""
Repair common structural SQL issues in migration file:
- Convert `CREATE TYPE ... AS ENUM (...)` into guarded DO blocks (IF NOT EXISTS)
- Ensure `DO $$` blocks have a `BEGIN` immediately after the opening delimiter
- Fix common corrupted tokens like `TABIF` -> `TABLE`, `IF IFT`/`IFT` in `CREATE TABLE IF IFT EXISTS` -> `IF NOT EXISTS`
- Ensure blocks end with `END;` before `$$`

Usage: python scripts/repair_structural_sql.py input.sql output.sql
"""
import sys
import re
from pathlib import Path


def repair(sql: str) -> str:
    # Fix accidental corruptions (conservative, contextual)
    sql = re.sub(r'CREATE\s+TABIF', 'CREATE TABLE', sql, flags=re.IGNORECASE)
    sql = re.sub(r'CREATE\s+TABLE\s+IF\s+IFT\s+EXISTS', 'CREATE TABLE IF NOT EXISTS', sql, flags=re.IGNORECASE)

    # Convert CREATE TYPE ... AS ENUM (...) into guarded DO $$ BEGIN ... END; $$;
    # Capture name and the enum body (parentheses). Use non-greedy match for body.
    def _type_guard(m: re.Match) -> str:
        name = m.group(1)
        body = m.group(2)
        # Normalize whitespace in body
        body_norm = body.strip()
        # Use EXECUTE with single-quoted literal; existing quotes inside body are already doubled in many dumps,
        # but keep as-is (we avoid re-escaping to reduce risk).
        return (
            f"DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN\n"
            f"    EXECUTE 'CREATE TYPE {name} AS ENUM {body_norm}';\n  END IF;\nEND;\n$$;\n"
        )

    sql = re.sub(
        r'CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+AS\s+ENUM(\s*\([^;]+?\));',
        _type_guard,
        sql,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # Ensure DO $$ blocks have BEGIN immediately after open delimiter
    def _ensure_begin_after_do(s: str) -> str:
        out = []
        i = 0
        lower = s.lower()
        while True:
            idx = lower.find('do $$', i)
            if idx == -1:
                out.append(s[i:])
                break
            out.append(s[i:idx])
            j = idx + len('do $$')
            # include any whitespace/newlines after the delimiter
            m = re.match(r'\s*', s[j:])
            ws = m.group(0)
            after = s[j + len(ws): j + len(ws) + 5].lower()
            if not after.startswith('begin'):
                out.append(s[idx:j] + ws + 'BEGIN\n')
                i = j + len(ws)
            else:
                out.append(s[idx:j + len(ws)])
                i = j + len(ws) + 5  # skip 'begin'
        return ''.join(out)

    sql = _ensure_begin_after_do(sql)

    # Ensure each DO $$ ... $$; uses END; before the closing $$
    # Replace patterns like 'END $$' -> 'END;\n$$' if missing the semicolon
    sql = re.sub(r'END\s*\$\$', 'END;\n$$', sql, flags=re.IGNORECASE)
    # Also replace 'END;\n$$' followed by ';' to ensure final semi-colon exists once
    sql = re.sub(r'END;\n\$\$;+', 'END;\n$$;', sql, flags=re.IGNORECASE)

    # Collapse multiple blank lines
    sql = re.sub(r'\n{3,}', '\n\n', sql)
    return sql


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python scripts/repair_structural_sql.py input.sql output.sql')
        sys.exit(1)
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    sql = inp.read_text(encoding='utf-8')
    repaired = repair(sql)
    out.write_text(repaired, encoding='utf-8')
    print(f'Repaired structural SQL and wrote output to: {out}')
