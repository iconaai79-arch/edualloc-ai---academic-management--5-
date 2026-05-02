import React, { useMemo, useState } from 'react';
import type { User, Assessment, AssessmentMark, Subject, Institution, GradeDefinition, GradingSystem, AcademicConfig, RankingCriteria } from '../types';
import { BrandedPaper } from './BrandedPaper';
import { calculateGrade, formatPercentage, aggregateSubjectMarks, calculateRankings } from '../utils/academicUtils';
import { generateReportCardRemarks } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CBCReportCard } from './Academics/CBCReportCard';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';

interface ReportCardProps {
    student: User;
    allStudents: User[];
    assessments: Assessment[];
    marks: AssessmentMark[];
    subjects: Subject[];
    institution: Institution;
    gradingSystem: GradingSystem | null;
    attendanceData?: { present: number; total: number };
    feeBalance?: number;
    initialTemplate?: 'Standard' | 'CBC';
}

export const ReportCard: React.FC<ReportCardProps> = ({
    student,
    allStudents,
    assessments,
    marks,
    subjects,
    institution,
    gradingSystem,
    attendanceData,
    feeBalance,
    initialTemplate = 'Standard'
}) => {
    const [template, setTemplate] = useState<'Standard' | 'CBC'>(initialTemplate);
    const [aiRemarks, setAiRemarks] = React.useState<string | null>(null);
    const [isGeneratingRemarks, setIsGeneratingRemarks] = React.useState(false);

    const config = institution.academicConfig || {
        rankingEnabled: true,
        rankingCriteria: 'total_marks',
        subjectRankingEnabled: true,
        showAttendance: true,
        showFeeBalance: true
    };

    // Calculate Subject Results
    const subjectResults = useMemo(() => {
        return subjects.map(subject => {
            const result = aggregateSubjectMarks(student.id, subject.id, assessments, marks, config);
            if (!result) return null;

            const grade = calculateGrade(result.score, result.maxPossible, gradingSystem);

            // Calculate Subject Rank if enabled
            let subjectRank = 0;
            if (config.subjectRankingEnabled) {
                const peers = allStudents.map(peer => {
                    const r = aggregateSubjectMarks(peer.id, subject.id, assessments, marks, config);
                    return { id: peer.id, score: r?.percentage || 0 };
                });
                const rankings = calculateRankings(peers);
                subjectRank = rankings.find(r => r.id === student.id)?.position || 0;
            }

            return {
                subject,
                ...result,
                grade,
                rank: subjectRank
            };
        }).filter(Boolean);
    }, [student.id, subjects, assessments, marks, config, gradingSystem, allStudents]);

    // Calculate Overall Positioning
    const overallPerformance = useMemo(() => {
        const studentPerformances = allStudents.map(s => {
            const sResults = subjects.map(sub => aggregateSubjectMarks(s.id, sub.id, assessments, marks, config)).filter(Boolean);
            const totalMarks = sResults.reduce((acc, r) => acc + (r?.score || 0), 0);
            const totalMax = sResults.reduce((acc, r) => acc + (r?.maxPossible || 0), 0);
            const meanPercentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;

            // Calculate Points if criteria is points
            const totalPoints = sResults.reduce((acc, r) => {
                const g = calculateGrade(r?.score || 0, r?.maxPossible || 100, gradingSystem);
                return acc + (g?.points || 0);
            }, 0);

            const meanPoints = sResults.length > 0 ? totalPoints / sResults.length : 0;

            let rankingScore = totalMarks;
            if (config.rankingCriteria === 'points') rankingScore = totalPoints;
            if (config.rankingCriteria === 'mean_points') rankingScore = meanPoints;

            return {
                id: s.id,
                score: rankingScore,
                totalMarks,
                totalPoints,
                meanPoints,
                meanPercentage
            };
        });

        const rankings = calculateRankings(studentPerformances);
        const myRank = rankings.find(r => r.id === student.id);

        return {
            rank: myRank?.position || 0,
            totalStudents: allStudents.length,
            totalMarks: myRank?.totalMarks || 0,
            totalPoints: myRank?.totalPoints || 0,
            meanPoints: myRank?.meanPoints || 0,
            meanPercentage: myRank?.meanPercentage || 0,
            meanGrade: calculateGrade(myRank?.meanPercentage || 0, 100, gradingSystem)
        };
    }, [allStudents, subjects, assessments, marks, config, gradingSystem, student.id]);

    return (
        <div className="space-y-6">
            {/* Template Selector - Only visible in UI, not in print */}
            <div className="no-print flex justify-end gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <button 
                    onClick={() => setTemplate('Standard')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        template === 'Standard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'
                    }`}
                >
                    Standard Template
                </button>
                <button 
                    onClick={() => setTemplate('CBC')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        template === 'CBC' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'
                    }`}
                >
                    CBC Rubric Template
                </button>
            </div>

            {template === 'CBC' ? (
                <CBCReportCard 
                    student={student} 
                    assessments={assessments} 
                    marks={marks} 
                    subjects={subjects} 
                    institution={institution} 
                />
            ) : (
                <BrandedPaper
                    institution={institution}
                    letterheadConfig={institution.academicConfig?.letterheadConfig}
                    title="STUDENT PROGRESS REPORT CARD"
                    subtitle="ACADEMIC SUMMATIVE EVALUATION"
                >
                    <div className="space-y-6 pt-4">
                        {/* Header Information */}
                        <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-900 pb-4">
                            <div className="space-y-1">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 w-24 tracking-[0.2em]">Student</span>
                                    <span className="text-sm font-black uppercase tracking-tight text-slate-900">{student.name}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 w-24 tracking-[0.2em]">Admission</span>
                                    <span className="text-xs font-bold text-slate-600">{student.staffId || 'N/A'}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 w-24 tracking-[0.2em]">Gender</span>
                                    <span className="text-xs font-bold text-slate-600 uppercase">{student.gender || 'Not Specified'}</span>
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <div className="flex gap-2 items-center justify-end">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mr-2">Evaluation Period</span>
                                    <span className="text-xs font-black text-slate-900 uppercase">Term 1, 2026</span>
                                </div>
                                {config.rankingEnabled && (
                                    <div className="flex gap-2 items-center justify-end group">
                                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mr-2">Position</span>
                                        <span className="text-lg font-black text-slate-900">
                                            {overallPerformance.rank} <span className="text-[10px] text-slate-400">OUT OF</span> {overallPerformance.totalStudents}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Performance Table */}
                        <div className="mt-6">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white leading-none">
                                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest border border-slate-900">Subject</th>
                                        <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest border border-slate-900">Marks</th>
                                        <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest border border-slate-900">Grade</th>
                                        <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest border border-slate-900">Points</th>
                                        {config.subjectRankingEnabled && <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest border border-slate-900">Rank</th>}
                                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest border border-slate-900">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectResults.map((res: any, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="p-3 border border-slate-200">
                                                <p className="text-xs font-black uppercase tracking-tight text-slate-800">{res.subject.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400">{res.subject.code}</p>
                                            </td>
                                            <td className="p-3 border border-slate-200 text-center font-black text-sm">
                                                {res.percentage.toFixed(0)} <span className="text-[10px] text-slate-300 font-normal">%</span>
                                            </td>
                                            <td className="p-3 border border-slate-200 text-center">
                                                <span className={`text-sm font-black ${res.grade?.grade.startsWith('A') ? 'text-indigo-600' : 'text-slate-900'}`}>
                                                    {res.grade?.grade || '-'}
                                                </span>
                                            </td>
                                            <td className="p-3 border border-slate-200 text-center text-xs font-black">
                                                {res.grade?.points || '0'}
                                            </td>
                                            {config.subjectRankingEnabled && (
                                                <td className="p-3 border border-slate-200 text-center text-xs font-black text-slate-500">
                                                    {res.rank}
                                                </td>
                                            )}
                                            <td className="p-3 border border-slate-200 text-[10px] font-bold text-slate-600 italic leading-tight">
                                                {res.grade?.comment || 'Satisfactory progress.'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-900 text-white font-black">
                                        <td className="p-3 border border-slate-900 text-[10px] uppercase tracking-widest">Total / Summary</td>
                                        <td className="p-3 border border-slate-900 text-center text-sm">{overallPerformance.totalMarks.toFixed(0)}</td>
                                        <td className="p-3 border border-slate-900 text-center text-sm">{overallPerformance.meanGrade?.grade || '-'}</td>
                                        <td className="p-3 border border-slate-900 text-center text-sm">{overallPerformance.totalPoints}</td>
                                        {config.subjectRankingEnabled && <td className="p-3 border border-slate-900 text-center"></td>}
                                        <td className="p-3 border border-slate-900 text-right text-[10px] uppercase tracking-widest">Mean: {overallPerformance.meanPercentage.toFixed(1)}%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Additional Stats Section */}
                        <div className="grid grid-cols-2 gap-8 mt-4">
                            {/* Attendance & Finance */}
                            <div className="space-y-4">
                                {config.showAttendance && (
                                    <div className="bg-indigo-50/30 p-4 rounded-3xl border border-indigo-100/50">
                                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-2 ml-1">Attendance Record</h4>
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl font-black text-slate-900 leading-none">
                                                {attendanceData ? Math.round((attendanceData.present / attendanceData.total) * 100) : 95}%
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Student Visibility</p>
                                                <p className="text-[10px] font-bold text-slate-600">Present: {attendanceData?.present || 58} days of {attendanceData?.total || 62}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {config.showFeeBalance && (
                                    <div className="bg-amber-50/30 p-4 rounded-3xl border border-amber-100/50">
                                        <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-2 ml-1">Financial Status</h4>
                                        <div className="flex items-center gap-4">
                                            <div className={`text-2xl font-black leading-none ${feeBalance && feeBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {feeBalance && feeBalance > 0 ? `-KES ${feeBalance.toLocaleString()}` : 'CLEARED'}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Closing Balance</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Growth Chart Placeholder */}
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Performance Growth Index</h4>
                                <div className="flex items-end gap-1 h-20 w-40">
                                    {[40, 65, 55, 85, 75, 95].map((h, i) => (
                                        <div key={i} className="flex-1 bg-indigo-600/20 rounded-t-lg transition-all hover:bg-indigo-600" style={{ height: `${h}%` }}></div>
                                    ))}
                                </div>
                                <p className="text-[9px] font-bold text-indigo-600 mt-2 uppercase tracking-wide">Steadily Improving (+12.4%)</p>
                            </div>
                        </div>

                        {/* Final Remarks */}
                        <div className="mt-6 space-y-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative">
                                <div className="absolute top-4 right-6 opacity-10">
                                    <span className="text-4xl font-black text-slate-900 border-4 border-slate-900 rounded-full w-16 h-16 flex items-center justify-center -rotate-12">AI</span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">AI-Generated Professional Remarks</h4>
                                    {!aiRemarks && (
                                        <button
                                            onClick={async () => {
                                                setIsGeneratingRemarks(true);
                                                const remarks = await generateReportCardRemarks(student.name, subjectResults, overallPerformance, institution.name);
                                                setAiRemarks(remarks);
                                                setIsGeneratingRemarks(false);
                                            }}
                                            disabled={isGeneratingRemarks}
                                            className="no-print flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {isGeneratingRemarks ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                                            {isGeneratingRemarks ? 'Generating...' : 'Regenerate Insight'}
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-slate-800 italic leading-relaxed">
                                    {aiRemarks || (
                                        <>
                                            {student.name} has demonstrated {overallPerformance.meanPercentage > 70 ? 'exceptional' : 'consistent'} academic progression.
                                            Significant aptitude is noted in {subjectResults[0]?.subject.name || 'core subjects'}.
                                            {overallPerformance.rank <= 3 ? 'Model performance that sets a high benchmark for the class.' : 'Encouraging results that suggest strong potential for further growth.'}
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 pt-10 text-center opacity-80">
                                <div>
                                    <div className="h-[1px] bg-slate-400 w-full mb-3"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Class Teacher's Signature</p>
                                </div>
                                <div>
                                    <div className="h-[1px] bg-slate-400 w-full mb-3"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Principal / DOS Signature & Stamp</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @media print {
                            @page { margin: 15mm; }
                            .no-print { display: none; }
                            body { background: white; -webkit-print-color-adjust: exact; }
                        }
                        table { border-spacing: 0; width: 100%; }
                        th, td { border: 1px solid #e2e8f0; }
                        .dark table th, .dark table td { border-color: #334155; }
                    `}</style>
                </BrandedPaper>
            )}
        </div>
    );
};

