
export default function handler(req, res) {
    const keys = [
        'GEMINI_API_KEY',
        'VITE_GEMINI_API_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY',
        'API_KEY'
    ];
    
    const results = {};
    keys.forEach(key => {
        const val = process.env[key];
        results[key] = {
            present: !!val,
            length: val ? val.length : 0,
            prefix: val ? val.substring(0, 4) + '...' : 'none'
        };
    });

    res.status(200).json({
        engine: 'Gemini AI Diagnostic',
        env: process.env.NODE_ENV,
        keys: results,
        usage: 'Access this endpoint via /api/diag-ai to verify engine keys'
    });
}
