import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { User, Institution, Invoice, Receipt, CompanyDetails } from '../../types';
import {
    XIcon,
    ArrowUpTrayIcon,
    CheckBadgeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    Trash2Icon,
    SearchIcon,
    DocumentTextIcon,
    ChevronDownIcon,
    PencilIcon,
    PlusIcon
} from '../icons';
import { apiService } from '../../services/apiService';
import { resolveRealStudentAdmNo } from '../../utils/academicUtils';

export interface ReceiveFeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    students: User[];
    invoices?: Invoice[];
    receipts?: Receipt[];
    enrollments?: any[];
    userName?: string;
    currentUser?: any;
    onReceiptCreated?: (newReceipt: any) => void;
    onRefreshData?: () => Promise<void>;
    onLogAction?: (msg: string) => Promise<void> | void;
    defaultTab?: 'excel' | 'manual';
}

export interface ReconciledFeeItem {
    id: string;
    rowIndex: number;
    rawAdm: string;
    rawName: string;
    rawAmount: number;
    rawRef: string;
    rawDate: string;
    rawMode: string;
    rawReceiptNo: string;
    admDisplay: string;
    matchedStudentId: string;
    matchedStudentName: string;
    matchedStudentAdm: string;
    matchConfidence: 'exact_adm' | 'exact_name' | 'manual' | 'none';
    matchStatus: 'matched' | 'unmatched';
    paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque';
    rawRowData: Record<string, any>;
}

export const ReceiveFeesModal: React.FC<ReceiveFeesModalProps> = ({
    isOpen,
    onClose,
    institution,
    students,
    invoices = [],
    receipts = [],
    enrollments = [],
    userName = 'Finance Officer',
    currentUser,
    onReceiptCreated,
    onRefreshData,
    onLogAction,
    defaultTab = 'excel'
}) => {
    const [activeTab, setActiveTab] = useState<'excel' | 'manual'>(defaultTab);

    // Excel import state
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [isParsingExcel, setIsParsingExcel] = useState(false);
    
    // Column Mappings
    const [admissionCol, setAdmissionCol] = useState<string>('');
    const [nameCol, setNameCol] = useState<string>('');
    const [amountCol, setAmountCol] = useState<string>('');
    const [referenceCol, setReferenceCol] = useState<string>('');
    const [dateCol, setDateCol] = useState<string>('');
    const [modeCol, setModeCol] = useState<string>('');

    // Reconciled rows
    const [reconciledItems, setReconciledItems] = useState<ReconciledFeeItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'unmatched'>('all');
    
    // Processing state
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [overrideExisting, setOverrideExisting] = useState(true);
    const [sendSms, setSendSms] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);
    const [successSummary, setSuccessSummary] = useState<string | null>(null);

    // Manual Entry State
    const [manualStudentSearch, setManualStudentSearch] = useState('');
    const [manualSelectedStudent, setManualSelectedStudent] = useState<User | null>(null);
    const [manualAmount, setManualAmount] = useState<number | ''>('');
    const [manualMethod, setManualMethod] = useState<'Cash' | 'M-Pesa' | 'Bank Transfer' | 'Cheque' | 'Bursary'>('Cash');
    const [manualRef, setManualRef] = useState('');
    const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualInvoiceId, setManualInvoiceId] = useState('');
    const [manualPaidFor, setManualPaidFor] = useState('Tuition & School Fees');
    const [isPostingManual, setIsPostingManual] = useState(false);
    const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            setSuccessSummary(null);
            setManualSuccessMsg(null);
        }
    }, [isOpen, defaultTab]);

    // Build indexing maps for high-precision student matching
    const { admMap, nameMap, allStudentsList } = useMemo(() => {
        const studentPool: User[] = (students || []).filter(Boolean);
        const aMap = new Map<string, User>();
        const nMap = new Map<string, User>();

        const cleanAdmCandidates = (val: any): string[] => {
            if (val === undefined || val === null) return [];
            const str = String(val).trim().toLowerCase();
            if (!str || str === '—' || str === 'n/a' || str === 'undefined' || str === 'null') return [];

            const isReceiptLike = /^(bursary|rcpt|rec|receipt|inv|ref|bank|mpesa|pay)\d*/i.test(str);
            const strClean = str.replace(/\s*\(\d+\)\s*$/, '').trim();

            const candidates = new Set<string>();
            candidates.add(strClean);
            const noSpaces = strClean.replace(/\s+/g, '');
            if (noSpaces) candidates.add(noSpaces);
            const alnum = strClean.replace(/[^a-z0-9]/g, '');
            if (alnum) candidates.add(alnum);
            const digits = strClean.replace(/\D/g, '');
            if (digits) {
                candidates.add(digits);
                const noZeros = digits.replace(/^0+/, '');
                if (noZeros) candidates.add(noZeros);
            }

            if (!isReceiptLike) {
                const digitsMatch = strClean.match(/\d{2,10}/g);
                if (digitsMatch) {
                    digitsMatch.forEach(d => {
                        candidates.add(d);
                        const nz = d.replace(/^0+/, '');
                        if (nz) candidates.add(nz);
                    });
                }
                const strippedPrefix = strClean.replace(/^(adm|std|reg|no|num|#|\/|-|_|\s)+/i, '').replace(/(\/|-|_)(20\d\d|[0-9]{1,2})$/i, '').trim();
                if (strippedPrefix) {
                    candidates.add(strippedPrefix);
                    const stripAlnum = strippedPrefix.replace(/[^a-z0-9]/g, '');
                    if (stripAlnum) candidates.add(stripAlnum);
                    const stripDigits = strippedPrefix.replace(/\D/g, '');
                    if (stripDigits) {
                        candidates.add(stripDigits);
                        const stripNoZeros = stripDigits.replace(/^0+/, '');
                        if (stripNoZeros) candidates.add(stripNoZeros);
                    }
                }
            }
            return Array.from(candidates);
        };

        studentPool.forEach(student => {
            const rawAdm = resolveRealStudentAdmNo(student);
            const candidates = [
                student.id,
                rawAdm,
                student.admissionNumber,
                (student as any).admission_number,
                (student as any).admNo,
                (student as any).adm_no,
                (student as any).registrationNumber,
                (student as any).regNo,
                (student as any).reg_no,
                (student as any).staffId,
                student.metadata?.admissionNumber,
                student.metadata?.admission_number,
                student.metadata?.admNo
            ];

            const enr = enrollments.find(e => e.userId === student.id || (e as any).studentId === student.id);
            if (enr) {
                candidates.push(
                    enr.admissionNumber,
                    enr.admission_number,
                    enr.admNo,
                    enr.adm_no,
                    enr.metadata?.admissionNumber,
                    enr.metadata?.admNo
                );
            }

            candidates.forEach(c => {
                cleanAdmCandidates(c).forEach(k => {
                    if (k && k.length >= 2) aMap.set(k, student);
                });
            });

            if (student.name) {
                const nameKey = student.name.trim().toLowerCase();
                nMap.set(nameKey, student);
                const cleanAlpha = nameKey.replace(/[^a-z0-9]/g, '');
                if (cleanAlpha) nMap.set(cleanAlpha, student);
                const parts = nameKey.split(/\s+/).filter(Boolean);
                if (parts.length > 1) {
                    nMap.set(parts.slice().reverse().join(' '), student);
                    nMap.set(`${parts[0]} ${parts[parts.length - 1]}`, student);
                    nMap.set(`${parts[parts.length - 1]} ${parts[0]}`, student);
                }
            }
        });

        return { admMap: aMap, nameMap: nMap, allStudentsList: studentPool };
    }, [students, enrollments]);

    // Parse money helper
    const parseMoney = (val: any): number => {
        if (!val && val !== 0) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        let s = String(val).trim();
        if (!s) return 0;
        let isNeg = false;
        if (s.startsWith('(') && s.endsWith(')')) {
            isNeg = true;
            s = s.slice(1, -1);
        } else if (s.startsWith('-') || s.endsWith('-')) {
            isNeg = true;
        }
        const clean = s.replace(/[^0-9.]/g, '');
        if (!clean) return 0;
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : (isNeg ? -num : num);
    };

    // Universal Date resolver
    const parseExcelDate = (val: any): string => {
        const today = new Date().toISOString().split('T')[0];
        if (!val && val !== 0) return today;
        if (val instanceof Date) {
            return isNaN(val.getTime()) ? today : val.toISOString().split('T')[0];
        }
        if (typeof val === 'number') {
            if (val < 1) return today;
            const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(val) * 86400000);
            return isNaN(utc.getTime()) ? today : utc.toISOString().split('T')[0];
        }
        const s = String(val).trim();
        if (!s) return today;

        const noTime = s.split(/[T ]/)[0];
        const dmy4 = noTime.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (dmy4) return `${dmy4[3]}-${dmy4[2].padStart(2, '0')}-${dmy4[1].padStart(2, '0')}`;

        const ymd = noTime.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
        if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

        const dmy2 = noTime.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/);
        if (dmy2) {
            const yr = parseInt(dmy2[3]) > 50 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
            return `${yr}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
        }

        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        return today;
    };

    // Auto-detect columns from parsed headers
    const autoDetectColumns = (headers: string[]) => {
        const findCol = (pattern: RegExp) => headers.find(h => pattern.test(h.trim())) || '';

        const detectedAdm = findCol(/^(adm|admission|reg|registration|student[\s_]*(no|id|num|adm|#)?|std|index|upi)$/i) ||
                            headers.find(h => /adm|admission|reg/i.test(h)) || (headers.length > 0 ? headers[0] : '');

        const detectedName = findCol(/^(name|student[\s_]*name|payer[\s_]*name|sender[\s_]*name|full[\s_]*name)$/i) ||
                             headers.find(h => /name|payer|student/i.test(h) && h !== detectedAdm) || '';

        const detectedAmt = findCol(/^(amount|amount[\s_]*(paid|received|ksh)?|paid|credit|total|ksh)$/i) ||
                            headers.find(h => /amount|paid|total|credit/i.test(h)) || '';

        const detectedRef = findCol(/^(reference|ref(erence)?[\s_]*(no|code|#)?|trans(action)?[\s_]*(code|id|ref)?|mpesa[\s_]*(code|ref)?|code)$/i) ||
                            headers.find(h => /ref|trans|code|mpesa/i.test(h)) || '';

        const detectedDate = findCol(/^(paid[\s_]*on|date|payment[\s_]*date|trans[\s_]*date|txn[\s_]*date)$/i) ||
                             headers.find(h => /date|paid|time/i.test(h)) || '';

        const detectedMode = findCol(/^(payment[\s_]*mode|pay[\s_]*mode|mode|payment[\s_]*type|channel)$/i) || '';

        setAdmissionCol(detectedAdm);
        setNameCol(detectedName);
        setAmountCol(detectedAmt);
        setReferenceCol(detectedRef);
        setDateCol(detectedDate);
        setModeCol(detectedMode);
    };

    // Reconcile rows based on currently selected column mappings
    const reconcileRows = (
        rows: Record<string, any>[],
        mappings: {
            admCol: string;
            nmCol: string;
            amtCol: string;
            refCol: string;
            dtCol: string;
            mdCol: string;
        }
    ) => {
        const items: ReconciledFeeItem[] = rows.map((row, idx) => {
            const rawAdm = mappings.admCol ? String(row[mappings.admCol] ?? '').trim() : '';
            const rawName = mappings.nmCol ? String(row[mappings.nmCol] ?? '').trim() : '';
            const rawAmount = mappings.amtCol ? parseMoney(row[mappings.amtCol]) : 0;
            const rawRef = mappings.refCol ? String(row[mappings.refCol] ?? '').trim() : `REF-${Date.now()}-${idx + 1}`;
            const rawDate = mappings.dtCol ? parseExcelDate(row[mappings.dtCol]) : new Date().toISOString().split('T')[0];
            const rawMode = mappings.mdCol ? String(row[mappings.mdCol] ?? '').trim() : '';

            // Match student
            let matchedStudent: User | null = null;
            let matchConfidence: 'exact_adm' | 'exact_name' | 'manual' | 'none' = 'none';

            // 1. ADM matching
            if (rawAdm && rawAdm.length >= 1) {
                const normAdm = rawAdm.toLowerCase();
                const cleanAlpha = normAdm.replace(/[^a-z0-9]/g, '');
                const cleanDigits = normAdm.replace(/\D/g, '');
                const noZeros = cleanDigits.replace(/^0+/, '');

                if (admMap.has(normAdm)) {
                    matchedStudent = admMap.get(normAdm)!;
                    matchConfidence = 'exact_adm';
                } else if (cleanAlpha && admMap.has(cleanAlpha)) {
                    matchedStudent = admMap.get(cleanAlpha)!;
                    matchConfidence = 'exact_adm';
                } else if (cleanDigits && admMap.has(cleanDigits)) {
                    matchedStudent = admMap.get(cleanDigits)!;
                    matchConfidence = 'exact_adm';
                } else if (noZeros && admMap.has(noZeros)) {
                    matchedStudent = admMap.get(noZeros)!;
                    matchConfidence = 'exact_adm';
                }
            }

            // 2. Name matching fallback
            if (!matchedStudent && rawName && rawName.split(/\s+/).filter(Boolean).length >= 2) {
                const nameKey = rawName.toLowerCase();
                const cleanAlpha = nameKey.replace(/[^a-z0-9]/g, '');
                if (nameMap.has(nameKey)) {
                    matchedStudent = nameMap.get(nameKey)!;
                    matchConfidence = 'exact_name';
                } else if (cleanAlpha && nameMap.has(cleanAlpha)) {
                    matchedStudent = nameMap.get(cleanAlpha)!;
                    matchConfidence = 'exact_name';
                }
            }

            // Payment method detection
            let paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' = 'M-Pesa';
            if (rawMode) {
                if (/bank|transfer|eft|rtgs/i.test(rawMode)) paymentMethod = 'Bank Transfer';
                else if (/cash/i.test(rawMode)) paymentMethod = 'Cash';
                else if (/cheque|chq/i.test(rawMode)) paymentMethod = 'Cheque';
                else if (/mpesa|m-pesa|paybill/i.test(rawMode)) paymentMethod = 'M-Pesa';
            } else {
                const combined = `${rawRef} ${rawName}`.toLowerCase();
                if (/bank|cheque|chq|ft|transfer/i.test(combined)) paymentMethod = 'Bank Transfer';
                else if (/cash/i.test(combined)) paymentMethod = 'Cash';
            }

            const matchedAdm = matchedStudent ? resolveRealStudentAdmNo(matchedStudent) : '';

            return {
                id: `rec_row_${idx}_${Date.now()}`,
                rowIndex: idx + 1,
                rawAdm,
                rawName,
                rawAmount,
                rawRef,
                rawDate,
                rawMode,
                rawReceiptNo: '',
                admDisplay: rawAdm || matchedAdm || '—',
                matchedStudentId: matchedStudent ? matchedStudent.id : '',
                matchedStudentName: matchedStudent ? matchedStudent.name : '',
                matchedStudentAdm: matchedAdm,
                matchConfidence,
                matchStatus: matchedStudent ? 'matched' : 'unmatched',
                paymentMethod,
                rawRowData: row
            };
        });

        setReconciledItems(items);
    };

    // Handle file upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setExcelFile(file);
        setIsParsingExcel(true);
        e.target.value = '';

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', dense: true, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Parse headers
            const sheetMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (sheetMatrix.length === 0) {
                alert("Spreadsheet is empty.");
                setIsParsingExcel(false);
                return;
            }

            const headers = (sheetMatrix[0] || []).map(h => String(h).trim()).filter(Boolean);
            setExcelHeaders(headers);

            const parsedRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            setRawRows(parsedRows);

            // Auto-detect columns
            autoDetectColumns(headers);

            // Trigger initial reconciliation
            const findCol = (pattern: RegExp) => headers.find(h => pattern.test(h.trim())) || '';
            const detectedAdm = findCol(/^(adm|admission|reg|registration|student[\s_]*(no|id|num|adm|#)?|std|index|upi)$/i) ||
                                headers.find(h => /adm|admission|reg/i.test(h)) || (headers.length > 0 ? headers[0] : '');
            const detectedName = findCol(/^(name|student[\s_]*name|payer[\s_]*name|sender[\s_]*name|full[\s_]*name)$/i) ||
                                 headers.find(h => /name|payer|student/i.test(h) && h !== detectedAdm) || '';
            const detectedAmt = findCol(/^(amount|amount[\s_]*(paid|received|ksh)?|paid|credit|total|ksh)$/i) ||
                                headers.find(h => /amount|paid|total|credit/i.test(h)) || '';
            const detectedRef = findCol(/^(reference|ref(erence)?[\s_]*(no|code|#)?|trans(action)?[\s_]*(code|id|ref)?|mpesa[\s_]*(code|ref)?|code)$/i) ||
                                headers.find(h => /ref|trans|code|mpesa/i.test(h)) || '';
            const detectedDate = findCol(/^(paid[\s_]*on|date|payment[\s_]*date|trans[\s_]*date|txn[\s_]*date)$/i) ||
                                 headers.find(h => /date|paid|time/i.test(h)) || '';
            const detectedMode = findCol(/^(payment[\s_]*mode|pay[\s_]*mode|mode|payment[\s_]*type|channel)$/i) || '';

            reconcileRows(parsedRows, {
                admCol: detectedAdm,
                nmCol: detectedName,
                amtCol: detectedAmt,
                refCol: detectedRef,
                dtCol: detectedDate,
                mdCol: detectedMode
            });
        } catch (err: any) {
            console.error("Excel parse error:", err);
            alert("Failed to parse Excel file: " + err.message);
        } finally {
            setIsParsingExcel(false);
        }
    };

    // When user changes any column mapping dropdown
    const handleMappingChange = (
        type: 'adm' | 'name' | 'amount' | 'ref' | 'date' | 'mode',
        newCol: string
    ) => {
        let newAdm = admissionCol;
        let newName = nameCol;
        let newAmt = amountCol;
        let newRef = referenceCol;
        let newDate = dateCol;
        let newMode = modeCol;

        if (type === 'adm') { setAdmissionCol(newCol); newAdm = newCol; }
        if (type === 'name') { setNameCol(newCol); newName = newCol; }
        if (type === 'amount') { setAmountCol(newCol); newAmt = newCol; }
        if (type === 'ref') { setReferenceCol(newCol); newRef = newCol; }
        if (type === 'date') { setDateCol(newCol); newDate = newCol; }
        if (type === 'mode') { setModeCol(newCol); newMode = newCol; }

        if (rawRows.length > 0) {
            reconcileRows(rawRows, {
                admCol: newAdm,
                nmCol: newName,
                amtCol: newAmt,
                refCol: newRef,
                dtCol: newDate,
                mdCol: newMode
            });
        }
    };

    // Remove single row
    const handleRemoveRow = (id: string) => {
        setReconciledItems(prev => prev.filter(item => item.id !== id));
    };

    // Manual student reassignment for a row
    const handleReassignStudent = (rowId: string, studentId: string) => {
        const student = allStudentsList.find(s => s.id === studentId);
        const sAdm = student ? resolveRealStudentAdmNo(student) : '';
        setReconciledItems(prev => prev.map(item => {
            if (item.id === rowId) {
                return {
                    ...item,
                    matchedStudentId: student ? student.id : '',
                    matchedStudentName: student ? student.name : '',
                    matchedStudentAdm: sAdm,
                    matchStatus: student ? 'matched' : 'unmatched',
                    matchConfidence: student ? 'manual' : 'none'
                };
            }
            return item;
        }));
    };

    // Filtered items
    const filteredItems = useMemo(() => {
        return reconciledItems.filter(item => {
            if (filterStatus === 'matched' && item.matchStatus !== 'matched') return false;
            if (filterStatus === 'unmatched' && item.matchStatus !== 'unmatched') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                return (
                    item.rawAdm.toLowerCase().includes(q) ||
                    item.rawName.toLowerCase().includes(q) ||
                    item.rawRef.toLowerCase().includes(q) ||
                    item.matchedStudentName.toLowerCase().includes(q) ||
                    item.matchedStudentAdm.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [reconciledItems, filterStatus, searchQuery]);

    // Summary metrics
    const stats = useMemo(() => {
        const totalRows = reconciledItems.length;
        const matched = reconciledItems.filter(i => i.matchStatus === 'matched');
        const unmatched = reconciledItems.filter(i => i.matchStatus === 'unmatched');
        const totalAmount = matched.reduce((s, i) => s + (i.rawAmount || 0), 0);
        return {
            totalRows,
            matchedCount: matched.length,
            unmatchedCount: unmatched.length,
            totalAmount
        };
    }, [reconciledItems]);

    // Confirm & Post Bulk Receipts
    const handleConfirmPostBulk = async () => {
        const readyItems = reconciledItems.filter(i => i.matchStatus === 'matched' && i.rawAmount > 0);
        if (readyItems.length === 0) {
            alert("No matched payment rows with positive amounts to post.");
            return;
        }

        setIsProcessingBulk(true);
        setBulkProgress({ current: 0, total: readyItems.length });

        const instId = institution?.id || '';
        let postedCount = 0;
        let totalVal = 0;
        const createdReceiptIds: string[] = [];

        try {
            for (let i = 0; i < readyItems.length; i++) {
                const item = readyItems[i];
                const cleanRef = item.rawRef.trim();
                const student = allStudentsList.find(s => s.id === item.matchedStudentId);
                const sAdm = student ? resolveRealStudentAdmNo(student) : item.matchedStudentAdm;

                // Existing receipt lookup if override is enabled
                let existingReceipt: Receipt | undefined;
                if (overrideExisting) {
                    existingReceipt = receipts.find(r => 
                        (r.relatedTransactionId && cleanRef && String(r.relatedTransactionId).trim().toLowerCase() === cleanRef.toLowerCase()) ||
                        (item.rawReceiptNo && r.receiptNumber && String(r.receiptNumber).trim().toLowerCase() === item.rawReceiptNo.trim().toLowerCase())
                    );
                }

                const receiptId = existingReceipt ? existingReceipt.id : `rec_imp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
                const receiptNumber = item.rawReceiptNo || existingReceipt?.receiptNumber || `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;

                const receiptRecord: Partial<Receipt> & Record<string, any> = {
                    id: receiptId,
                    receiptNumber,
                    receipt_number: receiptNumber,
                    institutionId: instId,
                    institution_id: instId,
                    studentId: item.matchedStudentId,
                    student_id: item.matchedStudentId,
                    studentName: item.matchedStudentName || student?.name || 'Student',
                    student_name: item.matchedStudentName || student?.name || 'Student',
                    admissionNumber: sAdm,
                    admission_number: sAdm,
                    amountPaid: Number(item.rawAmount),
                    amount_paid: Number(item.rawAmount),
                    paymentMethod: item.paymentMethod,
                    payment_method: item.paymentMethod,
                    relatedTransactionId: cleanRef,
                    related_transaction_id: cleanRef,
                    paymentDate: item.rawDate,
                    payment_date: item.rawDate,
                    paidFor: 'School Fees — Excel Bulk Import',
                    paid_for: 'School Fees — Excel Bulk Import',
                    notes: `Imported via Excel Mapping: ${item.rawName || ''} [${item.rawAdm || ''}]`,
                    excelPaymentMode: item.rawMode || item.paymentMethod,
                    updatedAt: new Date().toISOString(),
                    createdAt: existingReceipt?.createdAt || new Date().toISOString()
                };

                await apiService.saveModuleRecord('receipts', receiptRecord);
                createdReceiptIds.push(receiptId);
                postedCount++;
                totalVal += Number(item.rawAmount);

                if (onReceiptCreated) onReceiptCreated(receiptRecord);

                setBulkProgress({ current: i + 1, total: readyItems.length });
                await new Promise(r => setTimeout(r, 10)); // smooth progress
            }

            // Save batch audit history
            const batchId = `rb_excel_${Date.now()}`;
            const batchRecord = {
                id: batchId,
                description: `Excel Import: ${excelFile?.name || 'Statement'} (${postedCount} receipts)`,
                totalValue: totalVal,
                noOfRecords: postedCount,
                addedOn: new Date().toISOString(),
                addedBy: userName || currentUser?.name || 'Finance Officer',
                receiptIds: createdReceiptIds,
                status: 'active'
            };
            try {
                const storedBatches = localStorage.getItem('eduai_receipt_batches_' + instId);
                const batches = storedBatches ? JSON.parse(storedBatches) : [];
                batches.unshift(batchRecord);
                localStorage.setItem('eduai_receipt_batches_' + instId, JSON.stringify(batches));
            } catch {}

            if (onLogAction) {
                await onLogAction(`Imported ${postedCount} payments totaling KES ${totalVal.toLocaleString()} from Excel file.`);
            }

            if (onRefreshData) await onRefreshData();

            setSuccessSummary(`Successfully posted ${postedCount} receipts totaling KES ${totalVal.toLocaleString()}!`);
        } catch (err: any) {
            console.error("Bulk receipt post failed:", err);
            alert("Error posting bulk receipts: " + err.message);
        } finally {
            setIsProcessingBulk(false);
        }
    };

    // Manual single payment post
    const handlePostManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualSelectedStudent) {
            alert("Please search and select a student.");
            return;
        }
        if (!manualAmount || Number(manualAmount) <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        setIsPostingManual(true);
        const instId = institution?.id || '';
        const sAdm = resolveRealStudentAdmNo(manualSelectedStudent);
        const receiptNumber = `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;

        const receiptRecord: Partial<Receipt> & Record<string, any> = {
            id: `rec_man_${Date.now()}`,
            receiptNumber,
            receipt_number: receiptNumber,
            institutionId: instId,
            institution_id: instId,
            studentId: manualSelectedStudent.id,
            student_id: manualSelectedStudent.id,
            studentName: manualSelectedStudent.name,
            student_name: manualSelectedStudent.name,
            admissionNumber: sAdm,
            admission_number: sAdm,
            amountPaid: Number(manualAmount),
            amount_paid: Number(manualAmount),
            paymentMethod: manualMethod,
            payment_method: manualMethod,
            relatedTransactionId: manualRef || `MAN-${Date.now()}`,
            related_transaction_id: manualRef || `MAN-${Date.now()}`,
            paymentDate: manualDate,
            payment_date: manualDate,
            paidFor: manualPaidFor,
            paid_for: manualPaidFor,
            invoiceId: manualInvoiceId || undefined,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('receipts', receiptRecord);
            if (onReceiptCreated) onReceiptCreated(receiptRecord);
            if (onLogAction) await onLogAction(`Manually received KES ${Number(manualAmount).toLocaleString()} for ${manualSelectedStudent.name} (${sAdm})`);
            if (onRefreshData) await onRefreshData();

            setManualSuccessMsg(`Receipt ${receiptNumber} created successfully for ${manualSelectedStudent.name}!`);
            setManualSelectedStudent(null);
            setManualStudentSearch('');
            setManualAmount('');
            setManualRef('');
        } catch (err: any) {
            alert("Failed to post receipt: " + err.message);
        } finally {
            setIsPostingManual(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] overflow-hidden text-left my-auto">
                
                {/* ── Modal Top Header ── */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                            <ArrowUpTrayIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                Receive fees money
                            </h3>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Tabs: Import from Excel file | Key-in manually ── */}
                <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 bg-white dark:bg-slate-900 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('excel')}
                        className={`py-3 text-xs font-bold tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                            activeTab === 'excel'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>Import from Excel file</span>
                        {reconciledItems.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                {reconciledItems.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className={`py-3 text-xs font-bold tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                            activeTab === 'manual'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>Key-in manually</span>
                    </button>
                </div>

                {/* ── TAB 1: EXCEL IMPORT & FIELD MAPPING ── */}
                {activeTab === 'excel' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        
                        {/* If no file uploaded yet */}
                        {!excelFile && (
                            <div className="py-14 px-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                                {isParsingExcel ? (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Reading Excel sheet and detecting columns...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                            <ArrowUpTrayIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                Select Excel Statement (.xlsx, .xls, .csv)
                                            </h4>
                                            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                                                Upload your bank or M-Pesa statements. You can match the columns in the next step to assign payments accurately.
                                            </p>
                                        </div>
                                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer">
                                            <ArrowUpTrayIcon className="w-4 h-4" />
                                            <span>Choose Excel File</span>
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    </>
                                )}
                            </div>
                        )}

                        {/* File loaded: Display Instruction & Field Mapping Controls */}
                        {excelFile && (
                            <div className="space-y-5 animate-in fade-in duration-200">
                                
                                {/* Instruction Banner matching sample UI */}
                                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    We will now need you to tell us which columns in your Excel file contain the admission number, amount paid, payment reference and date of payment by clicking on <span className="font-black text-slate-800 dark:text-white">⌵</span> and choosing the column name.
                                </div>

                                {/* ── Field Mapping Selectors (Row of 4-5 dropdowns) ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    {/* Admission number mapping */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Admission number
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={admissionCol}
                                                onChange={(e) => handleMappingChange('adm', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- Select Column --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Student Name mapping */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Student name (optional)
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={nameCol}
                                                onChange={(e) => handleMappingChange('name', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- None / Auto-detect --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Amount paid mapping */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Amount paid
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={amountCol}
                                                onChange={(e) => handleMappingChange('amount', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- Select Column --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Reference mapping */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Reference
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={referenceCol}
                                                onChange={(e) => handleMappingChange('ref', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- Select Column --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Date paid mapping */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Date paid
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={dateCol}
                                                onChange={(e) => handleMappingChange('date', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- Select Column --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Controls & Filter Bar ── */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-64">
                                            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Filter rows by name, ADM, ref..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {(['all', 'matched', 'unmatched'] as const).map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setFilterStatus(st)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        filterStatus === st
                                                            ? 'bg-indigo-600 text-white shadow-xs'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Stats Badges */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold border border-emerald-200 dark:border-emerald-800/40 text-[10px]">
                                            ✓ {stats.matchedCount} Matched
                                        </span>
                                        {stats.unmatchedCount > 0 && (
                                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg font-bold border border-amber-200 dark:border-amber-800/40 text-[10px]">
                                                ⚠ {stats.unmatchedCount} Unmatched
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg font-black border border-indigo-200 dark:border-indigo-800/40 text-[10px]">
                                            KES {stats.totalAmount.toLocaleString()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExcelFile(null);
                                                setReconciledItems([]);
                                                setRawRows([]);
                                            }}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                                        >
                                            Change File
                                        </button>
                                    </div>
                                </div>

                                {/* ── Interactive Data Grid Table matching screenshot ── */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                                    <div className="max-h-[360px] overflow-y-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                                                    <th className="px-3 py-2.5 w-10 text-center text-slate-400">#</th>
                                                    <th className="px-4 py-2.5 text-left">Admission</th>
                                                    <th className="px-4 py-2.5 text-left">Name</th>
                                                    <th className="px-4 py-2.5 text-right">Amount</th>
                                                    <th className="px-4 py-2.5 text-left">Reference</th>
                                                    <th className="px-4 py-2.5 text-left">Date Paid</th>
                                                    <th className="px-4 py-2.5 text-left">Assigned Student</th>
                                                    <th className="px-3 py-2.5 text-center w-24">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                                                            No rows match your filters or mappings.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredItems.map((item) => (
                                                        <tr 
                                                            key={item.id}
                                                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                                                                item.matchStatus === 'unmatched' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                                                            }`}
                                                        >
                                                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                                                                {item.rowIndex}
                                                            </td>
                                                            <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                                {item.rawAdm || <span className="text-slate-300 italic">none</span>}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">
                                                                {item.rawName || <span className="text-slate-300 italic">—</span>}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                                                                {item.rawAmount ? item.rawAmount.toLocaleString() : '0'}
                                                            </td>
                                                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                                                {item.rawRef}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                                                                {item.rawDate}
                                                            </td>
                                                            <td className="px-4 py-2.5 min-w-[200px]">
                                                                {item.matchedStudentName ? (
                                                                    <div className="flex items-center justify-between gap-1.5">
                                                                        <div>
                                                                            <span className="font-bold text-slate-900 dark:text-white block">
                                                                                {item.matchedStudentName}
                                                                            </span>
                                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                                                                {item.matchedStudentAdm || 'ADM OK'} ({item.matchConfidence})
                                                                            </span>
                                                                        </div>
                                                                        <select
                                                                            value={item.matchedStudentId}
                                                                            onChange={(e) => handleReassignStudent(item.id, e.target.value)}
                                                                            className="opacity-0 hover:opacity-100 focus:opacity-100 w-6 h-6 border rounded text-[10px] cursor-pointer"
                                                                            title="Change student"
                                                                        >
                                                                            {allStudentsList.map(s => (
                                                                                <option key={s.id} value={s.id}>{s.name} ({resolveRealStudentAdmNo(s)})</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                ) : (
                                                                    <select
                                                                        value={item.matchedStudentId}
                                                                        onChange={(e) => handleReassignStudent(item.id, e.target.value)}
                                                                        className="w-full px-2 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 outline-none cursor-pointer"
                                                                    >
                                                                        <option value="">-- Match Student --</option>
                                                                        {allStudentsList.map(s => (
                                                                            <option key={s.id} value={s.id}>
                                                                                {resolveRealStudentAdmNo(s)} · {s.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRow(item.id)}
                                                                    className="px-2.5 py-1 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 hover:border-rose-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
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

                                {/* Progress Bar during bulk posting */}
                                {isProcessingBulk && bulkProgress.total > 0 && (
                                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-2">
                                        <div className="flex justify-between items-center text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                            <span>Posting Receipts to Ledgers...</span>
                                            <span>{bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                                                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Success message */}
                                {successSummary && (
                                    <div className="p-4 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-2xl font-bold text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                                            <span>{successSummary}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}

                                {/* Bottom Options & Confirmation Action Bar */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={overrideExisting}
                                                onChange={(e) => setOverrideExisting(e.target.checked)}
                                                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                            />
                                            <span>Update if Ref/Receipt exists</span>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isProcessingBulk}
                                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmPostBulk}
                                            disabled={isProcessingBulk || stats.matchedCount === 0}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            {isProcessingBulk ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Posting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckBadgeIcon className="w-4 h-4" />
                                                    <span>Confirm &amp; Post {stats.matchedCount} Payments</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: KEY-IN MANUALLY ── */}
                {activeTab === 'manual' && (
                    <form onSubmit={handlePostManual} className="flex-1 overflow-y-auto p-6 space-y-5">
                        <div className="max-w-xl mx-auto space-y-4">
                            
                            {/* Student Search */}
                            <div className="space-y-1 relative">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                    Search Student (Name or Admission No) *
                                </label>
                                <div className="relative">
                                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Type name or ADM number..."
                                        value={manualStudentSearch}
                                        onChange={(e) => {
                                            setManualStudentSearch(e.target.value);
                                            if (manualSelectedStudent) setManualSelectedStudent(null);
                                        }}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {manualStudentSearch.trim().length >= 2 && !manualSelectedStudent && (
                                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                        {allStudentsList
                                            .filter(s => 
                                                (s.name || '').toLowerCase().includes(manualStudentSearch.toLowerCase()) ||
                                                resolveRealStudentAdmNo(s).toLowerCase().includes(manualStudentSearch.toLowerCase())
                                            )
                                            .slice(0, 8)
                                            .map(st => (
                                                <button
                                                    key={st.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setManualSelectedStudent(st);
                                                        setManualStudentSearch(`${st.name} (${resolveRealStudentAdmNo(st)})`);
                                                    }}
                                                    className="w-full p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                                                >
                                                    <span>{st.name}</span>
                                                    <span className="font-mono text-slate-400 text-[11px] font-bold">
                                                        ADM: {resolveRealStudentAdmNo(st)}
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                )}
                                {manualSelectedStudent && (
                                    <p className="text-[11px] text-emerald-600 font-bold">
                                        ✓ Selected: {manualSelectedStudent.name} ({resolveRealStudentAdmNo(manualSelectedStudent)})
                                    </p>
                                )}
                            </div>

                            {/* Amount & Method */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        Amount (KES) *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 5000"
                                        value={manualAmount}
                                        onChange={(e) => setManualAmount(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        Payment Method *
                                    </label>
                                    <select
                                        value={manualMethod}
                                        onChange={(e) => setManualMethod(e.target.value as any)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="Cash">💵 Cash</option>
                                        <option value="M-Pesa">📱 M-Pesa</option>
                                        <option value="Bank Transfer">🏛️ Bank Transfer</option>
                                        <option value="Cheque">📊 Cheque</option>
                                        <option value="Bursary">🎓 Bursary</option>
                                    </select>
                                </div>
                            </div>

                            {/* Date & Reference */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        Payment Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={manualDate}
                                        onChange={(e) => setManualDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        Transaction Ref / Slip Code
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. QX98102381 / Bank Slip"
                                        value={manualRef}
                                        onChange={(e) => setManualRef(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Paid For / Description */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                    Paid For / Votehead Allocation
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Tuition Fees / Term 1"
                                    value={manualPaidFor}
                                    onChange={(e) => setManualPaidFor(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Success message */}
                            {manualSuccessMsg && (
                                <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-300">
                                    ✓ {manualSuccessMsg}
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={isPostingManual || !manualSelectedStudent || !manualAmount}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {isPostingManual ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Posting Receipt...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlusIcon className="w-4 h-4" />
                                            <span>Post Official Receipt</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
