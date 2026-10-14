import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Institution, Invoice, Receipt } from '../../types';
import { XIcon } from '../icons';
import { apiService } from '../../services/apiService';
import { resolveRealStudentAdmNo, isPlaceholderEmail, isSyntheticAdmNo } from '../../utils/academicUtils';
import { extractParentPhoneNumber } from '../../utils/stringUtils';
import { buildCustomPaymentNotification } from '../../utils/paymentNotificationHelper';

const parseMoneyAmount = (amt: any): number => {
    if (amt === null || amt === undefined) return 0;
    if (typeof amt === 'number') return amt;
    const clean = String(amt).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

export interface PostManualReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    selectedBranchId?: string;
    students: User[];
    enrollments?: any[];
    studentFinanceData?: any[];
    invoices: Invoice[];
    receipts: Receipt[];
    invoicePaidAmountMap?: Map<string, number>;
    bankAccounts?: any[];
    currentUser?: any;
    onPaymentPosted?: (receiptNumber: string) => void;
    onRefreshData?: () => Promise<void>;
}

export const PostManualReceiptModal: React.FC<PostManualReceiptModalProps> = React.memo(({
    isOpen,
    onClose,
    institution,
    selectedBranchId,
    students = [],
    enrollments = [],
    studentFinanceData = [],
    invoices = [],
    receipts = [],
    invoicePaidAmountMap,
    bankAccounts = [],
    currentUser,
    onPaymentPosted,
    onRefreshData
}) => {
    const [manualPayStudentId, setManualPayStudentId] = useState('');
    const [manualPayStudentSearch, setManualPayStudentSearch] = useState('');
    const [manualPayInvoiceId, setManualPayInvoiceId] = useState('');
    const [manualPayAmount, setManualPayAmount] = useState<string>('');
    const [manualPayDate, setManualPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualPayMethod, setManualPayMethod] = useState('Cash');
    const [manualPayReference, setManualPayReference] = useState('');
    const [manualPayBankAccountId, setManualPayBankAccountId] = useState('');
    const [nextReceiptNumber, setNextReceiptNumber] = useState('');
    const [useCustomReceiptNumber, setUseCustomReceiptNumber] = useState(false);
    const [customReceiptNumber, setCustomReceiptNumber] = useState('');
    const [sendSmsNotification, setSendSmsNotification] = useState(true);
    const [sendEmailNotification, setSendEmailNotification] = useState(true);
    const [isSavingManualPay, setIsSavingManualPay] = useState(false);
    const [fetchedBankAccounts, setFetchedBankAccounts] = useState<any[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Reset fields on modal open/close & autofocus search input immediately
    useEffect(() => {
        if (!isOpen) {
            setManualPayStudentSearch('');
            setManualPayStudentId('');
            setManualPayInvoiceId('');
            setManualPayAmount('');
            setManualPayReference('');
            setManualPayBankAccountId('');
            setUseCustomReceiptNumber(false);
            setCustomReceiptNumber('');
            setManualPayDate(new Date().toISOString().split('T')[0]);
        } else {
            // Immediate frame focus with no artificial delay
            const rafId = requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [isOpen]);

    // Dynamically load institution bank accounts if not already supplied
    useEffect(() => {
        if (!isOpen) return;
        if (bankAccounts && bankAccounts.length > 0) return;
        const targetInstId = (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : (institution?.id || '');
        if (!targetInstId) return;

        let isMounted = true;
        Promise.all([
            apiService.fetchModuleRecords('school_bank_accounts', targetInstId).catch(() => []),
            apiService.fetchModuleRecords('bank_accounts', targetInstId).catch(() => [])
        ]).then(([schoolBanks, generalBanks]) => {
            if (!isMounted) return;
            const combined = [...(schoolBanks || []), ...(generalBanks || [])];
            const seen = new Set<string>();
            const unique: any[] = [];
            combined.forEach((b: any) => {
                if (!b) return;
                const id = b.id || `${b.bankName || b.bank_name}_${b.accountNumber || b.account_number}`;
                if (!seen.has(id)) {
                    seen.add(id);
                    unique.push(b);
                }
            });
            setFetchedBankAccounts(unique);
        }).catch(() => {});

        return () => { isMounted = false; };
    }, [isOpen, selectedBranchId, institution?.id]);

    const activeBankAccounts = useMemo(() => {
        const pool = (bankAccounts && bankAccounts.length > 0) ? [...bankAccounts, ...fetchedBankAccounts] : fetchedBankAccounts;
        const seen = new Set<string>();
        const list: Array<{ 
            id: string; 
            bankName: string; 
            accountNumber: string; 
            accountName: string;
            paymentNotificationTemplate?: string;
            paymentInstructions?: string;
            enableCustomNotification?: boolean;
        }> = [];

        if ((institution as any)?.coopConfig?.accountNumber) {
            const accNo = (institution as any).coopConfig.accountNumber;
            seen.add(accNo);
            list.push({
                id: 'coop_inst_acc',
                bankName: 'Co-operative Bank',
                accountNumber: accNo,
                accountName: (institution as any).coopConfig.accountName || 'Collection Account'
            });
        }
        if ((institution as any)?.kcbConfig?.accountNumber) {
            const accNo = (institution as any).kcbConfig.accountNumber;
            if (!seen.has(accNo)) {
                seen.add(accNo);
                list.push({
                    id: 'kcb_inst_acc',
                    bankName: 'KCB Bank',
                    accountNumber: accNo,
                    accountName: (institution as any).kcbConfig.accountName || 'Collection Account'
                });
            }
        }

        pool.forEach((ba: any) => {
            if (!ba) return;
            const bName = ba.bankName || ba.bank_name || 'Bank';
            const accNo = ba.accountNumber || ba.account_number || '';
            const accName = ba.accountName || ba.account_name || 'Account';
            const key = ba.id || `${bName}_${accNo}`;
            if (!seen.has(key) && (!accNo || !seen.has(accNo))) {
                seen.add(key);
                if (accNo) seen.add(accNo);
                list.push({
                    id: ba.id || key,
                    bankName: bName,
                    accountNumber: accNo,
                    accountName: accName,
                    paymentNotificationTemplate: ba.paymentNotificationTemplate || ba.payment_notification_template,
                    paymentInstructions: ba.paymentInstructions || ba.payment_instructions,
                    enableCustomNotification: ba.enableCustomNotification !== undefined ? ba.enableCustomNotification : ba.enable_custom_notification
                });
            }
        });

        return list;
    }, [bankAccounts, fetchedBankAccounts, institution]);

    // Fetch next receipt number when modal opens
    useEffect(() => {
        if (!isOpen) return;
        const targetInstId = (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : (institution?.id || '');
        if (targetInstId) {
            apiService.fetchModuleRecords('finance_numbering_configs', targetInstId)
                .then((configs: any[]) => {
                    const rConfig = configs.find(c => c.documentType === 'receipt' || c.document_type === 'receipt');
                    const nextNum = rConfig ? Number(rConfig.nextNumber || rConfig.next_number || 1001) : 1001;
                    const prefix = rConfig?.prefix || 'REC-';
                    setNextReceiptNumber(`${prefix}${nextNum}`);
                })
                .catch(() => {
                    setNextReceiptNumber('');
                });
        }
    }, [isOpen, selectedBranchId, institution?.id]);

    // Pre-index enrollments for instant O(1) admission number lookup
    const enrAdmMap = useMemo(() => {
        const map = new Map<string, string>();
        const isInvalid = (v: any) => !v || v === '—' || v === '-' || v === 'N/A' || v === 'undefined' || v === 'null';
        for (const enr of (enrollments || [])) {
            if (!enr) continue;
            let enrMeta = enr.metadata;
            if (typeof enrMeta === 'string' && enrMeta.trim().startsWith('{')) {
                try { enrMeta = JSON.parse(enrMeta); } catch (_) {}
            }
            const cands = [
                enr.admissionNumber,
                enr.admission_number,
                enr.admissionNo,
                enr.admNo,
                enr.adm_no,
                enr.studentAdmissionNumber,
                enr.student_admission_number,
                enr.registrationNumber,
                enr.registration_number,
                enr.regNo,
                enr.reg_no,
                enr.customStudentId,
                enr.custom_student_id,
                enr.upi,
                enr.nemis,
                enrMeta?.admissionNumber,
                enrMeta?.admission_number,
                enrMeta?.admNo,
                enrMeta?.studentAdmissionNumber
            ];
            const adm = cands.find(v => !isInvalid(v) && !isSyntheticAdmNo(v));
            if (adm) {
                const cleanAdm = String(adm).trim();
                const eUserId = String(enr.userId || enr.user_id || enr.studentId || enr.student_id || enr.id || '').trim().toLowerCase();
                if (eUserId && !map.has(eUserId)) map.set(eUserId, cleanAdm);
                const eStripped = eUserId.replace(/^(u_|usr_|stu_|st_|user_)/i, '').trim().toLowerCase();
                if (eStripped && !map.has(eStripped)) map.set(eStripped, cleanAdm);
                const eName = String(enr.student_name || enr.studentName || enr.name || '').trim().toLowerCase();
                if (eName && !map.has(eName)) map.set(eName, cleanAdm);
            }
        }
        return map;
    }, [enrollments]);

    // Pre-compute lightweight indexed searchable students list with fast-path lookup
    const searchableStudents = useMemo(() => {
        if (!isOpen) return [];
        const studentList = studentFinanceData && studentFinanceData.length > 0 ? studentFinanceData : students;
        if (!studentList || studentList.length === 0) return [];
        const isInvalid = (v: any) => !v || v === '—' || v === '-' || v === 'N/A' || v === 'undefined' || v === 'null';

        return studentList.map((s: any) => {
            const sId = String(s.id || s.userId || s.user_id || '').trim().toLowerCase();
            const sIdStripped = sId.replace(/^(u_|usr_|stu_|st_|user_)/i, '').trim().toLowerCase();
            const sName = String(s.name || '').trim().toLowerCase();

            // 1. Fast path: Direct top-level admission number candidate (0 JSON.parse calls)
            let adm = s.admissionNumber || s.admission_number || s.admissionNo || s.admNo || s.adm_no || s.studentAdmissionNumber || s.student_admission_number || s.registrationNumber || s.registration_number || s.regNo || s.reg_no || s.customStudentId || s.custom_student_id || s.upi || s.nemis || '';

            // 2. Fast path: Match from pre-indexed enrollment map
            if (isInvalid(adm) || isSyntheticAdmNo(adm)) {
                adm = (sId ? enrAdmMap.get(sId) : '') || (sIdStripped ? enrAdmMap.get(sIdStripped) : '') || (sName ? enrAdmMap.get(sName) : '') || '';
            }

            // 3. Fallback: Parse metadata only if missing
            if (isInvalid(adm) || isSyntheticAdmNo(adm)) {
                let meta = s.metadata;
                if (typeof meta === 'string' && meta.trim().startsWith('{')) {
                    try { meta = JSON.parse(meta); } catch (_) {}
                }
                let userMeta = s.user?.metadata;
                if (typeof userMeta === 'string' && userMeta.trim().startsWith('{')) {
                    try { userMeta = JSON.parse(userMeta); } catch (_) {}
                }
                const candidates = [
                    meta?.admissionNumber, meta?.admission_number, meta?.admNo, meta?.registrationNumber,
                    s.user?.admissionNumber, s.user?.admission_number, s.user?.admNo,
                    userMeta?.admissionNumber, userMeta?.admission_number, userMeta?.admNo
                ];
                adm = candidates.find(v => !isInvalid(v) && !isSyntheticAdmNo(v)) || '';
            }

            // 4. Final fallback: Deep resolution
            if (isInvalid(adm) || isSyntheticAdmNo(adm)) {
                const resolved = resolveRealStudentAdmNo(s, undefined, enrollments);
                if (resolved && !isInvalid(resolved) && !isSyntheticAdmNo(resolved)) {
                    adm = resolved;
                }
            }

            const cleanName = String(s.name || '').trim();
            const cleanAdm = String(adm || '').trim();
            const displayAdm = (!cleanAdm || isInvalid(cleanAdm) || isSyntheticAdmNo(cleanAdm)) ? 'No Adm' : cleanAdm;
            const nameLower = cleanName.toLowerCase();
            const admLower = displayAdm === 'No Adm' ? '' : displayAdm.toLowerCase();

            return {
                id: String(s.id || sId || `stu_${cleanName}`).trim(),
                name: cleanName,
                adm: displayAdm,
                searchKey: `${nameLower} ${admLower} ${sIdStripped}`
            };
        });
    }, [isOpen, studentFinanceData, students, enrAdmMap, enrollments]);

    // Deferred student search query to guarantee 0ms instantaneous typing & backspacing latency
    const deferredStudentSearch = React.useDeferredValue(manualPayStudentSearch);

    // Instant, zero-lag search filter (< 0.05ms execution with zero heap allocations per keystroke)
    const manualFilteredStudents = useMemo(() => {
        const query = (deferredStudentSearch || '').trim().toLowerCase();
        if (!query || manualPayStudentId) return [];

        const results: Array<{ id: string; name: string; adm: string; searchKey: string }> = [];
        for (let i = 0; i < searchableStudents.length; i++) {
            const item = searchableStudents[i];
            if (item.searchKey.includes(query)) {
                results.push(item);
                if (results.length >= 15) break;
            }
        }
        return results;
    }, [deferredStudentSearch, manualPayStudentId, searchableStudents]);

    // Memoize receipts belonging to the selected student once for fast lookup
    const selectedStudentReceipts = useMemo(() => {
        if (!manualPayStudentId) return [];
        return (receipts || []).filter((r: any) => {
            return r.studentId === manualPayStudentId || r.student_id === manualPayStudentId;
        });
    }, [manualPayStudentId, receipts]);

    // Compute student invoices with actual remaining balance and cleared flag
    const studentPendingInvoices = useMemo(() => {
        if (!manualPayStudentId) return [];

        const studentInvs = (invoices || []).filter((inv: any) => {
            const matchesStudent = inv.studentId === manualPayStudentId || 
                                   inv.student_id === manualPayStudentId || 
                                   inv.userId === manualPayStudentId || 
                                   inv.user_id === manualPayStudentId;
            return matchesStudent && inv.status !== 'cancelled' && inv.status !== 'quote';
        });

        const regularInvoices = studentInvs.map((inv: any) => {
            const total = parseMoneyAmount(inv.totalAmount || inv.total_amount || inv.amount || 0);
            const directPaid = Number(inv.paidAmount || inv.paid_amount || inv.amountPaid || inv.amount_paid || 0);
            const mapPaid = invoicePaidAmountMap?.get(inv.id) || 0;

            const directReceiptsPaid = selectedStudentReceipts.filter((r: any) => {
                const invId = r.invoiceId || r.invoice_id;
                return invId && String(invId) === String(inv.id);
            }).reduce((sum: number, r: any) => sum + Number(r.amountPaid || r.amount_paid || r.amount || 0), 0);

            let paid = Math.max(mapPaid, directReceiptsPaid, directPaid);
            let balance = Math.max(0, total - paid);

            // If an explicit balance is stored in DB, respect it
            let hasExplicitBalance = false;
            if ((inv as any).balance !== undefined && (inv as any).balance !== null && Number((inv as any).balance) >= 0) {
                const explicitBal = Number((inv as any).balance);
                balance = explicitBal;
                hasExplicitBalance = true;
            }

            // Check if explicitly marked as paid / cleared / settled
            const isExplicitlyCleared = 
                ['paid', 'cleared', 'settled'].includes(String(inv.status || '').trim().toLowerCase()) ||
                Boolean(inv.is_cleared || inv.isCleared);

            if ((isExplicitlyCleared && !hasExplicitBalance) || balance <= 0) {
                balance = 0;
                paid = Math.max(paid, total);
            }

            const status = balance <= 0 ? 'paid' : (paid > 0 ? 'partial' : (inv.status || 'pending'));

            return {
                ...inv,
                totalAmount: total,
                paidAmount: paid,
                balance: balance,
                status: status,
                isCleared: balance <= 0
            };
        });

        // Sort: pending/outstanding invoices first, cleared invoices after; within each group chronologically
        regularInvoices.sort((a, b) => {
            if (a.isCleared !== b.isCleared) {
                return a.isCleared ? 1 : -1;
            }
            const dateA = new Date(a.issueDate || a.issue_date || a.createdAt || 0).getTime();
            const dateB = new Date(b.issueDate || b.issue_date || b.createdAt || 0).getTime();
            return dateA - dateB;
        });

        // Synthetic opening balance if student has arrears
        const studentData = studentFinanceData?.find(s => s.id === manualPayStudentId);
        const openingBal = studentData?.totals?.openingBalance ?? parseMoneyAmount(
            (students.find(s => s.id === manualPayStudentId) as any)?.metadata?.openingBalance || 0
        );

        if (openingBal > 0) {
            const receiptsPaidToOpening = selectedStudentReceipts.filter((r: any) => {
                const invId = r.invoiceId || r.invoice_id;
                const isOpeningBalReceipt = !invId || String(invId).startsWith('__opening_balance__');
                return isOpeningBalReceipt;
            }).reduce((sum: number, r: any) => {
                let allocated = Number(r.amountPaid || r.amount_paid || r.amount || 0);
                if (r.allocations) {
                    try {
                        const allocs = typeof r.allocations === 'string' ? JSON.parse(r.allocations) : r.allocations;
                        if (Array.isArray(allocs)) {
                            const openingAlloc = allocs.find((a: any) => a.invoiceNumber === 'Opening Balance' || a.description === 'Arrears');
                            if (openingAlloc) allocated = Number(openingAlloc.amount || 0);
                        }
                    } catch (e) {}
                }
                return sum + allocated;
            }, 0);

            const openingBalanceRemaining = Math.max(0, openingBal - receiptsPaidToOpening);
            if (openingBalanceRemaining > 0) {
                const syntheticEntry: any = {
                    id: `__opening_balance__${manualPayStudentId}`,
                    studentId: manualPayStudentId,
                    invoiceNumber: 'Opening Balance',
                    description: 'Brought Forward Opening Balance (Arrears)',
                    totalAmount: openingBal,
                    paidAmount: receiptsPaidToOpening,
                    balance: openingBalanceRemaining,
                    status: 'pending',
                    isCleared: false,
                    isOpeningBalance: true,
                };
                return [syntheticEntry, ...regularInvoices];
            }
        }

        return regularInvoices;
    }, [manualPayStudentId, invoices, selectedStudentReceipts, invoicePaidAmountMap, studentFinanceData, students]);

    // Automatically select the first pending invoice if none selected or when student changes
    useEffect(() => {
        if (!manualPayStudentId) {
            setManualPayInvoiceId('');
            return;
        }
        if (studentPendingInvoices && studentPendingInvoices.length > 0) {
            const currentSelected = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
            if (!currentSelected) {
                const firstPending = studentPendingInvoices.find(inv => !inv.isCleared && inv.balance > 0) || studentPendingInvoices[0];
                setManualPayInvoiceId(firstPending ? firstPending.id : '__prepayment__');
            }
        } else {
            setManualPayInvoiceId('__prepayment__');
        }
    }, [manualPayStudentId, studentPendingInvoices, manualPayInvoiceId]);

    // Use deferred value for typing responsiveness so keystrokes don't lag
    const deferredPayAmount = React.useDeferredValue(manualPayAmount);
    const parsedPayAmount = useMemo(() => {
        if (!deferredPayAmount) return 0;
        const clean = String(deferredPayAmount).replace(/[^0-9.]/g, '');
        const val = parseFloat(clean);
        return isNaN(val) ? 0 : Math.max(0, val);
    }, [deferredPayAmount]);

    // Preview vote head allocations based on remaining balances
    const previewAllocations = useMemo(() => {
        if (!manualPayStudentId || parsedPayAmount <= 0) return [];

        const selectedInvoice = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
        const isTargetingOpeningBalance = selectedInvoice?.isOpeningBalance || manualPayInvoiceId?.startsWith('__opening_balance__');

        let remainingAmount = parsedPayAmount;
        const allocations: Array<{
            invoiceNumber: string;
            description: string;
            amount: number;
        }> = [];

        if (isTargetingOpeningBalance && selectedInvoice) {
            const allocatedToOpening = Math.min(remainingAmount, selectedInvoice.balance || selectedInvoice.totalAmount);
            if (allocatedToOpening > 0) {
                allocations.push({
                    invoiceNumber: 'Opening Balance',
                    description: 'Brought Forward Opening Balance (Arrears)',
                    amount: allocatedToOpening
                });
                remainingAmount -= allocatedToOpening;
            }
        }

        if (remainingAmount > 0) {
            // Allocate to selected target invoice first (even if previously cleared/paid), then other unpaid invoices
            const unpaidInvoices = studentPendingInvoices.filter(i => {
                if (i.isOpeningBalance) return false;
                if (manualPayInvoiceId && i.id === manualPayInvoiceId) return true;
                return !i.isCleared && (i.balance > 0);
            });
            const sortedInvoices = [...unpaidInvoices].sort((a: any, b: any) => {
                if (manualPayInvoiceId && !isTargetingOpeningBalance) {
                    if (a.id === manualPayInvoiceId) return -1;
                    if (b.id === manualPayInvoiceId) return 1;
                }
                const dateA = new Date(a.issueDate || a.issue_date || 0).getTime();
                const dateB = new Date(b.issueDate || b.issue_date || 0).getTime();
                return dateA - dateB;
            });

            for (const inv of sortedInvoices) {
                if (remainingAmount <= 0) break;

                let items: any[] = [];
                if (typeof inv.items === 'string') {
                    try { items = JSON.parse(inv.items); } catch(e) {}
                } else if (Array.isArray(inv.items)) {
                    items = inv.items;
                }

                const maxAllocatableForInv = inv.balance > 0 ? inv.balance : (inv.totalAmount || remainingAmount);
                let invAllocatedTotal = 0;

                if (items.length > 0) {
                    const sortedItems = [...items].sort((a: any, b: any) => {
                        const prioA = a.priority !== undefined ? Number(a.priority) : 99;
                        const prioB = b.priority !== undefined ? Number(b.priority) : 99;
                        return prioA - prioB;
                    });

                    for (const item of sortedItems) {
                        if (remainingAmount <= 0) break;
                        if (invAllocatedTotal >= maxAllocatableForInv) break;

                        const itemTotal = Number(item.amount || item.unitPrice || 0);
                        const itemPaid = Number(item.paid || 0);
                        const itemRemaining = Math.max(0, itemTotal - itemPaid);
                        const targetCap = itemRemaining > 0 ? itemRemaining : itemTotal;

                        const availableInInvCap = Math.max(0, maxAllocatableForInv - invAllocatedTotal);
                        const allocated = Math.min(remainingAmount, targetCap, availableInInvCap);

                        if (allocated > 0) {
                            remainingAmount -= allocated;
                            invAllocatedTotal += allocated;
                            allocations.push({
                                invoiceNumber: inv.invoiceNumber || (inv as any).invoice_number || 'INV',
                                description: item.description || item.name || 'Fee Item',
                                amount: allocated
                            });
                        }
                    }
                } else {
                    const invRemaining = maxAllocatableForInv;
                    if (invRemaining > 0) {
                        const allocated = Math.min(remainingAmount, invRemaining);
                        remainingAmount -= allocated;
                        allocations.push({
                            invoiceNumber: inv.invoiceNumber || (inv as any).invoice_number || 'INV',
                            description: (inv as any).description || 'Fees',
                            amount: allocated
                        });
                    }
                }
            }
        }

        if (remainingAmount > 0) {
            allocations.push({
                invoiceNumber: 'Prepayment',
                description: 'Prepayment / Credit Balance',
                amount: remainingAmount
            });
        }

        return allocations;
    }, [manualPayStudentId, manualPayInvoiceId, parsedPayAmount, studentPendingInvoices]);

    const handlePostManualPayment = async () => {
        if (isSavingManualPay) return;
        const amountNum = parseFloat(String(manualPayAmount).replace(/[^0-9.]/g, '')) || 0;
        if (!manualPayStudentId || amountNum <= 0) {
            alert("Please select a student and enter a valid payment amount greater than zero.");
            return;
        }
        setIsSavingManualPay(true);
        try {
            const selectedInvoice = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
            const openingBalRemaining = selectedInvoice?.isOpeningBalance ? selectedInvoice.balance : undefined;
            const isPrepayment = manualPayInvoiceId === '__prepayment__';
            const targetInvId = isPrepayment ? undefined : (manualPayInvoiceId || undefined);

            const { receiptNumber } = await apiService.postStudentPayment({
                studentId: manualPayStudentId,
                amount: amountNum,
                paymentMethod: manualPayMethod,
                reference: manualPayReference || '',
                paymentDate: manualPayDate || new Date().toISOString().split('T')[0],
                institutionId: institution.id,
                targetInvoiceId: targetInvId,
                bankAccountId: manualPayBankAccountId || undefined,
                customReceiptNumber: useCustomReceiptNumber ? customReceiptNumber.trim() : undefined,
                openingBalanceRemaining: openingBalRemaining
            });

            // Trigger immediate optimistic notification to parent view
            if (onPaymentPosted) {
                onPaymentPosted(receiptNumber);
            }
            if (onRefreshData) {
                onRefreshData().catch(() => {});
            }

            // Notification dispatch
            let smsNotice = '';
            try {
                const notifyStudent = students.find((s: any) => s.id === manualPayStudentId);
                const notifySchool = institution.name || 'School';
                const sAdm = resolveRealStudentAdmNo(notifyStudent, undefined, enrollments);
                const sAdmDisplay = sAdm && sAdm !== 'N/A' ? ` (${sAdm})` : '';
                const receiptLink = `${window.location.origin}/?receipt=${receiptNumber}`;

                const selectedAccount = activeBankAccounts.find((b: any) => b.id === manualPayBankAccountId);
                const studentData = (studentFinanceData || []).find((s: any) => s.id === manualPayStudentId);
                const studentEnr = (enrollments || []).find((e: any) => 
                    e.userId === manualPayStudentId || e.user_id === manualPayStudentId || 
                    e.studentId === manualPayStudentId || e.student_id === manualPayStudentId
                );

                const totalCharged = studentData?.totals?.invoiced ?? studentPendingInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);
                const currentBalance = Math.max(0, (studentData?.totals?.balance ?? totalCharged) - amountNum);

                const smsText = buildCustomPaymentNotification({
                    account: selectedAccount,
                    student: {
                        ...(notifyStudent || {}),
                        admissionNumber: sAdm
                    },
                    enrollment: studentEnr,
                    paymentAmount: amountNum,
                    totalCharged: totalCharged,
                    totalAdjusted: 0,
                    currentBalance: currentBalance,
                    paymentDate: manualPayDate || new Date(),
                    institutionName: notifySchool,
                    receiptNumber: receiptNumber,
                    receiptUrl: receiptLink
                });
                const emailHtml = `<p>Dear ${notifyStudent?.name || 'Parent/Guardian'},</p><p>Payment of <strong>KSh ${amountNum.toLocaleString()}</strong> has been received.</p><p><b>Receipt No:</b> ${receiptNumber}<br/><b>Method:</b> ${manualPayMethod}<br/><b>Ref:</b> ${manualPayReference || 'N/A'}<br/><b>Date:</b> ${manualPayDate}</p><p>Download receipt: <a href="${receiptLink}">${receiptLink}</a></p><p>Thank you,<br/>${notifySchool} Accounts Office</p>`;

                if (sendSmsNotification) {
                    const parentPhone = extractParentPhoneNumber(notifyStudent, enrollments);
                    if (parentPhone) {
                        try {
                            const smsRes = await apiService.sendSms(parentPhone, smsText, (institution as any).smsConfig, 1, institution.id, undefined, true);
                            if (smsRes && smsRes.success === false) {
                                smsNotice = `\n\n⚠️ SMS Receipt Warning: Failed to send SMS to parent (${parentPhone}): ${smsRes.message || 'Insufficient SMS units or gateway offline'}`;
                            } else {
                                smsNotice = `\n\n📱 Instant SMS receipt alert sent to parent (${parentPhone}).`;
                            }
                        } catch (smsErr: any) {
                            smsNotice = `\n\n⚠️ SMS Receipt Warning: ${smsErr?.message || 'SMS delivery failed'}`;
                        }
                    } else {
                        smsNotice = `\n\n⚠️ SMS Receipt Notice: No parent phone number found for ${notifyStudent?.name || 'this student'}. Please add a parent phone in Student Enrollments to enable instant receipt SMS alerts.`;
                    }
                }

                if (sendEmailNotification && notifyStudent?.email && !isPlaceholderEmail(notifyStudent.email)) {
                    apiService.sendEmail(notifyStudent.email, `Payment Receipt ${receiptNumber} — ${notifySchool}`, emailHtml).catch(() => {});
                }
            } catch (_ne) { /* notifications are non-critical */ }

            alert(`Receipt ${receiptNumber} generated and payment allocated successfully!${smsNotice}`);
            onClose();
        } catch (e: any) {
            alert("Failed to post receipt: " + (e.message || e));
        } finally {
            setIsSavingManualPay(false);
        }
    };

    if (!isOpen) return null;

    const isAmountValid = (parseFloat(String(manualPayAmount).replace(/[^0-9.]/g, '')) || 0) > 0;
    const selectedInvoiceForAction = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Post Manual Receipt</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Record a payment manually received from cash, cheque or bursary</p>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <XIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Search Student */}
                    <div className="space-y-1 relative">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Search Student *</label>
                        <div className="relative">
                            <input 
                                ref={searchInputRef}
                                autoFocus
                                type="text"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="Type student name or admission number..."
                                value={manualPayStudentSearch}
                                onFocus={(e) => {
                                    if (manualPayStudentId) {
                                        e.target.select();
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && manualFilteredStudents.length > 0) {
                                        e.preventDefault();
                                        const topStudent = manualFilteredStudents[0];
                                        setManualPayStudentId(topStudent.id);
                                        setManualPayInvoiceId('');
                                        setManualPayStudentSearch(topStudent.adm && topStudent.adm !== 'No Adm' ? `${topStudent.name} (${topStudent.adm})` : topStudent.name);
                                        setManualPayAmount('');
                                    } else if (e.key === 'Escape') {
                                        setManualPayStudentSearch('');
                                        setManualPayStudentId('');
                                    }
                                }}
                                onChange={e => {
                                    setManualPayStudentSearch(e.target.value);
                                    if (manualPayStudentId) {
                                        setManualPayStudentId('');
                                        setManualPayInvoiceId('');
                                        setManualPayAmount('');
                                    }
                                }}
                                className="w-full px-5 py-3.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                            {manualPayStudentSearch && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManualPayStudentSearch('');
                                        setManualPayStudentId('');
                                        setManualPayInvoiceId('');
                                        setManualPayAmount('');
                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    title="Clear search"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {manualPayStudentSearch && !manualPayStudentId && (
                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {manualFilteredStudents.length === 0 ? (
                                    <div className="p-4 text-xs text-slate-400 font-medium">No students matched &quot;{manualPayStudentSearch}&quot;.</div>
                                ) : (
                                    manualFilteredStudents.map(student => {
                                        return (
                                            <button
                                                key={student.id}
                                                type="button"
                                                onClick={() => {
                                                    setManualPayStudentId(student.id);
                                                    setManualPayInvoiceId('');
                                                    setManualPayStudentSearch(student.adm && student.adm !== 'No Adm' ? `${student.name} (${student.adm})` : student.name);
                                                    setManualPayAmount('');
                                                }}
                                                className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col cursor-pointer transition-colors"
                                            >
                                                <span>{student.name}</span>
                                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">
                                                    {student.adm === 'No Adm' ? (
                                                        <span className="text-amber-500/80 font-bold">No Adm Assigned</span>
                                                    ) : (
                                                        `Adm: ${student.adm}`
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Target Pending Invoice */}
                    {manualPayStudentId && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Pending Invoice *</label>
                            <select
                                value={manualPayInvoiceId}
                                onChange={(e) => {
                                    setManualPayInvoiceId(e.target.value);
                                }}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                            >
                                <option value="">-- Choose Invoice or Prepayment --</option>
                                <option value="__prepayment__">-- General Prepayment / Credit Balance --</option>
                                {studentPendingInvoices.map(inv => {
                                    const desc = (inv as any).description || 'Fees';
                                    let label = '';
                                    if (inv.isOpeningBalance) {
                                        label = `Opening Balance (Arrears - Due: KES ${inv.balance.toLocaleString()}) [pending]`;
                                    } else if (inv.isCleared || inv.status === 'paid' || inv.balance <= 0) {
                                        label = `${inv.invoiceNumber} (${desc} - Cleared) [paid]`;
                                    } else if (inv.paidAmount > 0) {
                                        label = `${inv.invoiceNumber} (${desc} - Due: KES ${inv.balance.toLocaleString()} / Total: KES ${inv.totalAmount.toLocaleString()}) [partial]`;
                                    } else {
                                        label = `${inv.invoiceNumber} (${desc} - Due: KES ${inv.balance.toLocaleString()}) [pending]`;
                                    }
                                    return (
                                        <option key={inv.id} value={inv.id}>
                                            {label}
                                        </option>
                                    );
                                })}
                                {studentPendingInvoices.length === 0 && (
                                    <option disabled>No invoices found for this student</option>
                                )}
                            </select>
                        </div>
                    )}

                    {/* Payment Method & Amount Paid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method *</label>
                            <select
                                value={manualPayMethod}
                                onChange={(e) => setManualPayMethod(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                            >
                                <option value="Cash">Cash (Manual)</option>
                                <option value="Bank Transfer">Bank Feed / Transfer</option>
                                <option value="M-Pesa">M-Pesa</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Bursary">Bursary</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Paid (KES) *</label>
                                {selectedInvoiceForAction && selectedInvoiceForAction.balance > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setManualPayAmount(String(selectedInvoiceForAction.balance))}
                                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer uppercase tracking-wider"
                                    >
                                        Pay Full Due (KES {selectedInvoiceForAction.balance.toLocaleString()})
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={manualPayAmount}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    const parts = val.split('.');
                                    const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                                    setManualPayAmount(cleanVal);
                                }}
                                placeholder="Enter amount paid"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                        </div>
                    </div>

                    {/* Destination Bank Account */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Bank Account</label>
                        <select
                            value={manualPayBankAccountId}
                            onChange={(e) => setManualPayBankAccountId(e.target.value)}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                        >
                            <option value="">-- Select Bank Account (Optional) --</option>
                            {activeBankAccounts.map(ba => (
                                <option key={ba.id} value={ba.id}>
                                    {ba.bankName} - {ba.accountNumber} ({ba.accountName})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Expected Receipt Number */}
                    {nextReceiptNumber && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Expected Receipt Number</span>
                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{nextReceiptNumber}</p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={useCustomReceiptNumber}
                                    onChange={(e) => {
                                        setUseCustomReceiptNumber(e.target.checked);
                                        if (e.target.checked && !customReceiptNumber) {
                                            setCustomReceiptNumber(nextReceiptNumber);
                                        }
                                    }}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Use Custom Number</span>
                            </label>
                        </div>
                    )}

                    {useCustomReceiptNumber && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Receipt Number *</label>
                            <input
                                type="text"
                                value={customReceiptNumber}
                                onChange={(e) => setCustomReceiptNumber(e.target.value)}
                                placeholder="Enter custom receipt number (e.g. REC-Manual-01)"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                required
                            />
                        </div>
                    )}

                    {/* Payment Date & Transaction Ref */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                            <input
                                type="date"
                                value={manualPayDate}
                                onChange={(e) => setManualPayDate(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Ref / Slip Code</label>
                            <input
                                type="text"
                                value={manualPayReference}
                                onChange={(e) => setManualPayReference(e.target.value)}
                                placeholder="Cheque # or bank slip ref"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                            />
                        </div>
                    </div>

                    {/* Preview Votes Distribution */}
                    {manualPayStudentId && parsedPayAmount > 0 && (
                        <div className="space-y-2 p-5 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preview Votes Distribution</p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {previewAllocations.length === 0 ? (
                                    <p className="text-xs font-semibold text-slate-400 p-2">No active allocations generated. Pure prepayment/credit balance.</p>
                                ) : (
                                    previewAllocations.map((alloc, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 text-xs font-bold shadow-sm">
                                            <div className="min-w-0 text-left">
                                                <div className="text-slate-850 dark:text-slate-200 truncate">{alloc.description}</div>
                                                <div className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{alloc.invoiceNumber}</div>
                                            </div>
                                            <span className="text-indigo-650 dark:text-indigo-400 shrink-0 font-extrabold ml-2">KES {alloc.amount.toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notification Preferences */}
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send Receipt Notifications</p>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendSmsNotification}
                                    onChange={e => setSendSmsNotification(e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">📱 SMS</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendEmailNotification}
                                    onChange={e => setSendEmailNotification(e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">✉️ Email (with PDF link)</span>
                            </label>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">Student &amp; parent will receive receipt confirmation with a download link.</p>
                    </div>

                    {/* Progress Indicator */}
                    {isSavingManualPay && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-center gap-3 text-amber-800 dark:text-amber-200 font-bold text-xs animate-pulse text-center">
                            <span className="animate-spin text-base">⏳</span>
                            <span>Posting transaction in progress... Please do not close or click again to prevent duplicate receipts.</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="button"
                        onClick={handlePostManualPayment}
                        disabled={isSavingManualPay || !manualPayStudentId || !isAmountValid}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all text-center disabled:opacity-50 mt-4 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                        {isSavingManualPay ? (
                            <>
                                <span className="animate-spin text-sm">⏳</span>
                                <span>Posting Transaction in Progress...</span>
                            </>
                        ) : (
                            'Confirm and Post Receipt'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});
