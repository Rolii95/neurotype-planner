import re
import sys

# Usage: python fix_exec_wrapped_ddl_clean.py input.sql output.sql

def unwrap_and_clean(sql):
    # Unwrap DO/EXECUTE-wrapped DDL blocks
    do_block_pattern = re.compile(
        r"DO \$\$\s*BEGIN\s*IF NOT EXISTS \([^)]+\) THEN\s*EXECUTE \$\$([\s\S]+?)\$\$;\s*END IF;\s*END\s*\$\$ LANGUAGE plpgsql;",
        re.IGNORECASE)
    sql = do_block_pattern.sub(lambda m: m.group(1).strip() + (';' if not m.group(1).strip().endswith(';') else ''), sql)
    # Remove any leftover fragments like $$;, END IF;, END $$;, etc.
    fragment_patterns = [
        re.compile(r"\$\$;\s*END IF;\s*END \$\$;?", re.IGNORECASE),
        re.compile(r"\$\$;", re.IGNORECASE),
        re.compile(r"END IF;", re.IGNORECASE),
        re.compile(r"END \$\$;?", re.IGNORECASE),
        re.compile(r"LANGUAGE plpgsql;", re.IGNORECASE),
    ]
    for pat in fragment_patterns:
        sql = pat.sub("", sql)
    # Remove empty lines
    sql = re.sub(r"^\s*$\n", "", sql, flags=re.MULTILINE)
    return sql

def main():
    if len(sys.argv) != 3:
        print("Usage: python fix_exec_wrapped_ddl_clean.py input.sql output.sql")
        sys.exit(1)
    infile, outfile = sys.argv[1], sys.argv[2]
    with open(infile, 'r', encoding='utf-8') as fin:
        sql = fin.read()
    fixed_sql = unwrap_and_clean(sql)
    with open(outfile, 'w', encoding='utf-8') as fout:
        fout.write(fixed_sql)

if __name__ == "__main__":
    main()
