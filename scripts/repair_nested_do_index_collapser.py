#!/usr/bin/env python3
"""
Collapse nested DO blocks that were created for index guards into appropriate
inner IF forms when those DO blocks are nested inside other dollar-quoted
blocks.

The script scans `scripts/manual_review_fixes.sql` for DO blocks that contain
`EXECUTE $...$CREATE INDEX ...$...$;` and, if the DO block start is inside a
dollar-quoted region (i.e., nested), replaces the whole DO block with one or
more `IF NOT EXISTS (...) THEN EXECUTE $tag$...$tag$; END IF;` entries.

Writes `scripts/manual_review_fixes_idempotent_fixed5.sql` and updates a
backup of the original file.
"""
import re
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "manual_review_fixes.sql"
OUT = ROOT / "manual_review_fixes_idempotent_fixed5.sql"
BAK = ROOT / "manual_review_fixes.sql.bak3"

if not SRC.exists():
    print(f"Source file not found: {SRC}")
    sys.exit(1)

text = SRC.read_text(encoding="utf-8")

# find dollar-quote ranges for nesting detection
tag_re = re.compile(r"\$[A-Za-z0-9_]*\$")
dq_ranges = []
pos = 0
text_len = len(text)
while pos < text_len:
    m = tag_re.search(text, pos)
    if not m:
        break
    tag = m.group(0)
    start = m.start()
    m2 = text.find(tag, m.end())
    if m2 == -1:
        break
    end = m2 + len(tag)
    dq_ranges.append((start, end))
    pos = end

def is_inside_dq(idx):
    for a, b in dq_ranges:
        if a < idx < b:
            return True
    return False

# DO block matcher (captures whole DO ... END$$ LANGUAGE plpgsql;)
do_block_re = re.compile(r"(DO\s*\$[A-Za-z0-9_]*\$(.*?)END\$[A-Za-z0-9_]*\$\s*(?:LANGUAGE\s+\w+\s*;|;))",
                         re.IGNORECASE | re.DOTALL)

# EXECUTE $tag$ ... $tag$; matcher
exec_re = re.compile(r"EXECUTE\s*(\$[A-Za-z0-9_]*\$)(.*?)(\1)\s*;", re.IGNORECASE | re.DOTALL)

# create index name inside inner SQL
create_index_re = re.compile(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?P<name>(?:\"[^\"]+\"|[\w.]+))",
                             re.IGNORECASE)

replacements = 0
out_text = []
last_pos = 0

for m in do_block_re.finditer(text):
    whole = m.group(1)
    inner = m.group(2)
    start = m.start(1)
    end = m.end(1)
    # append unchanged text up to this block
    out_text.append(text[last_pos:start])
    last_pos = end

    # find EXECUTE blocks inside
    execs = list(exec_re.finditer(inner))
    if not execs:
        # no executes; keep as-is
        out_text.append(whole)
        continue

    if not is_inside_dq(start):
        # block is top-level -> keep as-is (avoid changing behaviour)
        out_text.append(whole)
        continue

    # block is nested: collapse to inner IF forms for each execute
    parts = []
    for ex in execs:
        tag = ex.group(1)
        body = ex.group(2)
        # try to find index name
        ci = create_index_re.search(body)
        if not ci:
            # fallback: keep original DO block
            parts = None
            break
        raw_name = ci.group('name')
        if '.' in raw_name:
            name = raw_name.split('.')[-1]
        else:
            name = raw_name
        name = name.strip('"')
        part = f"IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = '{name}' AND c.relkind = 'i') THEN\n  EXECUTE {tag}{body}{tag};\nEND IF;"
        parts.append(part)

    if parts is None:
        out_text.append(whole)
    else:
        replacements += 1
        out_text.append('\n'.join(parts))

out_text.append(text[last_pos:])
new_text = ''.join(out_text)

if replacements == 0:
    print("No nested DO blocks collapsed.")
    sys.exit(0)

# backup and write
if not BAK.exists():
    BAK.write_text(text, encoding='utf-8')

OUT.write_text(new_text, encoding='utf-8')
SRC.write_text(new_text, encoding='utf-8')
print(f"Wrote {OUT} and updated {SRC} (collapsed {replacements} nested DO blocks)")
