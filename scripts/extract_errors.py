import re
from pathlib import Path

LOG = Path('scripts/migration_run_log.txt')
OUT = Path('scripts/migration_errors.txt')

if not LOG.exists():
    print('No migration_run_log.txt found at', LOG)
    raise SystemExit(1)

err_lines = []
for line in LOG.read_text(encoding='utf-8').splitlines():
    if 'ERROR:' in line or 'TOLERATED' in line or 'syntax error' in line.lower():
        err_lines.append(line)

if not err_lines:
    OUT.write_text('', encoding='utf-8')
    print('No error lines found; created empty', OUT)
else:
    OUT.write_text('\n'.join(err_lines), encoding='utf-8')
    print(f'Wrote {len(err_lines)} error lines to', OUT)
