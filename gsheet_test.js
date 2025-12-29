const https = require('https');

async function testBridge() {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylbPAEigx5b3Xh8L5GxuQD52cggRe1dio63Km_1ktqzYOGchN0cXpWc_AnvRsXvHs/exec';

    console.log('--- Testing Google Apps Script Bridge ---');
    console.log('URL:', SCRIPT_URL);

    const rowValues = [
        "TEST_ID",
        new Date().toISOString(),
        "TEST-DOC-001",
        "Test Supplier",
        "B 1234 TEST",
        "Test Driver",
        "Pembelian",
        1000,
        500,
        500,
        0,
        5000,
        2500000
    ];

    const url = new URL(SCRIPT_URL);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    try {
        const req = https.request(options, (res) => {
            console.log('Status Code:', res.statusCode);
            console.log('Headers:', JSON.stringify(res.headers, null, 2));

            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('Response Body:', body);
                if (res.statusCode === 302 || res.statusCode === 301) {
                    console.log('⚠️ REDIRECT DETECTED! Need to handle redirects manually in Node.js.');
                }
            });
        });

        req.on('error', (e) => {
            console.error('❌ Request Error:', e.message);
        });

        req.write(JSON.stringify({ values: rowValues }));
        req.end();
    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

testBridge();
