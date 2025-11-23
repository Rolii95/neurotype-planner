#!/usr/bin/env python3
"""Sanitize `manual_review_fixes_auto_repaired.sql` into per-statement safe wrappers.

This script:
- Splits each `-- PROPOSED FIX:` block into individual SQL statements while respecting
  single quotes, double quotes, and dollar-quoted strings.
- For `CREATE TYPE ... AS ENUM` and EXECUTE-wrapped CREATE TYPE, creates guarded DO blocks
  that check `pg_type` before creating the enum.
- For CREATE INDEX (including EXECUTE-wrapped), creates guarded DO blocks that check `pg_class`.
- Leaves other statements mostly intact.

Writes: `scripts/manual_review_fixes_sanitized.sql`.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "manual_review_fixes_auto_repaired.sql"
OUTPUT = ROOT / "manual_review_fixes_sanitized.sql"

def split_statements(sql):
    """Split SQL into statements by semicolon, ignoring semicolons inside quotes/dollar tags."""
    statements = []
    i = 0
    start = 0
    n = len(sql)
    in_sq = False
    in_dq = False
    dollar_tag = None
    while i < n:
        ch = sql[i]
        # handle start of dollar tag
        if ch == '$' and not in_sq and not in_dq:
            # match $tag$
            m = re.match(r"\$([A-Za-z0-9_]*)\$", sql[i:])
            if m:
                tag = m.group(0)
                if dollar_tag is None:
                    dollar_tag = tag
                    i += len(tag)
                    continue
                else:
                    # closing tag?
                    if sql[i:i+len(dollar_tag)] == dollar_tag:
                        dollar_tag = None
                        i += len(tag)
                        continue
        if dollar_tag:
            i += 1
            continue
        if ch == "'" and not in_dq:
            in_sq = not in_sq
            i += 1
            continue
        if ch == '"' and not in_sq:
            in_dq = not in_dq
            i += 1
            continue
        if ch == ';' and not in_sq and not in_dq and dollar_tag is None:
            stmt = sql[start:i+1].strip()
            if stmt:
                statements.append(stmt)
            start = i+1
        i += 1
    # tail
    tail = sql[start:].strip()
    if tail:
        statements.append(tail)
    return statements

def extract_inner_execute(stmt):
    # match EXECUTE $tag$ ... $tag$; or EXECUTE $$ ... $$;
    m = re.search(r"EXECUTE\s+\$([A-Za-z0-9_]*)\$\s*(.*?)\s*\$\1\$", stmt, flags=re.IGNORECASE|re.DOTALL)
    if m:
        return m.group(2).strip()
    # try $$
    m2 = re.search(r"EXECUTE\s+\$\$\s*(.*?)\s*\$\$", stmt, flags=re.IGNORECASE|re.DOTALL)
    if m2:
        return m2.group(1).strip()
    return None

def make_create_type_guard(name, enum_body):
    clean_name = name.strip('"')
    return (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{clean_name}') THEN\n"
        f"        EXECUTE $create$CREATE TYPE {name} AS ENUM ({enum_body})$create$;\n"
        "    END IF;\nEND $do$;\n"
    )

def make_create_index_guard(idxname, inner):
    clean_idx = idxname.strip('"')
    # ensure inner doesn't end with ;
    inner_stmt = inner.rstrip().rstrip(';')
    return (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '{clean_idx}' AND relkind = 'i') THEN\n"
        f"        EXECUTE $create${inner_stmt}$create$;\n"
        "    END IF;\nEND $do$;\n"
    )

def sanitize_block(block_text):
    # block_text is the content after the -- PROPOSED FIX header
    statements = split_statements(block_text)
    out_stmts = []
    for stmt in statements:
        s = stmt.strip()
        if not s:
            continue
        # handle EXECUTE-wrapped create type/index
        inner = extract_inner_execute(s)
        if inner:
            inner_upper = inner.upper()
            if re.search(r"CREATE\s+TYPE", inner_upper):
                # extract name and enum
                nm = re.search(r"CREATE\s+TYPE\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM\s*\((.*)\)", inner, flags=re.IGNORECASE|re.DOTALL)
                if nm:
                    name = nm.group(1)
                    enum_body = nm.group(2)
                    out_stmts.append(make_create_type_guard(name, enum_body))
                    continue
            if re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX", inner_upper):
                im = re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Za-z0-9_\"]+)", inner, flags=re.IGNORECASE)
                idxname = im.group(1) if im else 'unknown_idx'
                out_stmts.append(make_create_index_guard(idxname, inner))
                continue
        # handle direct CREATE TYPE AS ENUM
        if re.search(r"^CREATE\s+TYPE\s+.*AS\s+ENUM", s, flags=re.IGNORECASE|re.DOTALL):
            m = re.search(r"CREATE\s+TYPE\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM\s*\((.*)\)", s, flags=re.IGNORECASE|re.DOTALL)
            if m:
                name = m.group(1)
                enum_body = m.group(2)
                out_stmts.append(make_create_type_guard(name, enum_body))
                continue
        # handle direct CREATE INDEX
        if re.search(r"^CREATE\s+(?:UNIQUE\s+)?INDEX", s, flags=re.IGNORECASE):
            im = re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Za-z0-9_\"]+)", s, flags=re.IGNORECASE)
            idxname = im.group(1) if im else 'unknown_idx'
            out_stmts.append(make_create_index_guard(idxname, s))
            continue
        # otherwise keep statement as-is
        out_stmts.append(s if s.endswith(';') else s+';')
    return '\n'.join(out_stmts)

def main():
    text = INPUT.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX:", text)
    out_blocks = []
    header = parts[0]
    for i, p in enumerate(parts[1:], start=1):
        # p begins with the header line
        # preserve the header comment
        lines = p.splitlines()
        header_line = lines[0] if lines else ''
        body = '\n'.join(lines[1:])
        sanitized = sanitize_block(body)
        out_blocks.append(f"-- PROPOSED FIX: {header_line}\n{sanitized}\n")

    OUTPUT.write_text('\n'.join([header]+out_blocks), encoding='utf-8')
    print(f"Wrote {OUTPUT} with {len(out_blocks)} sanitized blocks")

if __name__ == '__main__':
    main()
