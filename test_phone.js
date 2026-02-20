const formatPhoneNumber = (phone) => {
    if (!phone) return phone;
    const sanitized = phone.replace(/\s/g, '');
    if (sanitized.startsWith('07')) {
        return '254' + sanitized.substring(1);
    }
    if (sanitized.startsWith('011')) {
        return '254' + sanitized.substring(1);
    }
    return phone;
};

const tests = [
    { input: '0712345678', expected: '254712345678' },
    { input: '0112345678', expected: '254112345678' },
    { input: '07 123 456 78', expected: '254712345678' },
    { input: '011 234 5678', expected: '254112345678' },
    { input: '254712345678', expected: '254712345678' },
    { input: '+254712345678', expected: '+254712345678' },
    { input: '0612345678', expected: '0612345678' },
    { input: '', expected: '' },
    { input: null, expected: null }
];

tests.forEach(test => {
    const result = formatPhoneNumber(test.input);
    console.log(`Input: "${test.input}" -> Output: "${result}" [${result === test.expected ? 'PASS' : 'FAIL'}]`);
});
