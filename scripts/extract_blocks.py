#!/usr/bin/env python3
"""
Extract specific PROPOSED FIX blocks from manual_review_fixes_clean_export.sql
and write them into a new file suitable for the tolerant executor.

Usage:
  py -3 scripts/extract_blocks.py --infile scripts/manual_review_fixes_clean_export.sql \
      --out scripts/manual_review_fixes_6290_6295.sql --ids 6290 6291 6292 6293 6294 6295
"""
import argparse
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--infile', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--ids', type=int, nargs='+', required=True)
args = parser.parse_args()

p = Path(args.infile)
if not p.exists():
    raise SystemExit(f"Input file not found: {p}")
text = p.read_text(encoding='utf-8')
# Split using the same marker used by apply_manual_fixes.py
parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
entries = []
for i in range(1, len(parts), 2):
    idx = int(parts[i])
    block = parts[i+1]
    entries.append((idx, block))

selected_ids = set(args.ids)
selected = [ (idx, block) for idx, block in entries if idx in selected_ids ]
if not selected:
    raise SystemExit(f"No matching blocks found for ids: {sorted(selected_ids)}")

outp = Path(args.out)
with outp.open('w', encoding='utf-8') as f:
    f.write('-- Extracted subset of PROPOSED FIX blocks\n')
    for idx, block in selected:
        f.write(f"-- PROPOSED FIX: Reassembled function for failing statement {idx}\n")
        f.write(block.strip() + '\n\n')

print(f"Wrote {len(selected)} blocks to {outp}")
