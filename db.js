const Database = require('better-sqlite3');
const path = require('path');
const app = require('electron').app;

// Database Initialization
const dbPath = path.join(app.getPath('userData'), 'timbangan.db');
const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');

function initDatabase() {
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
        timestamp DATETIME DEFAULT (DATETIME('now', 'localtime')),
        notes TEXT,
        trx_type TEXT DEFAULT 'Pembelian',
        doc_number TEXT,
        timestamp_1 DATETIME,
        timestamp_2 DATETIME,
        refaksi REAL DEFAULT 0,
        weight_1 REAL DEFAULT 0,
        weight_2 REAL DEFAULT 0,
        driver_name TEXT,
        product_name TEXT
    )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS print_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            content TEXT,
            is_active INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (DATETIME('now', 'localtime'))
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS dbsrecno (
            id TEXT PRIMARY KEY,
            recno INTEGER,
            YYMM INTEGER
        )
    `);
}

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
        { name: 'product_name', type: 'TEXT' },
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

function generateDocNumber(DocType) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYYMM = parseInt(`${year}${month}`);

    // Check dbsrecno
    const row = db.prepare(`SELECT * FROM dbsrecno WHERE id = '${DocType}'`).get();

    let newRecNo = 1;

    if (row) {
        if (row.YYMM === currentYYMM) {
            newRecNo = row.recno + 1;
            db.prepare(`UPDATE dbsrecno SET recno = ? WHERE id = '${DocType}'`).run(newRecNo);
        } else {
            // New Month, reset to 1
            newRecNo = 1;
            db.prepare(`UPDATE dbsrecno SET recno = ?, YYMM = ? WHERE id = '${DocType}'`).run(newRecNo, currentYYMM);
        }
    } else {
        // First time ever
        db.prepare(`INSERT INTO dbsrecno (id, recno, YYMM) VALUES ('${DocType}', ?, ?)`).run(newRecNo, currentYYMM);
    }

    const seq = newRecNo.toString().padStart(4, '0');
    return `${DocType}-${year}${month}${seq}`;
}

module.exports = {
    db,
    initDatabase,
    migrateDatabase,
    generateDocNumber,
    // Helper to match how it's used in main.js
    prepare: (sql) => db.prepare(sql),
    transaction: (fn) => db.transaction(fn),
    backup: (dest) => db.backup(dest),
    close: () => db.close(),
    // To support db.db.generateDocNumber if needed (though it's better to fix it in main.js)
    get dbInstance() { return db; }
};