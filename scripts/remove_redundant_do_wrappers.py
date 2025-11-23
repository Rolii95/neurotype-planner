#!/usr/bin/env python3
"""Remove redundant DO $...$ wrappers that only enclose a single IF ... END IF; block.

This is a conservative transformation: it only removes a DO wrapper when its
body consists entirely of a single IF ... END IF; (possibly with surrounding
whitespace). That reduces BEGIN/END counts while keeping the IF guard.

Reads: `manual_review_fixes_sanitized.sql`
Writes: `manual_review_fixes_unwrapped.sql`
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes_sanitized.sql'
OUT = ROOT / 'manual_review_fixes_unwrapped.sql'

text = IN.read_text(encoding='utf-8')

# Regex to find DO $tag$ BEGIN ... END $tag$;
# We capture when the inner body is exactly one IF ... END IF; (with possible whitespace)
pattern = re.compile(
    r"DO\s+\$([A-Za-z0-9_]*)\$\s*BEGIN\s*(IF\b[\s\S]*?END\s+IF;)\s*END\s+\$\1\$;",
    flags=re.IGNORECASE
)

iteration = 0
while True:
    new_text, count = pattern.subn(r"\2", text)
    iteration += 1
    if count == 0:
        break
    text = new_text

OUT.write_text(text, encoding='utf-8')
print(f"Wrote {OUT} (removed wrappers in {iteration} passes)")
