
import React, { useState } from 'react';
import { RetailInventoryItem } from '../../types';
import { XIcon, SparklesIcon, CheckCircleIcon, ArrowUpTrayIcon } from '../icons/index';
import { analyzeRetailInventorySpreadsheet } from '../../services/geminiService';
import * as XLSX from 'xlsx';

type RetailInventoryMappingField = 'name' | 'sku' | 'category' | 'srpPrice' | 'costPrice' | 'quantity' | 'unit' | 'description';
const ALL_RETAIL_MAPPING_FIELDS: RetailInventoryMappingField[] = ['name', 'sku', 'category', 'srpPrice', 'costPrice', 'quantity', 'unit', 'description'];
const REQUIRED_RETAIL_MAPPING_FIELDS: RetailInventoryMappingField[] = ['name', 'category', 'srpPrice', 'quantity'];

interface SmartRetailInventoryImporterModalProps {
    onClose: () => void;
    onImport: (items: Partial<RetailInventoryItem>[]) => Promise<void>;
    institutionId: string;
}

export const SmartRetailInventoryImporterModal: React.FC<SmartRetailInventoryImporterModalProps> = ({
    onClose, onImport, institutionId
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<RetailInventoryMappingField, string | null>>(
        ALL_RETAIL_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<RetailInventoryMappingField, string | null>)
    );
    const [parsedData, setParsedData] = useState<{ valid: Partial<RetailInventoryItem>[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing');
        setErrorMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty.");

                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                const mapping = await analyzeRetailInventorySpreadsheet(headers);

                const initialMapping: any = {};
                Object.keys(mapping).forEach(key => {
                    if (ALL_RETAIL_MAPPING_FIELDS.includes(key as any)) {
                        initialMapping[key] = mapping[key];
                    }
                });

                setUserMapping(prev => ({ ...prev, ...initialMapping }));
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to process spreadsheet.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: RetailInventoryMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_RETAIL_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}.`);
            return;
        }

        const validItems: Partial<RetailInventoryItem>[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        (rawData || []).forEach((row) => {
            try {
                const name = row[userMapping.name!];
                const category = row[userMapping.category!];
                const srpPrice = parseFloat(row[userMapping.srpPrice!]);
                const quantity = parseFloat(row[userMapping.quantity!]);

                if (!name || !category || isNaN(srpPrice) || isNaN(quantity)) {
                    throw new Error("Missing or invalid required fields (Name, Category, Price, or Quantity).");
                }

                const sku = userMapping.sku ? String(row[userMapping.sku] || '') : '';
                const costPrice = userMapping.costPrice ? parseFloat(row[userMapping.costPrice]) || 0 : 0;
                const unit = userMapping.unit ? String(row[userMapping.unit] || 'pcs') : 'pcs';
                const description = userMapping.description ? String(row[userMapping.description] || '') : '';

                validItems.push({
                    name: String(name).trim(),
                    sku: sku.trim() || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    category: String(category).trim(),
                    srpPrice,
                    costPrice,
                    quantity,
                    unit,
                    description,
                    institutionId,
                    marketplaceEnabled: true,
                    lastUpdated: new Date().toISOString()
                });

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ valid: validItems, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;
        setStep('finalizing');

        try {
            await onImport(parsedData.valid);
            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to save data.");
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Smart Product Importer</h3>
                        <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Excel AI Matrix业务</p>
                    </div>
                    <button onClick={onClose} className="p-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90 text-slate-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-10 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-16 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] bg-slate-50 dark:bg-slate-900/50 group hover:border-indigo-500 transition-colors">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                <ArrowUpTrayIcon className="w-12 h-12 text-indigo-400" />
                            </div>
                            <h4 className="text-xl font-black uppercase mb-3">Upload Product Spreadsheet</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto">Select an Excel (.xlsx) file with your inventory data. Our AI will automatically map the columns for you.</p>
                            <label className="bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest px-12 py-5 inline-block cursor-pointer shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">
                                Select Excel File
                                <input type="file" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                                    <SparklesIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-xl uppercase tracking-tight">AI Column Alignment</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Verify the auto-detected mappings below</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {ALL_RETAIL_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                            {field.replace(/([A-Z])/g, ' $1')}
                                            {REQUIRED_RETAIL_MAPPING_FIELDS.includes(field) && <span className="text-rose-500 text-[8px] font-black uppercase">Required</span>}
                                        </label>
                                        <select
                                            value={userMapping[field] || ''}
                                            onChange={e => handleMappingChange(field, e.target.value || null)}
                                            className="w-full px-5 py-3 bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">-- Manual Selection --</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-8">
                                <button
                                    onClick={handleConfirmMapping}
                                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Analyze & Review
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="font-black text-2xl uppercase tracking-tight">Ready to List</h4>
                                    <p className="text-xs text-emerald-500 font-black uppercase tracking-widest mt-1">{parsedData?.valid.length} healthy products identified</p>
                                </div>
                                {parsedData && parsedData.invalid.length > 0 && (
                                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-1">{parsedData.invalid.length} entries filtered out</p>
                                )}
                            </div>

                            <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-[2.5rem] shadow-sm bg-white dark:bg-slate-900">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800">
                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Product</th>
                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">SKU</th>
                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Price</th>
                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {parsedData?.valid.slice(0, 10).map((v, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{v.name}</p>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">{v.category}</span>
                                                </td>
                                                <td className="px-8 py-5 text-[10px] font-mono font-black text-slate-400">{v.sku}</td>
                                                <td className="px-8 py-5 text-center text-xs font-black text-indigo-600">{v.srpPrice?.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-center text-xs font-black">{v.quantity} {v.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData && parsedData.valid.length > 10 && (
                                    <div className="p-4 text-center bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-800">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">... and {parsedData.valid.length - 10} more items</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-6 gap-4">
                                <button onClick={() => setStep('upload')} className="px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-600 transition-all">Restart</button>
                                <button
                                    onClick={handleFinalImport}
                                    className="bg-slate-900 dark:bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-3"
                                >
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                                    Finalize Bulk List
                                </button>
                            </div>
                        </div>
                    )}

                    {(step === 'importing' || step === 'finalizing') && (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-xl shadow-indigo-100 dark:shadow-none"></div>
                            <h4 className="text-2xl font-black uppercase tracking-tight animate-pulse">Syncing Matrix...</h4>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">Consulting Gemini 3.0 Pro 业务</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-700">
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-emerald-50 shadow-none">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black uppercase tracking-tight mb-3">Sync Complete</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-12 max-w-sm mx-auto">{parsedData?.valid.length} items have been successfully integrated into your premium electronics catalog.</p>
                            <button onClick={onClose} className="px-16 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 transition-all">Dismiss Importer</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-[2.5rem] flex items-center justify-center mb-8">
                                <XIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black uppercase tracking-tight text-rose-500 mb-3">Matrix Disruption</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-12">{errorMessage}</p>
                            <button onClick={onClose} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
