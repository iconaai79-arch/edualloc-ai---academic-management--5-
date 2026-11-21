import React, { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, User, Room, Course, TimetableSettings } from '../types';
import { generatePeriodLabels, timeToMinutes } from '../utils/timeUtils';
import { getInitials } from '../utils/stringUtils';

interface AscTimetableCardsDashboardProps {
    entries: TimetableEntry[];
    courses: Course[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    timetableSettings: TimetableSettings;
    institutionName?: string;
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    onMoveLesson?: (entryId: string, newDay: string, newStartTime: string) => void;
    onOpenWizard?: () => void;
    onOpenFullScheduler?: () => void;
}

// Vibrant aSc TimeTables-inspired high-contrast card colors
const ASC_PALETTE: Array<{ bg: string; border: string; text: string }> = [
    { bg: '#22c55e', border: '#15803d', text: '#052e16' }, // BIO green
    { bg: '#38bdf8', border: '#0284c7', text: '#082f49' }, // KIS / MAT sky
    { bg: '#f472b6', border: '#db2777', text: '#500724' }, // CHE pink
    { bg: '#e879f9', border: '#a21caf', text: '#4a044e' }, // MAT magenta
    { bg: '#facc15', border: '#ca8a04', text: '#422006' }, // ENG yellow
    { bg: '#a3e635', border: '#4d7c0f', text: '#1a2e05' }, // AGR lime
    { bg: '#fb923c', border: '#c2410c', text: '#431407' }, // CRE orange
    { bg: '#60a5fa', border: '#1d4ed8', text: '#172554' }, // HIS blue
    { bg: '#ef4444', border: '#b91c1c', text: '#ffffff' }, // RED accent
    { bg: '#a78bfa', border: '#6d28d9', text: '#2e1065' }, // PHY violet
    { bg: '#2dd4bf', border: '#0f766e', text: '#042f2e' }, // GEO teal
    { bg: '#991b1b', border: '#450a0a', text: '#fef2f2' }, // Deep maroon
    { bg: '#16a34a', border: '#14532d', text: '#ffffff' }, // Deep emerald
    { bg: '#4f46e5', border: '#312e81', text: '#eef2ff' }, // Deep indigo
    { bg: '#eab308', border: '#854d0e', text: '#1c1917' }, // Gold
    { bg: '#ec4899', border: '#9d174d', text: '#ffffff' }, // Hot pink
];

const hashKey = (str: string): number => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
};

const getAscColor = (key: string) => {
    const idx = hashKey((key || 'DEFAULT').toUpperCase()) % ASC_PALETTE.length;
    return ASC_PALETTE[idx];
};

const getShortSubjectCode = (subject?: Subject): string => {
    if (!subject) return 'SUB';
    if (subject.code && subject.code.trim().length > 0 && subject.code.trim().length <= 5) {
        return subject.code.trim().toUpperCase();
    }
    const clean = (subject.name || subject.code || 'SUB')
        .replace(/[^A-Za-z0-9 ]/g, ' ')
        .trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].slice(0, 3).toUpperCase();
    }
    const first = words[0];
    if (first.length >= 3) return first.slice(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
};

const getShortClassLabel = (courseName: string, levelName: string): string => {
    const c = (courseName || '').trim();
    const l = (levelName || '').trim();
    if (!c) return l || 'Class';
    if (!l || l.toLowerCase() === c.toLowerCase()) return c;
    // Compact Kenyan school style: "Form 4" + "North" -> "4N", "Grade 7" + "Blue" -> "7B"
    const numMatch = c.match(/\d+/);
    if (numMatch && l.length <= 12) {
        const cleanStream = l.replace(new RegExp(`^${c}\\s*[-–]?\\s*`, 'i'), '').trim();
        if (cleanStream.length <= 3) return `${numMatch[0]}${cleanStream.toUpperCase()}`;
        return `${numMatch[0]}${cleanStream[0].toUpperCase()}`;
    }
    return l.length <= 10 ? l : `${c.slice(0, 4)} ${l.slice(0, 4)}`;
};

export const AscTimetableCardsDashboard: React.FC<AscTimetableCardsDashboardProps> = ({
    entries,
    courses,
    subjects,
    lecturers,
    rooms,
    timetableSettings,
    institutionName,
    getSubjectById,
    getLecturerById,
    getRoomById,
    onMoveLesson,
    onOpenWizard,
    onOpenFullScheduler,
}) => {
    const [colorBy, setColorBy] = useState<'subject' | 'teacher'>('subject');
    const [filterCourseId, setFilterCourseId] = useState<string>('all');
    const [filterTeacherId, setFilterTeacherId] = useState<string>('all');
    const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
    const [showTeacherInitials, setShowTeacherInitials] = useState<boolean>(false);
    const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
    const [highlightedSubjectId, setHighlightedSubjectId] = useState<string | null>(null);
    const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
    const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);

    const operatingDays = useMemo(() => {
        const days = timetableSettings?.operatingDays;
        return Array.isArray(days) && days.length > 0
            ? days
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }, [timetableSettings]);

    // Extract teaching periods only (numbered 1..N just like aSc)
    const teachingPeriods = useMemo(() => {
        try {
            const labels = generatePeriodLabels(timetableSettings, false) || [];
            const nonBreak = labels.filter((p: any) => !p.isBreak);
            if (nonBreak.length > 0) {
                return nonBreak.map((p: any, idx: number) => ({
                    index: idx + 1,
                    startTime: p.startTime,
                    endTime: p.endTime,
                    label: String(idx + 1),
                    startMinutes: timeToMinutes(p.startTime),
                    endMinutes: timeToMinutes(p.endTime),
                }));
            }
        } catch (_) {}
        // Sensible default 8 periods if settings missing
        const fallbackStarts = ['08:00', '08:40', '09:20', '10:20', '11:00', '11:40', '14:00', '14:40'];
        return fallbackStarts.map((st, idx) => ({
            index: idx + 1,
            startTime: st,
            endTime: st,
            label: String(idx + 1),
            startMinutes: timeToMinutes(st),
            endMinutes: timeToMinutes(st) + 40,
        }));
    }, [timetableSettings]);

    // Flatten courses -> class/stream rows
    const classRows = useMemo(() => {
        const rows: Array<{
            rowId: string;
            courseId: string;
            levelId: string;
            shortLabel: string;
            fullLabel: string;
        }> = [];
        (courses || []).forEach(course => {
            if (!course) return;
            if (filterCourseId !== 'all' && course.id !== filterCourseId) return;
            const levels = Array.isArray(course.levels) && course.levels.length > 0 ? course.levels : [];
            if (levels.length === 0) {
                rows.push({
                    rowId: course.id,
                    courseId: course.id,
                    levelId: course.id,
                    shortLabel: course.code || course.name.slice(0, 6),
                    fullLabel: course.name,
                });
            } else {
                levels.forEach(lvl => {
                    if (!lvl) return;
                    rows.push({
                        rowId: `${course.id}::${lvl.id}`,
                        courseId: course.id,
                        levelId: String(lvl.id),
                        shortLabel: getShortClassLabel(course.name, lvl.name),
                        fullLabel: `${course.name} — ${lvl.name}`,
                    });
                });
            }
        });
        return rows;
    }, [courses, filterCourseId]);

    // Index entries by (levelId/courseId, day, periodIndex)
    const cellEntriesMap = useMemo(() => {
        const map = new Map<string, TimetableEntry[]>();
        const safeEntries = entries || [];

        const matchPeriodIndex = (entry: TimetableEntry): number[] => {
            const entryStart = timeToMinutes(entry.startTime);
            const entryEnd = entry.endTime ? timeToMinutes(entry.endTime) : entryStart + 40;
            const matched: number[] = [];
            teachingPeriods.forEach((p, idx) => {
                if (p.startTime === entry.startTime) {
                    matched.push(idx);
                } else if (entryStart < p.endMinutes && entryEnd > p.startMinutes) {
                    matched.push(idx);
                }
            });
            return matched.length > 0 ? matched : [0];
        };

        safeEntries.forEach(entry => {
            if (!entry) return;
            const pIndices = matchPeriodIndex(entry);
            const targetLevelId = String(entry.levelId || entry.courseId || '');
            pIndices.forEach(pIdx => {
                const key = `${targetLevelId}__${entry.day}__${pIdx}`;
                const list = map.get(key) || [];
                if (!list.some(e => e.id === entry.id)) {
                    list.push(entry);
                    map.set(key, list);
                }
            });
        });

        return map;
    }, [entries, teachingPeriods]);

    // Unique subjects present in the timetable for legend strip
    const legendSubjects = useMemo(() => {
        const seen = new Map<string, { id: string; code: string; name: string; count: number }>();
        (entries || []).forEach(e => {
            if (!e) return;
            const sub = getSubjectById(e.subjectId);
            const code = getShortSubjectCode(sub);
            const existing = seen.get(e.subjectId);
            if (existing) {
                existing.count += 1;
            } else {
                seen.set(e.subjectId, {
                    id: e.subjectId,
                    code,
                    name: sub?.name || code,
                    count: 1,
                });
            }
        });
        return Array.from(seen.values()).sort((a, b) => b.count - a.count);
    }, [entries, getSubjectById]);

    const handlePrintMasterBoard = () => {
        window.print();
    };

    const getEntryColor = (entry: TimetableEntry) => {
        if (colorBy === 'teacher') {
            return getAscColor(entry.lecturerId || 'T');
        }
        const sub = getSubjectById(entry.subjectId);
        return getAscColor(getShortSubjectCode(sub));
    };

    const isEntryFilteredIn = (entry: TimetableEntry): boolean => {
        if (filterTeacherId !== 'all' && entry.lecturerId !== filterTeacherId) return false;
        if (filterSubjectId !== 'all' && entry.subjectId !== filterSubjectId) return false;
        if (highlightedSubjectId && entry.subjectId !== highlightedSubjectId) return false;
        return true;
    };

    return (
        <div className="space-y-4">
            {/* aSc-Style Control Ribbon */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                        aSc
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            Master Subject Cards Board
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                                {(entries || []).length} Cards Placed
                            </span>
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {institutionName || 'School'} • Click any subject card to highlight across all classes{onMoveLesson ? ' • Drag & drop cards to reschedule' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={filterCourseId}
                        onChange={e => setFilterCourseId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold"
                    >
                        <option value="all">All Classes ({classRows.length})</option>
                        {(courses || []).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterTeacherId}
                        onChange={e => setFilterTeacherId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold"
                    >
                        <option value="all">All Teachers</option>
                        {(lecturers || []).map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterSubjectId}
                        onChange={e => setFilterSubjectId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold"
                    >
                        <option value="all">All Subjects</option>
                        {(subjects || []).map(s => (
                            <option key={s.id} value={s.id}>{getShortSubjectCode(s)} — {s.name}</option>
                        ))}
                    </select>

                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setColorBy('subject')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer ${colorBy === 'subject' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                        >
                            Subject Color
                        </button>
                        <button
                            type="button"
                            onClick={() => setColorBy('teacher')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer ${colorBy === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                        >
                            Teacher Color
                        </button>
                    </div>

                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showTeacherInitials}
                            onChange={e => setShowTeacherInitials(e.target.checked)}
                            className="accent-indigo-600"
                        />
                        Teacher Initials
                    </label>

                    <button
                        type="button"
                        onClick={handlePrintMasterBoard}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                        Print Board
                    </button>

                    {onOpenWizard && (
                        <button
                            type="button"
                            onClick={onOpenWizard}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                            AI Generator
                        </button>
                    )}
                </div>
            </div>

            {/* Interactive Subject Cards Legend Strip */}
            {legendSubjects.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[9px] font-black uppercase text-slate-400 mr-1 shrink-0">Quick Highlight:</span>
                    {highlightedSubjectId && (
                        <button
                            type="button"
                            onClick={() => setHighlightedSubjectId(null)}
                            className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase shrink-0 cursor-pointer"
                        >
                            Clear ×
                        </button>
                    )}
                    {legendSubjects.map(item => {
                        const col = getAscColor(item.code);
                        const isSel = highlightedSubjectId === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setHighlightedSubjectId(isSel ? null : item.id)}
                                title={`${item.name} (${item.count} periods)`}
                                style={{
                                    backgroundColor: col.bg,
                                    color: col.text,
                                    borderColor: col.border,
                                }}
                                className={`px-2 py-0.5 rounded border text-[10px] font-black tracking-tight shrink-0 transition-transform cursor-pointer ${isSel ? 'ring-2 ring-slate-900 dark:ring-white scale-105' : 'opacity-90 hover:opacity-100'}`}
                            >
                                {item.code} <span className="opacity-75 font-bold">({item.count})</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Empty Timetable Prompt */}
            {(entries || []).length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase">No Timetable Cards Generated Yet</div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                            The aSc Master Grid below is ready for your {classRows.length} class(es). Run the AI Timetable Wizard to automatically place all subject cards without clashes.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {onOpenWizard && (
                            <button
                                type="button"
                                onClick={onOpenWizard}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer"
                            >
                                Launch Timetable Wizard →
                            </button>
                        )}
                        {onOpenFullScheduler && (
                            <button
                                type="button"
                                onClick={onOpenFullScheduler}
                                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-black uppercase cursor-pointer"
                            >
                                Open Lesson Scheduler
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Authentic aSc Master Subject Cards Matrix */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-400 dark:border-slate-600 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse table-fixed select-none" style={{ minWidth: `${76 + operatingDays.length * teachingPeriods.length * 46}px` }}>
                        <thead>
                            {/* Day Group Row */}
                            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                <th
                                    rowSpan={2}
                                    className="sticky left-0 z-20 w-[72px] bg-slate-300 dark:bg-slate-800 border-r-2 border-b-2 border-slate-500 dark:border-slate-600 text-[10px] font-black uppercase text-center p-1"
                                >
                                    Class
                                </th>
                                {operatingDays.map((day, dIdx) => (
                                    <th
                                        key={day}
                                        colSpan={teachingPeriods.length}
                                        className={`border-b border-slate-400 dark:border-slate-600 py-1 text-[11px] font-black tracking-wide text-center ${dIdx < operatingDays.length - 1 ? 'border-r-2 border-r-slate-600 dark:border-r-slate-500' : ''}`}
                                    >
                                        {day}
                                    </th>
                                ))}
                            </tr>
                            {/* Period Number Row (1..N per day) */}
                            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                                {operatingDays.map((day, dIdx) =>
                                    teachingPeriods.map((period, pIdx) => (
                                        <th
                                            key={`${day}-p-${pIdx}`}
                                            title={`${day} Period ${period.label} (${period.startTime} - ${period.endTime})`}
                                            className={`w-[46px] py-0.5 text-[10px] font-bold text-center border-b-2 border-b-slate-500 dark:border-b-slate-600 border-r border-r-slate-300 dark:border-r-slate-700 ${
                                                pIdx === teachingPeriods.length - 1 && dIdx < operatingDays.length - 1
                                                    ? 'border-r-2 border-r-slate-600 dark:border-r-slate-500'
                                                    : ''
                                            }`}
                                        >
                                            {period.label}
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {classRows.length === 0 ? (
                                <tr>
                                    <td colSpan={1 + operatingDays.length * teachingPeriods.length} className="p-10 text-center text-xs text-slate-400 font-bold">
                                        No classes / streams configured yet. Add classes under Courses / Registry to display them on the aSc Master Board.
                                    </td>
                                </tr>
                            ) : (
                                classRows.map((row) => (
                                    <tr key={row.rowId} className="border-b border-slate-400 dark:border-slate-700">
                                        {/* Sticky Class Label */}
                                        <td
                                            title={row.fullLabel}
                                            className="sticky left-0 z-10 bg-slate-200 dark:bg-slate-800 border-r-2 border-r-slate-500 dark:border-r-slate-600 text-center font-black text-xs text-slate-900 dark:text-white px-1 py-2 whitespace-nowrap"
                                        >
                                            {row.shortLabel}
                                        </td>

                                        {/* Mon..Fri × Periods Subject Cards */}
                                        {operatingDays.map((day, dIdx) =>
                                            teachingPeriods.map((period, pIdx) => {
                                                const cellKey = `${row.levelId}__${day}__${pIdx}`;
                                                const fallbackCourseKey = `${row.courseId}__${day}__${pIdx}`;
                                                const slotEntries = cellEntriesMap.get(cellKey) || (row.levelId !== row.courseId ? cellEntriesMap.get(fallbackCourseKey) : undefined) || [];
                                                const isDayEnd = pIdx === teachingPeriods.length - 1 && dIdx < operatingDays.length - 1;
                                                const isHovered = hoveredCellKey === cellKey;

                                                return (
                                                    <td
                                                        key={cellKey}
                                                        onDragOver={e => {
                                                            if (!onMoveLesson) return;
                                                            e.preventDefault();
                                                            if (hoveredCellKey !== cellKey) setHoveredCellKey(cellKey);
                                                        }}
                                                        onDragLeave={() => {
                                                            if (hoveredCellKey === cellKey) setHoveredCellKey(null);
                                                        }}
                                                        onDrop={e => {
                                                            if (!onMoveLesson) return;
                                                            e.preventDefault();
                                                            const entryId = e.dataTransfer.getData('text/plain') || draggedEntryId;
                                                            setHoveredCellKey(null);
                                                            setDraggedEntryId(null);
                                                            if (entryId) {
                                                                onMoveLesson(entryId, day, period.startTime);
                                                            }
                                                        }}
                                                        className={`p-0 align-middle h-[44px] border-r border-r-slate-300 dark:border-r-slate-700 relative ${
                                                            isDayEnd ? 'border-r-2 border-r-slate-600 dark:border-r-slate-500' : ''
                                                        } ${isHovered ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'bg-slate-50 dark:bg-slate-900/60'}`}
                                                    >
                                                        {slotEntries.length === 0 ? (
                                                            <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 font-bold">
                                                                ×
                                                            </div>
                                                        ) : slotEntries.length === 1 ? (() => {
                                                            const entry = slotEntries[0];
                                                            const sub = getSubjectById(entry.subjectId);
                                                            const lec = getLecturerById(entry.lecturerId);
                                                            const rm = getRoomById(entry.roomId);
                                                            const code = getShortSubjectCode(sub);
                                                            const col = getAscColor(colorBy === 'teacher' ? (entry.lecturerId || 'T') : code);
                                                            const active = isEntryFilteredIn(entry);
                                                            const isSelected = selectedEntry?.id === entry.id;

                                                            return (
                                                                <div
                                                                    draggable={!!onMoveLesson}
                                                                    onDragStart={e => {
                                                                        if (!onMoveLesson) return;
                                                                        setDraggedEntryId(entry.id);
                                                                        e.dataTransfer.setData('text/plain', entry.id);
                                                                    }}
                                                                    onClick={() => {
                                                                        setSelectedEntry(entry);
                                                                        setHighlightedSubjectId(prev => prev === entry.subjectId ? null : entry.subjectId);
                                                                    }}
                                                                    title={`${sub?.name || code}\nTeacher: ${lec?.name || 'TBA'}\nRoom: ${rm?.name || 'Default'}\n${day} P${period.label} (${period.startTime})`}
                                                                    style={{
                                                                        backgroundColor: col.bg,
                                                                        color: col.text,
                                                                        borderColor: col.border,
                                                                    }}
                                                                    className={`w-full h-full flex flex-col items-center justify-center border shadow-inner cursor-pointer transition-all leading-none px-0.5 ${
                                                                        active ? 'opacity-100' : 'opacity-20 grayscale'
                                                                    } ${isSelected ? 'ring-2 ring-inset ring-black dark:ring-white' : ''}`}
                                                                >
                                                                    <span className="text-[11px] font-black tracking-tight">{code}</span>
                                                                    {showTeacherInitials && lec && (
                                                                        <span className="text-[8px] font-bold opacity-85 mt-0.5">{getInitials(lec.name)}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })() : slotEntries.length === 2 ? (() => {
                                                            // Authentic aSc Diagonal Split Card for 2 elective/split subjects (e.g. HIS / GEO or PHY / CRE)
                                                            const e1 = slotEntries[0];
                                                            const e2 = slotEntries[1];
                                                            const s1 = getSubjectById(e1.subjectId);
                                                            const s2 = getSubjectById(e2.subjectId);
                                                            const c1 = getShortSubjectCode(s1);
                                                            const c2 = getShortSubjectCode(s2);
                                                            const col1 = getEntryColor(e1);
                                                            const col2 = getEntryColor(e2);
                                                            const active = isEntryFilteredIn(e1) || isEntryFilteredIn(e2);

                                                            return (
                                                                <div
                                                                    onClick={() => setSelectedEntry(e1)}
                                                                    title={`Split / Electives:\n1) ${s1?.name || c1} (${getLecturerById(e1.lecturerId)?.name || 'TBA'})\n2) ${s2?.name || c2} (${getLecturerById(e2.lecturerId)?.name || 'TBA'})`}
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${col1.bg} 49%, #1e293b 49%, #1e293b 51%, ${col2.bg} 51%)`,
                                                                    }}
                                                                    className={`w-full h-full relative cursor-pointer border border-slate-700/40 ${active ? 'opacity-100' : 'opacity-20 grayscale'}`}
                                                                >
                                                                    <span
                                                                        style={{ color: col1.text }}
                                                                        className="absolute top-0.5 left-1 text-[8px] font-black leading-none"
                                                                    >
                                                                        {c1}
                                                                    </span>
                                                                    <span
                                                                        style={{ color: col2.text }}
                                                                        className="absolute bottom-0.5 right-1 text-[8px] font-black leading-none"
                                                                    >
                                                                        {c2}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })() : (
                                                            // Authentic aSc Multi-Band Stacked Card for 3+ electives (e.g. AGR / HS / CS / BST)
                                                            <div className="w-full h-full flex flex-col">
                                                                {slotEntries.slice(0, 4).map(entry => {
                                                                    const sub = getSubjectById(entry.subjectId);
                                                                    const code = getShortSubjectCode(sub);
                                                                    const col = getEntryColor(entry);
                                                                    const active = isEntryFilteredIn(entry);
                                                                    return (
                                                                        <div
                                                                            key={entry.id}
                                                                            onClick={() => setSelectedEntry(entry)}
                                                                            title={`${sub?.name || code} — ${getLecturerById(entry.lecturerId)?.name || 'TBA'}`}
                                                                            style={{ backgroundColor: col.bg, color: col.text }}
                                                                            className={`flex-1 flex items-center justify-center text-[7px] font-black leading-none border-b border-black/15 last:border-b-0 cursor-pointer ${active ? 'opacity-100' : 'opacity-25'}`}
                                                                        >
                                                                            {code}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Selected Card Inspector Strip */}
            {selectedEntry && (() => {
                const sub = getSubjectById(selectedEntry.subjectId);
                const lec = getLecturerById(selectedEntry.lecturerId);
                const rm = getRoomById(selectedEntry.roomId);
                const col = getEntryColor(selectedEntry);
                return (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: col.bg, color: col.text, borderColor: col.border }}
                                className="w-12 h-10 rounded-xl border-2 flex items-center justify-center font-black text-xs shadow"
                            >
                                {getShortSubjectCode(sub)}
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-wide">{sub?.name || selectedEntry.subjectId}</div>
                                <div className="text-[11px] text-slate-300">
                                    Teacher: <strong className="text-white">{lec?.name || 'Unassigned'}</strong> • Room: <strong className="text-white">{rm?.name || 'Class Room'}</strong> • {selectedEntry.day} ({selectedEntry.startTime} – {selectedEntry.endTime})
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {lec && (
                                <button
                                    type="button"
                                    onClick={() => setFilterTeacherId(prev => prev === lec.id ? 'all' : lec.id)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase cursor-pointer"
                                >
                                    {filterTeacherId === lec.id ? 'Show All Teachers' : `Filter ${lec.name.split(' ')[0]}'s Cards`}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedEntry(null);
                                    setHighlightedSubjectId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
