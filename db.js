const Database = require('better-sqlite3');
const path = require('path');
const app = require('electron').app;
const { saiki } = require('./module_node');

// Database Initialization
const dbPath = path.join(app.getPath('userData'), 'gijutsudesktop.db');
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

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmitemdetail (
                ID INTEGER,
                ItemID bigint DEFAULT NULL,
                ItemCode varchar(225) DEFAULT NULL,
                ItemName varchar(500) DEFAULT NULL,
                Qty decimal(20,2) DEFAULT '0.00',
                QtyMin decimal(20,2) DEFAULT '0.00',
                HargaBeli decimal(20,4) DEFAULT '0.0000',
                HargaJual decimal(20,4) DEFAULT '0.0000',
                IsSell int DEFAULT '1',
                IsBuy int DEFAULT '1',
                IsProduction int DEFAULT '1',
                IsShow int DEFAULT '1',
                IsLockPrice int DEFAULT '0',
                Lokasi varchar(10) DEFAULT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                Status int DEFAULT '1'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmitem (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Code varchar(100),
                Nama varchar(500) DEFAULT NULL,
                Kategori bigint DEFAULT NULL,
                NamaKategori varchar(500) DEFAULT NULL,
                Satuan bigint DEFAULT NULL,
                NamaSatuan varchar(500) DEFAULT NULL,
                Qty decimal(20,2) DEFAULT '0.00',
                QtyMin decimal(20,2) DEFAULT '0.00',
                HargaBeli decimal(20,4) DEFAULT '0.0000',
                HargaJual decimal(20,4) DEFAULT '0.0000',
                Merk varchar(1000) DEFAULT NULL,
                Warna varchar(1000) DEFAULT NULL,
                Ukuran varchar(100) DEFAULT NULL,
                Lokasi varchar(100) DEFAULT NULL,
                Keterangan text,
                NamaAkunPembelian varchar(500) DEFAULT NULL,
                AkunPembelian varchar(20) DEFAULT NULL,
                NamaAkunPenjualan varchar(500) DEFAULT NULL,
                AkunPenjualan varchar(20) DEFAULT NULL,
                NamaAkunPersediaan varchar(500) DEFAULT NULL,
                AkunPersediaan varchar(20) DEFAULT NULL,
                Expired varchar(20) DEFAULT NULL,
                Type varchar(20) DEFAULT NULL,
                TimeCreated timestamp NULL DEFAULT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                Status int DEFAULT '1'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmitemunit (
                ID INTEGER,
                ItemID bigint DEFAULT NULL,
                UnitName varchar(225) DEFAULT NULL,
                Qty decimal(20,2) DEFAULT '0.00',
                BPrice decimal(20,4) DEFAULT '0.0000',
                Price decimal(20,4) DEFAULT '0.0000',
                IsDefault int DEFAULT '0',
                Status int DEFAULT '1',
                TimeUpdate varchar(20) DEFAULT NULL,
                Lokasi varchar(10) DEFAULT NULL
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmkategori (
                ID INTEGER,
                Nama varchar(1000) DEFAULT NULL,
                Tampil int NOT NULL DEFAULT '1',
                Img varchar(200) DEFAULT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                Status int DEFAULT '1'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmmarketplace (
                ID INTEGER,
                Jenis VARCHAR(20) DEFAULT NULL,
                Nama varchar(1000) DEFAULT NULL,
                Keterangan text,
                Link text,
                Pajak int NOT NULL DEFAULT '0',
                Amount int NOT NULL DEFAULT '0',
                Code varchar(25) DEFAULT NULL,
                AkunID varbinary(25) DEFAULT NULL,
                NamaAkun varchar(200) DEFAULT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                Status int DEFAULT '1'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmcard (
                ID INTEGER,
                NIP varchar(100) DEFAULT NULL,
                Jenis varchar(20) DEFAULT NULL,
                Nama varchar(1000) DEFAULT NULL,
                Telp varchar(50) DEFAULT NULL,
                Email varchar(100) DEFAULT NULL,
                Alamat text,
                WEB varchar(1000) DEFAULT NULL,
                Provinsi varchar(100) DEFAULT NULL,
                NamaProvinsi varchar(200) DEFAULT NULL,
                Kota varchar(100) DEFAULT NULL,
                NamaKota varchar(200) DEFAULT NULL,
                Kec varchar(100) DEFAULT NULL,
                NamaKec varchar(200) DEFAULT NULL,
                KodePos varchar(100) DEFAULT NULL,
                Pwd varchar(300) DEFAULT NULL,
                TanggalLahir date DEFAULT NULL,
                IsDefault int NOT NULL DEFAULT '0',
                IsMember int NOT NULL DEFAULT '0',
                MemberCode varchar(100) DEFAULT NULL,
                Point int DEFAULT NULL,
                SalesID varchar(50) DEFAULT NULL,
                Longitude varchar(50) DEFAULT NULL,
                Latitude varchar(50) DEFAULT NULL,
                IsCabang varchar(10) DEFAULT NULL,
                Contacts json DEFAULT NULL,
                CreditLimit varchar(50) NOT NULL DEFAULT 'Tidak',
                AmountCreditLimit json DEFAULT NULL,
                AmountLimit decimal(20,4) NOT NULL DEFAULT '0.0000',
                TimeCreated timestamp NOT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                PricelistID int NOT NULL DEFAULT '0',
                NPWP varchar(25) DEFAULT NULL,
                TaxNumber varchar(25) DEFAULT NULL,
                TaxAddress varchar(200) DEFAULT NULL,
                Lokasi bigint NOT NULL DEFAULT '0',
                Status int DEFAULT '1'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmkaryawan (
                ID INTEGER,
                JoinDate varchar(25) DEFAULT NULL,
                KTP varchar(50) DEFAULT NULL,
                PTKP varchar(10) DEFAULT NULL,
                NPWP varchar(25) DEFAULT NULL,
                PPH21 varchar(10) DEFAULT NULL,
                NIK varchar(25) NOT NULL,
                ShiftID bigint NOT NULL DEFAULT '1',
                UserID varchar(1000) DEFAULT NULL,
                Type varchar(10) DEFAULT NULL,
                Nama varchar(1000) DEFAULT NULL,
                Email varchar(225) NOT NULL,
                Telp varchar(20) DEFAULT NULL,
                JenisKelamin varchar(10) DEFAULT NULL,
                Pendidikan varchar(10) DEFAULT NULL,
                Alamat text,
                Password text,
                Img varchar(100) NOT NULL DEFAULT 'assets/img/profile.png',
                PosisiID bigint DEFAULT NULL,
                Posisi varchar(200) DEFAULT NULL,
                JabatanID bigint DEFAULT NULL,
                Jabatan varchar(200) DEFAULT NULL,
                CreditLimit decimal(20,2) NOT NULL DEFAULT '0.00',
                Lokasi bigint NOT NULL DEFAULT '0',
                Status varchar(50) NOT NULL,
                NamaRek varchar(225) DEFAULT NULL,
                NoRek varchar(225) DEFAULT NULL,
                JumlahCuti int NOT NULL DEFAULT '12',
                TimeUpdate varchar(20) DEFAULT NULL,
                IsLiveTrack int NOT NULL DEFAULT '0'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmakun (
                ID INTEGER,
                GroupType varchar(100) DEFAULT NULL,
                CodeSub varchar(30) DEFAULT NULL,
                Code varchar(30) NOT NULL,
                Description varchar(500) DEFAULT NULL,
                Posisi varchar(10) DEFAULT NULL,
                Amount decimal(25,4) NOT NULL DEFAULT '0.0000',
                Notes text,
                CreatedBy bigint DEFAULT NULL,
                TimeCreated varchar(30) DEFAULT NULL,
                UpdatedBy varchar(200) DEFAULT NULL,
                TimeUpdated varchar(30) DEFAULT NULL,
                Status tinyint(1) NOT NULL DEFAULT '1',
                Lokasi bigint DEFAULT NULL,
                IsTemp int NOT NULL DEFAULT '0'
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbssetting (
                ID INTEGER,
                GroupType varchar(100) DEFAULT NULL,
                Posisi varchar(100) DEFAULT NULL,
                Untuk varchar(100) DEFAULT NULL,
                Lakukan varchar(300) DEFAULT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                Notes varchar(200) DEFAULT NULL
            ); 
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmakunpembayaran (
                ID INTEGER,
                Code varchar(20) DEFAULT NULL,
                Nama varchar(500) DEFAULT NULL,
                Amount decimal(20,4) NOT NULL DEFAULT '0.0000',
                Type varchar(20) DEFAULT NULL,
                NoRekening varchar(20) DEFAULT NULL,
                NamaPemilik varchar(1000) DEFAULT NULL,
                Keterangan text,
                TimeCreated timestamp DEFAULT NULL,
                TimeUpdate varchar(20) DEFAULT NULL,
                UserID bigint DEFAULT NULL,
                IsDefault int NOT NULL DEFAULT '0',
                IsPiutang int NOT NULL DEFAULT '0',
                IsGlobal int NOT NULL DEFAULT '0',
                Status int NOT NULL DEFAULT '1',
                Lokasi varchar(10) DEFAULT NULL
            );
            `
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbsrecno (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                DocType varchar(20) DEFAULT NULL,
                YY int DEFAULT NULL,
                MM int DEFAULT NULL,
                DocNo bigint DEFAULT NULL,
                Lokasi varchar(10) DEFAULT NULL
            );`
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbtitemtrans (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                DocType varchar(5) DEFAULT NULL,
                DocNumber varchar(50) DEFAULT NULL,
                ReffDocNumber varchar(50) DEFAULT NULL,
                NoInvoice varchar(100) DEFAULT NULL,
                DocDate date DEFAULT NULL,
                PayNotes varchar(200) DEFAULT NULL,
                PayTop varchar(25) DEFAULT NULL,
                PayType varchar(20) DEFAULT NULL,
                PayCode varchar(100) DEFAULT NULL,
                PayAkun varchar(300) DEFAULT NULL,
                PayAlias varchar(200) DEFAULT NULL,
                PayStatus varchar(20) DEFAULT NULL,
                CardType varchar(20) DEFAULT NULL,
                Notes text,
                AmountOtherNote text,
                CardID varchar(20) DEFAULT NULL,
                CardName varchar(400) DEFAULT NULL,
                SalesID varchar(20) DEFAULT NULL,
                SalesName varchar(400) DEFAULT NULL,
                ForwarderID bigint DEFAULT NULL,
                ForwarderName varchar(100) DEFAULT NULL,
                QtyType varchar(20) DEFAULT NULL,
                Amount decimal(20,4) NOT NULL DEFAULT '0.0000',
                PayDate date DEFAULT NULL,
                PDiscount decimal(10,2) NOT NULL DEFAULT '0.00',
                VDiscount decimal(20,4) NOT NULL DEFAULT '0.0000',
                PVoucher decimal(10,2) NOT NULL DEFAULT '0.00',
                VVoucher decimal(20,4) NOT NULL DEFAULT '0.0000',
                TotalAmount decimal(20,2) NOT NULL DEFAULT '0.00',
                TaxType varchar(20) NOT NULL DEFAULT 'non',
                Ppn int NOT NULL DEFAULT '11',
                Dpp decimal(20,2) NOT NULL DEFAULT '0.00',
                VPpn decimal(20,2) NOT NULL DEFAULT '0.00',
                AmountOther decimal(20,4) NOT NULL DEFAULT '0.0000',
                DownPayment decimal(20,4) NOT NULL DEFAULT '0.0000',
                JumlahUang decimal(20,4) NOT NULL DEFAULT '0.0000',
                Ongkir decimal(20,4) NOT NULL DEFAULT '0.0000',
                GrandTotal decimal(20,4) NOT NULL DEFAULT '0.0000',
                OverPaid decimal(20,4) NOT NULL DEFAULT '0.0000',
                Balance decimal(20,4) NOT NULL DEFAULT '0.0000',
                MarketplaceID varchar(25) DEFAULT NULL,
                MarketplaceName varchar(1000) DEFAULT NULL,
                ExpedisiID varchar(20) DEFAULT NULL,
                ExpedisiName varchar(100) DEFAULT NULL,
                GudangID bigint NOT NULL DEFAULT '0',
                GudangName varchar(100) DEFAULT NULL,
                Details json DEFAULT NULL,
                NoResi varchar(100) DEFAULT NULL,
                TermDate date DEFAULT NULL,
                Processed int NOT NULL DEFAULT '0',
                TransStatus varchar(20) DEFAULT NULL,
                TimeCreated varchar(30) DEFAULT NULL,
                UserID bigint NOT NULL DEFAULT '0',
                UserName varchar(1000) DEFAULT NULL,
                TimeUpdated varchar(30) DEFAULT NULL,
                UpdateBy varchar(300) DEFAULT NULL,
                MejaID int DEFAULT NULL,
                ItemOnDelivery int NOT NULL DEFAULT '0',
                IsTemp int NOT NULL DEFAULT '0',
                IsDelivery int NOT NULL DEFAULT '0',
                IsRefund int NOT NULL DEFAULT '0',
                InKasir int NOT NULL DEFAULT '0',
                ReturType varchar(20) DEFAULT NULL,
                CabangID varchar(100) DEFAULT NULL,
                Lokasi varchar(10) DEFAULT NULL,
                Status int NOT NULL DEFAULT '1'
            );`
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbtitemtransdetail (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                VoucherCode int NOT NULL DEFAULT '0',
                VVoucher decimal(20,4) NOT NULL DEFAULT '0.0000',
                ReffDocNumber varchar(50) DEFAULT NULL,
                DocType varchar(5) DEFAULT NULL,
                VPpn decimal(20,4) NOT NULL DEFAULT '0.0000',
                DocDate date DEFAULT NULL,
                LastStoreDate date DEFAULT NULL,
                ItemID bigint DEFAULT NULL,
                ItemName varchar(500) DEFAULT NULL,
                Qty decimal(20,2) NOT NULL DEFAULT '0.00',
                QtyUnit decimal(20,2) NOT NULL DEFAULT '0.00',
                QtyDesc varchar(100) DEFAULT '0',
                QtyStore decimal(20,2) NOT NULL DEFAULT '0.00',
                UnitID varchar(20) DEFAULT NULL,
                UnitName varchar(200) DEFAULT NULL,
                BPrice decimal(20,4) NOT NULL DEFAULT '0.0000',
                Price decimal(20,4) NOT NULL DEFAULT '0.0000',
                VDiscount decimal(20,4) NOT NULL DEFAULT '0.0000',
                PDiscount decimal(20,4) NOT NULL DEFAULT '0.0000',
                DetailDiscount text,
                PVoucher decimal(20,4) NOT NULL DEFAULT '0.0000',
                Ppn varchar(20) NOT NULL DEFAULT 'non',
                DocNumber varchar(50) DEFAULT NULL,
                PPpn decimal(20,4) NOT NULL DEFAULT '0.0000',
                Dpp decimal(20,2) NOT NULL DEFAULT '0.00',
                Lain decimal(20,4) NOT NULL DEFAULT '0.0000',
                Total decimal(20,4) NOT NULL DEFAULT '0.0000',
                TotalHpp decimal(20,4) NOT NULL DEFAULT '0.0000',
                GudangID bigint DEFAULT NULL,
                GudangIDTransfer bigint DEFAULT NULL,
                IsProses varchar(20) DEFAULT NULL,
                IsRetur int NOT NULL DEFAULT '0',
                Notes text,
                Status int NOT NULL DEFAULT '1'
            );`
    );

    db.exec(
        `CREATE TABLE IF NOT EXISTS dbmgudang (
                ID INTEGER,
                Code varchar(100) NOT NULL,
                Nama varchar(200) DEFAULT NULL,
                Keterangan text,
                CardID int DEFAULT NULL,
                Lokasi bigint NOT NULL DEFAULT '0',
                TimeUpdate varchar(20) DEFAULT NULL,
                Status int DEFAULT NULL
            );`
    );
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

// INI DARI REACT_NATIVE
function dropTable() {
    const tables = [
        "dbmakun", "dbmitem", "dbmitemdetail", "dbmitemunit", "dbmkategori",
        "dbmmarketplace", "dbmcard", "dbmkaryawan", "dbmakunpembayaran",
        "dbssetting", "dbmgudang", "dbtitemtransdetail", "dbtitemtrans", "dbsrecno"
    ];
    try {
        tables.forEach(table => {
            db.exec(`DROP TABLE IF EXISTS ${table};`);
        });
        return true;
    } catch (e) {
        console.error("Drop Table Error:", e);
        throw e;
    }
}

async function handleSyncAll(api, callback = null) {
    const steps = [
        { table: 'dbmakun', dataKey: 'akun' },
        { table: 'dbmitem', dataKey: 'barang' },
        { table: 'dbmitemdetail', dataKey: 'itemdetail' },
        { table: 'dbmitemunit', dataKey: 'unit' },
        { table: 'dbmkategori', dataKey: 'kategori' },
        { table: 'dbmmarketplace', dataKey: 'marketplace' },
        { table: 'dbmcard', dataKey: 'pelanggan' },
        { table: 'dbmkaryawan', dataKey: 'karyawan' },
        { table: 'dbmakunpembayaran', dataKey: 'akunpembayaran' },
        { table: 'dbmgudang', dataKey: 'gudang' },
        { table: 'dbssetting', dataKey: 'setting' }
    ];

    try {
        if (callback) callback({ step: 'Mengambil data dari server...', progress: 0 });
        // Fungsi api harus dilempar dari luar atau didefinisikan agar bisa fetch di Main Process
        let sql = await api("sys/api", { act: "data master all" });

        if (sql.status === "gagal") {
            throw new Error(sql.pesan || "Gagal mengambil data dari server");
        }

        if (callback) callback({ step: 'Memulai Sinkronisasi...', progress: 5 });

        for (let i = 0; i < steps.length; i++) {
            const item = steps[i];
            const progress = Math.round(((i + 1) / steps.length) * 90) + 5;
            if (callback) callback({ step: `Menyimpan data ${item.table}...`, progress });

            let data = [];
            if (item.table === 'dbmcard') {
                data = [...(sql.pelanggan || []), ...(sql.suplier || [])];
            } else {
                data = sql[item.dataKey] || [];
            }

            // Gunakan Transaction better-sqlite3 untuk performa maksimal
            const syncTable = db.transaction((dataChunk) => {
                db.prepare(`DELETE FROM ${item.table}`).run();
                if (dataChunk.length === 0) return;

                const chunkSize = 100;
                for (let j = 0; j < dataChunk.length; j += chunkSize) {
                    const chunk = dataChunk.slice(j, j + chunkSize);
                    let insertHeader = "";
                    let values = [];

                    if (item.table === 'dbmitem') {
                        insertHeader = `INSERT INTO dbmitem ( ID, Code, Nama, Kategori, NamaKategori, Satuan, NamaSatuan, Qty, QtyMin, HargaBeli, HargaJual, Merk, Warna, Ukuran, Lokasi, Keterangan, NamaAkunPembelian, AkunPembelian, NamaAkunPenjualan, AkunPenjualan, NamaAkunPersediaan, AkunPersediaan, Expired, Type, TimeCreated, TimeUpdate, Status) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.Code, dd.Nama, dd.Kategori, dd.NamaKategori, dd.Satuan, dd.NamaSatuan, dd.Qty, dd.QtyMin, dd.HargaBeli, dd.HargaJual, dd.Merk, dd.Warna, dd.Ukuran, dd.Lokasi, dd.Keterangan, dd.NamaAkunPembelian, dd.AkunPembelian, dd.NamaAkunPenjualan, dd.AkunPenjualan, dd.NamaAkunPersediaan, dd.AkunPersediaan, dd.Expired, dd.Type, dd.TimeCreated, dd.TimeUpdate, dd.Status]);
                        stmt.run(params);
                    } else if (item.table === 'dbmitemdetail') {
                        insertHeader = `INSERT INTO dbmitemdetail ( ID, ItemID, ItemCode, ItemName, Qty, QtyMin, HargaBeli, HargaJual, IsSell, IsBuy, IsProduction, IsShow, IsLockPrice, Lokasi, Status, TimeUpdate) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.ItemID, dd.ItemCode, dd.ItemName, dd.Qty, dd.QtyMin, dd.HargaBeli, dd.HargaJual, dd.IsSell, dd.IsBuy, dd.IsProduction, dd.IsShow, dd.IsLockPrice, dd.Lokasi, dd.Status, dd.TimeUpdate]);
                        stmt.run(params);
                    } else if (item.table === 'dbmitemunit') {
                        insertHeader = `INSERT INTO dbmitemunit ( ID, ItemID, UnitName, Qty, BPrice, Price, IsDefault, Status, Lokasi, TimeUpdate) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.ItemID, dd.UnitName, dd.Qty, dd.BPrice, dd.Price, dd.IsDefault, dd.Status, dd.Lokasi, dd.TimeUpdate]);
                        stmt.run(params);
                    } else if (item.table === 'dbmkategori') {
                        insertHeader = `INSERT INTO dbmkategori ( ID, Nama, Tampil, Img, TimeUpdate, Status) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.Nama, dd.Tampil, dd.Img, dd.TimeUpdate, dd.Status]);
                        stmt.run(params);
                    } else if (item.table === 'dbmmarketplace') {
                        insertHeader = `INSERT INTO dbmmarketplace ( ID, Jenis, Nama, Keterangan, Link, Pajak, Amount, Code, AkunID, NamaAkun, TimeUpdate, Status) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.Jenis, dd.Nama, dd.Keterangan, dd.Link, dd.Pajak, dd.Amount, dd.Code, dd.AkunID, dd.NamaAkun, dd.TimeUpdate, dd.Status]);
                        stmt.run(params);
                    } else if (item.table === 'dbmcard') {
                        insertHeader = `INSERT INTO dbmcard ( ID, NIP, Jenis, Nama, Telp, Email, Alamat, WEB, Provinsi, NamaProvinsi, Kota, NamaKota, Kec, NamaKec, KodePos, Pwd, TanggalLahir, IsDefault, IsMember, MemberCode, Point, SalesID, Longitude, Latitude, IsCabang, Contacts, CreditLimit, AmountCreditLimit, AmountLimit, TimeCreated, TimeUpdate, PricelistID, NPWP, TaxNumber, TaxAddress, Lokasi, Status) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.NIP, dd.Jenis, dd.Nama, dd.Telp, dd.Email, dd.Alamat, dd.WEB, dd.Provinsi, dd.NamaProvinsi, dd.Kota, dd.NamaKota, dd.Kec, dd.NamaKec, dd.KodePos, dd.Pwd, dd.TanggalLahir, dd.IsDefault, dd.IsMember, dd.MemberCode, dd.Point, dd.SalesID, dd.Longitude, dd.Latitude, dd.IsCabang, JSON.stringify(dd.Contacts), dd.CreditLimit, JSON.stringify(dd.AmountCreditLimit), dd.AmountLimit, dd.TimeCreated, dd.TimeUpdate, dd.PricelistID, dd.NPWP, dd.TaxNumber, dd.TaxAddress, dd.Lokasi, dd.Status]);
                        stmt.run(params);
                    } else if (item.table === 'dbmkaryawan') {
                        insertHeader = `INSERT INTO dbmkaryawan ( ID, JoinDate, KTP, PTKP, NPWP, PPH21, NIK, ShiftID, UserID, Type, Nama, Email, Telp, JenisKelamin, Pendidikan, Alamat, Password, Img, PosisiID, Posisi, JabatanID, Jabatan, CreditLimit, Lokasi, Status, NamaRek, NoRek, JumlahCuti, IsLiveTrack, TimeUpdate) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.JoinDate, dd.KTP, dd.PTKP, dd.NPWP, dd.PPH21, dd.NIK, dd.ShiftID, dd.UserID, dd.Type, dd.Nama, dd.Email, dd.Telp, dd.JenisKelamin, dd.Pendidikan, dd.Alamat, dd.Password, dd.Img, dd.PosisiID, dd.Posisi, dd.JabatanID, dd.Jabatan, dd.CreditLimit, dd.Lokasi, dd.Status, dd.NamaRek, dd.NoRek, dd.JumlahCuti, dd.IsLiveTrack, dd.TimeUpdate]);
                        stmt.run(params);
                    } else if (item.table === 'dbmakun') {
                        insertHeader = `INSERT INTO dbmakun ( ID, GroupType, CodeSub, Code, Description, Posisi, Amount, Notes, CreatedBy, TimeCreated, UpdatedBy, TimeUpdated, Status, Lokasi, IsTemp) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.GroupType, dd.CodeSub, dd.Code, dd.Description, dd.Posisi, dd.Amount, dd.Notes, dd.CreatedBy, dd.TimeCreated, dd.UpdatedBy, dd.TimeUpdated, dd.Status, dd.Lokasi, dd.IsTemp]);
                        stmt.run(params);
                    } else if (item.table === 'dbmakunpembayaran') {
                        insertHeader = `INSERT INTO dbmakunpembayaran ( ID, Code, Nama, Amount, Type, NoRekening, NamaPemilik, Keterangan, TimeCreated, TimeUpdate, UserID, IsDefault, IsPiutang, IsGlobal, Status, Lokasi) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.Code, dd.Nama, dd.Amount, dd.Type, dd.NoRekening, dd.NamaPemilik, dd.Keterangan, dd.TimeCreated, dd.TimeUpdate, dd.UserID, dd.IsDefault, dd.IsPiutang, dd.IsGlobal, dd.Status, dd.Lokasi]);
                        stmt.run(params);
                    } else if (item.table === 'dbmgudang') {
                        insertHeader = `INSERT INTO dbmgudang (ID, Code, Nama, Keterangan, CardID, Lokasi, Status) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.Code, dd.Nama, dd.Keterangan, dd.CardID, dd.Lokasi, dd.Status]);
                        stmt.run(params);
                    } else if (item.table === 'dbssetting') {
                        insertHeader = `INSERT INTO dbssetting ( ID, GroupType, Posisi, Untuk, Lakukan, Notes) VALUES `;
                        const placeholders = chunk.map(() => "(?,?,?,?,?,?)").join(",");
                        const stmt = db.prepare(insertHeader + placeholders);
                        const params = chunk.flatMap(dd => [dd.ID, dd.GroupType, dd.Posisi, dd.Untuk, dd.Lakukan, dd.Notes]);
                        stmt.run(params);
                    }
                }
            });

            syncTable(data);

            // Beri waktu napas untuk UI progress (optional since we are in main process)
            if (callback) await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (callback) callback({ step: 'Sinkronisasi selesai!', progress: 100 });
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
    } catch (e) {
        console.error("Sync Error:", e);
        if (callback) callback({ step: 'Gagal sinkronisasi data.', progress: 0 });
        throw e;
    }
}

async function handleSync(api, callback = null) {
    const tables = [
        {
            label: 'Akun',
            name: 'dbmakun',
            time: 'TimeUpdated',
            fields: ['ID', 'GroupType', 'CodeSub', 'Code', 'Description', 'Posisi', 'Amount', 'Notes', 'CreatedBy', 'TimeCreated', 'UpdatedBy', 'TimeUpdated', 'Status', 'Lokasi', 'IsTemp']
        },
        // ... (data tables tetap sama)
        {
            label: 'Akun Pembayaran',
            name: 'dbmakunpembayaran',
            time: 'TimeUpdate',
            fields: ['ID', 'Code', 'Nama', 'Amount', 'Type', 'NoRekening', 'NamaPemilik', 'Keterangan', 'TimeCreated', 'UserID', 'IsDefault', 'IsPiutang', 'IsGlobal', 'TimeUpdate', 'Status', 'Lokasi']
        },
        {
            label: 'Kartu',
            name: 'dbmcard',
            time: 'TimeUpdate',
            fields: ['ID', 'NIP', 'Jenis', 'Nama', 'Telp', 'Email', 'Alamat', 'WEB', 'Provinsi', 'NamaProvinsi', 'Kota', 'NamaKota', 'Kec', 'NamaKec', 'KodePos', 'Pwd', 'TanggalLahir', 'IsDefault', 'IsMember', 'MemberCode', 'Point', 'SalesID', 'Longitude', 'Latitude', 'IsCabang', 'Contacts', 'CreditLimit', 'AmountCreditLimit', 'AmountLimit', 'TimeCreated', 'PricelistID', 'NPWP', 'TaxNumber', 'TaxAddress', 'Lokasi', 'Status', 'TimeUpdate']
        },
        {
            label: 'Gudang',
            name: 'dbmgudang',
            time: 'TimeUpdate',
            fields: ['ID', 'Code', 'Nama', 'Keterangan', 'CardID', 'Lokasi', 'Status', 'TimeUpdate']
        },
        {
            label: 'Item',
            name: 'dbmitem',
            time: 'TimeUpdate',
            fields: ['ID', 'Code', 'Nama', 'Kategori', 'NamaKategori', 'Satuan', 'NamaSatuan', 'Qty', 'QtyMin', 'HargaBeli', 'HargaJual', 'Merk', 'Warna', 'Ukuran', 'Lokasi', 'Keterangan', 'NamaAkunPembelian', 'AkunPembelian', 'NamaAkunPenjualan', 'AkunPenjualan', 'NamaAkunPersediaan', 'AkunPersediaan', 'Expired', 'Type', 'TimeCreated', 'TimeUpdate', 'Status']
        },
        {
            label: 'Item Detail',
            name: 'dbmitemdetail',
            time: 'TimeUpdate',
            fields: ['ID', 'ItemID', 'ItemCode', 'ItemName', 'Qty', 'QtyMin', 'HargaBeli', 'HargaJual', 'IsSell', 'IsBuy', 'IsProduction', 'IsShow', 'IsLockPrice', 'Lokasi', 'Status', 'TimeUpdate']
        },
        {
            label: 'Item Unit',
            name: 'dbmitemunit',
            time: 'TimeUpdate',
            fields: ['ID', 'ItemID', 'UnitName', 'Qty', 'BPrice', 'Price', 'IsDefault', 'Status', 'Lokasi', 'TimeUpdate']
        },
        {
            label: 'Karyawan',
            name: 'dbmkaryawan',
            time: 'TimeUpdate',
            fields: ['ID', 'JoinDate', 'KTP', 'PTKP', 'NPWP', 'PPH21', 'NIK', 'ShiftID', 'UserID', 'Type', 'Nama', 'Email', 'Telp', 'JenisKelamin', 'Pendidikan', 'Alamat', 'Password', 'Img', 'PosisiID', 'Posisi', 'JabatanID', 'Jabatan', 'CreditLimit', 'Lokasi', 'Status', 'NamaRek', 'NoRek', 'JumlahCuti', 'IsLiveTrack', 'TimeUpdate']
        },
        {
            label: 'Kategori',
            name: 'dbmkategori',
            time: 'TimeUpdate',
            fields: ['ID', 'Nama', 'Tampil', 'Img', 'Status', 'TimeUpdate']
        },
        {
            label: 'Marketplace',
            name: 'dbmmarketplace',
            time: 'TimeUpdate',
            fields: ['ID', 'Jenis', 'Nama', 'Keterangan', 'Link', 'Pajak', 'Amount', 'Code', 'AkunID', 'NamaAkun', 'TimeUpdate', 'Status']
        }
    ];

    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const progress = Math.round(((i + 1) / tables.length) * 100);
        if (callback) callback({ step: `Menyingkronkan ${table.label}...`, progress });

        let localData = Query(`SELECT ID, ${table.name === 'dbmakun' ? "TimeUpdated" : "TimeUpdate"} AS TimeUpdated FROM ${table.name}`);
        let sql = await api("sys/api", { act: "list last data", TableName: table.name, Data: JSON.stringify(localData), CT: localData.length, time: table.time });

        if (sql.status == "sukses" && sql.data && sql.data.length > 0) {
            const syncItems = db.transaction((data) => {
                if (localData.length == data.length) {
                    for (let dd of data) {
                        let setClause = table.fields.filter(f => f !== 'ID').map(f => `${f} = ?`).join(', ');
                        const params = table.fields.filter(f => f !== 'ID').map(f => dd[f]);
                        params.push(dd.ID);
                        db.prepare(`UPDATE ${table.name} SET ${setClause} WHERE ID = ?`).run(params);
                    }
                } else {
                    db.prepare(`DELETE FROM ${table.name}`).run();
                    const placeholders = `(${table.fields.map(() => "?").join(",")})`;
                    const stmt = db.prepare(`INSERT INTO ${table.name} (${table.fields.join(', ')}) VALUES ${placeholders}`);
                    for (let dd of data) {
                        const params = table.fields.map(f => dd[f]);
                        stmt.run(params);
                    }
                }
            });
            syncItems(sql.data);
        }
    }
    if (callback) callback({ step: 'Sinkronisasi selesai!', progress: 100 });
}

async function openSetting(Untuk) {
    let Data = Query(`SELECT Lakukan FROM dbssetting WHERE Untuk = ?`, [Untuk]);
    return Data[0]?.Lakukan || "";
}

function Query(sql, params = []) {
    try {
        if (process.env.NODE_ENV === 'development') console.log("Executing Query:", sql);
        return db.prepare(sql).all(params);
    } catch (e) {
        console.error("Query Error:", e, "SQL:", sql);
        throw e;
    }
}

async function createDocNumber(DocType) {
    // Note: saiki() must be available or imported
    let now = new Date();
    let MM = (now.getMonth() + 1).toString().padStart(2, '0');
    let YY = now.getFullYear().toString();

    let DOCNUMBER = "";
    let nomer = "";
    let cek = Query(`SELECT count(ID) AS CT FROM dbsrecno WHERE DocType = ? AND MM = ? AND YY = ?`, [DocType, MM, YY]);

    if (!cek || cek.length == 0 || cek[0].CT == 0) {
        ExecQuery(`INSERT INTO dbsrecno (DocType, YY, MM, DocNo, Lokasi) VALUES (?, ?, ?, '0', '0')`, [DocType, YY, MM]);
    }

    ExecQuery(`UPDATE dbsrecno SET DocNo = DocNo + 1 WHERE DocType = ? AND MM = ? AND YY = ? AND Lokasi = '0'`, [DocType, MM, YY]);
    let no = Query(`SELECT * FROM dbsrecno WHERE DocType = ? AND MM = ? AND YY = ? AND Lokasi = '0'`, [DocType, MM, YY]);

    let currentNo = no[0]?.DocNo || 1;
    nomer = String(currentNo).padStart(5, '0');
    DOCNUMBER = `${DocType}0${YY}${MM}${nomer}`;

    return DOCNUMBER;
}

function ExecQuery(sql, params = []) {
    try {
        if (process.env.NODE_ENV === 'development') console.log("Executing ExecQuery:", sql, "Params:", JSON.stringify(params));
        const results = db.prepare(sql).run(params);
        return {
            status: "sukses",
            pesan: "Query berhasil dijalankan.",
            lastInsertId: results.lastInsertRowid,
            rowsAffected: results.changes
        };
    } catch (error) {
        console.error("ExecQuery Error:", error.message);
        throw {
            status: "gagal",
            pesan: `Gagal eksekusi SQL: ${error.message}`,
            sql: sql
        };
    }
}

async function getAllProducts(params = {}) {
    if (typeof params === 'string') {
        params = { q: params };
    }

    let {
        Page = 0,
        CT = 50,
        q = "",
        Sort = "Nama",
        By = "ASC",
        IsSell = "",
        IsBuy = "",
        IsShow = "",
        IsProduction = ""
    } = params;

    let whereClauses = [];
    let queryParams = [];

    if (q) {
        whereClauses.push("(a.Nama LIKE ? OR a.Code LIKE ?)");
        const searchVal = `%${q}%`;
        queryParams.push(searchVal, searchVal);
    }

    if (IsSell !== "") {
        whereClauses.push("b.IsSell = ?");
        queryParams.push(IsSell);
    }
    if (IsBuy !== "") {
        whereClauses.push("b.IsBuy = ?");
        queryParams.push(IsBuy);
    }
    if (IsShow !== "") {
        whereClauses.push("b.IsShow = ?");
        queryParams.push(IsShow);
    }
    if (IsProduction !== "") {
        whereClauses.push("b.IsProduction = ?");
        queryParams.push(IsProduction);
    }

    let whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')} ` : "";

    let baseQuery = `
        FROM dbmitem a
        LEFT JOIN dbmitemdetail b ON a.ID = b.ItemID
    `;

    // Important: Use whitelist for Sort and By to prevent injection
    const allowedSortFields = ['Nama', 'Code', 'ID', 'HargaJual'];
    const finalSort = allowedSortFields.includes(Sort) ? Sort : 'Nama';
    const finalBy = (By.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    let queryData = `
        SELECT DISTINCT a.*, a.HargaJual as Price 
        ${baseQuery}
        ${whereString}
        ORDER BY a.${finalSort} ${finalBy}
        LIMIT ? OFFSET ?;
    `;

    // Add pagination params to the end
    const finalParams = [...queryParams, CT, Page * CT];

    let queryCount = `
        SELECT COUNT(DISTINCT a.ID) as total
        ${baseQuery}
        ${whereString}
    `;

    try {
        return {
            data: db.prepare(queryData).all(finalParams),
            total: db.prepare(queryCount).get(queryParams)?.total || 0
        };
    } catch (e) {
        console.error("getAllProducts Error:", e);
        throw e;
    }
}

async function getAllCard(q = "", Jenis = "pelanggan") {
    let Search = q == "" ? "" : ` AND (Nama LIKE ? OR Telp LIKE ?)`;
    let params = q == "" ? [] : [`%${q}%`, `%${q}%`];
    try {
        const results = Query(`SELECT * FROM dbmcard WHERE Jenis = ? ${Search} `, [Jenis, ...params]);
        return results;
    } catch (e) {
        throw e;
    }
}

/**
 * Fungsi untuk mengecek apakah database lokal sudah memiliki data master.
 * Berguna untuk menentukan apakah aplikasi perlu melakukan sinkronisasi awal atau tidak.
 * @returns {Promise<boolean>} true jika ada data, false jika kosong atau tabel belum ada.
 */
async function checkDatabaseHasData() {
    try {
        const tablesToCheck = ['dbmitem', 'dbmcard', 'dbmakun'];
        for (const table of tablesToCheck) {
            try {
                const res = Query(`SELECT COUNT(*) as total FROM ${table} `);
                if (res && res[0] && res[0].total > 0) {
                    return true;
                }
            } catch (err) {
                continue;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function saveTransaction(data) {
    const { header, details } = data;
    let docNumber = header.DocNumber;

    const transaction = db.transaction(() => {
        // 1. Handle Header
        if (!docNumber) {
            // This is a new transaction, but usually we generate it beforehand or here
        }

        // Check if header exists
        const existing = db.prepare("SELECT DocNumber FROM dbtitemtrans WHERE DocNumber = ?").get(docNumber);

        if (existing) {
            // Update Header
            const fields = Object.keys(header).filter(k => k !== 'ID' && k !== 'DocNumber');
            const setClause = fields.map(k => `${k} = ?`).join(', ');
            const params = fields.map(k => header[k]);
            params.push(docNumber);
            db.prepare(`UPDATE dbtitemtrans SET ${setClause} WHERE DocNumber = ? `).run(params);

            // Delete existing details (we will re-insert them)
            db.prepare("DELETE FROM dbtitemtransdetail WHERE DocNumber = ?").run(docNumber);
        } else {
            // Insert Header
            const fields = Object.keys(header);
            const placeholders = fields.map(() => "?").join(", ");
            const params = fields.map(k => header[k]);
            db.prepare(`INSERT INTO dbtitemtrans(${fields.join(', ')}) VALUES(${placeholders})`).run(params);
        }

        // 2. Handle Details
        if (details && details.length > 0) {
            const detailFields = Object.keys(details[0]);
            const placeholders = detailFields.map(() => "?").join(", ");
            const stmt = db.prepare(`INSERT INTO dbtitemtransdetail(${detailFields.join(', ')}) VALUES(${placeholders})`);

            for (const item of details) {
                // Ensure DocNumber is set for detail
                item.DocNumber = docNumber;
                const params = detailFields.map(k => item[k]);
                stmt.run(params);
            }
        }

        return { success: true, DocNumber: docNumber };
    });

    try {
        return transaction();
    } catch (error) {
        console.error("Save Transaction Error:", error);
        throw error;
    }
}

async function getPendingTransactions() {
    try {
        return db.prepare("SELECT * FROM dbtitemtrans WHERE Processed = 0 ORDER BY TimeCreated DESC").all();
    } catch (error) {
        console.error("Get Pending Transactions Error:", error);
        throw error;
    }
}

async function getTransactionDetails(docNumber) {
    try {
        return db.prepare("SELECT * FROM dbtitemtransdetail WHERE DocNumber = ?").all(docNumber);
    } catch (error) {
        console.error("Get Transaction Details Error:", error);
        throw error;
    }
}

async function getTodaySales() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = db.prepare("SELECT SUM(GrandTotal) as Total FROM dbtitemtrans WHERE DocDate = ? AND Processed = 1").get(today);
        return result?.Total || 0;
    } catch (error) {
        console.error("Get Today Sales Error:", error);
        throw error;
    }
}

async function getCustomers() {
    try {
        return db.prepare("SELECT ID, Nama FROM dbmcard WHERE Jenis = 'pelanggan' ORDER BY Nama ASC").all();
    } catch (error) {
        console.error("Get Customers Error:", error);
        throw error;
    }
}

module.exports = {
    db,
    initDatabase,
    migrateDatabase,
    saveTransaction,
    getPendingTransactions,
    getTransactionDetails,
    getTodaySales,
    getCustomers,
    generateDocNumber,
    dropTable,
    handleSyncAll,
    handleSync,
    Query,
    ExecQuery,
    getAllProducts,
    getAllCard,
    checkDatabaseHasData,
    openSetting,
    createDocNumber,
    prepare: (sql) => db.prepare(sql),
    transaction: (fn) => db.transaction(fn),
    backup: (dest) => db.backup(dest),
    close: () => db.close()
};