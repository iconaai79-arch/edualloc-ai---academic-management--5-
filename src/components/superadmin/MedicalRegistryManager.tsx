
import React, { useState, useEffect } from 'react';
import { 
    ArrowPathIcon, 
    ArrowUpTrayIcon, 
    PlusIcon, 
    XIcon,
    MagnifyingGlassIcon
} from '../icons';
import { apiService } from '../../services/apiService';
import { ICDCode } from '../../types';
import { SmartMedicalImporterModal } from '../SmartMedicalImporterModal';

export const MedicalRegistryManager: React.FC = () => {
    const [icdCodes, setIcdCodes] = useState<ICDCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddManual, setShowAddManual] = useState(false);
    const [limit, setLimit] = useState(20);
    
    // Manual form
    const [newCode, setNewCode] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCat, setNewCat] = useState('');


    const loadData = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<ICDCode>('icd_codes', undefined, limit);
            setIcdCodes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [limit]);

    const handleAddManual = async () => {
        if (!newCode || !newDesc) return;
        try {
            await apiService.saveModuleRecord('icd_codes', {
                id: `icd_${Date.now()}`,
                code: newCode,
                description: newDesc,
                category: newCat,
                version: 'ICD-10',
                createdAt: new Date().toISOString()
            });
            setShowAddManual(false);
            setNewCode('');
            setNewDesc('');
            setNewCat('');
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error adding ICD code.");
        }
    };

    const filteredCodes = icdCodes.filter(c => 
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <ArrowPathIcon className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />;

    return (
        <div className="space-y-8 animate-fade-in">
            {isImporterOpen && (
                <SmartMedicalImporterModal 
                    onClose={() => setIsImporterOpen(false)} 
                    onRefresh={loadData} 
                />
            )}

            <div className="bg-white dark:bg-slate-800 p-12 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Medical Diagnosis Registry</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage global ICD-10 codification for HIS institutions</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <input 
                                type="text"
                                placeholder="Search codes or diagnosis..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="form-input pl-12 h-12"
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button 
                                onClick={() => setIsImporterOpen(true)}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
                            >
                                <ArrowUpTrayIcon className="w-4 h-4" />
                                Bulk Upload
                            </button>
                            <button 
                                onClick={() => setShowAddManual(!showAddManual)}
                                className="btn-primary h-12 px-8 flex items-center gap-2"
                            >
                                {showAddManual ? <XIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                                Add Manual
                            </button>
                        </div>
                    </div>
                </div>

                {showAddManual && (
                    <div className="mb-12 p-8 bg-slate-50 dark:bg-slate-930 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">ICD Code</label>
                                <input value={newCode} onChange={e => setNewCode(e.target.value)} className="form-input" placeholder="e.g. A00.0" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Description</label>
                                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="form-input" placeholder="e.g. Cholera due to Vibrio cholerae" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Category (Optional)</label>
                                <input value={newCat} onChange={e => setNewCat(e.target.value)} className="form-input" placeholder="e.g. Infectious diseases" />
                            </div>
                        </div>
                        <button onClick={handleAddManual} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all">Register Code</button>
                    </div>
                )}

                <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                            {filteredCodes.length > 0 ? (
                                filteredCodes.slice(0, 50).map(c => (
                                    <tr key={String(c.id)} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-8 py-4">
                                            <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                {c.code}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest">{c.description}</td>
                                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.category || 'N/A'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        No ICD codes found. Use bulk upload to initialize the registry.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredCodes.length > 50 && (
                    <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Showing first 50 of {filteredCodes.length} matching records
                    </p>
                )}
                
                {icdCodes.length >= limit && (
                    <div className="mt-12 flex justify-center">
                        <button 
                            onClick={() => setLimit(prev => prev + 50)}
                            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <ArrowPathIcon className="w-4 h-4" /> Sync More ICD Codes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
