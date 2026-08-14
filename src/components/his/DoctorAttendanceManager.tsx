import React, { useState, useEffect } from 'react';

export interface DoctorAttendanceRecord {
    id: string;
    doctorName: string;
    doctorCode: string;
    specialty: string;
    department: string;
    date: string;
    clockInTime: string;
    clockInMethod: 'FIRST_LOGIN_AUTO' | 'BIOMETRIC_SCAN' | 'MANUAL_SUPERVISOR';
    biometricVerified: boolean;
    status: 'PRESENT' | 'LATE' | 'ON_CALL' | 'OFF_DUTY';
    ipAddress: string;
    deviceType: string;
}

interface DoctorAttendanceManagerProps {
    currentUser?: any;
    onLogAction?: (action: string, description: string) => void;
}

export const DoctorAttendanceManager: React.FC<DoctorAttendanceManagerProps> = ({ currentUser, onLogAction }) => {
    const [records, setRecords] = useState<DoctorAttendanceRecord[]>([
        { id: 'att_1', doctorName: 'Dr. Sarah Kimani', doctorCode: 'DOC-9021', specialty: 'General Pediatrics', department: 'Pediatric Ward', date: new Date().toISOString().split('T')[0], clockInTime: '07:45 AM', clockInMethod: 'FIRST_LOGIN_AUTO', biometricVerified: false, status: 'PRESENT', ipAddress: '192.168.1.104', deviceType: 'Hospital Workstation PC' },
        { id: 'att_2', doctorName: 'Dr. Michael Omondi', doctorCode: 'DOC-8832', specialty: 'Orthopedic Surgery', department: 'Surgical Theatre 2', date: new Date().toISOString().split('T')[0], clockInTime: '08:12 AM', clockInMethod: 'BIOMETRIC_SCAN', biometricVerified: true, status: 'PRESENT', ipAddress: '192.168.1.88', deviceType: 'Biometric Wall Terminal #3' },
        { id: 'att_3', doctorName: 'Dr. Amina Hassan', doctorCode: 'DOC-7419', specialty: 'Emergency Medicine', department: 'Accident & Emergency', date: new Date().toISOString().split('T')[0], clockInTime: '08:30 AM', clockInMethod: 'FIRST_LOGIN_AUTO', biometricVerified: false, status: 'LATE', ipAddress: '192.168.1.15', deviceType: 'Emergency Room Tablet' },
    ]);

    const [filterDepartment, setFilterDepartment] = useState('ALL');
    const [loginAttendanceTriggered, setLoginAttendanceTriggered] = useState(false);

    // Auto clock-in logged-in doctor on first login if not logged today
    useEffect(() => {
        if (!loginAttendanceTriggered && currentUser) {
            const todayStr = new Date().toISOString().split('T')[0];
            const alreadyClocked = records.some(r => r.doctorName === currentUser.name && r.date === todayStr);

            if (!alreadyClocked) {
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const autoRecord: DoctorAttendanceRecord = {
                    id: `att_auto_${Date.now()}`,
                    doctorName: currentUser.name || 'Dr. Medical Officer',
                    doctorCode: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
                    specialty: currentUser.specialty || 'General Practice',
                    department: currentUser.department || 'Outpatient Clinic',
                    date: todayStr,
                    clockInTime: nowTime,
                    clockInMethod: 'FIRST_LOGIN_AUTO',
                    biometricVerified: false,
                    status: 'PRESENT',
                    ipAddress: '192.168.1.50',
                    deviceType: 'System Login Terminal'
                };
                setRecords(prev => [autoRecord, ...prev]);
                setLoginAttendanceTriggered(true);
                if (onLogAction) onLogAction('doctor_login_attendance', `Auto clocked in Dr. ${autoRecord.doctorName} via system login at ${nowTime}`);
            }
        }
    }, [currentUser, records, loginAttendanceTriggered, onLogAction]);

    const filteredRecords = records.filter(r => filterDepartment === 'ALL' || r.department === filterDepartment);

    const printTimesheet = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html>
                <head>
                    <title>HIS Medical Staff Attendance & Duty Timesheet</title>
                    <style>
                        body { font-family: system-ui, sans-serif; padding: 30px; color: #0f172a; }
                        h2 { margin-bottom: 5px; color: #0284c7; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
                        th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; }
                        .badge { padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; display: inline-block; }
                        .auto { background: #e0f2fe; color: #0369a1; }
                        .bio { background: #dcfce7; color: #15803d; }
                    </style>
                </head>
                <body>
                    <h2>🩺 Hospital Information System (HIS) — Doctor Duty Attendance Report</h2>
                    <p style="font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleDateString()} | Total Doctors Clocked In: ${records.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Doctor Name & Code</th>
                                <th>Specialty</th>
                                <th>Department</th>
                                <th>Clock-In Time</th>
                                <th>Clock-In Method</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(r => `
                                <tr>
                                    <td><strong>${r.doctorName}</strong><br><small style="color:#64748b">${r.doctorCode}</small></td>
                                    <td>${r.specialty}</td>
                                    <td>${r.department}</td>
                                    <td><strong>${r.clockInTime}</strong></td>
                                    <td><span class="badge ${r.clockInMethod === 'BIOMETRIC_SCAN' ? 'bio' : 'auto'}">${r.clockInMethod.replace('_', ' ')}</span></td>
                                    <td><strong>${r.status}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.onload = function() { window.print(); }</script>
                </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-sky-500/20 text-sky-300 text-xs font-black rounded-full border border-sky-500/30 uppercase tracking-wider">
                        HIS Medical Staff & Duty Governance
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Doctor Duty Attendance & Login Clock-In</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        First daily system login automatically logs doctor duty attendance when biometric setup is pending
                    </p>
                </div>
                <button
                    onClick={printTimesheet}
                    className="px-6 py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-sky-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <span>🖨️ Print Daily Timesheet</span>
                </button>
            </div>

            {/* System Notification Banner */}
            <div className="p-4 bg-sky-950/80 border border-sky-500/40 rounded-2xl text-sky-200 flex items-center gap-3 text-xs">
                <span className="text-xl">🩺</span>
                <div>
                    <strong className="font-black uppercase tracking-wider">First-Login Auto Attendance Active:</strong> Doctors without biometric enrollment are automatically clocked in upon their first system login of the day.
                </div>
            </div>

            {/* Attendance Roster Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-sky-400 italic">
                        TODAY'S DOCTOR ATTENDANCE LOG ({new Date().toLocaleDateString()})
                    </h3>
                    <select
                        value={filterDepartment}
                        onChange={e => setFilterDepartment(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-xl font-bold"
                    >
                        <option value="ALL">All Hospital Wards & Departments</option>
                        <option value="Pediatric Ward">Pediatric Ward</option>
                        <option value="Surgical Theatre 2">Surgical Theatre</option>
                        <option value="Accident & Emergency">Accident & Emergency</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Doctor & Code</th>
                                <th className="py-4">Specialty</th>
                                <th className="py-4">Department</th>
                                <th className="py-4 font-mono">Clock-In Time</th>
                                <th className="py-4 text-center">Clock-In Method</th>
                                <th className="py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(r => (
                                <tr key={r.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {r.doctorName}
                                        <div className="text-[10px] text-slate-400 font-bold">{r.doctorCode}</div>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-sky-300">{r.specialty}</td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{r.department}</td>
                                    <td className="py-4 font-mono font-black text-sm text-emerald-400">
                                        {r.clockInTime}
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            r.clockInMethod === 'BIOMETRIC_SCAN'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                        }`}>
                                            {r.clockInMethod === 'BIOMETRIC_SCAN' ? '🧬 BIOMETRIC' : '💻 FIRST LOGIN AUTO'}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            r.status === 'PRESENT'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
