
import { apiService } from './src/services/apiService';

async function runFix() {
    const sql = `
        ALTER TABLE alumni_posts ADD COLUMN IF NOT EXISTS photo_url TEXT;
        ALTER TABLE alumni_posts ADD COLUMN IF NOT EXISTS media_urls TEXT[];
        ALTER TABLE alumni_posts ADD COLUMN IF NOT EXISTS likes TEXT[] DEFAULT '{}';
        ALTER TABLE alumni_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
        ALTER TABLE alumni_posts ADD COLUMN IF NOT EXISTS author_photo TEXT;
        ALTER TABLE alumni_posts ADD COLUMN IF NOT EXISTS author_role TEXT;
    `;
    console.log("Running migration...");
    const res = await apiService.runMigration(sql);
    console.log("Migration result:", res);
}

runFix();
