#!/usr/bin/env python3
"""
Re-export cleaned PROPOSED FIX blocks from `manual_review_fixes_auto_repaired.sql`.
Conservative cleaning per block:
- Remove leading/trailing numeric-only lines
- Collapse repeated 'END IF;' sequences
- Ensure DO/AS $$ blocks contain BEGIN/END;
- Convert standalone 'CREATE TYPE IF NOT EXISTS name AS ENUM (...) ;' into a guarded DO $$ BEGIN IF NOT EXISTS ... END; END $$;
- Write per-block cleaned files `attempted_fix_<id>_clean.sql` and one combined `manual_review_fixes_clean_export.sql`.

This script is conservative and creates backups.
"""
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
AUTO = ROOT / 'manual_review_fixes_auto_repaired.sql'
OUT = ROOT / 'manual_review_fixes_clean_export.sql'
BACKUP = ROOT / 'manual_review_fixes_clean_export.sql.bak'

if not AUTO.exists():
    print(f'Missing input file: {AUTO}')
    raise SystemExit(1)

text = AUTO.read_text(encoding='utf-8', errors='ignore')
# Split by proposed fix markers
parts = re.split(r'(-- PROPOSED FIX: Reassembled function for failing statement\s+(\d+)\s*\n)', text)
if len(parts) < 2:
    print('No proposed fix markers found in', AUTO)
    raise SystemExit(0)

header = parts[0]
out = header


def strip_numeric_lines(s: str) -> str:
    return re.sub(r"(?m)^\s*\d+\s*$", "", s)


def collapse_end_if(s: str) -> str:
    return re.sub(r'(?:\s*END IF;\s*){2,}', '\nEND IF;\n', s, flags=re.IGNORECASE)


def ensure_do_begin_end(s: str) -> str:
    def repl(m):
        op = m.group('op')
        inner = m.group('inner')
        clos = m.group('clos')
        if re.search(r'\bBEGIN\b', inner, flags=re.IGNORECASE):
            if re.search(r'END\s*;\s*$', inner.strip(), flags=re.IGNORECASE):
                return op + inner + clos
            else:
                return op + inner.rstrip() + '\nEND;\n' + clos
        else:
            return op + '\nBEGIN\n' + inner.rstrip() + '\nEND;\n' + clos
    pattern = re.compile(r'(?P<op>(?:DO|AS)\s+\$\$)(?P<inner>.*?)(?P<clos>\$\$;?)', flags=re.IGNORECASE | re.DOTALL)
    return pattern.sub(repl, s)


def guard_create_type(s: str) -> str:
    # Replace standalone CREATE TYPE IF NOT EXISTS name AS ENUM (...) ; with guarded DO block
    def repl(m):
        name = m.group('name')
        body = m.group('body')
        # Escape single quotes inside the enum values for embedding
        vals = body.strip()
        vals_escaped = vals.replace("'", "''")
        exec_sql = f"CREATE TYPE {name} AS ENUM ({vals_escaped});"
        guarded = (
            "DO $$\nBEGIN\n"
            f"  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN\n"
            f"    EXECUTE '{exec_sql}';\n"
            "  END IF;\nEND$$;\n"
        )
        return guarded
    pattern = re.compile(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+(?P<name>[a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\((?P<body>.*?)\)\s*;", flags=re.IGNORECASE | re.DOTALL)
    return pattern.sub(repl, s)

clean_ids = []
# iterate through parts: [pre, sep1, id1, block1, sep2, id2, block2, ...]
for i in range(1, len(parts)-1, 3):
    sep = parts[i]
    id_part = parts[i+1]
    block = parts[i+2]
    m = re.search(r'(\d+)', id_part)
    if not m:
        out += sep + block
        continue
    pid = int(m.group(1))
    b = block
    b = strip_numeric_lines(b)
    b = collapse_end_if(b)
    b = ensure_do_begin_end(b)
    b = guard_create_type(b)
    # final clean whitespace
    b = re.sub(r"\n{3,}", "\n\n", b).strip() + "\n"
    # write per-block cleaned file for manual inspection
    (ROOT / f'attempted_fix_{pid}_clean.sql').write_text(b, encoding='utf-8')
    clean_ids.append(pid)
    out += sep + b

# write combined output
if OUT.exists():
    if not BACKUP.exists():
        OUT.replace(BACKUP)
        print(f'Backed up existing {OUT} -> {BACKUP}')

OUT.write_text(out, encoding='utf-8')
print(f'Wrote cleaned combined file: {OUT}')
print(f'Wrote cleaned per-block files for IDs: {clean_ids[:20]} (total {len(clean_ids)})')
print('Review the cleaned file before running the executor.')
