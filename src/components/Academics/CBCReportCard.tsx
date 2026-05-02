
import React from 'react';
import type { User, Assessment, AssessmentMark, Subject, Institution } from '../../types';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface CBCReportCardProps {
    student: User;
    assessments: Assessment[];
    marks: AssessmentMark[];
    subjects: Subject[];
    institution: Institution;
}

export const CBCReportCard: React.FC<CBCReportCardProps> = ({
    student,
    assessments,
    marks,
    subjects,
    institution
}) => {
    const getGradeLabel = (grade?: string) => {
        switch (grade) {
            case 'EE': return { label: 'Exceeding Expectation', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
            case 'ME': return { label: 'Meeting Expectation', color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' };
            case 'AE': return { label: 'Approaching Expectation', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
            case 'BE': return { label: 'Below Expectation', color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' };
            default: return { label: 'Not Assessed', color: 'bg-slate-300', text: 'text-slate-400', bg: 'bg-slate-50' };
        }
    };

    return (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-4xl mx-auto space-y-10 relative overflow-hidden">
            {/* Artistic Background Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            {/* Header */}
            <div className="relative flex justify-between items-start border-b border-slate-100 pb-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                            {institution.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{institution.name}</h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">CBC Academic Progress Report</p>
                        </div>
                    </div>
                    <div className="flex gap-8 items-end">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Learner's Name</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{student.name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assessment Level</p>
                            <p className="text-sm font-black text-slate-700">Grade 4 - CBC</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 mb-4">
                        <SparklesIcon className="w-4 h-4 text-indigo-600" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Validated AI Insight</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Reference</p>
                    <p className="text-sm font-black text-slate-900">REP-{student.id.slice(-6).toUpperCase()}</p>
                </div>
            </div>

            {/* Rubric Legend */}
            <div className="grid grid-cols-4 gap-4">
                {['EE', 'ME', 'AE', 'BE'].map(g => {
                    const info = getGradeLabel(g);
                    return (
                        <div key={g} className={`${info.bg} p-3 rounded-2xl border border-white shadow-sm`}>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${info.color}`} />
                                <span className="text-[10px] font-black text-slate-900">{g}</span>
                            </div>
                            <p className={`text-[8px] font-black uppercase tracking-tighter leading-none ${info.text}`}>{info.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Assessment Grid */}
            <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-4">Learning Area Progress</h3>
                
                <div className="space-y-4">
                    {subjects.map((subject, idx) => {
                        const mark = marks.find(m => {
                            const assessment = assessments.find(a => a.id === m.assessmentId);
                            return assessment?.subjectId === subject.id && m.studentId === student.id;
                        });
                        const info = getGradeLabel(mark?.rubricGrade);

                        return (
                            <div key={idx} className="group p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{subject.name}</h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Strand: Integrated Learning Activities</p>
                                    </div>
                                    <div className={`${info.bg} px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-3`}>
                                        <div className={`w-3 h-3 rounded-full ${info.color}`} />
                                        <span className={`text-xs font-black uppercase tracking-widest ${info.text}`}>{mark?.rubricGrade || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['Communication', 'Creativity', 'Critical Thinking', 'Citizenship'].map(comp => (
                                        <div key={comp} className="bg-white/80 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">{comp}</span>
                                            <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    ))}
                                </div>
                                {mark?.comments && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-slate-500 text-xs italic font-medium leading-relaxed">
                                            "{mark.comments}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Final Remarks */}
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
                <div className="relative space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-widest">Class Teacher's Remark</h3>
                    <p className="text-indigo-100/80 text-sm leading-relaxed font-medium">
                        The learner demonstrates strong self-efficacy and is consistently meeting expectations in all learning areas. There is significant improvement in collaborative activities and critical thinking skills.
                    </p>
                    <div className="pt-6 flex justify-between items-end border-t border-white/10">
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Head Teacher</p>
                            <p className="text-lg font-black tracking-tight">Dr. Alice Omondi</p>
                        </div>
                        <div className="w-32 h-16 border-b border-white/20 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                            <span className="text-[10px] italic font-serif">Signature</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

