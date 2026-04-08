
import React, { useState } from 'react';
import { MpesaIcon } from './icons/MpesaIcon';
import type { TransactionStatus, InvoiceItem, MpesaConfig } from '../types';
import { apiService } from '../services/apiService';

interface BuySMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchaseComplete: (units: number) => void;
    mpesaConfig?: MpesaConfig;
    airtelMoneyConfig?: any;
    intasendConfig?: any;
    ncbaConfig?: any;
    institutionId: string;
    institutionCode: string;
    institutionName: string;
    smsUnitPrice: number;
    requesterId?: string;
    minSmsUnits?: number;
}

const SMS_PACKAGES = [
    { units: 500, label: 'Standard Pack' },
    { units: 1000, label: 'Value Pack' },
    { units: 2500, label: 'Power Pack' },
    { units: 5000, label: 'Enterprise Pack' },
];

export const BuySMSModal: React.FC<BuySMSModalProps> = ({
    isOpen,
    onClose,
    onPurchaseComplete,
    mpesaConfig,
    airtelMoneyConfig,
    intasendConfig,
    ncbaConfig,
    institutionId,
    institutionCode,
    institutionName,
    smsUnitPrice = 2, // Default if not provided
    requesterId,
    minSmsUnits = 0
}) => {
    const [phoneNumber, setPhoneNumber] = useState('254');
    const [units, setUnits] = useState<number>(SMS_PACKAGES[0].units);
    const [provider, setProvider] = useState<'mpesa' | 'airtel' | 'intasend' | 'ncba'>('mpesa');
    const [isLoading, setIsLoading] = useState(false);
    const [finalStatus, setFinalStatus] = useState<TransactionStatus | null>(null);
    const [statusMessage, setStatusMessage] = useState('');

    const calculatedTotal = units * smsUnitPrice;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (units < (minSmsUnits || 1)) {
            alert(`Minimum purchase is ${(minSmsUnits || 1)} units.`);
            return;
        }

        if (!/^(254)\d{9}$/.test(phoneNumber)) {
            alert('Please enter a valid phone number in the format 254xxxxxxxxx.');
            return;
        }

        setIsLoading(true);

        try {
            const metadata = {
                type: 'sms',
                units,
                institutionId,
                institutionCode,
                institutionName,
                requesterId,
                payerPhoneNumber: phoneNumber,
                provider
            };

            const config = provider === 'mpesa' ? mpesaConfig : (provider === 'airtel' ? airtelMoneyConfig : (provider === 'intasend' ? intasendConfig : ncbaConfig));
            const result: any = await apiService.initiatePayment(provider, calculatedTotal, phoneNumber, metadata, config);
            console.log("[Initiation Result]", result);

            if (result.success && (result.data?.CheckoutRequestID || result.checkoutRequestId || result.url)) {
                if (result.url) {
                    window.open(result.url, '_blank');
                    setStatusMessage('Payment window opened. Please complete the payment and wait for confirmation.');
                } else {
                    setStatusMessage(`${provider.toUpperCase()} prompt sent! Enter your PIN on your phone.`);
                }

                const checkoutRequestId = result.data?.CheckoutRequestID || result.checkoutRequestId;
                
                let attempts = 0;
                const maxAttempts = 60;

                const pollInterval = setInterval(async () => {
                    attempts++;
                    const result = await apiService.checkPaymentStatus(provider, checkoutRequestId, 
                        provider === 'mpesa' ? mpesaConfig : 
                        (provider === 'airtel' ? airtelMoneyConfig : 
                        (provider === 'intasend' ? intasendConfig : ncbaConfig)));

                    const status = result?.status;
                    console.log(`[Polling] Attempt ${attempts}/45 - Status: ${status}`, result);

                    if (status === 'completed') {
                        clearInterval(pollInterval);
                        setFinalStatus('completed');
                        setStatusMessage(`Payment Confirmed! ${units.toLocaleString()} SMS units have been added to your balance.`);
                        setIsLoading(false);
                        onPurchaseComplete(units);
                    } else if (status === 'failed' || attempts >= 45) {
                        clearInterval(pollInterval);
                        setFinalStatus('failed');
                        setStatusMessage(status === 'failed' ? 'Transaction failed. Please try again.' : 'Timeout waiting for payment confirmation. If you have paid, it will reflect shortly.');
                        setIsLoading(false);
                    }
                }, 4000);
            } else {
                setFinalStatus('failed');
                setStatusMessage(result.message || `Failed to initiate ${provider} payment.`);
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

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden transition-all animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                {isLoading ? (
                    <div className="p-10 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                            {statusMessage.includes('Sent') ? 'Confirming Payment...' : 'Processing Request...'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {statusMessage || 'Connecting to M-Pesa...'}
                        </p>
                    </div>
                ) : finalStatus === 'completed' ? (
                    <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200/50">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Success!</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">{statusMessage}</p>
                        <button onClick={handleClose} className="mt-8 w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl transition-all active:scale-[0.98]">
                            Continue
                        </button>
                    </div>
                ) : finalStatus === 'failed' ? (
                    <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Purchase Failed</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{statusMessage}</p>
                        <button onClick={() => setFinalStatus(null)} className="mt-8 w-full bg-slate-900 dark:bg-slate-700 text-white font-black py-3.5 rounded-xl transition-all active:scale-[0.98]">Try Again</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Buy SMS Units</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Instant delivery via multi-provider gateway</p>
                            </div>
                            <button type="button" onClick={handleClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2.5 ml-1">Choose Payment Provider</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setProvider('mpesa')}
                                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${provider === 'mpesa' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                >
                                    <MpesaIcon className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-black uppercase">M-Pesa</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProvider('airtel')}
                                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${provider === 'airtel' ? 'border-red-600 bg-red-50/50 dark:bg-red-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="w-6 h-6 mb-1 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-black">A</div>
                                    <span className="text-[10px] font-black uppercase">Airtel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProvider('intasend')}
                                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${provider === 'intasend' ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="w-6 h-6 mb-1 bg-emerald-600 rounded flex items-center justify-center text-white text-[8px] font-black">IS</div>
                                    <span className="text-[10px] font-black uppercase">IntaSend</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProvider('ncba')}
                                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${provider === 'ncba' ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="w-6 h-6 mb-1 bg-teal-600 rounded flex items-center justify-center text-white text-[8px] font-black">NB</div>
                                    <span className="text-[10px] font-black uppercase">NCBA</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2.5 ml-1">Select Package</label>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {SMS_PACKAGES.map((pkg) => (
                                        <button
                                            key={pkg.units}
                                            type="button"
                                            disabled={pkg.units < minSmsUnits}
                                            onClick={() => setUnits(pkg.units)}
                                            className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all relative overflow-hidden group ${units === pkg.units
                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                : pkg.units < minSmsUnits
                                                    ? 'opacity-40 grayscale cursor-not-allowed bg-slate-50 border-slate-200'
                                                    : 'border-slate-50 dark:border-slate-700 hover:border-indigo-200'
                                                }`}
                                        >
                                            <span className={`text-base font-black tracking-tight ${units === pkg.units ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {pkg.units.toLocaleString()}
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                {pkg.units < minSmsUnits ? 'Disabled' : `KES ${(pkg.units * smsUnitPrice).toLocaleString()}`}
                                            </span>
                                            {units === pkg.units && (
                                                <div className="absolute top-0 right-0 p-0.5 bg-indigo-600 rounded-bl-lg">
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-end mb-1.5 ml-1">
                                        <label htmlFor="customUnits" className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em]">Custom Count</label>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">KES {smsUnitPrice}/Unit</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="customUnits"
                                            name="customUnits"
                                            min={minSmsUnits || 1}
                                            value={units}
                                            onChange={(e) => setUnits(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 px-4 font-black text-slate-900 dark:text-white shadow-sm transition-all text-base outline-none"
                                            placeholder="Enter amount..."
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-slate-400"> Units </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <label htmlFor="phoneNumber" className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1.5 ml-1">{provider === 'intasend' ? 'Payer Contact' : (provider === 'airtel' ? 'Airtel Number' : 'M-Pesa Number')}</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-2.5 px-4 font-black text-slate-900 dark:text-white shadow-sm transition-all text-base outline-none"
                                        placeholder="2547..."
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {provider === 'mpesa' ? <MpesaIcon className="w-5 h-5 opacity-40" /> : <div className="text-[10px] font-black opacity-20 uppercase">{provider}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2 pt-2">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-0.5">Payable Amount</p>
                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">KES {calculatedTotal.toLocaleString()}</p>
                                </div>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.95] flex items-center justify-center gap-2 text-sm"
                                >
                                    Pay Now
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
