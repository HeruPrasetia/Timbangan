const https = require('https');
const db = require('../db');

/**
 * Google Sheets Sync Function (Bridge via Google Apps Script)
 * Handles redirects (302) which are common with Google Apps Script
 */
async function syncToGoogleSheets(data, targetUrl = null) {
    let SCRIPT_URL = targetUrl;

    if (!SCRIPT_URL) {
        try {
            const setting = db.prepare("SELECT value FROM settings WHERE key = 'google_script_url'").get();
            if (setting && setting.value && setting.value.trim() !== "") {
                SCRIPT_URL = setting.value.trim();
            } else {
                console.log('Skipping Google Sheets Sync (No URL configured)');
                return Promise.resolve(true);
            }
        } catch (dbErr) {
            console.error('Error fetching Google Script URL:', dbErr);
            return Promise.resolve(false);
        }
    }

    return new Promise((resolve, reject) => {
        try {
            const rowValues = [
                data.id,
                data.timestamp,
                data.doc_number,
                data.party_name,
                data.plate_number,
                data.product_name,
                data.trx_type,
                data.weight_1,
                data.timestamp_1,
                data.weight_2,
                data.timestamp_2,
                data.weight, // Netto
                data.refaksi || 0,
                data.price,
                Math.round(data.weight * data.price) // Total
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

            const req = https.request(options, (res) => {
                // Handle Redirects (very important for Google Apps Script)
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const newLocation = res.headers.location;
                    console.log('🔄 Following redirect to:', newLocation);
                    syncToGoogleSheets(data, newLocation)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        console.log('✅ Data synced to Google Sheets via Bridge successfully:', body);
                        resolve(true);
                    } else {
                        console.error('❌ Bridge Sync failed. Status:', res.statusCode, body);
                        resolve(false);
                    }
                });
            });

            req.on('error', (e) => {
                console.error('❌ Bridge Sync Request Error:', e.message);
                resolve(false);
            });

            const payload = {
                values: rowValues,
                sheetName: data.trx_type || 'Pembelian'
            };
            console.log('[DEBUG] Syncing to GSheets:', JSON.stringify(payload, null, 2));
            req.write(JSON.stringify(payload));
            req.end();

        } catch (error) {
            console.error('❌ Google Sheets Bridge Logic Error:', error.message);
            resolve(false);
        }
    });
}

async function syncToGS(data) {

}

module.exports = { syncToGoogleSheets };
