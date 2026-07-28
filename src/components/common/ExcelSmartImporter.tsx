
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
    FileSpreadsheet, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle, 
    X, 
    ArrowRight,
    Loader2,
    Check,
    HelpCircle
} from 'lucide-react';
import { slugify } from '../../utils/stringUtils';

interface MappingField {
    key: string;
    label: string;
    required?: boolean;
}

interface ExcelSmartImporterProps {
    fields: MappingField[];
    onComplete: (data: any[]) => void;
    onClose: () => void;
    children?: React.ReactNode;
    title?: string;
    description?: string;
}

export const ExcelSmartImporter: React.FC<ExcelSmartImporterProps> = ({ fields, onComplete, onClose, children, title, description }) => {
    const [step, setStep] = useState(1);
    const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            setWorkbook(wb);
            
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            if (data.length > 0) {
                const headers = data[0].filter(h => !!h).map(h => String(h));
                setRawHeaders(headers);
                
                // Auto-map based on similar names and common aliases
                const initialMapping: Record<string, string> = {};
                fields.forEach(f => {
                    const match = headers.find(h => {
                        const hLow = h.toLowerCase();
                        const fLabelLow = f.label.toLowerCase();
                        const fKeyLow = f.key.toLowerCase();

                        if (hLow.includes(fLabelLow) || hLow.includes(fKeyLow) || fLabelLow.includes(hLow)) return true;

                        if (f.key === 'secondaryPhone') {
                            return hLow.includes('secondary') || hLow.includes('alt') || hLow.includes('phone 2') || hLow.includes('phone2') || hLow.includes('mobile 2') || hLow.includes('contact 2') || hLow.includes('other phone') || hLow.includes('guardian 2') || hLow.includes('parent 2') || hLow.includes('parent2') || hLow.includes('guardian2');
                        }
                        if (f.key === 'admissionNumber') {
                            return hLow.includes('adm') || hLow.includes('reg') || hLow.includes('student id') || hLow.includes('index');
                        }
                        return false;
                    });
                    if (match) initialMapping[f.key] = match;
                });
                setHeaderMapping(initialMapping);
                setStep(2);
            }
            setIsLoading(false);
        };
        reader.readAsBinaryString(file);
    };

    const processData = () => {
        if (!workbook) return;
        setIsLoading(true);

        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const allData = XLSX.utils.sheet_to_json(ws) as any[];

        const finalData = allData
            .map(row => {
                const obj: any = {};
                fields.forEach(f => {
                    const mappedHeader = headerMapping[f.key];
                    if (mappedHeader) {
                        const val = row[mappedHeader];
                        // Sanitize: ensure no undefined, and stringify if needed
                        obj[f.key] = val !== undefined && val !== null ? String(val).trim() : '';
                    }
                });

                // Validation: Skip if both name and admissionNumber are missing/empty
                const hasName = obj.name && obj.name.trim() !== '';
                const hasAdmNo = obj.admissionNumber && obj.admissionNumber.trim() !== '';
                if (!hasName && !hasAdmNo) return null;

                // Stable ID: If KNEC or UIC exists, use it to allow UPSERT (update existing)
                // Otherwise use a random ID. This prevents "Registry Conflict" on re-imports.
                let baseId = `sch_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`;
                if (obj.knecCode && obj.knecCode.trim()) baseId = `sch_knec_${slugify(obj.knecCode)}`;
                else if (obj.uic && obj.uic.trim()) baseId = `sch_uic_${slugify(obj.uic)}`;
                
                obj.id = baseId;
                
                // Ensure slug uniqueness by appending the short ID
                const hash = baseId.split('_').pop() || '000';
                obj.slug = `${slugify(obj.name || obj.admissionNumber || 'record')}-${hash.substring(0, 5)}`;
                
                obj.createdAt = new Date().toISOString();
                obj.updatedAt = new Date().toISOString();

                return obj;
            })
            .filter(item => item !== null);

        onComplete(finalData);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[4000] flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <FileSpreadsheet className="w-8 h-8" />
                        </div>
                    <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                                {title ? <span className="text-emerald-600 italic">{title}</span> : <>Smart <span className="text-emerald-600 italic">Excel Importer</span></>}
                            </h3>
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">{description || 'Cross-format intelligence mapping tool'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors shadow-sm">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-10 min-h-[400px]">
                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <label className="w-full max-w-lg cursor-pointer group">
                                <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-16 text-center hover:border-emerald-500/30 transition-all bg-slate-50 group-hover:bg-emerald-50/10 active:scale-95">
                                    {isLoading ? (
                                        <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
                                    ) : (
                                        <FileSpreadsheet className="w-16 h-16 text-slate-200 group-hover:text-emerald-400 mx-auto mb-6 transition-colors" />
                                    )}
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Choose Excel File</h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Support: .XLSX, .XLS, .CSV</p>
                                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                                </div>
                            </label>
                            
                            {children && (
                                <div className="w-full max-w-lg mt-6">
                                    {children}
                                </div>
                            )}
                            
                            <div className="mt-12 flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <Check className="w-4 h-4" /> Header Detection
                                </div>
                                <div className="flex items-center gap-2">
                                     Smart Mapping
                                </div>
                                <div className="flex items-center gap-2">
                                     Preview Data
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Mapping */}
                    {step === 2 && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <h4 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white italic">Map Your <span className="text-emerald-600">Columns</span></h4>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">{fileName} • {rawHeaders.length} Columns detected</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {fields.map(f => (
                                    <div key={f.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                        headerMapping[f.key] ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100 shadow-sm'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                headerMapping[f.key] ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                            }`}>
                                                {headerMapping[f.key] ? <CheckCircle2 className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label} {f.required && <span className="text-rose-500">*</span>}</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-white uppercase italic">{f.key}</p>
                                            </div>
                                        </div>
                                        
                                        <select 
                                            value={headerMapping[f.key] || ''}
                                            onChange={(e) => setHeaderMapping({...headerMapping, [f.key]: e.target.value})}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider min-w-[140px] appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">-- No Match --</option>
                                            {rawHeaders.map(rh => <option key={rh} value={rh}>{rh}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                                <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors">Start Over</button>
                                <button 
                                    disabled={!fields.filter(f => f.required).every(f => !!headerMapping[f.key])}
                                    onClick={processData}
                                    className="h-16 px-12 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-emerald-500/20 hover:bg-slate-900 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-30"
                                >
                                    Proceed to Import <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

