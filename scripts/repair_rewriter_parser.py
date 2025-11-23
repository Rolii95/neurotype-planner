#!/usr/bin/env python3
"""Deep PL/pgSQL-aware rewriter to fix BEGIN/END imbalance conservatively.

This script:
- Reads the best available repaired file (`manual_review_fixes_rewritten.sql`,
  `manual_review_fixes_sanitized.sql`, or `manual_review_fixes_auto_repaired.sql`).
- Splits by `-- PROPOSED FIX:` blocks.
- Tokenizes each block with awareness of single/double quotes, dollar-quoted
  strings, and SQL comments.
- Maintains a block stack for PL/pgSQL constructs: DO($tag$), BEGIN, IF,
  LOOP, CASE, FUNCTION, etc., and emits tokens while dropping unmatched
  trailing `END` tokens conservatively (only when they lack a matching
  opener in the current stack).
- Writes `manual_review_fixes_parsed.sql` with reconstructed blocks.

This is conservative but more structural than regex-only transforms.
"""
from pathlib import Path
import re
from typing import List, Tuple, Optional

ROOT = Path(__file__).resolve().parent
PREFERENCE = [
    ROOT / 'manual_review_fixes_rewritten.sql',
    ROOT / 'manual_review_fixes_unwrapped.sql',
    ROOT / 'manual_review_fixes_sanitized.sql',
    ROOT / 'manual_review_fixes_auto_repaired.sql',
]

def find_input() -> Path:
    for p in PREFERENCE:
        if p.exists():
            return p
    raise FileNotFoundError('No input file found; expected one of: ' + ','.join(map(str,PREFERENCE)))

def split_blocks(text: str) -> Tuple[str, List[Tuple[str,str]]]:
    parts = re.split(r'(?m)^-- PROPOSED FIX:', text)
    header = parts[0]
    blocks = []
    for p in parts[1:]:
        lines = p.splitlines()
        h = lines[0] if lines else ''
        body = '\n'.join(lines[1:])
        blocks.append((h, body))
    return header, blocks

class Token:
    def __init__(self, kind: str, text: str):
        self.kind = kind  # e.g., WORD, DOLLAR, STRING, SYMBOL, WS, COMMENT
        self.text = text
    def __repr__(self):
        return f"Token({self.kind!r},{self.text!r})"

def tokenize(sql: str) -> List[Token]:
    i = 0
    n = len(sql)
    tokens: List[Token] = []
    while i < n:
        ch = sql[i]
        # whitespace
        if ch.isspace():
            j = i
            while j < n and sql[j].isspace(): j += 1
            tokens.append(Token('WS', sql[i:j]))
            i = j
            continue
        # single-line comment
        if sql.startswith('--', i):
            j = sql.find('\n', i)
            if j == -1:
                tokens.append(Token('COMMENT', sql[i:]))
                break
            else:
                tokens.append(Token('COMMENT', sql[i:j+1]))
                i = j+1
                continue
        # block comment
        if sql.startswith('/*', i):
            j = sql.find('*/', i+2)
            if j == -1:
                tokens.append(Token('COMMENT', sql[i:]))
                break
            else:
                tokens.append(Token('COMMENT', sql[i:j+2]))
                i = j+2
                continue
        # dollar tag
        if ch == '$':
            m = re.match(r"\$([A-Za-z0-9_]*)\$", sql[i:])
            if m:
                tag = m.group(0)
                tokens.append(Token('DOLLAR', tag))
                i += len(tag)
                continue
        # string literal
        if ch == "'":
            j = i+1
            while j < n:
                if sql[j] == "'":
                    if j+1 < n and sql[j+1] == "'":
                        j += 2
                        continue
                    else:
                        j += 1
                        break
                j += 1
            tokens.append(Token('STRING', sql[i:j]))
            i = j
            continue
        # double-quoted identifier
        if ch == '"':
            j = i+1
            while j < n:
                if sql[j] == '"':
                    if j+1 < n and sql[j+1] == '"':
                        j += 2
                        continue
                    else:
                        j += 1
                        break
                j += 1
            tokens.append(Token('DQ', sql[i:j]))
            i = j
            continue
        # word/number
        if re.match(r'[A-Za-z_]', ch):
            j = i
            while j < n and re.match(r'[A-Za-z0-9_]', sql[j]): j += 1
            tokens.append(Token('WORD', sql[i:j]))
            i = j
            continue
        # symbols
        tokens.append(Token('SYM', ch))
        i += 1
    return tokens

def is_word(tok: Token, text: str) -> bool:
    return tok.kind == 'WORD' and tok.text.upper() == text.upper()

def reconstruct(tokens: List[Token]) -> str:
    return ''.join(t.text for t in tokens)

def process_tokens(tokens: List[Token]) -> List[Token]:
    out: List[Token] = []
    stack: List[Tuple[str, Optional[str]]] = []  # (type, tag/name)
    i = 0
    n = len(tokens)
    # helper to peek next non-WS/comment token
    def peek_next(idx):
        j = idx+1
        while j < n and tokens[j].kind in ('WS','COMMENT'):
            j += 1
        return tokens[j] if j < n else None

    while i < n:
        tok = tokens[i]
        # identify DO $tag$
        if is_word(tok, 'DO'):
            # check next non-ws token is DOLLAR
            nxt = peek_next(i)
            if nxt and nxt.kind == 'DOLLAR':
                tag = nxt.text
                # emit DO and tag
                out.append(tok)
                # attempt to append the exact WS/comment between if present
                j = i+1
                while j < n and tokens[j].kind in ('WS','COMMENT'):
                    out.append(tokens[j]); j += 1
                out.append(tokens[j])
                # push DO with tag
                stack.append(('DO', tag))
                i = j+1
                continue
        # BEGIN
        if is_word(tok, 'BEGIN'):
            out.append(tok)
            stack.append(('BEGIN', None))
            i += 1
            continue
        # IF
        if is_word(tok, 'IF'):
            out.append(tok)
            stack.append(('IF', None))
            i += 1
            continue
        # LOOP / CASE
        if is_word(tok, 'LOOP'):
            out.append(tok)
            stack.append(('LOOP', None))
            i += 1
            continue
        if is_word(tok, 'CASE'):
            out.append(tok)
            stack.append(('CASE', None))
            i += 1
            continue
        # END handling
        if is_word(tok, 'END'):
            j = i+1
            while j < n and tokens[j].kind in ('WS','COMMENT'):
                j += 1
            end_type = 'END'
            end_tag = None
            if j < n and tokens[j].kind == 'WORD' and tokens[j].text.upper() == 'IF':
                end_type = 'END_IF'
            elif j < n and tokens[j].kind == 'DOLLAR':
                end_type = 'END_DOLLAR'
                end_tag = tokens[j].text

            # find matching opener
            match_idx = None
            for k in range(len(stack)-1, -1, -1):
                ttype, ttag = stack[k]
                if end_type == 'END_IF' and ttype == 'IF':
                    match_idx = k; break
                if end_type == 'END_DOLLAR' and ttype == 'DO' and ttag == end_tag:
                    match_idx = k; break
                if end_type == 'END' and ttype == 'BEGIN':
                    match_idx = k; break
            if match_idx is None:
                # drop unmatched END and any immediate IF/DOLLAR/semicolon following
                i += 1
                if end_type == 'END_IF' and j < n:
                    i = j+1
                elif end_type == 'END_DOLLAR' and j < n:
                    i = j+1
                if i < n and tokens[i].kind == 'SYM' and tokens[i].text == ';':
                    i += 1
                continue
            else:
                # pop stack to match
                while len(stack)-1 >= match_idx:
                    stack.pop()
                # emit the END and following components as in original
                out.append(tok)
                k = i+1
                while k < n and tokens[k].kind in ('WS','COMMENT'):
                    out.append(tokens[k]); k += 1
                if k < n and (end_type == 'END_IF' and is_word(tokens[k],'IF') or end_type == 'END_DOLLAR' and tokens[k].kind=='DOLLAR'):
                    out.append(tokens[k]); k += 1
                # optional semicolon
                while k < n and tokens[k].kind in ('WS','COMMENT'):
                    out.append(tokens[k]); k += 1
                if k < n and tokens[k].kind == 'SYM' and tokens[k].text == ';':
                    out.append(tokens[k]); k += 1
                i = k
                continue

        # default copy
        out.append(tok)
        i += 1

    return out

def process_block_text(body: str) -> str:
    toks = tokenize(body)
    repaired = process_tokens(toks)
    return reconstruct(repaired)

def main():
    inp = find_input()
    text = inp.read_text(encoding='utf-8')
    header, blocks = split_blocks(text)
    out_blocks = [header]
    for hdr, body in blocks:
        try:
            new_body = process_block_text(body)
        except Exception:
            new_body = body
        out_blocks.append(f"-- PROPOSED FIX: {hdr}\n{new_body}\n")

    outp = ROOT / 'manual_review_fixes_parsed.sql'
    outp.write_text('\n'.join(out_blocks), encoding='utf-8')
    print(f"Wrote {outp} ({len(blocks)} blocks)")

if __name__ == '__main__':
    main()
