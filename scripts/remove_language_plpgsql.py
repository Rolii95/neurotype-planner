import sys
import re

# Usage: python remove_language_plpgsql.py input.sql output.sql

def remove_language_plpgsql(sql):
    # Remove LANGUAGE plpgsql (with or without semicolon) after END $$
    # Handles END $$ LANGUAGE plpgsql; and END$$ LANGUAGE plpgsql;
    pattern = re.compile(r"(END\s*\$\$)\s*LANGUAGE\s+plpgsql;?", re.IGNORECASE)
    return pattern.sub(r"\1;", sql)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python remove_language_plpgsql.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    cleaned = remove_language_plpgsql(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(cleaned)
    print(f"Removed LANGUAGE plpgsql from DO blocks. Output: {sys.argv[2]}")
