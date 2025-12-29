const https = require('https');

async function injectData() {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylbPAEigx5b3Xh8L5GxuQD52cggRe1dio63Km_1ktqzYOGchN0cXpWc_AnvRsXvHs/exec';

    console.log('--- Injecting Data via Terminal ---');
    console.log('URL:', SCRIPT_URL);

    const testData = {
        values: [
            "INJECT_" + Date.now(),
            new Date().toLocaleString('id-ID'),
            "INJ-DOC-999",
            "Terminal Injector",
            "B 1234 OK",
            "Antigravity",
            "Pembelian",
            100,
            50,
            50,
            0,
            1000,
            50000
        ]
    };

    function post(urlStr, data) {
        return new Promise((resolve, reject) => {
            const url = new URL(urlStr);
            const req = https.request({
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                console.log(`[Response] Status: ${res.statusCode}`);

                if (res.statusCode === 302 || res.statusCode === 301) {
                    const loc = res.headers.location;
                    console.log(`[Redirect] Moving to: ${loc}`);
                    // Following redirect
                    post(loc, data).then(resolve).catch(reject);
                    return;
                }

                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const lowBody = body.toLowerCase();
                    if (lowBody.includes('google') && (lowBody.includes('sign in') || lowBody.includes('login') || lowBody.includes('service login'))) {
                        console.log('⚠️ DETECTED: Google Login Page (Unauthorized)');
                    } else if (body.includes('Success')) {
                        console.log('✅ Found "Success" in body!');
                    } else {
                        console.log('[Full Body Result]:', body);
                    }
                    resolve(body);
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify(data));
            req.end();
        });
    }

    try {
        const result = await post(SCRIPT_URL, testData);
        if (result.includes('Success')) {
            console.log('✅ INJECTION SUCCESSFUL!');
        } else {
            console.log('❌ INJECTION FAILED. Response did not contain "Success".');
            if (result.includes('Service Login') || result.includes('Sign in')) {
                console.log('⚠️ ALERT: URL requires Login. Deployment "Who has access" must be set to "Anyone".');
            }
        }
    } catch (e) {
        console.error('❌ Error during injection:', e.message);
    }
}

injectData();
