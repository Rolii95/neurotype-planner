#!/usr/bin/env python3
"""Check for dollar-quote and BEGIN/END balance per PROPOSED FIX block.

Writes a short report to `scripts/balance_report.txt` and prints a summary.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "manual_review_fixes_auto_repaired.sql"
OUTPUT = ROOT / "balance_report.txt"

def find_dollar_tags(s):
    return re.findall(r"\$[A-Za-z0-9_]*\$", s)

def tag_counts(s):
    tags = find_dollar_tags(s)
    counts = {}
    for t in tags:
        counts[t] = counts.get(t, 0) + 1
    return counts

def begin_end_balance(s):
    b = len(re.findall(r"\bBEGIN\b", s, flags=re.IGNORECASE))
    e = len(re.findall(r"\bEND\b", s, flags=re.IGNORECASE))
    return b, e

def analyze_blocks(text):
    # split by PROPOSED FIX header; keep the header as boundary marker
    parts = re.split(r"(?m)^-- PROPOSED FIX: ", text)
    results = []
    # the first part may be preamble
    offset = 0
    for i, p in enumerate(parts[1:], start=1):
        header_and_body = p
        # attempt to extract the original statement id if present in header line
        first_line = header_and_body.splitlines()[0] if header_and_body.splitlines() else ''
        # get block text (we already removed the marker)
        block = header_and_body
        tags = tag_counts(block)
        odd_tags = {t: c for t, c in tags.items() if c % 2 != 0}
        b,e = begin_end_balance(block)
        problems = []
        if odd_tags:
            problems.append(f"unbalanced_dollar_tags={odd_tags}")
        if b != e:
            problems.append(f"BEGIN_END_mismatch={b}:{e}")
        results.append({
            'block_index': i,
            'header_line': first_line.strip(),
            'tag_count_total': sum(tags.values()),
            'odd_tags': odd_tags,
            'begin': b,
            'end': e,
            'problems': problems,
            'snippet': '\n'.join(block.splitlines()[:8])
        })
    return results

def main():
    text = INPUT.read_text(encoding='utf-8')
    results = analyze_blocks(text)
    bad = [r for r in results if r['problems']]
    out = []
    out.append(f"Total blocks scanned: {len(results)}")
    out.append(f"Blocks with problems: {len(bad)}")
    out.append("")
    for r in bad[:200]:
        out.append(f"-- Block #{r['block_index']} header: {r['header_line']}")
        out.append(f"problems: {r['problems']}")
        out.append(f"tag_count_total: {r['tag_count_total']} odd_tags: {r['odd_tags']}")
        out.append(f"BEGIN: {r['begin']} END: {r['end']}")
        out.append("snippet:")
        out.append(r['snippet'])
        out.append("---")

    OUTPUT.write_text('\n'.join(out), encoding='utf-8')
    print('\n'.join(out[:20]))

if __name__ == '__main__':
    main()
