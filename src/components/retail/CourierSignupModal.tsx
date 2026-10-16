import React, { useState } from 'react';
import { apiService } from '../../services/apiService';
import { TruckIcon as Truck, UserIcon as UserCircle, EnvelopeIcon as Envelope, PhoneIcon as Phone, PlusIcon as Plus } from '../icons';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    institutionId: string;
    onSuccess: () => void;
}

export function CourierSignupModal({ isOpen, onClose, institutionId, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;

        setLoading(true);
        try {
            await apiService.saveModuleRecord('retail_couriers', {
                ...formData,
                companyName: formData.name,
                company_name: formData.name,
                institutionId,
                id: `courier_reg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                status: 'Pending'
            });
            setSubmitted(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 3000);
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 border border-white/20 dark:border-slate-800 transition-all overflow-hidden relative">
                {/* Decoration */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>

                <div className="absolute top-0 right-0 p-10">
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full">
                        <Plus className="w-8 h-8 rotate-45" />
                    </button>
                </div>

                {!submitted ? (
                    <>
                        <div className="mb-8">
                            <div className="inline-flex p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 mb-6 group hover:scale-110 transition-transform">
                                <Truck className="w-10 h-10 group-hover:rotate-12 transition-transform" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white italic tracking-tighter mb-2">Partner with Us</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-bold">Apply to become a logistics partner and start fulfilling orders today.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic flex items-center gap-2">
                                    <UserCircle className="w-3 h-3" /> Company / Courier Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-4 ring-indigo-500/10 transition-all font-black text-lg placeholder:text-slate-300 placeholder:italic"
                                    placeholder="Enter your business name..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-4 ring-indigo-500/10 transition-all font-black italic"
                                        placeholder="+254 7XX XXX XXX"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic flex items-center gap-2">
                                        <Envelope className="w-3 h-3" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-4 ring-indigo-500/10 transition-all font-black"
                                        placeholder="partner@yourcompany.com"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>Submit Partnership Application <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="py-20 text-center animate-bounce-in">
                        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                            <CheckCircleIcon className="w-12 h-12" />
                        </div>
                        <h3 className="text-3xl font-black italic mb-4">Application Received!</h3>
                        <p className="text-slate-500 font-bold px-10">Your request has been sent to our logistics department. We'll reach out to you via phone or email shortly.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ArrowRight({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

