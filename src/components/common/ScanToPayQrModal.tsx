import React, { useState, useEffect } from 'react';
import { 
    QrCodeIcon, PrinterIcon, DownloadIcon, XIcon, ShareIcon, 
    SmartphoneIcon, SparklesIcon, CheckBadgeIcon, ShieldCheckIcon,
    ArrowUpRightIcon, LockClosedIcon, InformationCircleIcon
} from '../icons';
import { MpesaIcon } from '../icons/MpesaIcon';
import type { CompanyDetails, MpesaConfig } from '../../types';

interface ScanToPayQrModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyDetails?: CompanyDetails;
    mpesaConfig?: MpesaConfig;
}

export const ScanToPayQrModal: React.FC<ScanToPayQrModalProps> = ({
    isOpen,
    onClose,
    companyDetails,
    mpesaConfig
}) => {
    const [amount, setAmount] = useState<string>('');
    const [accountRef, setAccountRef] = useState<string>('EDUAI-PAY');
    const [purpose, setPurpose] = useState<string>('Platform Subscription & Service Fee');
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [generatedLink, setGeneratedLink] = useState<string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);

    const businessName = companyDetails?.companyName || 'EduAI Automation Systems';
    const paybillNumber = mpesaConfig?.paybillNumber || companyDetails?.mpesaConfig?.paybillNumber || '4086655';

    useEffect(() => {
        if (!isOpen) return;

        // Build target URL
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

        // Generate QR code
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
                if (!err && url) setQrCodeUrl(url);
            });
        }
    }, [isOpen, amount, accountRef, purpose]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    const handlePrintStandee = () => {
        if (!qrCodeUrl) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scan to Pay Standee - ${businessName}</title>
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
                        width: 420px;
                        border: 3px solid #047857;
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
                        gap: 6px;
                        background: #047857;
                        color: #ffffff;
                        padding: 6px 18px;
                        border-radius: 9999px;
                        font-size: 11px;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                    }
                    .biz-title {
                        font-size: 22px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 14px 0 4px;
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
                        background: #f0fdf4;
                        border: 2px dashed #059669;
                        border-radius: 28px;
                        padding: 20px;
                        display: inline-block;
                        margin: 0 auto 20px;
                    }
                    .qr-img {
                        width: 240px;
                        height: 240px;
                        display: block;
                        border-radius: 16px;
                    }
                    .amount-tag {
                        font-size: 26px;
                        font-weight: 900;
                        color: #047857;
                        margin-bottom: 12px;
                    }
                    .steps-box {
                        background: #f8fafc;
                        border-radius: 20px;
                        padding: 16px 20px;
                        text-align: left;
                        margin-bottom: 20px;
                        border: 1px solid #e2e8f0;
                    }
                    .steps-title {
                        font-size: 10px;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #047857;
                        margin-bottom: 8px;
                    }
                    .step-item {
                        font-size: 12px;
                        color: #334155;
                        font-weight: 600;
                        margin: 6px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .step-num {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #047857;
                        color: #fff;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
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
                        font-size: 14px;
                        font-family: monospace;
                        font-weight: 900;
                        color: #34d399;
                    }
                    .footer-brand {
                        font-size: 10px;
                        color: #94a3b8;
                        margin-top: 16px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                </style>
            </head>
            <body>
                <div class="standee-card">
                    <div class="header-pill">LIPA NA M-PESA · SCAN TO PAY</div>
                    <div class="biz-title">${businessName}</div>
                    <div class="purpose-sub">${purpose}</div>

                    ${amount ? `<div class="amount-tag">KES ${Number(amount).toLocaleString()}</div>` : ''}

                    <div class="qr-container">
                        <img src="${qrCodeUrl}" class="qr-img" />
                    </div>

                    <div class="steps-box">
                        <div class="steps-title">Instant STK Payment in 3 Steps</div>
                        <div class="step-item"><span class="step-num">1</span> Scan QR Code with Phone Camera</div>
                        <div class="step-item"><span class="step-num">2</span> Enter your M-Pesa Phone Number</div>
                        <div class="step-item"><span class="step-num">3</span> Input your M-Pesa PIN on Prompt</div>
                    </div>

                    <div class="fallback-banner">
                        <div class="fallback-item">
                            <span class="fallback-label">Paybill Number</span>
                            <span class="fallback-val">${paybillNumber}</span>
                        </div>
                        <div class="fallback-item" style="text-align: right;">
                            <span class="fallback-label">Account No</span>
                            <span class="fallback-val">${accountRef}</span>
                        </div>
                    </div>

                    <div class="footer-brand">
                        Powered by EduAI Autonomous Digital Ecosystem
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
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shadow-sm">
                            <QrCodeIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Scan to Pay QR Standee</h3>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-widest">
                                    STK Push Ready
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">Generate printable QR standees and direct client checkout links</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Left: Interactive Controls */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                Preset Amount (KES) - Optional
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Leave blank for open customer input"
                                className="form-input text-sm font-bold h-12"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 italic ml-1">
                                If left blank, the customer can enter any amount on their phone.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                Account Reference Code
                            </label>
                            <input
                                type="text"
                                value={accountRef}
                                onChange={e => setAccountRef(e.target.value.toUpperCase())}
                                placeholder="e.g. EDUAI-PAY / LICENSE"
                                className="form-input font-mono text-sm font-bold h-12 uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                Service / Purpose Title
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                                placeholder="e.g. EduAI Subscription & Services"
                                className="form-input text-sm font-bold h-12"
                            />
                        </div>

                        {/* Direct URL Box */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
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
                    </div>

                    {/* Right: Live Standee Preview */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-50/50 to-slate-50 dark:from-emerald-950/20 dark:to-slate-900/50 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 text-center relative shadow-inner">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm mb-3">
                            <MpesaIcon className="w-3.5 h-3.5" /> Lipa Na M-Pesa
                        </div>

                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[240px]">
                            {businessName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium truncate max-w-[240px] mb-3">
                            {purpose}
                        </p>

                        {/* QR Code Container */}
                        <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/80 mb-3">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="Scan to Pay QR" className="w-48 h-48 rounded-lg object-contain" />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                                    <QrCodeIcon className="w-12 h-12 animate-pulse" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Paybill</span>
                                <span className="text-emerald-600 font-black">{paybillNumber}</span>
                            </div>
                            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
                            <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Account Ref</span>
                                <span className="text-emerald-600 font-black">{accountRef}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-6 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                        onClick={() => window.open(generatedLink, '_blank')}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                    >
                        <ArrowUpRightIcon className="w-4 h-4" /> Open Client Checkout Flow
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleCopyLink}
                            className="flex-1 sm:flex-none h-12 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest transition-all"
                        >
                            {isCopied ? '✓ Copied' : 'Copy Link'}
                        </button>
                        <button
                            onClick={handlePrintStandee}
                            className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
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
