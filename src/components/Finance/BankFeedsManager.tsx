import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    BankFeedsService,
    BankFeedAccount,
    IngestedTransaction,
    DEFAULT_BANK_FEED_ACCOUNTS
} from '../../services/bankFeedsService';
import { apiService } from '../../services/apiService';
import { supabase } from '../../lib/supabase';
import {
    ArrowPathIcon,
    BuildingLibraryIcon,
    CheckBadgeIcon,
    CreditCardIcon,
    DevicePhoneMobileIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    SignalIcon,
    SparklesIcon,
    XIcon as XMarkIcon,
    FunnelIcon,
    ArrowTrendingUpIcon,
    MagnifyingGlassIcon,
    KcbIcon,
    CoopIcon,
    NcbaIcon,
    MpesaIcon,
    CheckCircleIcon
} from '../icons';

interface BankFeedsManagerProps {
    institution: any;
    students: any[];
    receipts: any[];
    expenses: any[];
    onReceiptCreated?: (newReceipt: any) => void;
    onLogAction?: (msg: string) => void;
}

export const BankFeedsManager: React.FC<BankFeedsManagerProps> = ({
    institution,
    students,
    receipts,
    expenses,
    onReceiptCreated,
    onLogAction
}) => {
    const [liveTransactions, setLiveTransactions] = useState<IngestedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [showDemoPreview, setShowDemoPreview] = useState<boolean>(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toISOString());

    // Search and filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'MATCHED' | 'SUSPENSE'>('ALL');
    const [providerFilter, setProviderFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'live_feed' | 'accounts' | 'reconciliation'>('live_feed');

    // Suspense assignment modal
    const [suspenseTargetTxn, setSuspenseTargetTxn] = useState<IngestedTransaction | null>(null);
    const [selectedStudentForSuspense, setSelectedStudentForSuspense] = useState<string>('');
    const [isAssigningSuspense, setIsAssigningSuspense] = useState<boolean>(false);

    // Simulation states
    const [isSimulating, setIsSimulating] = useState(false);
    const [simTransId, setSimTransId] = useState(`KCB${Math.floor(100000 + Math.random() * 900000)}`);
    const [simAmount, setSimAmount] = useState('4500');
    const [simBillRef, setSimBillRef] = useState(students[0]?.admissionNumber || students[0]?.admission_number || '3175');
    const [simPhone, setSimPhone] = useState('254712345678');
    const [simPayer, setSimPayer] = useState(students[0]?.name || students[0]?.fullName || 'Mary Wanjiku');
    const [simProvider, setSimProvider] = useState<'KCB_BUNI' | 'MPESA_DARAJA' | 'EQUITY_JENGA' | 'COOP_CONNECT'>('KCB_BUNI');
    const [isProcessingSim, setIsProcessingSim] = useState(false);

    // ── 1. Dynamic Bank Accounts Resolution ──
    const accounts = useMemo<BankFeedAccount[]>(() => {
        if (!institution) return DEFAULT_BANK_FEED_ACCOUNTS;

        const kcbConfig = institution.kcbConfig || institution.kcb_config || {};
        const mpesaConfig = institution.mpesaConfig || institution.mpesa_config || {};

        const isKcbActive = Boolean(
            kcbConfig.appKey || 
            kcbConfig.shortCode || 
            kcbConfig.short_code || 
            kcbConfig.tillNumber || 
            kcbConfig.accountNumber ||
            kcbConfig.account_number ||
            kcbConfig.enabled === true
        );

        const isMpesaActive = Boolean(
            mpesaConfig.shortCode || 
            mpesaConfig.short_code || 
            mpesaConfig.paybillNumber || 
            mpesaConfig.paybill_number ||
            mpesaConfig.consumerKey
        );

        // Calculate live volumes for each provider from liveTransactions
        const kcbVolume = liveTransactions
            .filter(t => t.provider === 'KCB_BUNI' && t.status === 'MATCHED_AND_RECEIPTED')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const mpesaVolume = liveTransactions
            .filter(t => t.provider === 'MPESA_DARAJA' && t.status === 'MATCHED_AND_RECEIPTED')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const coopVolume = liveTransactions
            .filter(t => t.provider === 'COOP_CONNECT' && t.status === 'MATCHED_AND_RECEIPTED')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const equityVolume = liveTransactions
            .filter(t => t.provider === 'EQUITY_JENGA' && t.status === 'MATCHED_AND_RECEIPTED')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const kcbShortCode = kcbConfig.shortCode || kcbConfig.short_code || kcbConfig.tillNumber || kcbConfig.till_number || '';
        const kcbAccNo = kcbConfig.accountNumber || kcbConfig.account_number || kcbShortCode || '1109482019';

        const mpesaShortCode = mpesaConfig.shortCode || mpesaConfig.short_code || mpesaConfig.paybillNumber || mpesaConfig.paybill_number || '522522';

        return [
            {
                id: 'feed_kcb_bank',
                institutionId: institution.id || '',
                provider: 'KCB_BUNI',
                accountName: kcbConfig.accountName || `${institution.name || 'School'} KCB Account`,
                accountNumber: kcbAccNo,
                paybillOrTillNumber: kcbShortCode || undefined,
                balance: kcbVolume,
                currency: 'KES',
                status: isKcbActive ? 'ACTIVE' : 'DISCONNECTED',
                lastSyncedAt,
                isDefault: isKcbActive,
                credentialsConfigured: isKcbActive
            },
            {
                id: 'feed_mpesa_paybill',
                institutionId: institution.id || '',
                provider: 'MPESA_DARAJA',
                accountName: mpesaConfig.accountName || `${institution.name || 'School'} M-Pesa Paybill`,
                accountNumber: mpesaShortCode,
                paybillOrTillNumber: mpesaShortCode,
                balance: mpesaVolume,
                currency: 'KES',
                status: isMpesaActive ? 'ACTIVE' : 'DISCONNECTED',
                lastSyncedAt,
                isDefault: !isKcbActive && isMpesaActive,
                credentialsConfigured: isMpesaActive
            },
            {
                id: 'feed_coop_bank',
                institutionId: institution.id || '',
                provider: 'COOP_CONNECT',
                accountName: 'Co-operative Bank Direct Feed',
                accountNumber: institution.coopConfig?.accountNumber || '01129000458100',
                balance: coopVolume,
                currency: 'KES',
                status: institution.coopConfig?.accountNumber ? 'ACTIVE' : 'DISCONNECTED',
                lastSyncedAt,
                isDefault: false,
                credentialsConfigured: Boolean(institution.coopConfig?.accountNumber)
            },
            {
                id: 'feed_equity_bank',
                institutionId: institution.id || '',
                provider: 'EQUITY_JENGA',
                accountName: 'Equity Bank Jenga Gateway',
                accountNumber: institution.equityConfig?.accountNumber || '0810294820194',
                balance: equityVolume,
                currency: 'KES',
                status: institution.equityConfig?.accountNumber ? 'ACTIVE' : 'DISCONNECTED',
                lastSyncedAt,
                isDefault: false,
                credentialsConfigured: Boolean(institution.equityConfig?.accountNumber)
            }
        ];
    }, [institution, liveTransactions, lastSyncedAt]);

    // ── Helper 1: Parse Admission Number from Compound References (e.g. "8145955-201" -> "201") ──
    const parseAdmissionNumberFromRef = useCallback((rawRef: string): string => {
        if (!rawRef) return '';
        const clean = String(rawRef).trim();
        if (!clean || /^(none|null|undefined)$/i.test(clean)) return '';

        // Case 1: Compound delimiter format (PaybillPrefix-AdmNo, e.g. "8145955-201", "8145955/201", "8145955#201")
        const delimiterMatch = clean.match(/^[0-9A-Za-z]{4,10}[\-_\/#\s:]+([A-Za-z0-9\/-]+)$/i);
        if (delimiterMatch && delimiterMatch[1]) {
            return delimiterMatch[1].trim();
        }

        // Case 2: Explicit prefix format (e.g. "ADM-201", "ACC-201", "STU-201", "NO: 201")
        const prefixMatch = clean.match(/(?:ADM|ACC|STU|STUDENT|NO)[\s\-_#:\/.]*([0-9A-Za-z\/-]+)$/i);
        if (prefixMatch && prefixMatch[1]) {
            return prefixMatch[1].trim();
        }

        // Case 3: Any string with hyphen where suffix is the ADM number
        if (clean.includes('-')) {
            const parts = clean.split('-');
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart) return lastPart;
        }

        return clean;
    }, []);

    // Helper: Format Kenyan phone number to 07... / 01... like in the photo
    const formatDisplayPhone = useCallback((raw?: string): string => {
        if (!raw) return '-';
        let clean = String(raw).replace(/[^0-9]/g, '');
        if (clean.startsWith('254') && clean.length === 12) {
            return '0' + clean.slice(3);
        }
        if (clean.length === 9) {
            return '0' + clean;
        }
        return clean || raw;
    }, []);

    // Helper: Format transaction timestamp (e.g. "05:28 PM", "Sat 08:01 AM") like in the photo
    const formatPaidOn = useCallback((dateStr?: string): string => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (isToday) {
            return timeStr;
        }
        if (diffDays < 7 && diffDays >= 0) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${dayNames[d.getDay()]} ${timeStr}`;
        }
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
    }, []);

    // Helper: Format Source string (e.g. "National Bank account [7700089957]") like in the photo
    const resolveSource = useCallback((txn: IngestedTransaction): string => {
        if (txn.rawPayload?.bank_account_formatted) {
            return txn.rawPayload.bank_account_formatted;
        }
        if (txn.rawPayload?.bank_name && txn.rawPayload?.account_number) {
            return `${txn.rawPayload.bank_name} account [${txn.rawPayload.account_number}]`;
        }
        
        const matchedAccount = accounts.find(a => a.provider === txn.provider);
        if (matchedAccount) {
            if (txn.provider === 'MPESA_DARAJA') {
                return `M-Pesa Paybill [${matchedAccount.paybillOrTillNumber || matchedAccount.accountNumber || '522522'}]`;
            }
            const bName = matchedAccount.accountName.split(' ')[0] || 'Bank';
            return `${bName} Bank account [${matchedAccount.accountNumber}]`;
        }
        
        switch (txn.provider) {
            case 'MPESA_DARAJA':
                return `M-Pesa Paybill [${institution?.mpesaConfig?.shortCode || institution?.mpesaConfig?.paybillNumber || '522522'}]`;
            case 'KCB_BUNI':
                return `KCB Bank account [${institution?.kcbConfig?.accountNumber || '1109482019'}]`;
            case 'COOP_CONNECT':
                return `Co-operative Bank account [${institution?.coopConfig?.accountNumber || '01129000458100'}]`;
            case 'EQUITY_JENGA':
                return `Equity Bank account [${institution?.equityConfig?.accountNumber || '0810294820194'}]`;
            case 'NCBA_DIRECT':
                return `NCBA Bank account [${institution?.ncbaConfig?.accountNumber || '7700089957'}]`;
            case 'IM_BANK':
                return `I&M Bank account [${institution?.imBankConfig?.accountNumber || '0019283746'}]`;
            default:
                return `National Bank account [7700089957]`;
        }
    }, [accounts, institution]);

    // ── Helper 2: Extract Genuine Alphanumeric Transaction Code (e.g. "UJ1F48QRBS") ──
    const extractRealTransactionCode = useCallback((row: any): string => {
        const meta = row.metadata || {};
        const raw = row.raw_payload || row.payload || {};

        const candidates = [
            row.mpesa_receipt_number,
            row.receipt_number,
            row.transaction_reference,
            row.reference,
            row.trans_id,
            row.transId,
            row.transID,
            meta.transactionReference,
            meta.transaction_reference,
            meta.mpesaReceiptNumber,
            meta.mpesa_receipt_number,
            meta.transID,
            meta.transId,
            meta.TransID,
            meta.receiptNumber,
            meta.retrievalRefNo,
            meta.uniqueID,
            meta.offlineUniqueID,
            meta.reference,
            meta.referenceNumber,
            raw.transactionReference,
            raw.transaction_reference,
            raw.transactionID,
            raw.transID,
            raw.transId,
            raw.mpesaReceiptNumber,
            raw.retrievalRefNo,
            raw.reference,
            row.transaction_id,
            row.checkout_request_id,
            row.id
        ];

        // Priority 1: Genuine alphanumeric code (e.g. UJ1F48QRBS, FT260822009, TL12345678)
        for (const c of candidates) {
            if (!c) continue;
            const s = String(c).trim();
            if (/^(txn_|kcb_ipn_|kcb_1\d{8,}|msg_|mock_|feed_)/i.test(s)) continue;
            if (/^[A-Za-z0-9]{7,18}$/.test(s) && /[A-Za-z]/.test(s) && /\d/.test(s)) {
                return s.toUpperCase();
            }
        }

        // Priority 2: Extract code embedded in narration
        const narration = String(row.narration || meta.narration || raw.narration || '').trim();
        if (narration) {
            const codeMatch = narration.match(/\b([A-Z0-9]{8,15})\b/);
            if (codeMatch && /[A-Za-z]/.test(codeMatch[1]) && /\d/.test(codeMatch[1]) && !/^(kcb|bank|mpesa)/i.test(codeMatch[1])) {
                return codeMatch[1].toUpperCase();
            }
        }

        // Priority 3: Non-internal candidate string
        for (const c of candidates) {
            if (!c) continue;
            const s = String(c).trim();
            if (!/^(txn_|kcb_ipn_|kcb_1\d{8,}|msg_|mock_|feed_)/i.test(s) && s.length >= 6) {
                return s.toUpperCase();
            }
        }

        // Priority 4: Fallback
        return row.transaction_id || row.reference || row.checkout_request_id || row.id || 'N/A';
    }, []);

    // ── Helper 3: Extract Payer Name (never returns blank or generic 'Customer' if identifiable) ──
    const extractPayerName = useCallback((row: any, matchedStudent?: any): string => {
        const meta = row.metadata || {};
        const raw = row.raw_payload || row.payload || {};

        const candidates = [
            row.payer_name,
            row.customer_name,
            row.customerName,
            row.payerName,
            row.sender_name,
            row.senderName,
            meta.customerName,
            meta.customer_name,
            meta.payerName,
            meta.payer_name,
            meta.senderName,
            meta.sender_name,
            meta.clientName,
            meta.client_name,
            meta.firstName && `${meta.firstName} ${meta.lastName || ''}`.trim(),
            meta.FirstName && `${meta.FirstName} ${meta.LastName || ''}`.trim(),
            raw.customerName,
            raw.customer_name,
            raw.payerName,
            raw.payer_name,
            raw.sender_name,
            raw.senderName,
            raw.firstName && `${raw.firstName} ${raw.lastName || ''}`.trim(),
            raw.FirstName && `${raw.FirstName} ${raw.LastName || ''}`.trim(),
            row.first_name && `${row.first_name} ${row.last_name || ''}`.trim()
        ];

        for (const c of candidates) {
            if (!c) continue;
            const s = String(c).trim();
            if (s && !/^(customer|none|null|undefined|bank depositor|n\/a)$/i.test(s)) {
                return s;
            }
        }

        // Check narration for names (e.g. "FROM MARY WANJIKU", "DEP BY JOHN DOE")
        const narration = String(row.narration || meta.narration || raw.narration || '').trim();
        if (narration) {
            const fromMatch = narration.match(/(?:from|dep\s+by|by|deposit\s+from|payer:?)\s+([A-Za-z\s]{3,30})/i);
            if (fromMatch && fromMatch[1]) {
                const extracted = fromMatch[1].trim();
                if (extracted.length >= 3 && !/^(kcb|bank|account|cash|mpesa|transfer)/i.test(extracted)) {
                    return extracted;
                }
            }
        }

        // Matched student parent/guardian fallback
        if (matchedStudent) {
            const parent = matchedStudent.parentName || matchedStudent.guardianName || matchedStudent.fatherName || matchedStudent.motherName;
            if (parent && String(parent).trim()) {
                return String(parent).trim();
            }
            const sName = matchedStudent.name || matchedStudent.fullName;
            if (sName) {
                return `${sName} (Parent)`;
            }
        }

        return 'Parent / Depositor';
    }, []);

    // ── Helper 4: Extract Bill / Customer Reference ──
    const extractBillReference = useCallback((row: any): string => {
        const meta = row.metadata || {};
        const raw = row.raw_payload || row.payload || {};

        const candidates = [
            row.bill_ref_number,
            row.customer_reference,
            row.account_reference,
            meta.billReferenceNumber,
            meta.bill_ref_number,
            meta.customerReference,
            meta.customer_reference,
            meta.accountReference,
            meta.account_reference,
            meta.businessKey,
            raw.billReferenceNumber,
            raw.customerReference,
            raw.accountReference,
            raw.businessKey
        ];

        for (const c of candidates) {
            if (!c) continue;
            const s = String(c).trim();
            if (s && !/^(none|null|undefined)$/i.test(s)) {
                return s;
            }
        }
        return '';
    }, []);

    // ── 2. Match Student & Receipt Helper ──
    const matchTransactionDetails = useCallback((
        rawRef: string,
        rawBillRef: string,
        rawPayerName: string,
        rawPhone: string,
        rawAmount: number
    ) => {
        const cleanRef = String(rawRef || '').toUpperCase().trim();
        const cleanBill = String(rawBillRef || '').trim();
        const parsedAdm = parseAdmissionNumberFromRef(cleanBill);
        const cleanPhoneDigits = String(rawPhone || '').replace(/\D/g, '').slice(-9);

        // 1. Direct match with system Receipts
        const matchedReceipt = receipts.find(r => {
            const relId = String(r.relatedTransactionId || r.related_transaction_id || '').toUpperCase().trim();
            const rNum = String(r.receiptNumber || r.receipt_number || '').toUpperCase().trim();
            const remarks = String(r.remarks || '').toUpperCase();
            return (cleanRef && (relId === cleanRef || rNum === cleanRef || remarks.includes(cleanRef)));
        });

        if (matchedReceipt) {
            const studentMatch = students.find(s => s.id === (matchedReceipt.studentId || matchedReceipt.student_id));
            return {
                status: 'MATCHED_AND_RECEIPTED' as const,
                matchedStudentId: matchedReceipt.studentId || matchedReceipt.student_id,
                matchedStudentName: matchedReceipt.studentName || matchedReceipt.student_name,
                matchedStudentAdm: matchedReceipt.admissionNumber || matchedReceipt.admission_number || parsedAdm || cleanBill,
                matchedStudent: studentMatch,
                generatedReceiptId: matchedReceipt.id,
                generatedReceiptNumber: matchedReceipt.receiptNumber || matchedReceipt.receipt_number,
                confidence: 'EXACT_ADM' as const
            };
        }

        // 2. Direct ADM matching against students (supports 8145955-201 -> 201)
        if ((parsedAdm || cleanBill) && students.length > 0) {
            const admToTest = (parsedAdm || cleanBill).toLowerCase().trim();
            const admDigits = admToTest.replace(/\D/g, '');
            const rawLower = cleanBill.toLowerCase().trim();

            const studentMatch = students.find(s => {
                const sAdm = String(s.admissionNumber || s.admission_number || '').toLowerCase().trim();
                const sAdmDigits = sAdm.replace(/\D/g, '');

                if (sAdm && sAdm === admToTest) return true;
                if (admDigits.length >= 1 && sAdmDigits === admDigits) return true;
                if (sAdm && sAdm === rawLower) return true;
                if (sAdm && (cleanBill.endsWith('-' + sAdm) || cleanBill.endsWith('/' + sAdm))) return true;

                return false;
            });

            if (studentMatch) {
                return {
                    status: 'MATCHED_AND_RECEIPTED' as const,
                    matchedStudentId: studentMatch.id,
                    matchedStudentName: studentMatch.name || studentMatch.fullName,
                    matchedStudentAdm: studentMatch.admissionNumber || studentMatch.admission_number || parsedAdm,
                    matchedStudent: studentMatch,
                    generatedReceiptId: undefined,
                    generatedReceiptNumber: undefined,
                    confidence: 'EXACT_ADM' as const
                };
            }
        }

        // 3. Fallback: Phone matching
        if (cleanPhoneDigits.length >= 9 && students.length > 0) {
            const studentMatch = students.find(s => {
                const p1 = String(s.parentPhone || s.parent_phone || s.phone || '').replace(/\D/g, '').slice(-9);
                const p2 = String(s.guardianPhone || s.fatherPhone || s.motherPhone || '').replace(/\D/g, '').slice(-9);
                return p1 === cleanPhoneDigits || p2 === cleanPhoneDigits;
            });

            if (studentMatch) {
                return {
                    status: 'MATCHED_AND_RECEIPTED' as const,
                    matchedStudentId: studentMatch.id,
                    matchedStudentName: studentMatch.name || studentMatch.fullName,
                    matchedStudentAdm: studentMatch.admissionNumber || studentMatch.admission_number,
                    matchedStudent: studentMatch,
                    generatedReceiptId: undefined,
                    generatedReceiptNumber: undefined,
                    confidence: 'EXACT_PHONE' as const
                };
            }
        }

        // 4. Fallback: Multi-word name matching
        if (rawPayerName && rawPayerName.length >= 5 && students.length > 0) {
            const cleanPayer = rawPayerName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            const tokens = cleanPayer.split(/\s+/).filter(t => t.length >= 2);
            if (tokens.length >= 2) {
                const candidateMatches = students.filter(s => {
                    const sName = String(s.name || s.fullName || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                    const sTokens = sName.split(/\s+/).filter(t => t.length >= 2);
                    return tokens.every(t => sTokens.includes(t)) || sName === cleanPayer;
                });

                if (candidateMatches.length === 1) {
                    const candidate = candidateMatches[0];
                    return {
                        status: 'MATCHED_AND_RECEIPTED' as const,
                        matchedStudentId: candidate.id,
                        matchedStudentName: candidate.name || candidate.fullName,
                        matchedStudentAdm: candidate.admissionNumber || candidate.admission_number,
                        matchedStudent: candidate,
                        generatedReceiptId: undefined,
                        generatedReceiptNumber: undefined,
                        confidence: 'NAME_MATCH' as const
                    };
                }
            }
        }

        // 5. Unmatched
        return {
            status: 'UNMATCHED_SUSPENSE' as const,
            matchedStudentId: undefined,
            matchedStudentName: undefined,
            matchedStudentAdm: parsedAdm || undefined,
            matchedStudent: undefined,
            generatedReceiptId: undefined,
            generatedReceiptNumber: undefined,
            confidence: 'NONE' as const
        };
    }, [receipts, students, parseAdmissionNumberFromRef]);

    // ── 3. Fetch Real Transactions From DB with Smart Deduplication ──
    const fetchRealTransactions = useCallback(async () => {
        if (!institution?.id) return;
        setIsRefreshing(true);

        try {
            const instId = institution.id;
            const [mpesaRes, bankRes, feedRes] = await Promise.all([
                apiService.fetchModuleRecords<any>('mpesa_transactions', instId, undefined, { order: 'created_at.desc', limit: 300 }).catch(() => []),
                apiService.fetchModuleRecords<any>('bank_transactions', instId, undefined, { order: 'created_at.desc', limit: 300 }).catch(() => []),
                apiService.fetchModuleRecords<any>('bank_feed_transactions', instId, undefined, { order: 'created_at.desc', limit: 300 }).catch(() => [])
            ]);

            const aggregated: IngestedTransaction[] = [];
            const seenRefs = new Set<string>();

            // Process mpesa_transactions (contains KCB, M-Pesa, etc.)
            (mpesaRes || []).forEach((row: any) => {
                const realRef = extractRealTransactionCode(row);
                const billRef = extractBillReference(row);
                const phone = row.phone_number || row.customer_mobile_number || row.msisdn || '';
                const amount = Number(row.amount) || 0;

                // Smart deduplication: Avoid duplicate entries if bank_transactions or double-logged
                if (realRef && !realRef.startsWith('N/A') && seenRefs.has(realRef)) return;
                if (realRef && !realRef.startsWith('N/A')) seenRefs.add(realRef);

                const timeKey = String(row.created_at || row.timestamp || '').slice(0, 16);
                const dedupSig = `${amount}_${phone || billRef}_${timeKey}`;
                if (seenRefs.has(dedupSig)) return;
                if (amount > 0 && (phone || billRef)) seenRefs.add(dedupSig);

                const rawProvider = String(row.provider || '').toLowerCase();
                let provider: IngestedTransaction['provider'] = 'MPESA_DARAJA';
                if (rawProvider.includes('kcb')) provider = 'KCB_BUNI';
                else if (rawProvider.includes('coop')) provider = 'COOP_CONNECT';
                else if (rawProvider.includes('equity')) provider = 'EQUITY_JENGA';
                else if (rawProvider.includes('ncba')) provider = 'NCBA_DIRECT';

                const matchInfo = matchTransactionDetails(realRef, billRef, '', phone, amount);
                const payerName = extractPayerName(row, matchInfo.matchedStudent);

                aggregated.push({
                    id: row.id || `txn_${realRef}`,
                    institutionId: instId,
                    provider,
                    transactionReference: realRef,
                    billReferenceNumber: billRef,
                    payerName,
                    payerPhone: phone,
                    amount,
                    transactionDate: row.timestamp || row.created_at || new Date().toISOString().split('T')[0],
                    status: matchInfo.status,
                    matchedStudentId: matchInfo.matchedStudentId,
                    matchedStudentName: matchInfo.matchedStudentName,
                    matchedStudentAdm: matchInfo.matchedStudentAdm,
                    generatedReceiptId: matchInfo.generatedReceiptId,
                    generatedReceiptNumber: matchInfo.generatedReceiptNumber,
                    reconciliationConfidence: matchInfo.confidence,
                    rawPayload: row.raw_payload || row.metadata,
                    createdAt: row.created_at || row.timestamp || new Date().toISOString()
                });
            });

            // Process bank_transactions
            (bankRes || []).forEach((row: any) => {
                const realRef = extractRealTransactionCode(row);
                const payload = row.payload || {};
                const billRef = extractBillReference(row);
                const phone = payload.phoneNumber || payload.phone || '';
                const amount = Number(row.amount) || 0;

                // Smart deduplication against mpesa_transactions
                if (realRef && !realRef.startsWith('N/A') && seenRefs.has(realRef)) return;
                if (realRef && !realRef.startsWith('N/A')) seenRefs.add(realRef);

                const timeKey = String(row.created_at || row.transaction_date || '').slice(0, 16);
                const dedupSig = `${amount}_${phone || billRef}_${timeKey}`;
                if (seenRefs.has(dedupSig)) return;
                if (amount > 0 && (phone || billRef)) seenRefs.add(dedupSig);

                const bankName = String(row.bank_name || '').toLowerCase();
                let provider: IngestedTransaction['provider'] = 'KCB_BUNI';
                if (bankName.includes('kcb')) provider = 'KCB_BUNI';
                else if (bankName.includes('coop') || bankName.includes('co-op')) provider = 'COOP_CONNECT';
                else if (bankName.includes('equity')) provider = 'EQUITY_JENGA';
                else if (bankName.includes('ncba')) provider = 'NCBA_DIRECT';
                else if (bankName.includes('mpesa') || bankName.includes('daraja')) provider = 'MPESA_DARAJA';

                const matchInfo = matchTransactionDetails(realRef, billRef, '', phone, amount);
                const payerName = extractPayerName(row, matchInfo.matchedStudent);

                aggregated.push({
                    id: row.id || `txn_${realRef}`,
                    institutionId: instId,
                    provider,
                    transactionReference: realRef,
                    billReferenceNumber: billRef,
                    payerName,
                    payerPhone: phone,
                    amount,
                    transactionDate: row.transaction_date || row.created_at || new Date().toISOString().split('T')[0],
                    status: matchInfo.status,
                    matchedStudentId: matchInfo.matchedStudentId,
                    matchedStudentName: matchInfo.matchedStudentName,
                    matchedStudentAdm: matchInfo.matchedStudentAdm,
                    generatedReceiptId: matchInfo.generatedReceiptId,
                    generatedReceiptNumber: matchInfo.generatedReceiptNumber,
                    reconciliationConfidence: matchInfo.confidence,
                    rawPayload: payload,
                    createdAt: row.created_at || row.transaction_date || new Date().toISOString()
                });
            });

            // Process bank_feed_transactions
            (feedRes || []).forEach((row: any) => {
                const realRef = extractRealTransactionCode(row);
                const billRef = extractBillReference(row);
                const amount = Number(row.amount) || 0;

                if (realRef && !realRef.startsWith('N/A') && seenRefs.has(realRef)) return;
                if (realRef && !realRef.startsWith('N/A')) seenRefs.add(realRef);

                const matchInfo = matchTransactionDetails(realRef, billRef, '', '', amount);
                const payerName = extractPayerName(row, matchInfo.matchedStudent);

                aggregated.push({
                    id: row.id || `txn_${realRef}`,
                    institutionId: instId,
                    provider: (row.provider as any) || 'KCB_BUNI',
                    transactionReference: realRef,
                    billReferenceNumber: billRef,
                    payerName,
                    amount,
                    transactionDate: row.created_at || new Date().toISOString().split('T')[0],
                    status: matchInfo.status,
                    matchedStudentId: matchInfo.matchedStudentId,
                    matchedStudentName: matchInfo.matchedStudentName,
                    matchedStudentAdm: matchInfo.matchedStudentAdm,
                    generatedReceiptId: matchInfo.generatedReceiptId,
                    generatedReceiptNumber: matchInfo.generatedReceiptNumber,
                    reconciliationConfidence: matchInfo.confidence,
                    createdAt: row.created_at || new Date().toISOString()
                });
            });

            // Sort newest first
            aggregated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setLiveTransactions(aggregated);
            setLastSyncedAt(new Date().toISOString());
        } catch (err) {
            console.error('[BankFeedsManager] Failed to fetch real transactions:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [institution?.id, matchTransactionDetails, extractRealTransactionCode, extractBillReference, extractPayerName]);

    // Initial load
    useEffect(() => {
        fetchRealTransactions();
    }, [fetchRealTransactions]);

    // ── 4. Supabase Realtime Listener ──
    useEffect(() => {
        if (!supabase || !institution?.id) return;
        const instId = institution.id;

        const channel = supabase.channel(`bank_feeds_realtime_${instId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'mpesa_transactions', filter: `institution_id=eq.${instId}` },
                () => {
                    fetchRealTransactions();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bank_transactions', filter: `institution_id=eq.${instId}` },
                () => {
                    fetchRealTransactions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [institution?.id, fetchRealTransactions]);

    // Sample data used ONLY when user explicitly toggles preview
    const samplePreviewData: IngestedTransaction[] = useMemo(() => [
        {
            id: 'txn_kcb_preview_1',
            institutionId: institution?.id || '',
            provider: 'KCB_BUNI',
            transactionReference: 'KCB8940219X',
            billReferenceNumber: students[0]?.admissionNumber || students[0]?.admission_number || '3175',
            payerName: 'David Omondi',
            payerPhone: '0722000000',
            amount: 8500,
            transactionDate: new Date().toISOString().split('T')[0],
            status: 'MATCHED_AND_RECEIPTED',
            matchedStudentId: students[0]?.id || 'st_1',
            matchedStudentName: students[0]?.name || students[0]?.fullName || 'Student One',
            matchedStudentAdm: students[0]?.admissionNumber || students[0]?.admission_number || '3175',
            generatedReceiptId: 'rec_sample_kcb',
            generatedReceiptNumber: 'RCPT-KCB-101',
            reconciliationConfidence: 'EXACT_ADM',
            createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
            id: 'txn_mpesa_sample_1',
            institutionId: institution?.id || '',
            provider: 'MPESA_DARAJA',
            transactionReference: 'UH92KLP8X2',
            billReferenceNumber: '3175',
            payerName: 'Latricia Kedolwa',
            payerPhone: '0712345678',
            amount: 5000,
            transactionDate: new Date().toISOString().split('T')[0],
            status: 'MATCHED_AND_RECEIPTED',
            matchedStudentId: 'st_1',
            matchedStudentName: 'Latricia Kedolwa',
            matchedStudentAdm: '3175',
            generatedReceiptId: 'rec_sample_1',
            generatedReceiptNumber: 'RCPT-1301',
            reconciliationConfidence: 'EXACT_ADM',
            createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
        }
    ], [institution?.id, students]);

    // Active transactions list: prefer live transactions; fallback to sample ONLY if user toggles demo preview
    const transactions = useMemo(() => {
        if (showDemoPreview) {
            return samplePreviewData;
        }
        return liveTransactions;
    }, [showDemoPreview, samplePreviewData, liveTransactions]);

    // ── Filtered Transactions ──
    const filteredTxns = useMemo(() => {
        return transactions.filter(t => {
            if (filterStatus === 'MATCHED' && t.status !== 'MATCHED_AND_RECEIPTED') return false;
            if (filterStatus === 'SUSPENSE' && t.status !== 'UNMATCHED_SUSPENSE') return false;
            if (providerFilter !== 'ALL' && t.provider !== providerFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const ref = String(t.transactionReference || '').toLowerCase();
                const bill = String(t.billReferenceNumber || '').toLowerCase();
                const payer = String(t.payerName || '').toLowerCase();
                const studentName = String(t.matchedStudentName || '').toLowerCase();
                const studentAdm = String(t.matchedStudentAdm || '').toLowerCase();
                const phone = String(t.payerPhone || '').toLowerCase();
                return ref.includes(q) || bill.includes(q) || payer.includes(q) || studentName.includes(q) || studentAdm.includes(q) || phone.includes(q);
            }

            return true;
        });
    }, [transactions, filterStatus, providerFilter, searchQuery]);

    const totalIngestedVolume = useMemo(() => {
        return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }, [transactions]);

    const matchedCount = useMemo(() => {
        return transactions.filter(t => t.status === 'MATCHED_AND_RECEIPTED').length;
    }, [transactions]);

    const suspenseCount = useMemo(() => {
        return transactions.filter(t => t.status === 'UNMATCHED_SUSPENSE').length;
    }, [transactions]);

    // ── Simulate Incoming Inflow ──
    const handleTriggerWebhookSimulation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!simAmount || Number(simAmount) <= 0) {
            alert('Please specify a valid transaction amount.');
            return;
        }

        setIsProcessingSim(true);
        try {
            const res = await BankFeedsService.processIncomingMpesaC2B({
                TransID: simTransId,
                TransAmount: Number(simAmount),
                BillRefNumber: simBillRef,
                MSISDN: simPhone,
                FirstName: simPayer.split(' ')[0] || '',
                LastName: simPayer.split(' ')[1] || '',
                institutionId: institution.id,
                students
            });

            if (res.success) {
                // Ensure provider matches simulation selection
                const newTxn = { ...res.transaction, provider: simProvider };

                // Persist into mpesa_transactions table
                try {
                    await apiService.saveModuleRecord('mpesa_transactions', {
                        id: newTxn.id,
                        transaction_id: newTxn.transactionReference,
                        institution_id: institution.id,
                        amount: newTxn.amount,
                        phone_number: newTxn.payerPhone,
                        payer_name: newTxn.payerName,
                        status: 'completed',
                        provider: simProvider === 'KCB_BUNI' ? 'kcb' : 'mpesa',
                        bill_ref_number: newTxn.billReferenceNumber,
                        customer_reference: newTxn.billReferenceNumber,
                        created_at: newTxn.createdAt
                    });
                } catch (persistErr) {
                    console.warn('[BankFeedsManager] Could not persist simulated transaction to DB:', persistErr);
                }

                setLiveTransactions(prev => [newTxn, ...prev]);

                if (onReceiptCreated && newTxn.generatedReceiptId) {
                    onReceiptCreated({
                        id: newTxn.generatedReceiptId,
                        receiptNumber: newTxn.generatedReceiptNumber,
                        studentId: newTxn.matchedStudentId,
                        studentName: newTxn.matchedStudentName,
                        amountPaid: newTxn.amount,
                        paymentMethod: simProvider === 'KCB_BUNI' ? 'KCB Direct' : 'M-Pesa',
                        paymentDate: newTxn.transactionDate,
                        relatedTransactionId: newTxn.transactionReference,
                        remarks: `Automated Ingestion Feed: ${newTxn.transactionReference}`
                    });
                }

                if (onLogAction) {
                    onLogAction(`Processed ${simProvider.replace('_', ' ')} feed: ${newTxn.transactionReference} for KSh ${Number(simAmount).toLocaleString()}`);
                }

                alert(`✓ Inflow Ingestion Successful!\n\n${res.message}`);
                setIsSimulating(false);
                setSimTransId(`${simProvider === 'KCB_BUNI' ? 'KCB' : 'TXN'}${Math.floor(100000 + Math.random() * 900000)}`);
            }
        } catch (err: any) {
            console.error('Webhook simulation failed:', err);
            alert('Webhook simulation failed. Please try again.');
        } finally {
            setIsProcessingSim(false);
        }
    };

    // ── Manual Suspense Linking ──
    const handleResolveSuspense = async () => {
        if (!suspenseTargetTxn || !selectedStudentForSuspense) return;
        const targetStudent = students.find(s => s.id === selectedStudentForSuspense);
        if (!targetStudent) return;

        setIsAssigningSuspense(true);
        try {
            const receiptNumber = `RCPT-${suspenseTargetTxn.transactionReference.slice(-4)}-${Date.now().toString().slice(-4)}`;
            const receiptId = `rec_feed_${Date.now()}`;

            // Save new receipt
            await apiService.saveModuleRecord('receipts', {
                id: receiptId,
                receipt_number: receiptNumber,
                student_id: targetStudent.id,
                student_name: targetStudent.name || targetStudent.fullName,
                admission_number: targetStudent.admissionNumber || targetStudent.admission_number,
                amount_paid: suspenseTargetTxn.amount,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: suspenseTargetTxn.provider === 'KCB_BUNI' ? 'KCB IPN' : 'M-Pesa',
                related_transaction_id: suspenseTargetTxn.transactionReference,
                institution_id: institution.id,
                remarks: `Manual reconciliation from ${suspenseTargetTxn.provider} Suspense queue`
            });

            // Update live transaction state
            setLiveTransactions(prev => prev.map(t => {
                if (t.id === suspenseTargetTxn.id) {
                    return {
                        ...t,
                        status: 'MATCHED_AND_RECEIPTED',
                        matchedStudentId: targetStudent.id,
                        matchedStudentName: targetStudent.name || targetStudent.fullName,
                        matchedStudentAdm: targetStudent.admissionNumber || targetStudent.admission_number,
                        generatedReceiptId: receiptId,
                        generatedReceiptNumber: receiptNumber,
                        reconciliationConfidence: 'MANUAL'
                    };
                }
                return t;
            }));

            if (onReceiptCreated) {
                onReceiptCreated({
                    id: receiptId,
                    receiptNumber,
                    studentId: targetStudent.id,
                    studentName: targetStudent.name || targetStudent.fullName,
                    amountPaid: suspenseTargetTxn.amount,
                    paymentMethod: suspenseTargetTxn.provider === 'KCB_BUNI' ? 'KCB Direct' : 'M-Pesa',
                    paymentDate: new Date().toISOString().split('T')[0],
                    relatedTransactionId: suspenseTargetTxn.transactionReference,
                    remarks: `Manual reconciliation for ${suspenseTargetTxn.transactionReference}`
                });
            }

            if (onLogAction) {
                onLogAction(`Manually resolved suspense payment ${suspenseTargetTxn.transactionReference} for student ${targetStudent.name}`);
            }

            alert(`✓ Transaction assigned to ${targetStudent.name}! Receipt ${receiptNumber} created.`);
            setSuspenseTargetTxn(null);
            setSelectedStudentForSuspense('');
        } catch (err: any) {
            console.error('Failed to link suspense transaction:', err);
            alert('Failed to link transaction: ' + (err.message || 'Unknown error'));
        } finally {
            setIsAssigningSuspense(false);
        }
    };

    const isKcbConnected = useMemo(() => {
        const kcbConfig = institution?.kcbConfig || institution?.kcb_config || {};
        return Boolean(
            kcbConfig.appKey || 
            kcbConfig.shortCode || 
            kcbConfig.short_code || 
            kcbConfig.tillNumber || 
            kcbConfig.accountNumber ||
            kcbConfig.account_number ||
            kcbConfig.enabled === true
        );
    }, [institution]);

    const activeConnectorsCount = useMemo(() => {
        return accounts.filter(a => a.status === 'ACTIVE').length;
    }, [accounts]);

    const activeConnectorNames = useMemo(() => {
        return accounts
            .filter(a => a.status === 'ACTIVE')
            .map(a => a.provider.replace('_', ' '))
            .join(', ') || 'None';
    }, [accounts]);

    return (
        <div className="space-y-6">
            {/* ── Top Hero Banner ── */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <SignalIcon className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                                {isKcbConnected ? 'KCB Gateway Connected' : 'Live Real-Time Gateway'}
                            </span>
                            <span className="px-3 py-1 bg-white/10 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                                M-Pesa Daraja &amp; Multi-Bank APIs
                            </span>
                            {showDemoPreview && (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    Demo Preview Active
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Direct Banking &amp; Payment Feeds</h2>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                            Continuous real-time ingestion from KCB Buni, M-Pesa C2B, Co-op Bank, and Equity Bank. Instant automated receipting and ledger crediting.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fetchRealTransactions()}
                            disabled={isRefreshing}
                            className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                            title="Refresh live bank transactions from database"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSimulating(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <SparklesIcon className="w-4 h-4" /> Simulate Inflow
                        </button>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Live Inflows</p>
                        <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                            KSh {totalIngestedVolume.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{transactions.length} Total Events</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Auto-Matched Rate</p>
                        <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                            {transactions.length > 0 ? Math.round((matchedCount / transactions.length) * 100) : 100}%
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{matchedCount} Instantly Receipted</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Bank Connectors</p>
                        <p className="text-lg sm:text-xl font-black text-indigo-400 mt-0.5">
                            {activeConnectorsCount} / {accounts.length}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 truncate" title={activeConnectorNames}>
                            {activeConnectorNames}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suspense Queue</p>
                        <p className={`text-lg sm:text-xl font-black mt-0.5 ${suspenseCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {suspenseCount} Unmatched
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Awaiting Student Matching</p>
                    </div>
                </div>
            </div>

            {/* ── Sub-Navigation Tabs ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                    {[
                        { id: 'live_feed', label: 'Live Payment Stream', icon: SignalIcon },
                        { id: 'accounts', label: 'Connected Bank Accounts', icon: BuildingLibraryIcon },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                    active
                                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Demo preview toggle */}
                <div className="flex items-center gap-2">
                    {liveTransactions.length === 0 && (
                        <button
                            type="button"
                            onClick={() => setShowDemoPreview(prev => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                showDemoPreview
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {showDemoPreview ? '✕ Exit Demo Preview' : '👁 Preview Sample Stream'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── TAB 1: LIVE PAYMENT STREAM ── */}
            {activeTab === 'live_feed' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    {/* Filter and Search Bar */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Real-Time Ingestion Stream</h3>
                                {isKcbConnected && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        KCB Live Listener
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Live webhook events ingested via KCB Buni, M-Pesa C2B, and connected bank APIs</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 md:w-60">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search ref, ADM, payer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                {(['ALL', 'MATCHED', 'SUSPENSE'] as const).map(st => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setFilterStatus(st)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            filterStatus === st
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Active State / Stream Table */}
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-wider">Connecting to Real-Time Payment Feeds...</p>
                        </div>
                    ) : filteredTxns.length === 0 ? (
                        <div className="py-16 px-6 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                                <SignalIcon className="w-8 h-8 animate-pulse" />
                            </div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                                {isKcbConnected ? 'KCB Gateway Connected & Listening' : 'Real-Time Feeds Active'}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                                {isKcbConnected 
                                    ? `Your school's KCB integration is configured and active. As soon as a parent makes a payment via your KCB Paybill, Till, or Bank Transfer, it will appear here in real time with automated O(1) receipting.`
                                    : `No live transactions recorded yet. Live payment events from your connected payment gateways will stream here automatically.`
                                }
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsSimulating(true)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>Simulate Test Payment</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDemoPreview(true)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                                >
                                    Preview Sample Data
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[#4b6b82] text-white text-xs font-bold border-b border-slate-300">
                                        <th className="px-4 py-3.5 border-r border-white/20 text-left">ID</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-left">Name</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-right">Amount</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-left">Reference</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-left">Paid By</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-left">Phone Number</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-left">Paid On</th>
                                        <th className="px-4 py-3.5 border-r border-white/20 text-center">Status</th>
                                        <th className="px-4 py-3.5 text-left">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {filteredTxns.map(txn => {
                                        const idVal = txn.matchedStudentAdm || parseAdmissionNumberFromRef(txn.billReferenceNumber || '') || txn.billReferenceNumber || (txn.matchedStudentId ? txn.matchedStudentId.slice(-4) : txn.id.slice(-4));
                                        const nameVal = txn.matchedStudentName || (students.find(s => s.id === txn.matchedStudentId)?.name) || (students.find(s => s.id === txn.matchedStudentId)?.fullName) || txn.payerName || 'Unassigned';
                                        const amountVal = (Number(txn.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        const refVal = txn.transactionReference;
                                        const paidByVal = txn.payerName || 'Unknown';
                                        const phoneVal = formatDisplayPhone(txn.payerPhone);
                                        const paidOnVal = formatPaidOn(txn.transactionDate || txn.createdAt);
                                        const isReconciled = txn.status === 'MATCHED_AND_RECEIPTED' || Boolean(txn.generatedReceiptNumber);
                                        const sourceVal = resolveSource(txn);

                                        return (
                                            <tr key={txn.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{idVal}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 text-xs">{nameVal}</td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 font-mono text-xs">{amountVal}</td>
                                                <td className="px-4 py-3 font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">{refVal}</td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{paidByVal}</td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 text-xs">{phoneVal}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">{paidOnVal}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {isReconciled ? (
                                                        <span className="inline-block px-2.5 py-0.5 rounded bg-[#5cb85c] text-white text-[11px] font-bold tracking-wide shadow-sm">
                                                            Reconciled
                                                        </span>
                                                    ) : txn.status === 'UNMATCHED_SUSPENSE' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSuspenseTargetTxn(txn);
                                                                setSelectedStudentForSuspense(students[0]?.id || '');
                                                            }}
                                                            className="inline-block px-2.5 py-0.5 rounded bg-[#f0ad4e] hover:bg-[#ec971f] text-white text-[11px] font-bold tracking-wide shadow-sm transition-all cursor-pointer"
                                                            title="Click to link student"
                                                        >
                                                            Pending (Link)
                                                        </button>
                                                    ) : (
                                                        <span className="inline-block px-2.5 py-0.5 rounded bg-[#f0ad4e] text-white text-[11px] font-bold tracking-wide shadow-sm">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span>{sourceVal}</span>
                                                        {txn.generatedReceiptNumber && (
                                                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono shrink-0 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800" title="Receipt Number">
                                                                #{txn.generatedReceiptNumber}
                                                            </span>
                                                        )}
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
            )}

            {/* ── TAB 2: CONNECTED BANK ACCOUNTS ── */}
            {activeTab === 'accounts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {accounts.map(acc => {
                        const isKcb = acc.provider === 'KCB_BUNI';
                        const isMpesa = acc.provider === 'MPESA_DARAJA';
                        const isActive = acc.status === 'ACTIVE';

                        return (
                            <div key={acc.id} className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 space-y-4 shadow-sm transition-all ${
                                isActive 
                                    ? 'border-emerald-500/40 hover:border-emerald-500' 
                                    : 'border-slate-200 dark:border-slate-800 opacity-80'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                            isActive
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>
                                            {isMpesa ? <DevicePhoneMobileIcon className="w-6 h-6" /> : <BuildingLibraryIcon className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-base font-black text-slate-900 dark:text-white">{acc.accountName}</h4>
                                                {isKcb && isActive && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase">
                                                        KCB Buni
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                                                {acc.paybillOrTillNumber ? `Paybill/ShortCode: ${acc.paybillOrTillNumber}` : `Acc No: ${acc.accountNumber}`}
                                            </p>
                                        </div>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                        isActive
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                                        {isActive ? 'ACTIVE' : 'DISCONNECTED'}
                                    </span>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Ingested Volume</p>
                                        <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                            KSh {acc.balance.toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        Last checked: {new Date(acc.lastSyncedAt).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── MODAL: Suspense Resolver (Link to Student) ── */}
            {suspenseTargetTxn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <CheckBadgeIcon className="w-5 h-5 text-amber-500" />
                                    Link Suspense Transaction
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Ref: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{suspenseTargetTxn.transactionReference}</span> · KSh {suspenseTargetTxn.amount.toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSuspenseTargetTxn(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                                <p className="font-bold">Payer: {suspenseTargetTxn.payerName}</p>
                                <p className="font-mono text-[11px] mt-0.5">Account Key Entered: "{suspenseTargetTxn.billReferenceNumber || 'None'}"</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Select Matching Student</label>
                                <select
                                    value={selectedStudentForSuspense}
                                    onChange={(e) => setSelectedStudentForSuspense(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">-- Choose student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name || s.fullName} (ADM: {s.admissionNumber || s.admission_number || 'N/A'}) - {s.class || s.gradeLevel || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSuspenseTargetTxn(null)}
                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResolveSuspense}
                                    disabled={isAssigningSuspense || !selectedStudentForSuspense}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                                >
                                    {isAssigningSuspense ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircleIcon className="w-4 h-4" />
                                    )}
                                    <span>Create Receipt &amp; Credit Ledger</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: Webhook Simulation Console ── */}
            {isSimulating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-emerald-500" />
                                    Live Inflow Webhook Simulator
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Test real-time KCB Buni or M-Pesa C2B validation and auto-receipting</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSimulating(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTriggerWebhookSimulation} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Provider Gateway</label>
                                <select
                                    value={simProvider}
                                    onChange={(e) => setSimProvider(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="KCB_BUNI">🏦 KCB Bank Buni Gateway</option>
                                    <option value="MPESA_DARAJA">📱 M-Pesa C2B Paybill</option>
                                    <option value="COOP_CONNECT">🏦 Co-operative Bank Direct Feed</option>
                                    <option value="EQUITY_JENGA">🏦 Equity Bank Jenga API</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Trans Reference Code</label>
                                    <input
                                        type="text"
                                        value={simTransId}
                                        onChange={(e) => setSimTransId(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Amount (KSh)</label>
                                    <input
                                        type="number"
                                        value={simAmount}
                                        onChange={(e) => setSimAmount(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Student Admission No. / BillRefNumber</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 3175"
                                    value={simBillRef}
                                    onChange={(e) => setSimBillRef(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">This is the account number entered by the parent during payment</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Payer Name</label>
                                    <input
                                        type="text"
                                        value={simPayer}
                                        onChange={(e) => setSimPayer(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={simPhone}
                                        onChange={(e) => setSimPhone(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSimulating(false)}
                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessingSim}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                                >
                                    {isProcessingSim ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <SignalIcon className="w-4 h-4" />
                                    )}
                                    <span>Fire Webhook Event</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
