import sys
import re

# Usage: python clean_wrap_artifacts.py input.sql output.sql

def clean_wrap_artifacts(sql):
    # Remove lines that are just $wrap$ or $wrap$;
    sql = re.sub(r'^\s*\$wrap\$;?\s*$', '', sql, flags=re.MULTILINE)
    # Remove $wrap$ LANGUAGE plpgsql; (with or without whitespace)
    sql = re.sub(r'\$wrap\$\s*LANGUAGE\s+plpgsql;?', '', sql, flags=re.IGNORECASE)
    # Remove any remaining $wrap$ tokens (standalone or inline)
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
        print("Usage: python clean_wrap_artifacts.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    cleaned = clean_wrap_artifacts(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(cleaned)
    print(f"Removed all $wrap$-related artifacts. Output: {sys.argv[2]}")
