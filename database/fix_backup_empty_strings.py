"""
fix_backup_empty_strings.py
----------------------------
Fixes the SQL backup file for Supabase import by replacing empty string values ''
that land in JSONB columns with NULL. 

The backup has rows like:
  ..., '[]'::jsonb, '', NULL, ...
where '' is being inserted into a JSONB column (coopConfig or similar).

This script creates a FIXED copy of the backup: eduai_fixed_for_import.sql
"""

import re
import sys

INPUT  = r"C:\Users\hp\Downloads\eduai_full_database_backup_READY_FOR_IMPORT.sql"
OUTPUT = r"C:\Users\hp\Downloads\eduai_fixed_for_import.sql"

# Pattern: replace standalone '' that appears between ::jsonb or NULL or boolean
# values — i.e. '', when surrounded by commas/parens (not inside a real string).
# We specifically target the pattern:  , '', 
# and replace with                    , NULL,
# BUT only within INSERT ... INTO public."institutions" blocks.

def fix_line(line):
    """
    Replace bare '' tokens that appear between JSON/NULL/bool values.
    We use a careful token-level replacement so we don't touch legitimate strings.
    """
    # Replace pattern: (::jsonb|TRUE|FALSE|NULL), '', 
    # This catches empty string '' flanked by known non-string SQL tokens.
    fixed = re.sub(
        r"(::jsonb|TRUE|FALSE|NULL|\d+),\s*'',",
        r"\1, NULL,",
        line
    )
    # Also catch '', at start of value or before ::jsonb
    fixed = re.sub(
        r",\s*'',\s*(NULL|TRUE|FALSE|\d|'[\[{])",
        lambda m: ", NULL, " + m.group(1),
        fixed
    )
    return fixed

print(f"Reading: {INPUT}")
total_lines  = 0
fixed_lines  = 0
in_inst_block = False

with open(INPUT, "r", encoding="utf-8", errors="replace") as fin, \
     open(OUTPUT, "w", encoding="utf-8") as fout:

    for line in fin:
        total_lines += 1

        # Track whether we are inside the institutions INSERT block
        if 'INSERT INTO' in line and '"institutions"' in line:
            in_inst_block = True
        elif in_inst_block and line.strip().startswith('INSERT INTO'):
            in_inst_block = False  # new INSERT block started

        # Only fix lines inside the institutions INSERT block
        if in_inst_block and "''" in line:
            new_line = fix_line(line)
            if new_line != line:
                fixed_lines += 1
            fout.write(new_line)
        else:
            fout.write(line)

        if total_lines % 10000 == 0:
            print(f"  processed {total_lines:,} lines, fixed {fixed_lines:,}...")

print(f"\nDone! Total lines: {total_lines:,} | Fixed lines: {fixed_lines:,}")
print(f"Output: {OUTPUT}")
