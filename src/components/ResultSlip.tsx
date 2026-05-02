
import React from 'react';
import type { User, Assessment, AssessmentMark, Subject, Institution, GradeDefinition, GradingSystem } from '../types';
import { BrandedPaper } from './BrandedPaper';
import { calculateGrade, formatPercentage } from '../utils/academicUtils';

interface ResultSlipProps {
    student: User;
    assessment: Assessment;
    mark: AssessmentMark | null;
    subject: Subject | null;
    institution: Institution | null;
    gradingSystem: GradingSystem | null;
}

export const ResultSlip: React.FC<ResultSlipProps> = ({
    student,
    assessment,
    mark,
    subject,
    institution,
    gradingSystem
}) => {
    const score = mark?.marks ?? 0;
    const grade = calculateGrade(score, assessment.maxMarks, gradingSystem);
    const percentage = (score / assessment.maxMarks) * 100;

    return (
        <BrandedPaper
            institution={institution!}
            title="OFFICIAL ASSESSMENT RESULT SLIP"
            subtitle={`${assessment.title} - ${assessment.assessmentDate}`}
        >
            <div className="space-y-8 py-6">
                {/* Student Info Section */}
                <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Student Name</p>
                        <p className="text-xl font-black uppercase text-slate-900 tracking-tight">{student.name}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">ID: {student.staffId || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Subject / Unit</p>
                        <p className="text-xl font-black uppercase text-indigo-600 tracking-tight">{subject?.name || 'N/A'}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">{subject?.code || ''}</p>
                    </div>
                </div>

                {/* Score Display */}
                <div className="flex justify-center py-10">
                    <div className="relative">
                        <div className="w-48 h-48 rounded-full border-8 border-indigo-50 flex flex-col items-center justify-center bg-white shadow-xl">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Score</span>
                            <span className="text-5xl font-black text-slate-900">{score}<span className="text-xl text-slate-300">/{assessment.maxMarks}</span></span>
                            <div className="mt-2 px-4 py-1 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest">
                                {percentage.toFixed(1)}%
                            </div>
                        </div>
                        {grade && (
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-400 rounded-2xl shadow-lg rotate-12 flex flex-col items-center justify-center border-4 border-white">
                                <span className="text-[10px] font-black uppercase text-amber-900 tracking-tighter leading-none mb-1">Grade</span>
                                <span className="text-3xl font-black text-white leading-none">{grade.grade}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Table */}
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Points</p>
                            <p className="text-2xl font-black text-slate-900">{grade?.points || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Remarks</p>
                            <p className="text-sm font-bold text-slate-700 uppercase">{grade?.comment || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Status</p>
                            <p className={`text-sm font-black uppercase ${percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {percentage >= 50 ? 'PASS' : 'RETAKE REQUIRED'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Teacher Remarks */}
                <div className="border-l-4 border-indigo-600 pl-6 py-2">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Instructor Remarks</h4>
                    <p className="text-slate-700 italic font-medium leading-relaxed">
                        {mark?.comments || "Professional evaluation indicates standard progress in this subject area. Continued focus on core concepts is recommended for subsequent assessments."}
                    </p>
                </div>

                {/* Footer Section */}
                <div className="pt-12 grid grid-cols-2 gap-12 items-end opacity-60">
                    <div className="text-center">
                        <div className="h-[1px] bg-slate-300 w-full mb-2"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Instructor Signature</p>
                    </div>
                    <div className="text-center">
                        <div className="h-[1px] bg-slate-300 w-full mb-2"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official Institution Stamp</p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none; }
                    body { background: white; }
                }
            `}</style>
        </BrandedPaper>
    );
};

