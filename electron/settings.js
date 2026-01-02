const { ipcMain } = require('electron');
const db = require('../db');

function setupSettingsHandlers(mainWindow) {
    ipcMain.handle('save-settings', async (event, settings) => {
        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
            const keys = Object.keys(settings);
            const transaction = db.transaction((items) => {
                for (const key of items) {
                    stmt.run(key, settings[key]);
                }
            });
            transaction(keys);
            return { success: true };
        } catch (error) {
            console.error('Save Settings Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-settings', async () => {
        try {
            const rows = db.prepare('SELECT key, value FROM settings').all();
            const settings = {};
            rows.forEach(row => {
                settings[row.key] = row.value;
            });
            return settings;
        } catch (error) {
            console.error('Get Settings Error:', error);
            return {};
        }
    });

    ipcMain.handle('execute-sql', async (event, query) => {
        try {
            const trimmedQuery = query.trim().toUpperCase();
            if (trimmedQuery.startsWith('SELECT')) {
                const rows = db.prepare(query).all();
                return { success: true, type: 'SELECT', data: rows };
            } else {
                const info = db.prepare(query).run();
                return { success: true, type: 'EXEC', data: info };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Template Management
    ipcMain.handle('get-all-templates', async () => {
        try {
            const rows = db.prepare("SELECT id, name, is_active, trx_type, created_at FROM print_templates ORDER BY created_at DESC").all();
            return { success: true, templates: rows };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('save-template', async (event, { id, name, content, trx_type }) => {
        try {
            const type = trx_type || 'Pembelian';
            if (id) {
                db.prepare("UPDATE print_templates SET name = ?, content = ?, trx_type = ? WHERE id = ?").run(name, content, type, id);
            } else {
                const count = db.prepare("SELECT COUNT(*) as count FROM print_templates WHERE trx_type = ?").get(type).count;
                const isActive = count === 0 ? 1 : 0;
                db.prepare("INSERT INTO print_templates (name, content, is_active, trx_type) VALUES (?, ?, ?, ?)").run(name, content, isActive, type);
            }
            if (mainWindow) mainWindow.webContents.send('template-list-updated');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-template-by-id', async (event, id) => {
        try {
            const row = db.prepare("SELECT * FROM print_templates WHERE id = ?").get(id);
            if (row) {
                return { success: true, template: row };
            } else {
                return { success: false, error: 'Template not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('activate-template', async (event, id) => {
        try {
            const transaction = db.transaction(() => {
                const target = db.prepare("SELECT trx_type FROM print_templates WHERE id = ?").get(id);
                if (!target) return;
                db.prepare("UPDATE print_templates SET is_active = 0 WHERE trx_type = ?").run(target.trx_type);
                db.prepare("UPDATE print_templates SET is_active = 1 WHERE id = ?").run(id);
            });
            transaction();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('deactivate-template', async (event, id) => {
        try {
            db.prepare("UPDATE print_templates SET is_active = 0 WHERE id = ?").run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('delete-template', async (event, id) => {
        try {
            db.prepare("DELETE FROM print_templates WHERE id = ?").run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupSettingsHandlers };
