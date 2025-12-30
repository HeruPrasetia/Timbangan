const portSelect = document.getElementById('port-select');
const baudRateSelect = document.getElementById('baud-rate');
const connectBtn = document.getElementById('connect-btn');
const weightValue = document.getElementById('weight-value');
const rawDataBox = document.getElementById('raw-data');
const appStatusText = document.getElementById('app-status');
const statusDot = document.getElementById('app-status-dot');
const refreshBtn = document.getElementById('refresh-ports');
const saveBtn = document.getElementById('save-weight-btn');
const historyBody = document.getElementById('history-body');
// const weightDividerSelect = document.getElementById('weight-divider'); // Moved to settings

// Modal Elements
const saveModal = document.getElementById('save-modal');
const modalWeightDisplay = document.getElementById('modal-weight-display');
const confirmSaveBtn = document.getElementById('confirm-save-btn');
const cancelSaveBtn = document.getElementById('cancel-save-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// Inputs
const partyNameInput = document.getElementById('party-name');
const driverNameInput = document.getElementById('driver-name');
const plateNumberInput = document.getElementById('plate-number');
const notedWeightInput = document.getElementById('noted-weight');
const unitPriceInput = document.getElementById('unit-price');
const trxTypeInput = document.getElementById('trx-type');
const refaksiInput = document.getElementById('input-refaksi');
const refaksiGroup = document.getElementById('refaksi-group');
const resetDbBtn = document.getElementById('reset-db-btn');

// Password Modal Elements
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('reset-password-input');
const submitResetBtn = document.getElementById('submit-reset-btn');
const cancelPassBtn = document.getElementById('cancel-pass-btn');
const closePassModalBtn = document.getElementById('close-pass-modal-btn');

// History Filtering & Pagination Elements
const filterStartDate = document.getElementById('filter-start-date');
const filterEndDate = document.getElementById('filter-end-date');
const applyFilterBtn = document.getElementById('apply-filter-btn');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const exportExcelBtn = document.getElementById('export-excel-btn');

// Two-Stage Elements
const stage1Btn = document.getElementById('stage-1-btn');
const stage2Btn = document.getElementById('stage-2-btn');
const pendingSelectionArea = document.getElementById('pending-selection-area');
const pendingWeightSelect = document.getElementById('pending-weight-select');
const firstWeightPreview = document.getElementById('first-weight-preview');
const netWeightPreview = document.getElementById('net-weight-preview');
const modalFirstWeightDisplay = document.getElementById('modal-first-weight-display');
const modalNetWeightDisplay = document.getElementById('modal-net-weight-display');
const weightPreviewGrid = document.querySelector('.modal-weight-preview-grid');

let isConnected = false;
let currentStage = 1;
let selectedPendingRecord = null;
let currentHistoryPage = 1;
const historyPageSize = 10;
let weightDivider = 1;

// const weightDividerSelect = document.getElementById('weight-divider'); // Removed

// ...

// Load settings from localStorage - DEPRECATED for Divider, but kept structure if needed or just remove.
// Actually, let's remove the localStorage logic for divider entirely to avoid conflict.
function loadSettings() {
    // Legacy support or other local settings if any. Currently none.
    // weightDivider defaults to 1 defined above.
}

// Event listener removed as element is gone.

// Tab Switching Logic
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');

        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        // Switch View
        document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');

        // Load history if switched to history view
        if (tabId === 'history-view') {
            loadHistory();
        } else if (tabId === 'reports-view') {
            // Load reports if function exists (will be defined later)
            if (typeof loadReportData === 'function') {
                loadReportData();
            }
        }
    });
});

async function refreshPorts() {
    const ports = await window.electronAPI.listPorts();
    const currentSelection = portSelect.value;

    portSelect.innerHTML = '<option value="" disabled selected>Pilih Port...</option>';

    ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port.path;
        option.textContent = `${port.path} (${port.friendlyName || 'Unknown Device'})`;
        portSelect.appendChild(option);
    });

    if (currentSelection) {
        portSelect.value = currentSelection;
    }
}

refreshBtn.addEventListener('click', refreshPorts);

connectBtn.addEventListener('click', () => {
    if (isConnected) {
        window.electronAPI.disconnectPort();
        updateConnectionStatus(false);
    } else {
        const port = portSelect.value;
        const baudRate = baudRateSelect.value;

        if (!port) {
            alert('Silakan pilih port terlebih dahulu!');
            return;
        }

        window.electronAPI.connectPort({ path: port, baudRate: parseInt(baudRate) });
    }
});

window.electronAPI.onPortConnected(() => {
    updateConnectionStatus(true);
});

window.electronAPI.onPortError((error) => {
    alert(`Error: ${error}`);
    updateConnectionStatus(false);
});

let lastParsedTime = 0;

window.electronAPI.onPortData((parsedData) => {
    lastParsedTime = Date.now();
    console.log('Parsed data received:', parsedData);
    updateDisplay(parsedData);
});

window.electronAPI.onPortDataRaw((data) => {
    if (Date.now() - lastParsedTime > 2000) {
        updateDisplay(data);
    }
});

function updateDisplay(data) {
    if (!data) return;

    const sanitized = data.replace(/[^\x20-\x7E]/g, '').trim();
    if (sanitized) {
        rawDataBox.textContent = sanitized;
    }

    try {
        if (sanitized.length < 8) return;

        let isNegative = sanitized.startsWith('-');

        let coreValue = sanitized.substring(1, 7);

        let nilai = parseInt(coreValue);

        if (isNaN(nilai)) return;

        weightValue.textContent = (isNegative ? "-" : "") + nilai;
    } catch (e) {
        console.error('Error parsing weight:', e);
    }
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    if (connected) {
        connectBtn.textContent = 'Putuskan';
        connectBtn.classList.add('disconnect');
        appStatusText.textContent = 'Connected';
        statusDot.classList.add('connected');
    } else {
        connectBtn.textContent = 'Hubungkan';
        connectBtn.classList.remove('disconnect');
        appStatusText.textContent = 'Disconnected';
        statusDot.classList.remove('connected');
    }
}

// Database Interactions & Modal
saveBtn.addEventListener('click', () => {
    const weight = parseFloat(weightValue.textContent);

    // Reset Modal Inputs
    partyNameInput.value = '';
    plateNumberInput.value = '';
    driverNameInput.value = ''; // Reset Driver
    notedWeightInput.value = '';
    unitPriceInput.value = '';
    trxTypeInput.value = 'Pembelian';

    // Reset Stage
    setStage(1);

    // Open Modal
    modalWeightDisplay.textContent = Math.round(weight);
    saveModal.classList.add('active');
});

function setStage(stage) {
    currentStage = stage;
    if (stage === 1) {
        stage1Btn.classList.add('active');
        stage2Btn.classList.remove('active');
        pendingSelectionArea.style.display = 'none';
        firstWeightPreview.style.display = 'none';
        netWeightPreview.style.display = 'none';
        weightPreviewGrid.classList.remove('triple');

        // Unlock inputs
        partyNameInput.disabled = false;
        driverNameInput.disabled = false;
        plateNumberInput.disabled = false;
        trxTypeInput.disabled = false;
        refaksiGroup.style.display = 'none';
    } else {
        stage2Btn.classList.add('active');
        stage1Btn.classList.remove('active');
        pendingSelectionArea.style.display = 'block';
        loadPendingWeights();

        // Locked inputs (filled from pending record)
        partyNameInput.disabled = true;
        driverNameInput.disabled = true;
        plateNumberInput.disabled = true;
        trxTypeInput.disabled = true;
        refaksiGroup.style.display = 'block';
    }
}

async function loadPendingWeights() {
    const pending = await window.electronAPI.getPendingWeights();
    pendingWeightSelect.innerHTML = '<option value="">-- Pilih Rekaman --</option>';
    pending.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        const date = new Date(item.timestamp).toLocaleTimeString();
        option.textContent = `${item.doc_number} - 🚚 ${item.plate_number} - ${item.party_name} (${Math.round(item.weight_1)} kg) ⏰ [${date}]`;
        option.pendingData = item;
        pendingWeightSelect.appendChild(option);
    });
}

pendingWeightSelect.addEventListener('change', () => {
    const option = pendingWeightSelect.options[pendingWeightSelect.selectedIndex];
    if (option.value) {
        const data = option.pendingData;
        selectedPendingRecord = data;

        // Fill form
        partyNameInput.value = data.party_name;
        driverNameInput.value = data.driver_name || ''; // Fill Driver
        plateNumberInput.value = data.plate_number;
        trxTypeInput.value = data.trx_type;
        unitPriceInput.value = data.price;
        notedWeightInput.value = data.noted_weight;

        // Show previews
        firstWeightPreview.style.display = 'block';
        netWeightPreview.style.display = 'block';
        weightPreviewGrid.classList.add('triple');

        modalFirstWeightDisplay.textContent = Math.round(data.weight_1);
        calculateNetWeight();
    } else {
        selectedPendingRecord = null;
    }
});

function calculateNetWeight() {
    if (!selectedPendingRecord) return;
    const currentWeight = parseFloat(weightValue.textContent);
    const weight1 = selectedPendingRecord.weight_1;
    let net = 0;

    if (trxTypeInput.value === 'Pembelian') {
        net = weight1 - currentWeight;
    } else {
        net = currentWeight - weight1;
    }

    modalNetWeightDisplay.textContent = Math.abs(Math.round(net));
}

stage1Btn.addEventListener('click', () => setStage(1));
stage2Btn.addEventListener('click', () => setStage(2));

function closeModal() {
    saveModal.classList.remove('active');
}

closeModalBtn.addEventListener('click', closeModal);
cancelSaveBtn.addEventListener('click', closeModal);

confirmSaveBtn.addEventListener('click', async () => {
    const weight = parseFloat(weightValue.textContent);
    const data = {
        unit: 'kg',
        party_name: partyNameInput.value,
        driver_name: driverNameInput.value,
        plate_number: plateNumberInput.value,
        noted_weight: parseFloat(notedWeightInput.value) || 0,
        price: parseFloat(unitPriceInput.value) || 0,
        trx_type: trxTypeInput.value,
        refaksi: refaksiInput.value,
        notes: ''
    };

    if (currentStage === 1) {
        data.weight_1 = weight;
        data.weight = weight; // Initial weight
        data.diff_weight = weight - data.noted_weight;
    } else {
        if (!selectedPendingRecord) {
            alert('Pilih rekaman timbang pertama!');
            return;
        }
        data.id = selectedPendingRecord.id;
        data.weight_2 = weight;

        // Final Weight Calculation
        const weight1 = selectedPendingRecord.weight_1;

        let grossWeight = 0;
        if (data.trx_type === 'Pembelian') {
            grossWeight = Math.abs(weight1 - weight);
        } else {
            grossWeight = Math.abs(weight - weight1);
        }

        // Calculate Refaksi
        const refaksiPercent = parseFloat(data.refaksi) || 0;
        const deduction = Math.round(grossWeight * (refaksiPercent / 100));

        data.weight = grossWeight - deduction;
        data.diff_weight = data.weight - data.noted_weight; // Re-calculate difference with final weight

        console.log(data.weight, data.noted_weight);
        // Difference: Net - Nota
        data.diff_weight = data.weight - data.noted_weight;
    }

    const result = await window.electronAPI.saveWeight(data);

    if (result.success) {
        closeModal();
        loadHistory();

        // Auto Print Surat Jalan
        const settings = await window.electronAPI.getSettings();
        const history = await window.electronAPI.getHistoryById(result.id);
        const printData = {
            ...history,
            timestamp: new Date().toLocaleString('id-ID'),
            companyName: settings.company_name,
            companyAddress: settings.company_address,
            companyPhone: settings.company_phone
        };

        window.electronAPI.printSuratJalan(printData);

    } else {
        alert('Gagal menyimpan: ' + result.error);
    }
});

async function loadHistory() {
    const params = {
        startDate: filterStartDate.value,
        endDate: filterEndDate.value,
        page: currentHistoryPage,
        pageSize: historyPageSize
    };

    const history = await window.electronAPI.getHistory(params);
    const totalCount = await window.electronAPI.getHistoryCount(params);
    const totalPages = Math.ceil(totalCount / historyPageSize) || 1;

    historyBody.innerHTML = '';

    history.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('id-ID');
        const diff = item.diff_weight || 0;
        const diffClass = diff > 0 ? 'diff-positive' : (diff < 0 ? 'diff-negative' : 'diff-zero');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-size: 0.8rem; font-weight: bold; color: var(--text-primary)">${item.doc_number || '-'}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary)">${date}</div>
            </td>
            <td>
                <div class="history-detail">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="history-party">${item.party_name || '-'}</span>
                        <span class="trx-badge ${item.trx_type === 'Penjualan' ? 'penjualan' : 'pembelian'}">${item.trx_type || 'Pembelian'}</span>
                    </div>
                    <span class="history-plate">${item.plate_number || 'No Plate'}</span>
                    <span class="history-price">Rp ${item.price?.toLocaleString()} /kg</span>
                </div>
            </td>
            <td>
                <div style="font-size: 1rem; font-weight: 800; color: var(--accent-color)">${Math.round(item.weight)}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary)">
                    Nota: ${Math.round(item.noted_weight || 0)} | W1: ${Math.round(item.weight_1 || 0)} | W2: ${Math.round(item.weight_2 || 0)}
                </div>
                <div style="font-size: 0.65rem; color: #888; margin-top: 2px;">
                    In: ${item.timestamp_1 ? new Date(item.timestamp_1).toLocaleString('id-ID') : '-'} | Out: ${item.timestamp_2 ? new Date(item.timestamp_2).toLocaleString('id-ID') : '-'}
                </div>
            </td>
            <td>
                <span class="diff-tag ${diffClass}">${diff > 0 ? '+' : ''}${Math.round(diff)}</span>
            </td>
            <td>
                <button class="print-btn" data-id="${item.id}" title="Cetak">
                    <img src="img/icon-print.svg" alt="Logo">
                </button>
                <button class="delete-btn" data-id="${item.id}" title="Hapus">
                    <img src="img/icon-delete.png" alt="Logo">
                </button>
            </td>
        `;
        historyBody.appendChild(row);
    });

    // Update Pagination UI
    currentPageSpan.textContent = currentHistoryPage;
    totalPagesSpan.textContent = totalPages;
    prevPageBtn.disabled = currentHistoryPage <= 1;
    nextPageBtn.disabled = currentHistoryPage >= totalPages;

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.closest('.delete-btn').getAttribute('data-id');
            if (confirm('Hapus record ini?')) {
                await window.electronAPI.deleteHistory(id);
                loadHistory();
            }
        };
    });

    document.querySelectorAll('.print-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.closest('.print-btn').getAttribute('data-id');
            const history = await window.electronAPI.getHistoryById(id);
            const settings = await window.electronAPI.getSettings();
            const printData = {
                ...history,
                timestamp: new Date().toLocaleString('id-ID'),
                companyName: settings.company_name,
                companyAddress: settings.company_address,
                companyPhone: settings.company_phone
            };
            window.electronAPI.printSuratJalan(printData);
        };
    });
}

// Filter and Pagination Event Listeners
applyFilterBtn.addEventListener('click', () => {
    currentHistoryPage = 1;
    loadHistory();
});

prevPageBtn.addEventListener('click', () => {
    if (currentHistoryPage > 1) {
        currentHistoryPage--;
        loadHistory();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = parseInt(totalPagesSpan.textContent);
    if (currentHistoryPage < totalPages) {
        currentHistoryPage++;
        loadHistory();
    }
});

exportExcelBtn.addEventListener('click', async () => {
    const params = {
        startDate: filterStartDate.value,
        endDate: filterEndDate.value
    };

    const result = await window.electronAPI.exportToExcel(params);
    if (result.success) {
        alert('Data berhasil dieksport ke: ' + result.filePath);
    } else if (!result.cancelled) {
        alert('Gagal mengeksport data: ' + result.error);
    }
});

// Set default dates to today
const today = new Date().toISOString().split('T')[0];
filterStartDate.value = today;
filterEndDate.value = today;

// Combined Password Modal Logic (Reset DB & SQL)
const openSqlBtn = document.getElementById('open-sql-btn');
let pendingAction = null; // 'reset' or 'sql'

resetDbBtn.addEventListener('click', () => {
    passwordInput.value = '';
    passwordModal.classList.add('active');
    passwordInput.focus();
    pendingAction = 'reset';
});

if (openSqlBtn) {
    openSqlBtn.addEventListener('click', () => {
        passwordInput.value = '';
        passwordModal.classList.add('active');
        passwordInput.focus();
        pendingAction = 'sql';
    });
}

function closePassModal() {
    passwordModal.classList.remove('active');
    pendingAction = null;
}

closePassModalBtn.addEventListener('click', closePassModal);
cancelPassBtn.addEventListener('click', closePassModal);

submitResetBtn.addEventListener('click', async () => {
    const password = passwordInput.value;

    if (password === 'naylatools') {
        if (pendingAction === 'reset') {
            if (confirm('APAKAH ANDA YAKIN? Tindakan ini akan menghapus SELURUH data weighing history.')) {
                const success = await window.electronAPI.resetDatabase();
                if (success) {
                    alert('Database berhasil dibersihkan!');
                    closePassModal();
                    loadHistory();
                } else {
                    alert('Gagal membersihkan database.');
                }
            }
        } else if (pendingAction === 'sql') {
            closePassModal();
            openSqlModal();
        }
    } else {
        alert('Password salah!');
    }
});

// SQL Query Logic
const sqlModal = document.getElementById('sql-modal');
const closeSqlModalBtn = document.getElementById('close-sql-modal-btn');
const sqlQueryInput = document.getElementById('sql-query-input');
const executeSqlBtn = document.getElementById('execute-sql-btn');
const queryResultHead = document.getElementById('query-result-head');
const queryResultBody = document.getElementById('query-result-body');
const queryStatusMsg = document.getElementById('query-status-msg');

function openSqlModal() {
    sqlModal.classList.add('active');
    setTimeout(() => sqlQueryInput.focus(), 100);
}

closeSqlModalBtn.addEventListener('click', () => {
    sqlModal.classList.remove('active');
});

executeSqlBtn.addEventListener('click', async () => {
    const query = sqlQueryInput.value;
    if (!query.trim()) return;

    // Clear previous results
    queryResultHead.innerHTML = '';
    queryResultBody.innerHTML = '';
    queryStatusMsg.style.display = 'block';
    queryStatusMsg.textContent = 'Executing...';
    queryStatusMsg.style.color = '#ccc';

    try {
        const result = await window.electronAPI.executeSql(query);

        if (result.success) {
            queryStatusMsg.textContent = `Success! Type: ${result.type}`;
            queryStatusMsg.style.color = '#4CAF50';

            if (result.type === 'SELECT' && Array.isArray(result.data)) {
                if (result.data.length > 0) {
                    queryStatusMsg.style.display = 'none';
                    renderTable(result.data);
                } else {
                    queryStatusMsg.textContent = 'Query executed successfully. No rows returned.';
                }
            } else if (result.type === 'EXEC') {
                queryStatusMsg.textContent = `Executed Successfully. Changes: ${result.data.changes}, LastInsertRowid: ${result.data.lastInsertRowid}`;
            }
        } else {
            queryStatusMsg.textContent = `Error: ${result.error}`;
            queryStatusMsg.style.color = '#ff6b6b';
        }

    } catch (err) {
        queryStatusMsg.textContent = `Runtime Error: ${err}`;
        queryStatusMsg.style.color = '#ff6b6b';
    }
});

function renderTable(data) {
    if (!data || data.length === 0) return;

    // Headers
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.padding = '8px';
        th.style.background = '#444';
        th.style.textAlign = 'left';
        th.style.borderBottom = '1px solid #555';
        headerRow.appendChild(th);
    });
    queryResultHead.appendChild(headerRow);

    // Body
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
            const td = document.createElement('td');
            const val = row[h];
            td.textContent = (val === null || val === undefined) ? 'NULL' : val;
            td.style.padding = '8px';
            td.style.borderBottom = '1px solid #444';
            tr.appendChild(td);
        });
        queryResultBody.appendChild(tr);
    });
}

// Settings Logic
const settingCompanyName = document.getElementById('setting-company-name');
const settingCompanyAddress = document.getElementById('setting-company-address');
const settingCompanyPhone = document.getElementById('setting-company-phone');
const settingAppTheme = document.getElementById('setting-app-theme');
const saveSettingsBtn = document.getElementById('save-settings-btn');

async function loadAppSettings() {
    const settings = await window.electronAPI.getSettings();
    if (settings) {
        settingCompanyName.value = settings.company_name || '';
        settingCompanyAddress.value = settings.company_address || '';
        settingCompanyPhone.value = settings.company_phone || '';
        // Removed weight divider loading

        // Load Theme
        const theme = settings.app_theme || 'dark';
        settingAppTheme.value = theme;
        applyTheme(theme);
    }
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
}

// Live preview and auto-save for theme
settingAppTheme.addEventListener('change', async () => {
    const theme = settingAppTheme.value;
    applyTheme(theme);
    await window.electronAPI.saveSettings({ app_theme: theme });
});

// Removed weight divider event listener

saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
        company_name: settingCompanyName.value,
        company_address: settingCompanyAddress.value,
        company_phone: settingCompanyPhone.value
    };

    const result = await window.electronAPI.saveSettings(settings);
    if (result.success) {
        alert('Informasi Perusahaan berhasil disimpan!');
    } else {
        alert('Gagal menyimpan pengaturan: ' + result.error);
    }
});

// Template Management
const createTemplateBtn = document.getElementById('create-template-btn');
const templateListBody = document.getElementById('template-list-body');

async function loadTemplates() {
    if (!templateListBody) {
        console.error('Template list body not found!');
        return;
    }

    console.log('Loading templates...');
    try {
        const result = await window.electronAPI.getAllTemplates();
        console.log('Get templates result:', result);

        if (result.success) {
            renderTemplates(result.templates);
        } else {
            console.error('Failed to load templates:', result.error);
            templateListBody.innerHTML = `<tr><td colspan="3" style="color: red;">Error: ${result.error}</td></tr>`;
        }
    } catch (e) {
        console.error('Exception loading templates:', e);
        templateListBody.innerHTML = `<tr><td colspan="3" style="color: red;">Exception: ${e.message}</td></tr>`;
    }
}

function renderTemplates(templates) {
    templateListBody.innerHTML = '';

    if (templates.length === 0) {
        templateListBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px; color: #666;">Belum ada template custom. Klik "Buat Baru".</td></tr>`;
        return;
    }

    templates.forEach(tpl => {
        const tr = document.createElement('tr');

        // Toggle Switch for Activation
        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';

        const switchInput = document.createElement('input');
        switchInput.type = 'checkbox';
        switchInput.checked = tpl.is_active === 1;

        const sliderSpan = document.createElement('span');
        sliderSpan.className = 'slider';

        switchLabel.appendChild(switchInput);
        switchLabel.appendChild(sliderSpan);

        switchInput.onchange = async () => {
            if (switchInput.checked) {
                // Activate
                const res = await window.electronAPI.activateTemplate(tpl.id);
                if (!res.success) {
                    alert('Gagal mengaktifkan template: ' + res.error);
                    switchInput.checked = false;
                }
            } else {
                // Deactivate
                const res = await window.electronAPI.deactivateTemplate(tpl.id);
                if (!res.success) {
                    alert('Gagal menonaktifkan template: ' + res.error);
                    switchInput.checked = true;
                }
            }
            loadTemplates(); // Reload to update other switches (only one active per type)
        };

        // Actions Container
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '5px';
        actionsDiv.style.justifyContent = 'flex-end';

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.innerHTML = '✏️'; // Simple icon
        editBtn.title = 'Edit Desain';
        editBtn.onclick = () => window.electronAPI.openReportDesigner(tpl.id);
        actionsDiv.appendChild(editBtn);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn';
        deleteBtn.style.color = '#f44336';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Hapus';
        deleteBtn.onclick = async () => {
            if (confirm(`Hapus template "${tpl.name}"?`)) {
                await window.electronAPI.deleteTemplate(tpl.id);
                loadTemplates();
            }
        };
        actionsDiv.appendChild(deleteBtn);

        const typeBadge = tpl.trx_type === 'Pembelian' ?
            `<span class="badge" style="background: #007ACC; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">Pembelian</span>` :
            (tpl.trx_type === 'Penjualan' ? `<span class="badge" style="background: #E91E63; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">Penjualan</span>` : '');

        tr.innerHTML = `
            <td>
                <div>${tpl.name || '(Tanpa Nama)'}</div>
                <div style="font-size: 0.75rem; color: #aaa; margin-top: 2px;">${typeBadge}</div>
            </td>
            <td style="text-align: center;"></td>
            <td style="text-align: right;"></td>
        `;

        tr.querySelector('td:nth-child(2)').appendChild(switchLabel);
        tr.querySelector('td:last-child').appendChild(actionsDiv);
        templateListBody.appendChild(tr);
    });
}

if (createTemplateBtn) {
    createTemplateBtn.addEventListener('click', () => {
        window.electronAPI.openReportDesigner(); // No ID = Create New
    });
}

// Listen for template list updates from other windows (e.g. Designer)
window.electronAPI.onTemplateListUpdated(() => {
    console.log('Template list update notification received');
    loadTemplates();
});

// Initial calls
loadSettings();
loadTemplates(); // Load templates on startup
refreshPorts();
loadHistory();
loadAppSettings();

// Database Management Logic
const backupDbBtn = document.getElementById('backup-db-btn');
const restoreDbBtn = document.getElementById('restore-db-btn');

if (backupDbBtn) {
    backupDbBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.backupDatabase();
        if (result.success) {
            alert('Backup berhasil disimpan di:\n' + result.filePath);
        } else if (result.error) {
            alert('Gagal melakukan backup:\n' + result.error);
        }
    });
}

if (restoreDbBtn) {
    restoreDbBtn.addEventListener('click', async () => {
        if (confirm('PERINGATAN: Restore akan menimpa database saat ini dan me-restart aplikasi.\n\nPastikan Anda sudah mem-backup data sebelumnya jika diperlukan.\n\nLanjutkan?')) {
            const result = await window.electronAPI.restoreDatabase();
            if (!result.success && !result.cancelled) {
                alert('Gagal melakukan restore:\n' + result.error);
            }
        }
    });
}

// Update App Logic
const updateAppBtn = document.getElementById('update-app-btn');
const updateStatus = document.getElementById('update-status');
const updateProgressContainer = document.getElementById('update-progress-container');
const updateProgressBar = document.getElementById('update-progress-bar');
const updateProgressText = document.getElementById('update-progress-text');

if (updateAppBtn) {
    updateAppBtn.addEventListener('click', async () => {
        if (updateAppBtn.classList.contains('ready-to-install')) {
            // Install Phase
            const confirmInstall = confirm('Aplikasi akan ditutup untuk melakukan update. Lanjutkan?');
            if (confirmInstall) {
                await window.electronAPI.quitAndInstall();
            }
            return;
        }

        // Download Phase
        updateAppBtn.disabled = true;
        updateAppBtn.textContent = 'Downloading...';
        updateProgressContainer.style.display = 'block';
        if (updateStatus) updateStatus.style.display = 'none'; // Hide status text

        try {
            const result = await window.electronAPI.downloadUpdate();
        } catch (error) {
            updateAppBtn.textContent = 'Retry Update';
            updateAppBtn.disabled = false;
        }
    });
}

window.electronAPI.onUpdateProgress((percent) => {
    updateProgressBar.style.width = percent + '%';
    updateProgressText.textContent = Math.round(percent) + '%';
    updateAppBtn.textContent = `Downloading... ${Math.round(percent)}%`;
});

window.electronAPI.onUpdateDownloaded((filePath) => {
    updateAppBtn.textContent = 'Install Update';
    updateAppBtn.classList.add('ready-to-install');
    updateAppBtn.classList.remove('primary-btn');
    updateAppBtn.classList.add('primary-btn', 'secondary'); // Change style to indicate action change
    updateAppBtn.disabled = false;
    // alert('Update berhasil didownload. Klik "Install Update" untuk menerapkan.');
});

// ==========================================
// REPORT LOGIC
// ==========================================
const reportYearSelect = document.getElementById('report-year');
const reportMonthSelect = document.getElementById('report-month');
const refreshReportBtn = document.getElementById('refresh-report-btn');
const statTotalTransaksi = document.getElementById('stat-total-transaksi');
const statTotalNetto = document.getElementById('stat-total-netto');

// Check if Chart is available (loaded via script tag)
// It should be available as 'Chart' globally.
let reportChart = null;
let supplierChart = null;
let customerChart = null;
const monthNamesIn = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function initReportFilters() {
    if (!reportYearSelect) return;
    const currentYear = new Date().getFullYear();
    reportYearSelect.innerHTML = ''; // Clear
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        reportYearSelect.appendChild(option);
    }
}

async function loadReportData() {
    if (!reportYearSelect || !window.Chart) return;

    const year = reportYearSelect.value;
    const month = reportMonthSelect.value;
    const label = month ? `${month}/${year}` : `${year}`;

    console.log(`Loading Report for ${label}`);

    // 1. Get Stats
    try {
        const stats = await window.electronAPI.getReportStats({ year, month });
        statTotalTransaksi.textContent = stats.totalTransactions || 0;
        statTotalNetto.textContent = (stats.totalWeightNet || 0).toLocaleString('id-ID') + ' kg';
    } catch (e) {
        console.error("Error loading stats", e);
    }

    // 2. Get Chart Data
    try {
        const chartData = await window.electronAPI.getReportChartData({ year, month });

        // Process Data: Split into Pembelian and Penjualan
        let labels = [];
        if (!month) {
            // Yearly view: Always 12 months
            labels = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        } else {
            // Monthly view: all days up to the last day of the month
            const lastDay = new Date(year, month, 0).getDate();
            for (let i = 1; i <= lastDay; i++) {
                labels.push(i.toString().padStart(2, '0'));
            }
        }

        // Format Labels for display
        const displayLabels = labels.map(l => {
            if (!month) {
                const monthIndex = parseInt(l) - 1;
                return `${monthNamesIn[monthIndex]} ${year}`;
            }
            return l; // Just the day number for monthly view
        });

        const pembelianData = labels.map(label => {
            const match = chartData.find(d => d.label === label && d.trx_type === 'Pembelian');
            return match ? match.totalWeight : 0;
        });
        const penjualanData = labels.map(label => {
            const match = chartData.find(d => d.label === label && d.trx_type === 'Penjualan');
            return match ? match.totalWeight : 0;
        });

        // 3. Render Chart
        const ctx = document.getElementById('reportChart').getContext('2d');

        if (reportChart) {
            reportChart.destroy();
        }

        const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#eee';

        // Colors
        const colorPembelian = '#4CAF50'; // Green
        const colorPenjualan = '#E91E63'; // Pink/Red

        reportChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: displayLabels, // Use pretty labels here
                datasets: [
                    {
                        label: `Pembelian (kg)`,
                        data: pembelianData,
                        backgroundColor: colorPembelian,
                        borderColor: colorPembelian,
                        borderWidth: 1,
                        barPercentage: 0.6
                    },
                    {
                        label: `Penjualan (kg)`,
                        data: penjualanData,
                        backgroundColor: colorPenjualan,
                        borderColor: colorPenjualan,
                        borderWidth: 1,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    title: {
                        display: true,
                        text: 'Grafik Berat Per Periode',
                        color: textColor
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: textColor },
                        grid: { color: '#444' }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error loading chart", e);
    }

    // 4. Load Party Charts
    loadPartyCharts(year, month);
}

async function loadPartyCharts(year, month) {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#eee';

    // --- Supplier Chart (Pembelian) ---
    try {
        const suppliers = await window.electronAPI.getReportPartyStats({ year, month, type: 'Pembelian' });
        const labels = suppliers.map(d => d.party_name || 'Unknown');
        const data = suppliers.map(d => d.totalWeight);

        const ctx = document.getElementById('supplierChart').getContext('2d');
        if (supplierChart) supplierChart.destroy();

        supplierChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: textColor, boxWidth: 10 } }
                }
            }
        });
    } catch (e) {
        console.error("Error loading supplier chart", e);
    }

    // --- Customer Chart (Penjualan) ---
    try {
        const customers = await window.electronAPI.getReportPartyStats({ year, month, type: 'Penjualan' });
        const labels = customers.map(d => d.party_name || 'Unknown');
        const data = customers.map(d => d.totalWeight);

        const ctx = document.getElementById('customerChart').getContext('2d');
        if (customerChart) customerChart.destroy();

        customerChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: textColor, boxWidth: 10 } }
                }
            }
        });
    } catch (e) {
        console.error("Error loading customer chart", e);
    }
}

if (reportYearSelect) {
    reportYearSelect.addEventListener('change', loadReportData);
    reportMonthSelect.addEventListener('change', loadReportData);
    refreshReportBtn.addEventListener('click', loadReportData);

    // Init
    initReportFilters();
}
