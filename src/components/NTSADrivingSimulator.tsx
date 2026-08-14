import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

export const NTSADrivingSimulator: React.FC = () => {
    const [carPos, setCarPos] = useState({ x: 180, y: 320, angle: 0 });
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    const questions = [
        {
            id: 'q1',
            question: 'What is the golden rule of the Model Town Board when entering a roundabout in Kenya?',
            options: ['A. Always stop inside the roundabout', 'B. Give way to traffic coming from the right', 'C. Drive anti-clockwise at all times', 'D. Honk before entering'],
            correct: 'B. Give way to traffic coming from the right'
        },
        {
            id: 'q2',
            question: 'Which lane option must be used when taking Option 4 on a 4-lane roundabout?',
            options: ['A. Lane 1 (Extreme Left)', 'B. Lane 2', 'C. Lane 3', 'D. Lane 4 (Extreme Right / Inner Circle)'],
            correct: 'D. Lane 4 (Extreme Right / Inner Circle)'
        }
    ];

    const moveCar = (direction: 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT') => {
        setCarPos(prev => {
            let { x, y, angle } = prev;
            if (direction === 'FORWARD') {
                x += Math.cos((angle * Math.PI) / 180) * 15;
                y += Math.sin((angle * Math.PI) / 180) * 15;
            } else if (direction === 'BACKWARD') {
                x -= Math.cos((angle * Math.PI) / 180) * 15;
                y -= Math.sin((angle * Math.PI) / 180) * 15;
            } else if (direction === 'LEFT') {
                angle -= 15;
            } else if (direction === 'RIGHT') {
                angle += 15;
            }
            return { x: Math.max(20, Math.min(380, x)), y: Math.max(20, Math.min(380, y)), angle };
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        NTSA Driving School Module
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">NTSA Theory & Model Town Board Simulator</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Practice Model Town Board roundabout maneuvers & NTSA highway code test questions
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* 2D Model Town Board Simulator */}
                <div className="md:col-span-6 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">
                        2D MODEL TOWN BOARD SIMULATOR
                    </h3>

                    {/* Canvas Arena */}
                    <div className="w-[400px] h-[400px] bg-slate-950 rounded-3xl border-4 border-slate-800 mx-auto relative overflow-hidden flex items-center justify-center">
                        {/* Roundabout circles */}
                        <div className="w-56 h-56 rounded-full border-4 border-dashed border-amber-400/40 absolute flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-emerald-600/30 border-2 border-emerald-400 flex items-center justify-center text-[10px] font-black text-emerald-300 uppercase">
                                Roundabout
                            </div>
                        </div>

                        {/* Car Sprite */}
                        <div
                            className="w-6 h-10 bg-indigo-500 rounded-md border-2 border-white absolute transition-all duration-100 flex items-center justify-center shadow-lg"
                            style={{
                                left: `${carPos.x}px`,
                                top: `${carPos.y}px`,
                                transform: `rotate(${carPos.angle}deg)`
                            }}
                        >
                            <div className="w-2 h-2 bg-amber-300 rounded-full animate-ping"></div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                        <button onClick={() => moveCar('FORWARD')} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider">▲ Drive Forward</button>
                        <div className="flex gap-2">
                            <button onClick={() => moveCar('LEFT')} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase">◀ Steer Left</button>
                            <button onClick={() => moveCar('RIGHT')} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase">Steer Right ▶</button>
                        </div>
                        <button onClick={() => moveCar('BACKWARD')} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider">▼ Reverse</button>
                    </div>
                </div>

                {/* Quiz */}
                <div className="md:col-span-6 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 italic">
                        NTSA HIGHWAY CODE THEORY QUIZ
                    </h3>

                    <div className="space-y-4">
                        {questions.map(q => (
                            <div key={q.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                                <p className="text-xs font-black text-white">{q.question}</p>
                                <div className="space-y-1.5">
                                    {q.options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                            className={`w-full p-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                                                quizAnswers[q.id] === opt
                                                    ? 'bg-indigo-600 text-white border-indigo-400'
                                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
