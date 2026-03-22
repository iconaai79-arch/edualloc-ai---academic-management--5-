import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CoopFarmer, Institution, User } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { 
    X, 
    UploadCloud, 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertCircle, 
    ChevronRight, 
    Search,
    Download
} from 'lucide-react';

type FarmerMappingField = 'name' | 'phone' | 'email' | 'accountNumber' | 'kraPin' | 'nationalId' | 'location';
const REQUIRED_FIELDS: FarmerMappingField[] = ['name', 'phone'];
const ALL_MAPPING_FIELDS: FarmerMappingField[] = [
    'name', 'phone', 'email', 'accountNumber', 'kraPin', 'nationalId', 'location'
];

interface FarmerImportPreview {
    parsedData: Partial<CoopFarmer>;
    rawRow: any;
    isValid: boolean;
    errors: string[];
}

interface SmartFarmerImporterModalProps {
    onClose: () => void;
    onImport: (farmers: Partial<CoopFarmer>[]) => Promise<void>;
    existingFarmers: CoopFarmer[];
    currentInstitution: Institution;
    currentUser: User;
}

export const SmartFarmerImporterModal: React.FC<SmartFarmerImporterModalProps> = ({
    onClose,
    onImport,
    existingFarmers,
    currentInstitution,
    currentUser
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<FarmerMappingField, string | null>>(
        ALL_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<FarmerMappingField, string | null>)
    );
    const [previewData, setPreviewData] = useState<{ valid: FarmerImportPreview[], invalid: FarmerImportPreview[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const existingPhones = useMemo(() => new Set(existingFarmers.map(f => String(f.phone).trim())), [existingFarmers]);
    const existingIds = useMemo(() => new Set(existingFarmers.filter(f => f.nationalId).map(f => String(f.nationalId).trim())), [existingFarmers]);

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing'); // Temporary state while parsing
        setErrorMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty or has no headers.");

                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                // Auto-map logic
                const autoMap = { ...fieldMapping };
                headers.forEach((header: string) => {
                    const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (h.includes('name') || h === 'farmer' || h === 'fullnames') autoMap.name = header;
                    else if (h.includes('phone') || h.includes('mobile') || h.includes('contact')) autoMap.phone = header;
                    else if (h.includes('email') || h.includes('mail')) autoMap.email = header;
                    else if (h.includes('account') || h.includes('accno') || h.includes('bank')) autoMap.accountNumber = header;
                    else if (h.includes('kra') || h.includes('pin')) autoMap.kraPin = header;
                    else if (h.includes('nationalid') || h.includes('idno') || h.includes('idnumber')) autoMap.nationalId = header;
                    else if (h.includes('location') || h.includes('area') || h.includes('village')) autoMap.location = header;
                });

                setFieldMapping(autoMap);
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to parse the file.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: FarmerMappingField, value: string | null) => {
        setFieldMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmMapping = () => {
        const missingRequired = REQUIRED_FIELDS.filter(f => !fieldMapping[f]);
        if (missingRequired.length > 0) {
            alert(`Please map all required fields: ${missingRequired.join(', ')}`);
            return;
        }

        const valid: FarmerImportPreview[] = [];
        const invalid: FarmerImportPreview[] = [];

        rawData.forEach((row, index) => {
            const errors: string[] = [];
            const parsed: Partial<CoopFarmer> = {
                id: generateId('farmer'),
                institutionId: currentInstitution.id,
                status: 'active',
                joinedAt: new Date().toISOString()
            };

            // Name
            const mapName = fieldMapping.name ? row[fieldMapping.name] : null;
            if (!mapName || String(mapName).trim() === '') {
                errors.push("Missing Name");
            } else {
                parsed.name = String(mapName).trim();
            }

            // Phone
            const mapPhone = fieldMapping.phone ? row[fieldMapping.phone] : null;
            if (!mapPhone || String(mapPhone).trim() === '') {
                errors.push("Missing Phone");
            } else {
                const phoneStr = String(mapPhone).trim().replace(/[^0-9+\- ]/g, '');
                if (existingPhones.has(phoneStr)) {
                    errors.push("Duplicate Phone Number");
                }
                parsed.phone = phoneStr;
            }

            // Optional Fields
            if (fieldMapping.email && row[fieldMapping.email]) parsed.email = String(row[fieldMapping.email]).trim();
            if (fieldMapping.accountNumber && row[fieldMapping.accountNumber]) parsed.accountNumber = String(row[fieldMapping.accountNumber]).trim();
            if (fieldMapping.location && row[fieldMapping.location]) parsed.location = String(row[fieldMapping.location]).trim();
            if (fieldMapping.kraPin && row[fieldMapping.kraPin]) parsed.kraPin = String(row[fieldMapping.kraPin]).trim();
            
            if (fieldMapping.nationalId && row[fieldMapping.nationalId]) {
                const idStr = String(row[fieldMapping.nationalId]).trim();
                if (existingIds.has(idStr)) {
                    errors.push("Duplicate National ID");
                }
                parsed.nationalId = idStr;
            }

            const isRowValid = errors.length === 0;
            const previewObj: FarmerImportPreview = {
                parsedData: parsed,
                rawRow: row,
                isValid: isRowValid,
                errors
            };

            if (isRowValid) valid.push(previewObj);
            else invalid.push(previewObj);
        });

        setPreviewData({ valid, invalid });
        setStep('preview');
    };

    const executeImport = async () => {
        if (!previewData || previewData.valid.length === 0) return;
        setStep('importing');
        setImportProgress(0);

        try {
            const farmersToImport = previewData.valid.map(v => v.parsedData);
            
            // For UI feedback, chunk if many
            const chunkSize = 50;
            const chunks = [];
            for (let i = 0; i < farmersToImport.length; i += chunkSize) {
                chunks.push(farmersToImport.slice(i, i + chunkSize));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                await onImport(chunk);
                setImportProgress(Math.round(((i + 1) / chunks.length) * 100));
            }
            
            setStep('success');
        } catch (error: any) {
            setErrorMessage(error.message || "An error occurred during import.");
            setStep('error');
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Full Name', 'Phone Number', 'National ID', 'KRA PIN', 'Account Number', 'Location', 'Email'],
            ['John Doe', '0712345678', '12345678', 'A123456789Z', '011000000000', 'Nairobi Central', 'john@example.com']
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Farmer_Import_Template.xlsx");
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 font-sans">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <FileSpreadsheet className="w-4 h-4" />
                            </span>
                            Smart Farmer Importer
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Bulk Onboard Cooperative Members
                        </p>
                    </div>
                    {(step !== 'importing') && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Upload an Excel (.xlsx) or CSV file containing your farmer records. 
                                </p>
                                <button 
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-xs font-bold uppercase tracking-wider bg-indigo-50 px-4 py-2 rounded-xl"
                                >
                                    <Download className="w-4 h-4" /> Template
                                </button>
                            </div>
                            
                            <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileSelect(e.target.files[0]);
                                        }
                                    }} 
                                />
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Click or Drag file to upload</h3>
                                <p className="text-sm text-slate-500">Supports .xlsx, .xls, .csv up to 10MB</p>
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Review Column Mapping
                                </h3>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                                    We analyzed your file and attempted to automatically map the columns. Please review and adjust below.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ALL_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                                {field.replace(/([A-Z])/g, ' $1').trim()}
                                                {REQUIRED_FIELDS.includes(field) && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Required</span>}
                                            </p>
                                        </div>
                                        <div className="flex-1 text-right">
                                            <select
                                                className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 w-full max-w-[200px] outline-none focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-300"
                                                value={fieldMapping[field] || ''}
                                                onChange={(e) => handleMappingChange(field, e.target.value || null)}
                                            >
                                                <option value="">-- Ignored --</option>
                                                {fileHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-4 gap-4">
                                <button onClick={() => setStep('upload')} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors uppercase text-xs tracking-wider">
                                    Back
                                </button>
                                <button onClick={handleConfirmMapping} className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/30">
                                    Proceed to Preview <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && previewData && (
                        <div className="space-y-6 animate-fade-in flex flex-col h-full">
                            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex gap-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-emerald-600">{previewData.valid.length}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valid Records</p>
                                    </div>
                                    <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-red-500">{previewData.invalid.length}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Errors</p>
                                    </div>
                                    <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-slate-700 dark:text-white">{rawData.length}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rows</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setStep('mapping')} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors uppercase text-xs tracking-wider">
                                        Edit Mapping
                                    </button>
                                    <button 
                                        onClick={executeImport} 
                                        disabled={previewData.valid.length === 0}
                                        className="px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                                    >
                                        Import {previewData.valid.length} Farmers <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 rounded-2xl mt-4 border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Name</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Phone</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">A/C Number</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">ID / KRA</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Issues</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Display Invalid first, then Valid, capped for performance if too many */}
                                        {[...previewData.invalid.slice(0, 50), ...previewData.valid.slice(0, 50)].map((row, idx) => (
                                            <tr key={idx} className={`border-b border-slate-100 dark:border-slate-800/50 ${!row.isValid ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                <td className="p-4">
                                                    {row.isValid 
                                                        ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-[6px] text-xs font-bold uppercase flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> OK</span>
                                                        : <span className="bg-red-100 text-red-700 px-2 py-1 rounded-[6px] text-xs font-bold uppercase flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Error</span>
                                                    }
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{row.parsedData.name || '-'}</p>
                                                    <p className="text-xs text-slate-500">{row.parsedData.location || '-'}</p>
                                                </td>
                                                <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                    {row.parsedData.phone || '-'}
                                                </td>
                                                <td className="p-4 text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tighter uppercase">
                                                    {row.parsedData.accountNumber || '-'}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                                    <p>{row.parsedData.nationalId || '-'}</p>
                                                    <p className="text-xs text-slate-500">{row.parsedData.kraPin || '-'}</p>
                                                </td>
                                                <td className="p-4">
                                                    {!row.isValid ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.errors.map((e, i) => (
                                                                <span key={i} className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{e}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.valid.length + previewData.invalid.length > 100 && (
                                    <div className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 dark:bg-slate-800/20">
                                        Showing first 100 preview rows
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/40 rounded-full flex items-center justify-center relative">
                                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-800 rounded-full"></div>
                                <div 
                                    className="absolute inset-0 border-4 border-indigo-600 rounded-full"
                                    style={{ clipPath: `inset(${100 - importProgress}% 0 0 0)` }}
                                ></div>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{importProgress}%</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                Importing Farmers
                            </h3>
                            <p className="text-sm text-slate-500">Please do not close this window...</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Import Complete!</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-sm">
                                Successfully onboarded {previewData?.valid.length} cooperative farmers. 
                            </p>
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition-colors uppercase tracking-wider shadow-xl mt-4"
                            >
                                Finish & View Farmers
                            </button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-12 h-12 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Import Failed</h3>
                            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 px-6 py-4 rounded-xl border border-red-100 dark:border-red-900 text-center max-w-md">
                                {errorMessage}
                            </p>
                            <div className="flex gap-4">
                                <button onClick={() => setStep('upload')} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors uppercase tracking-wider">
                                    Try Again
                                </button>
                                <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
