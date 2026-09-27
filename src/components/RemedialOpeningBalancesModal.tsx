import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    X,
    UploadCloud,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Trash2,
    Search,
    UserCheck,
    Banknote,
    Calendar,
    ArrowRight,
    RefreshCw,
    Edit3
} from 'lucide-react';
import type { User, RemedialTeacherOpeningBalance } from '../types';
import { apiService } from '../services/apiService';

interface RemedialOpeningBalancesModalProps {
    isOpen: boolean;
    onClose: () => void;
    institutionId: string;
    currentUser?: User | null;
    teachersList: User[];
    teacherCodes: Record<string, string>;
    existingBalances: RemedialTeacherOpeningBalance[];
    onBalancesUpdated: (updatedBalances: RemedialTeacherOpeningBalance[]) => void;
    currentTerm?: string;
    currentYear?: string;
}

interface ParsedUploadRow {
    id: string;
    teacherId: string;
    teacherName: string;
    teacherCode: string;
    amount: number;
    balanceType: 'payable' | 'advance';
    term: string;
    notes: string;
    isMatched: boolean;
    originalRow: any;
}

export const RemedialOpeningBalancesModal: React.FC<RemedialOpeningBalancesModalProps> = ({
    isOpen,
    onClose,
    institutionId,
    currentUser,
    teachersList,
    teacherCodes,
    existingBalances,
    onBalancesUpdated,
    currentTerm = 'Term 1',
    currentYear = new Date().getFullYear().toString()
}) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'existing'>('upload');
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Upload & parsed rows state
    const [parsedRows, setParsedRows] = useState<ParsedUploadRow[]>([]);
    const [uploadFileName, setUploadFileName] = useState<string>('');

    // Single manual entry form state
    const [manualTeacherId, setManualTeacherId] = useState<string>('');
    const [manualAmount, setManualAmount] = useState<string>('');
    const [manualBalanceType, setManualBalanceType] = useState<'payable' | 'advance'>('payable');
    const [manualTerm, setManualTerm] = useState<string>(`${currentYear} ${currentTerm}`);
    const [manualAsOfDate, setManualAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualReference, setManualReference] = useState<string>('');
    const [manualNotes, setManualNotes] = useState<string>('');
    const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);

    if (!isOpen) return null;

    // Helper to get formatted teacher code
    const getCodeForTeacher = (teacherId: string, teacherName: string): string => {
        if (teacherCodes[teacherId]) return teacherCodes[teacherId];
        const idx = teachersList.findIndex(t => t.id === teacherId);
        return idx >= 0 ? String(idx + 1).padStart(2, '0') : '01';
    };

    // 1. Generate & Download Pre-populated Excel Template
    const handleDownloadTemplate = () => {
        try {
            const templateRows = teachersList.map(teacher => {
                const code = getCodeForTeacher(teacher.id, teacher.name);
                const existing = existingBalances.find(b => b.teacherId === teacher.id && b.status !== 'cleared');
                return {
                    'Teacher Code': code,
                    'Teacher Name': teacher.name,
                    'Email / Phone': teacher.email || teacher.phoneNumber || '',
                    'Opening Balance (KES)': existing ? existing.amount : 0,
                    'Balance Type': existing?.balanceType === 'advance' ? 'Advance' : 'Payable',
                    'Term Reference': existing?.term || `${currentYear} ${currentTerm}`,
                    'Notes / Remarks': existing?.notes || 'Brought forward from previous term'
                };
            });

            const ws = XLSX.utils.json_to_sheet(templateRows);
            ws['!cols'] = [
                { wch: 15 }, // Code
                { wch: 28 }, // Name
                { wch: 25 }, // Email/Phone
                { wch: 24 }, // Opening Balance
                { wch: 18 }, // Balance Type
                { wch: 20 }, // Term Reference
                { wch: 35 }  // Notes
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Teacher_Opening_Balances');

            const fileName = `Remedial_Teacher_Opening_Balances_Template_${currentYear}_${currentTerm.replace(/\s+/g, '_')}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (err) {
            console.error('Failed to download opening balances template:', err);
            alert('Failed to generate template: ' + (err as any).message);
        }
    };

    // 2. Handle File Upload & Parse
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadFileName(file.name);
        setIsProcessingFile(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const firstSheetName = wb.SheetNames[0];
                const ws = wb.Sheets[firstSheetName];
                const rawData: any[] = XLSX.utils.sheet_to_json(ws);

                if (rawData.length === 0) {
                    alert('The uploaded file contains no data rows.');
                    setIsProcessingFile(false);
                    return;
                }

                // Match rows against teachers
                const rows: ParsedUploadRow[] = rawData.map((row, idx) => {
                    const rowCode = String(row['Teacher Code'] || row['Code'] || row['code'] || '').trim();
                    const rowName = String(row['Teacher Name'] || row['Name'] || row['name'] || '').trim().toLowerCase();
                    const rowContact = String(row['Email / Phone'] || row['Email'] || row['Phone'] || '').trim().toLowerCase();
                    const rawAmount = Number(row['Opening Balance (KES)'] || row['Opening Balance'] || row['Amount'] || row['amount'] || 0);
                    const rawType = String(row['Balance Type'] || row['Type'] || '').trim().toLowerCase();
                    const termRef = String(row['Term Reference'] || row['Term'] || `${currentYear} ${currentTerm}`).trim();
                    const notes = String(row['Notes / Remarks'] || row['Notes'] || '').trim();

                    // Find teacher match
                    let matchedTeacher = teachersList.find(t => {
                        const tCode = getCodeForTeacher(t.id, t.name);
                        return rowCode && (tCode === rowCode || t.id === rowCode);
                    });

                    if (!matchedTeacher && rowContact) {
                        matchedTeacher = teachersList.find(t => 
                            (t.email && t.email.toLowerCase() === rowContact) ||
                            (t.phoneNumber && t.phoneNumber.toLowerCase() === rowContact)
                        );
                    }

                    if (!matchedTeacher && rowName) {
                        matchedTeacher = teachersList.find(t => 
                            t.name.toLowerCase() === rowName ||
                            t.name.toLowerCase().includes(rowName) ||
                            rowName.includes(t.name.toLowerCase())
                        );
                    }

                    const balanceType: 'payable' | 'advance' = 
                        rawType.includes('adv') || rawAmount < 0 
                            ? 'advance' 
                            : 'payable';

                    return {
                        id: `parsed_${Date.now()}_${idx}`,
                        teacherId: matchedTeacher?.id || '',
                        teacherName: matchedTeacher?.name || String(row['Teacher Name'] || 'Unmatched Teacher'),
                        teacherCode: matchedTeacher ? getCodeForTeacher(matchedTeacher.id, matchedTeacher.name) : rowCode,
                        amount: Math.abs(rawAmount),
                        balanceType,
                        term: termRef,
                        notes,
                        isMatched: Boolean(matchedTeacher),
                        originalRow: row
                    };
                });

                setParsedRows(rows);
            } catch (err) {
                console.error('Error parsing spreadsheet:', err);
                alert('Failed to parse spreadsheet. Please verify it is a valid .xlsx, .xls, or .csv file.');
            } finally {
                setIsProcessingFile(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            alert('Failed to read the file.');
            setIsProcessingFile(false);
        };

        reader.readAsBinaryString(file);
    };

    // Update single parsed row's teacher selection if manually corrected
    const handleUpdateRowTeacher = (rowId: string, newTeacherId: string) => {
        const teacher = teachersList.find(t => t.id === newTeacherId);
        if (!teacher) return;
        setParsedRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            return {
                ...r,
                teacherId: teacher.id,
                teacherName: teacher.name,
                teacherCode: getCodeForTeacher(teacher.id, teacher.name),
                isMatched: true
            };
        }));
    };

    // Update amount or type for a parsed row
    const handleUpdateRowField = (rowId: string, field: 'amount' | 'balanceType' | 'notes', val: any) => {
        setParsedRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            return { ...r, [field]: val };
        }));
    };

    // Remove row from parsed list
    const handleRemoveRow = (rowId: string) => {
        setParsedRows(prev => prev.filter(r => r.id !== rowId));
    };

    // 3. Save Bulk Uploaded Rows
    const handleSaveParsedBalances = async () => {
        const validRows = parsedRows.filter(r => r.isMatched && r.teacherId && r.amount > 0);
        if (validRows.length === 0) {
            alert('No valid rows with matched teachers and amounts greater than 0 found.');
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const newRecords: RemedialTeacherOpeningBalance[] = [];

            for (const row of validRows) {
                // Check if existing record for this teacher exists
                const existing = existingBalances.find(b => b.teacherId === row.teacherId && b.status !== 'cleared');
                const recordId = existing ? existing.id : `rem_ob_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

                const payload: RemedialTeacherOpeningBalance = {
                    id: recordId,
                    institutionId,
                    teacherId: row.teacherId,
                    teacherName: row.teacherName,
                    teacherCode: row.teacherCode,
                    amount: row.amount,
                    balanceType: row.balanceType,
                    term: row.term || `${currentYear} ${currentTerm}`,
                    academicYear: currentYear,
                    notes: row.notes,
                    status: 'active',
                    asOfDate: new Date().toISOString().split('T')[0],
                    uploadedBy: currentUser?.name || currentUser?.email || 'Administrator',
                    uploadedAt: now,
                    updatedAt: now
                };

                await apiService.saveRemedialOpeningBalance(payload);
                newRecords.push(payload);
            }

            // Merge with local state
            const updated = [
                ...existingBalances.filter(b => !newRecords.some(nr => nr.teacherId === b.teacherId)),
                ...newRecords
            ];
            onBalancesUpdated(updated);

            alert(`Successfully imported and applied opening balances for ${newRecords.length} teachers!`);
            setParsedRows([]);
            setUploadFileName('');
            setActiveTab('existing');
        } catch (err) {
            console.error('Failed to save opening balances:', err);
            alert('Failed to save balances: ' + (err as any).message);
        } finally {
            setIsSaving(false);
        }
    };

    // 4. Save Single Manual Entry
    const handleSaveManualEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTeacherId) {
            alert('Please select a teacher.');
            return;
        }
        const amt = parseFloat(manualAmount);
        if (isNaN(amt) || amt <= 0) {
            alert('Please enter a valid positive balance amount.');
            return;
        }

        const teacher = teachersList.find(t => t.id === manualTeacherId);
        if (!teacher) return;

        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const recordId = editingBalanceId || `rem_ob_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const code = getCodeForTeacher(teacher.id, teacher.name);

            const payload: RemedialTeacherOpeningBalance = {
                id: recordId,
                institutionId,
                teacherId: teacher.id,
                teacherName: teacher.name,
                teacherCode: code,
                amount: amt,
                balanceType: manualBalanceType,
                term: manualTerm || `${currentYear} ${currentTerm}`,
                academicYear: currentYear,
                asOfDate: manualAsOfDate || now.split('T')[0],
                reference: manualReference || undefined,
                notes: manualNotes || undefined,
                status: 'active',
                uploadedBy: currentUser?.name || currentUser?.email || 'Administrator',
                uploadedAt: now,
                updatedAt: now
            };

            await apiService.saveRemedialOpeningBalance(payload);

            const updated = [
                ...existingBalances.filter(b => b.id !== recordId && b.teacherId !== teacher.id),
                payload
            ];
            onBalancesUpdated(updated);

            alert(`Opening balance for ${teacher.name} has been saved successfully.`);
            setEditingBalanceId(null);
            setManualTeacherId('');
            setManualAmount('');
            setManualNotes('');
            setManualReference('');
            setActiveTab('existing');
        } catch (err) {
            console.error('Failed to save manual opening balance:', err);
            alert('Failed to save: ' + (err as any).message);
        } finally {
            setIsSaving(false);
        }
    };

    // Delete balance record
    const handleDeleteBalance = async (balanceId: string, teacherName: string) => {
        if (!confirm(`Are you sure you want to delete the opening balance for ${teacherName}?`)) return;

        try {
            await apiService.deleteRemedialOpeningBalance(balanceId);
            const updated = existingBalances.filter(b => b.id !== balanceId);
            onBalancesUpdated(updated);
        } catch (err) {
            console.error('Failed to delete opening balance:', err);
            alert('Failed to delete: ' + (err as any).message);
        }
    };

    // Start editing an existing balance
    const handleStartEdit = (b: RemedialTeacherOpeningBalance) => {
        setEditingBalanceId(b.id);
        setManualTeacherId(b.teacherId);
        setManualAmount(String(b.amount));
        setManualBalanceType(b.balanceType);
        setManualTerm(b.term || `${currentYear} ${currentTerm}`);
        setManualAsOfDate(b.asOfDate || new Date().toISOString().split('T')[0]);
        setManualReference(b.reference || '');
        setManualNotes(b.notes || '');
        setActiveTab('manual');
    };

    // Summary Calculations for parsed rows
    const parsedSummary = useMemo(() => {
        const totalRows = parsedRows.length;
        const matched = parsedRows.filter(r => r.isMatched && r.teacherId).length;
        const totalPayable = parsedRows
            .filter(r => r.isMatched && r.balanceType === 'payable')
            .reduce((s, r) => s + r.amount, 0);
        const totalAdvances = parsedRows
            .filter(r => r.isMatched && r.balanceType === 'advance')
            .reduce((s, r) => s + r.amount, 0);
        const netTotal = totalPayable - totalAdvances;
        return { totalRows, matched, totalPayable, totalAdvances, netTotal };
    }, [parsedRows]);

    // Filter existing balances for the overview tab
    const filteredExistingBalances = useMemo(() => {
        return existingBalances.filter(b => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            return (
                b.teacherName.toLowerCase().includes(q) ||
                (b.teacherCode || '').toLowerCase().includes(q) ||
                (b.term || '').toLowerCase().includes(q) ||
                (b.notes || '').toLowerCase().includes(q)
            );
        });
    }, [existingBalances, searchTerm]);

    const existingSummary = useMemo(() => {
        const totalPayable = existingBalances
            .filter(b => b.balanceType === 'payable')
            .reduce((s, b) => s + b.amount, 0);
        const totalAdvances = existingBalances
            .filter(b => b.balanceType === 'advance')
            .reduce((s, b) => s + b.amount, 0);
        const netTotal = totalPayable - totalAdvances;
        return { count: existingBalances.length, totalPayable, totalAdvances, netTotal };
    }, [existingBalances]);

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-indigo-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                            <Banknote className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Teacher Remedial Opening Balances
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                                    {currentTerm} {currentYear}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Bulk upload or adjust arrears brought forward (B/F) and advances for teaching staff.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === 'upload'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        <UploadCloud className="w-4 h-4" /> Bulk Excel Upload
                    </button>
                    <button
                        onClick={() => {
                            setEditingBalanceId(null);
                            setManualTeacherId('');
                            setManualAmount('');
                            setActiveTab('manual');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === 'manual'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Plus className="w-4 h-4" /> {editingBalanceId ? 'Edit Balance' : 'Single Entry'}
                    </button>
                    <button
                        onClick={() => setActiveTab('existing')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === 'existing'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" /> Existing Balances ({existingBalances.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* TAB 1: BULK EXCEL UPLOAD */}
                    {activeTab === 'upload' && (
                        <div className="space-y-6">
                            {/* Action Cards: Download Template & Dropzone */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Download Template Card */}
                                <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col justify-between space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                                            <FileSpreadsheet className="w-4 h-4" /> Step 1: Pre-filled Template
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                            Download Excel Template
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Downloads a spreadsheet pre-populated with all {teachersList.length} registered teachers, their codes, and contact info.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <Download className="w-4 h-4" /> Download .XLSX Template
                                    </button>
                                </div>

                                {/* Upload Dropzone Card */}
                                <div className="p-5 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 flex flex-col justify-between space-y-4 text-center">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                                            <UploadCloud className="w-4 h-4" /> Step 2: Upload Filled File
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                            Upload Completed Spreadsheet
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files.
                                        </p>
                                    </div>
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="opening-balance-file-input"
                                        />
                                        <label
                                            htmlFor="opening-balance-file-input"
                                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm transition-all gap-2 w-full"
                                        >
                                            <UploadCloud className="w-4 h-4" />
                                            {isProcessingFile ? 'Processing File...' : (uploadFileName || 'Choose File to Upload')}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Parsed Rows Preview */}
                            {parsedRows.length > 0 && (
                                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Teachers</span>
                                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                                {parsedSummary.matched} / {parsedSummary.totalRows} Matched
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Arrears (Payable)</span>
                                            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                                                KES {parsedSummary.totalPayable.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Advances</span>
                                            <p className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">
                                                KES {parsedSummary.totalAdvances.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Net Opening Dues</span>
                                            <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono mt-0.5">
                                                KES {parsedSummary.netTotal.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="max-h-80 overflow-y-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Teacher</th>
                                                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                                                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Amount (KES)</th>
                                                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Type</th>
                                                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Term / Reference</th>
                                                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {parsedRows.map(row => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="p-3">
                                                                {row.isMatched ? (
                                                                    <div>
                                                                        <span className="font-bold text-slate-900 dark:text-white uppercase">
                                                                            {row.teacherName}
                                                                        </span>
                                                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                            {row.teacherCode}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-red-500 font-bold">{row.teacherName}</span>
                                                                        <select
                                                                            value={row.teacherId}
                                                                            onChange={e => handleUpdateRowTeacher(row.id, e.target.value)}
                                                                            className="text-[11px] bg-amber-50 dark:bg-amber-950/60 border border-amber-300 rounded px-2 py-1 outline-none font-bold"
                                                                        >
                                                                            <option value="">Select matching teacher...</option>
                                                                            {teachersList.map(t => (
                                                                                <option key={t.id} value={t.id}>
                                                                                    {t.name} ({getCodeForTeacher(t.id, t.name)})
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                {row.isMatched ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3" /> Matched
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                                                                        <AlertTriangle className="w-3 h-3" /> Needs Match
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="number"
                                                                    value={row.amount}
                                                                    onChange={e => handleUpdateRowField(row.id, 'amount', Number(e.target.value))}
                                                                    className="w-28 px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-emerald-500"
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <select
                                                                    value={row.balanceType}
                                                                    onChange={e => handleUpdateRowField(row.id, 'balanceType', e.target.value as any)}
                                                                    className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg border outline-none ${
                                                                        row.balanceType === 'payable'
                                                                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                                                            : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-700 dark:text-amber-300'
                                                                    }`}
                                                                >
                                                                    <option value="payable">Payable (Arrears)</option>
                                                                    <option value="advance">Advance (Owed)</option>
                                                                </select>
                                                            </td>
                                                            <td className="p-3 font-medium text-slate-500 dark:text-slate-400">
                                                                {row.term}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <button
                                                                    onClick={() => handleRemoveRow(row.id)}
                                                                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                                    title="Remove row"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Confirmation Footer */}
                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setParsedRows([])}
                                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        >
                                            Discard Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveParsedBalances}
                                            disabled={isSaving || parsedSummary.matched === 0}
                                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                                        >
                                            {isSaving ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            Apply {parsedSummary.matched} Opening Balances
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: SINGLE MANUAL ENTRY */}
                    {activeTab === 'manual' && (
                        <form onSubmit={handleSaveManualEntry} className="max-w-2xl mx-auto space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-emerald-600" />
                                    {editingBalanceId ? 'Edit Teacher Opening Balance' : 'Add Single Opening Balance'}
                                </h4>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        Select Teacher *
                                    </label>
                                    <select
                                        value={manualTeacherId}
                                        onChange={e => setManualTeacherId(e.target.value)}
                                        required
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-600 dark:text-white"
                                    >
                                        <option value="">-- Choose Teaching Staff --</option>
                                        {teachersList.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} (Code: {getCodeForTeacher(t.id, t.name)}) {t.email ? `• ${t.email}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Balance Amount (KES) *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">KES</span>
                                            <input
                                                type="number"
                                                min="1"
                                                step="any"
                                                value={manualAmount}
                                                onChange={e => setManualAmount(e.target.value)}
                                                placeholder="e.g. 15000"
                                                required
                                                className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-600 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Balance Type *
                                        </label>
                                        <select
                                            value={manualBalanceType}
                                            onChange={e => setManualBalanceType(e.target.value as any)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-600 dark:text-white"
                                        >
                                            <option value="payable">Payable (Arrears Owed to Teacher)</option>
                                            <option value="advance">Advance (Owed by Teacher)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Term / Period Reference
                                        </label>
                                        <input
                                            type="text"
                                            value={manualTerm}
                                            onChange={e => setManualTerm(e.target.value)}
                                            placeholder="e.g. 2026 Term 1"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-emerald-600 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            As-Of Date
                                        </label>
                                        <input
                                            type="date"
                                            value={manualAsOfDate}
                                            onChange={e => setManualAsOfDate(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-emerald-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        Notes / Audit Remarks
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={manualNotes}
                                        onChange={e => setManualNotes(e.target.value)}
                                        placeholder="e.g. Carried forward from previous remedial term ledger approved by Principal..."
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('existing')}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {editingBalanceId ? 'Update Balance' : 'Save Opening Balance'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 3: EXISTING BALANCES OVERVIEW */}
                    {activeTab === 'existing' && (
                        <div className="space-y-4">
                            {/* KPI Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recorded Faculty</span>
                                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                        {existingSummary.count} Teachers
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Arrears (Payable)</span>
                                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                                        KES {existingSummary.totalPayable.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Advances</span>
                                    <p className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">
                                        KES {existingSummary.totalAdvances.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Net Remedial B/F</span>
                                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono mt-0.5">
                                        KES {existingSummary.netTotal.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Search & Actions Toolbar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="relative w-full sm:w-72">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search by teacher name, code, notes..."
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 dark:text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-300"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Export Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('upload')}
                                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        <UploadCloud className="w-3.5 h-3.5" /> Bulk Upload
                                    </button>
                                </div>
                            </div>

                            {/* Existing Balances Table */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <div className="max-h-96 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Teacher</th>
                                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Opening Balance</th>
                                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Type</th>
                                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Term / As Of</th>
                                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Notes</th>
                                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredExistingBalances.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                        No opening balances found. Click "Bulk Excel Upload" or "Single Entry" to record faculty balances brought forward.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredExistingBalances.map(b => (
                                                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-900 dark:text-white uppercase">
                                                                    {b.teacherName}
                                                                </span>
                                                                {b.teacherCode && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                        {b.teacherCode}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-mono font-black text-sm">
                                                            <span className={b.balanceType === 'payable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                                KES {b.amount.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                b.balanceType === 'payable'
                                                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                                {b.balanceType === 'payable' ? 'Arrears (Payable)' : 'Advance (Owed)'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-slate-600 dark:text-slate-300">
                                                            <div className="font-bold">{b.term || 'General B/F'}</div>
                                                            {b.asOfDate && <div className="text-[10px] text-slate-400">{b.asOfDate}</div>}
                                                        </td>
                                                        <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={b.notes}>
                                                            {b.notes || '—'}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleStartEdit(b)}
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                    title="Edit Balance"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteBalance(b.id, b.teacherName)}
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                    title="Delete Balance"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 font-medium">
                        Opening balances are automatically factored into Teacher Net Payables and Payouts Cash Releasing.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
