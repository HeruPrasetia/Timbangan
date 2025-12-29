const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const ExcelJS = require('exceljs');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const Database = require('better-sqlite3');
const fs = require('fs');
const http = require('http'); // Required for HTTP download
const https = require('https'); // Required for GSheet Sync
const { exec, spawn } = require('child_process'); // Required for running batch script


let mainWindow;
let splashWindow;

function createWindow() {
    // 1. Create Main Window (Hidden)
    mainWindow = new BrowserWindow({
        width: 1500,
        height: 1000,
        show: false, // Don't show immediately
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'Logo.png'),
        autoHideMenuBar: true
    });

    mainWindow.loadFile('index.html');

    // 2. Create Splash Window
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        icon: path.join(__dirname, 'Logo.png'),
        webPreferences: {
            nodeIntegration: false
        }
    });

    splashWindow.loadFile('splash.html');

    splashWindow.webContents.once('did-finish-load', () => {
        splashWindow.webContents.executeJavaScript(`
            document.getElementById('version-text').textContent = 'v${app.getVersion()}';
        `);
    });

    splashWindow.center();

    // 3. Handle Transition
    mainWindow.once('ready-to-show', () => {
        // Optional: Artificial delay for branding impact (e.g., 2 seconds)
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            mainWindow.show();
        }, 2000);
    });
}

// Database Initialization
const dbPath = path.join(app.getPath('userData'), 'timbangan.db');
const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');

// Create table if not exists
db.exec(`
    CREATE TABLE IF NOT EXISTS weights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weight REAL NOT NULL,
        unit TEXT NOT NULL,
        price REAL DEFAULT 0,
        noted_weight REAL DEFAULT 0,
        diff_weight REAL DEFAULT 0,
        plate_number TEXT,
        party_name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
    )
`);

// Migration function to add missing columns to existing database
function migrateDatabase() {
    const columns = db.prepare('PRAGMA table_info(weights)').all();
    const columnNames = columns.map(c => c.name);
    console.log('Current DB Columns:', columnNames);

    const requiredColumns = [
        { name: 'price', type: 'REAL DEFAULT 0' },
        { name: 'noted_weight', type: 'REAL DEFAULT 0' },
        { name: 'diff_weight', type: 'REAL DEFAULT 0' },
        { name: 'plate_number', type: 'TEXT' },
        { name: 'party_name', type: 'TEXT' },
        { name: 'trx_type', type: 'TEXT DEFAULT "Pembelian"' },
        { name: 'weight_1', type: 'REAL DEFAULT 0' },
        { name: 'weight_2', type: 'REAL DEFAULT 0' },
        { name: 'driver_name', type: 'TEXT' },
        { name: 'doc_number', type: 'TEXT' },
        { name: 'timestamp_1', type: 'DATETIME' },
        { name: 'refaksi', type: 'float DEFAULT 0' },
        { name: 'timestamp_2', type: 'DATETIME' },
    ];

    requiredColumns.forEach(col => {
        if (!columnNames.includes(col.name)) {
            console.log(`Migrating: Adding column ${col.name}`);
            try {
                db.prepare(`ALTER TABLE weights ADD COLUMN ${col.name} ${col.type}`).run();
            } catch (err) {
                console.error(`Migration error for ${col.name}:`, err.message);
            }
        }
    });
    // Check for new columns in print_templates
    try {
        const tplColumns = db.prepare("PRAGMA table_info(print_templates)").all();
        const hasTrxType = tplColumns.some(c => c.name === 'trx_type');
        if (!hasTrxType) {
            console.log('Migrating: Adding column trx_type to print_templates');
            db.prepare("ALTER TABLE print_templates ADD COLUMN trx_type TEXT DEFAULT 'Pembelian'").run();
        }
    } catch (e) {
        console.error("Migration error print_templates:", e);
    }
}


db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

// Create table for Print Templates (Drafts)
db.exec(`
        CREATE TABLE IF NOT EXISTS print_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            content TEXT,
            is_active INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

db.exec(`
        CREATE TABLE IF NOT EXISTS dbsrecno (
            id TEXT PRIMARY KEY,
            recno INTEGER,
            YYMM INTEGER
        )
    `);

migrateDatabase();

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('list-ports', async () => {
    return await SerialPort.list();
});

let currentPort = null;

ipcMain.on('connect-port', (event, { path, baudRate }) => {
    if (currentPort && currentPort.isOpen) {
        currentPort.close();
    }

    currentPort = new SerialPort({
        path: path,
        baudRate: parseInt(baudRate),
        autoOpen: false,
        lock: false
    });

    currentPort.open((err) => {
        if (err) {
            console.error('Serial Port Open Error:', err.message);
            event.reply('port-error', err.message);
            return;
        }

        // Some CH340/USB-Serial adapters need DTR/RTS to be set to start communication
        currentPort.set({ dtr: true, rts: true }, (setErr) => {
            if (setErr) console.warn('Failed to set DTR/RTS:', setErr.message);
        });

        console.log('Serial Port Connected:', path);
        event.reply('port-connected');
    });

    const parser = currentPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // Raw data fallback listener
    currentPort.on('data', (data) => {
        event.reply('port-data-raw', data.toString());
    });

    parser.on('data', (data) => {
        console.log('Received Parsed Data:', data);
        event.reply('port-data', data);
    });

    currentPort.on('error', (err) => {
        console.error('Serial Port Runtime Error:', err.message);
        event.reply('port-error', err.message);
    });
});

// Database IPC Handlers
// Helper to generate DocNumber
function generateDocNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYYMM = parseInt(`${year}${month}`);

    // Check dbsrecno
    const row = db.prepare("SELECT * FROM dbsrecno WHERE id = 'TIMBANG'").get();

    let newRecNo = 1;

    if (row) {
        if (row.YYMM === currentYYMM) {
            newRecNo = row.recno + 1;
            db.prepare("UPDATE dbsrecno SET recno = ? WHERE id = 'TIMBANG'").run(newRecNo);
        } else {
            // New Month, reset to 1
            newRecNo = 1;
            db.prepare("UPDATE dbsrecno SET recno = ?, YYMM = ? WHERE id = 'TIMBANG'").run(newRecNo, currentYYMM);
        }
    } else {
        // First time ever
        db.prepare("INSERT INTO dbsrecno (id, recno, YYMM) VALUES ('TIMBANG', ?, ?)").run(newRecNo, currentYYMM);
    }

    const seq = newRecNo.toString().padStart(4, '0');
    return `TIMBANG-${year}${month}${seq}`;
}

// Database IPC Handlers
ipcMain.handle('save-weight', async (event, data) => {
    console.log('--- IPC save-weight received ---', data);
    try {
        const { id, weight, unit, price, noted_weight, plate_number, party_name, notes, trx_type, weight_1, weight_2, diff_weight, driver_name, refaksi } = data;

        if (id) {
            // Update existing record (Second Stage)
            // timestamp_2 is set to NOW
            const stmt = db.prepare(`
                UPDATE weights 
                SET weight = ?, weight_2 = ?, diff_weight = ?, refaksi = ?, timestamp_2 = CURRENT_TIMESTAMP, timestamp = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(weight, weight_2, diff_weight, refaksi || 0, id);

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
            // Use custom generator
            const doc_number = generateDocNumber();

            const stmt = db.prepare(`
                INSERT INTO weights (weight, unit, price, noted_weight, diff_weight, plate_number, party_name, notes, trx_type, weight_1, weight_2, driver_name, doc_number, refaksi, timestamp_1) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);

            const info = stmt.run(weight, unit, price || 0, noted_weight || 0, diff_weight, plate_number || '', party_name || '', notes || '', trx_type || 'Pembelian', weight_1 || 0, weight_2 || 0, driver_name || '', doc_number, refaksi || 0);
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
        // const stmt = db.prepare('SELECT * FROM weights WHERE weight_2 = 0 OR weight_2 IS NULL ORDER BY timestamp DESC');
        return stmt.all();
    } catch (error) {
        console.error('DB Pending Fetch Error:', error);
        return [];
    }
});

ipcMain.handle('get-history', async (event, params) => {
    try {
        const { startDate, endDate, page = 1, pageSize = 10 } = params || {};
        const offset = (page - 1) * pageSize;

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

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
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
        const { startDate, endDate } = params || {};
        let query = 'SELECT COUNT(*) as count FROM weights';
        const conditions = [];
        const args = [];

        if (startDate && endDate) {
            conditions.push('date(timestamp) BETWEEN ? AND ?');
            args.push(startDate, endDate);
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

ipcMain.handle('delete-history', async (event, id) => {
    try {
        db.prepare('DELETE FROM weights WHERE id = ?').run(id);
        return true;
    } catch (error) {
        console.error('DB Delete Error:', error);
        return false;
    }
});

ipcMain.handle('export-to-excel', async (event, params) => {
    try {
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

ipcMain.handle('reset-database', async () => {
    try {
        db.prepare('DELETE FROM weights').run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'weights'").run(); // Single quotes for 'weights'
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

        // Close current connection
        db.close();

        // Overwrite file
        fs.copyFileSync(sourcePath, dbPath);

        // Relaunch app to reload database cleanly
        app.relaunch();
        app.exit();

        return { success: true };
    } catch (error) {
        console.error('Restore Error:', error);
        return { success: false, error: error.message };
    }
});

// Settings Handlers
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

// Template Management Handlers

// Get all templates
ipcMain.handle('get-all-templates', async () => {
    try {
        const rows = db.prepare("SELECT id, name, is_active, trx_type, created_at FROM print_templates ORDER BY created_at DESC").all();
        return { success: true, templates: rows };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Save (Create or Update) Template
ipcMain.handle('save-template', async (event, { id, name, content, trx_type }) => {
    try {
        const type = trx_type || 'Pembelian';
        if (id) {
            // Update
            db.prepare("UPDATE print_templates SET name = ?, content = ?, trx_type = ? WHERE id = ?").run(name, content, type, id);
        } else {
            // Insert
            const count = db.prepare("SELECT COUNT(*) as count FROM print_templates WHERE trx_type = ?").get(type).count;
            const isActive = count === 0 ? 1 : 0;
            db.prepare("INSERT INTO print_templates (name, content, is_active, trx_type) VALUES (?, ?, ?, ?)").run(name, content, isActive, type);
        }
        // Notify main window to refresh list
        if (mainWindow) mainWindow.webContents.send('template-list-updated');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Get Single Template (for editing)
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

// Activate Template
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

// Deactivate Template
ipcMain.handle('deactivate-template', async (event, id) => {
    try {
        db.prepare("UPDATE print_templates SET is_active = 0 WHERE id = ?").run(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Delete Template
ipcMain.handle('delete-template', async (event, id) => {
    try {
        db.prepare("DELETE FROM print_templates WHERE id = ?").run(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});



ipcMain.handle('open-report-designer', async (event, templateId = null) => {
    const designerWindow = new BrowserWindow({
        fullscreen: true,
        title: 'Report Designer',
        icon: path.join(__dirname, 'Logo.png'),
        webPreferences: {
            nodeIntegration: false, // Security: use preload if possible, but for now we might rely on window.electronAPI if attached effectively.
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // Reuse main preload
        }
    });

    // Correct way to pass query params with loadFile
    if (templateId) {
        designerWindow.loadFile('designer.html', { query: { "id": templateId.toString() } });
    } else {
        designerWindow.loadFile('designer.html');
    }

    // designerWindow.webContents.openDevTools(); // Optional for debugging
});

ipcMain.handle('print-surat-jalan', async (event, data) => {
    try {
        const printWindow = new BrowserWindow({
            width: 1000,
            height: 800,
            show: true, // Show window for preview
            autoHideMenuBar: true, // Hide menu bar
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // CHECK FOR ACTIVE CUSTOM TEMPLATE
        let templatePath = path.join(__dirname, 'surat_jalan.html');
        let isJsonLayout = false;
        let jsonLayoutData = null;

        try {
            const type = data.trx_type || 'Pembelian'; // Default assumption

            let activeTemplate = db.prepare("SELECT content FROM print_templates WHERE is_active = 1 AND trx_type = ?").get(type);

            let templateContent = null;

            if (activeTemplate) {
                templateContent = activeTemplate.content;
            } else {
                // Fallback to legacy 'settings' table (for backward compatibility during migration)
                const legacy = db.prepare("SELECT value FROM settings WHERE key = 'custom_print_template'").get();
                if (legacy) {
                    templateContent = legacy.value;
                }
            }

            if (templateContent) {
                const val = templateContent.trim();
                if (val.startsWith('{')) {
                    // It's JSON! Use the Visual Renderer
                    isJsonLayout = true;
                    jsonLayoutData = JSON.parse(val);
                    templatePath = path.join(__dirname, 'print_renderer.html');
                } else {
                    // It's HTML
                    const tempPath = path.join(app.getPath('userData'), 'temp_print_template.html');
                    fs.writeFileSync(tempPath, val, 'utf8');
                    templatePath = tempPath;
                }
            }
        } catch (dbErr) {
            console.error('Error fetching custom template:', dbErr);
        }

        await printWindow.loadFile(templatePath);

        if (isJsonLayout) {
            // Inject JSON Renderer Logic
            const jsCode = `
                const layout = ${JSON.stringify(jsonLayoutData)};
                const data = ${JSON.stringify(data)};
                render(layout, data);
             `;
            printWindow.webContents.executeJavaScript(jsCode);

        } else {
            // Existing HTML Injection Logic
            const jsCode = `
                // Helper to format currency
                const fmtMoney = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');

                // Helper to safely set text content
                const setText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = text;
                };

                setText('company-name', "${data.companyName || 'LUSIA'}");
                setText('company-address', "${data.companyAddress || 'Ponorogo, Jawa Timur'}");
                setText('company-phone', "${data.companyPhone || '-'}");
                
                const now = new Date();
                setText('print-date', now.toLocaleString('id-ID')); // Printed Date
                setText('doc-number', "${data.doc_number || '-'}");
                
                setText('trx-type', "${data.trx_type || '-'}"); // Barang/Jenis
                setText('notes', "${data.notes || ''}");
                
                setText('party-name', "${data.party_name || '-'}");
                setText('driver-name', "${data.driver_name || '-'}");
                setText('plate-number', "${data.plate_number || '-'}");

                // Logic for Bruto / Tara
                let w1 = ${data.weight_1 || 0};
                let w2 = ${data.weight_2 || 0};
                let t1 = "${data.timestamp_1 ? new Date(data.timestamp_1).toLocaleString('id-ID') : '-'}";
                let t2 = "${data.timestamp_2 ? new Date(data.timestamp_2).toLocaleString('id-ID') : '-'}";

                let bruto = 0;
                let tara = 0;
                let tBruto = '-';
                let tTara = '-';

                if (w1 >= w2) {
                    bruto = w1;
                    tBruto = t1;
                    tara = w2;
                    tTara = t2;
                } else {
                    bruto = w2;
                    tBruto = t2;
                    tara = w1;
                    tTara = t1;
                }

                setText('val-noted-weight', "${data.noted_weight || 0}");
                setText('val-bruto', Math.round(bruto));
                setText('time-bruto', tBruto);
                
                setText('val-tara', Math.round(tara));
                setText('time-tara', tTara);

                setText('val-refaksi', ${data.refaksi || 0});
                
                const netto = ${data.weight || 0};
                setText('val-netto', Math.round(netto));
            `;
            printWindow.webContents.executeJavaScript(jsCode);
        }

    } catch (error) {
        console.error('Print Error:', error);
    }
});

// Template Management Handlers
ipcMain.handle('get-print-template', async () => {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'custom_print_template'").get();
        if (row && row.value) {
            return { success: true, template: row.value, isCustom: true };
        } else {
            // Return default file content
            const defaultPath = path.join(__dirname, 'surat_jalan.html');
            const content = fs.readFileSync(defaultPath, 'utf8');
            return { success: true, template: content, isCustom: false };
        }
    } catch (error) {
        console.error('Get Template Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-print-template', async (event, htmlContent) => {
    try {
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('custom_print_template', ?)");
        stmt.run(htmlContent);
        return { success: true };
    } catch (error) {
        console.error('Save Template Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('reset-print-template', async () => {
    try {
        db.prepare("DELETE FROM settings WHERE key = 'custom_print_template'").run();
        const defaultPath = path.join(__dirname, 'surat_jalan.html');
        const content = fs.readFileSync(defaultPath, 'utf8');
        return { success: true, template: content };
    } catch (error) {
        console.error('Reset Template Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-history-by-id', async (event, id) => {
    const row = db.prepare('SELECT * FROM weights WHERE id = ?').get(id);
    return row;
});

// Report Handlers
ipcMain.handle('get-report-stats', async (event, { year, month }) => {
    try {
        // Assume timestamp is standard format "YYYY-MM-DD HH:MM:SS" or ISO
        let query = 'SELECT COUNT(*) as totalTransactions, SUM(weight) as totalWeightNet, SUM(diff_weight) as totalDiff FROM weights';
        const conditions = [];
        const args = [];

        if (year) {
            conditions.push("strftime('%Y', timestamp) = ?");
            args.push(year);
        }
        if (month) {
            conditions.push("strftime('%m', timestamp) = ?");
            args.push(month);
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
            // Daily breakdown for specific month
            groupBy = "strftime('%d', timestamp)";
            selectLabel = "strftime('%d', timestamp) as label";
            conditions.push("strftime('%Y', timestamp) = ?");
            conditions.push("strftime('%m', timestamp) = ?");
            args.push(year, month);
        } else {
            // Monthly breakdown for specific year (or all time if year missing, but frontend handles defaults)
            groupBy = "strftime('%m', timestamp)";
            selectLabel = "strftime('%m', timestamp) as label";
            if (year) {
                conditions.push("strftime('%Y', timestamp) = ?");
                args.push(year);
            }
        }

        let query = `SELECT ${selectLabel}, SUM(weight) as totalWeight FROM weights`;

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` GROUP BY ${groupBy} ORDER BY label ASC`;

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
            args.push(year);
        }
        if (month) {
            conditions.push("strftime('%m', timestamp) = ?");
            args.push(month);
        }

        if (type) {
            conditions.push("trx_type = ?");
            args.push(type);
        }

        let query = `SELECT party_name, COUNT(*) as count, SUM(weight) as totalWeight FROM weights`;

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` GROUP BY party_name ORDER BY totalWeight DESC LIMIT 10`;

        const rows = db.prepare(query).all(...args);
        return rows;
    } catch (error) {
        console.error('Report Party Stats Error:', error);
        return [];
    }
});

// Update Handlers
let updateFilePath = null;

ipcMain.handle('download-update', async (event) => {
    return new Promise((resolve, reject) => {
        const url = 'http://iot.naylatools.com/timbangan.exe';
        const tempPath = path.join(app.getPath('temp'), 'timbangan_update.exe');
        const file = fs.createWriteStream(tempPath);

        const request = http.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject('Download failed. Status code: ' + response.statusCode);
            }

            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;

            response.on('data', (chunk) => {
                downloaded += chunk.length;
                if (totalLength) {
                    const percent = (downloaded / totalLength) * 100;
                    event.sender.send('update-progress', percent);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                updateFilePath = tempPath;
                event.sender.send('update-downloaded', tempPath);
                resolve({ success: true, path: tempPath });
            });
        });

        request.on('error', (err) => {
            fs.unlink(tempPath, () => { }); // Delete temp file
            reject(err.message);
        });

        file.on('error', (err) => {
            fs.unlink(tempPath, () => { }); // Delete temp file
            reject(err.message);
        });
    });
});

ipcMain.handle('quit-and-install', () => {
    if (!updateFilePath) return;

    if (!app.isPackaged) {
        console.log('Skipping update in dev mode');
        return; // Don't run this in dev mode
    }

    const appPath = process.execPath;
    const appDir = path.dirname(appPath);
    const batPath = path.join(appDir, 'update.bat');

    // Create a batch script to swap the files
    // Use taskkill to ensure the process is dead, then replace
    const batContent = `
@echo off
taskkill /F /PID ${process.pid}
timeout /t 2 /nobreak > NUL
del /F /Q "${appPath}"
move /Y "${updateFilePath}" "${appPath}"
start "" "${appPath}"
del "%~f0"
    `;

    fs.writeFileSync(batPath, batContent);

    // Run the batch file detached
    const child = spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore'
    });
    child.unref();

    // The batch script starts separately, so it's fine.
    app.quit();
});

// Google Sheets Sync Function (Bridge via Google Apps Script)
// Handles redirects (302) which are common with Google Apps Script
async function syncToGoogleSheets(data, targetUrl = null) {
    const SCRIPT_URL = targetUrl || 'https://script.google.com/macros/s/AKfycbylbPAEigx5b3Xh8L5GxuQD52cggRe1dio63Km_1ktqzYOGchN0cXpWc_AnvRsXvHs/exec';

    return new Promise((resolve, reject) => {
        try {
            const rowValues = [
                data.id,
                data.timestamp,
                data.doc_number,
                data.party_name,
                data.plate_number,
                data.driver_name || '-',
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

            req.write(JSON.stringify({ values: rowValues }));
            req.end();

        } catch (error) {
            console.error('❌ Google Sheets Bridge Logic Error:', error.message);
            resolve(false);
        }
    });
}

ipcMain.on('disconnect-port', () => {
    if (currentPort && currentPort.isOpen) {
        currentPort.close();
    }
});
