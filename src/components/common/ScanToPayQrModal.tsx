import React, { useState, useEffect } from 'react';
import { 
    QrCodeIcon, PrinterIcon, DownloadIcon, XIcon, ShareIcon, 
    SmartphoneIcon, SparklesIcon, CheckBadgeIcon, ShieldCheckIcon,
    ArrowUpRightIcon, LockClosedIcon, InformationCircleIcon, ArrowPathIcon
} from '../icons';
import { MpesaIcon } from '../icons/MpesaIcon';
import { apiService } from '../../services/apiService';
import type { CompanyDetails, MpesaConfig } from '../../types';

interface ScanToPayQrModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyDetails?: CompanyDetails;
    mpesaConfig?: MpesaConfig;
    institutionId?: string;
}

export const ScanToPayQrModal: React.FC<ScanToPayQrModalProps> = ({
    isOpen,
    onClose,
    companyDetails,
    mpesaConfig,
    institutionId
}) => {
    // Mode: 'mpesa-app' = Official Safaricom Daraja Dynamic QR | 'web-checkout' = Browser URL QR
    const [qrMode, setQrMode] = useState<'mpesa-app' | 'web-checkout'>('mpesa-app');
    const [amount, setAmount] = useState<string>('100');
    const [accountRef, setAccountRef] = useState<string>('EDUAI-PAY');
    const [purpose, setPurpose] = useState<string>('Platform Subscription & Service Fee');
    const [trxCode, setTrxCode] = useState<'PB' | 'BG' | 'WA' | 'SM' | 'SB'>('PB');
    const [customCpi, setCustomCpi] = useState<string>('');

    // QR State
    const [webQrCodeUrl, setWebQrCodeUrl] = useState<string>('');
    const [mpesaQrCodeUrl, setMpesaQrCodeUrl] = useState<string>('');
    const [generatedLink, setGeneratedLink] = useState<string>('');
    const [isGeneratingMpesaQr, setIsGeneratingMpesaQr] = useState<boolean>(false);
    const [mpesaQrError, setMpesaQrError] = useState<string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);

    const businessName = companyDetails?.companyName || 'EduAI Automation Systems';
    const paybillNumber = mpesaConfig?.paybillNumber || companyDetails?.mpesaConfig?.paybillNumber || '4086655';
    const activeCpi = customCpi.trim() || (trxCode === 'BG' ? ((mpesaConfig as any)?.tillNumber || '373132') : paybillNumber);

    // 1. Generate Web URL QR
    useEffect(() => {
        if (!isOpen) return;

        const origin = window.location.origin;
        const urlParams = new URLSearchParams();
        urlParams.set('view', 'scan-to-pay');
        if (amount && Number(amount) > 0) {
            urlParams.set('amount', amount);
            urlParams.set('fixed', 'true');
        }
        if (accountRef.trim()) urlParams.set('ref', accountRef.trim());
        if (purpose.trim()) urlParams.set('title', purpose.trim());

        const fullUrl = `${origin}/?${urlParams.toString()}`;
        setGeneratedLink(fullUrl);

        const QRCodeLib = (window as any).QRCode;
        if (QRCodeLib) {
            QRCodeLib.toDataURL(fullUrl, {
                width: 480,
                margin: 2,
                color: {
                    dark: '#047857',
                    light: '#ffffff'
                }
            }, (err: any, url: string) => {
                if (!err && url) setWebQrCodeUrl(url);
            });
        }
    }, [isOpen, amount, accountRef, purpose]);

    // 2. Fetch Safaricom M-PESA App Dynamic QR (Daraja API)
    const fetchMpesaDynamicQr = async () => {
        setIsGeneratingMpesaQr(true);
        setMpesaQrError('');
        try {
            const numericAmt = Math.max(1, Math.round(Number(amount) || 1));
            const res = await apiService.generateMpesaDynamicQr({
                merchantName: businessName,
                refNo: accountRef.trim() || 'INVOICE',
                amount: numericAmt,
                trxCode: trxCode,
                cpi: activeCpi,
                size: '300',
                institutionId: institutionId,
                config: mpesaConfig
            });

            if (res.success && (res.qrImageUrl || res.QRCode)) {
                setMpesaQrCodeUrl(res.qrImageUrl || `data:image/png;base64,${res.QRCode}`);
            } else {
                setMpesaQrError(res.message || 'Could not generate dynamic QR from Safaricom.');
            }
        } catch (e: any) {
            console.error('[ScanToPayQrModal] Dynamic QR error:', e);
            setMpesaQrError(e?.message || 'Error communicating with Safaricom Daraja API.');
        } finally {
            setIsGeneratingMpesaQr(false);
        }
    };

    useEffect(() => {
        if (isOpen && qrMode === 'mpesa-app') {
            const timer = setTimeout(() => {
                fetchMpesaDynamicQr();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, qrMode, amount, accountRef, trxCode, customCpi]);

    const activeQrUrl = qrMode === 'mpesa-app' ? (mpesaQrCodeUrl || webQrCodeUrl) : webQrCodeUrl;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    const handleDownloadQrImage = () => {
        if (!activeQrUrl) return;
        const link = document.createElement('a');
        link.href = activeQrUrl;
        link.download = `MPESA-QR-${accountRef || 'PAY'}-${amount || 'OPEN'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintStandee = () => {
        if (!activeQrUrl) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const isMpesaMode = qrMode === 'mpesa-app';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Lipa Na M-Pesa QR Standee - ${businessName}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background: #f8fafc;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .standee-card {
                        background: #ffffff;
                        width: 440px;
                        border: 3.5px solid #00a859;
                        border-radius: 36px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                        overflow: hidden;
                        text-align: center;
                        padding: 36px 28px;
                        box-sizing: border-box;
                    }
                    .header-pill {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: #00a859;
                        color: #ffffff;
                        padding: 8px 22px;
                        border-radius: 9999px;
                        font-size: 13px;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        box-shadow: 0 4px 12px rgba(0, 168, 89, 0.3);
                    }
                    .biz-title {
                        font-size: 22px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 16px 0 4px;
                        text-transform: uppercase;
                        letter-spacing: -0.5px;
                    }
                    .purpose-sub {
                        font-size: 13px;
                        color: #64748b;
                        font-weight: 600;
                        margin-bottom: 20px;
                    }
                    .qr-container {
                        background: #ffffff;
                        padding: 16px;
                        border: 2px solid #e2e8f0;
                        border-radius: 28px;
                        display: inline-block;
                        margin-bottom: 18px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                    }
                    .qr-img {
                        width: 250px;
                        height: 250px;
                        display: block;
                        object-fit: contain;
                        border-radius: 12px;
                    }
                    .amount-tag {
                        font-size: 22px;
                        font-weight: 900;
                        color: #00a859;
                        margin-bottom: 16px;
                    }
                    .steps-box {
                        background: #f0fdf4;
                        border-radius: 20px;
                        padding: 16px 20px;
                        text-align: left;
                        margin-bottom: 20px;
                        border: 1px solid #bbf7d0;
                    }
                    .steps-title {
                        font-size: 11px;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #15803d;
                        margin-bottom: 8px;
                    }
                    .step-item {
                        font-size: 12px;
                        color: #1e293b;
                        font-weight: 600;
                        margin: 6px 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .step-num {
                        width: 22px;
                        height: 22px;
                        border-radius: 50%;
                        background: #00a859;
                        color: #fff;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 11px;
                        font-weight: 900;
                        flex-shrink: 0;
                    }
                    .fallback-banner {
                        display: flex;
                        justify-content: space-between;
                        background: #0f172a;
                        color: #ffffff;
                        padding: 12px 18px;
                        border-radius: 16px;
                        font-size: 12px;
                    }
                    .fallback-item {
                        display: flex;
                        flex-direction: column;
                        text-align: left;
                    }
                    .fallback-label {
                        font-size: 9px;
                        text-transform: uppercase;
                        color: #94a3b8;
                        font-weight: 800;
                        letter-spacing: 1px;
                    }
                    .fallback-val {
                        font-size: 15px;
                        font-family: monospace;
                        font-weight: 900;
                        color: #4ade80;
                    }
                    .footer-brand {
                        font-size: 10px;
                        color: #94a3b8;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-top: 18px;
                    }
                </style>
            </head>
            <body>
                <div class="standee-card">
                    <div class="header-pill">
                        📱 ${isMpesaMode ? 'LIPA NA M-PESA DYNAMIC QR' : 'SCAN TO PAY'}
                    </div>

                    <div class="biz-title">${businessName}</div>
                    <div class="purpose-sub">${purpose}</div>

                    <div class="qr-container">
                        <img src="${activeQrUrl}" class="qr-img" alt="QR Code" />
                    </div>

                    ${amount ? `<div class="amount-tag">AMOUNT: KES ${Number(amount).toLocaleString()}</div>` : ''}

                    <div class="steps-box">
                        <div class="steps-title">${isMpesaMode ? 'HOW TO PAY WITH M-PESA APP' : 'HOW TO PAY'}</div>
                        ${isMpesaMode ? `
                            <div class="step-item"><span class="step-num">1</span> Open <strong>M-PESA App</strong> or <strong>MySafaricom App</strong></div>
                            <div class="step-item"><span class="step-num">2</span> Tap <strong>Scan QR</strong> on your home screen</div>
                            <div class="step-item"><span class="step-num">3</span> Scan this code &mdash; details fill automatically</div>
                            <div class="step-item"><span class="step-num">4</span> Enter your <strong>M-PESA PIN</strong> to confirm</div>
                        ` : `
                            <div class="step-item"><span class="step-num">1</span> Open your Smartphone Camera or QR Scanner</div>
                            <div class="step-item"><span class="step-num">2</span> Point camera at the QR code to open payment portal</div>
                            <div class="step-item"><span class="step-num">3</span> Enter phone number to receive prompt on your phone</div>
                            <div class="step-item"><span class="step-num">4</span> Enter your <strong>M-PESA PIN</strong> to confirm</div>
                        `}
                    </div>

                    <div class="fallback-banner">
                        <div class="fallback-item">
                            <span class="fallback-label">${trxCode === 'BG' ? 'Buy Goods Till' : 'Paybill Number'}</span>
                            <span class="fallback-val">${activeCpi}</span>
                        </div>
                        <div class="fallback-item" style="text-align: right;">
                            <span class="fallback-label">Account / Ref</span>
                            <span class="fallback-val">${accountRef}</span>
                        </div>
                    </div>

                    <div class="footer-brand">
                        Powered by EduAI & Safaricom Daraja API
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 400);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-up my-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200 dark:border-emerald-800">
                            <MpesaIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">M-Pesa Dynamic QR Generator</h3>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest border border-emerald-300 dark:border-emerald-800">
                                    Daraja v1
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">Generate Safaricom M-Pesa App dynamic QR codes & printable counter standees</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* QR Format Mode Switcher */}
                <div className="px-6 sm:px-8 pt-5 pb-1 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setQrMode('mpesa-app')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            qrMode === 'mpesa-app'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <SmartphoneIcon className="w-4 h-4" />
                        📱 M-PESA App Dynamic QR (Safaricom Daraja)
                    </button>
                    <button
                        onClick={() => setQrMode('web-checkout')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            qrMode === 'web-checkout'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <QrCodeIcon className="w-4 h-4" />
                        🌐 Web Portal Checkout QR (Camera / Lens)
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Left: Configuration Inputs */}
                    <div className="space-y-4">
                        {qrMode === 'mpesa-app' && (
                            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200">
                                <p className="font-bold flex items-center gap-1.5 mb-1">
                                    <SparklesIcon className="w-4 h-4 text-emerald-600" />
                                    Dynamic Safaricom QR Code
                                </p>
                                <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                                    Customers scanning this code in the <strong>M-PESA App</strong> or <strong>MySafaricom App</strong> automatically have the till/paybill, amount, and reference pre-filled and locked.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Amount (KES)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="100"
                                    className="form-input text-sm font-black text-emerald-600 dark:text-emerald-400 h-11"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Payment Channel (TrxCode)
                                </label>
                                <select
                                    value={trxCode}
                                    onChange={e => setTrxCode(e.target.value as any)}
                                    className="form-input text-xs font-bold h-11"
                                >
                                    <option value="PB">Paybill (PB)</option>
                                    <option value="BG">Buy Goods Till (BG)</option>
                                    <option value="WA">Withdraw Agent (WA)</option>
                                    <option value="SM">Send Money (SM)</option>
                                    <option value="SB">Sent to Business (SB)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Account Reference Code
                                </label>
                                <input
                                    type="text"
                                    value={accountRef}
                                    onChange={e => setAccountRef(e.target.value.toUpperCase())}
                                    placeholder="e.g. ADM1024"
                                    className="form-input font-mono text-xs font-black h-11 uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    {trxCode === 'BG' ? 'Till Number (CPI)' : 'Paybill / CPI'}
                                </label>
                                <input
                                    type="text"
                                    value={customCpi}
                                    onChange={e => setCustomCpi(e.target.value)}
                                    placeholder={activeCpi}
                                    className="form-input font-mono text-xs font-bold h-11"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                Service / Purpose Description
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                                placeholder="e.g. Term 1 School Fees"
                                className="form-input text-xs font-bold h-11"
                            />
                        </div>

                        {/* Regenerate Button if Mpesa Mode */}
                        {qrMode === 'mpesa-app' && (
                            <button
                                onClick={fetchMpesaDynamicQr}
                                disabled={isGeneratingMpesaQr}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 transition-colors"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${isGeneratingMpesaQr ? 'animate-spin' : ''}`} />
                                {isGeneratingMpesaQr ? 'Generating from Safaricom...' : 'Refresh Dynamic QR'}
                            </button>
                        )}

                        {mpesaQrError && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                                {mpesaQrError}
                            </div>
                        )}

                        {/* Direct URL Box */}
                        {qrMode === 'web-checkout' && (
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Public Checkout URL</span>
                                    <button
                                        onClick={handleCopyLink}
                                        className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500 transition-colors"
                                    >
                                        {isCopied ? '✓ Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    readOnly
                                    value={generatedLink}
                                    className="w-full text-xs font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 select-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Right: Live Standee Preview */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-50/50 to-slate-50 dark:from-emerald-950/20 dark:to-slate-900/50 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 text-center relative shadow-inner">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm mb-3">
                            <MpesaIcon className="w-3.5 h-3.5" />
                            {qrMode === 'mpesa-app' ? 'Lipa Na M-Pesa Dynamic QR' : 'Scan to Pay'}
                        </div>

                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[260px]">
                            {businessName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium truncate max-w-[260px] mb-3">
                            {purpose}
                        </p>

                        {/* QR Code Container */}
                        <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/80 mb-3 relative">
                            {isGeneratingMpesaQr && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl z-10">
                                    <ArrowPathIcon className="w-8 h-8 text-emerald-600 animate-spin mb-1" />
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Calling Safaricom...</span>
                                </div>
                            )}

                            {activeQrUrl ? (
                                <img src={activeQrUrl} alt="M-Pesa QR Code" className="w-48 h-48 rounded-lg object-contain" />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                                    <QrCodeIcon className="w-12 h-12 animate-pulse" />
                                </div>
                            )}
                        </div>

                        {amount && Number(amount) > 0 && (
                            <div className="mb-2">
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    Amount: KES {Number(amount).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">
                                    {trxCode === 'BG' ? 'Buy Goods Till' : 'Paybill'}
                                </span>
                                <span className="text-emerald-600 font-black">{activeCpi}</span>
                            </div>
                            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
                            <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Account Ref</span>
                                <span className="text-emerald-600 font-black">{accountRef}</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-3 font-semibold">
                            {qrMode === 'mpesa-app' 
                                ? 'Scan with M-PESA App or MySafaricom App' 
                                : 'Scan with Camera / Google Lens'}
                        </p>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-6 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    {qrMode === 'web-checkout' ? (
                        <button
                            onClick={() => window.open(generatedLink, '_blank')}
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            <ArrowUpRightIcon className="w-4 h-4" /> Open Client Checkout Flow
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                            Official Safaricom M-Pesa QR Spec
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleDownloadQrImage}
                            className="flex-1 sm:flex-none h-12 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4" /> Download QR
                        </button>
                        <button
                            onClick={handlePrintStandee}
                            className="flex-1 sm:flex-none h-12 px-7 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                            <PrinterIcon className="w-4 h-4" /> Print Standee
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanToPayQrModal;
