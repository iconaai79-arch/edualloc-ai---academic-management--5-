import React, { useState } from 'react';
import type { User, Institution, CompanyDetails, MpesaTransaction, TransactionStatus, InvoiceItem } from '../types';
import { ExclamationTriangleIcon, MpesaIcon, PhoneIcon, ChatBubbleLeftRightIcon, ArrowRightOnRectangleIcon, CreditCardIcon, ClockIcon } from './icons/index';
import { PayNowModal } from './PayNowModal.tsx';

interface SuspendedAccountViewProps {
    user: User;
    institution: Institution;
    companyDetails: CompanyDetails;
    onLogout: () => void;
    onAddTransaction: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onAddExtensionRequest: (reason: string) => void;
}

export const SuspendedAccountView: React.FC<SuspendedAccountViewProps> = ({ user, institution, companyDetails, onLogout, onAddTransaction, onAddExtensionRequest }) => {
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const isAdmin = ['admin', 'head_teacher', 'hod', 'tto', 'dos'].includes(user.role);

    const monthlyPrice = institution.customSubscriptionPrice?.monthly ?? companyDetails.subscriptionConfig.defaultMonthlyPrice;
    const yearlyPrice = institution.customSubscriptionPrice?.yearly ?? companyDetails.subscriptionConfig.defaultYearlyPrice;

    const handlePayNow = (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]): Promise<TransactionStatus> => {
        return onAddTransaction({
            ...paymentData,
            institutionId: institution.id,
        }, items);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                <div className="p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200/50">
                        <ExclamationTriangleIcon className="w-12 h-12" />
                    </div>
                    
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-2">Account Inactive</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 px-4">
                        The institutional account for <span className="font-bold text-slate-800 dark:text-slate-200">{institution.name}</span> is currently suspended or its subscription has expired.
                    </p>

                    {isAdmin ? (
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 text-left">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Reactivation Steps</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1 bg-indigo-100 text-indigo-600 rounded-lg"><CreditCardIcon className="w-4 h-4" /></div>
                                        <div>
                                            <p className="text-sm font-bold">Automatic Reactivation</p>
                                            <p className="text-xs text-slate-500">Pay via M-Pesa to instantly restore academic services.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Your Account Ref.</p>
                                            <p className="font-mono text-lg font-black text-indigo-600 dark:text-indigo-400">{institution.institutionCode || institution.id.slice(-6).toUpperCase()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Paybill</p>
                                            <p className="font-mono text-lg font-black">{companyDetails.mpesaConfig.paybillNumber || '7654321'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                    onClick={() => setIsPayModalOpen(true)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <MpesaIcon className="w-6 h-6" />
                                    Pay Now to Activate
                                </button>
                                <button 
                                    onClick={onLogout}
                                    className="sm:w-32 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Academic portals are currently locked. Access will be restored once the institutional administrator settles the pending subscription.
                                </p>
                            </div>
                            
                            <div className="flex justify-center gap-4">
                                <button onClick={onLogout} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2">
                                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                    Return to Login
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-6 flex flex-wrap justify-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <PhoneIcon className="w-4 h-4" /> Support: {companyDetails.phone}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" /> Email: {companyDetails.email}
                    </div>
                </div>
            </div>

            {isPayModalOpen && (
                <PayNowModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    onPay={handlePayNow}
                    monthlyPrice={monthlyPrice}
                    yearlyPrice={yearlyPrice}
                    mpesaConfig={companyDetails.mpesaConfig}
                />
            )}
        </div>
    );
};