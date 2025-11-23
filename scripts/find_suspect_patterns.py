from pathlib import Path
import re

SQL = Path('supabase/migrations/20251120_all_migrations_gap_fix.sql')
OUT = Path('scripts/suspect_statements.txt')

if not SQL.exists():
    print('SQL migration file not found at', SQL)
    raise SystemExit(1)

text = SQL.read_text(encoding='utf-8')

# Find dollar-quoted blocks (DO $$ ... $$ or DO $tag$ ... $tag$) and check if they contain 'CREATE TYPE IF NOT EXISTS'
pattern = re.compile(r"DO\s+\$[^$]*\$.*?\$[^$]*\$;", re.IGNORECASE | re.DOTALL)
matches = pattern.findall(text)

suspects = []
for m in matches:
    if 'CREATE TYPE IF NOT EXISTS' in m.upper() or 'CREATE TYPE' in m.upper() and 'IF NOT EXISTS' in m.upper():
        snippet = m.strip()
        suspects.append(snippet[:4000])

# Also search for top-level 'CREATE TYPE IF NOT EXISTS' occurrences outside DO blocks
top_level = []
for match in re.finditer(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+", text, re.IGNORECASE):
    start = max(0, match.start() - 200)
    end = match.end() + 600
    top_level.append(text[start:end].replace('\n', ' ')[:1000])

with OUT.open('w', encoding='utf-8') as f:
    f.write('Found %d suspect DO blocks containing CREATE TYPE patterns\n\n' % len(suspects))
    for i, s in enumerate(suspects, 1):
        f.write(f'--- SUSPECT_DO_BLOCK #{i} ---\n')
        f.write(s)
        f.write('\n\n')
    f.write('Found %d top-level CREATE TYPE IF NOT EXISTS occurrences (context snippets)\n\n' % len(top_level))
    for i, s in enumerate(top_level, 1):
        f.write(f'--- CREATE_TYPE_SNIPPET #{i} ---\n')
        f.write(s)
        f.write('\n\n')

print('Wrote suspect snippets to', OUT)
