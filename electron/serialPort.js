const { ipcMain } = require('electron');

let currentPort = null;
let SerialPort = null;
let ReadlineParser = null;

function setupSerialPortHandlers() {
    // Lazy load serialport dependencies
    if (!SerialPort) {
        const sp = require('serialport');
        SerialPort = sp.SerialPort;
        ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
    }

    ipcMain.handle('list-ports', async () => {
        return await SerialPort.list();
    });

    ipcMain.handle('get-port-status', async () => {
        return {
            isConnected: currentPort ? currentPort.isOpen : false,
            path: currentPort ? currentPort.path : null,
            baudRate: currentPort ? currentPort.baudRate : null
        };
    });

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

    ipcMain.on('disconnect-port', (event) => {
        if (currentPort && currentPort.isOpen) {
            currentPort.close();
        }
        event.reply('port-disconnected');
    });
}

module.exports = { setupSerialPortHandlers };
