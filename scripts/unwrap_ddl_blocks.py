import sys
import re

# Usage: python unwrap_ddl_blocks.py input.sql output.sql

def unwrap_ddl_blocks(sql):
    # Remove DO $$ BEGIN ... END$$ wrappers (greedy, multiline)
    # Only unwrap if the block contains DDL (CREATE INDEX, POLICY, TRIGGER, etc.)
    pattern = re.compile(r"DO \$\$\s*BEGIN(.*?)END\$\$", re.DOTALL | re.IGNORECASE)
    
    def unwrap_block(match):
        block = match.group(1)
        # If block contains DDL, return just the DDL
        if re.search(r"CREATE (INDEX|POLICY|TRIGGER|TABLE|TYPE|VIEW|SEQUENCE|FUNCTION|UNIQUE|CHECK|FOREIGN|PRIMARY|ALTER|GRANT|REVOKE)", block, re.IGNORECASE):
            return block
        return match.group(0)  # leave untouched if not DDL

    sql = pattern.sub(unwrap_block, sql)

    # Remove any remaining $wrap$ LANGUAGE plpgsql; and similar artifacts
    sql = re.sub(r"\$wrap\$\s*LANGUAGE\s+plpgsql;", "", sql, flags=re.IGNORECASE)
    # Remove stray $wrap$ tokens
    sql = re.sub(r"\$wrap\$", "", sql)
    # Remove empty EXECUTE $$ ... $$; wrappers (if any left)
    sql = re.sub(r"EXECUTE \$\$(.*?)\$\$;", lambda m: m.group(1), sql, flags=re.DOTALL)
    # Remove any double semicolons
    sql = re.sub(r";;+", ";", sql)
    # Clean up excessive blank lines
    sql = re.sub(r"\n{3,}", "\n\n", sql)
    return sql

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python unwrap_ddl_blocks.py input.sql output.sql")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        sql = f.read()
    cleaned = unwrap_ddl_blocks(sql)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(cleaned)
    print(f"Unwrapped DDL blocks and cleaned artifacts. Output: {sys.argv[2]}")
