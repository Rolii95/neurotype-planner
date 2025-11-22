#!/usr/bin/env python3
"""Create idempotent wrappers for index/trigger/policy creation in a SQL file.

Reads `scripts/manual_review_fixes.sql` and writes
`scripts/manual_review_fixes_idempotent.sql` where statements like
`CREATE INDEX ...`, `CREATE TRIGGER ...`, and `CREATE POLICY ...` are
wrapped in DO blocks that check catalog tables before executing.

This is a best-effort heuristic to avoid duplicate-creation errors when
re-applying migration fragments.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT.joinpath('manual_review_fixes.sql')
OUT = ROOT.joinpath('manual_review_fixes_idempotent.sql')

text = IN.read_text(encoding='utf-8')

def wrap_index(stmt):
    # Attempt to extract index name after CREATE [UNIQUE] INDEX [IF NOT EXISTS]
    m = re.search(r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?P<name>"[^"]+"|\S+)', stmt, re.I)
    if not m:
        return stmt
    raw = m.group('name')
    # strip schema if present and remove quotes
    name = raw.split('.')[-1].strip('"')
    do = (
        "DO $$ BEGIN\n"
        "  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '%s' AND relkind = 'i') THEN\n"
        "    EXECUTE $$%s$$;\n"
        "  END IF;\n"
        "END$$ LANGUAGE plpgsql;\n"
    ) % (name, stmt.strip())
    return do

def wrap_trigger(stmt):
    # Extract trigger name: CREATE TRIGGER <name> ... ON
    m = re.search(r'CREATE\s+TRIGGER\s+(?P<name>"[^"]+"|\S+)', stmt, re.I)
    if not m:
        return stmt
    raw = m.group('name')
    name = raw.split('.')[-1].strip('"')
    do = (
        "DO $$ BEGIN\n"
        "  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '%s') THEN\n"
        "    EXECUTE $$%s$$;\n"
        "  END IF;\n"
        "END$$ LANGUAGE plpgsql;\n"
    ) % (name, stmt.strip())
    return do

def wrap_policy(stmt):
    # Extract policy name: CREATE POLICY <name> ON
    m = re.search(r'CREATE\s+POLICY\s+(?P<name>"[^"]+"|\S+)', stmt, re.I)
    if not m:
        return stmt
    raw = m.group('name')
    name = raw.split('.')[-1].strip('"')
    do = (
        "DO $$ BEGIN\n"
        "  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = '%s') THEN\n"
        "    EXECUTE $$%s$$;\n"
        "  END IF;\n"
        "END$$ LANGUAGE plpgsql;\n"
    ) % (name, stmt.strip())
    return do


def process(text):
    # Split into top-level blocks by the PROPOSED FIX markers to preserve context
    parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
    if len(parts) < 3:
        # no markers; operate on whole file by splitting statements by ;\n
        stmts = re.split(r";\s*\n", text)
        out = []
        for s in stmts:
            s = s.strip()
            if not s:
                continue
            s2 = s + ';' if not s.endswith(';') else s
            if re.search(r'^CREATE\s+(?:UNIQUE\s+)?INDEX', s2, re.I):
                out.append(wrap_index(s2))
            elif re.search(r'^CREATE\s+TRIGGER', s2, re.I):
                out.append(wrap_trigger(s2))
            elif re.search(r'^CREATE\s+POLICY', s2, re.I):
                out.append(wrap_policy(s2))
            else:
                out.append(s2)
        return '\n\n'.join(out)

    # parts: ['', idx1, block1, idx2, block2, ...]
    out = parts[0]
    for i in range(1, len(parts), 2):
        idx = parts[i]
        block = parts[i+1]
        processed_block = block
        # Replace index/trigger/policy statements inside the block
        def repl(m):
            stmt = m.group(0)
            if re.search(r'^CREATE\s+(?:UNIQUE\s+)?INDEX', stmt, re.I):
                return wrap_index(stmt)
            if re.search(r'^CREATE\s+TRIGGER', stmt, re.I):
                return wrap_trigger(stmt)
            if re.search(r'^CREATE\s+POLICY', stmt, re.I):
                return wrap_policy(stmt)
            return stmt

        # Use a regex to find top-level CREATE INDEX/TRIGGER/POLICY statements ending with a semicolon
        processed_block = re.sub(r"(?s)(CREATE\s+(?:UNIQUE\s+)?INDEX[\s\S]*?;)", repl, processed_block, flags=re.I)
        processed_block = re.sub(r"(?s)(CREATE\s+TRIGGER[\s\S]*?;)", repl, processed_block, flags=re.I)
        processed_block = re.sub(r"(?s)(CREATE\s+POLICY[\s\S]*?;)", repl, processed_block, flags=re.I)

        out += f"-- PROPOSED FIX: Reassembled function for failing statement {idx}\n" + processed_block

    return out


new = process(text)
OUT.write_text(new, encoding='utf-8')
print(f"Wrote idempotent output to {OUT}")
