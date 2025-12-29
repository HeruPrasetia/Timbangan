const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    listPorts: () => ipcRenderer.invoke('list-ports'),
    connectPort: (config) => ipcRenderer.send('connect-port', config),
    disconnectPort: () => ipcRenderer.send('disconnect-port'),
    onPortData: (callback) => ipcRenderer.on('port-data', (_event, value) => callback(value)),
    onPortDataRaw: (callback) => ipcRenderer.on('port-data-raw', (_event, value) => callback(value)),
    onPortError: (callback) => ipcRenderer.on('port-error', (_event, value) => callback(value)),
    onPortConnected: (callback) => ipcRenderer.on('port-connected', (_event, value) => callback(value)),

    // Database methods
    saveWeight: (data) => ipcRenderer.invoke('save-weight', data),
    getHistory: (params) => ipcRenderer.invoke('get-history', params),
    getHistoryCount: (params) => ipcRenderer.invoke('get-history-count', params),
    getPendingWeights: () => ipcRenderer.invoke('get-pending-weights'),
    deleteHistory: (id) => ipcRenderer.invoke('delete-history', id),
    resetDatabase: () => ipcRenderer.invoke('reset-database'),
    exportToExcel: (params) => ipcRenderer.invoke('export-to-excel', params),
    backupDatabase: () => ipcRenderer.invoke('backup-database'),
    restoreDatabase: () => ipcRenderer.invoke('restore-database'),

    // Settings & Print methods
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    printSuratJalan: (data) => ipcRenderer.invoke('print-surat-jalan', data),
    getHistoryById: (id) => ipcRenderer.invoke('get-history-by-id', id),
    // Update API
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, percent) => callback(percent)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, filePath) => callback(filePath)),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

    // Advanced SQL
    executeSql: (query) => ipcRenderer.invoke('execute-sql', query),

    // Reports
    getReportStats: (params) => ipcRenderer.invoke('get-report-stats', params),
    getReportChartData: (params) => ipcRenderer.invoke('get-report-chart-data', params),
    getReportPartyStats: (params) => ipcRenderer.invoke('get-report-party-stats', params),

    // Print Designer & Multi-Template
    openReportDesigner: (templateId) => ipcRenderer.invoke('open-report-designer', templateId),
    getAllTemplates: () => ipcRenderer.invoke('get-all-templates'),
    saveTemplate: (data) => ipcRenderer.invoke('save-template', data),
    getTemplateById: (id) => ipcRenderer.invoke('get-template-by-id', id),
    activateTemplate: (id) => ipcRenderer.invoke('activate-template', id),
    deactivateTemplate: (id) => ipcRenderer.invoke('deactivate-template', id),
    deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),

    // Legacy / Helpers
    getPrintTemplate: () => ipcRenderer.invoke('get-print-template'),
    savePrintTemplate: (content) => ipcRenderer.invoke('save-print-template', content), // Keeping for compatibility or specific raw usage if needed
    resetPrintTemplate: () => ipcRenderer.invoke('reset-print-template'),
    onTemplateListUpdated: (callback) => ipcRenderer.on('template-list-updated', () => callback())
});
