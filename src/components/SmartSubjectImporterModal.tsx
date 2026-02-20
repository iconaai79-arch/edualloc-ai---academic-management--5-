
import React, { useState, useMemo } from 'react';
import type { Subject, Department, Course, AcademicLevel } from '../types';
import { XIcon, SparklesIcon, CheckCircleIcon, ArrowUpTrayIcon } from './icons/index';
import { analyzeSubjectSpreadsheet } from '../services/geminiService';

import * as XLSX from 'xlsx';

type SubjectMappingField = 'name' | 'code' | 'departmentName' | 'targetCourseLevel' | 'description' | 'shortName';
const ALL_SUBJECT_MAPPING_FIELDS: SubjectMappingField[] = ['name', 'code', 'departmentName', 'targetCourseLevel', 'description', 'shortName'];
const REQUIRED_SUBJECT_MAPPING_FIELDS: SubjectMappingField[] = ['name', 'code'];

interface SmartSubjectImporterModalProps {
    onClose: () => void;
    onImport: (subjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[]) => Promise<void>;
    existingSubjects: Subject[];
    departments: Department[];
    courses: Course[];
    aiModelTier?: string;
    currentUserDepartmentId?: string;
}

export const SmartSubjectImporterModal: React.FC<SmartSubjectImporterModalProps> = ({
    onClose, onImport, existingSubjects, departments, courses, aiModelTier, currentUserDepartmentId
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<SubjectMappingField, string | null>>(ALL_SUBJECT_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<SubjectMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ valid: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const existingSubjectCodes = useMemo(() => new Set(existingSubjects.map(s => s.code.toLowerCase().trim())), [existingSubjects]);
    const departmentNameMap = useMemo(() => new Map(departments.map(d => [d.name.toLowerCase().trim(), d.id])), [departments]);

    // Map course levels to allow mapping targetCourseLevel by name OR ID
    const courseLevelMap = useMemo(() => {
        const map = new Map<string, string>();
        courses.forEach(c => {
            c.levels?.forEach(l => {
                map.set(l.name.toLowerCase().trim(), l.id);
                map.set(`${c.name} - ${l.name}`.toLowerCase().trim(), l.id);
                map.set(`${c.code} - ${l.name}`.toLowerCase().trim(), l.id);
            });
        });
        return map;
    }, [courses]);


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

                const mapping = await analyzeSubjectSpreadsheet(headers, aiModelTier);

                // Convert mapping to our specific fields
                const initialMapping: any = {};
                Object.keys(mapping).forEach(key => {
                    if (ALL_SUBJECT_MAPPING_FIELDS.includes(key as any)) {
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

    const handleMappingChange = (field: SubjectMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev!, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_SUBJECT_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}.`);
            return;
        }

        const validSubjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[] = [];
        const invalidRows: { row: any, error: string }[] = [];
        const currentBatchCodes = new Set<string>();

        (rawData || []).forEach((row, index) => {
            try {
                const name = row[userMapping.name!];
                const code = row[userMapping.code!];

                // Optional fields
                const departmentName = userMapping.departmentName ? row[userMapping.departmentName] : null;
                const targetCourseLevel = userMapping.targetCourseLevel ? row[userMapping.targetCourseLevel] : null;
                const description = userMapping.description ? row[userMapping.description] : '';
                const shortName = userMapping.shortName ? row[userMapping.shortName] : '';

                if (!name || !code) {
                    throw new Error("Missing required fields (Name or Code).");
                }

                let deptId = currentUserDepartmentId || (departments.length > 0 ? departments[0].id : '');
                if (departmentName) {
                    const foundId = departmentNameMap.get(String(departmentName).toLowerCase().trim());
                    if (foundId) deptId = foundId;
                }

                let targetCourseLevelId: string | undefined = undefined;
                if (targetCourseLevel) {
                    const foundId = courseLevelMap.get(String(targetCourseLevel).toLowerCase().trim());
                    if (foundId) targetCourseLevelId = foundId;
                }

                const cleanCode = String(code).toLowerCase().trim();
                if (existingSubjectCodes.has(cleanCode) || currentBatchCodes.has(cleanCode)) {
                    throw new Error(`Subject code "${code}" already exists.`);
                }
                currentBatchCodes.add(cleanCode);

                validSubjects.push({
                    name: String(name).trim(),
                    code: String(code).trim(),
                    departmentId: deptId,
                    lessonStructure: [], // Default empty
                    description: String(description).trim(),
                    shortName: String(shortName).trim(),
                    isComplete: false,
                    targetCourseLevelId
                });

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ valid: validSubjects, invalid: invalidRows });
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
                    <h3 className="text-xl font-black uppercase tracking-tight">Smart Subject Importer</h3>
                    {step !== 'finalizing' && <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>}
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/20">
                            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h4 className="text-lg font-bold mb-2">Upload Excel Spreadsheet</h4>
                            <p className="text-sm text-slate-500 mb-8">Select an Excel (.xlsx) or CSV file with your subject data.</p>
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
                            <div className="grid grid-cols-1 gap-4">
                                {ALL_SUBJECT_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <label className="text-sm font-bold capitalize text-slate-700 dark:text-slate-300">
                                            {field.replace(/([A-Z])/g, ' $1')} {REQUIRED_SUBJECT_MAPPING_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                        </label>
                                        <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="form-select sm:w-64">
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
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Name</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Code</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Department</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData?.valid.slice(0, 5).map((v, i) => {
                                            const dept = departments.find(d => d.id === v.departmentId);
                                            return (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                                    <td className="px-6 py-3 text-sm font-bold">{v.name}</td>
                                                    <td className="px-6 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">{v.code}</td>
                                                    <td className="px-6 py-3 text-sm text-slate-500">{dept?.name || '-'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button onClick={() => setStep('mapping')} className="btn-secondary">Back to Mapping</button>
                                <button onClick={handleFinalImport} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Commit to Database</button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Processing...</h4>
                            <p className="text-sm text-slate-500">AI is mapping your data structure</p>
                        </div>
                    )}

                    {step === 'finalizing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Syncing records...</h4>
                            <p className="text-sm text-slate-500">Connecting to cloud infrastructure</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-green-100">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase">Import Complete</h4>
                            <p className="text-slate-500 mb-10">Subjects have been successfully added.</p>
                            <button onClick={onClose} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Return to Portal</button>
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
