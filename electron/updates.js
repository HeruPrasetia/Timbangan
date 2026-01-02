const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

let updateFilePath = null;

function setupUpdatesHandlers() {
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('download-update', async (event) => {
        return new Promise((resolve, reject) => {
            const url = 'http://iot.naylatools.com/timbangan.exe';
            const tempPath = path.join(app.getPath('temp'), 'timbangan_update.exe');
            const file = fs.createWriteStream(tempPath);

            console.log('Starting download:', url);

            http.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(`Failed to download: ${response.statusCode}`);
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;

                response.pipe(file);

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
                    event.sender.send('update-progress', progress);
                });

                file.on('finish', () => {
                    file.close();
                    console.log('Download complete:', tempPath);
                    updateFilePath = tempPath;
                    event.sender.send('update-downloaded', tempPath);
                    resolve(true);
                });
            }).on('error', (err) => {
                fs.unlink(tempPath, () => { });
                reject(err.message);
            });

            file.on('error', (err) => {
                fs.unlink(tempPath, () => { });
                reject(err.message);
            });
        });
    });

    ipcMain.handle('quit-and-install', () => {
        if (!updateFilePath) return;

        if (!app.isPackaged) {
            console.log('Skipping update in dev mode');
            return;
        }

        // Use PORTABLE_EXECUTABLE_FILE if running as portable, otherwise use default exe path
        const targetPath = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
        const batPath = path.join(app.getPath('temp'), 'update_timbangan.bat');
        const mainPid = process.pid;

        const batContent = `@echo off
setlocal enabledelayedexpansion

echo Waiting for application to exit...
:wait_for_exit
tasklist /FI "PID eq ${mainPid}" 2>NUL | find /I "${mainPid}">NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 1 /nobreak > NUL
    goto wait_for_exit
)

:: a bit more delay to ensure all file locks are released
timeout /t 2 /nobreak > NUL

echo Replacing executable...
:retry_move
move /Y "${updateFilePath}" "${targetPath}"
if errorlevel 1 (
    echo Retrying...
    timeout /t 2 /nobreak > NUL
    goto retry_move
)

echo Starting new version...
start "" "${targetPath}"

:: Self-delete this script
del "%~f0" & exit
`;

        try {
            fs.writeFileSync(batPath, batContent, 'utf8');
            const child = spawn('cmd.exe', ['/c', batPath], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            });
            child.unref();
            app.quit();
        } catch (err) {
            console.error('Failed to create update script:', err);
        }
    });
}

module.exports = { setupUpdatesHandlers };
