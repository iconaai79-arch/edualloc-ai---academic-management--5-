
import React, { useMemo, useState } from 'react';
import type { MpesaTransaction, Institution, TransactionStatus, Receipt, CompanyDetails } from './types.ts';
import { downloadReceiptPdf } from './services/pdfService.ts';

interface TransactionsManagerProps {
    transactions: MpesaTransaction[];
    institutions: Institution[];
    receipts: Receipt[];
    companyDetails: CompanyDetails;
    onGenerateReceipt: (transaction: MpesaTransaction) => void;
    logoUrl: string | null;
    title?: string;
}

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

export const TransactionsManager: React.FC<TransactionsManagerProps> = ({ transactions, institutions, receipts, companyDetails, onGenerateReceipt, logoUrl, title = "M-Pesa Transaction Log" }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const institutionMap = useMemo(() => new Map(institutions.map(inst => [inst.id, inst])), [institutions]);

    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions]);
    
    const filteredTransactions = useMemo(() => {
        if (!searchQuery.trim()) {
            return sortedTransactions;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return sortedTransactions.filter(txn => {
            const institutionName = institutionMap.get(txn.institutionId)?.name.toLowerCase() || '';
            return (
                txn.transactionId.toLowerCase().includes(lowercasedQuery) ||
                institutionName.includes(lowercasedQuery) ||
                txn.phoneNumber.includes(lowercasedQuery) ||
                txn.payerName.toLowerCase().includes(lowercasedQuery)
            );
        });
    }, [sortedTransactions, searchQuery, institutionMap]);
    
    const totalRevenue = useMemo(() => {
        return transactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    return (
        <section>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{title}</h3>
                <div className="w-full sm:w-72">
                    <label htmlFor="transaction-search" className="sr-only">Search Transactions</label>
                    <input
                        type="text"
                        id="transaction-search"
                        placeholder="Search by ID, institution, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-3 pr-4 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                </div>
            </div>
            
            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue (Completed)</h4>
                <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">
                    KES {totalRevenue.toLocaleString()}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Transaction ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Institution</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Payer Info</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                             <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map(txn => {
                                /* FIXED: Changed related_transaction_id to relatedTransactionId to match Receipt type definition */
                                const receipt = receipts.find(r => r.relatedTransactionId === txn.id);
                                const institution = institutionMap.get(txn.institutionId);

                                const handleAction = () => {
                                    if (receipt && institution) {
                                        downloadReceiptPdf(receipt, txn, institution, companyDetails, logoUrl);
                                    } else {
                                        onGenerateReceipt(txn);
                                    }
                                };
                                return (
                                <tr key={txn.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{txn.transactionId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{institution?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-semibold">KES {txn.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        <div>{txn.payerName}</div>
                                        <div className="text-xs">{txn.phoneNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(txn.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <TransactionStatusBadge status={txn.status} />
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {txn.status === 'completed' && (
                                            <button onClick={handleAction} className="text-[var(--color-primary)] hover:brightness-125">
                                                {receipt ? 'Download Receipt' : 'Generate Receipt'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                                    No transactions found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
