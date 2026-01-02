const { app, BrowserWindow } = require('electron');
const path = require('path');
const db = require('./db');

// Import modular handlers
const { setupSerialPortHandlers } = require('./electron/serialPort');
const { setupWeighingHandlers } = require('./electron/weighing');
const { setupHistoryHandlers } = require('./electron/history');
const { setupMaintenanceHandlers } = require('./electron/maintenance');
const { setupSettingsHandlers } = require('./electron/settings');
const { setupPrintHandlers } = require('./electron/print');
const { setupReportsHandlers } = require('./electron/reports');
const { setupUpdatesHandlers } = require('./electron/updates');

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
        icon: path.join(__dirname, 'react', 'assets', 'Logo.png'),
        autoHideMenuBar: true
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'dist-react', 'index.html'));
    } else {
        mainWindow.loadURL('http://localhost:5173');
    }

    // Initialize modular handlers
    setupSerialPortHandlers();
    setupWeighingHandlers();
    setupHistoryHandlers();
    setupMaintenanceHandlers();
    setupSettingsHandlers(mainWindow);
    setupPrintHandlers();
    setupReportsHandlers();
    setupUpdatesHandlers();

    // 2. Create Splash Window
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        icon: path.join(__dirname, 'react', 'assets', 'Logo.png'),
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
        // Artificial delay for branding impact (2 seconds)
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            mainWindow.show();
        }, 2000);
    });
}

/**
 * App Lifecycle
 */
app.whenReady().then(() => {
    // Ensure database is initialized before window creation
    db.initDatabase();
    db.migrateDatabase();

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
