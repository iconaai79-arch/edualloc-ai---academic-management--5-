import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
const cases = ['events', 'support', 'funding', 'notifications', 'explore', 'jobs', 'groups', 'feed'];
cases.forEach(c => {
    const regex = new RegExp(`case '${c}':[\\s\\S]*?(?:case '|default:|}\\s*\\)\\(\\))`);
    const match = content.match(regex);
    if (match) {
        let open = 0, close = 0;
        const text = match[0];
        const tags = text.match(/<div\b[^>]*>|<\/div>/g) || [];
        tags.forEach(t => {
            if (t.startsWith('<div')) {
                if (!t.endsWith('/>')) open++;
            } else close++;
        });
        console.log(`Case ${c}: Open ${open}, Close ${close}, Diff ${open - close}`);
    }
});
