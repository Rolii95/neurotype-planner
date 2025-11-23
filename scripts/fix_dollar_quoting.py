import sys
import re

# Usage: python fix_dollar_quoting.py input.sql output.sql

def fix_dollar_quoting(sql):
    # Replace all occurrences of $wrap$ (or any $...$) with $$
    # Only replace if used as a function delimiter (not inside strings)
    # This will match $wrap$ or $SOMETHING$ as a delimiter
    sql = re.sub(r'\$[a-zA-Z0-9_]+\$', r'$$', sql)
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_dollar_quoting.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    fixed = fix_dollar_quoting(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(fixed)
    print(f"Replaced all non-standard dollar-quoting delimiters with $$. Output: {sys.argv[2]}")
