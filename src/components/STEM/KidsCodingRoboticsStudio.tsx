import React, { useState, useEffect } from 'react';
import { STEM_SYLLABUS_MISSIONS, STEMMission } from './STEMSyllabusData';
import { JuniorPictureBlockCanvas } from './JuniorPictureBlockCanvas';
import { SeniorBlocklyPythonStudio } from './SeniorBlocklyPythonStudio';
import { STEMTeacherDashboard } from './STEMTeacherDashboard';
import { audioVoiceEngine } from '../../utils/audioVoiceEngine';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface KidsCodingRoboticsStudioProps {
    currentUser?: any;
    institution?: any;
}

export const KidsCodingRoboticsStudio: React.FC<KidsCodingRoboticsStudioProps> = ({ currentUser }) => {
    const [selectedGrade, setSelectedGrade] = useState<'Grade 1-3' | 'Grade 4-6' | 'Grade 7-8'>('Grade 1-3');
    const [activeTab, setActiveTab] = useState<'syllabus' | 'studio' | 'teacher'>('syllabus');

    // Progression state
    const [selectedMission, setSelectedMission] = useState<STEMMission>(STEM_SYLLABUS_MISSIONS[0]);
    const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
    const [totalXp, setTotalXp] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    // Filter missions by selected grade
    const filteredMissions = STEM_SYLLABUS_MISSIONS.filter(m => m.gradeLevel === selectedGrade);

    // Update selected mission when grade changes
    useEffect(() => {
        const firstInGrade = STEM_SYLLABUS_MISSIONS.find(m => m.gradeLevel === selectedGrade);
        if (firstInGrade) {
            setSelectedMission(firstInGrade);
        }
    }, [selectedGrade]);

    const handleMissionComplete = (xpEarned: number) => {
        if (!completedMissionIds.includes(selectedMission.id)) {
            setCompletedMissionIds(prev => [...prev, selectedMission.id]);
            setTotalXp(prev => prev + xpEarned);
        }
    };

    const toggleAudioMute = () => {
        const muted = audioVoiceEngine.toggleMute();
        setIsMuted(muted);
    };

    return (
        <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Header Hero Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-8 sm:p-10 rounded-[3rem] text-white shadow-2xl border border-indigo-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[140px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>

                <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-4 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-indigo-400" />
                            <span>STEM EdTech & Robotics Hub</span>
                        </span>
                        <span className="px-4 py-1.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 text-xs font-black uppercase tracking-widest italic">
                            🏆 {totalXp} XP EARNED
                        </span>
                    </div>

                    <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">
                        Kids <span className="text-indigo-400">Coding</span> & Robotics Studio
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest max-w-2xl leading-relaxed">
                        Syllabus-aligned block coding, virtual robot simulator arena, audio narration, and hardware firmware compiler (Grade 1 to Grade 8).
                    </p>
                </div>

                {/* Controls & Mute */}
                <div className="flex items-center gap-4 relative z-10 shrink-0">
                    <button
                        onClick={toggleAudioMute}
                        className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center gap-2 border ${
                            isMuted
                                ? 'bg-rose-900/60 text-rose-300 border-rose-700/50'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/50'
                        }`}
                    >
                        <SpeakerWaveIcon className={`w-4 h-4 ${isMuted ? 'opacity-50' : 'animate-pulse'}`} />
                        <span>{isMuted ? 'Muted' : '🔊 Audio Voice On'}</span>
                    </button>
                </div>
            </div>

            {/* Grade Tier Selector */}
            <div className="bg-slate-900/90 p-3 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-3">
                    {[
                        { id: 'Grade 1-3', label: '🐣 Grade 1 - 3 (Junior Explorer)', desc: 'Picture Blocks & Audio' },
                        { id: 'Grade 4-6', label: '🚀 Grade 4 - 6 (Apprentice Builder)', desc: 'Scratch Logic Blocks' },
                        { id: 'Grade 7-8', label: '⚡ Grade 7 - 8 (Robotics Engineer)', desc: 'Python & Sensors IDE' },
                    ].map(grade => (
                        <button
                            key={grade.id}
                            onClick={() => setSelectedGrade(grade.id as any)}
                            className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all italic text-left ${
                                selectedGrade === grade.id
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105'
                                    : 'text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800'
                            }`}
                        >
                            <div>{grade.label}</div>
                            <div className="text-[9px] font-bold opacity-75 mt-0.5">{grade.desc}</div>
                        </button>
                    ))}
                </div>

                {/* Subtab Switcher */}
                <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    <button
                        onClick={() => setActiveTab('syllabus')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all italic ${
                            activeTab === 'syllabus' ? 'bg-white text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        📚 Syllabus Pathways
                    </button>

                    <button
                        onClick={() => setActiveTab('studio')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all italic ${
                            activeTab === 'studio' ? 'bg-white text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        🤖 Active Studio
                    </button>

                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all italic ${
                            activeTab === 'teacher' ? 'bg-white text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        🎓 Teacher Dashboard
                    </button>
                </div>
            </div>

            {/* Main Active Tab Views */}
            {activeTab === 'syllabus' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight italic text-slate-900 dark:text-white">
                                {selectedGrade} Syllabus Learning Pathways
                            </h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                                Step-by-step unit missions with story tasks, quizzes, and star rewards
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMissions.map(mission => {
                            const isDone = completedMissionIds.includes(mission.id);
                            const isSelected = selectedMission.id === mission.id;

                            return (
                                <div
                                    key={mission.id}
                                    onClick={() => {
                                        setSelectedMission(mission);
                                        setActiveTab('studio');
                                    }}
                                    className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer space-y-4 relative overflow-hidden group shadow-xl ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-500 text-white ring-2 ring-indigo-400 scale-[1.02]'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-indigo-400 text-slate-900 dark:text-white hover:scale-[1.01]'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                                            Term {mission.termNumber} • Unit {mission.unitNumber}
                                        </span>
                                        {isDone ? (
                                            <span className="flex items-center gap-1 text-xs font-black text-emerald-400">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                <span>PASSED</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs font-black text-amber-500">+{mission.xpReward} XP</span>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-black italic tracking-tight">{mission.title}</h4>
                                        <p className="text-xs font-bold text-indigo-400 mt-0.5">{mission.subtitle}</p>
                                    </div>

                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                        {mission.storyDescription}
                                    </p>

                                    <div className="pt-2 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-indigo-500 group-hover:underline">Launch Mission Studio →</span>
                                        <span className="text-slate-400">{mission.gradeLevel}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'studio' && (
                <div className="animate-fade-in">
                    {selectedGrade === 'Grade 1-3' ? (
                        <JuniorPictureBlockCanvas
                            mission={selectedMission}
                            onMissionComplete={handleMissionComplete}
                        />
                    ) : (
                        <SeniorBlocklyPythonStudio
                            mission={selectedMission}
                            onMissionComplete={handleMissionComplete}
                        />
                    )}
                </div>
            )}

            {activeTab === 'teacher' && (
                <div className="animate-fade-in">
                    <STEMTeacherDashboard
                        missions={STEM_SYLLABUS_MISSIONS}
                        totalXpEarned={totalXp}
                        completedMissionIds={completedMissionIds}
                    />
                </div>
            )}
        </div>
    );
};

export default KidsCodingRoboticsStudio;
