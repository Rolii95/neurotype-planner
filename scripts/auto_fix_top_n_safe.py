#!/usr/bin/env python3
"""
Safe auto-fixer: only performs non-structural cleanup on the top N failing blocks.
- Removes numeric-only lines inside blocks (likely stray IDs).
- Ensures newlines before `DO $$` / `AS $$` tokens when concatenated.
- Writes `manual_review_fixes_fixed_safe_top<N>.sql` and does NOT overwrite input unless confirmed.
"""
import re
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MIG_ERRORS = ROOT / 'migration_errors.txt'
MANUAL_IN = ROOT / 'manual_review_fixes.sql'


def read_failure_ids_from_migration_errors(n):
    if not MIG_ERRORS.exists():
        raise FileNotFoundError(str(MIG_ERRORS))
    ids = []
    for line in MIG_ERRORS.read_text(encoding='utf-8', errors='ignore').splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(\d+)\t", line)
        if m:
            ids.append(int(m.group(1)))
            if len(ids) >= n:
                break
    return ids


def fix_concatenation_artifacts(s: str) -> str:
    s = re.sub(r"(?m)^\s*\d+\s*$", "", s)
    s = re.sub(r"(?m)(?P<num>\d+)(?=DO\b)", r"\g<num>\n", s)
    s = re.sub(r"(?m)(?<!\n)(?P<tag>DO\s+\$\$)", r"\n\g<tag>", s)
    s = re.sub(r"(?m)(?<!\n)(?P<tag>AS\s+\$\$)", r"\n\g<tag>", s)
    s = re.sub(r"(?m)^[ \t]+", "", s)
    s = s.strip() + "\n"
    return s


def parse_manual_file_and_replace(ids_to_fix):
    if not MANUAL_IN.exists():
        raise FileNotFoundError(str(MANUAL_IN))
    content = MANUAL_IN.read_text(encoding='utf-8', errors='ignore')
    parts = re.split(r'(-- PROPOSED FIX: Reassembled function for failing statement\s+(\d+)\s*\n)', content)
    if len(parts) < 2:
        print('No proposed fix markers found in manual input; nothing to do.')
        return None
    out = parts[0]
    i = 1
    changed_ids = []
    while i < len(parts)-1:
        sep = parts[i]
        id_part = parts[i+1]
        block = parts[i+2]
        m = re.search(r'(\d+)', id_part)
        if not m:
            out += sep + block
            i += 3
            continue
        pid = int(m.group(1))
        if pid in ids_to_fix:
            print(f'Applying safe fixes to block {pid}')
            fixed = fix_concatenation_artifacts(block)
            out += sep + fixed
            changed_ids.append(pid)
        else:
            out += sep + block
        i += 3
    if i < len(parts):
        out += ''.join(parts[i:])
    return out, changed_ids


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--top', type=int, default=10)
    parser.add_argument('--ids', type=str)
    args = parser.parse_args()

    if args.ids:
        ids = [int(x) for x in args.ids.split(',') if x.strip()]
    else:
        ids = read_failure_ids_from_migration_errors(args.top)
    print('IDs to attempt safe fix for:', ids)

    result = parse_manual_file_and_replace(ids)
    if result is None:
        print('No changes made.')
        return
    out, changed = result
    out_path = ROOT / f'manual_review_fixes_fixed_safe_top{len(ids)}.sql'
    out_path.write_text(out, encoding='utf-8')
    print(f'Wrote fixed file: {out_path}')
    confirm = input(f'Overwrite {MANUAL_IN} with fixed file? (y/N): ').strip().lower()
    if confirm == 'y':
        MANUAL_IN.write_text(out, encoding='utf-8')
        print(f'Overwrote {MANUAL_IN}. Changed blocks: {changed}')
    else:
        print('Did not overwrite manual input. Inspect the fixed file before applying.')

if __name__ == '__main__':
    main()
