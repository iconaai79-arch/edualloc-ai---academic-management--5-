import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const supabase = createServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });
    
    const userResult = await getAuthenticatedUser(supabase, req.headers.authorization);
    if (!userResult || userResult.role !== 'super_admin') {
        return res.status(401).json({ error: 'Unauthorized: Super Admin access required' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { topic, location, niche } = req.body;

        if (!topic) return res.status(400).json({ error: 'Topic is required' });

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

        // Intelligence Phase: AI Scout
        // In a production environment, you would use a Search API here (e.g. Serper, Tavily, Google Search)
        // to get actual live URLs. For this intelligent demonstration, we use Gemini's internal knowledge
        // and web-reasoning capability to identify known high-potential institutions in the requested area.
        
        const prompt = `
            Act as an Intelligent Lead Scout for EduAI Hub, a SaaS platform for Schools, SACCOs, Real Estate, and Automotive management.
            Your task is to identify and research 3 high-potential business leads related to the topic: "${topic}" in "${location || 'Kenya'}".
            
            For each lead, provide:
            1. Business Name
            2. Niche (one of: Education, Property, Automotive, Sacco, Logistics)
            3. Estimated contact email (base it on standard patterns if exact match not found, e.g. info@business.co.ke)
            4. Website URL (if known)
            5. Lead Score (0-100) based on their likely need for digital automation
            6. A short AI Summary explaining why they are a good fit.

            Format the response as a valid JSON array of objects.
            Example:
            [
              {
                "businessName": "Example School",
                "niche": "Education",
                "email": "info@exampleschool.ac.ke",
                "websiteUrl": "http://exampleschool.ac.ke",
                "leadScore": 85,
                "aiSummary": "Established private school with over 500 students. Likely needs automated fee management and portal."
              }
            ]
        `;

        const result = await model.generateContent(prompt).catch(e => {
            console.error("Gemini API Error:", e);
            throw new Error(`AI Engine Error: ${e.message}`);
        });

        // Handle potential safety blocks or empty responses
        if (!result.response) throw new Error("AI returned an empty response. It might be blocked by safety filters.");
        
        const responseText = result.response.text();
        if (!responseText) throw new Error("AI returned an empty text response.");
        
        // Extract JSON from response (handling potential markdown formatting)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("Raw AI Response (No JSON found):", responseText);
            throw new Error("Failed to parse AI scout results. The engine returned invalid formatting.");
        }
        
        let prospects: any[];
        try {
            prospects = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Text:", jsonMatch[0]);
            throw new Error("AI scout result parsing error.");
        }

        // Storage Phase - Generate consistent IDs for TEXT primary key
        const { data: savedData, error: dbError } = await supabase
            .from('marketing_prospects')
            .upsert(prospects.map((p: any) => ({
                id: `pros_${Math.random().toString(36).slice(2, 11)}`,
                business_name: p.businessName,
                niche: p.niche,
                email: p.email,
                website_url: p.websiteUrl,
                lead_score: p.leadScore,
                ai_summary: p.aiSummary,
                status: 'new',
                location: location || 'Kenya'
            })), { onConflict: 'email' })
            .select();

        if (dbError) {
            console.error("Supabase Upsert Error:", dbError);
            // Check for common permission/table missing errors
            if (dbError.code === '42P01') throw new Error("Database table 'marketing_prospects' is missing. Please run migrations.");
            throw new Error(`Database Error: ${dbError.message}`);
        }

        return res.status(200).json({ 
            success: true, 
            count: savedData?.length || 0,
            message: `Scout successfully identified and stored ${savedData?.length || 0} new high-potential leads.`,
            prospects: savedData || []
        });

    } catch (error: any) {
        console.error("Lead Scout Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Scouting Failed", 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
