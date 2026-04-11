
import React, { useState, useMemo } from 'react';
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
    Download,
    X,
    Database,
    Zap
} from 'lucide-react';
import type { SchoolRegistry } from '../../types';
import { apiService } from '../../services/apiService';

import { slugify } from '../../utils/stringUtils';
import { generateId } from '../../utils/idGenerator';

interface SchoolRegistryManagerProps {
    registry: SchoolRegistry[];
    onRefresh: () => void;
}

export const SchoolRegistryManager: React.FC<SchoolRegistryManagerProps> = ({ registry, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingManually, setIsAddingManually] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);

    const [newSchool, setNewSchool] = useState<Partial<SchoolRegistry>>({
        name: '',
        county: '',
        region: '',
        knecCode: '',
        uic: '',
        genderType: 'Mixed',
        accommodationType: 'Mixed',
        specialNeedType: 'Regular'
    });

    const filteredSchools = useMemo(() => {
        return registry.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.knecCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.slug?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [registry, searchTerm]);

    const handleSaveManual = async () => {
        if (!newSchool.name) return;
        try {
            const data: any = {
                ...newSchool,
                id: `sch_${Date.now()}`,
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

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Simulate parsing and uploading
        alert("Simulating bulk upload of registry data. In production, this would parse your CSV and generate slugs automatically.");
        setIsUploading(false);
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
                        <label className="h-14 px-8 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all cursor-pointer">
                            <Upload className="w-4 h-4 text-indigo-400" />
                            Bulk Upload Schools
                            <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                        </label>
                        <button 
                            onClick={() => setIsAddingManually(true)}
                            className="h-14 px-10 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Single School
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-white/5">
                    {[
                        { label: 'Total Registry Size', val: registry.length.toLocaleString(), icon: <Database /> },
                        { label: 'Active In Alumnae', val: registry.filter(s => s.institutionId).length, icon: <Zap /> },
                        { label: 'Pending Portals', val: '—', icon: <FileText /> },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-indigo-400">
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                                <h4 className="text-xl font-black text-white italic">{s.val}</h4>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Management Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-center">
                    <div className="relative flex-1 w-full">
                        <input 
                            type="text" 
                            placeholder="Search registry by name, knec, uic or slug..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-indigo-600 outline-none"
                        />
                        <Search className="w-5 h-5 absolute left-5 top-4.5 text-slate-400" />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button className="h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest hover:text-indigo-600 transition-colors">
                            <Filter className="w-4 h-4" /> Advanced Filter
                        </button>
                        <button className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                <th className="px-10 py-6">School Identity</th>
                                <th className="px-10 py-6">Geography</th>
                                <th className="px-10 py-6">Master Codes</th>
                                <th className="px-10 py-6">SEO Alumnae Link</th>
                                <th className="px-10 py-6 text-right">Portfolio Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredSchools.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors italic">{s.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
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
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Shareable Portal Link</span>
                                            <code className="text-[10px] bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-500">
                                                /?school={s.slug || s.id}
                                            </code>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <button 
                                            onClick={() => handleDelete(s.id)}
                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all hover:border-rose-100 shadow-sm"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
                                    value={newSchool.name}
                                    onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">KNEC Center Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 1020304"
                                    value={newSchool.knecCode}
                                    onChange={(e) => setNewSchool({...newSchool, knecCode: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">UIC Registry Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. SCH-001"
                                    value={newSchool.uic}
                                    onChange={(e) => setNewSchool({...newSchool, uic: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">County Location</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Uasin Gishu"
                                    value={newSchool.county}
                                    onChange={(e) => setNewSchool({...newSchool, county: e.target.value})}
                                    className="w-full h-16 px-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Regional Admin</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Rift Valley"
                                    value={newSchool.region}
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
        </div>
    );
};
