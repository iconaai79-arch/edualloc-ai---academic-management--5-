import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, CompanyDetails, MpesaTransaction, TransactionStatus, Invoice, Receipt, InvoiceItem, ExtensionRequest, SmsConfig } from '../types';
import { PayNowModal } from './PayNowModal';
import { MpesaIcon } from './icons/MpesaIcon';
import { SparklesIcon } from './icons';
import { downloadInvoicePdf, downloadReceiptPdf } from '../services/pdfService';

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


export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ institution, companyDetails, transactions, onAddTransaction, invoices, receipts, logoUrl, extensionRequests, onAddExtensionRequest, smsConfig, onRefreshData }) => {
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isBuySMSModalOpen, setIsBuySMSModalOpen] = useState(false);
    const [extensionReason, setExtensionReason] = useState('');
    const { subscriptionConfig, mpesaConfig } = companyDetails;

    // Support both camelCase (transformed) and snake_case (raw) from backend
    const customPrice = institution.customSubscriptionPrice || (institution as any).custom_subscription_price;
    const monthlyPrice = customPrice?.monthly ?? subscriptionConfig.defaultMonthlyPrice;
    const yearlyPrice = customPrice?.yearly ?? subscriptionConfig.defaultYearlyPrice;

    const hasCustomMonthly = customPrice?.monthly !== undefined;
    const hasCustomYearly = customPrice?.yearly !== undefined;

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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-medium text-slate-900 dark:text-white">Monthly Plan</h4>
                                <p className="mt-2 text-4xl font-bold text-[var(--color-primary)]">
                                    KES {monthlyPrice.toLocaleString()}
                                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">/month</span>
                                </p>
                                {hasCustomMonthly ? (
                                    <p className="mt-1 text-xs font-bold text-teal-600 dark:text-teal-400">Custom institutional price</p>
                                ) : (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Default system price</p>
                                )}
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-medium text-slate-900 dark:text-white">Yearly Plan</h4>
                                <p className="mt-2 text-4xl font-bold text-[var(--color-primary)]">
                                    KES {yearlyPrice.toLocaleString()}
                                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">/year</span>
                                </p>
                                {hasCustomYearly ? (
                                    <p className="mt-1 text-xs font-bold text-teal-600 dark:text-teal-400">Custom institutional price</p>
                                ) : (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Default system price</p>
                                )}
                                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Save by subscribing annually!</p>
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
                                            downloadInvoicePdf(doc as Invoice, institution, companyDetails, logoUrl);
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-semibold">KES {doc.amount.toLocaleString()}</td>
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
                                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                                        No billing documents found for this institution.
                                    </td>
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
                    onPay={handlePayNow}
                    monthlyPrice={monthlyPrice}
                    yearlyPrice={yearlyPrice}
                    mpesaConfig={mpesaConfig}
                    institutionId={institution.id}
                    institutionCode={institution.institutionCode}
                    institutionName={institution.name}
                />
            )}

        </div>
    );
};
