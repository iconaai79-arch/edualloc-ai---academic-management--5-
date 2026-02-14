import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.VITE_GEMINI_API_KEY || "dummy";
const ai = new GoogleGenAI({ apiKey });

async function test() {
    console.log("Testing simplified contents...");
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Hello'
        });
        console.log("Success with string:", res.text);
    } catch (e) {
        console.error("Failed with string:", e.message);
    }

    console.log("\nTesting structured contents...");
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
        });
        console.log("Success with array:", res.text);
    } catch (e) {
        console.error("Failed with array:", e.message);
    }
}

test();
