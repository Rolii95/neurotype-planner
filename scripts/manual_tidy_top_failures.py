#!/usr/bin/env python3
"""Manual-triage helper: apply conservative per-block fixes to top failing attempted SQL files.

This script:
- reads `scripts/migration_errors.txt` to select top N failing block ids
- loads `scripts/attempted_fix_<id>.sql` for each id and applies conservative fixes:
  - collapse duplicate DO $tag$ BEGIN wrappers
  - collapse duplicate END $tag$ LANGUAGE plpgsql; closers
  - ensure DO wrappers have `LANGUAGE plpgsql;`
  - convert `CREATE TYPE IF NOT EXISTS` into guarded DO wrappers
  - drop unmatched END/END IF/END LOOP closers from the end until BEGIN/END balance
- writes `attempted_fix_<id>_fixed.sql` and replaces the corresponding block in
  `scripts/manual_review_fixes.sql` (backing it up first).

Run: python scripts/manual_tidy_top_failures.py --top 20
"""
import re
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANUAL = ROOT / 'manual_review_fixes.sql'
ERRS = ROOT / 'migration_errors.txt'

def parse_top_ids(n=20):
    if not ERRS.exists():
        print('No', ERRS, 'found')
        return []
    ids = []
    with ERRS.open('r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split('\t')
            if not parts:
                continue
            try:
                bid = int(parts[0])
            except Exception:
                continue
            if bid not in ids:
                ids.append(bid)
            if len(ids) >= n:
                break
    return ids

DO_OPEN_RE = re.compile(r"(?is)(DO\s+\$[A-Za-z0-9_]*\$\s*BEGIN\s*)+")
DO_CLOSE_RE = re.compile(r"(?is)(END\s+\$[A-Za-z0-9_]*\$\s*(LANGUAGE\s+plpgsql;|;)?\s*)+")
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

def collapse_wrappers(s: str) -> str:
    s = DO_OPEN_RE.sub('DO $wrap$\nBEGIN\n', s)
    s = DO_CLOSE_RE.sub('END $wrap$ LANGUAGE plpgsql;\n', s)
    return s

def ensure_language_on_do(s: str) -> str:
    # If there's a DO $wrap$ ... END $wrap$ without LANGUAGE, append it
    s = re.sub(r"(?is)(END\s+\$wrap\$\s*;)(?!\s*LANGUAGE)", 'END $wrap$ LANGUAGE plpgsql;', s)
    return s

def guard_create_type(s: str) -> str:
    def repl(m):
        fullname = m.group(1).strip()
        body = m.group(2)
        typ = fullname.split('.')[-1].strip('"').lower()
        exec_sql = f"CREATE TYPE {fullname} AS ENUM ({body});"
        guarded = (
            "DO $$\nBEGIN\n"
            f"  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{typ}') THEN\n"
            f"    EXECUTE $$ {exec_sql} $$;\n"
            "  END IF;\nEND $$;\n"
        )
        return guarded
    s2 = re.sub(r"(?is)CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z0-9_\.\"]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;?", repl, s)
    return s2

def drop_unmatched_closers(s: str) -> str:
    begins = len(re.findall(r"\bBEGIN\b", s, flags=re.IGNORECASE))
    ends = len(re.findall(r"\bEND\b", s, flags=re.IGNORECASE))
    if ends <= begins:
        return s
    lines = s.splitlines()
    i = len(lines) - 1
    while ends > begins and i >= 0:
        line = lines[i].strip()
        if re.match(r"(?i)END(\s+IF)?;?$", line) or re.match(r"(?i)END\s+LOOP;?$", line) or re.match(r"(?i)END\s+CASE;?$", line):
            lines.pop(i)
            ends -= 1
        i -= 1
    return '\n'.join(lines) + '\n'

def repair_content(s: str) -> str:
    safe, bodies = protect_dollars(s)
    safe = collapse_wrappers(safe)
    safe = guard_create_type(safe)
    safe = drop_unmatched_closers(safe)
    safe = ensure_language_on_do(safe)
    out = restore_dollars(safe, bodies)
    return out

def replace_blocks_in_manual(replacements: dict):
    text = MANUAL.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
    if len(parts) < 3:
        print('No blocks found in', MANUAL)
        return 0
    pre = parts[0]
    out = [pre]
    replaced = 0
    for i in range(1, len(parts), 2):
        bid = int(parts[i])
        block = parts[i+1]
        if bid in replacements:
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(replacements[bid])
            replaced += 1
        else:
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(block)
    bak = MANUAL.parent.joinpath(MANUAL.name + '.manual_tidy.bak')
    MANUAL.replace(bak)
    MANUAL.write_text(''.join(out), encoding='utf-8')
    return replaced

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--top', type=int, default=20)
    args = p.parse_args()
    ids = parse_top_ids(args.top)
    if not ids:
        print('No ids to process')
        return
    replacements = {}
    for bid in ids:
        af = ROOT.joinpath(f'attempted_fix_{bid}.sql')
        if not af.exists():
            print('Missing', af)
            continue
        s = af.read_text(encoding='utf-8')
        repaired = repair_content(s)
        outf = ROOT.joinpath(f'attempted_fix_{bid}_fixed.sql')
        outf.write_text(repaired, encoding='utf-8')
        print('Wrote', outf)
        replacements[bid] = repaired
    if not replacements:
        print('No replacements prepared')
        return
    replaced = replace_blocks_in_manual(replacements)
    print(f'Replaced {replaced} blocks in {MANUAL} (backup at {MANUAL}.manual_tidy.bak)')

if __name__ == '__main__':
    main()
