
import React, { useMemo } from 'react';
import type { Assessment, AssessmentMark, User, Subject } from '../../types';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface ExamInsightsProps {
    assessment: Assessment;
    marks: AssessmentMark[];
    students: User[];
    teachers: User[];
    subjects: Subject[];
}

export const ExamInsights: React.FC<ExamInsightsProps> = ({
    assessment,
    marks,
    students,
    teachers,
    subjects
}) => {
    // Calculate Progress Stats
    const stats = useMemo(() => {
        const totalExpected = students.length;
        const submitted = marks.filter(m => m.assessmentId === assessment.id && m.marks !== null).length;
        const percentage = totalExpected > 0 ? (submitted / totalExpected) * 100 : 0;
        const missing = totalExpected - submitted;

        return { submitted, totalExpected, percentage, missing };
    }, [assessment.id, marks, students.length]);

    // Calculate Progress by Subject (In this context, it might be papers within the exam)
    const subjectProgress = useMemo(() => {
        // Find subject for this specific assessment
        const subject = subjects.find(s => s.id === assessment.subjectId);
        if (!subject) return [];

        const submitted = marks.filter(m => m.assessmentId === assessment.id && m.marks !== null).length;
        const percentage = students.length > 0 ? (submitted / students.length) * 100 : 0;

        return [{
            name: subject.name,
            percentage,
            submitted,
            total: students.length
        }];
    }, [assessment, marks, subjects, students.length]);

    return (
        <div className="space-y-6">
            {/* Mission Control Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
                            <span className="text-white font-black text-xl">{stats.percentage.toFixed(0)}%</span>
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Marks Submitted</h3>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.submitted} / {stats.totalExpected}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative">
                        <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-100 text-white">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Missing Entries</h3>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.missing}</p>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
                    <div className="relative">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white">
                            <CheckCircleIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Exam Status</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-black text-white tracking-tight">{assessment.status}</p>
                            <span className="px-2 py-1 bg-indigo-500 text-[10px] font-black rounded-full text-white uppercase">{assessment.type}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Submission Progress</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Analysis by Subject Paper</p>
                        </div>
                        <SparklesIcon className="w-6 h-6 text-indigo-600" />
                    </div>

                    <div className="space-y-6">
                        {subjectProgress.map((sub, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-end px-1">
                                    <span className="text-sm font-black text-slate-700">{sub.name}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sub.submitted} of {sub.total} students</span>
                                </div>
                                <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                                    <div 
                                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-sm"
                                        style={{ width: `${sub.percentage}%` }}
                                    />
                                    {sub.percentage > 0 && (
                                        <div className="absolute inset-0 flex items-center justify-end px-2">
                                            <span className="text-[8px] font-black text-white mix-blend-difference">{sub.percentage.toFixed(0)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Submission Deadlines</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Staff Accountability Tracking</p>
                        </div>
                        <ChartBarIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    
                    <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                            <SparklesIcon className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 text-sm font-bold max-w-[200px]">Advanced teacher mapping will appear here as marks are entered.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

