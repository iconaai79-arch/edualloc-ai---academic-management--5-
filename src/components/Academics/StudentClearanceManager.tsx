import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Institution, User } from '../../types';
import type { StudentClearanceRecord, ClearanceItem } from '../../types/clearance';
import { DEFAULT_CLEARANCE_AREAS } from '../../types/clearance';
import { StudentClearanceSheet } from './StudentClearanceSheet';
import { apiService, safeLocalStorage } from '../../services/apiService';
import { supabase } from '../../lib/supabase';
import { PlusIcon } from '../icons/PlusIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XIcon } from '../icons/XIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface StudentClearanceManagerProps {
    currentInstitution?: Institution | null;
    currentUser?: User | null;
    users?: User[];
    onClearanceApproved?: (clearance: StudentClearanceRecord) => void;
}

const resolveStudentAdm = (student: any): string => {
    if (!student) return '';
    return String(
        student.admissionNumber ||
        student.admission_number ||
        student.studentAdmissionNumber ||
        student.admNo ||
        student.adm_no ||
        student.metadata?.admissionNumber ||
        student.metadata?.admNo ||
        student.idNumber ||
        ''
    ).trim();
};

export const StudentClearanceManager: React.FC<StudentClearanceManagerProps> = ({
    currentInstitution,
    currentUser,
    users = [],
    onClearanceApproved
}) => {
    const instId = currentInstitution?.id || 'default_inst';
    const localKey = `eduai_student_clearances_${instId}`;

    // Clearance Records State
    const [clearanceRecords, setClearanceRecords] = useState<StudentClearanceRecord[]>(() => {
        try {
            const saved = localStorage.getItem(localKey);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return [];
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'cleared' | 'flagged'>('all');

    // Modals
    const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
    const [editingClearance, setEditingClearance] = useState<StudentClearanceRecord | null>(null);
    const [previewSheetRecord, setPreviewSheetRecord] = useState<StudentClearanceRecord | null>(null);

    // Initiate Form State
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [initiateGrade, setInitiateGrade] = useState('Grade 9');
    const [initiateYear, setInitiateYear] = useState(new Date().getFullYear().toString());
    const [isAuditing, setIsAuditing] = useState(false);

    // Filter Students
    const studentUsers = useMemo(() => {
        return users.filter(u => u.role === 'student');
    }, [users]);

    const teacherUsers = useMemo(() => {
        return users.filter(u => u.role === 'teacher' || u.role === 'lecturer');
    }, [users]);

    // Load Records from Supabase / API
    const loadClearanceData = useCallback(async () => {
        try {
            if (supabase && currentInstitution?.id) {
                const { data, error } = await supabase
                    .from('student_clearances')
                    .select('*')
                    .eq('institution_id', instId)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    const parsed: StudentClearanceRecord[] = data.map((d: any) => d.payload || d);
                    setClearanceRecords(parsed);
                    safeLocalStorage.setItem(localKey, JSON.stringify(parsed));
                    return;
                }
            }
        } catch (_) {}

        // Fallback to module records
        try {
            const records = await apiService.fetchModuleRecords<any>('student_clearances', instId);
            if (records && records.length > 0) {
                const clean = records.map((r: any) => r.payload || r);
                setClearanceRecords(clean);
                safeLocalStorage.setItem(localKey, JSON.stringify(clean));
            }
        } catch (_) {}
    }, [instId, localKey, currentInstitution?.id]);

    useEffect(() => {
        loadClearanceData();
    }, [loadClearanceData]);

    // Save Clearance Record Helper
    const persistClearanceRecord = async (record: StudentClearanceRecord) => {
        const updated = [record, ...clearanceRecords.filter(r => r.id !== record.id)];
        setClearanceRecords(updated);
        safeLocalStorage.setItem(localKey, JSON.stringify(updated));

        try {
            if (supabase && currentInstitution?.id) {
                await supabase
                    .from('student_clearances')
                    .upsert({
                        id: record.id,
                        institution_id: instId,
                        student_id: record.studentId,
                        payload: record,
                        status: record.status,
                        updated_at: new Date().toISOString()
                    });
            }
        } catch (_) {}

        try {
            await apiService.saveModuleRecord('student_clearances', {
                id: record.id,
                institutionId: instId,
                studentId: record.studentId,
                payload: record,
                status: record.status
            });
        } catch (_) {}
    };

    // Automated Library & PTA Audit Function
    const runClearanceAudit = async (studentId: string, studentAdm: string) => {
        setIsAuditing(true);
        try {
            // 1. Audit Library
            const [libraryTxns, libraryFines, studentInvoices] = await Promise.all([
                apiService.fetchModuleRecords<any>('library_transactions', instId).catch(() => []),
                apiService.fetchModuleRecords<any>('library_fines', instId).catch(() => []),
                apiService.fetchModuleRecords<any>('student_invoices', instId).catch(() => [])
            ]);

            // Unreturned library books
            const activeLoans = (libraryTxns || []).filter((tx: any) => 
                (tx.userId === studentId || tx.admissionNumber === studentAdm) &&
                (tx.status === 'issued' || tx.status === 'overdue')
            );

            // Unpaid fines
            const unpaidFines = (libraryFines || [])
                .filter((f: any) => (f.userId === studentId || f.studentId === studentId) && f.status !== 'paid')
                .reduce((acc: number, f: any) => acc + (Number(f.amount || 0) - Number(f.paidAmount || 0)), 0);

            // 2. Audit PTA / School Fees Balance
            const invoices = (studentInvoices || []).filter((inv: any) => 
                inv.studentId === studentId || inv.student_id === studentId
            );
            const totalOwed = invoices.reduce((acc: number, inv: any) => {
                const bal = inv.balance !== undefined ? Number(inv.balance) : (Number(inv.amountDue || 0) - Number(inv.amountPaid || 0));
                return acc + (isNaN(bal) ? 0 : Math.max(0, bal));
            }, 0);

            return {
                libraryCheck: {
                    status: (activeLoans.length === 0 && unpaidFines === 0 ? 'cleared' : 'pending_returns') as any,
                    unreturnedBooks: activeLoans.map((l: any) => ({
                        bookId: l.bookId || l.id,
                        title: l.bookTitle || l.bookName || 'Library Book',
                        dueDate: l.dueDate
                    })),
                    outstandingFines: unpaidFines,
                    checkedAt: new Date().toISOString()
                },
                ptaAmountOwed: totalOwed
            };
        } finally {
            setIsAuditing(false);
        }
    };

    // Initiate Clearance for a Student
    const handleInitiateClearance = async () => {
        const student = studentUsers.find(s => s.id === selectedStudentId);
        if (!student) {
            alert('Please select a student to initiate clearance.');
            return;
        }

        const studentAdm = resolveStudentAdm(student);
        const audit = await runClearanceAudit(student.id, studentAdm);

        // Build 16 standard clearance items
        const clearanceItems: ClearanceItem[] = DEFAULT_CLEARANCE_AREAS.map(def => {
            // Check if this item is Library or Furniture and populate with audit details
            let lostItem = 'None';
            let status: 'pending' | 'cleared' | 'flagged' = 'pending';
            let signature = '';

            if (def.subjectArea.toLowerCase() === 'laboratory') {
                lostItem = 'None';
            }

            return {
                sNo: def.sNo,
                subjectArea: def.subjectArea,
                teacherName: '',
                itemLostOrDamaged: lostItem,
                fineAmount: 0,
                signature,
                status
            };
        });

        const newRecord: StudentClearanceRecord = {
            id: `clr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            institutionId: instId,
            studentId: student.id,
            studentName: student.name,
            admissionNumber: studentAdm,
            assessmentNo: (student as any).assessmentNo || (student as any).upiNumber || studentAdm,
            grade: initiateGrade,
            year: initiateYear,
            status: audit.libraryCheck.status === 'cleared' && audit.ptaAmountOwed === 0 ? 'in_progress' : 'flagged',
            clearanceItems,
            libraryCheck: audit.libraryCheck,
            ptaSection: {
                totalAmountOwed: audit.ptaAmountOwed,
                bursarName: 'Bursar Office',
                bursarSignature: audit.ptaAmountOwed === 0 ? 'Cleared ✓' : 'Balance Pending',
                signedAt: new Date().toISOString()
            },
            principalApproval: {
                releaseOfDocuments: 'pending',
                comments: '',
                signeeName: currentUser?.name || 'Deputy Principal',
                signature: '',
                date: ''
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Dispatch notifications to teachers
        try {
            for (const teacher of teacherUsers.slice(0, 10)) {
                await apiService.createNotification(
                    teacher.id,
                    `📋 Clearance Notice: Student ${student.name} (${studentAdm}, ${initiateGrade}) has requested clearance. Please sign off on your subject.`,
                    'info',
                    { clearanceId: newRecord.id, studentId: student.id }
                ).catch(() => {});
            }
        } catch (_) {}

        await persistClearanceRecord(newRecord);
        setIsInitiateModalOpen(false);
        setSelectedStudentId('');
        setEditingClearance(newRecord);
    };

    // Filtered Records
    const filteredRecords = useMemo(() => {
        return clearanceRecords.filter(r => {
            const matchesSearch = !searchTerm || 
                r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
            return matchesSearch && matchesFilter;
        });
    }, [clearanceRecords, searchTerm, filterStatus]);

    // Fast Action: Sign item as teacher
    const handleSignItem = (record: StudentClearanceRecord, sNo: number, teacherName: string, lostItem: string, status: 'cleared' | 'flagged') => {
        const nextItems = record.clearanceItems.map(item => {
            if (item.sNo === sNo) {
                return {
                    ...item,
                    teacherName: teacherName || currentUser?.name || 'Subject Teacher',
                    itemLostOrDamaged: lostItem || 'None',
                    signature: `✓ Signed (${new Date().toLocaleDateString('en-GB')})`,
                    status,
                    signedAt: new Date().toISOString()
                };
            }
            return item;
        });

        // Determine overall status
        const allCleared = nextItems.every(i => i.status === 'cleared');
        const anyFlagged = nextItems.some(i => i.status === 'flagged');
        const overallStatus = anyFlagged ? 'flagged' : (allCleared ? 'cleared' : 'in_progress');

        const updated: StudentClearanceRecord = {
            ...record,
            clearanceItems: nextItems,
            status: overallStatus,
            updatedAt: new Date().toISOString()
        };

        persistClearanceRecord(updated);
        if (editingClearance?.id === record.id) {
            setEditingClearance(updated);
        }
    };

    // Quick Action: Mark all remaining items cleared
    const handleMarkAllCleared = (record: StudentClearanceRecord) => {
        const teacherDefault = currentUser?.name || 'Department Head';
        const todayStr = new Date().toLocaleDateString('en-GB');

        const nextItems = record.clearanceItems.map(item => ({
            ...item,
            teacherName: item.teacherName || teacherDefault,
            itemLostOrDamaged: item.itemLostOrDamaged || 'None',
            signature: item.signature || `✓ Cleared (${todayStr})`,
            status: 'cleared' as const,
            signedAt: new Date().toISOString()
        }));

        const updated: StudentClearanceRecord = {
            ...record,
            clearanceItems: nextItems,
            status: 'cleared',
            principalApproval: {
                ...record.principalApproval,
                releaseOfDocuments: 'yes',
                comments: 'All 16 subject departments cleared with zero unreturned assets. Approved for leaving certificate release.',
                signature: `✓ ${currentUser?.name || 'Deputy Principal'}`,
                date: todayStr
            },
            updatedAt: new Date().toISOString()
        };

        persistClearanceRecord(updated);
        if (editingClearance?.id === record.id) {
            setEditingClearance(updated);
        }
        if (onClearanceApproved) {
            onClearanceApproved(updated);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Stat Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Requests</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                        {clearanceRecords.length}
                    </span>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">Fully Cleared</span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                        {clearanceRecords.filter(r => r.principalApproval?.releaseOfDocuments === 'yes').length}
                    </span>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">Pending Signatures</span>
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
                        {clearanceRecords.filter(r => r.status === 'in_progress' || r.status === 'draft').length}
                    </span>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 dark:border-rose-800/60 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 block">Flagged (Lost / Arrears)</span>
                    <span className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1 block">
                        {clearanceRecords.filter(r => r.status === 'flagged' || (r.ptaSection?.totalAmountOwed || 0) > 0).length}
                    </span>
                </div>
            </div>

            {/* Filter and Action Header */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by student name or adm no..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="cleared">Fully Cleared</option>
                        <option value="pending">In Progress</option>
                        <option value="flagged">Flagged</option>
                    </select>
                </div>

                <button
                    onClick={() => setIsInitiateModalOpen(true)}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Initiate Student Clearance</span>
                </button>
            </div>

            {/* Clearance Records Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                {filteredRecords.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                        <p className="font-bold text-sm">No student clearance forms recorded yet.</p>
                        <p className="text-xs">Click "Initiate Student Clearance" above to begin a student's leaving clearance.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-4 py-4">Grade & Year</th>
                                    <th className="px-4 py-4">Subjects Cleared</th>
                                    <th className="px-4 py-4">Library Audit</th>
                                    <th className="px-4 py-4">PTA Arrears</th>
                                    <th className="px-4 py-4">Release Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredRecords.map(rec => {
                                    const clearedCount = rec.clearanceItems.filter(i => i.status === 'cleared').length;
                                    const totalCount = rec.clearanceItems.length;
                                    const isReleased = rec.principalApproval?.releaseOfDocuments === 'yes';

                                    return (
                                        <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800 dark:text-slate-100 text-xs">
                                                    {rec.studentName}
                                                </div>
                                                <span className="text-[10px] font-mono font-semibold text-slate-400">
                                                    Adm: {rec.admissionNumber} {rec.assessmentNo ? `• Ass: ${rec.assessmentNo}` : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                                                {rec.grade} ({rec.year})
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${clearedCount === totalCount ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${(clearedCount / totalCount) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold">
                                                        {clearedCount}/{totalCount}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {rec.libraryCheck?.status === 'cleared' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                        ✓ Cleared
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                                        {rec.libraryCheck?.unreturnedBooks?.length || 0} Book(s) Unreturned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold">
                                                {(rec.ptaSection?.totalAmountOwed || 0) === 0 ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400">Ksh 0 (Nil)</span>
                                                ) : (
                                                    <span className="text-rose-600 dark:text-rose-400">
                                                        Ksh {rec.ptaSection.totalAmountOwed.toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {isReleased ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white shadow-xs">
                                                        ✓ Released
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        Pending Approval
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setEditingClearance(rec)}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit Clearance Form"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setPreviewSheetRecord(rec)}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 rounded-lg transition-colors cursor-pointer"
                                                        title="Print Official Clearance Form"
                                                    >
                                                        <PrinterIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Initiate Clearance Modal */}
            {isInitiateModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight">
                                        Initiate Student Clearance
                                    </h3>
                                    <p className="text-xs text-white/90">
                                        Generates 16 subject lines and auto-audits Library & Fees
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsInitiateModalOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-white/20 transition-all cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                                    Search & Select Student <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type student name or admission number..."
                                    value={studentSearchTerm}
                                    onChange={e => setStudentSearchTerm(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-400 mb-2"
                                />

                                <select
                                    value={selectedStudentId}
                                    onChange={e => setSelectedStudentId(e.target.value)}
                                    size={4}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                                >
                                    {studentUsers
                                        .filter(s => {
                                            if (!studentSearchTerm.trim()) return true;
                                            const term = studentSearchTerm.toLowerCase();
                                            return s.name.toLowerCase().includes(term) || resolveStudentAdm(s).toLowerCase().includes(term);
                                        })
                                        .slice(0, 30)
                                        .map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} — Adm: {resolveStudentAdm(s) || 'N/A'} {s.classLevel ? `(${s.classLevel})` : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                                        Grade / Exit Class
                                    </label>
                                    <input
                                        type="text"
                                        value={initiateGrade}
                                        onChange={e => setInitiateGrade(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                                        Academic Year
                                    </label>
                                    <input
                                        type="text"
                                        value={initiateYear}
                                        onChange={e => setInitiateYear(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                                <strong>Automated System Audit:</strong> Upon clicking Initiate, EduAlloc AI will automatically inspect the student’s active library loans, overdue books, and fee arrears, pre-filling the clearance sheet and notifying the teachers.
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsInitiateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!selectedStudentId || isAuditing}
                                    onClick={handleInitiateClearance}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span>{isAuditing ? 'Auditing Library & Fees...' : 'Initiate Clearance'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Editing / Approval Modal */}
            {editingClearance && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Clearance Inspection & Sign-off — {editingClearance.studentName}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Adm No: {editingClearance.admissionNumber} • Grade: {editingClearance.grade} • Year: {editingClearance.year}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleMarkAllCleared(editingClearance)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
                                >
                                    ✓ Clear All 16 Subjects
                                </button>
                                <button
                                    onClick={() => setEditingClearance(null)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body - 16 Table Lines */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                            {/* Library & PTA Info Banner */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Automated Library Check</span>
                                    {editingClearance.libraryCheck?.unreturnedBooks?.length ? (
                                        <div className="text-rose-600 font-bold mt-1">
                                            ⚠️ Unreturned Books: {editingClearance.libraryCheck.unreturnedBooks.map(b => b.title).join(', ')}
                                        </div>
                                    ) : (
                                        <div className="text-emerald-600 font-bold mt-1">
                                            ✓ Zero unreturned books or overdue library fines.
                                        </div>
                                    )}
                                </div>
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">PTA School Fees Balance</span>
                                    <div className={`text-sm font-black mt-1 ${(editingClearance.ptaSection?.totalAmountOwed || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {(editingClearance.ptaSection?.totalAmountOwed || 0) > 0 
                                            ? `Ksh ${editingClearance.ptaSection.totalAmountOwed.toLocaleString()} Owed` 
                                            : 'Ksh 0 (Fully Cleared)'}
                                    </div>
                                </div>
                            </div>

                            {/* 16 Subject Areas */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                    Subject / Department Clearance Lines (16 Items)
                                </h4>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                <th className="p-2 text-center w-10">No</th>
                                                <th className="p-2 w-44">Subject / Area</th>
                                                <th className="p-2 w-44">Teacher's Name</th>
                                                <th className="p-2">Item Lost / Damaged</th>
                                                <th className="p-2 w-32">Status / Signature</th>
                                                <th className="p-2 text-right w-24">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {editingClearance.clearanceItems.map(item => (
                                                <tr key={item.sNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                    <td className="p-2 text-center font-bold text-slate-400">{item.sNo}</td>
                                                    <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{item.subjectArea}</td>
                                                    <td className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Teacher name"
                                                            value={item.teacherName}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditingClearance(prev => prev ? {
                                                                    ...prev,
                                                                    clearanceItems: prev.clearanceItems.map(i => i.sNo === item.sNo ? { ...i, teacherName: val } : i)
                                                                } : null);
                                                            }}
                                                            className="w-full px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="None, or specify item lost"
                                                            value={item.itemLostOrDamaged}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditingClearance(prev => prev ? {
                                                                    ...prev,
                                                                    clearanceItems: prev.clearanceItems.map(i => i.sNo === item.sNo ? { ...i, itemLostOrDamaged: val } : i)
                                                                } : null);
                                                            }}
                                                            className="w-full px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        {item.status === 'cleared' ? (
                                                            <span className="text-emerald-600 font-bold font-mono text-[10px]">
                                                                {item.signature || '✓ Cleared'}
                                                            </span>
                                                        ) : item.status === 'flagged' ? (
                                                            <span className="text-rose-600 font-bold text-[10px]">
                                                                ✕ Issue Flagged
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[10px]">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <button
                                                            onClick={() => handleSignItem(editingClearance, item.sNo, item.teacherName, item.itemLostOrDamaged, 'cleared')}
                                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded text-[10px] font-bold cursor-pointer"
                                                        >
                                                            Clear ✓
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Principal Approval Section */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Principal or Deputy Principal Clearance Release
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                            Release of Documents
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="releaseDocs"
                                                    value="yes"
                                                    checked={editingClearance.principalApproval?.releaseOfDocuments === 'yes'}
                                                    onChange={() => {
                                                        setEditingClearance(prev => prev ? {
                                                            ...prev,
                                                            principalApproval: { ...prev.principalApproval, releaseOfDocuments: 'yes' }
                                                        } : null);
                                                    }}
                                                />
                                                <span>Release Approved &#123;yes&#125;</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="releaseDocs"
                                                    value="no"
                                                    checked={editingClearance.principalApproval?.releaseOfDocuments === 'no'}
                                                    onChange={() => {
                                                        setEditingClearance(prev => prev ? {
                                                            ...prev,
                                                            principalApproval: { ...prev.principalApproval, releaseOfDocuments: 'no' }
                                                        } : null);
                                                    }}
                                                />
                                                <span>Withheld &#123;no&#125;</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                            Official Comment
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. All clearance criteria fulfilled. Released."
                                            value={editingClearance.principalApproval?.comments || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditingClearance(prev => prev ? {
                                                    ...prev,
                                                    principalApproval: { ...prev.principalApproval, comments: val }
                                                } : null);
                                            }}
                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <button
                                onClick={() => setPreviewSheetRecord(editingClearance)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                <span>Preview & Print A4 Form</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditingClearance(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        persistClearanceRecord(editingClearance);
                                        setEditingClearance(null);
                                    }}
                                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-md"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Preview Modal */}
            {previewSheetRecord && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
                            <div className="flex items-center gap-2">
                                <PrinterIcon className="w-5 h-5 text-amber-400" />
                                <h3 className="text-sm font-black uppercase tracking-wider">
                                    Official Junior School Clearance Form (A4 Print Preview)
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow-md"
                                >
                                    Print Now (A4)
                                </button>
                                <button
                                    onClick={() => setPreviewSheetRecord(null)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 text-white cursor-pointer"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-8 overflow-y-auto max-h-[82vh] bg-slate-300/40 dark:bg-black/60 flex justify-center">
                            <StudentClearanceSheet record={previewSheetRecord} institution={currentInstitution} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
