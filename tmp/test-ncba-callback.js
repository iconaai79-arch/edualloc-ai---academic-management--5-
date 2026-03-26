// Scratch script to test NCBA Callback
// Run with: node tmp/test-ncba-callback.js

async function testCallback() {
    const url = 'http://localhost:3000/api/ncba-callback?institutionId=test-inst';
    const payload = {
        TransactionID: 'NCBA_TEST_' + Date.now(),
        ResultCode: '0',
        ResultDesc: 'Success',
        Amount: '1000',
        status: 'COMPLETED'
    };

    console.log('Testing NCBA Callback with payload:', payload);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', data);
        
        if (data.ResultCode === 0) {
            console.log('✅ TEST PASSED: Callback acknowledged.');
        } else {
            console.log('❌ TEST FAILED: Unexpected response.');
        }
    } catch (err) {
        console.error('❌ TEST FAILED: Connection error. (Is the server running?)', err.message);
    }
}

testCallback();
