#!/usr/bin/env python3
"""Auto-repair top failing PROPOSED FIX blocks.

Usage: python scripts/auto_repair_top_failures.py --top 10

This script:
- reads `scripts/migration_errors.txt` to select the most recent/top failing block ids
- loads `scripts/manual_review_fixes.sql`, replaces the blocks for those ids with
  conservative repaired variants, and writes a backup and the new `manual_review_fixes.sql`.

Repairs performed (conservative):
- collapse duplicated `DO $tag$\nBEGIN` wrappers
- collapse duplicated closers like `END $tag$ LANGUAGE plpgsql;`
- drop unmatched closing `END` / `END IF;` tokens from the bottom until BEGIN/END balance
- transform `CREATE TYPE IF NOT EXISTS name AS ENUM (...)` into a guarded DO wrapper
"""
import re
import argparse
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent
MANUAL = ROOT / 'manual_review_fixes.sql'
ERRS = ROOT / 'migration_errors.txt'

def parse_top_ids(n=10):
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
            ids.append(bid)
    # preserve order but unique
    uniq = []
    for x in ids:
        if x not in uniq:
            uniq.append(x)
        if len(uniq) >= n:
            break
    return uniq

def collapse_wrappers(s: str) -> str:
    # collapse sequences of DO $tag$ BEGIN repeated into a single leading wrapper
    s = re.sub(r"(?i)(DO\s+\$[A-Za-z0-9_]*\$\s*BEGIN\s*){2,}", lambda m: re.sub(r"(?i)DO\s+\$[A-Za-z0-9_]*\$\s*BEGIN\s*", "DO $wrap$\nBEGIN\n", m.group(0), count=1), s)
    # collapse repeated closing sequences like END $tag$ LANGUAGE plpgsql; repeated
    s = re.sub(r"(?i)(END\s+\$[A-Za-z0-9_]*\$\s*(LANGUAGE\s+plpgsql;|;)?\s*){2,}", lambda m: re.sub(r"(?i)END\s+\$[A-Za-z0-9_]*\$\s*(LANGUAGE\s+plpgsql;|;)?\s*", "END $wrap$ LANGUAGE plpgsql;\n", m.group(0), count=1), s)
    return s

def guard_create_type(s: str) -> str:
    # Convert CREATE TYPE IF NOT EXISTS name AS ENUM (...) into guarded DO wrapper
    def repl(m):
        fullname = m.group(1).strip()
        body = m.group(2)
        # typname in pg_type is lowercased and without schema
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
    # naive line-based approach: count BEGIN vs END; remove trailing END/END IF/END LOOP lines if END>BEGIN
    begins = len(re.findall(r"\bBEGIN\b", s, flags=re.IGNORECASE))
    ends = len(re.findall(r"\bEND\b", s, flags=re.IGNORECASE))
    if ends <= begins:
        return s
    lines = s.splitlines()
    # remove from bottom lines that look like closers until balanced
    i = len(lines) - 1
    while ends > begins and i >= 0:
        line = lines[i].strip()
        if re.match(r"(?i)END(\s+IF)?;?$", line) or re.match(r"(?i)END\s+LOOP;?$", line) or re.match(r"(?i)END\s+CASE;?$", line):
            # remove this line
            lines.pop(i)
            ends -= 1
        i -= 1
    return '\n'.join(lines) + '\n'

def repair_block(s: str) -> str:
    s0 = s
    s = collapse_wrappers(s)
    s = guard_create_type(s)
    s = drop_unmatched_closers(s)
    return s

def replace_blocks_in_manual(ids):
    text = MANUAL.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
    if len(parts) < 3:
        print('No blocks found in', MANUAL)
        return 0
    preamble = parts[0]
    out = [preamble]
    replaced = 0
    for i in range(1, len(parts), 2):
        bid = int(parts[i])
        block = parts[i+1]
        if bid in ids:
            repaired = repair_block(block)
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(repaired)
            replaced += 1
        else:
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(block)
    # backup original
    bak = MANUAL.parent.joinpath(MANUAL.name + '.auto_repair.bak')
    MANUAL.replace(bak)
    MANUAL.write_text(''.join(out), encoding='utf-8')
    return replaced

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--top', type=int, default=10)
    args = p.parse_args()
    ids = parse_top_ids(args.top)
    if not ids:
        print('No failing ids found in', ERRS)
        return
    print('Top ids:', ids)
    replaced = replace_blocks_in_manual(ids)
    print(f'Replaced {replaced} blocks in {MANUAL} (backup at {MANUAL}.auto_repair.bak)')

if __name__ == '__main__':
    main()
