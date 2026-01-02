const { ipcMain } = require('electron');
const db = require('../db');

function setupReportsHandlers() {
    ipcMain.handle('get-report-stats', async (event, { year, month }) => {
        try {
            let query = 'SELECT COUNT(*) as totalTransactions, SUM(weight) as totalWeightNet, SUM(diff_weight) as totalDiff FROM weights';
            const conditions = [];
            const args = [];

            if (year) {
                conditions.push("strftime('%Y', timestamp) = ?");
                args.push(String(year));
            }
            if (month) {
                conditions.push("strftime('%m', timestamp) = ?");
                args.push(String(month));
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const stats = db.prepare(query).get(...args);
            return stats;
        } catch (error) {
            console.error('Report Stats Error:', error);
            return { totalTransactions: 0, totalWeightNet: 0, totalDiff: 0 };
        }
    });

    ipcMain.handle('get-report-chart-data', async (event, { year, month }) => {
        try {
            let groupBy;
            let selectLabel;
            const conditions = [];
            const args = [];

            if (year && month) {
                groupBy = "strftime('%d', timestamp)";
                selectLabel = "strftime('%d', timestamp) as label";
                conditions.push("strftime('%Y', timestamp) = ?");
                conditions.push("strftime('%m', timestamp) = ?");
                args.push(String(year), String(month));
            } else if (year) {
                groupBy = "strftime('%m', timestamp)";
                selectLabel = "strftime('%m', timestamp) as label";
                conditions.push("strftime('%Y', timestamp) = ?");
                args.push(String(year));
            } else {
                groupBy = "strftime('%Y', timestamp)";
                selectLabel = "strftime('%Y', timestamp) as label";
            }

            let query = `SELECT ${selectLabel}, trx_type, SUM(weight) as totalWeight FROM weights`;
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ` GROUP BY ${groupBy}, trx_type ORDER BY label ASC`;

            const rows = db.prepare(query).all(...args);
            return rows;
        } catch (error) {
            console.error('Report Chart Error:', error);
            return [];
        }
    });

    ipcMain.handle('get-report-party-stats', async (event, { year, month, type }) => {
        try {
            const conditions = [];
            const args = [];

            if (year) {
                conditions.push("strftime('%Y', timestamp) = ?");
                args.push(String(year));
            }
            if (month) {
                conditions.push("strftime('%m', timestamp) = ?");
                args.push(String(month));
            }
            if (type) {
                conditions.push("trx_type = ?");
                args.push(type);
            }

            let query = `
                SELECT 
                    party_name, 
                    COUNT(*) as totalTransactions, 
                    SUM(weight) as totalWeightNet, 
                    SUM(diff_weight) as totalDiff 
                FROM weights
            `;

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' GROUP BY party_name ORDER BY totalWeightNet DESC LIMIT 10';

            const rows = db.prepare(query).all(...args);
            return rows;
        } catch (error) {
            console.error('Report Party Stats Error:', error);
            return [];
        }
    });
}

module.exports = { setupReportsHandlers };
