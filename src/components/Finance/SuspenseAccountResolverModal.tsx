import React, { useState, useMemo } from 'react';
import { XIcon } from '../icons/XIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { MpesaIcon } from '../icons/MpesaIcon';
import { UserIcon } from '../icons/UserIcon';
import { apiService } from '../../services/apiService';

export interface UnmatchedTransaction {
    id: string;
    institutionId: string;
    transactionCode: string;
    channel: 'M-Pesa C2B' | 'Bank Deposit' | 'Direct Transfer' | 'Cheque';
    bankName?: string;
    amount: number;
    accountReferenceEntered: string;
    payerName: string;
    payerPhone?: string;
    paymentDate: string;
    status: 'Unmatched' | 'Resolved' | 'Refunded';
    notes?: string;
    resolvedStudentId?: string;
    resolvedStudentName?: string;
    resolvedAt?: string;
}

interface SuspenseAccountResolverModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: UnmatchedTransaction | null;
    students: any[];
    institutionId: string;
    userName?: string;
    onResolved: () => void;
}

export function SuspenseAccountResolverModal({
    isOpen,
    onClose,
    transaction,
    students,
    institutionId,
    userName,
    onResolved
}: SuspenseAccountResolverModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [sendSmsNotification, setSendSmsNotification] = useState(true);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Compute smart fuzzy matches for the transaction
    const suggestedStudents = useMemo(() => {
        if (!transaction || !students.length) return [];
        const ref = (transaction.accountReferenceEntered || '').toLowerCase().trim();
        const payer = (transaction.payerName || '').toLowerCase().trim();
        const phone = (transaction.payerPhone || '').trim();

        return students.map(s => {
            let score = 0;
            const adm = (s.admissionNumber || s.admission_number || '').toLowerCase();
            const name = (s.fullName || s.name || '').toLowerCase();
            const parentPhone = (s.parentPhone || s.emergencyContactPhone || s.phone || '').trim();

            if (ref && adm && adm.includes(ref)) score += 60;
            if (ref && ref.length > 2 && adm.includes(ref.slice(-4))) score += 40;
            if (payer && name && name.includes(payer.split(' ')[0])) score += 35;
            if (phone && parentPhone && phone === parentPhone) score += 50;

            return { student: s, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    }, [transaction, students]);

    const filteredSearchStudents = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return students.filter(s => {
            const adm = (s.admissionNumber || s.admission_number || '').toLowerCase();
            const name = (s.fullName || s.name || '').toLowerCase();
            const parent = (s.parentName || '').toLowerCase();
            return adm.includes(q) || name.includes(q) || parent.includes(q);
        }).slice(0, 10);
    }, [searchQuery, students]);

    if (!isOpen || !transaction) return null;

    const activeSelectedStudent = students.find(s => s.id === selectedStudentId);

    const handleConfirmResolution = async () => {
        if (!selectedStudentId || !activeSelectedStudent) {
            alert('Please select a student to re-allocate this payment.');
            return;
        }

        setIsSubmitting(true);
        try {
            const receiptId = `RCT-${Date.now()}`;
            const studentName = activeSelectedStudent.fullName || activeSelectedStudent.name;
            const admNo = activeSelectedStudent.admissionNumber || activeSelectedStudent.admission_number || 'N/A';

            // 1. Post receipt to student fee ledger
            const receiptRecord = {
                id: receiptId,
                receiptNumber: receiptId,
                institutionId,
                studentId: selectedStudentId,
                studentName,
                admissionNumber: admNo,
                amount: transaction.amount,
                paymentMethod: transaction.channel.includes('M-Pesa') ? 'M-Pesa' : 'Bank Deposit',
                referenceNumber: transaction.transactionCode,
                receivedFrom: transaction.payerName || 'Parent / Guardian',
                date: transaction.paymentDate || new Date().toISOString().split('T')[0],
                status: 'Paid',
                term: 'Term 1',
                academicYear: new Date().getFullYear().toString(),
                notes: `Reallocated from Suspense Account. Ref: ${transaction.transactionCode}. ${resolutionNotes}`,
                createdBy: userName || 'Finance Officer',
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('fee_receipts', receiptRecord);

            // 2. Update Suspense Transaction status
            const updatedSuspense = {
                ...transaction,
                status: 'Resolved',
                resolvedStudentId: selectedStudentId,
                resolvedStudentName: `${studentName} (${admNo})`,
                notes: resolutionNotes || `Assigned to ${studentName} by ${userName || 'Finance Officer'}`,
                resolvedAt: new Date().toISOString()
            };

            await apiService.updateModuleRecord('suspense_transactions', transaction.id, updatedSuspense).catch(() => {
                return apiService.saveModuleRecord('suspense_transactions', updatedSuspense);
            });

            // 3. Dispatch SMS notification to parent if enabled
            if (sendSmsNotification && (transaction.payerPhone || activeSelectedStudent.parentPhone)) {
                const targetPhone = transaction.payerPhone || activeSelectedStudent.parentPhone;
                await apiService.sendSms(
                    targetPhone,
                    `Dear Parent, your fee payment of KES ${transaction.amount.toLocaleString()} (Ref: ${transaction.transactionCode}) has been successfully credited to ${studentName} (Adm: ${admNo}). Thank you.`,
                    undefined,
                    1,
                    institutionId
                ).catch(() => null);
            }

            alert(`✓ Payment KES ${transaction.amount.toLocaleString()} successfully allocated to ${studentName} (${admNo})! Receipt ${receiptId} generated.`);
            onResolved();
            onClose();
        } catch (err: any) {
            console.error('Suspense resolution error:', err);
            alert(`Failed to resolve suspense payment: ${err?.message || err}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden text-white animate-zoom-in flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight italic">Unmatched Payment <span className="text-amber-400">Resolver</span></h3>
                            <p className="text-[10px] text-amber-200/70 uppercase tracking-widest font-bold">Suspense Account Allocation Node</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Transaction Summary Card */}
                <div className="p-6 bg-white/[0.03] border-b border-white/10 shrink-0 space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase rounded-lg">
                                    {transaction.channel}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-300">
                                    Code: {transaction.transactionCode}
                                </span>
                            </div>
                            <h4 className="text-2xl font-black tracking-tight text-white mt-1">
                                KES {transaction.amount.toLocaleString()}
                            </h4>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entered Reference</p>
                            <p className="text-sm font-black text-amber-400 bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-500/30 mt-0.5">
                                "{transaction.accountReferenceEntered || 'None'}"
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-white/5">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">Payer Name:</span>
                            <p className="font-bold text-white">{transaction.payerName || 'Unknown Payer'}</p>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">Payer Phone:</span>
                            <p className="font-bold text-white">{transaction.payerPhone || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Body: Matcher & Search */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* AI Smart Suggestions */}
                    {suggestedStudents.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-1">
                                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                                <span>Smart System Matching Suggestions ({suggestedStudents.length})</span>
                            </label>
                            <div className="space-y-2">
                                {suggestedStudents.map(({ student, score }) => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                                            selectedStudentId === student.id
                                                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/30'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                                                selectedStudentId === student.id ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white'
                                            }`}>
                                                {(student.fullName || student.name || 'S')[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight text-white">
                                                    {student.fullName || student.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold">
                                                    Adm: <span className="text-emerald-300 font-mono">{student.admissionNumber || student.admission_number || 'N/A'}</span> • Class: {student.gradeLevel || student.studentClass || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                score >= 60 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            }`}>
                                                {score >= 60 ? '🎯 High Confidence' : '🔍 Partial Match'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manual Search Bar */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Search All Students by Name or Admission #
                        </label>
                        <div className="relative">
                            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Type Admission # (e.g. ADM-2024-0012) or Student Name..."
                                className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-white outline-none uppercase"
                            />
                        </div>

                        {/* Search Results dropdown list */}
                        {filteredSearchStudents.length > 0 && (
                            <div className="space-y-1 max-h-48 overflow-y-auto bg-slate-950 p-2 rounded-2xl border border-white/10">
                                {filteredSearchStudents.map(student => (
                                    <div
                                        key={student.id}
                                        onClick={() => {
                                            setSelectedStudentId(student.id);
                                            setSearchQuery('');
                                        }}
                                        className={`p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                                            selectedStudentId === student.id ? 'bg-amber-600/30 text-white font-bold' : 'hover:bg-white/5 text-slate-300'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-xs font-black uppercase">{student.fullName || student.name}</p>
                                            <p className="text-[9px] text-slate-400">Adm: {student.admissionNumber || student.admission_number || 'N/A'}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-400">Select</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Student Confirmation Card */}
                    {activeSelectedStudent && (
                        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-2">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center space-x-1">
                                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                <span>Target Student Selected for Fee Credit</span>
                            </p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-base font-black text-white uppercase">{activeSelectedStudent.fullName || activeSelectedStudent.name}</p>
                                    <p className="text-xs text-emerald-200">
                                        Admission #: <span className="font-mono font-bold">{activeSelectedStudent.admissionNumber || activeSelectedStudent.admission_number}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-white">KES {transaction.amount.toLocaleString()}</p>
                                    <p className="text-[9px] text-emerald-300">Will be credited to Fee Ledger</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SMS Notification Toggle & Notes */}
                    <div className="space-y-3 pt-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={sendSmsNotification}
                                onChange={e => setSendSmsNotification(e.target.checked)}
                                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-black/40 border-white/10"
                            />
                            <span className="text-xs font-bold text-slate-300">
                                Send SMS notification receipt to parent ({transaction.payerPhone || activeSelectedStudent?.parentPhone || 'Phone Registered'})
                            </span>
                        </label>

                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Resolution Audit Remarks</label>
                            <input
                                type="text"
                                value={resolutionNotes}
                                onChange={e => setResolutionNotes(e.target.value)}
                                placeholder="e.g. Parent confirmed payment receipt via phone call..."
                                className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-slate-950 flex justify-between items-center shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 border border-white/10 rounded-2xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmResolution}
                        disabled={!selectedStudentId || isSubmitting}
                        className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-amber-950/50 disabled:opacity-40 flex items-center space-x-2 italic"
                    >
                        {isSubmitting ? (
                            <span>Re-allocating Funds...</span>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4 text-slate-950" />
                                <span>Re-allocate KES {transaction.amount.toLocaleString()} &amp; Issue Receipt</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
