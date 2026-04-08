const fs = require('fs');
const http = require('http');

const sql = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/database/migrations/135_fix_pharmacy_schemas.sql', 'utf8');

const data = JSON.stringify({ sql });

const options = {
  hostname: 'localhost',
  port: 3000, // Assuming dev server is on 3000
  path: '/api/system?action=execute_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (e) => {
  console.error('Problem with request:', e.message);
});

req.write(data);
req.end();
