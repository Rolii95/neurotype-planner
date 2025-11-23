#!/usr/bin/env python3
"""Advanced rewriter to reconstruct safe, minimal guarded DDL wrappers.

Strategy:
- Read `manual_review_fixes_auto_repaired.sql` if present, else fall back to
  `manual_review_fixes_sanitized.sql` or `manual_review_fixes_idempotent.sql`.
- For each `-- PROPOSED FIX:` block:
  - Unwrap repeated `DO $...$` wrappers conservatively.
  - Tokenize the block respecting single/double quotes and dollar-quoted tags.
  - Split into top-level statements.
  - For CREATE TYPE AS ENUM (direct or EXECUTE-wrapped): produce a single
    guarded DO block that checks `pg_type` and uses one `EXECUTE $create$...$create$;`.
  - For CREATE INDEX (direct or EXECUTE-wrapped): produce a single guarded DO
    block that checks `pg_class` relname and executes the CREATE INDEX.
  - Preserve other statements unchanged (ensuring they end with a semicolon).
- Write `manual_review_fixes_rewritten.sql`.

This is conservative and avoids inventing complex PL/pgSQL logic.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
PREFERENCE_FILES = [
    ROOT / 'manual_review_fixes_auto_repaired.sql',
    ROOT / 'manual_review_fixes_sanitized.sql',
    ROOT / 'manual_review_fixes_idempotent.sql',
]

def find_input():
    for p in PREFERENCE_FILES:
        if p.exists():
            return p
    raise FileNotFoundError('No input repair file found; expected one of: ' + ','.join(map(str,PREFERENCE_FILES)))

def read_file(p: Path):
    return p.read_text(encoding='utf-8')

def remove_outer_do_wrappers(text: str) -> str:
    """Conservatively remove top-level DO $tag$ ... END $tag$; wrappers around entire block.

    Iteratively unwrap one level when the wrapper encloses the whole text.
    """
    changed = True
    out = text
    outer_re = re.compile(r"^\s*DO\s+\$([A-Za-z0-9_]*)\$\s*BEGIN\s*(.*)\s*END\s+\$\1\$;?\s*$", flags=re.IGNORECASE|re.DOTALL)
    while changed:
        m = outer_re.match(out)
        if m:
            out = m.group(2)
        else:
            changed = False
    return out

def split_statements(sql: str):
    """Split into top-level statements respecting quotes and dollar tags."""
    statements = []
    i = 0
    n = len(sql)
    start = 0
    in_sq = False
    in_dq = False
    dollar_tag = None
    while i < n:
        ch = sql[i]
        # dollar tag open/close
        if ch == '$' and not in_sq and not in_dq:
            m = re.match(r"\$([A-Za-z0-9_]*)\$", sql[i:])
            if m:
                tag = m.group(0)
                if dollar_tag is None:
                    dollar_tag = tag
                    i += len(tag)
                    continue
                else:
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
    tail = sql[start:].strip()
    if tail:
        statements.append(tail)
    return statements

def extract_execute_inner(stmt: str):
    m = re.search(r"EXECUTE\s+\$([A-Za-z0-9_]*)\$\s*(.*?)\s*\$\1\$", stmt, flags=re.IGNORECASE|re.DOTALL)
    if m:
        return m.group(2).strip()
    m2 = re.search(r"EXECUTE\s+\$\$\s*(.*?)\s*\$\$", stmt, flags=re.IGNORECASE|re.DOTALL)
    if m2:
        return m2.group(1).strip()
    return None

def make_type_guard(name: str, enum_body: str) -> str:
    clean = name.strip('"')
    return (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{clean}') THEN\n"
        f"        EXECUTE $create$CREATE TYPE {name} AS ENUM ({enum_body})$create$;\n"
        "    END IF;\nEND $do$;\n"
    )

def make_index_guard(idxname: str, inner_stmt: str) -> str:
    clean = idxname.strip('"')
    inner = inner_stmt.rstrip().rstrip(';')
    return (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '{clean}' AND relkind = 'i') THEN\n"
        f"        EXECUTE $create${inner}$create$;\n"
        "    END IF;\nEND $do$;\n"
    )

def process_block(block_text: str) -> str:
    # Unwrap top-level DO wrappers
    t = block_text.strip()
    t = remove_outer_do_wrappers(t)

    stmts = split_statements(t)
    out = []
    for s in stmts:
        s_strip = s.strip()
        if not s_strip:
            continue
        inner = extract_execute_inner(s_strip)
        target = None
        if inner:
            inner_up = inner.upper()
            if re.search(r"CREATE\s+TYPE", inner_up):
                m = re.search(r"CREATE\s+TYPE\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM\s*\((.*)\)", inner, flags=re.IGNORECASE|re.DOTALL)
                if m:
                    name = m.group(1)
                    enum = m.group(2)
                    target = make_type_guard(name, enum)
            elif re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX", inner_up):
                im = re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Za-z0-9_\"]+)", inner, flags=re.IGNORECASE)
                idxname = im.group(1) if im else 'unknown_idx'
                target = make_index_guard(idxname, inner)
        else:
            # direct CREATE TYPE
            if re.search(r"^CREATE\s+TYPE\s+.*AS\s+ENUM", s_strip, flags=re.IGNORECASE|re.DOTALL):
                m = re.search(r"CREATE\s+TYPE\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM\s*\((.*)\)", s_strip, flags=re.IGNORECASE|re.DOTALL)
                if m:
                    name = m.group(1)
                    enum = m.group(2)
                    target = make_type_guard(name, enum)
            elif re.search(r"^CREATE\s+(?:UNIQUE\s+)?INDEX", s_strip, flags=re.IGNORECASE):
                im = re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Za-z0-9_\"]+)", s_strip, flags=re.IGNORECASE)
                idxname = im.group(1) if im else 'unknown_idx'
                target = make_index_guard(idxname, s_strip)

        if target:
            out.append(target)
        else:
            # ensure statements end with semicolon
            out.append(s_strip if s_strip.endswith(';') else s_strip + ';')

    return '\n'.join(out)

def main():
    inp = find_input()
    text = read_file(inp)
    parts = re.split(r"(?m)^-- PROPOSED FIX:", text)
    header = parts[0]
    blocks = []
    for p in parts[1:]:
        lines = p.splitlines()
        hdr = lines[0] if lines else ''
        body = '\n'.join(lines[1:])
        try:
            rewritten = process_block(body)
        except Exception as e:
            rewritten = body  # fallback: keep original
        blocks.append(f"-- PROPOSED FIX: {hdr}\n{rewritten}\n")

    outp = ROOT / 'manual_review_fixes_rewritten.sql'
    outp.write_text('\n'.join([header]+blocks), encoding='utf-8')
    print(f"Wrote {outp} with {len(blocks)} blocks")

if __name__ == '__main__':
    main()
