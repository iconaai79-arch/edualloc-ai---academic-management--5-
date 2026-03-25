import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RetailWishlist } from '../../types';
import { apiService } from '../../services/apiService';
import { Target, Search, Filter, Phone, MessageSquare, AlertCircle, CircleCheck, Clock, MapPin, User as UserIcon, Banknote, X, Plus } from 'lucide-react';

interface WishlistManagerProps {
    institutionId: string;
}

export function WishlistManager({ institutionId }: WishlistManagerProps) {
    const [leads, setLeads] = useState<RetailWishlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'casual' | 'matched'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Open' | 'Closed'>('Open');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newInquiry, setNewInquiry] = useState({
        customerName: '',
        phoneNumber: '',
        productQuery: '',
        maxBudget: '',
        urgency: 'casual' as 'urgent' | 'casual'
    });

    useEffect(() => {
        fetchLeads();
    }, [institutionId]);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<RetailWishlist>('retail_wishlist', institutionId);
            // Default status to 'Open' for records without it
            const normalizedData = data.map(l => ({
                ...l,
                status: l.status || 'Open'
            }));
            // Sort by latest first
            const sortedData = normalizedData.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setLeads(sortedData);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseLead = async (leadId: string) => {
        if (!window.confirm('Are you sure you want to finalize this deal and close this lead?')) return;
        
        try {
            const lead = leads.find(l => l.id === leadId);
            if (!lead) {
                console.error('Lead not found in local state:', leadId);
                return;
            }

            console.log(`[Wishlist] Attempting to close lead ${leadId}`, lead);

            const res = await apiService.saveModuleRecord('retail_wishlist', { 
                ...lead, 
                status: 'Closed',
                notifiedAt: lead.notifiedAt || new Date().toISOString()
            });

            if (res) {
                console.log('[Wishlist] Lead closed successfully on server:', res);
                // Update local state
                setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: 'Closed' } : l));
                alert('Success: Lead finalized and moved to Closed status.');
            } else {
                console.error('[Wishlist] Save operation failed - no data returned for lead:', leadId);
                alert('Warning: The lead was updated but the server returned no confirmation. Please refresh to verify.');
            }
        } catch (error: any) {
            console.error('[Wishlist] Detailed error during lead closure:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            
            const errorMessage = error.message || 'Unknown error during lead closure';
            const errorHint = error.hint ? `\n\nHint: ${error.hint}` : '';
            
            alert(`Error: ${errorMessage}${errorHint}\n\nNote: Please ensure migration 089 has been applied to the database.`);
        }
    };

    const handleSaveInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const user = apiService.getSession();
            if (!user) throw new Error('Session required');

            const id = Math.random().toString(36).substr(2, 9);
            const lead: any = {
                id,
                institutionId,
                customerName: newInquiry.customerName,
                phoneNumber: newInquiry.phoneNumber,
                productQuery: newInquiry.productQuery,
                maxBudget: newInquiry.maxBudget ? parseFloat(newInquiry.maxBudget) : null,
                urgency: newInquiry.urgency,
                capturedById: user.id,
                isMatched: false,
                status: 'Open',
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_wishlist', lead);

            // Trigger Notification for Admins/Staff
            // Find admins for this institution
            const staff = await apiService.fetchUsers(institutionId);
            const admins = staff.filter(s => s.role === 'admin' || s.role === 'super_admin' || s.role === 'retail_agent');

            for (const admin of admins) {
                if (admin.id === user.id) continue; // Don't notify self
                await apiService.saveModuleRecord('app_notifications', {
                    userId: admin.id,
                    institutionId,
                    message: `New Lead Captured: ${lead.customerName} is looking for ${lead.productQuery}`,
                    type: 'new_lead',
                    isRead: false,
                    timestamp: new Date().toISOString()
                });
            }

            setLeads([lead, ...leads]);
            setIsModalOpen(false);
            setNewInquiry({
                customerName: '',
                phoneNumber: '',
                productQuery: '',
                maxBudget: '',
                urgency: 'casual'
            });
        } catch (error) {
            console.error('Failed to save inquiry:', error);
            alert('Failed to log inquiry. Please check your connection.');
        } finally {
            setIsSaving(false);
        }
    };


    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.productQuery.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phoneNumber.includes(searchQuery);

        const matchesFilter = filter === 'all'
            ? true
            : filter === 'matched'
                ? lead.isMatched
                : lead.urgency === filter && !lead.isMatched;

        const matchesStatus = lead.status === statusFilter;

        return matchesSearch && matchesFilter && matchesStatus;
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Lead <span className="text-fuchsia-600">Catalyst</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">Transforming walk-in queries into loyal customers.</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white rounded-2xl shadow-[0_10px_20px_-5px_rgba(217,70,239,0.4)] hover:shadow-[0_15px_25px_-5px_rgba(217,70,239,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all text-sm font-black uppercase tracking-wider"
                >
                    <Plus className="w-5 h-5" />
                    Log New Inquiry
                </button>
            </div>

            {/* Premium Filter Bar - Glassmorphism */}
            <div className="sticky top-20 z-20 md:top-24 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-center transition-all">
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all ${filter === 'all'
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 dark:shadow-none scale-105'
                            : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        All Leads ({leads.filter(l => l.status === statusFilter).length})
                    </button>
                    <button
                        onClick={() => setFilter('urgent')}
                        className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all flex items-center gap-2 ${filter === 'urgent'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-none scale-105'
                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-100'}`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" /> Urgent ({leads.filter(l => l.urgency === 'urgent' && !l.isMatched && l.status === statusFilter).length})
                    </button>
                    <button
                        onClick={() => setFilter('matched')}
                        className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all flex items-center gap-2 ${filter === 'matched'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none scale-105'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                        <CircleCheck className="w-3.5 h-3.5" /> Matched ({leads.filter(l => l.isMatched && l.status === statusFilter).length})
                    </button>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block"></div>
                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl">
                        <button
                            onClick={() => setStatusFilter('Open')}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'Open' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('Closed')}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'Closed' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Closed
                        </button>
                    </div>
                </div>

                <div className="relative w-full lg:w-96 group">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-fuchsia-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search name, phone, or product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none text-sm font-medium transition-all"
                    />
                </div>
            </div>

            {/* Leads List Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                    <div className="w-16 h-16 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Target className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading Catalog...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredLeads.map((lead, idx) => (
                        <div
                            key={lead.id}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            className={`group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all animate-in fade-in slide-in-from-bottom-4`}
                        >
                            {/* Card Background Decoration */}
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110 opacity-10 dark:opacity-20 ${lead.isMatched ? 'bg-emerald-500' : lead.urgency === 'urgent' ? 'bg-orange-500' : 'bg-slate-500'}`}></div>

                            {/* Status Badge */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${lead.isMatched
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : lead.urgency === 'urgent'
                                        ? 'bg-orange-50 text-orange-600 border-orange-100'
                                        : 'bg-slate-50 text-slate-500 border-slate-100'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${lead.isMatched ? 'bg-emerald-500' : lead.urgency === 'urgent' ? 'bg-orange-500' : 'bg-slate-400'} animate-pulse`}></div>
                                    {lead.isMatched ? 'Stock Found' : lead.urgency === 'urgent' ? 'Urgent Need' : 'Casual Inq'}
                                </div>
                                {lead.maxBudget && (
                                    <div className="flex flex-col items-end">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Max Budget</p>
                                        <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">KES {lead.maxBudget.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-fuchsia-600 transition-colors">
                                        {lead.customerName}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400">
                                            <Phone className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-500 italic">{lead.phoneNumber}</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-3xl border border-white dark:border-slate-800 relative group-hover:bg-white dark:group-hover:bg-slate-700 transition-all">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-3 block">Product Interest</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-relaxed font-serif italic">"{lead.productQuery}"</p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-black">
                                        {lead.capturedById?.slice(0, 2).toUpperCase()}
                                    </div>
                                </div>

                                {/* Modern Actions - Grid */}
                                <div className="grid grid-cols-1 gap-3 pt-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                    <div className="flex gap-3">
                                        <button className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-sm hover:shadow-xl active:scale-95 flex items-center justify-center gap-2">
                                            <Phone className="w-4 h-4" /> Call Client
                                        </button>
                                        <button className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-emerald-300 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> WhatsApp
                                        </button>
                                    </div>
                                    {statusFilter === 'Open' && (
                                        <button
                                            onClick={() => handleCloseLead(lead.id)}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CircleCheck className="w-4 h-4" /> Finalize Deal
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredLeads.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-700">
                            <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6">
                                <Target className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Lead Cloud Empty</h3>
                            <p className="text-slate-400 mt-2 font-medium italic text-sm">No matching leads in the current flow.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setFilter('all'); }}
                                className="mt-8 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Inquiry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-700 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                        <div className="p-8 pb-4 flex justify-between items-center bg-gradient-to-r from-fuchsia-100/50 to-purple-100/50 dark:from-fuchsia-900/20 dark:to-purple-900/20">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Capture <span className="text-fuchsia-600">Lead</span></h3>
                                <p className="text-xs text-slate-500 font-medium italic">Logging intent into the Catalyst engine.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 bg-white dark:bg-slate-700 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveInquiry} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newInquiry.customerName}
                                        onChange={(e) => setNewInquiry({ ...newInquiry, customerName: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none text-sm transition-all"
                                        placeholder="Enter name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={newInquiry.phoneNumber}
                                        onChange={(e) => setNewInquiry({ ...newInquiry, phoneNumber: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none text-sm transition-all"
                                        placeholder="+254..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">What are they looking for?</label>
                                <textarea
                                    required
                                    value={newInquiry.productQuery}
                                    onChange={(e) => setNewInquiry({ ...newInquiry, productQuery: e.target.value })}
                                    rows={3}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none text-sm transition-all resize-none font-serif italic"
                                    placeholder="e.g. iPhone 15 Pro Max 256GB Black"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Max Budget</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</div>
                                        <input
                                            type="number"
                                            value={newInquiry.maxBudget}
                                            onChange={(e) => setNewInquiry({ ...newInquiry, maxBudget: e.target.value })}
                                            className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none text-sm font-black transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Urgency</label>
                                    <select
                                        value={newInquiry.urgency}
                                        onChange={(e) => setNewInquiry({ ...newInquiry, urgency: e.target.value as any })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none text-sm font-black transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="casual">Casual Interest</option>
                                        <option value="urgent">Urgent Need</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                            >
                                {isSaving ? (
                                    <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Target className="w-4 h-4" />
                                )}
                                {isSaving ? 'Processing Intent...' : 'Seal Capture Sequence'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const ArrowRight = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;
