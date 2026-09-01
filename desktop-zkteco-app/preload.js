const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zkApi', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
    testConnection: (device) => ipcRenderer.invoke('test-connection', device),
    syncLogsNow: (device) => ipcRenderer.invoke('sync-logs-now', device),
    unlockDoor: (device, seconds) => ipcRenderer.invoke('unlock-door', device, seconds),
    syncTime: (device) => ipcRenderer.invoke('sync-time', device),
    testVoice: (device) => ipcRenderer.invoke('test-voice', device),
    startAutoSync: (intervalSec) => ipcRenderer.invoke('start-auto-sync', intervalSec),
    stopAutoSync: () => ipcRenderer.invoke('stop-auto-sync'),
    getRecentPunches: () => ipcRenderer.invoke('get-recent-punches'),
    
    // Event listeners
    onNewPunch: (callback) => ipcRenderer.on('new-punch', (_, punch) => callback(punch)),
    onLog: (callback) => ipcRenderer.on('app-log', (_, log) => callback(log)),
    onStatusChange: (callback) => ipcRenderer.on('status-change', (_, status) => callback(status))
});
