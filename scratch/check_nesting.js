import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
const stack = [];
const regex = /<(div|main|aside|header|footer|section|article|nav|ul|li|button|span|p|h[1-6]|select|option|img|textarea|input|Loader2|Send|Search|Sparkles|Building2|Repeat2|LogOut|Atom|Hash|Globe|Bell|User|CheckCircle2|Share2|MessageSquare|Heart|Bookmark|MoreHorizontal|ArrowLeft|Calendar|MapPin|Filter|Grid|List|Zap|Shield|Trophy|Briefcase|GraduationCap|Users|Target|TrendingUp|Activity|FileText|Download|ExternalLink)\b[^>]*>|<\/(div|main|aside|header|footer|section|article|nav|ul|li|button|span|p|h[1-6]|select|option|img|textarea|input|Loader2|Send|Search|Sparkles|Building2|Repeat2|LogOut|Atom|Hash|Globe|Bell|User|CheckCircle2|Share2|MessageSquare|Heart|Bookmark|MoreHorizontal|ArrowLeft|Calendar|MapPin|Filter|Grid|List|Zap|Shield|Trophy|Briefcase|GraduationCap|Users|Target|TrendingUp|Activity|FileText|Download|ExternalLink)>|<>\s*|<\/>/g;
let match;
let line = 1;
let lastIndex = 0;
while ((match = regex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    line += (textBefore.match(/\n/g) || []).length;
    lastIndex = match.index;

    const tag = match[0];
    if (tag.endsWith('/>') && !tag.startsWith('</')) {
        // Self-closing
        continue;
    }
    if (tag.startsWith('</')) {
        const tagName = match[2] || 'fragment';
        if (stack.length === 0) {
            console.log(`Extra closing tag ${tagName} at line ${line}`);
        } else {
            const last = stack.pop();
            if (last.name !== tagName) {
                console.log(`Mismatch at line ${line}: closed ${tagName} but expected ${last.name} (from line ${last.line})`);
            }
        }
    } else {
        const tagName = match[1] || 'fragment';
        stack.push({ name: tagName, line });
    }
}
while (stack.length > 0) {
    const last = stack.pop();
    console.log(`Unclosed ${last.name} from line ${last.line}`);
}
