import sys
import re

# Usage: python clean_language_wrap.py input.sql output.sql

def clean_language_and_wrap(sql):
    # Remove LANGUAGE plpgsql; and $wrap$ LANGUAGE plpgsql;
    sql = re.sub(r"\$wrap\$\s*LANGUAGE\s+plpgsql;?", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"LANGUAGE\s+plpgsql;?", "", sql, flags=re.IGNORECASE)
    # Remove stray $wrap$ tokens
    sql = re.sub(r"\$wrap\$", "", sql)
    # Clean up excessive blank lines
    sql = re.sub(r"\n{3,}", "\n\n", sql)
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python clean_language_wrap.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    cleaned = clean_language_and_wrap(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(cleaned)
    print(f"Removed LANGUAGE plpgsql and $wrap$ artifacts. Output: {sys.argv[2]}")
