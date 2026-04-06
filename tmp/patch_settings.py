import os

path = r"c:\Users\hp\Downloads\edualloc-ai---academic-management (5)\src\components\SettingsManager.tsx"

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# 1. Add toggles state
# Anchor: Find any useState at the beginning of the component
if not any("showInstNcbaCallbackSecret" in line for line in lines):
    for i in range(len(lines)):
        if 'const [activeTab' in lines[i]:
            lines.insert(i+1, '    const [showInstNcbaCallbackSecret, setShowInstNcbaCallbackSecret] = useState(false);\n')
            lines.insert(i+2, '    const [showInstNcbaClientSecret, setShowInstNcbaClientSecret] = useState(false);\n')
            break

# 2. Section 2 patches
# We already confirmed they were added in the previous run.
# But let's make sure 'showInstNcbaClientSecret' is used correctly in the input.
# I saw it was used in lines 2424 and 2432 in the previous view_file.

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
