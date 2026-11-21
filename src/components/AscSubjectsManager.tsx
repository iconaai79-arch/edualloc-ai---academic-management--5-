import React, { useState, useMemo, useEffect } from 'react';
import type { Subject, Department, Room, Course, TimetableEntry, TimetableSettings, AllocationRequest } from '../types';
import { generatePeriodLabels } from '../utils/timeUtils';
import { apiService } from '../services/apiService';

interface AscSubjectPrefs {
    // key: `${dayIdx}_${periodIdx}` -> true means BLOCKED (red X), false/absent means ALLOWED (green check)
    timeOff?: Record<string, boolean>;
    distribution?: 'Ideal' | 'Spread' | 'Compact';
    homeRoomId?: string;
    maxPerDay?: number;
}

interface AscSubjectsManagerProps {
    institutionId: string;
    subjects: Subject[];
    departments: Department[];
    rooms: Room[];
    courses: Course[];
    timetableEntries?: TimetableEntry[];
    allocations?: AllocationRequest[];
    timetableSettings?: TimetableSettings;
    onAddSubject?: (subjectData: Omit<Subject, 'id' | 'institutionId'>, initialCourseLevelIds?: string[]) => void;
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onDeleteSubject?: (subjectId: string) => void;
    onSwitchTab?: (tab: 'cards' | 'subjects' | 'classes' | 'classrooms' | 'teachers' | 'relations') => void;
}

const STANDARD_KENYAN_SUBJECTS: Array<{ name: string; code: string; lessonsPerWeek: number; doubleLessons?: number }> = [
    { name: 'ENGLISH', code: 'ENG', lessonsPerWeek: 6 },
    { name: 'KISWAHILI', code: 'KIS', lessonsPerWeek: 5 },
    { name: 'MATHEMATICS', code: 'MAT', lessonsPerWeek: 6 },
    { name: 'BIOLOGY', code: 'BIO', lessonsPerWeek: 4, doubleLessons: 1 },
    { name: 'PHYSICS', code: 'PHY', lessonsPerWeek: 4, doubleLessons: 1 },
    { name: 'CHEMISTRY', code: 'CHE', lessonsPerWeek: 4, doubleLessons: 1 },
    { name: 'CRE', code: 'CRE', lessonsPerWeek: 3 },
    { name: 'GEOGRAPHY', code: 'GEO', lessonsPerWeek: 3 },
    { name: 'HISTORY', code: 'HIST', lessonsPerWeek: 3 },
    { name: 'AGRICULTURE', code: 'AGRI', lessonsPerWeek: 3 },
    { name: 'BUSINESS STUDIES', code: 'BST', lessonsPerWeek: 3 },
    { name: 'COMPUTER STUDIES', code: 'CS', lessonsPerWeek: 3, doubleLessons: 1 },
    { name: 'HOME SCIENCE', code: 'HS', lessonsPerWeek: 3, doubleLessons: 1 },
    { name: 'PHYSICAL EDUCATION', code: 'PE', lessonsPerWeek: 1 },
    { name: 'LIFE SKILLS', code: 'LS', lessonsPerWeek: 1 },
    { name: 'LIBRARY', code: 'LB', lessonsPerWeek: 1 },
    { name: 'MUSIC', code: 'MSC', lessonsPerWeek: 2 },
];

export const AscSubjectsManager: React.FC<AscSubjectsManagerProps> = ({
    institutionId,
    subjects,
    departments,
    rooms,
    courses,
    timetableEntries = [],
    allocations = [],
    timetableSettings,
    onAddSubject,
    onUpdateSubject,
    onDeleteSubject,
    onSwitchTab,
}) => {
    const prefsKey = `eduai_asc_subject_prefs_${institutionId || 'default'}`;
    const [prefsMap, setPrefsMap] = useState<Record<string, AscSubjectPrefs>>(() => {
        try {
            const raw = localStorage.getItem(prefsKey);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {};
    });

    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => subjects?.[0]?.id || '');
    const [search, setSearch] = useState('');

    // Modals
    const [editModal, setEditModal] = useState<{ mode: 'new' | 'edit'; subject?: Subject } | null>(null);
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formDeptId, setFormDeptId] = useState('');
    const [formDistribution, setFormDistribution] = useState<'Ideal' | 'Spread' | 'Compact'>('Ideal');
    const [formHomeRoomId, setFormHomeRoomId] = useState('');

    const [timeOffModalSubject, setTimeOffModalSubject] = useState<Subject | null>(null);
    const [lessonsModalSubject, setLessonsModalSubject] = useState<Subject | null>(null);
    const [singlesCount, setSinglesCount] = useState<number>(3);
    const [doublesCount, setDoublesCount] = useState<number>(0);
    const [triplesCount, setTriplesCount] = useState<number>(0);

    const [constraintsModalSubject, setConstraintsModalSubject] = useState<Subject | null>(null);
    const [constraintDist, setConstraintDist] = useState<'Ideal' | 'Spread' | 'Compact'>('Ideal');
    const [constraintMaxPerDay, setConstraintMaxPerDay] = useState<number>(2);
    const [constraintHomeRoom, setConstraintHomeRoom] = useState<string>('');

    useEffect(() => {
        if (!selectedSubjectId && subjects.length > 0) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [subjects, selectedSubjectId]);

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<{ id: string; prefs: Record<string, AscSubjectPrefs> }>('asc_subject_prefs', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0 && recs[0]?.prefs) {
                    setPrefsMap(recs[0].prefs);
                    try { localStorage.setItem(prefsKey, JSON.stringify(recs[0].prefs)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [institutionId, prefsKey]);

    const savePrefs = async (next: Record<string, AscSubjectPrefs>) => {
        setPrefsMap(next);
        try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch (_) {}
        await apiService.saveModuleRecord('asc_subject_prefs', {
            id: `asc_sub_prefs_${institutionId}`,
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

    // Compute lesson count per subject (placed timetable cards, or configured lessonStructure × linked classes)
    const subjectCountMap = useMemo(() => {
        const map = new Map<string, number>();
        (subjects || []).forEach(sub => {
            if (!sub) return;
            const placed = (timetableEntries || []).filter(e => e && e.subjectId === sub.id).length;
            if (placed > 0) {
                map.set(sub.id, placed);
                return;
            }
            const allocCount = (allocations || []).filter(a => a && a.subjectId === sub.id).length;
            const periodsPerClass = Array.isArray(sub.lessonStructure) && sub.lessonStructure.length > 0
                ? sub.lessonStructure.reduce((s, ls) => s + (Number(ls.count) || 0) * (Number(ls.periods) || 1), 0)
                : (Number((sub as any).hoursPerWeek) || 0);
            if (allocCount > 0 && periodsPerClass > 0) {
                map.set(sub.id, allocCount * periodsPerClass);
            } else {
                const linkedLevels = (courses || []).reduce((acc, c) =>
                    acc + (c?.levels || []).filter(l => (l?.subjectIds || []).includes(sub.id)).length, 0);
                map.set(sub.id, linkedLevels > 0 && periodsPerClass > 0 ? linkedLevels * periodsPerClass : periodsPerClass);
            }
        });
        return map;
    }, [subjects, timetableEntries, allocations, courses]);

    const filteredSubjects = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (subjects || []).filter(s =>
            s && (!q || `${s.name} ${s.code || ''}`.toLowerCase().includes(q))
        );
    }, [subjects, search]);

    const selectedSubject = useMemo(
        () => (subjects || []).find(s => s && s.id === selectedSubjectId) || filteredSubjects[0] || null,
        [subjects, selectedSubjectId, filteredSubjects]
    );

    const openNewModal = () => {
        setFormName('');
        setFormCode('');
        setFormDeptId(departments?.[0]?.id || '');
        setFormDistribution('Ideal');
        setFormHomeRoomId('');
        setEditModal({ mode: 'new' });
    };

    const openEditModal = (sub?: Subject | null) => {
        const target = sub || selectedSubject;
        if (!target) return;
        const p = prefsMap[target.id] || {};
        setFormName(target.name || '');
        setFormCode(target.code || '');
        setFormDeptId(target.departmentId || departments?.[0]?.id || '');
        setFormDistribution(p.distribution || 'Ideal');
        setFormHomeRoomId(p.homeRoomId || '');
        setEditModal({ mode: 'edit', subject: target });
    };

    const handleSaveSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;
        const shortCode = formCode.trim().toUpperCase() || formName.trim().slice(0, 3).toUpperCase();

        if (editModal?.mode === 'new') {
            onAddSubject?.({
                name: formName.trim(),
                code: shortCode,
                departmentId: formDeptId || departments?.[0]?.id || 'default',
                lessonStructure: [{ count: 4, periods: 1 }],
                hoursPerWeek: 4,
            } as any);
        } else if (editModal?.subject) {
            onUpdateSubject?.(editModal.subject.id, {
                name: formName.trim(),
                code: shortCode,
                departmentId: formDeptId || editModal.subject.departmentId,
            } as any);
            await savePrefs({
                ...prefsMap,
                [editModal.subject.id]: {
                    ...(prefsMap[editModal.subject.id] || {}),
                    distribution: formDistribution,
                    homeRoomId: formHomeRoomId || undefined,
                }
            });
        }
        setEditModal(null);
    };

    const handleRemoveSelected = () => {
        if (!selectedSubject || !onDeleteSubject) return;
        if (window.confirm(`Remove subject "${selectedSubject.name}" (${selectedSubject.code})?`)) {
            onDeleteSubject(selectedSubject.id);
        }
    };

    const openLessonsModal = () => {
        if (!selectedSubject) return;
        const ls = selectedSubject.lessonStructure || [];
        setSinglesCount(ls.find(x => x.periods === 1)?.count ?? 3);
        setDoublesCount(ls.find(x => x.periods === 2)?.count ?? 0);
        setTriplesCount(ls.find(x => x.periods === 3)?.count ?? 0);
        setLessonsModalSubject(selectedSubject);
    };

    const handleSaveLessons = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lessonsModalSubject || !onUpdateSubject) return;
        const nextStructure: Array<{ count: number; periods: number }> = [];
        if (singlesCount > 0) nextStructure.push({ count: singlesCount, periods: 1 });
        if (doublesCount > 0) nextStructure.push({ count: doublesCount, periods: 2 });
        if (triplesCount > 0) nextStructure.push({ count: triplesCount, periods: 3 });
        const totalHours = singlesCount + doublesCount * 2 + triplesCount * 3;
        onUpdateSubject(lessonsModalSubject.id, {
            lessonStructure: nextStructure.length > 0 ? nextStructure : [{ count: 1, periods: 1 }],
            hoursPerWeek: totalHours,
        } as any);
        setLessonsModalSubject(null);
    };

    const toggleTimeOffCell = (subjectId: string, dayIdx: number, pIdx: number) => {
        const key = `${dayIdx}_${pIdx}`;
        const cur = prefsMap[subjectId] || {};
        const nextTimeOff = { ...(cur.timeOff || {}), [key]: !cur.timeOff?.[key] };
        savePrefs({ ...prefsMap, [subjectId]: { ...cur, timeOff: nextTimeOff } });
    };

    const toggleTimeOffRow = (subjectId: string, dayIdx: number) => {
        const cur = prefsMap[subjectId] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = Array.from({ length: periodCount }).every((_, pIdx) => Boolean(timeOff[`${dayIdx}_${pIdx}`]));
        for (let pIdx = 0; pIdx < periodCount; pIdx++) {
            timeOff[`${dayIdx}_${pIdx}`] = !allBlocked;
        }
        savePrefs({ ...prefsMap, [subjectId]: { ...cur, timeOff } });
    };

    const toggleTimeOffCol = (subjectId: string, pIdx: number) => {
        const cur = prefsMap[subjectId] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = operatingDays.every((_, dIdx) => Boolean(timeOff[`${dIdx}_${pIdx}`]));
        for (let dIdx = 0; dIdx < operatingDays.length; dIdx++) {
            timeOff[`${dIdx}_${pIdx}`] = !allBlocked;
        }
        savePrefs({ ...prefsMap, [subjectId]: { ...cur, timeOff } });
    };

    const openConstraintsModal = () => {
        if (!selectedSubject) return;
        const p = prefsMap[selectedSubject.id] || {};
        setConstraintDist(p.distribution || 'Ideal');
        setConstraintMaxPerDay(p.maxPerDay ?? 2);
        setConstraintHomeRoom(p.homeRoomId || '');
        setConstraintsModalSubject(selectedSubject);
    };

    const handleSaveConstraints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!constraintsModalSubject) return;
        await savePrefs({
            ...prefsMap,
            [constraintsModalSubject.id]: {
                ...(prefsMap[constraintsModalSubject.id] || {}),
                distribution: constraintDist,
                maxPerDay: constraintMaxPerDay,
                homeRoomId: constraintHomeRoom || undefined,
            }
        });
        setConstraintsModalSubject(null);
    };

    const handleQuickImportKenyan = () => {
        if (!onAddSubject) return;
        const existingCodes = new Set((subjects || []).map(s => (s.code || s.name || '').trim().toUpperCase()));
        const toAdd = STANDARD_KENYAN_SUBJECTS.filter(s => !existingCodes.has(s.code) && !existingCodes.has(s.name));
        if (toAdd.length === 0) {
            alert('All standard subjects are already present.');
            return;
        }
        if (!window.confirm(`Import ${toAdd.length} standard Kenyan school subjects (ENG, KIS, MAT, BIO, PHY, CHE, etc.)?`)) return;
        toAdd.forEach(item => {
            const singles = Math.max(0, item.lessonsPerWeek - (item.doubleLessons || 0) * 2);
            const structure: Array<{ count: number; periods: number }> = [];
            if (singles > 0) structure.push({ count: singles, periods: 1 });
            if (item.doubleLessons) structure.push({ count: item.doubleLessons, periods: 2 });
            onAddSubject({
                name: item.name,
                code: item.code,
                departmentId: departments?.[0]?.id || 'default',
                lessonStructure: structure,
                hoursPerWeek: item.lessonsPerWeek,
            } as any);
        });
    };

    // Mini aSc green/red Time-Off thumbnail
    const renderMiniTimeOff = (subjectId: string) => {
        const timeOff = prefsMap[subjectId]?.timeOff || {};
        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    const s = subjects.find(x => x.id === subjectId);
                    if (s) {
                        setSelectedSubjectId(s.id);
                        setTimeOffModalSubject(s);
                    }
                }}
                title="Click to edit Subject Time-Off (Green = Allowed, Red = Blocked)"
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
            {/* Classic aSc Window Title Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Subjects ({filteredSubjects.length})
                    </span>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter subjects by name or short code..."
                    className="w-64 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                />
            </div>

            {/* 3-Column aSc Workspace: Left Icon Rail | Center Subjects Table | Right Action Buttons */}
            <div className="flex flex-col md:flex-row">
                {/* Left Vertical aSc Icon Rail */}
                <div className="flex md:flex-col items-center justify-center md:justify-start gap-2 p-2.5 bg-slate-200/70 dark:bg-slate-800/80 border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 md:w-20 shrink-0">
                    {[
                        { id: 'subjects', label: 'Subjects', icon: '📘', active: true },
                        { id: 'classes', label: 'Classes', icon: '👥', active: false },
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

                {/* Center Subjects Spreadsheet Table */}
                <div className="flex-1 p-3 overflow-x-auto">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Enter subjects :
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs select-none">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                <tr>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700">Name</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-20">Short</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-16 text-right">Count</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-24 text-center">Time off</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-24">Distribution</th>
                                    <th className="py-1.5 px-2.5 w-28">Home Room</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredSubjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-400">
                                            No subjects found. Click <strong>+ New</strong> or <strong>Import</strong> below to add subjects.
                                        </td>
                                    </tr>
                                ) : filteredSubjects.map((sub, idx) => {
                                    const isSelected = selectedSubject?.id === sub.id;
                                    const p = prefsMap[sub.id] || {};
                                    const homeRoom = rooms.find(r => r.id === p.homeRoomId);
                                    const count = subjectCountMap.get(sub.id) ?? 0;

                                    return (
                                        <tr
                                            key={sub.id}
                                            onClick={() => setSelectedSubjectId(sub.id)}
                                            onDoubleClick={() => openEditModal(sub)}
                                            className={`cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : idx % 2 === 0
                                                        ? 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                                        : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                            }`}
                                        >
                                            <td className="py-1.5 px-2.5 flex items-center gap-2">
                                                <span className="text-sm leading-none">📘</span>
                                                <span className="uppercase tracking-tight truncate">{sub.name}</span>
                                            </td>
                                            <td className="py-1.5 px-2.5 font-mono uppercase">{sub.code || sub.name.slice(0, 3).toUpperCase()}</td>
                                            <td className="py-1.5 px-2.5 text-right font-mono">{count}</td>
                                            <td className="py-1 px-2 text-center">{renderMiniTimeOff(sub.id)}</td>
                                            <td className="py-1.5 px-2.5">{p.distribution || 'Ideal'}</td>
                                            <td className="py-1.5 px-2.5 truncate">{homeRoom?.name || ''}</td>
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
                        disabled={!selectedSubject}
                        onClick={() => openEditModal(selectedSubject)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>📝</span> Edit
                    </button>
                    <button
                        type="button"
                        disabled={!selectedSubject || !onDeleteSubject}
                        onClick={handleRemoveSelected}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[11px]">−</span>
                        Remove
                    </button>

                    <div className="hidden md:block my-2 border-t border-slate-300 dark:border-slate-700" />

                    <button
                        type="button"
                        disabled={!selectedSubject}
                        onClick={openLessonsModal}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 border-2 border-blue-500 text-xs font-black text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>📚</span> Lessons
                    </button>
                    <button
                        type="button"
                        disabled={!selectedSubject}
                        onClick={() => selectedSubject && setTimeOffModalSubject(selectedSubject)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🕒</span> Time off
                    </button>
                    <button
                        type="button"
                        disabled={!selectedSubject}
                        onClick={openConstraintsModal}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="text-purple-600 font-black">#</span> Constraints
                    </button>
                </div>
            </div>

            {/* Classic aSc Bottom Toolbar */}
            <div className="bg-slate-200/80 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleQuickImportKenyan}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        📥 Import Standard Subjects
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

            {/* MODAL 1: NEW / EDIT SUBJECT */}
            {editModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveSubject} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            {editModal.mode === 'new' ? 'New Subject' : `Edit Subject — ${editModal.subject?.name}`}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Subject Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. MATHEMATICS"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Short *</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={formCode}
                                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                                    placeholder="MAT"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-black uppercase"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Distribution</label>
                                <select
                                    value={formDistribution}
                                    onChange={e => setFormDistribution(e.target.value as any)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                >
                                    <option value="Ideal">Ideal</option>
                                    <option value="Spread">Spread Evenly</option>
                                    <option value="Compact">Compact</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Home Room / Lab</label>
                                <select
                                    value={formHomeRoomId}
                                    onChange={e => setFormHomeRoomId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                >
                                    <option value="">Class Home Room</option>
                                    {(rooms || []).map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase cursor-pointer">Save</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 2: SUBJECT LESSONS STRUCTURE */}
            {lessonsModalSubject && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveLessons} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            Weekly Lessons — {lessonsModalSubject.name} ({lessonsModalSubject.code})
                        </h3>
                        <p className="text-xs text-slate-500">
                            Configure how many single, double, and triple lessons this subject has per week per class.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Singles (1p)</label>
                                <input type="number" min={0} max={10} value={singlesCount} onChange={e => setSinglesCount(Math.max(0, Number(e.target.value) || 0))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black text-center" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Doubles (2p)</label>
                                <input type="number" min={0} max={5} value={doublesCount} onChange={e => setDoublesCount(Math.max(0, Number(e.target.value) || 0))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black text-center" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Triples (3p)</label>
                                <input type="number" min={0} max={3} value={triplesCount} onChange={e => setTriplesCount(Math.max(0, Number(e.target.value) || 0))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black text-center" />
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                            Total weekly periods per class: <strong>{singlesCount + doublesCount * 2 + triplesCount * 3}</strong>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setLessonsModalSubject(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase cursor-pointer">Save Lessons</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 3: INTERACTIVE aSc TIME OFF GRID (GREEN ✓ / RED ×) */}
            {timeOffModalSubject && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-2xl shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                                    Time Off — {timeOffModalSubject.name} ({timeOffModalSubject.code})
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Click any cell, day, or period number to toggle <span className="text-emerald-600 font-bold">Allowed (Green ✓)</span> vs <span className="text-rose-600 font-bold">Blocked (Red ×)</span>.
                                </p>
                            </div>
                            <button type="button" onClick={() => setTimeOffModalSubject(null)} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-black cursor-pointer">Done</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center text-xs select-none">
                                <thead>
                                    <tr>
                                        <th className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900">Day / Period</th>
                                        {Array.from({ length: periodCount }).map((_, pIdx) => (
                                            <th
                                                key={pIdx}
                                                onClick={() => toggleTimeOffCol(timeOffModalSubject.id, pIdx)}
                                                title="Click to toggle entire column"
                                                className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-100 cursor-pointer font-black"
                                            >
                                                {pIdx + 1}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {operatingDays.map((day, dIdx) => (
                                        <tr key={day}>
                                            <td
                                                onClick={() => toggleTimeOffRow(timeOffModalSubject.id, dIdx)}
                                                title="Click to toggle entire day"
                                                className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-left hover:bg-indigo-100 cursor-pointer"
                                            >
                                                {day}
                                            </td>
                                            {Array.from({ length: periodCount }).map((_, pIdx) => {
                                                const blocked = Boolean(prefsMap[timeOffModalSubject.id]?.timeOff?.[`${dIdx}_${pIdx}`]);
                                                return (
                                                    <td
                                                        key={pIdx}
                                                        onClick={() => toggleTimeOffCell(timeOffModalSubject.id, dIdx, pIdx)}
                                                        className={`p-2 border border-slate-300 dark:border-slate-600 font-black cursor-pointer transition-colors ${
                                                            blocked
                                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                                : 'bg-lime-500 hover:bg-lime-600 text-slate-950'
                                                        }`}
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

            {/* MODAL 4: CONSTRAINTS */}
            {constraintsModalSubject && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveConstraints} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            Constraints — {constraintsModalSubject.name}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Weekly Distribution</label>
                                <select value={constraintDist} onChange={e => setConstraintDist(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="Ideal">Ideal (Balanced across week)</option>
                                    <option value="Spread">Spread (Max 1 per day)</option>
                                    <option value="Compact">Compact (Allow grouped days)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Max Periods Per Day Per Class</label>
                                <input type="number" min={1} max={4} value={constraintMaxPerDay} onChange={e => setConstraintMaxPerDay(Math.max(1, Number(e.target.value) || 1))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Preferred Home Room / Lab</label>
                                <select value={constraintHomeRoom} onChange={e => setConstraintHomeRoom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">Class Home Room</option>
                                    {(rooms || []).map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setConstraintsModalSubject(null);
                                    onSwitchTab?.('relations');
                                }}
                                className="text-xs font-black text-indigo-600 hover:underline cursor-pointer"
                            >
                                Open Card Relations →
                            </button>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConstraintsModalSubject(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase cursor-pointer">Save</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
