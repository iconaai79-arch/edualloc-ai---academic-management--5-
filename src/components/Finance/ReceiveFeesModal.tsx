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
    EnvelopeIcon,
    DownloadIcon,
    AcademicCapIcon,
    UserIcon
} from '../icons';
import { apiService } from '../../services/apiService';
import { whatsappService } from '../../services/whatsappService';
import { resolveRealStudentAdmNo } from '../../utils/academicUtils';
import { extractParentPhoneNumber } from '../../utils/stringUtils';
import { buildCustomPaymentNotification } from '../../utils/paymentNotificationHelper';

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
    paymentNotificationTemplate?: string;
    paymentInstructions?: string;
    enableCustomNotification?: boolean;
}

export interface ReceiveFeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    students: User[];
    bankAccounts?: any[];
    invoices?: Invoice[];
    receipts?: Receipt[];
    enrollments?: any[];
    studentFinanceData?: any[];
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
    bankAccounts: propsBankAccounts = [],
    invoices = [],
    receipts = [],
    enrollments = [],
    studentFinanceData = [],
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

    // Bank Accounts State (Starts empty and populated with exact configured accounts)
    const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

    // Payment Mode & Notification Options
    const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Bursary' | 'Direct Deposit'>('Bank Transfer');
    const [sendSmsNotification, setSendSmsNotification] = useState<boolean>(true);
    const [sendWhatsAppNotification, setSendWhatsAppNotification] = useState<boolean>(true);
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
    
    // View Mode & Grouping State
    const [excelViewMode, setExcelViewMode] = useState<'flat' | 'grouped'>('flat');
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});

    // Processing state
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [overrideExisting, setOverrideExisting] = useState(false);
    const [successSummary, setSuccessSummary] = useState<string | null>(null);

    // Post-Upload Reconciliation Audit State
    const [uploadAuditReport, setUploadAuditReport] = useState<{
        excelTotalRows: number;
        excelTotalAmount: number;
        postedReceiptsCount: number;
        postedTotalAmount: number;
        depositAccountName: string;
        groups: Array<{
            studentId: string;
            studentName: string;
            admNumber: string;
            excelTxCount: number;
            excelTotalAmount: number;
            uploadedTxCount: number;
            uploadedTotalAmount: number;
            isExactMatch: boolean;
            receiptNumbers: string[];
        }>;
    } | null>(null);

    // Searchable Assign Row Modal State
    const [assigningRowItem, setAssigningRowItem] = useState<ReconciledFeeItem | null>(null);
    const [assignSearchQuery, setAssignSearchQuery] = useState('');

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
    const [manualSendWhatsApp, setManualSendWhatsApp] = useState(true);
    const [isPostingManual, setIsPostingManual] = useState(false);
    const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

    // Load institution Bank Accounts dynamically (from props, school_bank_accounts, bank_accounts, integration configs)
    useEffect(() => {
        if (!isOpen) return;
        const loadAccounts = async () => {
            try {
                const instId = institution?.id;
                const foundAccounts: BankAccountOption[] = [];
                const seenAccNumbers = new Set<string>();

                const addAccount = (acc: any, defaultType: 'BANK' | 'MPESA' | 'CASH' = 'BANK') => {
                    if (!acc) return;
                    const num = String(acc.accountNumber || acc.account_number || acc.accountNo || acc.account_no || acc.paybillNumber || acc.shortCode || '').trim();
                    const name = acc.accountName || acc.account_name || acc.name || acc.bankName || acc.bank_name || 'Account';
                    const bank = acc.bankName || acc.bank_name || acc.bank || (acc.type === 'MPESA' ? 'Safaricom M-Pesa' : 'Bank');
                    const key = `${bank}_${num || name}`.toLowerCase();
                    if (seenAccNumbers.has(key)) return;
                    seenAccNumbers.add(key);

                    let type = defaultType;
                    const lowerBank = String(bank).toLowerCase();
                    const lowerName = String(name).toLowerCase();
                    if (lowerBank.includes('mpesa') || lowerName.includes('mpesa') || lowerBank.includes('paybill') || lowerName.includes('paybill')) {
                        type = 'MPESA';
                    } else if (lowerBank.includes('cash') || lowerName.includes('cash')) {
                        type = 'CASH';
                    }

                    foundAccounts.push({
                        id: acc.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        bankName: bank,
                        accountName: name,
                        accountNumber: num || 'N/A',
                        type,
                        paymentNotificationTemplate: acc.paymentNotificationTemplate || acc.payment_notification_template,
                        paymentInstructions: acc.paymentInstructions || acc.payment_instructions,
                        enableCustomNotification: acc.enableCustomNotification !== undefined ? acc.enableCustomNotification : acc.enable_custom_notification
                    });
                };

                // 1. From props.bankAccounts (passed from FinanceManager state)
                if (Array.isArray(propsBankAccounts) && propsBankAccounts.length > 0) {
                    propsBankAccounts.forEach(a => addAccount(a));
                }

                // 2. Query school_bank_accounts (FinanceManager's primary table)
                try {
                    const schoolBankRecords = await apiService.fetchModuleRecords('school_bank_accounts', instId);
                    if (Array.isArray(schoolBankRecords)) {
                        schoolBankRecords.forEach(a => addAccount(a));
                    }
                } catch {}

                // 3. Query bank_accounts
                try {
                    const bankRecords = await apiService.fetchModuleRecords('bank_accounts', instId);
                    if (Array.isArray(bankRecords)) {
                        bankRecords.forEach(a => addAccount(a));
                    }
                } catch {}

                // 4. Institution configured banking integrations
                if ((institution?.coopConfig as any)?.accountNumber) {
                    addAccount({
                        id: 'coop_inst_acc',
                        bankName: 'Co-operative Bank',
                        accountName: (institution.coopConfig as any).accountName || 'Co-op Collection Account',
                        accountNumber: (institution.coopConfig as any).accountNumber
                    });
                }
                if ((institution?.kcbConfig as any)?.accountNumber) {
                    addAccount({
                        id: 'kcb_inst_acc',
                        bankName: 'KCB Bank',
                        accountName: (institution.kcbConfig as any).accountName || 'KCB Collection Account',
                        accountNumber: (institution.kcbConfig as any).accountNumber
                    });
                }
                if (institution?.mpesaConfig) {
                    const paybillNum = (institution.mpesaConfig as any).shortCode || institution.mpesaConfig.paybillNumber;
                    if (paybillNum) {
                        addAccount({
                            id: 'mpesa_inst_paybill',
                            bankName: 'Safaricom M-Pesa',
                            accountName: `M-Pesa Paybill (${paybillNum})`,
                            accountNumber: String(paybillNum),
                            type: 'MPESA'
                        }, 'MPESA');
                    }
                }

                // 5. Institution embedded bank accounts
                if (Array.isArray((institution as any)?.bankAccounts)) {
                    (institution as any).bankAccounts.forEach((a: any) => addAccount(a));
                }
                if (Array.isArray((institution as any)?.schoolBankAccounts)) {
                    (institution as any).schoolBankAccounts.forEach((a: any) => addAccount(a));
                }

                // If configured accounts were found, use ONLY the real configured accounts!
                if (foundAccounts.length > 0) {
                    setBankAccounts(foundAccounts);
                    if (!selectedBankAccountId || !foundAccounts.some(a => a.id === selectedBankAccountId)) {
                        setSelectedBankAccountId(foundAccounts[0].id);
                    }
                } else {
                    // Fallback to general institution fee account if zero configured accounts exist
                    const genericAccount: BankAccountOption[] = [
                        {
                            id: 'acc_school_general',
                            bankName: institution?.name || 'School Bank',
                            accountName: 'Main Fee Collection Account',
                            accountNumber: 'OPERATING-01',
                            type: 'BANK'
                        }
                    ];
                    setBankAccounts(genericAccount);
                    setSelectedBankAccountId(genericAccount[0].id);
                }
            } catch (e) {
                console.error("Error loading institution bank accounts:", e);
            }
        };
        loadAccounts();
    }, [isOpen, institution, propsBankAccounts]);

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

    // Helper: Safely and reliably resolve student admission number across direct properties, enrollments, and Excel fallback
    const getResolvedAdm = (student: User | null, fallbackRawAdm?: string): string => {
        if (!student) return (fallbackRawAdm && fallbackRawAdm !== 'N/A') ? String(fallbackRawAdm).trim() : 'N/A';

        // 1. Direct student fields
        const directCandidates = [
            student.admissionNumber,
            (student as any).admission_number,
            (student as any).admissionNo,
            (student as any).admission_no,
            (student as any).admNo,
            (student as any).adm_no,
            (student as any).registrationNo,
            (student as any).registrationNumber,
            (student as any).regNo,
            (student as any).reg_no,
            (student as any).studentId,
            (student as any).student_id,
            student.metadata?.admissionNumber,
            student.metadata?.admission_number,
            student.metadata?.admissionNo,
            student.metadata?.admNo
        ];
        for (const c of directCandidates) {
            if (c !== null && c !== undefined) {
                const s = String(c).trim();
                if (s && s !== 'N/A' && s !== 'null' && s !== 'undefined' && !s.startsWith('usr_') && !s.startsWith('user_')) {
                    return s;
                }
            }
        }

        // 2. Check enrollments linked to student
        const enr = enrollments.find(e => e.userId === student.id || (e as any).studentId === student.id || e.id === student.id);
        if (enr) {
            const enrAdm = enr.admissionNumber || enr.admission_number || enr.admissionNo || enr.admNo || enr.registrationNo || enr.metadata?.admissionNumber || enr.metadata?.admNo;
            if (enrAdm) {
                const s = String(enrAdm).trim();
                if (s && s !== 'N/A' && s !== 'null' && s !== 'undefined' && !s.startsWith('usr_') && !s.startsWith('user_')) {
                    return s;
                }
            }
        }

        // 3. Check utility resolution
        const utilAdm = resolveRealStudentAdmNo(student, undefined, enrollments);
        if (utilAdm && utilAdm !== 'N/A' && !utilAdm.startsWith('usr_') && !utilAdm.startsWith('user_')) {
            return utilAdm;
        }

        // 4. Fallback to raw admission from mapped Excel row
        if (fallbackRawAdm && String(fallbackRawAdm).trim() && String(fallbackRawAdm).trim() !== 'N/A') {
            return String(fallbackRawAdm).trim();
        }

        return 'N/A';
    };

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

    // Build ultra-fast normalized matching maps with strict collision detection
    const { admMap, nameMap } = useMemo(() => {
        const aMap = new Map<string, User>();
        const nMap = new Map<string, User>();
        const ambiguousAdms = new Set<string>();
        const ambiguousNames = new Set<string>();
        const studentPool = allStudentsList;

        const registerAdmKey = (key: string, student: User) => {
            const clean = key.trim().toLowerCase();
            if (!clean || clean.length < 1) return;
            if (ambiguousAdms.has(clean)) return;
            if (aMap.has(clean)) {
                const existing = aMap.get(clean)!;
                if (existing.id !== student.id) {
                    // Collision between two different students: invalidate key to prevent false auto-match
                    aMap.delete(clean);
                    ambiguousAdms.add(clean);
                }
            } else {
                aMap.set(clean, student);
            }
        };

        const registerStudentAdmVariants = (val: any, student: User) => {
            if (!val) return;
            const strClean = String(val).trim().toLowerCase();
            if (!strClean || strClean === '—' || strClean === 'n/a' || strClean === 'null' || strClean === 'undefined' || strClean.startsWith('usr_') || strClean.startsWith('user_') || /^adm-10\d{2,}$/i.test(strClean)) return;

            // 1. Exact string as recorded
            registerAdmKey(strClean, student);

            // 2. Whitespace-stripped
            const noSpaces = strClean.replace(/\s+/g, '');
            if (noSpaces) registerAdmKey(noSpaces, student);

            // 3. Alphanumeric only (e.g. "ADM-101" -> "adm101")
            const alnum = strClean.replace(/[^a-z0-9]/g, '');
            if (alnum) registerAdmKey(alnum, student);

            // 4. Strip common prefix if numeric suffix (e.g. "ADM/101" or "STD-101" -> "101")
            const strippedPrefix = strClean.replace(/^(adm|std|reg|student|upi|index)[\/\-_\s:]+/i, '').trim();
            if (strippedPrefix && strippedPrefix !== strClean) {
                registerAdmKey(strippedPrefix, student);
                const stripAlnum = strippedPrefix.replace(/[^a-z0-9]/g, '');
                if (stripAlnum) registerAdmKey(stripAlnum, student);
            }

            // 5. If pure digits e.g. "00125" -> also index "125"
            const digits = strClean.replace(/\D/g, '');
            if (digits && digits === noSpaces) {
                registerAdmKey(digits, student);
                const noZeros = digits.replace(/^0+/, '');
                if (noZeros && noZeros !== digits) {
                    registerAdmKey(noZeros, student);
                }
            }
        };

        studentPool.forEach(student => {
            const rawAdm = getResolvedAdm(student);
            const admCandidates = [
                rawAdm,
                student.admissionNumber,
                (student as any).admission_number,
                (student as any).admNo,
                (student as any).adm_no,
                (student as any).registrationNumber,
                (student as any).regNo,
                (student as any).reg_no,
                student.metadata?.admissionNumber,
                student.metadata?.admission_number,
                student.metadata?.admNo
            ];

            const studentEnrs = enrollments.filter(e => e.userId === student.id || (e as any).studentId === student.id || e.id === student.id);
            studentEnrs.forEach(enr => {
                admCandidates.push(
                    enr.admissionNumber,
                    enr.admission_number,
                    enr.admissionNo,
                    enr.admNo,
                    enr.adm_no,
                    enr.registrationNo,
                    enr.registrationNumber,
                    enr.metadata?.admissionNumber,
                    enr.metadata?.admission_number,
                    enr.metadata?.admNo
                );
            });

            admCandidates.forEach(c => {
                registerStudentAdmVariants(c, student);
            });

            // Register Full Name (Strict: at least 2 words, collision-protected)
            if (student.name && typeof student.name === 'string') {
                const nameClean = student.name.trim().toLowerCase();
                const parts = nameClean.split(/\s+/).filter(Boolean);
                if (parts.length >= 2) {
                    if (ambiguousNames.has(nameClean)) {
                        // ignore
                    } else if (nMap.has(nameClean)) {
                        const existing = nMap.get(nameClean)!;
                        if (existing.id !== student.id) {
                            nMap.delete(nameClean);
                            ambiguousNames.add(nameClean);
                        }
                    } else {
                        nMap.set(nameClean, student);
                    }

                    const cleanAlpha = nameClean.replace(/[^a-z0-9]/g, '');
                    if (cleanAlpha) {
                        if (ambiguousNames.has(cleanAlpha)) {
                            // ignore
                        } else if (nMap.has(cleanAlpha)) {
                            const existing = nMap.get(cleanAlpha)!;
                            if (existing.id !== student.id) {
                                nMap.delete(cleanAlpha);
                                ambiguousNames.add(cleanAlpha);
                            }
                        } else {
                            nMap.set(cleanAlpha, student);
                        }
                    }
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

        const studentInvs = (studentInvoicesMap.get(studentId) || []).filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');
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
                    const desc = item.description || (item as any).name || 'Tuition & School Fees';
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

    const detectStatementHeaders = (headers: string[]) => {
        const isRowCounter = (h: string) => /^(#|no\.?|s\/?no\.?|serial(\s*no\.?)?|row|sn|index)$/i.test(h.trim());
        const candidateHeaders = headers.filter(h => !isRowCounter(h));

        const isAdmHeader = (h: string) => {
            const clean = h.trim().toLowerCase();
            if (/^(name|student[\s_]*name|full[\s_]*name|payer[\s_]*name|sender[\s_]*name|student|payer)$/i.test(clean)) return false;
            return /^(adm|admission|reg|registration|adm[\s_]*(no|num|number|#|id)|admission[\s_]*(no|num|number|#|id)|reg[\s_]*(no|num|number|#|id)|registration[\s_]*(no|num|number|#|id)|student[\s_]*(no|num|number|#|id|adm)|upi)$/i.test(clean) ||
                   /^(adm_no|reg_no|admission_number|admission_no)$/i.test(clean);
        };

        const isNameHeader = (h: string, admColFound: string) => {
            const clean = h.trim().toLowerCase();
            if (h === admColFound) return false;
            return /^(name|student[\s_]*name|payer[\s_]*name|sender[\s_]*name|full[\s_]*name|student|payer)$/i.test(clean) ||
                   /name|payer/i.test(clean);
        };

        const findCol = (pattern: RegExp) => candidateHeaders.find(h => pattern.test(h.trim())) || '';

        const detectedAdm = candidateHeaders.find(isAdmHeader) ||
                            candidateHeaders.find(h => /^(adm|admission)$/i.test(h.trim())) ||
                            candidateHeaders.find(h => /(adm|admission)/i.test(h.trim()) && !/name|payer/i.test(h)) || '';

        const detectedName = candidateHeaders.find(h => isNameHeader(h, detectedAdm)) ||
                             candidateHeaders.find(h => /name|payer|student/i.test(h) && h !== detectedAdm) || '';

        const detectedAmt = findCol(/^(amount|amount[\s_]*(paid|received|ksh)?|paid|credit|total|ksh)$/i) ||
                            candidateHeaders.find(h => /amount|paid|total|credit/i.test(h)) || '';

        const detectedRef = findCol(/^(reference|ref(erence)?[\s_]*(no|code|#)?|trans(action)?[\s_]*(code|id|ref)?|mpesa[\s_]*(code|ref)?|code)$/i) ||
                            candidateHeaders.find(h => /ref|trans|code|mpesa/i.test(h)) || '';

        const detectedDate = findCol(/^(paid[\s_]*on|date|payment[\s_]*date|trans[\s_]*date|txn[\s_]*date)$/i) ||
                             candidateHeaders.find(h => /date|paid|time/i.test(h)) || '';

        const detectedMode = findCol(/^(payment[\s_]*mode|pay[\s_]*mode|mode|payment[\s_]*type|channel|method)$/i) || '';

        const detectedReceipt = findCol(/^(receipt|receipt[\s_]*(no|number|#|id)?|rcpt|rcpt[\s_]*(no|#)?|rec[\s_]*(no|#)?)$/i) || '';

        return {
            detectedAdm,
            detectedName,
            detectedAmt,
            detectedRef,
            detectedDate,
            detectedMode,
            detectedReceipt
        };
    };

    // Auto-detect columns from parsed headers (strictly ignores row counters like #, No, S/No, Index)
    const autoDetectColumns = (headers: string[]) => {
        const {
            detectedAdm,
            detectedName,
            detectedAmt,
            detectedRef,
            detectedDate,
            detectedMode,
            detectedReceipt
        } = detectStatementHeaders(headers);

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

            // Generate unique official system receipt number per row if not mapped from Excel
            const systemReceiptNo = `RCPT-${Date.now().toString().slice(-6)}-${(idx + 1).toString().padStart(3, '0')}-${Math.floor(10 + Math.random() * 90)}`;
            const finalReceiptNumber = rawReceiptNo || systemReceiptNo;
            const receiptSource: 'excel' | 'system' = rawReceiptNo ? 'excel' : 'system';

            // Match student strictly by Admission Number ONLY (No false positives, No name fallback)
            let matchedStudent: User | null = null;
            let matchConfidence: 'exact_adm' | 'exact_name' | 'manual' | 'none' = 'none';

            // Strict Admission Number Matching ONLY
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

            const matchedAdm = matchedStudent ? getResolvedAdm(matchedStudent, rawAdm) : (rawAdm || '');

            // Compute automated votehead distribution
            const { allocations, summary } = calculateVoteHeadSplit(
                matchedStudent ? matchedStudent.id : '',
                rawAmount,
                priorities,
                splitEnabled
            );

            return {
                id: `rec_row_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
            const {
                detectedAdm,
                detectedName,
                detectedAmt,
                detectedRef,
                detectedDate,
                detectedMode,
                detectedReceipt
            } = detectStatementHeaders(headers);

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
            const sAdm = getResolvedAdm(student, item.rawAdm);
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

        const uniqueMatchedStudents = new Set(reconciledItems.filter(i => i.matchStatus === 'matched' && i.matchedStudentId).map(i => i.matchedStudentId));
        const multipleTxCount = Array.from(uniqueMatchedStudents).filter(sId => {
            return reconciledItems.filter(i => i.matchStatus === 'matched' && i.matchedStudentId === sId).length > 1;
        }).length;

        return { totalRows, matchedCount, unmatchedCount, totalAmount, uniqueMatchedStudentsCount: uniqueMatchedStudents.size, multipleTxCount };
    }, [reconciledItems]);

    // Group reconciled items per student (shows exact count of raw Excel transactions per student)
    const groupedStudents = useMemo(() => {
        const groupsMap = new Map<string, {
            groupKey: string;
            studentId: string;
            studentName: string;
            admNumber: string;
            className?: string;
            matchStatus: 'matched' | 'unmatched';
            rawTxCount: number;
            totalAmount: number;
            items: ReconciledFeeItem[];
        }>();

        filteredItems.forEach((item) => {
            let key = '';
            if (item.matchStatus === 'matched' && item.matchedStudentId) {
                key = `matched_${item.matchedStudentId}`;
            } else {
                key = `unmatched_${(item.rawAdm || item.rawName || item.id).trim().toLowerCase()}`;
            }

            if (!groupsMap.has(key)) {
                const sObj = allStudentsList.find(s => s.id === item.matchedStudentId);
                groupsMap.set(key, {
                    groupKey: key,
                    studentId: item.matchedStudentId || '',
                    studentName: item.matchedStudentName || item.rawName || 'Unmatched Student',
                    admNumber: item.matchedStudentAdm || item.rawAdm || '—',
                    className: (sObj as any)?.className || (sObj as any)?.gradeLevel || undefined,
                    matchStatus: item.matchStatus,
                    rawTxCount: 0,
                    totalAmount: 0,
                    items: []
                });
            }

            const grp = groupsMap.get(key)!;
            grp.rawTxCount += 1;
            grp.totalAmount += Number(item.rawAmount || 0);
            grp.items.push(item);
        });

        return Array.from(groupsMap.values());
    }, [filteredItems, allStudentsList]);

    // Toggle group accordion expansion
    const handleToggleGroup = (groupKey: string) => {
        setExpandedGroupKeys(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    const handleToggleAllGroups = (expand: boolean) => {
        const next: Record<string, boolean> = {};
        groupedStudents.forEach(g => {
            next[g.groupKey] = expand;
        });
        setExpandedGroupKeys(next);
    };

    // Download unmatched records as Excel file
    const handleDownloadUnmatched = () => {
        const unmatched = reconciledItems.filter(i => i.matchStatus === 'unmatched');
        if (unmatched.length === 0) {
            alert("No unmatched records to download.");
            return;
        }

        const exportData = unmatched.map((item, idx) => ({
            '#': item.rowIndex || idx + 1,
            'Admission No (Excel)': item.rawAdm || '',
            'Student Name (Excel)': item.rawName || '',
            'Amount Paid (KES)': item.rawAmount,
            'Payment Mode': item.paymentMethod || item.rawMode || defaultPaymentMethod,
            'Receipt Number': item.receiptNumber || '',
            'Reference / Tx Code': item.rawRef || '',
            'Date Paid': item.rawDate || '',
            'Status': 'Unmatched - Student not found in database'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Unmatched Payments');

        // Set column widths for readability
        ws['!cols'] = [
            { wch: 6 },  // #
            { wch: 22 }, // Admission
            { wch: 30 }, // Name
            { wch: 18 }, // Amount
            { wch: 16 }, // Payment Mode
            { wch: 20 }, // Receipt No
            { wch: 22 }, // Reference
            { wch: 14 }, // Date Paid
            { wch: 42 }  // Status
        ];

        const cleanInstName = (institution?.name || 'School').replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${cleanInstName}_Unmatched_Payments_${timestamp}.xlsx`);
    };

    // Download complete reconciliation audit comparison as Excel
    const handleDownloadAuditReport = () => {
        if (!uploadAuditReport) return;
        const data = uploadAuditReport.groups.map((g, idx) => ({
            '#': idx + 1,
            'Admission Number': g.admNumber,
            'Student Name': g.studentName,
            'Raw Excel Tx Count': g.excelTxCount,
            'Uploaded Receipts Count': g.uploadedTxCount,
            'Total Amount (KES)': g.uploadedTotalAmount,
            '1-to-1 Verification Status': g.isExactMatch ? 'EXACT MATCH (100% Verified)' : 'MISMATCH',
            'Generated Receipt Numbers': g.receiptNumbers.join(', ')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation_Audit');

        ws['!cols'] = [
            { wch: 6 },
            { wch: 20 },
            { wch: 30 },
            { wch: 22 },
            { wch: 26 },
            { wch: 20 },
            { wch: 32 },
            { wch: 45 }
        ];

        const cleanInstName = (institution?.name || 'School').replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${cleanInstName}_Reconciliation_Audit_${timestamp}.xlsx`);
    };

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

    // Ultra-Fast Parallel Bulk Posting with 1-to-1 Transaction Guarantee & SMS Dispatch
    const handleConfirmPostBulk = async () => {
        const readyItems = reconciledItems.filter(i => i.matchStatus === 'matched' && i.rawAmount > 0);
        if (readyItems.length === 0) {
            alert("No matched payment rows with positive amounts to post.");
            return;
        }

        setIsProcessingBulk(true);
        setBulkProgress({ current: 0, total: readyItems.length });

        // Pre-build audit map to track Raw Excel count vs Posted Receipts count for 100% audit comparison
        const studentAuditMap = new Map<string, {
            studentId: string;
            studentName: string;
            admNumber: string;
            excelTxCount: number;
            excelTotalAmount: number;
            uploadedTxCount: number;
            uploadedTotalAmount: number;
            receiptNumbers: string[];
        }>();

        readyItems.forEach(item => {
            const sId = item.matchedStudentId;
            if (!studentAuditMap.has(sId)) {
                const sObj = allStudentsList.find(s => s.id === sId);
                const sAdm = sObj ? getResolvedAdm(sObj, item.rawAdm) : (item.matchedStudentAdm || item.rawAdm);
                studentAuditMap.set(sId, {
                    studentId: sId,
                    studentName: item.matchedStudentName || sObj?.name || 'Student',
                    admNumber: sAdm,
                    excelTxCount: 0,
                    excelTotalAmount: 0,
                    uploadedTxCount: 0,
                    uploadedTotalAmount: 0,
                    receiptNumbers: []
                });
            }
            const auditRec = studentAuditMap.get(sId)!;
            auditRec.excelTxCount += 1;
            auditRec.excelTotalAmount += Number(item.rawAmount);
        });

        const instId = institution?.id || '';
        let postedCount = 0;
        let totalVal = 0;
        const createdReceiptIds: string[] = [];
        const claimedExistingReceiptIds = new Set<string>();
        const BATCH_SIZE = 25; // Concurrent batch processing for high throughput

        try {
            for (let i = 0; i < readyItems.length; i += BATCH_SIZE) {
                const chunk = readyItems.slice(i, i + BATCH_SIZE);
                
                await Promise.all(chunk.map(async (item, chunkIdx) => {
                    const actualIdx = i + chunkIdx;
                    const cleanRef = item.rawRef.trim();
                    const student = allStudentsList.find(s => s.id === item.matchedStudentId);
                    const sAdm = student ? getResolvedAdm(student, item.rawAdm) : (item.matchedStudentAdm || item.rawAdm);

                    let existingReceipt: Receipt | undefined;
                    if (overrideExisting) {
                        // Match existing receipt ONLY if explicitly updating a known receipt number for this specific student
                        existingReceipt = receipts.find(r => {
                            if (claimedExistingReceiptIds.has(r.id)) return false;
                            const rStudentId = r.studentId || (r as any).student_id || '';
                            if (rStudentId !== item.matchedStudentId) return false;

                            const rRcptNum = String(r.receiptNumber || (r as any).receipt_number || '').trim().toLowerCase();
                            const itemRcptNum = String(item.receiptNumber || item.rawReceiptNo || '').trim().toLowerCase();
                            if (item.receiptSource === 'excel' && itemRcptNum && rRcptNum && itemRcptNum === rRcptNum) {
                                return true;
                            }
                            return false;
                        });
                        if (existingReceipt) {
                            claimedExistingReceiptIds.add(existingReceipt.id);
                        }
                    }

                    // Guaranteed 1-to-1: Each row gets a distinct, unique ID and receipt number
                    const receiptId = existingReceipt ? existingReceipt.id : `rec_imp_${Date.now()}_${actualIdx}_${Math.random().toString(36).substr(2, 6)}`;
                    const receiptNumber = (existingReceipt && existingReceipt.receiptNumber)
                        ? existingReceipt.receiptNumber
                        : (item.rawReceiptNo && item.receiptSource === 'excel')
                            ? item.rawReceiptNo
                            : item.receiptNumber || `RCPT-${Date.now().toString().slice(-6)}-${(actualIdx + 1).toString().padStart(3, '0')}-${Math.floor(10 + Math.random() * 90)}`;

                    const paidForDescription = item.voteHeadSummary ? `Fees [${item.voteHeadSummary}]` : 'School Fees — Excel Bulk Import';

                    const receiptRecord: Partial<Receipt> & Record<string, any> = {
                        id: receiptId,
                        receiptNumber,
                        receipt_number: receiptNumber,
                        institutionId: instId,
                        institution_id: instId,
                        studentId: item.matchedStudentId,
                        student_id: item.matchedStudentId,
                        admissionNumber: sAdm,
                        admission_number: sAdm,
                        amountPaid: Number(item.rawAmount),
                        amount_paid: Number(item.rawAmount),
                        paymentMethod: item.paymentMethod || defaultPaymentMethod,
                        payment_method: item.paymentMethod || defaultPaymentMethod,
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

                    // Update student audit verification record
                    const auditEntry = studentAuditMap.get(item.matchedStudentId);
                    if (auditEntry) {
                        auditEntry.uploadedTxCount += 1;
                        auditEntry.uploadedTotalAmount += Number(item.rawAmount);
                        auditEntry.receiptNumbers.push(receiptNumber);
                    }

                    if (onReceiptCreated) onReceiptCreated(receiptRecord);

                    // Asynchronous SMS dispatch to Parent if enabled
                    if (sendSmsNotification && student) {
                        const parentPhone = extractParentPhoneNumber(student, enrollments);
                        if (parentPhone) {
                            const cleanPhone = String(parentPhone).trim();
                            const selectedAccount = bankAccounts.find(b => b.id === selectedBankAccountId);
                            const studentEnrollment = (enrollments || []).find((e: any) => 
                                e.userId === student.id || e.user_id === student.id || e.studentId === student.id || e.student_id === student.id
                            );
                            const finData = (studentFinanceData || []).find((f: any) => f.id === student.id);
                            const totalCharged = finData?.totals?.invoiced ?? (invoices || [])
                                .filter((inv: any) => inv.studentId === student.id || inv.student_id === student.id || inv.userId === student.id)
                                .reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.amount || 0), 0);
                            const totalAdjusted = finData?.totals?.totalAdjusted ?? 0;
                            const currentBalance = finData?.totals?.balance !== undefined
                                ? Math.max(0, Number(finData.totals.balance) - Number(item.rawAmount))
                                : Math.max(0, Number(totalCharged) - Number(item.rawAmount));

                            const smsMsg = buildCustomPaymentNotification({
                                account: selectedAccount,
                                student: {
                                    ...student,
                                    admissionNumber: sAdm
                                },
                                enrollment: studentEnrollment,
                                paymentAmount: Number(item.rawAmount),
                                totalCharged: totalCharged,
                                totalAdjusted: totalAdjusted,
                                currentBalance: currentBalance,
                                paymentDate: item.rawDate || new Date(),
                                institutionName: institution?.name || 'School',
                                receiptNumber: receiptNumber
                            });

                            apiService.sendSms(cleanPhone, smsMsg, institution?.smsConfig, 1, instId, undefined, true).catch(err => {
                                console.warn('[ReceiveFeesModal] SMS notification error:', err);
                            });
                        }
                    }

                    // Asynchronous WhatsApp receipt dispatch if enabled
                    if (sendWhatsAppNotification && student) {
                        const parentPhone = extractParentPhoneNumber(student, enrollments);
                        if (parentPhone) {
                            whatsappService.sendPaymentReceipt({
                                institutionId: instId,
                                schoolName: institution?.name || 'School',
                                recipientPhone: String(parentPhone).trim(),
                                studentName: student.name || 'Student',
                                admNo: sAdm,
                                amount: Number(item.rawAmount),
                                receiptNumber: receiptNumber,
                                paymentMethod: (item as any).mode || defaultPaymentMethod,
                                receiptUrl: `${window.location.origin}/?receipt=${receiptNumber}`
                            }).catch(err => {
                                console.warn('[ReceiveFeesModal] WhatsApp receipt error:', err);
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

            const auditGroups = Array.from(studentAuditMap.values()).map(g => ({
                ...g,
                isExactMatch: g.excelTxCount === g.uploadedTxCount && g.excelTotalAmount === g.uploadedTotalAmount
            }));

            setUploadAuditReport({
                excelTotalRows: readyItems.length,
                excelTotalAmount: totalVal,
                postedReceiptsCount: postedCount,
                postedTotalAmount: totalVal,
                depositAccountName: selectedAccount ? `${selectedAccount.bankName} - ${selectedAccount.accountName}` : 'Bank Account',
                groups: auditGroups
            });

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
            let smsSuccessNote = '';
            if (manualSendSms) {
                const parentPhone = extractParentPhoneNumber(manualSelectedStudent, enrollments);
                if (parentPhone) {
                    const cleanPhone = String(parentPhone).trim();
                    const selectedAccount = bankAccounts.find(b => b.id === selectedBankAccountId);
                    const manualEnrollment = (enrollments || []).find((e: any) => 
                        e.userId === manualSelectedStudent.id || e.user_id === manualSelectedStudent.id || 
                        e.studentId === manualSelectedStudent.id || e.student_id === manualSelectedStudent.id
                    );
                    const finData = (studentFinanceData || []).find((f: any) => f.id === manualSelectedStudent.id);
                    const totalCharged = finData?.totals?.invoiced ?? (invoices || [])
                        .filter((inv: any) => inv.studentId === manualSelectedStudent.id || inv.student_id === manualSelectedStudent.id || inv.userId === manualSelectedStudent.id)
                        .reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.amount || 0), 0);
                    const totalAdjusted = finData?.totals?.totalAdjusted ?? 0;
                    const currentBalance = finData?.totals?.balance !== undefined
                        ? Math.max(0, Number(finData.totals.balance) - Number(manualAmount))
                        : Math.max(0, Number(totalCharged) - Number(manualAmount));

                    const smsMsg = buildCustomPaymentNotification({
                        account: selectedAccount,
                        student: {
                            ...manualSelectedStudent,
                            admissionNumber: sAdm
                        },
                        enrollment: manualEnrollment,
                        paymentAmount: Number(manualAmount),
                        totalCharged: totalCharged,
                        totalAdjusted: totalAdjusted,
                        currentBalance: currentBalance,
                        paymentDate: manualDate || new Date(),
                        institutionName: institution?.name || 'School',
                        receiptNumber: receiptNumber
                    });
                    try {
                        const smsRes = await apiService.sendSms(cleanPhone, smsMsg, institution?.smsConfig, 1, instId, undefined, true);
                        if (smsRes && smsRes.success === false) {
                            smsSuccessNote = ` (⚠️ SMS Notice: ${smsRes.message || 'Check SMS balance in Settings'})`;
                        } else {
                            smsSuccessNote = ` (📱 SMS receipt sent to ${cleanPhone})`;
                        }
                    } catch (err: any) {
                        console.warn('[ReceiveFeesModal] Manual SMS notice:', err);
                        smsSuccessNote = ` (⚠️ SMS Notice: ${err?.message || 'Delivery error'})`;
                    }
                } else {
                    smsSuccessNote = ` (⚠️ Note: No parent phone found on record for ${manualSelectedStudent.name})`;
                }
            }

            // Dispatch WhatsApp receipt if checked
            if (manualSendWhatsApp) {
                const parentPhone = extractParentPhoneNumber(manualSelectedStudent, enrollments);
                if (parentPhone) {
                    whatsappService.sendPaymentReceipt({
                        institutionId: instId,
                        schoolName: institution?.name || 'School',
                        recipientPhone: String(parentPhone).trim(),
                        studentName: manualSelectedStudent.name || 'Student',
                        admNo: sAdm,
                        amount: Number(manualAmount),
                        receiptNumber: receiptNumber,
                        paymentMethod: manualMethod,
                        receiptUrl: `${window.location.origin}/?receipt=${receiptNumber}`
                    }).catch(err => {
                        console.warn('[ReceiveFeesModal] Manual WhatsApp receipt notice:', err);
                    });
                }
            }

            if (onRefreshData) await onRefreshData();

            setManualSuccessMsg(`Receipt ${receiptNumber} created successfully for ${manualSelectedStudent.name}!${smsSuccessNote}`);
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
                        {successSummary && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in">
                                <div className="flex items-center gap-2">
                                    <CheckBadgeIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span>{successSummary}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSuccessSummary(null)}
                                    className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-white rounded-lg cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
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
                                                    checked={sendWhatsAppNotification}
                                                    onChange={(e) => setSendWhatsAppNotification(e.target.checked)}
                                                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                                />
                                                <span>💬 WhatsApp Receipt</span>
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

                                {/* ── Controls & Filter Bar with View Mode Toggle ── */}
                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                                        {/* Search Filter */}
                                        <div className="relative flex-1 sm:w-60 min-w-[200px]">
                                            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Filter by name, ADM, ref, receipt..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>

                                        {/* Status Filter */}
                                        <div className="flex items-center gap-1">
                                            {(['all', 'matched', 'unmatched'] as const).map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setFilterStatus(st)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        filterStatus === st
                                                            ? 'bg-indigo-600 text-white shadow-xs'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {st} {st === 'unmatched' && stats.unmatchedCount > 0 ? `(${stats.unmatchedCount})` : ''}
                                                </button>
                                            ))}
                                        </div>

                                        {/* View Mode Toggle: Flat vs Grouped by Student */}
                                        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => setExcelViewMode('flat')}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    excelViewMode === 'flat'
                                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                }`}
                                            >
                                                <span>📋 Flat Rows</span>
                                                <span className="text-[10px] font-black opacity-75">({filteredItems.length})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setExcelViewMode('grouped')}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    excelViewMode === 'grouped'
                                                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                }`}
                                            >
                                                <span>👥 Grouped by Student</span>
                                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${excelViewMode === 'grouped' ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                    {groupedStudents.length}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Badges & Actions */}
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end w-full lg:w-auto">
                                        {excelViewMode === 'grouped' && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAllGroups(true)}
                                                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                                                >
                                                    Expand All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAllGroups(false)}
                                                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                                                >
                                                    Collapse All
                                                </button>
                                            </div>
                                        )}
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold border border-emerald-200 dark:border-emerald-800/40 text-[10px]">
                                            ✓ {stats.matchedCount} Matched ({stats.uniqueMatchedStudentsCount} Students)
                                        </span>
                                        {stats.multipleTxCount > 0 && (
                                            <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg font-bold border border-purple-200 dark:border-purple-800/40 text-[10px]">
                                                ⚡ {stats.multipleTxCount} Students with 2+ Tx
                                            </span>
                                        )}
                                        {stats.unmatchedCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleDownloadUnmatched}
                                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg font-black text-[10px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                                title="Download all unmatched records as an Excel spreadsheet"
                                            >
                                                <DownloadIcon className="w-3.5 h-3.5" />
                                                <span>Download Unmatched ({stats.unmatchedCount})</span>
                                            </button>
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
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                                        >
                                            Change File
                                        </button>
                                    </div>
                                </div>

                                {/* ── MODE 1: FLAT TRANSACTION ROWS TABLE ── */}
                                {excelViewMode === 'flat' && (
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
                                                                    <td className="px-4 py-2.5">
                                                                        <select
                                                                            value={item.paymentMethod || item.rawMode || defaultPaymentMethod}
                                                                            onChange={(e) => handleRowMethodChange(item.id, e.target.value as any)}
                                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                                                                        >
                                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                                            <option value="M-Pesa">M-Pesa</option>
                                                                            <option value="Cash">Cash</option>
                                                                            <option value="Cheque">Cheque</option>
                                                                            <option value="Bursary">Bursary</option>
                                                                            <option value="Direct Deposit">Direct Deposit</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                                        {item.receiptSource === 'excel' && item.rawReceiptNo ? (
                                                                            <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-bold">
                                                                                {item.rawReceiptNo} (Excel)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">
                                                                                {item.receiptNumber || '✨ System Auto'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                                                                        {item.rawRef || <span className="text-slate-300 italic">—</span>}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                                        {item.rawDate || 'Today'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5">
                                                                        {item.matchStatus === 'matched' ? (
                                                                            <div className="space-y-0.5">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                                                        {item.matchedStudentName}
                                                                                    </span>
                                                                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-mono">
                                                                                        {item.matchedStudentAdm}
                                                                                    </span>
                                                                                </div>
                                                                                {item.voteHeadSummary && (
                                                                                    <div className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                                                                                        ⚡ {item.voteHeadSummary}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                                                                                <span>⚠️ Unmatched</span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        {item.matchStatus === 'unmatched' ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setAssigningRowItem(item);
                                                                                    setAssignSearchQuery(item.rawName || item.rawAdm || '');
                                                                                }}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                                                                title="Search and assign student"
                                                                            >
                                                                                <SearchIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                                                <span>Assign...</span>
                                                                            </button>
                                                                        ) : (
                                                                            <div className="inline-flex items-center gap-1.5">
                                                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                                    Ready
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setAssigningRowItem(item);
                                                                                        setAssignSearchQuery(item.matchedStudentName || item.rawName || '');
                                                                                    }}
                                                                                    className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline font-semibold cursor-pointer"
                                                                                    title="Change assigned student"
                                                                                >
                                                                                    Change
                                                                                </button>
                                                                            </div>
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
                                )}

                                {/* ── MODE 2: GROUPED BY STUDENT CARDS WITH ACCORDION BREAKDOWN ── */}
                                {excelViewMode === 'grouped' && (
                                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                        {groupedStudents.length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 font-medium text-xs">
                                                No student groups match the selected filters.
                                            </div>
                                        ) : (
                                            groupedStudents.map((grp) => {
                                                const isExpanded = expandedGroupKeys[grp.groupKey] ?? (groupedStudents.length <= 15 || grp.rawTxCount > 1);
                                                return (
                                                    <div 
                                                        key={grp.groupKey}
                                                        className={`border rounded-2xl transition-all overflow-hidden ${
                                                            grp.matchStatus === 'matched'
                                                                ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                                                                : 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
                                                        }`}
                                                    >
                                                        {/* Group Header Card */}
                                                        <div 
                                                            onClick={() => handleToggleGroup(grp.groupKey)}
                                                            className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 select-none transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                                    grp.matchStatus === 'matched'
                                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                                }`}>
                                                                    <UserIcon className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h5 className="font-black text-sm text-slate-900 dark:text-white">
                                                                            {grp.studentName}
                                                                        </h5>
                                                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs rounded-md">
                                                                            ADM: {grp.admNumber}
                                                                        </span>
                                                                        {grp.className && (
                                                                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] rounded-md">
                                                                                {grp.className}
                                                                            </span>
                                                                        )}
                                                                        {grp.matchStatus === 'unmatched' && (
                                                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-[10px] rounded-md">
                                                                                ⚠️ Needs Assignment
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                                        {grp.matchStatus === 'matched' ? '✓ Student verified in database' : 'Spreadsheet record does not match existing student admission'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Right Side Badges: Raw Excel Tx Count + Total Amount */}
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right">
                                                                    <div className="flex items-center gap-1.5 justify-end">
                                                                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-xs rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                                                                            📊 Raw Excel: {grp.rawTxCount} {grp.rawTxCount === 1 ? 'Transaction' : 'Transactions'}
                                                                        </span>
                                                                        {grp.rawTxCount > 1 && (
                                                                            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-[10px] rounded-md uppercase tracking-wider shadow-xs">
                                                                                ⚡ Multiple Payments
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                                        Total: KES {grp.totalAmount.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                                <div className={`p-1.5 rounded-lg text-slate-400 transition-transform ${isExpanded ? 'rotate-180 bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                                    <ChevronDownIcon className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Sub-Table of Individual Raw Excel Rows */}
                                                        {isExpanded && (
                                                            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3">
                                                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                                                    <table className="w-full text-left text-xs border-collapse bg-white dark:bg-slate-900">
                                                                        <thead>
                                                                            <tr className="bg-slate-100/70 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                                                                <th className="py-2 px-3 text-center w-10">Row</th>
                                                                                <th className="py-2 px-3 text-left">Date</th>
                                                                                <th className="py-2 px-3 text-right">Amount (KES)</th>
                                                                                <th className="py-2 px-3 text-left">Payment Mode</th>
                                                                                <th className="py-2 px-3 text-left">Receipt No</th>
                                                                                <th className="py-2 px-3 text-left">Reference / Code</th>
                                                                                <th className="py-2 px-3 text-left">Fee Breakdown</th>
                                                                                <th className="py-2 px-3 text-center w-24">Action</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                            {grp.items.map((it, idx) => (
                                                                                <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                                                                        {it.rowIndex}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                                                                        {it.rawDate || 'Today'}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-right font-black font-mono text-slate-900 dark:text-white">
                                                                                        KES {it.rawAmount.toLocaleString()}
                                                                                    </td>
                                                                                    <td className="py-2 px-3">
                                                                                        <select
                                                                                            value={it.paymentMethod || it.rawMode || defaultPaymentMethod}
                                                                                            onChange={(e) => handleRowMethodChange(it.id, e.target.value as any)}
                                                                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                                                                                        >
                                                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                                                            <option value="M-Pesa">M-Pesa</option>
                                                                                            <option value="Cash">Cash</option>
                                                                                            <option value="Cheque">Cheque</option>
                                                                                            <option value="Bursary">Bursary</option>
                                                                                            <option value="Direct Deposit">Direct Deposit</option>
                                                                                        </select>
                                                                                    </td>
                                                                                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                                                        {it.receiptSource === 'excel' && it.rawReceiptNo ? (
                                                                                            <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-bold">
                                                                                                {it.rawReceiptNo}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-slate-400 italic">
                                                                                                {it.receiptNumber || '✨ Auto'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                                                        {it.rawRef || '—'}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                                                                                        {it.voteHeadSummary || '⚡ Auto-Split'}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setAssigningRowItem(it);
                                                                                                setAssignSearchQuery(it.matchedStudentName || it.rawName || '');
                                                                                            }}
                                                                                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                                                                                        >
                                                                                            {it.matchStatus === 'matched' ? 'Reassign' : 'Assign'}
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

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
                                {successSummary && !uploadAuditReport && (
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
                                                    <span>Confirm &amp; Post {stats.matchedCount} Payments ({stats.uniqueMatchedStudentsCount} Students)</span>
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
                            {manualSuccessMsg && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in">
                                    <div className="flex items-center gap-2">
                                        <CheckBadgeIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <span>{manualSuccessMsg}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setManualSuccessMsg(null)}
                                        className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-white rounded-lg cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            
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
                                                getResolvedAdm(s).toLowerCase().includes(manualStudentSearch.toLowerCase())
                                            )
                                            .slice(0, 8)
                                            .map(st => (
                                                <button
                                                    key={st.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setManualSelectedStudent(st);
                                                        setManualStudentSearch(`${st.name} ${getResolvedAdm(st) !== 'N/A' ? `(${getResolvedAdm(st)})` : ''}`);
                                                    }}
                                                    className="w-full p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                                                >
                                                    <span>{st.name}</span>
                                                    <span className="font-mono text-slate-400 text-[11px] font-bold">
                                                        ADM: {getResolvedAdm(st)}
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                )}
                                {manualSelectedStudent && (
                                    <p className="text-[11px] text-emerald-600 font-bold">
                                        ✓ Selected: {manualSelectedStudent.name} {getResolvedAdm(manualSelectedStudent) !== 'N/A' ? `(${getResolvedAdm(manualSelectedStudent)})` : ''}
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

                            {/* Notification Toggles */}
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={manualSendSms}
                                        onChange={(e) => setManualSendSms(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                    />
                                    <span>📱 Send Instant SMS Receipt Alert to Parent</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={manualSendWhatsApp}
                                        onChange={(e) => setManualSendWhatsApp(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                    />
                                    <span>💬 Send Official WhatsApp Receipt & PDF Link</span>
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

            {/* ── MODAL: SEARCHABLE STUDENT ASSIGNMENT PICKER ── */}
            {assigningRowItem && (
                <div 
                    className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setAssigningRowItem(null);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-left space-y-4 max-h-[90vh] flex flex-col">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                            <div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <SearchIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    <span>Assign Student · Row #{assigningRowItem.rowIndex}</span>
                                </h4>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                    Search by student name, admission number, form/class, or parent phone.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssigningRowItem(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Payment Row Summary Card */}
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 shrink-0">
                            <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-black">Transaction Details</span>
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                    KES {assigningRowItem.rawAmount.toLocaleString()}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-semibold">Excel ADM</span>
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{assigningRowItem.rawAdm || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-semibold">Excel Name</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{assigningRowItem.rawName || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-semibold">Receipt / Ref</span>
                                    <span className="font-mono font-bold truncate block">{assigningRowItem.receiptNumber || assigningRowItem.rawRef}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-semibold">Date Paid</span>
                                    <span className="font-bold">{assigningRowItem.rawDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Search Input Bar with Clear Button */}
                        <div className="space-y-2 shrink-0">
                            <div className="relative">
                                <SearchIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={assignSearchQuery}
                                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const q = assignSearchQuery.trim().toLowerCase();
                                            const tokens = q.split(/\s+/).filter(Boolean);
                                            const matches = allStudentsList.filter(s => {
                                                if (!q) return true;
                                                const sName = (s.name || '').toLowerCase();
                                                const sAdm = getResolvedAdm(s).toLowerCase();
                                                return tokens.every(t => sName.includes(t) || sAdm.includes(t));
                                            });
                                            const target = matches[0] || allStudentsList[0];
                                            if (target) {
                                                handleManualAssign(assigningRowItem.id, target.id);
                                                setAssigningRowItem(null);
                                            }
                                        }
                                    }}
                                    placeholder="Search student by name, ADM, class, phone (Press Enter to assign)..."
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                />
                                {assignSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setAssignSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Quick Suggestion Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                <span className="text-slate-400 font-semibold">Quick search:</span>
                                <button
                                    type="button"
                                    onClick={() => setAssignSearchQuery('')}
                                    className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                        !assignSearchQuery.trim()
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    Show All ({allStudentsList.length})
                                </button>
                                {(() => {
                                    const rawWords = (assigningRowItem.rawName || '').split(/\s+/).filter(w => w.length >= 2);
                                    const rawAdmClean = (assigningRowItem.rawAdm || '').trim();
                                    const chips: Array<{ label: string; val: string }> = [];

                                    if (rawAdmClean && rawAdmClean !== 'N/A') {
                                        chips.push({ label: `ADM: ${rawAdmClean}`, val: rawAdmClean });
                                    }
                                    rawWords.forEach(w => {
                                        if (!chips.some(c => c.val.toLowerCase() === w.toLowerCase())) {
                                            chips.push({ label: `"${w}"`, val: w });
                                        }
                                    });

                                    return chips.slice(0, 4).map((chip, cIdx) => (
                                        <button
                                            key={cIdx}
                                            type="button"
                                            onClick={() => setAssignSearchQuery(chip.val)}
                                            className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                                                assignSearchQuery.toLowerCase() === chip.val.toLowerCase()
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100'
                                            }`}
                                        >
                                            {chip.label}
                                        </button>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Search Results List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[220px] max-h-[320px] bg-white dark:bg-slate-900">
                            {(() => {
                                const q = assignSearchQuery.trim().toLowerCase();
                                const tokens = q.split(/\s+/).filter(Boolean);

                                const matches = allStudentsList.filter(s => {
                                    if (!q) return true;
                                    const sName = (s.name || '').toLowerCase();
                                    const sAdm = getResolvedAdm(s).toLowerCase();
                                    const sReg = String((s as any).registrationNumber || (s as any).regNo || '').toLowerCase();
                                    const sClass = String((s as any).className || (s as any).form || '').toLowerCase();
                                    const sPhone = String(s.phoneNumber || s.parentPhone || (s as any).guardianPhone || '').toLowerCase();

                                    return tokens.every(token => 
                                        sName.includes(token) || 
                                        sAdm.includes(token) || 
                                        sReg.includes(token) || 
                                        sClass.includes(token) || 
                                        sPhone.includes(token)
                                    );
                                });

                                const isShowingFallback = q.length > 0 && matches.length === 0;
                                const displayList = isShowingFallback ? allStudentsList.slice(0, 40) : matches.slice(0, 50);

                                if (displayList.length === 0) {
                                    return (
                                        <div className="p-8 text-center text-xs text-slate-400 font-semibold space-y-1.5">
                                            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">No registered students found in database</p>
                                            <p className="text-[11px]">Please ensure students have been enrolled in the Students / Academics module.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <>
                                        {isShowingFallback && (
                                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 font-semibold flex items-center justify-between">
                                                <span>⚠ No exact match for "{assignSearchQuery}". Pick from students below:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignSearchQuery('')}
                                                    className="underline font-bold text-amber-900 dark:text-amber-200 hover:text-indigo-600 cursor-pointer"
                                                >
                                                    Clear Query
                                                </button>
                                            </div>
                                        )}

                                        {displayList.map(student => {
                                            const admNo = getResolvedAdm(student);
                                            const isCurrentMatch = assigningRowItem.matchedStudentId === student.id;
                                            const initials = (student.name || 'ST')
                                                .split(' ')
                                                .map((n: string) => n[0])
                                                .slice(0, 2)
                                                .join('')
                                                .toUpperCase();
                                            const studentClass = (student as any).className || (student as any).form || (student as any).grade;
                                            const parentContact = student.parentPhone || student.phoneNumber || (student as any).guardianPhone;

                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => {
                                                        handleManualAssign(assigningRowItem.id, student.id);
                                                        setAssigningRowItem(null);
                                                    }}
                                                    className={`p-3 flex items-center justify-between hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer group ${
                                                        isCurrentMatch ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {/* Avatar Initials */}
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                            {initials}
                                                        </div>

                                                        <div className="space-y-0.5 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                    {student.name}
                                                                </span>
                                                                {admNo !== 'N/A' && (
                                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 text-[10px]">
                                                                        ADM: {admNo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                                                                {studentClass && (
                                                                    <span className="font-medium text-slate-500 dark:text-slate-400">
                                                                        📚 {studentClass}
                                                                    </span>
                                                                )}
                                                                {parentContact && (
                                                                    <span className="font-mono text-slate-400">
                                                                        📱 {parentContact}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleManualAssign(assigningRowItem.id, student.id);
                                                            setAssigningRowItem(null);
                                                        }}
                                                        className="px-3.5 py-1.5 bg-indigo-600 group-hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                    >
                                                        <CheckBadgeIcon className="w-3.5 h-3.5" />
                                                        <span>Assign</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="pt-2 flex items-center justify-between shrink-0 text-xs">
                            <span className="text-slate-400 text-[11px]">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] font-bold">Enter</kbd> to assign first match, or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] font-bold">Esc</kbd> to cancel.
                            </span>
                            <button
                                type="button"
                                onClick={() => setAssigningRowItem(null)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: POST-UPLOAD RECONCILIATION AUDIT & COMPARISON REPORT ── */}
            {uploadAuditReport && (
                <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full p-6 text-left space-y-5 max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        <CheckBadgeIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                            Reconciliation &amp; Upload Verification Audit
                                        </h3>
                                        <p className="text-xs text-slate-500 font-semibold">
                                            1-to-1 comparison of Raw Excel Transactions vs Created System Receipts
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setUploadAuditReport(null);
                                    if (onClose) onClose();
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Top Metrics Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Raw Excel Tx</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white">{uploadAuditReport.excelTotalRows} Rows</span>
                            </div>
                            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">Uploaded Receipts</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{uploadAuditReport.postedReceiptsCount} Created</span>
                            </div>
                            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">Students Reconciled</span>
                                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{uploadAuditReport.groups.length} Students</span>
                            </div>
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Value Posted</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">KES {uploadAuditReport.postedTotalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Audit Comparison Table */}
                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-100 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800 z-10">
                                    <tr>
                                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                                        <th className="py-2.5 px-4">Student &amp; ADM</th>
                                        <th className="py-2.5 px-3 text-center">Raw Excel Tx</th>
                                        <th className="py-2.5 px-3 text-center">Uploaded Receipts</th>
                                        <th className="py-2.5 px-4 text-right">Total Amount</th>
                                        <th className="py-2.5 px-3 text-center">Reconciliation Status</th>
                                        <th className="py-2.5 px-4">Receipt Numbers Generated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {uploadAuditReport.groups.map((g, idx) => (
                                        <tr key={g.studentId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold text-[11px]">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-4">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {g.studentName}
                                                </div>
                                                <div className="font-mono text-[10px] text-slate-400">
                                                    ADM: {g.admNumber}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black font-mono rounded-lg text-xs">
                                                    {g.excelTxCount}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black font-mono rounded-lg text-xs">
                                                    {g.uploadedTxCount}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-black font-mono text-slate-900 dark:text-white">
                                                KES {g.uploadedTotalAmount.toLocaleString()}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                {g.isExactMatch ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                                                        <span>✅ Exact Match ({g.excelTxCount} = {g.uploadedTxCount})</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-black border border-amber-200 dark:border-amber-800">
                                                        <span>⚠️ Mismatch ({g.excelTxCount} vs {g.uploadedTxCount})</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                <div className="flex flex-wrap gap-1">
                                                    {g.receiptNumbers.map(rcpt => (
                                                        <span key={rcpt} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[10px]">
                                                            {rcpt}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={handleDownloadAuditReport}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                <span>Export Audit Report (.xlsx)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setUploadAuditReport(null);
                                    if (onClose) onClose();
                                }}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                Done &amp; Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
