
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

        onComplete(allRows);
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

