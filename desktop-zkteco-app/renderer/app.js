/**
 * EduAI ZKTeco Desktop Bridge - Renderer App Logic
 */

let appConfig = null;
let punchCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    setupTabNavigation();
    setupEventListeners();
    await loadInitialConfig();
    await loadRecentPunches();
    setupIpcListeners();
});

function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.tab-panel');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            const targetPanel = document.getElementById(`panel-${tabId}`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

async function loadInitialConfig() {
    if (!window.zkApi) return;
    appConfig = await window.zkApi.getConfig();

    // Populate Cloud Form
    document.getElementById('inp-cloud-url').value = appConfig.cloudUrl || 'https://portal.eduai.co.ke';
    document.getElementById('inp-inst-id').value = appConfig.institutionId || '';
    document.getElementById('inp-api-key').value = appConfig.apiKey || '';

    // Populate Auto-Sync Controls
    document.getElementById('chk-auto-sync').checked = !!appConfig.autoSyncEnabled;
    document.getElementById('sel-sync-interval').value = String(appConfig.syncIntervalSec || 15);

    renderDeviceList();
}

async function loadRecentPunches() {
    if (!window.zkApi) return;
    const punches = await window.zkApi.getRecentPunches();
    if (Array.isArray(punches) && punches.length > 0) {
        const tbody = document.getElementById('live-punch-tbody');
        tbody.innerHTML = '';
        punches.forEach(p => appendPunchRow(p));
    }
}

function renderDeviceList() {
    const container = document.getElementById('device-grid');
    if (!container || !appConfig) return;

    if (!appConfig.devices || appConfig.devices.length === 0) {
        container.innerHTML = `
            <div class="empty-card" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-sub);">
                <p>No ZKTeco biometric terminals configured yet.</p>
                <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="openDeviceModal()">+ Add Your First Terminal</button>
            </div>
        `;
        return;
    }

    container.innerHTML = appConfig.devices.map(dev => `
        <div class="device-card" id="card-${dev.id}">
            <div class="device-header">
                <div class="device-title">
                    <h4>${escapeHtml(dev.name)}</h4>
                    <p class="device-ip">${escapeHtml(dev.ip)}:${dev.port || 4370}</p>
                </div>
                <div class="device-badge" id="badge-${dev.id}">
                    <span class="badge-verify">LAN Port 4370</span>
                </div>
            </div>

            <div class="device-meta" style="font-size: 11px; color: var(--text-muted);">
                <span>SN: <strong>${escapeHtml(dev.serialNumber || 'ZK-STANDALONE')}</strong></span>
            </div>

            <div class="device-actions">
                <button class="btn btn-sm btn-secondary" onclick="testDevice('${dev.id}')">⚡ Test Link</button>
                <button class="btn btn-sm btn-secondary" onclick="syncDevice('${dev.id}')">🔄 Sync Logs</button>
                <button class="btn btn-sm btn-secondary" onclick="syncClock('${dev.id}')">🕒 Set Time</button>
                <button class="btn btn-sm btn-secondary" onclick="unlockDoor('${dev.id}')">🚪 Unlock</button>
                <button class="btn btn-sm btn-secondary" style="color: var(--rose);" onclick="deleteDevice('${dev.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function appendPunchRow(punch) {
    const tbody = document.getElementById('live-punch-tbody');
    if (!tbody) return;

    const emptyRow = tbody.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();

    punchCount++;
    document.getElementById('punch-count').textContent = punchCount;

    const verifyNames = {
        1: 'Fingerprint',
        2: 'Password / PIN',
        3: 'RFID Card',
        15: 'Face Scan'
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><span class="badge-pin">#${escapeHtml(punch.pin)}</span></td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${escapeHtml(punch.time)}</td>
        <td>${escapeHtml(punch.deviceName || 'ZKTeco Terminal')}</td>
        <td><span class="badge-verify">${verifyNames[punch.verifyMode] || 'Biometric'}</span></td>
        <td><span class="badge-synced">✓ Synced to Cloud</span></td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    // Keep top 100 in table
    while (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
}

function appendLog(log) {
    const consoleBox = document.getElementById('log-console');
    if (!consoleBox) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${log.type || 'info'}`;
    entry.innerHTML = `
        <span class="log-time">[${log.timestamp || new Date().toLocaleTimeString()}]</span>
        <span class="log-msg">${escapeHtml(log.message)}</span>
    `;

    consoleBox.appendChild(entry);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function setupIpcListeners() {
    if (!window.zkApi) return;

    window.zkApi.onNewPunch(punch => {
        appendPunchRow(punch);
    });

    window.zkApi.onLog(log => {
        appendLog(log);
    });

    window.zkApi.onStatusChange(status => {
        const badge = document.getElementById(`badge-${status.deviceId}`);
        if (badge) {
            badge.innerHTML = status.online
                ? '<span class="badge-synced">Online</span>'
                : '<span style="color: var(--rose); font-size: 10px; font-weight: 800;">Offline</span>';
        }
    });
}

function setupEventListeners() {
    // Sync All Button
    document.getElementById('btn-sync-all').addEventListener('click', async () => {
        if (!window.zkApi) return;
        appendLog({ message: 'Triggered manual sync cycle...', type: 'info' });
        await window.zkApi.syncLogsNow();
    });

    // Auto-Sync Checkbox
    document.getElementById('chk-auto-sync').addEventListener('change', async (e) => {
        if (!window.zkApi) return;
        const enabled = e.target.checked;
        const interval = parseInt(document.getElementById('sel-sync-interval').value) || 15;
        appConfig.autoSyncEnabled = enabled;
        await window.zkApi.saveConfig(appConfig);
        if (enabled) {
            window.zkApi.startAutoSync(interval);
        } else {
            window.zkApi.stopAutoSync();
        }
    });

    // Auto-Sync Interval Change
    document.getElementById('sel-sync-interval').addEventListener('change', async (e) => {
        if (!window.zkApi) return;
        const interval = parseInt(e.target.value) || 15;
        appConfig.syncIntervalSec = interval;
        await window.zkApi.saveConfig(appConfig);
        if (appConfig.autoSyncEnabled) {
            window.zkApi.startAutoSync(interval);
        }
    });

    // Cloud Form Submit
    document.getElementById('cloud-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.zkApi) return;

        appConfig.cloudUrl = document.getElementById('inp-cloud-url').value.trim();
        appConfig.institutionId = document.getElementById('inp-inst-id').value.trim();
        appConfig.apiKey = document.getElementById('inp-api-key').value.trim();

        await window.zkApi.saveConfig(appConfig);
        alert('✓ Cloud Gateway Settings Saved Successfully!');
        appendLog({ message: `Cloud settings saved. Target: ${appConfig.cloudUrl}`, type: 'success' });
    });

    // Modal controls
    document.getElementById('btn-add-device').addEventListener('click', () => openDeviceModal());
    document.getElementById('btn-close-modal').addEventListener('click', () => closeDeviceModal());
    document.getElementById('btn-cancel-modal').addEventListener('click', () => closeDeviceModal());

    // Device Form Submit
    document.getElementById('device-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.zkApi) return;

        const id = document.getElementById('dev-id').value || `dev_${Date.now()}`;
        const name = document.getElementById('dev-name').value.trim();
        const ip = document.getElementById('dev-ip').value.trim();
        const port = parseInt(document.getElementById('dev-port').value) || 4370;
        const sn = document.getElementById('dev-sn').value.trim();

        const newDev = { id, name, ip, port, serialNumber: sn };
        const existingIdx = appConfig.devices.findIndex(d => d.id === id);

        if (existingIdx >= 0) {
            appConfig.devices[existingIdx] = newDev;
        } else {
            appConfig.devices.push(newDev);
        }

        await window.zkApi.saveConfig(appConfig);
        closeDeviceModal();
        renderDeviceList();
        appendLog({ message: `Device "${name}" (${ip}:${port}) saved.`, type: 'success' });
    });

    // Clear Logs
    document.getElementById('btn-clear-logs').addEventListener('click', () => {
        const consoleBox = document.getElementById('log-console');
        if (consoleBox) consoleBox.innerHTML = '';
    });
}

function openDeviceModal(devId = null) {
    const modal = document.getElementById('device-modal');
    const title = document.getElementById('modal-title');
    document.getElementById('device-form').reset();
    document.getElementById('dev-id').value = '';

    if (devId && appConfig) {
        const dev = appConfig.devices.find(d => d.id === devId);
        if (dev) {
            title.textContent = 'Edit ZKTeco Terminal';
            document.getElementById('dev-id').value = dev.id;
            document.getElementById('dev-name').value = dev.name;
            document.getElementById('dev-ip').value = dev.ip;
            document.getElementById('dev-port').value = dev.port || 4370;
            document.getElementById('dev-sn').value = dev.serialNumber || '';
        }
    } else {
        title.textContent = 'Add ZKTeco Terminal';
    }

    modal.style.display = 'flex';
}

function closeDeviceModal() {
    document.getElementById('device-modal').style.display = 'none';
}

window.openDeviceModal = openDeviceModal;

window.testDevice = async (devId) => {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;
    appendLog({ message: `Testing connection to ${dev.name} (${dev.ip})...`, type: 'info' });
    const res = await window.zkApi.testConnection(dev);
    if (res.success) {
        alert(`✅ ${res.message}`);
        appendLog({ message: res.message, type: 'success' });
    } else {
        alert(`❌ Connection failed: ${res.message}`);
        appendLog({ message: `Connection failed to ${dev.name}: ${res.message}`, type: 'error' });
    }
};

window.syncDevice = async (devId) => {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;
    appendLog({ message: `Syncing logs from ${dev.name}...`, type: 'info' });
    await window.zkApi.syncLogsNow(dev);
};

window.syncClock = async (devId) => {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;
    const res = await window.zkApi.syncTime(dev);
    alert(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
};

window.unlockDoor = async (devId) => {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;
    if (!confirm(`Trigger 5-second relay unlock for ${dev.name}?`)) return;
    const res = await window.zkApi.unlockDoor(dev, 5);
    alert(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
};

window.deleteDevice = async (devId) => {
    if (!confirm('Are you sure you want to delete this terminal?')) return;
    appConfig.devices = appConfig.devices.filter(d => d.id !== devId);
    await window.zkApi.saveConfig(appConfig);
    renderDeviceList();
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
