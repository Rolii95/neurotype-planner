#!/usr/bin/env python3
"""
Bulk repair for EXECUTE $$ CREATE ... $$ occurrences.

This script scans `scripts/manual_review_fixes.sql` for occurrences of
`EXECUTE $$ ... $$` where the inner SQL is a `CREATE INDEX` (or similar),
and replaces them with a guarded `DO $$ BEGIN IF NOT EXISTS (...) THEN EXECUTE $create$ ... $create$; END IF; END $$ LANGUAGE plpgsql;`

It writes `scripts/manual_review_fixes_idempotent_fixed3.sql` and updates a
backup of the original `scripts/manual_review_fixes.sql`.
"""
import re
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "manual_review_fixes.sql"
OUT = ROOT / "manual_review_fixes_idempotent_fixed3.sql"
BAK = ROOT / "manual_review_fixes.sql.bak"

if not SRC.exists():
    print(f"Source file not found: {SRC}")
    sys.exit(1)

text = SRC.read_text(encoding="utf-8")

# Pattern to find EXECUTE $$ ... $$; (non-greedy)
exec_pattern = re.compile(r"EXECUTE\s*\$\$(.*?)\$\$\s*;", re.IGNORECASE | re.DOTALL)

# Try to capture CREATE INDEX name inside the inner SQL
create_index_re = re.compile(
    r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?P<name>(?:\"[^\"]+\"|[\w.]+))",
    re.IGNORECASE,
)

replacements = 0

# Build list of dollar-quote ranges so we can tell if a match is nested inside another dollar-quoted block
tag_re = re.compile(r"\$[A-Za-z0-9_]*\$")
dq_ranges = []
text_len = len(text)
pos = 0
while pos < text_len:
    m = tag_re.search(text, pos)
    if not m:
        break
    tag = m.group(0)
    start = m.start()
    # find the next occurrence of the same tag
    m2 = text.find(tag, m.end())
    if m2 == -1:
        # unmatched tag; stop
        break
    end = m2 + len(tag)
    dq_ranges.append((start, end))
    pos = end

def is_inside_dq(start_idx):
    for a, b in dq_ranges:
        if a < start_idx < b:
            return True
    return False

def make_guarded_block(index_name, inner_sql, outer=True):
    # Use a distinct dollar tag to avoid conflicts
    inner_tag = "$create$"
    if outer:
        guard = (
            "DO $$\n"
            "BEGIN\n"
            "  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = '%s' AND c.relkind = 'i') THEN\n"
            "    EXECUTE %s%s%s;\n"
            "  END IF;\n"
            "END$$ LANGUAGE plpgsql;"
        ) % (index_name.replace("'", "''"), inner_tag, inner_sql.strip(), inner_tag)
    else:
        # inner replacement suitable for use inside an existing PL/pgSQL block
        guard = (
            "IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = '%s' AND c.relkind = 'i') THEN\n"
            "  EXECUTE %s%s%s;\n"
            "END IF;"
        ) % (index_name.replace("'", "''"), inner_tag, inner_sql.strip(), inner_tag)
    return guard

def replace_match(m):
    global replacements
    inner = m.group(1)
    start_idx = m.start()
    # try to find CREATE INDEX
    ci = create_index_re.search(inner)
    if not ci:
        # leave unchanged
        return m.group(0)
    raw_name = ci.group('name')
    # strip optional schema and quotes for pg_class lookup
    if '.' in raw_name:
        name = raw_name.split('.')[-1]
    else:
        name = raw_name
    name = name.strip('"')
    # determine whether this EXECUTE is inside another dollar-quoted block
    nested = is_inside_dq(start_idx)
    guarded = make_guarded_block(name, inner, outer=not nested)
    replacements += 1
    return guarded

new_text = exec_pattern.sub(replace_match, text)

if replacements == 0:
    print("No EXECUTE $$...$$ CREATE INDEX patterns found to replace.")
    sys.exit(0)

# backup original if not already backed up
if not BAK.exists():
    BAK.write_text(text, encoding="utf-8")

# write output and update working file
OUT.write_text(new_text, encoding="utf-8")
SRC.write_text(new_text, encoding="utf-8")
print(f"Wrote {OUT} and updated {SRC} (replacements: {replacements})")
