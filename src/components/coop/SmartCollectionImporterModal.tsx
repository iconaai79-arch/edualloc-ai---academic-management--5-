import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CoopCollection, CoopFarmer, Institution, User } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { analyzeCollectionSpreadsheet } from '../../services/geminiService';
import { 
    X, 
    UploadCloud, 
    FileSpreadsheet, 
    ChevronRight, 
    Download,
    Calendar,
    Scale,
    AlertTriangle,
    AlertCircle
} from 'lucide-react';
import { CircleCheckIcon, UserIcon as UserIconAlt } from '../icons';

type CollectionMappingField = 'farmerName' | 'farmerAccountNumber' | 'farmerPhoneNumber' | 'farmerMemberId' | 'collectionDate' | 'productType' | 'quantity' | 'unit' | 'qualityGrade';

const REQUIRED_FIELDS: CollectionMappingField[] = ['quantity', 'unit', 'productType', 'collectionDate'];
const ALL_MAPPING_FIELDS: CollectionMappingField[] = [
    'farmerName', 'farmerAccountNumber', 'farmerPhoneNumber', 'farmerMemberId', 'collectionDate', 'productType', 'quantity', 'unit', 'qualityGrade'
];

interface CollectionImportPreview {
    parsedData: Partial<CoopCollection> & { farmerSearch?: string };
    rawRow: any;
    isValid: boolean;
    errors: string[];
}

interface SmartCollectionImporterModalProps {
    onClose: () => void;
    onImport: (collections: Partial<CoopCollection>[]) => Promise<void>;
    farmers: CoopFarmer[];
    currentInstitution: Institution;
    currentUser: User;
}

export const SmartCollectionImporterModal: React.FC<SmartCollectionImporterModalProps> = ({
    onClose,
    onImport,
    farmers,
    currentInstitution,
    currentUser
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<CollectionMappingField, string | null>>(
        ALL_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CollectionMappingField, string | null>)
    );
    const [previewData, setPreviewData] = useState<{ valid: CollectionImportPreview[], invalid: CollectionImportPreview[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);
    const [isAutoConfirm, setIsAutoConfirm] = useState(false);

    const farmersByName = useMemo(() => new Map(farmers.map(f => [f.name.toLowerCase().trim(), f.id])), [farmers]);
    const farmersByAcc = useMemo(() => new Map(farmers.map(f => [String(f.accountNumber || '').toLowerCase().trim(), f.id])), [farmers]);
    const farmersByPhone = useMemo(() => new Map(farmers.map(f => [String(f.phone || '').toLowerCase().trim(), f.id])), [farmers]);
    const farmersByMemberId = useMemo(() => new Map(farmers.filter(f => f.memberId).map(f => [String(f.memberId).toLowerCase().trim(), f.id])), [farmers]);

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing'); 
        setErrorMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty or has no headers.");

                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                // Use AI mapping
                const mapping = await analyzeCollectionSpreadsheet(headers);
                setFieldMapping(mapping as Record<CollectionMappingField, string | null>);
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to parse the file.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: CollectionMappingField, value: string | null) => {
        setFieldMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmMapping = () => {
        // Check if at least one farmer identifer is mapped
        if (!fieldMapping.farmerName && !fieldMapping.farmerAccountNumber && !fieldMapping.farmerPhoneNumber && !fieldMapping.farmerMemberId) {
            alert("Please map at least one farmer identifier (Name, Account Number, Phone, or Member ID).");
            return;
        }

        const missingRequired = REQUIRED_FIELDS.filter(f => !fieldMapping[f]);
        if (missingRequired.length > 0) {
            alert(`Please map all required fields: ${missingRequired.join(', ')}`);
            return;
        }

        const valid: CollectionImportPreview[] = [];
        const invalid: CollectionImportPreview[] = [];

        rawData.forEach((row, index) => {
            const errors: string[] = [];
            const parsed: any = {
                id: generateId('coll'),
                institutionId: currentInstitution.id,
                status: 'pending',
                collectionDate: new Date().toISOString(),
                recordedBy: currentUser.id,
                notified: false,
                factoryConfirmed: isAutoConfirm,
                finalQuantity: isAutoConfirm ? Number(row[fieldMapping.quantity as string]) : undefined
            };

            // Resolve Farmer
            let farmerId: string | undefined;
            const mName = fieldMapping.farmerName ? String(row[fieldMapping.farmerName as string] || '').trim().toLowerCase() : null;
            const mAcc = fieldMapping.farmerAccountNumber ? String(row[fieldMapping.farmerAccountNumber as string] || '').trim().toLowerCase() : null;
            const mPhone = fieldMapping.farmerPhoneNumber ? String(row[fieldMapping.farmerPhoneNumber as string] || '').trim().toLowerCase() : null;
            const mMemberId = fieldMapping.farmerMemberId ? String(row[fieldMapping.farmerMemberId as string] || '').trim().toLowerCase() : null;

            if (mMemberId && farmersByMemberId.has(mMemberId)) farmerId = farmersByMemberId.get(mMemberId);
            else if (mAcc && farmersByAcc.has(mAcc)) farmerId = farmersByAcc.get(mAcc);
            else if (mPhone && farmersByPhone.has(mPhone)) farmerId = farmersByPhone.get(mPhone);
            else if (mName && farmersByName.has(mName)) farmerId = farmersByName.get(mName);

            if (!farmerId) {
                errors.push("Farmer not found");
                parsed.farmerSearch = mAcc || mPhone || mName || 'Unknown';
            } else {
                parsed.farmerId = farmerId;
                const fRaw = farmers.find(f => f.id === farmerId);
                parsed.farmerSearch = fRaw?.name || 'Found';
            }

            // Quantity
            const mQty = fieldMapping.quantity ? row[fieldMapping.quantity] : null;
            if (mQty === null || mQty === undefined || isNaN(Number(mQty))) {
                errors.push("Invalid Quantity");
            } else {
                parsed.quantity = Number(mQty);
            }

            // Unit
            const mUnit = fieldMapping.unit ? String(row[fieldMapping.unit]).trim().toLowerCase() : 'kgs';
            parsed.unit = mUnit;

            // Product Type
            const mProduct = fieldMapping.productType ? String(row[fieldMapping.productType]).trim().toLowerCase() : 'milk';
            if (['milk', 'tea', 'coffee', 'other'].includes(mProduct)) {
                parsed.productType = mProduct as any;
            } else {
                parsed.productType = 'other';
            }

            // Date
            const mDate = fieldMapping.collectionDate ? row[fieldMapping.collectionDate] : null;
            if (mDate) {
                // Handle Date objects (from cellDates: true), Excel date serials, or strings
                let d: Date | null = null;
                if (mDate instanceof Date) {
                    d = mDate;
                } else if (typeof mDate === 'number') {
                    // Excel serial date conversion (25569 is Jan 1, 1970)
                    d = new Date((mDate - 25569) * 86400 * 1000);
                } else if (typeof mDate === 'string' && mDate.trim().length > 0) {
                    d = new Date(mDate);
                }
                
                if (d && !isNaN(d.getTime())) {
                    parsed.collectionDate = d.toISOString().split('T')[0];
                } else {
                    parsed.collectionDate = new Date().toISOString().split('T')[0];
                }
            } else {
                parsed.collectionDate = new Date().toISOString().split('T')[0];
            }

            // Optional
            if (fieldMapping.qualityGrade && row[fieldMapping.qualityGrade]) {
                parsed.qualityGrade = String(row[fieldMapping.qualityGrade]).trim();
            }

            const isRowValid = errors.length === 0;
            const previewObj: CollectionImportPreview = {
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
            const collectionsToImport = previewData.valid.map(v => {
                const { farmerSearch, ...clean } = v.parsedData;
                return clean;
            });
            
            const chunkSize = 50;
            const chunks = [];
            for (let i = 0; i < collectionsToImport.length; i += chunkSize) {
                chunks.push(collectionsToImport.slice(i, i + chunkSize));
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
            ['Farmer Acc No', 'Farmer Name', 'Date', 'Product', 'Quantity', 'Unit', 'Grade'],
            ['ACC001', 'John Doe', '2024-03-22', 'milk', '15.5', 'liters', 'A']
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Intake_Log_Template.xlsx");
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
                            Smart Intake Importer
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Bulk Record Daily Produce Intake
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
                                    Upload an Excel (.xlsx) file containing daily intake records.
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
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs"><UserIconAlt className="w-4 h-4" /></div>
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
                                    <CircleCheckIcon className="w-4 h-4" /> Review Column Mapping
                                </h3>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                                    Map your file columns to the intake fields. At least one farmer identifier is required.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={isAutoConfirm}
                                            onChange={(e) => setIsAutoConfirm(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-emerald-500 transition-colors shadow-inner"></div>
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Auto-confirm on Import</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Skip manual confirmation for these records</p>
                                    </div>
                                </label>
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
                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                        <CircleCheckIcon className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{previewData.valid.length} Valid</span>
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
                                        Import {previewData.valid.length} Collections <CircleCheckIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 rounded-2xl mt-4 border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500"><UserIconAlt className="w-3 h-3 inline mr-1"/> Farmer</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500"><Calendar className="w-3 h-3 inline mr-1"/> Date</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500"><Scale className="w-3 h-3 inline mr-1"/> Qty</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Issues</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...previewData.invalid.slice(0, 50), ...previewData.valid.slice(0, 50)].map((row, idx) => (
                                            <tr key={idx} className={`border-b border-slate-100 dark:border-slate-800/50 ${!row.isValid ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                <td className="p-4">
                                                    {row.isValid
                                                        ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-[6px] text-xs font-bold uppercase flex items-center gap-1 w-max"><CircleCheckIcon className="w-3 h-3"/> OK</span>
                                                        : <span className="bg-red-100 text-red-700 px-2 py-1 rounded-[6px] text-xs font-bold uppercase flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Error</span>
                                                    }
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{row.parsedData.farmerSearch || '-'}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">{row.parsedData.productType}</p>
                                                </td>
                                                <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                    {row.parsedData.collectionDate}
                                                </td>
                                                <td className="p-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                    {row.parsedData.quantity} <span className="text-[10px] text-slate-400 font-normal uppercase">{row.parsedData.unit}</span>
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
                                Saving Intake Logs
                            </h3>
                            <p className="text-sm text-slate-500">Syncing produce records to database...</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <CircleCheckIcon className="w-12 h-12 text-emerald-600 mb-4" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Import Complete!</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-sm">
                                Successfully recorded {previewData?.valid.length} intake logs. 
                            </p>
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition-colors uppercase tracking-wider shadow-xl mt-4"
                            >
                                Finish & View Logs
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
