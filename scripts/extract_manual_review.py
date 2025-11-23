#!/usr/bin/env python3
"""Extract the first N MANUAL REVIEW REQUIRED blocks from
`scripts/failing_statements_fixed.sql` and write them to
`scripts/manual_review_snippets.sql` for inspection.

Usage: python scripts/extract_manual_review.py --count 10
"""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXED = ROOT / 'scripts' / 'failing_statements_fixed.sql'
OUT = ROOT / 'scripts' / 'manual_review_snippets.sql'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--count', type=int, default=10)
    args = p.parse_args()

    if not FIXED.exists():
        print(f"File not found: {FIXED}")
        return 2

    text = FIXED.read_text(encoding='utf-8', errors='ignore')
    parts = text.split('\n-- MANUAL REVIEW REQUIRED for statement ')
    snippets = []
    # parts[0] is the header before first manual marker
    for pidx in range(1, min(len(parts), args.count + 1)):
        block = parts[pidx]
        # the block starts with something like '1016\n<sql...>' or '1016\n...'
        newline = block.find('\n')
        if newline == -1:
            continue
        hdr = block[:newline].strip()
        rest = block[newline+1:]
        # collect until next '-- MANUAL REVIEW' or next top-level '-- STATEMENT' marker
        # We'll attempt to stop at the next '\n-- ' sequence that starts a STATEMENT header
        # But for simplicity, take the first 2000 chars (safe preview)
        preview = rest[:20000]
        snippets.append((hdr, preview))

    with OUT.open('w', encoding='utf-8') as f:
        for hdr, preview in snippets:
            f.write(f"-- MANUAL REVIEW STATEMENT {hdr}\n")
            f.write(preview)
            f.write('\n\n-- END SNIPPET\n\n')

    print(f"Wrote {len(snippets)} snippets to {OUT}")
    for hdr, _ in snippets:
        print(hdr)


if __name__ == '__main__':
    main()
