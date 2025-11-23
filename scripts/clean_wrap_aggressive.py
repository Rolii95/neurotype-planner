import sys
import re

# Usage: python clean_wrap_aggressive.py input.sql output.sql

def clean_wrap_aggressive(sql):
    # Remove any line containing $wrap$ (with or without semicolon, whitespace, or other tokens)
    sql = re.sub(r'^.*\$wrap\$.*$', '', sql, flags=re.MULTILINE)
    # Remove any remaining $wrap$ tokens anywhere in the file
    sql = re.sub(r'\$wrap\$', '', sql)
    # Remove any double semicolons
    sql = re.sub(r';;+', ';', sql)
    # Remove excessive blank lines
    sql = re.sub(r'\n{3,}', '\n\n', sql)
    # Remove leading/trailing blank lines
    sql = sql.strip() + '\n'
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python clean_wrap_aggressive.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    cleaned = clean_wrap_aggressive(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(cleaned)
    print(f"Aggressively removed all $wrap$-related lines and tokens. Output: {sys.argv[2]}")
