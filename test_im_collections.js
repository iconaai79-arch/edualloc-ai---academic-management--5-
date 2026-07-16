import handler from './api/collections.ts';

// Setup Mock Environment Variables
process.env.SUPABASE_URL = 'https://mock-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock Fetch to intercept Supabase API calls
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    const urlStr = String(url);
    const bodyStr = options?.body ? String(options.body) : '';
    
    console.log(`[Mock Fetch] Request to: ${urlStr}`);
    if (options?.headers) {
        console.log(`  Headers:`, JSON.stringify(options.headers));
    }
    if (bodyStr) {
        console.log(`  Body: ${bodyStr}`);
    }

    // Match Institution query
    if (urlStr.includes('/rest/v1/institutions')) {
        console.log(`[Mock Fetch] Intercepted Institutions query`);
        const queryParams = new URL(urlStr).searchParams;
        const apiKeyFilter = queryParams.get("im_config->>apiKey");
        
        if (apiKeyFilter === 'eq.INVALID_KEY') {
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'content-type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify([
            {
                id: 'inst_test_123',
                name: 'Test I&M Academy',
                im_config: {
                    apiKey: 'TEST_KEY_123',
                    callbackUsername: 'im_test_user',
                    callbackSecret: 'im_test_secret'
                }
            }
        ]), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    }

    // Match Users query
    if (urlStr.includes('/rest/v1/users')) {
        console.log(`[Mock Fetch] Intercepted Users query`);
        return new Response(JSON.stringify([
            {
                id: 'u_test_456',
                name: 'Clark Kent',
                admission_number: 'C1012'
            }
        ]), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    }

    // Match ds_students query
    if (urlStr.includes('/rest/v1/ds_students')) {
        console.log(`[Mock Fetch] Intercepted ds_students query`);
        return new Response(JSON.stringify([
            {
                id: 'ds_student_789',
                full_name: 'Clark Kent',
                admission_number: 'C1012'
            }
        ]), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    }

    // Match im_transactions insert
    if (urlStr.includes('/rest/v1/im_transactions')) {
        console.log(`[Mock Fetch] Intercepted im_transactions insert`);
        return new Response(JSON.stringify([]), {
            status: 201,
            headers: { 'content-type': 'application/json' }
        });
    }

    // Match internal reconciliation bridge webhook
    if (urlStr.includes('/api/integrations?action=reconcileInternal')) {
        console.log(`[Mock Fetch] Intercepted Reconciliation Webhook`);
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    }

    return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' }
    });
};

// Helper mock response builder
function createMockResponse() {
    const res = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
            this.headers[name.toLowerCase()] = value;
            return this;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        },
        end() {
            this.ended = true;
            return this;
        }
    };
    return res;
}

async function runTests() {
    console.log('🚀 Starting I&M Collections API Integration Tests...\n');

    // Test Case 1: Validation with API Key and matching reference
    {
        console.log('--- Test Case 1: Customer Validation (API Key Auth) ---');
        const req = {
            method: 'POST',
            url: '/api/collections/validate',
            headers: {
                'x-api-key': 'TEST_KEY_123',
                'content-type': 'application/json'
            },
            body: {
                customerRef: 'C1012'
            }
        };
        const res = createMockResponse();
        await handler(req, res);
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', res.body);
        if (res.statusCode === 200 && res.body?.resultCode === 0 && res.body?.customerName === 'Clark Kent') {
            console.log('✅ Test Case 1 Passed!\n');
        } else {
            console.error('❌ Test Case 1 Failed!\n');
        }
    }

    // Test Case 2: Validation with Basic Auth and matching reference
    {
        console.log('--- Test Case 2: Customer Validation (Basic Auth) ---');
        const credentials = Buffer.from('im_test_user:im_test_secret').toString('base64');
        const req = {
            method: 'POST',
            url: '/api/collections/validate',
            headers: {
                'authorization': `Basic ${credentials}`,
                'content-type': 'application/json'
            },
            body: {
                customerRef: 'C1012'
            }
        };
        const res = createMockResponse();
        await handler(req, res);
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', res.body);
        if (res.statusCode === 200 && res.body?.resultCode === 0) {
            console.log('✅ Test Case 2 Passed!\n');
        } else {
            console.error('❌ Test Case 2 Failed!\n');
        }
    }

    // Test Case 3: Unauthorized Validation Request
    {
        console.log('--- Test Case 3: Unauthorized Validation Request ---');
        const req = {
            method: 'POST',
            url: '/api/collections/validate',
            headers: {
                'x-api-key': 'INVALID_KEY',
                'content-type': 'application/json'
            },
            body: {
                customerRef: 'C1012'
            }
        };
        const res = createMockResponse();
        await handler(req, res);
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', res.body);
        if (res.statusCode === 401 && res.body?.resultCode === 1) {
            console.log('✅ Test Case 3 Passed!\n');
        } else {
            console.error('❌ Test Case 3 Failed!\n');
        }
    }

    // Test Case 4: Process Payment Callback
    {
        console.log('--- Test Case 4: Process Payment Callback (API Key Auth) ---');
        const req = {
            method: 'POST',
            url: '/api/collections/payments',
            headers: {
                'x-api-key': 'TEST_KEY_123',
                'content-type': 'application/json',
                'host': 'localhost:5173'
            },
            body: {
                paymentType: 'MPESA',
                transactionReference: 'IM_TXN_XYZ_999',
                transactionDate: '2026-07-16T12:00:00',
                amount: 3200.00,
                currency: 'KES',
                shortCode: '654321',
                additions: {
                    customerRef: 'C1012',
                    externalRefNumber: 'QWERT12345',
                    payerName: 'Clark Kent',
                    payerMobileNumber: '254700000000'
                }
            }
        };
        const res = createMockResponse();
        await handler(req, res);
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', res.body);
        if (res.statusCode === 200 && res.body?.resultCode === 0 && res.body?.erpRefId) {
            console.log('✅ Test Case 4 Passed!\n');
        } else {
            console.error('❌ Test Case 4 Failed!\n');
        }
    }

    console.log('🎉 All Integration Tests Complete!');
}

runTests().catch(console.error);
