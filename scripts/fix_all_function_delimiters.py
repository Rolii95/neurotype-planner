import sys
import re
import time
from pathlib import Path

# Debug log path
_LOG_PATH = Path(__file__).resolve().parent.joinpath('fix_all_function_delimiters.log')


def _dbg(msg: str) -> None:
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}\n"
    # write to stdout (flushed) and append to run log
    sys.stdout.write(line)
    sys.stdout.flush()
    try:
        with open(_LOG_PATH, 'a', encoding='utf-8') as lf:
            lf.write(line)
    except Exception:
        pass
import time
from datetime import datetime

# Usage: python fix_all_function_delimiters.py input.sql output.sql

_TAG_WITH_WHITESPACE = re.compile(r"\$(.*?)\$", re.DOTALL)
_DO_BLOCK_RE = re.compile(
    r"(DO\s+\$\$\s*BEGIN)(?P<body>.*?)(END\s+\$\$\s*(?:LANGUAGE\s+[A-Za-z0-9_]+\s*;|;))",
    re.IGNORECASE | re.DOTALL,
)


def _normalize_dollar_tags(sql: str) -> str:
    """Collapse any whitespace inside $tag$ tokens that were split character-by-character."""

    def repl(match: re.Match) -> str:
        inner = match.group(1)
        parts = re.findall(r"[A-Za-z0-9_]+", inner)
        if not parts or not all(len(p) == 1 for p in parts):
            return match.group(0)
        tag = "".join(parts)
        return f"${tag}$"

    return _TAG_WITH_WHITESPACE.sub(repl, sql)


def _ensure_do_blocks_have_end_if(sql: str) -> str:
    """Scan the SQL for `DO $$` ... `END $$` blocks and ensure they contain `END IF;`.

    The previous regex-based implementation was very slow on large files. This
    implementation uses string searches to locate block boundaries which is
    linear-time and avoids catastrophic backtracking.
    """
    out_parts = []
    lower = sql.lower()
    pos = 0
    while True:
        start_idx = lower.find('do $$', pos)
        if start_idx == -1:
            # append remainder and break
            out_parts.append(sql[pos:])
            break
        # append chunk before this DO
        out_parts.append(sql[pos:start_idx])
        # find the opening delimiter end (after 'do $$')
        open_end = start_idx + len('do $$')
        # search for the next 'end $$' marker starting from open_end
        # try common normalized variants
        end_marker = None
        search_pos = open_end
        # look for several possible end markers; prefer 'end $$'
        candidates = ['end $$', 'end;\n$$', 'end;\n$$ ']  # normalized forms
        found_idx = -1
        for cand in candidates:
            found = lower.find(cand, search_pos)
            if found != -1:
                found_idx = found
                end_marker = cand
                break
        # fallback: find 'end' followed by '$$' in a small window
        if found_idx == -1:
            found = lower.find('end', search_pos)
            if found != -1:
                # find next '$$' after this
                dollar = lower.find('$$', found)
                if dollar != -1:
                    found_idx = found
                    end_marker = 'end...$$'
        if found_idx == -1:
            # no matching end found; append rest and break
            out_parts.append(sql[start_idx:])
            break
        # extract block from start_idx to end of marker occurrence + marker length
        # determine tail start index based on marker
        if end_marker == 'end $$':
            tail_idx = found_idx + len('end $$')
        elif end_marker.startswith('end;'):
            # 'end;\n$$' length
            tail_idx = found_idx + len(end_marker)
        else:
            # approximate: include up to the next '$$' after found_idx
            dollar = lower.find('$$', found_idx)
            tail_idx = dollar + 2 if dollar != -1 else found_idx + 3

        block = sql[start_idx:tail_idx]
        # check if block contains END IF; (case-insensitive)
        if re.search(r'end\s+if\s*;', block, re.IGNORECASE):
            out_parts.append(block)
        else:
            # insert END IF; before the end marker; find insertion point in original block
            # try to locate the last 'end' occurrence within the block
            insert_pos = None
            m = re.search(r'(end\s*;?\s*\n?\s*\$\$)', block, re.IGNORECASE)
            if m:
                insert_pos = m.start()
            else:
                # as a fallback, insert 2 chars before tail_idx
                insert_pos = max(0, len(block) - 4)
            fixed_block = block[:insert_pos] + '\n  END IF;\n' + block[insert_pos:]
            out_parts.append(fixed_block)

        pos = tail_idx

    return ''.join(out_parts)


def _fix_common_corrupt_tokens(sql: str) -> str:
    """Clean up known mangled tokens produced by earlier scripts."""
    replacements = {
        r"(?i)TABIF": "TABLE",
        r"(?i)IFIFOT": "IF NOT",
        r"(?i)EXIIFS": "EXISTS",
    }
    for pattern, replacement in replacements.items():
        sql = re.sub(pattern, replacement, sql)
    return sql


def _collapse_nested_do_wrappers(sql: str) -> str:
    """Remove duplicated DO $$ BEGIN wrappers introduced by earlier tooling."""
    return re.sub(
        r"(?i)DO\s+\$\$\s*BEGIN\s*(?:\r?\n\s*)+DO\s+\$\$\s*BEGIN",
        "DO $$\nBEGIN",
        sql,
    )


def _retag_execute_literals(sql: str) -> str:
    """Ensure EXECUTE uses a dedicated dollar tag so it doesn't conflict with DO $$."""
    pattern = re.compile(
        r"(?is)(EXECUTE\s+)\$([A-Za-z0-9_]*)\$(.*?)(\$\2\$|\$\$)\s*;",
    )

    def repl(match: re.Match) -> str:
        prefix = match.group(1)
        body = match.group(3)
        return f"{prefix}$exec${body}$exec$;"

    return pattern.sub(repl, sql)


def fix_all_function_delimiters(sql):
    print(f"[{datetime.utcnow().isoformat()}] STEP: normalize dollar tags", file=sys.stderr)
    start = time.time()
    sql = _normalize_dollar_tags(sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: normalize ({time.time()-start:.2f}s)", file=sys.stderr)
    # Replace all function delimiters of the form $wrap$ or $SOMETHING$ with $$ (opening and closing)
    # Handles AS $wrap$ ... $wrap$ LANGUAGE plpgsql;
    # Replace opening delimiter (AS $wrap$)
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: replace opening AS $tag$ -> $$", file=sys.stderr)
    sql = re.sub(r'(AS\s*)\$[A-Za-z0-9_]+\$', r'\1$$', sql, flags=re.IGNORECASE)
    print(f"[{datetime.utcnow().isoformat()}] DONE: replace opening ({time.time()-start:.2f}s)", file=sys.stderr)
    # Replace DO $wrap$ BEGIN with DO $$ BEGIN so the block uses standard delimiters
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: normalize DO $tag$ -> DO $$", file=sys.stderr)
    sql = re.sub(r'(?i)\bDO\s+\$[A-Za-z0-9_]+\$', 'DO $$', sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: normalize DO ({time.time()-start:.2f}s)", file=sys.stderr)
    # Replace closing delimiter before LANGUAGE ( $wrap$ LANGUAGE )
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: replace closing $tag$ before LANGUAGE", file=sys.stderr)
    sql = re.sub(r'\$[A-Za-z0-9_]*\$(\s*LANGUAGE)', r'$$\1', sql, flags=re.IGNORECASE)
    print(f"[{datetime.utcnow().isoformat()}] DONE: replace closing before LANGUAGE ({time.time()-start:.2f}s)", file=sys.stderr)
    # Replace END $wrap$ LANGUAGE plpgsql; with END;\n$$ LANGUAGE plpgsql;
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: replace END $tag$ LANGUAGE ...", file=sys.stderr)
    sql = re.sub(
        r'(?i)END\s+\$[A-Za-z0-9_]*\$\s*(LANGUAGE\s+[A-Za-z0-9_]+\s*;)',
        r'END;\n$$ \1',
        sql,
    )
    print(f"[{datetime.utcnow().isoformat()}] DONE: replace END $tag$ LANGUAGE ({time.time()-start:.2f}s)", file=sys.stderr)
    # Ensure END$$ becomes END $$ for easier matching later
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: ensure END$$ spacing", file=sys.stderr)
    sql = re.sub(r'END\$\$', 'END $$', sql, flags=re.IGNORECASE)
    print(f"[{datetime.utcnow().isoformat()}] DONE: ensure END$$ ({time.time()-start:.2f}s)", file=sys.stderr)
    # Replace END $wrap$; (no LANGUAGE clause) with END;\n$$;
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: replace END $tag$; -> END;\n$$;", file=sys.stderr)
    sql = re.sub(r'(?i)END\s+\$[A-Za-z0-9_]*\$\s*;', 'END;\n$$;', sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: replace END $tag$; ({time.time()-start:.2f}s)", file=sys.stderr)
    # Remove stray $wrap$ lines that may still linger by themselves
    start = time.time()
    print(f"[{datetime.utcnow().isoformat()}] STEP: remove stray $tag$ lines", file=sys.stderr)
    sql = re.sub(r'^\s*\$[A-Za-z0-9_]+\$\s*$', '', sql, flags=re.MULTILINE)
    print(f"[{datetime.utcnow().isoformat()}] DONE: remove stray lines ({time.time()-start:.2f}s)", file=sys.stderr)
    print(f"[{datetime.utcnow().isoformat()}] STEP: collapse nested DO wrappers", file=sys.stderr)
    sql = _collapse_nested_do_wrappers(sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: collapse nested DO wrappers", file=sys.stderr)
    print(f"[{datetime.utcnow().isoformat()}] STEP: retag EXECUTE literals", file=sys.stderr)
    sql = _retag_execute_literals(sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: retag EXECUTE literals", file=sys.stderr)
    print(f"[{datetime.utcnow().isoformat()}] STEP: ensure DO blocks have END IF", file=sys.stderr)
    sql = _ensure_do_blocks_have_end_if(sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: ensure END IF", file=sys.stderr)
    print(f"[{datetime.utcnow().isoformat()}] STEP: fix common corrupt tokens", file=sys.stderr)
    sql = _fix_common_corrupt_tokens(sql)
    print(f"[{datetime.utcnow().isoformat()}] DONE: fix corrupt tokens", file=sys.stderr)
    # Remove any trailing LANGUAGE plpgsql; not following a function definition
    print(f"[{datetime.utcnow().isoformat()}] STEP: remove stray LANGUAGE plpgsql;", file=sys.stderr)
    sql = re.sub(r'(?<!\$\$\s)LANGUAGE\s+plpgsql;?', '', sql, flags=re.IGNORECASE)
    print(f"[{datetime.utcnow().isoformat()}] DONE: remove stray LANGUAGE", file=sys.stderr)
    # Remove excessive blank lines
    sql = re.sub(r'\n{3,}', '\n\n', sql)
    # Remove leading/trailing blank lines
    sql = sql.strip() + '\n'
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_all_function_delimiters.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    fixed = fix_all_function_delimiters(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(fixed)
    print(f"Replaced all $wrap$/$SOMETHING$ function delimiters with $$. Output: {sys.argv[2]}")
