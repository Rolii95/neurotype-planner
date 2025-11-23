"""Aggressively remove DO $tag$ / END $tag$; wrappers from the input SQL file.

This is a heuristic, destructive transform intended to flatten nested DO wrappers
so we can re-wrap blocks in a single controlled DO wrapper later.

Reads: `manual_review_fixes.sql`
Writes: `manual_review_fixes_flattened.sql`
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_flattened.sql'

text = IN.read_text(encoding='utf-8')

# Remove opening DO $tag$ BEGIN (various whitespace/newline permutations)
text = re.sub(r"DO\s+\$[A-Za-z0-9_]*\$\s*BEGIN\s*", "", text, flags=re.IGNORECASE)

# Remove closing END $tag$; possibly followed by LANGUAGE plpgsql; or just semicolon
text = re.sub(r"END\s+\$[A-Za-z0-9_]*\$\s*;\s*(LANGUAGE\s+plpgsql;)?", "", text, flags=re.IGNORECASE)

# Also remove lone 'DO $tag$;' patterns if exist
text = re.sub(r"DO\s+\$[A-Za-z0-9_]*\$\s*;", "", text, flags=re.IGNORECASE)

OUT.write_text(text, encoding='utf-8')
print(f'Wrote {OUT} (flattened DO wrappers).')
