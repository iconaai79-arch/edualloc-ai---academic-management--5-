import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

const getSafeKey = () => {
    return process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.API_KEY;
};

const apiKey = getSafeKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!ai) {
        console.error("AI Service Error: API Key missing on server.");
        return res.status(500).json({
            error: "AI Service Unavailable",
            message: "Server configuration error. Please contact administrator."
        });
    }

    try {
        const { model, contents, config, history, message } = req.body;

        // Mode 1: Chat (Multi-turn)
        if (history && message) {
            const chat = ai.chats.create({
                model: model || 'gemini-1.5-flash',
                history: history
            });
            const result = await chat.sendMessage({ message });
            return res.status(200).json({ text: result.text });
        }

        // Mode 2: Generate Content (Single-turn)
        if (contents) {
            const result = await ai.models.generateContent({
                model: model || 'gemini-1.5-flash',
                contents: contents,
                config: config
            });
            return res.status(200).json({
                text: result.text, // Handle SDK response structure
                candidates: result.candidates
            });
        }

        return res.status(400).json({ error: "Invalid Request", message: "Missing 'contents' or 'history/message' in body." });

    } catch (error: any) {
        console.error("AI Generation Error:", error);

        // Sanitize error for client
        const msg = error.message || "Unknown error";
        const isRateLimit = msg.includes("429") || msg.includes("quota");

        return res.status(500).json({
            error: "AI Processing Failed",
            message: isRateLimit ? "Service is busy. Please try again later." : "The AI engine encountered a problem."
        });
    }
}
