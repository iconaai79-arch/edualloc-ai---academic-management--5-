export default function handler(req, res) {
    res.status(200).json({
        has_url: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
        has_anon: !!process.env.SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_ANON_KEY,
        has_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        node_version: process.version,
        platform: process.platform
    });
}
