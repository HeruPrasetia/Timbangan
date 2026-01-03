const startTime = Date.now();
console.log('[STARTUP] Main.js execution started at:', new Date(startTime).toLocaleTimeString());

const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let splashWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        show: false, // Show when ready to prevent white flicker
        icon: path.join(__dirname, 'react', 'assets', 'Logo.png'),
        webPreferences: {
            nodeIntegration: false
        }
    });

    splashWindow.loadFile('splash.html');

    splashWindow.once('ready-to-show', () => {
        splashWindow.show();
    });

    splashWindow.webContents.once('did-finish-load', () => {
        splashWindow.webContents.executeJavaScript(`
            document.getElementById('version-text').textContent = 'v${app.getVersion()}';
        `);
    });

    splashWindow.center();
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1500,
        height: 1000,
        show: false,
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

    mainWindow.once('ready-to-show', () => {
        // Setup handlers only when main window is ready to show
        // Move requires here to prevent blocking initial splash
        const { setupSerialPortHandlers } = require('./electron/serialPort');
        const { setupWeighingHandlers } = require('./electron/weighing');
        const { setupHistoryHandlers } = require('./electron/history');
        const { setupMaintenanceHandlers } = require('./electron/maintenance');
        const { setupSettingsHandlers } = require('./electron/settings');
        const { setupPrintHandlers } = require('./electron/print');
        const { setupReportsHandlers } = require('./electron/reports');
        const { setupUpdatesHandlers } = require('./electron/updates');

        setupSerialPortHandlers();
        setupWeighingHandlers();
        setupHistoryHandlers();
        setupMaintenanceHandlers();
        setupSettingsHandlers(mainWindow);
        setupPrintHandlers();
        setupReportsHandlers();
        setupUpdatesHandlers();

        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        mainWindow.show();
    });
}

/**
 * App Lifecycle
 */
app.whenReady().then(() => {
    console.log('[STARTUP] app.whenReady() triggered after', Date.now() - startTime, 'ms');
    // 1. Show Splash Immediately
    // Everything else is deferred to ensure this happens ASAP
    createSplashWindow();

    // 2. Defer heavy initialization to prevent blocking the UI thread
    setImmediate(() => {
        console.time('DB Initialized');
        // Require DB only when needed to avoid initial load block
        const db = require('./db');
        db.initDatabase();
        db.migrateDatabase();
        console.timeEnd('DB Initialized');

        createMainWindow();
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
