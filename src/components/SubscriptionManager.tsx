import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, CompanyDetails, MpesaTransaction, TransactionStatus, Invoice, Receipt, InvoiceItem, ExtensionRequest, SmsConfig } from '../types';
import { BuySMSModal } from './BuySMSModal';
import { PayNowModal } from './PayNowModal';
import { MpesaIcon } from './icons/MpesaIcon';
import { SparklesIcon } from './icons/SparklesIcon';

import { downloadInvoicePdf, downloadReceiptPdf } from '../services/pdfService';
import { apiService } from '../services/apiService';

interface SubscriptionManagerProps {
    institution: Institution;
    companyDetails: CompanyDetails;
    transactions: MpesaTransaction[];
    onAddTransaction: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    invoices: Invoice[];
    receipts: Receipt[];
    logoUrl: string | null;
    extensionRequests?: ExtensionRequest[];
    onAddExtensionRequest?: (reason: string) => void;
    smsConfig: SmsConfig;
    onRefreshData?: () => void;
    onActivateModuleTrial?: (moduleId: string) => Promise<void>;
}

const calculateTimeLeft = (endDate: string) => {
    const difference = +new Date(endDate) - +new Date();
    let timeLeft: { [key: string]: number } = {};

    if (difference > 0) {
        timeLeft = {
            Days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            Hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            Minutes: Math.floor((difference / 1000 / 60) % 60),
            Seconds: Math.floor((difference / 1000) % 60)
        };
    }

    return timeLeft;
};

const StatusCountdownBanner: React.FC<{ endDate: string, title: string, expiredMessage: string, activeMessage: string, color: 'sky' | 'emerald' | 'amber' | 'red' }> = ({ endDate, title, expiredMessage, activeMessage, color }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endDate));

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft(endDate));
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timerComponents = Object.keys(timeLeft).map((interval, i) => {
        if (timeLeft[interval] === undefined) return null;
        return (
            <span key={i} className="font-mono bg-white/20 dark:bg-black/20 px-2 py-1 rounded-md text-sm">
                {String(timeLeft[interval]).padStart(2, '0')} {interval}
            </span>
        );
    }).filter(Boolean);

    const colorClasses = {
        sky: "bg-sky-100 dark:bg-sky-900/50 border-sky-500 text-sky-700 dark:text-sky-300",
        emerald: "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 text-emerald-700 dark:text-emerald-300",
        amber: "bg-amber-100 dark:bg-amber-900/50 border-amber-500 text-amber-700 dark:text-amber-300",
        red: "bg-red-100 dark:bg-red-900/50 border-red-500 text-red-700 dark:text-red-300",
    };

    if (timerComponents.length === 0) {
        return (
            <div className={`${colorClasses.red} border-l-4 p-4`} role="alert">
                <p className="font-bold">Subscription Expired</p>
                <p>{expiredMessage}</p>
            </div>
        );
    }

    return (
        <div className={`${colorClasses[color]} border-l-4 p-4`} role="alert">
            <p className="font-bold">{title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <p>{activeMessage}</p>
                <div className="flex flex-wrap gap-2">{timerComponents}</div>
            </div>
        </div>
    );
};


const TransactionStatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
        case 'completed':
            return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>Completed</span>;
        case 'failed':
            return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`}>Failed</span>;
        case 'pending':
            return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>Pending</span>;
        default:
            return null;
    }
};

const InvoiceStatusBadge: React.FC<{ status: Invoice['status'] }> = ({ status }) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";
    switch (status) {
        case 'paid':
            return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>Paid</span>;
        case 'pending':
            return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>Pending</span>;
        case 'overdue':
            return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`}>Overdue</span>;
        default:
            return null;
    }
};


export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ institution, companyDetails, transactions, onAddTransaction, invoices, receipts, logoUrl, extensionRequests, onAddExtensionRequest, smsConfig, onRefreshData, onActivateModuleTrial }) => {
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isBuySMSModalOpen, setIsBuySMSModalOpen] = useState(false);
    const [extensionReason, setExtensionReason] = useState('');
    const { subscriptionConfig, mpesaConfig } = companyDetails;

    // Support both camelCase (transformed) and snake_case (raw) from backend
    const customPrice = institution.customSubscriptionPrice || (institution as any).custom_subscription_price;
    const monthlyPrice = customPrice?.monthly ?? subscriptionConfig.defaultMonthlyPrice;
    const quarterlyPrice = customPrice?.quarterly ?? (subscriptionConfig.defaultMonthlyPrice * 4);
    const yearlyPrice = customPrice?.yearly ?? subscriptionConfig.defaultYearlyPrice;

    const hasCustomMonthly = customPrice?.monthly !== undefined;
    const hasCustomQuarterly = customPrice?.quarterly !== undefined;
    const hasCustomYearly = customPrice?.yearly !== undefined;

    const [activeLibraryStudents, setActiveLibraryStudents] = useState(0);
    const [activeBoardingStudents, setActiveBoardingStudents] = useState(0);
    const [activeTransportStudents, setActiveTransportStudents] = useState(0);

    useEffect(() => {
        if (institution.institutionType === 'Reseller') return;

        const fetchModuleData = async () => {
            try {
                // Fetch required data in parallel
                const [usersData, bedAllocationsData, transportOnboardingData, academicYearsData] = await Promise.all([
                    apiService.fetchModuleRecords<any>('users', institution.id).catch(() => []),
                    apiService.fetchModuleRecords<any>('bed_allocations', institution.id).catch(() => []),
                    apiService.fetchModuleRecords<any>('transport_onboarding', institution.id).catch(() => []),
                    apiService.fetchModuleRecords<any>('academic_years', institution.id).catch(() => []),
                ]);

                // Filter users to only 'student' role
                const students = usersData.filter((u: any) => u.role === 'student');

                // Determine active library students (all students if an active academic year exists)
                const hasActiveAcademicYear = academicYearsData.some((ay: any) => ay.status === 'active');
                setActiveLibraryStudents(hasActiveAcademicYear ? students.length : 0);

                // Determine active boarding students
                const activeBeds = bedAllocationsData.filter((a: any) => a.status === 'Active');
                setActiveBoardingStudents(activeBeds.length);

                // Determine active transport students
                const onboardedTransport = transportOnboardingData.filter((t: any) => t.status === 'onboarded');
                setActiveTransportStudents(onboardedTransport.length);
            } catch (error) {
                console.error("Failed to fetch module data for billing calculation", error);
            }
        };

        fetchModuleData();
    }, [institution.id, institution.institutionType]);

    const isSubscriptionExpired = useMemo(() => {
        if (!institution) return false;
        if (institution.institutionType === 'Reseller') return false;
        const now = new Date();
        if (institution.status === 'trial' && institution.trialEndsAt) {
            return new Date(institution.trialEndsAt) < now;
        }
        if (institution.status === 'active' && institution.subscriptionEndsAt) {
            return new Date(institution.subscriptionEndsAt) < now;
        }
        if (institution.status === 'suspended') {
            return true;
        }
        return false;
    }, [institution]);

    const handlePayNow = (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]): Promise<TransactionStatus> => {
        return onAddTransaction({
            ...paymentData,
            institutionId: institution.id,
            provider: 'mpesa',
            paymentMethod: 'stk_push'
        }, items);
    };

    const handleExtensionRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (extensionReason.trim()) {
            onAddExtensionRequest?.(extensionReason);
            setExtensionReason('');
        }
    };

    const allBillingDocs = [
        // FIXED: Reverted back to correct property names as per types.ts
        ...invoices.map(inv => ({ ...inv, type: 'Invoice', date: inv.issueDate, number: inv.invoiceNumber, amount: inv.totalAmount })),
        // FIXED: Reverted back to correct property names as per types.ts
        ...receipts.map(rec => ({ ...rec, type: 'Receipt', date: rec.paymentDate, number: rec.receiptNumber, amount: rec.amountPaid }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Subscription Management</h2>
                <div className="flex items-center gap-2">
                    {institution.status === 'active' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-200 dark:border-emerald-800">Account Active</span>}
                    {institution.status === 'trial' && <span className="px-3 py-1 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 text-xs font-black uppercase tracking-widest rounded-full border border-sky-200 dark:border-sky-800">Trial Period</span>}
                    {institution.status === 'suspended' && <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-full border border-amber-200 dark:border-amber-800">Account Suspended</span>}
                </div>
            </div>

            {institution.status === 'trial' && institution.trialEndsAt && (
                <StatusCountdownBanner
                    endDate={institution.trialEndsAt}
                    title="You are on a trial period!"
                    activeMessage="Your trial ends in: "
                    expiredMessage="Your 14-day trial has ended. Please subscribe to continue using the service."
                    color="sky"
                />
            )}

            {institution.status === 'active' && institution.subscriptionEndsAt && (
                <StatusCountdownBanner
                    endDate={institution.subscriptionEndsAt}
                    title="Active Subscription"
                    activeMessage="Your subscription expires in: "
                    expiredMessage="Your subscription has expired. Please renew to continue using the service."
                    color="emerald"
                />
            )}

            {institution.institutionType === 'Reseller' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500 p-6 rounded-r-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                            <SparklesIcon className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-100 italic">Portfolio Activated</h3>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">This Reseller Agency account is permanently activated and exempt from platform subscription charges.</p>
                        </div>
                    </div>
                </div>
            )}


            {institution.institutionType !== 'Reseller' && (
                <>
                    <section>
                        <h3 className="text-xl font-semibold mb-4">Subscription Pricing</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-medium text-slate-900 dark:text-white">Monthly Plan</h4>
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Base License:</span>
                                        <span className="font-bold">KES {monthlyPrice?.toLocaleString()}</span>
                                    </div>
                                    {subscriptionConfig.libraryCostPerStudent !== undefined && subscriptionConfig.libraryCostPerStudent > 0 && activeLibraryStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Library ({activeLibraryStudents} active):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.libraryCostPerStudent * activeLibraryStudents)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {subscriptionConfig.boardingCostPerStudent !== undefined && subscriptionConfig.boardingCostPerStudent > 0 && activeBoardingStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Boarding ({activeBoardingStudents} active):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.boardingCostPerStudent * activeBoardingStudents)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {subscriptionConfig.transportCostPerStudent !== undefined && subscriptionConfig.transportCostPerStudent > 0 && activeTransportStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Transport ({activeTransportStudents} active):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.transportCostPerStudent * activeTransportStudents)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-slate-900 dark:text-white font-bold">Total:</span>
                                        <span className="text-2xl font-bold text-[var(--color-primary)]">
                                            KES {(monthlyPrice + (subscriptionConfig.libraryCostPerStudent || 0) * activeLibraryStudents + (subscriptionConfig.boardingCostPerStudent || 0) * activeBoardingStudents + (subscriptionConfig.transportCostPerStudent || 0) * activeTransportStudents)?.toLocaleString()}
                                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/mo</span>
                                        </span>
                                    </div>
                                </div>
                                {hasCustomMonthly ? (
                                    <p className="mt-3 text-xs font-bold text-teal-600 dark:text-teal-400">Custom institutional base price</p>
                                ) : (
                                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Default system base price</p>
                                )}
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-medium text-slate-900 dark:text-white">Yearly Plan</h4>
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Base License:</span>
                                        <span className="font-bold">KES {yearlyPrice?.toLocaleString()}</span>
                                    </div>
                                    {subscriptionConfig.libraryCostPerStudent !== undefined && subscriptionConfig.libraryCostPerStudent > 0 && activeLibraryStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Library ({activeLibraryStudents} active x 12):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.libraryCostPerStudent * activeLibraryStudents * 12)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {subscriptionConfig.boardingCostPerStudent !== undefined && subscriptionConfig.boardingCostPerStudent > 0 && activeBoardingStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Boarding ({activeBoardingStudents} active x 12):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.boardingCostPerStudent * activeBoardingStudents * 12)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {subscriptionConfig.transportCostPerStudent !== undefined && subscriptionConfig.transportCostPerStudent > 0 && activeTransportStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Transport ({activeTransportStudents} active x 12):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.transportCostPerStudent * activeTransportStudents * 12)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-slate-900 dark:text-white font-bold">Total:</span>
                                        <span className="text-2xl font-bold text-[var(--color-primary)]">
                                            KES {(yearlyPrice + ((subscriptionConfig.libraryCostPerStudent || 0) * activeLibraryStudents * 12) + ((subscriptionConfig.boardingCostPerStudent || 0) * activeBoardingStudents * 12) + ((subscriptionConfig.transportCostPerStudent || 0) * activeTransportStudents * 12))?.toLocaleString()}
                                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/yr</span>
                                        </span>
                                    </div>
                                </div>
                                {hasCustomYearly ? (
                                    <p className="mt-3 text-xs font-bold text-teal-600 dark:text-teal-400">Custom institutional base price</p>
                                ) : (
                                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Default system base price</p>
                                )}
                                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Save by subscribing annually!</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-medium text-slate-900 dark:text-white">Quarterly Plan</h4>
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Base License:</span>
                                        <span className="font-bold">KES {quarterlyPrice?.toLocaleString()}</span>
                                    </div>
                                    {subscriptionConfig.libraryCostPerStudent !== undefined && subscriptionConfig.libraryCostPerStudent > 0 && activeLibraryStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Library ({activeLibraryStudents} active x 4):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.libraryCostPerStudent * activeLibraryStudents * 4)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {subscriptionConfig.boardingCostPerStudent !== undefined && subscriptionConfig.boardingCostPerStudent > 0 && activeBoardingStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Boarding ({activeBoardingStudents} active x 4):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.boardingCostPerStudent * activeBoardingStudents * 4)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {subscriptionConfig.transportCostPerStudent !== undefined && subscriptionConfig.transportCostPerStudent > 0 && activeTransportStudents > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Transport ({activeTransportStudents} active x 4):</span>
                                            <span className="font-bold">KES {(subscriptionConfig.transportCostPerStudent * activeTransportStudents * 4)?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-slate-900 dark:text-white font-bold">Total:</span>
                                        <span className="text-2xl font-bold text-[var(--color-primary)]">
                                            KES {(quarterlyPrice + ((subscriptionConfig.libraryCostPerStudent || 0) * activeLibraryStudents * 4) + ((subscriptionConfig.boardingCostPerStudent || 0) * activeBoardingStudents * 4) + ((subscriptionConfig.transportCostPerStudent || 0) * activeTransportStudents * 4))?.toLocaleString()}
                                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/qtr</span>
                                        </span>
                                    </div>
                                </div>
                                {hasCustomQuarterly ? (
                                    <p className="mt-3 text-xs font-bold text-teal-600 dark:text-teal-400">Custom institutional base price</p>
                                ) : (
                                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Default system base price</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-4">How to Pay</h3>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                            <p className="text-slate-600 dark:text-slate-300 mb-4">To subscribe or renew, please make a payment via M-Pesa using the details below, or use the quick payment button.</p>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Paybill Number</p>
                                    <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{mpesaConfig.paybillNumber || 'Not Configured'}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Account Number</p>
                                    <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{institution.institutionCode || institution.id}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">(Use your unique alphanumeric institution code)</p>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                                <button
                                    onClick={() => setIsPayModalOpen(true)}
                                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <MpesaIcon className="w-6 h-6 mr-3" />
                                    Pay Now with M-Pesa
                                </button>
                            </div>
                        </div>
                    </section>
                    <section>
                        <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                            Premium Modules
                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-tighter">New Features</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { id: 'school_store', name: 'School Inventory', description: 'Comprehensive inventory and stock management tailored for the education sector, including uniform/stationery stock, student requests, and suppliers.' },
                                { id: 'library', name: 'Library Management', description: 'Comprehensive library system with cataloging, issuing, returning, and fine tracking features.' },
                                { id: 'academics', name: 'Academics & Grading', description: 'Advanced academic tracking, grading systems, report card generation, and student performance analytics.' },
                                { id: 'finance', name: 'Finance & Accounting', description: 'Integrated financial management, fee collection, invoicing, expense tracking, and financial reporting.' },
                                { id: 'hr_payroll', name: 'HR & Payroll Compliance', description: 'Manage employee directories, process Kenyan tax standards (PAYE, NHIF/SHIF, NSSF) compliant payroll, and log biometric attendance.' },
                                { id: 'his', name: 'EduPulse Wellness & Care Hub', description: 'Comprehensive school sickbay registry, student health records, triage logs, clinic visits management, and wellness tracking.' },
                                { id: 'timetable', name: 'Smart Timetable', description: 'Automated timetable generation, conflict resolution, and teacher schedule management.' },
                                { id: 'enrollment_manager', name: 'Student Enrollment Manager', description: 'Unified, context-aware student registry and enrollment portal supporting both academic and driving school curriculums with biometric scanner integration.' },
                                { id: 'events', name: 'Marathon & Event Management', description: 'Track race categories, registrations, timing splits, fundraising pledges, and medical tents.' }
                            ].map(module => {
                                const state = institution.moduleStates?.find(m => m.moduleId === module.id);
                                const isInactive = !state || state.status === 'inactive';
                                const isTrial = state?.status === 'trial';
                                const isActive = state?.status === 'active';
                                const isExpired = state?.status === 'expired' || (state?.status === 'trial' && state.trialEndsAt && new Date(state.trialEndsAt) < new Date());

                                return (
                                    <div key={module.id} className="group relative bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <SparklesIcon className="w-12 h-12 text-slate-400" />
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{module.name}</h4>
                                                <div className="flex flex-col gap-1 items-end">
                                                    {isTrial && <span className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-sky-200 dark:border-sky-800">Trial</span>}
                                                    {isActive && <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">Active</span>}
                                                    {isExpired && <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-red-200 dark:border-red-800">Expired</span>}
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">{module.description}</p>
                                        </div>
                                        
                                        {isInactive ? (
                                            <button 
                                                onClick={() => onActivateModuleTrial?.(module.id)}
                                                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-125 active:scale-95 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                                            >
                                                Start 14-Day Free Trial
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    {isTrial ? `Trial ends: ${new Date(state.trialEndsAt!).toLocaleDateString()}` : 
                                                     isActive ? `Renews: ${new Date(state.subscriptionEndsAt!).toLocaleDateString()}` : 
                                                     'Access Expired'}
                                                </div>
                                                {isExpired && (
                                                     <button className="w-full py-3 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-emerald-200 dark:shadow-none">
                                                        Upgrade to Pro
                                                     </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            {isSubscriptionExpired && onAddExtensionRequest && extensionRequests && (
                <section>
                    <h3 className="text-xl font-semibold mb-4">Subscription Extension</h3>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <form onSubmit={handleExtensionRequestSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="extension-reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for Extension Request</label>
                                <textarea id="extension-reason" value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} rows={3} className="mt-1 shadow-sm block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" placeholder="Please provide a reason for requesting a subscription or trial extension..." required></textarea>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="btn-primary">Submit Request</button>
                            </div>
                        </form>
                        {extensionRequests.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="font-semibold">My Extension Requests</h4>
                                <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
                                    {extensionRequests.map(req => (
                                        <li key={req.id} className="py-3">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-slate-600 dark:text-slate-300">{req.reason}</p>
                                                <span className={`text-xs font-semibold capitalize px-2 py-1 rounded-full ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>{req.status}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Requested on {new Date(req.requestedAt).toLocaleDateString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section>
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Billing History</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Document #</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Download</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {allBillingDocs.length > 0 ? (
                                allBillingDocs.map(doc => {
                                    const handleDownload = () => {
                                        if (doc.type === 'Invoice') {
                                            downloadInvoicePdf(doc as Invoice, institution, companyDetails, logoUrl, true);
                                        } else {
                                            // Unified camelCase property
                                            const transaction = transactions.find(t => t.id === (doc as Receipt).relatedTransactionId);
                                            if (transaction) {
                                                downloadReceiptPdf(doc as Receipt, transaction, institution, companyDetails, logoUrl);
                                            } else {
                                                alert("Could not find related transaction to generate receipt.");
                                            }
                                        }
                                    };
                                    return (
                                        <tr key={doc.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(doc.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{doc.number}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{doc.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-semibold">KES {doc.amount?.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {doc.type === 'Invoice' ? <InvoiceStatusBadge status={(doc as Invoice).status} /> : <TransactionStatusBadge status="completed" />}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={handleDownload} className="text-[var(--color-primary)] hover:brightness-125">Download PDF</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-center italic">No billing history found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {isPayModalOpen && (
                <PayNowModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    monthlyPrice={monthlyPrice + ((subscriptionConfig.libraryCostPerStudent || 0) * activeLibraryStudents) + ((subscriptionConfig.boardingCostPerStudent || 0) * activeBoardingStudents) + ((subscriptionConfig.transportCostPerStudent || 0) * activeTransportStudents)}
                    yearlyPrice={yearlyPrice + ((subscriptionConfig.libraryCostPerStudent || 0) * activeLibraryStudents * 12) + ((subscriptionConfig.boardingCostPerStudent || 0) * activeBoardingStudents * 12) + ((subscriptionConfig.transportCostPerStudent || 0) * activeTransportStudents * 12)}
                    onPay={handlePayNow}
                    institutionName={institution.name}
                    institutionId={institution.id}
                    mpesaConfig={institution.mpesaConfig || companyDetails.mpesaConfig!}
                    airtelMoneyConfig={institution.airtelMoneyConfig || (companyDetails as any).airtelMoneyConfig}
                    intasendConfig={institution.intasendConfig || (companyDetails as any).intasendConfig}
                    ncbaConfig={institution.ncbaConfig || companyDetails.ncbaConfig}
                />
            )}
            {isBuySMSModalOpen && (
                <BuySMSModal
                    isOpen={isBuySMSModalOpen}
                    onClose={() => setIsBuySMSModalOpen(false)}
                    onPurchaseComplete={(purchasedUnits) => {
                        if (onRefreshData) {
                            onRefreshData();
                        }
                    }}
                    mpesaConfig={institution.mpesaConfig || companyDetails.mpesaConfig!}
                    airtelMoneyConfig={institution.airtelMoneyConfig || (companyDetails as any).airtelMoneyConfig}
                    intasendConfig={institution.intasendConfig || (companyDetails as any).intasendConfig}
                    ncbaConfig={institution.ncbaConfig || companyDetails.ncbaConfig}
                    institutionId={institution.id}
                    institutionCode={institution.institutionCode || 'SYSTEM'}
                    institutionName={institution.name}
                    smsUnitPrice={institution.customSmsPrice || (institution as any)?.custom_sms_price || (smsConfig as any)?.smsUnitPrice || (smsConfig as any)?.sms_unit_price || companyDetails?.smsConfig?.smsUnitPrice || (companyDetails?.smsConfig as any)?.sms_unit_price || (companyDetails as any)?.smsUnitPrice || (companyDetails as any)?.sms_unit_price || 2}
                    minSmsUnits={(smsConfig as any)?.minSmsUnits || 0}
                />
            )}
        </div>
    );
};

