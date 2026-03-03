import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RetailWishlist } from '../../types';
import { Target, Search, Filter, Phone, MessageSquare, AlertCircle, CheckCircle2, Clock, MapPin, User as UserIcon } from 'lucide-react';

interface WishlistManagerProps {
    institutionId: string;
}

export function WishlistManager({ institutionId }: WishlistManagerProps) {
    const [leads, setLeads] = useState<RetailWishlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'casual' | 'matched'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLeads();
    }, [institutionId]);

    const fetchLeads = async () => {
        setIsLoading(true);
        // MOCK DATA for demonstration
        setTimeout(() => {
            setLeads([
                {
                    id: 'lead-1',
                    institutionId,
                    customerName: 'Michael Kiprono',
                    phoneNumber: '+254712345678',
                    productQuery: 'iPhone 15 Pro Max 256GB Natural Titanium',
                    maxBudget: 1500,
                    urgency: 'urgent',
                    capturedById: 'agent-1',
                    isMatched: true,
                    notifiedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                },
                {
                    id: 'lead-2',
                    institutionId,
                    customerName: 'Sarah Wanjiku',
                    phoneNumber: '+254723456789',
                    productQuery: 'Any HP LaserJet Printer under $200',
                    maxBudget: 200,
                    urgency: 'casual',
                    capturedById: 'agent-2',
                    isMatched: false,
                    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                },
                {
                    id: 'lead-3',
                    institutionId,
                    customerName: 'David Ochieng',
                    phoneNumber: '+254734567890',
                    productQuery: 'MacBook Air M2 16GB',
                    urgency: 'urgent',
                    capturedById: 'agent-1',
                    isMatched: false,
                    createdAt: new Date().toISOString(), // Today
                }
            ]);
            setIsLoading(false);
        }, 500);
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

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Lead Management & Wishlist</h2>
                    <p className="text-slate-500 text-sm mt-1">Track walk-in requests and automatically notify clients when stock arrives.</p>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-medium">
                    <Target className="w-4 h-4" />
                    Log New Inquiry
                </button>
            </div>

            {/* KPI & Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        All Leads ({leads.length})
                    </button>
                    <button
                        onClick={() => setFilter('urgent')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${filter === 'urgent' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" /> Urgent ({leads.filter(l => l.urgency === 'urgent' && !l.isMatched).length})
                    </button>
                    <button
                        onClick={() => setFilter('matched')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${filter === 'matched' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Stock Matched ({leads.filter(l => l.isMatched).length})
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, phone, or product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                </div>
            </div>

            {/* Leads List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLeads.map(lead => (
                        <div key={lead.id} className={`bg-white rounded-xl shadow-sm border ${lead.isMatched ? 'border-emerald-200 ring-1 ring-emerald-500/20' : lead.urgency === 'urgent' ? 'border-orange-200' : 'border-slate-200'} overflow-hidden hover:shadow-md transition-shadow`}>

                            {/* Status Ribbon */}
                            {lead.isMatched ? (
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Item Found & Notified
                                    </span>
                                </div>
                            ) : lead.urgency === 'urgent' ? (
                                <div className="bg-orange-50 text-orange-700 border-b border-orange-100 px-4 py-2 flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> Urgent Request
                                    </span>
                                </div>
                            ) : (
                                <div className="bg-slate-50 text-slate-500 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> Casual Inquiry
                                    </span>
                                </div>
                            )}

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-slate-400" />
                                            {lead.customerName}
                                        </h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                            <Phone className="w-3 h-3" /> {lead.phoneNumber}
                                        </p>
                                    </div>
                                    {lead.maxBudget && (
                                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded">
                                            Max: ${lead.maxBudget}
                                        </span>
                                    )}
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Looking for:</p>
                                    <p className="text-sm text-slate-800 font-medium leading-snug">{lead.productQuery}</p>
                                </div>

                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Logged by Agent ID: {lead.capturedById} • {new Date(lead.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex gap-3">
                                <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2">
                                    <Phone className="w-4 h-4" /> Call Client
                                </button>
                                <button className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> WhatsApp
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredLeads.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-slate-800">No leads found</h3>
                            <p className="text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
