const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('../db');

function setupMaintenanceHandlers() {
    ipcMain.handle('reset-database', async () => {
        try {
            db.prepare('DELETE FROM weights').run();
            db.prepare("DELETE FROM sqlite_sequence WHERE name = 'weights'").run();
            return true;
        } catch (error) {
            console.error('DB Reset Error:', error);
            return false;
        }
    });

    ipcMain.handle('backup-database', async () => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: 'Backup Database',
                defaultPath: path.join(app.getPath('downloads'), `Backup_Timbangan_${new Date().toISOString().split('T')[0]}.db`),
                filters: [{ name: 'SQLite Database', extensions: ['db'] }]
            });

            if (!filePath) return { success: false, cancelled: true };

            await db.backup(filePath);
            return { success: true, filePath };
        } catch (error) {
            console.error('Backup Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('restore-database', async () => {
        try {
            const { filePaths, canceled } = await dialog.showOpenDialog({
                title: 'Restore Database',
                filters: [{ name: 'SQLite Database', extensions: ['db'] }],
                properties: ['openFile']
            });

            if (canceled || filePaths.length === 0) return { success: false, cancelled: true };

            const sourcePath = filePaths[0];
            const dbPath = path.join(app.getPath('userData'), 'timbangan.db');

            db.close();
            fs.copyFileSync(sourcePath, dbPath);
            app.relaunch();
            app.exit();

            return { success: true };
        } catch (error) {
            console.error('Restore Error:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupMaintenanceHandlers };
