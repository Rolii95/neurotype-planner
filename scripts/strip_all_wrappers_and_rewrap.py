#!/usr/bin/env python3
"""Aggressive strip-and-rewrap for PROPOSED FIX blocks.

This script removes all surrounding DO/$tag$ wrappers from each PROPOSED FIX
block (while preserving dollar-quoted bodies) and then re-wraps each block
exactly once in `DO $wrap$ BEGIN ... END $wrap$ LANGUAGE plpgsql;` unless the
block contains a top-level `CREATE FUNCTION` (which is left intact).

Writes `manual_review_fixes_aggressive2.sql` and can optionally replace
`manual_review_fixes.sql` when run with --replace.
"""
import re
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_aggressive2.sql'

DO_OPEN_RE = re.compile(r"(?is)DO\s+\$[A-Za-z0-9_]*\$\s*BEGIN\s*")
DO_CLOSE_RE = re.compile(r"(?is)END\s+\$[A-Za-z0-9_]*\$\s*(LANGUAGE\s+plpgsql;|;)?")
DOLLAR_Q = re.compile(r"\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$")

def protect_dollars(s: str):
    bodies = {}
    def repl(m):
        key = f"__DOLLAR_{len(bodies)}__"
        bodies[key] = m.group(0)
        return key
    s2 = DOLLAR_Q.sub(repl, s)
    return s2, bodies

def restore_dollars(s: str, bodies: dict):
    for k,v in bodies.items():
        s = s.replace(k, v)
    return s

def strip_wrappers(block: str) -> str:
    # Protect dollar bodies
    safe, bodies = protect_dollars(block)
    # Remove all DO $tag$ BEGIN occurrences
    safe = DO_OPEN_RE.sub('', safe)
    # Remove all matching END $tag$ LANGUAGE plpgsql; / END $tag$; closers
    safe = DO_CLOSE_RE.sub('', safe)
    # Trim excessive leading/trailing whitespace/newlines
    safe = safe.strip() + '\n'
    # Restore dollar bodies
    return restore_dollars(safe, bodies)

def rewrap_block(body: str) -> str:
    # If a full CREATE FUNCTION is inside, leave as-is
    if re.search(r"(?i)CREATE\s+FUNCTION", body):
        return body
    return f"DO $wrap$\nBEGIN\n{body}\nEND $wrap$ LANGUAGE plpgsql;\n"

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--replace', action='store_true', help='Replace manual_review_fixes.sql with output (backup created)')
    args = p.parse_args()

    text = IN.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
    if len(parts) < 3:
        print('No PROPOSED FIX blocks found')
        return
    pre = parts[0]
    out = [pre]
    for i in range(1, len(parts), 2):
        bid = parts[i]
        block = parts[i+1]
        stripped = strip_wrappers(block)
        wrapped = rewrap_block(stripped)
        out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
        out.append(wrapped)

    OUT.write_text(''.join(out), encoding='utf-8')
    print(f'Wrote {OUT}')

    if args.replace:
        bak = IN.parent.joinpath(IN.name + '.aggressive2.bak')
        IN.replace(bak)
        OUT.replace(IN)
        print(f'Replaced {IN} (backup at {bak})')

if __name__ == '__main__':
    main()
