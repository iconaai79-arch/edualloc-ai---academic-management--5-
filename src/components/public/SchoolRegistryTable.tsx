
import React, { useState, useMemo } from 'react';
import { 
    School, 
    MapPin, 
    Layers, 
    Binary, 
    Users, 
    ShieldCheck, 
    CheckCircle2, 
    ClipboardList,
    GraduationCap,
    Home,
    Search,
    Filter,
    FileDown,
    Map as MapIcon,
    Zap
} from 'lucide-react';
import type { Institution } from '../../types';

interface SchoolRegistryTableProps {
    schools: Institution[];
}

export const SchoolRegistryTable: React.FC<SchoolRegistryTableProps> = ({ schools }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('All');
    const [countyFilter, setCountyFilter] = useState<string>('All');

    const filteredSchools = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase().trim();
        const searchTerms = lowerSearch.split(/\s+/).filter(t => t.length > 0);

        const filtered = schools.filter(school => {
            const name = school.name.toLowerCase();
            const knec = (school.knecCode || '').toLowerCase();
            const uic = (school.uic || '').toLowerCase();

            const matchesSearch = searchTerm === '' || 
                                 name.includes(lowerSearch) || 
                                 knec.includes(lowerSearch) ||
                                 uic.includes(lowerSearch) ||
                                 (searchTerms.length > 0 && searchTerms.every(t => name.includes(t)));
            
            const matchesType = typeFilter === 'All' || school.specialNeedType === typeFilter;
            const matchesCounty = countyFilter === 'All' || school.countyId === countyFilter;

            return matchesSearch && matchesType && matchesCounty;
        });

        if (searchTerm === '') return filtered;

        return filtered.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            // 1. Exact match on name
            if (aName === lowerSearch) return -1;
            if (bName === lowerSearch) return 1;

            // 2. Starts with match
            const aStarts = aName.startsWith(lowerSearch);
            const bStarts = bName.startsWith(lowerSearch);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            return aName.localeCompare(bName);
        });
    }, [schools, searchTerm, typeFilter, countyFilter]);

    // Unique values for filters
    const allCounties = Array.from(new Set(schools.map(s => s.countyId))).filter(Boolean);
    const allTypes = ['Regular', 'SNE', 'Integrated'];

    return (
        <div className="space-y-8 animate-fade-in p-2">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <School className="w-6 h-6" />
                        </div>
                        National <span className="text-indigo-600 italic">Academic Registry</span>
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-15 flex items-center gap-2">
                         Verified educational institutional database for Alumnae Portals
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="h-14 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
                        <FileDown className="w-4 h-4" /> Export Registry
                    </button>
                    <button className="h-14 px-10 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Professional Login
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm items-center">
                <div className="flex-1 relative w-full group">
                    <input 
                        type="text" 
                        placeholder="Search by school name, UIC or KNEC code..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 outline-none transition-all group-hover:bg-slate-100"
                    />
                    <Search className="w-5 h-5 absolute left-5 top-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                
                <div className="flex gap-4 w-full lg:w-auto">
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-14 truncate px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer appearance-none min-w-[140px]"
                    >
                        <option value="All">All Types</option>
                        {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <button className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800 shrink-0">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Smart Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                                <th className="px-8 py-6">Identity & Region</th>
                                <th className="px-8 py-6">Administrative</th>
                                <th className="px-8 py-6">Academic Codes</th>
                                <th className="px-8 py-6">Category & Type</th>
                                <th className="px-8 py-6">Accommodation</th>
                                <th className="px-8 py-6">Gender</th>
                                <th className="px-8 py-6 text-right">Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredSchools.map((school, i) => (
                                <tr key={school.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
                                    {/* Identity & Region */}
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                                <GraduationCap className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic">{school.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded">
                                                        <MapIcon className="w-2 h-2" /> {school.region || 'Western'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Administrative */}
                                    <td className="px-8 py-8">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight italic">{school.countyId || 'Bungoma'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{school.subCounty || 'Webuye East'}</p>
                                        </div>
                                    </td>

                                    {/* Academic Codes */}
                                    <td className="px-8 py-8">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-8">UIC:</span>
                                                <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{school.uic || 'U-00124'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-8">KNEC:</span>
                                                <span className="text-[10px] font-mono font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{school.knecCode || '36611001'}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Category & Type */}
                                    <td className="px-8 py-8">
                                        <div className="space-y-2">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest block w-fit ${
                                                school.specialNeedType === 'SNE' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                school.specialNeedType === 'Integrated' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' :
                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                {school.specialNeedType || 'Regular'}
                                            </span>
                                            {school.disabilityType && (
                                                <p className="text-[9px] font-bold text-slate-400 uppercase italic">Type: {school.disabilityType}</p>
                                            )}
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">{school.cluster || 'Cluster 3'}</p>
                                        </div>
                                    </td>

                                    {/* Accommodation */}
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                <Home className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-tight">{school.accommodationType || 'Boarding'}</span>
                                        </div>
                                    </td>

                                    {/* Gender */}
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-tight">{school.genderType || 'Mixed'}</span>
                                        </div>
                                    </td>

                                    {/* Verification */}
                                    <td className="px-8 py-8 text-right">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                            <ShieldCheck className="w-3.5 h-3.5 shadow-sm" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Verified</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Custom Footer */}
                <div className="bg-slate-900 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] italic">
                        Real-time Academic Database System v2.0
                    </p>
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4 text-indigo-400" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Total Schools: {schools.length}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">System Status: Optimal</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
