#!/usr/bin/env python3
"""Conservative batch manual fixer for top failing attempted SQL files.

Heuristics applied:
- Remove stray DO/BEGIN/END wrapper lines and duplicated tokens.
- Replace placeholder `__STR__` with the safe literal `'unknown'` where used as defaults or list members.
- Extract SQL inside EXECUTE $...$ or EXECUTE $$...$$ bodies when they contain CREATE/ALTER/EXECUTE statements.
- Collapse duplicated 'END END IF; IF;;' style garbage.

This is intentionally conservative and may not preserve all semantics; review before wide apply.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ERRS = ROOT / 'migration_errors.txt'
MANUAL = ROOT / 'manual_review_fixes.sql'

def top_ids(n=10):
    ids = []
    if not ERRS.exists():
        return ids
    with ERRS.open('r', encoding='utf-8') as f:
        for line in f:
            parts = line.split('\t')
            if not parts:
                continue
            try:
                bid = int(parts[0])
            except Exception:
                continue
            if bid not in ids:
                ids.append(bid)
            if len(ids) >= n:
                break
    return ids

def extract_executed_sql(s: str):
    # find EXECUTE $tag$...$tag$ or EXECUTE $$...$$ and extract inner if it contains CREATE/ALTER
    out = []
    # match EXECUTE <optional E> $tag$ ... $tag$;
    for m in re.finditer(r"EXECUTE\s+(E?)\$([A-Za-z0-9_]*)\$(.*?)\$\2\$;", s, flags=re.IGNORECASE|re.S):
        inner = m.group(3).strip()
        if re.search(r"\b(CREATE|ALTER|DROP|INSERT|UPDATE|CREATE\s+TYPE)\b", inner, flags=re.IGNORECASE):
            out.append(inner.rstrip(';') + ';')
    # also handle EXECUTE $$ ... $$ without tag
    for m in re.finditer(r"EXECUTE\s+\$\$(.*?)\$\$;", s, flags=re.IGNORECASE|re.S):
        inner = m.group(1).strip()
        if re.search(r"\b(CREATE|ALTER|DROP|INSERT|UPDATE|CREATE\s+TYPE)\b", inner, flags=re.IGNORECASE):
            out.append(inner.rstrip(';') + ';')
    return out

def clean_text(s: str) -> str:
    # remove lines that are only DO/BEGIN/END wrappers
    lines = s.splitlines()
    keep = []
    for L in lines:
        t = L.strip()
        # drop pure wrapper markers
        if re.fullmatch(r"DO\s+\$[A-Za-z0-9_]*\$", t, flags=re.IGNORECASE):
            continue
        if re.fullmatch(r"BEGIN", t, flags=re.IGNORECASE):
            continue
        if re.fullmatch(r"END\s+\$[A-Za-z0-9_]*\$\s*(LANGUAGE\s+plpgsql;|;)?", t, flags=re.IGNORECASE):
            continue
        if re.fullmatch(r"END;|END\b", t, flags=re.IGNORECASE):
            # drop stray naked END lines
            continue
        # collapse weird repeated tokens
        L = re.sub(r"END\s+END\s+IF;\s*IF;;", "", L, flags=re.IGNORECASE)
        L = re.sub(r"END\s+END\s+IF;\s*IF;", "", L, flags=re.IGNORECASE)
        # replace placeholder tokens
        L = L.replace("__STR__", "'unknown'")
        keep.append(L)
    cleaned = '\n'.join(keep)
    # extract inner EXECUTE bodies and append if found
    extr = extract_executed_sql(s)
    if extr:
        cleaned += '\n' + '\n'.join(extr)
    # final pass to remove multiple blank lines
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip() + '\n'

def replace_blocks(replacements: dict):
    text = MANUAL.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
    if len(parts) < 3:
        print('No PROPOSED FIX blocks found')
        return 0
    out = [parts[0]]
    for i in range(1, len(parts), 2):
        bid = int(parts[i])
        block = parts[i+1]
        if bid in replacements:
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(replacements[bid])
        else:
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(block)
    bak = MANUAL.parent.joinpath(MANUAL.name + '.manual_batch_fix10.bak')
    MANUAL.replace(bak)
    MANUAL.write_text(''.join(out), encoding='utf-8')
    return len(replacements)

def main():
    ids = top_ids(10)
    if not ids:
        print('No top ids found')
        return
    reps = {}
    for bid in ids:
        path = ROOT.joinpath(f'attempted_fix_{bid}.sql')
        if not path.exists():
            print('Missing', path)
            continue
        s = path.read_text(encoding='utf-8')
        cleaned = clean_text(s)
        outp = ROOT.joinpath(f'attempted_fix_{bid}_manual.sql')
        outp.write_text(cleaned, encoding='utf-8')
        print('Wrote', outp)
        reps[bid] = cleaned
    if reps:
        replaced = replace_blocks(reps)
        print('Replaced', replaced, 'blocks in manual_review_fixes.sql (backup created)')

if __name__ == '__main__':
    main()
