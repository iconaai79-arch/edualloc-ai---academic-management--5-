
import React, { useState } from 'react';
import type { InstitutionRegistrationData } from '../types';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { analyzeInstitutionSpreadsheet } from '../services/geminiService';

import * as XLSX from 'xlsx';

type InstitutionMappingField = 'name' | 'email' | 'phoneNumber' | 'institutionType' | 'institutionCategory' | 'adminName' | 'adminEmail' | 'subCounty' | 'constituency' | 'ward';
const ALL_INSTITUTION_MAPPING_FIELDS: InstitutionMappingField[] = ['name', 'email', 'phoneNumber', 'institutionType', 'institutionCategory', 'adminName', 'adminEmail', 'subCounty', 'constituency', 'ward'];
const REQUIRED_INSTITUTION_MAPPING_FIELDS: InstitutionMappingField[] = ['name', 'email', 'adminEmail'];

const FIELD_LABELS: Record<InstitutionMappingField, string> = {
    name: 'School Name',
    email: 'School Email',
    phoneNumber: 'Phone Number',
    institutionType: 'Institution Group / Type',
    institutionCategory: 'Institution Category',
    adminName: 'Admin Name',
    adminEmail: 'Admin Email',
    subCounty: 'Sub-County',
    constituency: 'Constituency',
    ward: 'Ward',
};

interface SmartInstitutionImporterModalProps {
    onClose: () => void;
    onImport: (institutions: InstitutionRegistrationData[]) => Promise<void>;
    aiModelTier?: string;
    countyId: string;
}

export const SmartInstitutionImporterModal: React.FC<SmartInstitutionImporterModalProps> = ({
    onClose, onImport, aiModelTier, countyId
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<InstitutionMappingField, string | null>>(
        ALL_INSTITUTION_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<InstitutionMappingField, string | null>)
    );
    const [parsedData, setParsedData] = useState<{ valid: (InstitutionRegistrationData & { category?: string; businessSubType?: string })[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing'); // Show loading while analyzing
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

                const mapping = await analyzeInstitutionSpreadsheet(headers, aiModelTier);

                // Convert mapping to our specific fields
                const initialMapping: any = {};
                Object.keys(mapping).forEach(key => {
                    if (ALL_INSTITUTION_MAPPING_FIELDS.includes(key as any)) {
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

    const handleMappingChange = (field: InstitutionMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev!, [field]: value }));
    };

    const normalizeInstitutionType = (raw: string): string => {
        const t = raw.toLowerCase();
        if (t.includes('education') || t.includes('school') || t.includes('primary') || t.includes('secondary') || t.includes('university') || t.includes('college')) return 'Education';
        if (t.includes('his') || t.includes('health') || t.includes('hospital') || t.includes('clinic') || t.includes('medical')) return 'HIS';
        if (t.includes('pharmacy') || t.includes('chemist')) return 'Pharmacy';
        if (t.includes('business')) return 'Business';
        if (t.includes('coop') || t.includes('agri') || t.includes('dairy') || t.includes('tea') || t.includes('coffee')) return 'Cooperative';
        if (t.includes('sacco') || t.includes('financial') || t.includes('finance')) return 'SACCO';
        if (t.includes('law') || t.includes('legal')) return 'Law Firm';
        if (t.includes('logistics') || t.includes('transport')) return 'Logistics';
        if (t.includes('community') || t.includes('politics')) return 'Community';
        if (t.includes('church') || t.includes('religious') || t.includes('faith')) return 'Church';
        if (t.includes('broadcaster') || t.includes('media') || t.includes('radio') || t.includes('tv')) return 'Broadcaster';
        if (t.includes('hospitality') || t.includes('tourism') || t.includes('hotel')) return 'Hospitality';
        if (t.includes('reseller')) return 'Reseller';
        return 'Education';
    };

    const normalizeCategory = (raw: string, institutionType: string): string => {
        if (!raw) {
            // Auto-derive default based on type
            if (institutionType === 'Education') return 'Primary';
            if (institutionType === 'HIS') return 'Hospital/Clinic';
            if (institutionType === 'Business') return 'Agrovet';
            if (institutionType === 'Law Firm') return 'Law Firm';
            if (institutionType === 'Broadcaster') return 'TV/Radio Station';
            if (institutionType === 'Logistics') return 'Cargo & Delivery';
            if (institutionType === 'Hospitality') return 'Hotel & Accommodation';
            return '';
        }
        const c = raw.toLowerCase();
        // Education categories
        if (c.includes('kindergarten') || c.includes('playgroup')) return 'Kindergarten';
        if (c.includes('ecd')) return 'ECD';
        if (c.includes('primary')) return 'Primary';
        if (c.includes('secondary')) return 'Secondary';
        if (c.includes('international')) return 'International';
        if (c.includes('tvet') || c.includes('vocational')) return 'TVET';
        if (c.includes('polytechnic')) return 'Polytechnic';
        if (c.includes('driving')) return 'Driving School';
        if (c.includes('institute')) return 'Institute';
        if (c.includes('college')) return 'College';
        if (c.includes('university')) return 'University';
        // Health categories
        if (c.includes('hospital') || c.includes('clinic')) return 'Hospital/Clinic';
        if (c.includes('dental')) return 'Dental';
        if (c.includes('eye') || c.includes('ophthal')) return 'Eye';
        if (c.includes('ent') || c.includes('ear')) return 'Ear';
        // Business categories
        if (c.includes('agrovet') || c.includes('agro')) return 'Agrovet';
        if (c.includes('carwash') || c.includes('car wash')) return 'Car Wash';
        if (c.includes('fuel') || c.includes('petrol') || c.includes('station')) return 'Fuel Station';
        if (c.includes('retail') || c.includes('shop') || c.includes('supermarket')) return 'Retail Shop';
        return raw.trim();
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_INSTITUTION_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => FIELD_LABELS[f] || f).join(', ')}.`);
            return;
        }

        const validInstitutions: (InstitutionRegistrationData & { category?: string; businessSubType?: string })[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        (rawData || []).forEach((row, index) => {
            try {
                const name = row[userMapping.name!];
                const email = row[userMapping.email!];
                const adminEmail = row[userMapping.adminEmail!];

                if (!name || !email || !adminEmail) {
                    throw new Error("Missing required fields (Name, Email, or Admin Email).");
                }

                // Optional fields
                const phoneNumber = userMapping.phoneNumber ? String(row[userMapping.phoneNumber] || '') : '';
                const institutionTypeRaw = userMapping.institutionType ? String(row[userMapping.institutionType] || 'Education') : 'Education';
                const institutionCategoryRaw = userMapping.institutionCategory ? String(row[userMapping.institutionCategory] || '') : '';
                const adminName = userMapping.adminName ? String(row[userMapping.adminName] || '') : '';
                const subCounty = userMapping.subCounty ? String(row[userMapping.subCounty] || '') : '';
                const constituency = userMapping.constituency ? String(row[userMapping.constituency] || '') : '';
                const ward = userMapping.ward ? String(row[userMapping.ward] || '') : '';

                const finalType = normalizeInstitutionType(institutionTypeRaw);
                const finalCategory = normalizeCategory(institutionCategoryRaw, finalType);

                validInstitutions.push({
                    name: String(name).trim(),
                    institutionName: String(name).trim(),
                    email: String(email).trim(),
                    institutionEmail: String(email).trim(),
                    phoneNumber,
                    institutionPhone: phoneNumber,
                    institutionType: finalType as any,
                    category: finalCategory,
                    businessSubType: finalCategory,
                    adminName: adminName || 'Administrator',
                    adminEmail: String(adminEmail).trim(),
                    loadDemoData: false,
                    countyId,
                    subCounty: subCounty.trim(),
                    constituency: constituency.trim(),
                    ward: ward.trim(),
                    termsAccepted: true
                });

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ valid: validInstitutions, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;
        setStep('finalizing');
        setImportProgress(0);

        try {
            await onImport(parsedData.valid);
            setImportProgress(100);
            setStep('success');
        } catch (err: any) {
            console.error("Import failure:", err);
            setErrorMessage(err.message || "Failed to save data.");
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-black uppercase tracking-tight">Bulk School Importer</h3>
                    {step !== 'finalizing' && <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>}
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/20">
                            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h4 className="text-lg font-bold mb-2">Upload Excel Spreadsheet</h4>
                            <p className="text-sm text-slate-500 mb-2">Select an Excel (.xlsx) file with school names, emails, and admin details.</p>
                            <p className="text-xs text-slate-400 mb-8">Supported columns: <span className="font-semibold text-slate-500">Name, Email, Phone, Type, <span className="text-indigo-500">Category</span>, Admin Name, Admin Email, Sub-County, Constituency, Ward</span></p>
                            <label className="btn-primary cursor-pointer px-10 py-3 inline-block shadow-lg shadow-indigo-100">
                                Select File
                                <input type="file" onChange={e => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="w-6 h-6 text-indigo-500" />
                                <h4 className="font-bold text-lg">Map Your Data Columns</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ALL_INSTITUTION_MAPPING_FIELDS.map(field => (
                                    <div key={field} className={`flex flex-col gap-2 p-4 rounded-2xl border ${field === 'institutionCategory' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'}`}>
                                        <label className={`text-sm font-bold ${field === 'institutionCategory' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {FIELD_LABELS[field]} {REQUIRED_INSTITUTION_MAPPING_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                            {field === 'institutionCategory' && <span className="ml-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">New</span>}
                                        </label>
                                        {field === 'institutionCategory' && (
                                            <p className="text-[10px] text-indigo-400 leading-tight">e.g. Primary, Secondary, University, Hospital/Clinic, College, TVET…</p>
                                        )}
                                        <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="form-select">
                                            <option value="">-- Choose Header --</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleConfirmMapping} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Review Import</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h4 className="font-black text-xl tracking-tight">Ready to Import ({parsedData?.valid.length})</h4>

                            {parsedData?.invalid && parsedData.invalid.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl text-xs text-red-600 mb-4">
                                    <p className="font-bold">{parsedData.invalid.length} rows will be skipped due to errors.</p>
                                </div>
                            )}

                            <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-2xl">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">School Name</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Type</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-indigo-500 tracking-widest">Category</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Admin Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData?.valid.slice(0, 8).map((v, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                                <td className="px-6 py-3 text-sm font-bold">{v.name}</td>
                                                <td className="px-6 py-3 text-sm text-slate-500">{v.institutionType}</td>
                                                <td className="px-6 py-3 text-sm">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
                                                        {(v as any).category || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-indigo-600 font-medium">{v.adminEmail}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(parsedData?.valid.length ?? 0) > 8 && (
                                    <div className="px-6 py-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/30 text-center">
                                        …and {(parsedData?.valid.length ?? 0) - 8} more rows
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button onClick={() => setStep('mapping')} className="btn-secondary h-12 px-8">Back to Mapping</button>
                                <button onClick={handleFinalImport} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Commit to Database</button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Analyzing Headers...</h4>
                            <p className="text-sm text-slate-500">Our AI is mapping your spreadsheet columns</p>
                        </div>
                    )}

                    {step === 'finalizing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Registering Schools...</h4>
                            <p className="text-sm text-slate-500">This may take a moment while we set up accounts and send notifications</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-green-100">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase">Import Complete</h4>
                            <p className="text-slate-500 mb-10">{parsedData?.valid.length} schools have been successfully registered.</p>
                            <button onClick={onClose} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Return to View</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-red-100">
                                <XIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase text-red-600">Import Failed</h4>
                            <p className="text-slate-500 mb-10 max-w-md mx-auto">{errorMessage || "An unexpected error occurred."}</p>
                            <div className="flex gap-4">
                                <button onClick={() => setStep('upload')} className="btn-secondary h-12 px-8">Try Again</button>
                                <button onClick={onClose} className="btn-primary h-12 px-8 bg-slate-900 shadow-lg shadow-slate-200">Close</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
