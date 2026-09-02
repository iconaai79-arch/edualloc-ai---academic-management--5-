const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { ZKTecoDevice } = require('./zk-protocol');
const { CloudSyncService } = require('./cloud-sync');

let mainWindow = null;
let tray = null;
let autoSyncTimer = null;
let isQuitting = false;

const configPath = path.join(app.getPath('userData'), 'config.json');

const defaultConfig = {
    cloudUrl: 'https://portal.eduai.co.ke',
    institutionId: '',
    apiKey: '',
    autoSyncEnabled: true,
    syncIntervalSec: 15,
    devices: [
        {
            id: 'dev_1',
            name: 'Main Gate Terminal',
            ip: '192.168.1.201',
            port: 4370,
            serialNumber: 'ZK_MAIN_GATE'
        }
    ]
};

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            return { ...defaultConfig, ...JSON.parse(raw) };
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
    return defaultConfig;
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

let appConfig = loadConfig();
const cloudSync = new CloudSyncService(appConfig);
let recentPunches = [];

function sendLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-log', { message, type, timestamp });
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function createWindow() {
    const iconPath = path.join(__dirname, 'renderer', 'eduai_logo_3d.png');
    mainWindow = new BrowserWindow({
        width: 1120,
        height: 760,
        minWidth: 920,
        minHeight: 620,
        title: 'EduAI ZKTeco Management Suite',
        icon: iconPath,
        backgroundColor: '#060911',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            if (Notification.isSupported()) {
                new Notification({
                    title: 'EduAI ZKTeco Agent',
                    body: 'Agent is running in the background and syncing attendance logs.'
                }).show();
            }
        }
        return false;
    });
}

function createTray() {
    try {
        tray = new Tray(path.join(__dirname, 'renderer', 'eduai_logo_3d.png'));
    } catch (e) {
        // Create simple context menu tray if icon missing
    }

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open Dashboard', click: () => { mainWindow.show(); } },
        { label: 'Sync Now', click: () => { runSyncCycle(); } },
        { type: 'separator' },
        { label: 'Quit Agent', click: () => { isQuitting = true; app.quit(); } }
    ]);

    if (tray) {
        tray.setToolTip('EduAI ZKTeco Attendance Sync Agent');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => mainWindow.show());
    }
}

async function runSyncCycle() {
    if (!appConfig.devices || appConfig.devices.length === 0) return;

    for (const dev of appConfig.devices) {
        if (!dev.ip) continue;
        const zk = new ZKTecoDevice(dev.ip, dev.port || 4370, 5000, dev.commKey || 0, dev.protocol || 'auto');

        try {
            sendLog(`Connecting to ${dev.name || dev.ip} (${dev.ip}:${dev.port || 4370})...`, 'info');
            await zk.connect();
            sendLog(`Connected to ${dev.name}! Fetching logs...`, 'success');

            const logs = await zk.getAttendanceLogs();
            sendLog(`Retrieved ${logs.length} total attendance punches from ${dev.name}.`, 'info');

            if (logs.length > 0) {
                // Record all punches locally for analytics and report generation
                logs.forEach(p => {
                    cloudSync.recordLocalPunch(p, dev.name);
                });

                // Take latest punches
                const syncRes = await cloudSync.syncAttendanceLogs(logs, dev.serialNumber || dev.ip);
                if (syncRes.count > 0) {
                    sendLog(`✓ Successfully uploaded ${syncRes.count} new punches to EduAI Cloud!`, 'success');
                    
                    // Add to live UI feed
                    logs.slice(-syncRes.count).forEach(p => {
                        const punchItem = {
                            pin: p.pin,
                            time: p.time,
                            deviceName: dev.name,
                            verifyMode: p.verifyMode
                        };
                        recentPunches.unshift(punchItem);
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('new-punch', punchItem);
                        }
                    });
                } else {
                    sendLog(`Device is up to date (${logs.length} stored logs).`, 'info');
                }
            }

            // Cloud heartbeat
            await cloudSync.sendHeartbeat(dev.serialNumber || dev.ip, dev.name, dev.ip);
            await zk.disconnect();

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('status-change', { deviceId: dev.id, online: true });
            }
        } catch (err) {
            sendLog(`Connection to ${dev.name} (${dev.ip}) failed: ${err.message}`, 'error');
            await zk.disconnect();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('status-change', { deviceId: dev.id, online: false });
            }
        }
    }

    // Flush any offline buffered logs
    try {
        const flushed = await cloudSync.flushOfflineQueue();
        if (flushed.count > 0) {
            sendLog(`✓ Flushed ${flushed.count} offline buffered punches to EduAI Cloud.`, 'success');
        }
    } catch (e) {
        // silent retry
    }
}

function startAutoSyncTimer(intervalSec = 15) {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    const intervalMs = Math.max(5, intervalSec) * 1000;
    autoSyncTimer = setInterval(runSyncCycle, intervalMs);
    sendLog(`Automated background sync started (every ${intervalSec}s).`, 'info');
}

function stopAutoSyncTimer() {
    if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
        autoSyncTimer = null;
        sendLog(`Automated sync paused.`, 'warn');
    }
}

// ── IPC HANDLERS ──
ipcMain.handle('get-config', () => appConfig);

ipcMain.handle('save-config', (_, newConfig) => {
    try {
        appConfig = { ...appConfig, ...newConfig };
        saveConfig(appConfig);
        if (typeof cloudSync.updateConfig === 'function') {
            cloudSync.updateConfig(appConfig);
        }
        if (appConfig.autoSyncEnabled) {
            startAutoSyncTimer(appConfig.syncIntervalSec);
        } else {
            stopAutoSyncTimer();
        }
        return { success: true };
    } catch (err) {
        console.error('Error saving config:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('save-device', (_, devData) => {
    try {
        if (!appConfig) appConfig = loadConfig();
        if (!Array.isArray(appConfig.devices)) appConfig.devices = [];
        
        const id = devData.id || 'dev_' + Date.now();
        const existingIdx = appConfig.devices.findIndex(d => String(d.id) === String(id));
        if (existingIdx >= 0) {
            appConfig.devices[existingIdx] = { ...devData, id };
        } else {
            appConfig.devices.push({ ...devData, id });
        }
        
        saveConfig(appConfig);
        return { success: true, devices: appConfig.devices };
    } catch (err) {
        console.error('Error saving device:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('delete-device', (_, devId) => {
    try {
        if (!appConfig) appConfig = loadConfig();
        if (!Array.isArray(appConfig.devices)) appConfig.devices = [];
        
        appConfig.devices = appConfig.devices.filter(d => String(d.id) !== String(devId));
        saveConfig(appConfig);
        return { success: true, devices: appConfig.devices };
    } catch (err) {
        console.error('Error deleting device:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('test-connection', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        await zk.connect();
        const modeUsed = zk.protocolMode ? zk.protocolMode.toUpperCase() : 'TCP/UDP';
        await zk.testVoice().catch(() => {});
        await zk.disconnect();
        return { success: true, message: `Successfully connected to ${device.ip}:${device.port || 4370} (${modeUsed})!` };
    } catch (e) {
        await zk.disconnect();
        return { success: false, message: e.message };
    }
});

ipcMain.handle('test-voice', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        await zk.connect();
        await zk.testVoice();
        await zk.disconnect();
        return { success: true, message: `Voice played on ${device.ip}.` };
    } catch (e) {
        await zk.disconnect();
        return { success: false, message: e.message };
    }
});

ipcMain.handle('sync-logs-now', async (_, device) => {
    await runSyncCycle();
    return { success: true };
});

ipcMain.handle('unlock-door', async (_, device, seconds = 5) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        await zk.connect();
        await zk.unlockDoor(seconds);
        await zk.disconnect();
        return { success: true, message: `Door unlocked for ${seconds} seconds.` };
    } catch (e) {
        await zk.disconnect();
        return { success: false, message: e.message };
    }
});

ipcMain.handle('sync-time', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        await zk.connect();
        await zk.setDeviceTime(new Date());
        await zk.disconnect();
        return { success: true, message: `Clock synced to ${new Date().toLocaleString()}.` };
    } catch (e) {
        await zk.disconnect();
        return { success: false, message: e.message };
    }
});

ipcMain.handle('start-auto-sync', (_, interval) => {
    startAutoSyncTimer(interval);
    return true;
});

ipcMain.handle('stop-auto-sync', () => {
    stopAutoSyncTimer();
    return true;
});

ipcMain.handle('get-recent-punches', () => recentPunches);

// ── EMPLOYEE IPC HANDLERS ──
ipcMain.handle('get-employees', () => cloudSync.getEmployees());
ipcMain.handle('save-employee', (_, emp) => cloudSync.saveEmployee(emp));
ipcMain.handle('delete-employee', (_, id) => cloudSync.deleteEmployee(id));

// ── CATEGORY IPC HANDLERS ──
ipcMain.handle('get-categories', () => cloudSync.getCategories());
ipcMain.handle('save-category', (_, cat) => cloudSync.saveCategory(cat));
ipcMain.handle('delete-category', (_, id) => cloudSync.deleteCategory(id));

// ── SHIFTS IPC HANDLERS ──
ipcMain.handle('get-shifts', () => cloudSync.getShifts());
ipcMain.handle('save-shift', (_, shift) => cloudSync.saveShift(shift));
ipcMain.handle('delete-shift', (_, id) => cloudSync.deleteShift(id));

// ── ATTENDANCE REPORTS & EXPORT ──
ipcMain.handle('get-attendance-report', (_, filters) => cloudSync.getAttendanceReport(filters));
ipcMain.handle('export-report-csv', (_, filters) => cloudSync.generateAttendanceCsv(filters));
ipcMain.handle('sync-cloud-staff', async () => {
    try {
        const res = await cloudSync.fetchCloudStaff();
        return { success: true, count: res.count };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

// ── DEVICE USER SYNC ──
ipcMain.handle('pull-users-from-device', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        sendLog(`Downloading enrolled users from ${device.name || device.ip}...`, 'info');
        await zk.connect();
        const terminalUsers = await zk.getUsers();
        await zk.disconnect();

        let imported = 0;
        terminalUsers.forEach(u => {
            cloudSync.saveEmployee({
                id: 'emp_zk_' + u.pin,
                pin: u.pin,
                name: u.name || `User #${u.pin}`,
                cardNo: u.cardNo || '',
                privilege: u.privilege || 'User',
                categoryId: 'cat_teaching',
                shiftId: 'shift_day',
                active: true
            });
            imported++;
        });

        sendLog(`✓ Downloaded ${imported} users from ${device.name || device.ip}.`, 'success');
        return { success: true, count: imported, users: cloudSync.getEmployees() };
    } catch (e) {
        await zk.disconnect();
        sendLog(`User download failed: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
});

ipcMain.handle('push-users-to-device', async (_, device, employeeList) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        sendLog(`Uploading staff profiles to ${device.name || device.ip}...`, 'info');
        await zk.connect();
        let uploaded = 0;
        const list = employeeList || cloudSync.getEmployees();

        for (const emp of list) {
            await zk.setUser({
                pin: emp.pin,
                name: emp.name,
                password: emp.password || '',
                privilege: emp.privilege || 'User',
                cardNo: emp.cardNo || ''
            });
            uploaded++;
        }

        await zk.disconnect();
        sendLog(`✓ Successfully uploaded ${uploaded} staff profiles to ${device.name || device.ip}.`, 'success');
        return { success: true, count: uploaded };
    } catch (e) {
        await zk.disconnect();
        sendLog(`User upload failed: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
});

// ── HARDWARE LOG DOWNLOAD & EXPORT ──
ipcMain.handle('download-device-logs', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 8000, device.commKey || 0, device.protocol || 'auto');
    try {
        sendLog(`Connecting to ${device.name || device.ip} to fetch hardware attendance logs...`, 'info');
        await zk.connect();
        const logs = await zk.getAttendanceLogs();
        await zk.disconnect();

        // Ingest into local attendance engine for reporting
        logs.forEach(p => {
            cloudSync.recordLocalPunch(p, device.name);
        });

        sendLog(`✓ Successfully downloaded ${logs.length} raw attendance logs from ${device.name || device.ip}.`, 'success');
        return { success: true, logs, count: logs.length };
    } catch (e) {
        await zk.disconnect();
        sendLog(`Hardware log download failed: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
});

ipcMain.handle('save-logs-file', async (_, { content, defaultName, format }) => {
    const { dialog } = require('electron');
    let filters = [{ name: 'Text Document', extensions: ['txt', 'log'] }, { name: 'All Files', extensions: ['*'] }];
    if (format === 'dat') {
        filters = [{ name: 'ZKTeco DAT File', extensions: ['dat'] }, { name: 'All Files', extensions: ['*'] }];
    } else if (format === 'csv') {
        filters = [{ name: 'CSV Document', extensions: ['csv'] }, { name: 'All Files', extensions: ['*'] }];
    }

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Biometric Attendance Log File',
        defaultPath: defaultName || (format === 'dat' ? 'attlog.dat' : (format === 'csv' ? 'attendance_logs.csv' : 'attlog.txt')),
        filters
    });

    if (canceled || !filePath) {
        return { saved: false };
    }

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        sendLog(`✓ Saved attendance log file to: ${filePath}`, 'success');
        return { saved: true, filePath };
    } catch (err) {
        sendLog(`Failed to write log file: ${err.message}`, 'error');
        return { saved: false, error: err.message };
    }
});

ipcMain.handle('clear-device-logs', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        sendLog(`Clearing attendance logs on hardware ${device.name || device.ip}...`, 'warn');
        await zk.connect();
        const success = await zk.clearAttendanceLogs();
        await zk.disconnect();
        if (success) {
            sendLog(`✓ Cleared attendance logs on ${device.name || device.ip}.`, 'success');
            return { success: true, message: 'Hardware attendance logs cleared successfully.' };
        }
        return { success: false, message: 'Device returned error while clearing logs.' };
    } catch (e) {
        await zk.disconnect();
        sendLog(`Clear logs failed: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
});

// ── LIVE BIOMETRIC FINGERPRINT ENROLLMENT ──
ipcMain.handle('start-enroll-fingerprint', async (_, { device, pin, fingerId, employeeName, fingerName }) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 8000, device.commKey || 0, device.protocol || 'auto');
    try {
        sendLog(`Initiating live fingerprint capture on ${device.name || device.ip} for [${employeeName}] (PIN #${pin}, Finger: ${fingerName})...`, 'info');
        await zk.connect();
        // Ensure user exists on device
        await zk.setUser({ pin, name: employeeName, privilege: 'User' }).catch(() => {});
        
        const started = await zk.startEnrollFingerprint(pin, fingerId);
        await zk.disconnect();

        if (started) {
            // Update local staff profile
            cloudSync.updateEmployeeBiometrics(pin, fingerName, false);
            sendLog(`⚡ Live capture triggered on terminal! Prompting user: "Please place finger 3 times on sensor".`, 'success');
            return { success: true, message: `Terminal LCD prompted: Place finger 3 times on ${device.name} sensor.` };
        }
        return { success: false, message: 'Device did not accept enrollment mode.' };
    } catch (e) {
        await zk.disconnect();
        sendLog(`Enrollment trigger failed: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
});

ipcMain.handle('cancel-enroll-fingerprint', async (_, device) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 4000, device.commKey || 0, device.protocol || 'auto');
    try {
        await zk.connect();
        await zk.cancelEnrollment();
        await zk.disconnect();
        sendLog(`Enrollment canceled on ${device.name || device.ip}.`, 'info');
        return { success: true };
    } catch (e) {
        await zk.disconnect();
        return { success: false, message: e.message };
    }
});

ipcMain.handle('delete-fingerprint-template', async (_, { device, pin, fingerId, fingerName }) => {
    const zk = new ZKTecoDevice(device.ip, device.port || 4370, 5000, device.commKey || 0, device.protocol || 'auto');
    try {
        await zk.connect();
        await zk.deleteUserFingerprint(pin, fingerId);
        await zk.disconnect();
        cloudSync.updateEmployeeBiometrics(pin, fingerName, true);
        sendLog(`Deleted fingerprint template (${fingerName}) for PIN #${pin}.`, 'warn');
        return { success: true, message: `Fingerprint template removed from device.` };
    } catch (e) {
        await zk.disconnect();
        return { success: false, message: e.message };
    }
});

app.whenReady().then(() => {
    createWindow();
    createTray();

    if (appConfig.autoSyncEnabled) {
        setTimeout(() => {
            runSyncCycle();
            startAutoSyncTimer(appConfig.syncIntervalSec);
        }, 2000);
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Keep running in tray
    }
});
