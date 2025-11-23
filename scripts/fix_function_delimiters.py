import sys
import re

# Usage: python fix_function_delimiters.py input.sql output.sql

def fix_function_delimiters(sql):
    # Replace all function delimiters of the form $wrap$ (or any $...$) with $$
    # Handles AS $wrap$ ... $wrap$ [LANGUAGE plpgsql;]
    # Replace opening delimiter
    sql = re.sub(r'AS\s*\$[a-zA-Z0-9_]+\$', 'AS $$', sql)
    # Replace closing delimiter (before LANGUAGE)
    sql = re.sub(r'\$[a-zA-Z0-9_]+\$\s*LANGUAGE', '$$ LANGUAGE', sql)
    # Replace closing delimiter (standalone)
    sql = re.sub(r'\$[a-zA-Z0-9_]+\$\s*;', '$$;', sql)
    # Remove any stray LANGUAGE plpgsql; not following a function definition
    sql = re.sub(r'(?<!\$\$\s)LANGUAGE\s+plpgsql;?', '', sql, flags=re.IGNORECASE)
    # Remove excessive blank lines
    sql = re.sub(r'\n{3,}', '\n\n', sql)
    # Remove leading/trailing blank lines
    sql = sql.strip() + '\n'
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_function_delimiters.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    fixed = fix_function_delimiters(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(fixed)
    print(f"Replaced all $wrap$ (and similar) function delimiters with $$. Output: {sys.argv[2]}")
