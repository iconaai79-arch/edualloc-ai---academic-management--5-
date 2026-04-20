
const fetch = require('node-fetch');

async function checkSchema() {
    try {
        const r = await fetch('http://localhost:5173/api/system?action=execute_sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'campaign_profiles\'' })
        });
        const j = await r.json();
        console.log(JSON.stringify(j, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
