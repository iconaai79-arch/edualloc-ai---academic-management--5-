import React, { useState, useMemo } from 'react';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course } from '../../types';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { ArrowTrendingUpIcon } from '../icons/ArrowTrendingUpIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

export interface Futuristic3DExamAnalyticsDashboardProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    subjects?: Subject[];
    courses?: Course[];
    currentInstitution?: Institution | null;
    onNavigateToReports?: () => void;
}

export const Futuristic3DExamAnalyticsDashboard: React.FC<Futuristic3DExamAnalyticsDashboardProps> = ({
    assessments = [],
    marks = [],
    students = [],
    subjects = [],
    courses = [],
    currentInstitution,
    onNavigateToReports
}) => {
    const schoolName = currentInstitution?.name || 'Academic Institution';

    // ── DYNAMIC EXAM TITLES FROM ASSESSMENTS OR INSTITUTION ──
    const availableExamOptions = useMemo(() => {
        if (assessments && assessments.length > 0) {
            return assessments.map(a => (a as any).name || a.title || 'Assessment').filter(Boolean);
        }
        return [
            'END OF TERM TWO EXAMS 2026 (TERM 2 2026)',
            `${schoolName.toUpperCase()} MID TERM BREAK EXAMS`,
            'END OF MAY EXAMS 2026'
        ];
    }, [assessments, schoolName]);

    const [selectedExamTitle, setSelectedExamTitle] = useState(() => availableExamOptions[0] || 'RECENT EXAM EVALUATION');
    const [hoveredPoint, setHoveredPoint] = useState<{ series: string; label: string; val: number } | null>(null);
    const [hoveredGrade, setHoveredGrade] = useState<{ grade: string; count: number } | null>(null);
    const [viewMode, setViewMode] = useState<'3d_isometric' | 'cyber_glow'>('3d_isometric');

    // ── DATA FOR CHART 1: LAST 3 EXAMS CLASS MEAN SCORES ──
    const seriesData = useMemo(() => {
        const examNames = assessments && assessments.length >= 3
            ? assessments.slice(-3).map(a => (a as any).name || a.title)
            : [];

        const series1Name = examNames[0] || 'END OF MAY EXAMS';
        const series2Name = examNames[1] || `${schoolName.toUpperCase()} MID TERM BREAK EXAMS`;
        const series3Name = examNames[2] || 'END OF TERM TWO EXAMS 2026';

        return [
            {
                name: series1Name,
                color: '#3b82f6', // Cyan/Blue
                glowColor: 'rgba(59, 130, 246, 0.4)',
                points: [
                    { label: 'Form 3', val: 39 },
                    { label: 'Form 4', val: 30 },
                    { label: 'GRADE 10', val: -1 }
                ]
            },
            {
                name: series2Name,
                color: '#ef4444', // Red/Crimson
                glowColor: 'rgba(239, 68, 68, 0.4)',
                points: [
                    { label: 'Form 3', val: 40 },
                    { label: 'Form 4', val: 34 },
                    { label: 'GRADE 10', val: 48 }
                ]
            },
            {
                name: series3Name,
                color: '#10b981', // Emerald Green
                glowColor: 'rgba(16, 185, 129, 0.4)',
                points: [
                    { label: 'Form 3', val: 38 },
                    { label: 'Form 4', val: 33 },
                    { label: 'GRADE 10', val: 38 }
                ]
            }
        ];
    }, [assessments, schoolName]);

    // ── DATA FOR CHART 2: SHARE OF STUDENTS BY IMPROVEMENT RANGE ──
    const improvementRanges = useMemo(() => [
        { range: '0-19%', students: 3, percent: 60, color: '#3b82f6', gradient: 'from-blue-500 to-cyan-400' },
        { range: '20-39%', students: 2, percent: 40, color: '#ef4444', gradient: 'from-red-500 to-rose-400' },
        { range: '40-59%', students: 0, percent: 0, color: '#10b981', gradient: 'from-emerald-500 to-teal-400' },
        { range: 'Above 60%', students: 0, percent: 0, color: '#8b5cf6', gradient: 'from-purple-500 to-violet-400' }
    ], []);

    // ── DATA FOR CHART 3: STUDENTS PER GRADE ──
    const gradeDistribution = useMemo(() => [
        { grade: 'A', count: 0 },
        { grade: 'A-', count: 0 },
        { grade: 'B+', count: 0 },
        { grade: 'B', count: 2 },
        { grade: 'B-', count: 0 },
        { grade: 'C+', count: 7 },
        { grade: 'C', count: 3 },
        { grade: 'C-', count: 4 },
        { grade: 'D+', count: 6 },
        { grade: 'D', count: 6 },
        { grade: 'D-', count: 1 },
        { grade: 'E', count: 15 },
        { grade: 'EE1', count: 0 },
        { grade: 'EE2', count: 1 },
        { grade: 'ME1', count: 4 },
        { grade: 'ME2', count: 3 },
        { grade: 'AE1', count: 1 },
        { grade: 'AE2', count: 3 },
        { grade: 'BE1', count: 1 },
        { grade: 'BE2', count: 0 },
        { grade: 'X', count: 0 },
        { grade: 'Y', count: 0 },
        { grade: 'Z', count: 4 },
    ], []);

    const maxGradeCount = 25; // Axis height scale

    // Helper coordinates for line graph (-10 to 60 scale mapped into SVG 0..240 height)
    const mapY = (val: number) => {
        // Range: -10 = 230px, 60 = 20px
        const minVal = -10;
        const maxVal = 60;
        const h = 210;
        const pct = (val - minVal) / (maxVal - minVal);
        return Math.round(230 - pct * h);
    };

    const xCoords = [60, 200, 340]; // Positions for Form 3, Form 4, Grade 10

    return (
        <div className="space-y-6 my-6 text-left no-print">
            {/* ── TOP HEADER BANNER (3D FUTURISTIC CYBER TITLE) ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white border border-indigo-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                                3D Futuristic Analytics Engine • Live Academic Intelligence
                            </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                            <span>RECENT EXAM PERFORMANCE - </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-300">
                                {selectedExamTitle}
                            </span>
                        </h2>
                    </div>

                    {/* View Controls & Exam Selector */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedExamTitle}
                            onChange={(e) => setSelectedExamTitle(e.target.value)}
                            className="bg-slate-900/90 text-xs font-bold text-slate-200 border border-slate-700/80 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer max-w-xs truncate"
                        >
                            {availableExamOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => setViewMode(viewMode === '3d_isometric' ? 'cyber_glow' : '3d_isometric')}
                            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span>{viewMode === '3d_isometric' ? '3D Isometric Render' : 'Cyber Holographic'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── THREE 3D GRAPHICAL CARDS GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── CARD 1: LAST 3 EXAMS CLASS MEAN SCORES (3D RIBBON TREND GRAPH) ── */}
                <div className="lg:col-span-4 bg-slate-950/95 dark:bg-slate-950/95 rounded-[2.5rem] p-6 border border-slate-800/90 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div>
                        {/* Title */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                                <ArrowTrendingUpIcon className="w-4 h-4 text-cyan-400" />
                                LAST 3 EXAMS CLASS MEAN SCORES
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/50">
                                Mean Trend
                            </span>
                        </div>

                        {/* Interactive Series Legend */}
                        <div className="space-y-1.5 mb-6 text-[10px] font-bold">
                            {seriesData.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-md shrink-0 shadow-md" style={{ backgroundColor: s.color }} />
                                    <span className="text-slate-300 truncate uppercase tracking-tight">{s.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* 3D SVG Line Ribbon Canvas */}
                        <div className="relative w-full h-[260px] bg-slate-900/60 rounded-2xl p-2 border border-slate-800/80 shadow-inner flex items-center justify-center overflow-hidden">
                            {/* Ambient 3D Perspective Grid Lines */}
                            <svg className="w-full h-full" viewBox="0 0 400 260" preserveAspectRatio="none">
                                {/* Grid Y Lines & Labels */}
                                {[-10, 0, 10, 20, 30, 40, 50, 60].map((val) => {
                                    const y = mapY(val);
                                    return (
                                        <g key={val}>
                                            <line x1="40" y1={y} x2="380" y2={y} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.6" />
                                            <text x="32" y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end">{val}</text>
                                        </g>
                                    );
                                })}

                                {/* X-Axis Baseline */}
                                <line x1="40" y1={mapY(0)} x2="380" y2={mapY(0)} stroke="#475569" strokeWidth="1.5" />

                                {/* 3D Ribbons (Polylines + Drop Shadow Area) */}
                                {seriesData.map((s, sIdx) => {
                                    const pathD = s.points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${xCoords[pIdx]} ${mapY(pt.val)}`).join(' ');
                                    
                                    // Area fill path for 3D depth
                                    const areaD = `${pathD} L ${xCoords[s.points.length - 1]} 230 L ${xCoords[0]} 230 Z`;

                                    return (
                                        <g key={sIdx} className="transition-all duration-300">
                                            {/* 3D Shadow Projection */}
                                            <path d={areaD} fill={s.color} opacity="0.08" />

                                            {/* Glowing Ribbon Line */}
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke={s.color}
                                                strokeWidth="3.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                style={{ filter: `drop-shadow(0px 4px 10px ${s.glowColor})` }}
                                            />

                                            {/* 3D Interactive Point Nodes */}
                                            {s.points.map((pt, pIdx) => (
                                                <g key={pIdx} className="cursor-pointer group/node" onMouseEnter={() => setHoveredPoint({ series: s.name, label: pt.label, val: pt.val })} onMouseLeave={() => setHoveredPoint(null)}>
                                                    <circle
                                                        cx={xCoords[pIdx]}
                                                        cy={mapY(pt.val)}
                                                        r="5.5"
                                                        fill={s.color}
                                                        stroke="#090d16"
                                                        strokeWidth="2"
                                                        className="transition-transform group-hover/node:scale-150"
                                                    />
                                                    <circle
                                                        cx={xCoords[pIdx]}
                                                        cy={mapY(pt.val)}
                                                        r="9"
                                                        fill="none"
                                                        stroke={s.color}
                                                        strokeWidth="1.5"
                                                        opacity="0.35"
                                                    />
                                                </g>
                                            ))}
                                        </g>
                                    );
                                })}

                                {/* X-Axis Class Labels */}
                                <g transform="translate(0, 252)">
                                    <text x={xCoords[0]} fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Form 3</text>
                                    <text x={xCoords[1]} fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Form 4</text>
                                    <text x={xCoords[2]} fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">GRADE 10</text>
                                </g>
                            </svg>

                            {/* Node Tooltip Display */}
                            {hoveredPoint && (
                                <div className="absolute top-2 right-2 bg-slate-900/95 border border-cyan-500/50 text-white text-[10px] p-2 rounded-xl shadow-2xl backdrop-blur-md z-20">
                                    <p className="font-black text-cyan-400">{hoveredPoint.label}</p>
                                    <p className="font-semibold text-slate-300">{hoveredPoint.series}</p>
                                    <p className="font-black text-xs text-emerald-400 mt-0.5">Mean: {hoveredPoint.val}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* ── CARD 2: SHARE OF STUDENTS BY IMPROVEMENT RANGE (3D HOLOGRAPHIC DONUT + TABLE) ── */}
                <div className="lg:col-span-4 bg-slate-950/95 dark:bg-slate-950/95 rounded-[2.5rem] p-6 border border-slate-800/90 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div>
                        {/* Title */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                                <ChartPieIcon className="w-4 h-4 text-rose-400" />
                                SHARE OF STUDENTS BY IMPROVEMENT RANGE
                            </h3>
                        </div>

                        {/* 3D Cylindrical Holographic Donut Chart SVG */}
                        <div className="relative w-full h-[180px] flex items-center justify-center my-2" style={{ perspective: '600px' }}>
                            <svg className="w-48 h-48 drop-shadow-lg" viewBox="0 0 100 100" style={{ transform: 'rotateX(20deg)' }}>
                                {/* 0-19% (60% slice: Angle 0 -> 216deg) */}
                                <circle
                                    cx="50" cy="50" r="35"
                                    fill="transparent"
                                    stroke="#3b82f6"
                                    strokeWidth="16"
                                    strokeDasharray="131.9 220"
                                    strokeDashoffset="0"
                                    className="transition-all duration-700 hover:opacity-90"
                                />
                                {/* 20-39% (40% slice: Angle 216 -> 360deg) */}
                                <circle
                                    cx="50" cy="50" r="35"
                                    fill="transparent"
                                    stroke="#ef4444"
                                    strokeWidth="16"
                                    strokeDasharray="87.9 220"
                                    strokeDashoffset="-131.9"
                                    className="transition-all duration-700 hover:opacity-90"
                                />
                                {/* Center Holographic Glow Core */}
                                <circle cx="50" cy="50" r="24" fill="#090d16" stroke="#334155" strokeWidth="1" />
                            </svg>

                            {/* Center Donut Badge Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-white tracking-tighter">5</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Students</span>
                            </div>
                        </div>

                        {/* Legend Pills */}
                        <div className="grid grid-cols-2 gap-2 mb-4 text-[9px] font-bold">
                            {improvementRanges.map((r, rIdx) => (
                                <div key={rIdx} className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                                    <span className="text-slate-300 truncate">{r.range}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3D Cyber Data Table */}
                    <div className="border border-slate-800 rounded-2xl overflow-hidden text-[10px]">
                        <div className="grid grid-cols-5 bg-slate-900/90 text-slate-400 font-black py-1.5 px-2 border-b border-slate-800 text-center uppercase tracking-wider">
                            <span>Metric</span>
                            <span>0-19%</span>
                            <span>20-39%</span>
                            <span>40-59%</span>
                            <span>&gt; 60%</span>
                        </div>
                        <div className="grid grid-cols-5 bg-slate-950 py-1.5 px-2 text-center font-extrabold text-slate-200 border-b border-slate-900">
                            <span className="text-slate-400 font-bold text-left pl-1">Students</span>
                            <span>3</span>
                            <span>2</span>
                            <span>0</span>
                            <span>0</span>
                        </div>
                        <div className="grid grid-cols-5 bg-slate-900/40 py-1.5 px-2 text-center font-extrabold text-cyan-400">
                            <span className="text-slate-400 font-bold text-left pl-1">Percent</span>
                            <span>60%</span>
                            <span>40%</span>
                            <span>0%</span>
                            <span>0%</span>
                        </div>
                    </div>
                </div>


                {/* ── CARD 3: STUDENTS PER GRADE (3D EXTRUDED PRISM BARS) ── */}
                <div className="lg:col-span-4 bg-slate-950/95 dark:bg-slate-950/95 rounded-[2.5rem] p-6 border border-slate-800/90 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div>
                        {/* Title */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                                <BarChart3Icon className="w-4 h-4 text-emerald-400" />
                                STUDENTS PER GRADE
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                                Distribution
                            </span>
                        </div>

                        {/* 3D Extruded Pillars Bar Chart Container */}
                        <div className="relative w-full h-[240px] bg-slate-900/60 rounded-2xl p-2 border border-slate-800/80 shadow-inner flex flex-col justify-between overflow-x-auto custom-scrollbar-horizontal">
                            
                            {/* Y-Axis Grid Lines & Bars Area */}
                            <div className="relative flex-1 flex items-end justify-between px-2 pt-6 pb-2 min-w-[450px]">
                                
                                {/* Horizontal Grid Lines */}
                                {[25, 20, 15, 10, 5, 0].map((level) => {
                                    const yPct = ((25 - level) / 25) * 100;
                                    return (
                                        <div key={level} className="absolute left-0 right-0 border-b border-slate-800/60 pointer-events-none flex items-center justify-start pl-1" style={{ top: `${yPct}%` }}>
                                            <span className="text-[8px] font-bold text-slate-500">{level}</span>
                                        </div>
                                    );
                                })}

                                {/* 3D Isometric Extruded Pillar Bars */}
                                {gradeDistribution.map((item, idx) => {
                                    const heightPct = Math.min(100, (item.count / maxGradeCount) * 100);
                                    const hasCount = item.count > 0;

                                    return (
                                        <div
                                            key={idx}
                                            onMouseEnter={() => setHoveredGrade({ grade: item.grade, count: item.count })}
                                            onMouseLeave={() => setHoveredGrade(null)}
                                            className="relative flex flex-col items-center justify-end h-full z-10 group cursor-pointer px-0.5"
                                            style={{ width: `${100 / gradeDistribution.length}%` }}
                                        >
                                            {/* Count Badge on Hover or Peak */}
                                            {hasCount && (
                                                <span className="text-[8px] font-black text-cyan-300 bg-slate-900 border border-cyan-500/40 px-1 rounded -mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    {item.count}
                                                </span>
                                            )}

                                            {/* 3D Bar Column */}
                                            <div
                                                className={`w-full rounded-t-md transition-all duration-700 relative overflow-hidden ${
                                                    hasCount
                                                        ? 'bg-gradient-to-t from-blue-700 via-cyan-500 to-indigo-400 shadow-lg shadow-cyan-500/20 group-hover:brightness-125'
                                                        : 'bg-slate-800/40'
                                                }`}
                                                style={{ height: `${Math.max(4, heightPct)}%` }}
                                            >
                                                {/* Top Glowing 3D Prism Cap */}
                                                {hasCount && (
                                                    <div className="w-full h-1 bg-white/70 shadow-[0_0_8px_#38bdf8]" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* X-Axis Grade Labels */}
                            <div className="flex justify-between items-center min-w-[450px] px-2 pt-1 border-t border-slate-800 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                                {gradeDistribution.map((item, idx) => (
                                    <span key={idx} className="text-center block" style={{ width: `${100 / gradeDistribution.length}%` }}>
                                        {item.grade}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Hover Grade Details Box */}
                        {hoveredGrade && (
                            <div className="mt-2 p-2 bg-slate-900 border border-emerald-500/40 rounded-xl text-center text-xs font-black text-emerald-400 animate-fade-in">
                                Grade {hoveredGrade.grade}: {hoveredGrade.count} Students Achieved
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* ── BOTTOM CYBER HINT FOOTER CARD ── */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-300 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 font-black text-[10px] uppercase tracking-wider border border-amber-500/30">
                        💡 HINT
                    </span>
                    <span>
                        Go to the <strong className="text-white">'Reports'</strong> section to view this exam's complete analysis report containing multiple segments such as subject champions, grades distribution, most improved students etc.
                    </span>
                </div>

                <button
                    onClick={onNavigateToReports}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                    <span>Open Intelligence Reports</span>
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
