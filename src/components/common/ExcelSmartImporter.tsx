
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
    existingAdmissionNumbers?: string[];
    skipExistingMode?: boolean;
}

export const ExcelSmartImporter: React.FC<ExcelSmartImporterProps> = ({
    fields,
    onComplete,
    onClose,
    children,
    title,
    description,
    existingAdmissionNumbers,
    skipExistingMode = false
}) => {
    const [step, setStep] = useState(1);
    const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'existing' | 'missing'>('all');
    const [previewLimit, setPreviewLimit] = useState(50);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');

    const cleanStr = (s: string) => s.toLowerCase().replace(/['"’`]/g, '').replace(/[\s_.-]+/g, ' ').trim();

    const detectHeaderRowIndex = (rows: any[][]): number => {
        if (!rows || rows.length === 0) return 0;
        const keywords = ['name', 'learner', 'student', 'pupil', 'candidate', 'adm', 'admission', 'assess', 'knec', 'kpsea', 'gender', 'sex', 'grade', 'stream', 'class', 'phone', 'contact', 'dob', 'parent', 'upi', 'nemis', 'email'];
        let bestIndex = 0;
        let maxMatches = 0;

        const maxScan = Math.min(rows.length, 20);
        for (let i = 0; i < maxScan; i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.length === 0) continue;
            const textCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim().length > 0);
            if (textCells.length === 0) continue;

            let matches = 0;
            textCells.forEach(cell => {
                const str = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (keywords.some(kw => str.includes(kw))) {
                    matches++;
                }
            });

            if (matches > maxMatches) {
                maxMatches = matches;
                bestIndex = i;
            }
        }

        return bestIndex;
    };

    const autoMapHeaders = (headers: string[]) => {
        const initialMapping: Record<string, string> = {};
        const lowerHeaders = headers.map(h => ({ 
            raw: h, 
            low: h.toLowerCase().trim(),
            clean: cleanStr(h)
        }));

        fields.forEach(f => {
            const fKey = f.key;
            const fLabel = cleanStr(f.label);

            // 1. Exact or strict keyword matching
            let matchedHeader: string | undefined;

            if (fKey === 'name') {
                // Must be student/learner name; strictly avoid parent/guardian/teacher/staff
                const match = lowerHeaders.find(h => 
                    !/(parent|father|mother|guardian|teacher|officer|staff|contact\s*person|next\s*of\s*kin)/i.test(h.clean) &&
                    (
                        /^(student|learner|pupil|candidate|full|official)?\s*(s)?\s*(name|names)$/i.test(h.clean) ||
                        h.clean.includes('learner name') ||
                        h.clean.includes('learners name') ||
                        h.clean.includes('student name') ||
                        h.clean.includes('students name') ||
                        h.clean.includes('pupil name') ||
                        h.clean.includes('pupils name') ||
                        h.clean.includes('candidate name') ||
                        h.clean.includes('candidate names') ||
                        h.clean.includes('full name') ||
                        h.clean.includes('full names') ||
                        h.clean.includes('official name') ||
                        h.clean.includes('official names') ||
                        h.clean.includes('name of learner') ||
                        h.clean.includes('names of learner') ||
                        h.clean.includes('name of student') ||
                        h.clean.includes('names of student') ||
                        h.clean.includes('name of pupil') ||
                        h.clean.includes('names of pupil') ||
                        h.clean.includes('name of candidate') ||
                        h.clean.includes('names of candidate') ||
                        h.clean === 'name' ||
                        h.clean === 'names' ||
                        h.clean === 'student' ||
                        h.clean === 'students' ||
                        h.clean === 'learner' ||
                        h.clean === 'learners' ||
                        h.clean === 'pupil' ||
                        h.clean === 'pupils' ||
                        h.clean === 'candidate' ||
                        h.clean === 'candidates' ||
                        h.clean === 'surname' ||
                        h.clean.includes('surname')
                    )
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'parentName') {
                const match = lowerHeaders.find(h => 
                    /(parent|father|mother|guardian|sponsor|contact\s*person)/i.test(h.clean) &&
                    (h.clean.includes('name') || h.clean.includes('guardian') || h.clean.includes('parent'))
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'admissionNumber') {
                const match = lowerHeaders.find(h => 
                    /^(adm|admission|reg|registration|student\s*id|index|roll|matric)[\s_.-]*(no|number|num|code)?$/i.test(h.clean) ||
                    h.clean.includes('adm no') ||
                    h.clean.includes('adm number') ||
                    h.clean.includes('admission no') ||
                    h.clean.includes('admission number') ||
                    h.clean.includes('reg no') ||
                    h.clean.includes('registration no') ||
                    h.clean.includes('index no') ||
                    h.clean.includes('index number') ||
                    h.clean.includes('student id') ||
                    h.clean === 'adm' ||
                    h.clean === 'reg' ||
                    h.clean === 'admission'
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'assessmentNo') {
                const match = lowerHeaders.find(h => 
                    h.clean.includes('assess') || 
                    h.clean.includes('knec') || 
                    h.clean.includes('kpsea') || 
                    h.clean.includes('cbe') || 
                    h.clean.includes('cba') || 
                    h.clean.includes('upi') || 
                    h.clean.includes('nemis') || 
                    h.clean.includes('nemba')
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'gradeLevel') {
                const match = lowerHeaders.find(h => 
                    /^(grade|class|level|form|standard|cohort)[\s_.-]*(level|name|no)?$/i.test(h.clean) ||
                    h.clean.includes('grade level') ||
                    h.clean.includes('class level') ||
                    h.clean === 'grade' ||
                    h.clean === 'class' ||
                    h.clean === 'form' ||
                    h.clean === 'level'
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'stream') {
                const match = lowerHeaders.find(h => 
                    h.clean.includes('stream') || 
                    h.clean.includes('section') || 
                    h.clean.includes('arm') || 
                    h.clean.includes('track')
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'gender') {
                const match = lowerHeaders.find(h => 
                    h.clean === 'gender' || 
                    h.clean === 'sex' || 
                    h.clean.includes('gender') || 
                    h.clean.includes('sex')
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'parentPhone') {
                const match = lowerHeaders.find(h => 
                    /(parent|father|mother|guardian|sponsor)/i.test(h.clean) && 
                    /(phone|mobile|contact|tel|cell|number)/i.test(h.clean)
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'secondaryPhone') {
                const match = lowerHeaders.find(h => 
                    h.clean.includes('secondary') || 
                    h.clean.includes('alt') || 
                    h.clean.includes('phone 2') || 
                    h.clean.includes('phone2') || 
                    h.clean.includes('mobile 2') || 
                    h.clean.includes('other phone') || 
                    h.clean.includes('emergency')
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'phoneNumber' || fKey === 'studentPhone') {
                const match = lowerHeaders.find(h => 
                    !/(parent|father|mother|guardian|secondary|alt|phone\s*2)/i.test(h.clean) &&
                    (
                        h.clean.includes('student phone') ||
                        h.clean.includes('mobile') ||
                        h.clean.includes('phone') ||
                        h.clean.includes('contact') ||
                        h.clean.includes('tel')
                    )
                );
                matchedHeader = match?.raw;
            } else if (fKey === 'email') {
                const match = lowerHeaders.find(h => 
                    !/(parent|guardian)/i.test(h.clean) && 
                    (h.clean.includes('email') || h.clean.includes('mail'))
                );
                matchedHeader = match?.raw;
            } else {
                // Generic fallback
                const match = lowerHeaders.find(h => 
                    h.clean.includes(fLabel) || 
                    h.clean.includes(fKey.toLowerCase()) || 
                    fLabel.includes(h.clean)
                );
                matchedHeader = match?.raw;
            }

            if (matchedHeader) {
                initialMapping[fKey] = matchedHeader;
            }
        });

        return initialMapping;
    };

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
            
            const sheets = wb.SheetNames || [];
            setAvailableSheets(sheets);
            const defaultSheet = sheets.length > 1 ? 'ALL_SHEETS' : (sheets[0] || '');
            setSelectedSheet(defaultSheet);

            const activeWsName = sheets[0];
            const ws = wb.Sheets[activeWsName];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            if (data && data.length > 0) {
                const headerRowIdx = detectHeaderRowIndex(data);
                const headers = (data[headerRowIdx] || []).filter(h => !!h).map(h => String(h).trim());
                setRawHeaders(headers);
                const mapping = autoMapHeaders(headers);
                setHeaderMapping(mapping);
                setStep(2);
            }
            setIsLoading(false);
        };
        reader.readAsBinaryString(file);
    };

    const handleSheetChange = (sheetName: string) => {
        setSelectedSheet(sheetName);
        if (!workbook) return;

        const targetWsName = sheetName === 'ALL_SHEETS' ? workbook.SheetNames[0] : sheetName;
        const ws = workbook.Sheets[targetWsName];
        if (ws) {
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            if (data && data.length > 0) {
                const headerRowIdx = detectHeaderRowIndex(data);
                const headers = (data[headerRowIdx] || []).filter(h => !!h).map(h => String(h).trim());
                setRawHeaders(headers);
                const mapping = autoMapHeaders(headers);
                setHeaderMapping(mapping);
            }
        }
    };

    const getRowVal = (row: any, headerKey: string) => {
        if (!row || !headerKey) return undefined;
        if (row[headerKey] !== undefined && row[headerKey] !== null) return row[headerKey];
        const cleanTarget = cleanStr(headerKey);
        for (const k of Object.keys(row)) {
            if (k.trim() === headerKey.trim()) return row[k];
            if (cleanStr(k) === cleanTarget) return row[k];
        }
        return undefined;
    };

    const processData = () => {
        if (!workbook) return;
        setIsLoading(true);

        // Determine sheets to read
        const sheetsToRead = selectedSheet === 'ALL_SHEETS' || !selectedSheet
            ? workbook.SheetNames
            : [selectedSheet];

        const allRows: any[] = [];

        sheetsToRead.forEach(wsname => {
            const ws = workbook.Sheets[wsname];
            if (!ws) return;
            const dataGrid = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            const headerRowIdx = detectHeaderRowIndex(dataGrid);
            const sheetRows = XLSX.utils.sheet_to_json(ws, { range: headerRowIdx }) as any[];

            sheetRows.forEach(row => {
                const obj: any = {};
                fields.forEach(f => {
                    const mappedHeader = headerMapping[f.key];
                    if (mappedHeader) {
                        const val = getRowVal(row, mappedHeader);
                        obj[f.key] = val !== undefined && val !== null ? String(val).trim() : '';
                    } else {
                        obj[f.key] = '';
                    }
                });

                // Check for split name columns (e.g. SURNAME + OTHER NAMES or First Name + Middle Name + Last Name) if name is empty
                if (!obj.name) {
                    const rowKeys = Object.keys(row);
                    const surnameKey = rowKeys.find(k => /^(surname|last[\s_.-]*name|lname)$/i.test(k.trim()));
                    const otherNamesKey = rowKeys.find(k => /^(other[\s_.-]*names?)$/i.test(k.trim()));
                    const firstKey = rowKeys.find(k => /^(first[\s_.-]*name|fname)$/i.test(k.trim()));
                    const middleKey = rowKeys.find(k => !otherNamesKey && /^(middle[\s_.-]*name|mname)$/i.test(k.trim()));

                    if (surnameKey && otherNamesKey) {
                        const sVal = String(row[surnameKey] || '').trim();
                        const oVal = String(row[otherNamesKey] || '').trim();
                        if (sVal || oVal) {
                            obj.name = `${sVal} ${oVal}`.trim();
                        }
                    } else if (firstKey || surnameKey) {
                        const parts = [
                            firstKey ? String(row[firstKey] || '').trim() : '',
                            middleKey ? String(row[middleKey] || '').trim() : '',
                            surnameKey ? String(row[surnameKey] || '').trim() : ''
                        ].filter(Boolean);
                        if (parts.length > 0) {
                            obj.name = parts.join(' ');
                        }
                    }
                }

                // Guarantee studentName and fullName aliases are present
                if (obj.name) {
                    obj.studentName = obj.name;
                    obj.fullName = obj.name;
                    obj.learnerName = obj.name;
                }

                // If gradeLevel is empty and sheet name looks like a grade (e.g. "Grade 4", "Form 2", "PP1"), infer it
                if (!obj.gradeLevel && sheetsToRead.length > 1 && wsname) {
                    const cleanSheetName = wsname.trim();
                    if (/^(grade|class|form|standard|pp|playgroup)/i.test(cleanSheetName)) {
                        obj.gradeLevel = cleanSheetName;
                    }
                }

                // Validation: Skip row only if completely blank (no name, no admission number, no assessment number, no phone)
                const hasName = Boolean(obj.name && obj.name.trim() !== '');
                const hasAdmNo = Boolean(obj.admissionNumber && obj.admissionNumber.trim() !== '');
                const hasAssessNo = Boolean(obj.assessmentNo && obj.assessmentNo.trim() !== '');
                const hasContact = Boolean(obj.phoneNumber || obj.parentPhone || obj.email);

                if (!hasName && !hasAdmNo && !hasAssessNo && !hasContact) {
                    return; // Skip genuinely empty rows
                }

                // Stable ID: If KNEC or UIC exists, use it to allow UPSERT (update existing)
                let baseId = `sch_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`;
                if (obj.knecCode && obj.knecCode.trim()) baseId = `sch_knec_${slugify(obj.knecCode)}`;
                else if (obj.uic && obj.uic.trim()) baseId = `sch_uic_${slugify(obj.uic)}`;
                
                obj.id = baseId;
                
                // Ensure slug uniqueness by appending the short ID
                const hash = baseId.split('_').pop() || '000';
                obj.slug = `${slugify(obj.name || obj.admissionNumber || obj.assessmentNo || 'record')}-${hash.substring(0, 5)}`;
                
                obj.createdAt = new Date().toISOString();
                obj.updatedAt = new Date().toISOString();

                allRows.push(obj);
            });
        });

        setPreviewData(allRows);
        setPreviewSearch('');
        setPreviewFilter('all');
        setPreviewLimit(50);
        setStep(3);
        setIsLoading(false);
    };

    const normalizeAdmKey = (v: any) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const existingAdmSet = React.useMemo(() => {
        const set = new Set<string>();
        (existingAdmissionNumbers || []).forEach(a => {
            const k = normalizeAdmKey(a);
            if (k) set.add(k);
        });
        return set;
    }, [existingAdmissionNumbers]);

    const previewStats = React.useMemo(() => {
        const seenInFile = new Set<string>();
        let newCount = 0;
        let existingCount = 0;
        let missingInfoCount = 0;
        const annotated = previewData.map((row, idx) => {
            const admKey = normalizeAdmKey(row.admissionNumber);
            const isExisting = Boolean(admKey && (existingAdmSet.has(admKey) || seenInFile.has(admKey)));
            if (admKey) seenInFile.add(admKey);
            const isMissing = !row.name || !String(row.name).trim();
            if (isExisting) existingCount++;
            else newCount++;
            if (isMissing) missingInfoCount++;
            return { row, idx, isExisting, isMissing };
        });
        return { annotated, newCount, existingCount, missingInfoCount };
    }, [previewData, existingAdmSet]);

    const filteredPreviewRows = React.useMemo(() => {
        const q = previewSearch.trim().toLowerCase();
        return previewStats.annotated.filter(({ row, isExisting, isMissing }) => {
            if (previewFilter === 'new' && isExisting) return false;
            if (previewFilter === 'existing' && !isExisting) return false;
            if (previewFilter === 'missing' && !isMissing) return false;
            if (q) {
                const hay = Object.values(row).map(v => String(v || '')).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [previewStats, previewSearch, previewFilter]);

    const visiblePreviewColumns = React.useMemo(() => {
        const mapped = fields.filter(f => headerMapping[f.key] || previewData.some(r => r[f.key] && String(r[f.key]).trim() !== ''));
        return mapped.length > 0 ? mapped : fields.slice(0, 6);
    }, [fields, headerMapping, previewData]);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xl z-[4000] flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                                {title ? <span className="text-emerald-600 italic">{title}</span> : <>Smart <span className="text-emerald-600 italic">Excel Importer</span></>}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-[9px] font-black uppercase tracking-widest">
                                <span className={step === 1 ? 'text-emerald-600' : 'text-slate-400'}>1. Upload</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                <span className={step === 2 ? 'text-emerald-600' : 'text-slate-400'}>2. Map Columns</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                <span className={step === 3 ? 'text-emerald-600' : 'text-slate-400'}>3. Preview &amp; Confirm</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-11 h-11 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors shadow-sm cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 flex-1 overflow-y-auto min-h-[380px]">
                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="relative w-full max-w-lg cursor-pointer group">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileUpload}
                                    disabled={isLoading}
                                    title="Choose Excel File"
                                />
                                <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-16 text-center group-hover:border-emerald-500/30 transition-all bg-slate-50 group-hover:bg-emerald-50/10 pointer-events-none">
                                    {isLoading ? (
                                        <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
                                    ) : (
                                        <FileSpreadsheet className="w-16 h-16 text-slate-200 group-hover:text-emerald-400 mx-auto mb-6 transition-colors" />
                                    )}
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Choose Excel File</h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Support: .XLSX, .XLS, .CSV</p>
                                </div>
                            </div>
                            
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

                            {availableSheets.length > 1 && (
                                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-left">
                                        <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Multiple Worksheets Detected ({availableSheets.length} Sheets)</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Select a single sheet or import all sheets together.</p>
                                    </div>
                                    <select
                                        value={selectedSheet}
                                        onChange={(e) => handleSheetChange(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-bold px-4 py-2 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value="ALL_SHEETS">✨ Import All {availableSheets.length} Sheets</option>
                                        {availableSheets.map(sh => (
                                            <option key={sh} value={sh}>Sheet: {sh}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

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
                                <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">Start Over</button>
                                <button 
                                    disabled={!fields.filter(f => f.required).every(f => !!headerMapping[f.key])}
                                    onClick={processData}
                                    className="h-14 px-10 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-emerald-500/20 hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-30 cursor-pointer"
                                >
                                    Preview Data <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview & Confirm */}
                    {step === 3 && (
                        <div className="space-y-5 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white italic">
                                        Preview <span className="text-emerald-600">Before Import</span>
                                    </h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                        {fileName} • Verify columns and rows before saving to database
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider">
                                        Total: {previewData.length.toLocaleString()}
                                    </span>
                                    {existingAdmissionNumbers && (
                                        <>
                                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                                                New: {previewStats.newCount.toLocaleString()}
                                            </span>
                                            <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                                                Existing ({skipExistingMode ? 'Will Skip' : 'Will Update'}): {previewStats.existingCount.toLocaleString()}
                                            </span>
                                        </>
                                    )}
                                    {previewStats.missingInfoCount > 0 && (
                                        <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Missing Name: {previewStats.missingInfoCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Preview Search & Filter */}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    value={previewSearch}
                                    onChange={(e) => setPreviewSearch(e.target.value)}
                                    placeholder="Search preview rows by name, admission no, class..."
                                    className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {existingAdmissionNumbers && (
                                    <div className="flex items-center gap-1.5">
                                        {(['all', 'new', 'existing', 'missing'] as const).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => { setPreviewFilter(f); setPreviewLimit(50); }}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                                                    previewFilter === f
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                }`}
                                            >
                                                {f === 'all' ? 'All' : f === 'new' ? 'New Only' : f === 'existing' ? 'Existing' : 'Missing Name'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Scrollable Preview Table */}
                            <div className="overflow-x-auto max-h-[340px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 z-10 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3">#</th>
                                            {existingAdmissionNumbers && <th className="py-2.5 px-3">Status</th>}
                                            {visiblePreviewColumns.map(col => (
                                                <th key={col.key} className="py-2.5 px-3 whitespace-nowrap">{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredPreviewRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={visiblePreviewColumns.length + (existingAdmissionNumbers ? 2 : 1)} className="py-10 text-center text-slate-400 font-bold">
                                                    No rows match this preview filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPreviewRows.slice(0, previewLimit).map(({ row, idx, isExisting, isMissing }) => (
                                                <tr key={idx} className={isMissing ? 'bg-rose-50/60 dark:bg-rose-950/20' : isExisting ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}>
                                                    <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                                                    {existingAdmissionNumbers && (
                                                        <td className="py-2 px-3 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                                isExisting
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                            }`}>
                                                                {isExisting ? (skipExistingMode ? 'Skip (Exists)' : 'Update') : 'New'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {visiblePreviewColumns.map(col => (
                                                        <td key={col.key} className="py-2 px-3 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap max-w-[220px] truncate">
                                                            {row[col.key] ? String(row[col.key]) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredPreviewRows.length > previewLimit && (
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewLimit(prev => prev + 100)}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                    >
                                        Showing {previewLimit} of {filteredPreviewRows.length.toLocaleString()} — Load 100 More
                                    </button>
                                </div>
                            )}

                            {/* Preview Actions */}
                            <div className="pt-5 flex flex-wrap justify-between items-center gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
                                >
                                    ← Back to Mapping
                                </button>
                                <button
                                    type="button"
                                    disabled={previewData.length === 0 || (Boolean(existingAdmissionNumbers) && skipExistingMode && previewStats.newCount === 0)}
                                    onClick={() => onComplete(previewData)}
                                    className="h-14 px-10 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-emerald-500/20 hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-40 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    {existingAdmissionNumbers && skipExistingMode
                                        ? `Confirm & Import ${previewStats.newCount.toLocaleString()} New Student${previewStats.newCount === 1 ? '' : 's'}`
                                        : `Confirm & Import ${previewData.length.toLocaleString()} Row${previewData.length === 1 ? '' : 's'}`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

