
import React, { useState } from 'react';
import { MpesaIcon } from './icons/MpesaIcon';
import type { TransactionStatus, InvoiceItem, MpesaConfig } from '../types';
import { apiService } from '../services/apiService';

interface PayNowModalProps {
    isOpen?: boolean;
    onClose: () => void;
    onPay?: (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onSubmit?: (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onSuccess?: () => void;
    monthlyPrice?: number;
    yearlyPrice?: number;
    mpesaConfig: MpesaConfig;
    airtelMoneyConfig?: any;
    intasendConfig?: any;
    institutionId?: string;
    institutionCode?: string;
    institutionName?: string;
    forceAmount?: number;
    forcedItems?: InvoiceItem[];
}

export const PayNowModal: React.FC<PayNowModalProps> = ({
    isOpen = true, onClose, onPay, onSubmit, onSuccess, monthlyPrice = 0, yearlyPrice = 0,
    mpesaConfig, airtelMoneyConfig, intasendConfig, institutionId, institutionCode, institutionName,
    forceAmount, forcedItems
}) => {
    const [phoneNumber, setPhoneNumber] = useState('254');
    const [payerName, setPayerName] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'forced'>(forceAmount !== undefined ? 'forced' : 'monthly');
    const [provider, setProvider] = useState<'mpesa' | 'airtel' | 'intasend'>('mpesa');
    const [enabledGateways, setEnabledGateways] = useState<string[]>(['mpesa']);
    const [isLoading, setIsLoading] = useState(false);
    const [finalStatus, setFinalStatus] = useState<TransactionStatus | null>(null);
    const [statusMessage, setStatusMessage] = useState('');

    React.useEffect(() => {
        const fetchGateways = async () => {
            const { data: sData } = await apiService.getSystemSettings();
            if (sData?.enabledGateways) {
                setEnabledGateways(sData.enabledGateways);
                if (!sData.enabledGateways.includes(provider)) {
                    setProvider(sData.enabledGateways[0] as any || 'mpesa');
                }
            }
        };
        if (isOpen) fetchGateways();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^(254)\d{9}$/.test(phoneNumber)) {
            alert('Please enter a valid phone number in the format 254xxxxxxxxx.');
            return;
        }

        setIsLoading(true);
        const amount = forceAmount !== undefined ? forceAmount : (selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice);
        const activeItems = forcedItems && forcedItems.length > 0 ? forcedItems : [{
            description: `Timetable Allocator Subscription - ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
            quantity: 1,
            unitPrice: amount,
            amount: amount,
        }];

        try {
            const metadata = {
                type: forceAmount !== undefined ? 'one-off' : 'subscription',
                plan: selectedPlan,
                institutionId: institutionId || 'SYSTEM',
                institutionCode: institutionCode || 'SYSTEM',
                institutionName: institutionName || 'Eduai Automation Hub'
            };

            let initiateResult;
            if (provider === 'mpesa') {
                initiateResult = await apiService.initiateMpesaPayment(amount, phoneNumber, metadata, mpesaConfig);
            } else if (provider === 'airtel') {
                initiateResult = await apiService.initiatePayment('airtel', amount, phoneNumber, metadata, airtelMoneyConfig);
            } else {
                initiateResult = await apiService.initiatePayment('intasend', amount, phoneNumber, metadata, intasendConfig);
            }

            if (initiateResult.success && (initiateResult.data?.CheckoutRequestID || initiateResult.checkoutRequestId || initiateResult.url)) {
                if (initiateResult.url) {
                    window.open(initiateResult.url, '_blank');
                    setStatusMessage('Payment window opened. Please complete the payment and wait for confirmation.');
                } else {
                    setStatusMessage(`${provider.toUpperCase()} prompt sent! Enter your PIN on your phone.`);
                }

                const checkoutRequestId = initiateResult.data?.CheckoutRequestID || initiateResult.checkoutRequestId;
                
                let attempts = 0;
                const maxAttempts = 60;

                const pollInterval = setInterval(async () => {
                    attempts++;
                    const { status } = await apiService.checkPaymentStatus(provider, checkoutRequestId, 
                        provider === 'mpesa' ? mpesaConfig : 
                        (provider === 'airtel' ? airtelMoneyConfig : intasendConfig));

                    if (status === 'completed') {
                        clearInterval(pollInterval);

                        const paymentExecutor = onSubmit || onPay;
                        if (paymentExecutor) {
                            await paymentExecutor({ amount, phoneNumber, payerName }, activeItems);
                        }

                        setFinalStatus('completed');
                        setStatusMessage('Payment Confirmed!');
                        if (onSuccess) onSuccess();
                        setIsLoading(false);
                    } else if (status === 'failed' || attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setFinalStatus('failed');
                        setStatusMessage(status === 'failed' ? 'Transaction failed. Please try again.' : 'Timeout waiting for payment confirmation. If you have paid, it will reflect shortly.');
                        setIsLoading(false);
                    }
                }, 3000);
            } else {
                setFinalStatus('failed');
                setStatusMessage(initiateResult.message || `Failed to initiate ${provider.toUpperCase()} payment.`);
                setIsLoading(false);
            }
        } catch (error: any) {
            setFinalStatus('failed');
            setStatusMessage(error.message || 'An error occurred.');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleClose = () => {
        if (isLoading) return;
        onClose();
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="p-10 text-center">
                    <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {statusMessage.includes('Sent') ? 'Waiting for Confirmation...' : 'Processing Payment...'}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {statusMessage || 'Communicating with M-Pesa...'}
                    </p>
                    {statusMessage.includes('Sent') && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl animate-pulse">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">Action Required</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Please check your phone for the M-Pesa PIN prompt.</p>
                        </div>
                    )}
                </div>
            );
        }
        if (finalStatus === 'completed') {
            return (
                <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200/50">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Payment Successful!</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">{statusMessage}</p>
                    <button
                        onClick={handleClose}
                        className="mt-8 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-[0.98]"
                    >
                        Complete Setup
                    </button>
                </div>
            );
        }
        if (finalStatus === 'failed') {
            return (
                <div className="p-10 text-center">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Payment Failed</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
                </div>
            );
        }
        return (
            <form onSubmit={handleSubmit}>
                <div className="p-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Make a Payment</h3>
                    <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Choose your preferred provider and enter details.
                    </p>

                    <div className="mt-6 space-y-6">
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2.5 ml-1">Choose Payment Provider</label>
                            <div className="grid grid-cols-2 gap-3">
                                {enabledGateways.includes('mpesa') && (
                                    <button
                                        type="button"
                                        onClick={() => setProvider('mpesa')}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${provider === 'mpesa' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <MpesaIcon className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">M-Pesa</span>
                                    </button>
                                )}
                                {enabledGateways.includes('airtel') && (
                                    <button
                                        type="button"
                                        onClick={() => setProvider('airtel')}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${provider === 'airtel' ? 'border-red-600 bg-red-50/50 dark:bg-red-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg">A</div>
                                        <span className="text-[10px] font-black uppercase">Airtel</span>
                                    </button>
                                )}
                                {enabledGateways.includes('intasend') && (
                                    <button
                                        type="button"
                                        onClick={() => setProvider('intasend')}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${provider === 'intasend' ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white text-[10px] font-black shadow-lg">IS</div>
                                        <span className="text-[10px] font-black uppercase">IntaSend</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="payerName" className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1.5 ml-1">Your Name</label>
                            <input
                                type="text"
                                id="payerName"
                                value={payerName}
                                onChange={(e) => setPayerName(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                placeholder="e.g., Jane Doe"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="phoneNumber" className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1.5 ml-1">{provider === 'mpesa' ? 'M-Pesa' : provider === 'airtel' ? 'Airtel Money' : 'Customer'} Phone Number</label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                placeholder="254..."
                                required
                            />
                        </div>

                        {selectedPlan !== 'forced' && (
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2.5 ml-1">Select Plan</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`relative block cursor-pointer rounded-2xl border-2 p-4 transition-all ${selectedPlan === 'monthly' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                        <input type="radio" name="plan-choice" value="monthly" className="sr-only" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} />
                                        <span className="text-xs font-black uppercase block">Monthly</span>
                                        <span className="mt-1 text-sm font-black text-indigo-600">KES {monthlyPrice.toLocaleString()}</span>
                                    </label>
                                    <label className={`relative block cursor-pointer rounded-2xl border-2 p-4 transition-all ${selectedPlan === 'yearly' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                        <input type="radio" name="plan-choice" value="yearly" className="sr-only" checked={selectedPlan === 'yearly'} onChange={() => setSelectedPlan('yearly')} />
                                        <span className="text-xs font-black uppercase block">Yearly</span>
                                        <span className="mt-1 text-sm font-black text-indigo-600">KES {yearlyPrice.toLocaleString()}</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        type="submit"
                        className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {provider === 'mpesa' && <MpesaIcon className="w-5 h-5" />}
                        {provider === 'airtel' && <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[7px] font-black">A</div>}
                        {provider === 'intasend' && <div className="w-5 h-5 bg-emerald-600 rounded flex items-center justify-center text-white text-[7px] font-black">IS</div>}
                        PAY KES {(selectedPlan === 'monthly' ? monthlyPrice : selectedPlan === 'yearly' ? yearlyPrice : forceAmount || 0).toLocaleString()}
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-2xl border-2 border-slate-100 dark:border-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
                    >
                        CANCEL
                    </button>
                </div>
            </form>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg transition-all" onClick={(e) => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
};
