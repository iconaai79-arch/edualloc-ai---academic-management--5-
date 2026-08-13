import React, { useState, useEffect } from 'react';
import { STEMMission } from './STEMSyllabusData';
import { audioVoiceEngine } from '../../utils/audioVoiceEngine';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { PlayIcon } from '../icons/PlayIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface JuniorPictureBlockCanvasProps {
    mission: STEMMission;
    onMissionComplete: (xpEarned: number) => void;
}

export type JuniorBlockType = 'FORWARD' | 'BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'LIGHT' | 'SOUND' | 'REPEAT_3';

interface JuniorBlockItem {
    id: string;
    type: JuniorBlockType;
    icon: string;
    label: string;
    color: string;
}

const AVAILABLE_PICTURE_BLOCKS: JuniorBlockItem[] = [
    { id: 'b_fwd', type: 'FORWARD', icon: '⬆️', label: 'STEP FORWARD', color: 'bg-emerald-500 hover:bg-emerald-400 text-white' },
    { id: 'b_bwd', type: 'BACKWARD', icon: '⬇️', label: 'STEP BACK', color: 'bg-amber-500 hover:bg-amber-400 text-white' },
    { id: 'b_left', type: 'TURN_LEFT', icon: '↩️', label: 'TURN LEFT', color: 'bg-indigo-500 hover:bg-indigo-400 text-white' },
    { id: 'b_right', type: 'TURN_RIGHT', icon: '↪️', label: 'TURN RIGHT', color: 'bg-purple-500 hover:bg-purple-400 text-white' },
    { id: 'b_light', type: 'LIGHT', icon: '💡', label: 'FLASH LIGHT', color: 'bg-yellow-500 hover:bg-yellow-400 text-white' },
    { id: 'b_sound', type: 'SOUND', icon: '🎵', label: 'PLAY BEEP', color: 'bg-rose-500 hover:bg-rose-400 text-white' },
    { id: 'b_repeat', type: 'REPEAT_3', icon: '🔄', label: 'REPEAT 3x', color: 'bg-cyan-500 hover:bg-cyan-400 text-white' },
];

export const JuniorPictureBlockCanvas: React.FC<JuniorPictureBlockCanvasProps> = ({ mission, onMissionComplete }) => {
    const gridCols = mission.gridDimensions?.cols || 5;
    const gridRows = mission.gridDimensions?.rows || 4;

    const [robotPos, setRobotPos] = useState(mission.startPosition || { x: 0, y: 1, direction: 'RIGHT' });
    const [robotDir, setRobotDir] = useState<'RIGHT' | 'DOWN' | 'LEFT' | 'UP'>(mission.startPosition?.direction || 'RIGHT');
    const [programSequence, setProgramSequence] = useState<JuniorBlockItem[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('Tap picture blocks to build your program!');
    const [isVictorious, setIsVictorious] = useState(false);
    const [ledFlashColor, setLedFlashColor] = useState<string | null>(null);

    // Speak story when mission loads
    useEffect(() => {
        audioVoiceEngine.speak(mission.audioNarrationText || mission.storyDescription);
        resetBoard();
    }, [mission]);

    const resetBoard = () => {
        setRobotPos(mission.startPosition || { x: 0, y: 1, direction: 'RIGHT' });
        setRobotDir(mission.startPosition?.direction || 'RIGHT');
        setActiveStepIndex(null);
        setIsRunning(false);
        setIsVictorious(false);
        setStatusMessage('Tap blocks below to give Rover instructions!');
        setLedFlashColor(null);
    };

    const addBlockToSequence = (block: JuniorBlockItem) => {
        if (isRunning) return;
        audioVoiceEngine.playSnapSound();
        setProgramSequence(prev => [...prev, { ...block, id: `block_${Date.now()}_${Math.random()}` }]);
    };

    const removeBlockFromSequence = (index: number) => {
        if (isRunning) return;
        audioVoiceEngine.playSnapSound();
        setProgramSequence(prev => prev.filter((_, i) => i !== index));
    };

    const clearProgram = () => {
        audioVoiceEngine.playSnapSound();
        setProgramSequence([]);
        resetBoard();
    };

    const runProgram = async () => {
        if (programSequence.length === 0 || isRunning) return;

        setIsRunning(true);
        resetBoard();
        setStatusMessage('🤖 Rover Bot is executing your instructions!');

        let curX = mission.startPosition?.x || 0;
        let curY = mission.startPosition?.y || 0;
        let curDir = mission.startPosition?.direction || 'RIGHT';

        const dirs: ('RIGHT' | 'DOWN' | 'LEFT' | 'UP')[] = ['RIGHT', 'DOWN', 'LEFT', 'UP'];

        for (let i = 0; i < programSequence.length; i++) {
            setActiveStepIndex(i);
            const stepBlock = programSequence[i];

            await new Promise(r => setTimeout(r, 600));

            if (stepBlock.type === 'FORWARD') {
                audioVoiceEngine.playMotorSound(400);
                if (curDir === 'RIGHT' && curX < gridCols - 1) curX++;
                else if (curDir === 'DOWN' && curY < gridRows - 1) curY++;
                else if (curDir === 'LEFT' && curX > 0) curX--;
                else if (curDir === 'UP' && curY > 0) curY--;
            } else if (stepBlock.type === 'BACKWARD') {
                audioVoiceEngine.playMotorSound(400);
                if (curDir === 'RIGHT' && curX > 0) curX--;
                else if (curDir === 'DOWN' && curY > 0) curY--;
                else if (curDir === 'LEFT' && curX < gridCols - 1) curX++;
                else if (curDir === 'UP' && curY < gridRows - 1) curY++;
            } else if (stepBlock.type === 'TURN_RIGHT') {
                audioVoiceEngine.playSnapSound();
                const curIdx = dirs.indexOf(curDir);
                curDir = dirs[(curIdx + 1) % 4];
            } else if (stepBlock.type === 'TURN_LEFT') {
                audioVoiceEngine.playSnapSound();
                const curIdx = dirs.indexOf(curDir);
                curDir = dirs[(curIdx + 3) % 4];
            } else if (stepBlock.type === 'LIGHT') {
                audioVoiceEngine.playSnapSound();
                setLedFlashColor('#eab308');
                setTimeout(() => setLedFlashColor(null), 500);
            } else if (stepBlock.type === 'SOUND') {
                audioVoiceEngine.playSonarPing();
            } else if (stepBlock.type === 'REPEAT_3') {
                audioVoiceEngine.playMotorSound(600);
                for (let r = 0; r < 3; r++) {
                    if (curDir === 'RIGHT' && curX < gridCols - 1) curX++;
                    else if (curDir === 'DOWN' && curY < gridRows - 1) curY++;
                    else if (curDir === 'LEFT' && curX > 0) curX--;
                    else if (curDir === 'UP' && curY > 0) curY--;
                }
            }

            // Check collision with obstacles
            const isBlocked = (mission.obstacles || []).some(o => o.x === curX && o.y === curY);
            if (isBlocked) {
                audioVoiceEngine.playBumpSound();
                setStatusMessage('💥 Bump! Rover hit an obstacle rock. Try again!');
                audioVoiceEngine.speak('Oops! Rover hit a rock. Adjust your blocks and try again.');
                setIsRunning(false);
                setActiveStepIndex(null);
                return;
            }

            setRobotPos({ x: curX, y: curY, direction: curDir });
            setRobotDir(curDir);

            // Check victory star
            if (mission.targetStarPosition && curX === mission.targetStarPosition.x && curY === mission.targetStarPosition.y) {
                setIsVictorious(true);
                audioVoiceEngine.playVictoryFanfare();
                setStatusMessage('⭐ AMAZING JOB! Rover collected the Energy Star!');
                audioVoiceEngine.speak('Hurray! Excellent job! Rover collected the Energy Star!');
                setIsRunning(false);
                setActiveStepIndex(null);
                onMissionComplete(mission.xpReward);
                return;
            }
        }

        setIsRunning(false);
        setActiveStepIndex(null);

        if (mission.targetStarPosition && (curX !== mission.targetStarPosition.x || curY !== mission.targetStarPosition.y)) {
            setStatusMessage('Almost there! Rover stopped before reaching the Star. Add more steps!');
            audioVoiceEngine.speak('Almost there! Add a few more steps to reach the Star.');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Mission Story Bar */}
            <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 text-xs font-black rounded-full uppercase tracking-wider">
                            {mission.gradeLevel} • Unit {mission.unitNumber}
                        </span>
                        <h3 className="text-xl font-black italic">{mission.title}</h3>
                    </div>
                    <p className="text-sm font-bold opacity-90">{mission.storyDescription}</p>
                </div>
                <button
                    onClick={() => audioVoiceEngine.speak(mission.audioNarrationText || mission.storyDescription)}
                    className="px-5 py-3 bg-white text-indigo-900 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                    <SpeakerWaveIcon className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>🔊 Read Story</span>
                </button>
            </div>

            {/* Main Interactive Grid & Block Playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 2D Board Simulator Canvas */}
                <div className="lg:col-span-7 bg-slate-900 p-8 rounded-[3rem] border-4 border-indigo-500/30 shadow-2xl flex flex-col items-center justify-between relative overflow-hidden min-h-[420px]">
                    {ledFlashColor && (
                        <div className="absolute inset-0 bg-yellow-400/20 transition-all pointer-events-none animate-ping"></div>
                    )}

                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">ROBOT ARENA GRID (Grade 1-3)</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">{gridCols}x{gridRows} Tiles</span>
                    </div>

                    {/* Grid Tiles */}
                    <div
                        className="grid gap-3 p-4 bg-slate-950/80 rounded-3xl border border-slate-800 shadow-inner my-auto"
                        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                    >
                        {Array.from({ length: gridRows }).map((_, row) =>
                            Array.from({ length: gridCols }).map((_, col) => {
                                const isRobotHere = robotPos.x === col && robotPos.y === row;
                                const isStarHere = mission.targetStarPosition?.x === col && mission.targetStarPosition?.y === row;
                                const isObstacleHere = (mission.obstacles || []).some(o => o.x === col && o.y === row);

                                let dirRotation = 'rotate-0';
                                if (robotDir === 'DOWN') dirRotation = 'rotate-90';
                                if (robotDir === 'LEFT') dirRotation = 'rotate-180';
                                if (robotDir === 'UP') dirRotation = '-rotate-90';

                                return (
                                    <div
                                        key={`tile_${row}_${col}`}
                                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center relative transition-all duration-500 ${
                                            isRobotHere
                                                ? 'bg-indigo-600/30 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                                                : isStarHere
                                                ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                                : isObstacleHere
                                                ? 'bg-rose-950/40 border border-rose-800/50'
                                                : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        {isObstacleHere && (
                                            <span className="text-2xl select-none filter drop-shadow-md">🪨</span>
                                        )}

                                        {isStarHere && !isVictorious && (
                                            <span className="text-3xl select-none animate-bounce filter drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">⭐</span>
                                        )}

                                        {isRobotHere && (
                                            <div className={`transition-all duration-300 transform ${dirRotation}`}>
                                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg border border-indigo-300">
                                                    🤖
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Status Message */}
                    <div className={`mt-6 w-full p-4 rounded-2xl text-center text-xs font-black uppercase tracking-wider transition-all ${
                        isVictorious
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-300'
                    }`}>
                        {statusMessage}
                    </div>
                </div>

                {/* Picture Blocks Toolbox & Program Track */}
                <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                    {/* Toolbox Palette */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 italic">
                                🧩 PICTURE BLOCKS TOOLBOX
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tap to add</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {AVAILABLE_PICTURE_BLOCKS.map(block => (
                                <button
                                    key={block.id}
                                    onClick={() => addBlockToSequence(block)}
                                    disabled={isRunning}
                                    className={`p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer shadow-md active:scale-95 border border-white/20 ${block.color}`}
                                >
                                    <span className="text-2xl">{block.icon}</span>
                                    <span>{block.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Program Queue (Kid's Code) */}
                    <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex-1 flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 italic flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                                <span>YOUR CODE PROGRAM ({programSequence.length} Blocks)</span>
                            </h4>
                            <button
                                onClick={clearProgram}
                                disabled={isRunning || programSequence.length === 0}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 transition-all cursor-pointer disabled:opacity-30"
                            >
                                CLEAR ALL
                            </button>
                        </div>

                        {/* Sequence List */}
                        <div className="min-h-[120px] max-h-[220px] overflow-y-auto p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-wrap gap-2 items-center">
                            {programSequence.length > 0 ? (
                                programSequence.map((block, idx) => (
                                    <button
                                        key={block.id}
                                        onClick={() => removeBlockFromSequence(idx)}
                                        disabled={isRunning}
                                        className={`px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md border ${
                                            activeStepIndex === idx
                                                ? 'ring-4 ring-yellow-400 scale-110 shadow-yellow-500/50'
                                                : ''
                                        } ${block.color}`}
                                    >
                                        <span className="text-lg">{block.icon}</span>
                                        <span>{block.label}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="w-full text-center text-slate-500 text-xs font-bold uppercase py-6">
                                    Tap picture blocks above to build your robot program!
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={runProgram}
                                disabled={isRunning || programSequence.length === 0}
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
                            >
                                <PlayIcon className="w-5 h-5 fill-current" />
                                <span>{isRunning ? 'RUNNING...' : '▶ RUN PROGRAM'}</span>
                            </button>
                            <button
                                onClick={resetBoard}
                                disabled={isRunning}
                                className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all cursor-pointer"
                                title="Reset Board"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
