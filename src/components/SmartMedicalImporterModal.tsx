
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
    XIcon, 
    ArrowUpTrayIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    SparklesIcon
} from './icons';
import { apiService } from '../services/apiService';
import { analyzeIcdSpreadsheet } from '../services/geminiService';

interface SmartMedicalImporterModalProps {
    onClose: () => void;
    onRefresh: () => void;
}

export const SmartMedicalImporterModal: React.FC<SmartMedicalImporterModalProps> = ({ onClose, onRefresh }) => {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
    
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string | null>>({});
    const [processedData, setProcessedData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setStep('upload');
            setError(null);
        }
    };

    const runAnalysis = async () => {
        if (!file) return;
        setAnalyzing(true);
        setError(null);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                if (jsonData.length === 0) {
                    setError("The spreadsheet is empty.");
                    setAnalyzing(false);
                    return;
                }

                const sheetHeaders = Object.keys(jsonData[0] as object);
                setHeaders(sheetHeaders);
                setRawData(jsonData);

                // AI Mapping
                const aiMap = await analyzeIcdSpreadsheet(sheetHeaders);
                setMapping(aiMap);
                setStep('mapping');
                setAnalyzing(false);
            };
            reader.readAsArrayBuffer(file);
        } catch (err: any) {
            setError(err.message || "Failed to analyze file.");
            setAnalyzing(false);
        }
    };

    const confirmMapping = () => {
        const processed = rawData.map((row, idx) => {
            const getVal = (field: string) => {
                const header = mapping[field];
                return header ? row[header] : undefined;
            };

            return {
                id: `icd_${Date.now()}_${idx}`,
                code: String(getVal('code') || '').trim(),
                description: String(getVal('description') || '').trim(),
                category: getVal('category'),
                version: getVal('version') || 'ICD-10',
                createdAt: new Date().toISOString()
            };
        }).filter(r => r.code && r.description);

        if (processed.length === 0) {
            setError("No valid ICD codes found with the current mapping. Ensure 'code' and 'description' are mapped.");
            return;
        }

        setProcessedData(processed);
        setStep('preview');
    };

    const startImport = async () => {
        setImporting(true);
        setError(null);
        try {
            // Batch processing (100 at a time)
            const batchSize = 100;
            for (let i = 0; i < processedData.length; i += batchSize) {
                const batch = processedData.slice(i, i + batchSize);
                await apiService.saveModuleRecords('icd_codes', batch);
            }
            setStep('success');
            onRefresh();
        } catch (err: any) {
            setError(err.message || "Import failed.");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-12 overflow-y-auto">
            <div className="bg-white dark:bg-slate-930 w-full max-w-5xl rounded-[4rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-8 md:p-12 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-3xl flex items-center justify-center">
                            <SparklesIcon className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">ICD Intelligence Importer</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">AI-Powered Medical Registry Synchronization</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center hover:rotate-90 transition-all text-slate-500">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12">
                    {error && (
                        <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-3xl flex items-start gap-4 animate-shake">
                            <ExclamationTriangleIcon className="w-6 h-6 text-rose-600 flex-shrink-0" />
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {step === 'upload' && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h3 className="text-xl font-black uppercase tracking-tight">Upload Spreadsheet</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto">Drop your ICD-10 or ICD-11 coding list. Our Visionary Engine will automatically detect codes and descriptions.</p>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-20 flex flex-col items-center justify-center gap-6 hover:border-indigo-400 transition-all cursor-pointer group"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept=".xlsx,.xls,.csv" />
                                {file ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center">
                                            <CheckCircleIcon className="w-10 h-10 text-green-600" />
                                        </div>
                                        <span className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{file.name}</span>
                                        <span className="text-xs font-bold text-slate-400 italic">{(file.size / 1024).toFixed(1)} KB ready for analysis</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ArrowUpTrayIcon className="w-10 h-10 text-slate-400 group-hover:text-indigo-600" />
                                        </div>
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Click to browse or drop file here</span>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!file || analyzing}
                                onClick={runAnalysis}
                                className="w-full h-20 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {analyzing ? (
                                    <>
                                        <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                        Matrix Analysis in Progress...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-6 h-6" />
                                        Analyze Intelligence Mapping
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <h3 className="text-xl font-black uppercase tracking-tight">Intelligence Mapping</h3>
                                    {['code', 'description', 'category', 'version'].map((field) => (
                                        <div key={field} className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block ml-1">{field}</label>
                                            <select 
                                                value={mapping[field] || ''} 
                                                onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                                className="form-select bg-slate-50 dark:bg-slate-900 border-none rounded-2xl h-14 w-full text-xs font-black uppercase tracking-widest px-6"
                                            >
                                                <option value="">Skip this field</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                        <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <h4 className="text-lg font-black uppercase tracking-tight">Data Integrity Check</h4>
                                    <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                                        The Visionary Engine has pre-mapped fields based on linguistic patterns. Verify that 'code' (A00.0) and 'description' (Cholera) are correctly aligned before proceeding.
                                    </p>
                                    <div className="pt-6 space-y-4">
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Rows Found</span>
                                            <span className="text-lg font-black uppercase tracking-tight">{rawData.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setStep('upload')} className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                                <button onClick={confirmMapping} className="flex-[2] h-16 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none">Confirm Mapping</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-12">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Final Batch Preview</h3>
                                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">Verify the parsed data integrity</p>
                                </div>
                                <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                    {processedData.length} records ready
                                </span>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                                        {processedData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                                <td className="px-8 py-4 font-black transition-all group-hover:pl-10">
                                                    <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black">
                                                        {row.code}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest line-clamp-1">{row.description}</td>
                                                <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.category || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {processedData.length > 10 && (
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        + {processedData.length - 10} more records in this batch
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setStep('mapping')} className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Modify Mapping</button>
                                <button 
                                    disabled={importing}
                                    onClick={startImport} 
                                    className="flex-[2] h-16 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 dark:shadow-none flex items-center justify-center gap-4"
                                >
                                    {importing ? (
                                        <>
                                            <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                            Synchronizing Matrix...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-6 h-6" />
                                            Initialize Core Sync
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-20 flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="w-32 h-32 bg-green-50 dark:bg-green-950/30 rounded-[3rem] flex items-center justify-center animate-bounce">
                                <CheckCircleIcon className="w-16 h-16 text-green-600" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-4xl font-black uppercase tracking-tighter">Synchronization Complete</h3>
                                <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">
                                    Successfully finalized {processedData.length} ICD diagnosis records.
                                </p>
                            </div>
                            <button onClick={onClose} className="btn-primary h-16 px-12">Close Intelligence Importer</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
