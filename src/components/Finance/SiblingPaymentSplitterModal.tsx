import React, { useState, useMemo } from 'react';
import type { User } from '../../types';

export interface SiblingAllocation {
    studentId: string;
    studentName: string;
    admNo: string;
    grade: string;
    allocatedAmount: number;
    voteHead: string;
    receiptNumber: string;
}

interface SiblingPaymentSplitterModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: User[];
    onConfirmSplitPayment: (splitData: {
        masterTxnRef: string;
        paymentMethod: 'M-PESA' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH';
        totalMasterAmount: number;
        allocations: SiblingAllocation[];
    }) => Promise<void>;
}

export const SiblingPaymentSplitterModal: React.FC<SiblingPaymentSplitterModalProps> = ({
    isOpen,
    onClose,
    students,
    onConfirmSplitPayment
}) => {
    const [masterTxnRef, setMasterTxnRef] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'M-PESA' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH'>('M-PESA');
    const [totalMasterAmount, setTotalMasterAmount] = useState<string>('');
    const [parentPhoneSearch, setParentPhoneSearch] = useState('');

    // Filter students by parent phone to find siblings
    const siblingCandidates = useMemo(() => {
        if (!parentPhoneSearch.trim()) return [];
        const clean = parentPhoneSearch.trim().toLowerCase();
        return students.filter(st => {
            const s = st as any;
            return (s.phoneNumber && String(s.phoneNumber).includes(clean)) ||
                (s.parentPhone && String(s.parentPhone).includes(clean)) ||
                (s.parentPhone2 && String(s.parentPhone2).includes(clean)) ||
                (s.name && String(s.name).toLowerCase().includes(clean));
        });
    }, [students, parentPhoneSearch]);

    const [selectedSiblings, setSelectedSiblings] = useState<SiblingAllocation[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const addSiblingToAllocation = (student: User) => {
        if (selectedSiblings.some(s => s.studentId === student.id)) return;
        const st = student as any;
        const count = selectedSiblings.length + 1;
        const newAllocation: SiblingAllocation = {
            studentId: student.id,
            studentName: student.name,
            admNo: st.admissionNumber || st.admNo || st.staffId || `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
            grade: st.className || st.grade || st.departmentName || st.courseName || 'Class',
            allocatedAmount: 0,
            voteHead: 'Tuition & Academic Fees',
            receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(64 + count)}`
        };
        setSelectedSiblings([...selectedSiblings, newAllocation]);
    };

    const updateAllocationAmount = (studentId: string, amount: number) => {
        setSelectedSiblings(prev => prev.map(s => s.studentId === studentId ? { ...s, allocatedAmount: amount } : s));
    };

    const totalAllocatedSum = useMemo(() => {
        return selectedSiblings.reduce((sum, s) => sum + Number(s.allocatedAmount || 0), 0);
    }, [selectedSiblings]);

    const masterAmountNum = parseFloat(totalMasterAmount) || 0;
    const isAmountBalanced = masterAmountNum > 0 && totalAllocatedSum === masterAmountNum;

    const handleProcessSplit = async () => {
        if (!masterTxnRef.trim()) {
            alert('Please enter Master Transaction Reference Code (e.g. M-Pesa Code QK78XY9012)');
            return;
        }
        if (selectedSiblings.length === 0) {
            alert('Please add at least 2 siblings for payment splitting.');
            return;
        }
        if (!isAmountBalanced) {
            alert(`Allocated sum (KES ${totalAllocatedSum.toLocaleString()}) does not match Master Transaction Amount (KES ${masterAmountNum.toLocaleString()})!`);
            return;
        }

        setIsProcessing(true);
        try {
            await onConfirmSplitPayment({
                masterTxnRef,
                paymentMethod,
                totalMasterAmount: masterAmountNum,
                allocations: selectedSiblings
            });
            alert('✅ Sibling Payment Split Successfully! Individual receipts with unique receipt numbers have been issued for each student.');
            onClose();
        } catch (err: any) {
            alert('Failed to process split payment: ' + (err?.message || err));
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-slate-900 border border-purple-500/40 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-black rounded-full border border-purple-500/30 uppercase tracking-wider">
                            Education Finance Tool
                        </span>
                        <h3 className="text-2xl font-black italic mt-1 text-white">Sibling Payment Splitter & Multi-Receipt Generator</h3>
                        <p className="text-xs text-slate-300 font-medium mt-0.5">
                            Split a single bulk M-Pesa / Bank transaction across siblings and issue distinct official receipts.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white text-lg font-bold">✕</button>
                </div>

                {/* Master Transaction Details */}
                <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider">1. Master Transaction Entry</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            type="text"
                            placeholder="M-Pesa / Bank Ref (e.g. QK78XY9012)"
                            value={masterTxnRef}
                            onChange={e => setMasterTxnRef(e.target.value.toUpperCase())}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white uppercase"
                        />
                        <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value as any)}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white"
                        >
                            <option value="M-PESA">M-PESA C2B</option>
                            <option value="BANK_DEPOSIT">BANK DIRECT DEPOSIT</option>
                            <option value="CHEQUE">BANK CHEQUE</option>
                            <option value="CASH">CASH AT COUNTER</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Total Paid Amount (KES)"
                            value={totalMasterAmount}
                            onChange={e => setTotalMasterAmount(e.target.value)}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400"
                        />
                    </div>
                </div>

                {/* Search & Add Siblings */}
                <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider">2. Detect & Select Enrolled Siblings</h4>
                    <input
                        type="text"
                        placeholder="Search by Parent Phone or Student Name..."
                        value={parentPhoneSearch}
                        onChange={e => setParentPhoneSearch(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    />

                    {siblingCandidates.length > 0 && (
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Click to add student to split allocation:</span>
                            {siblingCandidates.map(st => (
                                <div
                                    key={st.id}
                                    onClick={() => addSiblingToAllocation(st)}
                                    className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex justify-between items-center cursor-pointer transition-all"
                                >
                                    <div>
                                        <span className="font-black italic text-xs text-white">{st.name}</span>
                                        <span className="text-[10px] text-slate-400 ml-2 font-mono">{(st as any).admissionNumber || (st as any).admNo || st.staffId}</span>
                                    </div>
                                    <span className="text-xs font-bold text-purple-400">+ Add to Split</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Allocated Amounts & Individual Receipts Table */}
                {selectedSiblings.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider">3. Sibling Allocation & Distinct Receipt Numbers</h4>
                            <span className={`text-xs font-black font-mono px-3 py-1 rounded-full ${
                                isAmountBalanced ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                                Allocated: KES {totalAllocatedSum.toLocaleString()} / KES {masterAmountNum.toLocaleString()}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {selectedSiblings.map((sib, idx) => (
                                <div key={sib.studentId} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <span className="font-black italic text-sm text-white">{sib.studentName}</span>
                                        <div className="text-[10px] font-mono text-slate-400">{sib.admNo} • {sib.grade}</div>
                                        <div className="text-[10px] font-mono text-indigo-400 font-bold mt-1">
                                            Unique Receipt #: <span className="text-emerald-400">{sib.receiptNumber}</span>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-48">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Allocated Amount (KES)</label>
                                        <input
                                            type="number"
                                            value={sib.allocatedAmount || ''}
                                            onChange={e => updateAllocationAmount(sib.studentId, parseFloat(e.target.value) || 0)}
                                            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-black text-emerald-400"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProcessSplit}
                        disabled={isProcessing || !isAmountBalanced || selectedSiblings.length === 0}
                        className={`flex-1 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${
                            isAmountBalanced && selectedSiblings.length > 0
                                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isProcessing ? 'Processing Split...' : '✨ Process Split & Issue Separate Receipts'}
                    </button>
                </div>
            </div>
        </div>
    );
};
