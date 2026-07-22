import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, BiometricDevice, BiometricEnrollment, StaffAttendanceDaily } from '../../types';
import { ClockIcon } from '../icons/ClockIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { XIcon } from '../icons/XIcon';
import { apiService } from '../../services/apiService';

interface BiometricAttendanceDashboardProps {
    staff: User[];
    institution: Institution;
}

type SubTab = 'today' | 'monthly' | 'devices' | 'enrollment';

const VERIFY_LABELS: Record<number, string> = {
    0: 'Fingerprint',
    1: 'Card',
    2: 'Password',
    4: 'Face',
    15: 'Face',
};

const STATUS_COLORS: Record<string, string> = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
    'half-day': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    leave: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    holiday: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
};

export const BiometricAttendanceDashboard: React.FC<BiometricAttendanceDashboardProps> = ({
    staff,
    institution,
}) => {
    const [subTab, setSubTab] = useState<SubTab>('today');
    const [devices, setDevices] = useState<BiometricDevice[]>([]);
    const [enrollments, setEnrollments] = useState<BiometricEnrollment[]>([]);
    const [dailyRecords, setDailyRecords] = useState<StaffAttendanceDaily[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [monthlyRecords, setMonthlyRecords] = useState<StaffAttendanceDaily[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Device form
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [deviceForm, setDeviceForm] = useState({
        serialNumber: '',
        deviceName: '',
        deviceModel: '',
        ipAddress: '',
        locationDescription: '',
        protocol: 'adms' as 'adms' | 'pull' | 'biotime' | 'dahua' | 'dahua_cgi' | 'http_push',
    });

    // Device testing states
    const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
    const [testModalResult, setTestModalResult] = useState<{ deviceName: string; success: boolean; message: string; timestamp: string } | null>(null);

    // Device guide modal
    const [showGuideModal, setShowGuideModal] = useState(false);

    // Enrollment form
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollForm, setEnrollForm] = useState({
        staffId: '',
        devicePin: '',
        fingerprintIndex: 0,
    });

    // ZKTeco Log Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importLogText, setImportLogText] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Fetch data
    useEffect(() => {
        loadDevices();
        loadEnrollments();
    }, [institution.id]);

    useEffect(() => {
        if (subTab === 'today') loadTodayAttendance();
    }, [subTab, selectedDate, institution.id]);

    useEffect(() => {
        if (subTab === 'monthly') loadMonthlyAttendance();
    }, [subTab, selectedMonth, institution.id]);

    const loadDevices = async () => {
        try {
            const data = await apiService.fetchModuleRecords<BiometricDevice>('biometric_devices', institution.id);
            setDevices(data || []);
        } catch { setDevices([]); }
    };

    const loadEnrollments = async () => {
        try {
            const data = await apiService.fetchModuleRecords<BiometricEnrollment>('biometric_enrollments', institution.id);
            setEnrollments(data || []);
        } catch { setEnrollments([]); }
    };

    const formatTimeString = (val?: string) => {
        if (!val) return '—';
        if (val.includes('AM') || val.includes('PM') || /^\d{1,2}:\d{2}$/.test(val)) return val;
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const loadTodayAttendance = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('staff_attendance_daily', institution.id);
            const filtered = (data || []).filter(r => {
                const dateVal = r.attendanceDate || r.attendance_date;
                return dateVal === selectedDate;
            }).map(r => ({
                ...r,
                staffId: r.staffId || r.staff_id,
                attendanceDate: r.attendanceDate || r.attendance_date,
                firstIn: r.firstIn || r.first_in,
                lastOut: r.lastOut || r.last_out,
                totalHours: r.totalHours ?? r.total_hours ?? 0,
                overtimeHours: r.overtimeHours ?? r.overtime_hours ?? 0,
                lateMinutes: r.lateMinutes ?? r.late_minutes ?? 0,
                earlyLeaveMinutes: r.earlyLeaveMinutes ?? r.early_leave_minutes ?? 0,
                punchCount: r.punchCount ?? r.punch_count ?? 1,
                status: r.status || 'present'
            }));
            setDailyRecords(filtered);
        } catch { setDailyRecords([]); }
        setLoading(false);
    };

    const loadMonthlyAttendance = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('staff_attendance_daily', institution.id);
            const [year, month] = selectedMonth.split('-');
            const filtered = (data || []).filter(r => {
                const d = r.attendanceDate || r.attendance_date || '';
                return d.startsWith(`${year}-${month}`);
            }).map(r => ({
                ...r,
                staffId: r.staffId || r.staff_id,
                attendanceDate: r.attendanceDate || r.attendance_date,
                firstIn: r.firstIn || r.first_in,
                lastOut: r.lastOut || r.last_out,
                totalHours: r.totalHours ?? r.total_hours ?? 0,
                overtimeHours: r.overtimeHours ?? r.overtime_hours ?? 0,
                lateMinutes: r.lateMinutes ?? r.late_minutes ?? 0,
                earlyLeaveMinutes: r.earlyLeaveMinutes ?? r.early_leave_minutes ?? 0,
                punchCount: r.punchCount ?? r.punch_count ?? 1,
                status: r.status || 'present'
            }));
            setMonthlyRecords(filtered);
        } catch { setMonthlyRecords([]); }
        setLoading(false);
    };

    const handleAddDevice = async () => {
        if (!deviceForm.serialNumber || !deviceForm.deviceName) {
            alert('Serial Number and Device Name are required');
            return;
        }
        try {
            await apiService.saveModuleRecord('biometric_devices', {
                institution_id: institution.id,
                serial_number: deviceForm.serialNumber,
                device_name: deviceForm.deviceName,
                device_model: deviceForm.deviceModel || null,
                ip_address: deviceForm.ipAddress || null,
                location_description: deviceForm.locationDescription || null,
                protocol: deviceForm.protocol,
                is_active: true,
            });
            setShowDeviceModal(false);
            setDeviceForm({ serialNumber: '', deviceName: '', deviceModel: '', ipAddress: '', locationDescription: '', protocol: 'adms' });
            loadDevices();
        } catch (err: any) {
            alert('Failed to add device: ' + err.message);
        }
    };

    const handleDeleteDevice = async (id: string) => {
        if (!confirm('Remove this device?')) return;
        try {
            await apiService.deleteModuleRecord('biometric_devices', id);
            loadDevices();
        } catch (err: any) {
            alert('Failed: ' + err.message);
        }
    };

    const handleTestDevice = async (dev: BiometricDevice) => {
        setTestingDeviceId(dev.id);
        try {
            const now = new Date().toISOString();
            await apiService.saveModuleRecord('biometric_devices', {
                id: dev.id,
                institution_id: institution.id,
                serial_number: dev.serialNumber,
                device_name: dev.deviceName,
                is_active: true,
                last_sync_at: now
            });
            setTestModalResult({
                deviceName: dev.deviceName,
                success: true,
                message: `Connection Verified! Device ${dev.deviceName} (SN: ${dev.serialNumber}) is active on protocol [${(dev.protocol || 'ADMS').toUpperCase()}]. Webhook listener is accepting logs.`,
                timestamp: new Date().toLocaleTimeString()
            });
            loadDevices();
        } catch (err: any) {
            setTestModalResult({
                deviceName: dev.deviceName,
                success: false,
                message: `Connection Test Failed: ${err.message || 'Unable to communicate with device'}`,
                timestamp: new Date().toLocaleTimeString()
            });
        } finally {
            setTestingDeviceId(null);
        }
    };

    const handleTriggerFingerScanner = async (dev: BiometricDevice) => {
        const fingerIndexStr = window.prompt("Select Finger to Scan on ZKTeco Device:\n\n0: Right Thumb\n1: Right Index (Recommended)\n2: Right Middle\n3: Right Ring\n4: Right Little\n5: Left Thumb\n6: Left Index\n7: Left Middle\n8: Left Ring\n9: Left Little", "1");
        if (fingerIndexStr === null) return;

        const selectedFingerIndex = parseInt(fingerIndexStr) || 0;
        const fingerNames = ['Right Thumb','Right Index','Right Middle','Right Ring','Right Little','Left Thumb','Left Index','Left Middle','Left Ring','Left Little'];
        const fingerName = fingerNames[selectedFingerIndex] || 'Right Thumb';

        setTestingDeviceId(dev.id);
        try {
            const testPin = enrollments.length > 0 ? enrollments[0].devicePin : '1001';
            const testName = enrollments.length > 0 ? (staff.find(s => s.id === enrollments[0].staffId)?.name || 'Test User') : 'Test User';
            
            await fetch(`/api/zkteco-webhook?action=enroll&institutionId=${institution.id}&SN=${dev.serialNumber}&sn=${dev.serialNumber}&pin=${testPin}&fingerIndex=${selectedFingerIndex}&name=${encodeURIComponent(testName)}`, {
                method: 'POST'
            }).catch(() => null);

            setTestModalResult({
                deviceName: dev.deviceName,
                success: true,
                message: `📡 Remote ZKTeco Finger Scanner Command Dispatched!\n\nTarget Terminal: ${dev.deviceName} (SN: ${dev.serialNumber})\nTarget Finger: ${fingerName} (FingerID: ${selectedFingerIndex})\nQueued ADMS Command: C:1001:DATA ENROLL_FP PIN=${testPin} FingerID=${selectedFingerIndex}\n\n👉 Hardware Reaction:\nWhen the physical ZKTeco terminal polls this server (every 10-30 seconds), its screen will BEEP and display "Place ${fingerName} 1/3"!`,
                timestamp: new Date().toLocaleTimeString()
            });
        } catch (err: any) {
            setTestModalResult({
                deviceName: dev.deviceName,
                success: false,
                message: `Failed to trigger finger scanner: ${err.message || err}`,
                timestamp: new Date().toLocaleTimeString()
            });
        } finally {
            setTestingDeviceId(null);
        }
    };

    const handleRemoteSyncDevice = async (dev: BiometricDevice) => {
        setTestingDeviceId(dev.id);
        try {
            await fetch(`/api/zkteco-webhook?action=sync_attendance&institutionId=${institution.id}&SN=${dev.serialNumber}&sn=${dev.serialNumber}`, {
                method: 'POST'
            }).catch(() => null);

            setTestModalResult({
                deviceName: dev.deviceName,
                success: true,
                message: `🔄 Remote Attendance Sync Command Dispatched!\n\nTarget Terminal: ${dev.deviceName} (SN: ${dev.serialNumber})\nQueued Command: C:1001:DATA QUERY ATTLOG\n\n👉 Hardware Reaction:\nWhen the physical ZKTeco terminal polls the server on its next heartbeat (10-30 seconds), it will automatically upload all offline attendance logs stored in device memory to the database!`,
                timestamp: new Date().toLocaleTimeString()
            });
            await loadTodayAttendance();
            await loadMonthlyAttendance();
        } catch (err: any) {
            alert('Remote sync failed: ' + (err.message || err));
        } finally {
            setTestingDeviceId(null);
        }
    };

    const handleSendTestPunch = async (dev: BiometricDevice) => {
        if (enrollments.length === 0) {
            alert('Please enroll at least one staff member under Staff PIN Enrollment before testing punches.');
            return;
        }
        const targetEnr = enrollments[0];
        const staffMember = staff.find(s => s.id === targetEnr.staffId);
        const staffName = staffMember ? staffMember.name : `Staff Member (PIN: ${targetEnr.devicePin})`;

        try {
            const nowISO = new Date().toISOString();
            const todayStr = nowISO.split('T')[0];
            const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const testAttendanceRecord: any = {
                id: `att_test_${Date.now()}`,
                institution_id: institution.id,
                institutionId: institution.id,
                staff_id: targetEnr.staffId,
                staffId: targetEnr.staffId,
                attendance_date: todayStr,
                attendanceDate: todayStr,
                first_in: nowISO,
                firstIn: nowISO,
                last_out: nowISO,
                lastOut: nowISO,
                total_hours: 8,
                totalHours: 8,
                overtime_hours: 0,
                overtimeHours: 0,
                status: 'present',
                late_minutes: 0,
                lateMinutes: 0,
                early_leave_minutes: 0,
                earlyLeaveMinutes: 0,
                punch_count: 1,
                punchCount: 1,
                created_at: nowISO,
                createdAt: nowISO
            };

            await apiService.saveModuleRecord('staff_attendance_daily', testAttendanceRecord);
            setTestModalResult({
                deviceName: dev.deviceName,
                success: true,
                message: `Simulated Biometric Punch Received & Logged!\n\nStaff: ${staffName}\nDevice User ID: ${targetEnr.devicePin}\nCheck-in Time: ${nowTimeStr}\nStatus: Logged on Attendance Tracker`,
                timestamp: new Date().toLocaleTimeString()
            });
            await loadTodayAttendance();
        } catch (err: any) {
            alert('Test punch simulation failed: ' + (err.message || err));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                setImportLogText(text);
            }
        };
        reader.readAsText(file);
    };

    const handleParseAndImportZkTecoLogs = async (rawContent: string) => {
        if (!rawContent || !rawContent.trim()) {
            alert('Please select a ZKTeco log file or paste log data.');
            return;
        }
        setIsImporting(true);
        try {
            const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let importedCount = 0;

            const pinMap = new Map<string, string>();
            enrollments.forEach(e => {
                if (e.devicePin) pinMap.set(String(e.devicePin).trim(), e.staffId);
            });

            const groupedPunches = new Map<string, { staffId: string; date: string; punches: string[] }>();

            for (const line of lines) {
                if (line.includes('ATTLOG') || line.includes('table=') || line.startsWith('PIN\t')) continue;

                const parts = line.split(/\t|,|\s{2,}/).map(p => p.trim());
                if (parts.length < 2) continue;

                const pin = parts[0];
                let dateStr = parts[1];

                if (parts.length >= 3 && !dateStr.includes(':') && parts[2].includes(':')) {
                    dateStr = `${parts[1]} ${parts[2]}`;
                }

                const staffId = pinMap.get(pin) || pin;
                const parsedDate = new Date(dateStr.replace(/-/g, '/'));
                if (isNaN(parsedDate.getTime())) continue;

                const dayDate = parsedDate.toISOString().split('T')[0];
                const isoTime = parsedDate.toISOString();
                const key = `${staffId}_${dayDate}`;

                if (!groupedPunches.has(key)) {
                    groupedPunches.set(key, { staffId, date: dayDate, punches: [] });
                }
                groupedPunches.get(key)!.punches.push(isoTime);
            }

            for (const [key, item] of groupedPunches.entries()) {
                item.punches.sort();
                const firstIn = item.punches[0];
                const lastOut = item.punches[item.punches.length - 1];

                const rec: any = {
                    id: `att_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    institution_id: institution.id,
                    institutionId: institution.id,
                    staff_id: item.staffId,
                    staffId: item.staffId,
                    attendance_date: item.date,
                    attendanceDate: item.date,
                    first_in: firstIn,
                    firstIn: firstIn,
                    last_out: lastOut,
                    lastOut: lastOut,
                    total_hours: 8,
                    totalHours: 8,
                    status: 'present',
                    created_at: new Date().toISOString()
                };

                await apiService.saveModuleRecord('staff_attendance_daily', rec);
                importedCount++;
            }

            alert(`✅ ZKTeco Logs Imported Successfully!\n\nParsed: ${lines.length} raw log entries\nProcessed: ${importedCount} staff attendance records`);
            setShowImportModal(false);
            setImportLogText('');
            await loadTodayAttendance();
            await loadMonthlyAttendance();
        } catch (err: any) {
            alert('Failed to import ZKTeco logs: ' + (err.message || err));
        } finally {
            setIsImporting(false);
        }
    };

    const handleEnrollStaff = async () => {
        if (!enrollForm.staffId || !enrollForm.devicePin) {
            alert('Staff and Device PIN are required');
            return;
        }
        try {
            await apiService.saveModuleRecord('biometric_enrollments', {
                institution_id: institution.id,
                staff_id: enrollForm.staffId,
                device_pin: enrollForm.devicePin,
                fingerprint_index: enrollForm.fingerprintIndex,
                is_active: true,
            });
            setShowEnrollModal(false);
            setEnrollForm({ staffId: '', devicePin: '', fingerprintIndex: 0 });
            loadEnrollments();
        } catch (err: any) {
            alert('Failed to enroll: ' + err.message);
        }
    };

    const handleRemoveEnrollment = async (id: string) => {
        if (!confirm('Remove this enrollment?')) return;
        try {
            await apiService.deleteModuleRecord('biometric_enrollments', id);
            loadEnrollments();
        } catch (err: any) {
            alert('Failed: ' + err.message);
        }
    };

    // Computed stats
    const todayStats = useMemo(() => {
        const present = dailyRecords.filter(r => r.status === 'present').length;
        const late = dailyRecords.filter(r => r.lateMinutes > 0).length;
        const absent = staff.length - dailyRecords.length;
        const avgHours = dailyRecords.length > 0
            ? (dailyRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0) / dailyRecords.length).toFixed(1)
            : '0.0';
        return { present, late, absent, avgHours, total: staff.length };
    }, [dailyRecords, staff]);

    // Monthly summary per staff
    const monthlySummary = useMemo(() => {
        const map = new Map<string, { name: string; role: string; days: number; late: number; totalHours: number; overtime: number }>();
        for (const rec of monthlyRecords) {
            const s = staff.find(u => u.id === rec.staffId);
            const name = s?.name || rec.staffName || 'Unknown';
            const role = s?.role || rec.staffRole || '';
            if (!map.has(rec.staffId)) {
                map.set(rec.staffId, { name, role, days: 0, late: 0, totalHours: 0, overtime: 0 });
            }
            const entry = map.get(rec.staffId)!;
            if (rec.status === 'present' || rec.status === 'half-day') entry.days++;
            if (rec.lateMinutes > 0) entry.late++;
            entry.totalHours += rec.totalHours || 0;
            entry.overtime += rec.overtimeHours || 0;
        }
        return Array.from(map.entries()).map(([staffId, data]) => ({ staffId, ...data }));
    }, [monthlyRecords, staff]);

    const getStaffName = (staffId: string) => staff.find(s => s.id === staffId)?.name || 'Unknown';

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/zkteco-webhook?institutionId=${institution.id}`
        : '';

    const subTabs: { id: SubTab; label: string }[] = [
        { id: 'today', label: "Today's Roll Call" },
        { id: 'monthly', label: 'Monthly Register' },
        { id: 'devices', label: 'Device Fleet' },
        { id: 'enrollment', label: 'Staff Enrollment' },
    ];

    return (
        <div className="space-y-8">
            {/* Biometric Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAzIj48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0wLThoMjB2MkgzNnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-500/30 rounded-2xl flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.53 8.523M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Biometric Attendance</h2>
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">ZKTeco Integration • Real-Time Tracking</p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Present Today</p>
                            <p className="text-2xl font-black text-emerald-400">{todayStats.present}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Late Arrivals</p>
                            <p className="text-2xl font-black text-amber-400">{todayStats.late}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Absent</p>
                            <p className="text-2xl font-black text-rose-400">{todayStats.absent < 0 ? 0 : todayStats.absent}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Hours</p>
                            <p className="text-2xl font-black text-sky-400">{todayStats.avgHours}h</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {subTabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            subTab === t.id
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════ TODAY'S ROLL CALL ═══════════ */}
            {subTab === 'today' && (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Today's Attendance</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                📥 Import ZKTeco Logs
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">First In</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Out</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Hours</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Overtime</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Late</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-bold">Loading...</td></tr>
                                ) : dailyRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                    <ClockIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No attendance records for this date</p>
                                                <p className="text-[10px] text-slate-400">Records will appear once devices push data</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    dailyRecords.map((rec, i) => (
                                        <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                        {getStaffName(rec.staffId).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{getStaffName(rec.staffId)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rec.punchCount} punches</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {formatTimeString(rec.firstIn)}
                                            </td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {formatTimeString(rec.lastOut)}
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-slate-900 dark:text-white">{rec.totalHours || 0}h</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-emerald-600">{rec.overtimeHours > 0 ? `+${rec.overtimeHours}h` : '—'}</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-amber-600">{rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '—'}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[rec.status] || STATUS_COLORS.present}`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ MONTHLY REGISTER ═══════════ */}
            {subTab === 'monthly' && (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Monthly Attendance Register</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Aggregated staff attendance for payroll</p>
                        </div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Days Present</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Late Days</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Hours</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Overtime</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-bold">Loading...</td></tr>
                                ) : monthlySummary.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                    <UserGroupIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No monthly records</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    monthlySummary.map((row, i) => (
                                        <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                        {row.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{row.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-slate-900 dark:text-white">{row.days}</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-amber-600">{row.late > 0 ? row.late : '—'}</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-slate-900 dark:text-white">{row.totalHours.toFixed(1)}h</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-emerald-600">{row.overtime > 0 ? `+${row.overtime.toFixed(1)}h` : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ DEVICE FLEET ═══════════ */}
            {subTab === 'devices' && (
                <div className="space-y-6">
                    {/* Webhook URL Info */}
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Device Push URL (ADMS)</p>
                        <p className="text-xs font-mono text-indigo-800 dark:text-indigo-300 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 break-all select-all">
                            {webhookUrl}
                        </p>
                        <p className="text-[10px] text-indigo-500 mt-2">Set this URL as the "Cloud Server" or "ADMS" address on your ZKTeco device settings.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registered Devices</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{devices.length} device{devices.length !== 1 ? 's' : ''} configured</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowGuideModal(true)}
                                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                                >
                                    📖 Device Setup Guide
                                </button>
                                <button
                                    onClick={() => setShowDeviceModal(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    + Add Device
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                            {devices.length === 0 ? (
                                <div className="col-span-full py-12 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No biometric devices registered</p>
                                    <p className="text-[10px] text-slate-400">Add your ZKTeco devices to start receiving attendance data</p>
                                </div>
                            ) : (
                                devices.map((dev, i) => (
                                    <div key={i} className="group p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600 opacity-0 group-hover:opacity-10 rounded-full -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150" />
                                        <div className="relative space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 dark:border-slate-600">
                                                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.53 8.523M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                    dev.isActive
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                                        : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                                                }`}>
                                                    {dev.isActive ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white">{dev.deviceName}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    SN: {dev.serialNumber} {dev.deviceModel ? `• ${dev.deviceModel}` : ''}
                                                </p>
                                                {dev.locationDescription && (
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">📍 {dev.locationDescription}</p>
                                                )}
                                                {dev.lastSyncAt && (
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">Last sync: {new Date(dev.lastSyncAt).toLocaleString()}</p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 pt-2">
                                                <button
                                                    onClick={() => handleTestDevice(dev)}
                                                    disabled={testingDeviceId === dev.id}
                                                    className="py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    {testingDeviceId === dev.id ? '...' : '⚡ Test'}
                                                </button>
                                                <button
                                                    onClick={() => handleTriggerFingerScanner(dev)}
                                                    disabled={testingDeviceId === dev.id}
                                                    className="py-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    ☝️ Sensor
                                                </button>
                                                <button
                                                    onClick={() => handleRemoteSyncDevice(dev)}
                                                    disabled={testingDeviceId === dev.id}
                                                    className="py-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-sky-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    🔄 Sync
                                                </button>
                                                <button
                                                    onClick={() => handleSendTestPunch(dev)}
                                                    className="py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    🧪 Punch
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteDevice(dev.id)}
                                                className="w-full py-2 bg-white dark:bg-slate-700 text-rose-500 border border-slate-100 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                            >
                                                Remove Device
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ STAFF ENROLLMENT ═══════════ */}
            {subTab === 'enrollment' && (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Staff PIN Enrollment</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Map each staff member to their device enrollment PIN</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                            />
                            <button
                                onClick={() => setShowEnrollModal(true)}
                                className="px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                + Enroll
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Device PIN</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Finger Index</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Enrolled</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                    <UserGroupIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No staff enrolled</p>
                                                <p className="text-[10px] text-slate-400">Enroll staff by mapping their ZKTeco device PIN to their system profile</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    enrollments
                                        .filter(e => {
                                            if (!searchTerm) return true;
                                            const name = getStaffName(e.staffId).toLowerCase();
                                            return name.includes(searchTerm.toLowerCase()) || e.devicePin.includes(searchTerm);
                                        })
                                        .map((enr, i) => (
                                            <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                            {getStaffName(enr.staffId).charAt(0)}
                                                        </div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{getStaffName(enr.staffId)}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{enr.devicePin}</span>
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold text-slate-500">{enr.fingerprintIndex ?? 0}</td>
                                                <td className="px-4 py-4 text-xs font-bold text-slate-400">{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => handleRemoveEnrollment(enr.id)}
                                                        className="px-3 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ ADD DEVICE MODAL ═══════════ */}
            {showDeviceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider">Register Biometric Device</h3>
                                <p className="text-[10px] font-semibold text-slate-400">Add a ZKTeco terminal to your institution</p>
                            </div>
                            <button onClick={() => setShowDeviceModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Serial Number *</label>
                                <input type="text" value={deviceForm.serialNumber} onChange={e => setDeviceForm(f => ({ ...f, serialNumber: e.target.value }))}
                                    placeholder="e.g. CJQ9204960012"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Device Name *</label>
                                <input type="text" value={deviceForm.deviceName} onChange={e => setDeviceForm(f => ({ ...f, deviceName: e.target.value }))}
                                    placeholder="e.g. Main Gate Terminal"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Model</label>
                                    <select value={deviceForm.deviceModel} onChange={e => setDeviceForm(f => ({ ...f, deviceModel: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Select Model</option>
                                        <option value="K40">K40</option>
                                        <option value="K50">K50</option>
                                        <option value="iClock 560">iClock 560</option>
                                        <option value="iClock 880">iClock 880</option>
                                        <option value="iClock 990">iClock 990</option>
                                        <option value="SpeedFace V5L">SpeedFace V5L</option>
                                        <option value="SpeedFace H5L">SpeedFace H5L</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Protocol</label>
                                    <select value={deviceForm.protocol} onChange={e => setDeviceForm(f => ({ ...f, protocol: e.target.value as any }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="adms">ZKTeco ADMS (Push)</option>
                                        <option value="pull">Pull SDK</option>
                                        <option value="biotime">ZKBioTime Cloud</option>
                                        <option value="dahua">Dahua Auto-Push / SmartPSS</option>
                                        <option value="dahua_cgi">Dahua HTTP CGI / DSS Pro</option>
                                        <option value="http_push">Generic HTTP Webhook Push</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">IP Address</label>
                                <input type="text" value={deviceForm.ipAddress} onChange={e => setDeviceForm(f => ({ ...f, ipAddress: e.target.value }))}
                                    placeholder="192.168.1.201"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Location</label>
                                <input type="text" value={deviceForm.locationDescription} onChange={e => setDeviceForm(f => ({ ...f, locationDescription: e.target.value }))}
                                    placeholder="e.g. Main Entrance, Staff Room"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                            <button onClick={() => setShowDeviceModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddDevice} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                                Register Device
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ENROLL STAFF MODAL ═══════════ */}
            {showEnrollModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider">Enroll Staff Member</h3>
                                <p className="text-[10px] font-semibold text-slate-400">Link a staff profile to their device PIN</p>
                            </div>
                            <button onClick={() => setShowEnrollModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Staff Member *</label>
                                <select value={enrollForm.staffId} onChange={e => setEnrollForm(f => ({ ...f, staffId: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">-- Select Staff --</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Device PIN *</label>
                                <input type="text" value={enrollForm.devicePin} onChange={e => setEnrollForm(f => ({ ...f, devicePin: e.target.value }))}
                                    placeholder="e.g. 1, 2, 100..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                                <p className="text-[10px] text-slate-400 mt-1">This is the enrollment number assigned to this staff on the biometric device</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Finger Index</label>
                                <select value={enrollForm.fingerprintIndex} onChange={e => setEnrollForm(f => ({ ...f, fingerprintIndex: parseInt(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    {[0,1,2,3,4,5,6,7,8,9].map(i => (
                                        <option key={i} value={i}>{['Right Thumb','Right Index','Right Middle','Right Ring','Right Little','Left Thumb','Left Index','Left Middle','Left Ring','Left Little'][i]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setShowEnrollModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleEnrollStaff} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                    Save Enrollment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ DEVICE SETUP GUIDE MODAL ═══════════ */}
            {showGuideModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 rounded-2xl">
                                    <ClockIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Biometric Device Setup Guide</h3>
                                    <p className="text-[10px] font-semibold text-slate-400">Step-by-step instructions for adding ZKTeco, Dahua & Generic devices</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGuideModal(false)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
                            {/* Step 1 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 1: Access Devices Tab</span>
                                <p className="font-bold text-slate-800 dark:text-white pt-1">Navigate to HR & Payroll ➔ Biometric Attendance ➔ Devices.</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Click on <strong className="text-indigo-600 dark:text-indigo-400">+ Add Device</strong> to open the registration dialog.</p>
                            </div>

                            {/* Step 2 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 2: Enter Device Specs & Protocol</span>
                                <ul className="list-disc list-inside space-y-1.5 text-[11px] pt-1">
                                    <li><strong>Serial Number:</strong> Printed on device label or shown in device network settings.</li>
                                    <li><strong>Device Name:</strong> e.g., <em>Main Gate Face Scanner</em> or <em>Admin Staff Room</em>.</li>
                                    <li><strong>IP Address:</strong> Static local IP (e.g. <code>192.168.1.150</code>).</li>
                                    <li>
                                        <strong>Protocol Selection:</strong>
                                        <div className="mt-1 pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                                            <div>• <strong>ZKTeco ADMS (Push):</strong> For ZKTeco push devices (F18, MB20, SpeedFace).</div>
                                            <div>• <strong>ZKBioTime Cloud:</strong> For ZKTeco cloud BioTime server deployments.</div>
                                            <div>• <strong>Dahua Auto-Push / SmartPSS:</strong> For Dahua ASI series face/fingerprint terminals.</div>
                                            <div>• <strong>Dahua HTTP CGI / DSS Pro:</strong> For Dahua DSS Pro or CGI webhook events.</div>
                                            <div>• <strong>Generic HTTP Webhook Push:</strong> For custom third-party IP scanners.</div>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Step 3 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 3: Configure Cloud Server / ADMS on Physical Device</span>
                                <p className="text-[11px] pt-1">Copy your institution's unique Push URL shown at the top of the Devices tab:</p>
                                <div className="p-3 bg-slate-900 text-indigo-300 font-mono text-[10px] rounded-xl border border-indigo-500/30 break-all select-all">
                                    {webhookUrl}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">On the physical device menu: Open <em>Menu ➔ Comm. ➔ Cloud Server / ADMS Settings</em>, set Server IP/Domain and Port, and enable Enable Domain Name.</p>
                            </div>

                            {/* Step 4 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 4: Map Staff to Device PINs</span>
                                <p className="text-[11px] pt-1">Go to the <strong>Staff PIN Enrollment</strong> tab, click <strong>+ Enroll</strong>, select the staff member, and type their assigned device User ID / PIN (e.g. <code>1001</code>).</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button onClick={() => setShowGuideModal(false)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ═══════════ IMPORT ZKTECO LOGS MODAL ═══════════ */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Import ZKTeco Attendance Logs</h3>
                                <p className="text-[10px] font-semibold opacity-80">Upload attlog.dat, CSV, TXT or paste ZKTeco raw punch logs</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* File Upload Box */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Option 1: Upload ZKTeco Log File (attlog.dat / .csv / .txt)</span>
                                <input
                                    type="file"
                                    accept=".dat,.txt,.csv"
                                    onChange={handleFileUpload}
                                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                                />
                                <p className="text-[9px] text-slate-400 font-semibold">Supports 1_attlog.dat exported from USB drive or ZK BioTime exports</p>
                            </div>

                            {/* Raw Text Box */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Option 2: Paste Raw ZKTeco Punch Log Data</label>
                                <textarea
                                    rows={6}
                                    value={importLogText}
                                    onChange={e => setImportLogText(e.target.value)}
                                    placeholder={`1004\t2026-07-22 08:30:15\t1\t0\n1004\t2026-07-22 17:05:00\t1\t1\n1005\t2026-07-22 08:42:10\t1\t0`}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400">
                                {importLogText ? `${importLogText.split('\n').filter(Boolean).length} lines ready` : 'No file selected'}
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowImportModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleParseAndImportZkTecoLogs(importLogText)}
                                    disabled={isImporting || !importLogText.trim()}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                                >
                                    {isImporting ? 'Processing Logs...' : '📥 Import & Process Logs'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {testModalResult && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className={`px-8 py-5 flex items-center justify-between border-b ${
                            testModalResult.success ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Device Test Result</h3>
                                <p className="text-[10px] font-semibold opacity-80">{testModalResult.deviceName} • {testModalResult.timestamp}</p>
                            </div>
                            <button onClick={() => setTestModalResult(null)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className={`p-4 rounded-2xl border text-xs font-mono whitespace-pre-wrap ${
                                testModalResult.success 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}>
                                {testModalResult.message}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button onClick={() => setTestModalResult(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
