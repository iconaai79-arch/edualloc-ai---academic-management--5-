
import os

filepath = r'c:\Users\hp\Downloads\edualloc-ai---academic-management (5)\src\services\pdfService.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to replace
old_p = "(e.courseLevelId === level.id || (e as any).course_level_id === level.id)"
new_p = "(String(e.courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id))"

content = content.replace(old_p, new_p)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched pdfService.ts")
