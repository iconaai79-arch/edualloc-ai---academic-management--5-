import React, { useState, useEffect, useMemo } from 'react';
import type { Institution } from '../../types';
import { PayNowModal } from '../PayNowModal';
import { BuySMSModal } from '../BuySMSModal';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';

export interface SubscriptionExpiryBannerProps {
    institution?: Institution | null;
    subscriptionEndsAt?: string;
    trialEndsAt?: string;
    smsBalanceOverride?: number;
    daysLeftOverride?: number;
    isCollapsed?: boolean;
    onRenew?: () => void;
    onTopUpSms?: () => void;
    className?: string;
    customTitle?: string;
}

export const SubscriptionExpiryBanner: React.FC<SubscriptionExpiryBannerProps> = ({
    institution,
    subscriptionEndsAt,
    trialEndsAt,
    smsBalanceOverride,
    daysLeftOverride,
    isCollapsed = false,
    onRenew,
    onTopUpSms,
    className = '',
    customTitle
}) => {
    const [activeTab, setActiveTab] = useState<'subscription' | 'sms'>('subscription');
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // Dynamic calculation for subscription expiry
    const expiryInfo = useMemo(() => {
        let endDateStr = subscriptionEndsAt || institution?.subscriptionEndsAt || trialEndsAt || institution?.trialEndsAt;
        let isTrial = false;

        if (!endDateStr && institution?.status === 'trial') {
            endDateStr = institution?.trialEndsAt;
            isTrial = true;
        }

        let targetDate: Date;
        if (endDateStr) {
            targetDate = new Date(endDateStr);
        } else {
            const demoDate = new Date();
            demoDate.setDate(demoDate.getDate() + 5);
            targetDate = demoDate;
        }

        const now = new Date();
        const diffMs = targetDate.getTime() - now.getTime();
        let calculatedDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        if (daysLeftOverride !== undefined) {
            calculatedDays = daysLeftOverride;
        }

        if (calculatedDays < 0) calculatedDays = 0;

        const totalCycleDays = 30;
        const daysElapsed = Math.max(0, totalCycleDays - calculatedDays);
        const progressPercentage = Math.min(100, Math.max(10, Math.round((daysElapsed / totalCycleDays) * 100)));

        const isCritical = calculatedDays <= 3;
        const isWarning = calculatedDays > 3 && calculatedDays <= 7;

        return {
            endDate: targetDate,
            daysLeft: calculatedDays,
            progressPercentage,
            isTrial,
            isCritical,
            isWarning,
            formattedDate: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
    }, [subscriptionEndsAt, trialEndsAt, institution, daysLeftOverride]);

    // SMS Balance info
    const smsInfo = useMemo(() => {
        const balance = smsBalanceOverride !== undefined 
            ? smsBalanceOverride 
            : (institution?.smsBalance !== undefined ? institution.smsBalance : 850);
        const isLow = balance < (institution?.lowSmsThreshold || 100);
        const unitPrice = institution?.customSmsPrice || 2.0;

        return {
            balance,
            isLow,
            unitPrice,
            formattedBalance: balance.toLocaleString('en-US')
        };
    }, [institution, smsBalanceOverride]);

    const handleRenewClick = () => {
        if (onRenew) {
            onRenew();
        } else {
            setIsPayModalOpen(true);
        }
    };

    const handleSmsTopUpClick = () => {
        if (onTopUpSms) {
            onTopUpSms();
        } else {
            setIsSmsModalOpen(true);
        }
    };

    if (isDismissed) {
        return (
            <button
                onClick={() => setIsDismissed(false)}
                className="w-full text-[10px] font-black uppercase tracking-wider py-1.5 px-2 text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-between bg-slate-900/90 rounded-xl border border-amber-500/20 my-2"
                title="Restore System Alerts"
            >
                <div className="flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    <span>Status: {expiryInfo.daysLeft}d left</span>
                </div>
                <span className="text-cyan-400 font-mono">{smsInfo.formattedBalance} SMS</span>
            </button>
        );
    }

    // ── COLLAPSED SIDEBAR VIEW (Icon Badge Mode) ──
    if (isCollapsed) {
        return (
            <div className={`relative group my-2 space-y-2 ${className}`}>
                {/* Subscription Icon Pill */}
                <button
                    onClick={handleRenewClick}
                    className={`w-12 h-12 mx-auto rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 transform group-hover:scale-105 shadow-xl ${
                        expiryInfo.isCritical
                            ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-rose-900/50 border border-rose-400/40'
                            : expiryInfo.isWarning
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-900/50 border border-amber-400/40'
                            : 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-indigo-900/50 border border-indigo-400/40'
                    }`}
                    title={`Subscription: ${expiryInfo.daysLeft} days left`}
                >
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 animate-ping" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900" />
                    <ClockIcon className="w-4 h-4 text-white mb-0.5 animate-pulse" />
                    <span className="text-[9px] font-black leading-none">{expiryInfo.daysLeft}d</span>
                </button>

                {/* SMS Balance Icon Pill */}
                <button
                    onClick={handleSmsTopUpClick}
                    className={`w-12 h-12 mx-auto rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 transform group-hover:scale-105 shadow-xl ${
                        smsInfo.isLow
                            ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white border border-rose-400/40'
                            : 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border border-cyan-400/40'
                    }`}
                    title={`SMS Balance: ${smsInfo.formattedBalance} Units`}
                >
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-white mb-0.5" />
                    <span className="text-[8px] font-black leading-none">{smsInfo.balance > 999 ? `${(smsInfo.balance/1000).toFixed(1)}k` : smsInfo.balance}</span>
                </button>

                {/* Floating Tooltip Hover Drawer */}
                <div className="absolute left-full top-0 ml-3 w-72 p-4 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 z-[100] text-left space-y-3">
                    <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                            <SparklesIcon className="w-3.5 h-3.5" /> System Fuel Hub
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Subscription:</span>
                            <span className="font-black text-amber-400">{expiryInfo.daysLeft} Days Left ({expiryInfo.formattedDate})</span>
                        </div>
                        <button
                            onClick={handleRenewClick}
                            className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                        >
                            <CreditCardIcon className="w-3.5 h-3.5" />
                            <span>Renew Subscription</span>
                        </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">SMS Units:</span>
                            <span className={`font-black ${smsInfo.isLow ? 'text-rose-400' : 'text-cyan-400'}`}>{smsInfo.formattedBalance} Units</span>
                        </div>
                        <button
                            onClick={handleSmsTopUpClick}
                            className="w-full py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Top Up SMS Balance</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── FULL VERTICAL MENU DUAL BANNER VIEW ──
    const themeStyles = activeTab === 'subscription'
        ? (expiryInfo.isCritical
            ? {
                cardBg: 'bg-gradient-to-b from-rose-950/90 via-slate-900/95 to-slate-950/95',
                borderColor: 'border-rose-500/40 shadow-rose-950/30',
                badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                glowColor: 'bg-rose-500/20',
                btnBg: 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-white shadow-rose-500/30 hover:shadow-rose-500/50',
                progressBarBg: 'bg-gradient-to-r from-rose-500 to-amber-500',
                textHighlight: 'text-rose-400'
            }
            : {
                cardBg: 'bg-gradient-to-b from-amber-950/90 via-slate-900/95 to-slate-950/95',
                borderColor: 'border-amber-500/40 shadow-amber-950/30',
                badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                glowColor: 'bg-amber-500/20',
                btnBg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 shadow-amber-500/30 hover:shadow-amber-500/50',
                progressBarBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
                textHighlight: 'text-amber-400'
            })
        : (smsInfo.isLow
            ? {
                cardBg: 'bg-gradient-to-b from-red-950/90 via-slate-900/95 to-slate-950/95',
                borderColor: 'border-rose-500/40 shadow-rose-950/30',
                badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                glowColor: 'bg-rose-500/20',
                btnBg: 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-rose-500/30 hover:shadow-rose-500/50',
                progressBarBg: 'bg-gradient-to-r from-rose-500 to-orange-500',
                textHighlight: 'text-rose-400'
            }
            : {
                cardBg: 'bg-gradient-to-b from-cyan-950/90 via-slate-900/95 to-slate-950/95',
                borderColor: 'border-cyan-500/40 shadow-cyan-950/30',
                badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                glowColor: 'bg-cyan-500/20',
                btnBg: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50',
                progressBarBg: 'bg-gradient-to-r from-cyan-500 to-blue-500',
                textHighlight: 'text-cyan-400'
            });

    return (
        <>
            <div className={`relative overflow-hidden rounded-3xl border ${themeStyles.borderColor} ${themeStyles.cardBg} p-3.5 shadow-xl backdrop-blur-2xl transition-all duration-300 my-3 group ${className}`}>
                {/* Background Ambient Glow Effects */}
                <div className={`absolute -top-12 -right-12 w-32 h-32 ${themeStyles.glowColor} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700`} />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

                {/* Tab Switcher Header */}
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800/80">
                        <button
                            onClick={() => setActiveTab('subscription')}
                            className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                activeTab === 'subscription'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <ClockIcon className="w-3 h-3 text-amber-400" />
                            <span>Plan Expiry</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('sms')}
                            className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                activeTab === 'sms'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <ChatBubbleLeftRightIcon className="w-3 h-3 text-cyan-400" />
                            <span>SMS Fuel</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsDismissed(true)}
                        className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                        title="Dismiss Banner"
                    >
                        <XIcon className="w-3 h-3" />
                    </button>
                </div>

                {/* TAB 1: SUBSCRIPTION EXPIRY */}
                {activeTab === 'subscription' && (
                    <div className="space-y-2.5 relative z-10 text-left animate-fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                {customTitle || (expiryInfo.isTrial ? 'Trial Ending' : 'Plan Expiration')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${themeStyles.badgeBg}`}>
                                {expiryInfo.daysLeft} Days Left
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                            <h4 className="text-xs font-bold text-white tracking-tight">
                                Expires: <span className={`font-black ${themeStyles.textHighlight}`}>{expiryInfo.formattedDate}</span>
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {expiryInfo.progressPercentage}% Elapsed
                            </span>
                        </div>

                        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${themeStyles.progressBarBg}`}
                                style={{ width: `${expiryInfo.progressPercentage}%` }}
                            />
                        </div>

                        <button
                            onClick={handleRenewClick}
                            className={`w-full mt-1 py-2 px-3 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group/btn ${themeStyles.btnBg}`}
                        >
                            <CreditCardIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover/btn:scale-110" />
                            <span>Renew Subscription</span>
                            <ArrowRightIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    </div>
                )}

                {/* TAB 2: SMS BALANCE & TOP-UP */}
                {activeTab === 'sms' && (
                    <div className="space-y-2.5 relative z-10 text-left animate-fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 flex items-center gap-1">
                                <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-cyan-400" />
                                SMS Credit Balance
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                                smsInfo.isLow ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            }`}>
                                {smsInfo.isLow ? 'Low Credit' : 'Active Balance'}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                            <div>
                                <span className={`text-xl font-black ${smsInfo.isLow ? 'text-rose-400' : 'text-white'}`}>
                                    {smsInfo.formattedBalance}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Units</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                KES {smsInfo.unitPrice.toFixed(2)}/sms
                            </span>
                        </div>

                        <p className="text-[10px] text-slate-300/90 font-medium leading-tight">
                            Powers automated fee receipts, attendance pins, report cards & bulk notifications.
                        </p>

                        <button
                            onClick={handleSmsTopUpClick}
                            className={`w-full mt-1 py-2 px-3 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group/btn ${themeStyles.btnBg}`}
                        >
                            <PlusIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover/btn:scale-125" />
                            <span>Top Up SMS Balance</span>
                            <ArrowRightIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    </div>
                )}
            </div>

            {/* Embedded Subscription Payment Modal */}
            {isPayModalOpen && (
                <PayNowModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    institutionId={institution?.id}
                    institutionCode={institution?.institutionCode}
                    institutionName={institution?.name}
                    mpesaConfig={institution?.mpesaConfig || { shortCode: '247247', consumerKey: '', consumerSecret: '', passkey: '' }}
                    ncbaConfig={institution?.ncbaConfig}
                    monthlyPrice={institution?.customSubscriptionPrice?.monthly || 4999}
                    quarterlyPrice={institution?.customSubscriptionPrice?.quarterly || 13500}
                    yearlyPrice={institution?.customSubscriptionPrice?.yearly || 49999}
                    onSuccess={() => {
                        setIsPayModalOpen(false);
                        alert('Payment processed successfully! Your subscription has been extended.');
                    }}
                />
            )}

            {/* Embedded Buy SMS Modal */}
            {isSmsModalOpen && (
                <BuySMSModal
                    isOpen={isSmsModalOpen}
                    onClose={() => setIsSmsModalOpen(false)}
                    institutionId={institution?.id || 'inst_default'}
                    institutionCode={institution?.institutionCode || 'EDU001'}
                    institutionName={institution?.name || 'Academic Institution'}
                    mpesaConfig={institution?.mpesaConfig || { shortCode: '247247', consumerKey: '', consumerSecret: '', passkey: '' }}
                    ncbaConfig={institution?.ncbaConfig}
                    smsUnitPrice={institution?.customSmsPrice || 2.0}
                    onPurchaseComplete={(purchasedUnits) => {
                        setIsSmsModalOpen(false);
                        alert(`Successfully topped up ${purchasedUnits} SMS credits!`);
                    }}
                />
            )}
        </>
    );
};
