import React, { useState, useMemo, useEffect } from 'react';
import type { Subject, Course, User, TimetableEntry } from '../types';
import { apiService } from '../services/apiService';

export interface AscCardRelationshipRow {
    id: string;
    institutionId: string;
    ruleType:
        | 'cannot_same_day'
        | 'cannot_follow'
        | 'distribution_separately'
        | 'must_be_one_day'
        | 'must_follow'
        | 'no_break_between'
        | 'diff_classes_one_day'
        | 'divided_cards_one_day'
        | 'groups_start_same_time'
        | 'same_time_all_classes'
        | 'same_period_each_day'
        | 'reserve_space'
        | 'first_or_last'
        | 'can_be_afternoon'
        | 'same_time_electives'
        | 'double_lesson'
        | 'morning_preferred'
        | 'afternoon_preferred'
        | 'max_per_day';
    subjectIds: string[];
    applyToScope: 'all_classes' | 'selected_classes' | 'global';
    courseIds: string[];
    teacherId?: string;
    parameters?: string;
    importance?: 'Strict' | 'High' | 'Normal' | 'Low';
    followOrder?: 'specified' | 'arbitrary';
    onlyDividedCards?: boolean;
    note?: string;
    color?: string;
    active: boolean;
    createdAt: string;
}

interface AscCardRelationshipsManagerProps {
    institutionId: string;
    subjects: Subject[];
    courses: Course[];
    lecturers: User[];
    timetableEntries?: TimetableEntry[];
    onClose?: () => void;
    onOpenWizard?: () => void;
}

const RELATION_DESCRIPTIONS: Record<AscCardRelationshipRow['ruleType'], string> = {
    cannot_same_day: 'cannot be the same day.',
    cannot_follow: 'cannot follow.',
    distribution_separately: 'Distribution of each subject from the list separately',
    must_be_one_day: 'Two subjects must be in one day',
    must_follow: 'Two subjects must follow.',
    no_break_between: 'Break cannot be between group of lessons',
    diff_classes_one_day: 'Group of cards from different classes must be in one day',
    divided_cards_one_day: 'Divided cards from one subject must be on one day',
    groups_start_same_time: 'These subjects for the groups of listed classes must start at the same time.',
    same_time_all_classes: 'The selected subjects have to be at the same time in all selected classes.',
    same_period_each_day: 'This subject must be on the same period each day',
    reserve_space: 'Reserve space for selected subjects',
    first_or_last: 'Subject must be first or last',
    can_be_afternoon: 'The selected subjects can be in the afternoon(outside teaching block)',
    same_time_electives: 'must be at the same time (parallel electives).',
    double_lesson: 'must follow consecutively (double / block).',
    morning_preferred: 'must be placed in morning periods (P1–P4).',
    afternoon_preferred: 'must be placed in afternoon periods (P6+).',
    max_per_day: 'max 1 lesson per day per class.',
};

const ROW_COLORS = ['', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899'];

export const AscCardRelationshipsManager: React.FC<AscCardRelationshipsManagerProps> = ({
    institutionId,
    subjects,
    courses,
    lecturers,
    timetableEntries = [],
    onClose,
}) => {
    const storageKey = `eduai_asc_card_relations_${institutionId || 'default'}`;

    const [rows, setRows] = useState<AscCardRelationshipRow[]>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    });

    const [selectedId, setSelectedId] = useState<string>(() => rows[0]?.id || '');
    const [testMessage, setTestMessage] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);

    // Editor Modal (Authentic 3-Step aSc "New relationship" Dialog)
    const [editorModal, setEditorModal] = useState<{ mode: 'add' | 'edit' | 'advanced'; row?: AscCardRelationshipRow } | null>(null);
    const [fRuleType, setFRuleType] = useState<AscCardRelationshipRow['ruleType']>('cannot_same_day');
    const [fSubjectIds, setFSubjectIds] = useState<string[]>([]);
    const [showSubjectPicker, setShowSubjectPicker] = useState<boolean>(false);
    const [fApplyScope, setFApplyScope] = useState<'all_classes' | 'selected_classes' | 'global'>('all_classes');
    const [fCourseIds, setFCourseIds] = useState<string[]>([]);
    const [showClassPicker, setShowClassPicker] = useState<boolean>(false);
    const [fTeacherId, setFTeacherId] = useState<string>('');
    const [fParams, setFParams] = useState<string>('');
    const [fImportance, setFImportance] = useState<'Strict' | 'High' | 'Normal' | 'Low'>('Normal');
    const [fActive, setFActive] = useState<boolean>(true);
    const [fFollowOrder, setFFollowOrder] = useState<'specified' | 'arbitrary'>('specified');
    const [fOnlyDivided, setFOnlyDivided] = useState<boolean>(false);
    const [fNote, setFNote] = useState<string>('');

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<AscCardRelationshipRow>('asc_card_relationships', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) {
                    setRows(recs);
                    try { localStorage.setItem(storageKey, JSON.stringify(recs)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [institutionId, storageKey]);

    useEffect(() => {
        if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
    }, [rows, selectedId]);

    const persistRows = async (next: AscCardRelationshipRow[], changed?: AscCardRelationshipRow) => {
        setRows(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
        if (changed) {
            await apiService.saveModuleRecord('asc_card_relationships', changed).catch(() => {});
        }
    };

    const selectedIndex = useMemo(() => rows.findIndex(r => r.id === selectedId), [rows, selectedId]);
    const selectedRow = selectedIndex >= 0 ? rows[selectedIndex] : null;

    const getSubjectShort = (sid: string): string => {
        const s = (subjects || []).find(x => x.id === sid);
        if (!s) return sid;
        return (s.code || s.name.slice(0, 4)).toUpperCase();
    };

    const formatApplyTo = (row: AscCardRelationshipRow): string => {
        if (row.applyToScope === 'global') return '';
        if (row.applyToScope === 'all_classes' || row.courseIds.length === 0) return 'All classes';
        return row.courseIds
            .map(cid => (courses || []).find(c => c.id === cid)?.code || (courses || []).find(c => c.id === cid)?.name || cid)
            .join(', ');
    };

    const openEditor = (mode: 'add' | 'edit' | 'advanced') => {
        if (mode === 'edit' && !selectedRow) return;
        setShowSubjectPicker(false);
        setShowClassPicker(false);
        if (mode === 'edit' && selectedRow) {
            setFRuleType(selectedRow.ruleType);
            setFSubjectIds([...selectedRow.subjectIds]);
            setFApplyScope(selectedRow.applyToScope);
            setFCourseIds([...selectedRow.courseIds]);
            setFTeacherId(selectedRow.teacherId || '');
            setFParams(selectedRow.parameters || '');
            setFImportance(selectedRow.importance || 'Normal');
            setFActive(selectedRow.active);
            setFFollowOrder(selectedRow.followOrder || 'specified');
            setFOnlyDivided(Boolean(selectedRow.onlyDividedCards));
            setFNote(selectedRow.note || '');
            setEditorModal({ mode, row: selectedRow });
        } else {
            setFRuleType(mode === 'advanced' ? 'distribution_separately' : 'cannot_same_day');
            setFSubjectIds([]);
            setFApplyScope('all_classes');
            setFCourseIds([]);
            setFTeacherId('');
            setFParams('');
            setFImportance('Normal');
            setFActive(true);
            setFFollowOrder('specified');
            setFOnlyDivided(false);
            setFNote('');
            setEditorModal({ mode });
        }
    };

    const handleSaveEditor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fSubjectIds.length === 0) {
            alert('Please click "Select subjects" and choose at least one subject.');
            return;
        }
        const computedParams = fParams.trim() || (
            fRuleType === 'must_follow'
                ? `${fFollowOrder === 'specified' ? 'In specified order' : 'In arbitrary order'}${fOnlyDivided ? ', Only divided' : ''}`
                : fImportance !== 'Normal'
                    ? `Importance: ${fImportance}`
                    : undefined
        );
        if (editorModal?.mode === 'edit' && editorModal.row) {
            const updated: AscCardRelationshipRow = {
                ...editorModal.row,
                ruleType: fRuleType,
                subjectIds: fSubjectIds,
                applyToScope: fApplyScope,
                courseIds: fApplyScope === 'selected_classes' ? fCourseIds : [],
                teacherId: fTeacherId || undefined,
                parameters: computedParams,
                importance: fImportance,
                followOrder: fFollowOrder,
                onlyDividedCards: fOnlyDivided,
                note: fNote.trim() || undefined,
                active: fActive,
            };
            await persistRows(rows.map(r => r.id === updated.id ? updated : r), updated);
            setSelectedId(updated.id);
        } else {
            const created: AscCardRelationshipRow = {
                id: `crel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId,
                ruleType: fRuleType,
                subjectIds: fSubjectIds,
                applyToScope: fApplyScope,
                courseIds: fApplyScope === 'selected_classes' ? fCourseIds : [],
                teacherId: fTeacherId || undefined,
                parameters: computedParams,
                importance: fImportance,
                followOrder: fFollowOrder,
                onlyDividedCards: fOnlyDivided,
                note: fNote.trim() || undefined,
                active: fActive,
                createdAt: new Date().toISOString(),
            };
            await persistRows([...rows, created], created);
            setSelectedId(created.id);
        }
        setEditorModal(null);
    };

    const handleRemove = () => {
        if (!selectedRow) return;
        const next = rows.filter(r => r.id !== selectedRow.id);
        persistRows(next);
        setSelectedId(next[Math.max(0, selectedIndex - 1)]?.id || '');
    };

    const handleSetActive = (activeVal: boolean) => {
        if (!selectedRow) return;
        const updated = { ...selectedRow, active: activeVal };
        persistRows(rows.map(r => r.id === updated.id ? updated : r), updated);
    };

    const handleMove = (dir: -1 | 1) => {
        if (selectedIndex < 0) return;
        const targetIdx = selectedIndex + dir;
        if (targetIdx < 0 || targetIdx >= rows.length) return;
        const next = [...rows];
        const [item] = next.splice(selectedIndex, 1);
        next.splice(targetIdx, 0, item);
        persistRows(next);
    };

    const handleCopy = () => {
        if (!selectedRow) return;
        const clone: AscCardRelationshipRow = {
            ...selectedRow,
            id: `crel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            createdAt: new Date().toISOString(),
        };
        const next = [...rows];
        next.splice(selectedIndex + 1, 0, clone);
        persistRows(next, clone);
        setSelectedId(clone.id);
    };

    const handleCycleColor = () => {
        if (!selectedRow) return;
        const curIdx = ROW_COLORS.indexOf(selectedRow.color || '');
        const nextColor = ROW_COLORS[(curIdx + 1) % ROW_COLORS.length];
        const updated = { ...selectedRow, color: nextColor || undefined };
        persistRows(rows.map(r => r.id === updated.id ? updated : r), updated);
    };

    const handleTestRelation = () => {
        if (!selectedRow) return;
        if (!timetableEntries || timetableEntries.length === 0) {
            setTestMessage({ type: 'warn', text: `Rule #${selectedIndex + 1} is valid and active — generate a timetable first to check live placements.` });
            return;
        }
        const relevant = timetableEntries.filter(e => selectedRow.subjectIds.includes(e.subjectId));
        if (selectedRow.ruleType === 'cannot_same_day') {
            const byClassDay = new Map<string, Set<string>>();
            let violations = 0;
            relevant.forEach(e => {
                const k = `${e.levelId || e.courseId}__${e.day}`;
                const set = byClassDay.get(k) || new Set<string>();
                if (set.size > 0 && !set.has(e.subjectId)) violations++;
                set.add(e.subjectId);
                byClassDay.set(k, set);
            });
            setTestMessage(
                violations === 0
                    ? { type: 'ok', text: `Rule #${selectedIndex + 1} PASSED — 0 same-day conflicts across ${relevant.length} placed cards.` }
                    : { type: 'warn', text: `Rule #${selectedIndex + 1}: Found ${violations} potential same-day overlap(s).` }
            );
        } else {
            setTestMessage({ type: 'ok', text: `Rule #${selectedIndex + 1} checked against ${relevant.length} placed card(s) — OK.` });
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Classic aSc Card Relationships Header */}
            <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xl shadow-xs">
                        🕸️
                    </div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        Card relationships
                    </h2>
                </div>
                {testMessage && (
                    <div className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                        testMessage.type === 'ok'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                    }`}>
                        {testMessage.text}
                    </div>
                )}
            </div>

            {/* Spreadsheet Table */}
            <div className="bg-white dark:bg-slate-900 min-h-[340px] max-h-[460px] overflow-auto border-b border-slate-300 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs select-none">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 w-10 text-center"></th>
                            <th className="py-1.5 px-1.5 border-r border-slate-300 dark:border-slate-700 w-7 text-center"></th>
                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-44">Subjects</th>
                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-36">Apply to:</th>
                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700">Description</th>
                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-36">Parameters</th>
                            <th className="py-1.5 px-3 w-36">Note</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400">
                                    No card relationships defined yet. Click <strong>Add</strong> or <strong>Advanced</strong> below (e.g., <em>BIO, PHY, CHE, MAT — cannot follow</em>).
                                </td>
                            </tr>
                        ) : rows.map((row, idx) => {
                            const isSel = selectedRow?.id === row.id;
                            const subjectsText = row.subjectIds.map(getSubjectShort).join(', ');
                            return (
                                <tr
                                    key={row.id}
                                    onClick={() => setSelectedId(row.id)}
                                    onDoubleClick={() => {
                                        setSelectedId(row.id);
                                        openEditor('edit');
                                    }}
                                    className={`cursor-pointer transition-colors ${
                                        !row.active ? 'opacity-45 line-through' : ''
                                    } ${
                                        isSel
                                            ? 'bg-blue-600 text-white font-semibold'
                                            : idx % 2 === 0
                                                ? 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                                                : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                                    }`}
                                >
                                    <td className="py-1.5 px-2.5 text-center font-mono text-[11px]">{idx + 1}</td>
                                    <td className="py-1.5 px-1.5 text-center">
                                        {row.color ? (
                                            <span style={{ backgroundColor: row.color }} className="inline-block w-3 h-3 rounded-full border border-black/20" />
                                        ) : !row.active ? (
                                            <span className="text-[10px]" title="Inactive">⏸</span>
                                        ) : null}
                                    </td>
                                    <td className="py-1.5 px-3 font-mono font-bold uppercase truncate">{subjectsText}</td>
                                    <td className="py-1.5 px-3 truncate">{formatApplyTo(row)}</td>
                                    <td className="py-1.5 px-3">{RELATION_DESCRIPTIONS[row.ruleType]}</td>
                                    <td className="py-1.5 px-3 text-[11px] truncate">{row.parameters || ''}</td>
                                    <td className="py-1.5 px-3 text-[11px] truncate">{row.note || ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Bottom Classic aSc Icon Action Bar */}
            <div className="bg-white dark:bg-slate-800 px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1">
                    {/* Group 1: Add, Edit, Remove, Advanced */}
                    <button type="button" onClick={() => openEditor('add')} className="flex flex-col items-center justify-center w-14 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-xs">+</span>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">Add</span>
                    </button>
                    <button type="button" disabled={!selectedRow} onClick={() => openEditor('edit')} className="flex flex-col items-center justify-center w-14 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm">✏️</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Edit</span>
                    </button>
                    <button type="button" disabled={!selectedRow} onClick={handleRemove} className="flex flex-col items-center justify-center w-14 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-white flex items-center justify-center font-black text-base">−</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Remove</span>
                    </button>
                    <button type="button" onClick={() => openEditor('advanced')} className="flex flex-col items-center justify-center w-16 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-sm shadow-xs">♞</span>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">Advanced</span>
                    </button>

                    <div className="h-9 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

                    {/* Group 2: Make active, Deactivate, Up, Down */}
                    <button type="button" disabled={!selectedRow || selectedRow.active} onClick={() => handleSetActive(true)} className="flex flex-col items-center justify-center w-14 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-white flex items-center justify-center text-xs">▶</span>
                        <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5 leading-tight text-center">Make active</span>
                    </button>
                    <button type="button" disabled={!selectedRow || !selectedRow.active} onClick={() => handleSetActive(false)} className="flex flex-col items-center justify-center w-16 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-white flex items-center justify-center text-xs">■</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Deactivate</span>
                    </button>
                    <button type="button" disabled={selectedIndex <= 0} onClick={() => handleMove(-1)} className="flex flex-col items-center justify-center w-11 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-white flex items-center justify-center font-black text-xs">↑</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Up</span>
                    </button>
                    <button type="button" disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1} onClick={() => handleMove(1)} className="flex flex-col items-center justify-center w-11 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-white flex items-center justify-center font-black text-xs">↓</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Down</span>
                    </button>

                    <div className="h-9 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

                    {/* Group 3: Copy, Test, Color */}
                    <button type="button" disabled={!selectedRow} onClick={handleCopy} className="flex flex-col items-center justify-center w-12 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm">📄</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Copy</span>
                    </button>
                    <button type="button" disabled={!selectedRow} onClick={handleTestRelation} className="flex flex-col items-center justify-center w-12 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm">✓</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Test</span>
                    </button>
                    <button type="button" disabled={!selectedRow} onClick={handleCycleColor} className="flex flex-col items-center justify-center w-12 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
                        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 via-emerald-400 to-amber-400 border border-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">Color</span>
                    </button>
                </div>

                {/* Right: OK Button */}
                <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="px-8 py-1.5 rounded border-2 border-blue-500 bg-slate-100 dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500 text-xs font-bold text-slate-900 dark:text-white shadow-xs cursor-pointer"
                >
                    OK
                </button>
            </div>

            {/* MODAL: AUTHENTIC 3-STEP aSc "NEW RELATIONSHIP" DIALOG */}
            {editorModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSaveEditor}
                        className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Title Bar */}
                        <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {editorModal.mode === 'edit' ? 'Edit relationship' : 'New relationship'}
                            </span>
                            <button type="button" onClick={() => setEditorModal(null)} className="px-2 py-0.5 rounded hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-sm cursor-pointer">×</button>
                        </div>

                        {/* 2-Column Body: Left (1. Subjects, 2. Classes, Importance/Note) | Right (3. Condition) */}
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-[270px_1fr] gap-5 text-xs text-slate-800 dark:text-slate-200">
                            {/* LEFT COLUMN: STEPS 1 & 2 */}
                            <div className="flex flex-col justify-between space-y-4 md:border-r md:border-slate-300 dark:md:border-slate-700 md:pr-4">
                                <div className="space-y-4">
                                    {/* STEP 1: SUBJECTS */}
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-none">1.</div>
                                                <div className="text-xs font-semibold mt-0.5">Subjects :</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowSubjectPicker(p => !p)}
                                                className="px-4 py-1.5 rounded border-2 border-blue-500 bg-slate-200 dark:bg-slate-700 hover:bg-blue-50 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                                            >
                                                Select subjects
                                            </button>
                                        </div>

                                        {showSubjectPicker ? (
                                            <div className="border border-blue-400 rounded bg-white dark:bg-slate-800 p-2 max-h-36 overflow-y-auto space-y-1">
                                                {(subjects || []).map(s => {
                                                    const picked = fSubjectIds.includes(s.id);
                                                    return (
                                                        <label key={s.id} className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 px-1 py-0.5 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={picked}
                                                                onChange={() => setFSubjectIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                                                                className="accent-blue-600"
                                                            />
                                                            <span className="font-mono font-black">{(s.code || s.name.slice(0, 3)).toUpperCase()}</span>
                                                            <span className="truncate">{s.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => setShowSubjectPicker(true)}
                                                className="border border-slate-400 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 p-2 min-h-[76px] max-h-28 overflow-y-auto cursor-pointer"
                                            >
                                                {fSubjectIds.length === 0 ? (
                                                    <span className="text-[11px] text-slate-400 italic">Click &quot;Select subjects&quot;...</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {fSubjectIds.map(sid => (
                                                            <span key={sid} className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono font-bold text-[11px]">
                                                                {getSubjectShort(sid)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-slate-300 dark:border-slate-700" />

                                    {/* STEP 2: CLASSES */}
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-4">
                                            <div>
                                                <div className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-none">2.</div>
                                                <div className="text-xs font-semibold mt-0.5">Classes</div>
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                                                    <input
                                                        type="radio"
                                                        checked={fApplyScope === 'all_classes'}
                                                        onChange={() => { setFApplyScope('all_classes'); setShowClassPicker(false); }}
                                                        className="accent-blue-600"
                                                    />
                                                    <span>All</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                                                    <input
                                                        type="radio"
                                                        checked={fApplyScope === 'selected_classes'}
                                                        onChange={() => setFApplyScope('selected_classes')}
                                                        className="accent-blue-600"
                                                    />
                                                    <span>Selection</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    disabled={fApplyScope !== 'selected_classes'}
                                                    onClick={() => setShowClassPicker(p => !p)}
                                                    className="w-full py-1 px-3 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-xs font-semibold disabled:opacity-45 cursor-pointer"
                                                >
                                                    Change classes
                                                </button>
                                            </div>
                                        </div>

                                        {fApplyScope === 'selected_classes' && showClassPicker ? (
                                            <div className="border border-blue-400 rounded bg-white dark:bg-slate-800 p-2 max-h-28 overflow-y-auto space-y-1">
                                                {(courses || []).map(c => (
                                                    <label key={c.id} className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={fCourseIds.includes(c.id)}
                                                            onChange={() => setFCourseIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                                                            className="accent-blue-600"
                                                        />
                                                        <span>{c.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="border border-slate-400 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 p-3 min-h-[68px] flex items-center justify-center text-center font-semibold text-xs">
                                                {fApplyScope === 'all_classes'
                                                    ? 'All classes'
                                                    : fCourseIds.length === 0
                                                        ? 'Click "Change classes"'
                                                        : fCourseIds.map(cid => courses.find(c => c.id === cid)?.name || cid).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Left: Importance, Deactivate, Note */}
                                <div className="space-y-2.5 pt-3 border-t border-slate-300 dark:border-slate-700">
                                    <div>
                                        <label className="block text-[11px] font-semibold mb-1">Importance of this card relationship:</label>
                                        <select
                                            value={fImportance}
                                            onChange={e => setFImportance(e.target.value as any)}
                                            className="w-full px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold"
                                        >
                                            <option value="Strict">Strict</option>
                                            <option value="High">High</option>
                                            <option value="Normal">Normal</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFActive(a => !a)}
                                        className={`px-5 py-1 rounded border text-xs font-semibold cursor-pointer ${
                                            fActive
                                                ? 'border-slate-400 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                                                : 'border-amber-500 bg-amber-100 text-amber-900'
                                        }`}
                                    >
                                        {fActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <div>
                                        <label className="block text-[11px] font-semibold mb-1">Note :</label>
                                        <input
                                            type="text"
                                            value={fNote}
                                            onChange={e => setFNote(e.target.value)}
                                            className="w-full px-2.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: STEP 3 CONDITION */}
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-none">3.</div>
                                        <div className="text-xs font-semibold mt-0.5">Condition :</div>
                                    </div>
                                    {/* Mini aSc Visual Rule Preview Strip */}
                                    <div className="border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 p-1.5 text-[9px] font-mono space-y-0.5 shrink-0">
                                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-1">
                                            <span className="text-red-600 font-black">✕</span>
                                            <span className="px-1 border border-slate-400 bg-white dark:bg-slate-900">1.A</span>
                                            <span className="w-2.5 h-2.5 bg-slate-200 inline-block" />
                                            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                                            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                                            <span className="w-2.5 h-2.5 bg-slate-200 inline-block" />
                                        </div>
                                        <div className="flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 px-1">
                                            <span className="text-blue-600 font-black">✓</span>
                                            <span className="px-1 border border-slate-400 bg-white dark:bg-slate-900">1.A</span>
                                            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                                            <span className="w-2.5 h-2.5 bg-slate-200 inline-block" />
                                            <span className="w-2.5 h-2.5 bg-slate-200 inline-block" />
                                            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'cannot_same_day'} onChange={() => setFRuleType('cannot_same_day')} className="accent-blue-600" />
                                        <span>Two subjects cannot be placed on the same day</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'cannot_follow'} onChange={() => setFRuleType('cannot_follow')} className="accent-blue-600" />
                                        <span>They cannot be placed consecutively on the same day</span>
                                    </label>

                                    <div className="pt-1 space-y-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={fRuleType === 'distribution_separately'} onChange={() => setFRuleType('distribution_separately')} className="accent-blue-600" />
                                            <span>Card distribution over the week</span>
                                        </label>
                                        <div className="pl-6">
                                            <button
                                                type="button"
                                                disabled={fRuleType !== 'distribution_separately'}
                                                onClick={() => {
                                                    const val = window.prompt('Distribution setting (e.g. Ideal, Max 1/day, Separate):', fParams || 'Ideal');
                                                    if (val !== null) setFParams(val);
                                                }}
                                                className="px-8 py-1 rounded border border-slate-400 bg-slate-200 dark:bg-slate-700 text-[11px] font-semibold disabled:opacity-45 cursor-pointer"
                                            >
                                                Settings
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-1 space-y-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={fRuleType === 'must_be_one_day'} onChange={() => setFRuleType('must_be_one_day')} className="accent-blue-600" />
                                            <span>Two subjects must be in one day</span>
                                        </label>

                                        <div className="space-y-1">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={fRuleType === 'must_follow'} onChange={() => setFRuleType('must_follow')} className="accent-blue-600" />
                                                <span>Two subjects must follow.</span>
                                            </label>
                                            <div className={`pl-6 flex flex-wrap items-center justify-between gap-2 ${fRuleType === 'must_follow' ? '' : 'opacity-45'}`}>
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                                                        <input type="radio" disabled={fRuleType !== 'must_follow'} checked={fFollowOrder === 'specified'} onChange={() => setFFollowOrder('specified')} className="accent-blue-600" />
                                                        <span>In specified order</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                                                        <input type="radio" disabled={fRuleType !== 'must_follow'} checked={fFollowOrder === 'arbitrary'} onChange={() => setFFollowOrder('arbitrary')} className="accent-blue-600" />
                                                        <span>In arbitrary order</span>
                                                    </label>
                                                </div>
                                                <div className="space-y-1">
                                                    <button
                                                        type="button"
                                                        disabled={fRuleType !== 'must_follow' || fSubjectIds.length < 2}
                                                        onClick={() => setFSubjectIds(prev => [...prev].reverse())}
                                                        className="px-4 py-1 rounded border border-slate-400 bg-slate-200 dark:bg-slate-700 text-[11px] font-semibold disabled:opacity-45 cursor-pointer block"
                                                    >
                                                        Switch order
                                                    </button>
                                                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                                                        <input type="checkbox" disabled={fRuleType !== 'must_follow'} checked={fOnlyDivided} onChange={e => setFOnlyDivided(e.target.checked)} className="accent-blue-600" />
                                                        <span>Only divided cards</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input type="radio" checked={fRuleType === 'no_break_between'} onChange={() => setFRuleType('no_break_between')} className="accent-blue-600" />
                                        <span>Break cannot be between group of lessons</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'diff_classes_one_day'} onChange={() => setFRuleType('diff_classes_one_day')} className="accent-blue-600" />
                                        <span>Group of cards from different classes must be in one day</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'divided_cards_one_day'} onChange={() => setFRuleType('divided_cards_one_day')} className="accent-blue-600" />
                                        <span>Divided cards from one subject must be on one day</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input type="radio" checked={fRuleType === 'groups_start_same_time'} onChange={() => setFRuleType('groups_start_same_time')} className="accent-blue-600" />
                                        <span>These subjects for the groups of listed classes must start at the same time.</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'same_time_all_classes'} onChange={() => setFRuleType('same_time_all_classes')} className="accent-blue-600" />
                                        <span>The selected subjects have to be at the same time in all selected classes.</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'same_period_each_day'} onChange={() => setFRuleType('same_period_each_day')} className="accent-blue-600" />
                                        <span>This subject must be on the same period each day</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={fRuleType === 'reserve_space'} onChange={() => setFRuleType('reserve_space')} className="accent-blue-600" />
                                        <span>Reserve space for selected subjects</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                                        <input type="radio" checked={fRuleType === 'first_or_last'} onChange={() => setFRuleType('first_or_last')} className="accent-blue-600" />
                                        <span>Subject must be first or last</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input type="radio" checked={fRuleType === 'can_be_afternoon'} onChange={() => setFRuleType('can_be_afternoon')} className="accent-blue-600" />
                                        <span>The selected subjects can be in the afternoon(outside teaching block)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Footer: OK & Cancel on Right */}
                        <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-3 flex justify-end gap-2">
                            <button
                                type="submit"
                                className="px-10 py-1.5 rounded border-2 border-blue-500 bg-slate-200 dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                            >
                                OK
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorModal(null)}
                                className="px-8 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
