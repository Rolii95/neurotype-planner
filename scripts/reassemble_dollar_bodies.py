#!/usr/bin/env python3
"""Reassemble PL/pgSQL blocks by treating dollar-quoted bodies as atomic units.

This script protects dollar-quoted bodies inside each `-- PROPOSED FIX:` block
by replacing them with placeholders, runs conservative collapse/cleanup
transforms (to remove duplicate immediate wrappers), then restores the
dollar-quoted bodies. The goal is to avoid splitting or mangling function
bodies and to reduce BEGIN/END mismatches introduced by earlier regex
transforms.

Writes: `manual_review_fixes_reassembled.sql`.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
INPUT_CANDIDATES = [
    ROOT / 'manual_review_fixes_parsed.sql',
    ROOT / 'manual_review_fixes_rewritten.sql',
    ROOT / 'manual_review_fixes_unwrapped.sql',
    ROOT / 'manual_review_fixes_sanitized.sql',
    ROOT / 'manual_review_fixes_auto_repaired.sql',
]

def find_input():
    for p in INPUT_CANDIDATES:
        if p.exists():
            return p
    raise FileNotFoundError('No input file found; expected one of: ' + ','.join(map(str,INPUT_CANDIDATES)))

def protect_dollar_bodies(text: str):
    # find all dollar-quoted bodies and replace with placeholders
    pattern = re.compile(r"(\$[A-Za-z0-9_]*\$)(.*?)(\1)", flags=re.DOTALL)
    bodies = []
    def repl(m):
        idx = len(bodies)
        bodies.append(m.group(0))
        return f"__DOLLAR_BODY_{idx}__"
    new = pattern.sub(repl, text)
    return new, bodies

def restore_dollar_bodies(text: str, bodies):
    for i, b in enumerate(bodies):
        text = text.replace(f"__DOLLAR_BODY_{i}__", b)
    return text

def collapse_duplicate_guard_patterns(text: str) -> str:
    # collapse immediate nested IF guards for same pg_type typname
    type_pattern = re.compile(
        r"IF NOT EXISTS \(SELECT 1 FROM pg_type WHERE typname = '([A-Za-z0-9_]+)'\) THEN\s*DO \$[A-Za-z0-9_]*\$\s*BEGIN\s*IF NOT EXISTS \(SELECT 1 FROM pg_type WHERE typname = '\1'\) THEN",
        flags=re.IGNORECASE
    )
    text = type_pattern.sub(r"IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '\1') THEN", text)

    # collapse trailing END sequences introduced by nested wrappers
    trailing_pattern = re.compile(r"END IF;\s*END \$[A-Za-z0-9_]*\$;\s*END IF;", flags=re.IGNORECASE)
    text = trailing_pattern.sub("END IF;", text)

    # collapse duplicate pg_class index guards
    idx_pattern = re.compile(
        r"IF NOT EXISTS \(SELECT 1 FROM pg_class WHERE relname = '([A-Za-z0-9_]+)' AND relkind = 'i'\) THEN\s*DO \$[A-Za-z0-9_]*\$\s*BEGIN\s*IF NOT EXISTS \(SELECT 1 FROM pg_class WHERE relname = '\1' AND relkind = 'i'\) THEN",
        flags=re.IGNORECASE
    )
    text = idx_pattern.sub(r"IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '\1' AND relkind = 'i') THEN", text)

    # collapse trailing index END patterns
    text = trailing_pattern.sub("END IF;", text)

    return text

def remove_redundant_do_wrappers(text: str) -> str:
    # Remove DO $tag$ wrappers that only enclose a single IF ... END IF; block
    pattern = re.compile(r"DO\s+\$([A-Za-z0-9_]*)\$\s*BEGIN\s*(IF\b[\s\S]*?END\s+IF;)\s*END\s+\$\1\$;", flags=re.IGNORECASE)
    prev = None
    while prev != text:
        prev = text
        text = pattern.sub(r"\2", text)
    return text

def process_block(block_body: str) -> str:
    # Protect dollar bodies
    protected, bodies = protect_dollar_bodies(block_body)
    # Apply conservative collapse transforms
    step1 = collapse_duplicate_guard_patterns(protected)
    step2 = remove_redundant_do_wrappers(step1)
    # Restore bodies
    restored = restore_dollar_bodies(step2, bodies)
    return restored

def main():
    inp = find_input()
    text = inp.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX:", text)
    header = parts[0]
    out_blocks = [header]
    for p in parts[1:]:
        lines = p.splitlines()
        hdr = lines[0] if lines else ''
        body = '\n'.join(lines[1:])
        try:
            new_body = process_block(body)
        except Exception:
            new_body = body
        out_blocks.append(f"-- PROPOSED FIX: {hdr}\n{new_body}\n")

    outp = ROOT / 'manual_review_fixes_reassembled.sql'
    outp.write_text('\n'.join(out_blocks), encoding='utf-8')
    print(f"Wrote {outp}")

if __name__ == '__main__':
    main()
