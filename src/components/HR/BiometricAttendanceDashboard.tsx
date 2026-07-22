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

    // Enrollment form
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollForm, setEnrollForm] = useState({
        staffId: '',
        devicePin: '',
        fingerprintIndex: 0,
    });

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

    const loadTodayAttendance = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<StaffAttendanceDaily>('staff_attendance_daily', institution.id);
            const filtered = (data || []).filter(r => r.attendanceDate === selectedDate);
            setDailyRecords(filtered);
        } catch { setDailyRecords([]); }
        setLoading(false);
    };

    const loadMonthlyAttendance = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<StaffAttendanceDaily>('staff_attendance_daily', institution.id);
            const [year, month] = selectedMonth.split('-');
            const filtered = (data || []).filter(r => {
                const d = r.attendanceDate;
                return d.startsWith(`${year}-${month}`);
            });
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
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
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
                                                {rec.firstIn ? new Date(rec.firstIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {rec.lastOut ? new Date(rec.lastOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
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
                            <button
                                onClick={() => setShowDeviceModal(true)}
                                className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                + Add Device
                            </button>
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
                                            <button
                                                onClick={() => handleDeleteDevice(dev.id)}
                                                className="w-full py-2.5 bg-white dark:bg-slate-700 text-rose-500 border border-slate-100 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
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
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                            <button onClick={() => setShowEnrollModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleEnrollStaff} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                                Enroll Staff
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
