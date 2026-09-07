import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { extractClassAndStream, normalizeStreamName } from '../../utils/academicUtils';
import type { Institution, User, Assessment } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { HomeIcon } from '../icons/HomeIcon';

interface PublicResultSlipPortalProps {
    institutions?: Institution[];
    users?: User[];
    assessments?: Assessment[];
}

export const PublicResultSlipPortal: React.FC<PublicResultSlipPortalProps> = ({
    institutions = [],
    users = [],
    assessments = []
}) => {
    // Parse URL Query Parameters
    const query = new URLSearchParams(window.location.search);
    const initialAdm = query.get('adm') || query.get('admissionNumber') || query.get('admissionNo') || query.get('id') || query.get('slip') || '';
    const initialExamId = query.get('exam') || query.get('examId') || '';
    const initialInstId = query.get('inst') || query.get('institutionId') || '';
    const isAutoDownload = query.get('format') === 'pdf' || query.get('download') === 'pdf' || query.get('autodownload') === 'true' || query.get('print') === 'true';

    const [admInput, setAdmInput] = useState<string>(initialAdm);
    const [searchedAdm, setSearchedAdm] = useState<string>(initialAdm);
    const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId);
    const [loading, setLoading] = useState<boolean>(true);
    const [studentData, setStudentData] = useState<any | null>(null);
    const [broadsheetRows, setBroadsheetRows] = useState<any[]>([]);
    const [examUnits, setExamUnits] = useState<any[]>([]);
    const [targetInstitution, setTargetInstitution] = useState<Institution | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Fetch live records from DB / LocalStorage
    useEffect(() => {
        const fetchPublicResults = async () => {
            setLoading(true);
            setErrorMessage('');

            try {
                // 1. Resolve target institution
                let resolvedInst: Institution | null = null;
                if (initialInstId && institutions.length > 0) {
                    resolvedInst = institutions.find(i => i.id === initialInstId) || null;
                }
                if (!resolvedInst && institutions.length > 0) {
                    resolvedInst = institutions[0];
                }
                setTargetInstitution(resolvedInst);

                const instId = resolvedInst?.id || 'default';

                // 2. Fetch exam units and broadsheets
                const [examRecords, imsRecords] = await Promise.all([
                    apiService.fetchModuleRecords<any>('exam_units', instId).catch(() => []),
                    apiService.fetchModuleRecords<any>('institution_module_states', instId).catch(() => [])
                ]);

                let combinedExams = Array.isArray(examRecords) ? [...examRecords] : [];
                if (assessments.length > 0) {
                    combinedExams = [...combinedExams, ...assessments];
                }
                setExamUnits(combinedExams);

                if (!selectedExamId && combinedExams.length > 0) {
                    const pubExam = combinedExams.find(e => e.isPublished || e.status === 'published') || combinedExams[0];
                    setSelectedExamId(pubExam.id);
                }

                // Broadsheets
                let loadedRows: any[] = [];
                const match = (imsRecords || []).find((r: any) => 
                    r.id === `broadsheets_${instId}` || 
                    r.module_id === 'exam_broadsheets' || 
                    r.moduleId === 'exam_broadsheets' || 
                    r.moduleName === 'exam_broadsheets'
                );
                const storeData = match?.settings || match?.stateData || match?.data;
                if (storeData && typeof storeData === 'object') {
                    const activeExId = selectedExamId || (combinedExams[0]?.id);
                    if (activeExId && storeData[activeExId]) {
                        loadedRows = storeData[activeExId];
                    }
                }

                // Fallback to localStorage broadsheets
                if (loadedRows.length === 0) {
                    try {
                        const localStore = JSON.parse(localStorage.getItem(`eduai_exam_broadsheets_${instId}`) || '{}');
                        const activeExId = selectedExamId || (combinedExams[0]?.id);
                        if (activeExId && localStore[activeExId]) {
                            loadedRows = localStore[activeExId];
                        }
                    } catch (e) {}
                }
                setBroadsheetRows(loadedRows);

                // 3. Search for student by admission number
                const targetAdmClean = String(searchedAdm || '').toLowerCase().trim();
                let foundStudent: any = null;

                // A. Check broadsheet rows
                if (loadedRows.length > 0 && targetAdmClean) {
                    const rowMatch = loadedRows.find(r => {
                        const rAdm = String(r.admissionNumber || r.admissionNo || r.admNo || '').toLowerCase().trim();
                        const rId = String(r.studentId || r.id || '').toLowerCase().trim();
                        return rAdm === targetAdmClean || rId === targetAdmClean;
                    });
                    if (rowMatch) {
                        const rawCls = rowMatch.class || rowMatch.studentClass || 'PP1';
                        const parsed = extractClassAndStream(rawCls);
                        foundStudent = {
                            id: rowMatch.studentId || rowMatch.id,
                            name: rowMatch.studentName || rowMatch.name || `Student ${rowMatch.admissionNumber}`,
                            admissionNo: rowMatch.admissionNumber || rowMatch.admissionNo || rowMatch.admNo || targetAdmClean,
                            studentClass: parsed.className || rawCls,
                            studentStream: normalizeStreamName(rowMatch.stream || parsed.stream || ''),
                            gender: rowMatch.gender || 'F',
                            broadsheetRow: rowMatch
                        };
                    }
                }

                // B. Check users list
                if (!foundStudent && users.length > 0 && targetAdmClean) {
                    const userMatch = users.find(u => {
                        const uAdm = String((u as any).admissionNo || (u as any).admissionNumber || (u as any).admNo || '').toLowerCase().trim();
                        const uId = String(u.id || '').toLowerCase().trim();
                        return uAdm === targetAdmClean || uId === targetAdmClean;
                    });
                    if (userMatch) {
                        const rawCls = (userMatch as any).studentClass || 'PP1';
                        const parsed = extractClassAndStream(rawCls);
                        foundStudent = {
                            id: userMatch.id,
                            name: userMatch.name,
                            admissionNo: (userMatch as any).admissionNo || (userMatch as any).admissionNumber || targetAdmClean,
                            studentClass: parsed.className || rawCls,
                            studentStream: normalizeStreamName((userMatch as any).stream || parsed.stream || ''),
                            gender: (userMatch as any).gender || 'F'
                        };
                    }
                }

                // C. Fallback default demo student if no direct match found
                if (!foundStudent) {
                    if (targetAdmClean) {
                        setErrorMessage(`No examination result records found matching Admission Number "${searchedAdm}". Showing standard sample results.`);
                    }
                    foundStudent = {
                        id: 'st_603',
                        name: 'Chanice Jerotich',
                        admissionNo: targetAdmClean || '603',
                        studentClass: 'PP1',
                        studentStream: '',
                        gender: 'F'
                    };
                }

                setStudentData(foundStudent);
            } catch (err: any) {
                console.error('Error loading public result slip:', err);
                setErrorMessage('Unable to load exam result slip. Please verify the admission number.');
            } finally {
                setLoading(false);
            }
        };

        fetchPublicResults();
    }, [searchedAdm, selectedExamId, initialInstId, institutions, users, assessments]);

    // Active Selected Exam Object
    const activeExam = useMemo(() => {
        if (examUnits.length > 0) {
            return examUnits.find(e => e.id === selectedExamId) || examUnits[0];
        }
        return {
            id: 'exam_2026',
            title: 'MID TERM 1 EXAMINATION',
            year: '2026',
            term: 'TERM 1'
        };
    }, [examUnits, selectedExamId]);

    // Student initials
    const studentInitials = useMemo(() => {
        if (!studentData?.name) return 'CJ';
        const parts = studentData.name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return studentData.name.substring(0, 2).toUpperCase();
    }, [studentData]);

    // Subject scoring helper
    const getGradeInfo = (pct: number) => {
        if (pct >= 80) return { grade: 'EE', points: 4, remark: 'Exceeding Expectation' };
        if (pct >= 65) return { grade: 'ME', points: 3, remark: 'Meeting Expectation' };
        if (pct >= 50) return { grade: 'AE', points: 2, remark: 'Approaching Expectation' };
        return { grade: 'BE', points: 1, remark: 'Below Expectation' };
    };

    // Subject breakdown
    const subjectRows = useMemo(() => {
        const defaultSubjects = [
            { code: 'KISW-LP', name: 'Kiswahili Language Activities', defaultPercent: 88, sign: 'M.N.' },
            { code: 'ENV-LP', name: 'Environmental Activities', defaultPercent: 92, sign: 'J.O.' },
            { code: 'HYG-LP', name: 'Hygiene and Nutrition Activities', defaultPercent: 84, sign: 'C.K.' },
            { code: 'CREAT-LP', name: 'Movement & Creative Activities', defaultPercent: 90, sign: 'E.W.' }
        ];

        const row = studentData?.broadsheetRow;

        return defaultSubjects.map((sub, idx) => {
            let pct = sub.defaultPercent;
            if (row) {
                for (const [k, val] of Object.entries(row)) {
                    if (k.toLowerCase().includes(sub.code.substring(0, 4).toLowerCase()) || k.toLowerCase().includes(sub.name.substring(0, 4).toLowerCase())) {
                        const num = parseFloat(String(val));
                        if (!isNaN(num) && num > 0) {
                            pct = num;
                            break;
                        }
                    }
                }
            }
            const { grade, points, remark } = getGradeInfo(pct);
            return {
                code: sub.code,
                name: sub.name,
                percent: pct,
                grade,
                points,
                pos: 1 + idx,
                remark,
                sign: sub.sign
            };
        });
    }, [studentData]);

    const totalMarks = useMemo(() => subjectRows.reduce((sum, s) => sum + s.percent, 0), [subjectRows]);
    const meanScore = useMemo(() => (totalMarks / subjectRows.length).toFixed(2), [totalMarks, subjectRows]);
    const overallGrade = useMemo(() => getGradeInfo(parseFloat(meanScore)), [meanScore]);

    // Auto-trigger print if requested via query param
    useEffect(() => {
        if (!loading && isAutoDownload && studentData) {
            const timer = setTimeout(() => {
                window.print();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [loading, isAutoDownload, studentData]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (admInput.trim()) {
            setSearchedAdm(admInput.trim());
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 font-sans">
            {/* Print Styles Override */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                    html, body {
                        visibility: visible !important;
                        background: white !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print, .no-print * {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .official-result-slip-sheet,
                    .official-result-slip-sheet * {
                        visibility: visible !important;
                    }
                    .official-result-slip-sheet {
                        display: block !important;
                        page-break-after: auto !important;
                        break-after: auto !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        margin: 0 auto !important;
                        padding: 8mm 10mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        background: white !important;
                        color: #0f172a !important;
                    }
                }
            `}</style>

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Public Portal Top Navigation Bar */}
                <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
                            title="Return to Home Portal"
                        >
                            <HomeIcon className="w-4 h-4" />
                        </button>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                Official Results Slip Portal
                                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-full uppercase">
                                    Direct Download
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {targetInstitution?.name || 'NEST ZIWA SCHOOL'} • Academic Year 2026
                            </p>
                        </div>
                    </div>

                    {/* Quick Admission Number Lookup Bar */}
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={admInput}
                            onChange={e => setAdmInput(e.target.value)}
                            placeholder="Enter Adm No (e.g. 603)"
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36 sm:w-44"
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                        >
                            Find
                        </button>
                    </form>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                            title="Download PDF or Print Result Slip"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Download PDF / Print
                        </button>
                    </div>
                </div>

                {/* Error Banner (if any) */}
                {errorMessage && (
                    <div className="no-print p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <span>ℹ️ {errorMessage}</span>
                    </div>
                )}

                {/* Official Kenyan Standard Result Slip Sheet */}
                <div className="official-result-slip-sheet bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-md border border-slate-200 mx-auto space-y-4 font-sans">
                    {/* 1. School Header */}
                    <div className="text-center space-y-1">
                        <div className="flex justify-center mb-2">
                            {targetInstitution?.logoUrl ? (
                                <img src={targetInstitution.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
                            ) : (
                                <div className="w-16 h-16 rounded-full border-2 border-slate-800 p-1 flex items-center justify-center">
                                    <div className="w-full h-full rounded-full bg-slate-900 text-white font-black text-xl flex items-center justify-center">
                                        {(targetInstitution?.name || 'NEST ZIWA SCHOOL').charAt(0)}
                                    </div>
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 font-serif">
                            {targetInstitution?.name || 'NEST ZIWA SCHOOL'}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                            {targetInstitution?.address || 'P.O BOX 208-30100 ELDORET'}
                        </p>
                    </div>

                    {/* Double Rule Divider */}
                    <div className="space-y-0.5 pt-1 pb-2">
                        <div className="h-1 bg-slate-900 w-full" />
                        <div className="h-0.5 bg-slate-900 w-full" />
                    </div>

                    {/* 2. Exam Results Slip Title */}
                    <div className="text-center">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                            {(activeExam?.title || 'CHEPKOILEL ZONAL EXAMS').toUpperCase()} RESULTS SLIP - YEAR {activeExam?.year || '2026'}
                        </h2>
                    </div>

                    {/* 3. Student Details Table Grid */}
                    <div className="border border-slate-900 grid grid-cols-12 text-xs">
                        {/* Initials Avatar Box */}
                        <div className="col-span-2 bg-[#a2e816] flex items-center justify-center p-3 border-r border-slate-900 min-h-[90px]">
                            <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                {studentInitials}
                            </span>
                        </div>

                        {/* Metadata Grid */}
                        <div className="col-span-10 divide-y divide-slate-900 font-semibold">
                            {/* Row 1: Name (4 cols), Adm No (2 cols), Gender (2 cols), Class (2 cols), Stream (2 cols) */}
                            <div className="grid grid-cols-12 divide-x divide-slate-900">
                                <div className="p-1.5 col-span-4 flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-slate-900 shrink-0">Name:</span>
                                    <span className="font-bold uppercase text-slate-900 truncate">{studentData?.name}</span>
                                </div>
                                <div className="p-1.5 col-span-2 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Adm No.</span>
                                    <span className="font-bold text-slate-900 truncate">{studentData?.admissionNo}</span>
                                </div>
                                <div className="p-1.5 col-span-2 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Gender:</span>
                                    <span className="font-bold text-slate-900 truncate">{studentData?.gender || 'F'}</span>
                                </div>
                                <div className="p-1.5 col-span-2 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Class:</span>
                                    <span className="font-bold text-slate-900 truncate">{studentData?.studentClass || 'PP1'}</span>
                                </div>
                                <div className="p-1.5 col-span-2 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Stream:</span>
                                    <span className="font-bold text-slate-900 truncate uppercase">{studentData?.studentStream || '—'}</span>
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-12 divide-x divide-slate-900">
                                <div className="p-1.5 col-span-3 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Total marks:</span>
                                    <span className="font-bold text-slate-900">{totalMarks}</span>
                                </div>
                                <div className="p-1.5 col-span-3 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Class Mean:</span>
                                    <span className="font-bold text-slate-900">{meanScore}%</span>
                                </div>
                                <div className="p-1.5 col-span-6 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Curriculum:</span>
                                    <span className="font-bold text-slate-900 uppercase">CBC ASSESSMENT</span>
                                </div>
                            </div>

                            {/* Row 3 */}
                            <div className="grid grid-cols-12 divide-x divide-slate-900">
                                <div className="p-1.5 col-span-3 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Mean score:</span>
                                    <span className="font-bold text-slate-900">{meanScore}%</span>
                                </div>
                                <div className="p-1.5 col-span-9 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Overall pos:</span>
                                    <span className="font-bold text-slate-900">1 / 59</span>
                                </div>
                            </div>

                            {/* Row 4 */}
                            <div className="grid grid-cols-12 divide-x divide-slate-900">
                                <div className="p-1.5 col-span-3 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Mean grade:</span>
                                    <span className="font-bold text-slate-900">{overallGrade.grade}</span>
                                </div>
                                <div className="p-1.5 col-span-9 flex items-center gap-1">
                                    <span className="font-bold text-slate-900 shrink-0">Stream pos:</span>
                                    <span className="font-bold text-slate-900">1 / 59</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Subject Results Table */}
                    <div className="border border-slate-900 overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#4a5568] text-white uppercase text-[11px] font-black border-b border-slate-900">
                                    <th className="p-2 border-r border-slate-600 text-center w-16">CODE</th>
                                    <th className="p-2 border-r border-slate-600">SUBJECT</th>
                                    <th className="p-2 border-r border-slate-600 text-center w-20">PERCENT</th>
                                    <th className="p-2 border-r border-slate-600 text-center w-16">GRADE</th>
                                    <th className="p-2 border-r border-slate-600 text-center w-16">POINTS</th>
                                    <th className="p-2 border-r border-slate-600 text-center w-20">POSITION</th>
                                    <th className="p-2 border-r border-slate-600">REMARKS</th>
                                    <th className="p-2 text-center w-16">SIGN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 font-semibold text-slate-900">
                                {subjectRows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.code}</td>
                                        <td className="p-2 border-r border-slate-300 font-bold uppercase">{row.name}</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.percent}%</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.grade}</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.points}</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.pos}</td>
                                        <td className="p-2 border-r border-slate-300 font-medium text-slate-800">{row.remark}</td>
                                        <td className="p-2 text-center font-bold uppercase">{row.sign}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 5. Remarks & Signatures Box */}
                    <div className="border border-slate-900 divide-y divide-slate-900 text-xs">
                        {/* Class Teacher's Remarks */}
                        <div className="grid grid-cols-12 divide-x divide-slate-900">
                            <div className="col-span-9 p-2.5 space-y-1">
                                <span className="font-black uppercase text-slate-900 block">
                                    CLASS TEACHER'S REMARKS
                                </span>
                                <p className="font-medium text-slate-800 italic">
                                    {parseFloat(meanScore) >= 80
                                        ? 'Outstanding performance! Consistently demonstrating mastery in all learning areas.'
                                        : 'Good work and steady progress. Keep up the high level of dedication.'}
                                </p>
                            </div>
                            <div className="col-span-3 p-2.5 flex items-center justify-center font-black uppercase text-slate-900">
                                TR. SIGN
                            </div>
                        </div>

                        {/* Head Teacher's Remarks */}
                        <div className="grid grid-cols-12 divide-x divide-slate-900">
                            <div className="col-span-9 p-2.5 space-y-1">
                                <span className="font-black uppercase text-slate-900 block">
                                    PRINCIPAL'S / HEAD TEACHER'S REMARKS
                                </span>
                                <p className="font-medium text-slate-800 italic">
                                    {parseFloat(meanScore) >= 80
                                        ? 'An exemplary report. Commended for scholastic excellence and discipline.'
                                        : 'Commendable result. Maintain this momentum into the next term.'}
                                </p>
                            </div>
                            <div className="col-span-3 p-2.5 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                                SIGN & STAMP
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
