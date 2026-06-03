import React, { useState, useEffect } from 'react';
import { CreditCard, Sparkles, Smartphone, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { CarInvoice, CarListing } from '../../types';

interface PublicCarInvoicePaymentProps {
    invoiceId: string;
}

export const PublicCarInvoicePayment: React.FC<PublicCarInvoicePaymentProps> = ({ invoiceId }) => {
    const [invoice, setInvoice] = useState<CarInvoice | null>(null);
    const [listing, setListing] = useState<CarListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [paying, setPaying] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'prompt_sent' | 'completed' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [checkoutRequestId, setCheckoutRequestId] = useState('');

    useEffect(() => {
        const fetchInvoiceDetails = async () => {
            try {
                const { apiService } = await import('../../services/apiService');
                const db = apiService.getSupabase();
                if (!db) {
                    throw new Error("Database not initialized");
                }

                // Fetch invoice
                const { data: invData, error: invErr } = await db
                    .from('car_sales_invoices')
                    .select('*')
                    .eq('id', invoiceId)
                    .maybeSingle();

                if (invErr) throw invErr;
                if (!invData) {
                    setError("Invoice not found or has been removed.");
                    setLoading(false);
                    return;
                }

                // Convert snake_case to camelCase
                const camelInv: CarInvoice = {
                    id: invData.id,
                    listingId: invData.listing_id,
                    institutionId: invData.institution_id,
                    clientName: invData.client_name,
                    clientEmail: invData.client_email,
                    clientPhone: invData.client_phone,
                    totalAmount: invData.total_amount,
                    paidAmount: invData.paid_amount,
                    balanceAmount: invData.balance_amount,
                    status: invData.status,
                    dueDate: invData.due_date,
                    invoiceNumber: invData.invoice_number,
                    registrationNumber: invData.registration_number,
                    notes: invData.notes,
                    isInstallment: invData.is_installment,
                    installmentFrequency: invData.installment_frequency,
                    totalInstallments: invData.total_installments,
                    installmentAmount: invData.installment_amount,
                    startDate: invData.start_date,
                    createdAt: invData.created_at,
                    updatedAt: invData.updated_at
                };

                setInvoice(camelInv);
                setPhone(camelInv.clientPhone || '');
                setAmount(String(camelInv.balanceAmount || camelInv.totalAmount - camelInv.paidAmount));

                // Fetch listing details if listingId exists
                if (camelInv.listingId) {
                    const { data: lstData } = await db
                        .from('car_listings')
                        .select('*')
                        .eq('id', camelInv.listingId)
                        .maybeSingle();

                    if (lstData) {
                        const camelLst: CarListing = {
                            id: lstData.id,
                            institutionId: lstData.institution_id,
                            sellerId: lstData.seller_id,
                            make: lstData.make,
                            model: lstData.model,
                            year: lstData.year,
                            trim: lstData.trim,
                            price: lstData.price,
                            mileage: lstData.mileage,
                            fuelType: lstData.fuel_type,
                            transmission: lstData.transmission,
                            bodyType: lstData.body_type,
                            engineSize: lstData.engine_size,
                            color: lstData.color,
                            mainImageUrl: lstData.main_image_url,
                            galleryUrls: lstData.gallery_urls,
                            tour360Url: lstData.tour_360_url,
                            videoWalkthroughUrl: lstData.video_walkthrough_url,
                            inspectionReportUrl: lstData.inspection_report_url,
                            aiValuationStatus: lstData.ai_valuation_status,
                            estimatedMarketValue: lstData.estimated_market_value,
                            inspectionScore: lstData.inspection_score,
                            registrationNumber: lstData.registration_number,
                            vinNumber: lstData.vin_number,
                            verifiedHistory: lstData.verified_history,
                            status: lstData.status,
                            viewCount: lstData.view_count || 0,
                            inquiryCount: lstData.inquiry_count || 0,
                            createdAt: lstData.created_at
                        };
                        setListing(camelLst);
                    }
                }
            } catch (err: any) {
                console.error("Failed to load invoice:", err);
                setError(err.message || "Failed to load invoice details.");
            } finally {
                setLoading(false);
            }
        };

        if (invoiceId) {
            fetchInvoiceDetails();
        } else {
            setError("Invalid payment link: missing invoice identifier.");
            setLoading(false);
        }
    }, [invoiceId]);

    // Poll payment status
    useEffect(() => {
        if (!checkoutRequestId || paymentStatus !== 'prompt_sent') return;

        let attempts = 0;
        const maxAttempts = 24; // 24 * 5s = 120s
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
                const { apiService } = await import('../../services/apiService');
                const statusRes = await apiService.checkPaymentStatus('kcb', checkoutRequestId);

                if (statusRes.success && (statusRes.status === 'Completed' || statusRes.status === 'Success' || statusRes.resultCode === '0')) {
                    clearInterval(interval);
                    setPaymentStatus('completed');
                    setStatusMessage(`Payment confirmed! KES ${parseFloat(amount)?.toLocaleString()} received successfully.`);
                    setPaying(false);

                    // Re-load invoice to show updated balance
                    const db = apiService.getSupabase();
                    if (db && invoice) {
                        const { data } = await db.from('car_sales_invoices').select('*').eq('id', invoice.id).maybeSingle();
                        if (data) {
                            setInvoice(prev => prev ? {
                                ...prev,
                                paidAmount: data.paid_amount,
                                balanceAmount: data.balance_amount,
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
                console.warn("Status check failed, retrying...", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [checkoutRequestId, paymentStatus, amount]);

    const handleInitiatePayment = async () => {
        if (!phone.trim()) {
            alert("Please enter your M-Pesa phone number.");
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        if (invoice && parseFloat(amount) > invoice.balanceAmount) {
            alert(`Amount exceeds outstanding balance of KES ${invoice.balanceAmount?.toLocaleString()}.`);
            return;
        }

        setPaying(true);
        setPaymentStatus('idle');
        setStatusMessage("Sending payment request prompt...");

        try {
            const { apiService } = await import('../../services/apiService');
            
            // 1. Post STK push trigger
            const response = await apiService.post('/api/payments/kcb-stk-push', {
                customerMobileNumber: phone,
                transactionAmount: amount,
                customerReference: invoice?.invoiceNumber || `INV_${invoiceId}`,
                customerName: invoice?.clientName || 'Valued Client',
                narration: `Payment for Vehicle Invoice ${invoice?.invoiceNumber}`,
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
                    payerName: invoice?.clientName || 'Guest Client',
                    status: 'pending',
                    provider: 'kcb',
                    customer_reference: invoice?.invoiceNumber || `INV_${invoiceId}`,
                    customer_name: invoice?.clientName || 'Guest Client',
                    customer_mobile_number: phone,
                    balance: parseFloat(amount),
                    narration: `Payment for Vehicle Invoice ${invoice?.invoiceNumber}`,
                    credit_account_identifier: invoice?.institutionId,
                    metadata: { 
                        type: 'car_invoice', 
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Invoice Details...</p>
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

    const outstandingBalance = invoice.totalAmount - invoice.paidAmount;
    const paidPercentage = Math.min(100, Math.round((invoice.paidAmount / invoice.totalAmount) * 100));

    return (
        <div className="min-h-screen bg-slate-955 text-slate-100 font-sans flex flex-col justify-between">
            {/* Header */}
            <header className="px-8 py-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">
                            EA
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight text-white">Automotive Marketplace</h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Portal & Billing</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 flex-grow w-full flex flex-col lg:flex-row gap-12 items-stretch">
                {/* Left Panel: Vehicle Details */}
                <div className="flex-1 bg-slate-900/40 rounded-[3rem] border border-slate-900 p-8 flex flex-col justify-between gap-8 shadow-sm">
                    <div>
                        <div className="aspect-[16/10] rounded-[2rem] overflow-hidden bg-slate-950 mb-8 border border-slate-900 relative group">
                            {listing?.mainImageUrl ? (
                                <img 
                                    src={listing.mainImageUrl} 
                                    alt={`${listing.year} ${listing.make} ${listing.model}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                    <Sparkles className="w-12 h-12 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Image Available</p>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 px-4 py-2 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-200">
                                {listing?.registrationNumber || invoice.registrationNumber || "VEHICLE"}
                            </div>
                        </div>

                        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                            {listing ? `${listing.year} ${listing.make} ${listing.model}` : "Special Vehicle Order"}
                        </h2>
                        {listing?.trim && (
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{listing.trim} • {listing.fuelType} • {listing.transmission}</p>
                        )}

                        <div className="grid grid-cols-2 gap-6 mt-8">
                            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-900">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Invoice Number</p>
                                <p className="text-sm font-black text-slate-200 uppercase">{invoice.invoiceNumber}</p>
                            </div>
                            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-900">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client Name</p>
                                <p className="text-sm font-black text-slate-200 uppercase">{invoice.clientName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Financial Progress Bar */}
                    <div className="border-t border-slate-900 pt-8 space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Paid to Date</p>
                                <p className="text-2xl font-black text-emerald-500">KES {invoice.paidAmount?.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Valuation</p>
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
                            <span>{paidPercentage}% Paid</span>
                            <span>KES {outstandingBalance?.toLocaleString()} Remaining</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Payment Screen */}
                <div className="flex-1 bg-slate-900/40 rounded-[3rem] border border-slate-900 p-8 flex flex-col justify-between gap-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="space-y-8">
                        <div>
                            <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
                                Direct M-Pesa Settlement
                            </span>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mt-4 mb-2">Pay Outstanding Balance</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Enter your phone number and confirm payment. You will receive an instant STK Push prompt on your mobile screen.
                            </p>
                        </div>

                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-900 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Payment Status</p>
                                <p className="text-xs font-black text-slate-200 uppercase tracking-tight">{invoice.status.replace('_', ' ')}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                invoice.status === 'fully_paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                invoice.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                                {invoice.status === 'fully_paid' ? 'Paid' : 'Pending Action'}
                            </span>
                        </div>

                        {invoice.status === 'fully_paid' ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10 p-6">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                                <h4 className="text-lg font-black uppercase tracking-tight text-white">Invoice Settled</h4>
                                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                                    Thank you! This invoice has been fully paid and reconciled. A receipt has been dispatched.
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
                                            Processing Transaction...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" /> Initiate STK Prompt
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-900 pt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure 256-bit SSL encrypted bank transaction
                    </div>
                </div>
            </main>

            <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                &copy; {new Date().getFullYear()} Eduai Automation Systems. All rights reserved.
            </footer>
        </div>
    );
};
