
const envKeys = [
    'SUPABASE_URL', 'VITE_SUPABASE_URL',
    'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY'
];

console.log('--- Environment Variables Check ---');
envKeys.forEach(key => {
    const val = process.env[key];
    if (val) {
        console.log(`${key}: Found (${val.substring(0, 5)}...)`);
    } else {
        console.log(`${key}: Not Found`);
    }
});
