#!/usr/bin/env python3
"""
Fix patterns where a DO block was inserted inside an EXECUTE literal, e.g.:

  EXECUTE $exec$ DO $$
    ... EXECUTE 'CREATE TYPE ...';
  END;
  $$;
  $exec$;

Such constructs should usually be a single EXECUTE of the inner DDL string, e.g.

  EXECUTE 'CREATE TYPE ...';

This script finds EXECUTE $exec$ DO $$ ... $$; $exec$; and replaces it with the first inner EXECUTE '...'; statement found.

Usage: python scripts/fix_nested_execute_do.py input.sql output.sql
"""
import sys
import re
from pathlib import Path


def fix_nested_execute_do(sql: str) -> str:
    # Pattern to find EXECUTE $exec$ DO $$ ... $$; $exec$;
    pattern = re.compile(r"EXECUTE\s+\$exec\$\s*DO\s+\$\$(?P<body>.*?)END\s*;\s*\$\$;\s*\$exec\$\s*;",
                         flags=re.IGNORECASE | re.DOTALL)

    def repl(m: re.Match) -> str:
        body = m.group('body')
        # find the first inner EXECUTE '...'; pattern
        inner = re.search(r"EXECUTE\s+(?P<quote>['\$])[\s\S]*?(?P=quote)\s*;", body, flags=re.IGNORECASE)
        if inner:
            stmt = inner.group(0)
            return stmt
        # fallback: remove the surrounding wrapper entirely
        return ''

    return pattern.sub(repl, sql)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python scripts/fix_nested_execute_do.py input.sql output.sql')
        sys.exit(1)
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    sql = inp.read_text(encoding='utf-8')
    fixed = fix_nested_execute_do(sql)
    out.write_text(fixed, encoding='utf-8')
    print(f'Wrote fixed file: {out}')
