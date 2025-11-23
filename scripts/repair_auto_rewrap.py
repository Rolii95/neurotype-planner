#!/usr/bin/env python3
"""Auto-repair transforms for manual_review_fixes SQL.

Transforms performed:
- Replace `CREATE TYPE IF NOT EXISTS name AS ENUM (...)` with a guarded DO wrapper that checks pg_type.
- Replace EXECUTE-$tag$CREATE TYPE ...$tag$; and EXECUTE-$tag$CREATE INDEX ...$tag$; with guarded DO wrappers.
- Wrap standalone top-level `IF ... END IF;` fragments (not inside DO or FUNCTION) with `DO $$ BEGIN ... END $$;`.

Writes output to `scripts/manual_review_fixes_auto_repaired.sql` and prints a summary.
"""
import re
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "manual_review_fixes_idempotent.sql"
OUTPUT = ROOT / "manual_review_fixes_auto_repaired.sql"

text = INPUT.read_text(encoding="utf-8")
orig = text

replacements = {"create_type_if_not_exists":0, "execute_wrapped_create_type":0, "execute_wrapped_create_index":0, "wrap_if_blocks":0}
samples = {"create_type_if_not_exists":[], "execute_wrapped_create_type":[], "execute_wrapped_create_index":[], "wrap_if_blocks":[]}

def parse_args():
    p = argparse.ArgumentParser(description="Auto-repair transforms for manual_review_fixes SQL")
    p.add_argument("--input", default=str(INPUT))
    p.add_argument("--output", default=str(OUTPUT))
    p.add_argument("--dry-run", action="store_true", help="Don't write output, only show planned changes")
    return p.parse_args()

def find_dollar_tags(s):
    # returns dict tag -> count
    tags = re.findall(r"\$([A-Za-z0-9_]*)\$", s)
    counts = {}
    for t in tags:
        counts[t] = counts.get(t, 0) + 1
    return counts

def balanced_dollar_tags(s):
    counts = find_dollar_tags(s)
    # each tag should appear an even number of times
    for tag, cnt in counts.items():
        if cnt % 2 != 0:
            return False
    return True

def balanced_begin_end(s):
    # crude but effective heuristic: count BEGIN vs END occurrences
    b = len(re.findall(r"\bBEGIN\b", s, flags=re.IGNORECASE))
    e = len(re.findall(r"\bEND\b", s, flags=re.IGNORECASE))
    return b == e

# 1) Replace direct `CREATE TYPE IF NOT EXISTS name AS ENUM (...) ;`
def replace_create_type_if_not_exists(m):
    name = m.group(1).strip()
    enum_body = m.group(2)
    # remove surrounding whitespace/newlines on enum body
    clean_name = name.strip('"')
    # if enum body or name contains unbalanced dollar tags, normalize by using $create$ tag
    if not balanced_dollar_tags(enum_body):
        enum_body = enum_body.replace("$", "")
    block = (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{clean_name}') THEN\n"
        f"        EXECUTE $create$CREATE TYPE {name} AS ENUM ({enum_body});$create$;\n"
        "    END IF;\nEND $do$;\n"
    )
    replacements["create_type_if_not_exists"] += 1
    if len(samples["create_type_if_not_exists"]) < 3:
        samples["create_type_if_not_exists"].append((m.group(0)[:300], block[:300]))
    return block

# regex: CREATE TYPE IF NOT EXISTS <name> AS ENUM ( ... ); -- capture name and enum contents
text = re.sub(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;", replace_create_type_if_not_exists, text, flags=re.IGNORECASE|re.DOTALL)

# 2) Replace EXECUTE $tag$CREATE TYPE ... $tag$; -> guarded DO wrapper
def replace_execute_wrapped_create_type(m):
    tag = m.group(1)
    inner = m.group(2)
    # attempt to extract the type name from inner CREATE TYPE statement
    name_m = re.search(r"CREATE\s+TYPE\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM", inner, flags=re.IGNORECASE)
    if name_m:
        name = name_m.group(1)
    else:
        name = "unknown_type"
    # extract enum body
    enum_match = re.search(r"AS\s+ENUM\s*\((.*?)\)", inner, flags=re.DOTALL|re.IGNORECASE)
    enum_body = enum_match.group(1) if enum_match else ""
    clean_name = name.strip('"')
    # if inner already contains an IF check, skip to avoid double-wrapping
    if re.search(r"IF\s+NOT\s+EXISTS\s*\(SELECT\s+1\s+FROM\s+pg_type", inner, flags=re.IGNORECASE):
        return m.group(0)
    # ensure dollar tags are balanced; if not, normalize to use the captured tag or $create$
    if not balanced_dollar_tags(inner):
        # strip stray $ signs to reduce parse errors
        inner = inner.replace("$", "")
        tag = tag or "create"
    # avoid nesting DO blocks if inner contains DO
    if re.search(r"\bDO\s+\$", inner, flags=re.IGNORECASE):
        # assume this execute is already wrapped; skip replacement
        return m.group(0)
    # build guarded DO with the captured tag
    safe_tag = tag or "create"
    block = (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{clean_name}') THEN\n"
        f"        EXECUTE ${safe_tag}$CREATE TYPE {name} AS ENUM ({enum_body})${safe_tag}$;\n"
        "    END IF;\nEND $do$;\n"
    )
    replacements["execute_wrapped_create_type"] += 1
    if len(samples["execute_wrapped_create_type"]) < 3:
        samples["execute_wrapped_create_type"].append((m.group(0)[:300], block[:300]))
    return block

text = re.sub(r"EXECUTE\s+\$([A-Za-z0-9_]*)\$\s*(CREATE\s+TYPE\s+.*?;?)\s*\$\1\$\s*;", replace_execute_wrapped_create_type, text, flags=re.IGNORECASE|re.DOTALL)

# 3) Replace EXECUTE $tag$CREATE INDEX idx_name ON ...$tag$; with guarded DO checking pg_class for index
def replace_execute_wrapped_create_index(m):
    tag = m.group(1)
    inner = m.group(2)
    # extract index name
    name_m = re.search(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Za-z0-9_\"]+)", inner, flags=re.IGNORECASE)
    if name_m:
        idx = name_m.group(1)
    else:
        idx = "unknown_idx"
    clean_idx = idx.strip('"')
    # if inner already contains the existence check, skip
    if re.search(r"SELECT\s+1\s+FROM\s+pg_class\s+WHERE\s+relname", inner, flags=re.IGNORECASE):
        return m.group(0)
    # ensure dollar tags balanced
    if not balanced_dollar_tags(inner):
        inner = inner.replace("$", "")
        tag = tag or "create"
    # avoid nested DO blocks
    if re.search(r"\bDO\s+\$", inner, flags=re.IGNORECASE):
        return m.group(0)
    safe_tag = tag or "create"
    block = (
        "DO $do$\nBEGIN\n"
        f"    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '{clean_idx}' AND relkind = 'i') THEN\n"
        + f"        EXECUTE ${safe_tag}$" + inner.strip().rstrip(';') + f"${safe_tag}$;\n"
        "    END IF;\nEND $do$;\n"
    )
    replacements["execute_wrapped_create_index"] += 1
    if len(samples["execute_wrapped_create_index"]) < 3:
        samples["execute_wrapped_create_index"].append((m.group(0)[:300], block[:300]))
    return block

text = re.sub(r"EXECUTE\s+\$([A-Za-z0-9_]*)\$\s*(CREATE\s+(?:UNIQUE\s+)?INDEX\s+.*?;?)\s*\$\1\$\s*;", replace_execute_wrapped_create_index, text, flags=re.IGNORECASE|re.DOTALL)

# 4) Wrap standalone IF ... END IF; fragments that are not already inside a DO or FUNCTION block.
# We'll look for occurrences of IF ... END IF; and ensure they are not already preceded within 500 chars by DO $ or LANGUAGE plpgsql or CREATE FUNCTION
def wrap_if_blocks(content):
    pattern = re.compile(r"(^|\n)(\s*IF\b.*?END\s+IF;)", flags=re.IGNORECASE|re.DOTALL)
    pos = 0
    out_parts = []
    last_pos = 0
    for m in pattern.finditer(content):
        start, end = m.start(2), m.end(2)
        preceding = content[max(0, start-500):start]
        # skip if inside DO or function or already wrapped
        if re.search(r"DO\s+\$|LANGUAGE\s+plpgsql|CREATE\s+FUNCTION", preceding, flags=re.IGNORECASE):
            continue
        block = content[start:end]
        # skip if the IF block itself contains DO or EXECUTE (likely already part of wrapped block)
        if re.search(r"\bDO\s+\$|EXECUTE\s+\$", block, flags=re.IGNORECASE):
            continue
        # ensure BEGIN/END balance inside the candidate; if unbalanced, skip wrapping so we don't introduce parse errors
        if not balanced_begin_end(block):
            continue
        out_parts.append(content[last_pos:start])
        wrapped = f"DO $$ BEGIN\n{block}\nEND $$;\n"
        out_parts.append(wrapped)
        last_pos = end
        replacements["wrap_if_blocks"] += 1
        if len(samples["wrap_if_blocks"]) < 3:
            samples["wrap_if_blocks"].append((block[:300], wrapped[:300]))
    out_parts.append(content[last_pos:])
    return "".join(out_parts)

def main():
    args = parse_args()
    content = INPUT.read_text(encoding="utf-8")

    # 1) Replace direct `CREATE TYPE IF NOT EXISTS ...`
    content = re.sub(r"CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z0-9_\".]+)\s+AS\s+ENUM\s*\((.*?)\)\s*;",
                     replace_create_type_if_not_exists, content, flags=re.IGNORECASE|re.DOTALL)

    # 2) Replace EXECUTE-wrapped CREATE TYPE
    content = re.sub(r"EXECUTE\s+\$([A-Za-z0-9_]*)\$\s*(CREATE\s+TYPE\s+.*?;?)\s*\$\1\$\s*;",
                     replace_execute_wrapped_create_type, content, flags=re.IGNORECASE|re.DOTALL)

    # 3) Replace EXECUTE-wrapped CREATE INDEX
    content = re.sub(r"EXECUTE\s+\$([A-Za-z0-9_]*)\$\s*(CREATE\s+(?:UNIQUE\s+)?INDEX\s+.*?;?)\s*\$\1\$\s*;",
                     replace_execute_wrapped_create_index, content, flags=re.IGNORECASE|re.DOTALL)

    # 4) Wrap standalone IF blocks
    content = wrap_if_blocks(content)

    # Summary / dry-run behavior
    print(f"Planned replacements: {replacements}")
    for k, v in replacements.items():
        if samples.get(k):
            print(f"Sample for {k} (up to 3):")
            for a, b in samples[k]:
                print("--- original snippet ---")
                print(a)
                print("--- replacement snippet ---")
                print(b)

    if parse_args().dry_run:
        print("Dry-run enabled; not writing output.")
        sys.exit(0)

    # write final output
    out_path = Path(parse_args().output)
    out_path.write_text(content, encoding="utf-8")
    print(f"Wrote {out_path} (replacements: {replacements})")

if __name__ == '__main__':
    main()
