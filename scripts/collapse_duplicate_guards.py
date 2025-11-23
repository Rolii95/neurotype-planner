#!/usr/bin/env python3
"""Collapse immediate duplicate DO/IF guards introduced by rewrapping.

This script looks for patterns where a DO/BEGIN/IF guard for the same
`pg_type.typname` or `pg_class.relname` appears nested immediately and
collapses the inner wrapper, reducing BEGIN/END duplication.

Reads: `manual_review_fixes_sanitized.sql`
Writes: `manual_review_fixes_collapsed.sql`
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes_sanitized.sql'
OUT = ROOT / 'manual_review_fixes_collapsed.sql'

text = IN.read_text(encoding='utf-8')

# Collapse nested DO/BEGIN/IF for pg_type typname
# Pattern: IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'name') THEN\s*DO $do$\s*BEGIN\s*IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'name') THEN
type_pattern = re.compile(
    r"IF NOT EXISTS \(SELECT 1 FROM pg_type WHERE typname = '([A-Za-z0-9_]+)'\) THEN\s*DO \$[A-Za-z0-9_]*\$\s*BEGIN\s*IF NOT EXISTS \(SELECT 1 FROM pg_type WHERE typname = '\1'\) THEN",
    flags=re.IGNORECASE
)

# Replace with single IF NOT EXISTS ... THEN
new_text = type_pattern.sub(r"IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '\1') THEN", text)

# Now collapse the corresponding trailing END IF; END $do$; END IF; sequences
trailing_pattern = re.compile(
    r"END IF;\s*END \$[A-Za-z0-9_]*\$;\s*END IF;",
    flags=re.IGNORECASE
)
new_text = trailing_pattern.sub("END IF;", new_text)

# Similar collapse for indexes: nested guards checking pg_class relname
idx_pattern = re.compile(
    r"IF NOT EXISTS \(SELECT 1 FROM pg_class WHERE relname = '([A-Za-z0-9_]+)' AND relkind = 'i'\) THEN\s*DO \$[A-Za-z0-9_]*\$\s*BEGIN\s*IF NOT EXISTS \(SELECT 1 FROM pg_class WHERE relname = '\1' AND relkind = 'i'\) THEN",
    flags=re.IGNORECASE
)
new_text = idx_pattern.sub(r"IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '\1' AND relkind = 'i') THEN", new_text)

trailing_idx = re.compile(r"END IF;\s*END \$[A-Za-z0-9_]*\$;\s*END IF;", flags=re.IGNORECASE)
new_text = trailing_idx.sub("END IF;", new_text)

OUT.write_text(new_text, encoding='utf-8')
print(f"Wrote {OUT}")
