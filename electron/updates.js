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
        if (!updateFilePath) {
            console.error('Update file path not found');
            return;
        }

        if (!app.isPackaged) {
            console.log('Skipping update in dev mode');
            return;
        }

        try {
            console.log('Launching installer:', updateFilePath);
            const { spawn } = require('child_process');

            // Launch the installer and detach it so it survives after the app quits
            const child = spawn(updateFilePath, [], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            // Quit the app immediately so the installer can replace the files
            app.quit();
        } catch (err) {
            console.error('Failed to launch installer:', err);
        }
    });
}

module.exports = { setupUpdatesHandlers };
