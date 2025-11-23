#!/usr/bin/env python3
"""
Targeted repair: find `EXECUTE $tag$CREATE TYPE <name> AS ENUM (...)$tag$;` and replace
with a guarded DO block that checks pg_type and executes the CREATE TYPE if missing.

Reads: `scripts/manual_review_fixes.sql`
Writes: `scripts/manual_review_fixes_idempotent_repaired.sql` and backup `.bak`
"""
import re
from pathlib import Path

IN = Path("scripts/manual_review_fixes.sql")
OUT = Path("scripts/manual_review_fixes_idempotent_repaired.sql")
BAK = Path("scripts/manual_review_fixes.sql.bak")

if not IN.exists():
    print(f"Input file not found: {IN}")
    raise SystemExit(1)

text = IN.read_text(encoding="utf-8")
BAK.write_text(text, encoding="utf-8")
print(f"Wrote backup: {BAK}")

# Match patterns like: EXECUTE $create$CREATE TYPE schema.name AS ENUM ('a','b');$create$;
# We capture the dollar tag, the type name, and the enum body.
pattern = re.compile(
    r"EXECUTE\s+(\$[A-Za-z0-9_]*\$)\s*CREATE\s+TYPE\s+([^\s(]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;?\s*\1\s*;",
    re.IGNORECASE | re.DOTALL,
)

def make_do_block(type_name_raw: str, enum_body: str) -> str:
    # Extract base typname (strip schema and quotes)
    if '.' in type_name_raw:
        base = type_name_raw.split('.')[-1]
    else:
        base = type_name_raw
    typname = base.replace('"', '')
    enum_vals = enum_body.strip()

    # Use an inner $create$ tag for the EXECUTE to remain compatible
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

count = 0

def repl(m: re.Match) -> str:
    global count
    tag = m.group(1)
    name = m.group(2)
    body = m.group(3)
    count += 1
    return make_do_block(name, body)

new_text, nsubs = pattern.subn(repl, text)

OUT.write_text(new_text, encoding="utf-8")
print(f"Wrote {OUT} ({nsubs} replacements)")

# Also write a short summary to stderr/stdout
print(f"Replaced {nsubs} EXECUTE-wrapped CREATE TYPE occurrences with guarded DO blocks.")
