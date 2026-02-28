import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type { User, CarWashJob, CarWashCustomer, Receipt, Invoice, Institution } from '../types';
import {
    ClockIcon, CheckCircleIcon, DocumentArrowDownIcon,
    ArrowPathIcon, UserIcon, SparklesIcon, CalendarDaysIcon,
    MapPinIcon, CurrencyIcon
} from './icons/index';

interface CarWashCustomerPortalProps {
    currentUser: User;
}

export const CarWashCustomerPortal: React.FC<CarWashCustomerPortalProps> = ({ currentUser }) => {
    const [jobs, setJobs] = useState<CarWashJob[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        setRefreshing(true);
        try {
            // Fetch all jobs, then filter by email/phone
            const [allJobs, allInsts, allReceipts] = await Promise.all([
                apiService.fetchModuleRecords<CarWashJob>('carwash_jobs'),
                apiService.fetchModuleRecords<Institution>('institutions'),
                apiService.fetchModuleRecords<Receipt>('receipts'),
            ]);

            // For cross-institution tracking, find all customer profiles linked to this user
            const allCustomers = await apiService.fetchModuleRecords<CarWashCustomer>('carwash_customers');
            const myCustomerProfiles = allCustomers.filter(c =>
                c.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
                c.phoneNumber === currentUser.phoneNumber
            );
            const myCustomerIds = myCustomerProfiles.map(c => c.id);

            const filteredJobs = allJobs.filter(j => myCustomerIds.includes(j.customerId || ''))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setJobs(filteredJobs);
            setInstitutions(allInsts);
            setReceipts(allReceipts.filter(r => filteredJobs.some(j => j.id === r.relatedTransactionId)));
        } catch (e) {
            console.error("Portal Data Load Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [currentUser]);

    const activeJobs = jobs.filter(j => ['queued', 'in_progress', 'ready'].includes(j.status));
    const historyJobs = jobs.filter(j => j.status === 'completed' || j.status === 'cancelled');

    const getStatusStep = (status: string) => {
        if (status === 'queued') return 1;
        if (status === 'in_progress') return 2;
        if (status === 'ready') return 3;
        return 4;
    };

    const getInstitutionName = (id: string) => institutions.find(i => i.id === id)?.name || 'Unknown Car Wash';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">My Car Wash Hub</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Welcome back, {currentUser.name}</p>
                </div>
                <button
                    onClick={loadData}
                    className={`p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${refreshing ? 'animate-spin' : ''}`}
                >
                    <ArrowPathIcon className="w-5 h-5 text-indigo-600" />
                </button>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Tracking Section */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-amber-500" /> Active Service Tracking
                    </h2>

                    {loading ? (
                        <div className="h-64 bg-white dark:bg-slate-800 rounded-3xl animate-pulse flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : activeJobs.length > 0 ? (
                        activeJobs.map(job => (
                            <div key={job.id} className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-indigo-100/50 dark:border-slate-700 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${job.status === 'ready' ? 'bg-emerald-100 text-emerald-700 animate-bounce' : 'bg-indigo-100 text-indigo-700 animate-pulse'
                                        }`}>
                                        {job.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                                        🚗
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{job.vehiclePlate}</h3>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{job.packageName} · {getInstitutionName(job.institutionId)}</p>
                                    </div>
                                </div>

                                {/* Tracking Stepper */}
                                <div className="relative pt-4 pb-8">
                                    <div className="absolute left-0 top-[22px] w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                                        <div
                                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${(getStatusStep(job.status) - 1) * 33.33}%` }}
                                        />
                                    </div>
                                    <div className="relative flex justify-between">
                                        {[
                                            { id: 'queued', label: 'Queued', icon: <ClockIcon className="w-4 h-4" /> },
                                            { id: 'in_progress', label: 'Washing', icon: <SparklesIcon className="w-4 h-4" /> },
                                            { id: 'ready', label: 'Ready', icon: <CheckCircleIcon className="w-4 h-4" /> },
                                            { id: 'completed', label: 'Finished', icon: <CheckCircleIcon className="w-4 h-4" /> }
                                        ].map((step, idx) => (
                                            <div key={step.id} className="flex flex-col items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all z-10 ${getStatusStep(job.status) >= idx + 1
                                                        ? 'bg-indigo-600 border-white dark:border-slate-800 text-white'
                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300'
                                                    }`}>
                                                    {step.icon}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase mt-2 tracking-widest ${getStatusStep(job.status) >= idx + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {job.status === 'ready' && (
                                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black">!</div>
                                        <div>
                                            <p className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Your car is ready!</p>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">Please proceed to the waiting bay for checkout. Amount due: KES {job.amountCharged.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl opacity-50">🚿</div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">No Active Washes</h3>
                            <p className="text-sm font-bold text-slate-400 mt-2">Visit one of our branches to get started.</p>
                        </div>
                    )}

                    {/* Service History */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" /> Service History
                        </h2>
                        {historyJobs.map(job => (
                            <div key={job.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-xl">
                                        🏁
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{job.vehiclePlate}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{job.packageName} · {getInstitutionName(job.institutionId)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-indigo-600">KES {job.amountCharged.toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 justify-end">
                                        <CalendarDaysIcon className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar - Downloads & Info */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-sky-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
                        <h2 className="text-xs font-black uppercase opacity-70 tracking-widest mb-6">Customer Profile</h2>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/30">
                                {currentUser.profilePhotoUrl ? <img src={currentUser.profilePhotoUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black leading-tight">{currentUser.name}</h3>
                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{currentUser.phoneNumber}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                                <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Total Washes</p>
                                <p className="text-2xl font-black mt-1">{jobs.length}</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                                <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Active Tickets</p>
                                <p className="text-2xl font-black mt-1">{activeJobs.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                            <DocumentArrowDownIcon className="w-4 h-4 text-indigo-600" /> Recent Documents
                        </h2>
                        <div className="space-y-2">
                            {receipts.slice(0, 5).map(receipt => (
                                <button key={receipt.id} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-left border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50/50 text-emerald-600 rounded-lg">
                                            <CurrencyIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Receipt {receipt.receiptNumber}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{new Date(receipt.paymentDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <DocumentArrowDownIcon className="w-4 h-4 text-slate-300" />
                                </button>
                            ))}
                            {receipts.length === 0 && (
                                <p className="text-center text-xs text-slate-400 py-4 font-bold uppercase tracking-widest">No documents available</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-800">
                        <h3 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-widest mb-3 flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4" /> Nearby Washes
                        </h3>
                        <div className="space-y-4">
                            {institutions.slice(0, 3).map(inst => (
                                <div key={inst.id} className="flex flex-col">
                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">{inst.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inst.subCounty || 'Main Branch'} · Open Now</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
