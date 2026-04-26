
import React, { useState } from 'react';
import type { Assessment, AssessmentMark, User, Subject, ActivityLog } from '../../types';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { GridIcon } from '../icons/GridIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { FingerPrintIcon } from '../icons/FingerPrintIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

interface AcademicReportsHubProps {
    assessments: Assessment[];
    marks: AssessmentMark[];
    students: User[];
    subjects: Subject[];
    activityLogs: ActivityLog[];
}

export const AcademicReportsHub: React.FC<AcademicReportsHubProps> = ({
    assessments,
    marks,
    students,
    subjects,
    activityLogs
}) => {
    const [activeTab, setActiveTab] = useState<'missing_marks' | 'broadsheet' | 'audit' | 'analysis'>('missing_marks');

    // Missing Marks Logic
    const missingMarksData = assessments.map(assessment => {
        const submitted = marks.filter(m => m.assessmentId === assessment.id && m.marks !== null).length;
        const missing = students.length - submitted;
        return { assessment, missing, submitted };
    }).filter(d => d.missing > 0);

    return (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            {/* Header / Sub-navigation */}
            <div className="p-8 border-b border-slate-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">Intelligence Hub</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Academic Analytics & Governance</p>
                    </div>
                    <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-2xl">
                        {[
                            { id: 'missing_marks', label: 'Missing Marks', icon: ExclamationTriangleIcon },
                            { id: 'broadsheet', label: 'Broadsheet', icon: GridIcon },
                            { id: 'analysis', label: 'Grade Analysis', icon: ChartPieIcon },
                            { id: 'audit', label: 'Audit Logs', icon: FingerPrintIcon }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab.id 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8">
                {activeTab === 'missing_marks' && (
                    <div className="space-y-6">
                        {missingMarksData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h4 className="text-xl font-black text-slate-900">Data Integrity 100%</h4>
                                <p className="text-slate-400 text-sm font-medium mt-2">All marks for active assessments have been submitted.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-100 rounded-3xl">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Assessment Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Missing</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {missingMarksData.map((data, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-800">{data.assessment.title}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{data.assessment.type}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-black">
                                                        {data.missing} students
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors">
                                                        Send Nudge
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        {activityLogs.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 font-bold">No activity logs recorded yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {activityLogs.map((log, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:border-indigo-100 transition-all">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                            <FingerPrintIcon className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h5 className="font-black text-slate-900 text-sm">{log.userName}</h5>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-slate-600 text-xs mt-1 font-bold">{log.action}</p>
                                            <p className="text-slate-400 text-[10px] mt-1 font-medium">{log.details}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {(activeTab === 'broadsheet' || activeTab === 'analysis') && (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <ChartPieIcon className="w-12 h-12 text-slate-200 mb-4" />
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Premium Module Locked</h4>
                        <p className="text-slate-400 text-sm font-medium mt-2 max-w-[300px]">Detailed grade distribution and merit lists will be available upon assessment publication.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
