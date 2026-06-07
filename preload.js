const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    listPorts: () => ipcRenderer.invoke('list-ports'),
    getPortStatus: () => ipcRenderer.invoke('get-port-status'),
    connectPort: (config) => ipcRenderer.send('connect-port', config),
    disconnectPort: () => ipcRenderer.send('disconnect-port'),
    onPortData: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('port-data', listener);
        return () => ipcRenderer.removeListener('port-data', listener);
    },
    onPortDataRaw: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('port-data-raw', listener);
        return () => ipcRenderer.removeListener('port-data-raw', listener);
    },
    onPortError: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('port-error', listener);
        return () => ipcRenderer.removeListener('port-error', listener);
    },
    onPortConnected: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('port-connected', listener);
        return () => ipcRenderer.removeListener('port-connected', listener);
    },
    onPortDisconnected: (callback) => {
        const listener = (_event, value) => callback(value);
        ipcRenderer.on('port-disconnected', listener);
        return () => ipcRenderer.removeListener('port-disconnected', listener);
    },

    // Database methods
    saveWeight: (data) => ipcRenderer.invoke('save-weight', data),
    getHistory: (params) => ipcRenderer.invoke('get-history', params),
    getHistoryCount: (params) => ipcRenderer.invoke('get-history-count', params),
    getHistorySummary: (params) => ipcRenderer.invoke('get-history-summary', params),
    getPendingWeights: () => ipcRenderer.invoke('get-pending-weights'),
    deleteHistory: (id) => ipcRenderer.invoke('delete-history', id),
    updateHistory: (data) => ipcRenderer.invoke('update-history', data),
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
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    onUpdateProgress: (callback) => {
        const listener = (event, percent) => callback(percent);
        ipcRenderer.on('update-progress', listener);
        return () => ipcRenderer.removeListener('update-progress', listener);
    },
    onUpdateDownloaded: (callback) => {
        const listener = (event, filePath) => callback(filePath);
        ipcRenderer.on('update-downloaded', listener);
        return () => ipcRenderer.removeListener('update-downloaded', listener);
    },
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

    // Advanced SQL
    executeSql: (query) => ipcRenderer.invoke('execute-sql', query),

    // Reports
    getReportStats: (params) => ipcRenderer.invoke('get-report-stats', params),
    getReportChartData: (params) => ipcRenderer.invoke('get-report-chart-data', params),
    getReportPartyStats: (params) => ipcRenderer.invoke('get-report-party-stats', params),
    getReportProductStats: (params) => ipcRenderer.invoke('get-report-product-stats', params),

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
    onTemplateListUpdated: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('template-list-updated', listener);
        return () => ipcRenderer.removeListener('template-list-updated', listener);
    }
});
