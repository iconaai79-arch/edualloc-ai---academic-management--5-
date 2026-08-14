import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface SpeechProgressRecord {
    childName: string;
    age: string;
    stage: 'Playgroup' | 'PP1' | 'PP2' | 'Grade 1';
    therapistName: string;
    assessmentDate: string;
    phonemeScores: { phoneme: string; scorePct: number; status: 'MASTERED' | 'DEVELOPING' | 'NEEDS_PRACTICE' }[];
    sustainedVowelSec: number;
    artPaintingAccuracyPct: number;
    therapistNotes: string;
    parentRecommendations: string[];
}

export const SpeechTherapyReportGenerator: React.FC = () => {
    const [record, setRecord] = useState<SpeechProgressRecord>({
        childName: 'Faith Mwangi',
        age: '4 Years 6 Months',
        stage: 'PP1',
        therapistName: 'Dr. Clara Wanjiku (SLP)',
        assessmentDate: new Date().toLocaleDateString(),
        phonemeScores: [
            { phoneme: '/b/ (Ball, Bear)', scorePct: 92, status: 'MASTERED' },
            { phoneme: '/m/ (Mama, Moon)', scorePct: 88, status: 'MASTERED' },
            { phoneme: '/f/ (Fish, Fan)', scorePct: 74, status: 'DEVELOPING' },
            { phoneme: '/s/ (Sun, Snake)', scorePct: 62, status: 'NEEDS_PRACTICE' },
            { phoneme: '/r/ (Rainbow, Run)', scorePct: 55, status: 'NEEDS_PRACTICE' },
        ],
        sustainedVowelSec: 12.5,
        artPaintingAccuracyPct: 94,
        therapistNotes: 'Faith demonstrates excellent receptive language and visual-spatial motor control during Speech Buddy Art Studio activities. Phonemes /b/ and /m/ are fully mastered with crisp articulation. Continued daily practice recommended for /s/ and /r/ phonemes using visual cues.',
        parentRecommendations: [
            'Practice 5 minutes of Speech Buddy /s/ phoneme repetition daily after school.',
            'Encourage child to tell a 2-sentence story about her Art Studio painting.',
            'Maintain gentle auditory modeling without correcting hesitancy.'
        ]
    });

    const printTherapyReport = () => {
        const win = window.open('', '_blank');
        if (!win) return;

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Speech & Art Therapy Clinical Progress Report — ${record.childName}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; margin: 0; padding: 40px; color: #0f172a; }
                    .report-card { border: 3px double #4f46e5; border-radius: 24px; padding: 40px; max-width: 850px; margin: 0 auto; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
                    .logo-title { font-size: 20px; font-weight: 900; color: #4f46e5; text-transform: uppercase; }
                    .sub-logo { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                    .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #4f46e5; margin: 20px 0 10px; }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 16px; margin-bottom: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    .table th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; }
                    .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; }
                    .badge { padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
                    .badge-mastered { background: #dcfce7; color: #166534; }
                    .badge-dev { background: #e0e7ff; color: #3730a3; }
                    .badge-needs { background: #fef3c7; color: #92400e; }
                    .notes-box { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; font-size: 13px; line-height: 1.6; margin-bottom: 25px; }
                    .footer { display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; font-weight: 700; color: #64748b; }
                </style>
            </head>
            <body>
                <div class="report-card">
                    <div class="header">
                        <div>
                            <div class="logo-title">SPEECH BUDDY AI • CLINICAL THERAPY PORTAL</div>
                            <div class="sub-logo">Pediatric Speech & Fine Motor Development Report</div>
                        </div>
                        <div style="text-align: right; font-size: 12px; font-weight: 800; color: #64748b;">
                            Date: ${record.assessmentDate}<br/>
                            ID: SB-CLINIC-${Math.floor(100000 + Math.random() * 900000)}
                        </div>
                    </div>

                    <div class="grid-2">
                        <div><b>Child Name:</b> ${record.childName}</div>
                        <div><b>Age & Level:</b> ${record.age} (${record.stage})</div>
                        <div><b>Evaluating SLP / Teacher:</b> ${record.therapistName}</div>
                        <div><b>Sustained Vowel Breath:</b> ${record.sustainedVowelSec} seconds</div>
                    </div>

                    <div class="section-title">1. Phoneme Articulation Diagnostic Scores</div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Target Phoneme</th>
                                <th>Accuracy Score</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${record.phonemeScores.map(s => `
                                <tr>
                                    <td>${s.phoneme}</td>
                                    <td><b>${s.scorePct}%</b></td>
                                    <td>
                                        <span class="badge ${s.status === 'MASTERED' ? 'badge-mastered' : s.status === 'DEVELOPING' ? 'badge-dev' : 'badge-needs'}">
                                            ${s.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="section-title">2. Fine Motor & Art Studio Painting Accuracy</div>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div><b>Shape Stencil Painting Accuracy Score:</b> ${record.artPaintingAccuracyPct}%</div>
                        <div style="color: #166534; font-weight: 900;">✓ Excellent Visual Motor Control</div>
                    </div>

                    <div class="section-title">3. Clinical Impressions & SLP Notes</div>
                    <div class="notes-box">${record.therapistNotes}</div>

                    <div class="section-title">4. Home Practice Recommendations</div>
                    <ul style="font-size: 13px; font-weight: 700; line-height: 1.8; color: #334155;">
                        ${record.parentRecommendations.map(r => `<li>${r}</li>`).join('')}
                    </ul>

                    <div class="footer">
                        <div>
                            ___________________________________<br/>
                            ${record.therapistName}<br/>
                            Certified Speech Language Pathologist
                        </div>
                        <div style="text-align: right;">
                            ___________________________________<br/>
                            Parent / Guardian Signature
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
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        Speech Buddy AI Clinical Module
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Speech & Art Therapy Progress Generator</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Generate official clinical reports for speech therapists, special education teachers, and parents
                    </p>
                </div>
                <button
                    onClick={printTherapyReport}
                    className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <PrinterIcon className="w-5 h-5" />
                    <span>Print Official Clinical PDF</span>
                </button>
            </div>

            {/* Child Summary & Scores */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-7 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">
                        PHONEME & ARTICULATION ACCURACY SCORES
                    </h3>

                    <div className="space-y-4">
                        {record.phonemeScores.map((s, idx) => (
                            <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                                <div>
                                    <h4 className="text-sm font-black text-white">{s.phoneme}</h4>
                                    <div className="w-48 h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${s.scorePct >= 80 ? 'bg-emerald-500' : s.scorePct >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                            style={{ width: `${s.scorePct}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-indigo-400">{s.scorePct}%</span>
                                    <p className={`text-[10px] font-black uppercase tracking-wider ${s.status === 'MASTERED' ? 'text-emerald-400' : s.status === 'DEVELOPING' ? 'text-indigo-400' : 'text-amber-400'}`}>
                                        {s.status}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-5 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-4 shadow-xl">
                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 italic">
                            FINE MOTOR & VOWEL BREATH TIMERS
                        </h3>

                        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase">Sustained Vowel /ah/</p>
                                <p className="text-2xl font-black text-white italic">{record.sustainedVowelSec} sec</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-black">Good Capacity</span>
                        </div>

                        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase">Art Studio Painting Score</p>
                                <p className="text-2xl font-black text-amber-400 italic">{record.artPaintingAccuracyPct}% Accuracy</p>
                            </div>
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-black">High Control</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
