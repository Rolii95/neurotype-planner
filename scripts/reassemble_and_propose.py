#!/usr/bin/env python3
"""
Reassemble fragmented PL/pgSQL function blocks from the original migration
based on failing statement indices, and write proposed full-function SQL
blocks to `scripts/manual_review_fixes.sql` for manual review/approval.

This is a non-destructive helper: it only reads files and writes the proposed
fixes file. It will NOT execute any SQL.
"""
import re
import sys
from pathlib import Path

try:
    import sqlparse
except Exception:
    print("Missing dependency: install sqlparse in your venv (pip install sqlparse)")
    raise

ROOT = Path(__file__).resolve().parent
MIGRATION = ROOT.parent.joinpath('supabase', 'migrations', '20251120_all_migrations_gap_fix.sql')
FAILING = ROOT.joinpath('failing_statements.sql')
OUT = ROOT.joinpath('manual_review_fixes.sql')


def load_failing_indices():
    text = FAILING.read_text(encoding='utf-8')
    # Find all headers like: -- STATEMENT 6126/6722
    idxs = [int(m.group(1)) for m in re.finditer(r'^-- STATEMENT\s+(\d+)/\d+', text, flags=re.M)]
    return idxs


def split_migration():
    raw = MIGRATION.read_text(encoding='utf-8')
    # Use sqlparse.split to get top-level statement chunks (same approach used previously)
    stmts = sqlparse.split(raw)
    return stmts


def find_function_block(statements, target_index, max_back=2000, max_forward=2000):
    # statements is a list; target_index is 1-based statement index from the runner
    idx = target_index - 1
    n = len(statements)

    # Search backwards for a CREATE FUNCTION header
    header_idx = None
    for back in range(max_back):
        j = idx - back
        if j < 0:
            break
        s = statements[j].lstrip()
        # Match several possible block headers (functions, DO $$ blocks, types, procedures)
        if re.match(r'(?is)^(CREATE\s+(OR\s+REPLACE\s+)?FUNCTION|CREATE\s+TYPE|DO\s+\$\$|CREATE\s+OR\s+REPLACE\s+PROCEDURE)\b', s):
            header_idx = j
            break

    if header_idx is None:
        return None

    # Search forward from header_idx to find the end of the dollar-quoted block
    # Heuristic: collect until we observe the $$ terminator and a LANGUAGE clause
    joined = ''
    end_idx = header_idx
    for fwd in range(max_forward):
        if end_idx >= n:
            break
        joined += '\n' + statements[end_idx]
        # Count occurrences of $$ in joined text. A complete dollar-quoted block will have at least 2
        dollar_count = joined.count('$$')
        # Also check for a LANGUAGE clause near $$
        if dollar_count >= 2 and re.search(r'\$\$[^\n]*\bLANGUAGE\b', joined, flags=re.I):
            return header_idx, end_idx
        # Some functions may use $$; with LANGUAGE on same statement
        if re.search(r'\$\$\s*;\s*$', statements[end_idx].strip()) and re.search(r'\bLANGUAGE\b', statements[end_idx-1] if end_idx-1>=0 else ''):
            return header_idx, end_idx
        end_idx += 1

    # Fallback: if we saw '$$' twice anywhere in the forward window, accept that
    if '$$' in joined:
        return header_idx, min(n-1, header_idx + max_forward)

    return None


def main(count_only=False):
    if not MIGRATION.exists():
        print(f"Migration file not found: {MIGRATION}")
        sys.exit(1)

    indices = load_failing_indices()
    if not indices:
        print("No failing statement indices found in failing_statements.sql")
        sys.exit(0)

    stmts = split_migration()
    total = len(stmts)
    print(f"Migration split into {total} statements; found {len(indices)} failing indices")

    # Process all failing indices (previously we limited to first 30)
    first_indices = indices

    out_lines = []
    meta = []
    for t in first_indices:
        if t < 1 or t > len(stmts):
            out_lines.append(f"-- MANUAL REVIEW: statement index out of range {t}\n")
            meta.append((t, None, None))
            continue
        res = find_function_block(stmts, t)
        if res is None:
            meta.append((t, None, None))
            out_lines.append(f"-- MANUAL REVIEW: Could not locate function header for statement {t}\n")
            out_lines.append(f"-- Original statement (index {t}):\n")
            out_lines.append(stmts[t-1].strip() + '\n\n')
            continue
        h, e = res
        meta.append((t, h+1, e+1))
        block = '\n'.join(stmts[h:e+1]).strip()
        out_lines.append(f"-- PROPOSED FIX: Reassembled function for failing statement {t} (original statements {h+1}..{e+1})\n")
        out_lines.append(block)
        # Ensure single terminating semicolon
        if not block.strip().endswith(';'):
            out_lines.append(';')
        out_lines.append('\n\n')

    OUT.write_text('\n'.join(out_lines), encoding='utf-8')
    print(f"Wrote proposed fixes to {OUT}\nSummary (t -> header..end):")
    for m in meta:
        print(m)

if __name__ == '__main__':
    main()
