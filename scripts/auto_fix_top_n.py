#!/usr/bin/env python3
"""
Conservative auto-fixer for top N failing attempted_fix blocks.
- Reads `scripts/migration_errors.txt` to extract failing IDs (or accept --ids).
- Reads `scripts/manual_review_fixes.sql`, replaces the block contents for each ID with repaired content.
- Writes `scripts/manual_review_fixes_fixed_top<N>.sql` and backs up original `scripts/manual_review_fixes.sql.bak`.
- Conservative fixes implemented:
  - `IF IFT EXISTS` -> `IF NOT EXISTS`
  - Convert `CREATE TYPE IF NOT EXISTS name AS ENUM (...)` into guarded DO $$ BEGIN IF NOT EXISTS(...) THEN EXECUTE 'CREATE TYPE ...'; END IF; END $$;
  - Ensure DO/AS $$ blocks contain a `BEGIN` and an `END;` before the closing `$$` when appropriate.
  - Remove repeated `END IF;` runs to a single `END IF;`.
  - Remove simple nested `DO $$` inside `EXECUTE $exec$` by stripping inner DO/END wrappers where found.

This script is conservative and writes backups. Review outputs before running the executor.
"""

import re
import argparse
import os
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


def escape_for_execute_sql(s: str) -> str:
    # Double single quotes to embed into EXECUTE '...'
    return s.replace("'", "''")


def fix_if_ift_exists(s: str) -> str:
    return s.replace('IF IFT EXISTS', 'IF NOT EXISTS')


def collapse_repeated_end_if(s: str) -> str:
    return re.sub(r'(?:\s*END IF;\s*){2,}', '\nEND IF;\n', s, flags=re.IGNORECASE)


def fix_create_type_to_guarded(s: str) -> str:
    # Replace CREATE TYPE IF NOT EXISTS name AS ENUM (...) with guarded DO block.
    # Conservative: only when pattern is simple and ends with a semicolon.
    def repl(m):
        name = m.group('name')
        body = m.group('body')
        body_inner = body.strip()
        # Escape single quotes in the body for embedding in EXECUTE
        escaped = escape_for_execute_sql(body_inner)
        # Build EXECUTE statement — keep the original enum parentheses
        # We'll reconstruct: EXECUTE 'CREATE TYPE name AS ENUM ('<values>')';
        exec_sql = f"CREATE TYPE {name} AS ENUM ({escaped});"
        guarded = (
            "DO $$\nBEGIN\n"
            f"  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN\n"
            f"    EXECUTE '{exec_sql}';\n"
            "  END IF;\nEND$$;"
        )
        return guarded

    pattern = re.compile(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+(?P<name>[a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\((?P<body>.*?)\)\s*;", flags=re.IGNORECASE | re.DOTALL)
    # Only substitute when a single match found to avoid accidental wide replacements.
    if len(pattern.findall(s)) == 0:
        return s
    return pattern.sub(repl, s)


def ensure_do_has_begin_end(s: str) -> str:
    # Find DO $$ ... $$ blocks and ensure they contain a BEGIN and an END; before the closing $$
    def repl(m):
        opener = m.group('op')  # DO $$ or AS $$
        inner = m.group('inner')
        # If inner already has BEGIN (word) return unchanged
        if re.search(r'\bBEGIN\b', inner, flags=re.IGNORECASE):
            # ensure there's an END; before end
            if re.search(r'END\s*;\s*$', inner.strip(), flags=re.IGNORECASE):
                return opener + inner + m.group('clos')
            else:
                return opener + inner.rstrip() + '\nEND;\n' + m.group('clos')
        else:
            # Insert BEGIN ... END;
            new_inner = '\nBEGIN\n' + inner.rstrip() + '\nEND;\n'
            return opener + new_inner + m.group('clos')

    # Patterns: (DO\s+\$\$)(.*?)(\$\$;?) or (AS\s+\$\$)(.*?)(\$\$;?)
    pattern = re.compile(r'(?P<op>(?:DO|AS)\s+\$\$)(?P<inner>.*?)(?P<clos>\$\$;?)', flags=re.IGNORECASE | re.DOTALL)
    return pattern.sub(repl, s)


def unwrap_exec_do(s: str) -> str:
    # Heuristic: if an EXECUTE $exec$ contains an inner DO $$ ... $$, remove the inner DO wrappers.
    # Replace "EXECUTE $exec$ DO $$ <body> END $$;" -> "EXECUTE $exec$ <body>;"
    # Works when the inner body is valid SQL to be EXECUTE'd directly.
    pattern = re.compile(r"EXECUTE\s+\$exec\$\s*(?:DO\s+\$\$)\s*(?P<body>.*?)\s*(?:END\s*;)?\s*\$\$\s*;", flags=re.IGNORECASE | re.DOTALL)
    def repl(m):
        body = m.group('body').strip()
        # Escape single quotes for embedding in $exec$ if necessary - but $exec$ is dollar-quoted, so keep raw
        return f"EXECUTE $exec$ {body};"
    s2 = pattern.sub(repl, s)
    # Also handle other dollar tag variants inside EXECUTE blocks (e.g., $E$ or $q$) conservatively: remove inner DO $$ wrappers
    s2 = re.sub(r"DO\s+\$\$", "", s2, flags=re.IGNORECASE)
    s2 = re.sub(r"END\s*;\s*\$\$\s*;", ";", s2, flags=re.IGNORECASE)
    return s2


def conservative_fix_block(s: str) -> str:
    orig = s
    s = fix_if_ift_exists(s)
    s = collapse_repeated_end_if(s)
    s = fix_create_type_to_guarded(s)
    s = ensure_do_has_begin_end(s)
    s = unwrap_exec_do(s)
    s = fix_concatenation_artifacts(s)
    # Final cleanup: remove sequences of multiple blank lines
    s = re.sub(r"\n{3,}", "\n\n", s)
    if s != orig:
        return s
    return s


def fix_concatenation_artifacts(s: str) -> str:
    """
    Conservative cleanup for artifacts like leading numeric lines or missing
    newlines between numeric markers and following DO blocks (e.g. "6128DO $$").
    - Remove lines that contain only digits.
    - Ensure there's a newline before any 'DO $$' token when it's glued to previous text.
    - Insert newline between a run of digits and a following 'DO' when they are concatenated.
    """
    # Remove lines that are only digits (probably stray block ids)
    s = re.sub(r"(?m)^\s*\d+\s*$", "", s)

    # If digits are immediately followed by 'DO $$' without whitespace, insert newline
    s = re.sub(r"(?m)(?P<num>\d+)(?=DO\b)", r"\g<num>\n", s)

    # Ensure there's a newline before any 'DO $$' that doesn't already start on a new line
    s = re.sub(r"(?m)(?<!\n)(?P<tag>DO\s+\$\$)", r"\n\g<tag>", s)

    # Also ensure a newline before 'AS $$' blocks which can be concatenated
    s = re.sub(r"(?m)(?<!\n)(?P<tag>AS\s+\$\$)", r"\n\g<tag>", s)

    # Trim leading/trailing whitespace lines
    s = re.sub(r"(?m)^[ \t]+", "", s)
    s = s.strip() + "\n"
    return s


def parse_manual_file_and_replace(ids_to_fix):
    if not MANUAL_IN.exists():
        raise FileNotFoundError(str(MANUAL_IN))
    content = MANUAL_IN.read_text(encoding='utf-8', errors='ignore')
    # Split by proposed fix markers
    parts = re.split(r'(-- PROPOSED FIX: Reassembled function for failing statement\s+(\d+)\s*\n)', content)
    # re.split keeps separators; structure: [pre, sep1, id1, block1, sep2, id2, block2, ... , tail]
    if len(parts) < 2:
        print('No proposed fix markers found in manual input; nothing to do.')
        return None
    out = parts[0]
    i = 1
    changed_ids = []
    while i < len(parts)-1:
        sep = parts[i]
        id_part = parts[i+1]
        # The block is next element after id marker
        block = parts[i+2]
        # Extract numeric id from id_part
        m = re.search(r'(\d+)', id_part)
        if not m:
            out += sep + id_part + block
            i += 3
            continue
        pid = int(m.group(1))
        if pid in ids_to_fix:
            print(f'Applying conservative fixes to block {pid}')
            fixed = conservative_fix_block(block)
            # `sep` already contains the full separator including the id and newline,
            # so append only `sep` and the (possibly fixed) block to avoid duplicating the id.
            out += sep + fixed
            changed_ids.append(pid)
        else:
            out += sep + block
        i += 3
    # append any tail
    if i < len(parts):
        out += ''.join(parts[i:])
    return out, changed_ids


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--top', type=int, default=10, help='Top N failing blocks to fix (default 10)')
    parser.add_argument('--ids', type=str, help='Comma-separated specific ids to fix (overrides --top)')
    args = parser.parse_args()

    if args.ids:
        ids = [int(x) for x in args.ids.split(',') if x.strip()]
    else:
        ids = read_failure_ids_from_migration_errors(args.top)
    print('IDs to attempt fix for:', ids)

    # Backup manual file
    bak = MANUAL_IN.with_suffix(MANUAL_IN.suffix + '.bak')
    if MANUAL_IN.exists():
        if not bak.exists():
            bak.write_text(MANUAL_IN.read_text(encoding='utf-8', errors='ignore'), encoding='utf-8')
            print(f'Backed up {MANUAL_IN} -> {bak}')
        else:
            print(f'Backup already exists: {bak}')

    out, changed = parse_manual_file_and_replace(ids)
    if out is None:
        print('No changes made.')
        return
    out_path = ROOT / f'manual_review_fixes_fixed_top{len(ids)}.sql'
    out_path.write_text(out, encoding='utf-8')
    print(f'Wrote fixed file: {out_path}')

    # Overwrite the executor input as a cautious opt-in
    confirm = input(f'Overwrite {MANUAL_IN} with fixed file? (y/N): ').strip().lower()
    if confirm == 'y':
        MANUAL_IN.write_text(out, encoding='utf-8')
        print(f'Overwrote {MANUAL_IN} with fixed content. Changed blocks: {changed}')
    else:
        print('Did not overwrite manual input. You can inspect the fixed file and copy it manually.')

if __name__ == '__main__':
    main()
