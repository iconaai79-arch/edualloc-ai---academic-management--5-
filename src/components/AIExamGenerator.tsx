import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface GeneratedExam {
    title: string;
    curriculum: 'CBC Kenya' | '8-4-4 Kenya' | 'IGCSE' | 'IELTS Academic';
    gradeLevel: string;
    subject: string;
    durationMinutes: number;
    totalMarks: number;
    questions: {
        number: number;
        questionText: string;
        options?: string[];
        marks: number;
        correctAnswer: string;
        markingCriteria: string;
    }[];
}

export const AIExamGenerator: React.FC = () => {
    const [curriculum, setCurriculum] = useState<'CBC Kenya' | '8-4-4 Kenya' | 'IGCSE' | 'IELTS Academic'>('CBC Kenya');
    const [gradeLevel, setGradeLevel] = useState<string>('Grade 6');
    const [subject, setSubject] = useState<string>('Science & Technology');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const [exam, setExam] = useState<GeneratedExam>({
        title: 'End of Term 2 Examination — Science & Technology',
        curriculum: 'CBC Kenya',
        gradeLevel: 'Grade 6',
        subject: 'Science & Technology',
        durationMinutes: 90,
        totalMarks: 50,
        questions: [
            {
                number: 1,
                questionText: 'Which organ of the human respiratory system is responsible for gas exchange between oxygen and blood?',
                options: ['A. Trachea', 'B. Alveoli (Air Sacs)', 'C. Bronchus', 'D. Diaphragm'],
                marks: 2,
                correctAnswer: 'B. Alveoli (Air Sacs)',
                markingCriteria: 'Award 2 marks for correct identification of Alveoli.'
            },
            {
                number: 2,
                questionText: 'Describe two simple methods a student can use to prevent soil erosion in a sloping school garden.',
                marks: 4,
                correctAnswer: '1. Terracing / Contour ploughing. 2. Mulching / Planting cover crops.',
                markingCriteria: 'Award 2 marks per valid soil conservation method with brief explanation.'
            },
            {
                number: 3,
                questionText: 'Explain the function of a light sensor (LDR) in a simple automated street light circuit.',
                marks: 4,
                correctAnswer: 'A Light Dependent Resistor increases resistance in darkness, triggering the switch to turn the light on.',
                markingCriteria: 'Award 2 marks for resistance change in darkness and 2 marks for relay switch trigger.'
            }
        ]
    });

    const generateExamWithAI = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setExam({
                title: `${gradeLevel} ${subject} — Summative Assessment Paper`,
                curriculum,
                gradeLevel,
                subject,
                durationMinutes: 90,
                totalMarks: 50,
                questions: [
                    {
                        number: 1,
                        questionText: `Identify the primary function of ${subject === 'Mathematics' ? 'fraction multiplication' : 'respiratory organs'} in daily life.`,
                        options: ['A. Option 1', 'B. Option 2', 'C. Option 3', 'D. Option 4'],
                        marks: 2,
                        correctAnswer: 'B. Option 2',
                        markingCriteria: 'Award 2 marks for correct choice.'
                    },
                    {
                        number: 2,
                        questionText: `Write a short structured response explaining the key concepts of ${subject} for ${gradeLevel}.`,
                        marks: 5,
                        correctAnswer: 'Complete structured response with key terms.',
                        markingCriteria: 'Award 5 marks based on clarity, accuracy, and syllabus keywords.'
                    }
                ]
            });
            setIsGenerating(false);
        }, 1200);
    };

    const printExamPaper = (includeAnswerKey: boolean) => {
        const win = window.open('', '_blank');
        if (!win) return;

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${exam.title} — ${includeAnswerKey ? 'MARKING SCHEME' : 'QUESTION PAPER'}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; margin: 0; padding: 40px; color: #0f172a; }
                    .exam-container { max-width: 800px; margin: 0 auto; border: 2px solid #0f172a; padding: 40px; border-radius: 12px; }
                    .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
                    .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; text-align: center; }
                    .exam-title { font-size: 16px; font-weight: 900; text-transform: uppercase; text-align: center; margin-top: 5px; color: #4f46e5; }
                    .student-info { display: flex; justify-content: space-between; margin: 20px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
                    .q-box { margin-bottom: 25px; page-break-inside: avoid; }
                    .q-num { font-weight: 900; font-size: 14px; }
                    .q-marks { float: right; font-weight: 800; font-size: 12px; color: #64748b; }
                    .opt-list { margin: 10px 0 0 20px; font-size: 13px; font-weight: 700; }
                    .answer-key-box { background: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 10px; font-size: 12px; font-weight: 700; color: #065f46; }
                </style>
            </head>
            <body>
                <div class="exam-container">
                    <div class="school-name">EDUAI AUTOMATION ACADEMY</div>
                    <div class="exam-title">${exam.title} ${includeAnswerKey ? '— (OFFICIAL MARKING SCHEME)' : ''}</div>
                    
                    <div class="student-info">
                        <div><b>Student Name:</b> ___________________________</div>
                        <div><b>Grade:</b> ${exam.gradeLevel}</div>
                        <div><b>Time:</b> ${exam.durationMinutes} Mins</div>
                        <div><b>Total Marks:</b> ${exam.totalMarks}</div>
                    </div>

                    ${exam.questions.map(q => `
                        <div class="q-box">
                            <span class="q-marks">[${q.marks} Marks]</span>
                            <div class="q-num">Q${q.number}. ${q.questionText}</div>
                            ${q.options ? `<div class="opt-list">${q.options.map(o => `<div>${o}</div>`).join('')}</div>` : ''}
                            
                            ${includeAnswerKey ? `
                                <div class="answer-key-box">
                                    <b>Correct Answer:</b> ${q.correctAnswer}<br/>
                                    <b>Marking Criteria:</b> ${q.markingCriteria}
                                </div>
                            ` : `<div style="height: 60px; border-bottom: 1px dotted #cbd5e1; margin-top: 15px;"></div>`}
                        </div>
                    `).join('')}
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
                        Syllabus AI Assessment Suite
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">AI Exam & Worksheet Generator</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Generate 1-click syllabus-aligned Question Papers & Answer Keys for CBC, 8-4-4, IGCSE & IELTS
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => printExamPaper(false)}
                        className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 cursor-pointer"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        <span>Print Exam Paper</span>
                    </button>
                    <button
                        onClick={() => printExamPaper(true)}
                        className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 cursor-pointer"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        <span>Print Marking Scheme</span>
                    </button>
                </div>
            </div>

            {/* Generator Controls */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-xl space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">Curriculum Standard</label>
                        <select
                            value={curriculum}
                            onChange={e => setCurriculum(e.target.value as any)}
                            className="w-full p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 font-bold text-xs"
                        >
                            <option value="CBC Kenya">CBC Kenya (Competency Based Curriculum)</option>
                            <option value="8-4-4 Kenya">8-4-4 Kenya Secondary</option>
                            <option value="IGCSE">IGCSE Cambridge</option>
                            <option value="IELTS Academic">IELTS Academic / General</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">Grade / Level</label>
                        <select
                            value={gradeLevel}
                            onChange={e => setGradeLevel(e.target.value)}
                            className="w-full p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 font-bold text-xs"
                        >
                            <option value="PP1">PP1 / PP2 (Kindergarten)</option>
                            <option value="Grade 1">Grade 1 – Grade 3 (Lower Primary)</option>
                            <option value="Grade 6">Grade 4 – Grade 6 (Upper Primary)</option>
                            <option value="Junior Secondary">Grade 7 – Grade 9 (Junior Secondary)</option>
                            <option value="Form 4">Form 1 – Form 4 (KCSE Level)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">Subject Area</label>
                        <select
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 font-bold text-xs"
                        >
                            <option value="Science & Technology">Science & Technology</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="English Language">English Language</option>
                            <option value="Kiswahili Lugha">Kiswahili Lugha</option>
                            <option value="Social Studies">Social Studies & CRE</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={generateExamWithAI}
                    disabled={isGenerating}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                >
                    <SparklesIcon className="w-5 h-5" />
                    <span>{isGenerating ? 'Generating Exam Paper & Marking Scheme...' : '⚡ Generate AI Exam Paper & Marking Scheme'}</span>
                </button>
            </div>
        </div>
    );
};
