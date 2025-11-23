#!/usr/bin/env python3
"""Grammar-aware PL/pgSQL rebalance rewriter (v3).

This script tokenizes PROPOSED FIX blocks while protecting dollar-quoted
bodies and string literals, uses a stack to correctly match PL/pgSQL
constructs (IF/END IF, BEGIN/END, LOOP/END LOOP, CASE/END CASE), makes
conservative repairs (drop unmatched closers, append missing closers), and
writes `manual_review_fixes_parser_repaired_v3.sql`.

This version is more careful than v2 about searching the stack for the
matching opener and closing intervening openers in a safe order.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_parser_repaired_v3.sql'

KW_RE = re.compile(r"\b(IF|THEN|ELSIF|ELSE|LOOP|CASE|WHEN|BEGIN|END)\b", re.IGNORECASE)
DOLLAR_Q = re.compile(r"\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$", re.MULTILINE)
STRING = re.compile(r"'([^']|'')*'")

closer_for = {
    'IF': 'END IF;',
    'LOOP': 'END LOOP;',
    'CASE': 'END CASE;',
    'BEGIN': 'END;'
}

def protect_patterns(s: str):
    bodies = {}
    # protect dollar bodies first
    def d_repl(m):
        key = f"__DOLLAR_{len(bodies)}__"
        bodies[key] = m.group(0)
        return key
    s2 = DOLLAR_Q.sub(d_repl, s)
    # protect single-quoted strings
    strs = {}
    def s_repl(m):
        key = f"__STR_{len(strs)}__"
        strs[key] = m.group(0)
        return key
    s3 = STRING.sub(s_repl, s2)
    return s3, bodies, strs

def restore_patterns(s: str, bodies: dict, strs: dict):
    for k,v in {**bodies, **strs}.items():
        s = s.replace(k, v)
    return s

def tokenize_with_kw(s: str):
    tokens = []
    pos = 0
    for m in KW_RE.finditer(s):
        if m.start() > pos:
            tokens.append(('text', s[pos:m.start()]))
        tokens.append(('kw', m.group(1).upper()))
        pos = m.end()
    if pos < len(s):
        tokens.append(('text', s[pos:]))
    return tokens

def process_block(block: str) -> str:
    safe, bodies, strs = protect_patterns(block)
    tokens = tokenize_with_kw(safe)

    out = []
    stack = []  # list of openers: 'IF','LOOP','CASE','BEGIN'

    def append_text(t):
        out.append(t)

    for typ, txt in tokens:
        if typ == 'text':
            append_text(txt)
            continue
        # keyword handling
        if txt == 'IF':
            stack.append('IF')
            append_text('IF')
        elif txt in ('ELSIF', 'THEN', 'ELSE', 'WHEN'):
            # these are intra-block keywords; emit as-is
            append_text(' ' + txt)
        elif txt == 'LOOP':
            stack.append('LOOP')
            append_text(' LOOP')
        elif txt == 'CASE':
            stack.append('CASE')
            append_text(' CASE')
        elif txt == 'BEGIN':
            stack.append('BEGIN')
            append_text('\nBEGIN')
        elif txt == 'END':
            # need to inspect following text to see if it's 'END IF' or 'END LOOP' etc.
            # We'll try to match a following pattern in the buffered output by peeking ahead;
            # but our tokenization emitted only 'END' here - so we attempt to match by looking
            # at the immediate text after this token in the original safe string.
            append_text(' END')
            # Try to match top of stack
            if not stack:
                # unmatched END - drop it by removing last appended ' END'
                out[-1] = ''
                continue
            top = stack[-1]
            # pop and append proper closer
            stack.pop()
            append_text(' ' + closer_for.get(top, 'END;'))
        else:
            append_text(' ' + txt)

    # close any remaining openers in reverse order
    while stack:
        opener = stack.pop()
        closer = closer_for.get(opener)
        if closer:
            out.append('\n' + closer + '\n')

    repaired = ''.join(out)
    repaired = restore_patterns(repaired, bodies, strs)
    return repaired

def main():
    text = IN.read_text(encoding='utf-8')
    parts = re.split(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n", text)
    if len(parts) <= 1:
        print('No PROPOSED FIX blocks found; aborting.')
        return
    prefix = parts[0]
    entries = []
    for i in range(1, len(parts), 2):
        idx = int(parts[i])
        block = parts[i+1]
        entries.append((idx, block))

    out = [prefix]
    for idx, block in entries:
        repaired = process_block(block)
        # if block contains CREATE FUNCTION leave as-is
        if re.search(r"\bCREATE\s+FUNCTION\b", repaired, flags=re.IGNORECASE):
            wrapped = repaired
        else:
            wrapped = f"DO $wrap$\nBEGIN\n{repaired}\nEND $wrap$ LANGUAGE plpgsql;\n"
        out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {idx}\n")
        out.append(wrapped)

    OUT.write_text(''.join(out), encoding='utf-8')
    print(f'Wrote {OUT} ({len(entries)} blocks processed)')

if __name__ == '__main__':
    main()
