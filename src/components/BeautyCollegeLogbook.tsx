import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface PracticalRecord {
    id: string;
    studentName: string;
    course: 'Diploma in Cosmetology' | 'Certificate in Hairdressing' | 'Barbering & Styling';
    moduleName: string;
    loggedHours: number;
    requiredHours: number;
    supervisorStatus: 'APPROVED' | 'PENDING';
}

export const BeautyCollegeLogbook: React.FC = () => {
    const [records, setRecords] = useState<PracticalRecord[]>([
        { id: 'rec_1', studentName: 'Amina Hassan', course: 'Diploma in Cosmetology', moduleName: 'Chemical Hair Relaxing & Styling', loggedHours: 120, requiredHours: 150, supervisorStatus: 'APPROVED' },
        { id: 'rec_2', studentName: 'Mercy Njeri', course: 'Diploma in Cosmetology', moduleName: 'Facial Esthetics & Skincare', loggedHours: 85, requiredHours: 100, supervisorStatus: 'APPROVED' },
        { id: 'rec_3', studentName: 'Kevin Otieno', course: 'Barbering & Styling', moduleName: 'Precision Fade Cuts & Shaving', loggedHours: 60, requiredHours: 80, supervisorStatus: 'PENDING' },
    ]);

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 border border-pink-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-pink-500/20 text-pink-300 text-xs font-black rounded-full border border-pink-500/30 uppercase tracking-wider">
                        Beauty & Cosmetology College Module
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Practical Skills Logbook & Salon Booking</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Track student practical hours, supervisor sign-offs, and client salon appointments
                    </p>
                </div>
            </div>

            {/* Practical Logbook Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <h3 className="text-sm font-black uppercase tracking-widest text-pink-400 italic">
                    STUDENT PRACTICAL TRAINING LOGBOOK
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Student Name</th>
                                <th className="py-4">Course</th>
                                <th className="py-4">Practical Skill Module</th>
                                <th className="py-4 text-center">Completed Hours</th>
                                <th className="py-4 text-right">Supervisor Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">{r.studentName}</td>
                                    <td className="py-4 text-xs text-slate-400 font-bold uppercase">{r.course}</td>
                                    <td className="py-4 text-xs font-bold text-pink-300 uppercase">{r.moduleName}</td>
                                    <td className="py-4 text-center font-mono font-bold text-sm">
                                        {r.loggedHours} / {r.requiredHours} hrs
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            r.supervisorStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                            {r.supervisorStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
