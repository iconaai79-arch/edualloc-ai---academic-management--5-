
import React, { useState, useMemo } from 'react';
import type { Subject, User, Room, TimetableEntry, AcademicYear, Semester, TimetableSettings } from '../types';
import { analyzeTimetableSpreadsheet } from '../services/geminiService';
import { SparklesIcon, XIcon } from './icons';
import { minutesToTime, timeToMinutes } from '../utils/timeUtils';

declare var XLSX: any;

interface TimetableImporterProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    onImport: (entries: Omit<TimetableEntry, 'id' | 'institutionId' | 'academicYearId' | 'semesterId'>[]) => void;
    academicYearId: string;
    semesterId: string;
    timetableSettings: TimetableSettings;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'error';
type MappingField = 'day' | 'startTime' | 'endTime' | 'subjectCode' | 'lecturerName' | 'roomName';
const ALL_MAPPING_FIELDS: MappingField[] = ['day', 'startTime', 'endTime', 'subjectCode', 'lecturerName', 'roomName'];
const MANDATORY_FIELDS: MappingField[] = ['startTime', 'subjectCode', 'lecturerName', 'roomName'];


export const TimetableImporter: React.FC<TimetableImporterProps> = ({ isOpen, onClose, subjects, lecturers, rooms, onImport, academicYearId, semesterId, timetableSettings }) => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [aiMapping, setAiMapping] = useState<Record<MappingField, string | null> | null>(null);
    const [userMapping, setUserMapping] = useState<Record<MappingField, string> | null>(null);
    const [parsedData, setParsedData] = useState<{ valid: any[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [rawData, setRawData] = useState<any[]>([]);

    const subjectMap = useMemo(() => new Map(subjects.map(s => [s.code.toLowerCase(), s.id])), [subjects]);
    const lecturerMap = useMemo(() => new Map(lecturers.map(l => [l.name.toLowerCase(), l.id])), [lecturers]);
    const roomMap = useMemo(() => new Map(rooms.map(r => [r.name.toLowerCase(), r.id])), [rooms]);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setStep('importing');
        setErrorMessage('');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (json.length < 1) throw new Error("Spreadsheet is empty.");

                const headers = json[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                const mapping = await analyzeTimetableSpreadsheet(headers);
                setAiMapping(mapping as Record<MappingField, string | null>);
                setUserMapping(mapping as Record<MappingField, string>);
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to process spreadsheet.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: MappingField, value: string) => {
        setUserMapping(prev => ({ ...prev!, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;
        setStep('importing');
        
        const validEntries: Omit<TimetableEntry, 'id' | 'institutionId' | 'academicYearId' | 'semesterId'>[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        rawData.forEach((row, index) => {
            try {
                // --- Extract common data first ---
                const subjectCode = userMapping.subjectCode ? row[userMapping.subjectCode] : null;
                const lecturerName = userMapping.lecturerName ? row[userMapping.lecturerName] : null;
                const roomName = userMapping.roomName ? row[userMapping.roomName] : null;
                const startTimeValue = userMapping.startTime ? row[userMapping.startTime] : null;

                if (!subjectCode || !lecturerName || !roomName || !startTimeValue) {
                   throw new Error("Missing required fields: Start Time, Subject Code, Lecturer Name, or Room Name.");
                }
                
                const startTime = formatTime(startTimeValue);
                if (!startTime) {
                    throw new Error("Invalid Start Time format.");
                }

                const subjectId = subjectMap.get(String(subjectCode).toLowerCase().trim());
                if (!subjectId) throw new Error(`Subject with code "${subjectCode}" not found.`);
                
                const lecturerId = lecturerMap.get(String(lecturerName).toLowerCase().trim());
                if (!lecturerId) throw new Error(`Lecturer with name "${lecturerName}" not found.`);

                const roomId = roomMap.get(String(roomName).toLowerCase().trim());
                if (!roomId) throw new Error(`Room with name "${roomName}" not found.`);
                
                let endTime;
                const mappedEndTime = userMapping.endTime ? row[userMapping.endTime] : null;

                if (mappedEndTime) {
                    endTime = formatTime(mappedEndTime);
                } else {
                    const subject = subjects.find(s => s.id === subjectId);
                    // Assume single period if not specified.
                    const duration = timetableSettings.periodLengthMinutes;
                    
                    if (!duration) {
                        throw new Error(`Cannot calculate end time for subject "${subjectCode}" as no default period length is set.`);
                    }

                    const startTimeMinutes = timeToMinutes(startTime);
                    endTime = minutesToTime(startTimeMinutes + duration);
                }

                if (!endTime) throw new Error("Could not determine End Time.");

                // --- Handle day logic ---
                const dayValue = userMapping.day ? row[userMapping.day] : null;

                if (dayValue) {
                    // Day is specified, create single entry
                    const dayString = String(dayValue).trim();
                    if (!dayString) throw new Error("Day column has an empty value.");
                    /* FIXED: Added required snake_case properties to match TimetableEntry type */
                    validEntries.push({ 
                        day: dayString, 
                        startTime, 
                        endTime, 
                        subjectId, 
                        lecturerId, 
                        roomId,
                        start_time: startTime,
                        end_time: endTime,
                        subject_id: subjectId,
                        lecturer_id: lecturerId,
                        room_id: roomId
                    });
                } else {
                    // Day is not specified, create entry for each operating day
                    timetableSettings.operatingDays.forEach(dayOfWeek => {
                        /* FIXED: Added required snake_case properties to match TimetableEntry type */
                        validEntries.push({ 
                            day: dayOfWeek, 
                            startTime, 
                            endTime, 
                            subjectId, 
                            lecturerId, 
                            roomId,
                            start_time: startTime,
                            end_time: endTime,
                            subject_id: subjectId,
                            lecturer_id: lecturerId,
                            room_id: roomId
                        });
                    });
                }

            } catch (e: any) {
                invalidRows.push({ row: { ...row, rowIndex: index + 2 }, error: e.message });
            }
        });

        setParsedData({ valid: validEntries, invalid: invalidRows });
        setStep('preview');
    };

    const formatTime = (time: any): string => {
        if (typeof time === 'number' && time > 0 && time < 1) { // Excel time format
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + time * 24 * 60 * 60 * 1000);
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (typeof time === 'string') {
            const match = time.match(/(\d{1,2}):(\d{2})/);
            if (match) {
                return `${match[1].padStart(2, '0')}:${match[2]}`;
            }
        }
        if (time instanceof Date) {
            return time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        throw new Error(`Invalid time format: "${time}"`);
    };

    const handleFinalImport = () => {
        if (parsedData?.valid) {
            onImport(parsedData.valid);
            onClose();
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Smart Timetable Importer</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div>
                            <div className="text-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                                <h4 className="mt-4 text-lg font-semibold">Upload Timetable File</h4>
                                <p className="mt-2 text-sm text-slate-500">Select an Excel (.xlsx, .xls) file to begin.</p>
                                <input type="file" onChange={e => handleFileSelect(e.target.files![0])} accept=".xlsx, .xls" className="mt-6 file-input" />
                            </div>
                            <div className="mt-6 bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg text-left">
                                <h5 className="font-semibold text-blue-800 dark:text-blue-200">Using aSc Timetables? (.roz files)</h5>
                                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                                    This tool imports from Excel files. To use your aSc Timetables file, please export it first:
                                </p>
                                <ol className="mt-2 list-decimal list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>Open your <strong>.roz</strong> file in the aSc Timetables application.</li>
                                    <li>Go to <strong>File &rarr; Export &rarr; Timetable to Excel</strong>.</li>
                                    <li>Save the exported Excel file to your computer.</li>
                                    <li>Upload that new Excel file here.</li>
                                </ol>
                            </div>
                        </div>
                    )}
                    {step === 'importing' && (
                        <div className="text-center p-10"><div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><h4 className="text-lg font-semibold">Analyzing Spreadsheet...</h4><p className="text-sm text-slate-500">AI is mapping your columns. This might take a moment.</p></div>
                    )}
                    {step === 'error' && (
                         <div className="text-center p-10 bg-red-50 dark:bg-red-900/50 rounded-lg"><h4 className="text-lg font-semibold text-red-700 dark:text-red-300">An Error Occurred</h4><p className="text-sm text-red-600 dark:text-red-400 mt-2">{errorMessage}</p><button onClick={() => setStep('upload')} className="mt-6 btn-secondary">Try Again</button></div>
                    )}
                    {step === 'mapping' && userMapping && (
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-teal-500"/> AI Column Mapping</h4>
                            <p className="text-sm text-slate-500 mb-2">The AI has suggested the following column mappings. Please review and correct them if necessary.</p>
                             <p className="text-xs text-slate-500 mb-4"><span className="text-red-500 font-bold">*</span> Indicates a required field.</p>
                            <div className="space-y-4">
                                {ALL_MAPPING_FIELDS.map(field => {
                                    const isRequired = MANDATORY_FIELDS.includes(field);
                                    return (
                                        <div key={field} className="grid grid-cols-2 gap-4 items-center">
                                            <label className="font-medium text-sm text-right capitalize">
                                                {field.replace(/([A-Z])/g, ' $1')}
                                                {isRequired && <span className="text-red-500 font-bold">*</span>}
                                                {!isRequired && <span className="text-xs text-slate-500 ml-1">(Optional)</span>}
                                                :
                                            </label>
                                            <div>
                                                <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value)} className="form-select w-full">
                                                    <option value="">-- Not in file --</option>
                                                    {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                                {field === 'day' && <p className="mt-1 text-xs text-slate-500">If not mapped, the lesson will be scheduled for every operating day.</p>}
                                                {field === 'endTime' && <p className="mt-1 text-xs text-slate-500">If not mapped, duration is calculated from subject settings.</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {step === 'preview' && parsedData && (
                        <div className="space-y-6">
                            <h4 className="font-semibold text-lg">Import Preview</h4>
                            {parsedData.invalid.length > 0 && (
                                <div><h5 className="font-semibold text-red-600">Skipped Rows ({parsedData.invalid.length})</h5><div className="mt-2 bg-red-50 dark:bg-red-900/50 p-2 rounded-md max-h-40 overflow-y-auto"><ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">{parsedData.invalid.map((item, i) => <li key={i}>Row {item.row.rowIndex}: {item.error}</li>)}</ul></div></div>
                            )}
                            <div><h5 className="font-semibold">Valid Entries ({parsedData.valid.length})</h5>{parsedData.valid.length > 0 ? <div className="mt-2 border rounded-lg overflow-hidden max-h-60 overflow-y-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr><th className="px-2 py-1 text-left">Day</th><th className="px-2 py-1 text-left">Time</th><th className="px-2 py-1 text-left">Subject</th></tr></thead><tbody className="divide-y">{parsedData.valid.slice(0, 10).map((entry, i) => <tr key={i}><td className="px-2 py-1">{entry.day}</td><td className="px-2 py-1">{entry.startTime}-{entry.endTime}</td><td className="px-2 py-1">{subjects.find(s=>s.id === entry.subjectId)?.name}</td></tr>)}</tbody></table>{parsedData.valid.length > 10 && <p className="text-center text-xs p-1 bg-slate-100 dark:bg-slate-700">...and {parsedData.valid.length - 10} more rows.</p>}</div> : <p className="text-sm text-slate-500 mt-2">No valid timetable entries could be parsed.</p>}</div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                    {step === 'mapping' && <button onClick={handleConfirmMapping} className="btn-primary">Confirm Mapping & Preview</button>}
                    {step === 'preview' && <button onClick={handleFinalImport} disabled={!parsedData || parsedData.valid.length === 0} className="btn-primary">Import {parsedData?.valid.length || 0} Entries</button>}
                </div>
                 <style>{`
                    .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                    .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                    .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                    .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                    .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 2.5rem 0.5rem 0.75rem; background-color: white; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
                    .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                    .file-input{display:block;width:100%;font-size:.875rem;line-height:1.25rem;color:#6b7280;file:mr-4;file:px-4;file:py-2;file:rounded-full;file:border-0;file:text-sm;file:font-semibold;file:bg-[var(--color-primary)]/10;file:text-[var(--color-primary)];hover:file:bg-[var(--color-primary)]/20}.dark .file-input{color:#9ca3af;file:bg-slate-700;file:text-slate-200;hover:file:bg-slate-600}
                `}</style>
            </div>
        </div>
    );
};
