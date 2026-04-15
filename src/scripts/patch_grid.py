
import os

filepath = r'c:\Users\hp\Downloads\edualloc-ai---academic-management (5)\src\components\MasterCourseTimetableGrid.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace level search logic
old_block1 = """                                                                             const levelEntryCount = (course.levels || []).find(l => l && (l.subjectIds || []).includes(entry.subjectId)) ?
                                                                                 (course.levels || []).filter(l => l && (l.subjectIds || []).includes(entry.subjectId))
                                                                                     .reduce((max, l) => Math.max(max, levelCounts[l.id] || 0), 0) : 0;"""

new_block1 = """                                                                            const levelEntryCount = levelCounts[entry.courseLevelId] || 0;"""

content = content.replace(old_block1, new_block1)

# Replace another one
old_block2 = """                                                                            if (isBlockPart && idx === slotEntries.findIndex(e => e && (course.levels || []).some(l => l && (l.subjectIds || []).includes(e.subjectId) && (l.subjectIds || []).includes(entry.subjectId)))) {"""
new_block2 = """                                                                            if (isBlockPart && idx === slotEntries.findIndex(e => e && e.courseLevelId === entry.courseLevelId)) {"""

content = content.replace(old_block2, new_block2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched MasterCourseTimetableGrid.tsx")
