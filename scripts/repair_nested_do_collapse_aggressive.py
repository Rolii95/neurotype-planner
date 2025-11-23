#!/usr/bin/env python3
"""
Aggressively collapse inner `DO $tag$ BEGIN ... END$tag$` blocks that wrap
`EXECUTE $inner$CREATE ...$inner$;` into `IF NOT EXISTS(...) THEN EXECUTE ... END IF;`.

This script makes multiple passes until no further inner-DO patterns are found.
It writes `manual_review_fixes_idempotent_collapsed.sql` and updates
`manual_review_fixes.sql` (with a backup).
"""
import re
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "manual_review_fixes.sql"
OUT = ROOT / "manual_review_fixes_idempotent_collapsed.sql"
BAK = ROOT / "manual_review_fixes.sql.bak_aggressive"

if not SRC.exists():
    print(f"Source file not found: {SRC}")
    sys.exit(1)

text = SRC.read_text(encoding='utf-8')

# Helper: find all dollar-quote tags and ranges
tag_re = re.compile(r"\$[A-Za-z0-9_]*\$")
dq_ranges = []
pos = 0
while True:
    m = tag_re.search(text, pos)
    if not m:
        break
    tag = m.group(0)
    start = m.start()
    end_idx = text.find(tag, m.end())
    if end_idx == -1:
        break
    end = end_idx + len(tag)
    dq_ranges.append((start, end))
    pos = end

def is_inside_dq(idx):
    for a, b in dq_ranges:
        if a < idx < b:
            return True
    return False

# Match inner DO blocks explicitly (we will replace these when nested)
inner_do_re = re.compile(r"DO\s*\$([A-Za-z0-9_]*)\$\s*BEGIN(.*?)END\$\1\$\s*(?:LANGUAGE\s+\w+\s*;|;)", re.IGNORECASE | re.DOTALL)

# Match EXECUTE $tag$ ... $tag$; inside the inner DO
exec_re = re.compile(r"EXECUTE\s*(\$[A-Za-z0-9_]*\$)(.*?)(\1)\s*;", re.IGNORECASE | re.DOTALL)

# Match CREATE INDEX name inside the EXECUTE body
create_index_re = re.compile(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?P<name>(?:\"[^\"]+\"|[\w.]+))",
                             re.IGNORECASE)

passes = 0
total_replaced = 0
max_passes = 10

while passes < max_passes:
    passes += 1
    new_text = text
    replaced_this_pass = [0]

    # iterate inner DO matches across the full text
    def replace_inner_do(m):
        full_inner = m.group(0)
        tag = m.group(1)
        inner_body = m.group(2)
        start_idx = m.start()

        # If this inner DO is not nested inside a dollar-quoted region, skip
        if not is_inside_dq(start_idx):
            return full_inner

        # find EXECUTE blocks inside inner_body
        execs = list(exec_re.finditer(inner_body))
        if not execs:
            return full_inner

        parts = []
        for ex in execs:
            etag = ex.group(1)
            body = ex.group(2)
            # try to extract a sensible object name for the existence check
            ci = create_index_re.search(body)
            if ci:
                raw_name = ci.group('name')
                if '.' in raw_name:
                    name = raw_name.split('.')[-1]
                else:
                    name = raw_name
                name = name.strip('"')
                existence_check = f"IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = '{name}' AND c.relkind = 'i') THEN\n  EXECUTE {etag}{body}{etag};\nEND IF;"
            else:
                # Generic fallback: wrap the exact EXECUTE body with an existence-less guard
                existence_check = f"-- (aggressive-collapse) Executing extracted statement:\n  EXECUTE {etag}{body}{etag};"

            parts.append(existence_check)

        replaced_this_pass[0] += 1
        return '\n'.join(parts)

    # perform replacements for inner DO blocks
    new_text, n = inner_do_re.subn(replace_inner_do, new_text)
    if n == 0:
        # no inner DOs replaced this pass
        break
    total_replaced += n
    text = new_text

print(f"Aggressive collapse passes: {passes}, inner DO blocks replaced: {total_replaced}")

if total_replaced == 0:
    print("No additional nested DO blocks found to collapse.")
    sys.exit(0)

# backup original if not already backed up
if not BAK.exists():
    BAK.write_text(SRC.read_text(encoding='utf-8'), encoding='utf-8')

OUT.write_text(text, encoding='utf-8')
SRC.write_text(text, encoding='utf-8')
print(f"Wrote {OUT} and updated {SRC} (collapsed {total_replaced} inner DO blocks across {passes} passes)")
