const { ipcMain } = require('electron');
const db = require('../db');
const { host, decrypt } = require('../module_node'); // I might need a node version of module.js or just define it here

// Simple node-side API fetcher for synchronization
async function nodeApi(url, data = {}, token = "") {
    try {
        const formData = new URLSearchParams();
        if (token) formData.append("token", token);

        for (let key in data) {
            formData.append(key, data[key]);
        }

        const response = await fetch(host + url, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        const text = await response.text();
        const decrypted = decrypt(text, 3);

        try {
            return JSON.parse(decrypted);
        } catch (e) {
            return { status: "gagal", pesan: "Invalid JSON from server" };
        }
    } catch (e) {
        console.error("Node API Error:", e);
        return { status: "gagal", pesan: e.message };
    }
}

function setupDbHandlers(mainWindow) {
    ipcMain.handle('init-database', async () => {
        try {
            db.initDatabase();
            db.migrateDatabase();
            return { success: true };
        } catch (error) {
            console.error('Init DB Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('handle-sync-all', async (event, token) => {
        try {
            await db.handleSyncAll(
                // API function
                (url, data) => nodeApi(url, data, token),
                // Progress callback
                (progressData) => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('sync-progress', progressData);
                    }
                }
            );
            return { success: true };
        } catch (error) {
            console.error('Sync All Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-all-products', async (event, params) => {
        try {
            return await db.getAllProducts(params);
        } catch (error) {
            console.error('Get All Products Error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-item-units', async (event, itemId) => {
        try {
            return db.Query("SELECT * FROM dbmitemunit WHERE ItemID = ? AND Status = 1", [itemId]);
        } catch (error) {
            console.error('Get Item Units Error:', error);
            throw error;
        }
    });

    // Transaction Handlers
    ipcMain.handle('create-doc-number', async (event, docType) => {
        try {
            return await db.createDocNumber(docType);
        } catch (error) {
            console.error('Create Doc Number Error:', error);
            throw error;
        }
    });

    ipcMain.handle('save-transaction', async (event, data) => {
        try {
            return await db.saveTransaction(data);
        } catch (error) {
            console.error('Save Transaction Error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-pending-transactions', async () => {
        try {
            return await db.getPendingTransactions();
        } catch (error) {
            console.error('Get Pending Transactions Error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-transaction-details', async (event, docNumber) => {
        try {
            return await db.getTransactionDetails(docNumber);
        } catch (error) {
            console.error('Get Transaction Details Error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-today-sales', async () => {
        try {
            return await db.getTodaySales();
        } catch (error) {
            console.error('Get Today Sales Error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-customers', async () => {
        try {
            return await db.getCustomers();
        } catch (error) {
            console.error('Get Customers Error:', error);
            throw error;
        }
    });
}

module.exports = { setupDbHandlers };
