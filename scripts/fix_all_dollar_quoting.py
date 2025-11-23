import sys
import re

# Usage: python fix_all_dollar_quoting.py input.sql output.sql

def fix_all_dollar_quoting(sql):
    # Replace all $SOMETHING$ with $$ everywhere (opening, closing, DO blocks, etc.)
    sql = re.sub(r'\$[a-zA-Z0-9_]+\$', r'$$', sql)
    # Remove any double semicolons
    sql = re.sub(r';;+', ';', sql)
    # Remove excessive blank lines
    sql = re.sub(r'\n{3,}', '\n\n', sql)
    # Remove leading/trailing blank lines
    sql = sql.strip() + '\n'
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_all_dollar_quoting.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    fixed = fix_all_dollar_quoting(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(fixed)
    print(f"Replaced all $SOMETHING$ with $$. Output: {sys.argv[2]}")
