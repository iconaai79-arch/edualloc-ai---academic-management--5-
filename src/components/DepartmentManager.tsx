
import React, { useState, useMemo } from 'react';
import type { Department, Institution } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';

import { analyzeDepartmentSpreadsheet } from '../services/geminiService';

import * as XLSX from 'xlsx';

interface DepartmentManagerProps {
    departments: Department[];
    onAddDepartment?: (name: string) => Promise<void> | void;
    onUpdateDepartment?: (departmentId: string, name: string) => void;
    onDeleteDepartment?: (departmentId: string) => void;
    onImportDepartments?: (departments: Omit<Department, 'id' | 'institutionId'>[]) => Promise<void>;
    currentInstitution?: Institution | null;
}

// ... [SmartDepartmentImporterModal component remains unchanged] ...
const SmartDepartmentImporterModal: React.FC<{
    onClose: () => void;
    onImport: (departments: Omit<Department, 'id' | 'institutionId'>[]) => Promise<void>;
    aiModelTier?: string;
}> = ({ onClose, onImport, aiModelTier }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'success'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string | null>>({});
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                const headers = data[0] as string[];
                setFileHeaders(headers);
                setRawData(XLSX.utils.sheet_to_json(ws));

                setIsAnalyzing(true);
                try {
                    const aiMapping = await analyzeDepartmentSpreadsheet(headers);
                    setMapping(aiMapping);
                    setStep('mapping');
                } catch (error) {
                    console.error("AI Analysis failed", error);
                    setStep('mapping');
                } finally {
                    setIsAnalyzing(false);
                }
            };
            reader.readAsArrayBuffer(e.target.files[0]);
        }
    };

    const handleConfirmMapping = () => {
        const mapped = rawData.map(row => {
            const name = row[mapping['name'] || ''];
            if (!name) return null;
            return { name: String(name).trim() };
        }).filter(Boolean);
        setParsedData(mapped);
        setStep('preview');
    };

    const handleFinalImport = async () => {
        setStep('importing');
        await onImport(parsedData);
        setStep('success');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                        <SparklesIcon className="w-5 h-5 text-indigo-500" /> Smart Import
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-8">
                    {step === 'upload' && (
                        <div className="text-center p-10 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/20">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-sm font-bold text-slate-500">Analyzing structure...</p>
                                </div>
                            ) : (
                                <>
                                    <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-6">Upload Excel (.xlsx) file with department names</p>
                                    <label className="btn-primary cursor-pointer px-8 py-3 inline-block shadow-lg shadow-indigo-100">
                                        Select File
                                        <input type="file" onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls, .csv" />
                                    </label>
                                </>
                            )}
                        </div>
                    )}
                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Confirm Column Mapping</p>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <label className="w-24 text-[10px] font-black uppercase text-slate-500">Dept Name</label>
                                <select value={mapping['name'] || ''} onChange={e => setMapping({ ...mapping, name: e.target.value })} className="form-select flex-grow h-10 text-sm">
                                    <option value="">-- Select Column --</option>
                                    {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <button onClick={handleConfirmMapping} className="btn-primary w-full h-12 shadow-lg">Review Preview</button>
                        </div>
                    )}
                    {step === 'preview' && (
                        <div className="space-y-6">
                            <p className="text-sm font-medium text-slate-500">Ready to import <strong className="text-slate-900 dark:text-white">{parsedData.length}</strong> departments.</p>
                            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/50">
                                {parsedData.slice(0, 5).map((d, i) => (
                                    <div key={i} className="text-xs font-bold p-2 border-b border-slate-100 dark:border-slate-800 last:border-0">{d.name}</div>
                                ))}
                                {parsedData.length > 5 && <div className="text-[10px] text-center p-2 text-slate-400 font-bold uppercase tracking-widest">...and {parsedData.length - 5} more</div>}
                            </div>
                            <button onClick={handleFinalImport} className="btn-primary w-full h-12 shadow-lg">Import Now</button>
                        </div>
                    )}
                    {step === 'importing' && (
                        <div className="text-center py-12">
                            <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500">Processing Import...</p>
                        </div>
                    )}
                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">
                                <CheckCircleIcon className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-2 text-slate-900 dark:text-white">Success!</h4>
                            <p className="text-sm text-slate-500 mb-8">{parsedData.length} departments added.</p>
                            <button onClick={onClose} className="btn-primary w-full h-12 shadow-lg">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({
    departments,
    onAddDepartment, onUpdateDepartment, onDeleteDepartment, onImportDepartments,
    currentInstitution
}) => {
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [editingDept, setEditingDept] = useState<{ id: string; name: string } | null>(null);
    const [isAddingDepartment, setIsAddingDepartment] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const filteredDepartments = useMemo(() => {
        if (!searchQuery.trim()) {
            return departments;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return departments.filter(dept =>
            dept.name.toLowerCase().includes(lowercasedQuery)
        );
    }, [departments, searchQuery]);

    const handleAddDepartmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!onAddDepartment) {
            alert("Administrative permissions required to add departments. Please contact your system administrator.");
            return;
        }

        if (newDepartmentName.trim()) {
            setIsSaving(true);
            try {
                await onAddDepartment(newDepartmentName.trim());
                setNewDepartmentName('');
                setIsAddingDepartment(false);
            } catch (err: any) {
                alert(`Error saving department: ${err.message}`);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleUpdateSubmit = (id: string) => {
        if (editingDept && editingDept.name.trim() && onUpdateDepartment) {
            onUpdateDepartment(id, editingDept.name.trim());
            setEditingDept(null);
        }
    };

    const handleExport = () => {
        if (typeof XLSX !== 'undefined') {
            const data = departments.map(d => ({ Name: d.name }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Departments");
            XLSX.writeFile(wb, "Departments_List.xlsx");
        } else {
            alert("Export library not loaded.");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <style>{`
                .form-input { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
                .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.5rem 2.5rem 0.5rem 0.75rem; background-color: white; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .dark .form-select { border-color: #334155; background-color: #0f172a; color: white; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
                .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
                .btn-secondary:hover { border-color: #cbd5e1; }
            `}</style>

            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Academic Departments</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Organizational Structure</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {onImportDepartments && (
                            <button onClick={() => setIsImportModalOpen(true)} className="btn-secondary h-11 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm">
                                <SparklesIcon className="w-4 h-4 text-indigo-500" /> Smart Import
                            </button>
                        )}
                        <button onClick={() => window.print()} className="btn-secondary h-11 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm">
                            <PrinterIcon className="w-4 h-4" /> Print
                        </button>
                        <button onClick={handleExport} className="btn-secondary h-11 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm">
                            <DocumentArrowDownIcon className="w-4 h-4" /> Export
                        </button>
                        <button
                            onClick={() => {
                                if (onAddDepartment) setIsAddingDepartment(prev => !prev);
                                else alert("Feature disabled or restricted.");
                            }}
                            className="btn-primary h-11 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                            disabled={!onAddDepartment}
                            title={!onAddDepartment ? "Missing permission" : ""}
                        >
                            <PlusIcon className="w-5 h-5" /> {isAddingDepartment ? 'Cancel' : 'New Dept'}
                        </button>
                    </div>
                </div>

                {isAddingDepartment && (
                    <form onSubmit={handleAddDepartmentSubmit} className="flex flex-col sm:flex-row gap-4 items-end bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 animate-scale-in">
                        <div className="flex-grow w-full">
                            <label htmlFor="department-name" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">New Department Name</label>
                            <input
                                type="text"
                                id="department-name"
                                value={newDepartmentName}
                                onChange={(e) => setNewDepartmentName(e.target.value)}
                                className="form-input h-12"
                                placeholder="e.g., School of Computer Science"
                                required
                                autoFocus
                                disabled={isSaving}
                            />
                        </div>
                        <button type="submit" disabled={isSaving || !newDepartmentName.trim()} className="btn-primary h-12 px-10 shadow-lg min-w-[140px]">
                            {isSaving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Create Record'}
                        </button>
                    </form>
                )}

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="relative mb-6">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter departments..."
                            className="form-input pl-10 h-12"
                        />
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Department Name</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-500 tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800">
                                {filteredDepartments.map(dept => (
                                    <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            {editingDept?.id === dept.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingDept.name}
                                                        onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                                                        className="form-input py-1 text-sm font-bold h-10 flex-grow"
                                                        autoFocus
                                                        onKeyDown={e => e.key === 'Enter' && handleUpdateSubmit(dept.id)}
                                                    />
                                                    <button onClick={() => handleUpdateSubmit(dept.id)} className="btn-primary h-10 px-4 text-xs">Save</button>
                                                    <button onClick={() => setEditingDept(null)} className="btn-secondary h-10 px-4 text-xs">Cancel</button>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{dept.name}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingDept?.id !== dept.id && (
                                                <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {onUpdateDepartment && (
                                                        <button onClick={() => setEditingDept({ id: dept.id, name: dept.name })} className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Edit</button>
                                                    )}
                                                    {onDeleteDepartment && (
                                                        <button
                                                            onClick={() => { if (window.confirm(`Are you sure you want to delete ${dept.name}?`)) onDeleteDepartment(dept.id); }}
                                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredDepartments.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">
                                            No departments found in registry.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {isImportModalOpen && (
                <SmartDepartmentImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={async (depts) => {
                        if (onImportDepartments) await onImportDepartments(depts);
                    }}
                    aiModelTier={currentInstitution?.aiModelTier}
                />
            )}
        </div>
    );
};

