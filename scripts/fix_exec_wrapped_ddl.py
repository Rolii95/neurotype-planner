import re
import sys

# Usage: python fix_exec_wrapped_ddl.py input.sql output.sql

def unwrap_exec_ddl_block(sql):
    # Pattern for DO blocks wrapping EXECUTE 'CREATE INDEX ...' or similar
    do_block_pattern = re.compile(
        r"DO \$\$\s*BEGIN\s*IF NOT EXISTS \([^)]+\) THEN\s*EXECUTE \$\$([\s\S]+?)\$\$;\s*END IF;\s*END\s*\$\$ LANGUAGE plpgsql;",
        re.IGNORECASE)
    # Replace with just the DDL inside EXECUTE
    def repl(match):
        ddl = match.group(1).strip()
        return ddl if ddl.endswith(';') else ddl + ';'
    return do_block_pattern.sub(repl, sql)

def main():
    if len(sys.argv) != 3:
        print("Usage: python fix_exec_wrapped_ddl.py input.sql output.sql")
        sys.exit(1)
    infile, outfile = sys.argv[1], sys.argv[2]
    with open(infile, 'r', encoding='utf-8') as fin:
        sql = fin.read()
    fixed_sql = unwrap_exec_ddl_block(sql)
    with open(outfile, 'w', encoding='utf-8') as fout:
        fout.write(fixed_sql)

if __name__ == "__main__":
    main()
