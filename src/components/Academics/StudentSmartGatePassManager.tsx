import React, { useState } from 'react';

interface GateLog {
    id: string;
    studentName: string;
    admNo: string;
    grade: string;
    parentPhone: string;
    direction: 'ENTRY' | 'EXIT';
    timestamp: string;
    scanMethod: 'QR_CODE' | 'NFC_CARD' | 'BIOMETRIC_GATE';
    smsSent: boolean;
}

export const StudentSmartGatePassManager: React.FC = () => {
    const [logs, setLogs] = useState<GateLog[]>([
        { id: 'gate_1', studentName: 'Kevin Kamau', admNo: 'ADM-2024-089', grade: 'Grade 7 East', parentPhone: '+254712345678', direction: 'ENTRY', timestamp: '07:14 AM', scanMethod: 'QR_CODE', smsSent: true },
        { id: 'gate_2', studentName: 'Faith Wanjiku', admNo: 'ADM-2024-112', grade: 'Grade 8 North', parentPhone: '+254722987654', direction: 'ENTRY', timestamp: '07:22 AM', scanMethod: 'NFC_CARD', smsSent: true },
        { id: 'gate_3', studentName: 'Brian Otieno', admNo: 'ADM-2024-045', grade: 'Grade 6 Blue', parentPhone: '+254733112233', direction: 'ENTRY', timestamp: '07:30 AM', scanMethod: 'QR_CODE', smsSent: true },
    ]);

    const [simStudentName, setSimStudentName] = useState('');
    const [simParentPhone, setSimParentPhone] = useState('');

    const triggerGateScan = (direction: 'ENTRY' | 'EXIT') => {
        const name = simStudentName || 'St. Mary Student';
        const phone = simParentPhone || '+254712345678';
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newLog: GateLog = {
            id: `gate_${Date.now()}`,
            studentName: name,
            admNo: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
            grade: 'Grade 7',
            parentPhone: phone,
            direction,
            timestamp: nowTime,
            scanMethod: 'QR_CODE',
            smsSent: true
        };

        setLogs([newLog, ...logs]);
        alert(`📲 Parent Alert Sent to ${phone}: "${name} ${direction === 'ENTRY' ? 'arrived safely at school' : 'left school premises'} at ${nowTime}."`);
        setSimStudentName('');
        setSimParentPhone('');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        Institutional Gate Governance
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Student QR / NFC Smart Gate Pass & Parent Alert</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        1-Tap QR / NFC gate scanner triggering instant SMS arrival & departure alerts to parents
                    </p>
                </div>
            </div>

            {/* Gate Scanner Simulator Panel */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">
                    1-TAP GATE SCANNER & PARENT SMS DISPATCH
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Student Full Name"
                        value={simStudentName}
                        onChange={e => setSimStudentName(e.target.value)}
                        className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                    />
                    <input
                        type="text"
                        placeholder="Parent Phone Number (+254...)"
                        value={simParentPhone}
                        onChange={e => setSimParentPhone(e.target.value)}
                        className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white"
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => triggerGateScan('ENTRY')}
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                        🟢 Scan ENTRY (Morning Arrival SMS)
                    </button>
                    <button
                        onClick={() => triggerGateScan('EXIT')}
                        className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                        🟠 Scan EXIT (Evening Departure SMS)
                    </button>
                </div>
            </div>

            {/* Gate Log Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">
                    REAL-TIME GATE SCANNER LOG
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Student & Adm</th>
                                <th className="py-4">Grade</th>
                                <th className="py-4">Parent Phone</th>
                                <th className="py-4 text-center">Direction</th>
                                <th className="py-4 text-center">Scan Method</th>
                                <th className="py-4 text-right">SMS Alert</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(l => (
                                <tr key={l.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {l.studentName}
                                        <div className="text-[10px] text-slate-400 font-bold">{l.admNo}</div>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{l.grade}</td>
                                    <td className="py-4 text-xs font-mono text-indigo-300 font-bold">{l.parentPhone}</td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            l.direction === 'ENTRY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                            {l.direction} @ {l.timestamp}
                                        </span>
                                    </td>
                                    <td className="py-4 text-center text-xs font-mono font-bold text-slate-400">{l.scanMethod}</td>
                                    <td className="py-4 text-right">
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[9px] font-black uppercase">
                                            ✓ SMS Dispatched
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
