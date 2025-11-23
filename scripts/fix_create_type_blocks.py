import re
import sys

# Usage: python fix_create_type_blocks.py input.sql output.sql

def guarded_do_block(type_name, enum_values):
    enum_list = ", ".join([f"''{v}''" for v in enum_values])
    return f"""DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{type_name}') THEN\n    EXECUTE 'CREATE TYPE {type_name} AS ENUM ({enum_list})';\n  END IF;\nEND $$ LANGUAGE plpgsql;\n"""

def main():
    if len(sys.argv) != 3:
        print("Usage: python fix_create_type_blocks.py input.sql output.sql")
        sys.exit(1)
    infile, outfile = sys.argv[1], sys.argv[2]
    pattern = re.compile(r"CREATE TYPE IF NOT EXISTS (\w+) AS ENUM \(([^)]+)\);", re.IGNORECASE)
    with open(infile, 'r', encoding='utf-8') as fin, open(outfile, 'w', encoding='utf-8') as fout:
        for line in fin:
            m = pattern.search(line)
            if m:
                type_name = m.group(1)
                enum_values = [v.strip().strip("'\"") for v in m.group(2).split(',')]
                fout.write(guarded_do_block(type_name, enum_values))
            else:
                fout.write(line)

if __name__ == "__main__":
    main()
