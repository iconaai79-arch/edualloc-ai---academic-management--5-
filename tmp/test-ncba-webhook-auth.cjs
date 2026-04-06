/**
 * This script simulates an NCBA Webhook request to verify the authentication logic.
 * It mocks the fetch-like environment to check if the security logic works.
 */

const crypto = require('crypto');

// Mock data
const mockSettings = {
    ncba_config: {
        callbackUsername: 'testuser',
        callbackSecret: 'testpass123'
    }
};

const mockBody = {
    TransactionID: 'NCBA123456',
    ResultCode: '0',
    status: 'SUCCESS'
};

function testWebhook(authHeader) {
    console.log(`Testing with Auth Header: ${authHeader || 'None'}`);
    
    // Simulate logic from integrations.ts
    const ncbaConfig = mockSettings.ncba_config;
    const expectedUser = ncbaConfig.callbackUsername;
    const expectedPass = ncbaConfig.callbackSecret;

    if (expectedUser && expectedPass) {
        const expectedAuth = `Basic ${Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64')}`;
        
        if (authHeader !== expectedAuth) {
            console.log('Result: 401 Unauthorized (CORRECT)');
            return;
        }
    }

    console.log('Result: 200 OK (Authenticated)');
}

// Case 1: No auth
testWebhook(null);

// Case 2: Wrong auth
testWebhook('Basic d3Jvbmc6cGFzcw==');

// Case 3: Correct auth
const correctAuth = `Basic ${Buffer.from('testuser:testpass123').toString('base64')}`;
testWebhook(correctAuth);
