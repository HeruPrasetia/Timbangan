
import { apiGo } from "./utils/tokenUtils";

export async function createDatabase() {
    return new Promise((resolve, reject) => {
        // Naikkan versi ke 2 kalau lo mau nambahin INDEX baru biar diterapkan oleh browser
        const request = indexedDB.open("NAY-DB", 1);

        request.onupgradeneeded = (event) => {
            console.log("onupgradeneeded called");
            const db = event.target.result;
            const storeNames = ["MasterItem", "MasterItemUnit", "MasterPelanggan", "MasterSuplier", "MasterAkun", "MasterAkunPembayaran", "Setting", "Menu", "Group", "Transaksi", "DetailTransaksi", "Printing"];

            storeNames.forEach(storeName => {
                let objectStore;
                if (!db.objectStoreNames.contains(storeName)) {
                    console.log(`Creating store: ${storeName}`);
                    if (storeName === "Transaksi" || storeName === "DetailTransaksi") {
                        objectStore = db.createObjectStore(storeName, { keyPath: "ID", autoIncrement: true });
                    } else {
                        objectStore = db.createObjectStore(storeName, { keyPath: "ID" });
                    }
                } else {
                    objectStore = event.target.transaction.objectStore(storeName);
                }

                // OPTIMASI: Tambah Index biar nyari Barcode / Kode / Nama secepat kilat
                if (storeName === "MasterItem") {
                    if (!objectStore.indexNames.contains("Code")) objectStore.createIndex("Code", "Code", { unique: false });
                    if (!objectStore.indexNames.contains("Nama")) objectStore.createIndex("Nama", "Nama", { unique: false });
                }
                if (storeName === "MasterPelanggan") {
                    if (!objectStore.indexNames.contains("Nama")) objectStore.createIndex("Nama", "Nama", { unique: false });
                }
                if (storeName === "Transaksi") {
                    if (!objectStore.indexNames.contains("DocNumber")) {
                        objectStore.createIndex("DocNumber", "DocNumber", { unique: false });
                    }
                }
                if (storeName === "DetailTransaksi") {
                    if (!objectStore.indexNames.contains("DocNumber")) {
                        objectStore.createIndex("DocNumber", "DocNumber", { unique: false });
                    }
                }
            });
        };

        request.onsuccess = (event) => {
            console.log("Database berhasil dibuat/diupdate");
            event.target.result.close();
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Failed to open/create database: ${event.target.errorCode}`);
            reject(`Failed to open/create database: ${event.target.errorCode}`);
        };
    });
}

export function dropDatabase() {
    indexedDB.deleteDatabase("NAY-DB");
}

export async function insertDatabase(storeName, data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB");

        request.onsuccess = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(storeName)) {
                db.close();
                reject(`Tabel ${storeName} tidak terdaftar di database! Jalankan createDatabase dulu.`);
                return;
            }

            // Membuka SATU transaksi readwrite untuk SEMUA data (Bulk Mode)
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            let lastInsertId = null;

            // Menonaktifkan auto-commit sementara dengan memanfaatkan satu perulangan loop langsung
            for (let i = 0; i < data.length; i++) {
                try {
                    const putRequest = objectStore.put(data[i]);
                    if (i === data.length - 1) {
                        putRequest.onsuccess = (e) => {
                            lastInsertId = e.target.result;
                        };
                    }
                } catch (error) {
                    console.error("Gagal menambahkan data di index ke-" + i, error);
                }
            }

            transaction.oncomplete = () => {
                db.close(); // Selalu close DB setelah beres biar ga memory leak
                resolve(lastInsertId);
            };

            transaction.onerror = (event) => {
                db.close();
                reject(`Transaksi bulk gagal untuk ${storeName}: ${event.target.error}`);
            };
        };

        request.onerror = (event) => {
            reject(`Gagal membuka database untuk insert: ${event.target.errorCode}`);
        };
    });
}

export async function listTables() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const tables = Array.from(db.objectStoreNames);
            resolve(tables);
        };

        request.onerror = (event) => {
            reject(`Gagal membuka/membuat database: ${event.target.errorCode}`);
        };
    });
}

export async function countDatabase(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(storeName)) {
                resolve(0);
                return;
            }

            const transaction = db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);
            const countRequest = objectStore.count();

            countRequest.onsuccess = () => {
                resolve(countRequest.result);
            };

            countRequest.onerror = () => {
                reject(`Gagal menghitung jumlah data di ${storeName}`);
            };
        };

        request.onerror = (event) => {
            reject(`Gagal membuka/membuat database: ${event.target.errorCode}`);
        };
    });
}

export async function searchDatabase(storeName, searchParams, limit = 0, page = 1, orderBy = {}) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                resolve([]);
                return;
            }
            const transaction = db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);
            const result = [];

            // Amankan startIndex, kalau limit 0 set ke 0
            const startIndex = limit > 0 ? (page - 1) * limit : 0;

            objectStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = cursor.value;
                    let match = true;

                    for (const [key, value] of Object.entries(searchParams)) {
                        const itemValue = item[key];
                        const searchValue = value ? value.toString().toLowerCase() : "";
                        if (searchValue !== "") {
                            if (typeof itemValue === 'string') {
                                if (!itemValue.toLowerCase().includes(searchValue)) {
                                    match = false;
                                    break;
                                }
                            } else if (Array.isArray(itemValue)) {
                                if (!itemValue.map(v => v.toString().toLowerCase()).includes(searchValue)) {
                                    match = false;
                                    break;
                                }
                            } else {
                                if (itemValue != value) {
                                    match = false;
                                    break;
                                }
                            }
                        }
                    }

                    if (match) {
                        result.push(item);
                    }

                    cursor.continue();
                } else {
                    // Sorting result berdasarkan parameter orderBy
                    const orderKeys = Object.keys(orderBy);
                    if (orderKeys.length > 0) {
                        result.sort((a, b) => {
                            for (const key of orderKeys) {
                                const direction = orderBy[key].toUpperCase() === 'DESC' ? -1 : 1;
                                if (a[key] > b[key]) return direction;
                                if (a[key] < b[key]) return -direction;
                            }
                            return 0;
                        });
                    }

                    // FIX DI SINI: Jika limit > 0 lakukan slice pagination, jika 0 tampilkan semua (result)
                    const paginatedResults = limit > 0
                        ? result.slice(startIndex, startIndex + limit)
                        : result;

                    resolve(paginatedResults);
                }
            };

            transaction.onerror = () => {
                reject(`Transaksi gagal untuk ${storeName}.`);
            };
        };

        request.onerror = (event) => {
            reject(`Gagal membuka/membuat database: ${event.target.errorCode}`);
        };
    });
}

export async function updateDatabase(storeName, conditions, newData) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                reject(`Tabel ${storeName} tidak ditemukan`);
                return;
            }

            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const cursorRequest = objectStore.openCursor();

            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                let updated = false;

                if (cursor) {
                    const item = cursor.value;
                    let match = true;

                    for (const [field, value] of Object.entries(conditions)) {
                        if (item[field] !== value) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        Object.assign(item, newData);
                        const updateRequest = objectStore.put(item);

                        updateRequest.onsuccess = () => {
                            updated = true;
                        };

                        updateRequest.onerror = () => {
                            console.error(`Gagal memperbarui data dengan key ${cursor.primaryKey} di tabel ${storeName}`);
                            reject(`Gagal memperbarui data dengan key ${cursor.primaryKey} di tabel ${storeName}`);
                            return;
                        };
                    }
                    cursor.continue();
                } else {
                    if (updated) {
                        resolve(`Data berhasil diperbarui di tabel ${storeName}`);
                    } else {
                        resolve("Data tidak ditemukan");
                    }
                }
            };

            cursorRequest.onerror = (event) => {
                console.error(`Gagal mencari data di tabel ${storeName}: ${event.target.errorCode}`);
                reject(`Gagal mencari data di tabel ${storeName}: ${event.target.errorCode}`);
            };
        };

        request.onerror = (event) => {
            console.error(`Gagal membuka/membuat database: ${event.target.errorCode}`);
            reject(`Gagal membuka/membuat database: ${event.target.errorCode}`);
        };
    });
}

export async function deleteDatabase(storeName, conditions) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                reject(`Tabel ${storeName} tidak ditemukan`);
                return;
            }

            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const cursorRequest = objectStore.openCursor();

            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = cursor.value;
                    let match = true;

                    for (const [field, value] of Object.entries(conditions)) {
                        if (item[field] !== value) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        objectStore.delete(cursor.primaryKey).onsuccess = () => {
                            console.log(`Data dengan key ${cursor.primaryKey} berhasil dihapus dari tabel ${storeName}`);
                        };
                    }

                    cursor.continue();
                } else {
                    resolve();
                }
            };

            cursorRequest.onerror = (event) => {
                console.error(`Gagal mencari data di tabel ${storeName}: ${event.target.errorCode}`);
                reject(`Gagal mencari data di tabel ${storeName}: ${event.target.errorCode}`);
            };
        };

        request.onerror = (event) => {
            console.error(`Gagal membuka/membuat database: ${event.target.errorCode}`);
            reject(`Gagal membuka/membuat database: ${event.target.errorCode}`);
        };
    });
}

export async function truncateDatabase(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("NAY-DB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const clearRequest = objectStore.clear();

            clearRequest.onsuccess = () => {
                console.log(`Tabel ${storeName} berhasil di-truncate.`);
                resolve();
            };

            clearRequest.onerror = (event) => {
                console.error(`Gagal truncate tabel ${storeName}: ${event.target.errorCode}`);
                reject(`Gagal truncate tabel ${storeName}: ${event.target.errorCode}`);
            };
        };

        request.onerror = (event) => {
            console.error(`Gagal membuka database: ${event.target.errorCode}`);
            reject(`Gagal membuka database: ${event.target.errorCode}`);
        };
    });
}

export async function CreateDocNumber(DocType) {
    let CT = await searchDatabase("Transaksi", { DocType });
    let DocNo = "000" + CT.length;
    if (CT.length > 10) {
        DocNo = "00" + CT.length;
    } else if (CT.length > 100) {
        DocNo = "0" + CT.length;
    } else if (CT.length > 1000) {
        DocNo = CT.length;
    }
    return DocType + "-" + DocNo;
}

export async function getSyncPayload(storeName) {
    return new Promise((resolve) => {
        const request = indexedDB.open("NAY-DB");
        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.close();
                resolve("");
                return;
            }
            const transaction = db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);

            // Tarik semua data langsung dalam satu operasi memori internal browser (jauh lebih cepat dibanding cursor loop)
            const getAllRequest = objectStore.getAll();

            getAllRequest.onsuccess = () => {
                const allItems = getAllRequest.result;
                const items = allItems.map(val => {
                    const timeUpdated = val.TimeUpdated || "2000-01-01 00:00:00";
                    return `(${val.ID}, '${timeUpdated}')`;
                });
                db.close();
                resolve(items.length > 0 ? items.join(", ") : "");
            };

            getAllRequest.onerror = () => {
                db.close();
                resolve("");
            };
        };
        request.onerror = () => {
            resolve("");
        };
    });
}

export async function syncDatabase(Master = "all") {
    try {
        const payload = { TargetMaster: Master };
        const syncTables = [
            "MasterItem", "MasterItemUnit", "MasterAkun",
            "MasterAkunPembayaran", "MasterPelanggan", "MasterSuplier",
            "Menu", "Group", "Printing"
        ];

        for (const table of syncTables) {
            if (Master === "all" || Master === table) {
                payload[table] = await getSyncPayload(table);
            }
        }

        const res = await apiGo("SyncMaster", payload);
        console.log(res);

        if (res && res.status === "sukses") {
            for (const table of syncTables) {
                if (res[table] && res[table].length > 0) {
                    await insertDatabase(table, res[table]);
                }
            }
            if (res.Setting && res.Setting.length > 0 && (Master === "all" || Master === "Setting")) {
                await insertDatabase("Setting", res.Setting);
            }
            console.log("Sinkronisasi master data selesai.");
        } else {
            console.error("Gagal sinkronisasi dari server:", res?.pesan);
        }
    } catch (error) {
        console.error("Gagal melakukan sinkronisasi master data:", error);
    }
}