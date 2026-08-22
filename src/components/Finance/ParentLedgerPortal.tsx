import React, { useState, useMemo } from 'react';
import {
    DevicePhoneMobileIcon,
    DocumentTextIcon,
    QrCodeIcon,
    ArrowDownTrayIcon,
    PrinterIcon,
    CheckBadgeIcon,
    ClockIcon,
    CreditCardIcon,
    ChatBubbleLeftRightIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    UserIcon,
    AcademicCapIcon,
    BanknotesIcon,
    ChevronRightIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface ParentLedgerPortalProps {
    institution: any;
    students: any[];
    invoices: any[];
    receipts: any[];
    onLogAction?: (msg: string) => void;
}

export const ParentLedgerPortal: React.FC<ParentLedgerPortalProps> = ({
    institution,
    students,
    invoices,
    receipts,
    onLogAction
}) => {
    // Current selected student for parent view
    const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
    const [searchStudentQuery, setSearchStudentQuery] = useState('');
    const [activePortalTab, setActivePortalTab] = useState<'statement' | 'online_payment' | 'ptp_plan' | 'whatsapp_bot'>('statement');

    // Online Payment State (M-Pesa STK Push)
    const [stkPhone, setStkPhone] = useState('254712345678');
    const [stkAmount, setStkAmount] = useState('5000');
    const [isSendingStk, setIsSendingStk] = useState(false);
    const [stkStatus, setStkStatus] = useState<string | null>(null);

    // Promise to Pay (PTP) State
    const [ptpAmount, setPtpAmount] = useState('10000');
    const [ptpDate, setPtpDate] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0]);
    const [ptpNote, setPtpNote] = useState('Will clear second installment upon salary disbursement');
    const [savedPtps, setSavedPtps] = useState<Array<{ id: string; amount: number; date: string; note: string; status: 'PENDING' | 'HONORED' }>>([
        {
            id: 'ptp_1',
            amount: 8000,
            date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
            note: 'Mid-term fee balance installment commitment',
            status: 'PENDING'
        }
    ]);

    // WhatsApp Financial Bot Simulator State
    const [botMessages, setBotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; pdfLink?: boolean }>>([
        {
            sender: 'bot',
            text: `👋 Hello! Welcome to ${institution.name || 'School'} Automated Finance Assistant.\n\nReply with:\n• *BALANCE* to view your current fee balance.\n• *STATEMENT* to receive a mini fee statement.\n• *RECEIPT* for your latest official receipt copy.\n• *PAY* for instant M-Pesa Paybill instructions.`,
            time: '09:00 AM'
        }
    ]);
    const [botInput, setBotInput] = useState('');

    // Selected Student Object
    const currentStudent = useMemo(() => {
        return students.find(s => s.id === selectedStudentId) || students[0] || null;
    }, [students, selectedStudentId]);

    // Filtered Student List for parent selector
    const filteredStudents = useMemo(() => {
        if (!searchStudentQuery) return students;
        const q = searchStudentQuery.toLowerCase();
        return students.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.admissionNumber || s.admission_number || '').toLowerCase().includes(q) ||
            (s.className || '').toLowerCase().includes(q)
        );
    }, [students, searchStudentQuery]);

    // Student Invoices & Receipts
    const studentInvoices = useMemo(() => {
        if (!currentStudent) return [];
        return invoices.filter(inv => inv.studentId === currentStudent.id);
    }, [invoices, currentStudent]);

    const studentReceipts = useMemo(() => {
        if (!currentStudent) return [];
        return receipts.filter(rec => rec.studentId === currentStudent.id);
    }, [receipts, currentStudent]);

    // Student Financial Totals
    const financialSummary = useMemo(() => {
        const totalInvoiced = studentInvoices.reduce((sum, inv) => sum + (Number(inv.amount || inv.totalAmount || 0)), 0);
        const totalPaid = studentReceipts.reduce((sum, rec) => sum + (Number(rec.amountPaid || rec.amount || 0)), 0);
        const balance = totalInvoiced - totalPaid;

        return {
            totalInvoiced,
            totalPaid,
            balance,
            hasCredit: balance < 0,
            creditAmount: balance < 0 ? Math.abs(balance) : 0
        };
    }, [studentInvoices, studentReceipts]);

    // Handle STK Push Simulation
    const handleInitiateStkPush = (e: React.FormEvent) => {
        e.preventDefault();
        if (!stkAmount || Number(stkAmount) <= 0) {
            alert('Please specify a valid amount.');
            return;
        }

        setIsSendingStk(true);
        setStkStatus('Sending M-Pesa STK Prompt to ' + stkPhone + '...');

        setTimeout(() => {
            setIsSendingStk(false);
            setStkStatus('✓ STK Push sent successfully! Parent phone prompt: "Do you want to pay KES ' + Number(stkAmount).toLocaleString() + ' to ' + (institution.name || 'School') + '?"');
            if (onLogAction) {
                onLogAction(`Sent M-Pesa STK Push of KSh ${Number(stkAmount).toLocaleString()} to ${stkPhone} for student ${currentStudent?.name}`);
            }
        }, 1200);
    };

    // Handle Promise to Pay (PTP) Commitment
    const handleCreatePtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ptpAmount || Number(ptpAmount) <= 0) {
            alert('Please enter a valid commitment amount.');
            return;
        }

        const newPtp = {
            id: `ptp_${Date.now()}`,
            amount: Number(ptpAmount),
            date: ptpDate,
            note: ptpNote,
            status: 'PENDING' as const
        };

        setSavedPtps(prev => [newPtp, ...prev]);
        alert(`✓ Promise to Pay Agreement recorded!\n\nAn automated SMS reminder will be sent to the parent 48 hours prior to ${ptpDate}.`);
        setPtpNote('');
    };

    // Handle WhatsApp Bot Message
    const handleSendBotMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!botInput.trim()) return;

        const userMsg = botInput.trim();
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const lower = userMsg.toLowerCase();

        const updated = [...botMessages, { sender: 'user' as const, text: userMsg, time: now }];
        setBotInput('');

        let botReply = '';
        let hasPdf = false;

        if (lower.includes('balance') || lower.includes('fee')) {
            botReply = `📌 *Fee Statement Summary*\nStudent: ${currentStudent?.name || 'Student'}\nADM: ${currentStudent?.admissionNumber || currentStudent?.admission_number || '3175'}\nClass: ${currentStudent?.className || 'Grade 8'}\n\n• Total Invoiced: KSh ${financialSummary.totalInvoiced.toLocaleString()}\n• Total Paid: KSh ${financialSummary.totalPaid.toLocaleString()}\n• *Current Balance: KSh ${Math.max(0, financialSummary.balance).toLocaleString()}*${financialSummary.hasCredit ? `\n(Credit Balance of KSh ${financialSummary.creditAmount.toLocaleString()})` : ''}\n\nTo pay, use Paybill *522522*, Account *${currentStudent?.admissionNumber || '3175'}*.`;
        } else if (lower.includes('statement')) {
            botReply = `📄 *Official Term Fee Statement*\nHere is your official digitally-signed statement for ${currentStudent?.name} as of today.`;
            hasPdf = true;
        } else if (lower.includes('receipt')) {
            const latestRec = studentReceipts[0];
            if (latestRec) {
                botReply = `🧾 *Latest Receipt: ${latestRec.receiptNumber || 'RCPT-1300'}*\nAmount: KSh ${(latestRec.amountPaid || latestRec.amount || 0).toLocaleString()}\nDate: ${latestRec.paymentDate || latestRec.date || 'Today'}\nRef: ${latestRec.relatedTransactionId || 'M-Pesa'}\n\nDownload your verified PDF receipt below:`;
                hasPdf = true;
            } else {
                botReply = `No receipt records found yet for ${currentStudent?.name}.`;
            }
        } else if (lower.includes('pay')) {
            botReply = `💳 *How to Pay Fees via M-Pesa*\n\n1. Go to M-Pesa on your phone\n2. Select *Lipa na M-Pesa* -> *Paybill*\n3. Enter Business No: *522522*\n4. Enter Account No: *${currentStudent?.admissionNumber || '3175'}*\n5. Enter Amount & PIN\n\nYour payment will be instantly credited and receipted!`;
        } else {
            botReply = `I did not understand that command. Please reply with:\n• *BALANCE*\n• *STATEMENT*\n• *RECEIPT*\n• *PAY*`;
        }

        setTimeout(() => {
            setBotMessages([...updated, {
                sender: 'bot',
                text: botReply,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                pdfLink: hasPdf
            }]);
        }, 500);
    };

    return (
        <div className="space-y-6">
            {/* ── Top Header Banner ── */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <ShieldCheckIcon className="w-3.5 h-3.5" /> Self-Service &amp; WhatsApp Bot
                            </span>
                            <span className="px-3 py-1 bg-white/10 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Parent Experience Suite
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Parent Financial Portal &amp; Assistant</h2>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                            Self-service statement viewer, instant PDF receipts with QR verification, online M-Pesa payments, and 24/7 WhatsApp finance concierge.
                        </p>
                    </div>

                    {/* Student Selector Dropdown */}
                    <div className="w-full md:w-72 bg-slate-800/80 backdrop-blur rounded-2xl p-3 border border-slate-700">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Student Profile</label>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            {filteredStudents.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.admissionNumber || s.admission_number || '?'} · {s.name} ({s.className || 'Class'})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* KPI Ribbon for Selected Student */}
                {currentStudent && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Invoiced</p>
                            <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                                KSh {financialSummary.totalInvoiced.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">{studentInvoices.length} Invoices Billed</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Paid</p>
                            <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                                KSh {financialSummary.totalPaid.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">{studentReceipts.length} Official Receipts</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Outstanding Balance</p>
                            <p className={`text-lg sm:text-xl font-black mt-0.5 ${financialSummary.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                KSh {Math.max(0, financialSummary.balance).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {financialSummary.balance > 0 ? 'Due for Current Term' : 'Fully Settled ✓'}
                            </p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Status</p>
                            <div className="mt-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    financialSummary.balance <= 0
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                    {financialSummary.balance <= 0 ? 'Cleared ✓' : 'Partial / Outstanding'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Paybill: 522522 · ADM: {currentStudent.admissionNumber || '3175'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Sub-Navigation Tabs ── */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                {[
                    { id: 'statement', label: 'Student Fee Statement', icon: DocumentTextIcon },
                    { id: 'online_payment', label: 'M-Pesa Express Payment', icon: CreditCardIcon },
                    { id: 'ptp_plan', label: 'Promise to Pay (PTP)', icon: ClockIcon },
                    { id: 'whatsapp_bot', label: 'WhatsApp Bot Simulator', icon: ChatBubbleLeftRightIcon }
                ].map(tab => {
                    const Icon = tab.icon;
                    const active = activePortalTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActivePortalTab(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                active
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── TAB 1: STUDENT FEE STATEMENT ── */}
            {activePortalTab === 'statement' && currentStudent && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-8 shadow-sm">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Official Parent Ledger</span>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                {currentStudent.name} (ADM: {currentStudent.admissionNumber || currentStudent.admission_number || '3175'})
                            </h3>
                            <p className="text-xs text-slate-400">{currentStudent.className || 'Grade 8'} · {institution.name || 'Institution'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                        >
                            <PrinterIcon className="w-4 h-4" /> Print Statement
                        </button>
                    </div>

                    {/* Invoices Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">1. Invoiced Fee Schedules</h4>
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-3">Invoice #</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Term / Title</th>
                                        <th className="px-4 py-3 text-right">Amount (KSh)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {studentInvoices.map((inv, idx) => (
                                        <tr key={inv.id || idx}>
                                            <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {inv.invoiceNumber || `#INV-${idx + 1}`}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-mono">
                                                {inv.date || inv.issueDate || '2026-01-10'}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                                {inv.term || inv.title || 'Term Tuition & Academic Billing'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                                KSh {(Number(inv.amount || inv.totalAmount || 0)).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Receipts Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">2. Payment &amp; Receipt Records</h4>
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-3">Receipt #</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Payment Mode · Reference</th>
                                        <th className="px-4 py-3 text-right">Amount Paid</th>
                                        <th className="px-4 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {studentReceipts.map((rec, idx) => (
                                        <tr key={rec.id || idx}>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    🧾 {rec.receiptNumber || `RCPT-${idx + 1000}`}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-mono">
                                                {rec.paymentDate || rec.date || '2026-01-15'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                                    {rec.paymentMethod || 'M-Pesa'}
                                                </span>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                    Ref: {rec.relatedTransactionId || rec.ref || 'Direct'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                KSh {(Number(rec.amountPaid || rec.amount || 0)).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => alert(`Downloading verified PDF for Receipt ${rec.receiptNumber || 'RCPT'}...`)}
                                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                                >
                                                    <ArrowDownTrayIcon className="w-3.5 h-3.5" /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 2: ONLINE PAYMENT (M-PESA STK PUSH) ── */}
            {activePortalTab === 'online_payment' && currentStudent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
                        <div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Instant M-Pesa Express</span>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">Pay Fees Online</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                An instant PIN prompt will be sent to the parent's phone. Balance updates automatically upon payment.
                            </p>
                        </div>

                        <form onSubmit={handleInitiateStkPush} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Student Account</label>
                                <input
                                    type="text"
                                    disabled
                                    value={`${currentStudent.name} (ADM: ${currentStudent.admissionNumber || currentStudent.admission_number || '3175'})`}
                                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Parent Phone (Safaricom M-Pesa)</label>
                                <input
                                    type="text"
                                    value={stkPhone}
                                    onChange={(e) => setStkPhone(e.target.value)}
                                    placeholder="254712345678"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Amount to Pay (KSh)</label>
                                <input
                                    type="number"
                                    value={stkAmount}
                                    onChange={(e) => setStkAmount(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-lg text-emerald-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSendingStk}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isSendingStk ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <DevicePhoneMobileIcon className="w-4 h-4" />
                                )}
                                <span>Send STK Push Prompt</span>
                            </button>

                            {stkStatus && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                                    {stkStatus}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Paybill Instructions Card */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Manual Paybill Option</h4>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold">Business Number (Paybill):</span>
                                    <span className="font-mono font-black text-slate-900 dark:text-white text-base">522522</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold">Account Number:</span>
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">{currentStudent.admissionNumber || '3175'}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Enter the student admission number as the account name so the system can automatically match your transaction in under 2 seconds.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 3: PROMISE TO PAY (PTP) PLAN ── */}
            {activePortalTab === 'ptp_plan' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
                        <div>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Installment Agreement</span>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">Commitment Plan (PTP)</h3>
                            <p className="text-xs text-slate-400 mt-1">Record formal fee installment commitments with automated SMS reminders.</p>
                        </div>

                        <form onSubmit={handleCreatePtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Commitment Amount (KSh)</label>
                                <input
                                    type="number"
                                    value={ptpAmount}
                                    onChange={(e) => setPtpAmount(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Promised Clearance Date</label>
                                <input
                                    type="date"
                                    value={ptpDate}
                                    onChange={(e) => setPtpDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Agreement Notes / Payer Memo</label>
                                <textarea
                                    rows={2}
                                    value={ptpNote}
                                    onChange={(e) => setPtpNote(e.target.value)}
                                    placeholder="e.g. Clears half on 15th, second half at month-end..."
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <CheckBadgeIcon className="w-4 h-4" /> Record Commitment Plan
                            </button>
                        </form>
                    </div>

                    {/* Active PTP Plans */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-sm">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Installment Commitments</h4>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {savedPtps.map(ptp => (
                                <div key={ptp.id} className="py-4 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                                                KSh {ptp.amount.toLocaleString()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                Due: {ptp.date}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{ptp.note}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 4: WHATSAPP BOT SIMULATOR ── */}
            {activePortalTab === 'whatsapp_bot' && (
                <div className="flex justify-center">
                    <div className="w-full max-w-md bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-800 relative">
                        {/* Phone Screen Mockup */}
                        <div className="bg-slate-950 rounded-[2.5rem] overflow-hidden flex flex-col h-[520px] border border-slate-800">
                            {/* WhatsApp Chat Header */}
                            <div className="bg-emerald-800 text-white p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold">
                                    <BuildingLibraryIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black">{institution.name || 'School'} Finance Bot</h4>
                                    <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online · Verified Account
                                    </p>
                                </div>
                            </div>

                            {/* Chat Messages Body */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                                {botMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-emerald-600 text-white rounded-br-none'
                                                : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                                        }`}>
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            {msg.pdfLink && (
                                                <button
                                                    type="button"
                                                    onClick={() => alert('Downloading official signed PDF document...')}
                                                    className="mt-2 w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <ArrowDownTrayIcon className="w-3 h-3" /> Download Verified PDF
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.time}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Chat Input Bar */}
                            <form onSubmit={handleSendBotMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={botInput}
                                    onChange={(e) => setBotInput(e.target.value)}
                                    placeholder="Type 'BALANCE', 'STATEMENT', 'PAY'..."
                                    className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="submit"
                                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl active:scale-95 transition-all cursor-pointer"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
