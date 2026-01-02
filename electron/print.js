const { ipcMain, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('../db');

function setupPrintHandlers() {
    ipcMain.handle('open-report-designer', async (event, templateId = null) => {
        const designerWindow = new BrowserWindow({
            fullscreen: true,
            title: 'Report Designer',
            icon: path.join(__dirname, '..', 'react', 'assets', 'Logo.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '..', 'preload.js')
            }
        });

        if (templateId) {
            designerWindow.loadFile('designer.html', { query: { "id": templateId.toString() } });
        } else {
            designerWindow.loadFile('designer.html');
        }
    });

    ipcMain.handle('print-surat-jalan', async (event, data) => {
        try {
            const printWindow = new BrowserWindow({
                width: 1000,
                height: 800,
                show: true,
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });

            let templatePath = path.join(__dirname, '..', 'surat_jalan.html');
            let isJsonLayout = false;
            let jsonLayoutData = null;

            try {
                const type = data.trx_type || 'Pembelian';
                let activeTemplate = db.prepare("SELECT content FROM print_templates WHERE is_active = 1 AND trx_type = ?").get(type);
                let templateContent = null;

                if (activeTemplate) {
                    templateContent = activeTemplate.content;
                } else {
                    const legacy = db.prepare("SELECT value FROM settings WHERE key = 'custom_print_template'").get();
                    if (legacy) {
                        templateContent = legacy.value;
                    }
                }

                if (templateContent) {
                    const val = templateContent.trim();
                    if (val.startsWith('{')) {
                        isJsonLayout = true;
                        jsonLayoutData = JSON.parse(val);
                        templatePath = path.join(__dirname, '..', 'print_renderer.html');
                    } else {
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
                const jsCode = `
                    const layout = ${JSON.stringify(jsonLayoutData)};
                    const data = ${JSON.stringify(data)};
                    render(layout, data);
                 `;
                printWindow.webContents.executeJavaScript(jsCode);
            } else {
                const jsCode = `
                    const fmtMoney = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');
                    const setText = (id, text) => {
                        const el = document.getElementById(id);
                        if (el) el.textContent = text;
                    };

                    setText('company-name', "${data.companyName || 'LUSIA'}");
                    setText('company-address', "${data.companyAddress || 'Ponorogo, Jawa Timur'}");
                    setText('company-phone', "${data.companyPhone || '-'}");
                    
                    const now = new Date();
                    setText('print-date', now.toLocaleString('id-ID'));
                    setText('doc-number', "${data.doc_number || '-'}");
                    
                    setText('trx-type', "${data.trx_type || '-'}");
                    setText('notes', "${data.notes || ''}");
                    
                    setText('lbl-party-name', "${data.trx_type == 'Pembelian' ? 'Supplier' : 'Pelanggan'}");
                    setText('party-name', "${data.party_name || '-'}");
                    setText('product-name', "${data.product_name || '-'}");
                    setText('driver-name', "${data.driver_name || '-'}");
                    setText('plate-number', "${data.plate_number || '-'}");

                    let w1 = ${data.weight_1 || 0};
                    let w2 = ${data.weight_2 || 0};
                    let t1 = "${data.timestamp_1 ? new Date(data.timestamp_1).toLocaleString('id-ID') : '-'}";
                    let t2 = "${data.timestamp_2 ? new Date(data.timestamp_2).toLocaleString('id-ID') : '-'}";

                    let bruto = 0, tara = 0, tBruto = '-', tTara = '-';

                    if (w1 >= w2) {
                        bruto = w1; tBruto = t1;
                        tara = w2; tTara = t2;
                    } else {
                        bruto = w2; tBruto = t2;
                        tara = w1; tTara = t1;
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

    ipcMain.handle('get-print-template', async () => {
        try {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'custom_print_template'").get();
            if (row && row.value) {
                return { success: true, template: row.value, isCustom: true };
            } else {
                const defaultPath = path.join(__dirname, '..', 'surat_jalan.html');
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
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('custom_print_template', ?)").run(htmlContent);
            return { success: true };
        } catch (error) {
            console.error('Save Template Error:', error, htmlContent);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('reset-print-template', async () => {
        try {
            db.prepare("DELETE FROM settings WHERE key = 'custom_print_template'").run();
            const defaultPath = path.join(__dirname, '..', 'surat_jalan.html');
            const content = fs.readFileSync(defaultPath, 'utf8');
            return { success: true, template: content };
        } catch (error) {
            console.error('Reset Template Error:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupPrintHandlers };
