const fetch = require('node-fetch');

async function testCreds() {
    const config = {
        clientId: '339630890720-7l1v25qqn720lam1pdil9983kpesc6ko.apps.googleusercontent.com',
        clientSecret: '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',
        refreshToken: '1//04qYBbU-lcD7ZCgYIARAAGAQSNwF-L9IrcrFfdNCAt543-9mnKBrK100pHv0Mjo2Y1PkagUGWY4E-7bBtCne30EyiE08_O-AvsBA'
    };

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token'
    });

    try {
        console.log('--- Starting Handshake Test ---');
        const greq = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data = await greq.json();
        if (greq.ok) {
            console.log('SUCCESS: Handshake verified with Google!');
            console.log('Access Token acquired:', data.access_token.substring(0, 10) + '...');
            
            // Step 2: Test API access
            const verifyRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const about = await verifyRes.json();
            console.log('API Account verified:', about.user.emailAddress);
        } else {
            console.log('FAILURE: Google rejected the credentials.');
            console.log('Reason:', data.error_description || data.error);
        }
    } catch (e) {
        console.log('CRITICAL ERROR:', e.message);
    }
}

testCreds();
