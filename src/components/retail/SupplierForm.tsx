
import React, { useState } from 'react';
import { XIcon as XIcon } from '../icons/XIcon';
import { Supplier } from '../../types';

interface SupplierFormProps {
    editingSupplier?: Supplier | null;
    onSave: (data: Omit<Supplier, 'id' | 'institutionId'>) => Promise<void>;
    onClose: () => void;
}

export function SupplierForm({ editingSupplier, onSave, onClose }: SupplierFormProps) {
    const [formData, setFormData] = useState({
        name: editingSupplier?.name || '',
        contactPerson: editingSupplier?.contactPerson || '',
        email: editingSupplier?.email || '',
        phone: editingSupplier?.phone || '',
        category: editingSupplier?.category || 'General'
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save supplier:', error);
            alert('Failed to save supplier. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">
                            {editingSupplier ? 'Edit Vendor' : 'New Vendor'}
                        </h3>
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Supplier Registration</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Company Name</label>
                            <input 
                                type="text" 
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="VENDOR NAME..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contact Person</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                    className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="PERSON..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                <select 
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                >
                                    <option>General</option>
                                    <option>Technology</option>
                                    <option>Office Supplies</option>
                                    <option>Furniture</option>
                                    <option>Logistics</option>
                                    <option>Wholesale</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email</label>
                                <input 
                                    type="email" 
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="EMAIL..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone</label>
                                <input 
                                    type="tel" 
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="PHONE..."
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all font-sans disabled:opacity-50"
                    >
                        {isSaving ? 'Processing...' : (editingSupplier ? 'Update Vendor' : 'Create Vendor')}
                    </button>
                </form>
            </div>
        </div>
    );
}
