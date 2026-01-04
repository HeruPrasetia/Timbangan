const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const db = require('../db');

function setupHistoryHandlers() {
    ipcMain.handle('get-history', async (event, params) => {
        try {
            const { startDate, endDate, search, page = 1, pageSize = 10 } = params || {};
            const offset = (page - 1) * pageSize;

            let query = 'SELECT * FROM weights';
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('date(timestamp) BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (search) {
                conditions.push('(party_name LIKE ? OR plate_number LIKE ? OR doc_number LIKE ?)');
                args.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
            args.push(pageSize, offset);

            const stmt = db.prepare(query);
            return stmt.all(...args);
        } catch (error) {
            console.error('DB Fetch Error:', error);
            return [];
        }
    });

    ipcMain.handle('get-history-count', async (event, params) => {
        try {
            const { startDate, endDate, search } = params || {};
            let query = 'SELECT COUNT(*) as count FROM weights';
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('date(timestamp) BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (search) {
                conditions.push('(party_name LIKE ? OR plate_number LIKE ? OR doc_number LIKE ?)');
                args.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const stmt = db.prepare(query);
            return stmt.get(...args).count;
        } catch (error) {
            console.error('DB Count Error:', error);
            return 0;
        }
    });

    ipcMain.handle('get-history-summary', async (event, params) => {
        try {
            const { startDate, endDate, search } = params || {};
            let query = `
                SELECT 
                    SUM(weight) as totalWeight, 
                    SUM(diff_weight) as totalDiff, 
                    SUM(weight_1) as totalW1,
                    SUM(weight_2) as totalW2,
                    SUM(noted_weight) as totalNotedWeight,
                    COUNT(*) as count 
                FROM weights
            `;
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('date(timestamp) BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (search) {
                conditions.push('(party_name LIKE ? OR plate_number LIKE ? OR doc_number LIKE ?)');
                args.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const stmt = db.prepare(query);
            return stmt.get(...args);
        } catch (error) {
            console.error('DB Summary Error:', error);
            return { totalWeight: 0, totalDiff: 0, totalW1: 0, totalW2: 0, totalNotedWeight: 0, count: 0 };
        }
    });

    ipcMain.handle('delete-history', async (event, id) => {
        try {
            db.prepare('DELETE FROM weights WHERE id = ?').run(id);
            return true;
        } catch (error) {
            console.error('DB Delete Error:', error);
            return false;
        }
    });

    ipcMain.handle('get-history-by-id', async (event, id) => {
        const row = db.prepare('SELECT * FROM weights WHERE id = ?').get(id);
        return row;
    });

    ipcMain.handle('update-history', async (event, data) => {
        try {
            const { id, weight, unit, price, noted_weight, plate_number, party_name, product_name, trx_type, weight_1, weight_2, diff_weight, driver_name, refaksi, notes } = data;

            const stmt = db.prepare(`
                UPDATE weights SET
                    price = @price,
                    noted_weight = @noted_weight,
                    plate_number = @plate_number,
                    party_name = @party_name,
                    product_name = @product_name,
                    trx_type = @trx_type,
                    driver_name = @driver_name,
                    refaksi = @refaksi,
                    notes = @notes,
                    weight = @weight,
                    diff_weight = @diff_weight
                WHERE id = @id
            `);

            stmt.run({
                id, price, noted_weight, plate_number, party_name,
                product_name, trx_type, driver_name, refaksi, notes,
                weight, diff_weight
            });

            return { success: true };
        } catch (error) {
            console.error('DB Update Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('export-to-excel', async (event, params) => {
        try {
            // Lazy load ExcelJS to speed up app startup
            const ExcelJS = require('exceljs');

            const { startDate, endDate } = params || {};
            let query = 'SELECT * FROM weights';
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('date(timestamp) BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY timestamp DESC';

            const data = db.prepare(query).all(...args);

            const { filePath } = await dialog.showSaveDialog({
                title: 'Export Riwayat Timbangan',
                defaultPath: path.join(app.getPath('downloads'), `Riwayat_Timbangan_${new Date().toISOString().split('T')[0]}.xlsx`),
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });

            if (!filePath) return { success: false, cancelled: true };

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Riwayat Timbangan');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Waktu', key: 'timestamp', width: 25 },
                { header: 'Supplier/Pelanggan', key: 'party_name', width: 25 },
                { header: 'Jenis Barang', key: 'product_name', width: 20 },
                { header: 'No Plat', key: 'plate_number', width: 15 },
                { header: 'Jenis', key: 'trx_type', width: 15 },
                { header: 'Timbang 1 (kg)', key: 'weight_1', width: 15 },
                { header: 'Timbang 2 (kg)', key: 'weight_2', width: 15 },
                { header: 'Berat Bersih (kg)', key: 'weight', width: 15 },
                { header: 'Berat Nota (kg)', key: 'noted_weight', width: 15 },
                { header: 'Selisih (kg)', key: 'diff_weight', width: 15 },
                { header: 'Harga /kg', key: 'price', width: 15 }
            ];

            data.forEach(item => {
                worksheet.addRow({
                    id: item.id,
                    timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
                    party_name: item.party_name || '-',
                    product_name: item.product_name || '-',
                    plate_number: item.plate_number || '-',
                    trx_type: item.trx_type || 'Pembelian',
                    weight_1: item.weight_1 || 0,
                    weight_2: item.weight_2 || 0,
                    weight: item.weight,
                    noted_weight: item.noted_weight || 0,
                    diff_weight: item.diff_weight || 0,
                    price: item.price || 0
                });
            });

            // Styling
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            await workbook.xlsx.writeFile(filePath);
            return { success: true, filePath };
        } catch (error) {
            console.error('Excel Export Error:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupHistoryHandlers };
