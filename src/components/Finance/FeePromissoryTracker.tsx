import React, { useState } from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface PromissoryNote {
    id: string;
    studentName: string;
    admNo: string;
    parentName: string;
    parentPhone: string;
    promisedAmount: number;
    promisedDate: string;
    status: 'PENDING' | 'KEPT' | 'PARTIAL' | 'OVERDUE';
    reasonNotes: string;
    smsSentCount: number;
}

export const FeePromissoryTracker: React.FC = () => {
    const [notes, setNotes] = useState<PromissoryNote[]>([
        { id: 'p_1', studentName: 'Kevin Kamau', admNo: 'ADM-2024-089', parentName: 'John Kamau', parentPhone: '+254712345678', promisedAmount: 15000, promisedDate: '2026-09-15', status: 'PENDING', reasonNotes: 'Awaiting end of month salary deposit.', smsSentCount: 2 },
        { id: 'p_2', studentName: 'Faith Wanjiku', admNo: 'ADM-2024-112', parentName: 'Mary Wanjiku', parentPhone: '+254722987654', promisedAmount: 22000, promisedDate: '2026-08-10', status: 'OVERDUE', reasonNotes: 'Promised M-Pesa transfer pending.', smsSentCount: 4 },
        { id: 'p_3', studentName: 'Brian Otieno', admNo: 'ADM-2024-045', parentName: 'David Otieno', parentPhone: '+254733112233', promisedAmount: 18000, promisedDate: '2026-08-01', status: 'KEPT', reasonNotes: 'Paid via C2B Bank deposit.', smsSentCount: 1 },
    ]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newParentPhone, setNewParentPhone] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDate, setNewDate] = useState('');

    const sendSmsReminder = (id: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, smsSentCount: n.smsSentCount + 1 } : n));
        alert('📲 SMS Payment Reminder sent successfully to parent!');
    };

    const markStatus = (id: string, status: 'KEPT' | 'OVERDUE' | 'PENDING') => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, status } : n));
    };

    const addPromissoryNote = () => {
        if (!newStudentName || !newAmount || !newDate) return;
        const newNote: PromissoryNote = {
            id: `p_${Date.now()}`,
            studentName: newStudentName,
            admNo: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
            parentName: 'Parent / Sponsor',
            parentPhone: newParentPhone || '+254700000000',
            promisedAmount: parseFloat(newAmount),
            promisedDate: newDate,
            status: 'PENDING',
            reasonNotes: 'Promissory note logged by Finance Office.',
            smsSentCount: 0
        };
        setNotes([newNote, ...notes]);
        setShowAddModal(false);
        setNewStudentName('');
        setNewAmount('');
        setNewDate('');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        Education Finance Module
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Fee Promissory Note & Promise-to-Pay Tracker</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Track parent fee commitment notes, automated SMS payment alerts, and exam gate pass clearance
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <span>+ Log New Promissory Note</span>
                </button>
            </div>

            {/* Promissory Notes Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">
                        ACTIVE PARENT PROMISSORY NOTES LEDGER
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Student & Adm</th>
                                <th className="py-4">Parent Phone</th>
                                <th className="py-4">Promised Amount</th>
                                <th className="py-4">Promised Date</th>
                                <th className="py-4 text-center">SMS Alerts</th>
                                <th className="py-4 text-center">Status</th>
                                <th className="py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notes.map(n => (
                                <tr key={n.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {n.studentName}
                                        <div className="text-[10px] text-slate-400 font-bold">{n.admNo}</div>
                                    </td>
                                    <td className="py-4 text-xs font-mono font-bold text-indigo-300">{n.parentPhone}</td>
                                    <td className="py-4 font-mono font-black text-sm text-emerald-400">
                                        KES {n.promisedAmount.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{n.promisedDate}</td>
                                    <td className="py-4 text-center text-xs font-mono font-bold text-amber-400">
                                        {n.smsSentCount} Sent
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            n.status === 'KEPT'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : n.status === 'OVERDUE'
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                            {n.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right space-x-2">
                                        <button
                                            onClick={() => sendSmsReminder(n.id)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            📲 SMS Alert
                                        </button>
                                        <button
                                            onClick={() => markStatus(n.id, 'KEPT')}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            ✓ Mark Kept
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Log Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white">
                        <h3 className="text-lg font-black text-white text-center italic">Log Parent Promissory Note</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Student Full Name"
                                value={newStudentName}
                                onChange={e => setNewStudentName(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                            />
                            <input
                                type="text"
                                placeholder="Parent Phone (+254...)"
                                value={newParentPhone}
                                onChange={e => setNewParentPhone(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                            />
                            <input
                                type="number"
                                placeholder="Promised Amount (KES)"
                                value={newAmount}
                                onChange={e => setNewAmount(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                            />
                            <input
                                type="date"
                                value={newDate}
                                onChange={e => setNewDate(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase">Cancel</button>
                            <button onClick={addPromissoryNote} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">Save Note</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
