
import React, { useState, useMemo } from 'react';
import type { Invoice, Institution, InvoiceItem, CompanyDetails } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { EyeIcon } from './icons/EyeIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';

import { apiService } from '../services/apiService';
import { downloadInvoicePdf, downloadQuotePdf } from '../services/pdfService';
import { sendEmailNotification } from '../services/emailService';

interface TenantInvoiceManagerProps {
    invoices: Invoice[];
    institutions: Institution[];
    companyDetails: CompanyDetails;
    logoUrl: string | null;
    onCreateInvoice: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string, isQuote?: boolean) => void;
    onUpdateInvoiceStatus?: (invoiceId: string, status: string) => Promise<void>;
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    { value: 'quote', label: 'Quote', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
];

const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${opt.color}`}>
            {opt.label}
        </span>
    );
};

export const TenantInvoiceManager: React.FC<TenantInvoiceManagerProps> = ({
    invoices, institutions, companyDetails, logoUrl, onCreateInvoice, onUpdateInvoiceStatus
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
    const [selectedInstId, setSelectedInstId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: 'Platform Subscription', quantity: 1, unitPrice: 0, amount: 0 }]);
    const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);
    const [statusUpdateValues, setStatusUpdateValues] = useState<Record<string, string>>({});
    const [savingStatus, setSavingStatus] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    
    // States for recording payment
    const [recordingPaymentFor, setRecordingPaymentFor] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('MPESA');
    const [paymentRef, setPaymentRef] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

    const institutionMap = useMemo(() => new Map<string, Institution>(institutions.map(i => [i.id, i])), [institutions]);

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
            item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        }
        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);

    const removeItem = (index: number) => {
        if (items.length > 1) setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => items.reduce((sum, item) => sum + item.amount, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstId || !dueDate || items.some(i => !i.description || i.amount <= 0)) {
            alert('Please fill in all fields correctly.');
            return;
        }
        onCreateInvoice(selectedInstId, items, calculateTotal(), dueDate, documentType === 'quote');
        setIsCreating(false);
        setItems([{ description: 'Platform Subscription', quantity: 1, unitPrice: 0, amount: 0 }]);
        setSelectedInstId('');
        setDueDate('');
        setDocumentType('invoice');
    };

    const handleUpdateStatus = async (invoiceId: string) => {
        const newStatus = statusUpdateValues[invoiceId];
        if (!newStatus || !onUpdateInvoiceStatus) return;
        setSavingStatus(invoiceId);
        try {
            await onUpdateInvoiceStatus(invoiceId, newStatus);
            setUpdatingStatusFor(null);
            setStatusUpdateValues(prev => { const n = { ...prev }; delete n[invoiceId]; return n; });
        } finally {
            setSavingStatus(null);
        }
    };

    const startRecordingPayment = (inv: Invoice) => {
        setRecordingPaymentFor(inv);
        setPaymentAmount(inv.totalAmount);
        setPaymentMethod('MPESA');
        setPaymentRef('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
    };

    const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recordingPaymentFor) return;
        setIsSubmittingPayment(true);
        try {
            const prefix = (companyDetails?.globalReceiptPrefix || 'RCT-').trim();
            const receipt = {
                id: `RCT_${Date.now()}`,
                receiptNumber: `${prefix}${Date.now()}`,
                institutionId: recordingPaymentFor.institutionId,
                paymentDate: new Date(paymentDate).toISOString(),
                amountPaid: Number(paymentAmount),
                paidFor: `Platform Subscription Payment (Invoice ${recordingPaymentFor.invoiceNumber})`,
                paymentMethod: paymentMethod,
                relatedTransactionId: paymentRef,
                invoiceId: recordingPaymentFor.id
            };
            await apiService.saveModuleRecord('receipts', receipt);
            if (onUpdateInvoiceStatus) {
                await onUpdateInvoiceStatus(recordingPaymentFor.id, 'paid');
            } else {
                await apiService.saveModuleRecord('invoices', { ...recordingPaymentFor, status: 'paid' });
            }

            // Send payment confirmation receipt email to client
            const inst = institutions.find(i => i.id === recordingPaymentFor.institutionId);
            if (inst?.email) {
                const emailBody = `Dear Admin,\n\nThis is a confirmation that payment of KES ${Number(paymentAmount).toLocaleString()}.00 has been received and recorded for Invoice ${recordingPaymentFor.invoiceNumber}.\n\nReceipt Number: ${receipt.receiptNumber}\nPayment Date: ${new Date(paymentDate).toLocaleDateString()}\nPayment Method: ${paymentMethod}\nTransaction Reference: ${paymentRef}\n\nThank you for your business!\nThe ${companyDetails?.name || 'EduAi Network'} Team`;
                
                sendEmailNotification(
                    inst.email,
                    `Payment Confirmation & Receipt ${receipt.receiptNumber} - ${companyDetails?.name || 'EduAi Network'}`,
                    emailBody,
                    companyDetails?.emailConfig,
                    companyDetails?.name || 'EduAi Network'
                ).catch(err => console.error("Receipt email sending failed:", err));
            }

            alert(`Payment recorded successfully for Invoice ${recordingPaymentFor.invoiceNumber}`);
            setRecordingPaymentFor(null);
        } catch (err: any) {
            alert(err.message || 'Failed to record payment');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const sortedInvoices = useMemo(() => {
        const filtered = filterStatus === 'all' ? invoices : invoices.filter(inv => inv.status === filterStatus);
        return [...filtered].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices, filterStatus]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tenant Invoicing</h3>
                    <p className="text-sm text-slate-500">Generate and manage subscription billing for institutions.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary flex items-center gap-2 h-11 px-6 shadow-lg shadow-indigo-100"
                >
                    <PlusIcon className="w-5 h-5" /> New Document
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div className="flex items-center gap-3">
                            {/* Invoice / Quote Toggle */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setDocumentType('invoice')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${documentType === 'invoice' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Invoice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDocumentType('quote')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${documentType === 'quote' ? 'bg-blue-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Quotation
                                </button>
                            </div>
                            <h4 className={`font-black text-lg uppercase tracking-tight ${documentType === 'quote' ? 'text-blue-600' : 'text-indigo-600'}`}>
                                New {documentType === 'quote' ? 'Quotation' : 'Invoice'}
                            </h4>
                        </div>
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
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                                    {documentType === 'quote' ? 'Quote Valid Until' : 'Payment Due Date'}
                                </label>
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
                                                <input type="text" placeholder="Description" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="form-input text-xs" required />
                                            </div>
                                            <div className="col-span-2">
                                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="form-input text-xs text-center" min="1" required />
                                            </div>
                                            <div className="col-span-4">
                                                <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} className="form-input text-xs" min="0" required />
                                            </div>
                                        </div>
                                        <div className="w-24 pt-2 text-right font-bold text-sm text-slate-700 dark:text-slate-200">
                                            {item.amount?.toLocaleString()}
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
                                <p className="text-xs text-slate-500">{documentType === 'quote' ? 'Quoted Amount' : 'Total Amount Due'}</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">KES {calculateTotal()?.toLocaleString()}</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className={`${documentType === 'quote' ? 'bg-blue-600 hover:bg-blue-700' : 'btn-primary'} px-8 py-2 rounded-xl text-white text-sm font-bold transition-colors`}>
                                    Generate {documentType === 'quote' ? 'Quote' : 'Invoice'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">Filter:</span>
                {['all', ...STATUS_OPTIONS.map(s => s.value)].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}
                    >
                        {s === 'all' ? 'All' : STATUS_OPTIONS.find(o => o.value === s)?.label || s}
                    </button>
                ))}
            </div>

            {/* Invoice Table */}
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Issue Date</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Doc #</th>
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
                            const isEditingStatus = updatingStatusFor === inv.id;
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
                                        KES {inv.totalAmount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                                        {new Date(inv.dueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isEditingStatus ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={statusUpdateValues[inv.id] ?? inv.status}
                                                    onChange={e => setStatusUpdateValues(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                                    className="form-select text-xs py-1 px-2 h-8 rounded-lg"
                                                >
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleUpdateStatus(inv.id)}
                                                    disabled={savingStatus === inv.id}
                                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Save"
                                                >
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => { setUpdatingStatusFor(null); setStatusUpdateValues(prev => { const n = { ...prev }; delete n[inv.id]; return n; }); }}
                                                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                    title="Cancel"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { if (onUpdateInvoiceStatus) { setUpdatingStatusFor(inv.id); setStatusUpdateValues(prev => ({ ...prev, [inv.id]: inv.status })); } }}
                                                className={`${onUpdateInvoiceStatus ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                                                title={onUpdateInvoiceStatus ? 'Click to update payment status' : ''}
                                            >
                                                <InvoiceStatusBadge status={inv.status} />
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-3">
                                            {inv.status !== 'paid' && (
                                                <button
                                                    onClick={() => startRecordingPayment(inv)}
                                                    className="text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title="Record Payment"
                                                >
                                                    <BanknotesIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setPreviewInvoice(inv)}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                title="Preview on Screen"
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            {inst && (
                                                <button
                                                    onClick={() => {
                                                        if (inv.status === 'quote') {
                                                            downloadQuotePdf(inv, inst, companyDetails, logoUrl, true);
                                                        } else {
                                                            downloadInvoicePdf(inv, inst, companyDetails, logoUrl, true);
                                                        }
                                                    }}
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
                                    No documents found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            {previewInvoice && (() => {
                const inst = institutionMap.get(previewInvoice.institutionId);
                const isQuote = previewInvoice.status === 'quote';
                return (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                            
                            {/* Modal Header */}
                            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Document Viewer — {isQuote ? 'Quotation' : 'Invoice'}
                                </h4>
                                <div className="flex items-center gap-3">
                                    {inst && (
                                        <button
                                            onClick={() => {
                                                if (previewInvoice.status === 'quote') {
                                                    downloadQuotePdf(previewInvoice, inst, companyDetails, logoUrl, true);
                                                } else {
                                                    downloadInvoicePdf(previewInvoice, inst, companyDetails, logoUrl, true);
                                                }
                                            }}
                                            className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1.5"
                                            title="Download PDF"
                                        >
                                            <DocumentArrowDownIcon className="w-4 h-4" /> Download PDF
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setPreviewInvoice(null)} 
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                    >
                                        <XIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body / Document Sheet */}
                            <div className="flex-grow p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900/20">
                                <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-3xl p-8 md:p-12 shadow-sm space-y-8 font-sans max-w-3xl mx-auto">
                                    
                                    {/* Document Header */}
                                    <div className="flex justify-between items-start flex-wrap gap-6 border-b border-slate-100 dark:border-slate-700 pb-8">
                                        <div className="space-y-3">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                                            ) : (
                                                <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-lg">
                                                    EA
                                                </div>
                                            )}
                                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{companyDetails?.name || 'EduAlloc AI Ltd'}</p>
                                                <p>{companyDetails?.address || 'Nairobi, Kenya'}</p>
                                                <p>Email: {companyDetails?.email || 'billing@edualloc.co.ke'}</p>
                                                <p>Phone: {companyDetails?.phone || '+254 700 000 000'}</p>
                                                {companyDetails?.website && <p>Web: {companyDetails.website}</p>}
                                            </div>
                                        </div>
                                        
                                        <div className="text-right space-y-2">
                                            <h2 className={`text-2xl font-black uppercase tracking-tight ${isQuote ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                {isQuote ? 'Pro-Forma Quotation' : 'Invoice'}
                                            </h2>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                                <p><span className="font-bold text-slate-700 dark:text-slate-300">Doc Number:</span> {previewInvoice.invoiceNumber}</p>
                                                <p><span className="font-bold text-slate-700 dark:text-slate-300">Issue Date:</span> {new Date(previewInvoice.issueDate).toLocaleDateString()}</p>
                                                <p><span className="font-bold text-slate-700 dark:text-slate-300">{isQuote ? 'Valid Until:' : 'Due Date:'}</span> {new Date(previewInvoice.dueDate).toLocaleDateString()}</p>
                                                <div className="pt-1.5">
                                                    <InvoiceStatusBadge status={previewInvoice.status} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bill To */}
                                    <div className="space-y-2">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Bill To (Client)</h5>
                                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="font-black text-sm text-slate-800 dark:text-white">{inst?.name || 'Unknown Institution'}</p>
                                            <p><span className="font-semibold text-slate-400">Code:</span> {inst?.institutionCode || 'N/A'}</p>
                                            {inst?.email && <p><span className="font-semibold text-slate-400">Email:</span> {inst.email}</p>}
                                            {inst?.phoneNumber && <p><span className="font-semibold text-slate-400">Phone:</span> {inst.phoneNumber}</p>}
                                        </div>
                                    </div>

                                    {/* Line Items Table */}
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                                <tr>
                                                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                    <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Qty</th>
                                                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Unit Price</th>
                                                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Total (KES)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {(() => {
                                                    const itemsList = Array.isArray(previewInvoice.items)
                                                        ? previewInvoice.items
                                                        : (typeof previewInvoice.items === 'string'
                                                            ? JSON.parse(previewInvoice.items)
                                                            : []);
                                                    return itemsList.map((item: any, idx: number) => (
                                                        <tr key={idx} className="text-xs text-slate-700 dark:text-slate-300">
                                                            <td className="px-5 py-3 font-semibold text-slate-800 dark:text-white">{item.description}</td>
                                                            <td className="px-5 py-3 text-center font-mono">{item.quantity}</td>
                                                            <td className="px-5 py-3 text-right font-mono">{item.unitPrice?.toLocaleString()}</td>
                                                            <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{(item.quantity * item.unitPrice)?.toLocaleString()}</td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Total Block */}
                                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="w-80 space-y-2 text-right">
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span>Subtotal</span>
                                                <span className="font-mono">KES {previewInvoice.totalAmount?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span>Tax / VAT (0%)</span>
                                                <span className="font-mono">KES 0</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <span>Total Amount</span>
                                                <span className="font-mono text-indigo-600 dark:text-indigo-400">KES {previewInvoice.totalAmount?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Notes */}
                                    <div className="border-t border-slate-100 dark:border-slate-700 pt-8 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                                        <h6 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[9px]">Payment Instructions:</h6>
                                        <p>Please pay via MPESA Paybill 400222 (Co-operative Bank), Account Name: "EduAlloc AI Limited". Or transfer directly to KCB Bank, Account Number: 1234567890, Branch: Nairobi Plaza.</p>
                                        <p className="italic">For billing disputes or support, contact billing@edualloc.co.ke.</p>
                                    </div>
                                    
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex justify-end">
                                <button 
                                    onClick={() => setPreviewInvoice(null)} 
                                    className="btn-secondary px-6"
                                >
                                    Close Preview
                                </button>
                            </div>

                        </div>
                    </div>
                );
            })()}

            {/* Record Payment Modal */}
            {recordingPaymentFor && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Record Payment
                            </h4>
                            <button 
                                onClick={() => setRecordingPaymentFor(null)} 
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Invoice Number</label>
                                <input 
                                    type="text" 
                                    value={recordingPaymentFor.invoiceNumber} 
                                    className="form-input w-full bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-bold" 
                                    disabled 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Amount Paid (KES)</label>
                                <input 
                                    type="number" 
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(Number(e.target.value))}
                                    className="form-input w-full font-black text-indigo-600 dark:text-indigo-400" 
                                    required 
                                    min="1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className="form-select w-full"
                                        required
                                    >
                                        <option value="MPESA">MPESA</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Payment Date</label>
                                    <input 
                                        type="date" 
                                        value={paymentDate} 
                                        onChange={e => setPaymentDate(e.target.value)}
                                        className="form-input w-full" 
                                        required 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Transaction Reference / Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. RGX1234567" 
                                    value={paymentRef} 
                                    onChange={e => setPaymentRef(e.target.value)}
                                    className="form-input w-full font-mono uppercase" 
                                    required 
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setRecordingPaymentFor(null)} className="btn-secondary">Cancel</button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingPayment}
                                    className="btn-primary px-8 py-2 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmittingPayment ? 'Saving...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
