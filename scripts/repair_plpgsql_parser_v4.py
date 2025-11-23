#!/usr/bin/env python3
"""Parser v4: whole-file dollar-quote aware block reassembler + stack rewriter.

Strategy:
- Parse the entire `manual_review_fixes.sql` as a stream.
- Identify all dollar-quoted spans and treat them as atomic tokens.
- Locate `-- PROPOSED FIX: Reassembled function for failing statement <id>` headers
  and build blocks, but expand block boundaries so they never cut through a
  dollar-quoted span (i.e., ensure dollar bodies are fully contained in a single block).
- For each block, run a stack-based tokenizer over the non-protected text to
  match IF/END IF, BEGIN/END, LOOP/END LOOP, CASE/END CASE and append missing
  closers or drop unmatched closers conservatively.
- Write `manual_review_fixes_parser_repaired_v4.sql`.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_parser_repaired_v4.sql'

HEADER_RE = re.compile(r"(?m)^-- PROPOSED FIX: Reassembled function for failing statement (\d+)[^\n]*\n")

def find_dollar_spans(s: str):
    # Return list of (start_idx, end_idx, tag) for each dollar-quoted span
    spans = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == '$':
            # try to read tag
            m = re.match(r"\$[A-Za-z0-9_]*\$", s[i:])
            if m:
                tag = m.group(0)
                start = i
                i2 = s.find(tag, i + len(tag))
                if i2 != -1:
                    end = i2 + len(tag)
                    spans.append((start, end, tag))
                    i = end
                    continue
                else:
                    # no closing tag found; treat to EOF
                    spans.append((start, n, tag))
                    break
        i += 1
    return spans

def block_boundaries_keep_dollars(text: str):
    # Find headers and initial naive boundaries, then expand to include dollar spans
    headers = [(m.start(), m.end(), int(m.group(1))) for m in HEADER_RE.finditer(text)]
    if not headers:
        return []
    spans = find_dollar_spans(text)
    # Build initial segments: from header_end to next header_start
    blocks = []
    for i, (_, hdr_end, bid) in enumerate(headers):
        start = hdr_end
        end = headers[i+1][0] if i+1 < len(headers) else len(text)
        blocks.append({'id': bid, 'start': start, 'end': end})

    # Expand blocks to include any dollar spans that intersect
    for b in blocks:
        changed = True
        while changed:
            changed = False
            for (s,e,tag) in spans:
                if (s < b['end'] and e > b['start']):
                    # dollar span intersects block; expand block to fully include it
                    if s < b['start']:
                        b['start'] = s
                        changed = True
                    if e > b['end']:
                        b['end'] = e
                        changed = True
    return blocks

KW = re.compile(r"\b(IF|LOOP|CASE|BEGIN|END)\b", re.IGNORECASE)

closer_for = {'IF':'END IF;','LOOP':'END LOOP;','CASE':'END CASE;','BEGIN':'END;'}

def protect_dollars_in_block(block_text: str):
    # Replace dollar spans with placeholders and return mapping
    spans = []
    out = []
    i = 0
    n = len(block_text)
    idx = 0
    while i < n:
        if block_text[i] == '$':
            m = re.match(r"\$[A-Za-z0-9_]*\$", block_text[i:])
            if m:
                tag = m.group(0)
                j = block_text.find(tag, i + len(tag))
                if j != -1:
                    body = block_text[i:j+len(tag)]
                    key = f"__DOLLAR_{idx}__"
                    spans.append((key, body))
                    out.append(key)
                    i = j + len(tag)
                    idx += 1
                    continue
                else:
                    # unclosed; take rest
                    body = block_text[i:]
                    key = f"__DOLLAR_{idx}__"
                    spans.append((key, body))
                    out.append(key)
                    break
        out.append(block_text[i])
        i += 1
    return ''.join(out), dict(spans)

def restore_dollars(s: str, mapping: dict):
    for k,v in mapping.items():
        s = s.replace(k, v)
    return s

def rebalance_block(text: str) -> str:
    safe, mapping = protect_dollars_in_block(text)
    # remove single-quoted strings to avoid false keywords
    safe2 = re.sub(r"'([^']|'')*'", "'__STR__'", safe)
    # tokenize
    tokens = []
    pos = 0
    for m in KW.finditer(safe2):
        if m.start() > pos:
            tokens.append(('text', safe[pos:m.start()]))
        tokens.append(('kw', m.group(1).upper()))
        pos = m.end()
    if pos < len(safe2):
        tokens.append(('text', safe[pos:]))

    out = []
    stack = []
    for typ, val in tokens:
        if typ == 'text':
            out.append(val)
            continue
        if val in ('IF','LOOP','CASE','BEGIN'):
            stack.append(val)
            out.append(val)
        elif val == 'END':
            if stack:
                opener = stack.pop()
                out.append(' ' + closer_for.get(opener, 'END;'))
            else:
                # drop unmatched END
                continue
        else:
            out.append(' ' + val)

    # append missing closers
    while stack:
        opener = stack.pop()
        out.append('\n' + closer_for.get(opener, '') + '\n')

    repaired = ''.join(out)
    repaired = restore_dollars(repaired, mapping)
    return repaired

def main():
    text = IN.read_text(encoding='utf-8')
    blocks = block_boundaries_keep_dollars(text)
    if not blocks:
        print('No blocks found')
        return
    prefix = text[:blocks[0]['start'] - 1] if blocks else ''
    out = [prefix]
    for b in blocks:
        bid = b['id']
        block_text = text[b['start']:b['end']]
        repaired = rebalance_block(block_text)
        # keep CREATE FUNCTION as-is
        if re.search(r"\bCREATE\s+FUNCTION\b", repaired, flags=re.IGNORECASE):
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(repaired)
        else:
            out.append(f"-- PROPOSED FIX: Reassembled function for failing statement {bid}\n")
            out.append(f"DO $wrap$\nBEGIN\n{repaired}\nEND $wrap$ LANGUAGE plpgsql;\n")

    OUT.write_text(''.join(out), encoding='utf-8')
    print(f'Wrote {OUT} ({len(blocks)} blocks processed)')

if __name__ == '__main__':
    main()
