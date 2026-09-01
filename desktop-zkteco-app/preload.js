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
    
    // Employee APIs
    getEmployees: () => ipcRenderer.invoke('get-employees'),
    saveEmployee: (emp) => ipcRenderer.invoke('save-employee', emp),
    deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),

    // Category APIs
    getCategories: () => ipcRenderer.invoke('get-categories'),
    saveCategory: (cat) => ipcRenderer.invoke('save-category', cat),
    deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

    // Shift APIs
    getShifts: () => ipcRenderer.invoke('get-shifts'),
    saveShift: (shift) => ipcRenderer.invoke('save-shift', shift),
    deleteShift: (id) => ipcRenderer.invoke('delete-shift', id),

    // Attendance Reports & Cloud Sync
    getAttendanceReport: (filters) => ipcRenderer.invoke('get-attendance-report', filters),
    exportReportCsv: (filters) => ipcRenderer.invoke('export-report-csv', filters),
    syncCloudStaff: () => ipcRenderer.invoke('sync-cloud-staff'),

    // Terminal Hardware User Push / Pull
    pullUsersFromDevice: (device) => ipcRenderer.invoke('pull-users-from-device', device),
    pushUsersToDevice: (device, employeeList) => ipcRenderer.invoke('push-users-to-device', device, employeeList),
    
    // Event listeners
    onNewPunch: (callback) => ipcRenderer.on('new-punch', (_, punch) => callback(punch)),
    onLog: (callback) => ipcRenderer.on('app-log', (_, log) => callback(log)),
    onStatusChange: (callback) => ipcRenderer.on('status-change', (_, status) => callback(status))
});
