#!/usr/bin/env python3
"""
Unwrap DO blocks that contain `EXECUTE $tag$ ... CREATE INDEX ... $tag$;`
by replacing the entire DO block with one or more `IF NOT EXISTS (...) THEN EXECUTE ... END IF;` lines.

This is an aggressive, global pass — it will replace any DO block containing
an EXECUTE that appears to create an index (or similar). The script writes
`manual_review_fixes_idempotent_unwrapped.sql` and updates
`manual_review_fixes.sql` (with a backup).
"""
import re
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "manual_review_fixes.sql"
OUT = ROOT / "manual_review_fixes_idempotent_unwrapped.sql"
BAK = ROOT / "manual_review_fixes.sql.bak_unwrap"

if not SRC.exists():
    print(f"Source file not found: {SRC}")
    sys.exit(1)

text = SRC.read_text(encoding='utf-8')

do_block_re = re.compile(r"(DO\s*\$[A-Za-z0-9_]*\$(.*?)END\$[A-Za-z0-9_]*\$\s*(?:LANGUAGE\s+\w+\s*;|;))",
                         re.IGNORECASE | re.DOTALL)

exec_re = re.compile(r"EXECUTE\s*(\$[A-Za-z0-9_]*\$)(.*?)(\1)\s*;", re.IGNORECASE | re.DOTALL)

create_index_re = re.compile(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?P<name>(?:\"[^\"]+\"|[\w.]+))",
                             re.IGNORECASE)

replacements = 0
out_parts = []
last = 0

for m in do_block_re.finditer(text):
    full = m.group(1)
    inner = m.group(2)
    s = m.start(1)
    e = m.end(1)
    out_parts.append(text[last:s])
    last = e

    execs = list(exec_re.finditer(inner))
    if not execs:
        out_parts.append(full)
        continue

    parts = []
    ok = False
    for ex in execs:
        tag = ex.group(1)
        body = ex.group(2)
        ci = create_index_re.search(body)
        if ci:
            raw_name = ci.group('name')
            if '.' in raw_name:
                name = raw_name.split('.')[-1]
            else:
                name = raw_name
            name = name.strip('"')
            part = f"IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = '{name}' AND c.relkind = 'i') THEN\n  EXECUTE {tag}{body}{tag};\nEND IF;"
            parts.append(part)
            ok = True
        else:
            # If we can't find an index name, but there is an EXECUTE, include it verbatim
            parts.append(f"-- Unwrapped EXECUTE (no index name found)\nEXECUTE {tag}{body}{tag};")
            ok = True

    if not ok:
        out_parts.append(full)
    else:
        replacements += 1
        out_parts.append('\n'.join(parts))

out_parts.append(text[last:])
new_text = ''.join(out_parts)

if replacements == 0:
    print("No DO blocks with EXECUTE CREATE found to unwrap.")
    sys.exit(0)

if not BAK.exists():
    BAK.write_text(SRC.read_text(encoding='utf-8'), encoding='utf-8')

OUT.write_text(new_text, encoding='utf-8')
SRC.write_text(new_text, encoding='utf-8')
print(f"Wrote {OUT} and updated {SRC} (unwrapped {replacements} DO blocks)")
