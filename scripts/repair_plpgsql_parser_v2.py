#!/usr/bin/env python3
"""Stack-based PL/pgSQL rebalance rewriter (v2).

This script is more robust than the earlier heuristic: it tokenizes blocks,
preserves dollar-quoted bodies, and uses a stack to match opening/closing
constructs (IF/END IF, BEGIN/END, LOOP/END LOOP, CASE/END CASE). When it finds
an unmatched closing token it drops it; when the block ends with unclosed
openers it appends the required closers in correct order.

Writes: `manual_review_fixes_parser_repaired_v2.sql`
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_parser_repaired_v2.sql'

text = IN.read_text(encoding='utf-8')

header_re = re.compile(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n")
parts = header_re.split(text)
if len(parts) <= 1:
    print('No PROPOSED FIX blocks found; aborting.')
    raise SystemExit(0)

prefix = parts[0]
entries = []
for i in range(1, len(parts), 2):
    idx = int(parts[i])
    block = parts[i+1]
    entries.append((idx, block))

# Token patterns
DOLLAR_Q = re.compile(r"\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$", re.MULTILINE)
STRING = re.compile(r"'([^']|'')*'")
KW = re.compile(r"\b(END\s+IF|END\s+LOOP|END\s+CASE|END\s+IF;|END\s+LOOP;|END\s+CASE;|BEGIN|END|IF|LOOP|CASE)\b", re.IGNORECASE)

def protect_dollars(s: str):
    bodies = {}
    def repl(m):
        key = f"__DOLLAR_{len(bodies)}__"
        bodies[key] = m.group(0)
        return key
    s2 = DOLLAR_Q.sub(repl, s)
    return s2, bodies

def restore_dollars(s: str, bodies: dict):
    for k,v in bodies.items():
        s = s.replace(k, v)
    return s

def tokenize(s: str):
    # Return list of (type, text) where type in {'kw','other'}
    tokens = []
    pos = 0
    for m in KW.finditer(s):
        if m.start() > pos:
            tokens.append(('other', s[pos:m.start()]))
        tokens.append(('kw', m.group(0)))
        pos = m.end()
    if pos < len(s):
        tokens.append(('other', s[pos:]))
    return tokens

def normalize_kw(t: str):
    T = re.sub(r"\s+", " ", t.strip(), flags=re.IGNORECASE).upper()
    # normalize trailing semicolons
    T = re.sub(r";+$", "", T).strip()
    return T

closer_for = {
    'IF': 'END IF;',
    'LOOP': 'END LOOP;',
    'CASE': 'END CASE;',
    'BEGIN': 'END;'
}

def process_block(block: str) -> str:
    b_safe, bodies = protect_dollars(block)
    # remove single-quoted strings to avoid accidental keywords inside them
    b_no_str = STRING.sub("'__STR__'", b_safe)
    tokens = tokenize(b_no_str)

    out_parts = []
    stack = []  # elements: 'IF','LOOP','CASE','BEGIN'

    for typ, txt in tokens:
        if typ == 'other':
            out_parts.append(txt)
            continue
        # typ == 'kw'
        K = normalize_kw(txt)
        if K in ('IF',):
            stack.append('IF')
            out_parts.append(txt)
        elif K == 'LOOP':
            stack.append('LOOP')
            out_parts.append(txt)
        elif K == 'CASE':
            stack.append('CASE')
            out_parts.append(txt)
        elif K == 'BEGIN':
            stack.append('BEGIN')
            out_parts.append(txt)
        elif K in ('END IF', 'END IF', 'END IF'):
            if stack and stack[-1] == 'IF':
                stack.pop()
                out_parts.append('END IF;')
            else:
                # unmatched END IF -> drop
                # skip adding
                continue
        elif K == 'END LOOP':
            if stack and stack[-1] == 'LOOP':
                stack.pop()
                out_parts.append('END LOOP;')
            else:
                continue
        elif K == 'END CASE':
            if stack and stack[-1] == 'CASE':
                stack.pop()
                out_parts.append('END CASE;')
            else:
                continue
        elif K == 'END':
            if stack and stack[-1] == 'BEGIN':
                stack.pop()
                out_parts.append('END;')
            else:
                # drop unmatched END
                continue
        else:
            # fallback: output as-is
            out_parts.append(txt)

    # Close any remaining openers in reverse order
    while stack:
        opener = stack.pop()
        closer = closer_for.get(opener)
        if closer:
            out_parts.append('\n' + closer + '\n')

    repaired = ''.join(out_parts)
    repaired = restore_dollars(repaired, bodies)
    return repaired

out = [prefix]
for idx, block in entries:
    repaired = process_block(block)
    # if block contains CREATE FUNCTION, leave as-is (do not wrap)
    if re.search(r"\bCREATE\s+FUNCTION\b", repaired, flags=re.IGNORECASE):
        wrapped = repaired
    else:
        wrapped = f"DO $wrap$\nBEGIN\n{repaired}\nEND $wrap$ LANGUAGE plpgsql;\n"
    out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {idx}\n{wrapped}\n")

OUT.write_text(''.join(out), encoding='utf-8')
print(f'Wrote {OUT} ({len(entries)} blocks processed)')
