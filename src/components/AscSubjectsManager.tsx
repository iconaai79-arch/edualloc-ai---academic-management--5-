import React, { useState, useMemo, useEffect } from 'react';
import type { Subject, Department, Room, Course, TimetableEntry, TimetableSettings, AllocationRequest, User } from '../types';
import { generatePeriodLabels } from '../utils/timeUtils';
import { apiService } from '../services/apiService';

export interface AscLessonRow {
    id: string;
    institutionId: string;
    subjectId: string;
    teacherId: string;
    teacherName: string;
    courseId: string;
    levelId: string;
    classLabel: string;
    count: number;   // lessons per week
    length: number;  // 1 = Single, 2 = Double, 3 = Triple
    classroomMode: 'home' | 'specific';
    roomId?: string;
    roomName?: string;
    week: string;    // '' (Every week) or 'Week A' / 'Week B'
    term: string;    // '' (All terms) or 'Term 1' etc.
    createdAt: string;
}

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
    lecturers?: User[];
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
    lecturers = [],
    timetableEntries = [],
    allocations = [],
    timetableSettings,
    onAddSubject,
    onUpdateSubject,
    onDeleteSubject,
    onSwitchTab,
}) => {
    const prefsKey = `eduai_asc_subject_prefs_${institutionId || 'default'}`;
    const lessonsKey = `eduai_asc_lessons_${institutionId || 'default'}`;
    const [prefsMap, setPrefsMap] = useState<Record<string, AscSubjectPrefs>>(() => {
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
    const [selectedLessonId, setSelectedLessonId] = useState<string>('');
    const [lessonSortAsc, setLessonSortAsc] = useState<boolean>(true);
    const [lessonEditorModal, setLessonEditorModal] = useState<{ mode: 'new' | 'edit' | 'add_more' | 'copy_to'; lesson?: AscLessonRow } | null>(null);
    const [lesSubjectId, setLesSubjectId] = useState<string>('');
    const [lesTeacherId, setLesTeacherId] = useState<string>('');
    const [lesExtraTeacherIds, setLesExtraTeacherIds] = useState<string[]>([]);
    const [showMoreTeachers, setShowMoreTeachers] = useState<boolean>(false);
    const [lesClassKeys, setLesClassKeys] = useState<string[]>([]);
    const [showJointClasses, setShowJointClasses] = useState<boolean>(false);
    const [lesCount, setLesCount] = useState<number>(1);
    const [lesLength, setLesLength] = useState<number>(1);
    const [showMoreWeeksTerms, setShowMoreWeeksTerms] = useState<boolean>(false);
    const [lesUseHomeRoom, setLesUseHomeRoom] = useState<boolean>(true);
    const [lesUseTeacherRooms, setLesUseTeacherRooms] = useState<boolean>(false);
    const [lesUseSharedRooms, setLesUseSharedRooms] = useState<boolean>(false);
    const [lesUseSubjectRooms, setLesUseSubjectRooms] = useState<boolean>(false);
    const [lesRoomMode, setLesRoomMode] = useState<'home' | 'specific'>('home');
    const [lesRoomId, setLesRoomId] = useState<string>('');
    const [lesExtraRoomIds, setLesExtraRoomIds] = useState<string[]>([]);
    const [showMoreRooms, setShowMoreRooms] = useState<boolean>(false);
    const [lesWeek, setLesWeek] = useState<string>('');
    const [lesTerm, setLesTerm] = useState<string>('');

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

        apiService.fetchModuleRecords<AscLessonRow>('asc_subject_lessons', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) {
                    setAscLessons(recs);
                    try { localStorage.setItem(lessonsKey, JSON.stringify(recs)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [institutionId, prefsKey, lessonsKey]);

    const persistLessons = async (next: AscLessonRow[], savedItems?: AscLessonRow[]) => {
        setAscLessons(next);
        try { localStorage.setItem(lessonsKey, JSON.stringify(next)); } catch (_) {}
        if (savedItems && savedItems.length > 0) {
            for (const item of savedItems) {
                await apiService.saveModuleRecord('asc_subject_lessons', item).catch(() => {});
            }
        }
    };

    // Flatten classes/streams for lesson assignment dropdowns
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

    // Compute lesson count per subject (explicit aSc lessons first, then placed cards, then allocations)
    const subjectCountMap = useMemo(() => {
        const map = new Map<string, number>();
        (subjects || []).forEach(sub => {
            if (!sub) return;
            const customLessons = ascLessons.filter(l => l.subjectId === sub.id);
            if (customLessons.length > 0) {
                const total = customLessons.reduce((s, l) => s + (Number(l.count) || 0) * (Number(l.length) || 1), 0);
                map.set(sub.id, total);
                return;
            }
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
    }, [subjects, ascLessons, timetableEntries, allocations, courses]);

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
        // Auto-seed from approved allocations if no explicit aSc lessons exist for this subject yet
        const existingForSub = ascLessons.filter(l => l.subjectId === selectedSubject.id);
        if (existingForSub.length === 0) {
            const matchingAllocs = (allocations || []).filter(a => a && a.subjectId === selectedSubject.id);
            if (matchingAllocs.length > 0) {
                const defaultCount = Array.isArray(selectedSubject.lessonStructure) && selectedSubject.lessonStructure.length > 0
                    ? selectedSubject.lessonStructure.reduce((s, ls) => s + (Number(ls.count) || 0), 0)
                    : (Number((selectedSubject as any).hoursPerWeek) || 4);
                const seeded: AscLessonRow[] = matchingAllocs.map(a => {
                    const teacher = lecturers.find(t => t.id === a.lecturerId);
                    const clsOpt = classOptions.find(c => c.levelId === String((a as any).levelId || '') || c.courseId === a.courseId);
                    return {
                        id: `les_${a.id}`,
                        institutionId,
                        subjectId: selectedSubject.id,
                        teacherId: a.lecturerId || '',
                        teacherName: teacher?.name || 'Unassigned',
                        courseId: clsOpt?.courseId || a.courseId || '',
                        levelId: clsOpt?.levelId || String((a as any).levelId || a.courseId || ''),
                        classLabel: clsOpt?.label || a.courseId || 'Class',
                        count: defaultCount,
                        length: 1,
                        classroomMode: 'home',
                        week: '',
                        term: '',
                        createdAt: new Date().toISOString(),
                    };
                });
                persistLessons([...seeded, ...ascLessons]);
                setSelectedLessonId(seeded[0]?.id || '');
            } else {
                setSelectedLessonId('');
            }
        } else {
            setSelectedLessonId(existingForSub[0]?.id || '');
        }
        setLessonsModalSubject(selectedSubject);
    };

    const currentSubjectLessons = useMemo(() => {
        if (!lessonsModalSubject) return [];
        const list = ascLessons.filter(l => l.subjectId === lessonsModalSubject.id);
        return [...list].sort((a, b) =>
            lessonSortAsc
                ? a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true })
                : b.classLabel.localeCompare(a.classLabel, undefined, { numeric: true })
        );
    }, [ascLessons, lessonsModalSubject, lessonSortAsc]);

    const openLessonEditor = (mode: 'new' | 'edit' | 'add_more' | 'copy_to') => {
        const activeLesson = currentSubjectLessons.find(l => l.id === selectedLessonId) || currentSubjectLessons[0];
        if ((mode === 'edit' || mode === 'copy_to') && !activeLesson) return;

        setLesSubjectId(lessonsModalSubject?.id || '');
        setLesExtraTeacherIds([]);
        setShowMoreTeachers(false);
        setShowJointClasses(mode === 'copy_to' || mode === 'add_more');
        setShowMoreWeeksTerms(false);
        setShowMoreRooms(false);
        setLesExtraRoomIds([]);

        if (mode === 'edit' && activeLesson) {
            setLesTeacherId(activeLesson.teacherId);
            setLesClassKeys([`${activeLesson.courseId}::${activeLesson.levelId}`]);
            setLesCount(activeLesson.count);
            setLesLength(activeLesson.length);
            setLesRoomMode(activeLesson.classroomMode);
            setLesUseHomeRoom(activeLesson.classroomMode === 'home');
            setLesUseTeacherRooms(false);
            setLesUseSharedRooms(false);
            setLesUseSubjectRooms(false);
            setLesRoomId(activeLesson.roomId || '');
            setLesWeek(activeLesson.week || '');
            setLesTerm(activeLesson.term || '');
            setLessonEditorModal({ mode, lesson: activeLesson });
        } else if (mode === 'copy_to' && activeLesson) {
            setLesTeacherId(activeLesson.teacherId);
            setLesClassKeys([]);
            setLesCount(activeLesson.count);
            setLesLength(activeLesson.length);
            setLesRoomMode(activeLesson.classroomMode);
            setLesUseHomeRoom(activeLesson.classroomMode === 'home');
            setLesUseTeacherRooms(false);
            setLesUseSharedRooms(false);
            setLesUseSubjectRooms(false);
            setLesRoomId(activeLesson.roomId || '');
            setLesWeek(activeLesson.week || '');
            setLesTerm(activeLesson.term || '');
            setLessonEditorModal({ mode, lesson: activeLesson });
        } else {
            setLesTeacherId('');
            setLesClassKeys(mode === 'new' && classOptions[0] ? [classOptions[0].key] : []);
            setLesCount(1);
            setLesLength(1);
            setLesRoomMode('home');
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

    const handleSaveLessonEditor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lessonsModalSubject || !lessonEditorModal) return;
        if (lesClassKeys.length === 0) {
            alert('Please select at least one Class.');
            return;
        }
        const targetSubjectId = lesSubjectId || lessonsModalSubject.id;
        const primaryTeacher = lecturers.find(t => t.id === lesTeacherId);
        const extraNames = lesExtraTeacherIds
            .filter(id => id !== lesTeacherId)
            .map(id => lecturers.find(t => t.id === id)?.name)
            .filter(Boolean);
        const combinedTeacherName = [primaryTeacher?.name, ...extraNames].filter(Boolean).join(', ') || 'Unassigned';

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
            const cls = classOptions.find(c => c.key === lesClassKeys[0]);
            const jointLabels = lesClassKeys
                .map(k => classOptions.find(c => c.key === k)?.label || k)
                .join(' + ');
            const updated: AscLessonRow = {
                ...lessonEditorModal.lesson,
                subjectId: targetSubjectId,
                teacherId: lesTeacherId,
                teacherName: combinedTeacherName,
                courseId: cls?.courseId || lessonEditorModal.lesson.courseId,
                levelId: cls?.levelId || lessonEditorModal.lesson.levelId,
                classLabel: jointLabels || cls?.label || lessonEditorModal.lesson.classLabel,
                count: Math.max(1, Number(lesCount) || 1),
                length: Math.max(1, Math.min(4, Number(lesLength) || 1)),
                classroomMode: effectiveRoomMode,
                roomId: effectiveRoomMode === 'specific' ? (lesRoomId || undefined) : undefined,
                roomName: effectiveRoomMode === 'specific' ? effectiveRoomName : undefined,
                week: lesWeek.trim(),
                term: lesTerm.trim(),
            };
            const next = ascLessons.map(l => l.id === updated.id ? updated : l);
            await persistLessons(next, [updated]);
            setSelectedLessonId(updated.id);
        } else if (lessonEditorModal.mode === 'new' && showJointClasses && lesClassKeys.length > 1) {
            // Single joint-class lesson row (e.g. 4N + 4C combined)
            const firstCls = classOptions.find(c => c.key === lesClassKeys[0]);
            const jointLabels = lesClassKeys.map(k => classOptions.find(c => c.key === k)?.label || k).join(' + ');
            const created: AscLessonRow = {
                id: `les_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId,
                subjectId: targetSubjectId,
                teacherId: lesTeacherId,
                teacherName: combinedTeacherName,
                courseId: firstCls?.courseId || '',
                levelId: firstCls?.levelId || '',
                classLabel: jointLabels,
                count: Math.max(1, Number(lesCount) || 1),
                length: Math.max(1, Math.min(4, Number(lesLength) || 1)),
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
                    subjectId: targetSubjectId,
                    teacherId: lesTeacherId,
                    teacherName: combinedTeacherName,
                    courseId: cls?.courseId || '',
                    levelId: cls?.levelId || '',
                    classLabel: cls?.label || ck,
                    count: Math.max(1, Number(lesCount) || 1),
                    length: Math.max(1, Math.min(4, Number(lesLength) || 1)),
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

    const handleRemoveLesson = () => {
        if (!selectedLessonId) return;
        const target = currentSubjectLessons.find(l => l.id === selectedLessonId);
        if (!target) return;
        if (!window.confirm(`Remove lesson ${lessonsModalSubject?.name} — ${target.teacherName} (${target.classLabel})?`)) return;
        const next = ascLessons.filter(l => l.id !== selectedLessonId);
        persistLessons(next);
        setSelectedLessonId('');
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

            {/* MODAL 2: aSc "LESSONS FOR SUBJECT" WINDOW */}
            {lessonsModalSubject && (() => {
                const subCode = (lessonsModalSubject.code || lessonsModalSubject.name.slice(0, 3)).toUpperCase();
                const badgeColors = ['#eab308', '#22c55e', '#991b1b', '#4ade80', '#38bdf8', '#f472b6', '#fb923c', '#a78bfa'];
                const activeLesson = currentSubjectLessons.find(l => l.id === selectedLessonId) || null;

                return (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
                            {/* Classic aSc Dialog Title Bar */}
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                                    <span>📋</span>
                                    <span>Lessons for subject</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLessonsModalSubject(null)}
                                    className="px-2 py-0.5 rounded hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-sm cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Subject Banner (Blue Book + Name + Short Code) */}
                            <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-3 flex items-center gap-3.5 border-b border-slate-300 dark:border-slate-700">
                                <div className="w-11 h-12 rounded-lg bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-700 flex items-center justify-center text-white text-xl shadow-sm shrink-0">
                                    📘
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                                        {lessonsModalSubject.name}
                                    </h3>
                                    <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                        {subCode} • {currentSubjectLessons.reduce((s, l) => s + l.count * l.length, 0)} total periods / week
                                    </div>
                                </div>
                            </div>

                            {/* Lessons Table */}
                            <div className="flex-1 bg-white dark:bg-slate-900 overflow-auto min-h-[300px] border-b border-slate-300 dark:border-slate-700">
                                <table className="w-full text-left border-collapse text-xs select-none">
                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                        <tr>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-44">Subject</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-44">Teacher</th>
                                            <th
                                                onClick={() => setLessonSortAsc(prev => !prev)}
                                                className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-28 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                Class {lessonSortAsc ? '▲' : '▼'}
                                            </th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-16 text-center">Count</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-16 text-center">Length</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-28">Classrooms</th>
                                            <th className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-20">Week</th>
                                            <th className="py-1.5 px-3 w-20">Term</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {currentSubjectLessons.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-12 text-center text-slate-400">
                                                    No lessons assigned for <strong>{lessonsModalSubject.name}</strong> yet. Click <strong>New lesson</strong> or <strong>Add more</strong> below.
                                                </td>
                                            </tr>
                                        ) : currentSubjectLessons.map((les, idx) => {
                                            const isSel = selectedLessonId === les.id;
                                            const badgeBg = badgeColors[idx % badgeColors.length];
                                            const darkText = ['#eab308', '#4ade80', '#22c55e', '#38bdf8', '#fb923c'].includes(badgeBg);
                                            return (
                                                <tr
                                                    key={les.id}
                                                    onClick={() => setSelectedLessonId(les.id)}
                                                    onDoubleClick={() => {
                                                        setSelectedLessonId(les.id);
                                                        openLessonEditor('edit');
                                                    }}
                                                    className={`cursor-pointer transition-colors ${
                                                        isSel
                                                            ? 'bg-blue-600 text-white font-bold'
                                                            : idx % 2 === 0
                                                                ? 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                                                                : 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                                                    }`}
                                                >
                                                    <td className="py-1.5 px-3 flex items-center gap-2.5">
                                                        <span
                                                            style={{ backgroundColor: badgeBg, color: darkText ? '#0f172a' : '#ffffff' }}
                                                            className="w-7 h-6 rounded-xs border border-black/25 flex items-center justify-center font-black text-[10px] shrink-0 shadow-xs"
                                                        >
                                                            {subCode}
                                                        </span>
                                                        <span className="uppercase truncate">{lessonsModalSubject.name}</span>
                                                    </td>
                                                    <td className="py-1.5 px-3 truncate">{les.teacherName}</td>
                                                    <td className="py-1.5 px-3 font-bold">{les.classLabel}</td>
                                                    <td className="py-1.5 px-3 text-center font-mono">{les.count}</td>
                                                    <td className="py-1.5 px-3 text-center font-mono">{les.length}</td>
                                                    <td className="py-1.5 px-3">
                                                        {les.classroomMode === 'home' ? (
                                                            <span title="Home Classroom" className="text-sm">🏠</span>
                                                        ) : (
                                                            <span className="truncate">{les.roomName || 'Room'}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-1.5 px-3 text-[11px]">{les.week}</td>
                                                    <td className="py-1.5 px-3 text-[11px]">{les.term}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Classic aSc Bottom Action Bar */}
                            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openLessonEditor('new')}
                                        className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-blue-50 border-2 border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs cursor-pointer"
                                    >
                                        New lesson
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!activeLesson}
                                        onClick={() => openLessonEditor('edit')}
                                        className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-xs disabled:opacity-40 cursor-pointer"
                                    >
                                        Edit lesson
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!activeLesson}
                                        onClick={handleRemoveLesson}
                                        className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-rose-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-xs disabled:opacity-40 cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={!activeLesson}
                                        onClick={() => openLessonEditor('copy_to')}
                                        className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-xs disabled:opacity-40 cursor-pointer"
                                    >
                                        Copy to
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openLessonEditor('add_more')}
                                        className="px-4 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-xs cursor-pointer"
                                    >
                                        Add more
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setLessonsModalSubject(null)}
                                    className="px-6 py-1.5 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-black text-slate-800 dark:text-white shadow-xs cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* SUB-MODAL: AUTHENTIC aSc "LESSON" DIALOG */}
            {lessonEditorModal && lessonsModalSubject && (() => {
                const sharedRoomNames = (rooms || [])
                    .filter(r => /lab|fld|field|hall|comp/i.test(`${r.name} ${(r as any).type || ''}`))
                    .slice(0, 3)
                    .map(r => r.name)
                    .join(', ');

                return (
                    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <form
                            onSubmit={handleSaveLessonEditor}
                            className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Title Bar */}
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-white">
                                    {lessonEditorModal.mode === 'copy_to'
                                        ? 'Lesson — Copy to classes'
                                        : lessonEditorModal.mode === 'add_more'
                                            ? 'Lesson — Add more classes'
                                            : 'Lesson'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setLessonEditorModal(null)}
                                    className="px-2 py-0.5 rounded hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-sm cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-3.5 space-y-2.5 max-h-[78vh] overflow-y-auto">
                                {/* ROW 1: TEACHER */}
                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">🎓</div>
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Teacher</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select
                                                value={lesTeacherId}
                                                onChange={e => setLesTeacherId(e.target.value)}
                                                className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value=""></option>
                                                {lecturers.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setShowMoreTeachers(prev => !prev)}
                                                className={`px-4 py-1.5 rounded border text-xs font-semibold cursor-pointer ${
                                                    showMoreTeachers
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-200'
                                                }`}
                                            >
                                                More teachers
                                            </button>
                                        </div>
                                        {showMoreTeachers && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {lecturers.filter(t => t.id !== lesTeacherId).map(t => {
                                                    const picked = lesExtraTeacherIds.includes(t.id);
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setLesExtraTeacherIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                                                            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                                                picked ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600'
                                                            }`}
                                                        >
                                                            {t.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ROW 2: SUBJECT */}
                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-center gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">📘</div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Subject</label>
                                        <select
                                            value={lesSubjectId || lessonsModalSubject.id}
                                            onChange={e => setLesSubjectId(e.target.value)}
                                            className="w-full max-w-sm px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold uppercase"
                                        >
                                            {(subjects || []).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* ROW 3: CLASS */}
                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">👥</div>
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Class</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {!showJointClasses ? (
                                                <select
                                                    value={lesClassKeys[0] || ''}
                                                    onChange={e => setLesClassKeys(e.target.value ? [e.target.value] : [])}
                                                    className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                                >
                                                    <option value=""></option>
                                                    {classOptions.map(c => (
                                                        <option key={c.key} value={c.key}>{c.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex-1 min-w-[200px] flex flex-wrap gap-1.5 p-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 max-h-24 overflow-y-auto">
                                                    {classOptions.map(c => {
                                                        const picked = lesClassKeys.includes(c.key);
                                                        return (
                                                            <button
                                                                key={c.key}
                                                                type="button"
                                                                onClick={() => setLesClassKeys(prev => prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key])}
                                                                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                                                    picked ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600'
                                                                }`}
                                                            >
                                                                {c.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setShowJointClasses(prev => !prev)}
                                                className={`px-4 py-1.5 rounded border text-xs font-semibold cursor-pointer ${
                                                    showJointClasses
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-200'
                                                }`}
                                            >
                                                Joint classes
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ROW 4: LESSONS/WEEK & SINGLE/DOUBLE/TRIPLE */}
                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">📅</div>
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Lessons/week</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select
                                                value={lesCount}
                                                onChange={e => setLesCount(Number(e.target.value) || 1)}
                                                className="w-36 px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={lesLength}
                                                onChange={e => setLesLength(Number(e.target.value) || 1)}
                                                className="w-36 px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                            >
                                                <option value={1}>Single</option>
                                                <option value={2}>Double</option>
                                                <option value={3}>Triple</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setShowMoreWeeksTerms(prev => !prev)}
                                                className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:underline ml-auto cursor-pointer"
                                            >
                                                More weeks/terms
                                            </button>
                                        </div>
                                        {showMoreWeeksTerms && (
                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                <input
                                                    type="text"
                                                    value={lesWeek}
                                                    onChange={e => setLesWeek(e.target.value)}
                                                    placeholder="Week (e.g. All weeks, Week A)"
                                                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    value={lesTerm}
                                                    onChange={e => setLesTerm(e.target.value)}
                                                    placeholder="Term (e.g. All terms, Term 1)"
                                                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ROW 5: CLASSROOMS */}
                                <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-start gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl shrink-0">🚪</div>
                                    <div className="flex-1 space-y-2.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-slate-800 dark:text-slate-200">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={lesUseHomeRoom}
                                                    onChange={e => setLesUseHomeRoom(e.target.checked)}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>Home classroom</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={lesUseTeacherRooms}
                                                    onChange={e => setLesUseTeacherRooms(e.target.checked)}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>Teacher&apos;s classrooms</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={lesUseSharedRooms}
                                                    onChange={e => setLesUseSharedRooms(e.target.checked)}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span className="truncate">Shared room {sharedRoomNames || 'LAB 1, FLD, LAB 2'}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={lesUseSubjectRooms}
                                                    onChange={e => setLesUseSubjectRooms(e.target.checked)}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>Subject&apos;s classrooms</span>
                                            </label>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={lesRoomId}
                                                onChange={e => {
                                                    setLesRoomId(e.target.value);
                                                    if (e.target.value) setLesUseHomeRoom(false);
                                                }}
                                                className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                                            >
                                                <option value="">Other available classrooms</option>
                                                {(rooms || []).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setShowMoreRooms(prev => !prev)}
                                                className={`px-4 py-1.5 rounded border text-xs font-semibold cursor-pointer ${
                                                    showMoreRooms
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-200'
                                                }`}
                                            >
                                                More classrooms
                                            </button>
                                        </div>

                                        {showMoreRooms && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {(rooms || []).filter(r => r.id !== lesRoomId).map(r => {
                                                    const picked = lesExtraRoomIds.includes(r.id);
                                                    return (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() => setLesExtraRoomIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                                                            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                                                picked ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600'
                                                            }`}
                                                        >
                                                            {r.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Classic aSc Dialog Footer */}
                            <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setLessonEditorModal(null)}
                                        className="px-6 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => alert('Pick Teacher, Subject, Class (or Joint classes), Lessons/week (Single/Double/Triple), and Classroom preferences, then click OK.')}
                                        className="px-6 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                                    >
                                        Help
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    className="px-14 py-1.5 rounded border-2 border-blue-500 bg-slate-200 dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500 text-xs font-bold text-slate-900 dark:text-white shadow-xs cursor-pointer"
                                >
                                    OK
                                </button>
                            </div>
                        </form>
                    </div>
                );
            })()}

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
