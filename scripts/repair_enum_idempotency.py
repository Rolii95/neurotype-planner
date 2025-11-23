#!/usr/bin/env python3
"""
Repair invalid `CREATE TYPE IF NOT EXISTS ... AS ENUM (...)` usages by
replacing them with a PL/pgSQL DO block that checks `pg_type` and
EXECUTEs the CREATE TYPE statement if missing.

Usage: python scripts/repair_enum_idempotency.py
Reads: scripts/manual_review_fixes_idempotent.sql
Writes: scripts/manual_review_fixes_idempotent_fixed.sql
"""
import re
from pathlib import Path

IN = Path("scripts/manual_review_fixes_idempotent.sql")
OUT = Path("scripts/manual_review_fixes_idempotent_fixed.sql")

if not IN.exists():
    print(f"Input file not found: {IN}")
    raise SystemExit(1)

text = IN.read_text(encoding="utf-8")

# Regex to match: CREATE TYPE IF NOT EXISTS <name> AS ENUM ( ... );
pattern = re.compile(
    r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+([\w\.\"]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;",
    re.IGNORECASE | re.DOTALL,
)

def make_do_block(type_name_raw: str, enum_body: str) -> str:
    # Normalize type name for use in pg_type query and in CREATE statement
    # Remove schema if present for pg_type.typname check
    if '.' in type_name_raw:
        base = type_name_raw.split('.')[-1]
    else:
        base = type_name_raw
    # strip quotes for typname
    typname = base.replace('"', '')

    # Recreate a compact enum list (keep original spacing inside values)
    enum_vals = enum_body.strip()

    do_block = (
        f"DO $do$\n"
        f"BEGIN\n"
        f"  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{typname}') THEN\n"
        f"    EXECUTE $create$CREATE TYPE {type_name_raw} AS ENUM ({enum_vals});$create$;\n"
        f"  END IF;\n"
        f"END\n"
        f"$do$;\n"
    )
    return do_block

def repl(m: re.Match) -> str:
    name = m.group(1)
    body = m.group(2)
    return make_do_block(name, body)

new_text, nsubs = pattern.subn(repl, text)

OUT.write_text(new_text, encoding="utf-8")
print(f"Wrote {OUT} ({nsubs} replacements)")
