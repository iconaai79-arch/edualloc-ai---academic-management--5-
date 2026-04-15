
import os

filepath = r'c:\Users\hp\Downloads\edualloc-ai---academic-management (5)\src\services\pdfService.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: Horizontal Layout Break Detection
old_1 = """                            const isBreak = breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                            const breakObj = breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);"""

new_1 = """                            const isBreak = !!slot.isBreak;
                            const breakText = (slot.label || 'BREAK').split('').join('\\n');"""

content = content.replace(old_1, new_1)

# Pattern 2: Horizontal Layout Break Text Usage
old_2 = """                            if (isBreak) {
                                const breakText = (breakObj?.name || 'BREAK').split('').join('\\n');
                                row.push({ content: breakText, colSpan: 1, styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 } });"""

new_2 = """                            if (isBreak) {
                                row.push({ content: breakText, colSpan: 1, styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 } });"""

content = content.replace(old_2, new_2)

# Pattern 3: Vertical Layout Break Detection
old_3 = """                            const isBreak = breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                            const breakObj = breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);"""
# Note: This is second occurrence
new_3 = """                            const isBreak = !!slot.isBreak;
                            const breakText = (slot.label || 'BREAK').split('').join('\\n');"""

content = content.replace(old_3, new_3)

# Pattern 4: Vertical Layout Break Text usage
old_4 = """                                    const breakText = (breakObj?.name || 'BREAK').split('').join('\\n');
                                    row.push({
                                        content: breakText,"""

new_4 = """                                    const breakTxt = breakText;
                                    row.push({
                                        content: breakTxt,"""

content = content.replace(old_4, new_4)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched breaks in pdfService.ts")
