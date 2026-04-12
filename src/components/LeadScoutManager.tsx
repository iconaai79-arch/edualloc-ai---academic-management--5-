import React, { useState, useEffect } from 'react';
import { 
    MagnifyingGlassIcon, SparklesIcon, GlobeAltIcon, 
    ArrowPathIcon, CheckCircleIcon, PaperAirplaneIcon,
    EnvelopeIcon, MapPinIcon, ChartBarIcon, TagIcon
} from './icons';
import { MarketingProspect } from '../types';
import { apiService } from '../services/apiService';

export const LeadScoutManager: React.FC = () => {
    const [prospects, setProspects] = useState<MarketingProspect[]>([]);
    const [loading, setLoading] = useState(false);
    const [scouting, setScouting] = useState(false);
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('Kenya');
    const [niche, setNiche] = useState('Education');
    const [stats, setStats] = useState({ total: 0, qualified: 0, new: 0 });

    useEffect(() => {
        fetchProspects();
    }, []);

    const fetchProspects = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<MarketingProspect>('marketing_prospects', 'ALL', undefined, { order: 'created_at.desc' });
            setProspects(data);
            
            // Calculate stats
            const s = data.reduce((acc, curr) => {
                acc.total++;
                if (curr.leadScore >= 70) acc.qualified++;
                if (curr.status === 'new') acc.new++;
                return acc;
            }, { total: 0, qualified: 0, new: 0 });
            setStats(s);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const runScout = async () => {
        if (!query) return;
        setScouting(true);
        try {
            const response = await fetch('/api/scout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiService.getToken()}`
                },
                body: JSON.stringify({ topic: query, location, niche })
            });
            const contentType = response.headers.get('content-type');
            let result: any;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                result = { success: false, message: `Server error: ${text.substring(0, 100)}` };
            }
            if (result.success) {
                await fetchProspects();
                setQuery('');
                alert(result.message || "Scout mission successful!");
            } else {
                alert(`Scouting Issue: ${result.message || result.error || 'Unknown failure'}`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Network Error: ${e.message || 'Failed to connect to scouting service'}`);
        } finally {
            setScouting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">AI Lead Scout</h2>
                        <p className="text-indigo-100 text-sm font-medium opacity-80 max-w-sm">
                            Intelligent autonomous prospect discovery. Finding your next high-value customers across the web.
                        </p>
                    </div>
                    <SparklesIcon className="absolute -right-4 -bottom-4 w-40 h-40 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Discovered</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.total}</p>
                    <div className="mt-2 flex items-center gap-2 text-green-500 font-bold text-[10px] bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full w-fit">
                        <ChartBarIcon className="w-3 h-3" />
                        <span>{stats.qualified} QUALIFIED LEADS</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">New Pipeline</p>
                    <p className="text-4xl font-black text-indigo-600 tracking-tighter">{stats.new}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Awaiting Outreach</p>
                </div>
            </div>

            {/* Scout Controller */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Search Theme / Niche</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g. Top private schools, Property agents in Nairobi, Large Saccos..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-indigo-500/20 text-sm font-bold transition-all outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-48 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Location</label>
                        <div className="relative">
                            <MapPinIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-indigo-500/20 text-sm font-bold transition-all outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={runScout}
                        disabled={scouting || !query}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-3 active:scale-95"
                    >
                        {scouting ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                <span>SCOUTING...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                <span>LAUNCH MISSION</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black tracking-tighter uppercase">Prospect Pipeline</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified potential institutional clients</p>
                    </div>
                    <button onClick={fetchProspects} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                        <ArrowPathIcon className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Niche & Location</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Info</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">AI Intelligence</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Score</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {prospects.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                                {p.businessName[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{p.businessName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-0.5">
                                                    <GlobeAltIcon className="w-3 h-3" />
                                                    {p.websiteUrl || 'No website found'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full font-black text-[9px] uppercase tracking-widest text-slate-600 dark:text-slate-300 w-fit">
                                                {p.niche}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-400">
                                                <EnvelopeIcon className="w-4 h-4" />
                                                {p.email}
                                            </div>
                                            {p.phone && (
                                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                                    <TagIcon className="w-3 h-3" />
                                                    {p.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium line-clamp-2 italic">
                                            "{p.aiSummary}"
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`text-xl font-black ${p.leadScore >= 80 ? 'text-green-500' : p.leadScore >= 60 ? 'text-orange-500' : 'text-slate-400'}`}>
                                            {p.leadScore}%
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2">
                                                <PaperAirplaneIcon className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase">PITCH</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {prospects.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <MagnifyingGlassIcon className="w-12 h-12 text-slate-200" />
                                            <div>
                                                <p className="text-lg font-bold text-slate-400">No prospects discovered yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Launch an AI mission to find leads.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
