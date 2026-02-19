import React, { useState } from 'react';
import type { User, Institution, CompanyDetails, MpesaTransaction, TransactionStatus, InvoiceItem } from '../types';
import { SparklesIcon, MpesaIcon, PhoneIcon, ChatBubbleLeftRightIcon, ArrowRightOnRectangleIcon, CreditCardIcon, ClockIcon, EnvelopeIcon } from './icons/index';
import { PayNowModal } from './PayNowModal';

interface TrialExpiredViewProps {
    user: User;
    institution: Institution;
    companyDetails: CompanyDetails;
    onLogout: () => void;
    onPay: (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onRequestExtension: (reason: string) => Promise<void>;
}

export const TrialExpiredView: React.FC<TrialExpiredViewProps> = ({
    user,
    institution,
    companyDetails,
    onLogout,
    onPay,
    onRequestExtension
}) => {
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [extensionReason, setExtensionReason] = useState('');
    const [showExtensionForm, setShowExtensionForm] = useState(false);
    const [extensionSuccess, setExtensionSuccess] = useState(false);

    const isAdmin = ['admin', 'head_teacher', 'hod', 'tto', 'dos'].includes(user.role);

    // Support both camelCase (transform) and snake_case (raw) from various backend versions
    const customPrice = institution.customSubscriptionPrice || (institution as any).custom_subscription_price;
    const monthlyPrice = customPrice?.monthly ?? companyDetails.subscriptionConfig.defaultMonthlyPrice;
    const yearlyPrice = customPrice?.yearly ?? companyDetails.subscriptionConfig.defaultYearlyPrice;

    const handleExtensionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!extensionReason.trim()) return alert("Please provide a reason for the extension request.");

        setIsExtending(true);
        try {
            await onRequestExtension(extensionReason);
            setExtensionSuccess(true);
            setTimeout(() => setShowExtensionForm(false), 3000);
        } catch (e) {
            alert("Failed to submit extension request. Please contact support.");
        } finally {
            setIsExtending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-0 -left-20 w-80 h-80 bg-indigo-600/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-0 -right-20 w-80 h-80 bg-purple-600/20 blur-[120px] rounded-full"></div>

            <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 animate-fade-in-up relative z-10">
                <div className="p-8 sm:p-12 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20 rotate-6 hover:rotate-0 transition-transform duration-500">
                        <SparklesIcon className="w-12 h-12 text-white" />
                    </div>

                    <h2 className="text-4xl font-black tracking-tighter uppercase mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Trial Expired</h2>
                    <p className="text-slate-400 mb-10 text-lg max-w-md mx-auto leading-relaxed">
                        The trial period for <span className="font-bold text-white uppercase tracking-wider">{institution.name}</span> has ended. Upgrade to a premium plan to continue using the platform.
                    </p>

                    {isAdmin ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-left hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => setIsPayModalOpen(true)}>
                                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <CreditCardIcon className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest text-indigo-300 mb-1">Monthly Plan</p>
                                    <p className="text-2xl font-black">KES {monthlyPrice.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-2">Billed per institution</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-left hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => setIsPayModalOpen(true)}>
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <SparklesIcon className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest text-purple-300 mb-1">Yearly Plan</p>
                                    <p className="text-2xl font-black">KES {yearlyPrice.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-2">Get 2 months free</p>
                                </div>
                            </div>

                            {!showExtensionForm ? (
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => setIsPayModalOpen(true)}
                                        className="flex-1 bg-white text-slate-900 font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-slate-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <MpesaIcon className="w-6 h-6" />
                                        Pay via M-Pesa
                                    </button>
                                    <button
                                        onClick={() => setShowExtensionForm(true)}
                                        className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-2 border border-white/10"
                                    >
                                        <ClockIcon className="w-5 h-5 text-slate-400" />
                                        Request Extension
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 text-left animate-fade-in">
                                    {extensionSuccess ? (
                                        <div className="py-4 text-center">
                                            <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <SparklesIcon className="w-6 h-6" />
                                            </div>
                                            <h4 className="font-bold text-lg">Request Submitted</h4>
                                            <p className="text-sm text-slate-400">Our team will review your request and get back to you shortly.</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleExtensionSubmit} className="space-y-4">
                                            <h4 className="font-black uppercase tracking-widest text-xs text-slate-500 mb-2">Extension Request</h4>
                                            <textarea
                                                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                                                placeholder="Why do you need an extension? (e.g., Still evaluating features, budget approval pending...)"
                                                rows={3}
                                                value={extensionReason}
                                                onChange={(e) => setExtensionReason(e.target.value)}
                                            ></textarea>
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={isExtending}
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                                                >
                                                    {isExtending ? 'Submitting...' : 'Send Request'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowExtensionForm(false)}
                                                    className="px-6 bg-slate-800 text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-700 transition-all border border-white/5"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            <button onClick={onLogout} className="text-slate-500 hover:text-white text-sm font-bold transition-colors flex items-center gap-2 mx-auto py-2">
                                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
                                <p className="text-slate-400 leading-relaxed italic">
                                    "Academic portals are currently restricted. Please contact your institutional administrator to upgrade the account."
                                </p>
                            </div>

                            <button onClick={onLogout} className="px-10 py-4 bg-slate-800 text-white font-bold rounded-[1.5rem] hover:bg-slate-700 transition-all flex items-center gap-3 mx-auto border border-white/10">
                                <ArrowRightOnRectangleIcon className="w-5 h-5 text-slate-400" />
                                Log Out
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/50 border-t border-white/5 p-8 flex flex-wrap justify-center gap-8">
                    <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-500 tracking-tighter">
                        <div className="bg-slate-800 p-2 rounded-lg text-indigo-400"><PhoneIcon className="w-4 h-4" /></div>
                        {companyDetails.phone}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-500 tracking-tighter">
                        <div className="bg-slate-800 p-2 rounded-lg text-purple-400"><EnvelopeIcon className="w-4 h-4" /></div>
                        {companyDetails.email}
                    </div>
                </div>
            </div>

            {isPayModalOpen && (
                <PayNowModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    onPay={onPay}
                    monthlyPrice={monthlyPrice}
                    yearlyPrice={yearlyPrice}
                    mpesaConfig={companyDetails.mpesaConfig}
                    institutionId={institution.id}
                    institutionCode={institution.institutionCode}
                    institutionName={institution.name}
                />
            )}
        </div>
    );
};
