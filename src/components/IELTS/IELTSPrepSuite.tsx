import React, { useState } from 'react';
import { SAMPLE_READING_PASSAGES, calculateIELTSListeningReadingBand } from './IELTSPracticeData';
import { IELTSWritingEvaluator } from './IELTSWritingEvaluator';
import { IELTSSpeakingStudio } from './IELTSSpeakingStudio';
import { IELTSTutorDashboard } from './IELTSTutorDashboard';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

export const IELTSPrepSuite: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'reading' | 'listening' | 'writing' | 'speaking' | 'tutor'>('reading');
    const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
    const [readingSubmitted, setReadingSubmitted] = useState<boolean>(false);

    const activePassage = SAMPLE_READING_PASSAGES[0];

    const calculateReadingScore = () => {
        let correct = 0;
        activePassage.questions.forEach(q => {
            if (readingAnswers[q.id] === q.correctAnswer) correct++;
        });
        return correct;
    };

    return (
        <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 rounded-[3rem] text-white shadow-2xl border border-indigo-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-4 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-indigo-400" />
                            <span>IELTS Exam Preparation Suite</span>
                        </span>
                        <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 text-xs font-black uppercase tracking-widest italic">
                            Academic & General Training
                        </span>
                    </div>

                    <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">
                        IELTS <span className="text-indigo-400">Mastery</span> & Institutional Suite
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest max-w-2xl leading-relaxed">
                        Complete candidate preparation, AI Essay Evaluator, Speaking Studio, Target Band tracking, and official Readiness Certificates for Kenyan institutions.
                    </p>
                </div>
            </div>

            {/* Suite Navigation Tabs */}
            <div className="bg-slate-900/90 p-3 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'reading', label: '📖 Reading Practice', desc: 'Academic Passages' },
                        { id: 'listening', label: '🎧 Listening Station', desc: 'Timed Audio Tests' },
                        { id: 'writing', label: '✍️ Writing AI Evaluator', desc: 'Task 1 & Task 2 Rubrics' },
                        { id: 'speaking', label: '🗣️ Speaking Studio', desc: 'Part 2 Cue Card' },
                        { id: 'tutor', label: '🎓 Tutor Command Center', desc: 'Candidate Roster & Certificates' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all italic text-left ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105'
                                    : 'text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800'
                            }`}
                        >
                            <div>{tab.label}</div>
                            <div className="text-[9px] font-bold opacity-75 mt-0.5">{tab.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Tab Component */}
            {activeTab === 'reading' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Passage View */}
                        <div className="lg:col-span-7 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase text-indigo-400">{activePassage.moduleType} READING PASSAGE</span>
                                <span className="text-xs font-bold text-slate-400">Timer: 20:00 min</span>
                            </div>
                            <h3 className="text-xl font-black text-white italic">{activePassage.title}</h3>
                            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 max-h-[450px] overflow-y-auto leading-relaxed text-slate-300 font-serif text-sm whitespace-pre-wrap">
                                {activePassage.passageText}
                            </div>
                        </div>

                        {/* Questions & Band Score Calculator */}
                        <div className="lg:col-span-5 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between">
                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">
                                    QUESTIONS 1–{activePassage.questions.length} (True / False / Not Given)
                                </h4>

                                {activePassage.questions.map((q, idx) => (
                                    <div key={q.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                                        <p className="text-xs font-black text-slate-200">{idx + 1}. {q.questionText}</p>

                                        <div className="flex gap-2">
                                            {q.options?.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setReadingAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                                        readingAnswers[q.id] === opt
                                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>

                                        {readingSubmitted && (
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${
                                                readingAnswers[q.id] === q.correctAnswer ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                                {readingAnswers[q.id] === q.correctAnswer ? '✓ Correct!' : `❌ Correct answer: ${q.correctAnswer}`} — {q.explanation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Submit & Band Result */}
                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                {readingSubmitted && (
                                    <div className="p-4 bg-indigo-950/80 border border-indigo-500/40 rounded-2xl text-center">
                                        <p className="text-[10px] font-black uppercase text-indigo-300">ESTIMATED READING BAND</p>
                                        <p className="text-3xl font-black text-white italic">
                                            Band {calculateIELTSListeningReadingBand(calculateReadingScore() * 15)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                            Score: {calculateReadingScore()} / {activePassage.questions.length} Correct
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => setReadingSubmitted(true)}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                                >
                                    Submit Reading Test & Calculate Band
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'listening' && (
                <div className="bg-slate-900 p-12 rounded-[3rem] border border-slate-800 shadow-2xl text-center space-y-6">
                    <h3 className="text-2xl font-black text-white italic">🎧 Timed IELTS Listening Test Station</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
                        Listen to authentic IELTS audio recordings (British Council / IDP accent standards) and answer Section 1–4 diagnostic questions.
                    </p>
                    <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800 max-w-md mx-auto space-y-4">
                        <span className="text-4xl">🔊</span>
                        <p className="text-xs font-black text-indigo-400 uppercase">Section 1: University Student Housing Inquiry</p>
                        <audio controls className="w-full">
                            <source src="https://www.w3schools.com/html/horse.mp3" type="audio/mpeg" />
                        </audio>
                    </div>
                </div>
            )}

            {activeTab === 'writing' && <IELTSWritingEvaluator />}
            {activeTab === 'speaking' && <IELTSSpeakingStudio />}
            {activeTab === 'tutor' && <IELTSTutorDashboard />}
        </div>
    );
};

export default IELTSPrepSuite;
