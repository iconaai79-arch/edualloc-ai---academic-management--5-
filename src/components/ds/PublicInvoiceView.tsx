import React, { useState, useEffect } from 'react';
import { CreditCard, Sparkles, Smartphone, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, Printer, Download } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { generateDSPDF } from '../../utils/dsPdfGenerator';

interface PublicInvoiceViewProps {
    invoiceId: string;
}

export const PublicInvoiceView: React.FC<PublicInvoiceViewProps> = ({ invoiceId }) => {
    const [invoice, setInvoice] = useState<any | null>(null);
    const [student, setStudent] = useState<any | null>(null);
    const [institution, setInstitution] = useState<any | null>(null);
    const [settings, setSettings] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [paying, setPaying] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'prompt_sent' | 'completed' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [checkoutRequestId, setCheckoutRequestId] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const db = apiService.getSupabase();
                if (!db) {
                    throw new Error("Database offline mode active");
                }

                // 1. Fetch invoice
                const { data: invData, error: invErr } = await db
                    .from('ds_invoices')
                    .select('*')
                    .eq('id', invoiceId)
                    .maybeSingle();

                if (invErr) throw invErr;
                if (!invData) {
                    setError("Invoice details could not be found.");
                    setLoading(false);
                    return;
                }

                // 2. Fetch student details
                const { data: studData } = await db
                    .from('ds_students')
                    .select('*')
                    .eq('id', invData.studentId || invData.student_id)
                    .maybeSingle();

                // 3. Fetch institution
                const { data: instData } = await db
                    .from('institutions')
                    .select('*')
                    .eq('id', invData.institutionId || invData.institution_id)
                    .maybeSingle();

                // 4. Fetch settings
                const { data: settingsData } = await db
                    .from('ds_settings')
                    .select('*')
                    .eq('institutionId', invData.institutionId || invData.institution_id)
                    .maybeSingle();

                // Normalize case formats
                const invoiceNormalized = {
                    id: invData.id,
                    invoiceNumber: invData.invoiceNumber || invData.invoice_number,
                    studentId: invData.studentId || invData.student_id,
                    studentName: invData.studentName || invData.student_name,
                    totalAmount: invData.totalAmount || invData.total_amount,
                    paidAmount: invData.paidAmount || invData.paid_amount || 0,
                    balance: invData.balance !== undefined ? invData.balance : (invData.totalAmount - (invData.paidAmount || 0)),
                    status: invData.status,
                    items: invData.items || [],
                    institutionId: invData.institutionId || invData.institution_id,
                    createdAt: invData.createdAt || invData.created_at
                };

                setInvoice(invoiceNormalized);
                setStudent(studData);
                setInstitution(instData);
                setSettings(settingsData);
                
                setPhone(studData?.phone || '');
                setAmount(String(invoiceNormalized.balance));
            } catch (err: any) {
                console.error("Failed to load public invoice details:", err);
                // Fallback to local storage if supabase fails/offline
                try {
                    const localInvoices = JSON.parse(localStorage.getItem('ds_invoices') || '[]');
                    const inv = localInvoices.find((i: any) => i.id === invoiceId);
                    if (inv) {
                        const localStudents = JSON.parse(localStorage.getItem('ds_students') || '[]');
                        const stud = localStudents.find((s: any) => s.id === inv.studentId);
                        const localInsts = JSON.parse(localStorage.getItem('institutions') || '[]');
                        const inst = localInsts.find((i: any) => i.id === inv.institutionId);
                        const localSettings = JSON.parse(localStorage.getItem('ds_settings') || '[]');
                        const sets = localSettings.find((s: any) => s.institutionId === inv.institutionId);

                        setInvoice(inv);
                        setStudent(stud);
                        setInstitution(inst);
                        setSettings(sets);
                        setPhone(stud?.phone || '');
                        setAmount(String(inv.balance));
                        setLoading(false);
                        return;
                    }
                } catch (e) {}
                setError(err.message || "Failed to load invoice details.");
            } finally {
                setLoading(false);
            }
        };

        if (invoiceId) {
            fetchDetails();
        } else {
            setError("Missing invoice identifier.");
            setLoading(false);
        }
    }, [invoiceId]);

    // Poll payment status
    useEffect(() => {
        if (!checkoutRequestId || paymentStatus !== 'prompt_sent') return;

        let attempts = 0;
        const maxAttempts = 24; // 120s
        const interval = setInterval(async () => {
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setPaymentStatus('failed');
                setStatusMessage("Verification timed out. If you already completed the payment, it will reflect within 24 hours.");
                setPaying(false);
                return;
            }

            try {
                const statusRes = await apiService.checkPaymentStatus('kcb', checkoutRequestId);
                if (statusRes.success && (statusRes.status === 'Completed' || statusRes.status === 'Success' || statusRes.resultCode === '0')) {
                    clearInterval(interval);
                    setPaymentStatus('completed');
                    setStatusMessage(`Payment confirmed! KES ${parseFloat(amount)?.toLocaleString()} received successfully.`);
                    setPaying(false);

                    // Refresh invoice state
                    const db = apiService.getSupabase();
                    if (db && invoice) {
                        const { data } = await db.from('ds_invoices').select('*').eq('id', invoice.id).maybeSingle();
                        if (data) {
                            setInvoice(prev => prev ? {
                                ...prev,
                                paidAmount: data.paid_amount || data.paidAmount,
                                balance: data.balance !== undefined ? data.balance : (data.total_amount - (data.paid_amount || 0)),
                                status: data.status
                            } : null);
                        }
                    }
                } else if (statusRes.status === 'Failed' || statusRes.resultCode === '1') {
                    clearInterval(interval);
                    setPaymentStatus('failed');
                    setStatusMessage(statusRes.message || "Payment request was cancelled or failed on your mobile phone.");
                    setPaying(false);
                }
            } catch (err) {
                console.warn("Status check warning, retrying...", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [checkoutRequestId, paymentStatus, amount, invoice]);

    const handleInitiatePayment = async () => {
        if (!phone.trim()) {
            alert("Please enter your M-Pesa phone number.");
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        if (invoice && parseFloat(amount) > invoice.balance) {
            alert(`Amount exceeds outstanding balance of KES ${invoice.balance?.toLocaleString()}.`);
            return;
        }

        setPaying(true);
        setPaymentStatus('idle');
        setStatusMessage("Sending payment request prompt...");

        try {
            // 1. Post STK push trigger
            const response = await apiService.post('/api/payments/kcb-stk-push', {
                customerMobileNumber: phone,
                transactionAmount: amount,
                customerReference: invoice?.invoiceNumber || `INV_${invoiceId}`,
                customerName: invoice?.studentName || student?.fullName || 'Candidate Client',
                narration: `Payment for Driving School Invoice ${invoice?.invoiceNumber}`,
                creditAccountIdentifier: invoice?.institutionId,
                config: {}
            });

            if (response.success || response.ResponseCode === '0') {
                const reqId = response.CheckoutRequestID || `KCB_CO_${Date.now()}`;
                setCheckoutRequestId(reqId);
                setPaymentStatus('prompt_sent');
                setStatusMessage("Prompt dispatched! Check your phone to enter your M-Pesa PIN.");

                // 2. Write pending transaction record so callback matches it
                await apiService.saveModuleRecord('mpesa_transactions', {
                    id: `txn_${Date.now()}`,
                    transactionId: reqId,
                    checkoutRequestId: reqId,
                    institutionId: invoice?.institutionId || 'SYSTEM',
                    amount: parseFloat(amount),
                    phoneNumber: phone,
                    payerName: invoice?.studentName || student?.fullName || 'Candidate Client',
                    status: 'pending',
                    provider: 'kcb',
                    customer_reference: invoice?.invoiceNumber || `INV_${invoiceId}`,
                    customer_name: invoice?.studentName || student?.fullName || 'Candidate Client',
                    customer_mobile_number: phone,
                    balance: parseFloat(amount),
                    narration: `Payment for Driving School Invoice ${invoice?.invoiceNumber}`,
                    credit_account_identifier: invoice?.institutionId,
                    metadata: { 
                        type: 'ds_invoice', 
                        invoiceId: invoiceId,
                        requesterId: 'SYSTEM'
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                setPaymentStatus('failed');
                const detailsMsg = response.details ? ` (${typeof response.details === 'object' ? JSON.stringify(response.details) : response.details})` : '';
                setStatusMessage((response.message || "Failed to trigger payment prompt. Try again or contact support.") + detailsMsg);
                setPaying(false);
            }
        } catch (err: any) {
            setPaymentStatus('failed');
            setStatusMessage("Gateway connectivity failed: " + (err.message || err));
            setPaying(false);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const doc = await generateDSPDF('invoice', invoice, student || { fullName: invoice.studentName }, settings, institution);
            doc.save(`${invoice.invoiceNumber || 'Invoice'}.pdf`);
        } catch (e: any) {
            console.error("PDF Generation error client-side:", e);
            alert("Could not generate PDF: " + e.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Invoice...</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 font-sans">
                <div className="w-16 h-16 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Access Error</h2>
                <p className="text-sm text-slate-400 max-w-md text-center mb-8">{error || "Could not retrieve invoice details."}</p>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                    Return Home
                </button>
            </div>
        );
    }

    const paidPercentage = Math.min(100, Math.round((invoice.paidAmount / invoice.totalAmount) * 100));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
            {/* Header */}
            <header className="px-8 py-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">
                            DS
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight text-white">{institution?.name || "Driving School"}</h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Self-Service Billing Portal</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Return Home
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 flex-grow w-full flex flex-col lg:flex-row gap-12 items-stretch">
                {/* Left Panel: Invoice Details & Items */}
                <div className="flex-1 bg-slate-900/40 rounded-[3rem] border border-slate-900 p-8 flex flex-col justify-between gap-8 shadow-sm">
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    Official Invoice
                                </span>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-3">
                                    #{invoice.invoiceNumber}
                                </h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Created: {new Date(invoice.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                            >
                                <Download className="w-3.5 h-3.5" /> Download PDF
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-900">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Student / Candidate</p>
                                <p className="text-sm font-black text-slate-200 uppercase">{invoice.studentName}</p>
                                {student?.admissionNumber && (
                                    <p className="text-[10px] text-slate-400 font-medium">Adm No: {student.admissionNumber}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Institution</p>
                                <p className="text-sm font-black text-slate-200 uppercase">{institution?.name || "Driving School"}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="pt-6 border-t border-slate-900">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Billed Breakdown</p>
                            <div className="space-y-3">
                                {invoice.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-3 px-4 bg-slate-950/40 rounded-xl border border-slate-900">
                                        <div>
                                            <p className="text-xs font-black text-slate-200 uppercase">{item.name}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Priority: {item.priority || "Standard"}</p>
                                        </div>
                                        <p className="text-xs font-black text-slate-300">KES {item.amount?.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Financial Progress Bar */}
                    <div className="border-t border-slate-900 pt-8 space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Amount Paid</p>
                                <p className="text-2xl font-black text-emerald-500">KES {invoice.paidAmount?.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Bill</p>
                                <p className="text-lg font-black text-slate-400">KES {invoice.totalAmount?.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-900">
                            <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${paidPercentage}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <span>{paidPercentage}% Reconciled</span>
                            <span>KES {invoice.balance?.toLocaleString()} Outstanding</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Payment Screen */}
                <div className="flex-1 bg-slate-900/40 rounded-[3rem] border border-slate-900 p-8 flex flex-col justify-between gap-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="space-y-8">
                        <div>
                            <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
                                M-Pesa Settlement
                            </span>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mt-4 mb-2">Pay Invoice Balance</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Enter your phone number and confirm payment. You will receive an instant STK Push prompt on your mobile screen.
                            </p>
                        </div>

                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-900 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                <p className="text-xs font-black text-slate-200 uppercase tracking-tight">{invoice.status}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                invoice.status === 'Fully Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                invoice.status === 'Partially Paid' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                                {invoice.status === 'Fully Paid' ? 'Settled' : 'Pending Action'}
                            </span>
                        </div>

                        {invoice.status === 'Fully Paid' ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10 p-6">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                                <h4 className="text-lg font-black uppercase tracking-tight text-white">Invoice Fully Paid</h4>
                                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                                    This invoice is fully settled and reconciled in the driving school ledger. Thank you!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">M-Pesa Phone Number</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. 254711112222"
                                            className="w-full h-14 pl-14 pr-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                            disabled={paying}
                                        />
                                        <Smartphone className="w-5 h-5 absolute left-5 top-[18px] text-slate-500" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount to Pay (KES)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="e.g. 1000"
                                            className="w-full h-14 pl-14 pr-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            disabled={paying}
                                        />
                                        <CreditCard className="w-5 h-5 absolute left-5 top-[18px] text-slate-500" />
                                    </div>
                                </div>

                                {paymentStatus !== 'idle' && (
                                    <div className={`p-5 rounded-2xl text-xs font-bold border flex items-start gap-3 ${
                                        paymentStatus === 'prompt_sent' ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10' :
                                        paymentStatus === 'completed' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' :
                                        'bg-rose-500/5 text-rose-400 border-rose-500/10'
                                    }`}>
                                        {paymentStatus === 'prompt_sent' ? (
                                            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
                                        ) : paymentStatus === 'completed' ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                                        )}
                                        <span>{statusMessage}</span>
                                    </div>
                                )}

                                <button
                                    onClick={handleInitiatePayment}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                    disabled={paying}
                                >
                                    {paying ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Sending STK push prompt...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" /> Send STK Prompt
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-900 pt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure 256-bit SSL encrypted transaction
                    </div>
                </div>
            </main>

            <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                &copy; {new Date().getFullYear()} {institution?.name || "Driving School"}. All rights reserved.
            </footer>
        </div>
    );
};
