import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { User, Institution, CompanyDetails, Invoice, InvoiceItem } from '../../types';
import { XIcon } from '../icons/XIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { SearchIcon } from '../icons/SearchIcon';
import { apiService } from '../../services/apiService';

interface ExcelStudentInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    students: User[];
    companyDetails?: CompanyDetails;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
    onRefreshData?: () => Promise<void>;
}

interface ParsedInvoiceRow {
    id: string;
    admNo: string;
    studentName: string;
    className: string;
    description: string;
    totalAmount: number;
    items: InvoiceItem[];
    dueDate: string;
    customInvoiceNo?: string;
    matchedStudent?: User;
    isMatched: boolean;
    selected: boolean;
}

export const ExcelStudentInvoiceModal: React.FC<ExcelStudentInvoiceModalProps> = ({
    isOpen,
    onClose,
    institution,
    students,
    companyDetails,
    onGenerateInvoices,
    onRefreshData
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generationSuccess, setGenerationSuccess] = useState(false);
    const [generatedCount, setGeneratedCount] = useState(0);

    // Live Progress & ETA calculation state
    const [etaInfo, setEtaInfo] = useState<{
        estimatedTimeText: string;
        speedRate: number;
        currentStudentName: string;
        currentAdm: string;
        completedCount: number;
        totalCount: number;
        currentPhase: string;
    }>({
        estimatedTimeText: 'Calculating ETA...',
        speedRate: 0,
        currentStudentName: '',
        currentAdm: '',
        completedCount: 0,
        totalCount: 0,
        currentPhase: 'Preparing spreadsheet invoices...'
    });

    // Global batch settings
    const [batchDescription, setBatchDescription] = useState('School Fees Invoice');
    const [batchIssueDate, setBatchIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [batchDueDate, setBatchDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });

    const [parsedRows, setParsedRows] = useState<ParsedInvoiceRow[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMatched, setFilterMatched] = useState<'all' | 'matched' | 'unmatched'>('all');

    // Build lookup maps for instant student matching
    const { studentAdmMap, studentNormalizedAdmMap, studentNameMap, studentNormalizedNameMap } = useMemo(() => {
        const admMap = new Map<string, User>();
        const normAdmMap = new Map<string, User>();
        const nameMap = new Map<string, User>();
        const normNameMap = new Map<string, User>();

        const normalizeAdm = (val: string) => String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
        const normalizeName = (val: string) => String(val || '').toUpperCase().replace(/\s+/g, ' ').trim();

        students.forEach(s => {
            let meta = s.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            const adm = String(s.admissionNumber || s.admission_number || meta.admissionNumber || meta.admission_no || meta.admNo || s.id || '').toUpperCase().trim();
            if (adm) {
                admMap.set(adm, s);
                const normAdm = normalizeAdm(adm);
                if (normAdm) normAdmMap.set(normAdm, s);
            }

            const name = (s.name || '').toUpperCase().trim();
            if (name) {
                nameMap.set(name, s);
                const normName = normalizeName(name);
                if (normName) normNameMap.set(normName, s);
            }
        });

        return { 
            studentAdmMap: admMap, 
            studentNormalizedAdmMap: normAdmMap, 
            studentNameMap: nameMap, 
            studentNormalizedNameMap: normNameMap 
        };
    }, [students]);

    // Reset state on close
    const handleClose = () => {
        setFile(null);
        setParsedRows([]);
        setIsParsing(false);
        setIsGenerating(false);
        setGenerationSuccess(false);
        onClose();
    };

    // Download Sample Template
    const handleDownloadTemplate = () => {
        const sampleRows = students.slice(0, 10).map((s, idx) => {
            let meta = s.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            const adm = s.admissionNumber || s.admission_number || meta.admissionNumber || `ADM-${1000 + idx}`;
            const cls = meta.className || meta.class || meta.grade || 'Form 1 East';
            return {
                'Admission Number': adm,
                'Student Name': s.name || 'Sample Student',
                'Class / Grade': cls,
                'Fee Description': 'Term 1 2026 Tuition & Boarding',
                'Tuition Fee': 25000,
                'Boarding Fee': 15000,
                'Activity Fee': 2000,
                'Transport Fee': 5000,
                'Total Amount': 47000,
                'Due Date': batchDueDate
            };
        });

        const fallbackRows = sampleRows.length > 0 ? sampleRows : [
            {
                'Admission Number': 'ADM-1001',
                'Student Name': 'Brian Kiprop',
                'Class / Grade': 'Form 1 East',
                'Fee Description': 'Term 1 2026 Tuition & Boarding',
                'Tuition Fee': 25000,
                'Boarding Fee': 15000,
                'Activity Fee': 2000,
                'Transport Fee': 5000,
                'Total Amount': 47000,
                'Due Date': batchDueDate
            },
            {
                'Admission Number': 'ADM-1002',
                'Student Name': 'Faith Wanjiku',
                'Class / Grade': 'Form 1 West',
                'Fee Description': 'Term 1 2026 Day Scholar Tuition',
                'Tuition Fee': 25000,
                'Boarding Fee': 0,
                'Activity Fee': 2000,
                'Transport Fee': 3000,
                'Total Amount': 30000,
                'Due Date': batchDueDate
            }
        ];

        const ws = XLSX.utils.json_to_sheet(fallbackRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Student_Invoices');
        XLSX.writeFile(wb, `EduAI_Student_Invoices_Template_${institution.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    };

    // Parse Excel / CSV File
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const rawSheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                if (!rawSheetData || rawSheetData.length < 2) {
                    alert('The uploaded sheet is empty or lacks data rows.');
                    setIsParsing(false);
                    return;
                }

                // Locate header row (search for "ADM" or "NAME" or "AMOUNT" or "FEE")
                let headerRowIdx = 0;
                for (let r = 0; r < Math.min(rawSheetData.length, 10); r++) {
                    const rowText = rawSheetData[r].map(c => String(c).toUpperCase()).join(' ');
                    if (rowText.includes('ADM') || rowText.includes('NAME') || rowText.includes('STUDENT') || rowText.includes('AMOUNT') || rowText.includes('FEE')) {
                        headerRowIdx = r;
                        break;
                    }
                }

                const headerRow = rawSheetData[headerRowIdx].map(c => String(c).toUpperCase().trim());

                // Column Indexes
                let idxAdm = -1;
                let idxName = -1;
                let idxClass = -1;
                let idxDesc = -1;
                let idxTotalAmount = -1;
                let idxDueDate = -1;
                let idxCustomInvNo = -1;

                // Specific Breakdown item columns
                const itemColumnIndexes: Array<{ name: string; idx: number }> = [];

                headerRow.forEach((colName, colIdx) => {
                    if (colName.includes('ADM') || colName.includes('REG') || colName.includes('STUDENT ID') || colName.includes('INDEX')) {
                        if (idxAdm === -1) idxAdm = colIdx;
                    } else if (colName.includes('STUDENT NAME') || colName.includes('FULL NAME') || colName === 'NAME') {
                        if (idxName === -1) idxName = colIdx;
                    } else if (colName.includes('CLASS') || colName.includes('GRADE') || colName.includes('STREAM') || colName.includes('LEVEL') || colName.includes('COURSE')) {
                        if (idxClass === -1) idxClass = colIdx;
                    } else if (colName.includes('DESC') || colName.includes('NARRATION') || colName.includes('FEE TYPE') || colName.includes('TERM') || colName.includes('ITEM')) {
                        if (idxDesc === -1) idxDesc = colIdx;
                    } else if (colName === 'TOTAL AMOUNT' || colName === 'TOTAL' || colName === 'TOTAL FEE' || colName === 'INVOICED AMOUNT' || colName === 'INVOICE AMOUNT' || (colName === 'AMOUNT' && idxTotalAmount === -1)) {
                        idxTotalAmount = colIdx;
                    } else if (colName.includes('DUE')) {
                        if (idxDueDate === -1) idxDueDate = colIdx;
                    } else if (colName.includes('INV #') || colName.includes('INVOICE NO') || colName.includes('INVOICE NUMBER') || colName.includes('REF')) {
                        if (idxCustomInvNo === -1) idxCustomInvNo = colIdx;
                    } else if (
                        colName.includes('TUITION') ||
                        colName.includes('BOARDING') ||
                        colName.includes('TRANSPORT') ||
                        colName.includes('ACTIVITY') ||
                        colName.includes('EXAM') ||
                        colName.includes('UNIFORM') ||
                        colName.includes('BOOK') ||
                        colName.includes('STATIONERY') ||
                        colName.includes('MAINTENANCE') ||
                        colName.includes('DEVELOPMENT') ||
                        colName.includes('LUNCH') ||
                        colName.includes('FEE')
                    ) {
                        itemColumnIndexes.push({ name: rawSheetData[headerRowIdx][colIdx] || colName, idx: colIdx });
                    }
                });

                // If no ADM or NAME found, fallback to first two columns
                if (idxAdm === -1 && idxName === -1) {
                    idxAdm = 0;
                    idxName = 1;
                }

                const parsed: ParsedInvoiceRow[] = [];

                for (let r = headerRowIdx + 1; r < rawSheetData.length; r++) {
                    const row = rawSheetData[r];
                    if (!row || row.every(cell => String(cell).trim() === '')) continue;

                    const admRaw = idxAdm !== -1 ? String(row[idxAdm] || '').trim() : '';
                    const nameRaw = idxName !== -1 ? String(row[idxName] || '').trim() : '';
                    const classRaw = idxClass !== -1 ? String(row[idxClass] || '').trim() : '';
                    const descRaw = idxDesc !== -1 ? String(row[idxDesc] || '').trim() : batchDescription;
                    const dueDateRaw = idxDueDate !== -1 && String(row[idxDueDate] || '').trim() ? String(row[idxDueDate]).trim() : batchDueDate;
                    const customInvNo = idxCustomInvNo !== -1 ? String(row[idxCustomInvNo] || '').trim() : undefined;

                    // Match student (exact and normalized)
                    let matchedStudent: User | undefined = undefined;
                    if (admRaw) {
                        matchedStudent = studentAdmMap.get(admRaw.toUpperCase());
                        if (!matchedStudent) {
                            const normAdm = admRaw.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
                            if (normAdm) matchedStudent = studentNormalizedAdmMap.get(normAdm);
                        }
                    }
                    if (!matchedStudent && nameRaw) {
                        matchedStudent = studentNameMap.get(nameRaw.toUpperCase());
                        if (!matchedStudent) {
                            const normName = nameRaw.toUpperCase().replace(/\s+/g, ' ').trim();
                            if (normName) matchedStudent = studentNormalizedNameMap.get(normName);
                        }
                    }

                    // Build invoice items
                    const items: InvoiceItem[] = [];
                    let sumFromItems = 0;

                    itemColumnIndexes.forEach(col => {
                        const val = parseFloat(String(row[col.idx]).replace(/[^0-9.-]+/g, '')) || 0;
                        if (val > 0) {
                            items.push({
                                description: col.name,
                                quantity: 1,
                                unitPrice: val,
                                amount: val
                            });
                            sumFromItems += val;
                        }
                    });

                    // Total amount
                    let totalAmount = 0;
                    if (idxTotalAmount !== -1) {
                        totalAmount = parseFloat(String(row[idxTotalAmount]).replace(/[^0-9.-]+/g, '')) || 0;
                    }

                    if (totalAmount === 0 && sumFromItems > 0) {
                        totalAmount = sumFromItems;
                    }

                    if (items.length === 0 && totalAmount > 0) {
                        items.push({
                            description: descRaw || batchDescription || 'School Fees',
                            quantity: 1,
                            unitPrice: totalAmount,
                            amount: totalAmount
                        });
                    }

                    if (totalAmount > 0 || admRaw || nameRaw) {
                        parsed.push({
                            id: `row_${r}_${Date.now()}`,
                            admNo: admRaw || (matchedStudent ? matchedStudent.admissionNumber || matchedStudent.admission_number || '' : 'N/A'),
                            studentName: nameRaw || (matchedStudent ? matchedStudent.name : 'Unknown Student'),
                            className: classRaw || (matchedStudent ? (matchedStudent.metadata?.className || matchedStudent.metadata?.class || '') : ''),
                            description: descRaw || batchDescription,
                            totalAmount: totalAmount,
                            items: items,
                            dueDate: dueDateRaw,
                            customInvoiceNo: customInvNo,
                            matchedStudent: matchedStudent,
                            isMatched: !!matchedStudent,
                            selected: true
                        });
                    }
                }

                if (parsed.length === 0) {
                    alert('Could not extract any valid invoice rows. Please check template format.');
                }

                setParsedRows(parsed);
            } catch (err) {
                console.error('[ExcelStudentInvoiceModal] Parse error:', err);
                alert('Failed to parse Excel file. Please ensure it is a valid spreadsheet.');
            } finally {
                setIsParsing(false);
            }
        };

        reader.readAsArrayBuffer(uploadedFile);
    };

    // Filtered rows for preview table
    const filteredRows = useMemo(() => {
        return parsedRows.filter(row => {
            const matchesQuery = 
                row.admNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.description.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesQuery) return false;

            if (filterMatched === 'matched') return row.isMatched;
            if (filterMatched === 'unmatched') return !row.isMatched;
            return true;
        });
    }, [parsedRows, searchQuery, filterMatched]);

    // Statistics
    const stats = useMemo(() => {
        const total = parsedRows.length;
        const selected = parsedRows.filter(r => r.selected).length;
        const matched = parsedRows.filter(r => r.isMatched).length;
        const unmatched = total - matched;
        const totalAmount = parsedRows.filter(r => r.selected).reduce((sum, r) => sum + r.totalAmount, 0);

        return { total, selected, matched, unmatched, totalAmount };
    }, [parsedRows]);

    // Select All / Deselect All
    const toggleSelectAll = (select: boolean) => {
        setParsedRows(prev => prev.map(r => ({ ...r, selected: select })));
    };

    // Toggle single row selection
    const toggleRowSelect = (id: string) => {
        setParsedRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    };

    // Update single row amount
    const handleUpdateRowAmount = (id: string, newAmount: number) => {
        setParsedRows(prev => prev.map(r => {
            if (r.id === id) {
                const updatedItems = r.items.length > 0 
                    ? r.items.map((it, idx) => idx === 0 ? { ...it, unitPrice: newAmount, amount: newAmount } : it)
                    : [{ description: r.description || 'School Fees', quantity: 1, unitPrice: newAmount, amount: newAmount }];
                return { ...r, totalAmount: newAmount, items: updatedItems };
            }
            return r;
        }));
    };

    // Generate and Post Invoices
    const handleGenerateInvoices = async () => {
        const rowsToInvoice = parsedRows.filter(r => r.selected && r.totalAmount > 0);
        if (rowsToInvoice.length === 0) {
            alert('Please select at least one row with a valid invoice amount.');
            return;
        }

        setIsGenerating(true);
        setProgress(5);
        const startTime = Date.now();
        const total = rowsToInvoice.length;

        setEtaInfo({
            estimatedTimeText: 'Calculating ETA...',
            speedRate: 0,
            currentStudentName: rowsToInvoice[0]?.studentName || '',
            currentAdm: rowsToInvoice[0]?.admNo || '',
            completedCount: 0,
            totalCount: total,
            currentPhase: 'Initializing spreadsheet invoice compiler...'
        });

        try {
            // Load sequential invoice numbering config
            let invoicePrefix = (companyDetails?.globalInvoicePrefix || 'INV-').trim();
            let nextInvoiceNumber = 1001;
            let configRecord: any = null;

            try {
                const configs = await apiService.getModuleRecords<any>('finance_numbering_configs');
                configRecord = configs.find((c: any) => c.documentType === 'invoice' || c.document_type === 'invoice');
                if (configRecord) {
                    invoicePrefix = configRecord.prefix || invoicePrefix;
                    nextInvoiceNumber = Number(configRecord.nextNumber || configRecord.next_number || 1001);
                }
            } catch (err) {
                console.error('[ExcelStudentInvoiceModal] Failed to load invoice numbering config:', err);
            }

            let currentNum = nextInvoiceNumber;
            const invoicesToPost: any[] = [];

            for (let i = 0; i < rowsToInvoice.length; i++) {
                const row = rowsToInvoice[i];
                const studentId = row.matchedStudent ? row.matchedStudent.id : null;
                const invoiceNumber = row.customInvoiceNo || `${invoicePrefix}${currentNum}`;
                if (!row.customInvoiceNo) currentNum += 1;

                const invObj: any = {
                    id: `inv_xl_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
                    invoiceNumber: invoiceNumber,
                    invoice_number: invoiceNumber,
                    studentId: studentId,
                    student_id: studentId,
                    totalAmount: row.totalAmount,
                    total_amount: row.totalAmount,
                    status: 'pending',
                    issueDate: batchIssueDate,
                    issue_date: batchIssueDate,
                    dueDate: row.dueDate || batchDueDate,
                    due_date: row.dueDate || batchDueDate,
                    items: row.items.length > 0 ? row.items : [
                        { description: row.description || batchDescription, quantity: 1, unitPrice: row.totalAmount, amount: row.totalAmount }
                    ],
                    institutionId: institution.id,
                    institution_id: institution.id,
                    className: row.className || (row.matchedStudent ? (row.matchedStudent.metadata?.className || row.matchedStudent.metadata?.class) : undefined),
                    class_name: row.className || (row.matchedStudent ? (row.matchedStudent.metadata?.className || row.matchedStudent.metadata?.class) : undefined),
                    metadata: {
                        studentName: row.studentName,
                        admNo: row.admNo,
                        className: row.className,
                        importedFromExcel: true,
                        importDate: new Date().toISOString()
                    }
                };

                invoicesToPost.push(invObj);

                // Progress and ETA
                const completed = i + 1;
                const currentProg = Math.round((completed / total) * 90);
                const elapsedSec = (Date.now() - startTime) / 1000;
                const speedRate = elapsedSec > 0.1 ? parseFloat((completed / elapsedSec).toFixed(1)) : 0;
                const remainingCount = total - completed;
                const secRemaining = speedRate > 0 ? Math.max(0, Math.round(remainingCount / speedRate)) : 0;

                let etaString = 'Calculating ETA...';
                if (elapsedSec >= 0.2) {
                    if (secRemaining <= 0) etaString = 'Almost complete...';
                    else if (secRemaining < 60) etaString = `~${secRemaining}s remaining`;
                    else etaString = `~${Math.floor(secRemaining / 60)}m ${secRemaining % 60}s remaining`;
                }

                setProgress(currentProg);
                setEtaInfo({
                    estimatedTimeText: etaString,
                    speedRate: speedRate,
                    currentStudentName: row.studentName,
                    currentAdm: row.admNo,
                    completedCount: completed,
                    totalCount: total,
                    currentPhase: `Invoicing ${row.studentName} (${completed}/${total})...`
                });

                if (i % 8 === 0 || i === rowsToInvoice.length - 1) {
                    await new Promise(r => setTimeout(r, 12));
                }
            }

            setEtaInfo(prev => ({
                ...prev,
                currentPhase: 'Committing Excel invoices to financial ledger...',
                estimatedTimeText: 'Finalizing ledger entries...'
            }));
            setProgress(95);

            // Update numbering sequence
            if (configRecord) {
                try {
                    await apiService.updateModuleRecord('finance_numbering_configs', configRecord.id, {
                        ...configRecord,
                        nextNumber: currentNum,
                        next_number: currentNum,
                        updatedAt: new Date().toISOString()
                    });
                } catch (e) {}
            }

            // Commit invoices via handler
            await onGenerateInvoices(invoicesToPost);

            // Record batch history for Audit & Undo
            try {
                const batchRecord = {
                    id: `batch_xl_${Date.now()}`,
                    description: (batchDescription || 'Excel Student Invoicing').toUpperCase(),
                    totalValue: rowsToInvoice.reduce((sum, r) => sum + r.totalAmount, 0),
                    noOfRecords: invoicesToPost.length,
                    addedOn: new Date().toISOString(),
                    addedBy: 'Finance Officer',
                    invoiceIds: invoicesToPost.map(i => i.id),
                    status: 'active' as const
                };
                const stored = localStorage.getItem(`eduai_invoice_batches_${institution.id}`);
                const existing = stored ? JSON.parse(stored) : [];
                const updated = [batchRecord, ...existing];
                localStorage.setItem(`eduai_invoice_batches_${institution.id}`, JSON.stringify(updated));
                apiService.saveModuleRecord('institution_module_states', {
                    institution_id: institution.id,
                    module_id: 'invoice_batches_history',
                    state_data: updated,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            } catch (e) {}

            if (onRefreshData) {
                await onRefreshData();
            }

            setProgress(100);
            setGeneratedCount(invoicesToPost.length);
            setGenerationSuccess(true);
        } catch (err) {
            console.error('[ExcelStudentInvoiceModal] Failed to post invoices:', err);
            alert('An error occurred while generating student invoices from Excel.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ArrowUpTrayIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                    Excel / CSV Student Invoicing
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    Bulk Import
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                Upload a spreadsheet to bill student accounts with item breakdowns and automatic ledger allocation
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors border border-indigo-200 dark:border-indigo-800"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>Download Template</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

                    {/* Generation In-Progress State with Live ETA & Speed */}
                    {isGenerating ? (
                        <div className="py-12 px-6 sm:px-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            
                            {/* Spinner & Header */}
                            <div className="space-y-4">
                                <div className="relative w-20 h-20 mx-auto">
                                    <div className="w-20 h-20 border-4 border-indigo-100 dark:border-indigo-950/60 border-t-emerald-500 rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{progress}%</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Generating Spreadsheet Invoices
                                    </h4>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                        {etaInfo.currentPhase}
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar Container with ETA & Metrics */}
                            <div className="max-w-xl mx-auto space-y-3">
                                
                                {/* Status Badges Header: ETA + Speed */}
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full font-bold">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                        <span>⏱️ Est. Time Remaining: <strong className="font-mono text-indigo-950 dark:text-indigo-100">{etaInfo.estimatedTimeText}</strong></span>
                                    </div>
                                    {etaInfo.speedRate > 0 && (
                                        <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full font-bold font-mono text-[11px]">
                                            ⚡ {etaInfo.speedRate} inv/sec
                                        </div>
                                    )}
                                </div>

                                {/* Animated Multi-color Progress Bar */}
                                <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 rounded-full transition-all duration-300 relative overflow-hidden shadow-md flex items-center justify-end pr-2"
                                        style={{ width: `${Math.max(5, progress)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                                    </div>
                                </div>

                                {/* Progress Counter */}
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                                    <span>{etaInfo.completedCount} of {etaInfo.totalCount} Invoices Created</span>
                                    <span>{progress}% Completed</span>
                                </div>
                            </div>

                            {/* Active Invoicing Card */}
                            {etaInfo.currentStudentName && (
                                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left">
                                    <div className="truncate pr-2">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Current Student In Pipeline</span>
                                        <span className="text-xs font-black text-slate-900 dark:text-white truncate block">{etaInfo.currentStudentName}</span>
                                    </div>
                                    {etaInfo.currentAdm && (
                                        <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                            ADM: {etaInfo.currentAdm}
                                        </span>
                                    )}
                                </div>
                            )}

                        </div>
                    ) : generationSuccess ? (
                        <div className="p-12 text-center space-y-5 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {generatedCount} Student Invoices Generated Successfully!
                                </h4>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                                    All student invoices have been posted to the financial ledger and prepayments have been automatically allocated.
                                </p>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
                                >
                                    Return to Invoices Ledger
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Upload Area & Configuration Parameters */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                
                                {/* Upload Dropzone */}
                                <div className="lg:col-span-2 p-6 rounded-3xl border-2 border-dashed border-indigo-200 dark:border-slate-700 bg-indigo-50/30 dark:bg-slate-850 hover:bg-indigo-50/60 transition-all flex flex-col items-center justify-center text-center relative group">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="w-14 h-14 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform">
                                        <ArrowUpTrayIcon className="w-7 h-7" />
                                    </div>
                                    <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">
                                        {file ? file.name : 'Click or Drag & Drop Student Invoicing Excel / CSV'}
                                    </h5>
                                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
                                        Supports .xlsx, .xls, or .csv with Admission Number, Student Name, and Fee breakdown
                                    </p>
                                    {isParsing && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-600">
                                            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                                            <span>Parsing spreadsheet data...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Batch Parameters Card */}
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-4">
                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Default Invoicing Cycle
                                    </h5>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                                                Fee Narration
                                            </label>
                                            <input
                                                type="text"
                                                value={batchDescription}
                                                onChange={(e) => setBatchDescription(e.target.value)}
                                                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g. Term 1 2026 Tuition & Boarding"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                                                    Issue Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={batchIssueDate}
                                                    onChange={(e) => setBatchIssueDate(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                                                    Due Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={batchDueDate}
                                                    onChange={(e) => setBatchDueDate(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Parsed Invoices Preview Section */}
                            {parsedRows.length > 0 && (
                                <div className="space-y-4 pt-2">
                                    
                                    {/* Stats KPI Chips */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Rows</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
                                        </div>
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Matched Students</p>
                                            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.matched}</p>
                                        </div>
                                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Unmatched / Custom</p>
                                            <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats.unmatched}</p>
                                        </div>
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Billing Sum</p>
                                            <p className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                                                KES {stats.totalAmount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Table Controls */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:w-64">
                                                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search admission, name, class..."
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterMatched('all')}
                                                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${filterMatched === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                                >
                                                    All ({stats.total})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterMatched('matched')}
                                                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${filterMatched === 'matched' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}
                                                >
                                                    Matched ({stats.matched})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterMatched('unmatched')}
                                                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${filterMatched === 'unmatched' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500'}`}
                                                >
                                                    Unmatched ({stats.unmatched})
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleSelectAll(true)}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleSelectAll(false)}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                            >
                                                Deselect All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl max-h-[380px] overflow-y-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-850 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3 w-8">
                                                        <input
                                                            type="checkbox"
                                                            checked={parsedRows.length > 0 && parsedRows.every(r => r.selected)}
                                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Admission No</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student Name</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Class / Grade</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Fee Items</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Invoiced (KES)</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                                {filteredRows.map(row => (
                                                    <tr key={row.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors ${!row.selected ? 'opacity-40' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.selected}
                                                                onChange={() => toggleRowSelect(row.id)}
                                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                                                            {row.admNo || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                                                            {row.studentName}
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">
                                                            {row.className || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                                                            {row.description}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                            {row.items.length > 0 ? (
                                                                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                                                    {row.items.length} items ({row.items.map(i => i.description).slice(0, 2).join(', ')}{row.items.length > 2 ? '...' : ''})
                                                                </span>
                                                            ) : '1 General Item'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <input
                                                                type="number"
                                                                value={row.totalAmount}
                                                                onChange={(e) => handleUpdateRowAmount(row.id, parseFloat(e.target.value) || 0)}
                                                                className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-mono font-black text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {row.isMatched ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                                                                    Matched
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase" title="Student not found in active database; will be billed under imported name">
                                                                    Unmatched
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {!generationSuccess && (
                    <div className="p-6 sm:px-8 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {parsedRows.length > 0 && (
                                <span>
                                    Ready to generate <strong className="text-slate-900 dark:text-white font-black">{stats.selected}</strong> invoices totalling <strong className="text-indigo-600 dark:text-indigo-400 font-black">KES {stats.totalAmount.toLocaleString()}</strong>.
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateInvoices}
                                disabled={isGenerating || stats.selected === 0}
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>{isGenerating ? `Generating (${progress}%)...` : `Generate ${stats.selected} Invoices`}</span>
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
