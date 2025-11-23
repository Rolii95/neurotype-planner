#!/usr/bin/env python3
"""Conservative PL/pgSQL block rebalance parser.

This script processes `manual_review_fixes.sql` which contains many
`-- PROPOSED FIX` blocks. For each block it:
- extracts and protects dollar-quoted bodies
- counts IF / END IF and BEGIN / END tokens
- if there are more ENDs than BEGINs (or END IF > IF), removes surplus ENDs from the end
- if there are fewer ENDs than BEGINs, appends matching END or END IF at the end
- restores dollar bodies and wraps the cleaned block in a single DO $wrap$ ... LANGUAGE plpgsql;

This is conservative and aims to make blocks parseable; it may remove redundant ENDs
or append missing ENDs at the end of a block when a safe fix is likely.

Writes: `manual_review_fixes_parser_repaired.sql`
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_parser_repaired.sql'

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

def protect_dollars(s: str):
    # Replace dollar-quoted bodies with placeholders and return map
    dollar_pat = re.compile(r"\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$", flags=re.MULTILINE)
    bodies = {}
    def repl(m):
        key = f"__DOLLAR_{len(bodies)}__"
        bodies[key] = m.group(0)
        return key
    s2 = dollar_pat.sub(repl, s)
    return s2, bodies

def restore_dollars(s: str, bodies: dict):
    for k,v in bodies.items():
        s = s.replace(k, v)
    return s

def count_tokens(s: str):
    # Count IF (excluding END IF), END IF, BEGIN, and END
    # Use word boundaries; uppercase for case-insensitive
    S = s.upper()
    # Remove strings in single quotes to avoid IF inside strings
    S = re.sub(r"'([^']|'')*'", "'...',", S)
    # Count END IF occurrences
    end_if = len(re.findall(r"\bEND\s+IF\b", S))
    # Count IF occurrences not preceded by END (roughly): count '\bIF\b' then subtract end_if
    total_if = len(re.findall(r"\bIF\b", S))
    if_count = max(0, total_if - end_if)
    # Count BEGIN and END as words
    begin_count = len(re.findall(r"\bBEGIN\b", S))
    # Count standalone END keywords excluding those that are part of END IF (we counted end_if separately)
    # We'll count 'END' occurrences and subtract 'END IF' occurrences
    total_end = len(re.findall(r"\bEND\b", S))
    end_count = max(0, total_end - end_if)
    return {'if': if_count, 'end_if': end_if, 'begin': begin_count, 'end': end_count}

def remove_surplus_end_if(s: str, surplus: int):
    # Remove up to 'surplus' occurrences of 'END IF;' or 'END IF' from the end of the block
    if surplus <= 0:
        return s
    # work from the end: find positions of END IF occurrences
    matches = list(re.finditer(r"\bEND\s+IF\b\s*;?", s, flags=re.IGNORECASE))
    if not matches:
        return s
    # Remove last 'surplus' matches
    for m in reversed(matches[-surplus:]):
        a,b = m.span()
        s = s[:a] + s[b:]
    return s

def remove_surplus_end(s: str, surplus: int):
    if surplus <= 0:
        return s
    # Find END; or END $tag$; or standalone END tokens and remove from end
    matches = list(re.finditer(r"\bEND\b\s*;?", s, flags=re.IGNORECASE))
    if not matches:
        return s
    for m in reversed(matches[-surplus:]):
        a,b = m.span()
        s = s[:a] + s[b:]
    return s

def append_missing_ends(s: str, missing_begin:int, missing_if:int):
    # Append necessary END IF; and END; tokens in the safe order: close IFs then BEGINs
    tail = '\n'
    for _ in range(missing_if):
        tail += 'END IF;\n'
    for _ in range(missing_begin):
        tail += 'END;\n'
    return s + tail

out = [prefix]
for idx, block in entries:
    b = block
    # Protect dollar bodies
    b_safe, bodies = protect_dollars(b)
    toks = count_tokens(b_safe)
    # Compare IF vs END IF
    if toks['end_if'] > toks['if']:
        surplus = toks['end_if'] - toks['if']
        b_safe = remove_surplus_end_if(b_safe, surplus)
    elif toks['if'] > toks['end_if']:
        missing_if = toks['if'] - toks['end_if']
        # We'll append missing END IF at end
        b_safe = append_missing_ends(b_safe, 0, missing_if)

    # Recount BEGIN/END after IF fixes
    toks2 = count_tokens(b_safe)
    if toks2['end'] > toks2['begin']:
        surplus = toks2['end'] - toks2['begin']
        b_safe = remove_surplus_end(b_safe, surplus)
    elif toks2['begin'] > toks2['end']:
        missing = toks2['begin'] - toks2['end']
        b_safe = append_missing_ends(b_safe, missing, 0)

    # Restore dollar bodies
    b_repaired = restore_dollars(b_safe, bodies)

    # Finally, wrap block in DO $wrap$ ... END $wrap$ LANGUAGE plpgsql; unless it contains CREATE FUNCTION
    if re.search(r"\bCREATE\s+FUNCTION\b", b_repaired, flags=re.IGNORECASE):
        wrapped = b_repaired
    else:
        wrapped = f"DO $wrap$\nBEGIN\n{b_repaired}\nEND $wrap$ LANGUAGE plpgsql;\n"

    out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {idx}\n{wrapped}\n")

OUT.write_text(''.join(out), encoding='utf-8')
print(f'Wrote {OUT} ({len(entries)} blocks processed)')
