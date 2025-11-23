#!/usr/bin/env python3
"""
Replace guarded outer DO blocks (created by prior transforms) with inner IF forms
when those DO blocks are nested inside other dollar-quoted blocks.

This script scans `scripts/manual_review_fixes.sql` for occurrences of
the guarded DO wrapper we previously created and, if the DO start is inside
another dollar-quoted region, replaces it with an inner `IF NOT EXISTS (...) THEN EXECUTE ...; END IF;`.

Writes `scripts/manual_review_fixes_idempotent_fixed4.sql` and updates a
backup of the original `scripts/manual_review_fixes.sql`.
"""
import re
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "manual_review_fixes.sql"
OUT = ROOT / "manual_review_fixes_idempotent_fixed4.sql"
BAK = ROOT / "manual_review_fixes.sql.bak2"

if not SRC.exists():
    print(f"Source file not found: {SRC}")
    sys.exit(1)

text = SRC.read_text(encoding="utf-8")

# locate dollar-quote ranges
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

# Pattern that matches the guarded DO block we previously inserted.
# Non-greedy capture of inner content; we expect an EXECUTE $create$...$create$; inside.
do_guarded_re = re.compile(r"DO\s*\$\$(.*?)END\$\$\s*LANGUAGE\s+plpgsql\s*;", re.IGNORECASE | re.DOTALL)

replacements = 0

def build_inner_if(match):
    inner = match.group(1)
    start_idx = match.start()
    if not is_inside_dq(start_idx):
        return match.group(0)
    # try to extract relname
    rel_re = re.search(r"relname\s*=\s*'([^']+)'", inner)
    if not rel_re:
        return match.group(0)
    relname = rel_re.group(1)
    # try to extract EXECUTE $tag$ ... $tag$; block
    exec_re = re.search(r"EXECUTE\s*(\$[A-Za-z0-9_]*\$)(.*?)(\1)\s*;", inner, re.DOTALL | re.IGNORECASE)
    if not exec_re:
        return match.group(0)
    tag = exec_re.group(1)
    body = exec_re.group(2)
    # produce inner IF form
    inner_if = f"IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = '{relname}' AND c.relkind = 'i') THEN\n  EXECUTE {tag}{body}{tag};\nEND IF;"
    return inner_if

new_text = do_guarded_re.sub(build_inner_if, text)

if new_text == text:
    print("No nested DO guarded blocks found to replace.")
    sys.exit(0)

# backup and write
if not BAK.exists():
    BAK.write_text(text, encoding="utf-8")

OUT.write_text(new_text, encoding="utf-8")
SRC.write_text(new_text, encoding="utf-8")
print(f"Wrote {OUT} and updated {SRC} (replacements applied)")
