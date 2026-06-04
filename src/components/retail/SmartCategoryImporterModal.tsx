import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import * as XLSX from 'xlsx';
import { InventoryCategory } from './StoreConfigManager';

interface SmartCategoryImporterModalProps {
    onClose: () => void;
    onImport: (categories: Omit<InventoryCategory, 'id'>[]) => Promise<void>;
}

export const SmartCategoryImporterModal: React.FC<SmartCategoryImporterModalProps> = ({
    onClose,
    onImport,
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string | null>>({
        name: null,
        description: null,
        icon: null,
        color: null,
    });
    const [parsedData, setParsedData] = useState<Omit<InventoryCategory, 'id'>[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [errorMessage, setErrorMessage] = useState('');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setStep('importing');
            setErrorMessage('');
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'array' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    
                    if (data.length < 1) throw new Error("Spreadsheet is empty.");
                    
                    const headers = (data[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
                    setFileHeaders(headers);
                    setRawData(XLSX.utils.sheet_to_json(ws));

                    // Smart auto-mapping based on keywords
                    const initialMapping: Record<string, string | null> = {
                        name: null,
                        description: null,
                        icon: null,
                        color: null,
                    };
                    headers.forEach(h => {
                        const lh = h.toLowerCase();
                        if (lh.includes('name') || lh.includes('title') || lh === 'category') {
                            initialMapping.name = h;
                        } else if (lh.includes('description') || lh.includes('desc') || lh.includes('detail') || lh.includes('info')) {
                            initialMapping.description = h;
                        } else if (lh.includes('icon') || lh.includes('emoji')) {
                            initialMapping.icon = h;
                        } else if (lh.includes('color') || lh.includes('hex')) {
                            initialMapping.color = h;
                        }
                    });
                    
                    // Fallbacks
                    if (!initialMapping.name && headers.length > 0) initialMapping.name = headers[0];

                    setMapping(initialMapping);
                    setStep('mapping');
                } catch (err: any) {
                    setErrorMessage(err.message || 'Failed to process spreadsheet.');
                    setStep('error');
                }
            };
            reader.readAsArrayBuffer(e.target.files[0]);
        }
    };

    const handleConfirmMapping = () => {
        if (!mapping.name) {
            alert('Please map the Category Name column.');
            return;
        }

        const validItems: Omit<InventoryCategory, 'id'>[] = [];
        rawData.forEach((row, index) => {
            const name = row[mapping.name!];
            if (!name || !String(name).trim()) return;

            const description = mapping.description ? String(row[mapping.description] || '').trim() : '';
            const icon = mapping.icon ? String(row[mapping.icon] || '📦').trim() : '📦';
            const color = mapping.color ? String(row[mapping.color] || '#6366f1').trim() : '#6366f1';

            validItems.push({
                name: String(name).trim(),
                description,
                icon,
                color,
                sortOrder: index + 1,
            });
        });

        if (validItems.length === 0) {
            alert('No valid rows found with non-empty Category Name.');
            return;
        }

        setParsedData(validItems);
        setStep('preview');
    };

    const handleFinalImport = async () => {
        setStep('importing');
        try {
            await onImport(parsedData);
            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to save categories.');
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                        <span className="text-indigo-500">✨</span> Category Smart Import
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-8">
                    {step === 'upload' && (
                        <div className="text-center p-10 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/20">
                            <span className="text-4xl block mb-4">📊</span>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-6">Upload Excel (.xlsx) or CSV file with categories</p>
                            <label className="bg-indigo-600 text-white rounded-xl font-bold px-8 py-3 inline-block cursor-pointer shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                Select File
                                <input type="file" onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls, .csv" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirm Column Mapping</p>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className="w-28 text-[10px] font-black uppercase text-slate-500">Name *</label>
                                    <select value={mapping.name || ''} onChange={e => setMapping({ ...mapping, name: e.target.value || null })} className="flex-grow h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-2">
                                        <option value="">-- Choose Column --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className="w-28 text-[10px] font-black uppercase text-slate-500">Description</label>
                                    <select value={mapping.description || ''} onChange={e => setMapping({ ...mapping, description: e.target.value || null })} className="flex-grow h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-2">
                                        <option value="">-- Optional --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className="w-28 text-[10px] font-black uppercase text-slate-500">Icon / Emoji</label>
                                    <select value={mapping.icon || ''} onChange={e => setMapping({ ...mapping, icon: e.target.value || null })} className="flex-grow h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-2">
                                        <option value="">-- Optional --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className="w-28 text-[10px] font-black uppercase text-slate-500">Color / Hex</label>
                                    <select value={mapping.color || ''} onChange={e => setMapping({ ...mapping, color: e.target.value || null })} className="flex-grow h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-2">
                                        <option value="">-- Optional --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button onClick={handleConfirmMapping} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-12 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100">Review Preview</button>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <p className="text-sm font-medium text-slate-500">Ready to import <strong className="text-slate-900 dark:text-white">{parsedData.length}</strong> categories.</p>
                            
                            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                {parsedData.slice(0, 5).map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs font-bold p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <span className="text-base">{c.icon}</span>
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                        <span className="text-slate-800 dark:text-slate-200">{c.name}</span>
                                        {c.description && <span className="text-slate-400 font-normal truncate ml-auto">{c.description}</span>}
                                    </div>
                                ))}
                                {parsedData.length > 5 && (
                                    <div className="text-[10px] text-center p-2 text-slate-400 font-bold uppercase tracking-widest">
                                        ...and {parsedData.length - 5} more
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep('upload')} className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl font-bold flex-grow hover:bg-slate-200 transition-all">Back</button>
                                <button onClick={handleFinalImport} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex-grow transition-all shadow-lg">Confirm & Import</button>
                            </div>
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
                            <p className="text-sm text-slate-500 mb-8">{parsedData.length} categories added.</p>
                            <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-12 rounded-xl font-bold shadow-lg shadow-indigo-100">Close</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <XIcon className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black uppercase text-red-600 mb-2">Import Error</h4>
                            <p className="text-sm text-slate-500 mb-8">{errorMessage}</p>
                            <button onClick={onClose} className="bg-slate-900 text-white w-full h-12 rounded-xl font-bold">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
