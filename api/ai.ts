import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Use the correct SDK package

import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

const getSafeKey = () => {
    return process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.API_KEY;
};

const apiKey = getSafeKey();
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const config = {
    maxDuration: 60
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Verify Auth
    const supabase = createServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });
    const userResult = await getAuthenticatedUser(supabase, req.headers.authorization);
    if (!userResult) return res.status(401).json({ error: 'Unauthorized: Session invalid' });

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!genAI) {
        console.error("AI Service Error: API Key missing on server.");
        return res.status(503).json({
            error: "AI Service Unavailable",
            message: "Server configuration error. API Key not found."
        });
    }

    try {
        const { model: modelName, contents, config, history, message } = req.body;

        // Use the requested model or default to flash
        const model = genAI.getGenerativeModel({ model: modelName || 'gemini-flash-latest' });

        // Mode 1: Chat (Multi-turn)
        if (history && message) {
            const chat = model.startChat({
                history: history,
                generationConfig: config
            });
            const result = await chat.sendMessage(message);
            const response = await result.response;
            return res.status(200).json({ text: response.text() });
        }

        // Mode 2: Generate Content (Single-turn)
        if (contents) {
            // Unpack contents if it's nested or malformed
            const promptContent = Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: JSON.stringify(contents) }] }];

            const result = await model.generateContent({
                contents: promptContent,
                generationConfig: config
            });
            const response = await result.response;
            return res.status(200).json({
                text: response.text()
            });
        }

        return res.status(400).json({ error: "Invalid Request", message: "Missing 'contents' or 'history/message' in body." });

    } catch (error: any) {
        console.error("AI Generation Error Full:", error);

        // Detailed error for server logs, sanitized for client
        const msg = error.message || "Unknown error";
        return res.status(500).json({
            error: "AI Processing Failed",
            details: msg, // Sending msg for debugging (remove in prod if needed, but useful now)
            message: "The AI engine encountered a problem."
        });
    }
}
