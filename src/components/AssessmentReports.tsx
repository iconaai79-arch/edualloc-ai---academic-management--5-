import React, { useState, useMemo, useEffect } from 'react';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { ResultSlip } from './ResultSlip';
import { ReportCard } from './ReportCard';
import { EyeIcon } from './icons/EyeIcon';
import { XIcon } from './icons/XIcon';
import type { User, Assessment, AssessmentMark, Subject, Course, Department, LetterheadConfig, AssessmentType, Institution, GradingSystem } from '../types';

interface AssessmentReportsProps {
    currentUser: User;
    isDos?: boolean;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    users: User[];
    subjects: Subject[];
    courses: Course[];
    departments: Department[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    currentInstitution?: Institution | null;
}

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(100, Math.max(0, value));
    let colorClass = 'bg-sky-500';
    if (percentage < 40) colorClass = 'bg-red-500';
    else if (percentage < 70) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-green-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export const AssessmentReports: React.FC<AssessmentReportsProps> = (props) => {
    const { currentUser, assessments, assessmentMarks, users, subjects, courses, departments, currentInstitution } = props;
    const isDos = props.isDos ?? (
        currentUser.role === 'dos' ||
        currentUser.role === 'director_of_studies' ||
        currentUser.role === 'academics_officer' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'super_admin' ||
        currentUser.role === 'head_teacher'
    );
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
    const [printMode, setPrintMode] = useState<'none' | 'result_slip' | 'report_card'>('none');
    const [activeStudent, setActiveStudent] = useState<User | null>(null);

    const activeGradingSystem = useMemo(() => {
        if (!currentInstitution) return null;
        return currentInstitution.gradingSystems?.find(s => s.id === currentInstitution.activeGradingSystemId) || currentInstitution.gradingSystems?.[0] || null;
    }, [currentInstitution]);

    const visibleSubjects = useMemo(() => {
        if (isDos) {
            return subjects;
        }
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            return subjects.filter(s => s.departmentId === currentUser.departmentId);
        }
        return subjects;
    }, [isDos, currentUser, subjects]);

    const visibleCourses = useMemo(() => {
        if (isDos) {
            return courses;
        }
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            return courses.filter(c => c.departmentId === currentUser.departmentId);
        }
        const subjectIds = new Set(visibleSubjects.map(s => s.id));
        const matching = courses.filter(c => c.levels && c.levels.some(l => l.subjectIds && l.subjectIds.some(id => subjectIds.has(id))));
        return matching.length > 0 ? matching : courses;
    }, [isDos, currentUser, courses, visibleSubjects]);

    const visibleAssessments = useMemo(() => {
        const subjectIds = new Set(visibleSubjects.map(s => s.id));
        let filtered = isDos ? assessments : assessments.filter(a => subjectIds.has(a.subjectId));
        if (selectedSubjectId !== 'all') {
            filtered = filtered.filter(a => a.subjectId === selectedSubjectId);
        }
        return filtered;
    }, [assessments, selectedSubjectId, isDos, visibleSubjects]);

    const reportData = useMemo(() => {
        if (selectedAssessmentId === 'all') return [];

        const assessment = assessments.find(a => a.id === selectedAssessmentId);
        if (!assessment) return [];
        
        const marksForAssessment = assessmentMarks.filter(m => m.assessmentId === selectedAssessmentId);
        
        const studentsInCourse = selectedCourseId === 'all'
            ? users.filter(u => u.role === 'student')
            : users.filter(u => u.role === 'student' && u.courseId === selectedCourseId);

        return studentsInCourse.map(student => {
            const mark = marksForAssessment.find(m => m.studentId === student.id);
            const score = mark?.marks ?? null;
            const percentage = score !== null ? (score / assessment.maxMarks) * 100 : null;
            return {
                student,
                score,
                percentage,
                comments: mark?.comments || '',
            };
        }).sort((a,b) => a.student.name.localeCompare(b.student.name));

    }, [selectedAssessmentId, selectedCourseId, assessments, assessmentMarks, users]);

    const courseOptions = useMemo(() => {
        if (selectedSubjectId !== 'all') {
            const courseIds = new Set<string>();
            courses.forEach(course => {
                course.levels.forEach(level => {
                    if (level.subjectIds.includes(selectedSubjectId)) {
                        courseIds.add(course.id);
                    }
                });
            });
            return visibleCourses.filter(c => courseIds.has(c.id));
        }
        return visibleCourses;
    }, [selectedSubjectId, courses, visibleCourses]);

    // Reset filters when dependencies change
    useEffect(() => {
        setSelectedCourseId('all');
        setSelectedAssessmentId('all');
    }, [selectedSubjectId]);
    
    useEffect(() => {
        setSelectedAssessmentId('all');
    }, [selectedCourseId]);


    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Filter by Subject</label>
                        <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="mt-1 form-select">
                            <option value="all">All Subjects</option>
                            {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Filter by Course</label>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="mt-1 form-select">
                            <option value="all">All Courses</option>
                            {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Select Assessment</label>
                        <select value={selectedAssessmentId} onChange={e => setSelectedAssessmentId(e.target.value)} className="mt-1 form-select">
                            <option value="all">-- Select to view results --</option>
                            {visibleAssessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            {selectedAssessmentId !== 'all' && (
                <div className="bg-white dark:bg-slate-800 shadow-xl rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/30 border-b dark:border-slate-700 flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Student Performance Matrix</h4>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => { setPrintMode('report_card'); setActiveStudent(null); }}
                                className="btn-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 h-9 px-4"
                            >
                                <PrinterIcon className="w-4 h-4 text-emerald-500" /> Print All Report Cards
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Raw Score</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Efficiency</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {reportData.map(({ student, score, percentage, comments }) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{student.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.staffId}</p>
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300">
                                            {score !== null ? `${score} / ${assessments.find(a => a.id === selectedAssessmentId)?.maxMarks}` : 'ABSENT'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {percentage !== null ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-grow">
                                                        <ProgressBar value={percentage} />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white w-12 text-right">{percentage.toFixed(1)}%</span>
                                                </div>
                                            ) : <span className="text-[10px] font-black text-rose-500 uppercase">NO DATA</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => { setActiveStudent(student); setPrintMode('result_slip'); }}
                                                    className="p-2 hover:bg-white rounded-xl text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100 transition-all"
                                                    title="View Result Slip"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => { setActiveStudent(student); setPrintMode('report_card'); }}
                                                    className="p-2 hover:bg-white rounded-xl text-emerald-600 shadow-sm border border-transparent hover:border-emerald-100 transition-all"
                                                    title="View Report Card"
                                                >
                                                    <PrinterIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reportData.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No academic records found for this criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print Modal */}
            {printMode !== 'none' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-12 overflow-y-auto no-print">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-5xl h-full flex flex-col animate-scale-in">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Document Preview Engine</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Generated by EduAlloc-AI Analytical Subsystem</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => window.print()}
                                    className="btn-primary h-12 px-8 flex items-center gap-2 shadow-xl shadow-indigo-100"
                                >
                                    <PrinterIcon className="w-5 h-5" /> PRINT DOCUMENT
                                </button>
                                <button 
                                    onClick={() => setPrintMode('none')}
                                    className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                                >
                                    <XIcon className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-12 bg-slate-100/50 dark:bg-slate-950/50 print:p-0 print:bg-white">
                            <div className="print-surface bg-white shadow-2xl mx-auto max-w-[210mm] print:shadow-none min-h-[297mm]">
                                {printMode === 'result_slip' && activeStudent && (
                                    <ResultSlip 
                                        student={activeStudent}
                                        assessment={assessments.find(a => a.id === selectedAssessmentId)!}
                                        mark={assessmentMarks.find(m => m.studentId === activeStudent.id && m.assessmentId === selectedAssessmentId) || null}
                                        subject={subjects.find(s => s.id === (assessments.find(a => a.id === selectedAssessmentId)?.subjectId)) || null}
                                        institution={currentInstitution!}
                                        gradingSystem={activeGradingSystem}
                                    />
                                )}
                                {printMode === 'report_card' && (
                                    <div className="space-y-12">
                                        {(activeStudent ? [activeStudent] : reportData.map(r => r.student)).map(student => (
                                            <div key={student.id} className="print:break-after-page mb-20 last:mb-0">
                                                <ReportCard 
                                                    student={student}
                                                    allStudents={users.filter(u => u.role === 'student')}
                                                    assessments={assessments}
                                                    marks={assessmentMarks}
                                                    subjects={subjects}
                                                    institution={currentInstitution!}
                                                    gradingSystem={activeGradingSystem}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .btn-secondary { background: white; color: #475569; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; transition: all 0.2s; }
                .dark .btn-secondary { background: #1e293b; color: #f1f5f9; border-color: #334155; }
                .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .print-surface { shadow: none !important; margin: 0 !important; max-width: 100% !important; }
                }
            `}</style>
            <style>{`.form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }`}</style>
        </div>
    );
};

