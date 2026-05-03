
import React, { useState } from 'react';
import { CarInvoice, CarListing, User } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { UserIcon } from '../icons/UserIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';

interface CreateCarInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<CarInvoice>) => Promise<void>;
    listings: CarListing[];
    currentUser: User;
}

export const CreateCarInvoiceModal: React.FC<CreateCarInvoiceModalProps> = ({ isOpen, onClose, onSave, listings, currentUser }) => {
    const [formData, setFormData] = useState<Partial<CarInvoice>>({
        listingId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        totalAmount: 0,
        registrationNumber: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
    });

    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-700">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Generate <span className="text-indigo-600">Sales Invoice</span></h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Automated Automotive Billing Engine</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Vehicle Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Vehicle from Inventory</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        registrationNumber: (l as any)?.registrationNumber || prev.registrationNumber,
                                        installmentAmount: prev.isInstallment && prev.totalInstallments ? price / prev.totalInstallments : prev.installmentAmount
                                    }));
                                }}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            >
                                <option value="">Choose a vehicle...</option>
                                {listings.filter(l => l.status === 'active').map(l => (
                                    <option key={l.id} value={l.id}>{l.year} {l.make} {l.model} - KES {l.price.toLocaleString()}</option>
                                ))}
                            </select>
                            <input 
                                type="text"
                                placeholder="Car Reg Number (e.g. KDC 123X)"
                                value={formData.registrationNumber}
                                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Client Details */}
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
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
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
                </form>

                <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-700 flex gap-4">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.listingId || !formData.clientName}
                        className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Generating...' : 'Confirm & Issue Invoice'}
                    </button>
                </div>
            </div>
        </div>
    );
};
