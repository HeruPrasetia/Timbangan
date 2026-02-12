const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const db = require('../db');

function setupHistoryHandlers() {
    ipcMain.handle('get-history', async (event, params) => {
        try {
            const { startDate, endDate, search, page = 1, pageSize = 10 } = params || {};
            const offset = (page - 1) * pageSize;

            let query = 'SELECT * FROM dbtitemtrans WHERE Processed = 1';
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('DocDate BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (search) {
                conditions.push('(CardName LIKE ? OR DocNumber LIKE ? OR Notes LIKE ?)');
                args.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            query += ' ORDER BY ID DESC LIMIT ? OFFSET ?';
            args.push(pageSize, offset);

            const stmt = db.prepare(query);
            return stmt.all(...args);
        } catch (error) {
            console.error('DB Fetch History Error:', error);
            return [];
        }
    });

    ipcMain.handle('get-history-count', async (event, params) => {
        try {
            const { startDate, endDate, search } = params || {};
            let query = 'SELECT COUNT(*) as count FROM dbtitemtrans WHERE Processed = 1';
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('DocDate BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (search) {
                conditions.push('(CardName LIKE ? OR DocNumber LIKE ? OR Notes LIKE ?)');
                args.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
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
                    SUM(GrandTotal) as totalAmount, 
                    COUNT(*) as count 
                FROM dbtitemtrans
                WHERE Processed = 1
            `;
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('DocDate BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (search) {
                conditions.push('(CardName LIKE ? OR DocNumber LIKE ? OR Notes LIKE ?)');
                args.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            const stmt = db.prepare(query);
            return stmt.get(...args);
        } catch (error) {
            console.error('DB Summary Error:', error);
            return { totalAmount: 0, count: 0 };
        }
    });

    ipcMain.handle('delete-history', async (event, id) => {
        try {
            // Get DocNumber first to delete details
            const row = db.prepare('SELECT DocNumber FROM dbtitemtrans WHERE ID = ?').get(id);
            if (row) {
                db.prepare('DELETE FROM dbtitemtransdetail WHERE DocNumber = ?').run(row.DocNumber);
                db.prepare('DELETE FROM dbtitemtrans WHERE ID = ?').run(id);
            }
            return true;
        } catch (error) {
            console.error('DB Delete Error:', error);
            return false;
        }
    });

    ipcMain.handle('get-history-by-id', async (event, id) => {
        const row = db.prepare('SELECT * FROM dbtitemtrans WHERE ID = ?').get(id);
        if (row) {
            row.details = db.prepare('SELECT * FROM dbtitemtransdetail WHERE DocNumber = ?').all(row.DocNumber);
        }
        return row;
    });

    ipcMain.handle('update-history', async (event, data) => {
        // Typically we don't allow updating finished transactions easily in Kasir, 
        // but for now let's just keep it simple or return success
        return { success: true };
    });

    ipcMain.handle('export-to-excel', async (event, params) => {
        try {
            const ExcelJS = require('exceljs');
            const { startDate, endDate } = params || {};
            let query = 'SELECT * FROM dbtitemtrans WHERE Processed = 1';
            const conditions = [];
            const args = [];

            if (startDate && endDate) {
                conditions.push('DocDate BETWEEN ? AND ?');
                args.push(startDate, endDate);
            }

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            query += ' ORDER BY ID DESC';

            const data = db.prepare(query).all(...args);

            const { filePath } = await dialog.showSaveDialog({
                title: 'Export Riwayat Penjualan',
                defaultPath: path.join(app.getPath('downloads'), `Riwayat_Penjualan_${new Date().toISOString().split('T')[0]}.xlsx`),
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });

            if (!filePath) return { success: false, cancelled: true };

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Penjualan');

            worksheet.columns = [
                { header: 'No Dokument', key: 'DocNumber', width: 20 },
                { header: 'Tanggal', key: 'DocDate', width: 15 },
                { header: 'Pelanggan', key: 'CardName', width: 25 },
                { header: 'Pembayaran', key: 'PayType', width: 15 },
                { header: 'Total', key: 'GrandTotal', width: 15 },
                { header: 'Catatan', key: 'Notes', width: 30 }
            ];

            data.forEach(item => {
                worksheet.addRow({
                    DocNumber: item.DocNumber,
                    DocDate: item.DocDate,
                    CardName: item.CardName || 'Umum',
                    PayType: item.PayType,
                    GrandTotal: item.GrandTotal,
                    Notes: item.Notes || '-'
                });
            });

            worksheet.getRow(1).font = { bold: true };
            await workbook.xlsx.writeFile(filePath);
            return { success: true, filePath };
        } catch (error) {
            console.error('Excel Export Error:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupHistoryHandlers };
