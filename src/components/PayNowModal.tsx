import React, { useState } from 'react';
// Removed ShieldCheckIcon from imports as it is defined locally at the bottom of this file.
import { MpesaIcon, XIcon, CheckCircleIcon, ClockIcon } from './icons/index.ts';
import type { TransactionStatus, InvoiceItem, MpesaConfig } from '../types';
import { apiService } from '../services/apiService';

interface PayNowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPay: (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]) => Promise<TransactionStatus>;
    monthlyPrice: number;
    yearlyPrice: number;
    mpesaConfig: MpesaConfig;
    onRequestExtension?: () => void;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({ isOpen, onClose, onPay, monthlyPrice, yearlyPrice, mpesaConfig, onRequestExtension }) => {
    const [phoneNumber, setPhoneNumber] = useState('254');
    const [payerName, setPayerName] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const [isLoading, setIsLoading] = useState(false);
    const [finalStatus, setFinalStatus] = useState<TransactionStatus | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const cleanPhone = phoneNumber.replace(/\+/g, '').trim();
        if (!/^(254)\d{9}$/.test(cleanPhone)) {
            setError('Please enter a valid phone number (e.g., 254712345678).');
            return;
        }

        setIsLoading(true);
        const amount = selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice;
        
        try {
            // Initiate Production STK Push
            const result = await apiService.initiateMpesaPayment(amount, cleanPhone, mpesaConfig);
            
            if (result.success) {
                const items: InvoiceItem[] = [{
                    description: `Portal Subscription - ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
                    quantity: 1,
                    unitPrice: amount,
                    amount: amount,
                }];

                await onPay({ amount, phoneNumber: cleanPhone, payerName }, items);
                
                setFinalStatus('completed');
                setStatusMessage(result.message || 'Payment prompt sent! Check your phone.');
            } else {
                setFinalStatus('failed');
                setStatusMessage(result.message || 'M-Pesa Production error.');
            }
        } catch (err: any) {
            setFinalStatus('failed');
            setStatusMessage(err.message || 'Connection to Daraja Production failed.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                 <div className="p-12 text-center animate-pulse">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Live Handshake</h4>
                    <p className="text-sm text-slate-500 mt-2">Connecting to Daraja Production for {phoneNumber}...</p>
                </div>
            );
        }
        if (finalStatus === 'completed') {
            return (
                <div className="p-12 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100 dark:shadow-none">
                        <CheckCircleIcon className="w-12 h-12" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Prompt Dispatched</h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-2 font-medium">{statusMessage}</p>
                    <p className="text-[10px] text-slate-400 mt-10 font-black uppercase tracking-[0.2em]">Check your phone for the M-Pesa prompt</p>
                    <button onClick={onClose} className="mt-8 w-full btn-primary h-12">Close Window</button>
                </div>
            );
        }
        if (finalStatus === 'failed') {
             return (
                <div className="p-12 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <XIcon className="w-12 h-12" />
                    </div>
                    <h4 className="text-2xl font-black text-red-700 dark:text-red-400 uppercase tracking-tighter">Handshake Failed</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{statusMessage}</p>
                    <div className="mt-8 flex flex-col gap-2">
                        <button onClick={() => setFinalStatus(null)} className="w-full btn-secondary h-12 uppercase text-xs font-black tracking-widest bg-white">Retry Connection</button>
                        <button onClick={onClose} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:underline py-2">Close</button>
                    </div>
                </div>
            );
        }
        return (
             <form onSubmit={handleSubmit}>
                <div className="p-8 pb-4">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Lipa Na M-Pesa</h3>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded border border-green-200">PRODUCTION</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Official Institutional Settlement</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <XIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-bold rounded-r-xl animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Member Name (Receipt Holder)</label>
                            <input
                                type="text"
                                value={payerName}
                                onChange={(e) => setPayerName(e.target.value)}
                                className="form-input w-full"
                                placeholder="e.g. Accounts Department"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">M-Pesa Mobile Number</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="form-input w-full font-mono text-lg font-bold"
                                placeholder="2547XXXXXXXX"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1">Subscription Cycle</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`relative block cursor-pointer rounded-2xl border-2 p-5 transition-all ${selectedPlan === 'monthly' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                                    <input type="radio" name="plan-choice" value="monthly" className="sr-only" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} />
                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Monthly</span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">KES {monthlyPrice.toLocaleString()}</span>
                                </label>
                                <label className={`relative block cursor-pointer rounded-2xl border-2 p-5 transition-all ${selectedPlan === 'yearly' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                                    <input type="radio" name="plan-choice" value="yearly" className="sr-only" checked={selectedPlan === 'yearly'} onChange={() => setSelectedPlan('yearly')} />
                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Yearly</span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">KES {yearlyPrice.toLocaleString()}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <MpesaIcon className="w-6 h-6" />
                        Initiate Live Payment
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <ShieldCheckIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safaricom SSL Secured Tunnel</span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest py-2"
                    >
                        Discard Transaction
                    </button>
                </div>
            </form>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-lg transition-all border border-slate-100 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
               {renderContent()}
            </div>
            <style>{`
                .form-input { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s; }
                .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
            `}</style>
        </div>
    );
};

// Locally defined icon to avoid unnecessary imports and circular dependencies
export const ShieldCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.956 11.956 0 0112 2.714z" />
    </svg>
);
