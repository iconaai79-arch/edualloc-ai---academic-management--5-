
import React, { useState } from 'react';
import { MpesaIcon } from './icons/MpesaIcon';
import type { TransactionStatus, InvoiceItem, MpesaConfig } from '../types';
import { apiService } from '../services/apiService';

interface BuySMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchaseComplete: (units: number) => void;
    mpesaConfig: MpesaConfig;
    institutionId: string;
    institutionCode: string;
    institutionName: string;
    smsUnitPrice: number;
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
    institutionId,
    institutionCode,
    institutionName,
    smsUnitPrice = 2 // Default if not provided
}) => {
    const [phoneNumber, setPhoneNumber] = useState('254');
    const [selectedPackage, setSelectedPackage] = useState(SMS_PACKAGES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [finalStatus, setFinalStatus] = useState<TransactionStatus | null>(null);
    const [statusMessage, setStatusMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^(254)\d{9}$/.test(phoneNumber)) {
            alert('Please enter a valid phone number in the format 254xxxxxxxxx.');
            return;
        }

        setIsLoading(true);
        const amount = selectedPackage.units * smsUnitPrice;

        try {
            const metadata = {
                type: 'sms',
                units: selectedPackage.units,
                institutionId,
                institutionCode,
                institutionName
            };

            const mpesaResult = await apiService.initiateMpesaPayment(amount, phoneNumber, metadata, mpesaConfig);

            if (mpesaResult.success && mpesaResult.data?.CheckoutRequestID) {
                const checkoutRequestId = mpesaResult.data.CheckoutRequestID;
                setStatusMessage('STK Push Sent! Enter your M-Pesa PIN on your phone.');

                let attempts = 0;
                const maxAttempts = 40;

                const pollInterval = setInterval(async () => {
                    attempts++;
                    const { status } = await apiService.checkMpesaStatus(checkoutRequestId, mpesaConfig);

                    if (status === 'completed') {
                        clearInterval(pollInterval);
                        setFinalStatus('completed');
                        setStatusMessage(`Payment Confirmed! ${selectedPackage.units} SMS units have been added to your balance.`);
                        setIsLoading(false);
                        onPurchaseComplete(selectedPackage.units);
                    } else if (status === 'failed' || attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setFinalStatus('failed');
                        setStatusMessage(status === 'failed' ? 'Transaction failed. Please try again.' : 'Timeout waiting for payment confirmation. If you have paid, it will reflect shortly.');
                        setIsLoading(false);
                    }
                }, 3000);
            } else {
                setFinalStatus('failed');
                setStatusMessage(mpesaResult.message || 'Failed to initiate STK push.');
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-all animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                            {statusMessage.includes('Sent') ? 'Confirming Payment...' : 'Processing Request...'}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {statusMessage || 'Connecting to M-Pesa...'}
                        </p>
                    </div>
                ) : finalStatus === 'completed' ? (
                    <div className="p-12 text-center">
                        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200/50">
                            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Units Purchased!</h4>
                        <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium">{statusMessage}</p>
                        <button onClick={handleClose} className="mt-10 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-[0.98]">
                            Back to Dashboard
                        </button>
                    </div>
                ) : finalStatus === 'failed' ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Purchase Failed</h4>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">{statusMessage}</p>
                        <button onClick={() => setFinalStatus(null)} className="mt-8 w-full bg-slate-900 dark:bg-slate-700 text-white font-black py-4 rounded-2xl">Try Again</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Buy SMS Units</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Instant delivery via M-Pesa STK Push</p>
                            </div>
                            <button type="button" onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Select Package</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {SMS_PACKAGES.map((pkg) => (
                                        <button
                                            key={pkg.units}
                                            type="button"
                                            onClick={() => setSelectedPackage(pkg)}
                                            className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all group ${selectedPackage.units === pkg.units
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-none'
                                                    : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300'
                                                }`}
                                        >
                                            <span className={`text-lg font-black tracking-tight ${selectedPackage.units === pkg.units ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {pkg.units.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-400">
                                                KES {(pkg.units * smsUnitPrice).toLocaleString()}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <label htmlFor="phoneNumber" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">M-Pesa Phone Number</label>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 px-4 font-bold text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="254712345678"
                                    required
                                    pattern="^(254)\d{9}$"
                                />
                                <p className="text-[10px] text-slate-400 mt-2 font-medium">Format: 254XXXXXXXXX</p>
                            </div>

                            <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                    <MpesaIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-200 tracking-tight">Total Amount</p>
                                    <p className="text-xl font-black text-amber-900 dark:text-amber-100">KES {(selectedPackage.units * smsUnitPrice).toLocaleString()}</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <MpesaIcon className="w-6 h-6 brightness-0 invert" />
                                Buy Units Now
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
