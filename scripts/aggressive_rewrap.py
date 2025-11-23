#!/usr/bin/env python3
"""Aggressive rewriter: normalize each `-- PROPOSED FIX` block by
- stripping existing DO $...$ wrappers
- converting `CREATE TYPE IF NOT EXISTS name AS ENUM (...)` into guarded EXECUTE
- wrapping the cleaned block into a single DO $wrap$ ... END $wrap$ LANGUAGE plpgsql;

Writes: `manual_review_fixes_aggressive.sql`
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_aggressive.sql'

text = IN.read_text(encoding='utf-8')

# Split blocks by the PROPOSED FIX header used earlier
parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
if len(parts) <= 1:
    print('No PROPOSED FIX blocks found; writing original to aggressive output.')
    OUT.write_text(text, encoding='utf-8')
    raise SystemExit(0)

head = parts[0]
entries = []
for i in range(1, len(parts), 2):
    idx = parts[i]
    block = parts[i+1]
    entries.append((int(idx), block))

def strip_do_wrappers(s: str) -> str:
    # Remove DO $tag$ BEGIN ... END $tag$; and variations, preserving inner content
    s = re.sub(r"DO\s+\$[A-Za-z0-9_]*\$\s*BEGIN\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"END\s+\$[A-Za-z0-9_]*\$\s*;", "", s, flags=re.IGNORECASE)
    # Remove trailing LANGUAGE plpgsql; if left over
    s = re.sub(r"LANGUAGE\s+plpgsql\s*;", "", s, flags=re.IGNORECASE)
    return s

def convert_create_type_ifnotexists(s: str) -> str:
    # Convert occurrences of CREATE TYPE IF NOT EXISTS name AS ENUM (...) to guarded EXECUTE
    def repl(m):
        name = m.group(1)
        body = m.group(2)
        # sanitize whitespace
        body = body.strip()
        # Build guarded block
        guarded = (
            f"IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN\n"
            f"  EXECUTE $$CREATE TYPE {name} AS ENUM ({body})$$;\n"
            f"END IF;\n"
        )
        return guarded

    pattern = re.compile(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z0-9_]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;", flags=re.IGNORECASE|re.DOTALL)
    return pattern.sub(repl, s)

out_parts = [head]
for idx, block in entries:
    b = block
    b = strip_do_wrappers(b)
    b = convert_create_type_ifnotexists(b)
    # If block already contains a CREATE FUNCTION or DO, leave alone (but strip wrappers above)
    if re.search(r"\bCREATE\s+FUNCTION\b", b, flags=re.IGNORECASE):
        wrapped = b
    else:
        # If block already starts with a top-level SQL statement (CREATE TABLE, ALTER TABLE, etc.)
        # we still wrap to allow IF/END IF to parse safely; wrapping plain SQL is harmless.
        wrapped = f"DO $wrap$\nBEGIN\n{b}\nEND $wrap$ LANGUAGE plpgsql;\n"
    out_parts.append(f"-- PROPOSED FIX: Reassembled function for failing statement {idx}\n{wrapped}\n")

OUT.write_text(''.join(out_parts), encoding='utf-8')
print(f'Wrote {OUT} (aggressive rewrap of {len(entries)} blocks)')
