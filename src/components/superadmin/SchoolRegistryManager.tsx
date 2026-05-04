
import React, { useState, useMemo, useEffect } from 'react';
import { 
    School, 
    Upload, 
    Plus, 
    Search, 
    Filter, 
    Trash2, 
    CheckCircle2, 
    FileText, 
    MapPin, 
    Binary, 
    ChevronRight, 
    ChevronLeft,
    Download,
    X,
    Database,
    Zap,
    Edit2,
    Heart,
    ArrowUpDown
} from 'lucide-react';
import type { SchoolRegistry } from '../../types';
import { apiService } from '../../services/apiService';

import { slugify } from '../../utils/stringUtils';
import { generateId } from '../../utils/idGenerator';

import { ExcelSmartImporter } from '../common/ExcelSmartImporter';

interface SchoolRegistryManagerProps {
    registry: SchoolRegistry[];
    onRefresh: () => void;
    onAccessPortal?: (institutionId: string) => void;
    onAccessAlumnaPortal?: (school: SchoolRegistry) => void;
}

export const SchoolRegistryManager: React.FC<SchoolRegistryManagerProps> = ({ registry, onRefresh, onAccessPortal, onAccessAlumnaPortal }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingManually, setIsAddingManually] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);

    const registryFields = [
        { key: 'name', label: 'School / Institution Name', required: true },
        { key: 'region', label: 'Region / Province' },
        { key: 'county', label: 'County / State' },
        { key: 'subCounty', label: 'Sub-County / District' },
        { key: 'uic', label: 'UIC Master Code' },
        { key: 'knecCode', label: 'KNEC Center Code' },
        { key: 'cluster', label: 'Cluster Type' },
        { key: 'genderType', label: 'Gender Category' },
        { key: 'accommodationType', label: 'Accommodation Style' },
        { key: 'specialNeedType', label: 'Inclusion Category' },
        { key: 'institutionType', label: 'Institution Category' }
    ];

    const [newSchool, setNewSchool] = useState<Partial<SchoolRegistry>>({
        name: '',
        county: '',
        region: '',
        knecCode: '',
        uic: '',
        genderType: 'Mixed',
        accommodationType: 'Mixed',
        specialNeedType: 'Regular',
        institutionType: 'Secondary'
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [selectedType, setSelectedType] = useState('Secondary');
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [editingSchool, setEditingSchool] = useState<SchoolRegistry | null>(null);
    const [alumnaeCounts, setAlumnaeCounts] = useState<Record<string, number>>({});
    const [sortBy, setSortBy] = useState<'name' | 'alumnae'>('alumnae');

    const institutionTypes = ['Primary', 'Secondary', 'TVET', 'University', 'College', 'Institute', 'Polytechnic', 'Driving School'];

    const loadAlumnaeCounts = async () => {
        try {
            // Fetch only schoolId to minimize payload size
            const members = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, { 
                select: 'school_id',
                limit: 100000 // Support up to 100k members for counts
            });
            
            const counts: Record<string, number> = {};
            members.forEach((m: any) => {
                const sid = m.schoolId || m.school_id;
                if (sid) {
                    counts[sid] = (counts[sid] || 0) + 1;
                }
            });
            setAlumnaeCounts(counts);
        } catch (err) {
            console.error("Failed to load alumnae counts:", err);
        }
    };

    useEffect(() => {
        loadAlumnaeCounts();
    }, [registry.length]);

    const filteredSchools = useMemo(() => {
        let schools = [...registry];
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase().trim();
            const searchTerms = lower.split(/\s+/).filter(t => t.length > 0);
            
            schools = schools.filter(s => {
                const name = s.name.toLowerCase();
                const knec = (s.knecCode || '').toLowerCase();
                const uic = (s.uic || '').toLowerCase();
                const county = (s.county || '').toLowerCase();
                const region = (s.region || '').toLowerCase();
                const id = s.id.toLowerCase();
                
                const schoolData = `${name} ${knec} ${uic} ${county} ${region} ${id}`;
                
                return searchTerms.every(term => schoolData.includes(term));
            });
        }

        return schools.sort((a, b) => {
            if (sortBy === 'alumnae') {
                const countA = alumnaeCounts[a.id] || 0;
                const countB = alumnaeCounts[b.id] || 0;
                if (countB !== countA) return countB - countA;
                return a.name.localeCompare(b.name);
            }

            const lower = searchTerm.toLowerCase().trim();
            const searchTerms = lower.split(/\s+/).filter(t => t.length > 0);
            
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            if (searchTerm) {
                // 1. Exact match on name
                if (aName === lower) return -1;
                if (bName === lower) return 1;
                
                // 2. Starts with match on name
                const aStarts = aName.startsWith(lower);
                const bStarts = bName.startsWith(lower);
                if (aStarts && !bStarts) return -1;
                if (bStarts && !aStarts) return 1;
                
                // 3. Name contains all terms
                const aNameHasTerms = searchTerms.every(t => aName.includes(t));
                const bNameHasTerms = searchTerms.every(t => bName.includes(t));
                if (aNameHasTerms && !bNameHasTerms) return -1;
                if (bNameHasTerms && !aNameHasTerms) return 1;
            }

            return aName.localeCompare(bName);
        });
    }, [registry, searchTerm, sortBy, alumnaeCounts]);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    const paginatedSchools = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredSchools.slice(start, start + pageSize);
    }, [filteredSchools, currentPage]);

    const totalPages = Math.ceil(filteredSchools.length / pageSize);

    // Reset to page 1 when searching or sorting
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortBy]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(paginatedSchools.map(s => s.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkUpdateType = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessingBulk(true);
        try {
            const ids = Array.from(selectedIds);
            const batchSize = 10;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                await Promise.all(batch.map(async (id) => {
                    const original = registry.find(s => s.id === id);
                    if (original) {
                        await apiService.saveModuleRecord('school_registry', {
                            ...original,
                            institutionType: selectedType,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }));
            }
            setSelectedIds(new Set());
            setIsBulkUpdating(false);
            onRefresh();
            alert(`Successfully updated ${ids.length} institutions to ${selectedType}.`);
        } catch (err: any) {
            console.error(err);
            alert("Bulk Update Failed: " + err.message);
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const handleSaveManual = async () => {
        if (!newSchool.name) return;
        try {
            let baseId = `sch_${Date.now()}`;
            if (newSchool.knecCode) baseId = `sch_knec_${slugify(newSchool.knecCode)}`;
            else if (newSchool.uic) baseId = `sch_uic_${slugify(newSchool.uic)}`;

            const data: any = {
                ...newSchool,
                id: baseId,
                slug: slugify(newSchool.name!),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('school_registry', data);
            setIsAddingManually(false);
            onRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkComplete = async (data: any[]) => {
        setIsUploading(false);
        try {
            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    try {
                        // Match existing record to allow UPSERT to work even if IDs were generated differently
                        let existing = registry.find(r => 
                            (item.knecCode && r.knecCode === item.knecCode) || 
                            (item.uic && r.uic === item.uic)
                        );

                        // Deep Search Fallback: If not found in current view, check the entire database
                        if (!existing && (item.knecCode || item.uic)) {
                            try {
                                const filter: any = {};
                                if (item.knecCode) filter.knec_code = item.knecCode;
                                else if (item.uic) filter.uic = item.uic;

                                const remoteMatches = await apiService.fetchModuleRecords('school_registry', undefined, undefined, {
                                    filter,
                                    limit: 1
                                });
                                if (remoteMatches && remoteMatches.length > 0) {
                                    existing = remoteMatches[0];
                                }
                            } catch (e) {
                                console.warn("Deep search failed, proceeding with standard insert:", e);
                            }
                        }

                        if (existing) {
                            item.id = existing.id;
                        }
                        
                        await apiService.saveModuleRecord('school_registry', item);
                    } catch (err: any) {
                        console.error(`Failed to ingest school ${item.name}:`, err.message || err);
                        throw err; // Still throw to stop the batch
                    }
                }));
                setUploadProgress({ current: Math.min(i + batchSize, data.length), total: data.length });
            }
            alert(`Successfully ingested ${data.length} institutions into the global registry.`);
            setUploadProgress(null);
            onRefresh();
        } catch (err: any) {
            console.error("Bulk Ingestion Critical Error:", err);
            alert(`Error during bulk ingestion: ${err.message || 'Check database constraints or network connection.'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to remove this school from the global registry?")) {
            try {
                await apiService.deleteModuleRecord('school_registry', id);
                onRefresh();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {isUploading && (
                <ExcelSmartImporter 
                    fields={registryFields} 
                    onComplete={handleBulkComplete} 
                    onClose={() => setIsUploading(false)} 
                />
            )}

            {/* Header */}
            <div className="bg-slate-950 rounded-[3rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12">
                    <Database className="w-64 h-64 text-indigo-400" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white">
                            Global <span className="text-indigo-400 italic">School Registry</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                             Master data for the Alumnae Ecosystem
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {selectedIds.size > 0 && (
                            <button 
                                onClick={() => setIsBulkUpdating(true)}
                                className="h-14 px-8 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-amber-500 transition-all shadow-xl shadow-amber-500/20 animate-in zoom-in duration-300"
                            >
                                <Zap className="w-4 h-4" />
                                Bulk Update Type ({selectedIds.size})
                            </button>
                        )}
                        <button 
                            onClick={() => setIsUploading(true)}
                            className="h-14 px-8 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all cursor-pointer"
                        >
                            <Upload className="w-4 h-4 text-emerald-400" />
                            Smart Bulk Importer
                        </button>
                        <button 
                            onClick={() => setIsAddingManually(true)}
                            className="h-14 px-10 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Single School
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-white/5">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Registry Size</p>
                        <h3 className="text-4xl font-black text-white italic tracking-tighter">{registry.length} <span className="text-indigo-400 text-sm not-italic">Schools</span></h3>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Search Coverage</p>
                        <h3 className="text-4xl font-black text-white italic tracking-tighter">{filteredSchools.length} <span className="text-emerald-400 text-sm not-italic">Matched</span></h3>
                    </div>
                    <div className="bg-indigo-600/10 p-6 rounded-3xl border border-indigo-500/20 backdrop-blur-md">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Current Portal Page</p>
                        <h3 className="text-4xl font-black text-indigo-400 italic tracking-tighter">{currentPage} <span className="text-slate-400 text-sm not-italic">/ {totalPages}</span></h3>
                    </div>
                </div>
            </div>

            {/* Registry List */}
            <div className="bg-white dark:bg-slate-950 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-fade-in-up">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10 pb-10 border-b border-slate-50 dark:border-slate-900">
                    <div className="relative w-full md:max-w-md group">
                        <input 
                            type="text"
                            placeholder="Global Search County, Code, Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-indigo-600 outline-none"
                        />
                        <Search className="w-5 h-5 absolute left-5 top-4.5 text-slate-400" />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => setSortBy(sortBy === 'name' ? 'alumnae' : 'name')}
                            className={`h-14 px-6 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${
                                sortBy === 'alumnae' 
                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' 
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600'
                            }`}
                        >
                            <ArrowUpDown className={`w-4 h-4 ${sortBy === 'alumnae' ? 'rotate-180' : ''} transition-transform`} />
                            {sortBy === 'alumnae' ? 'Sorted by Alumnae' : 'Sort by Alumnae'}
                        </button>
                        <button className="h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest hover:text-indigo-600 transition-colors">
                            <Filter className="w-4 h-4" /> Advanced Filter
                        </button>
                        <button className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                <th className="px-6 py-6 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                        onChange={handleSelectAll}
                                        checked={paginatedSchools.length > 0 && paginatedSchools.every(s => selectedIds.has(s.id))}
                                    />
                                </th>
                                <th className="px-10 py-6">School Identity</th>
                                <th className="px-10 py-6">Geography</th>
                                <th className="px-10 py-6">Master Codes</th>
                                <th className="px-10 py-6">Network Strength</th>
                                <th className="px-10 py-6 text-right">Portfolio Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {paginatedSchools.map((s) => (
                                <tr key={s.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group ${selectedIds.has(s.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                    <td className="px-6 py-8">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                            checked={selectedIds.has(s.id)}
                                            onChange={() => toggleSelect(s.id)}
                                        />
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors italic">{s.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-500">{s.institutionType || 'General'}</span>
                                                    <ChevronRight className="w-3 h-3 text-indigo-400" /> {s.cluster || 'National Cluster'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{s.county || 'Unassigned'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.subCounty || 'Sub-County Level'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Binary className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-[10px] font-mono font-black text-indigo-600 uppercase">UIC: {s.uic || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-[10px] font-mono font-black text-amber-600 uppercase">KNEC: {s.knecCode || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl ${alumnaeCounts[s.id] > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'} transition-colors`}>
                                                <Heart className={`w-5 h-5 ${alumnaeCounts[s.id] > 0 ? 'fill-rose-600' : ''}`} />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter italic">
                                                    {alumnaeCounts[s.id]?.toLocaleString() || 0}
                                                </p>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Alumnae</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onAccessAlumnaPortal?.(s)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                title="Access School Alumnae Network"
                                            >
                                                <Heart className="w-3.5 h-3.5" />
                                                Alumnae
                                            </button>
                                            {onAccessPortal && (
                                                <button 
                                                    onClick={() => onAccessPortal(s.institutionId || s.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title={s.institutionId ? "Access Admin Portal" : "Provision & Access Temporary Portal"}
                                                >
                                                    <Zap className="w-3.5 h-3.5" />
                                                    Portal
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setEditingSchool(s)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title="Edit Record"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(s.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                title="Delete Record"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-10 pt-10 border-t border-slate-50 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Showing <span className="text-indigo-600">{paginatedSchools.length}</span> of <span className="text-slate-700 dark:text-white">{filteredSchools.length}</span> results
                    </p>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-50 cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-2 px-4">
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                // Show pages around current page
                                let pageNum = currentPage;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-12 h-12 rounded-2xl font-black text-xs transition-all ${
                                            currentPage === pageNum 
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-indigo-50 transition-colors'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-50 cursor-pointer"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Update Modal */}
            {isBulkUpdating && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[4000] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-500/10">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-amber-600">Bulk <span className="text-slate-800 dark:text-white italic">Update Type</span></h3>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">Re-classify {selectedIds.size} institutions</p>
                            </div>
                            <button onClick={() => setIsBulkUpdating(false)} className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Select New Institution Category</label>
                            <div className="grid grid-cols-2 gap-3">
                                {institutionTypes.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                                            selectedType === type 
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-xl shadow-amber-200/50' 
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:border-amber-200'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                            <button onClick={() => setIsBulkUpdating(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Abort</button>
                            <button 
                                onClick={handleBulkUpdateType}
                                disabled={isProcessingBulk}
                                className="flex-[2] h-16 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-amber-500/20 hover:bg-amber-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isProcessingBulk ? <Zap className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                Commit Bulk Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Add Modal */}
            {isAddingManually && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[3000] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Register <span className="text-indigo-600 italic">New Institution</span></h3>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">Manual registry entry with SEO optimization</p>
                            </div>
                            <button onClick={() => setIsAddingManually(false)} className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 grid grid-cols-2 gap-8">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Institution Legal Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Moi Girls High School Eldoret"
                                    value={newSchool.name || ''}
                                    onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Institution Category</label>
                                <select 
                                    value={newSchool.institutionType || 'Secondary'}
                                    onChange={(e) => setNewSchool({...newSchool, institutionType: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                >
                                    {institutionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">KNEC Center Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 1020304"
                                    value={newSchool.knecCode || ''}
                                    onChange={(e) => setNewSchool({...newSchool, knecCode: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">UIC Registry Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. SCH-001"
                                    value={newSchool.uic || ''}
                                    onChange={(e) => setNewSchool({...newSchool, uic: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">County Location</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Uasin Gishu"
                                    value={newSchool.county || ''}
                                    onChange={(e) => setNewSchool({...newSchool, county: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Regional Admin</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Rift Valley"
                                    value={newSchool.region || ''}
                                    onChange={(e) => setNewSchool({...newSchool, region: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                            <button onClick={() => setIsAddingManually(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel Entry</button>
                            <button 
                                onClick={handleSaveManual}
                                className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-600 transition-all active:scale-95"
                            >
                                Integrate Into Registry
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit School Modal */}
            {editingSchool && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[3000] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Edit <span className="text-indigo-600 italic">Institution Details</span></h3>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">Update global registry record for {editingSchool.name}</p>
                            </div>
                            <button onClick={() => setEditingSchool(null)} className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 grid grid-cols-2 gap-8">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Institution Legal Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Moi Girls High School Eldoret"
                                    value={editingSchool.name || ''}
                                    onChange={(e) => setEditingSchool({...editingSchool, name: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Institution Category (Type)</label>
                                <select 
                                    value={editingSchool.institutionType || ''}
                                    onChange={(e) => setEditingSchool({...editingSchool, institutionType: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                >
                                    <option value="">Select Type...</option>
                                    {institutionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">KNEC Center Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 1020304"
                                    value={editingSchool.knecCode || ''}
                                    onChange={(e) => setEditingSchool({...editingSchool, knecCode: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">UIC Registry Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. SCH-001"
                                    value={editingSchool.uic || ''}
                                    onChange={(e) => setEditingSchool({...editingSchool, uic: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">County Location</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Uasin Gishu"
                                    value={editingSchool.county || ''}
                                    onChange={(e) => setEditingSchool({...editingSchool, county: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Regional Admin</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Rift Valley"
                                    value={editingSchool.region || ''}
                                    onChange={(e) => setEditingSchool({...editingSchool, region: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                            <button onClick={() => setEditingSchool(null)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Discard Changes</button>
                            <button 
                                onClick={async () => {
                                    try {
                                        await apiService.saveModuleRecord('school_registry', {
                                            ...editingSchool,
                                            updatedAt: new Date().toISOString()
                                        });
                                        setEditingSchool(null);
                                        onRefresh();
                                        alert("Institution updated successfully.");
                                    } catch (e: any) {
                                        alert("Update failed: " + e.message);
                                    }
                                }}
                                className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-600 transition-all active:scale-95"
                            >
                                Commit Updates
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

