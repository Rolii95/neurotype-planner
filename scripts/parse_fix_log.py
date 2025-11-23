#!/usr/bin/env python3
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
LOG = ROOT.joinpath('fix_rerun_log.txt')
OUT_ERRORS = ROOT.joinpath('migration_errors.txt')
OUT_SUM = ROOT.joinpath('migration_summary.txt')
text = LOG.read_text(encoding='utf-8')
pattern = re.compile(r"--- Block \d+ \(failing stmt (\d+)\)[\s\S]*?Wrote attempted SQL to:\s*([^\n]+)[\s\S]*?Timestamp:\s*([^\n]+)[\s\S]*?RESULT:\s*(SUCCESS|ERROR)(?:\s*\|\s*(.*?))?\n", re.MULTILINE)
# find all matches
found = []
for m in pattern.finditer(text):
    orig_idx = int(m.group(1))
    file_path = m.group(2).strip()
    timestamp = m.group(3).strip()
    status = m.group(4).strip()
    err = m.group(5).strip() if m.group(5) else ''
    found.append((m.start(), orig_idx, timestamp, status, err, file_path))
# keep most recent match per orig_idx (largest start)
by_idx = {}
for pos, orig_idx, ts, status, err, fp in found:
    prev = by_idx.get(orig_idx)
    if (prev is None) or (pos > prev[0]):
        by_idx[orig_idx] = (pos, ts, status, err, fp)
# produce lists
total_unique = len(by_idx)
errors = {k:v for k,v in by_idx.items() if v[2] != 'SUCCESS'}
successes = {k:v for k,v in by_idx.items() if v[2] == 'SUCCESS'}
# write migration_errors.txt
lines = []
for idx in sorted(errors.keys()):
    pos, ts, status, err, fp = errors[idx]
    lines.append(f"{idx}\t{status}\t{err}\t{fp}\t{ts}")
OUT_ERRORS.write_text('\n'.join(lines) + '\n', encoding='utf-8')
# summary
from collections import Counter
err_messages = [v[3] for v in errors.values()]
counter = Counter(err_messages)
summary_lines = []
summary_lines.append(f"Log file: {LOG}")
summary_lines.append(f"Unique proposed blocks found: {total_unique}")
summary_lines.append(f"Errors: {len(errors)}")
summary_lines.append(f"Successes: {len(successes)}")
summary_lines.append("")
summary_lines.append("Top error messages (count):")
for msg, cnt in counter.most_common(10):
    summary_lines.append(f"{cnt}: {msg}")
OUT_SUM.write_text('\n'.join(summary_lines) + '\n', encoding='utf-8')
print(f"Wrote {OUT_ERRORS} ({len(lines)} entries) and {OUT_SUM}")
