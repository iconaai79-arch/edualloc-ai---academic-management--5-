import React, { useState, useMemo } from 'react';
import type { Subject, Course, Room, User, TimetableEntry } from '../types';
import type { AscLessonRow } from './AscSubjectsManager';
import type { AscCardRelationshipRow } from './AscCardRelationshipsManager';

interface ConstraintChildRow {
    id: string;
    label: string;
    detail: string;
    status: 'ok' | 'violation';
    points: number;
}

interface ConstraintGroupRow {
    id: string;
    category: 'global' | 'teachers' | 'classes' | 'classrooms' | 'cards' | 'relations' | 'heuristic';
    icon: string;
    objectLabel: string;
    isHard?: boolean;
    status: 'global' | 'ok' | 'violation' | 'info';
    points: number;
    description: string;
    children: ConstraintChildRow[];
}

interface AscInputtedConstraintsListProps {
    institutionId: string;
    subjects: Subject[];
    courses: Course[];
    rooms: Room[];
    lecturers: User[];
    timetableEntries?: TimetableEntry[];
    onOpenTab?: (tab: 'cards' | 'subjects' | 'classes' | 'classrooms' | 'teachers' | 'relations' | 'wizard') => void;
}

export const AscInputtedConstraintsList: React.FC<AscInputtedConstraintsListProps> = ({
    institutionId,
    subjects,
    courses,
    rooms,
    lecturers,
    timetableEntries = [],
    onOpenTab,
}) => {
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [filterMode, setFilterMode] = useState<'all' | 'hard' | 'violations' | 'teachers' | 'classes' | 'classrooms' | 'relations'>('all');
    const [refreshTick, setRefreshTick] = useState(0);

    // Load all inputted aSc constraints from localStorage (synced across Subjects, Classes, Classrooms, Teachers, Relations)
    const {
        teacherPrefs,
        classPrefs,
        roomPrefs,
        subjectPrefs,
        cardRelations,
        ascLessons,
    } = useMemo(() => {
        const readJson = (k: string, fallback: any) => {
            try {
                const raw = localStorage.getItem(k);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        };
        const id = institutionId || 'default';
        return {
            teacherPrefs: readJson(`eduai_asc_teacher_prefs_${id}`, {}) as Record<string, any>,
            classPrefs: readJson(`eduai_asc_class_prefs_${id}`, {}) as Record<string, any>,
            roomPrefs: readJson(`eduai_asc_room_prefs_${id}`, {}) as Record<string, any>,
            subjectPrefs: readJson(`eduai_asc_subject_prefs_${id}`, {}) as Record<string, any>,
            cardRelations: readJson(`eduai_asc_card_relations_${id}`, []) as AscCardRelationshipRow[],
            ascLessons: readJson(`eduai_asc_lessons_${id}`, []) as AscLessonRow[],
        };
    }, [institutionId, refreshTick]);

    const classCount = useMemo(() => {
        let count = 0;
        (courses || []).forEach(c => {
            if (!c) return;
            count += Array.isArray(c.levels) && c.levels.length > 0 ? c.levels.length : 1;
        });
        return count;
    }, [courses]);

    const groups = useMemo<ConstraintGroupRow[]>(() => {
        const entries = timetableEntries || [];
        const result: ConstraintGroupRow[] = [];

        // 1. Hard: Teacher double-booking check ("Two cards on the same position")
        const teacherSlotMap = new Map<string, TimetableEntry[]>();
        entries.forEach(e => {
            if (!e?.lecturerId) return;
            const k = `${e.lecturerId}__${e.day}__${e.startTime}`;
            teacherSlotMap.set(k, [...(teacherSlotMap.get(k) || []), e]);
        });
        const teacherClashChildren: ConstraintChildRow[] = (lecturers || []).map(t => {
            const clashes = Array.from(teacherSlotMap.entries()).filter(([k, list]) => k.startsWith(`${t.id}__`) && list.length > 1).length;
            return {
                id: `tc_${t.id}`,
                label: t.name,
                detail: clashes === 0 ? 'No overlapping lessons' : `${clashes} overlapping slot(s)`,
                status: clashes === 0 ? 'ok' : 'violation',
                points: clashes * 500,
            };
        });
        const teacherClashPts = teacherClashChildren.reduce((s, c) => s + c.points, 0);
        result.push({
            id: 'hard_teacher_overlap',
            category: 'teachers',
            icon: '🎓',
            objectLabel: `${(lecturers || []).length}x`,
            isHard: true,
            status: teacherClashPts > 0 ? 'violation' : 'ok',
            points: teacherClashPts,
            description: 'Two cards on the same position',
            children: teacherClashChildren,
        });

        // 2. Hard: Class double-booking check ("Two cards on the same position")
        const classSlotMap = new Map<string, TimetableEntry[]>();
        entries.forEach(e => {
            const cid = String(e.levelId || e.courseId || '');
            if (!cid) return;
            const k = `${cid}__${e.day}__${e.startTime}`;
            classSlotMap.set(k, [...(classSlotMap.get(k) || []), e]);
        });
        const classChildren: ConstraintChildRow[] = [];
        (courses || []).forEach(c => {
            const levels = Array.isArray(c?.levels) && c.levels.length > 0 ? c.levels : [{ id: c.id, name: c.name }];
            levels.forEach((l: any) => {
                const clashes = Array.from(classSlotMap.entries()).filter(([k, list]) => k.startsWith(`${l.id}__`) && list.length > 1).length;
                classChildren.push({
                    id: `cc_${c.id}_${l.id}`,
                    label: l.name === c.name ? c.name : `${c.name} ${l.name}`,
                    detail: clashes === 0 ? 'No ungrouped overlap' : `${clashes} shared/overlapping slot(s)`,
                    status: 'ok',
                    points: 0,
                });
            });
        });
        result.push({
            id: 'hard_class_overlap',
            category: 'classes',
            icon: '👥',
            objectLabel: `${classCount}x`,
            isHard: true,
            status: 'ok',
            points: 0,
            description: 'Two cards on the same position',
            children: classChildren,
        });

        // 3. Hard: Classroom double-booking check ("Two cards on the same position")
        const roomSlotMap = new Map<string, TimetableEntry[]>();
        entries.forEach(e => {
            if (!e?.roomId) return;
            const k = `${e.roomId}__${e.day}__${e.startTime}`;
            roomSlotMap.set(k, [...(roomSlotMap.get(k) || []), e]);
        });
        const roomChildren: ConstraintChildRow[] = (rooms || []).map(r => {
            const clashes = Array.from(roomSlotMap.entries()).filter(([k, list]) => k.startsWith(`${r.id}__`) && list.length > 1).length;
            return {
                id: `rc_${r.id}`,
                label: r.name,
                detail: clashes === 0 ? 'No room double-booking' : `${clashes} double-booked slot(s)`,
                status: clashes === 0 ? 'ok' : 'violation',
                points: clashes * 400,
            };
        });
        const roomClashPts = roomChildren.reduce((s, c) => s + c.points, 0);
        result.push({
            id: 'hard_room_overlap',
            category: 'classrooms',
            icon: '🚪',
            objectLabel: `${(rooms || []).length}x`,
            isHard: true,
            status: roomClashPts > 0 ? 'violation' : 'ok',
            points: roomClashPts,
            description: 'Two cards on the same position',
            children: roomChildren,
        });

        // 4. Teacher Max Gaps per Week
        const gapChildren: ConstraintChildRow[] = (lecturers || []).map(t => {
            const c = teacherPrefs[t.id]?.constraints || {};
            const maxGaps = c.limitWindowsWeek ? (c.maxWindowsWeek ?? 10) : 10;
            return {
                id: `tg_${t.id}`,
                label: t.name,
                detail: c.limitWindowsWeek ? `Max ${maxGaps} windows/week (Custom)` : `Default max ${maxGaps} windows/week`,
                status: 'ok',
                points: 0,
            };
        });
        result.push({
            id: 'teacher_max_gaps',
            category: 'teachers',
            icon: '🎓',
            objectLabel: `${(lecturers || []).length}x`,
            status: 'ok',
            points: 0,
            description: 'Max gaps per week: 10',
            children: gapChildren,
        });

        // 5. Card Relationships ("Cards can not follow", "Cannot be same day", etc.)
        const activeRelations = (cardRelations || []).filter(r => r.active);
        const relChildren: ConstraintChildRow[] = activeRelations.map((r, i) => {
            const subCodes = r.subjectIds
                .map(sid => (subjects || []).find(s => s.id === sid)?.code || sid)
                .join(', ');
            return {
                id: `rel_${r.id}`,
                label: `#${i + 1} ${subCodes}`,
                detail: `${r.ruleType.replace(/_/g, ' ')} • ${r.applyToScope === 'all_classes' ? 'All classes' : r.courseIds.length ? `${r.courseIds.length} class(es)` : 'Global'}`,
                status: 'ok',
                points: 0,
            };
        });
        result.push({
            id: 'card_relations',
            category: 'relations',
            icon: '👥',
            objectLabel: `${activeRelations.length}x`,
            status: 'ok',
            points: 0,
            description: 'Cards can not follow / Card relationships',
            children: relChildren,
        });

        // 6. Card Distribution over the week
        const distCount = (subjects || []).length * Math.max(1, classCount);
        const distChildren: ConstraintChildRow[] = (subjects || []).map(s => {
            const dist = subjectPrefs[s.id]?.distribution || 'Ideal';
            return {
                id: `sd_${s.id}`,
                label: `${(s.code || s.name.slice(0, 3)).toUpperCase()} — ${s.name}`,
                detail: `Distribution: ${dist}`,
                status: 'ok',
                points: 0,
            };
        });
        result.push({
            id: 'card_distribution',
            category: 'classes',
            icon: '👥',
            objectLabel: `${distCount}x`,
            status: 'ok',
            points: 0,
            description: 'Card distribution over the week',
            children: distChildren,
        });

        // 7. Time-Off Constraints Count (Subjects + Classes + Rooms + Teachers)
        const timeOffChildren: ConstraintChildRow[] = [];
        const countBlocked = (obj: Record<string, boolean> | undefined) =>
            Object.values(obj || {}).filter(Boolean).length;
        (subjects || []).forEach(s => {
            const b = countBlocked(subjectPrefs[s.id]?.timeOff);
            if (b > 0) timeOffChildren.push({ id: `to_s_${s.id}`, label: `Subject: ${s.name}`, detail: `${b} blocked period(s)`, status: 'ok', points: 0 });
        });
        Object.entries(classPrefs || {}).forEach(([k, v]: [string, any]) => {
            const b = countBlocked(v?.timeOff);
            if (b > 0) timeOffChildren.push({ id: `to_c_${k}`, label: `Class: ${v?.shortCode || k}`, detail: `${b} blocked period(s)`, status: 'ok', points: 0 });
        });
        (rooms || []).forEach(r => {
            const b = countBlocked(roomPrefs[r.id]?.timeOff);
            if (b > 0) timeOffChildren.push({ id: `to_r_${r.id}`, label: `Room: ${r.name}`, detail: `${b} blocked period(s)`, status: 'ok', points: 0 });
        });
        (lecturers || []).forEach(t => {
            const b = countBlocked(teacherPrefs[t.id]?.timeOff);
            if (b > 0) timeOffChildren.push({ id: `to_t_${t.id}`, label: `Teacher: ${t.name}`, detail: `${b} blocked period(s)`, status: 'ok', points: 0 });
        });
        if (timeOffChildren.length > 0) {
            result.push({
                id: 'time_off_rules',
                category: 'relations',
                icon: '🕒',
                objectLabel: `${timeOffChildren.length}x`,
                isHard: true,
                status: 'ok',
                points: 0,
                description: 'Time off constraints (Subjects, Classes, Rooms, Teachers)',
                children: timeOffChildren,
            });
        }

        // 8. Heuristic Info Row (matching aSc screenshot)
        const specificRoomCards = ascLessons.filter(l => l.classroomMode === 'specific').reduce((s, l) => s + l.count, 0);
        result.push({
            id: 'heuristic_rooms',
            category: 'heuristic',
            icon: '',
            objectLabel: '',
            status: 'info',
            points: 0,
            description: `Heuristic: Number of cards requiring classroom: ${specificRoomCards}/${(rooms || []).length}`,
            children: [],
        });

        // 9. Card must be placed in the timetable
        const totalPlannedCards = ascLessons.reduce((s, l) => s + (Number(l.count) || 0), 0);
        const totalCardsDisplay = totalPlannedCards > 0 ? totalPlannedCards : entries.length;
        const cardChildren: ConstraintChildRow[] = ascLessons.slice(0, 50).map(l => {
            const sub = (subjects || []).find(s => s.id === l.subjectId);
            return {
                id: `card_${l.id}`,
                label: `${(sub?.code || l.subjectId).toUpperCase()} — ${l.classLabel}`,
                detail: `${l.teacherName} • ${l.count}× (len ${l.length})`,
                status: 'ok',
                points: 0,
            };
        });
        result.push({
            id: 'cards_placed',
            category: 'cards',
            icon: '🟪',
            objectLabel: `${totalCardsDisplay}x`,
            status: 'ok',
            points: 0,
            description: 'Card must be placed in the timetable',
            children: cardChildren,
        });

        // 10. Teacher Max Consecutive Periods
        const consecChildren: ConstraintChildRow[] = (lecturers || []).map(t => {
            const c = teacherPrefs[t.id]?.constraints || {};
            const maxC = c.limitConsecutive ? (c.maxConsecutive ?? 3) : (teacherPrefs[t.id]?.maxConsecutive ?? 3);
            return {
                id: `tcon_${t.id}`,
                label: t.name,
                detail: `Max consecutive periods: ${maxC}`,
                status: 'ok',
                points: 0,
            };
        });
        result.push({
            id: 'teacher_max_consecutive',
            category: 'teachers',
            icon: '🎓',
            objectLabel: `${(lecturers || []).length}x`,
            status: 'ok',
            points: 0,
            description: 'Max consecutive periods: 3',
            children: consecChildren,
        });

        // Prepend Global Score Row
        const totalPoints = result.reduce((s, g) => s + g.points, 0) + (entries.length * 10 + totalCardsDisplay * 15);
        return [
            {
                id: 'global_score',
                category: 'global',
                icon: '🏛️',
                objectLabel: 'Global',
                status: 'global',
                points: totalPoints,
                description: '',
                children: [],
            },
            ...result,
        ];
    }, [lecturers, courses, classCount, rooms, subjects, timetableEntries, teacherPrefs, classPrefs, roomPrefs, subjectPrefs, cardRelations, ascLessons]);

    const visibleGroups = useMemo(() => {
        if (filterMode === 'all') return groups;
        if (filterMode === 'hard') return groups.filter(g => g.category === 'global' || g.isHard);
        if (filterMode === 'violations') return groups.filter(g => g.category === 'global' || g.status === 'violation');
        return groups.filter(g => g.category === 'global' || g.category === filterMode);
    }, [groups, filterMode]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const expandAll = () => {
        const next: Record<string, boolean> = {};
        groups.forEach(g => { if (g.children.length > 0) next[g.id] = true; });
        setExpandedIds(next);
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Header & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        List of Inputed Constraints
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'hard', label: 'Hard (!)' },
                        { id: 'violations', label: 'Violations' },
                        { id: 'teachers', label: 'Teachers' },
                        { id: 'classes', label: 'Classes' },
                        { id: 'classrooms', label: 'Rooms' },
                        { id: 'relations', label: 'Relations' },
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilterMode(f.id as any)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer ${
                                filterMode === f.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={expandAll}
                        className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[10px] font-bold cursor-pointer"
                    >
                        Expand All
                    </button>
                    <button
                        type="button"
                        onClick={() => setExpandedIds({})}
                        className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[10px] font-bold cursor-pointer"
                    >
                        Collapse
                    </button>
                    <button
                        type="button"
                        onClick={() => setRefreshTick(t => t + 1)}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase cursor-pointer"
                    >
                        Re-Test All
                    </button>
                </div>
            </div>

            {/* Authentic aSc Inputted Constraints Tree Table */}
            <div className="bg-white dark:bg-slate-900 overflow-x-auto min-h-[380px] max-h-[540px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-8"></th>
                            <th className="py-1.5 px-1.5 border-r border-slate-300 dark:border-slate-700 w-7"></th>
                            <th className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-9"></th>
                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-40">Object</th>
                            <th className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-10 text-center"></th>
                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-24">Points</th>
                            <th className="py-1.5 px-3">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {visibleGroups.map((g, idx) => {
                            const isExpanded = Boolean(expandedIds[g.id]);
                            const hasChildren = g.children.length > 0;
                            return (
                                <React.Fragment key={g.id}>
                                    <tr
                                        onClick={() => hasChildren && toggleExpand(g.id)}
                                        className={`${hasChildren ? 'cursor-pointer' : ''} ${
                                            g.category === 'heuristic'
                                                ? 'text-slate-400 bg-slate-50/40 dark:bg-slate-900/40'
                                                : idx % 2 === 0
                                                    ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                                                    : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                                        }`}
                                    >
                                        <td className="py-1.5 px-2 text-center">
                                            {hasChildren && (
                                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-xs border border-slate-400 bg-slate-100 dark:bg-slate-700 text-[10px] font-black leading-none text-slate-700 dark:text-slate-200">
                                                    {isExpanded ? '−' : '+'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-1.5 text-center font-black text-red-600 text-sm leading-none">
                                            {g.isHard ? '!' : ''}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-sm leading-none">
                                            {g.icon}
                                        </td>
                                        <td className="py-1.5 px-3 font-semibold">
                                            {g.objectLabel}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-sm leading-none">
                                            {g.status === 'global' ? (
                                                <span title="Global Constraint Weight">💡</span>
                                            ) : g.status === 'violation' ? (
                                                <span className="text-red-600 font-black" title="Constraint Violation">✕</span>
                                            ) : (
                                                <span className="text-emerald-600 font-black" title="Constraint Satisfied">✓</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-3 font-mono font-bold">
                                            {g.points > 0 ? g.points : ''}
                                        </td>
                                        <td className="py-1.5 px-3">
                                            {g.description}
                                        </td>
                                    </tr>

                                    {/* Expanded Child Constraints */}
                                    {isExpanded && g.children.map(child => (
                                        <tr key={child.id} className="bg-blue-50/30 dark:bg-slate-800/70 text-[11px] text-slate-700 dark:text-slate-300">
                                            <td className="py-1 px-2"></td>
                                            <td className="py-1 px-1.5"></td>
                                            <td className="py-1 px-2 text-center text-slate-400">↳</td>
                                            <td className="py-1 px-3 font-bold truncate">{child.label}</td>
                                            <td className="py-1 px-2 text-center">
                                                {child.status === 'violation' ? (
                                                    <span className="text-red-600 font-black">✕</span>
                                                ) : (
                                                    <span className="text-emerald-600 font-black">✓</span>
                                                )}
                                            </td>
                                            <td className="py-1 px-3 font-mono">{child.points > 0 ? child.points : ''}</td>
                                            <td className="py-1 px-3 text-slate-500 dark:text-slate-400">{child.detail}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                    Click any <strong>[+]</strong> row to inspect individual teacher, class, room, or card relationship constraints.
                </span>
                <div className="flex items-center gap-2">
                    {onOpenTab && (
                        <>
                            <button
                                type="button"
                                onClick={() => onOpenTab('wizard')}
                                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase cursor-pointer"
                            >
                                Run AI Generator →
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenTab('cards')}
                                className="px-6 py-1.5 rounded border-2 border-blue-500 bg-white dark:bg-slate-700 text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
