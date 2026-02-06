
import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, CompanyDetails, MpesaTransaction, TransactionStatus, Invoice, Receipt, InvoiceItem, ExtensionRequest } from '../types';
import { PayNowModal } from './PayNowModal';
import { MpesaIcon } from './icons/MpesaIcon';
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

const TrialCountdownBanner: React.FC<{ trialEndsAt: string }> = ({ trialEndsAt }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(trialEndsAt));

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft(trialEndsAt));
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

    if (timerComponents.length === 0) {
        return (
            <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4" role="alert">
                <p className="font-bold">Trial Period Expired</p>
                <p>Your 14-day trial has ended. Please subscribe to continue using the service.</p>
            </div>
        );
    }

    return (
        <div className="bg-sky-100 dark:bg-sky-900/50 border-l-4 border-sky-500 text-sky-700 dark:text-sky-300 p-4" role="alert">
            <p className="font-bold">You are on a trial period!</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <p>Your trial ends in: </p>
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


export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ institution, companyDetails, transactions, onAddTransaction, invoices, receipts, logoUrl, extensionRequests, onAddExtensionRequest }) => {
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [extensionReason, setExtensionReason] = useState('');
    const { subscriptionConfig, mpesaConfig } = companyDetails;

    const monthlyPrice = institution.customSubscriptionPrice?.monthly ?? subscriptionConfig.defaultMonthlyPrice;
    const yearlyPrice = institution.customSubscriptionPrice?.yearly ?? subscriptionConfig.defaultYearlyPrice;

    const hasCustomMonthly = institution.customSubscriptionPrice?.monthly !== undefined;
    const hasCustomYearly = institution.customSubscriptionPrice?.yearly !== undefined;

    const isSubscriptionExpired = useMemo(() => {
        if (!institution) return false;
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
    
    const allBillingDocs = useMemo(() => [
        // FIXED: Corrected property names from issue_date/total_amount to issueDate/totalAmount
        ...invoices.map(inv => ({...inv, type: 'Invoice', date: inv.issueDate, number: inv.invoiceNumber, amount: inv.totalAmount })),
        // FIXED: Corrected property names from payment_date/amount_paid to paymentDate/amountPaid
        ...receipts.map(rec => ({...rec, type: 'Receipt', date: rec.paymentDate, number: rec.receiptNumber, amount: rec.amountPaid }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [invoices, receipts]);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Subscription Records</h2>

            {institution.trialEndsAt && <TrialCountdownBanner trialEndsAt={institution.trialEndsAt} />}
            
            <section>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4">Active Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Monthly Billing</h4>
                        <p className="mt-2 text-3xl font-black text-indigo-600 tracking-tighter">
                            KES {monthlyPrice.toLocaleString()}
                            <span className="text-xs font-bold text-slate-400 ml-1">/ Month</span>
                        </p>
                        {hasCustomMonthly ? (
                             <p className="mt-2 text-[10px] font-black uppercase text-teal-600">Tailored Pricing</p>
                        ) : (
                             <p className="mt-2 text-[10px] font-black uppercase text-slate-400">Standard Tier</p>
                        )}
                    </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Annual Billing</h4>
                        <p className="mt-2 text-3xl font-black text-indigo-600 tracking-tighter">
                            KES {yearlyPrice.toLocaleString()}
                            <span className="text-xs font-bold text-slate-400 ml-1">/ Year</span>
                        </p>
                        {hasCustomYearly ? (
                             <p className="mt-2 text-[10px] font-black uppercase text-teal-600">Tailored Pricing</p>
                        ) : (
                             <p className="mt-2 text-[10px] font-black uppercase text-slate-400">Standard Tier</p>
                        )}
                         <p className="mt-2 text-[10px] font-black uppercase text-green-600">Enterprise Discount Included</p>
                    </div>
                </div>
            </section>
            
            <section>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4">Settlement Instructions</h3>
                 <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                     <p className="text-sm text-slate-500 mb-6 font-medium">To renew your institutional license, settle via Safaricom M-Pesa. Use your unique Institution ID as the account reference for instant activation.</p>
                     <div className="flex flex-col md:flex-row gap-8">
                         <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border">
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Paybill Number</p>
                             <p className="text-2xl font-black tracking-widest">{mpesaConfig.paybillNumber || '7654321'}</p>
                         </div>
                         <div className="flex-1 p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl border border-indigo-100">
                            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1">Account Reference</p>
                            <p className="text-2xl font-black tracking-widest text-indigo-700 dark:text-indigo-300 font-mono uppercase">{institution.institutionCode || institution.id.slice(-6)}</p>
                        </div>
                     </div>
                     <div className="mt-8 flex justify-center">
                        <button
                            onClick={() => setIsPayModalOpen(true)}
                            className="inline-flex items-center justify-center px-10 h-14 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl shadow-green-100 dark:shadow-none transition-all active:scale-[0.98]"
                        >
                            <MpesaIcon className="w-6 h-6 mr-3" />
                            Initiate STK Push
                        </button>
                    </div>
                 </div>
            </section>

            {isSubscriptionExpired && onAddExtensionRequest && extensionRequests && (
                <section className="animate-fade-in-up">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-4">Grace Period Application</h3>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <form onSubmit={handleExtensionRequestSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="extension-reason" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Justification for extension</label>
                                <textarea id="extension-reason" value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} rows={3} className="w-full rounded-2xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-4 focus:ring-indigo-500/10 p-4 transition-all" placeholder="Explain the necessity for a temporary access window..." required></textarea>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="btn-primary h-12 px-10">Submit Registry Request</button>
                            </div>
                        </form>
                        {extensionRequests.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Tracked Extension Applications</h4>
                                <ul className="space-y-3">
                                    {extensionRequests.map(req => (
                                        <li key={req.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{req.reason}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-black mt-0.5">Applied: {new Date(req.requestedAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>{req.status}</span>
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
                    <h3 className="text-xl font-black uppercase tracking-tight">Billing Archive</h3>
                </div>
                 <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Document Date</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Registry ID</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Doc Type</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Value (KES)</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-slate-500 tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {allBillingDocs.length > 0 ? (
                                allBillingDocs.map(doc => {
                                    const handleDownload = () => {
                                        if (doc.type === 'Invoice') {
                                            downloadInvoicePdf(doc as Invoice, institution, companyDetails, logoUrl);
                                        } else {
                                            // FIXED: Corrected property name from related_transaction_id to relatedTransactionId
                                            const transaction = transactions.find(t => t.id === (doc as Receipt).relatedTransactionId);
                                            if (transaction) {
                                                downloadReceiptPdf(doc as Receipt, transaction, institution, companyDetails, logoUrl);
                                            } else {
                                                alert("Could not find related transaction record.");
                                            }
                                        }
                                    };
                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-600 dark:text-slate-400">{new Date(doc.date).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 whitespace-nowrap text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{doc.number}</td>
                                            <td className="px-8 py-5 whitespace-nowrap text-sm font-black uppercase tracking-tight">{doc.type}</td>
                                            <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">KES {doc.amount.toLocaleString()}</td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                {doc.type === 'Invoice' ? <InvoiceStatusBadge status={(doc as Invoice).status} /> : <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest">COMPLETED</span>}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right">
                                                <button onClick={handleDownload} className="text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-widest transition-colors">Download PDF</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest opacity-30">
                                        No financial documents recorded
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
                />
            )}
        </div>
    );
};
