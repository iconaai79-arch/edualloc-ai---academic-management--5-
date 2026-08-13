import React, { useState, useEffect } from 'react';
import { STEMMission } from './STEMSyllabusData';
import { audioVoiceEngine } from '../../utils/audioVoiceEngine';
import { PlayIcon } from '../icons/PlayIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { CommandLineIcon } from '../icons/CommandLineIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';

interface SeniorBlocklyPythonStudioProps {
    mission: STEMMission;
    onMissionComplete: (xpEarned: number) => void;
}

export const SeniorBlocklyPythonStudio: React.FC<SeniorBlocklyPythonStudioProps> = ({ mission, onMissionComplete }) => {
    const [activeTab, setActiveTab] = useState<'blocks' | 'python' | 'export'>('blocks');

    // Code & Simulator State
    const [ultrasonicDistanceCm, setUltrasonicDistanceCm] = useState<number>(35);
    const [leftIrSensor, setLeftIrSensor] = useState<'WHITE' | 'BLACK'>('WHITE');
    const [rightIrSensor, setRightIrSensor] = useState<'WHITE' | 'BLACK'>('BLACK');
    const [motorSpeedPct, setMotorSpeedPct] = useState<number>(75);

    const [pythonCode, setPythonCode] = useState<string>(`# Python 3 STEM Robotics Script — ${mission.title}
from microbit import *
import ultrasonic

robot_speed = ${motorSpeedPct}

def scan_and_navigate():
    dist = ultrasonic.get_distance_cm()
    if dist < 15:
        display.show(Image.NO)
        # Avoid obstacle
        pin0.write_analog(0)    # Stop Left Motor
        pin1.write_analog(500)  # Spin Right Motor (Turn Left)
    else:
        display.show(Image.HAPPY)
        # Drive Forward
        pin0.write_analog(robot_speed * 10)
        pin1.write_analog(robot_speed * 10)

while True:
    scan_and_navigate()
    sleep(100)
`);

    const [isSimulating, setIsSimulating] = useState(false);
    const [robotStatus, setRobotStatus] = useState<string>('Simulator Ready. Adjust sensors & run script!');
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        audioVoiceEngine.speak(mission.audioNarrationText || mission.storyDescription);
        setIsCompleted(false);
    }, [mission]);

    const runSimulation = () => {
        setIsSimulating(true);
        audioVoiceEngine.playMotorSound(800);

        if (ultrasonicDistanceCm < 15) {
            audioVoiceEngine.playSonarPing();
            setRobotStatus('⚠️ Ultrasonic Sensor trigger (<15cm): Obstacle detected! Executing Turn Left routine.');
        } else {
            setRobotStatus('🟢 Path Clear: Driving forward at 75% motor PWM speed.');
        }

        setTimeout(() => {
            setIsSimulating(false);
            setIsCompleted(true);
            audioVoiceEngine.playVictoryFanfare();
            onMissionComplete(mission.xpReward);
        }, 2000);
    };

    const generateHardwareFirmware = (target: 'MICROBIT' | 'ARDUINO' | 'PYTHON') => {
        if (target === 'MICROBIT') {
            return `# Micro:bit V2 Hex Source Script
import microbit as mb

mb.display.scroll("STEM BOT")
while True:
    d = mb.pin0.read_analog()
    if d < 200:
        mb.pin1.write_digital(1) # Turn LED
    mb.sleep(100)
`;
        }
        if (target === 'ARDUINO') {
            return `// Arduino Uno C++ Motor Shield Firmware
#include <NewPing.h>

#define TRIGGER_PIN  12
#define ECHO_PIN     11
#define MAX_DISTANCE 200

NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);

void setup() {
  Serial.begin(9600);
  pinMode(5, OUTPUT); // Left Motor PWM
  pinMode(6, OUTPUT); // Right Motor PWM
}

void loop() {
  unsigned int uS = sonar.ping_cm();
  if (uS > 0 && uS < 15) {
    analogWrite(5, 0);   // Stop Left Motor
    analogWrite(6, 200); // Turn Right
  } else {
    analogWrite(5, 200);
    analogWrite(6, 200);
  }
  delay(50);
}
`;
        }
        return pythonCode;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Story Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                            {mission.gradeLevel} • Unit {mission.unitNumber}
                        </span>
                        <h3 className="text-xl font-black italic">{mission.title}</h3>
                    </div>
                    <p className="text-sm font-bold text-slate-300">{mission.storyDescription}</p>
                </div>
                <button
                    onClick={() => audioVoiceEngine.speak(mission.audioNarrationText || mission.storyDescription)}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                    <SpeakerWaveIcon className="w-4 h-4 text-white animate-pulse" />
                    <span>🔊 Read Story</span>
                </button>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="flex gap-4 p-2 bg-slate-900/80 rounded-2xl border border-slate-800 w-fit">
                <button
                    onClick={() => setActiveTab('blocks')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${
                        activeTab === 'blocks'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <SparklesIcon className="w-4 h-4" />
                    <span>Visual Logic Blocks</span>
                </button>

                <button
                    onClick={() => setActiveTab('python')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${
                        activeTab === 'python'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <CommandLineIcon className="w-4 h-4" />
                    <span>Python Code Editor</span>
                </button>

                <button
                    onClick={() => setActiveTab('export')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${
                        activeTab === 'export'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <span>⚡ Hardware Exporter</span>
                </button>
            </div>

            {/* Studio Main Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Pane: Blocks or Code Editor */}
                <div className="lg:col-span-7 bg-slate-950 p-6 rounded-[3rem] border border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between">
                    {activeTab === 'blocks' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">
                                    🧩 SCRATCH-STYLE LOGIC BLOCKS (Grade 4-8)
                                </h4>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Live Canvas</span>
                            </div>

                            {/* Block Workspace Demo */}
                            <div className="space-y-3">
                                <div className="p-4 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black uppercase flex items-center gap-3">
                                    <span>🔄 FOREVER LOOP ()</span>
                                </div>
                                <div className="ml-6 space-y-3 border-l-2 border-indigo-500/40 pl-4">
                                    <div className="p-4 bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 rounded-2xl text-xs font-black uppercase flex items-center gap-3">
                                        <span>📡 IF Distance &lt; 15 cm THEN</span>
                                    </div>
                                    <div className="ml-6 space-y-2 border-l-2 border-purple-500/40 pl-4">
                                        <div className="p-3 bg-purple-600/30 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-bold uppercase">
                                            <span>↩️ Spin Left Motor (Turn 90°)</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase flex items-center gap-3">
                                        <span>⚙️ ELSE Move Forward at {motorSpeedPct}% Speed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'python' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 italic flex items-center gap-2">
                                    <CommandLineIcon className="w-4 h-4" />
                                    <span>PYTHON 3 SCRIPT EDITOR</span>
                                </h4>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Read / Write</span>
                            </div>
                            <textarea
                                value={pythonCode}
                                onChange={e => setPythonCode(e.target.value)}
                                className="w-full h-80 bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed shadow-inner"
                            />
                        </div>
                    )}

                    {activeTab === 'export' && (
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">
                                🔌 HARDWARE FIRMWARE COMPILER
                            </h4>
                            <p className="text-xs font-bold text-slate-400 uppercase">
                                Export compiled firmware code directly to physical Micro:bit, Arduino Uno, or Python controllers:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {['MICROBIT', 'ARDUINO', 'PYTHON'].map((target) => (
                                    <button
                                        key={target}
                                        onClick={() => {
                                            const code = generateHardwareFirmware(target as any);
                                            navigator.clipboard?.writeText(code);
                                            alert(`✓ ${target} Firmware script copied to clipboard! Ready to upload to device.`);
                                        }}
                                        className="p-5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer border border-slate-800 hover:border-indigo-400 shadow-xl flex flex-col items-center gap-2 active:scale-95"
                                    >
                                        <span className="text-2xl">
                                            {target === 'MICROBIT' ? '📟' : target === 'ARDUINO' ? '⚡' : '🐍'}
                                        </span>
                                        <span>Export {target}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sensor Slider Controls */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            📡 SIMULATED ROBOT HARDWARE SENSORS
                        </h5>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs font-black text-slate-300 uppercase mb-1">
                                    <span>Ultrasonic Distance Sensor:</span>
                                    <span className="text-indigo-400">{ultrasonicDistanceCm} cm</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    value={ultrasonicDistanceCm}
                                    onChange={e => setUltrasonicDistanceCm(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-black text-slate-300 uppercase mb-1">
                                    <span>Motor PWM Speed:</span>
                                    <span className="text-emerald-400">{motorSpeedPct}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={motorSpeedPct}
                                    onChange={e => setMotorSpeedPct(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pane: 2D Continuous Arena Simulator */}
                <div className="lg:col-span-5 bg-slate-900 p-8 rounded-[3rem] border-4 border-indigo-500/30 shadow-2xl flex flex-col justify-between space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping"></span>
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">2D ROBOT SIMULATOR ARENA</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 uppercase">Sensors Active</span>
                    </div>

                    {/* Arena Graphic Display */}
                    <div className="w-full h-64 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center shadow-inner p-6">
                        {/* Track line */}
                        <div className="absolute inset-x-8 top-1/2 h-4 bg-slate-800/60 rounded-full"></div>

                        {/* Distance Wall Obstacle */}
                        <div
                            className="absolute right-8 top-12 bottom-12 w-6 bg-rose-600/40 border-2 border-rose-500 rounded-2xl flex items-center justify-center text-xs text-rose-300 font-black"
                            style={{ opacity: ultrasonicDistanceCm < 20 ? 1 : 0.4 }}
                        >
                            WALL
                        </div>

                        {/* Robot Graphic */}
                        <div className={`transition-all duration-700 flex flex-col items-center ${isSimulating ? 'scale-110' : ''}`}>
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-2xl border-2 border-indigo-300 relative">
                                <span className="text-3xl">🤖</span>
                                <span className="text-[9px] uppercase tracking-widest font-black text-amber-300">ROVER V2</span>

                                {/* Ultrasonic Ray beam */}
                                <div
                                    className="absolute -right-16 top-1/2 -translate-y-1/2 h-1 bg-cyan-400/80 rounded-full animate-pulse"
                                    style={{ width: `${Math.min(ultrasonicDistanceCm * 2, 80)}px` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Robot Status Display */}
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-black text-slate-300 uppercase tracking-wider text-center">
                        {robotStatus}
                    </div>

                    {/* Run Controls */}
                    <div className="flex gap-3">
                        <button
                            onClick={runSimulation}
                            disabled={isSimulating}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            <PlayIcon className="w-5 h-5 fill-current" />
                            <span>{isSimulating ? 'SIMULATING...' : '▶ RUN ROBOT SCRIPT'}</span>
                        </button>

                        <button
                            onClick={() => {
                                audioVoiceEngine.playSnapSound();
                                setRobotStatus('Simulator reset.');
                            }}
                            className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all cursor-pointer"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
