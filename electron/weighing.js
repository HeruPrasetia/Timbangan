const { ipcMain } = require('electron');
const db = require('../db');
const { syncToGoogleSheets } = require('./sync');

function setupWeighingHandlers() {
    ipcMain.handle('save-weight', async (event, data) => {
        console.log('--- IPC save-weight received ---', data);
        try {
            const { id, weight, unit, price, noted_weight, plate_number, party_name, notes, trx_type, weight_1, weight_2, diff_weight, driver_name, refaksi, product_name } = data;
            console.log(`[DEBUG] Received Weight Save: ID=${id}, Type=${trx_type}`);

            // Ensure all named parameters strictly exist
            const safeData = {
                id: id || null,
                weight: weight || 0,
                unit: unit || 'kg',
                price: price || 0,
                noted_weight: noted_weight || 0,
                diff_weight: diff_weight || 0,
                plate_number: plate_number || '',
                party_name: party_name || '',
                product_name: product_name || '',
                trx_type: trx_type || 'Pembelian',
                weight_1: weight_1 || 0,
                weight_2: weight_2 || 0,
                driver_name: driver_name || '',
                refaksi: refaksi || 0,
                notes: notes || '',
                doc_number: db.generateDocNumber(trx_type == 'Pembelian' ? 'PURCH' : 'SALES')
            };

            if (id) {
                // Update existing record (Second Stage)
                const stmt = db.prepare(`
                    UPDATE weights SET
                        weight = @weight,
                        weight_2 = @weight_2,
                        diff_weight = @diff_weight,
                        refaksi = @refaksi,
                        timestamp_2 = DATETIME('now', 'localtime'),
                        timestamp = DATETIME('now', 'localtime'),
                        product_name = @product_name
                    WHERE id = @id
                `);
                stmt.run(safeData);

                // Trigger Google Sheets Sync (Second Stage)
                try {
                    const updatedRecord = db.prepare('SELECT * FROM weights WHERE id = ?').get(id);
                    console.log('Triggering mandatory sync for record:', id);
                    syncToGoogleSheets(updatedRecord).catch(err => console.error('Delayed Sync Error:', err));
                } catch (syncErr) {
                    console.error('Sync Preparation Error:', syncErr);
                }

                return { success: true, id: id };
            } else {
                // Create new record (First Stage)
                const stmt = db.prepare(`
                    INSERT INTO weights (
                        weight, unit, price, noted_weight, diff_weight,
                        plate_number, party_name, product_name, trx_type,
                        weight_1, weight_2, driver_name, doc_number, refaksi, timestamp_1, notes
                    ) VALUES (
                        @weight, @unit, @price, @noted_weight, @diff_weight,
                        @plate_number, @party_name, @product_name, @trx_type,
                        @weight_1, @weight_2, @driver_name, @doc_number, @refaksi, DATETIME('now', 'localtime'), @notes
                    )
                `);
                const info = stmt.run(safeData);
                return { success: true, id: info.lastInsertRowid };
            }
        } catch (error) {
            console.error('DB Save Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-pending-weights', async () => {
        try {
            const stmt = db.prepare('SELECT * FROM weights WHERE timestamp_2 IS NULL ORDER BY timestamp DESC');
            return stmt.all();
        } catch (error) {
            console.error('DB Pending Fetch Error:', error);
            return [];
        }
    });
}

module.exports = { setupWeighingHandlers };
