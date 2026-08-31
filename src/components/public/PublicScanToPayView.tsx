import React, { useState, useEffect, useRef } from 'react';
import { 
    SmartphoneIcon, ShieldCheckIcon, SparklesIcon, CheckCircleIcon, 
    ArrowPathIcon, ChevronLeftIcon, PrinterIcon, DownloadIcon,
    InformationCircleIcon, ShareIcon, LockClosedIcon, CheckBadgeIcon,
    ExclamationTriangleIcon, QrCodeIcon, BanknotesIcon
} from '../icons';
import { MpesaIcon } from '../icons/MpesaIcon';
import { apiService } from '../../services/apiService';
import { formatPhoneNumber } from '../../utils/stringUtils';
import type { CompanyDetails, Institution } from '../../types';

interface PublicScanToPayViewProps {
    companyDetails?: CompanyDetails;
    institutions?: Institution[];
    onBackToPortal?: () => void;
}

export const PublicScanToPayView: React.FC<PublicScanToPayViewProps> = ({
    companyDetails,
    institutions = [],
    onBackToPortal
}) => {
    const params = new URLSearchParams(window.location.search);
    const initialAmount = params.get('amount') || params.get('amt') || '';
    const initialRef = params.get('ref') || params.get('account') || params.get('accountRef') || params.get('acc') || 'EDUAI-DIRECT';
    const initialTitle = params.get('title') || params.get('purpose') || 'Direct Checkout & Service Payment';
    const initialDesc = params.get('desc') || params.get('memo') || '';
    const initialPhone = params.get('phone') || params.get('mobile') || '';
    const initialInstId = params.get('inst') || params.get('institutionId') || '';

    // Selected / Active Institution or Super Admin Global
    const matchedInstitution = institutions.find(i => i.id === initialInstId);
    const mpesaConfig = matchedInstitution?.mpesaConfig || companyDetails?.mpesaConfig || {
        paybillNumber: '4086655',
        environment: 'sandbox'
    };

    const businessName = matchedInstitution?.name || companyDetails?.companyName || 'EduAI Automation Systems';
    const paybillNumber = mpesaConfig.paybillNumber || '4086655';

    // State
    const [amount, setAmount] = useState<string>(initialAmount);
    const [isAmountLocked, setIsAmountLocked] = useState<boolean>(Boolean(initialAmount && Number(initialAmount) > 0 && params.get('fixed') === 'true'));
    const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
    const [payerName, setPayerName] = useState<string>('');
    const [accountRef, setAccountRef] = useState<string>(initialRef);
    const [notes, setNotes] = useState<string>(initialDesc);

    // Payment Processing State
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'prompt_sent' | 'polling' | 'completed' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
    const [receiptDetails, setReceiptDetails] = useState<any>(null);
    const [countdown, setCountdown] = useState<number>(60);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [showManualInstructions, setShowManualInstructions] = useState<boolean>(false);

    // Generate Shareable QR on mount
    useEffect(() => {
        const QRCodeLib = (window as any).QRCode;
        if (QRCodeLib) {
            const currentUrl = window.location.href;
            QRCodeLib.toDataURL(currentUrl, {
                width: 320,
                margin: 2,
                color: { dark: '#047857', light: '#ffffff' }
            }, (err: any, url: string) => {
                if (!err) setQrCodeDataUrl(url);
            });
        }
    }, [amount, accountRef]);

    // Timer Countdown during STK prompt
    useEffect(() => {
        let timer: any;
        if ((paymentStatus === 'prompt_sent' || paymentStatus === 'polling') && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [paymentStatus, countdown]);

    // Live STK Status Polling
    useEffect(() => {
        if (!checkoutRequestId || (paymentStatus !== 'prompt_sent' && paymentStatus !== 'polling')) return;

        let pollCount = 0;
        const maxPolls = 20; // 20 * 3s = 60s
        const pollInterval = setInterval(async () => {
            pollCount++;
            if (pollCount >= maxPolls || countdown <= 0) {
                clearInterval(pollInterval);
                if (paymentStatus !== 'completed') {
                    setPaymentStatus('failed');
                    setStatusMessage('Verification timed out. If you entered your M-Pesa PIN, your payment was received and will be reflected shortly.');
                    setIsProcessing(false);
                }
                return;
            }

            try {
                const statusRes = await apiService.checkPaymentStatus('mpesa', checkoutRequestId);
                if (statusRes && (statusRes.success || statusRes.status === 'Completed' || statusRes.resultCode === '0' || statusRes.ResultCode === 0)) {
                    clearInterval(pollInterval);
                    const finalReceipt = {
                        transactionId: statusRes.mpesaReceiptNumber || statusRes.transactionId || `MPESA_${Date.now()}`,
                        amount: Number(amount) || 0,
                        phoneNumber: formatPhoneNumber(phoneNumber),
                        payerName: payerName || 'Valued Customer',
                        accountRef: accountRef,
                        businessName: businessName,
                        paybillNumber: paybillNumber,
                        timestamp: new Date().toLocaleString()
                    };
                    setReceiptDetails(finalReceipt);
                    setPaymentStatus('completed');
                    setStatusMessage(`Payment of KES ${Number(amount).toLocaleString()} confirmed successfully!`);
                    setIsProcessing(false);
                } else if (statusRes && (statusRes.status === 'Failed' || statusRes.resultCode === '1' || statusRes.resultCode === '1032')) {
                    clearInterval(pollInterval);
                    setPaymentStatus('failed');
                    setStatusMessage(statusRes.message || 'M-Pesa transaction was cancelled or failed on your mobile phone.');
                    setIsProcessing(false);
                }
            } catch (err) {
                console.warn('[ScanToPay] Status polling check:', err);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [checkoutRequestId, paymentStatus, countdown, amount, phoneNumber, payerName, accountRef, businessName, paybillNumber]);

    const handleInitiateStkPush = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        if (!formattedPhone || formattedPhone.length < 10) {
            alert('Please enter a valid Safaricom phone number (e.g. 0712345678 or 254712345678).');
            return;
        }

        setIsProcessing(true);
        setPaymentStatus('prompt_sent');
        setStatusMessage(`Sending STK Push prompt to ${formattedPhone}...`);
        setCountdown(60);

        try {
            const metadata = {
                institutionId: matchedInstitution?.id || 'GLOBAL',
                accountRef: accountRef.trim() || 'DIRECT_PAY',
                payerName: payerName.trim() || 'Guest Customer',
                source: 'scan_to_pay_qr',
                purpose: initialTitle,
                notes: notes
            };

            const result = await apiService.initiatePayment('mpesa', numAmount, formattedPhone, metadata, mpesaConfig);

            if (result && result.success) {
                const reqId = result.checkoutRequestId || result.CheckoutRequestID || result.requestId || `STK_${Date.now()}`;
                setCheckoutRequestId(reqId);
                setPaymentStatus('polling');
                setStatusMessage(`Prompt sent to ${formattedPhone}! Please check your phone and enter your M-Pesa PIN.`);
            } else {
                setPaymentStatus('failed');
                setStatusMessage(result?.message || 'Unable to initiate STK push. Please verify your phone number and try again.');
                setIsProcessing(false);
            }
        } catch (err: any) {
            console.error('[ScanToPay] Initiation Error:', err);
            setPaymentStatus('failed');
            setStatusMessage(err?.message || 'Gateway connection error. Please try again or use manual Paybill.');
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        if (!receiptDetails) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${receiptDetails.transactionId}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #fff; color: #1e293b; max-width: 480px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 20px; }
                    .badge { display: inline-block; background: #047857; color: #fff; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
                    .title { font-size: 20px; font-weight: 900; margin: 12px 0 4px; text-transform: uppercase; }
                    .amount { font-size: 32px; font-weight: 900; color: #047857; margin: 16px 0; }
                    .row { display: flex; justify-content: space-between; font-size: 13px; margin: 8px 0; }
                    .label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; }
                    .val { font-weight: 800; }
                    .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 2px dashed #cbd5e1; padding-top: 20px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <span class="badge">Official e-Receipt</span>
                    <div class="title">${receiptDetails.businessName}</div>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Lipa Na M-Pesa Online Transaction</p>
                    <div class="amount">KES ${receiptDetails.amount.toLocaleString()}</div>
                </div>
                <div class="row"><span class="label">M-Pesa Ref</span><span class="val" style="font-family: monospace;">${receiptDetails.transactionId}</span></div>
                <div class="row"><span class="label">Paybill</span><span class="val">${receiptDetails.paybillNumber}</span></div>
                <div class="row"><span class="label">Account Ref</span><span class="val">${receiptDetails.accountRef}</span></div>
                <div class="row"><span class="label">Payer Phone</span><span class="val">${receiptDetails.phoneNumber}</span></div>
                <div class="row"><span class="label">Payer Name</span><span class="val">${receiptDetails.payerName}</span></div>
                <div class="row"><span class="label">Date & Time</span><span class="val">${receiptDetails.timestamp}</span></div>
                <div class="row"><span class="label">Status</span><span class="val" style="color: #047857;">VERIFIED & COMPLETED</span></div>
                <div class="footer">
                    <p>Thank you for your payment!</p>
                    <p>Powered by EduAI Autonomous Digital Financial Ecosystem</p>
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleShareLink = () => {
        if (navigator.share) {
            navigator.share({
                title: `Pay ${businessName}`,
                text: `Scan to Pay or click to make an instant M-Pesa STK payment to ${businessName}`,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Payment link copied to clipboard!');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
            {/* Ambient Lighting Orbs */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header Navigation */}
            <header className="max-w-xl w-full mx-auto flex justify-between items-center z-10 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black">
                        <MpesaIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Scan & Pay</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-900/50 text-emerald-300 border border-emerald-500/30">LIPA NA M-PESA</span>
                        </div>
                        <h1 className="text-sm font-black text-white tracking-tight truncate max-w-[220px] sm:max-w-none">{businessName}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShareLink}
                        title="Share Payment Link"
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95 shadow-sm"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>
                    {onBackToPortal && (
                        <button
                            onClick={onBackToPortal}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-bold transition-all active:scale-95"
                        >
                            <ChevronLeftIcon className="w-3.5 h-3.5" /> Back
                        </button>
                    )}
                </div>
            </header>

            {/* Main Interactive Payment Card */}
            <main className="max-w-xl w-full mx-auto z-10 my-auto">
                <div className="bg-slate-900/85 backdrop-blur-2xl rounded-[2.5rem] border border-slate-800/80 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
                    {/* Top Security Banner */}
                    <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Verified Merchant Gateway</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <span>Paybill:</span>
                            <span className="font-bold">{paybillNumber}</span>
                        </div>
                    </div>

                    {/* State: Completed Success Screen */}
                    {paymentStatus === 'completed' && receiptDetails ? (
                        <div className="text-center py-6 space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 text-white animate-bounce">
                                <CheckBadgeIcon className="w-12 h-12" />
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Payment Successful</span>
                                <h2 className="text-3xl font-black text-white tracking-tight mt-1">KES {receiptDetails.amount.toLocaleString()}</h2>
                                <p className="text-xs text-slate-400 mt-1">Transaction Ref: <span className="font-mono text-emerald-300 font-bold">{receiptDetails.transactionId}</span></p>
                            </div>

                            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 text-left space-y-2.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Merchant:</span>
                                    <span className="font-bold text-slate-200">{receiptDetails.businessName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Account Reference:</span>
                                    <span className="font-bold text-slate-200">{receiptDetails.accountRef}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Mobile Number:</span>
                                    <span className="font-mono font-bold text-slate-200">{receiptDetails.phoneNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Date & Time:</span>
                                    <span className="font-medium text-slate-300">{receiptDetails.timestamp}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={handlePrintReceipt}
                                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Print e-Receipt
                                </button>
                                <button
                                    onClick={() => {
                                        setPaymentStatus('idle');
                                        setCheckoutRequestId('');
                                        setReceiptDetails(null);
                                    }}
                                    className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-2xl uppercase text-xs tracking-widest transition-all border border-slate-700/60 active:scale-[0.98]"
                                >
                                    New Payment
                                </button>
                            </div>
                        </div>
                    ) : (paymentStatus === 'prompt_sent' || paymentStatus === 'polling') ? (
                        /* State: STK Push Prompt Active & Waiting for PIN */
                        <div className="text-center py-6 space-y-6 animate-fade-in">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
                                <div className="relative w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                                    <SmartphoneIcon className="w-12 h-12 animate-pulse" />
                                </div>
                            </div>

                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest mb-2">
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> M-Pesa Prompt Dispatched
                                </span>
                                <h2 className="text-2xl font-black text-white tracking-tight">Check Your Phone Now</h2>
                                <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
                                    An instant Safaricom prompt for <span className="text-emerald-400 font-bold">KES {parseFloat(amount || '0').toLocaleString()}</span> has been sent to <span className="font-mono text-white font-bold">{phoneNumber}</span>. Enter your M-Pesa PIN to complete payment.
                                </p>
                            </div>

                            {/* Timer Progress Bar */}
                            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waiting for PIN Confirmation</p>
                                    <p className="text-xs font-mono text-emerald-400 font-black">Auto-verifying with Safaricom...</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-black text-base text-emerald-400">
                                    {countdown}s
                                </div>
                            </div>

                            {paymentStatus === 'failed' && (
                                <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 text-rose-400" />
                                    <span>{statusMessage}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setPaymentStatus('idle');
                                        setIsProcessing(false);
                                    }}
                                    className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl uppercase text-xs tracking-widest transition-all"
                                >
                                    Cancel & Re-enter Number
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* State: Interactive Payment Form */
                        <form onSubmit={handleInitiateStkPush} className="space-y-5">
                            {/* Service / Purpose Title Banner */}
                            <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-slate-950/60 rounded-2xl border border-emerald-500/20">
                                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                    <SparklesIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Payment Purpose</span>
                                </div>
                                <p className="text-sm font-black text-white tracking-tight">{initialTitle}</p>
                                {initialDesc && <p className="text-xs text-slate-400 mt-0.5">{initialDesc}</p>}
                            </div>

                            {/* Amount Input */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Payment Amount (KES)
                                    </label>
                                    {isAmountLocked && (
                                        <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                                            <LockClosedIcon className="w-3 h-3" /> Fixed Invoice Amount
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-400 font-black text-sm">
                                        KES
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        required
                                        disabled={isAmountLocked}
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={`w-full h-14 pl-16 pr-4 bg-slate-950/80 border text-xl font-black text-white rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${
                                            isAmountLocked ? 'border-slate-800 text-slate-300 opacity-90' : 'border-slate-700 hover:border-slate-600'
                                        }`}
                                    />
                                </div>

                                {/* Preset Amount Pills (if not locked) */}
                                {!isAmountLocked && (
                                    <div className="flex flex-wrap gap-2 mt-2.5">
                                        {[500, 1000, 2500, 5000, 10000].map(preset => (
                                            <button
                                                type="button"
                                                key={preset}
                                                onClick={() => setAmount(String(preset))}
                                                className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                                    amount === String(preset)
                                                        ? 'bg-emerald-600 text-white font-black shadow-sm'
                                                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                                                }`}
                                            >
                                                +{preset.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Phone Number Input */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                    M-Pesa Mobile Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
                                            <span className="text-sm">🇰🇪</span>
                                            <span className="text-xs font-black text-slate-400">+254</span>
                                        </div>
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        placeholder="712345678 or 0712345678"
                                        className="w-full h-14 pl-24 pr-4 bg-slate-950/80 border border-slate-700 hover:border-slate-600 text-base font-mono font-bold text-white rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                    We will send an instant Safaricom PIN prompt to this number.
                                </p>
                            </div>

                            {/* Payer Name & Account Reference (Accordion / Expandable) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">
                                        Account Reference
                                    </label>
                                    <input
                                        type="text"
                                        value={accountRef}
                                        onChange={e => setAccountRef(e.target.value.toUpperCase())}
                                        placeholder="e.g. ADM001 / REG102"
                                        className="w-full h-11 px-3.5 bg-slate-950/60 border border-slate-800 text-xs font-mono font-bold text-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">
                                        Payer Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={payerName}
                                        onChange={e => setPayerName(e.target.value)}
                                        placeholder="Your Full Name"
                                        className="w-full h-11 px-3.5 bg-slate-950/60 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Error Banner if any */}
                            {paymentStatus === 'failed' && (
                                <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
                                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 text-rose-400" />
                                    <span>{statusMessage}</span>
                                </div>
                            )}

                            {/* Submit STK Push Button */}
                            <button
                                type="submit"
                                disabled={isProcessing || !amount || parseFloat(amount) <= 0 || !phoneNumber}
                                className="w-full h-14 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2.5 uppercase text-xs tracking-widest transition-all active:scale-[0.98] mt-2"
                            >
                                <SmartphoneIcon className="w-5 h-5" />
                                {isProcessing ? 'Dispatching STK Push...' : `Pay KES ${parseFloat(amount || '0').toLocaleString()} via M-Pesa`}
                            </button>

                            {/* Manual Paybill Instructions Toggle */}
                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => setShowManualInstructions(!showManualInstructions)}
                                    className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-wider underline underline-offset-4"
                                >
                                    {showManualInstructions ? 'Hide Manual Paybill Info' : 'Prefer Manual Lipa Na M-Pesa? Click here'}
                                </button>
                            </div>

                            {showManualInstructions && (
                                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2 animate-fade-in text-slate-300">
                                    <p className="font-bold text-emerald-400 uppercase text-[10px] tracking-widest">Manual M-Pesa Steps:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                                        <li>Go to M-Pesa menu &gt; <strong>Lipa na M-Pesa</strong> &gt; <strong>Pay Bill</strong></li>
                                        <li>Enter Business No: <strong className="text-white">{paybillNumber}</strong></li>
                                        <li>Enter Account No: <strong className="text-white">{accountRef || 'EDUAI'}</strong></li>
                                        <li>Enter Amount: <strong className="text-white">{amount || 'Your Amount'}</strong></li>
                                        <li>Enter your M-Pesa PIN and press Send</li>
                                    </ol>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </main>

            {/* Footer Security Badges */}
            <footer className="max-w-xl w-full mx-auto text-center z-10 mt-6 space-y-2">
                <div className="flex items-center justify-center gap-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><LockClosedIcon className="w-3 h-3 text-emerald-500" /> 256-Bit SSL Encrypted</span>
                    <span>•</span>
                    <span>Safaricom Daraja API</span>
                    <span>•</span>
                    <span>Instant STK Push</span>
                </div>
                <p className="text-[10px] text-slate-600 font-medium">
                    &copy; {new Date().getFullYear()} {businessName}. All digital rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default PublicScanToPayView;
