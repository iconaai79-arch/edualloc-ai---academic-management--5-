import React, { useState, useMemo, useEffect } from 'react';
import type { User, Institution, Invoice, Receipt } from '../../types';
import { XIcon } from '../icons';
import { apiService } from '../../services/apiService';
import { resolveRealStudentAdmNo, isPlaceholderEmail } from '../../utils/academicUtils';

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
    studentFinanceData?: any[];
    invoices: Invoice[];
    receipts: Receipt[];
    invoicePaidAmountMap?: Map<string, number>;
    bankAccounts?: any[];
    currentUser?: any;
    onPaymentPosted?: (receiptNumber: string) => void;
    onRefreshData?: () => Promise<void>;
}

export const PostManualReceiptModal: React.FC<PostManualReceiptModalProps> = ({
    isOpen,
    onClose,
    institution,
    selectedBranchId,
    students = [],
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
    const [manualPayAmount, setManualPayAmount] = useState<number>(0);
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

    // Reset fields on modal open/close
    useEffect(() => {
        if (!isOpen) {
            setManualPayStudentSearch('');
            setManualPayStudentId('');
            setManualPayInvoiceId('');
            setManualPayAmount(0);
            setManualPayReference('');
            setManualPayBankAccountId('');
            setUseCustomReceiptNumber(false);
            setCustomReceiptNumber('');
            setManualPayDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen]);

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

    // Filter students for search dropdown (capped at 40 results for snappy UI)
    const manualFilteredStudents = useMemo(() => {
        const query = (manualPayStudentSearch || '').trim().toLowerCase();
        if (!query || manualPayStudentId) return [];

        const studentList = studentFinanceData && studentFinanceData.length > 0 ? studentFinanceData : students;
        return studentList.filter(s => {
            const name = (s.name || '').toLowerCase();
            const adm = (resolveRealStudentAdmNo(s) || s.admissionNumber || (s as any).admission_number || '').toLowerCase();
            return name.includes(query) || adm.includes(query);
        }).slice(0, 40);
    }, [manualPayStudentSearch, manualPayStudentId, studentFinanceData, students]);

    // Compute pending invoices with actual remaining balance (deducting posted payments)
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

            const directReceiptsPaid = (receipts || []).filter((r: any) => {
                const invId = r.invoiceId || r.invoice_id;
                return invId && String(invId) === String(inv.id);
            }).reduce((sum: number, r: any) => sum + Number(r.amountPaid || r.amount_paid || r.amount || 0), 0);

            const paid = Math.max(mapPaid, directReceiptsPaid, directPaid);
            let balance = Math.max(0, total - paid);

            // If an explicit balance is stored in DB that is lower
            if ((inv as any).balance !== undefined && (inv as any).balance !== null && Number((inv as any).balance) >= 0) {
                const explicitBal = Number((inv as any).balance);
                if (explicitBal < balance) {
                    balance = explicitBal;
                }
            }

            const status = (balance <= 0 && total > 0) ? 'paid' : (paid > 0 ? 'partial' : (inv.status || 'pending'));

            return {
                ...inv,
                totalAmount: total,
                paidAmount: paid,
                balance: balance,
                status: status
            };
        }).filter(inv => inv.balance > 0);

        // Sort chronologically
        regularInvoices.sort((a, b) => {
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
            const receiptsPaidToOpening = (receipts || []).filter((r: any) => {
                const belongsToStudent = r.studentId === manualPayStudentId || r.student_id === manualPayStudentId;
                const invId = r.invoiceId || r.invoice_id;
                const isOpeningBalReceipt = !invId || String(invId).startsWith('__opening_balance__');
                return belongsToStudent && isOpeningBalReceipt;
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
                    isOpeningBalance: true,
                };
                return [syntheticEntry, ...regularInvoices];
            }
        }

        return regularInvoices;
    }, [manualPayStudentId, invoices, receipts, invoicePaidAmountMap, studentFinanceData, students]);

    // Automatically select the first pending invoice and prefill its remaining unpaid balance
    useEffect(() => {
        if (studentPendingInvoices && studentPendingInvoices.length > 0) {
            const currentSelected = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
            if (currentSelected) {
                // Keep selected invoice and set to its outstanding balance
                setManualPayAmount(currentSelected.balance);
            } else {
                const firstPending = studentPendingInvoices[0];
                setManualPayInvoiceId(firstPending.id);
                setManualPayAmount(firstPending.balance);
            }
        } else {
            setManualPayInvoiceId('');
            setManualPayAmount(0);
        }
    }, [studentPendingInvoices]);

    // Preview vote head allocations based on remaining balances
    const previewAllocations = useMemo(() => {
        if (!manualPayStudentId || manualPayAmount <= 0) return [];

        const amountPaidNum = Number(manualPayAmount);
        const selectedInvoice = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
        const isTargetingOpeningBalance = selectedInvoice?.isOpeningBalance || manualPayInvoiceId?.startsWith('__opening_balance__');

        let remainingAmount = amountPaidNum;
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
            const sortedInvoices = [...studentPendingInvoices.filter(i => !i.isOpeningBalance)].sort((a: any, b: any) => {
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

                if (items.length > 0) {
                    const sortedItems = [...items].sort((a: any, b: any) => {
                        const prioA = a.priority !== undefined ? Number(a.priority) : 99;
                        const prioB = b.priority !== undefined ? Number(b.priority) : 99;
                        return prioA - prioB;
                    });

                    for (const item of sortedItems) {
                        if (remainingAmount <= 0) break;
                        const itemTotal = Number(item.amount || item.unitPrice || 0);
                        const itemPaid = Number(item.paid || 0);
                        const itemRemaining = Math.max(0, itemTotal - itemPaid);

                        if (itemRemaining > 0) {
                            const allocated = Math.min(remainingAmount, itemRemaining);
                            remainingAmount -= allocated;
                            allocations.push({
                                invoiceNumber: inv.invoiceNumber || (inv as any).invoice_number || 'INV',
                                description: item.description || item.name || 'Fee Item',
                                amount: allocated
                            });
                        }
                    }
                } else {
                    const invRemaining = Number(inv.balance || inv.totalAmount || 0);
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
    }, [manualPayStudentId, manualPayInvoiceId, manualPayAmount, studentPendingInvoices]);

    const handlePostManualPayment = async () => {
        if (isSavingManualPay) return;
        if (!manualPayStudentId || manualPayAmount <= 0) {
            alert("Please select a student and enter a valid payment amount.");
            return;
        }
        setIsSavingManualPay(true);
        try {
            const selectedInvoice = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
            const openingBalRemaining = selectedInvoice?.isOpeningBalance ? selectedInvoice.balance : undefined;

            const { receiptNumber } = await apiService.postStudentPayment({
                studentId: manualPayStudentId,
                amount: Number(manualPayAmount),
                paymentMethod: manualPayMethod,
                reference: manualPayReference || '',
                paymentDate: manualPayDate || new Date().toISOString().split('T')[0],
                institutionId: institution.id,
                targetInvoiceId: manualPayInvoiceId || undefined,
                bankAccountId: manualPayBankAccountId || undefined,
                customReceiptNumber: useCustomReceiptNumber ? customReceiptNumber : undefined,
                openingBalanceRemaining: openingBalRemaining
            });

            if (onRefreshData) {
                onRefreshData().catch(() => {});
            }

            // --- Receipt Notification (SMS + Email) ---
            try {
                const notifyStudent = students.find((s: any) => s.id === manualPayStudentId);
                const notifySchool = institution.name || 'School';
                const receiptLink = `${window.location.origin}/?receipt=${receiptNumber}`;
                const smsText = `[${notifySchool}] KSh ${Number(manualPayAmount).toLocaleString()} received. Receipt: ${receiptNumber}. Download: ${receiptLink}`;
                const emailHtml = `<p>Dear ${notifyStudent?.name || 'Parent/Guardian'},</p><p>Payment of <strong>KSh ${Number(manualPayAmount).toLocaleString()}</strong> has been received.</p><p><b>Receipt No:</b> ${receiptNumber}<br/><b>Method:</b> ${manualPayMethod}<br/><b>Ref:</b> ${manualPayReference || 'N/A'}<br/><b>Date:</b> ${manualPayDate}</p><p>Download receipt: <a href="${receiptLink}">${receiptLink}</a></p><p>Thank you,<br/>${notifySchool} Accounts Office</p>`;
                if (sendSmsNotification) {
                    if (notifyStudent?.phoneNumber) apiService.sendSms(notifyStudent.phoneNumber, smsText, (institution as any).smsConfig, 1, institution.id).catch(() => {});
                    if (notifyStudent?.metadata?.parentPhone) apiService.sendSms(notifyStudent.metadata.parentPhone, smsText, (institution as any).smsConfig, 1, institution.id).catch(() => {});
                }
                if (sendEmailNotification && notifyStudent?.email && !isPlaceholderEmail(notifyStudent.email)) {
                    apiService.sendEmail(notifyStudent.email, `Payment Receipt ${receiptNumber} — ${notifySchool}`, emailHtml).catch(() => {});
                }
            } catch (_ne) { /* notifications are non-critical */ }

            if (onPaymentPosted) {
                onPaymentPosted(receiptNumber);
            }

            alert(`Receipt ${receiptNumber} generated and payment allocated successfully!`);
            onClose();
        } catch (e: any) {
            alert("Failed to post receipt: " + (e.message || e));
        } finally {
            setIsSavingManualPay(false);
        }
    };

    if (!isOpen) return null;

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
                        className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Search Student */}
                    <div className="space-y-1 relative">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Search Student *</label>
                        <input 
                            type="text"
                            placeholder="Type student name or admission number..."
                            value={manualPayStudentSearch}
                            onChange={e => {
                                setManualPayStudentSearch(e.target.value);
                                if (manualPayStudentId) {
                                    setManualPayStudentId('');
                                    setManualPayInvoiceId('');
                                }
                            }}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                        />
                        {manualPayStudentSearch && !manualPayStudentId && (
                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {manualFilteredStudents.length === 0 ? (
                                    <div className="p-4 text-xs text-slate-400 font-medium">No students matched.</div>
                                ) : (
                                    manualFilteredStudents.map(student => {
                                        const adm = resolveRealStudentAdmNo(student) || student.admissionNumber || (student as any).admission_number || 'No Adm';
                                        return (
                                            <button
                                                key={student.id}
                                                type="button"
                                                onClick={() => {
                                                    setManualPayStudentId(student.id);
                                                    setManualPayStudentSearch(`${student.name} (${adm})`);
                                                }}
                                                className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col cursor-pointer"
                                            >
                                                <span>{student.name}</span>
                                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Adm: {adm}</span>
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
                                    const selectedInvoice = studentPendingInvoices.find(inv => inv.id === e.target.value);
                                    if (selectedInvoice) {
                                        setManualPayAmount(selectedInvoice.balance);
                                    }
                                }}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                            >
                                <option value="">-- Choose Invoice --</option>
                                {studentPendingInvoices.map(inv => {
                                    const desc = (inv as any).description || 'Fees';
                                    let label = '';
                                    if (inv.isOpeningBalance) {
                                        label = `Opening Balance (Arrears - Due: KES ${inv.balance.toLocaleString()}) [pending]`;
                                    } else if (inv.paidAmount > 0) {
                                        label = `${inv.invoiceNumber} (${desc} - Balance: KES ${inv.balance.toLocaleString()} / Total: KES ${inv.totalAmount.toLocaleString()}) [${inv.status}]`;
                                    } else {
                                        label = `${inv.invoiceNumber} (${desc} - Due: KES ${inv.balance.toLocaleString()}) [${inv.status}]`;
                                    }
                                    return (
                                        <option key={inv.id} value={inv.id}>
                                            {label}
                                        </option>
                                    );
                                })}
                                {studentPendingInvoices.length === 0 && (
                                    <option disabled>No outstanding invoices for this student</option>
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Paid (KES) *</label>
                            <input
                                type="number"
                                value={manualPayAmount || ''}
                                onChange={(e) => setManualPayAmount(Number(e.target.value))}
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
                            {bankAccounts.map(ba => (
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
                    {manualPayStudentId && manualPayAmount > 0 && (
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
                        disabled={isSavingManualPay || !manualPayStudentId || (!manualPayInvoiceId && !studentPendingInvoices.some((inv: any) => inv.isOpeningBalance && inv.id === manualPayInvoiceId)) || manualPayAmount <= 0}
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
};
