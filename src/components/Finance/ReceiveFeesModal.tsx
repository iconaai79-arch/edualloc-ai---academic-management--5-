import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { User, Institution, Invoice, Receipt } from '../../types';
import {
    XIcon,
    ArrowUpTrayIcon,
    CheckBadgeIcon,
    CheckCircleIcon,
    SparklesIcon,
    SearchIcon,
    ChevronDownIcon,
    PlusIcon,
    Cog8ToothIcon,
    BanknotesIcon
} from '../icons';
import { apiService } from '../../services/apiService';
import { resolveRealStudentAdmNo } from '../../utils/academicUtils';

export interface VoteHeadAllocationItem {
    voteHead: string;
    amount: number;
    invoiceId?: string;
    description?: string;
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
    receiptNumber: string;
    receiptSource: 'excel' | 'system';
    admDisplay: string;
    matchedStudentId: string;
    matchedStudentName: string;
    matchedStudentAdm: string;
    matchConfidence: 'exact_adm' | 'exact_name' | 'manual' | 'none';
    matchStatus: 'matched' | 'unmatched';
    paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque';
    voteHeadAllocations: VoteHeadAllocationItem[];
    voteHeadSummary: string;
    rawRowData: Record<string, any>;
}

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

const DEFAULT_VOTEHEAD_PRIORITIES = [
    'Tuition & Academic Fees',
    'Boarding & Accommodation',
    'Transport / Bus Service',
    'Lunch & Catering',
    'Examination & Assessment',
    'Activity, Sports & Clubs',
    'Development / Capital Levy',
    'Uniform & Stationery'
];

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

    // Votehead Auto-Split configuration
    const [autoSplitVoteheads, setAutoSplitVoteheads] = useState(true);
    const [voteheadPriorities, setVoteheadPriorities] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_votehead_priorities_${institution?.id}`);
            return saved ? JSON.parse(saved) : DEFAULT_VOTEHEAD_PRIORITIES;
        } catch {
            return DEFAULT_VOTEHEAD_PRIORITIES;
        }
    });
    const [showVoteheadConfig, setShowVoteheadConfig] = useState(false);
    const [inspectingItem, setInspectingItem] = useState<ReconciledFeeItem | null>(null);

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
    const [receiptCol, setReceiptCol] = useState<string>('');

    // Reconciled rows
    const [reconciledItems, setReconciledItems] = useState<ReconciledFeeItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'unmatched'>('all');
    const [excelPage, setExcelPage] = useState(1);
    const PAGE_SIZE = 25;
    
    // Processing state
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [overrideExisting, setOverrideExisting] = useState(true);
    const [successSummary, setSuccessSummary] = useState<string | null>(null);

    // Manual Entry State
    const [manualStudentSearch, setManualStudentSearch] = useState('');
    const [manualSelectedStudent, setManualSelectedStudent] = useState<User | null>(null);
    const [manualAmount, setManualAmount] = useState<number | ''>('');
    const [manualMethod, setManualMethod] = useState<'Cash' | 'M-Pesa' | 'Bank Transfer' | 'Cheque' | 'Bursary'>('Cash');
    const [manualRef, setManualRef] = useState('');
    const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualReceiptNo, setManualReceiptNo] = useState('');
    const [manualPaidFor, setManualPaidFor] = useState('Tuition & School Fees');
    const [isPostingManual, setIsPostingManual] = useState(false);
    const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

    // Save priorities to localStorage
    const handleSavePriorities = (newPriorities: string[]) => {
        setVoteheadPriorities(newPriorities);
        try {
            localStorage.setItem(`eduai_votehead_priorities_${institution?.id}`, JSON.stringify(newPriorities));
        } catch {}
        // Trigger re-split across existing rows if any
        if (rawRows.length > 0) {
            reconcileRows(rawRows, {
                admCol: admissionCol,
                nmCol: nameCol,
                amtCol: amountCol,
                refCol: referenceCol,
                dtCol: dateCol,
                mdCol: modeCol,
                rcptCol: receiptCol
            }, newPriorities, autoSplitVoteheads);
        }
    };

    const handleMovePriority = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= voteheadPriorities.length) return;
        const copy = [...voteheadPriorities];
        const temp = copy[index];
        copy[index] = copy[targetIndex];
        copy[targetIndex] = temp;
        handleSavePriorities(copy);
    };

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            setSuccessSummary(null);
            setManualSuccessMsg(null);
        }
    }, [isOpen, defaultTab]);

    // Build indexing maps for student matching
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

    // Pre-index student invoices map for O(1) instant votehead resolution
    const studentInvoicesMap = useMemo(() => {
        const map = new Map<string, Invoice[]>();
        (invoices || []).forEach(inv => {
            const sId = String(inv.studentId || (inv as any).student_id || (inv as any).userId || '');
            if (sId) {
                const list = map.get(sId) || [];
                list.push(inv);
                map.set(sId, list);
            }
        });
        return map;
    }, [invoices]);

    // ── VOTEHEAD AUTO-SPLIT CALCULATION ENGINE (O(1) Optimized) ──
    const calculateVoteHeadSplit = (
        studentId: string,
        paidAmount: number,
        priorities: string[] = voteheadPriorities,
        enabled: boolean = autoSplitVoteheads
    ): { allocations: VoteHeadAllocationItem[]; summary: string } => {
        if (!enabled || paidAmount <= 0) {
            return {
                allocations: [{ voteHead: 'School Fees', amount: paidAmount }],
                summary: 'School Fees'
            };
        }

        let remaining = paidAmount;
        const allocations: VoteHeadAllocationItem[] = [];

        // 1. O(1) lookup of student's invoices
        const studentInvoices = studentId ? (studentInvoicesMap.get(studentId) || []) : [];

        if (studentInvoices.length > 0) {
            const pendingItems: Array<{
                invoiceId: string;
                description: string;
                voteHead: string;
                requiredAmount: number;
                priorityRank: number;
            }> = [];

            studentInvoices.forEach(inv => {
                const items = inv.items || [];
                items.forEach(item => {
                    const desc = item.description || 'Tuition';
                    let matchedHead = priorities[0] || 'Tuition & Academic Fees';
                    let bestIndex = 999;

                    const cleanDesc = desc.toLowerCase();
                    for (let hIdx = 0; hIdx < priorities.length; hIdx++) {
                        const cleanHead = priorities[hIdx].toLowerCase();
                        if (
                            cleanDesc.includes(cleanHead.split(' ')[0]) || 
                            (cleanHead.includes('tuition') && cleanDesc.includes('fee')) ||
                            (cleanHead.includes('transport') && (cleanDesc.includes('bus') || cleanDesc.includes('route'))) ||
                            (cleanHead.includes('boarding') && (cleanDesc.includes('hostel') || cleanDesc.includes('dorm'))) ||
                            (cleanHead.includes('lunch') && (cleanDesc.includes('food') || cleanDesc.includes('meal'))) ||
                            (cleanHead.includes('exam') && (cleanDesc.includes('assessment') || cleanDesc.includes('test'))) ||
                            (cleanHead.includes('activity') && (cleanDesc.includes('sport') || cleanDesc.includes('club')))
                        ) {
                            bestIndex = hIdx;
                            matchedHead = priorities[hIdx];
                            break;
                        }
                    }

                    pendingItems.push({
                        invoiceId: inv.id,
                        description: desc,
                        voteHead: matchedHead,
                        requiredAmount: Number(item.amount || item.unitPrice || 0),
                        priorityRank: bestIndex
                    });
                });
            });

            pendingItems.sort((a, b) => a.priorityRank - b.priorityRank);

            for (const item of pendingItems) {
                if (remaining <= 0) break;
                const toAllocate = Math.min(remaining, item.requiredAmount);
                if (toAllocate > 0) {
                    allocations.push({
                        voteHead: item.voteHead,
                        amount: toAllocate,
                        invoiceId: item.invoiceId,
                        description: item.description
                    });
                    remaining -= toAllocate;
                }
            }
        }

        // Allocate excess or general credit
        if (remaining > 0) {
            const primaryHead = priorities[0] || 'Tuition & Academic Fees';
            const existingPrimary = allocations.find(a => a.voteHead === primaryHead);
            if (existingPrimary) {
                existingPrimary.amount += remaining;
            } else {
                allocations.push({
                    voteHead: primaryHead,
                    amount: remaining,
                    description: 'Prepaid / General Fee Credit'
                });
            }
            remaining = 0;
        }

        const summary = allocations
            .map(a => `${a.voteHead.split(' ')[0]}: ${a.amount.toLocaleString()}`)
            .join(' · ');

        return { allocations, summary: summary || 'Tuition' };
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

        const detectedReceipt = findCol(/^(receipt|receipt[\s_]*(no|number|#|id)?|rcpt|rcpt[\s_]*(no|#)?|rec[\s_]*(no|#)?)$/i) || '';

        setAdmissionCol(detectedAdm);
        setNameCol(detectedName);
        setAmountCol(detectedAmt);
        setReferenceCol(detectedRef);
        setDateCol(detectedDate);
        setModeCol(detectedMode);
        setReceiptCol(detectedReceipt);
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
            rcptCol: string;
        },
        priorities: string[] = voteheadPriorities,
        splitEnabled: boolean = autoSplitVoteheads
    ) => {
        const items: ReconciledFeeItem[] = rows.map((row, idx) => {
            const rawAdm = mappings.admCol ? String(row[mappings.admCol] ?? '').trim() : '';
            const rawName = mappings.nmCol ? String(row[mappings.nmCol] ?? '').trim() : '';
            const rawAmount = mappings.amtCol ? parseMoney(row[mappings.amtCol]) : 0;
            const rawRef = mappings.refCol ? String(row[mappings.refCol] ?? '').trim() : `REF-${Date.now()}-${idx + 1}`;
            const rawDate = mappings.dtCol ? parseExcelDate(row[mappings.dtCol]) : new Date().toISOString().split('T')[0];
            const rawMode = mappings.mdCol ? String(row[mappings.mdCol] ?? '').trim() : '';
            const rawReceiptNo = mappings.rcptCol ? String(row[mappings.rcptCol] ?? '').trim() : '';

            // Generate official system receipt number if not mapped from Excel
            const systemReceiptNo = `RCPT-${Math.floor(100000 + (idx + 1) * 37 + Math.random() * 9000)}`;
            const finalReceiptNumber = rawReceiptNo || systemReceiptNo;
            const receiptSource: 'excel' | 'system' = rawReceiptNo ? 'excel' : 'system';

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

            // Compute automated votehead distribution
            const { allocations, summary } = calculateVoteHeadSplit(
                matchedStudent ? matchedStudent.id : '',
                rawAmount,
                priorities,
                splitEnabled
            );

            return {
                id: `rec_row_${idx}_${Date.now()}`,
                rowIndex: idx + 1,
                rawAdm,
                rawName,
                rawAmount,
                rawRef,
                rawDate,
                rawMode,
                rawReceiptNo,
                receiptNumber: finalReceiptNumber,
                receiptSource,
                admDisplay: rawAdm || matchedAdm || '—',
                matchedStudentId: matchedStudent ? matchedStudent.id : '',
                matchedStudentName: matchedStudent ? matchedStudent.name : '',
                matchedStudentAdm: matchedAdm,
                matchConfidence,
                matchStatus: matchedStudent ? 'matched' : 'unmatched',
                paymentMethod,
                voteHeadAllocations: allocations,
                voteHeadSummary: summary,
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

        // Yield to event loop so React paints the spinner immediately
        await new Promise(r => setTimeout(r, 20));

        try {
            const buffer = await file.arrayBuffer();
            // dense: true and cellDates: true speeds up parsing and avoids sparse memory allocations
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', dense: true, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const parsedRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            if (parsedRows.length === 0) {
                alert("The selected Excel file appears to be empty.");
                setIsParsingExcel(false);
                return;
            }

            // Extract all distinct keys from first 10 rows in a single pass
            const keySet = new Set<string>();
            for (let i = 0; i < Math.min(10, parsedRows.length); i++) {
                Object.keys(parsedRows[i] || {}).forEach(k => {
                    const clean = String(k).trim();
                    if (clean && !clean.startsWith('__EMPTY')) keySet.add(clean);
                });
            }
            const headers = Array.from(keySet);
            setExcelHeaders(headers);
            setRawRows(parsedRows);

            autoDetectColumns(headers);

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
            const detectedReceipt = findCol(/^(receipt|receipt[\s_]*(no|number|#|id)?|rcpt|rcpt[\s_]*(no|#)?|rec[\s_]*(no|#)?)$/i) || '';

            reconcileRows(parsedRows, {
                admCol: detectedAdm,
                nmCol: detectedName,
                amtCol: detectedAmt,
                refCol: detectedRef,
                dtCol: detectedDate,
                mdCol: detectedMode,
                rcptCol: detectedReceipt
            }, voteheadPriorities, autoSplitVoteheads);
            setExcelPage(1);
        } catch (err: any) {
            console.error("Excel parse error:", err);
            alert("Failed to parse Excel file: " + err.message);
        } finally {
            setIsParsingExcel(false);
        }
    };

    // When user changes any column mapping dropdown
    const handleMappingChange = (
        type: 'adm' | 'name' | 'amount' | 'ref' | 'date' | 'mode' | 'receipt',
        newCol: string
    ) => {
        let newAdm = admissionCol;
        let newName = nameCol;
        let newAmt = amountCol;
        let newRef = referenceCol;
        let newDate = dateCol;
        let newMode = modeCol;
        let newRcpt = receiptCol;

        if (type === 'adm') { setAdmissionCol(newCol); newAdm = newCol; }
        if (type === 'name') { setNameCol(newCol); newName = newCol; }
        if (type === 'amount') { setAmountCol(newCol); newAmt = newCol; }
        if (type === 'ref') { setReferenceCol(newCol); newRef = newCol; }
        if (type === 'date') { setDateCol(newCol); newDate = newCol; }
        if (type === 'mode') { setModeCol(newCol); newMode = newCol; }
        if (type === 'receipt') { setReceiptCol(newCol); newRcpt = newCol; }

        if (rawRows.length > 0) {
            reconcileRows(rawRows, {
                admCol: newAdm,
                nmCol: newName,
                amtCol: newAmt,
                refCol: newRef,
                dtCol: newDate,
                mdCol: newMode,
                rcptCol: newRcpt
            }, voteheadPriorities, autoSplitVoteheads);
        }
    };

    // Toggle Auto-Split
    const handleToggleAutoSplit = () => {
        const nextState = !autoSplitVoteheads;
        setAutoSplitVoteheads(nextState);
        if (rawRows.length > 0) {
            reconcileRows(rawRows, {
                admCol: admissionCol,
                nmCol: nameCol,
                amtCol: amountCol,
                refCol: referenceCol,
                dtCol: dateCol,
                mdCol: modeCol,
                rcptCol: receiptCol
            }, voteheadPriorities, nextState);
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
                const { allocations, summary } = calculateVoteHeadSplit(
                    student ? student.id : '',
                    item.rawAmount,
                    voteheadPriorities,
                    autoSplitVoteheads
                );
                return {
                    ...item,
                    matchedStudentId: student ? student.id : '',
                    matchedStudentName: student ? student.name : '',
                    matchedStudentAdm: sAdm,
                    matchStatus: student ? 'matched' : 'unmatched',
                    matchConfidence: student ? 'manual' : 'none',
                    voteHeadAllocations: allocations,
                    voteHeadSummary: summary
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
                    item.receiptNumber.toLowerCase().includes(q) ||
                    item.matchedStudentName.toLowerCase().includes(q) ||
                    item.matchedStudentAdm.toLowerCase().includes(q) ||
                    item.voteHeadSummary.toLowerCase().includes(q)
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

    // Live preview for manual payment votehead split
    const manualSplitPreview = useMemo(() => {
        if (!manualSelectedStudent || !manualAmount || Number(manualAmount) <= 0) return null;
        return calculateVoteHeadSplit(
            manualSelectedStudent.id,
            Number(manualAmount),
            voteheadPriorities,
            autoSplitVoteheads
        );
    }, [manualSelectedStudent, manualAmount, voteheadPriorities, autoSplitVoteheads]);

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

                let existingReceipt: Receipt | undefined;
                if (overrideExisting) {
                    existingReceipt = receipts.find(r => 
                        (r.relatedTransactionId && cleanRef && String(r.relatedTransactionId).trim().toLowerCase() === cleanRef.toLowerCase()) ||
                        (item.receiptNumber && r.receiptNumber && String(r.receiptNumber).trim().toLowerCase() === item.receiptNumber.trim().toLowerCase())
                    );
                }

                const receiptId = existingReceipt ? existingReceipt.id : `rec_imp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
                const receiptNumber = item.receiptNumber || item.rawReceiptNo || existingReceipt?.receiptNumber || `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;

                const paidForDescription = item.voteHeadSummary ? `Fees [${item.voteHeadSummary}]` : 'School Fees — Excel Bulk Import';

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
                    paidFor: paidForDescription,
                    paid_for: paidForDescription,
                    voteHeadAllocations: item.voteHeadAllocations,
                    receiptSource: item.receiptSource,
                    notes: `Imported via Excel: ${item.rawName || ''} [${item.rawAdm || ''}] · ${item.voteHeadSummary} · ${item.receiptSource === 'excel' ? 'Receipt: ' + receiptNumber : 'Auto Receipt'}`,
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
                await new Promise(r => setTimeout(r, 8));
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
                await onLogAction(`Imported ${postedCount} payments totaling KES ${totalVal.toLocaleString()} with Automated Votehead Distribution.`);
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
        const receiptNumber = manualReceiptNo.trim() || `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;

        const { allocations, summary } = calculateVoteHeadSplit(
            manualSelectedStudent.id,
            Number(manualAmount),
            voteheadPriorities,
            autoSplitVoteheads
        );

        const paidForText = autoSplitVoteheads ? `Fees [${summary}]` : manualPaidFor;

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
            paidFor: paidForText,
            paid_for: paidForText,
            voteHeadAllocations: allocations,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('receipts', receiptRecord);
            if (onReceiptCreated) onReceiptCreated(receiptRecord);
            if (onLogAction) await onLogAction(`Manually received KES ${Number(manualAmount).toLocaleString()} for ${manualSelectedStudent.name} (${sAdm}) with Receipt ${receiptNumber}`);
            if (onRefreshData) await onRefreshData();

            setManualSuccessMsg(`Receipt ${receiptNumber} created successfully for ${manualSelectedStudent.name}!`);
            setManualSelectedStudent(null);
            setManualStudentSearch('');
            setManualAmount('');
            setManualRef('');
            setManualReceiptNo('');
        } catch (err: any) {
            alert("Failed to post receipt: " + err.message);
        } finally {
            setIsPostingManual(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[94vh] overflow-hidden text-left my-auto">
                
                {/* ── Modal Top Header ── */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                            <BanknotesIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                Receive fees money
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400">
                                Smart payment allocation with Excel field matching &amp; votehead auto-split
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Votehead Config Trigger */}
                        <button
                            type="button"
                            onClick={() => setShowVoteheadConfig(true)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Configure Votehead Priority Hierarchy"
                        >
                            <Cog8ToothIcon className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Votehead Rules</span>
                        </button>

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
                <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-6">
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

                    {/* Auto-Split Mode Pill */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleToggleAutoSplit}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                                autoSplitVoteheads
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 shadow-2xs'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                        >
                            <SparklesIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>{autoSplitVoteheads ? '⚡ Auto-Split Voteheads: Active' : 'Single Unified Head'}</span>
                        </button>
                    </div>
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
                                                Upload bank/M-Pesa statements. You can match the columns to assign payments, map receipt numbers or use system-generated receipts, and auto-split voteheads.
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
                                    We will now need you to tell us which columns in your Excel file contain the admission number, amount paid, payment reference, receipt number, and date of payment by clicking on <span className="font-black text-slate-800 dark:text-white">⌵</span> and choosing the column name.
                                </div>

                                {/* ── Field Mapping Selectors (Row of 6 dropdowns) ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
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

                                    {/* Receipt Number mapping (From Excel or System Generated) */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Receipt number
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={receiptCol}
                                                onChange={(e) => handleMappingChange('receipt', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">✨ System Generated (Auto)</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h} (From Excel)</option>
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
                                                placeholder="Filter rows by name, ADM, ref, receipt, votehead..."
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

                                {/* ── Interactive Data Grid Table with Votehead Breakdown & Receipt No ── */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                                    <div className="max-h-[380px] overflow-y-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                                                    <th className="px-3 py-2.5 w-10 text-center text-slate-400">#</th>
                                                    <th className="px-4 py-2.5 text-left">Admission</th>
                                                    <th className="px-4 py-2.5 text-left">Name</th>
                                                    <th className="px-4 py-2.5 text-right">Amount</th>
                                                    <th className="px-4 py-2.5 text-left">Receipt No</th>
                                                    <th className="px-4 py-2.5 text-left">Reference</th>
                                                    <th className="px-4 py-2.5 text-left">Date Paid</th>
                                                    <th className="px-4 py-2.5 text-left">Assigned Student &amp; Voteheads</th>
                                                    <th className="px-3 py-2.5 text-center w-24">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                                                            No rows match your filters or mappings.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
                                                        const safePage = Math.min(Math.max(1, excelPage), totalPages);
                                                        const paginated = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

                                                        return paginated.map((item) => (
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
                                                                <td className="px-4 py-2.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                                                            {item.receiptNumber}
                                                                        </span>
                                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                                                            item.receiptSource === 'excel'
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                                                        }`}>
                                                                            {item.receiptSource === 'excel' ? 'Excel' : 'Auto'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                                                    {item.rawRef}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                                                                    {item.rawDate}
                                                                </td>
                                                                <td className="px-4 py-2.5 min-w-[240px]">
                                                                    {item.matchedStudentName ? (
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center justify-between gap-1.5">
                                                                                <span className="font-bold text-slate-900 dark:text-white block">
                                                                                    {item.matchedStudentName}
                                                                                </span>
                                                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                                                                    {item.matchedStudentAdm || 'ADM OK'}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {/* Votehead Distribution Pill */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setInspectingItem(item)}
                                                                                className="w-full text-left p-1 px-2 rounded-lg bg-purple-50/70 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 text-[10px] font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-between transition-colors cursor-pointer"
                                                                                title="Click to view detailed votehead allocation breakdown"
                                                                            >
                                                                                <span className="truncate max-w-[190px]">
                                                                                    ⚡ {item.voteHeadSummary}
                                                                                </span>
                                                                                <span className="text-[9px] font-black text-purple-500 uppercase tracking-tighter">View</span>
                                                                            </button>
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
                                                        ));
                                                    })()
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Footer */}
                                    {filteredItems.length > PAGE_SIZE && (
                                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
                                            <span>
                                                Showing {((excelPage - 1) * PAGE_SIZE) + 1} - {Math.min(excelPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} entries
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={excelPage <= 1}
                                                    onClick={() => setExcelPage(p => Math.max(1, p - 1))}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                                                >
                                                    Previous
                                                </button>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    Page {excelPage} of {Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={excelPage >= Math.ceil(filteredItems.length / PAGE_SIZE)}
                                                    onClick={() => setExcelPage(p => p + 1)}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar during bulk posting */}
                                {isProcessingBulk && bulkProgress.total > 0 && (
                                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-2">
                                        <div className="flex justify-between items-center text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                            <span>Posting Receipts &amp; Splitting Voteheads...</span>
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

                            {/* Live Votehead Breakdown Preview */}
                            {manualSplitPreview && (
                                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-2">
                                    <div className="flex justify-between items-center text-[11px] font-black text-purple-900 dark:text-purple-200">
                                        <span className="flex items-center gap-1.5">
                                            <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Automated Votehead Distribution</span>
                                        </span>
                                        <span>KES {Number(manualAmount).toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {manualSplitPreview.allocations.map((alloc, aIdx) => (
                                            <div key={aIdx} className="flex justify-between text-xs font-medium text-purple-800 dark:text-purple-300">
                                                <span>↳ {alloc.voteHead}</span>
                                                <span className="font-mono font-bold">KES {alloc.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                            {/* Receipt Number (Optional custom or Auto) */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                    Receipt Number (Optional — leave blank for system auto)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. RCPT-2026-0042 (Leave empty for auto-generated)"
                                    value={manualReceiptNo}
                                    onChange={(e) => setManualReceiptNo(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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

            {/* ── MODAL: VOTEHEAD PRIORITY HIERARCHY CONFIGURATION ── */}
            {showVoteheadConfig && (
                <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-left space-y-5">
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-purple-600" />
                                    <span>Votehead Auto-Split Hierarchy</span>
                                </h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Lump sum fee payments will clear voteheads in this order (FIFO).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowVoteheadConfig(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Priority List with Up/Down buttons */}
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {voteheadPriorities.map((head, idx) => (
                                <div
                                    key={head}
                                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-black">
                                            {idx + 1}
                                        </span>
                                        <span>{head}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => handleMovePriority(idx, 'up')}
                                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-30 rounded text-[10px] font-black cursor-pointer"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            disabled={idx === voteheadPriorities.length - 1}
                                            onClick={() => handleMovePriority(idx, 'down')}
                                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-30 rounded text-[10px] font-black cursor-pointer"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => handleSavePriorities(DEFAULT_VOTEHEAD_PRIORITIES)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline"
                            >
                                Reset to Default
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowVoteheadConfig(false)}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Save &amp; Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: ROW VOTEHEAD ALLOCATION INSPECTOR ── */}
            {inspectingItem && (
                <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-left space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                    Votehead Breakdown
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    {inspectingItem.matchedStudentName} ({inspectingItem.matchedStudentAdm})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectingItem(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                                <span>Votehead / Line Item</span>
                                <span>Allocated (KES)</span>
                            </div>
                            {inspectingItem.voteHeadAllocations.map((alloc, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1.5">
                                    <div>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{alloc.voteHead}</span>
                                        {alloc.description && <span className="text-[10px] text-slate-400 font-medium">{alloc.description}</span>}
                                    </div>
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                        KES {alloc.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center text-xs font-black pt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                <span>Total Payment Amount</span>
                                <span className="text-emerald-600 font-mono">KES {inspectingItem.rawAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setInspectingItem(null)}
                                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
