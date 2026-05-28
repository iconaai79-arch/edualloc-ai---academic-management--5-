import React, { useState } from 'react';
import { CarInvoice, CarListing, User } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { UserIcon } from '../icons/UserIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { 
    Sparkles, 
    FileText, 
    Calendar, 
    Building2, 
    CheckCircle, 
    CreditCard, 
    ArrowRight, 
    Signature, 
    AlertCircle 
} from 'lucide-react';

interface CreateCarInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<CarInvoice>) => Promise<void>;
    listings: CarListing[];
    currentUser: User;
    invoice?: CarInvoice | null;
    users?: User[];
}

export const CreateCarInvoiceModal: React.FC<CreateCarInvoiceModalProps> = ({ isOpen, onClose, onSave, listings, currentUser, invoice, users }) => {
    const [formData, setFormData] = useState<Partial<CarInvoice>>({
        listingId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        totalAmount: 0,
        registrationNumber: '',
        soldBy: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        isInstallment: false,
        installmentFrequency: 'monthly',
        totalInstallments: 1,
        startDate: new Date().toISOString().split('T')[0]
    });

    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const staffMembers = React.useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            u.institutionId === currentUser.institutionId &&
            u.role !== 'student' && 
            u.role !== 'customer' &&
            u.role !== 'super_admin'
        );
    }, [users, currentUser.institutionId]);

    React.useEffect(() => {
        if (invoice) {
            setFormData({
                id: invoice.id,
                listingId: invoice.listingId,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                clientEmail: invoice.clientEmail || '',
                clientPhone: invoice.clientPhone || '',
                totalAmount: invoice.totalAmount,
                paidAmount: invoice.paidAmount,
                balanceAmount: invoice.balanceAmount,
                status: invoice.status,
                registrationNumber: invoice.registrationNumber || '',
                soldBy: invoice.soldBy || '',
                dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
                notes: invoice.notes || '',
                isInstallment: invoice.isInstallment || false,
                installmentFrequency: invoice.installmentFrequency || 'monthly',
                totalInstallments: invoice.totalInstallments || 1,
                startDate: invoice.startDate ? invoice.startDate.split('T')[0] : ''
            });
        } else {
            setFormData({
                listingId: '',
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                totalAmount: 0,
                registrationNumber: '',
                soldBy: '',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: '',
                isInstallment: false,
                installmentFrequency: 'monthly',
                totalInstallments: 1,
                startDate: new Date().toISOString().split('T')[0]
            });
        }
        setSearchTerm('');
    }, [invoice, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Failed to save invoice:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedListing = listings.find(l => l.id === formData.listingId);

    const filteredListings = listings.filter(l => {
        const isNotSold = l.status !== 'sold' || l.id === formData.listingId;
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
            l.make.toLowerCase().includes(query) ||
            l.model.toLowerCase().includes(query) ||
            String(l.year).includes(query) ||
            (l as any).registrationNumber?.toLowerCase().includes(query) ||
            (l as any).registration_number?.toLowerCase().includes(query);
        return isNotSold && matchesSearch;
    });

    const getInstallments = () => {
        const list = [];
        const count = formData.totalInstallments || 1;
        const freq = formData.installmentFrequency || 'monthly';
        const start = formData.startDate ? new Date(formData.startDate) : new Date();
        const amt = formData.totalAmount ? formData.totalAmount / count : 0;
        
        for (let i = 0; i < count; i++) {
            const dueDate = new Date(start);
            if (freq === 'monthly') {
                dueDate.setMonth(start.getMonth() + i);
            } else if (freq === 'bi-weekly') {
                dueDate.setDate(start.getDate() + i * 14);
            } else if (freq === 'weekly') {
                dueDate.setDate(start.getDate() + i * 7);
            }
            list.push({
                num: i + 1,
                date: dueDate.toLocaleDateString(),
                amount: amt
            });
        }
        return list;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-700">
                
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                            {invoice ? 'Edit' : 'Generate'} <span className="text-indigo-600">Sales Invoice</span>
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Automated Automotive Billing Engine</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* Left: Input Editor Panel */}
                    <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar border-r border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                        
                        {/* Vehicle Selection */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Vehicle from Inventory</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <input 
                                        type="text"
                                        placeholder="🔍 Search vehicle make, model or plate..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    />
                                    <select 
                                        required
                                        value={formData.listingId}
                                        onChange={(e) => {
                                            const lId = e.target.value;
                                            const l = listings.find(item => item.id === lId);
                                            const price = l?.price || 0;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                listingId: lId, 
                                                totalAmount: price,
                                                registrationNumber: (l as any)?.registrationNumber || (l as any)?.registration_number || prev.registrationNumber,
                                                installmentAmount: prev.isInstallment && prev.totalInstallments ? price / prev.totalInstallments : prev.installmentAmount
                                            }));
                                        }}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    >
                                        <option value="">Choose a vehicle...</option>
                                        {filteredListings.map(l => (
                                            <option key={l.id} value={l.id}>{l.year} {l.make} {l.model} - KES {l.price.toLocaleString()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-[54px] flex items-center px-6 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/50">
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {selectedListing ? `${selectedListing.year} ${selectedListing.make} ${selectedListing.model}` : "No vehicle selected"}
                                        </span>
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="Car Reg Number (e.g. KDC 123X)"
                                        value={formData.registrationNumber}
                                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Client & Salesperson Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Client Full Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        required
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-550 transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                                <input 
                                    required
                                    type="tel"
                                    placeholder="+254..."
                                    value={formData.clientPhone}
                                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                                <input 
                                    type="email"
                                    placeholder="client@example.com"
                                    value={formData.clientEmail}
                                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sold By / Salesperson Staff Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 z-10" />
                                    {staffMembers.length > 0 ? (
                                        <select
                                            value={formData.soldBy || ''}
                                            onChange={(e) => setFormData({ ...formData, soldBy: e.target.value })}
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white cursor-pointer"
                                        >
                                            <option value="">Select a salesperson...</option>
                                            {staffMembers.map(member => (
                                                <option key={member.id} value={member.name}>
                                                    {member.name} ({member.role.replace(/_/g, ' ')})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input 
                                            type="text"
                                            placeholder="Staff name (e.g. Jane Smith)"
                                            value={formData.soldBy || ''}
                                            onChange={(e) => setFormData({ ...formData, soldBy: e.target.value })}
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-800/50">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-2">Agreed Sale Price (KES)</label>
                                <div className="relative">
                                    <CurrencyIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                    <input 
                                        required
                                        type="number"
                                        value={formData.totalAmount}
                                        onChange={(e) => {
                                            const total = parseFloat(e.target.value) || 0;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                totalAmount: total,
                                                installmentAmount: prev.isInstallment && prev.totalInstallments ? total / prev.totalInstallments : prev.installmentAmount
                                            }));
                                        }}
                                        className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none text-sm font-black focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-2">Due Date / Completion</label>
                                <div className="relative">
                                    <CalendarDaysIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                    <input 
                                        required
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Installment Plan Toggle */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Enable Installment Plan</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Split the total amount into periodic payments</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isInstallment: !prev.isInstallment }))}
                                    className={`w-14 h-8 rounded-full transition-all relative ${formData.isInstallment ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isInstallment ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {formData.isInstallment && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Frequency</label>
                                        <select
                                            value={formData.installmentFrequency || 'monthly'}
                                            onChange={(e) => setFormData({ ...formData, installmentFrequency: e.target.value as any })}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="bi-weekly">Bi-Weekly</option>
                                            <option value="weekly">Weekly</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Installments</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.totalInstallments || 1}
                                            onChange={(e) => {
                                                const total = parseInt(e.target.value) || 1;
                                                setFormData({ 
                                                    ...formData, 
                                                    totalInstallments: total,
                                                    installmentAmount: formData.totalAmount ? formData.totalAmount / total : 0
                                                });
                                            }}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.startDate || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border-none text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {formData.totalInstallments && formData.totalInstallments > 0 && (
                                        <div className="col-span-full pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                Installment Amount: KES {((formData.totalAmount || 0) / formData.totalInstallments).toLocaleString()} / {formData.installmentFrequency || 'monthly'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Terms & Notes</label>
                            <textarea 
                                rows={3}
                                placeholder="e.g. Deposit of 50%, balance in 3 installments..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            ></textarea>
                        </div>
                    </div>

                    {/* Right: Live Interactive Preview Panel */}
                    <div className="hidden lg:flex flex-1 bg-slate-50 dark:bg-slate-900/40 p-8 overflow-y-auto custom-scrollbar flex-col justify-between">
                        
                        {/* Interactive Digital Invoice Sheet */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl flex-grow flex flex-col justify-between relative overflow-hidden">
                            
                            {/* Watermarked Status Ribbon */}
                            <div className="absolute top-6 right-6 z-10 flex gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    formData.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
                                    formData.status === 'partially_paid' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' :
                                    invoice ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                }`}>
                                    {formData.status ? formData.status.replace('_', ' ') : 'DRAFT'}
                                </span>
                            </div>

                            {/* Inner Sheet Area */}
                            <div className="space-y-6">
                                {/* Header Branding */}
                                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-900 pb-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                                            <Building2 className="w-6 h-6" />
                                            <span className="text-sm font-black uppercase tracking-tighter">Supreme Showroom</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            Dealership ID: #{currentUser.institutionId || 'INST-DEFAULT'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                            {formData.isInstallment ? 'Payment Agreement' : 'Sales Invoice'}
                                        </h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            Ref: {formData.invoiceNumber || 'INV-DRAFT-PREVIEW'}
                                        </p>
                                    </div>
                                </div>

                                {/* Metas and Addresses */}
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To (Client):</h4>
                                        <p className="font-black text-slate-800 dark:text-slate-200 uppercase">{formData.clientName || 'Valued Customer'}</p>
                                        <p className="text-slate-500 font-bold mt-1">{formData.clientPhone || 'No Phone provided'}</p>
                                        <p className="text-slate-500 font-bold">{formData.clientEmail || 'No Email provided'}</p>
                                    </div>
                                    <div className="text-right">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Details:</h4>
                                        <p className="text-slate-550 font-bold">Date Issued: {new Date().toLocaleDateString()}</p>
                                        <p className="text-slate-550 font-bold mt-1">Due Date: {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : 'N/A'}</p>
                                        <p className="text-slate-550 font-bold mt-1">Sales Agent: {formData.soldBy || currentUser.name || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Table Grid */}
                                <div className="border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden mt-6">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850">
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description / Vehicle</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reg Number</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                                            <tr>
                                                <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {selectedListing ? (
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                            <span>{selectedListing.year} {selectedListing.make} {selectedListing.model}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No vehicle selected</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold text-slate-500 uppercase">
                                                    {formData.registrationNumber || 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 text-xs font-black text-slate-900 dark:text-white text-right">
                                                    KES {(formData.totalAmount || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Installment Schedule Visualization */}
                                {formData.isInstallment && (
                                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-900">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                            <CreditCard className="w-3.5 h-3.5" /> Payment Timeline Preview
                                        </h4>
                                        <div className="relative border-l border-slate-100 dark:border-slate-850 pl-4 space-y-4 max-h-[160px] overflow-y-auto custom-scrollbar">
                                            {getInstallments().map((inst) => (
                                                <div key={inst.num} className="relative flex items-center justify-between text-[11px]">
                                                    {/* Timeline marker */}
                                                    <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white dark:border-slate-955" />
                                                    <span className="font-bold text-slate-500 dark:text-slate-400">
                                                        Installment #{inst.num} ({inst.date})
                                                    </span>
                                                    <span className="font-black text-slate-850 dark:text-slate-200">
                                                        KES {inst.amount.toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Subtotals & Agreements signature area */}
                            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-900 mt-6">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Net Amount:</span>
                                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                                        KES {(formData.totalAmount || 0).toLocaleString()}
                                    </span>
                                </div>

                                {formData.notes && (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Notes & Terms:</p>
                                        <p className="text-[10px] font-medium text-slate-650 dark:text-slate-350 leading-relaxed italic">
                                            "{formData.notes}"
                                        </p>
                                    </div>
                                )}

                                {/* Signatures */}
                                <div className="grid grid-cols-2 gap-8 pt-4">
                                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Authorized Agent Signature</p>
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-350 mt-1 italic font-serif">
                                            {formData.soldBy || currentUser.name || 'Dealership Executive'}
                                        </p>
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Customer Acceptance</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 italic">
                                            {formData.clientName ? 'Awaiting Signature' : '_____________________'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-700 flex gap-4 flex-shrink-0">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => handleSubmit()}
                        disabled={isSaving || !formData.listingId || !formData.clientName}
                        className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : invoice ? 'Save Changes' : 'Confirm & Issue Invoice'}
                    </button>
                </div>

            </div>
        </div>
    );
};
