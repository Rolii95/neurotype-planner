import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IN = ROOT / 'manual_review_fixes.sql'
OUT = ROOT / 'manual_review_fixes_do_fixed.sql'

def main():
    s = IN.read_text(encoding='utf-8')
    # Find all END $tag$; occurrences and ensure they're followed by LANGUAGE
    pattern = re.compile(r'END\s+(\$[A-Za-z0-9_]*\$);', flags=re.IGNORECASE)
    parts = []
    last = 0
    for m in pattern.finditer(s):
        start, end = m.span()
        parts.append(s[last:start])
        token = m.group(0)
        # Look ahead for the next 50 chars to see if LANGUAGE appears immediately
        look = s[end:end+80]
        if re.match(r'\s*LANGUAGE\b', look, flags=re.IGNORECASE):
            parts.append(token)
        else:
            # Append LANGUAGE plpgsql; after the matched token
            parts.append(token + ' LANGUAGE plpgsql;')
            # If the lookahead started with a semicolon we could end up with duplicate semicolons,
            # but preserving the original semicolon from token keeps syntax valid.
        last = end
    parts.append(s[last:])
    out = ''.join(parts)
    OUT.write_text(out, encoding='utf-8')
    print(f'Wrote {OUT} (fixed DO blocks).')

if __name__ == '__main__':
    main()
