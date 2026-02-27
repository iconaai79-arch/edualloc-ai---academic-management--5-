
import React, { useState, useMemo } from 'react';
import type { Invoice, Institution, InvoiceItem, CompanyDetails } from '../types';
import { PlusIcon, XIcon, DocumentArrowDownIcon, BuildingOfficeIcon } from './icons/index';
import { downloadInvoicePdf } from '../services/pdfService';

interface TenantInvoiceManagerProps {
    invoices: Invoice[];
    institutions: Institution[];
    companyDetails: CompanyDetails;
    logoUrl: string | null;
    onCreateInvoice: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string) => void;
}

const InvoiceStatusBadge: React.FC<{ status: Invoice['status'] }> = ({ status }) => {
    const styles = {
        paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
};

export const TenantInvoiceManager: React.FC<TenantInvoiceManagerProps> = ({
    invoices, institutions, companyDetails, logoUrl, onCreateInvoice
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedInstId, setSelectedInstId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: 'Platform Subscription', quantity: 1, unitPrice: 0, amount: 0 }]);

    const institutionMap = useMemo(() => new Map(institutions.map(i => [i.id, i])), [institutions]);

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
            item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateTotal = () => items.reduce((sum, item) => sum + item.amount, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstId || !dueDate || items.some(i => !i.description || i.amount <= 0)) {
            alert("Please fill in all fields correctly.");
            return;
        }
        onCreateInvoice(selectedInstId, items, calculateTotal(), dueDate);
        setIsCreating(false);
        setItems([{ description: 'Platform Subscription', quantity: 1, unitPrice: 0, amount: 0 }]);
        setSelectedInstId('');
        setDueDate('');
    };

    const sortedInvoices = useMemo(() => {
        return [...invoices].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tenant Invoicing</h3>
                    <p className="text-sm text-slate-500">Generate and manage subscription billing for institutions.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary flex items-center gap-2 h-11 px-6 shadow-lg shadow-indigo-100"
                >
                    <PlusIcon className="w-5 h-5" /> Create Invoice
                </button>
            </div>

            {isCreating && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <h4 className="font-black text-lg uppercase tracking-tight text-indigo-600">New Invoice</h4>
                        <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <XIcon className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Bill To (Institution)</label>
                                <select
                                    value={selectedInstId}
                                    onChange={e => setSelectedInstId(e.target.value)}
                                    className="form-select w-full"
                                    required
                                >
                                    <option value="">-- Select Tenant --</option>
                                    {institutions.filter(inst => inst.institutionType !== 'Reseller').map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.institutionCode})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Payment Due Date</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="form-input w-full"
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-2 px-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Line Items</label>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount</span>
                            </div>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <div className="flex-grow grid grid-cols-12 gap-3">
                                            <div className="col-span-6">
                                                <input
                                                    type="text"
                                                    placeholder="Description"
                                                    value={item.description}
                                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                    className="form-input text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="form-input text-xs text-center"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="number"
                                                    placeholder="Unit Price"
                                                    value={item.unitPrice}
                                                    onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                                    className="form-input text-xs"
                                                    min="0"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="w-24 pt-2 text-right font-bold text-sm text-slate-700 dark:text-slate-200">
                                            {item.amount.toLocaleString()}
                                        </div>
                                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-red-500">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addItem} className="mt-4 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                <PlusIcon className="w-3 h-3" /> Add Line Item
                            </button>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-xs text-slate-500">Total Amount Due</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">KES {calculateTotal().toLocaleString()}</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-8">Generate Invoice</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Issue Date</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Invoice #</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Institution</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Due Date</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedInvoices.map(inv => {
                            const inst = institutionMap.get(inv.institutionId);
                            return (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {new Date(inv.issueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        {inv.invoiceNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <BuildingOfficeIcon className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{inst?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                                        KES {inv.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                                        {new Date(inv.dueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <InvoiceStatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-3">
                                            {inst && (
                                                <button
                                                    onClick={() => downloadInvoicePdf(inv, inst, companyDetails, logoUrl)}
                                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedInvoices.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">
                                    No invoices generated
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
