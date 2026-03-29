import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CoopCollection, CoopFarmer, Institution, User } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { analyzeCollectionSpreadsheet } from '../../services/geminiService';
import { XIcon as X } from '../icons/XIcon';
import { ArrowUpTrayIcon as UploadCloud } from '../icons/ArrowUpTrayIcon';
import { DocumentTextIcon as FileSpreadsheet } from '../icons/DocumentTextIcon';
import { ChevronRightIcon as ChevronRight } from '../icons/ChevronRightIcon';
import { DownloadIcon as Download } from '../icons/DownloadIcon';
import { CalendarDaysIcon as Calendar } from '../icons/CalendarDaysIcon';
import { ScaleIcon as Scale } from '../icons/ScaleIcon';
import { ExclamationTriangleIcon as AlertTriangle } from '../icons/ExclamationTriangleIcon';
import { InformationCircleIcon as AlertCircle } from '../icons/InformationCircleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { UserIcon as UserIconAlt } from '../icons/UserIcon';


type CollectionMappingField = 'farmerName' | 'farmerAccountNumber' | 'farmerPhoneNumber' | 'farmerMemberId' | 'collectionDate' | 'productType' | 'quantity' | 'unit' | 'qualityGrade';

const REQUIRED_FIELDS: CollectionMappingField[] = ['quantity', 'unit', 'productType', 'collectionDate', 'farmerMemberId'];
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
    isAutoConfirm?: boolean;
}

export const SmartCollectionImporterModal: React.FC<SmartCollectionImporterModalProps> = ({
    onClose,
    onImport,
    farmers,
    currentInstitution,
    currentUser,
    isAutoConfirm = false
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
    const [autoConfirm, setAutoConfirm] = useState(isAutoConfirm);

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

                const headers = jsonHeaders[0].map((h: any) => String(h || '').trim()).filter((h: any) => h !== '');
                setFileHeaders(headers);

                // Get all rows, then slice to skip header row
                const allData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const rows = allData.slice(1);
                
                // Convert array rows to objects using trimmed headers
                const jsonData = rows.map(row => {
                    const obj: any = {};
                    headers.forEach((h: string, i: number) => {
                        obj[h] = row[i];
                    });
                    return obj;
                });
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

    const formatDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const parseUniversalDate = (s: string): Date | null => {
        if (!s) return null;
        
        // Clean the string
        const clean = s.trim();
        if (!clean) return null;

        // Try standard JS parsing first
        let d = new Date(clean);
        if (!isNaN(d.getTime())) {
            // Check if it's potentially dd/mm/yyyy interpreted as mm/dd/yyyy
            // If the day part is > 12, standard JS might fail or flip it.
            // But usually standard JS only accepts ISO or US formats.
        }

        // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (dmy) {
            const day = parseInt(dmy[1]);
            const month = parseInt(dmy[2]) - 1;
            const year = parseInt(dmy[3]);
            const testD = new Date(year, month, day);
            if (!isNaN(testD.getTime())) return testD;
        }

        // Try YYYY/MM/DD or YYYY-MM-DD
        const ymd = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (ymd) {
            const year = parseInt(ymd[1]);
            const month = parseInt(ymd[2]) - 1;
            const day = parseInt(ymd[3]);
            const testD = new Date(year, month, day);
            if (!isNaN(testD.getTime())) return testD;
        }

        return !isNaN(d.getTime()) ? d : null;
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
                collectionDate: '',
                recordedBy: currentUser.id,
                notified: false,
                factoryConfirmed: autoConfirm,
                finalQuantity: autoConfirm ? Number(row[fieldMapping.quantity as string]) : undefined,
                _estimatedPayout: 0
            };

            const rate = currentInstitution.coopSettings?.payoutRate || 50;

            // Resolve Farmer
            let farmerId: string | undefined;
            const mName = fieldMapping.farmerName ? String(row[fieldMapping.farmerName as string] || '').trim().toLowerCase() : null;
            const mAcc = fieldMapping.farmerAccountNumber ? String(row[fieldMapping.farmerAccountNumber as string] || '').trim().toLowerCase() : null;
            const mPhone = fieldMapping.farmerPhoneNumber ? String(row[fieldMapping.farmerPhoneNumber as string] || '').trim().toLowerCase() : null;
            const mMemberId = fieldMapping.farmerMemberId ? String(row[fieldMapping.farmerMemberId as string] || '').trim().toLowerCase() : null;

            if (mMemberId && farmersByMemberId.has(mMemberId)) {
                farmerId = farmersByMemberId.get(mMemberId);
            } else if (mMemberId) {
                errors.push(`Member ID "${mMemberId}" not found`);
            } else {
                errors.push("Member ID is missing");
            }

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
                parsed._estimatedPayout = parsed.quantity * rate;
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
            const mDateKey = fieldMapping.collectionDate;
            const mDate = mDateKey ? row[mDateKey] : null;
            
            if (mDate !== null && mDate !== undefined && String(mDate).trim() !== '') {
                // Handle Date objects (from cellDates: true), Excel date serials, or strings
                let d: Date | null = null;
                
                if (mDate instanceof Date) {
                    d = mDate;
                } else if (typeof mDate === 'number') {
                    // Excel serial date conversion (25569 is Jan 1, 1970)
                    // If the number is too small (e.g. 1-100), it might be a day of the month error, 
                    // but usually Excel serials for 2024 are ~45000
                    d = new Date((mDate - 25569) * 86400 * 1000);
                } else {
                    // Try parsing as string with universal detection
                    d = parseUniversalDate(String(mDate));
                }
                
                if (d && !isNaN(d.getTime())) {
                    parsed.collectionDate = formatDateString(d);
                } else {
                    // Critical failure to parse mapped date
                    errors.push("Invalid Date Format");
                    parsed.collectionDate = formatDateString(new Date());
                }
            } else {
                // Date is required but missing
                errors.push("Date is missing");
                parsed.collectionDate = formatDateString(new Date());
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
                            
                            <label className="relative group block">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center cursor-pointer bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group overflow-hidden">
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
                                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                        <UploadCloud className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Drop your manifest here</h3>
                                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Excel or CSV manifests up to 10MB</p>
                                    
                                    <div className="mt-8 flex items-center gap-4">
                                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">Fast Analysis</div>
                                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">AI Mapping</div>
                                    </div>
                                </div>
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
                                            checked={autoConfirm}
                                            onChange={(e) => setAutoConfirm(e.target.checked)}
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
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Est. Payout</th>
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
                                                <td className="p-4 text-sm font-black text-slate-900 dark:text-white">
                                                    {(row.parsedData as any)._estimatedPayout ? `KES ${(row.parsedData as any)._estimatedPayout.toLocaleString()}` : '-'}
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
