import React, { useMemo } from 'react';

export interface ProgressPeriodRecord {
    period: string;
    rank: number;
    pts: number;
    grade: string;
    classAvg?: number;
}

interface ModernStudentProgressGraphProps {
    records: ProgressPeriodRecord[];
    isPrintMode?: boolean;
    className?: string;
}

export const ModernStudentProgressGraph: React.FC<ModernStudentProgressGraphProps> = ({
    records,
    isPrintMode = false,
    className = ''
}) => {
    // Ensure records are ordered chronologically from oldest (left) to newest (right)
    const chronologicalData = useMemo(() => {
        if (!records || records.length === 0) return [];
        // If the first record has a higher term/form than the last, reverse it
        const copy = [...records];
        // Standard Kenyan report cards list newest on top of table; in graph X flows left-to-right
        return copy.reverse();
    }, [records]);

    // Graph Dimensions
    const width = 560;
    const height = 210;
    const paddingLeft = 46;
    const paddingRight = 36;
    const paddingTop = 36;
    const paddingBottom = 44;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const baseY = paddingTop + plotHeight;

    // Calculate Y-axis limits (Support 0-4 GPA scale or 0-12 Kenyan secondary scale)
    const { maxVal, minVal, yTicks } = useMemo(() => {
        if (chronologicalData.length === 0) {
            return { maxVal: 4, minVal: 0, yTicks: [0, 1, 2, 3, 4] };
        }
        const maxDataPt = Math.max(...chronologicalData.map(d => d.pts || 0), ...chronologicalData.map(d => d.classAvg || 0));
        
        if (maxDataPt <= 4.0) {
            return { maxVal: 4, minVal: 0, yTicks: [0, 1, 2, 3, 4] };
        } else if (maxDataPt <= 8.0) {
            return { maxVal: 8, minVal: 0, yTicks: [0, 2, 4, 6, 8] };
        } else {
            return { maxVal: 12, minVal: 0, yTicks: [0, 3, 6, 9, 12] };
        }
    }, [chronologicalData]);

    // Calculate Coordinates for Points
    const { studentPoints, classAvgPoints } = useMemo(() => {
        const n = chronologicalData.length;
        if (n === 0) return { studentPoints: [], classAvgPoints: [] };

        const studentPts = chronologicalData.map((d, i) => {
            const x = n === 1 ? paddingLeft + plotWidth / 2 : paddingLeft + (i / (n - 1)) * plotWidth;
            const normalizedY = (d.pts - minVal) / (maxVal - minVal);
            const y = baseY - normalizedY * plotHeight;
            return {
                x,
                y: Math.max(paddingTop, Math.min(baseY, y)),
                data: d,
                prevData: i > 0 ? chronologicalData[i - 1] : null
            };
        });

        const classPts = chronologicalData.map((d, i) => {
            const x = n === 1 ? paddingLeft + plotWidth / 2 : paddingLeft + (i / (n - 1)) * plotWidth;
            const avg = d.classAvg ?? (d.pts > 2 ? d.pts - 0.3 : d.pts + 0.2);
            const normalizedY = (avg - minVal) / (maxVal - minVal);
            const y = baseY - normalizedY * plotHeight;
            return {
                x,
                y: Math.max(paddingTop, Math.min(baseY, y)),
                val: avg
            };
        });

        return { studentPoints: studentPts, classAvgPoints: classPts };
    }, [chronologicalData, minVal, maxVal, plotWidth, plotHeight, baseY, paddingLeft, paddingTop]);

    // Build Cubic Bézier Spline Path
    const { studentPath, studentAreaPath, classAvgPath } = useMemo(() => {
        if (studentPoints.length === 0) return { studentPath: '', studentAreaPath: '', classAvgPath: '' };

        // Student Spline Curve
        let sPath = `M ${studentPoints[0].x} ${studentPoints[0].y}`;
        for (let i = 0; i < studentPoints.length - 1; i++) {
            const p0 = studentPoints[i];
            const p1 = studentPoints[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) * 0.45;
            const cp1y = p0.y;
            const cp2x = p1.x - (p1.x - p0.x) * 0.45;
            const cp2y = p1.y;
            sPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }

        // Closed Gradient Area
        const sArea = `${sPath} L ${studentPoints[studentPoints.length - 1].x} ${baseY} L ${studentPoints[0].x} ${baseY} Z`;

        // Class Average Spline Curve
        let cPath = `M ${classAvgPoints[0].x} ${classAvgPoints[0].y}`;
        for (let i = 0; i < classAvgPoints.length - 1; i++) {
            const p0 = classAvgPoints[i];
            const p1 = classAvgPoints[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) * 0.45;
            const cp1y = p0.y;
            const cp2x = p1.x - (p1.x - p0.x) * 0.45;
            const cp2y = p1.y;
            cPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }

        return { studentPath: sPath, studentAreaPath: sArea, classAvgPath: cPath };
    }, [studentPoints, classAvgPoints, baseY]);

    if (chronologicalData.length === 0) {
        return (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                No progress history available
            </div>
        );
    }

    // Dynamic gradient IDs to prevent SVG conflicts
    const gradId = `modernProgGrad_${Math.random().toString(36).slice(2, 7)}`;

    return (
        <div className={`relative w-full bg-slate-50/90 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col justify-between overflow-hidden shadow-2xs ${className}`}>
            {/* Header / Legend Strip */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs">📈</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Performance Trajectory
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        Mean Points Trend
                    </span>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-bold">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shadow-xs"></span>
                        <span>Student Points</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-4 h-0.5 border-b border-dashed border-slate-400 inline-block"></span>
                        <span>Stream Avg</span>
                    </div>
                </div>
            </div>

            {/* SVG Chart Engine */}
            <div className="w-full relative flex-1 pt-1">
                <svg
                    className="w-full h-full overflow-visible"
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {/* Luminous Modern Spline Gradient */}
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.40" />
                            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                        </linearGradient>

                        {/* Drop shadow for data badges */}
                        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                        </filter>
                    </defs>

                    {/* Background Grade Milestone Bands (Optional Subtle Fill) */}
                    {maxVal === 4 && (
                        <>
                            {/* Above 3.0: High Performance */}
                            <rect
                                x={paddingLeft}
                                y={paddingTop}
                                width={plotWidth}
                                height={plotHeight * 0.25}
                                fill="#10b981"
                                fillOpacity="0.04"
                            />
                            {/* 2.0 to 3.0: Standard Passing Band */}
                            <rect
                                x={paddingLeft}
                                y={paddingTop + plotHeight * 0.25}
                                width={plotWidth}
                                height={plotHeight * 0.25}
                                fill="#6366f1"
                                fillOpacity="0.03"
                            />
                        </>
                    )}

                    {/* Horizontal Gridlines & Y-Axis Labels */}
                    {yTicks.map(val => {
                        const normalizedY = (val - minVal) / (maxVal - minVal);
                        const y = baseY - normalizedY * plotHeight;
                        return (
                            <g key={val}>
                                <line
                                    x1={paddingLeft}
                                    y1={y}
                                    x2={paddingLeft + plotWidth}
                                    y2={y}
                                    stroke="#94a3b8"
                                    strokeOpacity={val === 0 ? "0.6" : "0.2"}
                                    strokeWidth={val === 0 ? "1.5" : "1"}
                                    strokeDasharray={val === 0 ? undefined : "3 4"}
                                />
                                <text
                                    x={paddingLeft - 8}
                                    y={y + 3.5}
                                    textAnchor="end"
                                    fontSize="9.5"
                                    fontWeight="bold"
                                    fill="#64748b"
                                    fontFamily="system-ui, -apple-system, sans-serif"
                                >
                                    {val}
                                </text>
                            </g>
                        );
                    })}

                    {/* Y-Axis Label ("Mean points" vertical text) */}
                    <text
                        transform={`rotate(-90 14 ${paddingTop + plotHeight / 2})`}
                        x="14"
                        y={paddingTop + plotHeight / 2}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="900"
                        letterSpacing="0.08em"
                        fill="#64748b"
                        className="uppercase"
                    >
                        Mean points
                    </text>

                    {/* Class Average Dashed Benchmark Spline */}
                    <path
                        d={classAvgPath}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeOpacity="0.75"
                    />

                    {/* Student Spline Gradient Area Fill */}
                    <path
                        d={studentAreaPath}
                        fill={`url(#${gradId})`}
                    />

                    {/* Student Main Spline Curve */}
                    <path
                        d={studentPath}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Interactive / Annotated Node Markers */}
                    {studentPoints.map((pt, i) => {
                        const ptVal = pt.data.pts || 0;
                        const prevVal = pt.prevData ? (pt.prevData.pts || 0) : null;
                        const delta = prevVal !== null ? ptVal - prevVal : null;
                        const isImprovement = delta !== null && delta >= 0;

                        return (
                            <g key={i}>
                                {/* Vertical Drop Guide to X-Axis */}
                                <line
                                    x1={pt.x}
                                    y1={pt.y}
                                    x2={pt.x}
                                    y2={baseY}
                                    stroke="#6366f1"
                                    strokeOpacity="0.18"
                                    strokeDasharray="2 3"
                                />

                                {/* Outer Glowing Ring */}
                                <circle
                                    cx={pt.x}
                                    y={pt.y}
                                    r="7"
                                    fill="#ffffff"
                                    stroke="#4f46e5"
                                    strokeWidth="2.5"
                                    filter="url(#badgeShadow)"
                                />

                                {/* Inner Solid Dot */}
                                <circle
                                    cx={pt.x}
                                    y={pt.y}
                                    r="3.5"
                                    fill="#4f46e5"
                                />

                                {/* Floating Data Score Pill (Score + Grade) */}
                                <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                                    <rect
                                        x="-26"
                                        y="-15"
                                        width="52"
                                        height="16"
                                        rx="8"
                                        fill="#0f172a"
                                        filter="url(#badgeShadow)"
                                    />
                                    <text
                                        x="0"
                                        y="-4"
                                        textAnchor="middle"
                                        fontSize="8.5"
                                        fontWeight="900"
                                        fill="#ffffff"
                                        fontFamily="monospace"
                                    >
                                        {ptVal.toFixed(2)} <tspan fill="#38bdf8" fontWeight="bold">{pt.data.grade}</tspan>
                                    </text>
                                </g>

                                {/* Trend Delta Micro-Pill (e.g. +0.48 ▲) */}
                                {delta !== null && (
                                    <g transform={`translate(${pt.x}, ${pt.y + 16})`}>
                                        <rect
                                            x="-20"
                                            y="-9"
                                            width="40"
                                            height="13"
                                            rx="4"
                                            fill={isImprovement ? '#ecfdf5' : '#fff1f2'}
                                            stroke={isImprovement ? '#10b981' : '#f43f5e'}
                                            strokeWidth="0.8"
                                        />
                                        <text
                                            x="0"
                                            y="1"
                                            textAnchor="middle"
                                            fontSize="7.5"
                                            fontWeight="900"
                                            fill={isImprovement ? '#059669' : '#e11d48'}
                                        >
                                            {isImprovement ? `+${delta.toFixed(2)} ▲` : `${delta.toFixed(2)} ▼`}
                                        </text>
                                    </g>
                                )}

                                {/* X-Axis Period Label (Form 1 Term 2, etc.) */}
                                <text
                                    x={pt.x}
                                    y={baseY + 16}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="800"
                                    fill="#334155"
                                    fontFamily="system-ui, -apple-system, sans-serif"
                                >
                                    {pt.data.period}
                                </text>

                                {/* X-Axis Rank Subtext (#78) */}
                                <text
                                    x={pt.x}
                                    y={baseY + 28}
                                    textAnchor="middle"
                                    fontSize="8"
                                    fontWeight="bold"
                                    fill="#d97706"
                                    fontFamily="monospace"
                                >
                                    Rank #{pt.data.rank}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};
