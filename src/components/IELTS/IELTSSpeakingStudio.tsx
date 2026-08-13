import React, { useState, useEffect } from 'react';
import { SAMPLE_SPEAKING_CUE_CARDS, IELTSSpeakingCueCard } from './IELTSPracticeData';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { PlayIcon } from '../icons/PlayIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

export const IELTSSpeakingStudio: React.FC = () => {
    const [selectedCueCard, setSelectedCueCard] = useState<IELTSSpeakingCueCard>(SAMPLE_SPEAKING_CUE_CARDS[0]);
    const [prepTimerSec, setPrepTimerSec] = useState<number>(selectedCueCard.prepTimeSec);
    const [isPrepTimerRunning, setIsPrepTimerRunning] = useState<boolean>(false);

    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordedTimeSec, setRecordedTimeSec] = useState<number>(0);
    const [showSampleResponse, setShowSampleResponse] = useState<boolean>(false);

    // Prep countdown timer
    useEffect(() => {
        let interval: any = null;
        if (isPrepTimerRunning && prepTimerSec > 0) {
            interval = setInterval(() => setPrepTimerSec(prev => prev - 1), 1000);
        } else if (prepTimerSec === 0) {
            setIsPrepTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isPrepTimerRunning, prepTimerSec]);

    // Recording timer
    useEffect(() => {
        let interval: any = null;
        if (isRecording) {
            interval = setInterval(() => setRecordedTimeSec(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const startPrepTimer = () => {
        setPrepTimerSec(selectedCueCard.prepTimeSec);
        setIsPrepTimerRunning(true);
    };

    const toggleRecording = () => {
        if (!isRecording) {
            setRecordedTimeSec(0);
            setIsRecording(true);
        } else {
            setIsRecording(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                            IELTS Speaking Part 2 Cue Card Studio
                        </span>
                        <span className="text-xs font-black text-amber-400">1-Min Prep & 2-Min Fluency</span>
                    </div>
                    <h3 className="text-2xl font-black italic mt-1">Interactive Candidate Interview Studio</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Cue Card Display & Timers */}
                <div className="lg:col-span-7 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="p-8 bg-slate-950 rounded-[2.5rem] border border-slate-800 space-y-4 relative overflow-hidden">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase text-indigo-400">SPEAKING CUE CARD (PART 2)</span>
                                <span className="text-xs font-bold text-slate-400">Prep: 1 min • Speak: 2 min</span>
                            </div>

                            <h4 className="text-xl font-black text-white italic">{selectedCueCard.topic}</h4>

                            <div className="space-y-2 pt-2">
                                <p className="text-xs font-black text-slate-400 uppercase">You should say:</p>
                                <ul className="space-y-2">
                                    {selectedCueCard.cuePoints.map((pt, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                            <span>{pt}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Timers Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Prep Timer Card */}
                            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-between space-y-3 text-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase">1-MIN PREPARATION TIMER</span>
                                <div className={`text-4xl font-black italic ${prepTimerSec === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    00:{prepTimerSec < 10 ? `0${prepTimerSec}` : prepTimerSec}
                                </div>
                                <button
                                    onClick={startPrepTimer}
                                    disabled={isPrepTimerRunning}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
                                >
                                    {isPrepTimerRunning ? 'Prepping...' : 'Start 1-Min Prep'}
                                </button>
                            </div>

                            {/* Recording Timer Card */}
                            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-between space-y-3 text-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase">SPEECH RECORDING TIMER</span>
                                <div className="text-4xl font-black italic text-amber-400">
                                    0{Math.floor(recordedTimeSec / 60)}:{recordedTimeSec % 60 < 10 ? `0${recordedTimeSec % 60}` : recordedTimeSec % 60}
                                </div>
                                <button
                                    onClick={toggleRecording}
                                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                                        isRecording
                                            ? 'bg-rose-600 text-white animate-pulse'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    }`}
                                >
                                    {isRecording ? '⏹ Stop Recording' : '🎙️ Start Recording'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Model Sample & Fluency Tips */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 italic flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4" />
                                <span>BAND 8.5 SAMPLE TRANSCRIPT</span>
                            </h4>
                            <button
                                onClick={() => setShowSampleResponse(!showSampleResponse)}
                                className="text-[10px] font-black uppercase text-indigo-400 hover:underline cursor-pointer"
                            >
                                {showSampleResponse ? 'Hide Transcript' : 'Show Transcript'}
                            </button>
                        </div>

                        {showSampleResponse ? (
                            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 max-h-60 overflow-y-auto italic text-xs text-slate-300 leading-relaxed">
                                "{selectedCueCard.sampleBand8Response}"
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
                                <p className="text-xs font-black text-slate-300 uppercase">Record your own response first!</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">
                                    Aim to speak continuously for 1 to 2 minutes without long hesitations.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Fluency Tips */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-xl space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">
                            💡 SPEAKING BAND 7.5+ EXAM TIPS
                        </h4>
                        <div className="space-y-3 text-xs font-bold text-slate-300 leading-relaxed">
                            <p>• <b>Fluency & Coherence</b>: Avoid long silent pauses. Use filler signposts like *"That’s a fascinating question..."* when thinking.</p>
                            <p>• <b>Lexical Resource</b>: Use idiomatic expressions accurately (e.g. *"revolutionized my routine"*, *"drastically improves memory"*).</p>
                            <p>• <b>Pronunciation</b>: Maintain natural rhythm, sentence stress, and intonation across your 2-minute monologue.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
