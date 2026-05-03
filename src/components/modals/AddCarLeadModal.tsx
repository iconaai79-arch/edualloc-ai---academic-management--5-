
import React, { useState } from 'react';
import { X, UserPlus, Phone, Car, Tag, Save, Loader2 } from 'lucide-react';
import { CarLead, Institution } from '../../types';

interface AddCarLeadModalProps {
    institution: Institution;
    onClose: () => void;
    onSave: (data: Partial<CarLead>) => Promise<void>;
}

export const AddCarLeadModal: React.FC<AddCarLeadModalProps> = ({ 
    institution, 
    onClose, 
    onSave 
}) => {
    const [formData, setFormData] = useState<Partial<CarLead>>({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        enquiredModels: [],
        source: 'walk-in',
        status: 'warm',
        notes: ''
    });

    const [saving, setSaving] = useState(false);
    const [modelInput, setModelInput] = useState('');

    const addModel = () => {
        if (modelInput.trim() && !formData.enquiredModels?.includes(modelInput.trim())) {
            setFormData({
                ...formData,
                enquiredModels: [...(formData.enquiredModels || []), modelInput.trim()]
            });
            setModelInput('');
        }
    };

    const removeModel = (model: string) => {
        setFormData({
            ...formData,
            enquiredModels: formData.enquiredModels?.filter(m => m !== model)
        });
    };

    const handleSave = async () => {
        if (!formData.customerName || !formData.customerPhone) {
            alert("Please fill in Name and Phone Number");
            return;
        }

        setSaving(true);
        try {
            await onSave({
                ...formData,
                institutionId: institution.id,
                createdAt: new Date().toISOString()
            });
            onClose();
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                                Capture <span className="text-indigo-600">Walk-in Lead</span>
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">New Prospect Registration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Customer Name</label>
                            <input 
                                value={formData.customerName} 
                                onChange={e => setFormData({ ...formData, customerName: e.target.value })} 
                                placeholder="e.g. John Doe" 
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    value={formData.customerPhone} 
                                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} 
                                    placeholder="0712..." 
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address (Optional)</label>
                        <input 
                            value={formData.customerEmail} 
                            onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} 
                            placeholder="john@example.com" 
                            className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Interested Models</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Car className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    value={modelInput} 
                                    onChange={e => setModelInput(e.target.value)} 
                                    onKeyPress={e => e.key === 'Enter' && addModel()}
                                    placeholder="Add car model..." 
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                />
                            </div>
                            <button 
                                onClick={addModel}
                                className="h-14 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.enquiredModels?.map(model => (
                                <span key={model} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    {model}
                                    <button onClick={() => removeModel(model)} className="hover:text-red-500 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Lead Status</label>
                            <select 
                                value={formData.status} 
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })} 
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                            >
                                <option value="hot">Hot (Ready to buy)</option>
                                <option value="warm">Warm (Researching)</option>
                                <option value="cold">Cold (Casual enquiry)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Lead Source</label>
                            <select 
                                value={formData.source} 
                                onChange={e => setFormData({ ...formData, source: e.target.value as any })} 
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                            >
                                <option value="walk-in">Walk-in</option>
                                <option value="referral">Referral</option>
                                <option value="online">Online / Social Media</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Additional Notes</label>
                        <textarea 
                            value={formData.notes} 
                            onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                            placeholder="Preferences, budget, timeline..." 
                            className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none resize-none" 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-5 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 hover:text-slate-600 transition-all">Discard</button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Lead
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
