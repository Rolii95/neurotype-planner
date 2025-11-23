#!/usr/bin/env python3
"""Repair EXECUTE $$CREATE INDEX...$$ occurrences by wrapping them
in an IF NOT EXISTS check (on pg_class.relname AND relkind='i') to
make them idempotent inside DO blocks.

Writes:
 - scripts/manual_review_fixes_idempotent_fixed2.sql (modified content)
 - also backs up original `manual_review_fixes.sql` to `manual_review_fixes.backup.sql`

This is a heuristic tool — review the output before applying to production.
"""
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
INFILE = ROOT.joinpath('manual_review_fixes.sql')
OUTFILE = ROOT.joinpath('manual_review_fixes_idempotent_fixed2.sql')
BACKUP = ROOT.joinpath('manual_review_fixes.backup.sql')
if not INFILE.exists():
    print(f"Input file not found: {INFILE}")
    raise SystemExit(1)
text = INFILE.read_text(encoding='utf-8')
# Pattern matches EXECUTE $$CREATE [UNIQUE ]INDEX <name> ...$$;
# We capture the full CREATE ... statement (group 1) and the index name (group 2).
pattern = re.compile(r"EXECUTE\s*\$\$\s*(CREATE\s+(?:UNIQUE\s+)?INDEX)\s+([A-Za-z0-9_\"]+)\s+(ON\s+.*?)\$\$;", re.IGNORECASE | re.DOTALL)
# We'll perform replacements iteratively to count and show context
count = 0
def repl(m):
    global count
    count += 1
    full_create = m.group(1) + ' ' + m.group(2) + ' ' + m.group(3)
    idx_name_raw = m.group(2)
    # Remove wrapping double-quotes for the relname check if present
    idx_name_check = idx_name_raw.strip('"')
    # Build replacement: an IF NOT EXISTS check then EXECUTE the original CREATE
    replacement = (f"IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '{idx_name_check}' AND relkind = 'i') THEN\n"
                   f"    EXECUTE $$ {full_create} $$;\n"
                   f"END IF;")
    return replacement
new_text, nsub = pattern.subn(repl, text)
# Also try to catch CREATE INDEX with index name and options where pattern may not match due to newlines
# If no replacements found, try a looser pattern: we look for EXECUTE $$CREATE ... INDEX ... $$;
if nsub == 0:
    loose = re.compile(r"EXECUTE\s*\$\$\s*(CREATE[\s\S]*?INDEX[\s\S]*?)\$\$;", re.IGNORECASE)
    def repl_loose(m):
        global count
        count += 1
        create_stmt = m.group(1).strip()
        # Try to extract index name by searching for 'CREATE ... INDEX <name>'
        m2 = re.search(r"INDEX\s+([A-Za-z0-9_\"]+)", create_stmt, re.IGNORECASE)
        if m2:
            idx = m2.group(1).strip('"')
        else:
            idx = 'unknown_index'
        return (f"IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '{idx}' AND relkind = 'i') THEN\n"
                f"    EXECUTE $$ {create_stmt} $$;\n"
                f"END IF;")
    new_text, nsub2 = loose.subn(repl_loose, text)
    nsub = nsub2
# Backup original
BACKUP.write_text(text, encoding='utf-8')
OUTFILE.write_text(new_text, encoding='utf-8')
# Also copy into manual_review_fixes.sql so apply script can pick it up
OUT_MAIN = ROOT.joinpath('manual_review_fixes.sql')
OUT_MAIN.write_text(new_text, encoding='utf-8')
print(f"Wrote {OUTFILE} and updated {OUT_MAIN} (replacements: {nsub})")
