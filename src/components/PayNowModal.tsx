
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
}

export const PayNowModal: React.FC<PayNowModalProps> = ({ isOpen, onClose, onPay, monthlyPrice, yearlyPrice, mpesaConfig }) => {
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
            const metadata = { type: 'subscription', plan: selectedPlan };
            const mpesaResult = await apiService.initiateMpesaPayment(amount, phoneNumber, metadata, mpesaConfig);

            if (mpesaResult.success && mpesaResult.data?.CheckoutRequestID) {
                const checkoutRequestId = mpesaResult.data.CheckoutRequestID;
                setStatusMessage('STK Push Sent! Enter your M-Pesa PIN on your phone.');

                // 2. Poll for Status Updates
                let attempts = 0;
                const maxAttempts = 20; // ~1 minute of polling (3s intervals)

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
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Processing Payment...</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Communicating with M-Pesa...</p>
                </div>
            );
        }
        if (finalStatus === 'completed') {
            return (
                <div className="p-10 text-center">
                    <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Request Sent!</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
                    <p className="text-xs text-slate-400 mt-2">Please complete the PIN prompt on your phone.</p>
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
