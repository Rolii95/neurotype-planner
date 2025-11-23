import sys
import re

# Usage: python fix_any_dollar_delimiter.py input.sql output.sql

def fix_any_dollar_delimiter(sql):
    # Replace any sequence starting with $, followed by any characters (including newlines, whitespace, or non-printable), and ending with $, with $$
    # This will match $...$ even across lines or with hidden chars
    sql = re.sub(r'\$.*?\$', r'$$', sql, flags=re.DOTALL)
    # Remove any double semicolons
    sql = re.sub(r';;+', ';', sql)
    # Remove excessive blank lines
    sql = re.sub(r'\n{3,}', '\n\n', sql)
    # Remove leading/trailing blank lines
    sql = sql.strip() + '\n'
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_any_dollar_delimiter.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    fixed = fix_any_dollar_delimiter(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(fixed)
    print(f"Replaced any $...$ (even multiline/hidden) with $$. Output: {sys.argv[2]}")
