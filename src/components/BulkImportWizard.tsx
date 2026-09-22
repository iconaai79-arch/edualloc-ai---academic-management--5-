
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface BulkImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[], type: 'students' | 'teachers') => Promise<void>;
    type: 'students' | 'teachers';
}

export const BulkImportWizard: React.FC<BulkImportWizardProps> = ({
    isOpen,
    onClose,
    onImport,
    type
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setPreviewData(data);
            setStep(2);
        };
        reader.readAsBinaryString(file);
    };

    const handleFinalImport = async () => {
        setIsImporting(true);
        try {
            await onImport(previewData, type);
            setStep(3);
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Bulk {type === 'students' ? 'Admission' : 'Staffing'} Wizard</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Import via Excel or CSV</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-8">
                    {/* Stepper */}
                    <div className="flex items-center gap-4 mb-10">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                                    step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {s}
                                </div>
                                <div className={`h-1 w-8 rounded-full ${step > s ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto">
                                <ArrowUpTrayIcon className="w-10 h-10 text-indigo-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900">Upload Data File</h3>
                                <p className="text-slate-400 text-sm font-medium">Select an .xlsx or .csv file containing {type} records.</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="relative cursor-pointer bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 overflow-hidden">
                                    <span className="pointer-events-none">Choose File</span>
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} title="Choose File" />
                                </div>
                                <button className="mt-4 text-xs font-black text-indigo-600 uppercase tracking-widest">Download Sample Template</button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <h3 className="text-lg font-black text-slate-900">Data Preview ({previewData.length} records)</h3>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircleIcon className="w-3 h-3" /> Validated
                                </span>
                            </div>
                            <div className="max-h-[300px] overflow-auto border border-slate-100 rounded-3xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            {previewData[0] && Object.keys(previewData[0]).map(key => (
                                                <th key={key} className="px-4 py-3 font-black uppercase text-slate-400 tracking-widest">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {previewData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((val: any, j) => (
                                                    <td key={j} className="px-4 py-3 text-slate-600 font-bold">{val}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 5 && (
                                    <div className="p-4 bg-slate-50 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                        + {previewData.length - 5} more records...
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 py-4 border border-slate-100 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50">Cancel</button>
                                <button 
                                    onClick={handleFinalImport}
                                    disabled={isImporting}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isImporting ? 'Processing...' : 'Complete Import'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-6 py-10">
                            <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                                <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Import Successful!</h3>
                                <p className="text-slate-400 text-sm font-medium">Successfully processed {previewData.length} records.</p>
                            </div>
                            <button onClick={onClose} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest">Close Wizard</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

