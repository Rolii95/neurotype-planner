import sys
import re

# Usage: python fix_do_and_create_type.py input.sql output.sql

def fix_do_and_create_type(sql):
    # Fix accidental CREATE TABIF typo from previous runs
    sql = re.sub(r'CREATE\s+TABIF', 'CREATE TABLE', sql, flags=re.IGNORECASE)
    # Fix CREATE TYPE IF NOT EXISTS ... to proper DO $$ BEGIN ... END $$; guarded block
    def type_guard(match):
        type_name = match.group(1)
        enum_body = match.group(2)
        return (
            f"DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{type_name}') THEN\n"
            f"    EXECUTE 'CREATE TYPE {type_name} AS ENUM {enum_body}';\n"
            f"  END IF;\nEND;\n$$;"
        )
    sql = re.sub(r'CREATE TYPE IF NOT EXISTS ([a-zA-Z0-9_]+) AS ENUM(\s*\([^;]+\));', type_guard, sql, flags=re.IGNORECASE)
    # Do NOT touch CREATE TABLE IF NOT EXISTS or similar
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_do_and_create_type.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    fixed = fix_do_and_create_type(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(fixed)
    print(f"Fixed DO blocks and CREATE TYPE IF NOT EXISTS. Output: {sys.argv[2]}")
