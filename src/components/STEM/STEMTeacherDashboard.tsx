import React, { useState } from 'react';
import { STEMMission } from './STEMSyllabusData';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { PrinterIcon } from '../icons/PrinterIcon';

interface STEMTeacherDashboardProps {
    missions: STEMMission[];
    totalXpEarned: number;
    completedMissionIds: string[];
}

export const STEMTeacherDashboard: React.FC<STEMTeacherDashboardProps> = ({ missions, totalXpEarned, completedMissionIds }) => {
    const [activeTab, setActiveTab] = useState<'roster' | 'curriculum' | 'certificates'>('roster');
    const [studentNameForCert, setStudentNameForCert] = useState('Alex Mwangi');
    const [selectedGradeCert, setSelectedGradeCert] = useState('Grade 3');

    // Mock student roster
    const studentRoster = [
        { id: 'st_1', name: 'Alex Mwangi', grade: 'Grade 3', xp: 450, completedCount: 3, badge: '🌟 Junior Explorer' },
        { id: 'st_2', name: 'Faith Wanjiku', grade: 'Grade 2', xp: 350, completedCount: 2, badge: '⭐ Space Rover' },
        { id: 'st_3', name: 'Kevin Otieno', grade: 'Grade 5', xp: 700, completedCount: 5, badge: '🚀 Maze Master' },
        { id: 'st_4', name: 'Joy Cherop', grade: 'Grade 8', xp: 1200, completedCount: 6, badge: '⚡ Python Pioneer' },
    ];

    const handlePrintCertificate = () => {
        const win = window.open('', '_blank');
        if (!win) return;

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>STEM Robotics Certificate — ${studentNameForCert}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; margin: 0; padding: 40px; display: flex; justify-content: center; }
                    .cert-card { width: 900px; background: #ffffff; border: 12px double #4f46e5; border-radius: 24px; padding: 60px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); position: relative; }
                    .header { font-size: 14px; font-weight: 900; letter-spacing: 4px; color: #4f46e5; text-transform: uppercase; }
                    .title { font-size: 38px; font-weight: 900; color: #0f172a; margin: 15px 0 30px; text-transform: uppercase; font-style: italic; }
                    .student-name { font-size: 42px; font-weight: 900; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; display: inline-block; margin: 20px 0; }
                    .desc { font-size: 16px; color: #475569; max-width: 650px; margin: 0 auto 40px; line-height: 1.6; }
                    .badges { display: flex; justify-content: center; gap: 20px; margin-bottom: 40px; }
                    .badge-pill { background: #e0e7ff; color: #3730a3; padding: 8px 20px; border-radius: 20px; font-weight: 800; font-size: 12px; text-transform: uppercase; }
                    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 30px; }
                    .sig-line { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="cert-card">
                    <div class="header">EDUAI AUTOMATION • STEM ROBOTICS ACADEMY</div>
                    <div class="title">Certificate of Achievement</div>
                    <p style="font-size: 14px; color: #64748b; font-weight: 700;">THIS OFFICIAL STEM DIPLOMA IS PROUDLY PRESENTED TO</p>
                    <div class="student-name">${studentNameForCert}</div>
                    <p class="desc">
                        For successfully mastering <b>${selectedGradeCert} Visual Block Coding & Robotics Engineering</b>, 
                        demonstrating outstanding competence in algorithmic logic, sensor integration, and autonomous robot navigation.
                    </p>
                    <div class="badges">
                        <span class="badge-pill">🌟 STEM Coding Master</span>
                        <span class="badge-pill">🤖 Robot Engineer</span>
                        <span class="badge-pill">⚡ Verified Curriculum</span>
                    </div>
                    <div class="footer">
                        <div>
                            <div class="sig-line">_______________________________</div>
                            <div class="sig-line" style="margin-top: 6px;">STEM Robotics Director</div>
                        </div>
                        <div>
                            <div class="sig-line">Date: ${new Date().toLocaleDateString()}</div>
                            <div class="sig-line" style="margin-top: 6px;">Verification ID: STEM-${Math.floor(100000 + Math.random() * 900000)}</div>
                        </div>
                    </div>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3">
                        <AcademicCapIcon className="w-8 h-8 text-indigo-500" />
                        <span>STEM Teacher & Parent Command Center</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Track student progression, review block assignments, and issue STEM certificates
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Class Total XP</p>
                        <p className="text-xl font-black text-indigo-400 italic">{totalXpEarned + 2700} XP</p>
                    </div>
                    <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Active STEM Students</p>
                        <p className="text-xl font-black text-emerald-400 italic">{studentRoster.length}</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex gap-4 p-2 bg-slate-900/80 rounded-2xl border border-slate-800 w-fit">
                <button
                    onClick={() => setActiveTab('roster')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${
                        activeTab === 'roster' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <UserGroupIcon className="w-4 h-4" />
                    <span>Student Progress Roster</span>
                </button>

                <button
                    onClick={() => setActiveTab('curriculum')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${
                        activeTab === 'curriculum' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Syllabus & Teacher Quizzes</span>
                </button>

                <button
                    onClick={() => setActiveTab('certificates')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${
                        activeTab === 'certificates' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <SparklesIcon className="w-4 h-4" />
                    <span>STEM Certificates</span>
                </button>
            </div>

            {/* Main Tab Views */}
            {activeTab === 'roster' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest italic text-indigo-600 dark:text-indigo-400">
                        CLASS PROGRESS ROSTER & BADGE STANDINGS
                    </h4>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                    <th className="py-4">Student Name</th>
                                    <th className="py-4">Grade Tier</th>
                                    <th className="py-4 text-center">Completed Missions</th>
                                    <th className="py-4 text-center">XP Points</th>
                                    <th className="py-4 text-right">Badge Achievement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentRoster.map(st => (
                                    <tr key={st.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-5 text-sm font-black italic">{st.name}</td>
                                        <td className="py-5 text-xs font-bold text-indigo-500 uppercase">{st.grade}</td>
                                        <td className="py-5 text-center text-xs font-black">{st.completedCount} / {missions.length}</td>
                                        <td className="py-5 text-center text-xs font-black text-amber-500">{st.xp} XP</td>
                                        <td className="py-5 text-right">
                                            <span className="px-4 py-1.5 bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-white/10 text-xs font-black uppercase tracking-wider italic">
                                                {st.badge}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'curriculum' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest italic text-indigo-600 dark:text-indigo-400">
                        SYLLABUS UNITS & TEACHER QUIZ ASSESSMENT BANK
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {missions.map(m => (
                            <div key={m.id} className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20">
                                        {m.gradeLevel} • Term {m.termNumber}
                                    </span>
                                    <span className="text-xs font-black text-amber-500">{m.xpReward} XP</span>
                                </div>
                                <div>
                                    <h5 className="text-base font-black italic">{m.title}</h5>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{m.learningOutcome}</p>
                                </div>

                                {m.teacherQuizQuestions && m.teacherQuizQuestions.length > 0 && (
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                                        <p className="font-black text-slate-400 uppercase text-[9px]">Sample Quiz Question:</p>
                                        <p className="font-bold">{m.teacherQuizQuestions[0].question}</p>
                                        <p className="text-[10px] font-black text-emerald-500">Correct Answer: {m.teacherQuizQuestions[0].options[m.teacherQuizQuestions[0].correctIndex]}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'certificates' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest italic text-indigo-600 dark:text-indigo-400">
                        GENERATE OFFICIAL STEM ROBOTICS DIPLOMA CERTIFICATE
                    </h4>

                    <div className="max-w-xl space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Student Full Name</label>
                            <input
                                type="text"
                                value={studentNameForCert}
                                onChange={e => setStudentNameForCert(e.target.value)}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Grade Level</label>
                            <select
                                value={selectedGradeCert}
                                onChange={e => setSelectedGradeCert(e.target.value)}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-inner cursor-pointer"
                            >
                                <option value="Grade 1">Grade 1 (Junior Explorer)</option>
                                <option value="Grade 2">Grade 2 (Junior Explorer)</option>
                                <option value="Grade 3">Grade 3 (Junior Explorer)</option>
                                <option value="Grade 4">Grade 4 (Apprentice Builder)</option>
                                <option value="Grade 5">Grade 5 (Apprentice Builder)</option>
                                <option value="Grade 6">Grade 6 (Apprentice Builder)</option>
                                <option value="Grade 7">Grade 7 (Robotics Engineer)</option>
                                <option value="Grade 8">Grade 8 (Robotics Engineer)</option>
                            </select>
                        </div>

                        <button
                            onClick={handlePrintCertificate}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-xl shadow-indigo-600/30 flex items-center gap-3 active:scale-95"
                        >
                            <PrinterIcon className="w-5 h-5" />
                            <span>Print Printable STEM Diploma Certificate</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
