with open('src/components/SuperAdminView.tsx', 'rb') as f:
    lines = f.readlines()

# Line 4552 (index 4551) currently is the <tr> without a <thead> wrapper.
# We need to insert a <thead> line before it.
thead_line = b'                                                        <thead>\r\n'
insert_idx = 4551  # 0-based: before line 4552
lines.insert(insert_idx, thead_line)

print(f"Inserted <thead> before line {insert_idx + 1}")
print(f"Total lines now: {len(lines)}")

with open('src/components/SuperAdminView.tsx', 'wb') as f:
    f.writelines(lines)

print("Done.")
