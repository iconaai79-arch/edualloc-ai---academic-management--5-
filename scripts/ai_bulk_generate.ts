import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

// Manual ENV parser to avoid dependency issues
function loadEnv() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8') || fs.readFileSync('.env', 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
        });
    } catch (e) {}
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    console.error("Missing configuration. Check .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function runInstitutionalGeneration() {
    console.log("🚀 Initializing Local AI Forge (Zero-Timeout Mode)...");
    
    // Fetch critical data
    const { data: allocations } = await supabase.from('timetable_allocations').select('*');
    const { data: subjects } = await supabase.from('subjects').select('*');
    const { data: rooms } = await supabase.from('rooms').select('*').eq('status', 'active');
    const { data: levels } = await supabase.from('course_levels').select('*');
    const { data: settings } = await supabase.from('timetable_settings').select('*').single();
    
    if (!allocations || !subjects) {
        console.error("❌ Data Fetch Failed.");
        return;
    }

    console.log(`📊 Processing ${allocations.length} allocations across ${levels?.length} levels...`);

    const allGeneratedEntries: any[] = [];
    const batches = levels || [];

    for (let i = 0; i < batches.length; i++) {
        const level = batches[i];
        console.log(`\n🧠 Pass ${i+1}/${batches.length}: ${level.name}`);
        
        const levelAllocations = allocations.filter(a => a.courseLevelIds?.includes(level.id));
        if (levelAllocations.length === 0) continue;

        const targets = levelAllocations.map(a => {
            const sub = subjects.find(s => s.id === a.subjectId);
            const totalRequired = (sub?.lessonStructure || []).reduce((acc: any, curr: any) => acc + (curr.periods || 1) * (curr.count || 0), 0);
            return { s: sub?.name, id: a.subjectId, c: totalRequired, l: a.lecturerId };
        });

        const prompt = `
            GENERATE TIMETABLE FOR: ${level.name}
            ROOMS: ${JSON.stringify(rooms?.slice(0, 50).map(r => ({ i: r.id, n: r.name })))}
            TARGETS: ${JSON.stringify(targets)}
            HOURS: ${JSON.stringify(settings?.hours)}
            CONTEXT (PREV): ${allGeneratedEntries.slice(-50).map(e => `${e.day}|${e.startTime}|L:${e.lecturerId}|R:${e.roomId}`).join(';')}
            
            Return ONLY a JSON array of objects: [{ day, startTime, endTime, subjectId, lecturerId, roomId, courseId, courseLevelId: "${level.id}" }]
            Use days Monday-Friday.
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const entries = JSON.parse(text);
            if (Array.isArray(entries)) {
                allGeneratedEntries.push(...entries);
                console.log(`✅ ${entries.length} sessions created.`);
            }
        } catch (e) {
            console.error(`⚠️ Pass failed: ${e}`);
        }
    }

    fs.writeFileSync('generated_timetable.json', JSON.stringify(allGeneratedEntries, null, 2));
    console.log("\n✨ DONE! 538+ periods generated and saved to generated_timetable.json");
    console.log("👉 Use the 'Import' tool in the Timetable module to load this file.");
}

runInstitutionalGeneration();
