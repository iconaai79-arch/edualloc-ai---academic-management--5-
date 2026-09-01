/**
 * EduAI Cloud Synchronization Service
 * 
 * Securely batches and pushes attendance records from local ZKTeco devices
 * to the EduAI Cloud Webhook (/api/zkteco-webhook & /api/records).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class CloudSyncService {
    constructor(config = {}) {
        this.cloudUrl = config.cloudUrl || 'https://portal.eduai.co.ke';
        this.institutionId = config.institutionId || '';
        this.apiKey = config.apiKey || '';
        this.storagePath = path.join(__dirname, 'storage.json');
        this.syncedLogs = new Set();
        this.offlineQueue = [];
        this.employees = [];
        this.categories = [];
        this.shifts = [];
        this.allPunchLogs = [];
        this.loadStorage();
    }

    loadStorage() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
                if (Array.isArray(data.syncedLogKeys)) {
                    this.syncedLogs = new Set(data.syncedLogKeys);
                }
                if (Array.isArray(data.offlineQueue)) {
                    this.offlineQueue = data.offlineQueue;
                }
                if (Array.isArray(data.employees)) {
                    this.employees = data.employees;
                }
                if (Array.isArray(data.categories)) {
                    this.categories = data.categories;
                }
                if (Array.isArray(data.shifts)) {
                    this.shifts = data.shifts;
                }
                if (Array.isArray(data.allPunchLogs)) {
                    this.allPunchLogs = data.allPunchLogs;
                }
            }
        } catch (e) {
            console.warn('[CloudSync] Storage load error:', e.message);
        }

        // Initialize default categories if empty
        if (this.categories.length === 0) {
            this.categories = [
                { id: 'cat_teaching', name: 'Teaching Faculty', color: '#4f46e5', description: 'Academic & classroom teachers' },
                { id: 'cat_admin', name: 'Administration & HR', color: '#06b6d4', description: 'Principals, accountants & clerks' },
                { id: 'cat_support', name: 'Support & Ground Staff', color: '#10b981', description: 'Facilities, cleaners & maintenance' },
                { id: 'cat_security', name: 'Security & Gate Guard', color: '#f59e0b', description: 'Gate access and security patrol' },
                { id: 'cat_boarding', name: 'Boarding Masters', color: '#ec4899', description: 'Dormitory care and student welfare' },
                { id: 'cat_catering', name: 'Kitchen & Catering', color: '#8b5cf6', description: 'Dining hall and kitchen personnel' },
                { id: 'cat_transport', name: 'Drivers & Transport', color: '#3b82f6', description: 'School bus operators' }
            ];
        }

        // Initialize default shifts if empty
        if (this.shifts.length === 0) {
            this.shifts = [
                { id: 'shift_day', name: 'Standard Day Shift', startTime: '07:30', endTime: '16:30', gracePeriodMins: 15, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], color: '#4f46e5' },
                { id: 'shift_morning', name: 'Early Morning Shift', startTime: '06:00', endTime: '14:00', gracePeriodMins: 10, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], color: '#06b6d4' },
                { id: 'shift_evening', name: 'Afternoon / Evening', startTime: '14:00', endTime: '22:00', gracePeriodMins: 10, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], color: '#8b5cf6' },
                { id: 'shift_night', name: 'Night Guard Shift', startTime: '18:00', endTime: '06:00', gracePeriodMins: 15, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], color: '#f59e0b' },
                { id: 'shift_boarding', name: 'Boarding Duty Shift', startTime: '06:30', endTime: '21:30', gracePeriodMins: 20, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], color: '#ec4899' }
            ];
        }

        // Initialize sample staff if empty
        if (this.employees.length === 0) {
            this.employees = [
                { id: 'emp_1', pin: '101', name: 'James Mwangi', categoryId: 'cat_teaching', shiftId: 'shift_day', phone: '0712345678', email: 'j.mwangi@eduai.co.ke', nationalId: '28491029', cardNo: '10049281', active: true, privilege: 'User' },
                { id: 'emp_2', pin: '102', name: 'Grace Akinyi', categoryId: 'cat_teaching', shiftId: 'shift_day', phone: '0723456789', email: 'g.akinyi@eduai.co.ke', nationalId: '30491823', cardNo: '10049282', active: true, privilege: 'User' },
                { id: 'emp_3', pin: '103', name: 'Samuel Kiprop', categoryId: 'cat_admin', shiftId: 'shift_day', phone: '0734567890', email: 's.kiprop@eduai.co.ke', nationalId: '25910283', cardNo: '10049283', active: true, privilege: 'Admin' },
                { id: 'emp_4', pin: '104', name: 'Boniface Omondi', categoryId: 'cat_security', shiftId: 'shift_night', phone: '0745678901', email: 'b.omondi@eduai.co.ke', nationalId: '22849102', cardNo: '10049284', active: true, privilege: 'User' },
                { id: 'emp_5', pin: '105', name: 'Mary Wambui', categoryId: 'cat_catering', shiftId: 'shift_morning', phone: '0756789012', email: 'm.wambui@eduai.co.ke', nationalId: '31948201', cardNo: '10049285', active: true, privilege: 'User' }
            ];
        }

        this.saveStorage();
    }

    saveStorage() {
        try {
            // Keep memory manageable - retain last 50,000 punch keys and 5,000 log records
            const syncedArr = Array.from(this.syncedLogs).slice(-50000);
            const data = {
                syncedLogKeys: syncedArr,
                offlineQueue: this.offlineQueue,
                employees: this.employees,
                categories: this.categories,
                shifts: this.shifts,
                allPunchLogs: this.allPunchLogs.slice(-10000),
                lastSavedAt: new Date().toISOString()
            };
            fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.warn('[CloudSync] Storage save error:', e.message);
        }
    }

    /* ═══════════ EMPLOYEE CRUD ═══════════ */
    getEmployees() {
        return this.employees;
    }

    saveEmployee(emp) {
        if (!emp.id) {
            emp.id = 'emp_' + Date.now();
        }
        emp.pin = String(emp.pin || '').trim();
        const index = this.employees.findIndex(e => e.id === emp.id || (emp.pin && e.pin === emp.pin));
        if (index >= 0) {
            this.employees[index] = { ...this.employees[index], ...emp };
        } else {
            this.employees.push(emp);
        }
        this.saveStorage();
        return emp;
    }

    deleteEmployee(id) {
        this.employees = this.employees.filter(e => e.id !== id && e.pin !== id);
        this.saveStorage();
        return true;
    }

    updateEmployeeBiometrics(pin, fingerName, remove = false) {
        const emp = this.employees.find(e => String(e.pin).trim() === String(pin).trim());
        if (!emp) return null;

        if (!Array.isArray(emp.enrolledFingers)) {
            emp.enrolledFingers = [];
        }

        if (remove) {
            emp.enrolledFingers = emp.enrolledFingers.filter(f => f !== fingerName);
            emp.fingerprintEnrolled = emp.enrolledFingers.length > 0;
        } else {
            if (!emp.enrolledFingers.includes(fingerName)) {
                emp.enrolledFingers.push(fingerName);
            }
            emp.fingerprintEnrolled = true;
        }

        emp.lastBiometricUpdate = new Date().toISOString();
        this.saveStorage();
        return emp;
    }

    /* ═══════════ CATEGORY CRUD ═══════════ */
    getCategories() {
        return this.categories;
    }

    saveCategory(cat) {
        if (!cat.id) {
            cat.id = 'cat_' + Date.now();
        }
        const index = this.categories.findIndex(c => c.id === cat.id);
        if (index >= 0) {
            this.categories[index] = { ...this.categories[index], ...cat };
        } else {
            this.categories.push(cat);
        }
        this.saveStorage();
        return cat;
    }

    deleteCategory(id) {
        this.categories = this.categories.filter(c => c.id !== id);
        this.saveStorage();
        return true;
    }

    /* ═══════════ SHIFTS CRUD ═══════════ */
    getShifts() {
        return this.shifts;
    }

    saveShift(shift) {
        if (!shift.id) {
            shift.id = 'shift_' + Date.now();
        }
        const index = this.shifts.findIndex(s => s.id === shift.id);
        if (index >= 0) {
            this.shifts[index] = { ...this.shifts[index], ...shift };
        } else {
            this.shifts.push(shift);
        }
        this.saveStorage();
        return shift;
    }

    deleteShift(id) {
        this.shifts = this.shifts.filter(s => s.id !== id);
        this.saveStorage();
        return true;
    }

    /* ═══════════ RECORD LOCAL PUNCHES ═══════════ */
    recordLocalPunch(punch, deviceName = 'Terminal') {
        const punchRecord = {
            ...punch,
            deviceName: punch.deviceName || deviceName,
            recordedAt: new Date().toISOString()
        };
        this.allPunchLogs.unshift(punchRecord);
        if (this.allPunchLogs.length > 10000) {
            this.allPunchLogs = this.allPunchLogs.slice(0, 10000);
        }
        this.saveStorage();
    }

    /* ═══════════ ATTENDANCE REPORTS & ANALYTICS ═══════════ */
    getAttendanceReport(filters = {}) {
        const { startDate, endDate, categoryId, shiftId, employeeId, status } = filters;

        // Default to today if no date range
        const todayStr = new Date().toISOString().split('T')[0];
        const start = startDate || todayStr;
        const end = endDate || todayStr;

        // Filter employees
        let targetEmployees = [...this.employees];
        if (employeeId && employeeId !== 'all') {
            targetEmployees = targetEmployees.filter(e => e.id === employeeId || e.pin === employeeId);
        }
        if (categoryId && categoryId !== 'all') {
            targetEmployees = targetEmployees.filter(e => e.categoryId === categoryId);
        }
        if (shiftId && shiftId !== 'all') {
            targetEmployees = targetEmployees.filter(e => e.shiftId === shiftId);
        }

        // Generate date list between start and end
        const dates = [];
        let curr = new Date(start);
        const last = new Date(end);
        while (curr <= last) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        const rows = [];
        let presentCount = 0;
        let onTimeCount = 0;
        let lateCount = 0;
        let totalHoursLogged = 0;

        dates.forEach(dateStr => {
            targetEmployees.forEach(emp => {
                const category = this.categories.find(c => c.id === emp.categoryId) || { name: 'General Staff', color: '#64748b' };
                const shift = this.shifts.find(s => s.id === emp.shiftId) || { name: 'Standard Day', startTime: '08:00', endTime: '17:00', gracePeriodMins: 15 };

                // Find punches for this employee on this date
                const dayPunches = this.allPunchLogs.filter(p => {
                    const punchPin = String(p.pin).trim();
                    const punchDate = (p.time || '').split(' ')[0];
                    return punchPin === String(emp.pin).trim() && punchDate === dateStr;
                }).sort((a, b) => (a.time > b.time ? 1 : -1));

                let inTime = '--:--';
                let outTime = '--:--';
                let workHours = 0;
                let lateMins = 0;
                let attStatus = 'Absent';

                if (dayPunches.length > 0) {
                    const firstPunch = dayPunches[0];
                    const lastPunch = dayPunches[dayPunches.length - 1];

                    inTime = (firstPunch.time.split(' ')[1] || '').substring(0, 5);
                    if (dayPunches.length > 1) {
                        outTime = (lastPunch.time.split(' ')[1] || '').substring(0, 5);
                    }

                    // Calculate work hours
                    if (inTime !== '--:--' && outTime !== '--:--') {
                        const [inH, inM] = inTime.split(':').map(Number);
                        const [outH, outM] = outTime.split(':').map(Number);
                        const totalMins = (outH * 60 + outM) - (inH * 60 + inM);
                        workHours = totalMins > 0 ? parseFloat((totalMins / 60).toFixed(2)) : 0;
                    }

                    // Check lateness vs shift
                    if (shift && shift.startTime && inTime !== '--:--') {
                        const [shiftH, shiftM] = shift.startTime.split(':').map(Number);
                        const [inH, inM] = inTime.split(':').map(Number);
                        const shiftExpectedMins = shiftH * 60 + shiftM + (shift.gracePeriodMins || 0);
                        const actualInMins = inH * 60 + inM;

                        if (actualInMins > shiftExpectedMins) {
                            lateMins = actualInMins - (shiftH * 60 + shiftM);
                            attStatus = 'Late';
                            lateCount++;
                        } else {
                            attStatus = 'On Time';
                            onTimeCount++;
                        }
                    } else {
                        attStatus = 'Present';
                        onTimeCount++;
                    }

                    presentCount++;
                    totalHoursLogged += workHours;
                }

                if (status && status !== 'all') {
                    if (status === 'present' && attStatus === 'Absent') return;
                    if (status === 'late' && attStatus !== 'Late') return;
                    if (status === 'ontime' && attStatus !== 'On Time') return;
                    if (status === 'absent' && attStatus !== 'Absent') return;
                }

                rows.push({
                    date: dateStr,
                    employeeId: emp.id,
                    pin: emp.pin,
                    name: emp.name,
                    category: category.name,
                    categoryColor: category.color,
                    shift: shift.name,
                    inTime,
                    outTime,
                    workHours,
                    lateMinutes: lateMins,
                    status: attStatus,
                    punchCount: dayPunches.length,
                    phone: emp.phone || ''
                });
            });
        });

        const totalRecords = rows.length;
        const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 0;

        return {
            summary: {
                totalStaff: targetEmployees.length,
                totalRecords,
                presentCount,
                onTimeCount,
                lateCount,
                absentCount: totalRecords - presentCount,
                onTimeRate,
                totalHours: parseFloat(totalHoursLogged.toFixed(1))
            },
            rows
        };
    }

    /**
     * Generate unique signature key for a punch record
     */
    static getPunchKey(punch, serialNumber = 'DEV_1') {
        return `${serialNumber}_${punch.pin}_${punch.time}`;
    }

    /**
     * Send HTTP/HTTPS request with JSON payload
     */
    postJson(urlPath, payload) {
        return new Promise((resolve, reject) => {
            const fullUrl = new URL(urlPath, this.cloudUrl);
            const isHttps = fullUrl.protocol === 'https:';
            const client = isHttps ? https : http;

            const postData = JSON.stringify(payload);
            const options = {
                hostname: fullUrl.hostname,
                port: fullUrl.port || (isHttps ? 443 : 80),
                path: fullUrl.pathname + fullUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
                    'X-Institution-Id': this.institutionId
                },
                timeout: 10000
            };

            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: body });
                    }
                });
            });

            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Cloud sync request timed out (10s)'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Send heartbeat to cloud
     */
    async sendHeartbeat(serialNumber, deviceName, ipAddress) {
        try {
            const url = `/api/zkteco-webhook?action=heartbeat&SN=${encodeURIComponent(serialNumber)}&institutionId=${encodeURIComponent(this.institutionId)}`;
            const payload = {
                serialNumber,
                deviceName,
                ipAddress,
                timestamp: new Date().toISOString(),
                source: 'desktop_sync_agent'
            };
            return await this.postJson(url, payload);
        } catch (e) {
            console.warn('[CloudSync] Heartbeat error:', e.message);
            return null;
        }
    }

    /**
     * Push new attendance punches to EduAI Cloud
     */
    async syncAttendanceLogs(punches, serialNumber = 'DEV_1') {
        const newPunches = punches.filter((p) => {
            const key = CloudSyncService.getPunchKey(p, serialNumber);
            return !this.syncedLogs.has(key);
        });

        if (newPunches.length === 0) {
            return { count: 0, message: 'All punches already synchronized.' };
        }

        // Format into ZKTeco ADMS ATTLOG lines (Tab separated)
        // PIN \t TIMESTAMP \t STATUS \t VERIFY_MODE
        const tabSeparatedLines = newPunches.map(p => 
            `${p.pin}\t${p.time}\t${p.status ?? 0}\t${p.verifyMode ?? 1}\t0\t0`
        ).join('\n');

        const webhookPath = `/api/zkteco-webhook?SN=${encodeURIComponent(serialNumber)}&institutionId=${encodeURIComponent(this.institutionId)}&source=desktop_agent`;

        try {
            const res = await this.postJson(webhookPath, {
                rawLog: tabSeparatedLines,
                punches: newPunches,
                serialNumber,
                institutionId: this.institutionId
            });

            // Mark punches as synced
            newPunches.forEach((p) => {
                const key = CloudSyncService.getPunchKey(p, serialNumber);
                this.syncedLogs.add(key);
            });
            this.saveStorage();

            return {
                count: newPunches.length,
                success: true,
                response: res
            };
        } catch (err) {
            console.warn('[CloudSync] Cloud upload failed, buffering offline:', err.message);
            // Buffer offline
            newPunches.forEach(p => {
                this.offlineQueue.push({ ...p, serialNumber, queuedAt: new Date().toISOString() });
            });
            this.saveStorage();

            return {
                count: newPunches.length,
                buffered: true,
                error: err.message
            };
        }
    }

    /**
     * Flush offline queue when connection is restored
     */
    async flushOfflineQueue() {
        if (this.offlineQueue.length === 0) return { count: 0 };

        const pending = [...this.offlineQueue];
        this.offlineQueue = [];

        try {
            const res = await this.syncAttendanceLogs(pending, pending[0]?.serialNumber || 'OFFLINE_BUFFER');
            return res;
        } catch (e) {
            // Restore back to queue
            this.offlineQueue = [...pending, ...this.offlineQueue];
            this.saveStorage();
            throw e;
        }
    }

    /**
     * Generate structured CSV export for attendance report
     */
    generateAttendanceCsv(filters = {}) {
        const report = this.getAttendanceReport(filters);
        const headers = ['Date', 'PIN', 'Staff Name', 'Category / Department', 'Shift Name', 'In Time', 'Out Time', 'Work Hours', 'Late (Mins)', 'Status', 'Phone'];
        const csvRows = [headers.join(',')];

        report.rows.forEach(r => {
            const row = [
                `"${r.date}"`,
                `"${r.pin}"`,
                `"${(r.name || '').replace(/"/g, '""')}"`,
                `"${(r.category || '').replace(/"/g, '""')}"`,
                `"${(r.shift || '').replace(/"/g, '""')}"`,
                `"${r.inTime}"`,
                `"${r.outTime}"`,
                r.workHours,
                r.lateMinutes,
                `"${r.status}"`,
                `"${r.phone}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\r\n');
    }

    /**
     * Fetch staff registry from EduAI Cloud
     */
    async fetchCloudStaff() {
        if (!this.institutionId) {
            throw new Error('Institution ID is not configured');
        }

        const urlPath = `/api/zkteco-webhook?action=get_staff&institutionId=${encodeURIComponent(this.institutionId)}`;
        try {
            const res = await this.postJson(urlPath, { action: 'get_staff', institutionId: this.institutionId });
            if (res.data && Array.isArray(res.data.staff)) {
                let imported = 0;
                res.data.staff.forEach(s => {
                    this.saveEmployee({
                        id: s.id || ('emp_' + (s.pin || Date.now())),
                        pin: String(s.pin || s.id_number || s.employee_number || s.id).trim(),
                        name: s.name || s.full_name || 'Staff Member',
                        categoryId: s.category_id || 'cat_teaching',
                        shiftId: s.shift_id || 'shift_day',
                        phone: s.phone || '',
                        email: s.email || '',
                        nationalId: s.id_number || '',
                        cardNo: s.rfid_card || '',
                        active: true
                    });
                    imported++;
                });
                return { count: imported, staff: this.employees };
            }
            return { count: 0, message: 'No staff records returned from cloud gateway' };
        } catch (err) {
            console.warn('[CloudSync] Fetch cloud staff error:', err.message);
            throw err;
        }
    }
}

module.exports = {
    CloudSyncService
};
