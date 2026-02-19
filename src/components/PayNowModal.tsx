
import React, { useState } from 'react';
import { MpesaIcon } from './icons/MpesaIcon';
import type { TransactionStatus, InvoiceItem, MpesaConfig } from '../types';
import { apiService } from '../services/apiService';

interface PayNowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPay: (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]) => Promise<TransactionStatus>;
    monthlyPrice: number;
    yearlyPrice: number;
    mpesaConfig: MpesaConfig;
    institutionId?: string;
    institutionCode?: string;
    institutionName?: string;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({ isOpen, onClose, onPay, monthlyPrice, yearlyPrice, mpesaConfig, institutionId, institutionCode, institutionName }) => {
    const [phoneNumber, setPhoneNumber] = useState('254');
    const [payerName, setPayerName] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
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
        const amount = selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice;

        try {
            // 1. Initiate STK Push via Backend API
            const metadata = {
                type: 'subscription',
                plan: selectedPlan,
                institutionId: institutionId || 'SYSTEM',
                institutionCode: institutionCode || 'SYSTEM',
                institutionName: institutionName || 'EduAlloc Hub'
            };
            const mpesaResult = await apiService.initiateMpesaPayment(amount, phoneNumber, metadata, mpesaConfig);

            if (mpesaResult.success && mpesaResult.data?.CheckoutRequestID) {
                const checkoutRequestId = mpesaResult.data.CheckoutRequestID;
                setStatusMessage('STK Push Sent! Enter your M-Pesa PIN on your phone.');

                // 2. Poll for Status Updates
                let attempts = 0;
                const maxAttempts = 40; // ~2 minutes of polling (3s intervals)

                const pollInterval = setInterval(async () => {
                    attempts++;
                    const { status } = await apiService.checkMpesaStatus(checkoutRequestId, mpesaConfig);

                    if (status === 'completed') {
                        clearInterval(pollInterval);
                        const items: InvoiceItem[] = [{
                            description: `Timetable Allocator Subscription - ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
                            quantity: 1,
                            unitPrice: amount,
                            amount: amount,
                        }];
                        await onPay({ amount, phoneNumber, payerName }, items);
                        setFinalStatus('completed');
                        setStatusMessage('Payment Confirmed! Your subscription is now active.');
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
        if (isLoading) return; // Don't close while processing
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Make a Payment</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Enter your details to initiate an M-Pesa STK push.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="payerName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Name</label>
                            <input
                                type="text"
                                id="payerName"
                                value={payerName}
                                onChange={(e) => setPayerName(e.target.value)}
                                className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="e.g., Jane Doe"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300">M-Pesa Phone Number</label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="e.g., 254712345678"
                                required
                                pattern="^(254)\d{9}$"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select Plan</label>
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                <label className={`relative block cursor-pointer rounded-lg border p-4 focus:outline-none ${selectedPlan === 'monthly' ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]' : 'border-slate-300 dark:border-slate-600'}`}>
                                    <input type="radio" name="plan-choice" value="monthly" className="sr-only" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} />
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Monthly</span>
                                    <span className="mt-1 flex items-center text-sm text-slate-500 dark:text-slate-400">KES {monthlyPrice.toLocaleString()}</span>
                                </label>
                                <label className={`relative block cursor-pointer rounded-lg border p-4 focus:outline-none ${selectedPlan === 'yearly' ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]' : 'border-slate-300 dark:border-slate-600'}`}>
                                    <input type="radio" name="plan-choice" value="yearly" className="sr-only" checked={selectedPlan === 'yearly'} onChange={() => setSelectedPlan('yearly')} />
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Yearly</span>
                                    <span className="mt-1 flex items-center text-sm text-slate-500 dark:text-slate-400">KES {yearlyPrice.toLocaleString()}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                        type="submit"
                        className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                        <MpesaIcon className="w-5 h-5 mr-2 -ml-1" />
                        Pay KES {selectedPlan === 'monthly' ? monthlyPrice.toLocaleString() : yearlyPrice.toLocaleString()}
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                        Cancel
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
