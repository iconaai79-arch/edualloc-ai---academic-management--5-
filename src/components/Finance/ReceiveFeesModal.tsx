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
    BanknotesIcon,
    BuildingLibraryIcon,
    DevicePhoneMobileIcon,
    EnvelopeIcon
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
    paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Bursary' | 'Direct Deposit';
    voteHeadAllocations: VoteHeadAllocationItem[];
    voteHeadSummary: string;
    rawRowData: Record<string, any>;
}

export interface BankAccountOption {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    type: 'BANK' | 'MPESA' | 'CASH';
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

const DEFAULT_BANK_ACCOUNTS: BankAccountOption[] = [
    { id: 'acc_equity_main', bankName: 'Equity Bank', accountName: 'Main Fee Collection Account', accountNumber: '0123456789012', type: 'BANK' },
    { id: 'acc_kcb_tuition', bankName: 'KCB Bank', accountName: 'Tuition & Operations Account', accountNumber: '1102938475', type: 'BANK' },
    { id: 'acc_coop_coll', bankName: 'Co-operative Bank', accountName: 'School Collection Account', accountNumber: '01129384756000', type: 'BANK' },
    { id: 'acc_mpesa_paybill', bankName: 'Safaricom M-Pesa', accountName: 'Paybill Collection', accountNumber: '522123', type: 'MPESA' },
    { id: 'acc_cash_office', bankName: 'School Accounts', accountName: 'Main Cash Office / Counter', accountNumber: 'CASH-01', type: 'CASH' }
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

    // Bank Accounts State
    const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>(DEFAULT_BANK_ACCOUNTS);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('acc_equity_main');

    // Payment Mode & Notification Options
    const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Bursary' | 'Direct Deposit'>('Bank Transfer');
    const [sendSmsNotification, setSendSmsNotification] = useState<boolean>(true);
    const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(false);

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
    const [manualMethod, setManualMethod] = useState<'Cash' | 'M-Pesa' | 'Bank Transfer' | 'Cheque' | 'Bursary' | 'Direct Deposit'>('Cash');
    const [manualRef, setManualRef] = useState('');
    const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualReceiptNo, setManualReceiptNo] = useState('');
    const [manualPaidFor, setManualPaidFor] = useState('Tuition & School Fees');
    const [manualSendSms, setManualSendSms] = useState(true);
    const [isPostingManual, setIsPostingManual] = useState(false);
    const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

    // Load institution Bank Accounts on modal open
    useEffect(() => {
        if (!isOpen) return;
        const loadAccounts = async () => {
            try {
                const instId = institution?.id;
                const customAccounts: BankAccountOption[] = [];
                
                if (institution?.coopConfig?.accountNumber) {
                    customAccounts.push({
                        id: 'coop_inst_acc',
                        bankName: 'Co-operative Bank',
                        accountName: institution.coopConfig.accountName || 'Co-op Collection Account',
                        accountNumber: institution.coopConfig.accountNumber,
                        type: 'BANK'
                    });
                }
                if (institution?.kcbConfig?.accountNumber) {
                    customAccounts.push({
                        id: 'kcb_inst_acc',
                        bankName: 'KCB Bank',
                        accountName: institution.kcbConfig.accountName || 'KCB Collection Account',
                        accountNumber: institution.kcbConfig.accountNumber,
                        type: 'BANK'
                    });
                }
                if (institution?.mpesaConfig?.shortCode || institution?.mpesaConfig?.paybillNumber) {
                    const paybillNum = institution.mpesaConfig.shortCode || institution.mpesaConfig.paybillNumber;
                    customAccounts.push({
                        id: 'mpesa_inst_paybill',
                        bankName: 'Safaricom M-Pesa',
                        accountName: `M-Pesa Paybill (${paybillNum})`,
                        accountNumber: String(paybillNum),
                        type: 'MPESA'
                    });
                }
                
                try {
                    const dbAccounts = await apiService.fetchModuleRecords('bank_accounts', instId);
                    if (Array.isArray(dbAccounts) && dbAccounts.length > 0) {
                        dbAccounts.forEach((acc: any) => {
                            if (acc && (acc.accountNumber || acc.account_number)) {
                                customAccounts.push({
                                    id: acc.id || `acc_${Date.now()}`,
                                    bankName: acc.bankName || acc.bank_name || 'Bank',
                                    accountName: acc.accountName || acc.account_name || 'Operating Account',
                                    accountNumber: acc.accountNumber || acc.account_number || '',
                                    type: (acc.type || 'BANK').toUpperCase() as any
                                });
                            }
                        });
                    }
                } catch {}

                const merged = customAccounts.length > 0 
                    ? [...customAccounts, ...DEFAULT_BANK_ACCOUNTS.filter(d => !customAccounts.some(c => c.accountNumber === d.accountNumber))]
                    : DEFAULT_BANK_ACCOUNTS;

                setBankAccounts(merged);
                if (merged.length > 0) {
                    setSelectedBankAccountId(merged[0].id);
                }
            } catch (e) {
                setBankAccounts(DEFAULT_BANK_ACCOUNTS);
                setSelectedBankAccountId(DEFAULT_BANK_ACCOUNTS[0].id);
            }
        };
        loadAccounts();
    }, [isOpen, institution]);

    // Save priorities to localStorage
    const handleSavePriorities = (newPriorities: string[]) => {
        setVoteheadPriorities(newPriorities);
        try {
            localStorage.setItem(`eduai_votehead_priorities_${institution?.id}`, JSON.stringify(newPriorities));
        } catch {}
        if (rawRows.length > 0) {
            reconcileRows(rawRows, {
                admCol: admissionCol,
                nmCol: nameCol,
                amtCol: amountCol,
                refCol: referenceCol,
                dtCol: dateCol,
                mdCol: modeCol,
                rcptCol: receiptCol
            }, newPriorities, autoSplitVoteheads, defaultPaymentMethod);
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

    // All available students in the institution
    const allStudentsList = useMemo(() => {
        return (students || []).filter(u => u.role === 'student' || !u.role);
    }, [students]);

    // Pre-indexed Invoices map by student ID for O(1) votehead allocation lookups
    const studentInvoicesMap = useMemo(() => {
        const map = new Map<string, Invoice[]>();
        (invoices || []).forEach(inv => {
            const sId = inv.studentId || (inv as any).student_id;
            if (sId) {
                if (!map.has(sId)) map.set(sId, []);
                map.get(sId)!.push(inv);
            }
        });
        return map;
    }, [invoices]);

    // Build ultra-fast normalized matching maps
    const { admMap, nameMap } = useMemo(() => {
        const aMap = new Map<string, User>();
        const nMap = new Map<string, User>();
        const studentPool = allStudentsList;

        const cleanAdmCandidates = (val: any): string[] => {
            if (!val) return [];
            const strClean = String(val).trim().toLowerCase();
            if (!strClean) return [];

            const isReceiptLike = /^(rcpt|rec|ref|inv|chq|ft|tx|mpesa)[\-_0-9]/i.test(strClean);
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
                    nMap.set(`${parts[0]} ${parts[parts.length - 1]}`, student);
                    nMap.set(`${parts[parts.length - 1]} ${parts[0]}`, student);
                }
            }
        });

        return { admMap: aMap, nameMap: nMap };
    }, [allStudentsList, enrollments]);

    // Helper: Parse money cleanly
    const parseMoney = (val: any): number => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const clean = String(val).replace(/[^0-9.-]+/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : Math.abs(num);
    };

    // Helper: Parse Excel Date
    const parseExcelDate = (val: any): string => {
        if (!val) return new Date().toISOString().split('T')[0];
        if (typeof val === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const ms = excelEpoch.getTime() + val * 86400 * 1000;
            const d = new Date(ms);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        const str = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
    };

    // Automated Votehead Allocation Split Algorithm
    const calculateVoteHeadSplit = (
        studentId: string,
        amount: number,
        priorities: string[] = voteheadPriorities,
        enabled: boolean = autoSplitVoteheads
    ): { allocations: VoteHeadAllocationItem[]; summary: string } => {
        if (!enabled || amount <= 0) {
            return {
                allocations: [{ voteHead: 'Tuition & School Fees', amount }],
                summary: `Tuition: ${amount.toLocaleString()}`
            };
        }

        const studentInvs = (studentInvoicesMap.get(studentId) || []).filter(inv => inv.status !== 'PAID' && inv.status !== 'cancelled');
        let remaining = amount;
        const allocations: VoteHeadAllocationItem[] = [];

        if (studentInvs.length > 0) {
            const pendingItems: Array<{
                invoiceId: string;
                description: string;
                voteHead: string;
                requiredAmount: number;
                priorityRank: number;
            }> = [];

            studentInvs.forEach(inv => {
                (inv.items || []).forEach(item => {
                    const desc = item.description || item.name || 'Tuition & School Fees';
                    let bestIndex = 999;
                    let matchedHead = priorities[0] || 'Tuition & Academic Fees';

                    for (let hIdx = 0; hIdx < priorities.length; hIdx++) {
                        const cleanHead = priorities[hIdx].toLowerCase();
                        const cleanDesc = desc.toLowerCase();
                        if (
                            cleanDesc.includes(cleanHead.split(' ')[0].replace(/[^a-z]/g, '')) ||
                            (cleanHead.includes('tuition') && (cleanDesc.includes('fee') || cleanDesc.includes('academic') || cleanDesc.includes('course'))) ||
                            (cleanHead.includes('transport') && (cleanDesc.includes('bus') || cleanDesc.includes('van') || cleanDesc.includes('ride'))) ||
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

        const detectedMode = findCol(/^(payment[\s_]*mode|pay[\s_]*mode|mode|payment[\s_]*type|channel|method)$/i) || '';

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
        splitEnabled: boolean = autoSplitVoteheads,
        fallbackMode: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Bursary' | 'Direct Deposit' = defaultPaymentMethod
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
            let paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Bursary' | 'Direct Deposit' = fallbackMode || 'Bank Transfer';
            if (rawMode) {
                if (/bank|transfer|eft|rtgs|pesalink/i.test(rawMode)) paymentMethod = 'Bank Transfer';
                else if (/cash/i.test(rawMode)) paymentMethod = 'Cash';
                else if (/cheque|chq/i.test(rawMode)) paymentMethod = 'Cheque';
                else if (/mpesa|m-pesa|paybill|till/i.test(rawMode)) paymentMethod = 'M-Pesa';
                else if (/bursary|cdf/i.test(rawMode)) paymentMethod = 'Bursary';
                else if (/direct/i.test(rawMode)) paymentMethod = 'Direct Deposit';
            } else {
                const combined = `${rawRef} ${rawName}`.toLowerCase();
                if (/bank|cheque|chq|ft|transfer/i.test(combined)) paymentMethod = 'Bank Transfer';
                else if (/cash/i.test(combined)) paymentMethod = 'Cash';
                else if (/mpesa/i.test(combined)) paymentMethod = 'M-Pesa';
                else paymentMethod = fallbackMode || 'Bank Transfer';
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

    // Handle File Drop / Selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelFile(file);
        setIsParsingExcel(true);
        setSuccessSummary(null);

        // Yield to allow UI spinner to render immediately
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, {
                type: 'array',
                cellDates: true,
                dense: true
            });

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
            const detectedMode = findCol(/^(payment[\s_]*mode|pay[\s_]*mode|mode|payment[\s_]*type|channel|method)$/i) || '';
            const detectedReceipt = findCol(/^(receipt|receipt[\s_]*(no|number|#|id)?|rcpt|rcpt[\s_]*(no|#)?|rec[\s_]*(no|#)?)$/i) || '';

            reconcileRows(parsedRows, {
                admCol: detectedAdm,
                nmCol: detectedName,
                amtCol: detectedAmt,
                refCol: detectedRef,
                dtCol: detectedDate,
                mdCol: detectedMode,
                rcptCol: detectedReceipt
            }, voteheadPriorities, autoSplitVoteheads, defaultPaymentMethod);
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
            }, voteheadPriorities, autoSplitVoteheads, defaultPaymentMethod);
        }
    };

    // When default payment method changes
    const handleDefaultPaymentMethodChange = (mode: 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Bursary' | 'Direct Deposit') => {
        setDefaultPaymentMethod(mode);
        if (rawRows.length > 0) {
            reconcileRows(rawRows, {
                admCol: admissionCol,
                nmCol: nameCol,
                amtCol: amountCol,
                refCol: referenceCol,
                dtCol: dateCol,
                mdCol: modeCol,
                rcptCol: receiptCol
            }, voteheadPriorities, autoSplitVoteheads, mode);
        }
    };

    // Manual student reassignment for unmatched rows
    const handleManualAssign = (itemId: string, studentId: string) => {
        const student = allStudentsList.find(s => s.id === studentId);
        if (!student) return;

        setReconciledItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const sAdm = resolveRealStudentAdmNo(student);
            const { allocations, summary } = calculateVoteHeadSplit(
                student.id,
                item.rawAmount,
                voteheadPriorities,
                autoSplitVoteheads
            );
            return {
                ...item,
                matchedStudentId: student.id,
                matchedStudentName: student.name,
                matchedStudentAdm: sAdm,
                matchConfidence: 'manual',
                matchStatus: 'matched',
                voteHeadAllocations: allocations,
                voteHeadSummary: summary
            };
        }));
    };

    // Update individual row payment method
    const handleRowMethodChange = (itemId: string, method: any) => {
        setReconciledItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, paymentMethod: method };
        }));
    };

    // Filter & search reconciled items
    const filteredItems = useMemo(() => {
        return reconciledItems.filter(item => {
            if (filterStatus === 'matched' && item.matchStatus !== 'matched') return false;
            if (filterStatus === 'unmatched' && item.matchStatus !== 'unmatched') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (item.rawName || '').toLowerCase().includes(q) || (item.matchedStudentName || '').toLowerCase().includes(q);
                const matchAdm = (item.rawAdm || '').toLowerCase().includes(q) || (item.matchedStudentAdm || '').toLowerCase().includes(q);
                const matchRef = (item.rawRef || '').toLowerCase().includes(q);
                const matchRcpt = (item.receiptNumber || '').toLowerCase().includes(q);
                const matchHead = (item.voteHeadSummary || '').toLowerCase().includes(q);
                return matchName || matchAdm || matchRef || matchRcpt || matchHead;
            }
            return true;
        });
    }, [reconciledItems, filterStatus, searchQuery]);

    // Statistics overview
    const stats = useMemo(() => {
        const totalRows = reconciledItems.length;
        const matchedCount = reconciledItems.filter(i => i.matchStatus === 'matched').length;
        const unmatchedCount = totalRows - matchedCount;
        const totalAmount = reconciledItems
            .filter(i => i.matchStatus === 'matched')
            .reduce((sum, i) => sum + i.rawAmount, 0);
        return { totalRows, matchedCount, unmatchedCount, totalAmount };
    }, [reconciledItems]);

    // Live preview for manual tab votehead split
    const manualSplitPreview = useMemo(() => {
        if (!manualSelectedStudent || !manualAmount || Number(manualAmount) <= 0) return null;
        return calculateVoteHeadSplit(
            manualSelectedStudent.id,
            Number(manualAmount),
            voteheadPriorities,
            autoSplitVoteheads
        );
    }, [manualSelectedStudent, manualAmount, voteheadPriorities, autoSplitVoteheads]);

    // Ultra-Fast Parallel Bulk Posting with SMS Dispatch
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
        const BATCH_SIZE = 25; // Concurrent batch processing for 25x faster throughput

        try {
            for (let i = 0; i < readyItems.length; i += BATCH_SIZE) {
                const chunk = readyItems.slice(i, i + BATCH_SIZE);
                
                await Promise.all(chunk.map(async (item, chunkIdx) => {
                    const actualIdx = i + chunkIdx;
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

                    const receiptId = existingReceipt ? existingReceipt.id : `rec_imp_${Date.now()}_${actualIdx}_${Math.random().toString(36).substr(2, 4)}`;
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
                        amountPaid: Number(item.rawAmount),
                        amount_paid: Number(item.rawAmount),
                        paymentMethod: item.paymentMethod || defaultPaymentMethod,
                        payment_method: item.paymentMethod || defaultPaymentMethod,
                        bankAccountId: selectedBankAccountId || undefined,
                        bank_account_id: selectedBankAccountId || undefined,
                        relatedTransactionId: cleanRef,
                        related_transaction_id: cleanRef,
                        paymentDate: item.rawDate,
                        payment_date: item.rawDate,
                        paidFor: paidForDescription,
                        paid_for: paidForDescription
                    };

                    await apiService.saveModuleRecord('receipts', receiptRecord);
                    createdReceiptIds.push(receiptId);
                    postedCount++;
                    totalVal += Number(item.rawAmount);

                    if (onReceiptCreated) onReceiptCreated(receiptRecord);

                    // Asynchronous SMS dispatch to Parent if enabled
                    if (sendSmsNotification && student) {
                        const parentPhone = student.parentPhone || student.phoneNumber || student.parentPhone2 || (student as any)?.guardianPhone;
                        if (parentPhone) {
                            const cleanPhone = String(parentPhone).trim();
                            const shortName = (student.name || 'Student').split(' ')[0];
                            const smsMsg = `Dear Parent/Guardian, received KES ${Number(item.rawAmount).toLocaleString()} for ${shortName} (${sAdm}). Receipt: ${receiptNumber}. Date: ${item.rawDate}. Thank you, ${institution?.name || 'School'}.`;
                            apiService.sendSms(cleanPhone, smsMsg, institution?.smsConfig, 1, instId).catch(err => {
                                console.warn('[ReceiveFeesModal] SMS notification error:', err);
                            });
                        }
                    }
                }));

                setBulkProgress({ current: Math.min(i + BATCH_SIZE, readyItems.length), total: readyItems.length });
            }

            // Save batch audit history
            const batchId = `rb_excel_${Date.now()}`;
            const selectedAccount = bankAccounts.find(b => b.id === selectedBankAccountId);
            const batchRecord = {
                id: batchId,
                description: `Excel Import: ${excelFile?.name || 'Statement'} (${postedCount} receipts) -> ${selectedAccount?.accountName || 'Bank'}`,
                totalValue: totalVal,
                noOfRecords: postedCount,
                bankAccountId: selectedBankAccountId,
                depositAccount: selectedAccount ? `${selectedAccount.bankName} - ${selectedAccount.accountName}` : 'Default Bank',
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
                await onLogAction(`Imported ${postedCount} payments totaling KES ${totalVal.toLocaleString()} into ${selectedAccount?.accountName || 'Bank'} with Automated Votehead Distribution.`);
            }

            if (onRefreshData) {
                await onRefreshData();
            }

            setSuccessSummary(`Successfully posted ${postedCount} receipts totaling KES ${totalVal.toLocaleString()} into ${selectedAccount?.accountName || 'Bank'}!${sendSmsNotification ? ' SMS notifications dispatched to parents.' : ''}`);
        } catch (err: any) {
            console.error("Bulk post error:", err);
            alert("Error during bulk posting: " + err.message);
        } finally {
            setIsProcessingBulk(false);
        }
    };

    // Key-in Single Receipt Manually
    const handlePostManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualSelectedStudent) {
            alert("Please select a student.");
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
            amountPaid: Number(manualAmount),
            amount_paid: Number(manualAmount),
            paymentMethod: manualMethod,
            payment_method: manualMethod,
            bankAccountId: selectedBankAccountId || undefined,
            bank_account_id: selectedBankAccountId || undefined,
            relatedTransactionId: manualRef || `MAN-${Date.now()}`,
            related_transaction_id: manualRef || `MAN-${Date.now()}`,
            paymentDate: manualDate,
            payment_date: manualDate,
            paidFor: paidForText,
            paid_for: paidForText
        };

        try {
            await apiService.saveModuleRecord('receipts', receiptRecord);
            if (onReceiptCreated) onReceiptCreated(receiptRecord);
            if (onLogAction) await onLogAction(`Manually received KES ${Number(manualAmount).toLocaleString()} for ${manualSelectedStudent.name} (${sAdm}) with Receipt ${receiptNumber}`);
            
            // Dispatch SMS if checked
            if (manualSendSms) {
                const parentPhone = manualSelectedStudent.parentPhone || manualSelectedStudent.phoneNumber || manualSelectedStudent.parentPhone2;
                if (parentPhone) {
                    const cleanPhone = String(parentPhone).trim();
                    const shortName = manualSelectedStudent.name.split(' ')[0];
                    const smsMsg = `Dear Parent/Guardian, received KES ${Number(manualAmount).toLocaleString()} for ${shortName} (${sAdm}). Receipt: ${receiptNumber}. Date: ${manualDate}. Thank you, ${institution?.name || 'School'}.`;
                    apiService.sendSms(cleanPhone, smsMsg, institution?.smsConfig, 1, instId).catch(err => {
                        console.warn('[ReceiveFeesModal] Manual SMS notice:', err);
                    });
                }
            }

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
                        <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shadow-xs">
                            <BanknotesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                    Receive Fees &amp; Payments
                                </h3>
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    Turbo 25x Speed
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">
                                Excel Statement Ingestion · Bank Account Selection · Automated Votehead Distribution · Instant Parent SMS
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Votehead Config Button */}
                        <button
                            type="button"
                            onClick={() => setShowVoteheadConfig(true)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Configure FIFO Votehead Split Priority"
                        >
                            <Cog8ToothIcon className="w-3.5 h-3.5" />
                            <span>Votehead Rules</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Mode Tabs ── */}
                <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('excel')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                            activeTab === 'excel'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        <span>Interactive Excel Mapping</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                            activeTab === 'manual'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Key-in Manually</span>
                    </button>
                </div>

                {/* ── TAB 1: INTERACTIVE EXCEL MAPPING ── */}
                {activeTab === 'excel' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {!excelFile ? (
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-950/30 space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shadow-inner">
                                    <ArrowUpTrayIcon className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                                        Upload Excel or CSV Bank / M-Pesa Statement
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                                        Select your statement (.xlsx, .xls, .csv). Column headers are automatically detected, matched to students, split across fee voteheads, and posted at turbo speed.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all">
                                        <ArrowUpTrayIcon className="w-4 h-4" />
                                        <span>Choose Statement File</span>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : isParsingExcel ? (
                            <div className="py-20 text-center space-y-3">
                                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Reading &amp; reconciling spreadsheet data...
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* ── Field Mapping Selectors (Row of 7 dropdowns) ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
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
                                            Student name (opt)
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
                                            Reference / Tx Code
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

                                    {/* Payment Mode mapping */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Payment mode col
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={modeCol}
                                                onChange={(e) => handleMappingChange('mode', e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 pr-8 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- Default ({defaultPaymentMethod}) --</option>
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
                                                <option value="">✨ System Auto</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h} (Excel)</option>
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

                                {/* ── Pre-Posting Options Bar: Deposit Account, Default Mode, SMS & Voteheads ── */}
                                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                    {/* 1. Deposit Bank / Cash Account */}
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            <BuildingLibraryIcon className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Deposit Bank / Account *</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedBankAccountId}
                                                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white pr-8 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                                            >
                                                {bankAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.type === 'MPESA' ? '📱' : acc.type === 'CASH' ? '💵' : '🏛️'} {acc.bankName} - {acc.accountName} ({acc.accountNumber})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* 2. Default Payment Mode Fallback */}
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            <BanknotesIcon className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>Default Payment Mode</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={defaultPaymentMethod}
                                                onChange={(e) => handleDefaultPaymentMethodChange(e.target.value as any)}
                                                className="w-full appearance-none px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white pr-8 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                                            >
                                                <option value="Bank Transfer">🏛️ Bank Transfer</option>
                                                <option value="M-Pesa">📱 M-Pesa</option>
                                                <option value="Cash">💵 Cash</option>
                                                <option value="Cheque">📊 Cheque</option>
                                                <option value="Bursary">🎓 Bursary / CDF</option>
                                                <option value="Direct Deposit">💳 Direct Deposit</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* 3. Notification Toggles */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Notifications</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={sendSmsNotification}
                                                    onChange={(e) => setSendSmsNotification(e.target.checked)}
                                                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                                />
                                                <span>📱 Parent SMS</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={sendEmailNotification}
                                                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                                                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                                />
                                                <span>📧 Email</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 4. Automated Votehead Split Toggle */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-[11px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                                            <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Fee Allocation</span>
                                        </label>
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={autoSplitVoteheads}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setAutoSplitVoteheads(newVal);
                                                        if (rawRows.length > 0) {
                                                            reconcileRows(rawRows, {
                                                                admCol: admissionCol,
                                                                nmCol: nameCol,
                                                                amtCol: amountCol,
                                                                refCol: referenceCol,
                                                                dtCol: dateCol,
                                                                mdCol: modeCol,
                                                                rcptCol: receiptCol
                                                            }, voteheadPriorities, newVal, defaultPaymentMethod);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                                                />
                                                <span>⚡ Auto-Split Voteheads</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowVoteheadConfig(true)}
                                                className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                            >
                                                Rules ({voteheadPriorities.length})
                                            </button>
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
                                                placeholder="Filter rows by name, ADM, ref, receipt..."
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

                                {/* ── Interactive Data Grid Table with Payment Mode & Votehead Breakdown ── */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                                    <div className="max-h-[380px] overflow-y-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                                                    <th className="px-3 py-2.5 w-10 text-center text-slate-400">#</th>
                                                    <th className="px-4 py-2.5 text-left">Admission</th>
                                                    <th className="px-4 py-2.5 text-left">Name</th>
                                                    <th className="px-4 py-2.5 text-right">Amount</th>
                                                    <th className="px-4 py-2.5 text-left">Payment Mode</th>
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
                                                        <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
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
                                                                <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                                    {item.rawAdm || <span className="text-slate-400 italic">—</span>}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                                                                    {item.rawName || <span className="text-slate-400 italic">—</span>}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                                                    KES {item.rawAmount.toLocaleString()}
                                                                </td>
                                                                {/* Payment Mode Selector Per-Row */}
                                                                <td className="px-4 py-2.5">
                                                                    <select
                                                                        value={item.paymentMethod}
                                                                        onChange={(e) => handleRowMethodChange(item.id, e.target.value)}
                                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                                                                    >
                                                                        <option value="Bank Transfer">🏛️ Bank Transfer</option>
                                                                        <option value="M-Pesa">📱 M-Pesa</option>
                                                                        <option value="Cash">💵 Cash</option>
                                                                        <option value="Cheque">📊 Cheque</option>
                                                                        <option value="Bursary">🎓 Bursary</option>
                                                                        <option value="Direct Deposit">💳 Direct Deposit</option>
                                                                    </select>
                                                                </td>
                                                                {/* Receipt Number Column with Source Badge */}
                                                                <td className="px-4 py-2.5 font-mono text-[11px] font-bold">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-slate-800 dark:text-slate-200">
                                                                            {item.receiptNumber}
                                                                        </span>
                                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                                                            item.receiptSource === 'excel'
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                                                                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                                                                        }`}>
                                                                            {item.receiptSource === 'excel' ? 'Excel' : 'Auto'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                                    {item.rawRef}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                                                                    {item.rawDate}
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    {item.matchStatus === 'matched' ? (
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                                                    {item.matchedStudentName}
                                                                                </span>
                                                                                <span className="font-mono text-slate-400 text-[10px]">
                                                                                    ({item.matchedStudentAdm})
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {/* Votehead pill breakdown */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setInspectingItem(item)}
                                                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-semibold border border-purple-200 dark:border-purple-800 transition-colors text-left"
                                                                                title="Click to view full votehead breakdown"
                                                                            >
                                                                                <SparklesIcon className="w-3 h-3 text-purple-600" />
                                                                                <span className="truncate max-w-[200px]">{item.voteHeadSummary}</span>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                                                            <span>⚠ Unmatched</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-center">
                                                                    {item.matchStatus === 'unmatched' ? (
                                                                        <select
                                                                            onChange={(e) => {
                                                                                if (e.target.value) handleManualAssign(item.id, e.target.value);
                                                                            }}
                                                                            defaultValue=""
                                                                            className="w-full text-[10px] font-bold py-1 px-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-200 cursor-pointer"
                                                                        >
                                                                            <option value="" disabled>Assign...</option>
                                                                            {allStudentsList.slice(0, 50).map(s => (
                                                                                <option key={s.id} value={s.id}>
                                                                                    {s.name} ({resolveRealStudentAdmNo(s)})
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                            Ready
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })()
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {filteredItems.length > PAGE_SIZE && (
                                        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
                                            <span>
                                                Showing {((excelPage - 1) * PAGE_SIZE) + 1} - {Math.min(excelPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} records
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setExcelPage(p => Math.max(1, p - 1))}
                                                    disabled={excelPage <= 1}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                    Page {excelPage} of {Math.ceil(filteredItems.length / PAGE_SIZE)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setExcelPage(p => Math.min(Math.ceil(filteredItems.length / PAGE_SIZE), p + 1))}
                                                    disabled={excelPage >= Math.ceil(filteredItems.length / PAGE_SIZE)}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                <span>Posting Receipts in Parallel (25x Speed)...</span>
                                            </span>
                                            <span>{bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-150"
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
                                                    <span>Posting {bulkProgress.current}/{bulkProgress.total}...</span>
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
                                        <option value="Direct Deposit">💳 Direct Deposit</option>
                                    </select>
                                </div>
                            </div>

                            {/* Deposit Account Selector */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                    Deposit Bank / Cash Account *
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedBankAccountId}
                                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white pr-8 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        {bankAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.type === 'MPESA' ? '📱' : acc.type === 'CASH' ? '💵' : '🏛️'} {acc.bankName} - {acc.accountName} ({acc.accountNumber})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

                            {/* Send SMS Notification Toggle */}
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={manualSendSms}
                                        onChange={(e) => setManualSendSms(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                    />
                                    <span>📱 Send Instant SMS Receipt Alert to Parent</span>
                                </label>
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
                                    className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-[10px] flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {head}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMovePriority(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 rounded-md font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                                            title="Move Up in Priority"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMovePriority(idx, 'down')}
                                            disabled={idx === voteheadPriorities.length - 1}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 rounded-md font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                                            title="Move Down in Priority"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => handleSavePriorities(DEFAULT_VOTEHEAD_PRIORITIES)}
                                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                            >
                                Reset Defaults
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowVoteheadConfig(false)}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Apply Hierarchy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: INDIVIDUAL ROW VOTEHEAD BREAKDOWN INSPECTOR ── */}
            {inspectingItem && (
                <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-left space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                    Votehead Breakdown
                                </h4>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">
                                    {inspectingItem.matchedStudentName} ({inspectingItem.matchedStudentAdm}) · Receipt: {inspectingItem.receiptNumber}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectingItem(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl space-y-1.5 border border-purple-200 dark:border-purple-800/40">
                                <div className="text-[11px] font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider flex justify-between">
                                    <span>Total Payment</span>
                                    <span>KES {inspectingItem.rawAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {inspectingItem.voteHeadAllocations.map((alloc, aIdx) => (
                                    <div key={aIdx} className="py-2 flex justify-between items-center text-xs">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                                {alloc.voteHead}
                                            </p>
                                            {alloc.description && (
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {alloc.description}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-mono font-black text-slate-900 dark:text-white">
                                            KES {alloc.amount.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setInspectingItem(null)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
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
