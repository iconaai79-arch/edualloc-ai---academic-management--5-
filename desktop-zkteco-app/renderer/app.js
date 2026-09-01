/**
 * EduAI ZKTeco Desktop Management Suite - Renderer Logic
 */

let appConfig = null;
let employees = [];
let categories = [];
let shifts = [];
let punchCount = 0;
let pendingSyncAction = null; // 'push' or 'pull'

document.addEventListener('DOMContentLoaded', async () => {
    setupTabNavigation();
    setupEventListeners();
    await loadInitialConfig();
    await loadCategories();
    await loadShifts();
    await loadEmployees();
    await loadRecentPunches();
    initReportFilters();
    setupIpcListeners();
});

/* ═══════════ NAVIGATION ═══════════ */
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
            if (targetPanel) {
                targetPanel.classList.add('active');
                onTabActivated(tabId);
            }
        });
    });
}

function onTabActivated(tabId) {
    if (tabId === 'employees') {
        renderEmployees();
    } else if (tabId === 'categories') {
        renderCategories();
    } else if (tabId === 'shifts') {
        renderShifts();
    } else if (tabId === 'reports') {
        generateReport();
    }
}

/* ═══════════ INITIAL LOAD & CONFIG ═══════════ */
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

/* ═══════════ EMPLOYEES / STAFF ═══════════ */
async function loadEmployees() {
    if (!window.zkApi) return;
    employees = await window.zkApi.getEmployees() || [];
    renderEmployees();
    populateEmployeeCategoryFilter();
}

function renderEmployees() {
    const tbody = document.getElementById('employees-tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('emp-search')?.value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('emp-category-filter')?.value || 'all';

    let filtered = employees.filter(emp => {
        const matchesSearch = !searchTerm || 
            (emp.name || '').toLowerCase().includes(searchTerm) ||
            (emp.pin || '').toLowerCase().includes(searchTerm) ||
            (emp.phone || '').toLowerCase().includes(searchTerm) ||
            (emp.nationalId || '').toLowerCase().includes(searchTerm);

        const matchesCat = categoryFilter === 'all' || emp.categoryId === categoryFilter;
        return matchesSearch && matchesCat;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">No staff members found matching your search.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(emp => {
        const cat = categories.find(c => c.id === emp.categoryId) || { name: 'General', color: '#64748b' };
        const shift = shifts.find(s => s.id === emp.shiftId) || { name: 'Day Shift', color: '#4f46e5' };
        const initials = (emp.name || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar" style="background: linear-gradient(135deg, ${cat.color || '#4f46e5'}, #06b6d4);">${initials}</div>
                        <div class="user-details">
                            <h5>${escapeHtml(emp.name)}</h5>
                            <p>${escapeHtml(emp.email || 'No email registered')}</p>
                        </div>
                    </div>
                </td>
                <td><span class="badge-pin">#${escapeHtml(emp.pin)}</span></td>
                <td>
                    <span class="badge-dept" style="background: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">
                        ● ${escapeHtml(cat.name)}
                    </span>
                </td>
                <td>
                    <span class="badge-shift" style="color: ${shift.color || '#fff'};">
                        🕒 ${escapeHtml(shift.name)}
                    </span>
                </td>
                <td>
                    <div style="font-size: 11px;">
                        <div>📞 ${escapeHtml(emp.phone || 'N/A')}</div>
                        <div style="color: var(--text-sub);">ID: ${escapeHtml(emp.nationalId || 'N/A')}</div>
                    </div>
                </td>
                <td><span style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(emp.cardNo || '--')}</span></td>
                <td>
                    <span class="badge-status ${emp.active !== false ? 'badge-ontime' : 'badge-absent'}">
                        ${emp.active !== false ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-secondary" onclick="editEmployee('${emp.id}')">✏️</button>
                        <button class="btn btn-sm btn-secondary" style="color: var(--rose);" onclick="deleteEmployee('${emp.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateEmployeeCategoryFilter() {
    const select = document.getElementById('emp-category-filter');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="all">All Departments / Categories</option>' +
        categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    select.value = currentVal || 'all';
}

function openEmployeeModal(emp = null) {
    const modal = document.getElementById('employee-modal');
    const title = document.getElementById('emp-modal-title');
    const form = document.getElementById('employee-form');

    // Populate dropdowns
    const catSelect = document.getElementById('emp-form-category');
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    const shiftSelect = document.getElementById('emp-form-shift');
    shiftSelect.innerHTML = shifts.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.startTime}-${s.endTime})</option>`).join('');

    if (emp) {
        title.textContent = 'Edit Staff Member';
        document.getElementById('emp-form-id').value = emp.id;
        document.getElementById('emp-form-name').value = emp.name || '';
        document.getElementById('emp-form-pin').value = emp.pin || '';
        document.getElementById('emp-form-category').value = emp.categoryId || categories[0]?.id;
        document.getElementById('emp-form-shift').value = emp.shiftId || shifts[0]?.id;
        document.getElementById('emp-form-phone').value = emp.phone || '';
        document.getElementById('emp-form-nid').value = emp.nationalId || '';
        document.getElementById('emp-form-card').value = emp.cardNo || '';
        document.getElementById('emp-form-privilege').value = emp.privilege || 'User';
    } else {
        title.textContent = 'Add Staff Member';
        form.reset();
        document.getElementById('emp-form-id').value = '';
        document.getElementById('emp-form-pin').value = String(employees.length + 101);
    }

    modal.style.display = 'flex';
}

window.editEmployee = function(empId) {
    const emp = employees.find(e => e.id === empId);
    if (emp) openEmployeeModal(emp);
};

window.deleteEmployee = async function(empId) {
    if (!confirm('Are you sure you want to remove this employee?')) return;
    await window.zkApi.deleteEmployee(empId);
    await loadEmployees();
};

/* ═══════════ CATEGORIES / DEPTS ═══════════ */
async function loadCategories() {
    if (!window.zkApi) return;
    categories = await window.zkApi.getCategories() || [];
    renderCategories();
    populateEmployeeCategoryFilter();
}

function renderCategories() {
    const container = document.getElementById('category-grid');
    if (!container) return;

    container.innerHTML = categories.map(cat => {
        const staffCount = employees.filter(e => e.categoryId === cat.id).length;
        return `
            <div class="category-card" style="border-top: 4px solid ${cat.color || '#4f46e5'};">
                <div class="card-top">
                    <div class="card-title-group">
                        <span class="badge-dept" style="background: ${cat.color}20; color: ${cat.color};">
                            ● ${escapeHtml(cat.name)}
                        </span>
                        <p>${escapeHtml(cat.description || 'No description provided.')}</p>
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">
                    <strong>${staffCount}</strong> assigned staff member${staffCount !== 1 ? 's' : ''}
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editCategory('${cat.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-secondary" style="color: var(--rose);" onclick="deleteCategory('${cat.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function openCategoryModal(cat = null) {
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('cat-modal-title');
    const form = document.getElementById('category-form');

    if (cat) {
        title.textContent = 'Edit Category / Department';
        document.getElementById('cat-form-id').value = cat.id;
        document.getElementById('cat-form-name').value = cat.name || '';
        document.getElementById('cat-form-desc').value = cat.description || '';
        document.getElementById('cat-form-color').value = cat.color || '#4f46e5';
        document.getElementById('cat-color-label').textContent = cat.color || '#4f46e5';
    } else {
        title.textContent = 'Add Category / Department';
        form.reset();
        document.getElementById('cat-form-id').value = '';
        document.getElementById('cat-form-color').value = '#4f46e5';
        document.getElementById('cat-color-label').textContent = '#4f46e5';
    }

    modal.style.display = 'flex';
}

window.editCategory = function(catId) {
    const cat = categories.find(c => c.id === catId);
    if (cat) openCategoryModal(cat);
};

window.deleteCategory = async function(catId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    await window.zkApi.deleteCategory(catId);
    await loadCategories();
};

/* ═══════════ WORK SHIFTS ═══════════ */
async function loadShifts() {
    if (!window.zkApi) return;
    shifts = await window.zkApi.getShifts() || [];
    renderShifts();
}

function renderShifts() {
    const container = document.getElementById('shift-grid');
    if (!container) return;

    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    container.innerHTML = shifts.map(shift => {
        const staffCount = employees.filter(e => e.shiftId === shift.id).length;
        const workDays = shift.workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

        return `
            <div class="shift-card" style="border-top: 4px solid ${shift.color || '#06b6d4'};">
                <div class="card-top">
                    <div class="card-title-group">
                        <h4>${escapeHtml(shift.name)}</h4>
                        <div class="time-slot-badge" style="margin-top: 8px;">
                            ${shift.startTime} — ${shift.endTime}
                        </div>
                    </div>
                </div>

                <div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                        Grace Window: <strong>${shift.gracePeriodMins || 15} Mins</strong> • Assigned: <strong>${staffCount} Staff</strong>
                    </div>
                    <div class="days-tags">
                        ${allDays.map(d => `
                            <span class="day-tag ${workDays.includes(d) ? 'active' : ''}">${d}</span>
                        `).join('')}
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editShift('${shift.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-secondary" style="color: var(--rose);" onclick="deleteShift('${shift.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function openShiftModal(shift = null) {
    const modal = document.getElementById('shift-modal');
    const title = document.getElementById('shift-modal-title');
    const form = document.getElementById('shift-form');

    if (shift) {
        title.textContent = 'Edit Work Shift';
        document.getElementById('shift-form-id').value = shift.id;
        document.getElementById('shift-form-name').value = shift.name || '';
        document.getElementById('shift-form-start').value = shift.startTime || '07:30';
        document.getElementById('shift-form-end').value = shift.endTime || '16:30';
        document.getElementById('shift-form-grace').value = shift.gracePeriodMins || 15;
        document.getElementById('shift-form-color').value = shift.color || '#06b6d4';

        const workDays = shift.workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        document.querySelectorAll('input[name="workdays"]').forEach(cb => {
            cb.checked = workDays.includes(cb.value);
        });
    } else {
        title.textContent = 'Add Work Shift';
        form.reset();
        document.getElementById('shift-form-id').value = '';
        document.getElementById('shift-form-start').value = '07:30';
        document.getElementById('shift-form-end').value = '16:30';
        document.getElementById('shift-form-grace').value = 15;
        document.getElementById('shift-form-color').value = '#06b6d4';
        document.querySelectorAll('input[name="workdays"]').forEach(cb => {
            cb.checked = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(cb.value);
        });
    }

    modal.style.display = 'flex';
}

window.editShift = function(shiftId) {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) openShiftModal(shift);
};

window.deleteShift = async function(shiftId) {
    if (!confirm('Are you sure you want to delete this shift schedule?')) return;
    await window.zkApi.deleteShift(shiftId);
    await loadShifts();
};

/* ═══════════ ATTENDANCE REPORTS & ANALYTICS ═══════════ */
function initReportFilters() {
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('rep-start-date');
    const endDateInput = document.getElementById('rep-end-date');

    if (startDateInput) startDateInput.value = today;
    if (endDateInput) endDateInput.value = today;

    // Populate Category filter
    const catSelect = document.getElementById('rep-category-filter');
    if (catSelect) {
        catSelect.innerHTML = '<option value="all">All Departments</option>' +
            categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    }

    // Populate Shift filter
    const shiftSelect = document.getElementById('rep-shift-filter');
    if (shiftSelect) {
        shiftSelect.innerHTML = '<option value="all">All Shifts</option>' +
            shifts.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    }
}

async function generateReport() {
    if (!window.zkApi) return;

    const startDate = document.getElementById('rep-start-date')?.value;
    const endDate = document.getElementById('rep-end-date')?.value;
    const categoryId = document.getElementById('rep-category-filter')?.value;
    const shiftId = document.getElementById('rep-shift-filter')?.value;
    const status = document.getElementById('rep-status-filter')?.value;

    const report = await window.zkApi.getAttendanceReport({
        startDate,
        endDate,
        categoryId,
        shiftId,
        status
    });

    // Update KPI Cards
    if (report && report.summary) {
        document.getElementById('kpi-total-staff').textContent = report.summary.totalStaff;
        document.getElementById('kpi-present').textContent = report.summary.presentCount;
        document.getElementById('kpi-ontime-rate').textContent = `${report.summary.onTimeRate}%`;
        document.getElementById('kpi-late').textContent = report.summary.lateCount;
        document.getElementById('kpi-hours').textContent = `${report.summary.totalHours} hrs`;
    }

    // Update Print Header
    const printDate = document.getElementById('print-date-range');
    if (printDate) printDate.textContent = `Report Period: ${startDate} to ${endDate}`;

    // Render Table
    const tbody = document.getElementById('report-tbody');
    if (!tbody) return;

    if (!report || !report.rows || report.rows.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10">No attendance records found for the selected filter criteria.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = report.rows.map(row => {
        let statusClass = 'badge-absent';
        if (row.status === 'On Time') statusClass = 'badge-ontime';
        else if (row.status === 'Late') statusClass = 'badge-late';
        else if (row.status === 'Present') statusClass = 'badge-ontime';

        return `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(row.date)}</td>
                <td>
                    <div class="user-details">
                        <h5>${escapeHtml(row.name)}</h5>
                    </div>
                </td>
                <td><span class="badge-pin">#${escapeHtml(row.pin)}</span></td>
                <td>
                    <span class="badge-dept" style="background: ${row.categoryColor}20; color: ${row.categoryColor};">
                        ● ${escapeHtml(row.category)}
                    </span>
                </td>
                <td><span class="badge-shift">${escapeHtml(row.shift)}</span></td>
                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--emerald);">${row.inTime}</td>
                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--amber);">${row.outTime}</td>
                <td><strong>${row.workHours}</strong> hrs</td>
                <td style="color: ${row.lateMinutes > 0 ? 'var(--rose)' : 'var(--text-muted)'}; font-weight: 700;">
                    ${row.lateMinutes > 0 ? `+${row.lateMinutes}m` : '--'}
                </td>
                <td>
                    <span class="badge-status ${statusClass}">${escapeHtml(row.status)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

async function exportReportCsv() {
    if (!window.zkApi) return;
    const startDate = document.getElementById('rep-start-date')?.value;
    const endDate = document.getElementById('rep-end-date')?.value;
    const categoryId = document.getElementById('rep-category-filter')?.value;
    const shiftId = document.getElementById('rep-shift-filter')?.value;
    const status = document.getElementById('rep-status-filter')?.value;

    const csvContent = await window.zkApi.exportReportCsv({
        startDate,
        endDate,
        categoryId,
        shiftId,
        status
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EduAI_Attendance_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function printReport() {
    window.print();
}

/* ═══════════ DEVICES / HARDWARE TERMINALS ═══════════ */
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
            <div class="card-top">
                <div class="card-title-group">
                    <h4>${escapeHtml(dev.name)}</h4>
                    <p class="device-ip" style="font-family: var(--font-mono);">${escapeHtml(dev.ip)}:${dev.port || 4370}</p>
                </div>
                <div class="device-badge" id="badge-${dev.id}">
                    <span class="badge-verify">Port 4370</span>
                </div>
            </div>

            <div style="font-size: 11px; color: var(--text-muted);">
                SN: <strong>${escapeHtml(dev.serialNumber || 'ZK-STANDALONE')}</strong>
            </div>

            <div class="card-actions" style="flex-wrap: wrap;">
                <button class="btn btn-sm btn-secondary" onclick="testDevice('${dev.id}')">⚡ Test Link</button>
                <button class="btn btn-sm btn-secondary" onclick="syncDevice('${dev.id}')">🔄 Sync Logs</button>
                <button class="btn btn-sm btn-secondary" onclick="syncClock('${dev.id}')">🕒 Set Time</button>
                <button class="btn btn-sm btn-secondary" onclick="unlockDoor('${dev.id}')">🚪 Unlock</button>
                <button class="btn btn-sm btn-secondary" style="color: var(--rose);" onclick="deleteDevice('${dev.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openDeviceModal(dev = null) {
    const modal = document.getElementById('device-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('device-form');

    if (dev) {
        title.textContent = 'Edit ZKTeco Terminal';
        document.getElementById('dev-id').value = dev.id;
        document.getElementById('dev-name').value = dev.name;
        document.getElementById('dev-ip').value = dev.ip;
        document.getElementById('dev-port').value = dev.port || 4370;
        document.getElementById('dev-sn').value = dev.serialNumber || '';
    } else {
        title.textContent = 'Add ZKTeco Terminal';
        form.reset();
        document.getElementById('dev-id').value = '';
        document.getElementById('dev-port').value = 4370;
    }

    modal.style.display = 'flex';
}

window.openDeviceModal = openDeviceModal;

window.testDevice = async function(devId) {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;

    appendLog({ type: 'info', message: `Testing link to ${dev.name} (${dev.ip})...` });
    const res = await window.zkApi.testConnection(dev);

    if (res.success) {
        appendLog({ type: 'success', message: res.message });
        alert(`✓ ${res.message}`);
    } else {
        appendLog({ type: 'error', message: `Connection test failed: ${res.message}` });
        alert(`❌ Connection failed: ${res.message}`);
    }
};

window.syncDevice = async function(devId) {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;

    appendLog({ type: 'info', message: `Manually triggering sync for ${dev.name}...` });
    await window.zkApi.syncLogsNow(dev);
    await generateReport();
};

window.syncClock = async function(devId) {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;

    const res = await window.zkApi.syncTime(dev);
    alert(res.message);
};

window.unlockDoor = async function(devId) {
    const dev = appConfig.devices.find(d => d.id === devId);
    if (!dev || !window.zkApi) return;

    const res = await window.zkApi.unlockDoor(dev, 5);
    alert(res.message);
};

window.deleteDevice = async function(devId) {
    if (!confirm('Are you sure you want to remove this terminal configuration?')) return;
    appConfig.devices = appConfig.devices.filter(d => d.id !== devId);
    await window.zkApi.saveConfig(appConfig);
    renderDeviceList();
};

/* ═══════════ TERMINAL PUSH / PULL USER MODAL ═══════════ */
function openSyncTerminalModal(action) {
    if (!appConfig.devices || appConfig.devices.length === 0) {
        alert('Please configure at least one ZKTeco terminal in the "Terminals" tab first.');
        return;
    }

    pendingSyncAction = action;
    const modal = document.getElementById('sync-select-modal');
    const title = document.getElementById('sync-select-title');
    const prompt = document.getElementById('sync-select-prompt');
    const select = document.getElementById('sync-target-device');

    select.innerHTML = appConfig.devices.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${d.ip})</option>`).join('');

    if (action === 'push') {
        title.textContent = 'Upload Staff to Terminal';
        prompt.textContent = `Upload all ${employees.length} local staff profiles and PINs to the selected ZKTeco terminal:`;
    } else {
        title.textContent = 'Download Users from Terminal';
        prompt.textContent = 'Download all enrolled biometric user PINs and names from the selected terminal into this database:';
    }

    modal.style.display = 'flex';
}

/* ═══════════ EVENT LISTENERS ═══════════ */
function setupEventListeners() {
    // Top Bar Sync All
    document.getElementById('btn-sync-all')?.addEventListener('click', async () => {
        appendLog({ type: 'info', message: 'Manual Sync All triggered.' });
        await window.zkApi.syncLogsNow({});
        await generateReport();
    });

    // Employee Buttons
    document.getElementById('btn-add-employee')?.addEventListener('click', () => openEmployeeModal());
    document.getElementById('btn-terminal-push')?.addEventListener('click', () => openSyncTerminalModal('push'));
    document.getElementById('btn-terminal-pull')?.addEventListener('click', () => openSyncTerminalModal('pull'));
    document.getElementById('btn-cloud-staff-sync')?.addEventListener('click', async () => {
        appendLog({ type: 'info', message: 'Syncing staff registry from EduAI Cloud...' });
        const res = await window.zkApi.syncCloudStaff();
        if (res.success) {
            appendLog({ type: 'success', message: `✓ Cloud staff sync complete (${res.count} staff records).` });
            alert(`✓ Successfully synchronized ${res.count} staff members from EduAI Cloud!`);
            await loadEmployees();
        } else {
            appendLog({ type: 'error', message: `Cloud staff sync failed: ${res.message}` });
            alert(`❌ Cloud Sync Failed: ${res.message}`);
        }
    });

    // Employee Search & Filter
    document.getElementById('emp-search')?.addEventListener('input', renderEmployees);
    document.getElementById('emp-category-filter')?.addEventListener('change', renderEmployees);

    // Categories & Shifts Buttons
    document.getElementById('btn-add-category')?.addEventListener('click', () => openCategoryModal());
    document.getElementById('btn-add-shift')?.addEventListener('click', () => openShiftModal());
    document.getElementById('btn-add-device')?.addEventListener('click', () => openDeviceModal());

    // Color picker label sync
    document.getElementById('cat-form-color')?.addEventListener('input', (e) => {
        document.getElementById('cat-color-label').textContent = e.target.value;
    });

    // Reports Toolbar Buttons
    document.getElementById('btn-generate-report')?.addEventListener('click', generateReport);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportReportCsv);
    document.getElementById('btn-print-report')?.addEventListener('click', printReport);

    // Modal Close Handlers
    document.getElementById('btn-close-modal')?.addEventListener('click', () => document.getElementById('device-modal').style.display = 'none');
    document.getElementById('btn-cancel-modal')?.addEventListener('click', () => document.getElementById('device-modal').style.display = 'none');

    document.getElementById('btn-close-emp-modal')?.addEventListener('click', () => document.getElementById('employee-modal').style.display = 'none');
    document.getElementById('btn-cancel-emp-modal')?.addEventListener('click', () => document.getElementById('employee-modal').style.display = 'none');

    document.getElementById('btn-close-cat-modal')?.addEventListener('click', () => document.getElementById('category-modal').style.display = 'none');
    document.getElementById('btn-cancel-cat-modal')?.addEventListener('click', () => document.getElementById('category-modal').style.display = 'none');

    document.getElementById('btn-close-shift-modal')?.addEventListener('click', () => document.getElementById('shift-modal').style.display = 'none');
    document.getElementById('btn-cancel-shift-modal')?.addEventListener('click', () => document.getElementById('shift-modal').style.display = 'none');

    document.getElementById('btn-close-sync-select')?.addEventListener('click', () => document.getElementById('sync-select-modal').style.display = 'none');
    document.getElementById('btn-cancel-sync-select')?.addEventListener('click', () => document.getElementById('sync-select-modal').style.display = 'none');

    // Confirm Push/Pull Device Action
    document.getElementById('btn-confirm-sync-action')?.addEventListener('click', async () => {
        const devId = document.getElementById('sync-target-device')?.value;
        const dev = appConfig.devices.find(d => d.id === devId);
        document.getElementById('sync-select-modal').style.display = 'none';
        if (!dev) return;

        if (pendingSyncAction === 'push') {
            appendLog({ type: 'info', message: `Uploading staff profiles to ${dev.name}...` });
            const res = await window.zkApi.pushUsersToDevice(dev, employees);
            if (res.success) {
                alert(`✓ Uploaded ${res.count} staff records to ${dev.name}!`);
            } else {
                alert(`❌ Upload failed: ${res.message}`);
            }
        } else if (pendingSyncAction === 'pull') {
            appendLog({ type: 'info', message: `Downloading enrolled users from ${dev.name}...` });
            const res = await window.zkApi.pullUsersFromDevice(dev);
            if (res.success) {
                alert(`✓ Downloaded ${res.count} user records from ${dev.name}!`);
                await loadEmployees();
            } else {
                alert(`❌ Download failed: ${res.message}`);
            }
        }
    });

    // Form Submits
    document.getElementById('employee-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const empData = {
            id: document.getElementById('emp-form-id').value || undefined,
            name: document.getElementById('emp-form-name').value,
            pin: document.getElementById('emp-form-pin').value,
            categoryId: document.getElementById('emp-form-category').value,
            shiftId: document.getElementById('emp-form-shift').value,
            phone: document.getElementById('emp-form-phone').value,
            nationalId: document.getElementById('emp-form-nid').value,
            cardNo: document.getElementById('emp-form-card').value,
            privilege: document.getElementById('emp-form-privilege').value,
            active: true
        };
        await window.zkApi.saveEmployee(empData);
        document.getElementById('employee-modal').style.display = 'none';
        await loadEmployees();
    });

    document.getElementById('category-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catData = {
            id: document.getElementById('cat-form-id').value || undefined,
            name: document.getElementById('cat-form-name').value,
            description: document.getElementById('cat-form-desc').value,
            color: document.getElementById('cat-form-color').value
        };
        await window.zkApi.saveCategory(catData);
        document.getElementById('category-modal').style.display = 'none';
        await loadCategories();
    });

    document.getElementById('shift-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedDays = Array.from(document.querySelectorAll('input[name="workdays"]:checked')).map(cb => cb.value);
        const shiftData = {
            id: document.getElementById('shift-form-id').value || undefined,
            name: document.getElementById('shift-form-name').value,
            startTime: document.getElementById('shift-form-start').value,
            endTime: document.getElementById('shift-form-end').value,
            gracePeriodMins: Number(document.getElementById('shift-form-grace').value) || 15,
            color: document.getElementById('shift-form-color').value,
            workDays: selectedDays
        };
        await window.zkApi.saveShift(shiftData);
        document.getElementById('shift-modal').style.display = 'none';
        await loadShifts();
    });

    document.getElementById('device-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('dev-id').value || 'dev_' + Date.now();
        const devData = {
            id,
            name: document.getElementById('dev-name').value,
            ip: document.getElementById('dev-ip').value,
            port: Number(document.getElementById('dev-port').value) || 4370,
            serialNumber: document.getElementById('dev-sn').value
        };

        const existingIdx = appConfig.devices.findIndex(d => d.id === id);
        if (existingIdx >= 0) {
            appConfig.devices[existingIdx] = devData;
        } else {
            appConfig.devices.push(devData);
        }

        await window.zkApi.saveConfig(appConfig);
        document.getElementById('device-modal').style.display = 'none';
        renderDeviceList();
    });

    // Cloud Form Submit
    document.getElementById('cloud-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        appConfig.cloudUrl = document.getElementById('inp-cloud-url').value;
        appConfig.institutionId = document.getElementById('inp-inst-id').value;
        appConfig.apiKey = document.getElementById('inp-api-key').value;

        await window.zkApi.saveConfig(appConfig);
        appendLog({ type: 'success', message: 'Cloud gateway settings saved.' });
        alert('✓ Cloud Gateway settings saved successfully!');
    });

    // Auto-Sync Switch & Interval
    document.getElementById('chk-auto-sync')?.addEventListener('change', async (e) => {
        appConfig.autoSyncEnabled = e.target.checked;
        await window.zkApi.saveConfig(appConfig);
    });

    document.getElementById('sel-sync-interval')?.addEventListener('change', async (e) => {
        appConfig.syncIntervalSec = Number(e.target.value) || 15;
        await window.zkApi.saveConfig(appConfig);
    });

    document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
        document.getElementById('log-console').innerHTML = '';
    });
}

/* ═══════════ LIVE STREAM PUNCHES ═══════════ */
async function loadRecentPunches() {
    if (!window.zkApi) return;
    const punches = await window.zkApi.getRecentPunches();
    if (Array.isArray(punches) && punches.length > 0) {
        const tbody = document.getElementById('live-punch-tbody');
        tbody.innerHTML = '';
        punches.forEach(p => appendPunchRow(p));
    }
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

    // Find employee match if available
    const emp = employees.find(e => String(e.pin).trim() === String(punch.pin).trim());
    const cat = emp ? categories.find(c => c.id === emp.categoryId) : null;
    const staffName = emp ? emp.name : `Unassigned PIN #${punch.pin}`;
    const initials = staffName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <div class="user-cell">
                <div class="user-avatar" style="background: ${cat ? cat.color : '#4f46e5'};">${initials}</div>
                <div class="user-details">
                    <h5>${escapeHtml(staffName)}</h5>
                    <span class="badge-pin">PIN #${escapeHtml(punch.pin)}</span>
                </div>
            </div>
        </td>
        <td>
            ${cat ? `
                <span class="badge-dept" style="background: ${cat.color}20; color: ${cat.color};">
                    ● ${escapeHtml(cat.name)}
                </span>
            ` : '<span style="color: var(--text-sub);">General</span>'}
        </td>
        <td style="font-family: var(--font-mono); font-size: 12px; font-weight: 700;">${escapeHtml(punch.time)}</td>
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

/* ═══════════ IPC LISTENERS ═══════════ */
function setupIpcListeners() {
    if (!window.zkApi) return;

    window.zkApi.onNewPunch((punch) => {
        appendPunchRow(punch);
    });

    window.zkApi.onLog((log) => {
        appendLog(log);
    });

    window.zkApi.onStatusChange(({ deviceId, online }) => {
        const badge = document.getElementById(`badge-${deviceId}`);
        if (badge) {
            badge.innerHTML = online 
                ? `<span class="badge-ontime" style="font-size: 10px; font-weight: 800;">ONLINE</span>`
                : `<span class="badge-late" style="font-size: 10px; font-weight: 800;">OFFLINE</span>`;
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
