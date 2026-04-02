// Mocking the normalizeNcbaUrl logic from integrations.ts
const normalizeNcbaUrl = (url) => {
    if (!url) return 'https://c2bapis.ncbagroup.com';
    let normalized = url.trim().replace(/\/+$/, '');
    if (!normalized.startsWith('http')) normalized = 'https://' + normalized;
    
    // Legacy Migration: Auto-swap old host for new gateway
    if (normalized.includes('api.ncbagroup.com')) {
        console.log(`[Test] Auto-migrating legacy URL: ${normalized} -> https://c2bapis.ncbagroup.com`);
        normalized = normalized.replace('api.ncbagroup.com', 'c2bapis.ncbagroup.com');
    }
    return normalized;
};

// Test Cases
const cases = [
    { input: 'https://api.ncbagroup.com', expected: 'https://c2bapis.ncbagroup.com' },
    { input: 'api.ncbagroup.com/oauth/v1/generate', expected: 'https://c2bapis.ncbagroup.com/oauth/v1/generate' },
    { input: 'https://c2bapis.ncbagroup.com', expected: 'https://c2bapis.ncbagroup.com' },
    { input: '', expected: 'https://c2bapis.ncbagroup.com' }
];

console.log('--- Verifying NCBA URL Normalization Logic ---');
let allPassed = true;
cases.forEach(c => {
    const result = normalizeNcbaUrl(c.input);
    if (result === c.expected) {
        console.log(`✅ PASS: "${c.input}" -> "${result}"`);
    } else {
        console.log(`❌ FAIL: "${c.input}" -> "${result}" (Expected: "${c.expected}")`);
        allPassed = false;
    }
});

if (allPassed) {
    console.log('\nFinal Verification: The logic correctly handles legacy NCBA URLs.');
} else {
    process.exit(1);
}
