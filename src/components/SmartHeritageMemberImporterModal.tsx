import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { HeritageMember } from '../types';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { analyzeHeritageSpreadsheet } from '../services/geminiService';
import * as XLSX from 'xlsx';

type HeritageMappingField = 'name' | 'branch' | 'relation' | 'birthYear' | 'deathYear' | 'notes';
const ALL_HERITAGE_MAPPING_FIELDS: HeritageMappingField[] = ['name', 'branch', 'relation', 'birthYear', 'deathYear', 'notes'];
const REQUIRED_HERITAGE_MAPPING_FIELDS: HeritageMappingField[] = ['name', 'relation'];

interface SmartHeritageMemberImporterModalProps {
    onClose: () => void;
    onImport: (members: HeritageMember[]) => Promise<void>;
    institutionId: string;
}

const guessHeaderMapping = (headers: string[]): Record<HeritageMappingField, string | null> => {
    const findMatch = (candidates: string[]): string | null => {
        for (const candidate of candidates) {
            const found = headers.find(h => h.toLowerCase().trim().includes(candidate.toLowerCase()));
            if (found) return found;
        }
        return null;
    };

    return {
        name: findMatch(['full name', 'member name', 'name', 'member', 'person', 'ancestor']),
        branch: findMatch(['branch', 'lineage', 'side', 'family branch']),
        relation: findMatch(['relationship', 'relation', 'kin', 'role', 'title', 'position']),
        birthYear: findMatch(['birth year', 'year of birth', 'birth', 'born', 'dob', 'yob']),
        deathYear: findMatch(['death year', 'year of death', 'death', 'died', 'dod', 'passed']),
        notes: findMatch(['notes', 'historical notes', 'bio', 'biography', 'history', 'legacy', 'details'])
    };
};

export const SmartHeritageMemberImporterModal: React.FC<SmartHeritageMemberImporterModalProps> = ({
    onClose, onImport, institutionId
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<HeritageMappingField, string | null>>(
        ALL_HERITAGE_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<HeritageMappingField, string | null>)
    );
    const [parsedData, setParsedData] = useState<{ valid: HeritageMember[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);

    const handleDownloadTemplate = () => {
        const sampleData = [
            {
                "Full Name": "Samuel Mwangi Sr.",
                "Branch (Paternal/Maternal)": "Paternal",
                "Relationship": "Great Grandfather",
                "Year of Birth": "1892",
                "Year of Death": "1968",
                "Historical Notes": "Family lineage founder and community elder in Nyeri."
            },
            {
                "Full Name": "Grace Wamboi Mwangi",
                "Branch (Paternal/Maternal)": "Paternal",
                "Relationship": "Great Grandmother",
                "Year of Birth": "1898",
                "Year of Death": "1975",
                "Historical Notes": "Pioneer agricultural trader and matriarch."
            },
            {
                "Full Name": "John Mwangi",
                "Branch (Paternal/Maternal)": "Paternal",
                "Relationship": "Grandfather",
                "Year of Birth": "1924",
                "Year of Death": "2001",
                "Historical Notes": "Educator and veteran civic leader."
            },
            {
                "Full Name": "Mary Nyambura",
                "Branch (Paternal/Maternal)": "Maternal",
                "Relationship": "Grandmother",
                "Year of Birth": "1930",
                "Year of Death": "",
                "Historical Notes": "Family oral historian and artisan weaver."
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Family Members");
        XLSX.writeFile(workbook, "Family_Heritage_Import_Template.xlsx");
    };

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

                // Run Heuristic Guessing
                const guessedMapping = guessHeaderMapping(headers);

                // Try AI Mapping with Fallback
                let aiMapping: Record<string, string | null> = {};
                try {
                    aiMapping = await analyzeHeritageSpreadsheet(headers);
                } catch (aiErr) {
                    console.warn("AI Mapping fallback triggered:", aiErr);
                }

                const initialMapping: any = { ...guessedMapping };
                Object.keys(aiMapping).forEach(key => {
                    if (ALL_HERITAGE_MAPPING_FIELDS.includes(key as any) && aiMapping[key]) {
                        initialMapping[key] = aiMapping[key];
                    }
                });

                setUserMapping(initialMapping);
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to process spreadsheet.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: HeritageMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_HERITAGE_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map all required fields: ${missingFields.map(f => f.toUpperCase()).join(', ')}.`);
            return;
        }

        const validMembers: HeritageMember[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        (rawData || []).forEach((row, index) => {
            try {
                const name = row[userMapping.name!];
                const relation = row[userMapping.relation!];

                if (!name || String(name).trim() === '') {
                    throw new Error("Missing full name.");
                }

                if (!relation || String(relation).trim() === '') {
                    throw new Error("Missing relationship.");
                }

                const rawBranch = userMapping.branch ? String(row[userMapping.branch] || '').trim() : '';
                const branch: 'Paternal' | 'Maternal' = rawBranch.toLowerCase().includes('maternal') ? 'Maternal' : 'Paternal';

                const member: HeritageMember = {
                    id: `hm_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
                    institutionId,
                    name: String(name).trim(),
                    branch,
                    relation: String(relation).trim(),
                    birthYear: userMapping.birthYear ? String(row[userMapping.birthYear] || '').trim() : undefined,
                    deathYear: userMapping.deathYear ? String(row[userMapping.deathYear] || '').trim() : undefined,
                    notes: userMapping.notes ? String(row[userMapping.notes] || '').trim() : undefined,
                    createdAt: new Date().toISOString()
                };

                validMembers.push(member);
            } catch (err: any) {
                invalidRows.push({ row, error: err.message || 'Validation error' });
            }
        });

        setParsedData({ valid: validMembers, invalid: invalidRows });
        setStep('preview');
    };

    const handleExecuteImport = async () => {
        if (!parsedData || parsedData.valid.length === 0) return;
        setStep('finalizing');
        try {
            await onImport(parsedData.valid);
            setStep('success');
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to save family records to database.');
            setStep('error');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                            <SparklesIcon className="w-6 h-6 text-amber-200" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-200">Family Heritage Smart Import</p>
                            <h3 className="text-xl font-black uppercase tracking-tight">Import Excel Ancestry Data</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {step === 'upload' && (
                        <div className="space-y-6 text-center py-4">
                            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-900/50 hover:border-amber-400 transition-colors relative group">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(file);
                                    }}
                                />
                                <div className="flex flex-col items-center">
                                    <ArrowUpTrayIcon className="w-12 h-12 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Upload Family Tree Spreadsheet</p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Supports Excel (.xlsx, .xls) and CSV format</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/40">
                                <div className="text-left">
                                    <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase">Need a template?</p>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Download pre-formatted Excel template with sample lineage columns.</p>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shrink-0 ml-4"
                                >
                                    Download Template
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-16 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Analyzing Spreadsheet Structure...</p>
                            <p className="text-xs text-slate-400 font-medium">Detecting column headers and ancestry attributes.</p>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/40 flex items-center gap-3">
                                <SparklesIcon className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                                    Map your spreadsheet columns to the family tree fields below.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {ALL_HERITAGE_MAPPING_FIELDS.map((field) => {
                                    const isRequired = REQUIRED_HERITAGE_MAPPING_FIELDS.includes(field);
                                    const labels: Record<HeritageMappingField, string> = {
                                        name: 'Full Name *',
                                        branch: 'Branch (Paternal/Maternal)',
                                        relation: 'Relationship *',
                                        birthYear: 'Year of Birth',
                                        deathYear: 'Year of Death',
                                        notes: 'Historical Notes / Biography'
                                    };

                                    return (
                                        <div key={field} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">{labels[field]}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{isRequired ? 'Required' : 'Optional'}</p>
                                            </div>
                                            <select
                                                value={userMapping[field] || ''}
                                                onChange={(e) => handleMappingChange(field, e.target.value || null)}
                                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 max-w-[220px]"
                                            >
                                                <option value="">-- Ignore Field --</option>
                                                {fileHeaders.map((header) => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep('upload')}
                                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleConfirmMapping}
                                    className="flex-1 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
                                >
                                    Preview Import ({rawData.length} Rows)
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && parsedData && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl text-center">
                                    <p className="text-2xl font-black text-emerald-600">{parsedData.valid.length}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Valid Members</p>
                                </div>
                                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40 rounded-2xl text-center">
                                    <p className="text-2xl font-black text-rose-600">{parsedData.invalid.length}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">Invalid Rows</p>
                                </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
                                        <tr>
                                            <th className="p-3 text-[9px] font-black uppercase text-slate-400">Name</th>
                                            <th className="p-3 text-[9px] font-black uppercase text-slate-400">Branch</th>
                                            <th className="p-3 text-[9px] font-black uppercase text-slate-400">Relation</th>
                                            <th className="p-3 text-[9px] font-black uppercase text-slate-400">Birth/Death</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData.valid.map((member, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="p-3 text-xs font-bold text-slate-800 dark:text-white">{member.name}</td>
                                                <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${member.branch === 'Paternal' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                        {member.branch}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-400">{member.relation}</td>
                                                <td className="p-3 text-xs font-medium text-slate-500">
                                                    {member.birthYear || '—'} {member.deathYear ? `- ${member.deathYear}` : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStep('mapping')}
                                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Adjust Mapping
                                </button>
                                <button
                                    onClick={handleExecuteImport}
                                    disabled={parsedData.valid.length === 0}
                                    className="flex-1 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none disabled:opacity-50"
                                >
                                    Import {parsedData.valid.length} Souls to Tree
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'finalizing' && (
                        <div className="py-16 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Ingesting Family Members...</p>
                            <p className="text-xs text-slate-400 font-medium">Saving records to Encrypted Family Vault.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-10 text-center space-y-4">
                            <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto" />
                            <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Import Completed Successfully!</h4>
                            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                                Successfully added {parsedData?.valid.length} family members to your lineage tree.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
                            >
                                Done & Return to Family Tree
                            </button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-black">!</div>
                            <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Import Failed</h4>
                            <p className="text-xs text-rose-600 font-medium max-w-sm mx-auto">{errorMessage}</p>
                            <button
                                onClick={() => setStep('upload')}
                                className="px-8 py-3 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
