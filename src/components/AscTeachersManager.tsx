import React, { useState, useMemo, useEffect } from 'react';
import type { User, Subject, Course, Room, TimetableEntry, TimetableSettings } from '../types';
import type { AscLessonRow } from './AscSubjectsManager';
import { generatePeriodLabels } from '../utils/timeUtils';
import { apiService } from '../services/apiService';

interface AscTeacherConstraints {
    limitWindowsWeek?: boolean;
    maxWindowsWeek?: number;
    limitDays?: boolean;
    maxDays?: number;
    noThreeWindowsInDay?: boolean;
    limitBuildingTransits?: boolean;
    maxTransitsPerDay?: string;
    maxTransitsPerWeek?: string;
    limitMinMaxPerDay?: boolean;
    minLessonsPerDay?: number;
    maxLessonsPerDay?: number;
    ignoreWeekendMinMax?: boolean;
    limitConsecutive?: boolean;
    maxConsecutive?: number;
    ignoreWeekendExhaustion?: boolean;
    maxQuestionMarked?: string;
    questionMarkedPerDay?: boolean;
}

interface AscTeacherPrefs {
    shortCode?: string;
    color?: string;
    timeOff?: Record<string, boolean>; // `${dayIdx}_${pIdx}` -> true = blocked (red)
    classTeacherOf?: string;           // short class label e.g. 4N
    maxPerDay?: number;
    maxConsecutive?: number;
    maxGapsPerDay?: number;
    constraints?: AscTeacherConstraints;
}

interface AscTeachersManagerProps {
    institutionId: string;
    lecturers: User[];
    subjects: Subject[];
    courses: Course[];
    rooms: Room[];
    timetableEntries?: TimetableEntry[];
    timetableSettings?: TimetableSettings;
    onAddUser?: (data: any) => Promise<void> | void;
    onEditUser?: (id: string, data: any) => Promise<void> | void;
    onDeleteUser?: (id: string) => Promise<void> | void;
    onSwitchTab?: (tab: 'cards' | 'subjects' | 'classes' | 'classrooms' | 'teachers' | 'relations') => void;
}

const TEACHER_COLORS = [
    '#4ade80', '#f472b6', '#0ea5e9', '#bae6fd', '#f87171', '#67e8f9',
    '#ef4444', '#991b1b', '#d9f99d', '#86efac', '#1d4ed8', '#ca8a04',
    '#fbcfe8', '#7f1d1d', '#0284c7', '#db2777', '#16a34a', '#fef08a',
    '#a78bfa', '#fb923c', '#2dd4bf', '#6366f1',
];

const getDefaultTeacherColor = (index: number) => TEACHER_COLORS[index % TEACHER_COLORS.length];

export const AscTeachersManager: React.FC<AscTeachersManagerProps> = ({
    institutionId,
    lecturers,
    subjects,
    courses,
    rooms,
    timetableEntries = [],
    timetableSettings,
    onAddUser,
    onEditUser,
    onDeleteUser,
    onSwitchTab,
}) => {
    const prefsKey = `eduai_asc_teacher_prefs_${institutionId || 'default'}`;
    const lessonsKey = `eduai_asc_lessons_${institutionId || 'default'}`;

    const [prefsMap, setPrefsMap] = useState<Record<string, AscTeacherPrefs>>(() => {
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
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => lecturers?.[0]?.id || '');

    // Modals
    const [editModal, setEditModal] = useState<{ mode: 'new' | 'edit'; teacher?: User } | null>(null);
    const [formName, setFormName] = useState('');
    const [formShort, setFormShort] = useState('');
    const [formColor, setFormColor] = useState('#4ade80');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formClassTeacherOf, setFormClassTeacherOf] = useState('');

    const [timeOffModalTeacher, setTimeOffModalTeacher] = useState<User | null>(null);
    const [constraintsModalTeacher, setConstraintsModalTeacher] = useState<User | null>(null);
    const [tcForm, setTcForm] = useState<AscTeacherConstraints>({
        limitWindowsWeek: false,
        maxWindowsWeek: 10,
        limitDays: false,
        maxDays: 5,
        noThreeWindowsInDay: false,
        limitBuildingTransits: false,
        maxTransitsPerDay: 'Arbitrary',
        maxTransitsPerWeek: 'Arbitrary',
        limitMinMaxPerDay: false,
        minLessonsPerDay: 0,
        maxLessonsPerDay: 8,
        ignoreWeekendMinMax: false,
        limitConsecutive: false,
        maxConsecutive: 5,
        ignoreWeekendExhaustion: false,
        maxQuestionMarked: 'Arbitrary',
        questionMarkedPerDay: false,
    });
    const [setForMoreMsg, setSetForMoreMsg] = useState<string>('');

    // Lessons for Teacher Modal + 5-row aSc Lesson Editor
    const [lessonsModalTeacher, setLessonsModalTeacher] = useState<User | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string>('');
    const [lessonSortAsc, setLessonSortAsc] = useState<boolean>(true);
    const [lessonEditorModal, setLessonEditorModal] = useState<{ mode: 'new' | 'edit' | 'add_more' | 'copy_to'; lesson?: AscLessonRow } | null>(null);
    const [lesSubjectId, setLesSubjectId] = useState<string>('');
    const [lesTeacherId, setLesTeacherId] = useState<string>('');
    const [lesExtraTeacherIds, setLesExtraTeacherIds] = useState<string[]>([]);
    const [showMoreTeachers, setShowMoreTeachers] = useState<boolean>(false);
    const [lesClassKeys, setLesClassKeys] = useState<string[]>([]);
    const [showJointClasses, setShowJointClasses] = useState<boolean>(false);
    const [lesCount, setLesCount] = useState<number>(6);
    const [lesLength, setLesLength] = useState<number>(1);
    const [showMoreWeeksTerms, setShowMoreWeeksTerms] = useState<boolean>(false);
    const [lesUseHomeRoom, setLesUseHomeRoom] = useState<boolean>(true);
    const [lesUseTeacherRooms, setLesUseTeacherRooms] = useState<boolean>(false);
    const [lesUseSharedRooms, setLesUseSharedRooms] = useState<boolean>(false);
    const [lesUseSubjectRooms, setLesUseSubjectRooms] = useState<boolean>(false);
    const [lesRoomId, setLesRoomId] = useState<string>('');
    const [lesExtraRoomIds, setLesExtraRoomIds] = useState<string[]>([]);
    const [showMoreRooms, setShowMoreRooms] = useState<boolean>(false);
    const [lesWeek, setLesWeek] = useState<string>('');
    const [lesTerm, setLesTerm] = useState<string>('');

    useEffect(() => {
        if (!selectedTeacherId && lecturers.length > 0) {
            setSelectedTeacherId(lecturers[0].id);
        }
    }, [lecturers, selectedTeacherId]);

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<{ id: string; prefs: Record<string, AscTeacherPrefs> }>('asc_teacher_prefs', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0 && recs[0]?.prefs) {
                    setPrefsMap(recs[0].prefs);
                    try { localStorage.setItem(prefsKey, JSON.stringify(recs[0].prefs)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<AscLessonRow>('asc_subject_lessons', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) setAscLessons(recs);
            })
            .catch(() => {});
    }, [institutionId, prefsKey]);

    const savePrefs = async (next: Record<string, AscTeacherPrefs>) => {
        setPrefsMap(next);
        try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch (_) {}
        await apiService.saveModuleRecord('asc_teacher_prefs', {
            id: `asc_tch_prefs_${institutionId}`,
            institutionId,
            prefs: next,
            updatedAt: new Date().toISOString(),
        }).catch(() => {});
    };

    const persistLessons = async (next: AscLessonRow[], savedItems?: AscLessonRow[]) => {
        setAscLessons(next);
        try { localStorage.setItem(lessonsKey, JSON.stringify(next)); } catch (_) {}
        if (savedItems && savedItems.length > 0) {
            for (const item of savedItems) {
                await apiService.saveModuleRecord('asc_subject_lessons', item).catch(() => {});
            }
        }
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

    const classOptions = useMemo(() => {
        const list: Array<{ key: string; courseId: string; levelId: string; label: string }> = [];
        (courses || []).forEach(c => {
            if (!c) return;
            const levels = Array.isArray(c.levels) && c.levels.length > 0 ? c.levels : [];
            if (levels.length === 0) {
                list.push({ key: `${c.id}::${c.id}`, courseId: c.id, levelId: c.id, label: c.code || c.name });
            } else {
                levels.forEach(l => {
                    if (!l) return;
                    const numMatch = (c.name || '').match(/\d+/);
                    const cleanStream = (l.name || '').replace(new RegExp(`^${c.name}\\s*[-–]?\\s*`, 'i'), '').trim();
                    const shortLabel = numMatch && cleanStream.length <= 12
                        ? `${numMatch[0]}${cleanStream.length <= 3 ? cleanStream.toUpperCase() : cleanStream[0].toUpperCase()}`
                        : l.name;
                    list.push({
                        key: `${c.id}::${l.id}`,
                        courseId: c.id,
                        levelId: String(l.id),
                        label: shortLabel || `${c.name} ${l.name}`,
                    });
                });
            }
        });
        return list;
    }, [courses]);

    const filteredTeachers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (lecturers || []).filter((t, idx) => {
            if (!t) return false;
            const short = prefsMap[t.id]?.shortCode || String(idx + 1).padStart(2, '0');
            return !q || `${t.name} ${short} ${t.email || ''}`.toLowerCase().includes(q);
        });
    }, [lecturers, search, prefsMap]);

    const selectedTeacher = useMemo(
        () => (lecturers || []).find(t => t && t.id === selectedTeacherId) || filteredTeachers[0] || null,
        [lecturers, selectedTeacherId, filteredTeachers]
    );

    const getTeacherLessonCount = (teacher: User): number => {
        const fromAsc = ascLessons
            .filter(l => l.teacherId === teacher.id || (l.teacherName || '').toLowerCase().includes((teacher.name || '').toLowerCase()))
            .reduce((s, l) => s + (Number(l.count) || 0) * (Number(l.length) || 1), 0);
        if (fromAsc > 0) return fromAsc;
        return (timetableEntries || []).filter(e => e && e.lecturerId === teacher.id).length;
    };

    const currentTeacherLessons = useMemo(() => {
        if (!lessonsModalTeacher) return [];
        const list = ascLessons.filter(l =>
            l.teacherId === lessonsModalTeacher.id ||
            (l.teacherName || '').toLowerCase().includes((lessonsModalTeacher.name || '').toLowerCase())
        );
        return [...list].sort((a, b) => {
            const sA = subjects.find(s => s.id === a.subjectId)?.name || a.subjectId;
            const sB = subjects.find(s => s.id === b.subjectId)?.name || b.subjectId;
            return lessonSortAsc ? sA.localeCompare(sB) : sB.localeCompare(sA);
        });
    }, [ascLessons, lessonsModalTeacher, subjects, lessonSortAsc]);

    const openNewModal = () => {
        const nextNum = String(lecturers.length + 1).padStart(2, '0');
        setFormName('');
        setFormShort(nextNum);
        setFormColor(getDefaultTeacherColor(lecturers.length));
        setFormEmail('');
        setFormPhone('');
        setFormClassTeacherOf('');
        setEditModal({ mode: 'new' });
    };

    const openEditModal = (teacher?: User | null, idx = 0) => {
        const target = teacher || selectedTeacher;
        if (!target) return;
        const p = prefsMap[target.id] || {};
        setFormName(target.name || '');
        setFormShort(p.shortCode || String(idx + 1).padStart(2, '0'));
        setFormColor(p.color || getDefaultTeacherColor(idx));
        setFormEmail(target.email || '');
        setFormPhone((target as any).phoneNumber || '');
        setFormClassTeacherOf(p.classTeacherOf || '');
        setEditModal({ mode: 'edit', teacher: target });
    };

    const handleSaveTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;
        if (editModal?.mode === 'new') {
            if (onAddUser) {
                const email = formEmail.trim() || `${formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@school.local`;
                await onAddUser({
                    name: formName.trim(),
                    email,
                    phoneNumber: formPhone.trim() || undefined,
                    role: 'teacher',
                    institutionId,
                });
            }
        } else if (editModal?.teacher) {
            const target = editModal.teacher;
            if (onEditUser && formName.trim() !== target.name) {
                await onEditUser(target.id, { name: formName.trim(), email: formEmail.trim() || target.email });
            }
            await savePrefs({
                ...prefsMap,
                [target.id]: {
                    ...(prefsMap[target.id] || {}),
                    shortCode: formShort.trim() || undefined,
                    color: formColor,
                    classTeacherOf: formClassTeacherOf.trim() || undefined,
                }
            });
        }
        setEditModal(null);
    };

    const handleRemoveSelected = async () => {
        if (!selectedTeacher || !onDeleteUser) return;
        if (!window.confirm(`Remove teacher "${selectedTeacher.name}"?`)) return;
        await onDeleteUser(selectedTeacher.id);
    };

    const toggleTimeOffCell = (teacherId: string, dayIdx: number, pIdx: number) => {
        const key = `${dayIdx}_${pIdx}`;
        const cur = prefsMap[teacherId] || {};
        const nextTimeOff = { ...(cur.timeOff || {}), [key]: !cur.timeOff?.[key] };
        savePrefs({ ...prefsMap, [teacherId]: { ...cur, timeOff: nextTimeOff } });
    };

    const toggleTimeOffRow = (teacherId: string, dayIdx: number) => {
        const cur = prefsMap[teacherId] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = Array.from({ length: periodCount }).every((_, pIdx) => Boolean(timeOff[`${dayIdx}_${pIdx}`]));
        for (let pIdx = 0; pIdx < periodCount; pIdx++) timeOff[`${dayIdx}_${pIdx}`] = !allBlocked;
        savePrefs({ ...prefsMap, [teacherId]: { ...cur, timeOff } });
    };

    const toggleTimeOffCol = (teacherId: string, pIdx: number) => {
        const cur = prefsMap[teacherId] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = operatingDays.every((_, dIdx) => Boolean(timeOff[`${dIdx}_${pIdx}`]));
        for (let dIdx = 0; dIdx < operatingDays.length; dIdx++) timeOff[`${dIdx}_${pIdx}`] = !allBlocked;
        savePrefs({ ...prefsMap, [teacherId]: { ...cur, timeOff } });
    };

    const openConstraints = () => {
        if (!selectedTeacher) return;
        const p = prefsMap[selectedTeacher.id] || {};
        const c = p.constraints || {};
        setTcForm({
            limitWindowsWeek: Boolean(c.limitWindowsWeek),
            maxWindowsWeek: c.maxWindowsWeek ?? 10,
            limitDays: Boolean(c.limitDays),
            maxDays: c.maxDays ?? 5,
            noThreeWindowsInDay: Boolean(c.noThreeWindowsInDay),
            limitBuildingTransits: Boolean(c.limitBuildingTransits),
            maxTransitsPerDay: c.maxTransitsPerDay || 'Arbitrary',
            maxTransitsPerWeek: c.maxTransitsPerWeek || 'Arbitrary',
            limitMinMaxPerDay: Boolean(c.limitMinMaxPerDay),
            minLessonsPerDay: c.minLessonsPerDay ?? 0,
            maxLessonsPerDay: c.maxLessonsPerDay ?? p.maxPerDay ?? 8,
            ignoreWeekendMinMax: Boolean(c.ignoreWeekendMinMax),
            limitConsecutive: Boolean(c.limitConsecutive),
            maxConsecutive: c.maxConsecutive ?? p.maxConsecutive ?? 5,
            ignoreWeekendExhaustion: Boolean(c.ignoreWeekendExhaustion),
            maxQuestionMarked: c.maxQuestionMarked || 'Arbitrary',
            questionMarkedPerDay: Boolean(c.questionMarkedPerDay),
        });
        setSetForMoreMsg('');
        setConstraintsModalTeacher(selectedTeacher);
    };

    const handleSaveConstraints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!constraintsModalTeacher) return;
        await savePrefs({
            ...prefsMap,
            [constraintsModalTeacher.id]: {
                ...(prefsMap[constraintsModalTeacher.id] || {}),
                maxPerDay: tcForm.maxLessonsPerDay,
                maxConsecutive: tcForm.maxConsecutive,
                constraints: { ...tcForm },
            }
        });
        setConstraintsModalTeacher(null);
    };

    const applyConstraintToAllTeachers = async (label: string, patch: Partial<AscTeacherConstraints>) => {
        if (!window.confirm(`Apply "${label}" setting to all ${lecturers.length} teacher(s)?`)) return;
        const nextMap = { ...prefsMap };
        lecturers.forEach(t => {
            const existing = nextMap[t.id] || {};
            nextMap[t.id] = {
                ...existing,
                constraints: { ...(existing.constraints || {}), ...patch },
            };
        });
        await savePrefs(nextMap);
        setSetForMoreMsg(`Applied "${label}" to all ${lecturers.length} teachers.`);
        setTimeout(() => setSetForMoreMsg(''), 3000);
    };

    const openTeacherLessonEditor = (mode: 'new' | 'edit' | 'add_more' | 'copy_to') => {
        if (!lessonsModalTeacher) return;
        const activeLesson = currentTeacherLessons.find(l => l.id === selectedLessonId) || currentTeacherLessons[0];
        if ((mode === 'edit' || mode === 'copy_to') && !activeLesson) return;

        setLesExtraTeacherIds([]);
        setShowMoreTeachers(false);
        setShowJointClasses(mode === 'copy_to' || mode === 'add_more');
        setShowMoreWeeksTerms(false);
        setShowMoreRooms(false);
        setLesExtraRoomIds([]);

        if ((mode === 'edit' || mode === 'copy_to') && activeLesson) {
            setLesSubjectId(activeLesson.subjectId);
            setLesTeacherId(activeLesson.teacherId || lessonsModalTeacher.id);
            setLesClassKeys(mode === 'edit' ? [`${activeLesson.courseId}::${activeLesson.levelId}`] : []);
            setLesCount(activeLesson.count);
            setLesLength(activeLesson.length);
            setLesUseHomeRoom(activeLesson.classroomMode === 'home');
            setLesUseTeacherRooms(false);
            setLesUseSharedRooms(false);
            setLesUseSubjectRooms(false);
            setLesRoomId(activeLesson.roomId || '');
            setLesWeek(activeLesson.week || '');
            setLesTerm(activeLesson.term || '');
            setLessonEditorModal({ mode, lesson: activeLesson });
        } else {
            setLesSubjectId(subjects[0]?.id || '');
            setLesTeacherId(lessonsModalTeacher.id);
            setLesClassKeys(mode === 'new' && classOptions[0] ? [classOptions[0].key] : []);
            setLesCount(6);
            setLesLength(1);
            setLesUseHomeRoom(true);
            setLesUseTeacherRooms(false);
            setLesUseSharedRooms(false);
            setLesUseSubjectRooms(false);
            setLesRoomId('');
            setLesWeek('');
            setLesTerm('');
            setLessonEditorModal({ mode });
        }
    };

    const handleSaveTeacherLessonEditor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lessonsModalTeacher || !lessonEditorModal) return;
        if (!lesSubjectId || lesClassKeys.length === 0) {
            alert('Select both a Subject and at least one Class.');
            return;
        }
        const primaryTeacher = lecturers.find(t => t.id === (lesTeacherId || lessonsModalTeacher.id)) || lessonsModalTeacher;
        const extraNames = lesExtraTeacherIds
            .filter(id => id !== primaryTeacher.id)
            .map(id => lecturers.find(t => t.id === id)?.name)
            .filter(Boolean);
        const combinedTeacherName = [primaryTeacher.name, ...extraNames].filter(Boolean).join(', ');

        const chosenRoomNames: string[] = [];
        if (lesRoomId) {
            const r = rooms.find(x => x.id === lesRoomId);
            if (r) chosenRoomNames.push(r.name);
        }
        lesExtraRoomIds.forEach(rid => {
            if (rid !== lesRoomId) {
                const r = rooms.find(x => x.id === rid);
                if (r) chosenRoomNames.push(r.name);
            }
        });
        if (lesUseSharedRooms && chosenRoomNames.length === 0) chosenRoomNames.push('Shared Room');
        if (lesUseSubjectRooms && chosenRoomNames.length === 0) chosenRoomNames.push('Subject Room');
        if (lesUseTeacherRooms && chosenRoomNames.length === 0) chosenRoomNames.push('Teacher Room');

        const effectiveRoomMode: 'home' | 'specific' = lesUseHomeRoom && chosenRoomNames.length === 0 ? 'home' : 'specific';
        const effectiveRoomName = chosenRoomNames.join(', ') || undefined;

        if (lessonEditorModal.mode === 'edit' && lessonEditorModal.lesson) {
            const firstCls = classOptions.find(c => c.key === lesClassKeys[0]);
            const jointLabels = lesClassKeys.map(k => classOptions.find(c => c.key === k)?.label || k).join(', ');
            const updated: AscLessonRow = {
                ...lessonEditorModal.lesson,
                subjectId: lesSubjectId,
                teacherId: primaryTeacher.id,
                teacherName: combinedTeacherName,
                courseId: firstCls?.courseId || lessonEditorModal.lesson.courseId,
                levelId: firstCls?.levelId || lessonEditorModal.lesson.levelId,
                classLabel: jointLabels,
                count: Math.max(1, Number(lesCount) || 1),
                length: Math.max(1, Math.min(8, Number(lesLength) || 1)),
                classroomMode: effectiveRoomMode,
                roomId: effectiveRoomMode === 'specific' ? (lesRoomId || undefined) : undefined,
                roomName: effectiveRoomMode === 'specific' ? effectiveRoomName : undefined,
                week: lesWeek.trim(),
                term: lesTerm.trim(),
            };
            await persistLessons(ascLessons.map(l => l.id === updated.id ? updated : l), [updated]);
            setSelectedLessonId(updated.id);
        } else if (lessonEditorModal.mode === 'new' && showJointClasses && lesClassKeys.length > 1) {
            const firstCls = classOptions.find(c => c.key === lesClassKeys[0]);
            const sub = subjects.find(s => s.id === lesSubjectId);
            const subShort = (sub?.code || sub?.name?.slice(0, 4) || '').toUpperCase();
            const jointLabels = `${lesClassKeys.map(k => classOptions.find(c => c.key === k)?.label || k).join(', ')} ${subShort}`.trim();
            const created: AscLessonRow = {
                id: `les_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId,
                subjectId: lesSubjectId,
                teacherId: primaryTeacher.id,
                teacherName: combinedTeacherName,
                courseId: firstCls?.courseId || '',
                levelId: firstCls?.levelId || '',
                classLabel: jointLabels,
                count: Math.max(1, Number(lesCount) || 1),
                length: Math.max(1, Math.min(8, Number(lesLength) || 1)),
                classroomMode: effectiveRoomMode,
                roomId: effectiveRoomMode === 'specific' ? (lesRoomId || undefined) : undefined,
                roomName: effectiveRoomMode === 'specific' ? effectiveRoomName : undefined,
                week: lesWeek.trim(),
                term: lesTerm.trim(),
                createdAt: new Date().toISOString(),
            };
            await persistLessons([created, ...ascLessons], [created]);
            setSelectedLessonId(created.id);
        } else {
            const created: AscLessonRow[] = lesClassKeys.map(ck => {
                const cls = classOptions.find(c => c.key === ck);
                return {
                    id: `les_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    institutionId,
                    subjectId: lesSubjectId,
                    teacherId: primaryTeacher.id,
                    teacherName: combinedTeacherName,
                    courseId: cls?.courseId || '',
                    levelId: cls?.levelId || '',
                    classLabel: cls?.label || ck,
                    count: Math.max(1, Number(lesCount) || 1),
                    length: Math.max(1, Math.min(8, Number(lesLength) || 1)),
                    classroomMode: effectiveRoomMode,
                    roomId: effectiveRoomMode === 'specific' ? (lesRoomId || undefined) : undefined,
                    roomName: effectiveRoomMode === 'specific' ? effectiveRoomName : undefined,
                    week: lesWeek.trim(),
                    term: lesTerm.trim(),
                    createdAt: new Date().toISOString(),
                };
            });
            await persistLessons([...created, ...ascLessons], created);
            if (created[0]) setSelectedLessonId(created[0].id);
        }
        setLessonEditorModal(null);
    };

    const handleRemoveTeacherLesson = () => {
        if (!selectedLessonId) return;
        const target = currentTeacherLessons.find(l => l.id === selectedLessonId);
        if (!target) return;
        const subName = subjects.find(s => s.id === target.subjectId)?.name || target.subjectId;
        if (!window.confirm(`Remove lesson ${subName} (${target.classLabel})?`)) return;
        persistLessons(ascLessons.filter(l => l.id !== selectedLessonId));
        setSelectedLessonId('');
    };

    const renderMiniTimeOff = (teacher: User) => {
        const timeOff = prefsMap[teacher.id]?.timeOff || {};
        return (
            <div
                onClick={e => {
                    e.stopPropagation();
                    setSelectedTeacherId(teacher.id);
                    setTimeOffModalTeacher(teacher);
                }}
                title="Click to edit Teacher Time-Off (Green = Available, Red = Unavailable)"
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
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Teachers ({filteredTeachers.length})
                    </span>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter teachers by name or short code..."
                    className="w-64 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                />
            </div>

            {/* 3-Column aSc Workspace */}
            <div className="flex flex-col md:flex-row">
                {/* Left Vertical aSc Icon Rail */}
                <div className="flex md:flex-col items-center justify-center md:justify-start gap-2 p-2.5 bg-slate-200/70 dark:bg-slate-800/80 border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 md:w-20 shrink-0">
                    {[
                        { id: 'subjects', label: 'Subjects', icon: '📘', active: false },
                        { id: 'classes', label: 'Classes', icon: '👥', active: false },
                        { id: 'classrooms', label: 'Rooms', icon: '🚪', active: false },
                        { id: 'teachers', label: 'Teachers', icon: '🎓', active: true },
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

                {/* Center Teachers Table */}
                <div className="flex-1 p-3 overflow-x-auto">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Enter teachers :
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden min-h-[380px] max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs select-none">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                <tr>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700">Name</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-20">Short</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-16 text-right">Count</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-24 text-center">Time off</th>
                                    <th className="py-1.5 px-2.5 w-32">Class teacher</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredTeachers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400">
                                            No teachers found. Click <strong>+ New</strong> on the right to add a teacher.
                                        </td>
                                    </tr>
                                ) : filteredTeachers.map((teacher, idx) => {
                                    const isSel = selectedTeacher?.id === teacher.id;
                                    const p = prefsMap[teacher.id] || {};
                                    const short = p.shortCode || String(idx + 1).padStart(2, '0');
                                    const color = p.color || getDefaultTeacherColor(idx);
                                    const count = getTeacherLessonCount(teacher);

                                    return (
                                        <tr
                                            key={teacher.id}
                                            onClick={() => setSelectedTeacherId(teacher.id)}
                                            onDoubleClick={() => openEditModal(teacher, idx)}
                                            className={`cursor-pointer transition-colors ${
                                                isSel
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : idx % 2 === 0
                                                        ? 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                                        : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                            }`}
                                        >
                                            <td className="py-1.5 px-2.5 flex items-center gap-2">
                                                <span className="text-sm leading-none">🎓</span>
                                                <span
                                                    style={{ backgroundColor: color }}
                                                    className="inline-block w-3.5 h-3.5 rounded-[2px] border border-black/25 shrink-0"
                                                />
                                                <span className="truncate">{teacher.name}</span>
                                            </td>
                                            <td className="py-1.5 px-2.5 font-mono">{short}</td>
                                            <td className="py-1.5 px-2.5 text-right font-mono">{count}</td>
                                            <td className="py-1 px-2 text-center">{renderMiniTimeOff(teacher)}</td>
                                            <td className="py-1.5 px-2.5 font-bold uppercase truncate">{p.classTeacherOf || ''}</td>
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
                        disabled={!selectedTeacher}
                        onClick={() => {
                            const idx = filteredTeachers.findIndex(t => t.id === selectedTeacher?.id);
                            openEditModal(selectedTeacher, idx >= 0 ? idx : 0);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🎓</span> Edit
                    </button>
                    <button
                        type="button"
                        disabled={!selectedTeacher || !onDeleteUser}
                        onClick={handleRemoveSelected}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[11px]">−</span>
                        Remove
                    </button>

                    <div className="hidden md:block my-2 border-t border-slate-300 dark:border-slate-700" />

                    <button
                        type="button"
                        disabled={!selectedTeacher}
                        onClick={() => {
                            if (selectedTeacher) {
                                setSelectedLessonId('');
                                setLessonsModalTeacher(selectedTeacher);
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 border-2 border-blue-500 text-xs font-black text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>📚</span> Lessons
                    </button>
                    <button
                        type="button"
                        disabled={!selectedTeacher}
                        onClick={() => selectedTeacher && setTimeOffModalTeacher(selectedTeacher)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🕒</span> Time off
                    </button>
                    <button
                        type="button"
                        disabled={!selectedTeacher}
                        onClick={openConstraints}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="text-purple-600 font-black">#</span> Constraints
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="bg-slate-200/80 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => alert('Select any teacher to view/assign their Lessons, set Time Off (e.g. off-duty days or mornings), customize their color swatch/short code, or configure daily load constraints.')}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        ❓ Help
                    </button>
                    <button
                        type="button"
                        onClick={() => savePrefs(prefsMap)}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        💾 Save
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => onSwitchTab?.('cards')}
                    className="px-6 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-blue-50 border-2 border-blue-500 text-xs font-black text-slate-800 dark:text-white shadow-sm cursor-pointer"
                >
                    Close
                </button>
            </div>

            {/* MODAL 1: NEW / EDIT TEACHER */}
            {editModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveTeacher} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            {editModal.mode === 'new' ? 'New Teacher' : `Edit Teacher — ${editModal.teacher?.name}`}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Teacher Name *</label>
                                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. MRS. KIMOSOP" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Short / Code</label>
                                <input type="text" maxLength={8} value={formShort} onChange={e => setFormShort(e.target.value)} placeholder="05" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-black" />
                            </div>
                        </div>
                        {editModal.mode === 'new' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Email (Optional)</label>
                                    <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="teacher@school.ac.ke" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Phone (Optional)</label>
                                    <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="0712345678" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Card Color</label>
                                <input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} className="w-full h-9 rounded-lg border border-slate-300 cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Class Teacher Of</label>
                                <select value={formClassTeacherOf} onChange={e => setFormClassTeacherOf(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">None</option>
                                    {classOptions.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase cursor-pointer">OK</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 2: aSc "LESSONS FOR TEACHER" WINDOW */}
            {lessonsModalTeacher && (() => {
                const activeLesson = currentTeacherLessons.find(l => l.id === selectedLessonId) || null;
                const badgeColors = ['#f472b6', '#16a34a', '#a3e635', '#e879f9', '#4ade80', '#fb923c', '#991b1b', '#eab308', '#2563eb', '#0ea5e9'];
                return (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                                    <span>📋</span>
                                    <span>Lessons for teacher</span>
                                </div>
                                <button type="button" onClick={() => setLessonsModalTeacher(null)} className="px-2 py-0.5 rounded hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-sm cursor-pointer">×</button>
                            </div>

                            <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-3 flex items-center gap-3.5 border-b border-slate-300 dark:border-slate-700">
                                <div className="w-11 h-11 rounded-lg bg-slate-800 text-white flex items-center justify-center text-2xl shadow-xs shrink-0">🎓</div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                                        {lessonsModalTeacher.name}
                                    </h3>
                                    <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                        {currentTeacherLessons.reduce((s, l) => s + l.count * l.length, 0)} total periods / week
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 bg-white dark:bg-slate-900 overflow-auto min-h-[300px] border-b border-slate-300 dark:border-slate-700">
                                <table className="w-full text-left border-collapse text-xs select-none">
                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                        <tr>
                                            <th onClick={() => setLessonSortAsc(p => !p)} className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-44 cursor-pointer">Subject {lessonSortAsc ? '▲' : '▼'}</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-44">Teacher</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-36">Class</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-16 text-center">Count</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-16 text-center">Length</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-24">Classrooms</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-16">Week</th>
                                            <th className="py-1.5 px-3 w-16">Term</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {currentTeacherLessons.length === 0 ? (
                                            <tr><td colSpan={8} className="p-12 text-center text-slate-400">No lessons assigned to <strong>{lessonsModalTeacher.name}</strong> yet. Click <strong>New lesson</strong> below.</td></tr>
                                        ) : currentTeacherLessons.map((les, idx) => {
                                            const sub = subjects.find(s => s.id === les.subjectId);
                                            const subName = sub?.name || les.subjectId;
                                            const subCode = (sub?.code || subName.slice(0, 3)).toUpperCase();
                                            const isSel = selectedLessonId === les.id;
                                            const badgeBg = badgeColors[idx % badgeColors.length];
                                            const darkText = ['#a3e635', '#4ade80', '#eab308', '#fb923c', '#f472b6'].includes(badgeBg);
                                            return (
                                                <tr
                                                    key={les.id}
                                                    onClick={() => setSelectedLessonId(les.id)}
                                                    onDoubleClick={() => { setSelectedLessonId(les.id); openTeacherLessonEditor('edit'); }}
                                                    className={`cursor-pointer transition-colors ${isSel ? 'bg-blue-600 text-white font-bold' : idx % 2 === 0 ? 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50' : 'bg-white dark:bg-slate-900 hover:bg-blue-50'}`}
                                                >
                                                    <td className="py-1.5 px-3 flex items-center gap-2.5">
                                                        <span style={{ backgroundColor: badgeBg, color: darkText ? '#0f172a' : '#ffffff' }} className="w-8 h-6 rounded-xs border border-black/25 flex items-center justify-center font-black text-[9px] shrink-0">{subCode}</span>
                                                        <span className="uppercase truncate">{subName}</span>
                                                    </td>
                                                    <td className="py-1.5 px-3 truncate">{les.teacherName}</td>
                                                    <td className="py-1.5 px-3 font-bold truncate">{les.classLabel}</td>
                                                    <td className="py-1.5 px-3 text-center font-mono">{les.count}</td>
                                                    <td className="py-1.5 px-3 text-center font-mono">{les.length}</td>
                                                    <td className="py-1.5 px-3">{les.classroomMode === 'home' ? <span className="text-sm">🏠</span> : <span className="truncate">{les.roomName || 'Room'}</span>}</td>
                                                    <td className="py-1.5 px-3 text-[11px]">{les.week}</td>
                                                    <td className="py-1.5 px-3 text-[11px]">{les.term}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => openTeacherLessonEditor('new')} className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-blue-50 border-2 border-blue-500 text-xs font-black cursor-pointer">New lesson</button>
                                    <button type="button" disabled={!activeLesson} onClick={() => openTeacherLessonEditor('edit')} className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold disabled:opacity-40 cursor-pointer">Edit lesson</button>
                                    <button type="button" disabled={!activeLesson} onClick={handleRemoveTeacherLesson} className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold disabled:opacity-40 cursor-pointer">Remove</button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" disabled={!activeLesson} onClick={() => openTeacherLessonEditor('copy_to')} className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold disabled:opacity-40 cursor-pointer">Copy to</button>
                                    <button type="button" onClick={() => openTeacherLessonEditor('add_more')} className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">Add more</button>
                                </div>
                                <button type="button" onClick={() => setLessonsModalTeacher(null)} className="px-6 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-black cursor-pointer">Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* SUB-MODAL: 5-ROW aSc LESSON DIALOG */}
            {lessonEditorModal && lessonsModalTeacher && (() => {
                const sharedRoomNames = (rooms || []).filter(r => /lab|fld|field|hall|comp/i.test(`${r.name} ${(r as any).type || ''}`)).slice(0, 3).map(r => r.name).join(', ');
                return (
                    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <form onSubmit={handleSaveTeacherLessonEditor} className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-2xl shadow-2xl overflow-hidden">
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold">Lesson</span>
                                <button type="button" onClick={() => setLessonEditorModal(null)} className="px-2 py-0.5 rounded hover:bg-rose-100 font-black text-sm cursor-pointer">×</button>
                            </div>
                            <div className="p-3.5 space-y-2.5 max-h-[78vh] overflow-y-auto">
                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">🎓</div>
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-xs font-semibold">Teacher</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select value={lesTeacherId} onChange={e => setLesTeacherId(e.target.value)} className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold">
                                                {lecturers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <button type="button" onClick={() => setShowMoreTeachers(p => !p)} className={`px-4 py-1.5 rounded border text-xs font-semibold cursor-pointer ${showMoreTeachers ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-100 dark:bg-slate-700 border-slate-400'}`}>More teachers</button>
                                        </div>
                                        {showMoreTeachers && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {lecturers.filter(t => t.id !== lesTeacherId).map(t => {
                                                    const picked = lesExtraTeacherIds.includes(t.id);
                                                    return <button key={t.id} type="button" onClick={() => setLesExtraTeacherIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${picked ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 border border-slate-300'}`}>{t.name}</button>;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-center gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">📘</div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="block text-xs font-semibold">Subject</label>
                                        <select value={lesSubjectId} onChange={e => setLesSubjectId(e.target.value)} className="w-full max-w-sm px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold uppercase">
                                            {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">👥</div>
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-xs font-semibold">Class</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {!showJointClasses ? (
                                                <select value={lesClassKeys[0] || ''} onChange={e => setLesClassKeys(e.target.value ? [e.target.value] : [])} className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold">
                                                    <option value=""></option>
                                                    {classOptions.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                                </select>
                                            ) : (
                                                <div className="flex-1 min-w-[200px] flex flex-wrap gap-1.5 p-2 rounded border border-slate-300 bg-slate-50 dark:bg-slate-900 max-h-24 overflow-y-auto">
                                                    {classOptions.map(c => {
                                                        const picked = lesClassKeys.includes(c.key);
                                                        return <button key={c.key} type="button" onClick={() => setLesClassKeys(prev => prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key])} className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${picked ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-300'}`}>{c.label}</button>;
                                                    })}
                                                </div>
                                            )}
                                            <button type="button" onClick={() => setShowJointClasses(p => !p)} className={`px-4 py-1.5 rounded border text-xs font-semibold cursor-pointer ${showJointClasses ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-100 dark:bg-slate-700 border-slate-400'}`}>Joint classes</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">📅</div>
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-xs font-semibold">Lessons/week</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select value={lesCount} onChange={e => setLesCount(Number(e.target.value) || 1)} className="w-36 px-2.5 py-1.5 rounded border border-slate-400 bg-white dark:bg-slate-900 text-xs font-bold">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                            <select value={lesLength} onChange={e => setLesLength(Number(e.target.value) || 1)} className="w-36 px-2.5 py-1.5 rounded border border-slate-400 bg-white dark:bg-slate-900 text-xs font-bold">
                                                <option value={1}>Single</option>
                                                <option value={2}>Double</option>
                                                <option value={3}>Triple</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                                <option value={6}>6</option>
                                                <option value={7}>7</option>
                                                <option value={8}>8</option>
                                            </select>
                                            <button type="button" onClick={() => setShowMoreWeeksTerms(p => !p)} className="text-xs font-semibold hover:text-blue-600 hover:underline ml-auto cursor-pointer">More weeks/terms</button>
                                        </div>
                                        {showMoreWeeksTerms && (
                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                <input type="text" value={lesWeek} onChange={e => setLesWeek(e.target.value)} placeholder="Week" className="px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50 dark:bg-slate-900 text-xs" />
                                                <input type="text" value={lesTerm} onChange={e => setLesTerm(e.target.value)} placeholder="Term" className="px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50 dark:bg-slate-900 text-xs" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">🚪</div>
                                    <div className="flex-1 space-y-2.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lesUseHomeRoom} onChange={e => setLesUseHomeRoom(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" /><span>Home classroom</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lesUseTeacherRooms} onChange={e => setLesUseTeacherRooms(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" /><span>Teacher&apos;s classrooms</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lesUseSharedRooms} onChange={e => setLesUseSharedRooms(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" /><span className="truncate">Shared room {sharedRoomNames || 'LAB 1, FLD, LAB 2'}</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lesUseSubjectRooms} onChange={e => setLesUseSubjectRooms(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" /><span>Subject&apos;s classrooms</span></label>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <select value={lesRoomId} onChange={e => { setLesRoomId(e.target.value); if (e.target.value) setLesUseHomeRoom(false); }} className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-400 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
                                                <option value="">Other available classrooms</option>
                                                {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                            <button type="button" onClick={() => setShowMoreRooms(p => !p)} className={`px-4 py-1.5 rounded border text-xs font-semibold cursor-pointer ${showMoreRooms ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-100 dark:bg-slate-700 border-slate-400'}`}>More classrooms</button>
                                        </div>
                                        {showMoreRooms && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {(rooms || []).filter(r => r.id !== lesRoomId).map(r => {
                                                    const picked = lesExtraRoomIds.includes(r.id);
                                                    return <button key={r.id} type="button" onClick={() => setLesExtraRoomIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])} className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${picked ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 border border-slate-300'}`}>{r.name}</button>;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setLessonEditorModal(null)} className="px-6 py-1.5 rounded border border-slate-400 bg-white dark:bg-slate-700 text-xs font-semibold cursor-pointer">Cancel</button>
                                    <button type="button" onClick={() => alert('Choose Teacher, Subject, Class, Lessons/week, and Classroom preferences, then click OK.')} className="px-6 py-1.5 rounded border border-slate-400 bg-white dark:bg-slate-700 text-xs font-semibold cursor-pointer">Help</button>
                                </div>
                                <button type="submit" className="px-14 py-1.5 rounded border-2 border-blue-500 bg-slate-200 dark:bg-blue-600 hover:bg-blue-50 text-xs font-bold text-slate-900 dark:text-white cursor-pointer">OK</button>
                            </div>
                        </form>
                    </div>
                );
            })()}

            {/* MODAL 3: TEACHER TIME OFF */}
            {timeOffModalTeacher && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-2xl shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Time Off — {timeOffModalTeacher.name}</h3>
                                <p className="text-[11px] text-slate-500">Click cells, days, or period numbers to toggle Available (Green ✓) vs Unavailable (Red ×).</p>
                            </div>
                            <button type="button" onClick={() => setTimeOffModalTeacher(null)} className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-black cursor-pointer">Done</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center text-xs select-none">
                                <thead>
                                    <tr>
                                        <th className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900">Day / Period</th>
                                        {Array.from({ length: periodCount }).map((_, pIdx) => (
                                            <th key={pIdx} onClick={() => toggleTimeOffCol(timeOffModalTeacher.id, pIdx)} className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-100 cursor-pointer font-black">{pIdx + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {operatingDays.map((day, dIdx) => (
                                        <tr key={day}>
                                            <td onClick={() => toggleTimeOffRow(timeOffModalTeacher.id, dIdx)} className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-left hover:bg-indigo-100 cursor-pointer">{day}</td>
                                            {Array.from({ length: periodCount }).map((_, pIdx) => {
                                                const blocked = Boolean(prefsMap[timeOffModalTeacher.id]?.timeOff?.[`${dIdx}_${pIdx}`]);
                                                return (
                                                    <td key={pIdx} onClick={() => toggleTimeOffCell(timeOffModalTeacher.id, dIdx, pIdx)} className={`p-2 border border-slate-300 dark:border-slate-600 font-black cursor-pointer ${blocked ? 'bg-red-500 text-white' : 'bg-lime-500 text-slate-950'}`}>
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

            {/* MODAL 4: AUTHENTIC aSc "TEACHER / CONSTRAINTS" DIALOG */}
            {constraintsModalTeacher && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSaveConstraints}
                        className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-4xl shadow-2xl overflow-hidden"
                    >
                        {/* Title Bar */}
                        <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                Teacher / Constraints - {constraintsModalTeacher.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => setConstraintsModalTeacher(null)}
                                className="px-2 py-0.5 rounded hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-sm cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs text-slate-800 dark:text-slate-200">
                            {/* Teacher Name & Contract Summary */}
                            <div className="grid grid-cols-[120px_1fr] gap-y-0.5 text-xs">
                                <span className="font-semibold text-slate-600 dark:text-slate-400">Name of teacher :</span>
                                <span className="font-bold text-slate-900 dark:text-white">{constraintsModalTeacher.name}</span>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">Contract :</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">{getTeacherLessonCount(constraintsModalTeacher)}</span>
                            </div>

                            {setForMoreMsg && (
                                <div className="px-3 py-1.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
                                    ✓ {setForMoreMsg}
                                </div>
                            )}

                            {/* 2-Column aSc Constraint Boxes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {/* LEFT COLUMN */}
                                <div className="space-y-3">
                                    {/* Box 1: Limit number of windows in timetable per week */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 space-y-2">
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.limitWindowsWeek)}
                                                onChange={e => setTcForm(p => ({ ...p, limitWindowsWeek: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                            <span>Limit number of windows in timetable per week</span>
                                        </label>
                                        <div className={`flex flex-wrap items-center gap-2 ${tcForm.limitWindowsWeek ? '' : 'opacity-50'}`}>
                                            <span>Maximum number of windows in</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={30}
                                                disabled={!tcForm.limitWindowsWeek}
                                                value={tcForm.maxWindowsWeek ?? 10}
                                                onChange={e => setTcForm(p => ({ ...p, maxWindowsWeek: Math.max(0, Number(e.target.value) || 0) }))}
                                                className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => applyConstraintToAllTeachers('Max windows/week', { limitWindowsWeek: tcForm.limitWindowsWeek, maxWindowsWeek: tcForm.maxWindowsWeek })}
                                                className="ml-auto px-3.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-semibold cursor-pointer"
                                            >
                                                Set for more
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-snug">
                                            E.g. The teacher has three windows in the timetable if he has a 2nd and then 6th lesson.
                                        </p>
                                    </div>

                                    {/* Box 2: Limit number of days */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 space-y-2">
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.limitDays)}
                                                onChange={e => setTcForm(p => ({ ...p, limitDays: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                            <span>Limit number of days</span>
                                        </label>
                                        <div className={`flex flex-wrap items-center gap-2 ${tcForm.limitDays ? '' : 'opacity-50'}`}>
                                            <span>Number of days taught by teacher :</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={7}
                                                disabled={!tcForm.limitDays}
                                                value={tcForm.maxDays ?? 5}
                                                onChange={e => setTcForm(p => ({ ...p, maxDays: Math.max(1, Number(e.target.value) || 1) }))}
                                                className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => applyConstraintToAllTeachers('Limit number of days', { limitDays: tcForm.limitDays, maxDays: tcForm.maxDays })}
                                                className="ml-auto px-3.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-semibold cursor-pointer"
                                            >
                                                Set for more
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-snug">
                                            Here you can limit number of days, when the teacher should teach. Generator finds the days in the given number.
                                        </p>
                                    </div>

                                    {/* Box 3: Cannot have 3 windows in one day */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 flex items-center justify-between gap-3">
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.noThreeWindowsInDay)}
                                                onChange={e => setTcForm(p => ({ ...p, noThreeWindowsInDay: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600 shrink-0"
                                            />
                                            <span>The teacher cannot have a 3 windows in one day.</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => applyConstraintToAllTeachers('No 3 windows in one day', { noThreeWindowsInDay: tcForm.noThreeWindowsInDay })}
                                            className="px-3.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-semibold shrink-0 cursor-pointer"
                                        >
                                            Set for more
                                        </button>
                                    </div>

                                    {/* Box 4: Maximum number of transits between buildings */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 space-y-2">
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.limitBuildingTransits)}
                                                onChange={e => setTcForm(p => ({ ...p, limitBuildingTransits: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                            <span>Maximum number of transits between the buildings per day</span>
                                        </label>
                                        <div className={`space-y-2 ${tcForm.limitBuildingTransits ? '' : 'opacity-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <span className="w-16">Per day</span>
                                                <select
                                                    disabled={!tcForm.limitBuildingTransits}
                                                    value={tcForm.maxTransitsPerDay || 'Arbitrary'}
                                                    onChange={e => setTcForm(p => ({ ...p, maxTransitsPerDay: e.target.value }))}
                                                    className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                >
                                                    <option value="Arbitrary">Arbitrary</option>
                                                    <option value="0">0</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => applyConstraintToAllTeachers('Building transits', { limitBuildingTransits: tcForm.limitBuildingTransits, maxTransitsPerDay: tcForm.maxTransitsPerDay, maxTransitsPerWeek: tcForm.maxTransitsPerWeek })}
                                                    className="ml-auto px-3.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-semibold cursor-pointer"
                                                >
                                                    Set for more
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="w-16">Per week</span>
                                                <select
                                                    disabled={!tcForm.limitBuildingTransits}
                                                    value={tcForm.maxTransitsPerWeek || 'Arbitrary'}
                                                    onChange={e => setTcForm(p => ({ ...p, maxTransitsPerWeek: e.target.value }))}
                                                    className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                                                >
                                                    <option value="Arbitrary">Arbitrary</option>
                                                    <option value="0">0</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                    <option value="5">5</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="space-y-3">
                                    {/* Box 5: Set min./max. number of lessons per day */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 space-y-2">
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.limitMinMaxPerDay)}
                                                onChange={e => setTcForm(p => ({ ...p, limitMinMaxPerDay: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                            <span>Set min./max. number of lessons per day</span>
                                        </label>
                                        <div className={`space-y-2 ${tcForm.limitMinMaxPerDay ? '' : 'opacity-50'}`}>
                                            <p className="text-[11px] text-slate-500">Number of lessons per day must be in this interval:</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={15}
                                                    disabled={!tcForm.limitMinMaxPerDay}
                                                    value={tcForm.minLessonsPerDay ?? 0}
                                                    onChange={e => setTcForm(p => ({ ...p, minLessonsPerDay: Math.max(0, Number(e.target.value) || 0) }))}
                                                    className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                                                />
                                                <span>-</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    disabled={!tcForm.limitMinMaxPerDay}
                                                    value={tcForm.maxLessonsPerDay ?? 8}
                                                    onChange={e => setTcForm(p => ({ ...p, maxLessonsPerDay: Math.max(1, Number(e.target.value) || 1) }))}
                                                    className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => applyConstraintToAllTeachers('Min/Max lessons per day', { limitMinMaxPerDay: tcForm.limitMinMaxPerDay, minLessonsPerDay: tcForm.minLessonsPerDay, maxLessonsPerDay: tcForm.maxLessonsPerDay, ignoreWeekendMinMax: tcForm.ignoreWeekendMinMax })}
                                                    className="ml-auto px-3.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-semibold cursor-pointer"
                                                >
                                                    Set for more
                                                </button>
                                            </div>
                                            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    disabled={!tcForm.limitMinMaxPerDay}
                                                    checked={Boolean(tcForm.ignoreWeekendMinMax)}
                                                    onChange={e => setTcForm(p => ({ ...p, ignoreWeekendMinMax: e.target.checked }))}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>Do not check min and max during weekend.</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Box 6: Limit number of consecutive lessons */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 space-y-2">
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.limitConsecutive)}
                                                onChange={e => setTcForm(p => ({ ...p, limitConsecutive: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                            <span>Limit number of consecutive lessons</span>
                                        </label>
                                        <div className={`space-y-2 ${tcForm.limitConsecutive ? '' : 'opacity-50'}`}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span>Max. number of consecutive</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    disabled={!tcForm.limitConsecutive}
                                                    value={tcForm.maxConsecutive ?? 5}
                                                    onChange={e => setTcForm(p => ({ ...p, maxConsecutive: Math.max(1, Number(e.target.value) || 1) }))}
                                                    className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => applyConstraintToAllTeachers('Max consecutive lessons', { limitConsecutive: tcForm.limitConsecutive, maxConsecutive: tcForm.maxConsecutive, ignoreWeekendExhaustion: tcForm.ignoreWeekendExhaustion })}
                                                    className="ml-auto px-3.5 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-semibold cursor-pointer"
                                                >
                                                    Set for more
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-snug">
                                                This parameter limits the number of consecutive periods taught by the teacher.
                                            </p>
                                            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    disabled={!tcForm.limitConsecutive}
                                                    checked={Boolean(tcForm.ignoreWeekendExhaustion)}
                                                    onChange={e => setTcForm(p => ({ ...p, ignoreWeekendExhaustion: e.target.checked }))}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>Do not check exhaustion on Saturday and Sunday</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Box 7: Max on question marked */}
                                    <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 bg-white/70 dark:bg-slate-800/60 space-y-2.5">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold">Max. on the question marked :</span>
                                            <select
                                                value={tcForm.maxQuestionMarked || 'Arbitrary'}
                                                onChange={e => setTcForm(p => ({ ...p, maxQuestionMarked: e.target.value }))}
                                                className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                                            >
                                                <option value="Arbitrary">Arbitrary</option>
                                                <option value="0">0</option>
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                            </select>
                                        </div>
                                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(tcForm.questionMarkedPerDay)}
                                                onChange={e => setTcForm(p => ({ ...p, questionMarkedPerDay: e.target.checked }))}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                            <span>Max. number on questionmarked consider per day.</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Centered OK & Cancel */}
                        <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center justify-center gap-3">
                            <button
                                type="submit"
                                className="px-10 py-1.5 rounded border-2 border-blue-500 bg-slate-200 dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                            >
                                OK
                            </button>
                            <button
                                type="button"
                                onClick={() => setConstraintsModalTeacher(null)}
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
