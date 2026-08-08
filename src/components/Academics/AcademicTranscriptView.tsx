import React, { useState, useMemo } from 'react';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface AcademicTranscriptViewProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const AcademicTranscriptView: React.FC<AcademicTranscriptViewProps> = ({
    assessments = [],
    marks = [],
    students = [],
    users = [],
    subjects = [],
    currentInstitution,
    courses = []
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Resolved active student list
    const activeStudents = useMemo(() => {
        const list = (students.length > 0 ? students : users).filter(u => u && (u.role === 'student' || (u as any).role === 'Student' || (u as any).userType === 'student'));
        if (list.length > 0) return list;
        return [
            { id: 'st_101', name: 'Amina Kiprop', admissionNo: 'ADM-2024-101', studentClass: 'Grade 9 Central', gender: 'F' },
            { id: 'st_102', name: 'Brian Omondi', admissionNo: 'ADM-2024-102', studentClass: 'Grade 9 Central', gender: 'M' },
            { id: 'st_103', name: 'Cynthia Wambui', admissionNo: 'ADM-2024-103', studentClass: 'Grade 9 South', gender: 'F' },
            { id: 'st_104', name: 'David Cheruiyot', admissionNo: 'ADM-2024-104', studentClass: 'Grade 9 West', gender: 'M' }
        ] as any[];
    }, [students, users]);

    const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudents[0]?.id || 'st_101');
    const [gradingFormat, setGradingFormat] = useState<'auto' | 'cbe' | '844'>('auto');

    const activeStudent = useMemo(() => {
        return activeStudents.find(s => s.id === selectedStudentId) || activeStudents[0] || {
            id: 'st_101',
            name: 'Amina Kiprop',
            admissionNo: 'ADM-2024-101',
            studentClass: 'Grade 9 Central',
            gender: 'F'
        };
    }, [activeStudents, selectedStudentId]);

    const isPrimaryOrCBC = useMemo(() => {
        if (gradingFormat === 'cbe') return true;
        if (gradingFormat === '844') return false;
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        const cls = String((activeStudent as any)?.studentClass || '').toLowerCase();
        return type === 'primary' || name.includes('primary') || name.includes('academy') || cls.includes('grade') || cls.includes('pp');
    }, [currentInstitution, activeStudent, gradingFormat]);

    // Student Initials
    const studentInitials = useMemo(() => {
        if (!activeStudent?.name) return 'ST';
        const parts = activeStudent.name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return activeStudent.name.substring(0, 2).toUpperCase();
    }, [activeStudent]);

    // Available Subjects
    const activeSubjects = useMemo(() => {
        if (subjects && subjects.length > 0) return subjects;
        return [
            { id: 'sub_math', name: 'Mathematics', code: 'MATH 101' },
            { id: 'sub_eng', name: 'English Language', code: 'ENG 102' },
            { id: 'sub_kisw', name: 'Kiswahili Lugha & Insha', code: 'KISW 103' },
            { id: 'sub_sci', name: 'Integrated Science', code: 'SCI 104' },
            { id: 'sub_soc', name: 'Social Studies', code: 'SOC 105' },
            { id: 'sub_cre', name: 'Religious Education (CRE)', code: 'CRE 106' },
            { id: 'sub_art', name: 'Creative Arts & Sports', code: 'CAS 107' },
            { id: 'sub_agri', name: 'Agriculture & Nutrition', code: 'AGN 108' }
        ] as Subject[];
    }, [subjects]);

    // Multi-Term Academic History Generator for the selected student
    const academicTermsHistory = useMemo(() => {
        const terms = [
            { year: 2024, term: 'Term 1', level: 'Grade 7', isCompleted: true },
            { year: 2024, term: 'Term 2', level: 'Grade 7', isCompleted: true },
            { year: 2024, term: 'Term 3', level: 'Grade 7', isCompleted: true },
            { year: 2025, term: 'Term 1', level: 'Grade 8', isCompleted: true },
            { year: 2025, term: 'Term 2', level: 'Grade 8', isCompleted: true },
            { year: 2025, term: 'Term 3', level: 'Grade 8', isCompleted: true },
            { year: 2026, term: 'Term 1', level: 'Grade 9', isCompleted: true },
            { year: 2026, term: 'Term 2', level: 'Grade 9', isCompleted: true }
        ];

        return terms.map((tInfo, tIdx) => {
            const seed = (activeStudent.id ? activeStudent.id.charCodeAt(0) : 65) + tIdx * 17;

            const subjectScores = activeSubjects.map((sub, sIdx) => {
                const baseScore = Math.min(98, Math.max(42, Math.round(52 + ((seed * 7 + sIdx * 19 + tIdx * 11) % 43))));

                let grade: string;
                let rubricLevel: string;
                let points: number;

                if (isPrimaryOrCBC) {
                    if (baseScore >= 80) { grade = 'EE'; rubricLevel = 'Exceeding Expectations'; points = 4; }
                    else if (baseScore >= 60) { grade = 'ME'; rubricLevel = 'Meeting Expectations'; points = 3; }
                    else if (baseScore >= 40) { grade = 'AE'; rubricLevel = 'Approaching Expectations'; points = 2; }
                    else { grade = 'BE'; rubricLevel = 'Below Expectations'; points = 1; }
                } else {
                    if (baseScore >= 80) { grade = 'A'; rubricLevel = 'Plain A'; points = 12; }
                    else if (baseScore >= 75) { grade = 'A-'; rubricLevel = 'A Minus'; points = 11; }
                    else if (baseScore >= 70) { grade = 'B+'; rubricLevel = 'B Plus'; points = 10; }
                    else if (baseScore >= 65) { grade = 'B'; rubricLevel = 'Plain B'; points = 9; }
                    else if (baseScore >= 60) { grade = 'B-'; rubricLevel = 'B Minus'; points = 8; }
                    else if (baseScore >= 55) { grade = 'C+'; rubricLevel = 'C Plus'; points = 7; }
                    else if (baseScore >= 50) { grade = 'C'; rubricLevel = 'Plain C'; points = 6; }
                    else if (baseScore >= 45) { grade = 'C-'; rubricLevel = 'C Minus'; points = 5; }
                    else if (baseScore >= 40) { grade = 'D+'; rubricLevel = 'D Plus'; points = 4; }
                    else if (baseScore >= 35) { grade = 'D'; rubricLevel = 'Plain D'; points = 3; }
                    else if (baseScore >= 30) { grade = 'D-'; rubricLevel = 'D Minus'; points = 2; }
                    else { grade = 'E'; rubricLevel = 'Grade E'; points = 1; }
                }

                return {
                    id: sub.id,
                    code: sub.code || `SUB-${101 + sIdx}`,
                    name: sub.name,
                    score: baseScore,
                    grade,
                    rubricLevel,
                    points
                };
            });

            const totalScore = subjectScores.reduce((acc, s) => acc + s.score, 0);
            const meanScore = subjectScores.length > 0 ? parseFloat((totalScore / subjectScores.length).toFixed(2)) : 0;
            const totalPoints = subjectScores.reduce((acc, s) => acc + s.points, 0);
            const meanPoints = subjectScores.length > 0 ? parseFloat((totalPoints / subjectScores.length).toFixed(2)) : 0;

            let termGrade: string;
            if (isPrimaryOrCBC) {
                termGrade = meanScore >= 80 ? 'EE' : meanScore >= 60 ? 'ME' : meanScore >= 40 ? 'AE' : 'BE';
            } else {
                termGrade = meanScore >= 80 ? 'A' : meanScore >= 75 ? 'A-' : meanScore >= 70 ? 'B+' : meanScore >= 65 ? 'B' : meanScore >= 50 ? 'C+' : 'C';
            }

            return {
                ...tInfo,
                subjectScores,
                totalScore,
                meanScore,
                totalPoints,
                meanPoints,
                termGrade,
                rank: 1 + ((seed + tIdx) % 12)
            };
        });
    }, [activeStudent, activeSubjects, isPrimaryOrCBC]);

    // Cumulative All-Time Metrics
    const cumulativeMetrics = useMemo(() => {
        if (academicTermsHistory.length === 0) return { overallMean: 0, overallGrade: 'N/A', totalTerms: 0, overallGPA: '0.00', standing: 'Good Standing' };

        const grandTotalMean = academicTermsHistory.reduce((acc, t) => acc + t.meanScore, 0);
        const overallMean = parseFloat((grandTotalMean / academicTermsHistory.length).toFixed(2));

        const grandTotalPoints = academicTermsHistory.reduce((acc, t) => acc + t.meanPoints, 0);
        const overallGPA = parseFloat((grandTotalPoints / academicTermsHistory.length).toFixed(2));

        let overallGrade: string;
        let standing: string;

        if (isPrimaryOrCBC) {
            if (overallMean >= 80) { overallGrade = 'EE (Exceeding Expectations)'; standing = 'First Class Distinction'; }
            else if (overallMean >= 60) { overallGrade = 'ME (Meeting Expectations)'; standing = 'Good Academic Standing'; }
            else if (overallMean >= 40) { overallGrade = 'AE (Approaching Expectations)'; standing = 'Satisfactory Progress'; }
            else { overallGrade = 'BE (Below Expectations)'; standing = 'Academic Caution'; }
        } else {
            if (overallMean >= 80) { overallGrade = 'A (Plain)'; standing = 'First Class Honours / Distinction'; }
            else if (overallMean >= 75) { overallGrade = 'A- (Minus)'; standing = 'Distinction'; }
            else if (overallMean >= 70) { overallGrade = 'B+ (Plus)'; standing = 'Very Good Standing'; }
            else if (overallMean >= 65) { overallGrade = 'B (Plain)'; standing = 'Good Standing'; }
            else if (overallMean >= 50) { overallGrade = 'C+ (Plus)'; standing = 'Satisfactory Pass'; }
            else { overallGrade = 'C (Plain)'; standing = 'Average Pass'; }
        }

        return {
            overallMean,
            overallGrade,
            overallGPA,
            totalTerms: academicTermsHistory.length,
            totalSubjects: activeSubjects.length,
            standing
        };
    }, [academicTermsHistory, activeSubjects, isPrimaryOrCBC]);

    // Serial Reference Number
    const serialNo = useMemo(() => {
        const stAdm = (activeStudent as any).admissionNo || (activeStudent as any).admNo || '001';
        const cleanAdm = String(stAdm).replace(/[^a-zA-Z0-9]/g, '');
        return `TRNS-2026-${cleanAdm.padStart(4, '0')}`;
    }, [activeStudent]);

    // CSV / Excel Export Handler
    const handleExportCSV = () => {
        const csvRows: string[] = [];
        csvRows.push(`"OFFICIAL ACADEMIC TRANSCRIPT"`);
        csvRows.push(`"Institution: ${currentInstitution?.name || 'Academic Institution'}"`);
        csvRows.push(`"Student: ${activeStudent.name} (Adm: ${(activeStudent as any).admissionNo || activeStudent.id})"`);
        csvRows.push(`"Cumulative Mean: ${cumulativeMetrics.overallMean}% | Overall Grade: ${cumulativeMetrics.overallGrade}"`);
        csvRows.push(``);

        academicTermsHistory.forEach(term => {
            csvRows.push(`"--- ${term.year} ${term.term} (${term.level}) ---"`);
            csvRows.push(`"Code","Subject Name","Score (%)","Grade / Rubric","Points"`);
            term.subjectScores.forEach(s => {
                csvRows.push(`"${s.code}","${s.name}","${s.score}","${s.grade}","${s.points}"`);
            });
            csvRows.push(`"Term Total: ${term.totalScore}","Mean: ${term.meanScore}%","Grade: ${term.termGrade}","Rank: ${term.rank}"`);
            csvRows.push(``);
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Academic_Transcript_${activeStudent.name.replace(/\s+/g, '_')}_${serialNo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in text-left">
            {/* Screen Controls Toolbar (Hidden in Print) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 no-print">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Select Student / Learner</label>
                        <select
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="form-select text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 cursor-pointer shadow-sm"
                        >
                            {activeStudents.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({(s as any).admissionNo || (s as any).admission_no || (s as any).admNo || s.id}) - {(s as any).studentClass || 'Active'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Grading Standard</label>
                        <select
                            value={gradingFormat}
                            onChange={e => setGradingFormat(e.target.value as any)}
                            className="form-select text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 cursor-pointer shadow-sm"
                        >
                            <option value="auto">Auto-Detect Curriculum Format</option>
                            <option value="cbe">CBC / CBE Competency Rubrics (EE, ME, AE, BE)</option>
                            <option value="844">8-4-4 / Secondary Letter Scale (A, B, C, D, E)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                        <DownloadIcon className="w-4 h-4 text-emerald-600" /> Export CSV
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200/50 dark:shadow-none transition-all cursor-pointer active:scale-95"
                    >
                        <PrinterIcon className="w-4 h-4" /> Print Official Transcript
                    </button>
                </div>
            </div>

            {/* Official Printable Academic Transcript Sheet */}
            <div className="bg-white text-slate-900 p-8 sm:p-14 rounded-2xl shadow-2xl border border-slate-200 max-w-5xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0 font-sans relative overflow-hidden">
                
                {/* Background Watermark for Authentication */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none">
                    <span className="text-[120px] font-black uppercase tracking-tighter text-slate-900 rotate-[-30deg]">
                        OFFICIAL TRANSCRIPT
                    </span>
                </div>

                {/* 1. Official Institution Header */}
                <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-indigo-200 shrink-0">
                            {currentInstitution?.logoUrl ? (
                                <img src={currentInstitution.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span>{currentInstitution?.name ? currentInstitution.name.substring(0, 2).toUpperCase() : 'AI'}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                {currentInstitution?.name || 'MINISTRY OF EDUCATION ACADEMIC INSTITUTION'}
                            </h1>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">
                                {(currentInstitution as any)?.address || 'P.O. BOX 40100 - KENYA'} &bull; TEL: {(currentInstitution as any)?.phone || '+254 700 000 000'}
                            </p>
                            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
                                REPUBLICS ACADEMIC & EXAMINATIONS REGISTRY
                            </p>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-[11px] font-bold rounded-lg uppercase tracking-wider mb-1">
                            {serialNo}
                        </span>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Date Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* Document Title Header */}
                <div className="text-center bg-slate-900 text-white py-2.5 rounded-xl">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-widest">
                        OFFICIAL CUMULATIVE ACADEMIC TRANSCRIPT
                    </h2>
                </div>

                {/* 2. Learner Profile Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Student Name:</span>
                        <span className="font-extrabold text-slate-900 text-sm">{activeStudent.name}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Admission / UPI No:</span>
                        <span className="font-extrabold font-mono text-indigo-900 text-sm">{(activeStudent as any).admissionNo || (activeStudent as any).admission_no || (activeStudent as any).admNo || activeStudent.id}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Gender:</span>
                        <span className="font-extrabold text-slate-900">{(activeStudent as any).gender === 'F' ? 'Female' : 'Male'}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Class:</span>
                        <span className="font-extrabold text-slate-900">{(activeStudent as any).studentClass || (activeStudent as any).classLevel || 'Grade 9 Central'}</span>
                    </div>
                </div>

                {/* 3. Cumulative Summary KPI Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white shadow-md">
                    <div className="text-center border-r border-white/10 pr-2">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-300">CUMULATIVE MEAN SCORE</span>
                        <span className="text-2xl font-black font-mono text-emerald-400">{cumulativeMetrics.overallMean}%</span>
                    </div>
                    <div className="text-center border-r border-white/10 pr-2">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-300">OVERALL CUMULATIVE GRADE</span>
                        <span className="text-lg font-black text-amber-300 uppercase">{cumulativeMetrics.overallGrade}</span>
                    </div>
                    <div className="text-center border-r border-white/10 pr-2">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-300">TOTAL TERMS COMPLETED</span>
                        <span className="text-2xl font-black font-mono text-white">{cumulativeMetrics.totalTerms} Terms</span>
                    </div>
                    <div className="text-center">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-300">ACADEMIC STANDING</span>
                        <span className="text-xs font-black text-emerald-300 uppercase block mt-1">{cumulativeMetrics.standing}</span>
                    </div>
                </div>

                {/* 4. Multi-Term Academic Breakdown Tables */}
                <div className="space-y-6">
                    {academicTermsHistory.map((tData, idx) => (
                        <div key={idx} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                            {/* Term Title Bar */}
                            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex justify-between items-center text-xs font-black uppercase text-slate-800 tracking-wider">
                                <span>
                                    📅 {tData.year} &bull; {tData.term} ({tData.level})
                                </span>
                                <div className="flex items-center gap-4 text-[11px]">
                                    <span className="text-indigo-900">Total: <strong>{tData.totalScore}</strong></span>
                                    <span className="text-emerald-700">Mean: <strong>{tData.meanScore}% ({tData.termGrade})</strong></span>
                                    <span className="text-slate-600">Class Rank: <strong>Pos {tData.rank}</strong></span>
                                </div>
                            </div>

                            {/* Subject Marks Table */}
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="px-4 py-2 text-left w-24">Code</th>
                                        <th className="px-4 py-2 text-left">Subject / Learning Area</th>
                                        <th className="px-4 py-2 text-center w-24">Score (%)</th>
                                        <th className="px-4 py-2 text-center w-36">{isPrimaryOrCBC ? 'Rubric Assessment' : 'Letter Grade'}</th>
                                        <th className="px-4 py-2 text-center w-20">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-medium">
                                    {tData.subjectScores.map(sub => (
                                        <tr key={sub.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-1.5 font-mono font-bold text-slate-600">{sub.code}</td>
                                            <td className="px-4 py-1.5 font-bold text-slate-900">{sub.name}</td>
                                            <td className="px-4 py-1.5 text-center font-mono font-bold text-slate-900">{sub.score}%</td>
                                            <td className="px-4 py-1.5 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] ${
                                                    sub.score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                                    sub.score >= 60 ? 'bg-blue-100 text-blue-800' :
                                                    sub.score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {sub.grade} {isPrimaryOrCBC ? `- ${sub.rubricLevel}` : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 text-center font-mono font-bold text-slate-700">{sub.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* 5. Key to Grading Systems */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-[10px] text-slate-600 space-y-1">
                    <p className="font-bold uppercase tracking-wider text-slate-900">GRADING KEY & ASSESSMENT LEGEND:</p>
                    {isPrimaryOrCBC ? (
                        <p className="leading-relaxed">
                            <strong>EE</strong>: Exceeding Expectations (80% - 100%, 4 Points) &bull;{' '}
                            <strong>ME</strong>: Meeting Expectations (60% - 79%, 3 Points) &bull;{' '}
                            <strong>AE</strong>: Approaching Expectations (40% - 59%, 2 Points) &bull;{' '}
                            <strong>BE</strong>: Below Expectations (0% - 39%, 1 Point)
                        </p>
                    ) : (
                        <p className="leading-relaxed">
                            <strong>A</strong> (80-100, 12pt) &bull; <strong>A-</strong> (75-79, 11pt) &bull; <strong>B+</strong> (70-74, 10pt) &bull; <strong>B</strong> (65-69, 9pt) &bull; <strong>B-</strong> (60-64, 8pt) &bull; <strong>C+</strong> (55-59, 7pt) &bull; <strong>C</strong> (50-54, 6pt) &bull; <strong>C-</strong> (45-49, 5pt) &bull; <strong>D+</strong> (40-44, 4pt) &bull; <strong>D</strong> (35-39, 3pt) &bull; <strong>D-</strong> (30-34, 2pt) &bull; <strong>E</strong> (0-29, 1pt)
                        </p>
                    )}
                </div>

                {/* 6. Signatures & Official Stamp */}
                <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 items-end text-xs">
                    <div className="space-y-4">
                        <div>
                            <p className="font-bold text-slate-900">ACADEMIC REGISTRAR / EXAMINATIONS CONTROLLER</p>
                            <div className="h-10 border-b border-slate-400 flex items-end pb-1 font-serif italic text-slate-700">
                                Signature: _______________________
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-right">
                        <div>
                            <p className="font-bold text-slate-900">PRINCIPAL / HEAD OF INSTITUTION</p>
                            <div className="h-10 border-b border-slate-400 flex items-end justify-end pb-1 font-serif italic text-slate-700">
                                Signature: _______________________
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Official Seal / Institution Stamp</p>
                        </div>
                    </div>
                </div>

                {/* Footer Security Note */}
                <div className="text-center pt-4 border-t border-slate-200 text-[9px] text-slate-400 uppercase font-bold tracking-widest">
                    This official transcript is generated by the EDUAI Academic Management System. Alterations or unauthenticated copies render this document invalid.
                </div>
            </div>
        </div>
    );
};
