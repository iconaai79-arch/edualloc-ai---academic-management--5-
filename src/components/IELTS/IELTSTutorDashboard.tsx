import React, { useState } from 'react';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface CandidateRecord {
    id: string;
    name: string;
    targetCountry: 'Canada Express Entry' | 'UK Nursing / GMC' | 'Australian University' | 'USA Visa';
    moduleType: 'Academic' | 'General Training';
    currentListening: number;
    currentReading: number;
    currentWriting: number;
    currentSpeaking: number;
    targetOverall: number;
    readinessStatus: 'READY' | 'IN_PROGRESS' | 'NEEDS_WORK';
}

export const IELTSTutorDashboard: React.FC = () => {
    const [candidates, setCandidates] = useState<CandidateRecord[]>([
        { id: 'cand_1', name: 'Dr. Beatrice Wanjiru', targetCountry: 'UK Nursing / GMC', moduleType: 'Academic', currentListening: 7.5, currentReading: 7.0, currentWriting: 7.0, currentSpeaking: 7.5, targetOverall: 7.5, readinessStatus: 'READY' },
        { id: 'cand_2', name: 'Engineer David Ochieng', targetCountry: 'Canada Express Entry', moduleType: 'General Training', currentListening: 8.0, currentReading: 7.5, currentWriting: 6.5, currentSpeaking: 7.0, targetOverall: 7.5, readinessStatus: 'IN_PROGRESS' },
        { id: 'cand_3', name: 'Mercy Kipchumba', targetCountry: 'Australian University', moduleType: 'Academic', currentListening: 6.5, currentReading: 6.0, currentWriting: 6.0, currentSpeaking: 6.5, targetOverall: 6.5, readinessStatus: 'IN_PROGRESS' },
    ]);

    const [selectedCertCandidate, setSelectedCertCandidate] = useState<CandidateRecord>(candidates[0]);

    const printReadinessCertificate = () => {
        const win = window.open('', '_blank');
        if (!win) return;

        const currentOverall = ((selectedCertCandidate.currentListening + selectedCertCandidate.currentReading + selectedCertCandidate.currentWriting + selectedCertCandidate.currentSpeaking) / 4).toFixed(1);

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>IELTS Readiness Clearance Certificate — ${selectedCertCandidate.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; margin: 0; padding: 40px; display: flex; justify-content: center; }
                    .cert-card { width: 900px; background: #ffffff; border: 12px double #1e1b4b; border-radius: 24px; padding: 60px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); position: relative; }
                    .header { font-size: 14px; font-weight: 900; letter-spacing: 4px; color: #4f46e5; text-transform: uppercase; }
                    .title { font-size: 36px; font-weight: 900; color: #0f172a; margin: 15px 0 30px; text-transform: uppercase; font-style: italic; }
                    .candidate-name { font-size: 40px; font-weight: 900; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; display: inline-block; margin: 20px 0; }
                    .desc { font-size: 16px; color: #475569; max-width: 680px; margin: 0 auto 30px; line-height: 1.6; }
                    .scores-grid { display: flex; justify-content: center; gap: 20px; margin: 30px 0; }
                    .score-box { background: #f1f5f9; padding: 15px 25px; border-radius: 16px; text-align: center; }
                    .score-val { font-size: 24px; font-weight: 900; color: #4f46e5; }
                    .score-lbl { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-top: 4px; }
                    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 30px; }
                    .sig-line { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="cert-card">
                    <div class="header">EDUAI AUTOMATION • OFFICIAL IELTS ACADEMY KENYA</div>
                    <div class="title">Certificate of IELTS Exam Readiness</div>
                    <p style="font-size: 14px; color: #64748b; font-weight: 700;">THIS CERTIFIES THAT CANDIDATE</p>
                    <div class="candidate-name">${selectedCertCandidate.name}</div>
                    <p class="desc">
                        Has completed full-length IELTS Mock Examinations for <b>${selectedCertCandidate.moduleType}</b> module 
                        and achieved the official institutional readiness criteria for <b>${selectedCertCandidate.targetCountry}</b>.
                    </p>
                    <div class="scores-grid">
                        <div class="score-box"><div class="score-val">${selectedCertCandidate.currentListening}</div><div class="score-lbl">Listening</div></div>
                        <div class="score-box"><div class="score-val">${selectedCertCandidate.currentReading}</div><div class="score-lbl">Reading</div></div>
                        <div class="score-box"><div class="score-val">${selectedCertCandidate.currentWriting}</div><div class="score-lbl">Writing</div></div>
                        <div class="score-box"><div class="score-val">${selectedCertCandidate.currentSpeaking}</div><div class="score-lbl">Speaking</div></div>
                        <div class="score-box" style="background: #e0e7ff;"><div class="score-val" style="color:#3730a3;">${currentOverall}</div><div class="score-lbl">Overall Band</div></div>
                    </div>
                    <div class="footer">
                        <div>
                            <div class="sig-line">_______________________________</div>
                            <div class="sig-line" style="margin-top: 6px;">Lead IELTS Examiner & Tutor</div>
                        </div>
                        <div>
                            <div class="sig-line">Date: ${new Date().toLocaleDateString()}</div>
                            <div class="sig-line" style="margin-top: 6px;">Verification ID: IELTS-KE-${Math.floor(100000 + Math.random() * 900000)}</div>
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
                        <span>Institutional IELTS Tutor & Candidate Tracker</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Track candidate band targets, schedule mock exams, and print IELTS readiness clearance certificates
                    </p>
                </div>
            </div>

            {/* Candidate Band Roster */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest italic text-indigo-600 dark:text-indigo-400">
                    CANDIDATE BAND PROGRESS & TARGET IMMIGRATION ROSTER
                </h4>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                <th className="py-4">Candidate Name</th>
                                <th className="py-4">Module</th>
                                <th className="py-4">Target Pathway</th>
                                <th className="py-4 text-center">Sub-Scores (L / R / W / S)</th>
                                <th className="py-4 text-center">Overall Band</th>
                                <th className="py-4 text-right">Readiness Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map(c => {
                                const overall = ((c.currentListening + c.currentReading + c.currentWriting + c.currentSpeaking) / 4).toFixed(1);
                                const isReady = Number(overall) >= c.targetOverall;

                                return (
                                    <tr key={c.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-5 font-black italic text-sm">{c.name}</td>
                                        <td className="py-5 text-xs font-bold text-slate-500 uppercase">{c.moduleType}</td>
                                        <td className="py-5 text-xs font-bold text-indigo-500 uppercase">{c.targetCountry}</td>
                                        <td className="py-5 text-center text-xs font-mono font-bold">
                                            {c.currentListening} / {c.currentReading} / {c.currentWriting} / {c.currentSpeaking}
                                        </td>
                                        <td className="py-5 text-center font-black text-sm text-indigo-600 dark:text-indigo-400">
                                            Band {overall} <span className="text-[10px] text-slate-400 font-normal">(Target: {c.targetOverall})</span>
                                        </td>
                                        <td className="py-5 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedCertCandidate(c);
                                                    printReadinessCertificate();
                                                }}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-2 ml-auto ${
                                                    isReady
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                                }`}
                                            >
                                                <PrinterIcon className="w-4 h-4" />
                                                <span>Print Certificate</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
