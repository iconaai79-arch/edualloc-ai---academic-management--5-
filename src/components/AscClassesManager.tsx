import React, { useState, useMemo, useEffect } from 'react';
import type { Course, Subject, Room, User, TimetableEntry, TimetableSettings, AllocationRequest } from '../types';
import type { AscLessonRow } from './AscSubjectsManager';
import { generatePeriodLabels } from '../utils/timeUtils';
import { apiService } from '../services/apiService';

interface AscClassPrefs {
    shortCode?: string;
    timeOff?: Record<string, boolean>; // `${dayIdx}_${pIdx}` -> true = blocked (red)
    allowArrival?: string;             // e.g. 'Any', 'Period 1', 'Period 2'
    maxPerDay?: number;
    homeRoomId?: string;
    classTeacherId?: string;
    divisions?: Array<{ id: string; name: string; groups: string[] }>;
}

interface FlatClassRow {
    rowKey: string;
    courseId: string;
    levelId: string;
    course: Course;
    levelName: string;
    fullName: string;
    defaultShort: string;
}

interface AscClassesManagerProps {
    institutionId: string;
    courses: Course[];
    subjects: Subject[];
    rooms: Room[];
    lecturers?: User[];
    timetableEntries?: TimetableEntry[];
    allocations?: AllocationRequest[];
    timetableSettings?: TimetableSettings;
    onAddCourse?: (courseData: any) => Promise<void> | void;
    onUpdateCourse?: (courseId: string, updatedData: any) => Promise<void> | void;
    onDeleteCourse?: (courseId: string) => Promise<void> | void;
    onSwitchTab?: (tab: 'cards' | 'subjects' | 'classes' | 'classrooms' | 'teachers' | 'relations') => void;
}

const deriveShortClass = (courseName: string, levelName?: string): string => {
    const c = (courseName || '').trim();
    const l = (levelName || '').trim();
    if (!l || l.toLowerCase() === c.toLowerCase()) {
        const m = c.match(/(\d+)\s*([A-Za-z])?/);
        if (m) return `${m[1]}${(m[2] || '').toUpperCase()}`;
        return c.slice(0, 4).toUpperCase();
    }
    const numMatch = c.match(/\d+/);
    const cleanStream = l.replace(new RegExp(`^${c}\\s*[-–]?\\s*`, 'i'), '').trim();
    if (numMatch && cleanStream.length <= 14) {
        return `${numMatch[0]}${cleanStream.length <= 3 ? cleanStream.toUpperCase() : cleanStream[0].toUpperCase()}`;
    }
    return cleanStream.slice(0, 5).toUpperCase() || c.slice(0, 4).toUpperCase();
};

export const AscClassesManager: React.FC<AscClassesManagerProps> = ({
    institutionId,
    courses,
    subjects,
    rooms,
    lecturers = [],
    timetableEntries = [],
    timetableSettings,
    onAddCourse,
    onUpdateCourse,
    onDeleteCourse,
    onSwitchTab,
}) => {
    const prefsKey = `eduai_asc_class_prefs_${institutionId || 'default'}`;
    const lessonsKey = `eduai_asc_lessons_${institutionId || 'default'}`;

    const [prefsMap, setPrefsMap] = useState<Record<string, AscClassPrefs>>(() => {
        try {
            const raw = localStorage.getItem(prefsKey);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {};
    });

    const [ascLessons, setAscLessons] = useState<AscLessonRow[]>(() => {
        try {
            const raw = localStorage.getItem(lessonsKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    });

    const [search, setSearch] = useState('');
    const [selectedRowKey, setSelectedRowKey] = useState<string>('');

    // Modals
    const [editModal, setEditModal] = useState<{ mode: 'new' | 'edit'; row?: FlatClassRow } | null>(null);
    const [formName, setFormName] = useState('');
    const [formShort, setFormShort] = useState('');
    const [formClassTeacherId, setFormClassTeacherId] = useState('');
    const [formHomeRoomId, setFormHomeRoomId] = useState('');
    const [formAllowArrival, setFormAllowArrival] = useState('');

    const [timeOffModalRow, setTimeOffModalRow] = useState<FlatClassRow | null>(null);
    const [lessonsModalRow, setLessonsModalRow] = useState<FlatClassRow | null>(null);
    const [constraintsModalRow, setConstraintsModalRow] = useState<FlatClassRow | null>(null);
    const [cMaxPerDay, setCMaxPerDay] = useState<number>(10);
    const [cAllowArrival, setCAllowArrival] = useState<string>('');
    const [cHomeRoomId, setCHomeRoomId] = useState<string>('');

    const [divisionsModalRow, setDivisionsModalRow] = useState<FlatClassRow | null>(null);
    const [newDivName, setNewDivName] = useState('');
    const [newDivGroups, setNewDivGroups] = useState('');

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<{ id: string; prefs: Record<string, AscClassPrefs> }>('asc_class_prefs', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0 && recs[0]?.prefs) {
                    setPrefsMap(recs[0].prefs);
                    try { localStorage.setItem(prefsKey, JSON.stringify(recs[0].prefs)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<AscLessonRow>('asc_subject_lessons', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) {
                    setAscLessons(recs);
                }
            })
            .catch(() => {});
    }, [institutionId, prefsKey]);

    const savePrefs = async (next: Record<string, AscClassPrefs>) => {
        setPrefsMap(next);
        try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch (_) {}
        await apiService.saveModuleRecord('asc_class_prefs', {
            id: `asc_cls_prefs_${institutionId}`,
            institutionId,
            prefs: next,
            updatedAt: new Date().toISOString(),
        }).catch(() => {});
    };

    const operatingDays = useMemo(() => {
        const d = timetableSettings?.operatingDays;
        return Array.isArray(d) && d.length > 0 ? d : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }, [timetableSettings]);

    const periodCount = useMemo(() => {
        try {
            const labels = generatePeriodLabels(timetableSettings!, false) || [];
            const nonBreak = labels.filter((p: any) => !p.isBreak);
            if (nonBreak.length > 0) return Math.min(12, nonBreak.length);
        } catch (_) {}
        return 10;
    }, [timetableSettings]);

    // Flatten courses & their levels/streams into aSc class rows
    const flatRows = useMemo<FlatClassRow[]>(() => {
        const list: FlatClassRow[] = [];
        (courses || []).forEach(course => {
            if (!course) return;
            const levels = Array.isArray(course.levels) && course.levels.length > 0 ? course.levels : [];
            if (levels.length === 0) {
                list.push({
                    rowKey: `${course.id}::${course.id}`,
                    courseId: course.id,
                    levelId: course.id,
                    course,
                    levelName: '',
                    fullName: course.name,
                    defaultShort: course.code || deriveShortClass(course.name),
                });
            } else {
                levels.forEach(lvl => {
                    if (!lvl) return;
                    const combined = lvl.name.toLowerCase().includes(course.name.toLowerCase())
                        ? lvl.name
                        : `${course.name} ${lvl.name}`.trim();
                    list.push({
                        rowKey: `${course.id}::${lvl.id}`,
                        courseId: course.id,
                        levelId: String(lvl.id),
                        course,
                        levelName: lvl.name,
                        fullName: combined,
                        defaultShort: deriveShortClass(course.name, lvl.name),
                    });
                });
            }
        });
        return list;
    }, [courses]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return flatRows.filter(r => {
            const short = prefsMap[r.rowKey]?.shortCode || r.defaultShort;
            return !q || `${r.fullName} ${short}`.toLowerCase().includes(q);
        });
    }, [flatRows, search, prefsMap]);

    useEffect(() => {
        if (!selectedRowKey && flatRows.length > 0) {
            setSelectedRowKey(flatRows[0].rowKey);
        }
    }, [flatRows, selectedRowKey]);

    const selectedRow = useMemo(
        () => flatRows.find(r => r.rowKey === selectedRowKey) || filteredRows[0] || null,
        [flatRows, selectedRowKey, filteredRows]
    );

    const getRowLessonCount = (row: FlatClassRow): number => {
        const short = (prefsMap[row.rowKey]?.shortCode || row.defaultShort).toUpperCase();
        const fromAsc = ascLessons
            .filter(l => l.levelId === row.levelId || l.courseId === row.courseId && l.classLabel.toUpperCase() === short)
            .reduce((s, l) => s + (Number(l.count) || 0) * (Number(l.length) || 1), 0);
        if (fromAsc > 0) return fromAsc;
        const placed = (timetableEntries || []).filter(e =>
            e && (String(e.levelId || '') === row.levelId || e.courseId === row.courseId)
        ).length;
        return placed;
    };

    const openNewModal = () => {
        setFormName('');
        setFormShort('');
        setFormClassTeacherId('');
        setFormHomeRoomId('');
        setFormAllowArrival('');
        setEditModal({ mode: 'new' });
    };

    const openEditModal = (row?: FlatClassRow | null) => {
        const target = row || selectedRow;
        if (!target) return;
        const p = prefsMap[target.rowKey] || {};
        setFormName(target.fullName);
        setFormShort(p.shortCode || target.defaultShort);
        setFormClassTeacherId(p.classTeacherId || '');
        setFormHomeRoomId(p.homeRoomId || '');
        setFormAllowArrival(p.allowArrival || '');
        setEditModal({ mode: 'edit', row: target });
    };

    const handleSaveClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;
        const cleanShort = formShort.trim().toUpperCase() || deriveShortClass(formName.trim());

        if (editModal?.mode === 'new') {
            if (onAddCourse) {
                await onAddCourse({
                    name: formName.trim(),
                    code: cleanShort,
                    institutionId,
                    levels: [{ id: `lvl_${Date.now()}`, name: formName.trim(), subjectIds: [] }],
                });
            }
        } else if (editModal?.row) {
            const target = editModal.row;
            if (onUpdateCourse) {
                if (target.levelId === target.courseId) {
                    await onUpdateCourse(target.courseId, { name: formName.trim(), code: cleanShort });
                } else {
                    const updatedLevels = (target.course.levels || []).map(l =>
                        String(l.id) === target.levelId ? { ...l, name: formName.trim() } : l
                    );
                    await onUpdateCourse(target.courseId, { levels: updatedLevels });
                }
            }
            await savePrefs({
                ...prefsMap,
                [target.rowKey]: {
                    ...(prefsMap[target.rowKey] || {}),
                    shortCode: cleanShort,
                    classTeacherId: formClassTeacherId || undefined,
                    homeRoomId: formHomeRoomId || undefined,
                    allowArrival: formAllowArrival.trim() || undefined,
                }
            });
        }
        setEditModal(null);
    };

    const handleRemoveSelected = async () => {
        if (!selectedRow) return;
        if (!window.confirm(`Remove class "${selectedRow.fullName}"?`)) return;
        if (selectedRow.levelId === selectedRow.courseId || (selectedRow.course.levels || []).length <= 1) {
            await onDeleteCourse?.(selectedRow.courseId);
        } else if (onUpdateCourse) {
            const remaining = (selectedRow.course.levels || []).filter(l => String(l.id) !== selectedRow.levelId);
            await onUpdateCourse(selectedRow.courseId, { levels: remaining });
        }
    };

    const toggleTimeOffCell = (rowKey: string, dayIdx: number, pIdx: number) => {
        const key = `${dayIdx}_${pIdx}`;
        const cur = prefsMap[rowKey] || {};
        const nextTimeOff = { ...(cur.timeOff || {}), [key]: !cur.timeOff?.[key] };
        savePrefs({ ...prefsMap, [rowKey]: { ...cur, timeOff: nextTimeOff } });
    };

    const toggleTimeOffRow = (rowKey: string, dayIdx: number) => {
        const cur = prefsMap[rowKey] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = Array.from({ length: periodCount }).every((_, pIdx) => Boolean(timeOff[`${dayIdx}_${pIdx}`]));
        for (let pIdx = 0; pIdx < periodCount; pIdx++) timeOff[`${dayIdx}_${pIdx}`] = !allBlocked;
        savePrefs({ ...prefsMap, [rowKey]: { ...cur, timeOff } });
    };

    const toggleTimeOffCol = (rowKey: string, pIdx: number) => {
        const cur = prefsMap[rowKey] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = operatingDays.every((_, dIdx) => Boolean(timeOff[`${dIdx}_${pIdx}`]));
        for (let dIdx = 0; dIdx < operatingDays.length; dIdx++) timeOff[`${dIdx}_${pIdx}`] = !allBlocked;
        savePrefs({ ...prefsMap, [rowKey]: { ...cur, timeOff } });
    };

    const openConstraints = () => {
        if (!selectedRow) return;
        const p = prefsMap[selectedRow.rowKey] || {};
        setCMaxPerDay(p.maxPerDay ?? 10);
        setCAllowArrival(p.allowArrival || '');
        setCHomeRoomId(p.homeRoomId || '');
        setConstraintsModalRow(selectedRow);
    };

    const handleSaveConstraints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!constraintsModalRow) return;
        await savePrefs({
            ...prefsMap,
            [constraintsModalRow.rowKey]: {
                ...(prefsMap[constraintsModalRow.rowKey] || {}),
                maxPerDay: cMaxPerDay,
                allowArrival: cAllowArrival.trim() || undefined,
                homeRoomId: cHomeRoomId || undefined,
            }
        });
        setConstraintsModalRow(null);
    };

    const handleAddDivision = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!divisionsModalRow || !newDivGroups.trim()) return;
        const groups = newDivGroups.split(/[,/]/).map(s => s.trim()).filter(Boolean);
        if (groups.length < 2) {
            alert('Enter at least 2 groups separated by comma or slash (e.g. HIS / GEO or AGR / HS / CS / BST).');
            return;
        }
        const cur = prefsMap[divisionsModalRow.rowKey] || {};
        const nextDivs = [
            ...(cur.divisions || []),
            { id: `div_${Date.now()}`, name: newDivName.trim() || `Division ${(cur.divisions?.length || 0) + 1}`, groups }
        ];
        await savePrefs({ ...prefsMap, [divisionsModalRow.rowKey]: { ...cur, divisions: nextDivs } });
        setNewDivName('');
        setNewDivGroups('');
    };

    const handleRemoveDivision = async (rowKey: string, divId: string) => {
        const cur = prefsMap[rowKey] || {};
        const nextDivs = (cur.divisions || []).filter(d => d.id !== divId);
        await savePrefs({ ...prefsMap, [rowKey]: { ...cur, divisions: nextDivs } });
    };

    const handleQuickImportStreams = async () => {
        if (!onAddCourse) return;
        if (!window.confirm('Import sample Kenyan school classes (Form 4 North, Central, South, East)?')) return;
        const samples = [
            { name: 'FORM FOUR NORTH', code: '4N' },
            { name: 'FORM FOUR CENTRAL', code: '4C' },
            { name: 'FORM FOUR SOUTH', code: '4S' },
            { name: 'FORM FOUR EAST', code: '4E' },
        ];
        for (const s of samples) {
            await onAddCourse({
                name: s.name,
                code: s.code,
                institutionId,
                levels: [{ id: `lvl_${Date.now()}_${s.code}`, name: s.name, subjectIds: [] }],
            });
        }
    };

    const renderMiniTimeOff = (row: FlatClassRow) => {
        const timeOff = prefsMap[row.rowKey]?.timeOff || {};
        return (
            <div
                onClick={e => {
                    e.stopPropagation();
                    setSelectedRowKey(row.rowKey);
                    setTimeOffModalRow(row);
                }}
                title="Click to edit Class Time-Off (Green = Allowed, Red = Blocked)"
                className="inline-grid border border-slate-700 bg-slate-800 p-[1px] gap-[1px] cursor-pointer hover:scale-105 transition-transform"
                style={{ gridTemplateColumns: `repeat(${Math.min(10, periodCount)}, 6px)` }}
            >
                {operatingDays.slice(0, 5).map((_, dIdx) =>
                    Array.from({ length: Math.min(10, periodCount) }).map((__, pIdx) => {
                        const blocked = Boolean(timeOff[`${dIdx}_${pIdx}`]);
                        return (
                            <span
                                key={`${dIdx}-${pIdx}`}
                                className={`block w-[6px] h-[4px] ${blocked ? 'bg-red-600' : 'bg-lime-500'}`}
                            />
                        );
                    })
                )}
            </div>
        );
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Title Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Classes ({filteredRows.length})
                    </span>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter classes by name or short code..."
                    className="w-64 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                />
            </div>

            {/* 3-Column aSc Workspace */}
            <div className="flex flex-col md:flex-row">
                {/* Left Vertical aSc Icon Rail */}
                <div className="flex md:flex-col items-center justify-center md:justify-start gap-2 p-2.5 bg-slate-200/70 dark:bg-slate-800/80 border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 md:w-20 shrink-0">
                    {[
                        { id: 'subjects', label: 'Subjects', icon: '📘', active: false },
                        { id: 'classes', label: 'Classes', icon: '👥', active: true },
                        { id: 'classrooms', label: 'Rooms', icon: '🚪', active: false },
                        { id: 'teachers', label: 'Teachers', icon: '🎓', active: false },
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => onSwitchTab?.(btn.id as any)}
                            className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase transition-all cursor-pointer ${
                                btn.active
                                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-900 border border-amber-600 shadow'
                                    : 'bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-white border border-transparent'
                            }`}
                        >
                            <span className="text-lg leading-none">{btn.icon}</span>
                            <span>{btn.label}</span>
                        </button>
                    ))}
                </div>

                {/* Center Classes Table */}
                <div className="flex-1 p-3 overflow-x-auto">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Enter classes :
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden min-h-[380px] max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs select-none">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                <tr>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700">Name</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-20">Short</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-16 text-right">Count</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-24 text-center">Time off</th>
                                    <th className="py-1.5 px-2.5 w-32">Allow arrival</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400">
                                            No classes added yet. Click <strong>+ New</strong> or <strong>Import</strong> below.
                                        </td>
                                    </tr>
                                ) : filteredRows.map((row, idx) => {
                                    const isSel = selectedRow?.rowKey === row.rowKey;
                                    const p = prefsMap[row.rowKey] || {};
                                    const short = p.shortCode || row.defaultShort;
                                    const count = getRowLessonCount(row);

                                    return (
                                        <tr
                                            key={row.rowKey}
                                            onClick={() => setSelectedRowKey(row.rowKey)}
                                            onDoubleClick={() => openEditModal(row)}
                                            className={`cursor-pointer transition-colors ${
                                                isSel
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : idx % 2 === 0
                                                        ? 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                                        : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                            }`}
                                        >
                                            <td className="py-1.5 px-2.5 flex items-center gap-2">
                                                <span className="text-sm leading-none">👥</span>
                                                <span className="uppercase tracking-tight truncate">{row.fullName}</span>
                                            </td>
                                            <td className="py-1.5 px-2.5 font-mono uppercase">{short}</td>
                                            <td className="py-1.5 px-2.5 text-right font-mono">{count}</td>
                                            <td className="py-1 px-2 text-center">{renderMiniTimeOff(row)}</td>
                                            <td className="py-1.5 px-2.5 text-[11px] truncate">{p.allowArrival || ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right aSc Action Button Stack */}
                <div className="w-full md:w-44 p-3 flex flex-row md:flex-col flex-wrap gap-2 bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                        type="button"
                        onClick={openNewModal}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-[11px]">+</span>
                        New
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRow}
                        onClick={() => openEditModal(selectedRow)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>👥</span> Edit
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRow}
                        onClick={handleRemoveSelected}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[11px]">−</span>
                        Remove
                    </button>

                    <div className="hidden md:block my-2 border-t border-slate-300 dark:border-slate-700" />

                    <button
                        type="button"
                        disabled={!selectedRow}
                        onClick={() => selectedRow && setLessonsModalRow(selectedRow)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>📚</span> Lessons
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRow}
                        onClick={() => selectedRow && setTimeOffModalRow(selectedRow)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🕒</span> Time off
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRow}
                        onClick={openConstraints}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="text-purple-600 font-black">#</span> Constraints
                    </button>

                    <div className="hidden md:block my-2 border-t border-slate-300 dark:border-slate-700" />

                    <button
                        type="button"
                        disabled={!selectedRow}
                        onClick={() => selectedRow && setDivisionsModalRow(selectedRow)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 border-2 border-blue-500 text-xs font-black text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🔀</span> Divisions
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="bg-slate-200/80 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => alert('Select any class to configure its Time Off (e.g. Friday afternoon), Lessons, Constraints, or Divisions (elective splits like HIS/GEO).')}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        ❓ Help
                    </button>
                    <button
                        type="button"
                        onClick={handleQuickImportStreams}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        📥 Import
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => onSwitchTab?.('cards')}
                    className="px-5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-black text-slate-800 dark:text-white shadow-sm cursor-pointer"
                >
                    Close
                </button>
            </div>

            {/* MODAL 1: NEW / EDIT CLASS */}
            {editModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveClass} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            {editModal.mode === 'new' ? 'New Class' : `Edit Class — ${editModal.row?.fullName}`}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Class Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. FORM FOUR NORTH"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Short *</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={8}
                                    value={formShort}
                                    onChange={e => setFormShort(e.target.value.toUpperCase())}
                                    placeholder="4N"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-black uppercase"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Class Teacher</label>
                                <select value={formClassTeacherId} onChange={e => setFormClassTeacherId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">None</option>
                                    {lecturers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Home Classroom</label>
                                <select value={formHomeRoomId} onChange={e => setFormHomeRoomId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">Default</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Allow Arrival</label>
                            <input
                                type="text"
                                value={formAllowArrival}
                                onChange={e => setFormAllowArrival(e.target.value)}
                                placeholder="e.g. Period 1 (leave blank for standard)"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase cursor-pointer">OK</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 2: LESSONS FOR CLASS */}
            {lessonsModalRow && (() => {
                const short = (prefsMap[lessonsModalRow.rowKey]?.shortCode || lessonsModalRow.defaultShort).toUpperCase();
                const classLessons = ascLessons.filter(
                    l => l.levelId === lessonsModalRow.levelId || (l.courseId === lessonsModalRow.courseId && l.classLabel.toUpperCase() === short)
                );
                return (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold">Lessons for class — {lessonsModalRow.fullName} ({short})</span>
                                <button type="button" onClick={() => setLessonsModalRow(null)} className="font-black text-sm px-2 cursor-pointer">×</button>
                            </div>
                            <div className="flex-1 bg-white dark:bg-slate-900 overflow-auto min-h-[260px]">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold">
                                        <tr>
                                            <th className="p-2.5">Subject</th>
                                            <th className="p-2.5">Teacher</th>
                                            <th className="p-2.5 text-center">Count</th>
                                            <th className="p-2.5 text-center">Length</th>
                                            <th className="p-2.5">Classroom</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {classLessons.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-10 text-center text-slate-400">
                                                    No lessons assigned to <strong>{lessonsModalRow.fullName}</strong> yet. Add lessons from the <strong>Subjects</strong> tab.
                                                </td>
                                            </tr>
                                        ) : classLessons.map(l => {
                                            const sub = subjects.find(s => s.id === l.subjectId);
                                            return (
                                                <tr key={l.id}>
                                                    <td className="p-2.5 font-bold uppercase">{sub?.name || l.subjectId}</td>
                                                    <td className="p-2.5">{l.teacherName}</td>
                                                    <td className="p-2.5 text-center font-mono">{l.count}</td>
                                                    <td className="p-2.5 text-center font-mono">{l.length}</td>
                                                    <td className="p-2.5">{l.classroomMode === 'home' ? '🏠 Home' : (l.roomName || 'Room')}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLessonsModalRow(null);
                                        onSwitchTab?.('subjects');
                                    }}
                                    className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer"
                                >
                                    Manage Lessons in Subjects →
                                </button>
                                <button type="button" onClick={() => setLessonsModalRow(null)} className="px-5 py-1.5 rounded border border-slate-400 bg-white dark:bg-slate-700 text-xs font-black cursor-pointer">Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL 3: CLASS TIME OFF GRID */}
            {timeOffModalRow && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-2xl shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                                    Time Off — {timeOffModalRow.fullName}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Click cells, days, or period numbers to toggle <span className="text-emerald-600 font-bold">Allowed (Green ✓)</span> vs <span className="text-rose-600 font-bold">Blocked (Red ×)</span>.
                                </p>
                            </div>
                            <button type="button" onClick={() => setTimeOffModalRow(null)} className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-black cursor-pointer">Done</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center text-xs select-none">
                                <thead>
                                    <tr>
                                        <th className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900">Day / Period</th>
                                        {Array.from({ length: periodCount }).map((_, pIdx) => (
                                            <th key={pIdx} onClick={() => toggleTimeOffCol(timeOffModalRow.rowKey, pIdx)} className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-100 cursor-pointer font-black">{pIdx + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {operatingDays.map((day, dIdx) => (
                                        <tr key={day}>
                                            <td onClick={() => toggleTimeOffRow(timeOffModalRow.rowKey, dIdx)} className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-left hover:bg-indigo-100 cursor-pointer">{day}</td>
                                            {Array.from({ length: periodCount }).map((_, pIdx) => {
                                                const blocked = Boolean(prefsMap[timeOffModalRow.rowKey]?.timeOff?.[`${dIdx}_${pIdx}`]);
                                                return (
                                                    <td
                                                        key={pIdx}
                                                        onClick={() => toggleTimeOffCell(timeOffModalRow.rowKey, dIdx, pIdx)}
                                                        className={`p-2 border border-slate-300 dark:border-slate-600 font-black cursor-pointer ${blocked ? 'bg-red-500 text-white' : 'bg-lime-500 text-slate-950'}`}
                                                    >
                                                        {blocked ? '✕' : '✓'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: CLASS CONSTRAINTS */}
            {constraintsModalRow && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveConstraints} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            Constraints — {constraintsModalRow.fullName}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Max Lessons Per Day</label>
                                <input type="number" min={1} max={12} value={cMaxPerDay} onChange={e => setCMaxPerDay(Math.max(1, Number(e.target.value) || 8))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Allow Arrival</label>
                                <input type="text" value={cAllowArrival} onChange={e => setCAllowArrival(e.target.value)} placeholder="e.g. Period 1" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Home Classroom</label>
                                <select value={cHomeRoomId} onChange={e => setCHomeRoomId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">Default</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setConstraintsModalRow(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase cursor-pointer">Save</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 5: DIVISIONS (ELECTIVE SPLITS) */}
            {divisionsModalRow && (() => {
                const divs = prefsMap[divisionsModalRow.rowKey]?.divisions || [];
                return (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-lg shadow-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                                        Divisions — {divisionsModalRow.fullName}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Split class into parallel elective groups (e.g. HIS / GEO, PHY / CRE, AGR / HS / CS / BST).
                                    </p>
                                </div>
                                <button type="button" onClick={() => setDivisionsModalRow(null)} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-black cursor-pointer">Close</button>
                            </div>

                            <form onSubmit={handleAddDivision} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    value={newDivName}
                                    onChange={e => setNewDivName(e.target.value)}
                                    placeholder="Division name (e.g. Humanities)"
                                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                                <input
                                    type="text"
                                    required
                                    value={newDivGroups}
                                    onChange={e => setNewDivGroups(e.target.value)}
                                    placeholder="Groups: HIS / GEO"
                                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold uppercase"
                                />
                                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase cursor-pointer">
                                    + Add Division
                                </button>
                            </form>

                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                {divs.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-6">No divisions defined for this class yet.</p>
                                ) : divs.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <div className="text-xs font-black text-slate-900 dark:text-white">{d.name}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {d.groups.map(g => (
                                                    <span key={g} className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">{g}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveDivision(divisionsModalRow.rowKey, d.id)} className="px-2.5 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-black uppercase cursor-pointer">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
