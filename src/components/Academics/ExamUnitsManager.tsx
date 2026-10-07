import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Institution, Subject, User, Assessment, AssessmentMark, AcademicYear, Course, AcademicLevel } from '../../types';
import { apiService, safeLocalStorage, getDeletedExamIds, filterDeletedExams, buildExamUnitsStatePayload } from '../../services/apiService';
import { isSubjectApplicableToClass } from '../../utils/academicSubjectUtils';
import { extractClassAndStream, resolveRealStudentStream, resolveRealStudentClass, normalizeStreamName, naturalClassSort, extractStreamOnly, isDemoClassName } from '../../utils/academicUtils';
import { PlusIcon } from '../icons/PlusIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { XIcon } from '../icons/XIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { LockClosedIcon } from '../icons/LockClosedIcon';
import { AddEditExamModal, type AddEditExamFormData } from './AddEditExamModal';

export interface ExamUnitRecord {
    id: string;
    name: string; // e.g. Endterm 2 Exam 2026, Kapseret Mock, Mid Term Exam
    term: string; // e.g. TERM 2, TERM 1
    type: string; // e.g. END TERM, CAT, MOCK
    year: number; // e.g. 2026, 2025
    status: 'in_progress' | 'published';
    submittedPercent: number; // e.g. 27.6
    studentsEnrolled: number; // e.g. 361
    missingMarks: number; // e.g. 4354
    classes?: string[]; // Registered/target classes for this exam
    institution_id?: string;
    institutionId?: string;
    testedPaperConfigs?: TestedPaperConfig[];
    rankingCriteria?: 'Points' | 'Total Marks' | 'Mean Score';
    rankingScope?: 'overall' | 'per_class';
    customRankingSubjectsCount?: number;
    perClassRankingSettings?: Record<string, { criteria: 'Points' | 'Total Marks' | 'Mean Score'; subjectsCount: number; enabled: boolean }>;
    gradingSystem?: string;
    gradingSystemId?: string;
    grading_system_id?: string;
}

export interface TestedPaperConfig {
    id: string;
    subject: string;
    paperName: string;
    maxInputScore: number; // e.g. 30 for 30%
    convertToHundred: boolean; // Auto convert raw scores to 100%
    enabled: boolean;
}

interface ExamUnitsManagerProps {
    currentInstitution?: Institution | null;
    subjects?: Subject[];
    users?: User[];
    students?: any[];
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    courses?: Course[];
    academicLevels?: AcademicLevel[];
    allocations?: any[];
    /** The currently logged-in user. Required for subject-teacher stream restriction. */
    currentUser?: User | null;
    onAddAssessment?: (assessment: any) => void;
    onUpdateAssessment?: (id: string, data: any) => void;
}

/**
 * MarkInputCell — isolated, lag-free mark entry cell.
 * Keeps its own local display value so typing never triggers a global
 * broadsheetStudentRows re-render. The expensive `onCommit` callback is
 * only called onBlur or on keyboard navigation away from the cell.
 */
const areCellPropsEqual = (prev: any, next: any) => {
    return (
        prev.inputId === next.inputId &&
        prev.initialValue === next.initialValue &&
        prev.maxScore === next.maxScore &&
        prev.disabled === next.disabled &&
        prev.stIndex === next.stIndex &&
        prev.pIdx === next.pIdx
    );
};

const MarkInputCell: React.FC<{
    inputId: string;
    initialValue: number | string;
    maxScore: number;
    disabled: boolean;
    stIndex: number;
    pIdx: number;
    onCommit: (val: number) => void;
}> = React.memo(({ inputId, initialValue, maxScore, disabled, stIndex, pIdx, onCommit }) => {
    const [localVal, setLocalVal] = React.useState<string>(
        initialValue === 0 || initialValue === '' || initialValue === undefined ? '' : String(initialValue)
    );
    // Track the committed numeric value so blur & navigation never trigger duplicate commits
    const lastCommittedValRef = React.useRef<number>(
        initialValue === 0 || initialValue === '' || initialValue === undefined ? 0 : Number(initialValue)
    );
    const onCommitRef = React.useRef(onCommit);
    onCommitRef.current = onCommit;

    // Sync when external value changes (e.g. initial load, publish, CSV import)
    const prevInitial = React.useRef(initialValue);
    React.useEffect(() => {
        const numVal = initialValue === 0 || initialValue === '' || initialValue === undefined ? 0 : Number(initialValue);
        lastCommittedValRef.current = numVal;
        if (prevInitial.current !== initialValue) {
            prevInitial.current = initialValue;
            // Never overwrite the input if user is actively focused on it
            if (document.activeElement?.id !== inputId) {
                setLocalVal(initialValue === 0 || initialValue === '' || initialValue === undefined ? '' : String(initialValue));
            }
        }
    }, [initialValue, inputId]);

    const commit = React.useCallback(() => {
        const parsed = parseFloat(localVal);
        const num = localVal === '' || isNaN(parsed) ? 0 : Math.max(0, Math.min(maxScore, parsed));
        // Only trigger onCommit if the value actually changed
        if (num !== lastCommittedValRef.current) {
            lastCommittedValRef.current = num;
            if (parsed > maxScore) {
                setLocalVal(String(num));
            }
            onCommitRef.current(num);
        }
    }, [localVal, maxScore]);

    // Instant, 0ms synchronous focus & text selection (Excel-style spreadsheet navigation)
    const navigateSync = (targetId: string) => {
        const el = document.getElementById(targetId) as HTMLInputElement | null;
        if (el) {
            el.focus({ preventScroll: false });
            try {
                el.select();
            } catch (_) {}
            el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
            return true;
        }
        return false;
    };

    return (
        <div className="flex items-center justify-center gap-1.5">
            <input
                id={inputId}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*"
                value={localVal}
                placeholder="0"
                disabled={disabled}
                onFocus={(e) => {
                    try {
                        e.target.select();
                    } catch (_) {}
                }}
                onChange={(e) => {
                    if (disabled) return;
                    const val = e.target.value;
                    // Allow empty or numeric digits with optional single decimal point
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setLocalVal(val);
                    }
                }}
                onBlur={() => {
                    if (!disabled) commit();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextId = `mark-input-${stIndex + 1}-${pIdx}`;
                        navigateSync(nextId);
                        commit();
                    } else if (e.key === 'ArrowUp' || (e.shiftKey && e.key === 'Enter')) {
                        e.preventDefault();
                        const prevId = `mark-input-${stIndex - 1}-${pIdx}`;
                        navigateSync(prevId);
                        commit();
                    } else if (e.key === 'ArrowRight') {
                        const nextColId = `mark-input-${stIndex}-${pIdx + 1}`;
                        if (document.getElementById(nextColId)) {
                            e.preventDefault();
                            navigateSync(nextColId);
                            commit();
                        } else {
                            const nextRowFirstId = `mark-input-${stIndex + 1}-0`;
                            if (document.getElementById(nextRowFirstId)) {
                                e.preventDefault();
                                navigateSync(nextRowFirstId);
                                commit();
                            }
                        }
                    } else if (e.key === 'ArrowLeft') {
                        const prevColId = `mark-input-${stIndex}-${pIdx - 1}`;
                        if (document.getElementById(prevColId)) {
                            e.preventDefault();
                            navigateSync(prevColId);
                            commit();
                        }
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        if (e.shiftKey) {
                            const prevColId = `mark-input-${stIndex}-${pIdx - 1}`;
                            if (document.getElementById(prevColId)) {
                                navigateSync(prevColId);
                            } else {
                                navigateSync(`mark-input-${stIndex - 1}-0`);
                            }
                        } else {
                            const nextColId = `mark-input-${stIndex}-${pIdx + 1}`;
                            if (document.getElementById(nextColId)) {
                                navigateSync(nextColId);
                            } else {
                                navigateSync(`mark-input-${stIndex + 1}-0`);
                            }
                        }
                        commit();
                    }
                }}
                className={`w-20 px-2 py-1.5 text-center font-mono font-black border-2 rounded-lg shadow-sm text-xs transition-colors ${
                    disabled
                        ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400'
                }`}
            />
            <span className="text-[10px] font-bold text-slate-400">/ {maxScore}</span>
        </div>
    );
}, areCellPropsEqual);

interface StudentSubjectRowProps {
    st: any;
    stIndex: number;
    singleSubjectPapers: any[];
    singleSubjectMaxTotal: number;
    selectedSubjectFilter: string;
    selectedClassFilter: string;
    activeExamClasses: string[];
    isPublished: boolean;
    isUnsaved?: boolean;
    getStudentPaperMark: (st: any, paperKey: string, subName?: string, paperName?: string) => { val: number; hasMark: boolean };
    onUpdateMark: (admNo: string, fieldKey: string, newValue: number, studentName?: string, studentClass?: string) => void;
}

const StudentSubjectRow: React.FC<StudentSubjectRowProps> = React.memo(({
    st,
    stIndex,
    singleSubjectPapers,
    singleSubjectMaxTotal,
    selectedSubjectFilter,
    selectedClassFilter,
    activeExamClasses,
    isPublished,
    isUnsaved = false,
    getStudentPaperMark,
    onUpdateMark
}) => {
    const rawTotal = React.useMemo(() => {
        return singleSubjectPapers.reduce((sum: number, p: any) => {
            const markInfo = getStudentPaperMark(st, p.key, selectedSubjectFilter, p.label);
            const val = (st as any)[p.key] !== undefined ? (st as any)[p.key] : (markInfo.hasMark ? markInfo.val : 0);
            return sum + (Number(val) || 0);
        }, 0);
    }, [st, singleSubjectPapers, selectedSubjectFilter, getStudentPaperMark]);

    return (
        <tr className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors ${isUnsaved ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{st.admNo}</td>
            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{st.name}</td>

            {/* Paper Editable Score Inputs */}
            {singleSubjectPapers.map((paper: any, pIdx: number) => {
                const markInfo = getStudentPaperMark(st, paper.key, selectedSubjectFilter, paper.label);
                const currentVal = (st as any)[paper.key] !== undefined ? (st as any)[paper.key] : (markInfo.hasMark ? markInfo.val : '');
                const displayVal = (currentVal === undefined || currentVal === null || currentVal === 0) ? '' : currentVal;
                const inputId = `mark-input-${stIndex}-${pIdx}`;
                return (
                    <td key={pIdx} className="px-3 py-2 text-center bg-indigo-50/20 dark:bg-indigo-950/20 border-x border-slate-100 dark:border-slate-800">
                        <MarkInputCell
                            inputId={inputId}
                            initialValue={displayVal}
                            maxScore={paper.maxScore}
                            disabled={isPublished}
                            stIndex={stIndex}
                            pIdx={pIdx}
                            onCommit={(val) => onUpdateMark(st.admNo, paper.key, val, st.name, st.class)}
                        />
                    </td>
                );
            })}

            <td className="px-4 py-3 text-center font-mono font-black text-slate-900 dark:text-white">
                <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">{rawTotal}</span>
                <span className="text-[11px] text-slate-400 font-semibold ml-1">/ {singleSubjectMaxTotal}</span>
            </td>
        </tr>
    );
}, (prev, next) => {
    return (
        prev.st === next.st &&
        prev.stIndex === next.stIndex &&
        prev.isPublished === next.isPublished &&
        prev.isUnsaved === next.isUnsaved &&
        prev.singleSubjectPapers === next.singleSubjectPapers &&
        prev.singleSubjectMaxTotal === next.singleSubjectMaxTotal &&
        prev.selectedSubjectFilter === next.selectedSubjectFilter &&
        prev.selectedClassFilter === next.selectedClassFilter
    );
});

// Strictly identify staff/teachers/admins/parents across all schema variations
export const isNonStudentUser = (u: any): boolean => {
    if (!u) return false;
    const r = String(u.role || u.userType || u.type || '').toLowerCase().trim();
    const nonStudentRoles = [
        'teacher', 'lecturer', 'instructor', 'tutor', 'trainer',
        'admin', 'super_admin', 'superadmin', 'super-admin', 'institution_admin', 'system_admin',
        'staff', 'support_staff', 'support',
        'principal', 'deputy_principal', 'headmaster', 'headmistress', 'dean', 'director',
        'accountant', 'bursar', 'finance_officer', 'cashier',
        'librarian', 'driver', 'security', 'nurse', 'cook', 'janitor', 'boarding_master', 'matron',
        'parent', 'guardian', 'vendor', 'contractor'
    ];
    if (nonStudentRoles.includes(r)) return true;

    // Check roles array
    if (Array.isArray(u.roles)) {
        const hasStaffRole = u.roles.some((role: any) => nonStudentRoles.includes(String(role).toLowerCase().trim()));
        const hasStudentRole = u.roles.some((role: any) => ['student', 'learner', 'pupil'].includes(String(role).toLowerCase().trim()));
        if (hasStaffRole && !hasStudentRole) return true;
    }

    // Check employment / staff specific identifiers
    if (u.tscNumber || u.tsc_number || u.staffNumber || u.staff_number || u.employeeNumber || u.employee_number || u.payrollNumber) {
        return true;
    }
    if (u.isTeacher || u.isStaff || (u as any).is_staff || u.is_teacher) {
        return true;
    }
    if (u.designation || u.department || u.qualifications) {
        if (r !== 'student' && r !== 'learner' && r !== 'pupil') {
            return true;
        }
    }

    return false;
};

// Strictly identify genuine students, excluding all teachers and staff
export const isStudentUser = (u: any): boolean => {
    if (!u) return false;
    if (isNonStudentUser(u)) return false;

    const r = String(u.role || u.userType || u.type || u.enrollmentType || '').toLowerCase().trim();
    if (r === 'student' || r === 'learner' || r === 'pupil' || r === 'student_enrollment') return true;
    if (Array.isArray(u.roles) && u.roles.some((role: any) => ['student', 'learner', 'pupil'].includes(String(role).toLowerCase().trim()))) return true;

    // Check genuine admission number (MUST NOT be staff/user ID)
    const adm = u.admissionNumber || u.admission_number || u.admNo || u.registrationNo || u.regNo || u.metadata?.admissionNumber;
    if (adm && typeof adm === 'string') {
        const cleanAdm = adm.trim().toLowerCase();
        if (cleanAdm && !cleanAdm.startsWith('usr_') && !cleanAdm.startsWith('user_') && !cleanAdm.startsWith('teach_') && !cleanAdm.startsWith('staff_') && !cleanAdm.startsWith('emp_')) {
            return true;
        }
    }

    // Check student-specific class or grade metadata without staff attributes
    if ((u.studentClass || u.metadata?.studentClass || u.enrollmentType === 'academic') && !isNonStudentUser(u)) {
        return true;
    }

    return false;
};

export const ExamUnitsManager: React.FC<ExamUnitsManagerProps> = ({
    currentInstitution,
    subjects = [],
    users = [],
    students: propStudents,
    assessments = [],
    marks = [],
    courses = [],
    academicLevels = [],
    allocations = [],
    currentUser = null
}) => {
    // Storage Key Helper
    const instId = currentInstitution?.id || 'default_inst';
    const examUnitsStorageKey = `eduai_exam_units_${instId}`;

    // Safely resolved students list from prop or users array strictly excluding teachers and staff
    const resolvedStudents = useMemo(() => {
        if (Array.isArray(propStudents) && propStudents.length > 0) return propStudents.filter(isStudentUser);
        return (users || []).filter(isStudentUser);
    }, [propStudents, users]);

    // List of Exams State (Persisted in localStorage & DB)
    const [exams, setExams] = useState<ExamUnitRecord[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Filter out legacy dummy sample exams that may have been seeded during development
                    const dummyIds = new Set(['exam_1', 'exam_2', 'exam_3', 'exam_pub_1', 'exam_pub_2', 'exam_pub_3']);
                    return parsed
                        .filter(e => e && e.id && !dummyIds.has(e.id))
                        .map(e => {
                            const rawCls = e.classes || (e as any).targetClasses || (e as any).target_classes || (e as any).assignedClasses;
                            const cleanCls = Array.isArray(rawCls) ? rawCls.filter((c: string) => !isDemoClassName(c)) : undefined;
                            return { ...e, classes: cleanCls };
                        });
                }
            }
        } catch (e) { }
        return [];
    });

    // DB fetch with safe catch fallback for exam_units
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<ExamUnitRecord>('exam_units', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records)) {
                        const dummyIds = new Set(['exam_1', 'exam_2', 'exam_3', 'exam_pub_1', 'exam_pub_2', 'exam_pub_3']);
                        const cleanRecords = records
                            .filter(r => r && r.id && !dummyIds.has(r.id))
                            .map(r => {
                                const rawCls = r.classes || (r as any).targetClasses || (r as any).target_classes || (r as any).assignedClasses;
                                const cleanCls = Array.isArray(rawCls) ? rawCls.filter((c: string) => !isDemoClassName(c)) : undefined;
                                return { ...r, classes: cleanCls };
                            });
                        setExams(prev => {
                            const map = new Map<string, ExamUnitRecord>();
                            prev.filter(e => !dummyIds.has(e.id)).forEach(e => map.set(e.id, e));
                            cleanRecords.forEach(r => map.set(r.id, { ...map.get(r.id), ...r }));
                            const merged = filterDeletedExams(currentInstitution.id, Array.from(map.values()));
                            try {
                                localStorage.setItem(`eduai_exam_units_${currentInstitution.id}`, JSON.stringify(merged));
                            } catch (e) { }
                            return merged;
                        });
                    }
                })
                .catch(() => { });
        }
    }, [currentInstitution?.id]);

    // Helper to atomically sync exams state to cloud (institution_module_states) and localStorage
    const syncExamsToCloud = useCallback(async (nextExams: ExamUnitRecord[]) => {
        if (!currentInstitution?.id) return;
        const targetInstId = currentInstitution.id;
        const { exams: cleanExams, payload } = buildExamUnitsStatePayload(targetInstId, nextExams);
        try {
            localStorage.setItem(`eduai_exam_units_${targetInstId}`, JSON.stringify(cleanExams));
        } catch (e) { }

        try {
            await apiService.saveModuleRecord('institution_module_states', payload);
        } catch (err) {
            console.warn('[ExamUnitsManager] Failed to sync exams to cloud:', err);
        }
    }, [currentInstitution?.id]);

    // Remove exams deleted elsewhere (other components, tabs or devices via sync events)
    useEffect(() => {
        const applyDeletion = (deletedIds?: string[]) => {
            const ids = new Set<string>([...(deletedIds || []), ...getDeletedExamIds(instId)]);
            if (ids.size === 0) return;
            setExams(prev => {
                const next = prev.filter(e => e && !ids.has(String(e.id)));
                return next.length === prev.length ? prev : next;
            });
            setSelectedExamId(prev => (prev && ids.has(prev) ? '' : prev));
        };
        const onWindowEvent = (ev: Event) => {
            const detail = (ev as CustomEvent)?.detail;
            if (detail && detail.type && detail.type !== 'exam_deleted') return;
            applyDeletion(detail?.deletedIds);
        };
        window.addEventListener('eduai_exam_deleted', onWindowEvent);
        window.addEventListener('eduai_academics_synced', onWindowEvent);
        let bc: BroadcastChannel | null = null;
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                bc = new BroadcastChannel('eduai_academics_channel');
                bc.onmessage = (msg) => {
                    if (msg?.data?.type === 'exam_deleted') applyDeletion(msg.data.deletedIds);
                };
            }
        } catch (_) { }
        return () => {
            window.removeEventListener('eduai_exam_deleted', onWindowEvent);
            window.removeEventListener('eduai_academics_synced', onWindowEvent);
            try { bc?.close(); } catch (_) { }
        };
    }, [instId]);

    // Supabase Realtime subscription for instant cross-device exam sync
    useEffect(() => {
        if (!currentInstitution?.id) return;
        const targetInstId = currentInstitution.id;
        const supabase = apiService.getSupabase();
        if (!supabase) return;

        const imsRowId = `ims_exam_units_${targetInstId}`;
        const channel = supabase
            .channel(`exam_units_realtime_${targetInstId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'institution_module_states',
                filter: `id=eq.${imsRowId}`
            }, (payload: any) => {
                try {
                    const newRow = payload.new || payload.record;
                    if (!newRow) return;
                    const rawData = newRow.data || newRow.settings || newRow.state_data;
                    let remoteExams: ExamUnitRecord[] = [];
                    if (Array.isArray(rawData)) {
                        remoteExams = rawData;
                    } else if (rawData && Array.isArray(rawData.exams)) {
                        remoteExams = rawData.exams;
                    }
                    // Collect remote tombstones
                    const remoteDel: string[] = newRow.deleted_exam_ids ||
                        (rawData && rawData.deletedExamIds) ||
                        (rawData && Array.isArray(rawData.deletedExamIds) ? rawData.deletedExamIds : []) || [];
                    const localDel = getDeletedExamIds(targetInstId);
                    const allDel = new Set<string>([...remoteDel, ...localDel]);
                    try {
                        localStorage.setItem(`eduai_deleted_exam_ids_${targetInstId}`, JSON.stringify(Array.from(allDel)));
                    } catch (_) {}
                    const dummyIds = new Set(['exam_1', 'exam_2', 'exam_3', 'exam_pub_1', 'exam_pub_2', 'exam_pub_3']);
                    const cleanRemote = remoteExams.filter(e => e && e.id && !dummyIds.has(e.id) && !allDel.has(String(e.id)));
                    if (cleanRemote.length === 0 && remoteDel.length === 0) return;
                    setExams(prev => {
                        const map = new Map<string, ExamUnitRecord>();
                        prev.filter(e => !allDel.has(String(e.id))).forEach(e => map.set(e.id, e));
                        cleanRemote.forEach(r => map.set(r.id, { ...map.get(r.id), ...r }));
                        const merged = Array.from(map.values()).filter(e => !allDel.has(String(e.id)));
                        try {
                            localStorage.setItem(`eduai_exam_units_${targetInstId}`, JSON.stringify(merged));
                        } catch (_) {}
                        return merged;
                    });
                    setSelectedExamId(prev => (prev && allDel.has(prev) ? '' : prev));
                } catch (_) {}
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch (_) {}
        };
    }, [currentInstitution?.id]);

    const [selectedExamId, setSelectedExamId] = useState<string>(() => {
        try {
            const savedLastExam = localStorage.getItem(`eduai_last_selected_exam_${instId}`);
            if (savedLastExam && exams.some(e => e.id === savedLastExam)) {
                return savedLastExam;
            }
        } catch (e) {}
        return exams[0]?.id || '';
    });

    // Keep selectedExamId in sync with available exams
    useEffect(() => {
        if (exams.length > 0) {
            if (!selectedExamId || !exams.some(e => e.id === selectedExamId)) {
                const fallback = (() => {
                    try {
                        const savedLast = localStorage.getItem(`eduai_last_selected_exam_${instId}`);
                        if (savedLast && exams.some(e => e.id === savedLast)) return savedLast;
                    } catch (e) {}
                    return exams[0].id;
                })();
                setSelectedExamId(fallback);
            }
        } else if (selectedExamId !== '') {
            setSelectedExamId('');
        }
    }, [exams, selectedExamId, instId]);

    const activeExam = useMemo(() => {
        if (exams.length === 0) return null;
        return exams.find(e => e.id === selectedExamId) || exams[0] || null;
    }, [exams, selectedExamId]);

    const [activeSubTab, setActiveSubTab] = useState<'progress' | 'irregularities' | 'history'>('progress');
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
    const [isEditingExam, setIsEditingExam] = useState(false);
    const [isBroadsheetModalOpen, setIsBroadsheetModalOpen] = useState(false);
    const [isSendResultsModalOpen, setIsSendResultsModalOpen] = useState(false);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
    const [dashboardGradeFilter, setDashboardGradeFilter] = useState<string>('all');
    const [addExamGradeFilter, setAddExamGradeFilter] = useState<string>('all');
    const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
    const [isSavingMarks, setIsSavingMarks] = useState(false);
    const [unsavedStudentAdms, setUnsavedStudentAdms] = useState<Set<string>>(new Set());

    // Reset unsaved tracker when changing subject or exam view
    useEffect(() => {
        setUnsavedStudentAdms(new Set());
    }, [selectedSubjectFilter, selectedExamId]);

    // Sorting state for broadsheet mark entry (sort by Admission No or Student Name)
    const [sortField, setSortField] = useState<'admNo' | 'name'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Ref for the broadsheet modal scrollable body — used to scroll back to top when switching subjects
    const broadsheetModalBodyRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (broadsheetModalBodyRef.current) {
            broadsheetModalBodyRef.current.scrollTop = 0;
        }
    }, [selectedSubjectFilter]);

    const toggleSort = useCallback((field: 'admNo' | 'name') => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    }, [sortField]);

    // ──────────────────────────────────────────────────────────────────
    // MARKS BACKUP SYSTEM
    // ──────────────────────────────────────────────────────────────────
    // State for the restore panel
    const [isBackupPanelOpen, setIsBackupPanelOpen] = useState(false);
    // State for the class-change warning dialog
    const [classChangeWarning, setClassChangeWarning] = useState<{
        oldClasses: string[];
        newClasses: string[];
        examId: string;
        examName: string;
        backupKey: string;
        rowCount: number;
        proceed: () => void;
    } | null>(null);

    /** Snapshot key: uniquely identifies marks for an exam+class combination */
    const buildSnapshotKey = useCallback((examId: string, classes: string[]) => {
        const classPart = [...classes].sort().join('|').replace(/\s+/g, '_').toLowerCase();
        return `eduai_marks_snapshot_${instId}_${examId}_${classPart}`;
    }, [instId]);

    /** Write a named snapshot of current broadsheet rows for the active exam */
    const snapshotMarks = useCallback((examId: string, classes: string[], rows: any[]) => {
        if (!examId || rows.length === 0) return;
        const key = buildSnapshotKey(examId, classes);
        const snapshot = {
            examId,
            classes,
            rows,
            savedAt: new Date().toISOString(),
            rowCount: rows.length
        };
        try {
            localStorage.setItem(key, JSON.stringify(snapshot));
            // Keep a master index of all snapshot keys per exam
            const indexKey = `eduai_marks_snapshot_index_${instId}_${examId}`;
            const existing: string[] = JSON.parse(localStorage.getItem(indexKey) || '[]');
            if (!existing.includes(key)) {
                existing.push(key);
                localStorage.setItem(indexKey, JSON.stringify(existing));
            }
        } catch (e) { }
    }, [buildSnapshotKey, instId]);

    /** List all snapshots for a given exam */
    const listSnapshots = useCallback((examId: string): Array<{ key: string; classes: string[]; savedAt: string; rowCount: number }> => {
        const indexKey = `eduai_marks_snapshot_index_${instId}_${examId}`;
        const keys: string[] = JSON.parse(localStorage.getItem(indexKey) || '[]');
        return keys.map(k => {
            try {
                const raw = localStorage.getItem(k);
                if (!raw) return null;
                const snap = JSON.parse(raw);
                return { key: k, classes: snap.classes || [], savedAt: snap.savedAt || '', rowCount: snap.rowCount || 0 };
            } catch { return null; }
        }).filter(Boolean) as any[];
    }, [instId]);

    // Accordion state for class progress table
    const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({
        'c_form_3_central': true,
        'c_form_3_south': false
    });

    // Form states for creating a new exam matching screenshot
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);
    const [creationMethod, setCreationMethod] = useState<'raw_marks' | 'combine' | 'excel'>('raw_marks');
    const [newExamName, setNewExamName] = useState('');
    const [newExamTypeRadio, setNewExamTypeRadio] = useState<'CAT' | 'End Term' | 'Inter-school'>('CAT');
    const [newAcademicYear, setNewAcademicYear] = useState('2026');
    const [newTerm, setNewTerm] = useState('Term 2');
    const [newGradingSystem, setNewGradingSystem] = useState('Main grading system');
    const [newExamStartDate, setNewExamStartDate] = useState('2026-07-26');
    const [newExamSubmissionDate, setNewExamSubmissionDate] = useState('2026-08-05');
    const [showAllTeachersProgress, setShowAllTeachersProgress] = useState(false);
    const [showAllClassesProgress, setShowAllClassesProgress] = useState(false);
    const [showAllSubjectsProgress, setShowAllSubjectsProgress] = useState(false);

    // Dynamically compute current registered classes/grades and class+stream combinations
    // Strictly derives authentic school classes and permanently purges mock/demo data
    const registeredClasses = useMemo(() => {
        const classSet = new Set<string>();

        // 1. PRIMARY SOURCE: Real students enrolled in users prop
        if (users && users.length > 0) {
            users.filter(isStudentUser).forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                const stream = (u as any).stream || (u as any).streamName || (u as any).stream_name;
                if (cl && typeof cl === 'string' && cl.trim() && !isDemoClassName(cl)) {
                    if (stream && typeof stream === 'string' && stream.trim() && !cl.toLowerCase().includes(stream.toLowerCase())) {
                        classSet.add(`${cl.trim()} ${stream.trim()}`);
                    } else {
                        classSet.add(cl.trim());
                    }
                }
            });
        }

        // 2. PRIMARY SOURCE: Real student enrollments cache (always merged, never conditionally skipped)
        try {
            const cachedEnrRaw = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                                 localStorage.getItem('eduai_student_enrollments_default') ||
                                 localStorage.getItem('eduai_student_enrollments') ||
                                 (instId ? localStorage.getItem(`eduai_students_${instId}`) : null) ||
                                 localStorage.getItem('eduai_students');
            if (cachedEnrRaw) {
                const parsedEnr = JSON.parse(cachedEnrRaw);
                if (Array.isArray(parsedEnr)) {
                    parsedEnr.forEach(enr => {
                        if (!enr || isNonStudentUser(enr)) return;
                        const gLvl = enr.metadata?.gradeLevel || enr.gradeLevel || enr.studentClass || enr.className || (enr as any).class;
                        const strm = enr.metadata?.stream || enr.stream || enr.streamName || (enr as any).classStream;
                        if (gLvl && typeof gLvl === 'string' && gLvl.trim() && !isDemoClassName(gLvl)) {
                            const cleanG = gLvl.trim();
                            if (strm && typeof strm === 'string' && strm.trim() && !cleanG.toLowerCase().includes(strm.trim().toLowerCase())) {
                                classSet.add(`${cleanG} ${strm.trim()}`);
                            } else {
                                classSet.add(cleanG);
                            }
                        }
                    });
                }
            }
        } catch (e) {}

        // 3. From currentInstitution object (classes, streamDefinitions, streams)
        if (currentInstitution) {
            const instClasses = (currentInstitution as any).classes || (currentInstitution as any).courses;
            if (Array.isArray(instClasses)) {
                instClasses.forEach((c: any) => {
                    if (!c) return;
                    const name = typeof c === 'string' ? c : (c?.name || c?.title);
                    if (name && typeof name === 'string' && !isDemoClassName(name)) classSet.add(name);
                });
            }

            const streamDefs: string[] = (currentInstitution as any).streamDefinitions || (currentInstitution as any).streams || [];
            if (streamDefs.length > 0) {
                const baseList = Array.from(classSet);
                baseList.forEach(base => {
                    const baseLower = base.toLowerCase();
                    const alreadyHasStream = streamDefs.some(s => baseLower.endsWith(s.toLowerCase()));
                    if (!alreadyHasStream) {
                        streamDefs.forEach(s => {
                            if (s && s.trim()) {
                                classSet.add(`${base} ${s.trim()}`);
                            }
                        });
                    }
                });
            }
        }

        // 4. From courses prop: ONLY genuine course levels, NEVER demo courses
        if (courses && Array.isArray(courses) && courses.length > 0) {
            courses.forEach(c => {
                if (!c) return;
                if (c.id && (c.id.startsWith('c_844') || c.id.startsWith('c_cbe'))) return;
                const cName = c?.name || (c as any)?.title || c?.code;
                if (cName && isDemoClassName(cName)) return;

                if (Array.isArray(c.levels) && c.levels.length > 0) {
                    c.levels.forEach(lvl => {
                        if (lvl && lvl.name && !isDemoClassName(lvl.name)) {
                            classSet.add(lvl.name.trim());
                        }
                    });
                } else if (cName && typeof cName === 'string') {
                    classSet.add(cName.trim());
                }
            });
        }

        // 5. From academicLevels prop
        if (academicLevels && Array.isArray(academicLevels) && academicLevels.length > 0) {
            academicLevels.forEach(l => {
                if (!l) return;
                const name = typeof l === 'string' ? l : (l?.name || (l as any)?.title || (l as any)?.code);
                if (name && typeof name === 'string' && !isDemoClassName(name)) classSet.add(name);
            });
        }

        // 6. Fallback defaults ONLY if classSet is completely empty
        if (classSet.size === 0) {
            ['Form 1 Central', 'Form 2 Central', 'Form 3 Central', 'Form 4 Central'].forEach(c => classSet.add(c));
        }

        return Array.from(classSet).filter(c => !isDemoClassName(c));
    }, [courses, academicLevels, users, currentInstitution, instId]);

    // Step 2 Wizard States:
    const [targetStudentSearch, setTargetStudentSearch] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    // Choose From Students Modal States:
    const [isStudentPickerModalOpen, setIsStudentPickerModalOpen] = useState(false);
    const [studentPickerYear, setStudentPickerYear] = useState('2026');
    const [studentPickerTab, setStudentPickerTab] = useState<'all_classes' | 'all_students' | 'all_groups'>('all_students');
    const [studentPickerSearch, setStudentPickerSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    useEffect(() => {
        if (registeredClasses.length > 0 && selectedClasses.length === 0 && !isAddExamModalOpen) {
            setSelectedClasses(registeredClasses);
        }
    }, [registeredClasses, isAddExamModalOpen]);
    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution]);

    const [isPapersModalOpen, setIsPapersModalOpen] = useState(false);
    // Tested Papers Configuration State:
    const [testedPaperConfigs, setTestedPaperConfigs] = useState<TestedPaperConfig[]>([]);
    const [syncedVersion, setSyncedVersion] = useState(0);

    const deduplicatePapers = useCallback((list: TestedPaperConfig[]) => {
        const seen = new Set<string>();
        const unique: TestedPaperConfig[] = [];
        list.forEach(p => {
            if (!p || !p.subject || !p.subject.trim()) return;
            const subNorm = p.subject.trim().toLowerCase();
            const paperNorm = (p.paperName || 'Paper 1').trim().toLowerCase();
            const key = `${subNorm}__${paperNorm}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push({
                    ...p,
                    subject: p.subject.trim(),
                    paperName: (p.paperName || 'Paper 1').trim()
                });
            }
        });
        return unique;
    }, []);

    // Persistent Student Exemptions Store (from Student Subject Enrollment Manager)
    const [studentSubjectExemptions, setStudentSubjectExemptions] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_student_subject_exemptions_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) { }
        return {};
    });

    // Persistent Class Subject Allocations Store (configured in Manage Subjects per Class Stream / Lessons & Allocation)
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (e) { }
        return (currentInstitution as any)?.classSubjectAllocations || (currentInstitution as any)?.class_subject_allocations || {};
    });

    // Subject teacher allocations (from Lessons & Allocation manager)
    const [subjectAllocations, setSubjectAllocations] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_subject_allocations_${instId}`) ||
                          localStorage.getItem('eduai_subject_allocations');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return allocations || [];
    });

    useEffect(() => {
        if (allocations && Array.isArray(allocations) && allocations.length > 0) {
            setSubjectAllocations(allocations);
        }
    }, [allocations]);

    /**
     * Subject-teacher stream restriction map.
     * For each subject name the teacher is assigned to, stores the list of
     * allowed class streams (lowercase). null = unrestricted (non-teacher role).
     *
     * Example: { 'mathematics': ['grade 4 east'], 'english': ['grade 5 north'] }
     */
    const teacherSubjectClassMap = useMemo<Record<string, string[]> | null>(() => {
        if (!currentUser || (currentUser.role !== 'teacher' && (currentUser as any).role !== 'instructor' && (currentUser as any).role !== 'lecturer')) {
            return null; // unrestricted for admins / principals / other roles
        }
        const myId = currentUser.id;
        const myNameNorm = (currentUser.name || '').trim().toLowerCase();
        let allAllocs = [...(subjectAllocations || []), ...(allocations || [])];
        if (allAllocs.length === 0) {
            try {
                const saved = localStorage.getItem(`eduai_subject_allocations_${instId}`) ||
                              localStorage.getItem('eduai_subject_allocations');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) allAllocs = parsed;
                }
            } catch (_) {}
        }
        const map: Record<string, string[]> = {};
        allAllocs.forEach(a => {
            if (!a) return;
            const aTeacherId = a.teacherId || a.teacher_id || '';
            const aTeacherName = (a.teacherName || a.teacher?.name || a.instructorName || '').trim().toLowerCase();
            const isMyAlloc = (myId && aTeacherId === myId) || (myNameNorm && aTeacherName === myNameNorm);
            if (!isMyAlloc) return;
            const subKey = (a.subjectName || a.subject || '').trim().toLowerCase();
            const rawCls = (a.className || a.class || '').trim().toLowerCase();
            const aStream = (a.stream || a.streamName || a.stream_name || a.classStream || '').trim().toLowerCase();
            if (!subKey || !rawCls) return;
            if (!map[subKey]) map[subKey] = [];
            if (!map[subKey].includes(rawCls)) map[subKey].push(rawCls);
            if (aStream && !rawCls.includes(aStream)) {
                const streamCls = `${rawCls} ${aStream}`.trim();
                if (!map[subKey].includes(streamCls)) map[subKey].push(streamCls);
            }
        });
        return map;
    }, [currentUser, subjectAllocations, allocations, instId]);

    // Synchronized listener for real-time cross-module updates across Lessons & Allocation, Exam Papers & Grading
    useEffect(() => {
        const handleSync = (e?: any) => {
            setSyncedVersion(prev => prev + 1);
            if (teacherForClassCacheRef.current) {
                teacherForClassCacheRef.current.clear();
            }
            try {
                const savedEx = localStorage.getItem(`eduai_student_subject_exemptions_${instId}`);
                if (savedEx) {
                    const parsed = JSON.parse(savedEx);
                    if (parsed && typeof parsed === 'object') setStudentSubjectExemptions(parsed);
                }
            } catch (e) { }
            try {
                const savedAlloc = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
                if (savedAlloc) {
                    const parsed = JSON.parse(savedAlloc);
                    if (parsed && typeof parsed === 'object') setClassAllocationsStore(parsed);
                }
            } catch (e) { }
            try {
                const savedSubAlloc = localStorage.getItem(`eduai_subject_allocations_${instId}`) ||
                                      localStorage.getItem('eduai_subject_allocations');
                if (savedSubAlloc) {
                    const parsed = JSON.parse(savedSubAlloc);
                    if (Array.isArray(parsed)) {
                        setSubjectAllocations(parsed);
                        teacherForClassCacheRef.current.clear();
                    }
                }
            } catch (e) {}
        };
        window.addEventListener('eduai_academics_synced', handleSync);
        window.addEventListener('eduai_exam_units_synced', handleSync);
        window.addEventListener('eduai_broadsheets_updated', handleSync);
        window.addEventListener('eduai_subject_allocations_synced', handleSync);
        window.addEventListener('storage', handleSync);
        return () => {
            window.removeEventListener('eduai_academics_synced', handleSync);
            window.removeEventListener('eduai_exam_units_synced', handleSync);
            window.removeEventListener('eduai_broadsheets_updated', handleSync);
            window.removeEventListener('eduai_subject_allocations_synced', handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, [instId]);

    useEffect(() => {
        const targetInstId = currentInstitution?.id || instId;
        if (targetInstId) {
            apiService.fetchModuleRecords<any>('student_subject_exemptions', targetInstId)
                .then(records => {
                    if (records && records.length > 0) {
                        const map: Record<string, boolean> = {};
                        records.forEach(r => {
                            if (r.key) map[r.key] = r.isExempted ?? true;
                        });
                        setStudentSubjectExemptions(prev => ({ ...map, ...prev }));
                    }
                })
                .catch(() => { });

            apiService.fetchModuleRecords<any>('class_subject_allocations', targetInstId)
                .then(records => {
                    const match = (records || []).find(r => r.id === `alloc_${targetInstId}` || r.institutionId === targetInstId);
                    if (match && match.allocations) {
                        setClassAllocationsStore(prev => {
                            const merged = { ...match.allocations, ...prev };
                            try {
                                localStorage.setItem(`eduai_class_subject_allocations_${targetInstId}`, JSON.stringify(merged));
                            } catch (e) { }
                            return merged;
                        });
                    }
                })
                .catch(() => { });

            apiService.fetchModuleRecords<any>('subject_allocations', targetInstId)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setSubjectAllocations(records);
                        teacherForClassCacheRef.current.clear();
                        try {
                            localStorage.setItem(`eduai_subject_allocations_${targetInstId}`, JSON.stringify(records));
                            localStorage.setItem('eduai_subject_allocations', JSON.stringify(records));
                        } catch (e) {}
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution?.id, instId]);

    // Authoritative resolver for registered subjects for any class stream
    const getRegisteredSubjectsForClass = useCallback((targetClass: string): { subject: string; paperName?: string; maxScore?: number }[] => {
        if (!targetClass || !targetClass.trim()) return [];
        const cleanTC = targetClass.trim();
        const tcLower = cleanTC.toLowerCase();
        const parsedClass = extractClassAndStream(cleanTC);
        const baseClass = parsedClass.className || cleanTC;
        const baseClassLower = baseClass.toLowerCase().trim();
        const tcNoStream = cleanTC.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim().toLowerCase();
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const tcNorm = normalize(cleanTC);
        const tcNoStreamNorm = normalize(tcNoStream);
        const baseNorm = normalize(baseClass);

        // 1. Saved Exam Papers Configurations (classExamConfigs)
        let savedConfigs: any[] = (currentInstitution as any)?.classExamConfigs || (currentInstitution as any)?.class_exam_configs;
        if (!savedConfigs || !Array.isArray(savedConfigs) || savedConfigs.length === 0) {
            try {
                const savedLocalInst = localStorage.getItem(`eduai_class_exam_configs_${instId}`);
                if (savedLocalInst) {
                    const parsed = JSON.parse(savedLocalInst);
                    if (Array.isArray(parsed) && parsed.length > 0) savedConfigs = parsed;
                }
            } catch (e) { }
        }

        if (savedConfigs && Array.isArray(savedConfigs) && savedConfigs.length > 0) {
            const matchedConfig = savedConfigs.find((c: any) => {
                if (!c) return false;
                const cName = (c.className || c.name || '').toLowerCase().trim();
                const cId = (c.classId || c.id || '').toLowerCase().trim();
                const cnNorm = normalize(cName);
                const cIdNorm = normalize(cId);
                return cName === tcLower || cName === tcNoStream || cName === baseClassLower ||
                       cId === tcLower || cId === tcNoStream || cId === baseClassLower ||
                       (cnNorm && cnNorm === tcNorm) || (cIdNorm && cIdNorm === tcNorm) ||
                       (cnNorm && cnNorm === tcNoStreamNorm) || (cIdNorm && cIdNorm === tcNoStreamNorm) ||
                       (cnNorm && cnNorm === baseNorm) || (cIdNorm && cIdNorm === baseNorm);
            });
            if (matchedConfig && Array.isArray(matchedConfig.subjects) && matchedConfig.subjects.length > 0) {
                const results: { subject: string; paperName?: string; maxScore?: number }[] = [];
                matchedConfig.subjects.forEach((s: any) => {
                    const sName = s.subjectName || s.subjectId || s.name;
                    if (!sName) return;
                    if (Array.isArray(s.papers) && s.papers.length > 0) {
                        s.papers.forEach((p: any) => {
                            const pName = typeof p === 'string' ? p : (p.name || 'Paper 1');
                            const max = typeof p === 'object' ? p.maxScore : 100;
                            results.push({ subject: String(sName).trim(), paperName: String(pName), maxScore: max });
                        });
                    } else {
                        results.push({ subject: String(sName).trim(), paperName: 'Paper 1', maxScore: 100 });
                    }
                });
                if (results.length > 0) return results;
            }
        }

        // 2. Class Subject Allocations Store (Manage Subjects per Class Stream / Lessons & Allocation)
        const allocKeys = Object.keys(classAllocationsStore || {});
        let allocatedIds: string[] = [];

        // Exact matches first
        if (Array.isArray(classAllocationsStore[cleanTC]) && classAllocationsStore[cleanTC].length > 0) {
            allocatedIds = classAllocationsStore[cleanTC];
        } else if (Array.isArray(classAllocationsStore[tcLower]) && classAllocationsStore[tcLower].length > 0) {
            allocatedIds = classAllocationsStore[tcLower];
        } else if (Array.isArray(classAllocationsStore[tcNoStream]) && classAllocationsStore[tcNoStream].length > 0) {
            allocatedIds = classAllocationsStore[tcNoStream];
        } else if (Array.isArray(classAllocationsStore[baseClass]) && classAllocationsStore[baseClass].length > 0) {
            allocatedIds = classAllocationsStore[baseClass];
        } else if (Array.isArray(classAllocationsStore[baseClassLower]) && classAllocationsStore[baseClassLower].length > 0) {
            allocatedIds = classAllocationsStore[baseClassLower];
        } else {
            // Normalized search
            const matchedKey = allocKeys.find(k => {
                const kLower = k.toLowerCase().trim();
                const kNorm = normalize(kLower);
                return kLower === tcLower || kLower === tcNoStream || kLower === baseClassLower ||
                       kNorm === tcNorm || kNorm === tcNoStreamNorm || kNorm === baseNorm;
            });
            if (matchedKey && Array.isArray(classAllocationsStore[matchedKey]) && classAllocationsStore[matchedKey].length > 0) {
                allocatedIds = classAllocationsStore[matchedKey];
            } else {
                // If cleanTC is a grade (e.g. "Grade 9"), union stream allocations (e.g. "Grade 9 East", "Grade 9 West")
                const streamKeys = allocKeys.filter(k => {
                    const kNorm = normalize(k);
                    return (tcNoStreamNorm.length > 2 && kNorm.startsWith(tcNoStreamNorm)) ||
                           (baseNorm.length > 2 && kNorm.startsWith(baseNorm));
                });
                if (streamKeys.length > 0) {
                    const set = new Set<string>();
                    streamKeys.forEach(sk => {
                        const arr = classAllocationsStore[sk];
                        if (Array.isArray(arr)) arr.forEach(id => set.add(id));
                    });
                    allocatedIds = Array.from(set);
                }
            }
        }

        if (allocatedIds.length > 0) {
            const allocSet = new Set(allocatedIds.map(id => String(id).toLowerCase().trim()));
            const matchedSubjects = (subjects || []).filter(s => {
                const sId = (s.id || '').toLowerCase().trim();
                const sName = (s.name || '').toLowerCase().trim();
                const sCode = (s.code || '').toLowerCase().trim();
                return allocSet.has(sId) || allocSet.has(sName) || (sCode && allocSet.has(sCode));
            });

            if (matchedSubjects.length > 0) {
                return matchedSubjects.map(s => ({
                    subject: s.name || (s as any).title || 'Subject',
                    paperName: 'Paper 1',
                    maxScore: 100
                }));
            }
        }

        // 3. Courses curriculum levels
        if (courses && Array.isArray(courses) && courses.length > 0) {
            const courseIds = new Set<string>();
            courses.forEach(c => {
                if (Array.isArray(c.levels)) {
                    c.levels.forEach((lvl: any) => {
                        const lvlName = (lvl.name || c.name || '').toLowerCase().trim();
                        const lvlNorm = normalize(lvlName);
                        if (lvlName === tcLower || lvlName === tcNoStream || lvlName === baseClassLower ||
                            lvlNorm === tcNorm || lvlNorm === tcNoStreamNorm || lvlNorm === baseNorm) {
                            const ids = lvl.subjectIds || lvl.subject_ids || [];
                            if (Array.isArray(ids)) ids.forEach((id: any) => courseIds.add(String(id).toLowerCase().trim()));
                        }
                    });
                }
            });
            if (courseIds.size > 0) {
                const matched = (subjects || []).filter(s => {
                    const sId = (s.id || '').toLowerCase().trim();
                    const sName = (s.name || '').toLowerCase().trim();
                    const sCode = (s.code || '').toLowerCase().trim();
                    return courseIds.has(sId) || courseIds.has(sName) || (sCode && courseIds.has(sCode));
                });
                if (matched.length > 0) {
                    return matched.map(s => ({ subject: s.name || (s as any).title, paperName: 'Paper 1', maxScore: 100 }));
                }
            }
        }

        // 4. Student Enrollments / Students of this class
        const classStudents = (resolvedStudents || []).filter((st: any) => {
            const stCls = (st.class || st.studentClass || st.currentClass || '').toLowerCase().trim();
            return stCls === tcLower || stCls === tcNoStream || stCls === baseClassLower ||
                   normalize(stCls) === tcNorm || normalize(stCls) === tcNoStreamNorm || normalize(stCls) === baseNorm;
        });
        const enrolledIdsFromStudents = new Set<string>();
        classStudents.forEach((st: any) => {
            const eIds = st.enrolledSubjectIds || st.subjectIds || [];
            if (Array.isArray(eIds)) eIds.forEach((id: any) => enrolledIdsFromStudents.add(String(id).toLowerCase().trim()));
        });
        if (enrolledIdsFromStudents.size > 0) {
            const matched = (subjects || []).filter(s => {
                const sId = (s.id || '').toLowerCase().trim();
                const sName = (s.name || '').toLowerCase().trim();
                const sCode = (s.code || '').toLowerCase().trim();
                return enrolledIdsFromStudents.has(sId) || enrolledIdsFromStudents.has(sName) || (sCode && enrolledIdsFromStudents.has(sCode));
            });
            if (matched.length > 0) {
                return matched.map(s => ({ subject: s.name || (s as any).title, paperName: 'Paper 1', maxScore: 100 }));
            }
        }

        // 5. Explicit targetClasses on subjects
        if (subjects && Array.isArray(subjects) && subjects.length > 0) {
            const explicit = subjects.filter(s => {
                const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
                if (Array.isArray(targetCls) && targetCls.length > 0) {
                    return targetCls.some((tc: string) => {
                        const cleanC = (tc || '').toLowerCase().trim();
                        return cleanC === tcLower || cleanC === tcNoStream || cleanC === baseClassLower ||
                               normalize(cleanC) === tcNorm || normalize(cleanC) === tcNoStreamNorm || normalize(cleanC) === baseNorm;
                    });
                }
                return false;
            });
            if (explicit.length > 0) {
                return explicit.map(s => ({ subject: s.name || (s as any).title, paperName: 'Paper 1', maxScore: 100 }));
            }
        }

        // 6. Filter subjects strictly applicable to this class
        if (subjects && Array.isArray(subjects) && subjects.length > 0) {
            const applicable = subjects.filter(s => isSubjectApplicableToClass({ name: s.name || (s as any).title, code: s.code }, cleanTC));
            if (applicable.length > 0) {
                return applicable.map(s => ({ subject: s.name || (s as any).title, paperName: 'Paper 1', maxScore: 100 }));
            }
        }

        // 7. CBC Curriculum Standards per Level
        const isPP = /\b(pp1|pp2|playgroup|nursery|kg)\b/i.test(cleanTC) || tcLower.includes('preprimary') || tcLower.includes('pre-primary');
        const isLP = /\b(grade|std|class)\s*[1-3]\b/i.test(cleanTC) || tcLower.includes('lower primary');
        const isUP = /\b(grade|std|class)\s*[4-6]\b/i.test(cleanTC) || tcLower.includes('upper primary');
        const isJSS = /\b(grade|std|class)\s*[7-9]\b/i.test(cleanTC) || tcLower.includes('jss') || tcLower.includes('junior');

        if (isPP) {
            return ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor & Creative Activities', 'Religious Education Activities'].map(s => ({ subject: s, paperName: 'Paper 1', maxScore: 100 }));
        }
        if (isLP) {
            return ['Mathematics Activities', 'English Language Activities', 'Kiswahili Language Activities', 'Environmental Activities', 'Hygiene & Nutrition Activities', 'Movement & Creative Activities', 'Religious Education Activities'].map(s => ({ subject: s, paperName: 'Paper 1', maxScore: 100 }));
        }
        if (isUP) {
            return ['Mathematics', 'English', 'Kiswahili', 'Science & Technology', 'Social Studies', 'Agriculture & Nutrition', 'Creative Arts', 'Religious Education (CRE/IRE)', 'Physical & Health Education (PHE)'].map(s => ({ subject: s, paperName: 'Paper 1', maxScore: 100 }));
        }
        if (isJSS) {
            return ['Mathematics', 'English', 'Kiswahili', 'Integrated Science', 'Social Studies', 'Pre-Technical & Computer Studies', 'Agriculture & Nutrition', 'Creative Arts & Sports', 'Religious Education (CRE/IRE)'].map(s => ({ subject: s, paperName: 'Paper 1', maxScore: 100 }));
        }
        return ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History & Government', 'Geography'].map(s => ({ subject: s, paperName: 'Paper 1', maxScore: 100 }));
    }, [currentInstitution, instId, classAllocationsStore, subjects, courses, resolvedStudents]);

    // Import Enrolled Class Subjects from Student Subject Enrollment Registry & Course Configurations
    const handleImportEnrolledSubjects = useCallback(() => {
        const targetClasses = isAddExamModalOpen
            ? selectedClasses
            : (activeExam?.classes && activeExam.classes.length > 0 ? activeExam.classes : [selectedClassFilter]);

        if (!targetClasses || targetClasses.length === 0) {
            alert('Please select sitting class streams first.');
            return;
        }

        const enrolledMap = new Map<string, { subject: string; paperName: string; maxScore: number }>();
        targetClasses.forEach(tc => {
            const classSubjects = getRegisteredSubjectsForClass(tc);
            classSubjects.forEach(cs => {
                const key = `${cs.subject.toLowerCase().trim()}__${(cs.paperName || 'Paper 1').toLowerCase().trim()}`;
                if (!enrolledMap.has(key)) {
                    enrolledMap.set(key, {
                        subject: cs.subject,
                        paperName: cs.paperName || 'Paper 1',
                        maxScore: cs.maxScore || 100
                    });
                }
            });
        });

        const importedPapers: TestedPaperConfig[] = Array.from(enrolledMap.values()).map((item, idx) => ({
            id: `enr_tp_${item.subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
            subject: item.subject,
            paperName: item.paperName,
            maxInputScore: item.maxScore,
            convertToHundred: true,
            enabled: true
        }));

        const deduplicated = deduplicatePapers(importedPapers);
        setTestedPaperConfigs(deduplicated);

        try {
            if (activeExam?.id) {
                localStorage.setItem(`eduai_tested_papers_${instId}_${activeExam.id}`, JSON.stringify(deduplicated));
            }
        } catch (e) { }

        setSaveToastMessage(`✨ Loaded ${deduplicated.length} registered subject(s) for ${targetClasses.join(', ')}`);
        setTimeout(() => setSaveToastMessage(null), 3000);
    }, [isAddExamModalOpen, selectedClasses, activeExam, selectedClassFilter, instId, getRegisteredSubjectsForClass, deduplicatePapers]);

    // Sync tested paper configurations ALWAYS matching Manage Subjects per Class Stream (Lessons & Allocation)
    useEffect(() => {
        const targetClasses = isAddExamModalOpen
            ? selectedClasses
            : (activeExam?.classes && activeExam.classes.length > 0 ? activeExam.classes : [selectedClassFilter]);

        if (isAddExamModalOpen && targetClasses.length === 0) {
            setTestedPaperConfigs([]);
            return;
        }

        // 0. Retrieve any previously saved tested paper configs for this specific exam
        const existingExamPapers: TestedPaperConfig[] | null = (() => {
            // When adding a new exam, never inherit papers from old exams or global storage
            if (isAddExamModalOpen && !isEditingExam) {
                return null;
            }
            if (activeExam?.testedPaperConfigs && Array.isArray(activeExam.testedPaperConfigs) && activeExam.testedPaperConfigs.length > 0) {
                return activeExam.testedPaperConfigs;
            }
            try {
                if (activeExam?.id) {
                    const byExam = localStorage.getItem(`eduai_tested_papers_${instId}_${activeExam.id}`);
                    if (byExam) {
                        const parsed = JSON.parse(byExam);
                        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    }
                }
            } catch (e) { }
            return null;
        })();

        // 1. Gather all registered subjects across sitting classes
        const registeredMap = new Map<string, { subject: string; paperName: string; maxScore: number }>();
        targetClasses.forEach(tc => {
            const classItems = getRegisteredSubjectsForClass(tc);
            classItems.forEach(ci => {
                const key = `${ci.subject.toLowerCase().trim()}__${(ci.paperName || 'Paper 1').toLowerCase().trim()}`;
                if (!registeredMap.has(key)) {
                    registeredMap.set(key, {
                        subject: ci.subject,
                        paperName: ci.paperName || 'Paper 1',
                        maxScore: ci.maxScore || 100
                    });
                }
            });
        });

        const registeredPaperList: TestedPaperConfig[] = Array.from(registeredMap.values()).map((item, idx) => ({
            id: `tp_${item.subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
            subject: item.subject,
            paperName: item.paperName,
            maxInputScore: item.maxScore,
            convertToHundred: true,
            enabled: true
        }));

        if (!existingExamPapers || existingExamPapers.length === 0) {
            const nextReg = deduplicatePapers(registeredPaperList);
            setTestedPaperConfigs(prev => {
                if (
                    prev.length === nextReg.length &&
                    prev.every((p, i) =>
                        p.id === nextReg[i].id &&
                        p.subject === nextReg[i].subject &&
                        p.paperName === nextReg[i].paperName &&
                        p.maxInputScore === nextReg[i].maxInputScore &&
                        p.convertToHundred === nextReg[i].convertToHundred &&
                        p.enabled === nextReg[i].enabled
                    )
                ) {
                    return prev;
                }
                return nextReg;
            });
            return;
        }

        // 2. If existing exam papers exist, inherit user customizations (maxScore, convertToHundred, enabled)
        // for subjects that are registered for the sitting classes!
        const existingMap = new Map<string, TestedPaperConfig>();
        existingExamPapers.forEach(p => {
            if (!p || !p.subject) return;
            const key = `${p.subject.toLowerCase().trim()}__${(p.paperName || 'Paper 1').toLowerCase().trim()}`;
            existingMap.set(key, p);
            if (!existingMap.has(p.subject.toLowerCase().trim())) {
                existingMap.set(p.subject.toLowerCase().trim(), p);
            }
        });

        const merged: TestedPaperConfig[] = registeredPaperList.map(item => {
            const key = `${item.subject.toLowerCase().trim()}__${(item.paperName || 'Paper 1').toLowerCase().trim()}`;
            const existing = existingMap.get(key) || existingMap.get(item.subject.toLowerCase().trim());
            if (existing) {
                return {
                    ...item,
                    id: existing.id || item.id,
                    maxInputScore: existing.maxInputScore ?? item.maxInputScore,
                    convertToHundred: existing.convertToHundred ?? item.convertToHundred,
                    enabled: existing.enabled
                };
            }
            return item;
        });

        // When editing an existing exam, also preserve any custom user-added papers if applicable
        if (isEditingExam) {
            existingExamPapers.forEach(p => {
                if (!p || !p.subject) return;
                const isApplicable = targetClasses.some(tc => isSubjectApplicableToClass({ name: p.subject }, tc));
                if (!isApplicable) return;
                const already = merged.some(m =>
                    m.subject.trim().toLowerCase() === p.subject.trim().toLowerCase() &&
                    (m.paperName || 'Paper 1').trim().toLowerCase() === (p.paperName || 'Paper 1').trim().toLowerCase()
                );
                if (!already) {
                    merged.push(p);
                }
            });
        }

        const nextPapers = deduplicatePapers(merged);
        setTestedPaperConfigs(prev => {
            if (
                prev.length === nextPapers.length &&
                prev.every((p, i) =>
                    p.id === nextPapers[i].id &&
                    p.subject === nextPapers[i].subject &&
                    p.paperName === nextPapers[i].paperName &&
                    p.maxInputScore === nextPapers[i].maxInputScore &&
                    p.convertToHundred === nextPapers[i].convertToHundred &&
                    p.enabled === nextPapers[i].enabled
                )
            ) {
                return prev;
            }
            return nextPapers;
        });
    }, [currentInstitution, subjects, courses, instId, isPrimarySchool, selectedClasses, selectedClassFilter, activeExam?.id, activeExam?.classes, isAddExamModalOpen, isEditingExam, syncedVersion, getRegisteredSubjectsForClass, deduplicatePapers]);
    const [useCustomRanking, setUseCustomRanking] = useState(false);
    const [rankingScope, setRankingScope] = useState<'overall' | 'per_class'>('overall');
    const [customRankingCriteria, setCustomRankingCriteria] = useState<'Points' | 'Total Marks' | 'Mean Score'>('Points');
    const [customRankingSubjectsCount, setCustomRankingSubjectsCount] = useState<number>(7);
    const [perClassRankingSettings, setPerClassRankingSettings] = useState<Record<string, { criteria: 'Points' | 'Total Marks' | 'Mean Score'; subjectsCount: number; enabled: boolean }>>({
        'Form 3 Central': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 South': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 East': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 West': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Grade 10 Central': { criteria: 'Points', subjectsCount: 7, enabled: true },
    });
    // Preset sample names for generating full 35-student rosters per class
    const KENYAN_STUDENT_NAMES = useMemo(() => [
        'Amina Kiprop', 'Brian Omondi', 'Cynthia Wambui', 'David Cheruiyot', 'Emmanuel Kamau',
        'Faith Chebet', 'Gideon Kiptoo', 'Heller Jelagat', 'Isaac Kipkorir', 'Joy Jerotich',
        'Kelvin Kiprugo', 'Linett Chepkorir', 'Maxine Jelimo', 'Nathan Kipkemboi', 'Oscar Kiptoo',
        'Phyllis Jepleting', 'Quincy Kimutai', 'Ruth Chepngetich', 'Samuel Kiprotich', 'Tabitha Jerop',
        'Victor Kiptoo', 'Winnie Chepleting', 'Yvonne Jepchumba', 'Zachary Kipkosgei', 'Abigael Kimutai',
        'Benard Kiptoo', 'Catherine Jelimo', 'Daniel Kipruto', 'Esther Chepkemoi', 'Felix Kipkosgei',
        'Grace Jepkoech', 'Harrison Kiptoo', 'Ian Kiprono', 'Judith Jepleting', 'Kevin Kiprotich'
    ], []);

    const defaultSampleRows = useMemo(() => {
        return KENYAN_STUDENT_NAMES.map((name, idx) => ({
            admNo: 'N/A',
            name,
            class: 'Grade 6 Central',
            mathP1: Math.round(18 + (idx * 3) % 25),
            mathP2: Math.round(40 + (idx * 4) % 35),
            engP1: Math.round(35 + (idx * 2) % 30),
            engP2: Math.round(50 + (idx * 3) % 28),
            kiswP1: Math.round(25 + (idx * 2) % 20),
            bioP1: Math.round(45 + (idx * 3) % 35)
        }));
    }, [KENYAN_STUDENT_NAMES]);

    // Resolved Active Exam Classes
    // Strictly shows authentic school classes assigned to the active exam without any demo pollution
    const activeExamClasses = useMemo(() => {
        const raw = (() => {
            const assigned = (activeExam?.classes && activeExam.classes.length > 0) ? activeExam.classes
                : ((activeExam as any)?.targetClasses && (activeExam as any).targetClasses.length > 0) ? (activeExam as any).targetClasses
                : ((activeExam as any)?.target_classes && (activeExam as any).target_classes.length > 0) ? (activeExam as any).target_classes
                : ((activeExam as any)?.assignedClasses && (activeExam as any).assignedClasses.length > 0) ? (activeExam as any).assignedClasses
                : null;

            if (assigned && Array.isArray(assigned) && assigned.length > 0) {
                const cleanAssigned = assigned.filter((c: string) => !isDemoClassName(c));
                if (cleanAssigned.length > 0) return cleanAssigned;
            }

            if (selectedClasses && selectedClasses.length > 0) {
                const cleanSelected = selectedClasses.filter(c => !isDemoClassName(c));
                if (cleanSelected.length > 0) return cleanSelected;
            }

            const cleanReg = registeredClasses.filter(c => !isDemoClassName(c));
            return cleanReg.length > 0 ? cleanReg : ['Form 1 Central', 'Form 2 Central', 'Form 3 Central', 'Form 4 Central'];
        })();
        // Deduplicate (case-insensitive) to prevent duplicate rows in the exam dashboard
        const seen = new Set<string>();
        return raw.filter(c => {
            const key = (c || '').trim().toLowerCase();
            if (!key || seen.has(key) || isDemoClassName(key)) return false;
            seen.add(key);
            return true;
        });
    }, [activeExam, selectedClasses, registeredClasses]);

    // Per-exam broadsheet store - hydrated from local storage
    const [examMarksStore, setExamMarksStore] = useState<Record<string, any[]>>(() => {
        const store: Record<string, any[]> = {};
        try {
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    Object.assign(store, parsed);
                }
            }
        } catch (e) { }
        return store;
    });

    const examMarksStoreRef = useRef(examMarksStore);
    useEffect(() => {
        examMarksStoreRef.current = examMarksStore;
    }, [examMarksStore]);
    const loadedExamIdRef = useRef<string | null>(null);

    // Helper to get a stable unique deduplication key for a student record
    const getStudentDedupKey = useCallback((s: any): string => {
        if (!s) return '';
        const uId = s.userId || s.user_id;
        if (uId && typeof uId === 'string' && uId.startsWith('usr_')) return `usr_${uId.toLowerCase().trim()}`;
        if (s.id && typeof s.id === 'string' && s.id.startsWith('usr_')) return `usr_${s.id.toLowerCase().trim()}`;

        const adm = s.admissionNumber || s.admission_number || s.admNo || s.admissionNo || s.registrationNo || s.metadata?.admissionNumber;
        if (adm && typeof adm === 'string') {
            const cleanAdm = adm.trim().toLowerCase();
            if (cleanAdm && !cleanAdm.startsWith('usr_') && !cleanAdm.startsWith('user_') && !/^adm-10\d{2,}$/i.test(cleanAdm)) {
                return `adm_${cleanAdm}`;
            }
        }

        const name = s.name || s.fullName || s.studentName || s.metadata?.studentName || s.metadata?.name;
        if (name && typeof name === 'string' && name.trim().length > 2 && !name.toLowerCase().startsWith('student ')) {
            return `name_${name.trim().toLowerCase()}`;
        }

        return s.id ? `id_${String(s.id).toLowerCase()}` : '';
    }, []);

    // Enrollments Registry for genuine stream resolution strictly filtering out non-students
    const [enrollmentsRegistry, setEnrollmentsRegistry] = useState<any[]>(() => {
        try {
            const cached = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                           localStorage.getItem('eduai_student_enrollments_default') ||
                           localStorage.getItem('eduai_student_enrollments') ||
                           localStorage.getItem('student_enrollments') ||
                           (instId ? localStorage.getItem(`eduai_students_${instId}`) : null) ||
                           localStorage.getItem('eduai_students_default');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) return parsed.filter(u => !isNonStudentUser(u));
            }
        } catch (e) {}
        return [];
    });

    // Dynamic Real Students State - strictly students only, never teachers or administrators
    const [allRealStudents, setAllRealStudents] = useState<any[]>(() => {
        const map = new Map<string, any>();
        let cachedEnr: any[] = [];
        try {
            const enrRaw = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                           localStorage.getItem('eduai_student_enrollments_default') ||
                           localStorage.getItem('eduai_student_enrollments') ||
                           localStorage.getItem('student_enrollments');
            if (enrRaw) cachedEnr = JSON.parse(enrRaw) || [];
        } catch (e) {}

        (cachedEnr || []).filter(e => !isNonStudentUser(e)).forEach((enr, enrIdx) => {
            if (!enr) return;
            const adm = enr.admissionNumber || enr.admission_number || enr.admNo || enr.metadata?.admissionNumber || enr.id;
            const name = enr.studentName || enr.student_name || enr.name || enr.metadata?.studentName || enr.metadata?.name;
            const rawCls = enr.studentClass || enr.gradeLevel || enr.className || enr.class || enr.metadata?.gradeLevel || enr.metadata?.studentClass || '';
            const rawStrm = enr.stream || enr.streamName || enr.classStream || enr.metadata?.stream || enr.metadata?.streamName || '';
            const normStrm = normalizeStreamName(rawStrm);
            const fullCls = normStrm && rawCls && !rawCls.toLowerCase().includes(normStrm.toLowerCase())
                ? `${rawCls} ${normStrm}`
                : (rawCls || normStrm);

            const stObj = {
                ...enr,
                role: 'student',
                name: name || `Student ${enrIdx + 1}`,
                studentName: name || `Student ${enrIdx + 1}`,
                admissionNumber: adm,
                admNo: adm,
                studentClass: fullCls,
                stream: normStrm,
                streamName: normStrm,
                gradeLevel: rawCls
            };
            const k = getStudentDedupKey(stObj) || (adm ? `adm_${adm}` : (enr.id ? `enr_${enr.id}` : `idx_${enrIdx}`));
            if (k) map.set(k, stObj);
        });

        // Also merge from users prop strictly filtering genuine students
        (users || []).filter(isStudentUser).forEach(u => {
            const k = getStudentDedupKey(u);
            if (k && !map.has(k)) {
                map.set(k, u);
            }
        });

        return Array.from(map.values());
    });
    // Helper to reliably extract the clean Grade/Level label (e.g. "Form 3", "Grade 8", "PP1")
    const extractGradeLabel = useCallback((str: string): string => {
        if (!str) return '';
        const clean = str.replace(/\s+\d{4}$/, '').trim();
        const lower = clean.toLowerCase();
        if (lower.includes('pp1') || lower.includes('pp 1') || lower.includes('pre-primary 1') || lower.includes('pre primary 1') || lower.includes('baby') || lower.includes('playgroup')) return 'PP1';
        if (lower.includes('pp2') || lower.includes('pp 2') || lower.includes('pre-primary 2') || lower.includes('pre primary 2') || lower.includes('kg') || lower.includes('kindergarten')) return 'PP2';

        // Bare number with or without stream (e.g. "2 east" -> "Grade 2", "8 North" -> "Grade 8", "8" -> "Grade 8")
        const bareMatch = clean.match(/^(\d{1,2})(?:\s+.*)?$/);
        if (bareMatch) {
            return `Grade ${bareMatch[1]}`;
        }

        const parsed = extractClassAndStream(clean);
        if (parsed.className && parsed.className !== 'Unclassified' && parsed.className !== '—') {
            return parsed.className;
        }

        const match = clean.match(/\b(form|grade|std|standard|class)\s*(\d+)\b/i);
        if (match) {
            const prefix = match[1].toLowerCase().startsWith('f') ? 'Form' : 'Grade';
            return `${prefix} ${match[2]}`;
        }
        const shortMatch = clean.match(/\b([fg])\s*(\d+)\b/i);
        if (shortMatch) {
            const prefix = shortMatch[1].toLowerCase() === 'f' ? 'Form' : 'Grade';
            return `${prefix} ${shortMatch[2]}`;
        }
        return clean;
    }, []);

    // Helper to extract the stream part of a class (e.g. "Central", "East", "West", "North")
    const extractStreamName = useCallback((str: string): string | null => {
        if (!str) return null;
        const clean = str.replace(/\s+\d{4}$/, '').trim();

        // Bare number with stream: e.g. "2 east" -> "east"
        const bareWithStream = clean.match(/^\d{1,2}\s+([a-zA-Z].*)$/);
        if (bareWithStream) {
            return normalizeStreamName(bareWithStream[1]);
        }

        const parsed = extractClassAndStream(clean);
        if (parsed.stream) return parsed.stream.toLowerCase();

        const m = clean.match(/\b(east|west|north|south|central|alpha|beta|blue|green|red|yellow|white|gold|silver|ruby|stream\s*[a-z0-9]*|[a-e])\b/i);
        return m ? m[1].toLowerCase() : null;
    }, []);

    // Canonical resolver for { grade, stream } for any student record or class string
    const getStudentStreamAndGrade = useCallback((stOrClass: any) => {
        if (!stOrClass) return { grade: '', stream: '' };
        if (typeof stOrClass === 'string') {
            const clean = stOrClass.replace(/\s+\d{4}$/, '').trim();
            const bareNumWithStream = clean.match(/^(\d{1,2})\s+([a-zA-Z].*)$/);
            if (bareNumWithStream) {
                const grade = `Grade ${bareNumWithStream[1]}`;
                const stream = normalizeStreamName(bareNumWithStream[2]).toUpperCase();
                return { grade, stream };
            }
            const bareNumOnly = clean.match(/^(\d{1,2})$/);
            if (bareNumOnly) {
                return { grade: `Grade ${bareNumOnly[1]}`, stream: '' };
            }

            const parsed = extractClassAndStream(stOrClass);
            const grade = (parsed.className && parsed.className !== 'Unclassified')
                ? parsed.className
                : extractGradeLabel(stOrClass);
            const stream = parsed.stream ? normalizeStreamName(parsed.stream).toUpperCase() : (extractStreamName(stOrClass)?.toUpperCase() || '');
            return { grade, stream };
        }

        // stOrClass is an object (student or enrollment or row)
        const rawClass = stOrClass.studentClass || stOrClass.className || stOrClass.gradeLevel || stOrClass.class || stOrClass.classLevel || stOrClass.grade || stOrClass.metadata?.gradeLevel || stOrClass.metadata?.studentClass || '';
        const cleanRaw = String(rawClass || '').replace(/\s+\d{4}$/, '').trim();

        let parsedGrade = '';
        let parsedStream = '';

        const bareNumWithStream = cleanRaw.match(/^(\d{1,2})\s+([a-zA-Z].*)$/);
        if (bareNumWithStream) {
            parsedGrade = `Grade ${bareNumWithStream[1]}`;
            parsedStream = normalizeStreamName(bareNumWithStream[2]).toUpperCase();
        } else if (/^\d{1,2}$/.test(cleanRaw)) {
            parsedGrade = `Grade ${cleanRaw}`;
        } else {
            const parsed = extractClassAndStream(cleanRaw);
            if (parsed.className && parsed.className !== 'Unclassified') parsedGrade = parsed.className;
            if (parsed.stream) parsedStream = normalizeStreamName(parsed.stream).toUpperCase();
        }

        const rawStream =
            stOrClass.stream ||
            stOrClass.streamName ||
            stOrClass.stream_name ||
            stOrClass.classStream ||
            stOrClass.class_stream ||
            stOrClass.metadata?.stream ||
            stOrClass.metadata?.streamName ||
            stOrClass.metadata?.stream_name ||
            stOrClass.metadata?.classStream ||
            parsedStream ||
            resolveRealStudentStream(stOrClass, enrollmentsRegistry) ||
            extractStreamName(cleanRaw) ||
            '';

        const stream = normalizeStreamName(String(rawStream || '')).toUpperCase();
        const grade = parsedGrade || resolveRealStudentClass(stOrClass, enrollmentsRegistry, courses) || extractGradeLabel(cleanRaw);

        return { grade, stream };
    }, [courses, enrollmentsRegistry, extractGradeLabel, extractStreamName]);

    // Comprehensive helper to resolve student class name across all schema variations
    const getStudentClass = useCallback((st: any): string => {
        if (!st) return '';
        if (typeof st === 'string') return st.trim();
        const { grade, stream } = getStudentStreamAndGrade(st);
        if (grade && stream) {
            return `${grade} ${stream}`;
        }
        if (grade) return grade;
        const explicit = st.studentClass || st.classLevel || st.class_name || st.className || st.gradeLevel || st.class || '';
        return typeof explicit === 'string' ? explicit.trim() : '';
    }, [getStudentStreamAndGrade]);

    // Precise student matcher against target classes
    const isStudentInTargetClasses = useCallback((stOrClass: any, targetClasses: string[]) => {
        if (!stOrClass || !targetClasses || targetClasses.length === 0) return false;
        if (typeof stOrClass === 'object' && isNonStudentUser(stOrClass)) return false;
        if (targetClasses.includes('all') || targetClasses.includes('All Classes')) return true;

        // Direct exact match
        const directClass = typeof stOrClass === 'string'
            ? stOrClass.trim().toLowerCase()
            : (stOrClass.studentClass || stOrClass.className || stOrClass.classLevel || '').trim().toLowerCase();
        if (directClass && targetClasses.some(tc => tc.trim().toLowerCase() === directClass)) {
            return true;
        }

        const { grade: stGrade, stream: stStream } = getStudentStreamAndGrade(stOrClass);
        const stGradeNorm = stGrade.toLowerCase().replace(/[^a-z0-9]/g, '');
        const stStreamNorm = stStream.toLowerCase().replace(/[^a-z0-9]/g, '');

        const extractNum = (s: string) => {
            const m = s.match(/\d+/);
            return m ? m[0] : s;
        };
        const stNum = extractNum(stGradeNorm);

        const expandStreamAlias = (s: string) => {
            if (s === 'w') return 'west';
            if (s === 'e') return 'east';
            if (s === 'n') return 'north';
            if (s === 's') return 'south';
            if (s === 'c') return 'central';
            return s;
        };
        const stStreamExpanded = expandStreamAlias(stStreamNorm);

        return targetClasses.some(tc => {
            if (!tc || tc === 'all' || tc === 'All Classes') return true;
            const { grade: tcGrade, stream: tcStream } = getStudentStreamAndGrade(tc);
            const tcGradeNorm = tcGrade.toLowerCase().replace(/[^a-z0-9]/g, '');
            const tcStreamNorm = tcStream.toLowerCase().replace(/[^a-z0-9]/g, '');
            const tcStreamExpanded = expandStreamAlias(tcStreamNorm);
            const tcNum = extractNum(tcGradeNorm);

            // 1. If both define grades and they do not match, reject
            if (stGradeNorm && tcGradeNorm) {
                const isStForm = stGradeNorm.includes('form');
                const isTcForm = tcGradeNorm.includes('form');
                if (isStForm !== isTcForm) return false;

                if (stGradeNorm !== tcGradeNorm && stNum !== tcNum) {
                    return false;
                }
            }

            // 2. If target class specifies a specific stream (e.g. "NORTH", "EAST", "WEST")
            if (tcStreamExpanded) {
                if (stStreamExpanded) {
                    return stStreamExpanded === tcStreamExpanded;
                }
                // Target has a stream, student has no stream
                return false;
            }

            // 3. Target class does NOT specify a stream (e.g. "Grade 8") -> any student in Grade 8 matches!
            return true;
        });
    }, [getStudentStreamAndGrade]);

    // Helper to resolve clean real student admission numbers across all schema types (strictly real DB student data, NO artificial generation)
    const resolveCleanAdmNo = useCallback((st: any, idx: number): string => {
        if (!st) return 'N/A';

        const candidates = [
            st.admissionNumber,
            st.admission_number,
            st.admNo,
            st.admissionNo,
            st.regNo,
            st.registrationNumber,
            st.studentId,
            st.staffId,
            st.metadata?.admissionNumber,
            st.metadata?.admission_number,
            st.metadata?.admNo,
            st.metadata?.admissionNo,
            st.metadata?.regNo,
            st.user?.admissionNumber,
            st.user?.metadata?.admissionNumber
        ];

        for (const cand of candidates) {
            if (cand !== null && cand !== undefined) {
                const strVal = String(cand).trim();
                if (strVal.length > 0 && !strVal.startsWith('usr_') && !strVal.startsWith('user_') && strVal !== 'undefined' && strVal !== 'null') {
                    return strVal;
                }
            }
        }

        if (st.id && typeof st.id === 'string' && !st.id.startsWith('usr_') && !st.id.startsWith('user_')) {
            return st.id.trim();
        }

        return 'N/A';
    }, []);

    // Helper to resolve clean human-readable student full name across all schema types
    const resolveCleanStudentName = useCallback((st: any, idx: number): string => {
        if (!st) return `Student ${idx + 1}`;
        const candidate =
            st.name ??
            st.fullName ??
            st.full_name ??
            st.studentName ??
            st.student_name ??
            st.userName ??
            st.username ??
            st.metadata?.name ??
            st.metadata?.fullName ??
            st.metadata?.studentName ??
            st.metadata?.student_name ??
            st.user?.name ??
            st.user?.fullName ??
            st.user?.metadata?.name;

        if (typeof candidate === 'string' && candidate.trim() && !candidate.toLowerCase().startsWith('student ')) {
            return candidate.trim();
        }

        const fn = st.firstName || st.first_name || st.metadata?.firstName || st.user?.firstName || st.user?.first_name;
        const ln = st.lastName || st.last_name || st.metadata?.lastName || st.user?.lastName || st.user?.last_name;
        if (fn || ln) {
            return `${fn || ''} ${ln || ''}`.trim();
        }

        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }

        return `Student ${idx + 1}`;
    }, []);

    // Helper to sanitize any loaded broadsheet rows with real student admission numbers & names
    const sanitizeBroadsheetRows = useCallback((rows: any[]) => {
        if (!Array.isArray(rows)) return rows;
        const validRows = rows.filter(r => !isNonStudentUser(r));
        const realStList = allRealStudents.length > 0
            ? allRealStudents.filter(s => !isNonStudentUser(s))
            : (users || []).filter(isStudentUser);

        return validRows.map((row, idx) => {
            const matchedSt = realStList.find(u =>
                (u.name && row.name && u.name.toLowerCase().trim() === row.name.toLowerCase().trim()) ||
                u.id === row.admNo ||
                (u as any).admissionNumber === row.admNo ||
                (u as any).admNo === row.admNo
            );

            if (matchedSt) {
                const resolvedName = resolveCleanStudentName(matchedSt, idx);
                const nameToUse = (resolvedName && !resolvedName.toLowerCase().startsWith('student ')) ? resolvedName : (row.name || resolvedName);
                return { ...row, name: nameToUse, admNo: resolveCleanAdmNo(matchedSt, idx) };
            }
            if (!row.admNo || typeof row.admNo !== 'string' || row.admNo.startsWith('usr_') || row.admNo.startsWith('user_') || /^ADM-10\d{2,}$/i.test(row.admNo)) {
                return { ...row, admNo: resolveCleanAdmNo(matchedSt || row, idx) };
            }
            return row;
        });
    }, [allRealStudents, users, resolveCleanAdmNo, resolveCleanStudentName]);

    // Update real students whenever users prop arrives or changes
    useEffect(() => {
        const fromProps = (users || []).filter(isStudentUser);
        if (fromProps.length > 0) {
            setAllRealStudents(prev => {
                const map = new Map<string, any>();
                prev.filter(s => !isNonStudentUser(s)).forEach(p => {
                    const k = getStudentDedupKey(p);
                    if (k) map.set(k, p);
                });
                fromProps.forEach(st => {
                    const k = getStudentDedupKey(st);
                    if (k && !map.has(k)) {
                        map.set(k, st);
                    }
                });
                return Array.from(map.values());
            });
        }
    }, [users, getStudentDedupKey]);

    useEffect(() => {
        if (!currentInstitution?.id) return;
        // Defer background student enrollment hydration until after UI paints and settles
        const timer = setTimeout(() => {
            const usersPromise = (users && users.length > 0)
                ? Promise.resolve(users)
                : apiService.fetchModuleRecords<any>('users', currentInstitution.id).catch(() => []);
            const studentsPromise = (propStudents && propStudents.length > 0)
                ? Promise.resolve(propStudents)
                : apiService.fetchModuleRecords<any>('students', currentInstitution.id).catch(() => []);

            Promise.all([
                apiService.fetchModuleRecords<any>('student_enrollments', currentInstitution.id).catch(() => []),
                studentsPromise,
                usersPromise
            ]).then(([enrRecords, stRecords, userRecords]) => {
                let effectiveEnrs: any[] = (enrRecords && Array.isArray(enrRecords) && enrRecords.length > 0) ? enrRecords : [];
                try {
                    const cachedEnrRaw = localStorage.getItem(`eduai_student_enrollments_${currentInstitution.id}`) ||
                                         localStorage.getItem('eduai_student_enrollments');
                    if (cachedEnrRaw) {
                        const parsed = JSON.parse(cachedEnrRaw);
                        if (Array.isArray(parsed) && parsed.length > effectiveEnrs.length) {
                            effectiveEnrs = parsed;
                        }
                    }
                } catch (e) {}

                if (effectiveEnrs.length > 0) {
                    setEnrollmentsRegistry(effectiveEnrs);
                    try {
                        const compact = effectiveEnrs.length > 50 ? effectiveEnrs.slice(0, 50) : effectiveEnrs;
                        safeLocalStorage.setItem(`eduai_student_enrollments_${currentInstitution.id}`, JSON.stringify(compact));
                    } catch (e) {}
                }

                // Build userId → user lookup for hydrating enrollment records
                const userById = new Map<string, any>();
                [...(stRecords || []), ...(userRecords || [])].forEach(u => {
                    if (u?.id) userById.set(u.id, u);
                    if (u?.userId) userById.set(u.userId, u);
                });

                // Hydrate enrollment records: inject name, adm, class and STREAM
                const hydratedEnrollments: any[] = (effectiveEnrs || []).map((enr: any) => {
                    if (!enr) return null;
                    const linkedUser = (enr.userId ? userById.get(enr.userId) : null) || (enr.user_id ? userById.get(enr.user_id) : null);
                    const resolvedName =
                        (linkedUser?.name && !linkedUser.name.toLowerCase().startsWith('student ') ? linkedUser.name : null) ||
                        enr.metadata?.studentName ||
                        enr.metadata?.name ||
                        enr.metadata?.fullName ||
                        linkedUser?.name ||
                        enr.name ||
                        null;

                    // Resolve admission number
                    const resolvedAdm =
                        enr.admissionNumber || enr.admission_number || enr.admNo ||
                        linkedUser?.admissionNumber || linkedUser?.admission_number || linkedUser?.admNo ||
                        enr.metadata?.admissionNumber || enr.metadata?.admNo || null;

                    // Resolve class/grade
                    const resolvedClass =
                        enr.metadata?.gradeLevel || enr.metadata?.studentClass || enr.metadata?.class ||
                        linkedUser?.studentClass || linkedUser?.classLevel || linkedUser?.grade ||
                        enr.studentClass || enr.gradeLevel || enr.grade || null;

                    // Resolve stream
                    const resolvedStream = (
                        resolveRealStudentStream(enr, effectiveEnrs) ||
                        (linkedUser ? resolveRealStudentStream(linkedUser, effectiveEnrs) : '') ||
                        enr.stream || enr.streamName || enr.classStream ||
                        enr.metadata?.stream || enr.metadata?.streamName || enr.metadata?.classStream ||
                        linkedUser?.stream || linkedUser?.streamName ||
                        ''
                    ).trim();

                    const fullClassName = resolvedStream && resolvedClass && !resolvedClass.toLowerCase().includes(resolvedStream.toLowerCase())
                        ? `${resolvedClass} ${resolvedStream}`
                        : (resolvedClass || enr.studentClass);

                    return {
                        ...enr,
                        name: resolvedName || enr.name || '',
                        admissionNumber: resolvedAdm || enr.admissionNumber,
                        studentClass: fullClassName,
                        stream: resolvedStream || enr.stream,
                        streamName: resolvedStream || enr.streamName,
                        metadata: {
                            ...(enr.metadata || {}),
                            ...(resolvedName ? { studentName: resolvedName } : {}),
                            ...(resolvedClass ? { gradeLevel: resolvedClass } : {}),
                            ...(resolvedStream ? { stream: resolvedStream } : {})
                        }
                    };
                }).filter(Boolean);

                const unifiedStudentMap = new Map<string, any>();

                // 1. Process enrollment records first (primary source for active class enrollment)
                hydratedEnrollments.filter(e => !isNonStudentUser(e)).forEach((enr: any, enrIdx: number) => {
                    if (!enr) return;
                    const key = getStudentDedupKey(enr) || (enr.admissionNumber ? `adm_${enr.admissionNumber}` : (enr.id ? `enr_${enr.id}` : `idx_${enrIdx}`));
                    if (key) unifiedStudentMap.set(key, enr);
                });

                // 2. Process student registry & user records without creating duplicate rows
                [...(stRecords || []).filter(s => !isNonStudentUser(s)), ...(userRecords || []).filter(isStudentUser)].forEach((u: any) => {
                    if (!u || !isStudentUser(u)) return;
                    const key = getStudentDedupKey(u);
                    if (!key) return;

                    const uStream = resolveRealStudentStream(u, enrRecords) || u.stream || u.streamName || u.metadata?.stream || '';
                    const existing = unifiedStudentMap.get(key);
                    if (!existing) {
                        const uClass = u.studentClass || u.classLevel || u.grade || '';
                        const fullClass = uStream && uClass && !uClass.toLowerCase().includes(uStream.toLowerCase())
                            ? `${uClass} ${uStream}`
                            : uClass;
                        unifiedStudentMap.set(key, {
                            ...u,
                            stream: uStream,
                            streamName: uStream,
                            studentClass: fullClass
                        });
                    } else {
                        const existingNameOk = existing.name && !existing.name.toLowerCase().startsWith('student ') && existing.name.trim().length > 2;
                        const newNameOk = u.name && !u.name.toLowerCase().startsWith('student ') && u.name.trim().length > 2;
                        const streamToUse = existing.stream || uStream;
                        const classToUse = existing.studentClass || u.studentClass || existing.classLevel || u.classLevel || existing.grade || u.grade;
                        unifiedStudentMap.set(key, {
                            ...u,
                            ...existing,
                            name: existingNameOk ? existing.name : (newNameOk ? u.name : (existing.name || u.name)),
                            stream: streamToUse,
                            streamName: streamToUse,
                            studentClass: streamToUse && classToUse && !classToUse.toLowerCase().includes(streamToUse.toLowerCase())
                                ? `${classToUse} ${streamToUse}`
                                : classToUse,
                            admissionNumber: existing.admissionNumber || u.admissionNumber || existing.admNo || u.admNo,
                        });
                    }
                });

                const unique = Array.from(unifiedStudentMap.values());
                if (unique.length > 0) {
                    setAllRealStudents(unique);
                    try {
                        localStorage.setItem(`eduai_students_${currentInstitution.id}`, JSON.stringify(unique));
                    } catch (e) { }
                }
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [currentInstitution, isStudentUser, getStudentDedupKey]);



    // Broadsheet Spreadsheet State
    const [marksDisplayMode, setMarksDisplayMode] = useState<'raw' | 'converted' | 'dual'>('raw');
    const [broadsheetStudentRows, setBroadsheetStudentRows] = useState(() => {
        const initExamId = selectedExamId || (exams && exams[0]?.id);
        if (initExamId && examMarksStore[initExamId] && Array.isArray(examMarksStore[initExamId]) && examMarksStore[initExamId].length > 0) {
            return examMarksStore[initExamId];
        }
        return defaultSampleRows;
    });
    const [searchStudentQuery, setSearchStudentQuery] = useState('');

    /** Restore rows from a snapshot key */
    const restoreFromSnapshot = useCallback((snapshotKey: string) => {
        try {
            const raw = localStorage.getItem(snapshotKey);
            if (!raw) { alert('Backup not found.'); return; }
            const snap = JSON.parse(raw);
            if (!Array.isArray(snap.rows) || snap.rows.length === 0) { alert('Backup is empty.'); return; }
            setBroadsheetStudentRows(snap.rows);
            setExamMarksStore(prev => ({ ...prev, [snap.examId]: snap.rows }));
            setSaveToastMessage(`✅ Restored ${snap.rows.length} student marks from backup (${snap.classes?.join(', ')} — ${new Date(snap.savedAt).toLocaleString()})`);
            setTimeout(() => setSaveToastMessage(null), 6000);
            setIsBackupPanelOpen(false);
        } catch (e) { alert('Failed to restore backup.'); }
    }, []);

    // Fetch saved broadsheets and module state from DB on mount (exam_units is already fetched at top)
    useEffect(() => {
        const instId = currentInstitution?.id;
        if (instId) {
            apiService.fetchModuleRecords<any>('institution_module_states', instId)
                .then(records => {
                    const match = (records || []).find(r => r.id === `ims_exam_broadsheets_${instId}` || r.id === `broadsheets_${instId}` || r.module_id === 'exam_broadsheets' || r.moduleId === 'exam_broadsheets' || r.moduleName === 'exam_broadsheets');
                    const storeData = match?.settings || match?.stateData || match?.data;
                    if (storeData && typeof storeData === 'object') {
                        setExamMarksStore(prev => ({ ...prev, ...storeData }));
                        // Non-blocking deferred local cache update
                        setTimeout(() => {
                            try {
                                localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(storeData));
                            } catch (e) { }
                        }, 500);

                        if (selectedExamId && storeData[selectedExamId] && Array.isArray(storeData[selectedExamId]) && storeData[selectedExamId].length > 0) {
                            setBroadsheetStudentRows(sanitizeBroadsheetRows(storeData[selectedExamId]));
                        }
                    }

                    const examUnitsMatch = (records || []).find(r => r.id === `ims_exam_units_${instId}` || r.module_id === 'exam_units' || r.moduleId === 'exam_units');
                    if (examUnitsMatch) {
                        const rawData = examUnitsMatch.data || examUnitsMatch.settings || examUnitsMatch.stateData;
                        const remoteExams = Array.isArray(rawData) ? rawData : (rawData?.exams || []);
                        const remoteTombstones = examUnitsMatch.settings?.deletedExamIds || examUnitsMatch.data?.deletedExamIds;
                        if (Array.isArray(remoteTombstones) && remoteTombstones.length > 0) {
                            try {
                                const mergedTombstones = Array.from(new Set([...getDeletedExamIds(instId), ...remoteTombstones.map(String)]));
                                localStorage.setItem(`eduai_deleted_exam_ids_${instId}`, JSON.stringify(mergedTombstones));
                            } catch (_) { }
                        }
                        if (remoteExams.length > 0) {
                            const dummyIds = new Set(['exam_1', 'exam_2', 'exam_3', 'exam_pub_1', 'exam_pub_2', 'exam_pub_3']);
                            const cleanRemote = remoteExams.filter((e: any) => e && e.id && !dummyIds.has(e.id));
                            setExams(prev => {
                                const map = new Map<string, ExamUnitRecord>();
                                prev.filter(e => !dummyIds.has(e.id)).forEach(e => map.set(e.id, e));
                                cleanRemote.forEach((r: any) => map.set(r.id, { ...map.get(r.id), ...r }));
                                const merged = filterDeletedExams(instId, Array.from(map.values()));
                                // Asynchronously persist to avoid blocking React state update
                                setTimeout(() => {
                                    try {
                                        localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(merged));
                                    } catch (e) { }
                                }, 500);
                                return merged;
                            });
                        }
                    }
                })
                .catch(() => { });
        }

        const handleAcademicsSync = () => {
            try {
                if (currentInstitution?.id) {
                    const saved = localStorage.getItem(`eduai_exam_broadsheets_${currentInstitution.id}`);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed && typeof parsed === 'object') {
                            setExamMarksStore(prev => ({ ...prev, ...parsed }));
                            if (selectedExamId && parsed[selectedExamId] && Array.isArray(parsed[selectedExamId])) {
                                setBroadsheetStudentRows(sanitizeBroadsheetRows(parsed[selectedExamId]));
                            }
                        }
                    }
                }
            } catch (e) { }
        };

        window.addEventListener('eduai_broadsheets_updated', handleAcademicsSync);
        window.addEventListener('eduai_academics_synced', handleAcademicsSync);
        return () => {
            window.removeEventListener('eduai_broadsheets_updated', handleAcademicsSync);
            window.removeEventListener('eduai_academics_synced', handleAcademicsSync);
        };
    }, [currentInstitution?.id, selectedExamId, sanitizeBroadsheetRows]);

    // Display students list for Choose from students modal
    const displayStudentsList = useMemo(() => {
        if (allRealStudents.length > 0) {
            return allRealStudents.map((st, idx) => ({
                id: (st as any).id || (st as any).admissionNumber || resolveCleanAdmNo(st, idx),
                admNo: resolveCleanAdmNo(st, idx),
                name: resolveCleanStudentName(st, idx),
                class: getStudentClass(st) || 'Grade 1 S 2026',
            }));
        }
        return defaultSampleRows.map((st) => ({
            id: st.admNo,
            admNo: st.admNo,
            name: st.name,
            class: st.class || 'Form 3 Central',
        }));
    }, [allRealStudents, resolveCleanAdmNo, resolveCleanStudentName, getStudentClass, defaultSampleRows]);

    const filteredPickerStudents = useMemo(() => {
        let list = displayStudentsList;
        const q = studentPickerSearch.trim().toLowerCase();
        if (q) {
            list = list.filter(st =>
                st.name.toLowerCase().includes(q) ||
                st.admNo.toLowerCase().includes(q) ||
                st.class.toLowerCase().includes(q)
            );
        }
        return list;
    }, [displayStudentsList, studentPickerSearch]);

    // Update broadsheet rows whenever selectedExamId changes (optimized without infinite re-render loops)
    useEffect(() => {
        if (!selectedExamId || !activeExam) return;

        const currentStore = examMarksStoreRef.current;
        const existingRows = currentStore[selectedExamId];

        let activeStList = allRealStudents.length > 0
            ? allRealStudents.filter(s => !isNonStudentUser(s))
            : (propStudents && propStudents.length > 0 ? propStudents.filter(isStudentUser) : (users || []).filter(isStudentUser));

        if (activeStList.length === 0 || activeStList.length < 10) {
            try {
                const cached = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                               localStorage.getItem('eduai_student_enrollments') ||
                               localStorage.getItem(`eduai_students_${instId}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                        const cleanParsed = parsed.filter(u => !isNonStudentUser(u));
                        if (cleanParsed.length > activeStList.length) {
                            activeStList = cleanParsed;
                        }
                    }
                }
            } catch (e) {}
        }

        const targetClasses = activeExamClasses.length > 0 ? activeExamClasses : ['Form 3 Central'];

        // Filter real students strictly for this active exam's target classes
        const matchingRealStudents = activeStList.filter(st => {
            if (isNonStudentUser(st)) return false;
            const stClass = getStudentClass(st);
            return isStudentInTargetClasses(stClass || st, targetClasses);
        });

        // 1. Check in-memory store
        if (existingRows && Array.isArray(existingRows) && existingRows.length > 0) {
            const hasGenericStudentNames = existingRows.some(r => r.name && r.name.toLowerCase().startsWith('student '));
            const hasPlaceholderAdm = existingRows.some(r => !r.admNo || r.admNo === 'N/A' || /^ADM-10\d{2,}$/i.test(r.admNo));
            const hasFewerRowsThanReal = matchingRealStudents.length > existingRows.length && (hasPlaceholderAdm || existingRows.length <= 15);

            // If store contains generic "Student 1" names or placeholder rows and real students are available, refresh with real student names
            if ((hasGenericStudentNames || hasPlaceholderAdm || hasFewerRowsThanReal) && matchingRealStudents.length > 0 && loadedExamIdRef.current !== selectedExamId) {
                loadedExamIdRef.current = selectedExamId;
                const freshSource = matchingRealStudents.map((st, idx) => {
                    const adm = resolveCleanAdmNo(st, idx);
                    const cleanName = resolveCleanStudentName(st, idx);
                    const existingRow = existingRows.find(r => (adm && r.admNo === adm) || (r.name && r.name.toLowerCase().trim() === cleanName.toLowerCase().trim()));
                    return {
                        ...(existingRow || {}),
                        admNo: adm,
                        name: cleanName,
                        class: getStudentClass(st) || targetClasses[0],
                        mathP1: existingRow?.mathP1 || 0,
                        mathP2: existingRow?.mathP2 || 0,
                        engP1: existingRow?.engP1 || 0,
                        engP2: existingRow?.engP2 || 0,
                        kiswP1: existingRow?.kiswP1 || 0,
                        bioP1: existingRow?.bioP1 || 0
                    };
                });
                setBroadsheetStudentRows(freshSource);
                setExamMarksStore(prev => ({ ...prev, [selectedExamId]: freshSource }));
                setExams(prev => {
                    const target = prev.find(ex => ex.id === selectedExamId);
                    if (!target || target.studentsEnrolled === freshSource.length) return prev;
                    return prev.map(ex => ex.id === selectedExamId ? { ...ex, studentsEnrolled: freshSource.length } : ex);
                });
                try {
                    localStorage.setItem(`eduai_exam_broadsheet_${selectedExamId}`, JSON.stringify(freshSource));
                    if (currentInstitution?.id) {
                        const stored = JSON.parse(localStorage.getItem(`eduai_exam_units_${currentInstitution.id}`) || '[]');
                        if (Array.isArray(stored)) {
                            localStorage.setItem(`eduai_exam_units_${currentInstitution.id}`, JSON.stringify(
                                stored.map((ex: any) => ex.id === selectedExamId ? { ...ex, studentsEnrolled: freshSource.length } : ex)
                            ));
                        }
                    }
                } catch (e) { }
                return;
            }

            if (loadedExamIdRef.current !== selectedExamId) {
                loadedExamIdRef.current = selectedExamId;
                setBroadsheetStudentRows(sanitizeBroadsheetRows(existingRows));
            }
            return;
        }

        // 2. Check localStorage
        try {
            const savedBroadsheet = localStorage.getItem(`eduai_exam_broadsheet_${selectedExamId}`);
            if (savedBroadsheet) {
                const parsed = JSON.parse(savedBroadsheet);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const hasGenericStudentNames = parsed.some((r: any) => r.name && r.name.toLowerCase().startsWith('student '));
                    const hasPlaceholderAdm = parsed.some((r: any) => !r.admNo || r.admNo === 'N/A' || /^ADM-10\d{2,}$/i.test(r.admNo));
                    const hasFewerRowsThanReal = matchingRealStudents.length > parsed.length && (hasPlaceholderAdm || parsed.length <= 15);

                    if ((hasGenericStudentNames || hasPlaceholderAdm || hasFewerRowsThanReal) && matchingRealStudents.length > 0 && loadedExamIdRef.current !== selectedExamId) {
                        loadedExamIdRef.current = selectedExamId;
                        const freshSource = matchingRealStudents.map((st, idx) => {
                            const adm = resolveCleanAdmNo(st, idx);
                            const cleanName = resolveCleanStudentName(st, idx);
                            const existingRow = parsed.find((r: any) => (adm && r.admNo === adm) || (r.name && r.name.toLowerCase().trim() === cleanName.toLowerCase().trim()));
                            return {
                                ...(existingRow || {}),
                                admNo: adm,
                                name: cleanName,
                                class: getStudentClass(st) || targetClasses[0],
                                mathP1: existingRow?.mathP1 || 0,
                                mathP2: existingRow?.mathP2 || 0,
                                engP1: existingRow?.engP1 || 0,
                                engP2: existingRow?.engP2 || 0,
                                kiswP1: existingRow?.kiswP1 || 0,
                                bioP1: existingRow?.bioP1 || 0
                            };
                        });
                        setBroadsheetStudentRows(freshSource);
                        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: freshSource }));
                        setExams(prev => {
                            const target = prev.find(ex => ex.id === selectedExamId);
                            if (!target || target.studentsEnrolled === freshSource.length) return prev;
                            return prev.map(ex => ex.id === selectedExamId ? { ...ex, studentsEnrolled: freshSource.length } : ex);
                        });
                        try {
                            localStorage.setItem(`eduai_exam_broadsheet_${selectedExamId}`, JSON.stringify(freshSource));
                            if (currentInstitution?.id) {
                                const stored = JSON.parse(localStorage.getItem(`eduai_exam_units_${currentInstitution.id}`) || '[]');
                                if (Array.isArray(stored)) {
                                    localStorage.setItem(`eduai_exam_units_${currentInstitution.id}`, JSON.stringify(
                                        stored.map((ex: any) => ex.id === selectedExamId ? { ...ex, studentsEnrolled: freshSource.length } : ex)
                                    ));
                                }
                            }
                        } catch (e) { }
                        return;
                    }

                    if (loadedExamIdRef.current !== selectedExamId) {
                        loadedExamIdRef.current = selectedExamId;
                        const sanitized = sanitizeBroadsheetRows(parsed);
                        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: sanitized }));
                        setBroadsheetStudentRows(sanitized);
                    }
                    return;
                }
            }
        } catch (e) { }

        // 3. Check DB
        if (currentInstitution?.id && selectedExamId.startsWith('exam_')) {
            apiService.fetchModuleRecords<any>('exam_broadsheets', currentInstitution.id)
                .then(records => {
                    const match = (records || []).find(r => r.id === selectedExamId || r.examId === selectedExamId);
                    if (match && match.rows && Array.isArray(match.rows) && match.rows.length > 0) {
                        const hasPlaceholderAdm = match.rows.some((r: any) => !r.admNo || r.admNo === 'N/A' || /^ADM-10\d{2,}$/i.test(r.admNo));
                        const hasFewerRowsThanReal = matchingRealStudents.length > match.rows.length && (hasPlaceholderAdm || match.rows.length <= 15);
                        if ((hasPlaceholderAdm || hasFewerRowsThanReal) && matchingRealStudents.length > 0 && loadedExamIdRef.current !== selectedExamId) {
                            loadedExamIdRef.current = selectedExamId;
                            const freshSource = matchingRealStudents.map((st, idx) => {
                                const adm = resolveCleanAdmNo(st, idx);
                                const cleanName = resolveCleanStudentName(st, idx);
                                const existingRow = match.rows.find((r: any) => (adm && r.admNo === adm) || (r.name && r.name.toLowerCase().trim() === cleanName.toLowerCase().trim()));
                                return {
                                    ...(existingRow || {}),
                                    admNo: adm,
                                    name: cleanName,
                                    class: getStudentClass(st) || targetClasses[0],
                                    mathP1: existingRow?.mathP1 || 0,
                                    mathP2: existingRow?.mathP2 || 0,
                                    engP1: existingRow?.engP1 || 0,
                                    engP2: existingRow?.engP2 || 0,
                                    kiswP1: existingRow?.kiswP1 || 0,
                                    bioP1: existingRow?.bioP1 || 0
                                };
                            });
                            setBroadsheetStudentRows(freshSource);
                            setExamMarksStore(prev => ({ ...prev, [selectedExamId]: freshSource }));
                            setExams(prev => {
                                const target = prev.find(ex => ex.id === selectedExamId);
                                if (!target || target.studentsEnrolled === freshSource.length) return prev;
                                return prev.map(ex => ex.id === selectedExamId ? { ...ex, studentsEnrolled: freshSource.length } : ex);
                            });
                            try {
                                localStorage.setItem(`eduai_exam_broadsheet_${selectedExamId}`, JSON.stringify(freshSource));
                            } catch (e) { }
                            return;
                        }

                        if (loadedExamIdRef.current !== selectedExamId) {
                            loadedExamIdRef.current = selectedExamId;
                            const sanitized = sanitizeBroadsheetRows(match.rows);
                            setExamMarksStore(prev => ({ ...prev, [selectedExamId]: sanitized }));
                            setBroadsheetStudentRows(sanitized);
                        }
                        return;
                    }
                })
                .catch(() => { });
        }

        // 4. Default clean rows for target classes (using matching real students or official student registry)
        loadedExamIdRef.current = selectedExamId;
        let cleanRows: any[] = [];
        if (matchingRealStudents.length > 0) {
            cleanRows = matchingRealStudents.map((st, idx) => ({
                admNo: resolveCleanAdmNo(st, idx),
                name: resolveCleanStudentName(st, idx),
                class: getStudentClass(st) || targetClasses[0],
                mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
            }));
        } else {
            const systemRegistryStudents = [
                { id: `st_reg_1`, name: 'Maxine Jelimo', admissionNumber: '2008' },
                { id: `st_reg_2`, name: 'Dennis Kiplagat', admissionNumber: '2244' },
                { id: `st_reg_3`, name: 'Felix Kipkosgei', admissionNumber: '1897' },
                { id: `st_reg_4`, name: 'Job Kipkorir Kipkoech', admissionNumber: '1712' },
                { id: `st_reg_5`, name: 'Linett Chepkorir Agui', admissionNumber: '2127' },
                { id: `st_reg_6`, name: 'Mercy Chepngetich', admissionNumber: '1838' },
                { id: `st_reg_7`, name: 'Sharon Chebet', admissionNumber: '1834' },
                { id: `st_reg_8`, name: 'Brian Kipkurui', admissionNumber: '1972' },
                { id: `st_reg_9`, name: 'Faith Chepkoech', admissionNumber: '1957' },
                { id: `st_reg_10`, name: 'Kipkoech Rotich', admissionNumber: '1967' }
            ];

            targetClasses.forEach((cName) => {
                systemRegistryStudents.forEach((st) => {
                    cleanRows.push({
                        admNo: st.admissionNumber,
                        name: st.name,
                        class: cName,
                        mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
                    });
                });
            });
        }
        setBroadsheetStudentRows(cleanRows);
        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: cleanRows }));
    }, [selectedExamId, currentInstitution, users, activeExamClasses, allRealStudents, isStudentInTargetClasses, getStudentClass, sanitizeBroadsheetRows, resolveCleanAdmNo, resolveCleanStudentName]);

    // Fast synchronous exam selector for 0ms transition
    const handleSelectExam = useCallback((examId: string) => {
        if (!examId) return;
        setSelectedExamId(examId);
        try {
            localStorage.setItem(`eduai_last_selected_exam_${instId}`, examId);
        } catch (e) {}

        // 1. Instant synchronous load from in-memory store
        const fromStore = examMarksStoreRef.current[examId];
        if (fromStore && Array.isArray(fromStore) && fromStore.length > 0) {
            loadedExamIdRef.current = examId;
            setBroadsheetStudentRows(sanitizeBroadsheetRows(fromStore));
            return;
        }

        // 2. Instant synchronous load from per-exam localStorage cache
        try {
            const rawSaved = localStorage.getItem(`eduai_exam_broadsheet_${examId}`);
            if (rawSaved) {
                const parsed = JSON.parse(rawSaved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    loadedExamIdRef.current = examId;
                    const sanitized = sanitizeBroadsheetRows(parsed);
                    setExamMarksStore(prev => ({ ...prev, [examId]: sanitized }));
                    setBroadsheetStudentRows(sanitized);
                    return;
                }
            }
        } catch (e) {}
    }, [instId, sanitizeBroadsheetRows]);

    // Distinct unique grades available across the ENTIRE institution (used in Add Exam Modal)
    const institutionAvailableGrades = useMemo(() => {
        const gradeSet = new Set<string>();

        const allCandidateClasses = [
            ...registeredClasses,
            ...(users || []).map(u => (u as any).studentClass || (u as any).classLevel || (u as any).class || ''),
            ...(allRealStudents || []).map(st => getStudentClass(st)),
            // Also include classes from ALL existing exam records so filters are complete
            ...(exams || []).flatMap(e => e.classes || [])
        ];

        allCandidateClasses.forEach(c => {
            if (!c || typeof c !== 'string') return;
            const parsed = extractClassAndStream(c);
            const g = (parsed.className && parsed.className !== 'Unclassified') ? parsed.className : extractGradeLabel(c);
            if (g && g.trim().length > 0 && g.toLowerCase() !== 'all' && g.toLowerCase() !== 'all classes') {
                gradeSet.add(g.trim());
            }
        });

        if (gradeSet.size === 0) {
            ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(g => gradeSet.add(g));
        }

        return naturalClassSort(Array.from(gradeSet));
    }, [registeredClasses, users, allRealStudents, getStudentClass, extractGradeLabel, exams]);

    // Distinct unique grades assigned STRICTLY to the active exam (used on Dashboard & Broadsheet filter)
    const activeExamAvailableGrades = useMemo(() => {
        const gradeSet = new Set<string>();
        (activeExamClasses || []).forEach(c => {
            if (!c || typeof c !== 'string') return;
            const parsed = extractClassAndStream(c);
            const g = (parsed.className && parsed.className !== 'Unclassified') ? parsed.className : extractGradeLabel(c);
            if (g && g.trim().length > 0 && g.toLowerCase() !== 'all' && g.toLowerCase() !== 'all classes') {
                gradeSet.add(g.trim());
            }
        });
        return naturalClassSort(Array.from(gradeSet));
    }, [activeExamClasses, extractGradeLabel]);

    const availableGrades = institutionAvailableGrades;

    // Available class streams in modal, strictly isolated to selectedGradeFilter when a grade is chosen
    const modalAvailableClasses = useMemo(() => {
        const baseClasses = activeExamClasses.length > 0 ? activeExamClasses : registeredClasses;
        const cleanedSet = new Set<string>();

        baseClasses.forEach(c => {
            if (!c || typeof c !== 'string' || isDemoClassName(c)) return;
            const clean = c.replace(/\s+\d{4}$/, '').trim();
            if (clean && clean.toLowerCase() !== 'all' && clean.toLowerCase() !== 'all classes' && !isDemoClassName(clean)) {
                cleanedSet.add(clean);
            }
        });

        allRealStudents.forEach(st => {
            const cl = getStudentClass(st);
            if (cl && typeof cl === 'string' && !isDemoClassName(cl)) {
                const clean = cl.replace(/\s+\d{4}$/, '').trim();
                if (clean && clean.toLowerCase() !== 'all' && clean.toLowerCase() !== 'all classes' && !isDemoClassName(clean)) {
                    cleanedSet.add(clean);
                }
            }
        });

        const list = Array.from(cleanedSet).filter(c => !isDemoClassName(c));

        if (selectedGradeFilter && selectedGradeFilter !== 'all') {
            const normSelectedGrade = extractGradeLabel(selectedGradeFilter).toLowerCase();
            const filtered = list.filter(c => extractGradeLabel(c).toLowerCase() === normSelectedGrade);
            return filtered.length > 0 ? filtered : list;
        }

        return list;
    }, [activeExamClasses, registeredClasses, allRealStudents, getStudentClass, selectedGradeFilter, extractGradeLabel]);

    const lastFilteredStudentRowsRef = useRef<any[]>([]);

    const filteredStudentRows = useMemo(() => {
        // While Broadsheet modal is closed, do not perform expensive calculations/sorting across all students
        if (!isBroadsheetModalOpen) {
            return lastFilteredStudentRowsRef.current;
        }

        // While Add/Edit exam modal is open, preserve previously filtered student rows
        // to avoid freezing the UI thread with synchronous calculations across all students
        if (isAddExamModalOpen && lastFilteredStudentRowsRef.current.length > 0) {
            return lastFilteredStudentRowsRef.current;
        }

        const activeStList = allRealStudents.length > 0
            ? allRealStudents.filter(s => !isNonStudentUser(s))
            : (users || []).filter(isStudentUser);

        // Determine effective target classes based on both grade filter and class filter
        let targetClasses: string[] = [];
        if (selectedClassFilter && selectedClassFilter !== 'all') {
            targetClasses = [selectedClassFilter];
        } else if (selectedGradeFilter && selectedGradeFilter !== 'all') {
            targetClasses = modalAvailableClasses.length > 0 ? modalAvailableClasses : [selectedGradeFilter];
        } else if (activeExamClasses.length > 0) {
            targetClasses = activeExamClasses;
        }

        let rows = broadsheetStudentRows;

        if (activeStList.length > 0) {
            // Find real students strictly enrolled in targetClasses and matching selected grade
            const matchedReal = targetClasses.length > 0
                ? activeStList.filter(st => {
                    const stClass = getStudentClass(st);
                    if (selectedGradeFilter && selectedGradeFilter !== 'all') {
                        const stGrade = extractGradeLabel(stClass).toLowerCase();
                        const reqGrade = extractGradeLabel(selectedGradeFilter).toLowerCase();
                        if (stGrade && reqGrade && stGrade !== reqGrade) return false;
                    }
                    return isStudentInTargetClasses(stClass, targetClasses);
                })
                : activeStList;

            if (matchedReal.length > 0 && targetClasses.length > 0) {
                // Pre-index broadsheetStudentRows for instant O(1) lookup
                const bByAdm = new Map<string, any>();
                const bByName = new Map<string, any>();
                (broadsheetStudentRows || []).forEach(r => {
                    if (r.admNo && r.admNo !== 'N/A') bByAdm.set(String(r.admNo).trim(), r);
                    if (r.name) bByName.set(String(r.name).trim().toLowerCase(), r);
                });

                // Map matchedReal strictly to their existing broadsheet row or create clean rows
                rows = matchedReal.map((st, idx) => {
                    const adm = resolveCleanAdmNo(st, idx);
                    const cleanName = resolveCleanStudentName(st, idx);
                    const existingRow = (adm && adm !== 'N/A' && bByAdm.get(String(adm).trim())) ||
                                        (cleanName && bByName.get(cleanName.toLowerCase().trim()));
                    if (existingRow) {
                        const nameToUse = (cleanName && !cleanName.toLowerCase().startsWith('student ')) ? cleanName : (existingRow.name || cleanName);
                        const targetClass = getStudentClass(st) || targetClasses[0];
                        if (existingRow.admNo === adm && existingRow.name === nameToUse && existingRow.class === targetClass) {
                            return existingRow;
                        }
                        return { ...existingRow, admNo: adm, name: nameToUse, class: targetClass };
                    }
                    return {
                        admNo: adm,
                        name: cleanName,
                        class: getStudentClass(st) || targetClasses[0],
                        mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
                    };
                });
            } else if (targetClasses.length > 0) {
                rows = rows.filter(r => {
                    if (selectedGradeFilter && selectedGradeFilter !== 'all') {
                        const rGrade = extractGradeLabel(r.class || '').toLowerCase();
                        const reqGrade = extractGradeLabel(selectedGradeFilter).toLowerCase();
                        if (rGrade && reqGrade && rGrade !== reqGrade) return false;
                    }
                    return isStudentInTargetClasses(r.class || '', targetClasses);
                });
            }
        } else if (targetClasses.length > 0) {
            rows = rows.filter(r => {
                if (selectedGradeFilter && selectedGradeFilter !== 'all') {
                    const rGrade = extractGradeLabel(r.class || '').toLowerCase();
                    const reqGrade = extractGradeLabel(selectedGradeFilter).toLowerCase();
                    if (rGrade && reqGrade && rGrade !== reqGrade) return false;
                }
                return isStudentInTargetClasses(r.class || '', targetClasses);
            });
        }

        if (searchStudentQuery.trim()) {
            const q = searchStudentQuery.toLowerCase().trim();
            rows = rows.filter(st =>
                (st.name || '').toLowerCase().includes(q) || (st.admNo || '').toLowerCase().includes(q)
            );
        }

        // Enable student data sorting by Admission Number or Student Name
        let sorted = [...rows].sort((a, b) => {
            const valA = (sortField === 'admNo' ? (a.admNo || '') : (a.name || '')).toString().trim();
            const valB = (sortField === 'admNo' ? (b.admNo || '') : (b.name || '')).toString().trim();

            if (sortField === 'admNo') {
                const numA = parseInt(valA.replace(/\D/g, ''), 10);
                const numB = parseInt(valB.replace(/\D/g, ''), 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return sortOrder === 'asc' ? numA - numB : numB - numA;
                }
            }

            const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            return sortOrder === 'asc' ? cmp : -cmp;
        });

        // ── Subject-teacher stream restriction ─────────────────────────────────
        // If the logged-in user is a teacher and a subject filter is active,
        // only show students from the class streams they are allocated to for
        // that specific subject. When 'all' subjects are shown, show streams
        // across all their allocations (union).
        if (teacherSubjectClassMap !== null) {
            const norm = (s: string) => (s || '').trim().toLowerCase();
            let allowedClasses: string[] | null = null;
            if (selectedSubjectFilter && selectedSubjectFilter !== 'all') {
                // Subject-specific restriction
                const subKey = norm(selectedSubjectFilter);
                // Try exact match first, then prefix/partial match
                const exactClasses = teacherSubjectClassMap[subKey];
                if (exactClasses) {
                    allowedClasses = exactClasses;
                } else {
                    // Fuzzy: find any allocated subject that contains/matches this subject
                    const fuzzyKey = Object.keys(teacherSubjectClassMap).find(k => k.includes(subKey) || subKey.includes(k));
                    allowedClasses = fuzzyKey ? teacherSubjectClassMap[fuzzyKey] : [];
                }
            } else {
                // 'all' mode — union of all subject streams
                const unionSet = new Set<string>();
                Object.values(teacherSubjectClassMap).flat().forEach(c => unionSet.add(norm(c)));
                allowedClasses = unionSet.size > 0 ? Array.from(unionSet) : [];
            }

            if (allowedClasses !== null && allowedClasses.length > 0) {
                sorted = sorted.filter((row: any) => {
                    const rowClass = norm(row.class || row.className || '');
                    return allowedClasses!.some(allowed => rowClass === allowed || rowClass.startsWith(allowed) || allowed.startsWith(rowClass));
                });
            } else if (allowedClasses !== null && allowedClasses.length === 0) {
                // Teacher has no allocations for this subject/any subject → show nothing
                sorted = [] as typeof sorted;
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        lastFilteredStudentRowsRef.current = sorted;
        return sorted;
    }, [broadsheetStudentRows, selectedClassFilter, selectedGradeFilter, modalAvailableClasses, searchStudentQuery, KENYAN_STUDENT_NAMES, allRealStudents, users, activeExamClasses, isStudentInTargetClasses, getStudentClass, extractGradeLabel, resolveCleanAdmNo, resolveCleanStudentName, sortField, sortOrder, isAddExamModalOpen, isBroadsheetModalOpen, teacherSubjectClassMap, selectedSubjectFilter]);

    const handleUpdateStudentMark = useCallback((admNo: string, fieldKey: string, newValue: number, studentName?: string, studentClass?: string) => {
        if (activeExam?.status === 'published') {
            return;
        }
        // Wrap state updates in React.startTransition so keyboard navigation,
        // typing, and focus switching have top priority with 0ms latency.
        React.startTransition(() => {
            setBroadsheetStudentRows(prevRows => {
                const normName = studentName ? studentName.toLowerCase().trim() : '';
                const existingIndex = prevRows.findIndex(r =>
                    r.admNo === admNo ||
                    (normName && r.name && r.name.toLowerCase().trim() === normName)
                );

                // Fast exit: if mark is already identical, skip all updates completely
                if (existingIndex >= 0) {
                    const existingRow = prevRows[existingIndex];
                    if (existingRow && existingRow[fieldKey] === newValue) {
                        return prevRows;
                    }
                }

                // Flag this student admission number as having unsaved draft changes
                setUnsavedStudentAdms(prev => {
                    if (prev.has(admNo)) return prev;
                    const next = new Set(prev);
                    next.add(admNo);
                    return next;
                });

                // Also synchronize companion shorthand keys so all views stay in sync
                const extraKeys: Record<string, number> = {};
                const fkLower = fieldKey.toLowerCase();
                if (fkLower.includes('math') && (fkLower.includes('p1') || fkLower.includes('paper_1') || fkLower.includes('paper 1'))) {
                    extraKeys.mathP1 = newValue;
                } else if (fkLower.includes('math') && (fkLower.includes('p2') || fkLower.includes('paper_2') || fkLower.includes('paper 2'))) {
                    extraKeys.mathP2 = newValue;
                } else if (fkLower.includes('eng') && (fkLower.includes('p1') || fkLower.includes('paper_1') || fkLower.includes('paper 1'))) {
                    extraKeys.engP1 = newValue;
                } else if (fkLower.includes('eng') && (fkLower.includes('p2') || fkLower.includes('paper_2') || fkLower.includes('paper 2'))) {
                    extraKeys.engP2 = newValue;
                } else if (fkLower.includes('kisw') && (fkLower.includes('p1') || fkLower.includes('paper_1') || fkLower.includes('paper 1'))) {
                    extraKeys.kiswP1 = newValue;
                } else if (fkLower.includes('bio') && (fkLower.includes('p1') || fkLower.includes('paper_1') || fkLower.includes('paper 1'))) {
                    extraKeys.bioP1 = newValue;
                }

                let updatedRows: any[];
                if (existingIndex >= 0) {
                    updatedRows = [...prevRows];
                    updatedRows[existingIndex] = {
                        ...updatedRows[existingIndex],
                        admNo,
                        ...(studentName && !studentName.toLowerCase().startsWith('student ') ? { name: studentName } : {}),
                        ...(studentClass ? { class: studentClass } : {}),
                        ...extraKeys,
                        [fieldKey]: newValue
                    };
                } else {
                    const targetSt = allRealStudents.find(s => resolveCleanAdmNo(s, 0) === admNo);
                    const newRow = {
                        admNo,
                        name: studentName || (targetSt ? resolveCleanStudentName(targetSt, 0) : `Student ${admNo}`),
                        class: studentClass || (targetSt ? getStudentClass(targetSt) : (activeExamClasses[0] || 'Form 3 Central')),
                        mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0,
                        ...extraKeys,
                        [fieldKey]: newValue
                    };
                    updatedRows = [...prevRows, newRow];
                }

                // Keep store ref updated synchronously for save operations without triggering redundant state render
                if (selectedExamId) {
                    examMarksStoreRef.current[selectedExamId] = updatedRows;
                }
                return updatedRows;
            });
        });
    }, [activeExam?.status, selectedExamId, activeExamClasses, allRealStudents, resolveCleanAdmNo, resolveCleanStudentName, getStudentClass]);

    const publishedExams = useMemo(() => exams.filter(e => e.status === 'published'), [exams]);

    // Group published exams by year (only include years with at least 1 published exam)
    const publishedByYear = useMemo(() => {
        const groups: Record<number, ExamUnitRecord[]> = {};
        publishedExams.forEach(e => {
            if (e.year) {
                if (!groups[e.year]) groups[e.year] = [];
                groups[e.year].push(e);
            }
        });
        return groups;
    }, [publishedExams]);

    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 2026: true, 2025: false });

    // Compute applicable subjects ONLY for selectedClassFilter or selectedGradeFilter (or all active exam classes if all)
    const modalAvailableSubjects = useMemo(() => {
        const targetClass = (selectedClassFilter && selectedClassFilter !== 'all')
            ? selectedClassFilter
            : (selectedGradeFilter && selectedGradeFilter !== 'all' ? selectedGradeFilter : (activeExamClasses[0] || ''));

        // 1. PRIMARY Authority: testedPaperConfigs (Filtered to only papers with enabled === true)
        const activeTested = testedPaperConfigs.filter(p => p && p.enabled).map(p => p.subject.trim());
        if (activeTested.length > 0) {
            const distinctActive = Array.from(new Set(activeTested));
            if (!targetClass) return distinctActive;
            const filteredTested = distinctActive.filter(subName => isSubjectApplicableToClass({ name: subName }, targetClass));
            return filteredTested.length > 0 ? filteredTested : distinctActive;
        }

        // 2. Fall back to classAllocationsStore (from Manage Subjects per Class Stream)
        const activeClassAllocationsStore: Record<string, string[]> = (() => {
            try {
                const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
                if (saved) return JSON.parse(saved) || {};
            } catch (e) { }
            return (currentInstitution as any)?.classSubjectAllocations || {};
        })();

        if (targetClass) {
            const cleanTC = targetClass.trim();
            const tcLower = cleanTC.toLowerCase();
            const tcNoStream = cleanTC.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim().toLowerCase();

            const storeEntry = activeClassAllocationsStore[cleanTC] ?? activeClassAllocationsStore[tcLower] ?? activeClassAllocationsStore[tcNoStream];
            if (Array.isArray(storeEntry) && storeEntry.length > 0) {
                const allocatedSet = new Set(storeEntry.map(id => String(id).toLowerCase().trim()));
                const matched = subjects.filter(s => {
                    const sId = (s.id || '').toLowerCase().trim();
                    const sName = (s.name || '').toLowerCase().trim();
                    const sCode = (s.code || '').toLowerCase().trim();
                    return allocatedSet.has(sId) || allocatedSet.has(sName) || (sCode && allocatedSet.has(sCode));
                }).map(s => s.name || (s as any).title);

                if (matched.length > 0) {
                    return Array.from(new Set(matched));
                }
            }
        }

        // 3. Fall back to subjects filtered by isSubjectApplicableToClass
        if (subjects && Array.isArray(subjects) && subjects.length > 0) {
            if (!targetClass) return subjects.map(s => s.name || (s as any).title);
            const filtered = subjects.filter(s => {
                const subName = s.name || (s as any).title || '';
                const subCode = s.code || '';
                return isSubjectApplicableToClass({ name: subName, code: subCode }, targetClass);
            }).map(s => s.name || (s as any).title);
            if (filtered.length > 0) return Array.from(new Set(filtered));
        }

        return ['Mathematics', 'English', 'Kiswahili'];
    }, [selectedClassFilter, selectedGradeFilter, activeExamClasses, instId, currentInstitution, subjects, testedPaperConfigs]);

    // Helper to resolve papers and distinct unique property keys for any subject
    const getSubjectPapers = useCallback((subName: string) => {
        if (!subName) return [{ label: 'Paper 1', key: 'subj_p1', maxScore: 100 }];

        // Check if testedPaperConfigs has specific papers for subName
        const activeTested = testedPaperConfigs.filter(p => p.enabled && p.subject.toLowerCase().trim() === subName.toLowerCase().trim());
        if (activeTested.length > 0) {
            const sClean = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            return activeTested.map((p, idx) => {
                const pClean = p.paperName ? p.paperName.toLowerCase().replace(/[^a-z0-9]/g, '_') : `p${idx + 1}`;
                return {
                    label: p.paperName ? `${subName} (${p.paperName})` : `${subName} Paper ${idx + 1}`,
                    key: `subj_${sClean}_${pClean}`,
                    maxScore: p.maxInputScore || 100
                };
            });
        }

        // If subject is explicitly in testedPaperConfigs but disabled, return empty list
        const isExplicitlyDisabled = testedPaperConfigs.some(p => p.subject.toLowerCase().trim() === subName.toLowerCase().trim()) &&
            !testedPaperConfigs.some(p => p.enabled && p.subject.toLowerCase().trim() === subName.toLowerCase().trim());
        if (isExplicitlyDisabled) {
            return [];
        }

        // Standard subject defaults
        if (subName.toLowerCase().trim() === 'english') {
            return [
                { label: 'ENG Paper 1 (Functional)', key: 'engP1', maxScore: 60 },
                { label: 'ENG Paper 2 (Comprehension)', key: 'engP2', maxScore: 80 }
            ];
        }
        if (subName.toLowerCase().trim() === 'kiswahili') {
            return [
                { label: 'KISW Paper 1 (Insha)', key: 'kiswP1', maxScore: 40 }
            ];
        }
        if (subName.toLowerCase().trim() === 'maths' || subName.toLowerCase().trim() === 'mathematics') {
            return [
                { label: 'MATH Paper 1', key: 'mathP1', maxScore: 100 }
            ];
        }

        // Unique property key for any CBE/custom subject (e.g. English Language Activities)
        const sClean = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return [
            { label: `${subName}`, key: `subj_${sClean}_p1`, maxScore: 100 }
        ];
    }, [testedPaperConfigs]);

    // Global cache for candidate paper keys to avoid repeating regex and set operations
    const candidateKeysGlobalCache = useMemo(() => new Map<string, string[]>(), []);

    // Helper to resolve all possible candidate keys for any subject & paper (dynamic vs shorthand vs legacy)
    const getCandidateKeysForPaper = useCallback((subName: string, paperKey?: string, paperName?: string): string[] => {
        const cacheKey = `${subName || ''}__${paperKey || ''}__${paperName || ''}`;
        const cached = candidateKeysGlobalCache.get(cacheKey);
        if (cached) return cached;

        const sClean = (subName || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const pClean = (paperName || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const sLower = (subName || '').toLowerCase().trim();
        const pLower = ((paperName || '') + ' ' + (paperKey || '')).toLowerCase().trim();

        const keys: string[] = [];
        if (paperKey) keys.push(paperKey);
        if (sClean && pClean) keys.push(`subj_${sClean}_${pClean}`);
        if (sClean) {
            keys.push(`subj_${sClean}_p1`);
            keys.push(`subj_${sClean}`);
            keys.push(sClean);
        }
        if (subName) {
            keys.push(subName);
            keys.push(sLower);
        }

        const isP2 = pLower.includes('p2') || pLower.includes('paper 2') || pLower.includes('paper_2') || pLower.includes('comp');
        const isP1 = !isP2 || pLower.includes('p1') || pLower.includes('paper 1') || pLower.includes('paper_1') || pLower.includes('func') || pLower.includes('insha');

        if (sLower.includes('math')) {
            if (isP2) keys.push('mathP2');
            if (isP1) keys.push('mathP1');
            keys.push('math', 'maths', 'mathematics');
        }
        if (sLower.includes('eng')) {
            if (isP2) keys.push('engP2');
            if (isP1) keys.push('engP1');
            keys.push('eng', 'english');
        }
        if (sLower.includes('kisw')) {
            if (isP2) keys.push('kiswP2');
            if (isP1) keys.push('kiswP1');
            keys.push('kisw', 'kiswahili');
        }
        if (sLower.includes('bio')) {
            if (isP2) keys.push('bioP2');
            if (isP1) keys.push('bioP1');
            keys.push('bio', 'biology');
        }
        if (sLower.includes('chem')) {
            if (isP2) keys.push('chemP2');
            if (isP1) keys.push('chemP1');
            keys.push('chem', 'chemistry');
        }
        if (sLower.includes('phy')) {
            if (isP2) keys.push('phyP2', 'physP2');
            if (isP1) keys.push('phyP1', 'physP1');
            keys.push('phy', 'phys', 'physics');
        }
        if (sLower.includes('cre')) {
            if (isP1) keys.push('creP1');
            keys.push('cre');
        }
        if (sLower.includes('ire')) {
            if (isP1) keys.push('ireP1');
            keys.push('ire');
        }
        if (sLower.includes('hist')) {
            if (isP1) keys.push('histP1');
            keys.push('hist', 'history');
        }
        if (sLower.includes('geo')) {
            if (isP1) keys.push('geoP1');
            keys.push('geo', 'geography');
        }
        if (sLower.includes('agr')) {
            if (isP1) keys.push('agrP1');
            keys.push('agr', 'agriculture');
        }
        if (sLower.includes('bus')) {
            if (isP1) keys.push('busP1');
            keys.push('bus', 'business');
        }

        const result = Array.from(new Set(keys.filter(Boolean)));
        candidateKeysGlobalCache.set(cacheKey, result);
        return result;
    }, [candidateKeysGlobalCache]);

    // Helper to resolve student mark for any paper across all candidate keys
    const getStudentPaperMark = useCallback((st: any, paperKey: string, subName?: string, paperName?: string): { val: number; hasMark: boolean } => {
        if (!st) return { val: 0, hasMark: false };

        const candidateKeys = getCandidateKeysForPaper(subName || '', paperKey, paperName);

        // First pass: check for non-zero scores
        for (const k of candidateKeys) {
            const rawVal = st[k];
            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                const num = Number(rawVal);
                if (!isNaN(num) && num > 0) {
                    return { val: num, hasMark: true };
                }
            }
        }

        // Second pass: check for explicit zero or valid non-empty entry
        for (const k of candidateKeys) {
            const rawVal = st[k];
            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                const num = Number(rawVal);
                if (!isNaN(num)) {
                    return { val: num, hasMark: true };
                }
            }
        }

        // Check nested subjectMarks if present
        if (st.subjectMarks && typeof st.subjectMarks === 'object') {
            for (const k of candidateKeys) {
                const rawVal = st.subjectMarks[k];
                if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                    const num = Number(rawVal);
                    if (!isNaN(num)) return { val: num, hasMark: true };
                }
            }
        }

        return { val: 0, hasMark: false };
    }, [getCandidateKeysForPaper]);

    // Per-render grade result cache — avoids repeating the same O(n) grading-scale search
    // for multiple rows that share identical (score, class, subject) inputs.
    const gradeResultCacheRef = useRef<Map<string, string>>(new Map());
    // Invalidate cache whenever grading configuration could have changed
    useEffect(() => { gradeResultCacheRef.current.clear(); }, [currentInstitution, activeExam?.gradingSystem, activeExam?.gradingSystemId, selectedClassFilter, selectedSubjectFilter]);

    // Dynamic Grade Calculator querying treeGradingNodes, custom grading systems, exam scales, and CBC/8-4-4 configs
    const calculateGradeFromScore = useCallback((pctNum: number, clsName?: string, subName?: string) => {
        if (pctNum === undefined || pctNum === null || isNaN(pctNum)) return '-';

        // Fast cache lookup: same score+class+subject always yields the same grade
        const cacheKey = `${pctNum}|${clsName || ''}|${subName || ''}`;
        const cached = gradeResultCacheRef.current.get(cacheKey);
        if (cached !== undefined) return cached;

        let treeNodes = (currentInstitution as any)?.treeGradingNodes || (currentInstitution as any)?.tree_grading_nodes;
        if (!treeNodes) {
            try {
                const saved = localStorage.getItem(`eduai_tree_grading_nodes_${instId}`);
                if (saved) treeNodes = JSON.parse(saved);
            } catch (e) { }
        }

        let scaleDefinitions: any[] | null = null;

        const effectiveClass = (clsName && clsName !== 'all' ? clsName : (selectedClassFilter !== 'all' ? selectedClassFilter : (activeExamClasses[0] || ''))).toLowerCase().trim();
        const effectiveSub = (subName && subName !== 'all' ? subName : (selectedSubjectFilter !== 'all' ? selectedSubjectFilter : '')).toLowerCase().trim();
        const cleanC = effectiveClass.replace(/[^a-z0-9]/g, '_');
        const cleanS = effectiveSub.replace(/[^a-z0-9]/g, '_');
        const compactC = effectiveClass.replace(/[^a-z0-9]/g, '');
        const compactS = effectiveSub.replace(/[^a-z0-9]/g, '');

        // 1. Check treeGradingNodes (Subject Specific -> Class Overall -> Root Main)
        if (treeNodes && typeof treeNodes === 'object') {
            // 1a. Subject specific node in class (e.g. class_grade_4_sub_kiswahili_language_activities)
            const subjectNodeKey = Object.keys(treeNodes).find(k => {
                const kLower = k.toLowerCase();
                if (!kLower.includes('_sub_')) return false;
                const matchesClass = (cleanC && kLower.includes(cleanC)) || (compactC && kLower.replace(/[^a-z0-9]/g, '').includes(compactC));
                const matchesSub = (cleanS && kLower.includes(cleanS)) || (compactS && kLower.replace(/[^a-z0-9]/g, '').includes(compactS));
                return matchesClass && matchesSub;
            });
            if (subjectNodeKey && treeNodes[subjectNodeKey]?.definitions?.length > 0) {
                scaleDefinitions = treeNodes[subjectNodeKey].definitions;
            }

            // 1b. Class overall node (e.g. class_grade_4_overall, class_grade4_overall)
            if (!scaleDefinitions) {
                const classNodeKey = Object.keys(treeNodes).find(k => {
                    const kLower = k.toLowerCase();
                    if (kLower.includes('_sub_')) return false;
                    return kLower === `class_${cleanC}_overall` ||
                           kLower === `${cleanC}_overall` ||
                           (compactC && kLower.replace(/[^a-z0-9]/g, '') === `class${compactC}overall`) ||
                           (compactC && kLower.replace(/[^a-z0-9]/g, '').includes(compactC));
                });
                if (classNodeKey && treeNodes[classNodeKey]?.definitions?.length > 0) {
                    scaleDefinitions = treeNodes[classNodeKey].definitions;
                }
            }

            // 1c. Exam assigned grading system name matching a node title or id
            if (!scaleDefinitions && activeExam?.gradingSystem) {
                const examSysNorm = String(activeExam.gradingSystem).toLowerCase().replace(/[^a-z0-9]/g, '');
                const matchedNode = Object.values(treeNodes).find((n: any) => {
                    const nIdNorm = (n.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const nTitleNorm = (n.title || n.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return nIdNorm === examSysNorm || nTitleNorm.includes(examSysNorm);
                }) as any;
                if (matchedNode?.definitions?.length > 0) {
                    scaleDefinitions = matchedNode.definitions;
                }
            }

            // 1d. Root Main node
            if (!scaleDefinitions && treeNodes['root_main']?.definitions?.length > 0) {
                scaleDefinitions = treeNodes['root_main'].definitions;
            }
        }

        // 2. Check currentInstitution.gradingSystems array (Legacy / Standard Grading Manager)
        if (!scaleDefinitions) {
            const systems: any[] = (currentInstitution as any)?.gradingSystems || (currentInstitution as any)?.grading_systems || [];
            if (Array.isArray(systems) && systems.length > 0) {
                // Find by active exam gradingSystem or gradingSystemId
                const examGId = activeExam?.gradingSystemId || activeExam?.grading_system_id || activeExam?.gradingSystem;
                let matchedSys = systems.find(s => s.id === examGId || (s.name && s.name.toLowerCase() === String(examGId).toLowerCase()));

                // Find by class targeting
                if (!matchedSys && effectiveClass) {
                    matchedSys = systems.find(s => {
                        const targets = s.targetClasses || s.assignedClasses || s.classes || [];
                        return Array.isArray(targets) && targets.some((t: string) => t.toLowerCase().trim() === effectiveClass || t.toLowerCase().replace(/[^a-z0-9]/g, '') === compactC);
                    });
                }

                // Find by institution active grading system
                if (!matchedSys) {
                    const activeId = (currentInstitution as any)?.activeGradingSystemId;
                    if (activeId) matchedSys = systems.find(s => s.id === activeId);
                }

                if (!matchedSys) matchedSys = systems[0];

                if (matchedSys?.definitions && Array.isArray(matchedSys.definitions) && matchedSys.definitions.length > 0) {
                    scaleDefinitions = matchedSys.definitions;
                }
            }
        }

        // 3. Check direct academicConfig / gradingSystem definitions
        if (!scaleDefinitions) {
            const directDefs = (currentInstitution as any)?.academicConfig?.gradingSystem || (currentInstitution as any)?.gradingSystem;
            if (Array.isArray(directDefs) && directDefs.length > 0) {
                scaleDefinitions = directDefs;
            }
        }

        let grade: string;

        // Apply matched scale definitions
        if (scaleDefinitions && scaleDefinitions.length > 0) {
            const sorted = [...scaleDefinitions].sort((a: any, b: any) => (b.minScore ?? 0) - (a.minScore ?? 0));
            const matched = sorted.find((d: any) => pctNum >= (d.minScore ?? 0));
            if (matched && matched.grade) {
                grade = matched.grade;
                gradeResultCacheRef.current.set(cacheKey, grade);
                return grade;
            }
        }

        // 4. Standard Kenya Curricula Fallback
        const isCBE = isPrimarySchool ||
            /\b(grade|std|standard|pp1|pp2|playgroup|nursery|cbc|cbe|lower|upper|class\s*[1-8])\b/i.test(effectiveClass) ||
            /\b(activities|hygiene|environmental|movement|cbe|cbc|nutrition|cre|ire|indigenous|language\s*activities|mathematical\s*activities)\b/i.test(effectiveSub);

        if (isCBE) {
            grade = pctNum >= 80 ? 'EE' : pctNum >= 65 ? 'ME' : pctNum >= 50 ? 'AE' : 'BE';
        } else {
            grade = pctNum >= 80 ? 'A' : pctNum >= 75 ? 'A-' : pctNum >= 70 ? 'B+' : pctNum >= 65 ? 'B' : pctNum >= 60 ? 'B-' : pctNum >= 55 ? 'C+' : pctNum >= 50 ? 'C' : pctNum >= 45 ? 'C-' : pctNum >= 40 ? 'D+' : pctNum >= 35 ? 'D' : pctNum >= 30 ? 'D-' : 'E';
        }

        gradeResultCacheRef.current.set(cacheKey, grade);
        return grade;
    }, [currentInstitution, instId, selectedClassFilter, selectedSubjectFilter, activeExamClasses, activeExam, isPrimarySchool]);

    // Memoized paper definitions for the currently selected subject in Broadsheet
    const singleSubjectPapers = useMemo(() => {
        return getSubjectPapers(selectedSubjectFilter);
    }, [selectedSubjectFilter, getSubjectPapers]);

    const singleSubjectMaxTotal = useMemo(() => {
        return singleSubjectPapers.reduce((sum: number, p: any) => sum + p.maxScore, 0);
    }, [singleSubjectPapers]);

    // Memoized flat list of all papers across all available subjects in Broadsheet
    const allAvailableSubjectsPapers = useMemo(() => {
        return modalAvailableSubjects.flatMap(subName => getSubjectPapers(subName));
    }, [modalAvailableSubjects, getSubjectPapers]);

    const allAvailableSubjectsMaxTotal = useMemo(() => {
        return allAvailableSubjectsPapers.reduce((sum, sp) => sum + sp.maxScore, 0);
    }, [allAvailableSubjectsPapers]);

    // CSV / Excel Export Handler
    const handleExportBroadsheetCSV = useCallback(() => {
        if (!broadsheetStudentRows || broadsheetStudentRows.length === 0) {
            alert("No student broadsheet records available to export.");
            return;
        }

        const rowsToExport = filteredStudentRows.length > 0 ? filteredStudentRows : broadsheetStudentRows;
        const isSingleSubject = selectedSubjectFilter !== 'all';
        const targetClass = selectedClassFilter !== 'all' ? selectedClassFilter : (activeExamClasses[0] || 'All_Classes');
        const examTitle = activeExam?.name ? activeExam.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Exam';

        let headers: string[] = ['Admission No', 'Student Name', 'Class'];
        let paperList: { label: string; key: string; maxScore: number }[] = [];

        if (isSingleSubject) {
            paperList = singleSubjectPapers;
            paperList.forEach(p => headers.push(`${p.label} (/${p.maxScore})`));
            headers.push('Subject Total', 'Max Score', 'Converted %', 'Grade');
        } else {
            paperList = allAvailableSubjectsPapers;
            paperList.forEach(p => headers.push(`${p.label} (/${p.maxScore})`));
            headers.push('Total Raw', 'Max Score', 'Converted %', 'Grade');
        }

        const csvLines: string[] = [];
        csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

        rowsToExport.forEach(st => {
            const rowVals: (string | number)[] = [
                st.admNo || '',
                st.name || '',
                st.class || targetClass
            ];

            let rawTotal = 0;
            let maxTotal = 0;

            paperList.forEach(p => {
                const markInfo = getStudentPaperMark(st, p.key, isSingleSubject ? selectedSubjectFilter : undefined, p.label);
                const val = (st as any)[p.key] !== undefined ? (st as any)[p.key] : (markInfo.hasMark ? markInfo.val : 0);
                rowVals.push(val);
                rawTotal += Number(val) || 0;
                maxTotal += p.maxScore;
            });

            const convertedPct = maxTotal > 0 ? ((rawTotal / maxTotal) * 100).toFixed(1) : '0.0';
            const pctNum = parseFloat(convertedPct);
            const studentClass = st.class || (st as any).studentClass || (st as any).className || (selectedClassFilter !== 'all' ? selectedClassFilter : (activeExamClasses[0] || ''));
            const grade = calculateGradeFromScore(pctNum, studentClass, isSingleSubject ? selectedSubjectFilter : undefined);

            rowVals.push(rawTotal, maxTotal, `${convertedPct}%`, grade);
            csvLines.push(rowVals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });

        const csvContent = csvLines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `${examTitle}_${targetClass.replace(/[^a-zA-Z0-9_-]/g, '_')}_${isSingleSubject ? selectedSubjectFilter.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Broadsheet'}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSaveToastMessage(`📥 Exported ${rowsToExport.length} student marks to "${filename}"!`);
        setTimeout(() => setSaveToastMessage(null), 4000);
    }, [broadsheetStudentRows, filteredStudentRows, selectedSubjectFilter, selectedClassFilter, activeExamClasses, activeExam, modalAvailableSubjects, getSubjectPapers, calculateGradeFromScore]);

    // Download Import CSV Template
    const handleDownloadImportTemplate = useCallback(() => {
        const isSingleSubject = selectedSubjectFilter !== 'all';
        const subName = isSingleSubject ? selectedSubjectFilter : (modalAvailableSubjects[0] || 'Mathematics');
        const targetClass = selectedClassFilter !== 'all' ? selectedClassFilter : (activeExamClasses[0] || 'Form 3 Central');
        const examTitle = activeExam?.name ? activeExam.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Exam';

        const paperList = getSubjectPapers(subName);
        let headers: string[] = ['Admission No', 'Student Name', 'Class'];
        paperList.forEach(p => headers.push(`${p.label} (/${p.maxScore})`));

        const csvLines: string[] = [];
        csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

        const sampleRows = filteredStudentRows.length > 0 ? filteredStudentRows : broadsheetStudentRows;
        sampleRows.forEach(st => {
            const rowVals: (string | number)[] = [
                st.admNo || '',
                st.name || '',
                st.class || targetClass
            ];
            paperList.forEach(p => {
                rowVals.push((st as any)[p.key] ?? 0);
            });
            csvLines.push(rowVals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });

        const csvContent = csvLines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `${examTitle}_${targetClass.replace(/[^a-zA-Z0-9_-]/g, '_')}_${subName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Import_Template.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSaveToastMessage(`📄 Downloaded import template for ${subName} (${sampleRows.length} students)`);
        setTimeout(() => setSaveToastMessage(null), 4000);
    }, [selectedSubjectFilter, modalAvailableSubjects, selectedClassFilter, activeExamClasses, activeExam, getSubjectPapers, filteredStudentRows, broadsheetStudentRows]);

    // CSV Bulk Marks Upload Handler
    const handleImportMarksCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeExam?.status === 'published') {
            alert(`🔒 "${activeExam.name}" is currently published.\n\nPublished exams cannot be edited unless unpublished first. Please click "Unpublish Exam" on the dashboard before importing marks.`);
            if (e.target) e.target.value = '';
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                if (!content) return;

                const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
                if (lines.length < 2) {
                    alert("CSV file must contain a header row and at least one student data row.");
                    return;
                }

                const parseCSVLine = (line: string): string[] => {
                    const result: string[] = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"' || char === "'") {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.trim().replace(/^["']|["']$/g, ''));
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim().replace(/^["']|["']$/g, ''));
                    return result;
                };

                const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
                const admIdx = headers.findIndex(h => h.includes('adm') || h.includes('admission') || h.includes('reg') || h.includes('id'));
                const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('student'));
                const classIdx = headers.findIndex(h => h.includes('class') || h.includes('grade') || h.includes('stream'));

                if (admIdx === -1 && nameIdx === -1) {
                    alert("CSV file must contain 'Admission No' or 'Student Name' column.");
                    return;
                }

                const subName = selectedSubjectFilter !== 'all' ? selectedSubjectFilter : (modalAvailableSubjects[0] || 'Mathematics');
                const targetPapers = getSubjectPapers(subName);
                const paperColMap: { headerIdx: number; key: string; maxScore: number }[] = [];

                headers.forEach((h, hIdx) => {
                    if (hIdx === admIdx || hIdx === nameIdx || hIdx === classIdx || h.includes('total') || h.includes('converted') || h.includes('grade')) return;
                    const matchedPaper = targetPapers.find(p => h.includes(p.label.toLowerCase()) || h.includes(p.key.toLowerCase()));
                    if (matchedPaper) {
                        paperColMap.push({ headerIdx: hIdx, key: matchedPaper.key, maxScore: matchedPaper.maxScore });
                    } else if (targetPapers.length > 0) {
                        const fallbackPaper = targetPapers[paperColMap.length % targetPapers.length];
                        paperColMap.push({ headerIdx: hIdx, key: fallbackPaper.key, maxScore: fallbackPaper.maxScore });
                    }
                });

                if (paperColMap.length === 0 && targetPapers.length > 0) {
                    let colCounter = Math.max(admIdx, nameIdx, classIdx) + 1;
                    targetPapers.forEach(p => {
                        if (colCounter < headers.length) {
                            paperColMap.push({ headerIdx: colCounter, key: p.key, maxScore: p.maxScore });
                            colCounter++;
                        }
                    });
                }

                let updatedCount = 0;
                const updatedRows = [...broadsheetStudentRows];

                for (let i = 1; i < lines.length; i++) {
                    const cols = parseCSVLine(lines[i]);
                    if (cols.length === 0) continue;

                    const rowAdm = admIdx !== -1 ? cols[admIdx] : '';
                    const rowName = nameIdx !== -1 ? cols[nameIdx] : '';

                    let rowIndex = updatedRows.findIndex(r =>
                        (rowAdm && String(r.admNo).toLowerCase().trim() === String(rowAdm).toLowerCase().trim()) ||
                        (rowName && String(r.name).toLowerCase().trim() === String(rowName).toLowerCase().trim())
                    );

                    if (rowIndex !== -1) {
                        const rowObj = { ...updatedRows[rowIndex] };
                        paperColMap.forEach(colInfo => {
                            if (colInfo.headerIdx < cols.length) {
                                const val = Math.max(0, Math.min(colInfo.maxScore, parseFloat(cols[colInfo.headerIdx]) || 0));
                                (rowObj as any)[colInfo.key] = val;
                            }
                        });
                        updatedRows[rowIndex] = rowObj;
                        updatedCount++;
                    }
                }

                setBroadsheetStudentRows(updatedRows);
                if (activeExam?.id) {
                    setExamMarksStore(prev => ({ ...prev, [activeExam.id]: updatedRows }));
                    try {
                        localStorage.setItem(`eduai_exam_broadsheet_${activeExam.id}`, JSON.stringify(updatedRows));
                    } catch (e) { }
                    if (currentInstitution?.id) {
                        apiService.saveModuleRecord('exam_broadsheets', {
                            id: activeExam.id,
                            examId: activeExam.id,
                            rows: updatedRows,
                            institutionId: currentInstitution.id,
                            institution_id: currentInstitution.id
                        }).catch(() => { });
                    }
                }

                setSaveToastMessage(`✨ Successfully imported marks for ${updatedCount} student(s)!`);
                setTimeout(() => setSaveToastMessage(null), 4000);
            } catch (err) {
                console.error("Error parsing CSV file:", err);
                alert("Failed to parse CSV file. Please check file formatting.");
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    }, [broadsheetStudentRows, selectedSubjectFilter, modalAvailableSubjects, getSubjectPapers, activeExam, currentInstitution]);

    const teacherForClassCacheRef = useRef<Map<string, string>>(new Map());
    useEffect(() => {
        teacherForClassCacheRef.current.clear();
    }, [subjectAllocations, allocations, users]);

    // Subject matching helper that handles aliases, code, suffixes, CBC naming, and common typos
    const matchSubjectNames = useCallback((sub1: string, sub2: string, code1?: string, code2?: string): boolean => {
        if (!sub1 || !sub2) return false;
        const normalizeStr = (s: string) => {
            return s.toLowerCase()
                .replace(/\s*\([^)]*\)/g, '')
                .replace(/\s*(paper\s*\d+|p\d+|main\s*paper)/gi, '')
                .replace(/&/g, 'and')
                .replace(/\bindeginous\b/g, 'indigenous')
                .replace(/\bmathematik\b/g, 'mathematic')
                .replace(/\bactivites\b/g, 'activities')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const clean1 = normalizeStr(sub1);
        const clean2 = normalizeStr(sub2);
        if (clean1 === clean2) return true;

        // Code match
        if (code1 && code2 && code1.trim().toLowerCase() === code2.trim().toLowerCase()) return true;

        // Normalized alnum
        const norm1 = clean1.replace(/[^a-z0-9]/g, '');
        const norm2 = clean2.replace(/[^a-z0-9]/g, '');
        if (norm1 && norm2 && norm1 === norm2) return true;

        // CBC / Common Aliases map
        const aliases: Record<string, string[]> = {
            'math': ['mathematics', 'maths', 'mathematics activities', 'math activities', 'mathematical activities', 'number work', 'numeracy'],
            'mathematics': ['math', 'maths', 'mathematics activities', 'math activities', 'mathematical activities', 'number work', 'numeracy'],
            'eng': ['english', 'english language activities', 'english activities', 'english language', 'language activities', 'literacy'],
            'english': ['eng', 'english language activities', 'english activities', 'english language', 'language activities', 'literacy'],
            'kisw': ['kiswahili', 'kiswahili language activities', 'kiswahili activities', 'swahili', 'lugha ya kiswahili', 'kusoma na kuandika'],
            'kiswahili': ['kisw', 'kiswahili language activities', 'kiswahili activities', 'swahili', 'lugha ya kiswahili', 'kusoma na kuandika'],
            'indigenous': ['indeginous', 'indigenous language', 'indeginous language', 'mother tongue', 'local language', 'indigenous language activities', 'indeginous language activities', 'insha', 'lugha ya kienyeji', 'indigenous languages'],
            'indeginous': ['indigenous', 'indigenous language', 'indeginous language', 'mother tongue', 'local language', 'indigenous language activities', 'indeginous language activities', 'insha', 'lugha ya kienyeji', 'indigenous languages'],
            'sci': ['science', 'integrated science', 'science activities', 'integrated science activities', 'general science'],
            'integrated science': ['science', 'sci', 'integrated science activities', 'science activities'],
            'cre': ['christian religious education', 'religious education', 'cre activities', 'religious education activities', 'c.r.e', 'christian religious activities'],
            'christian religious education': ['cre', 'religious education', 'cre activities', 'religious education activities', 'c.r.e', 'christian religious activities'],
            'ire': ['islamic religious education', 'religious education', 'ire activities', 'i.r.e', 'islamic religious activities'],
            'islamic religious education': ['ire', 'religious education', 'ire activities', 'i.r.e', 'islamic religious activities'],
            'hre': ['hindu religious education', 'religious education', 'hre activities', 'h.r.e', 'hindu religious activities'],
            'pastoral': ['pastoral programme', 'pastoral program', 'pastoral instruction', 'ppi', 'p.p.i', 'pastoral programme of instruction', 'life skills', 'mentorship'],
            'pastoral programme': ['pastoral', 'pastoral program', 'pastoral instruction', 'ppi', 'p.p.i', 'pastoral programme of instruction', 'life skills', 'mentorship'],
            'env': ['environmental activities', 'environmental', 'environment', 'environmental studies', 'our environment'],
            'environmental activities': ['env', 'environmental', 'environment', 'environmental studies', 'our environment'],
            'agri': ['agriculture', 'agriculture and nutrition', 'agriculture activities', 'agriculture and nutrition activities', 'agric'],
            'agriculture': ['agri', 'agriculture and nutrition', 'agriculture activities', 'agriculture and nutrition activities', 'agric'],
            'social': ['social studies', 'social studies activities', 'sst'],
            'social studies': ['social', 'social studies activities', 'sst'],
            'art': ['art and craft', 'art and craft', 'creative arts', 'art craft', 'music', 'movement', 'creative activities'],
            'creative arts': ['art and craft', 'creative arts', 'art', 'music', 'movement', 'movement and creative activities', 'creative activities', 'movement activities', 'physical education', 'pe'],
            'movement and creative activities': ['creative arts', 'art and craft', 'art', 'music', 'movement', 'creative activities', 'movement activities', 'physical education', 'pe'],
            'hygiene': ['hygiene and nutrition', 'hygiene activities', 'health practices', 'nutrition activities', 'health and nutrition'],
            'hygiene and nutrition': ['hygiene', 'hygiene activities', 'health practices', 'nutrition activities', 'health and nutrition']
        };

        for (const [key, list] of Object.entries(aliases)) {
            const group = [key, ...list];
            if (group.some(g => norm1.includes(g.replace(/[^a-z0-9]/g, '')) || g.replace(/[^a-z0-9]/g, '').includes(norm1)) &&
                group.some(g => norm2.includes(g.replace(/[^a-z0-9]/g, '')) || g.replace(/[^a-z0-9]/g, '').includes(norm2))) {
                return true;
            }
        }

        // Distinctive stem/root overlap check
        const roots = ['indigenous', 'pastoral', 'creative', 'environment', 'hygiene', 'agricultur', 'religio', 'mathemat', 'kiswahili', 'english', 'scienc'];
        for (const root of roots) {
            if (clean1.includes(root) && clean2.includes(root)) return true;
        }

        // Substring match for longer names (e.g. "mathematics" in "mathematics activities")
        if (clean1.length >= 4 && clean2.length >= 4) {
            if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
        }

        return false;
    }, []);

    // Dynamic resolver to match the exact assigned teacher for a given subject in a specific class
    const getSubjectTeacherForClass = useCallback((subName: string, className: string, paperName?: string): string => {
        if (!subName) return 'Subject Teacher';
        const cleanSub = subName.trim();
        const cleanClass = (className || '').trim();
        const cacheKey = `${cleanSub.toLowerCase()}|${cleanClass.toLowerCase()}|${paperName || ''}`;
        const cached = teacherForClassCacheRef.current.get(cacheKey);
        if (cached !== undefined && cached !== 'Subject Teacher' && cached !== 'Unassigned') return cached;

        const getCanonicalGrade = (str: string): string => {
            if (!str) return '';
            const clean = str.replace(/\b20\d{2}\b/g, '').replace(/[-_]/g, ' ').trim().toLowerCase();
            const ecde = clean.match(/\b(pp\s*1|pp\s*2|playgroup|nursery|kindergarten|daycare|ecde)\b/i);
            if (ecde) return ecde[1].replace(/\s+/g, '');
            const m = clean.match(/\b(?:grade|class|std|standard)\s*(\d{1,2})\b/i) || clean.match(/^(\d{1,2})\b/);
            if (m) return `grade${m[1]}`;
            const formM = clean.match(/\b(?:form|year)\s*(\d{1,2})\b/i);
            if (formM) return `form${formM[1]}`;
            return clean.replace(/[^a-z0-9]/g, '');
        };

        const getCanonicalStream = (str: string): string => {
            if (!str) return '';
            const clean = str.replace(/\b20\d{2}\b/g, '').replace(/[-_]/g, ' ').trim().toLowerCase();
            const parsed = extractClassAndStream(clean);
            const rawStream = parsed.stream || (clean.match(/\b(north|south|east|west|central|red|blue|green|yellow|alpha|beta|stream\s*[a-z0-9]+|[a-d])\b/i) || [''])[0];
            return (rawStream || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        const { grade: targetGrade, stream: targetStream } = getStudentStreamAndGrade(className);
        const targetCanonicalGrade = getCanonicalGrade(targetGrade || className);
        const targetCanonicalStream = getCanonicalStream(targetStream || className);

        // Resolve subject code or id from subjects list if available
        const matchedSubjectObj = (subjects || []).find(s => s && matchSubjectNames(s.name, cleanSub, s.code));
        const subCode = matchedSubjectObj?.code;
        const subId = matchedSubjectObj?.id;

        // Load allocations from all sources: state + props + all localStorage keys
        const targetInstId = currentInstitution?.id || instId;
        const allAllocationsMap = new Map<string, any>();
        const addAllocList = (arr: any[]) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((a, idx) => {
                if (!a) return;
                const k = a.id || `${a.className || a.class}_${a.subjectName || a.subject}_${a.teacherName || a.teacherId || idx}`;
                allAllocationsMap.set(k, a);
            });
        };

        addAllocList(subjectAllocations);
        addAllocList(allocations);
        try {
            const keysToCheck = [
                `eduai_subject_allocations_${targetInstId}`,
                `eduai_subject_allocations_${instId}`,
                'eduai_subject_allocations',
                `eduai_lessons_allocations_${targetInstId}`,
                `eduai_lessons_allocations_${instId}`
            ];
            keysToCheck.forEach(k => {
                const raw = localStorage.getItem(k);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) addAllocList(parsed);
                    } catch (_) {}
                }
            });
        } catch (_) {}
        const allAllocations = Array.from(allAllocationsMap.values());

        // Helper to check if allocation matches target subject
        const allocMatchesSubject = (a: any): boolean => {
            if (!a) return false;
            const aSubName = a.subjectName || a.subject || a.name || '';
            const aCode = a.subjectCode || a.code || '';
            const aId = a.subjectId || a.id || '';
            if (subId && aId && String(aId) === String(subId)) return true;
            return matchSubjectNames(aSubName, cleanSub, aCode, subCode);
        };

        // Helper to extract valid teacher name from allocation
        const getTeacherNameFromAlloc = (a: any): string | null => {
            if (!a) return null;
            const tName = (a.teacherName || a.teacher?.name || a.instructorName || a.teacher_name || a.instructor || '').trim();
            if (tName && tName.toLowerCase() !== 'unassigned' && tName.toLowerCase() !== 'subject teacher') {
                return tName;
            }
            const tId = a.teacherId || a.teacher_id || a.instructorId || a.userId || a.user_id;
            if (tId) {
                const matchedUser = (users || []).find(u => u && (u.id === tId || (u as any).userId === tId));
                if (matchedUser?.name) return matchedUser.name.trim();
            }
            return null;
        };

        // Helper to check if allocation class matches target class/stream
        // Returns 2 for exact stream match, 1 for base grade match, 0 for no match
        const getClassMatchScore = (a: any): number => {
            if (!a) return 0;
            const rawAClass = (a.className || a.class || a.class_name || a.gradeLevel || '').trim();
            const rawAStream = (a.stream || a.streamName || a.stream_name || a.classStream || '').trim();
            const { grade: aGrade, stream: aStream } = getStudentStreamAndGrade(rawAClass);
            const aCanonicalGrade = getCanonicalGrade(aGrade || rawAClass);
            const aCanonicalStream = getCanonicalStream(rawAStream || aStream || rawAClass);

            const normTarget = cleanClass.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normA = `${rawAClass} ${rawAStream}`.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Exact alphanumeric string match
            if (normTarget && normA && (normTarget === normA || normTarget.replace(/\d{4}$/, '') === normA.replace(/\d{4}$/, ''))) {
                return 2;
            }

            // Grade match comparison
            if (targetCanonicalGrade && aCanonicalGrade && targetCanonicalGrade === aCanonicalGrade) {
                // Both specify streams and they match
                if (targetCanonicalStream && aCanonicalStream && targetCanonicalStream === aCanonicalStream) {
                    return 2;
                }
                // Target has stream and raw allocation string includes stream name
                if (targetCanonicalStream && normA.includes(targetCanonicalStream)) {
                    return 2;
                }
                // Base grade allocation without stream or applies to all
                if (!aCanonicalStream || aCanonicalStream === 'all' || !targetCanonicalStream) {
                    return 1;
                }
            }

            return 0;
        };

        // Priority 1: Exact stream-specific allocation with assigned teacher
        const streamMatches = allAllocations.filter(a => allocMatchesSubject(a) && getClassMatchScore(a) === 2);
        for (const a of streamMatches) {
            const tName = getTeacherNameFromAlloc(a);
            if (tName) {
                teacherForClassCacheRef.current.set(cacheKey, tName);
                return tName;
            }
        }

        // Priority 2: Base grade allocation (applies across streams) with assigned teacher
        const gradeMatches = allAllocations.filter(a => allocMatchesSubject(a) && getClassMatchScore(a) === 1);
        for (const a of gradeMatches) {
            const tName = getTeacherNameFromAlloc(a);
            if (tName) {
                teacherForClassCacheRef.current.set(cacheKey, tName);
                return tName;
            }
        }

        // Priority 3: Check registered teachers in users whose allocatedSubjects or teachingSubjects matches
        const teacherUsers = (users || []).filter(u => {
            if (!u) return false;
            const r = String(u.role || '').toLowerCase();
            return r === 'teacher' || r === 'instructor' || r === 'lecturer' || r === 'faculty' || r === 'staff' || r === 'academics' || r === 'educator';
        });
        
        // Priority 3a: Teacher in users matching both subject and this class/stream
        const matchingClassTeacher = teacherUsers.find(u => {
            const uSubs: string[] = Array.isArray((u as any).allocatedSubjects) ? (u as any).allocatedSubjects
                : Array.isArray((u as any).teachingSubjects) ? (u as any).teachingSubjects
                : Array.isArray((u as any).subjects) ? (u as any).subjects
                : (u as any).subject ? [(u as any).subject] : [];
            const subMatch = uSubs.some(s => typeof s === 'string' && matchSubjectNames(s, cleanSub));
            if (!subMatch) return false;

            const uMeta = (u as any).metadata || {};
            const uClasses: string[] = Array.isArray(uMeta.classes) ? uMeta.classes
                : Array.isArray((u as any).classes) ? (u as any).classes
                : Array.isArray((u as any).allocatedClasses) ? (u as any).allocatedClasses
                : (u as any).studentClass ? [(u as any).studentClass] : [];

            if (uClasses.some(c => {
                const cStr = String(c).toLowerCase();
                const cleanC = cleanClass.toLowerCase();
                return cStr.includes(cleanC) || cleanC.includes(cStr) || (targetCanonicalGrade && cStr.includes(targetCanonicalGrade));
            })) {
                return true;
            }
            return false;
        });

        if (matchingClassTeacher?.name) {
            teacherForClassCacheRef.current.set(cacheKey, matchingClassTeacher.name);
            return matchingClassTeacher.name;
        }

        // Priority 3b: Any teacher in users allocated to this subject
        const matchingSubTeacher = teacherUsers.find(u => {
            const uSub = ((u as any).subject || '').trim();
            if (uSub && matchSubjectNames(uSub, cleanSub)) return true;
            const uSubs: string[] = (u as any).allocatedSubjects || (u as any).teachingSubjects || (u as any).subjects || [];
            return Array.isArray(uSubs) && uSubs.some(s => typeof s === 'string' && matchSubjectNames(s, cleanSub));
        });

        if (matchingSubTeacher?.name) {
            teacherForClassCacheRef.current.set(cacheKey, matchingSubTeacher.name);
            return matchingSubTeacher.name;
        }

        // Priority 3c: Check if a user is the assigned supervisor/class-teacher for this class
        const classSupervisorUser = (users || []).find(u => {
            if (!u) return false;
            const sCls = String(u.supervisedClass || (u as any).supervised_class || (u as any).assignedClass || '').trim().toLowerCase();
            return sCls && (sCls === cleanClass.toLowerCase() || (targetCanonicalGrade && sCls.includes(targetCanonicalGrade)));
        });

        if (classSupervisorUser?.name) {
            teacherForClassCacheRef.current.set(cacheKey, classSupervisorUser.name);
            return classSupervisorUser.name;
        }

        // If no match found yet, return 'Subject Teacher' without caching as permanent truth
        return 'Subject Teacher';
    }, [subjectAllocations, allocations, users, subjects, getStudentStreamAndGrade, matchSubjectNames, instId, currentInstitution?.id]);

    const lastClassPaperRowsRef = useRef<any[]>([]);

    // Dynamic Class Paper Progress Rows based on active exam & broadsheet rows
    const classPaperRows = useMemo(() => {
        // Immediate 0ms exit when no exam is created or selected
        if (!activeExam) return [];

        // While Add/Edit exam modal or Marks Entry (Broadsheet) modal is open, preserve previously computed dashboard rows
        // to avoid freezing the UI thread with synchronous calculations across all students & classes during rapid typing
        if ((isAddExamModalOpen || isBroadsheetModalOpen) && lastClassPaperRowsRef.current.length > 0) {
            return lastClassPaperRowsRef.current;
        }

        // 1. Get classAllocationsStore (Ground truth per-class subjects from Manage Subjects per Class Stream)
        const activeClassAllocationsStore: Record<string, string[]> = (() => {
            try {
                const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
                if (saved) return JSON.parse(saved) || {};
            } catch (e) { }
            return (currentInstitution as any)?.classSubjectAllocations || {};
        })();

        // 2. Get savedConfigs (Exam Papers Settings)
        let savedConfigs: any[] = (currentInstitution as any)?.classExamConfigs || (currentInstitution as any)?.class_exam_configs;
        if (!savedConfigs || !Array.isArray(savedConfigs) || savedConfigs.length === 0) {
            try {
                const savedLocalInst = localStorage.getItem(`eduai_class_exam_configs_${instId}`);
                if (savedLocalInst) {
                    const parsed = JSON.parse(savedLocalInst);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        savedConfigs = parsed;
                    }
                }
            } catch (e) { }
        }

        const activeExamRows = (activeExam?.id && examMarksStore[activeExam.id]) ? examMarksStore[activeExam.id] : broadsheetStudentRows;

        // O(1) indexed lookups for active exam mark rows
        const activeRowsByAdm = new Map<string, any>();
        const activeRowsByName = new Map<string, any>();
        (activeExamRows || []).forEach(r => {
            if (r.admNo && r.admNo !== 'N/A') activeRowsByAdm.set(String(r.admNo).trim(), r);
            if (r.name) activeRowsByName.set(String(r.name).trim().toLowerCase(), r);
        });

        // Pre-bucket students by normalized class name in single O(N) pass to avoid O(Classes * Students) scans
        const realStudentsByClass = new Map<string, any[]>();
        allRealStudents.filter(st => !isNonStudentUser(st)).forEach(st => {
            const cls = getStudentClass(st);
            if (cls) {
                const k = cls.trim().toLowerCase();
                if (!realStudentsByClass.has(k)) realStudentsByClass.set(k, []);
                realStudentsByClass.get(k)!.push(st);
            }
        });

        const examRowsByClass = new Map<string, any[]>();
        (activeExamRows || []).filter(r => !isNonStudentUser(r)).forEach(r => {
            const cls = r.class || getStudentClass(r);
            if (cls) {
                const k = cls.trim().toLowerCase();
                if (!examRowsByClass.has(k)) examRowsByClass.set(k, []);
                examRowsByClass.get(k)!.push(r);
            }
        });

        const computedRows = activeExamClasses.map((cName, cIdx) => {
            const cleanTC = cName.trim();
            const tcLower = cleanTC.toLowerCase();
            const tcNoStream = cleanTC.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim().toLowerCase();

            const realStudentsForClass = realStudentsByClass.get(tcLower) || allRealStudents.filter(st => {
                if (isNonStudentUser(st)) return false;
                return isStudentInTargetClasses(st, [cName]);
            });

            const classStudents = examRowsByClass.get(tcLower) || activeExamRows.filter(s => {
                return isStudentInTargetClasses(s, [cName]);
            });

            const dummyNames = ['Amina Kiprop', 'Brian Omondi', 'Cynthia Wambui', 'David Cheruiyot', 'Emmanuel Kamau', 'Maxine Jelimo', 'Dennis Kiplagat'];
            const isDummyRows = classStudents.length > 0 && classStudents.every(r => (!r.admNo || r.admNo === 'N/A') && dummyNames.includes(r.name));

            // Determine the best list of real students for this class:
            // Priority: allRealStudents matched by class > non-dummy broadsheet rows for class > full broadsheet if single class
            const baseList = realStudentsForClass.length > 0
                ? realStudentsForClass
                : (!isDummyRows && classStudents.length > 0
                    ? classStudents
                    : (activeExamClasses.length === 1 && broadsheetStudentRows.length > 0 ? broadsheetStudentRows : []));

            const targetStudents = baseList.map((st, idx) => {
                const adm = resolveCleanAdmNo(st, idx);
                const cleanName = resolveCleanStudentName(st, idx);
                const markRow = (adm && adm !== 'N/A' && activeRowsByAdm.get(String(adm).trim())) ||
                                (cleanName && activeRowsByName.get(cleanName.toLowerCase().trim()));
                return {
                    ...st,
                    ...(markRow || {}),
                    admNo: adm,
                    name: cleanName
                };
            });

            // Enrollment: prefer count from matched real students;
            // if no real students found yet (async load), fall back to broadsheet rows filtered for this class
            // so the UI always shows a non-zero number when data exists in the broadsheet.
            const broadsheetForClass = classStudents.filter(r => !dummyNames.includes(r.name) || (r.admNo && r.admNo !== 'N/A'));
            const classEnrollment = targetStudents.length > 0
                ? targetStudents.length
                : (broadsheetForClass.length > 0 ? broadsheetForClass.length : classStudents.length);

            // Resolve strictly registered subjects for this specific class
            const registeredItems = getRegisteredSubjectsForClass(cName);
            const regSubjectNormSet = new Set(registeredItems.map(r => r.subject.toLowerCase().trim()));
            const regPaperKeySet = new Set(registeredItems.map(r => `${r.subject.toLowerCase().trim()}__${(r.paperName || 'Paper 1').toLowerCase().trim()}`));

            let classPaperItems: { subject: string; paperName: string }[] = [];

            const activeEnabledPapers = testedPaperConfigs.filter(p => p && p.enabled);
            if (registeredItems.length > 0) {
                const matchedActive = activeEnabledPapers.filter(p => {
                    const subKey = p.subject.toLowerCase().trim();
                    const paperKey = `${subKey}__${(p.paperName || 'Paper 1').toLowerCase().trim()}`;
                    return regPaperKeySet.has(paperKey) || regSubjectNormSet.has(subKey);
                });
                classPaperItems = matchedActive.length > 0
                    ? matchedActive.map(p => ({ subject: p.subject, paperName: p.paperName || 'Paper 1' }))
                    : registeredItems.map(r => ({ subject: r.subject, paperName: r.paperName || 'Paper 1' }));
            } else {
                const matchedActive = activeEnabledPapers.filter(p => isSubjectApplicableToClass({ name: p.subject }, cName));
                classPaperItems = matchedActive.length > 0
                    ? matchedActive.map(p => ({ subject: p.subject, paperName: p.paperName || 'Paper 1' }))
                    : (subjects || []).filter(s => isSubjectApplicableToClass({ name: s.name || (s as any).title, code: s.code }, cName)).map(s => ({ subject: s.name || (s as any).title, paperName: 'Paper 1' }));
            }

            const papers = classPaperItems.map((item, sIdx) => {
                const subName = item.subject;
                const sClean = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const pClean = (item.paperName || 'paper 1').toLowerCase().replace(/[^a-z0-9]/g, '_');
                const exactKey = `subj_${sClean}_${pClean}`;
                const fallbackKey1 = `subj_${sClean}_p1`;

                const candidateKeys = getCandidateKeysForPaper(subName, exactKey, item.paperName);

                let progress = 0;
                if (targetStudents.length > 0) {
                    const enteredCount = targetStudents.filter((st: any) => {
                        const markInfo = getStudentPaperMark(st, exactKey, subName, item.paperName);
                        return markInfo.hasMark && (markInfo.val > 0 || (st as any)[exactKey] !== undefined);
                    }).length;
                    progress = parseFloat(((enteredCount / targetStudents.length) * 100).toFixed(2));
                } else if (activeExam?.submittedPercent && activeExam.submittedPercent > 0) {
                    progress = activeExam.submittedPercent;
                }

                const teacherName = getSubjectTeacherForClass(subName, cName, item.paperName);

                return {
                    id: `p_${cIdx}_${sIdx}`,
                    subject: item.paperName && item.paperName !== 'Paper 1' && item.paperName !== 'Main paper' ? `${subName} (${item.paperName})` : subName,
                    teacher: teacherName,
                    enrollment: classEnrollment,
                    progress
                };
            });

            const avgProgress = papers.length > 0
                ? parseFloat((papers.reduce((sum, p) => sum + p.progress, 0) / papers.length).toFixed(2))
                : (activeExam?.submittedPercent || 0);

            return {
                classKey: `c_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                className: cName.includes(String(activeExam?.year || '')) ? cName : `${cName} ${activeExam?.year || 2026}`,
                rawClassName: cName,
                enrollment: classEnrollment,
                overallProgress: avgProgress,
                papers
            };
        });

        lastClassPaperRowsRef.current = computedRows;
        return computedRows;
    }, [activeExamClasses, broadsheetStudentRows, activeExam, instId, currentInstitution, subjects, testedPaperConfigs, users, examMarksStore, getRegisteredSubjectsForClass, allRealStudents, isStudentInTargetClasses, resolveCleanAdmNo, resolveCleanStudentName, getCandidateKeysForPaper, getStudentPaperMark, getSubjectTeacherForClass, isAddExamModalOpen, isBroadsheetModalOpen]);

    const displayClassPaperRows = useMemo(() => {
        // Filter by grade, then hide streams that have zero enrolled learners
        // (avoids cluttering the list with ghost streams from exam setup)
        const gradeFiltered = (!dashboardGradeFilter || dashboardGradeFilter === 'all')
            ? classPaperRows
            : (() => {
                const normG = extractGradeLabel(dashboardGradeFilter).toLowerCase();
                return classPaperRows.filter(r => extractGradeLabel(r.rawClassName).toLowerCase() === normG);
            })();
        // Only hide zero-enrollment rows when there IS at least one row with learners,
        // so we never show a completely blank table on first load.
        const hasAnyEnrolled = gradeFiltered.some(r => r.enrollment > 0);
        return hasAnyEnrolled
            ? gradeFiltered.filter(r => r.enrollment > 0)
            : gradeFiltered;
    }, [classPaperRows, dashboardGradeFilter, extractGradeLabel]);

    // Dynamic Teacher Progress
    const teacherProgressList = useMemo(() => {
        if (!activeExam || classPaperRows.length === 0) return [];
        const teachersMap = new Map<string, number[]>();
        classPaperRows.forEach(cRow => {
            cRow.papers.forEach((p: any) => {
                const tName = p.teacher || 'Subject Teacher';
                if (!teachersMap.has(tName)) teachersMap.set(tName, []);
                teachersMap.get(tName)!.push(p.progress);
            });
        });

        if (teachersMap.size === 0) {
            return [
                { name: 'Subject Teacher', progress: activeExam?.submittedPercent || 0 }
            ];
        }

        return Array.from(teachersMap.entries()).map(([name, progs]) => ({
            name,
            progress: parseFloat((progs.reduce((a, b) => a + b, 0) / progs.length).toFixed(1))
        }));
    }, [classPaperRows, activeExam]);

    // Dynamic Class Progress
    const classProgressList = useMemo(() => {
        if (!activeExam || classPaperRows.length === 0) return [];
        return classPaperRows.map(c => ({
            name: c.className,
            progress: c.overallProgress
        }));
    }, [classPaperRows, activeExam]);

    // Dynamic Subject Progress
    const subjectProgressList = useMemo(() => {
        if (!activeExam || classPaperRows.length === 0) return [];
        const allSubjects = new Set<string>();
        classPaperRows.forEach(c => c.papers.forEach((p: any) => allSubjects.add(p.subject)));
        return Array.from(allSubjects).map(subName => {
            let totalProg = 0;
            let count = 0;
            classPaperRows.forEach(c => {
                const p = c.papers.find((x: any) => x.subject === subName);
                if (p) {
                    totalProg += p.progress;
                    count++;
                }
            });
            const avg = count > 0 ? parseFloat((totalProg / count).toFixed(1)) : 0;
            return { name: subName, progress: avg };
        });
    }, [classPaperRows, activeExam]);

    // Helper to dynamically resolve overall submitted percentage for any exam
    const getExamSubmittedPercent = useCallback((examObj: ExamUnitRecord) => {
        if (!examObj) return 0;
        if (examObj.id === selectedExamId && classPaperRows.length > 0) {
            const sum = classPaperRows.reduce((acc, c) => acc + c.overallProgress, 0);
            return parseFloat((sum / classPaperRows.length).toFixed(1));
        }
        return examObj.submittedPercent || 0;
    }, [selectedExamId, classPaperRows]);

    const inProgressExams = useMemo(() => exams.filter(e => e.status === 'in_progress'), [exams]);

    const handleSaveSubjectMarks = async (subjectName: string) => {
        if (activeExam?.status === 'published') {
            alert(`🔒 "${activeExam.name}" is currently published.\n\nPublished exams cannot be edited unless unpublished first. Please click "Unpublish Exam" before saving new marks.`);
            return;
        }
        setIsSavingMarks(true);

        // ── LAYER 3: Teacher stream save guard ────────────────────────────────
        // If the logged-in user is a teacher, only persist rows within their
        // allocated stream(s) for this subject. Rows outside their scope are
        // preserved untouched from the existing store so other teachers' data
        // is never silently overwritten.
        let rowsToSave = broadsheetStudentRows;
        if (teacherSubjectClassMap !== null) {
            const norm = (s: string) => (s || '').trim().toLowerCase();
            // Determine allowed classes for this specific subject
            const subKey = norm(subjectName);
            const exactClasses = teacherSubjectClassMap[subKey];
            let allowedClasses: string[];
            if (exactClasses) {
                allowedClasses = exactClasses;
            } else {
                const fuzzyKey = Object.keys(teacherSubjectClassMap).find(
                    k => k.includes(subKey) || subKey.includes(k)
                );
                allowedClasses = fuzzyKey ? teacherSubjectClassMap[fuzzyKey] : [];
            }

            if (allowedClasses.length === 0) {
                // Teacher has no allocation for this subject → block save entirely
                setIsSavingMarks(false);
                alert(`⚠️ You are not allocated to teach "${subjectName}" for any class stream.\n\nMarks cannot be saved. Please contact your administrator.`);
                return;
            }

            // Rows the teacher IS allowed to touch
            const allowedRows = broadsheetStudentRows.filter((row: any) => {
                const rowClass = norm(row.class || row.className || '');
                return allowedClasses.some(
                    allowed => rowClass === allowed || rowClass.startsWith(allowed) || allowed.startsWith(rowClass)
                );
            });

            // Rows outside their scope, taken from the EXISTING store (untouched)
            const existingExamRows: any[] = examMarksStore[selectedExamId] || [];
            const outOfScopeRows = existingExamRows.filter((row: any) => {
                const rowClass = norm(row.class || row.className || '');
                return !allowedClasses.some(
                    allowed => rowClass === allowed || rowClass.startsWith(allowed) || allowed.startsWith(rowClass)
                );
            });

            // Merge: teacher-owned rows (updated) + everyone else's rows (preserved)
            rowsToSave = [...allowedRows, ...outOfScopeRows];
        }
        // ─────────────────────────────────────────────────────────────────────

        const updatedStore = { ...examMarksStore, [selectedExamId]: rowsToSave };
        setExamMarksStore(updatedStore);
        setUnsavedStudentAdms(new Set());
        try {
            localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(updatedStore));
            window.dispatchEvent(new CustomEvent('eduai_broadsheets_updated', { detail: { examId: selectedExamId } }));
            window.dispatchEvent(new CustomEvent('eduai_academics_synced'));
        } catch (e) { }

        // ── AUTO-SNAPSHOT: Save a timestamped class-keyed backup of these marks ──
        if (activeExam && rowsToSave.length > 0) {
            const classesForSnap = activeExamClasses.length > 0 ? activeExamClasses : (activeExam.classes || []);
            snapshotMarks(selectedExamId, classesForSnap, rowsToSave);
        }

        // ── UPDATE EXAM SUBMITTED PERCENT IN EXAMS LIST ──
        if (activeExam && classPaperRows.length > 0) {
            const sumProgress = classPaperRows.reduce((acc, c) => acc + c.overallProgress, 0);
            const calculatedSubmittedPct = parseFloat((sumProgress / classPaperRows.length).toFixed(1));

            setExams(prevExams => {
                const nextExams = prevExams.map(e => {
                    if (e.id === selectedExamId) {
                        return {
                            ...e,
                            submittedPercent: calculatedSubmittedPct
                        };
                    }
                    return e;
                });
                try {
                    localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(nextExams));
                } catch (e) { }

                syncExamsToCloud(nextExams);

                const updatedExam = nextExams.find(e => e.id === selectedExamId);
                if (updatedExam && currentInstitution?.id) {
                    apiService.saveModuleRecord('exam_units', updatedExam).catch(() => { });
                }
                return nextExams;
            });
        }

        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('institution_module_states', {
                id: `ims_exam_broadsheets_${currentInstitution.id}`,
                institution_id: currentInstitution.id,
                institutionId: currentInstitution.id,
                module_id: 'exam_broadsheets',
                moduleId: 'exam_broadsheets',
                moduleName: 'Exam Broadsheets',
                status: 'active',
                settings: updatedStore,
                stateData: updatedStore
            }).catch(() => { });
        }

        try {
            window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'marks', instId } }));
        } catch (e) { }

        setTimeout(() => {
            setIsSavingMarks(false);
            setSaveToastMessage(`✅ Marks for ${subjectName} updated and saved successfully!`);
            setTimeout(() => setSaveToastMessage(null), 4000);
        }, 300);
    };

    const handleCreateExam = async (formData?: AddEditExamFormData) => {
        const examName = formData ? formData.examName : newExamName;
        const term = formData ? formData.term : newTerm;
        const type = formData ? formData.type : newExamTypeRadio;
        const academicYear = formData ? formData.academicYear : newAcademicYear;
        const targetClasses = formData ? formData.classes : selectedClasses;
        const currentTestedPapers = formData ? formData.testedPaperConfigs : testedPaperConfigs;
        const isCustomRanking = formData ? formData.useCustomRanking : useCustomRanking;
        const rScope = formData ? formData.rankingScope : rankingScope;
        const rCriteria = formData ? formData.customRankingCriteria : customRankingCriteria;
        const rCount = formData ? formData.customRankingSubjectsCount : customRankingSubjectsCount;
        const perClassSettings = formData ? formData.perClassRankingSettings : perClassRankingSettings;
        const gradingSys = formData ? formData.gradingSystem : newGradingSystem;

        if (!examName.trim()) {
            alert('Please enter an exam title.');
            return;
        }
        if (targetClasses.length === 0) {
            alert('Please select at least one class sitting this exam.');
            return;
        }

        let realStudents = allRealStudents.length > 0
            ? allRealStudents.filter(s => !isNonStudentUser(s))
            : (users || []).filter(isStudentUser);

        if (realStudents.length === 0 || realStudents.length < 10) {
            try {
                const cached = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                               localStorage.getItem('eduai_student_enrollments') ||
                               localStorage.getItem(`eduai_students_${instId}`) ||
                               localStorage.getItem('eduai_students');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                        const cleanParsed = parsed.filter(u => !isNonStudentUser(u));
                        if (cleanParsed.length > realStudents.length) {
                            realStudents = cleanParsed;
                        }
                    }
                }
            } catch (e) {}
        }

        const matchedStudents = realStudents.filter(st => {
            if (isNonStudentUser(st)) return false;
            const cl = getStudentClass(st);
            return isStudentInTargetClasses(cl || st, targetClasses);
        });

        const studentCount = matchedStudents.length > 0 ? matchedStudents.length : broadsheetStudentRows.filter(r => !isNonStudentUser(r)).length;

        // EDIT EXISTING EXAM CASE
        if (isEditingExam && activeExam) {
            if (activeExam.status === 'published') {
                alert(`🔒 "${activeExam.name}" is currently published.\n\nPublished exams cannot be edited unless unpublished first. Please unpublish this exam before saving changes.`);
                return;
            }
            // ── CLASS-CHANGE GUARD: Warn if class list changed and marks exist ──
            const oldClasses = activeExam.classes || [];
            const newClasses = targetClasses;
            const classesChanged =
                oldClasses.length !== newClasses.length ||
                oldClasses.some(c => !newClasses.includes(c));

            const existingRows: any[] = examMarksStore[activeExam.id] || [];
            const hasEnteredMarks = existingRows.some(r =>
                Object.entries(r).some(([k, v]) =>
                    !['admNo', 'name', 'class'].includes(k) && typeof v === 'number' && v > 0
                )
            );

            if (classesChanged && hasEnteredMarks && oldClasses.length > 0) {
                // Snapshot the existing marks under the old class key BEFORE warning
                snapshotMarks(activeExam.id, oldClasses, existingRows);

                const backupKey = buildSnapshotKey(activeExam.id, oldClasses);
                // Show warning dialog — don't proceed until user confirms
                setClassChangeWarning({
                    oldClasses,
                    newClasses,
                    examId: activeExam.id,
                    examName: examName.trim(),
                    backupKey,
                    rowCount: existingRows.length,
                    proceed: async () => {
                        const cleanTested = deduplicatePapers(currentTestedPapers);
                        const updatedExam: ExamUnitRecord = {
                            ...activeExam,
                            name: examName.trim(),
                            term: term.toUpperCase(),
                            type: type.toUpperCase(),
                            year: parseInt(academicYear) || activeExam.year,
                            studentsEnrolled: studentCount,
                            classes: targetClasses,
                            testedPaperConfigs: cleanTested,
                            rankingCriteria: isCustomRanking ? rCriteria : activeExam.rankingCriteria,
                            rankingScope: isCustomRanking ? rScope : activeExam.rankingScope,
                            customRankingSubjectsCount: isCustomRanking ? rCount : activeExam.customRankingSubjectsCount,
                            perClassRankingSettings: isCustomRanking && rScope === 'per_class' ? perClassSettings : activeExam.perClassRankingSettings,
                            gradingSystem: gradingSys,
                            institution_id: currentInstitution?.id,
                            institutionId: currentInstitution?.id
                        };
                        try {
                            localStorage.setItem(`eduai_tested_papers_${instId}_${activeExam.id}`, JSON.stringify(cleanTested));
                            localStorage.setItem(`eduai_tested_papers_${instId}`, JSON.stringify(cleanTested));
                        } catch (e) { }
                        setExams(prev => {
                            const nextExams = prev.map(e => e.id === activeExam.id ? updatedExam : e);
                            try { localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(nextExams)); } catch (e) { }
                            syncExamsToCloud(nextExams);
                            return nextExams;
                        });
                        if (currentInstitution?.id) {
                            await apiService.saveModuleRecord('exam_units', updatedExam).catch(() => { });
                        }
                        try {
                            window.dispatchEvent(new CustomEvent('eduai_exam_units_synced', { detail: { examId: updatedExam.id, instId } }));
                            window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'exam_units', instId } }));
                        } catch (_) {}
                        setIsEditingExam(false);
                        setIsAddExamModalOpen(false);
                        setWizardStep(1);
                        setClassChangeWarning(null);
                        setSaveToastMessage(`✨ Updated "${updatedExam.name}". Previous marks archived.`);
                        setTimeout(() => setSaveToastMessage(null), 5000);
                    }
                });
                return; // Wait for user response in dialog
            }

            const cleanTested = deduplicatePapers(currentTestedPapers);
            const updatedExam: ExamUnitRecord = {
                ...activeExam,
                name: examName.trim(),
                term: term.toUpperCase(),
                type: type.toUpperCase(),
                year: parseInt(academicYear) || activeExam.year,
                studentsEnrolled: studentCount,
                classes: targetClasses,
                testedPaperConfigs: cleanTested,
                rankingCriteria: isCustomRanking ? rCriteria : activeExam.rankingCriteria,
                rankingScope: isCustomRanking ? rScope : activeExam.rankingScope,
                customRankingSubjectsCount: isCustomRanking ? rCount : activeExam.customRankingSubjectsCount,
                perClassRankingSettings: isCustomRanking && rScope === 'per_class' ? perClassSettings : activeExam.perClassRankingSettings,
                gradingSystem: gradingSys,
                institution_id: currentInstitution?.id,
                institutionId: currentInstitution?.id
            };

            try {
                localStorage.setItem(`eduai_tested_papers_${instId}_${activeExam.id}`, JSON.stringify(cleanTested));
                localStorage.setItem(`eduai_tested_papers_${instId}`, JSON.stringify(cleanTested));
            } catch (e) { }

            setExams(prev => {
                const nextExams = prev.map(e => e.id === activeExam.id ? updatedExam : e);
                try {
                    localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
                } catch (e) { }
                syncExamsToCloud(nextExams);
                return nextExams;
            });

            if (currentInstitution?.id) {
                await apiService.saveModuleRecord('exam_units', updatedExam).catch(() => { });
            }

            try {
                window.dispatchEvent(new CustomEvent('eduai_exam_units_synced', { detail: { examId: updatedExam.id, instId } }));
                window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'exam_units', instId } }));
            } catch (_) {}

            setIsEditingExam(false);
            setIsAddExamModalOpen(false);
            setWizardStep(1);
            setSaveToastMessage(`✨ Updated "${updatedExam.name}" for ${targetClasses.length} selected classes!`);
            setTimeout(() => setSaveToastMessage(null), 4000);
            return;
        }
        const newExamId = `exam_${Date.now()}`;
        const cleanTested = deduplicatePapers(currentTestedPapers);

        const newExam: ExamUnitRecord = {
            id: newExamId,
            name: examName.trim(),
            term: term.toUpperCase(),
            type: type.toUpperCase(),
            year: parseInt(academicYear) || 2026,
            status: 'in_progress',
            submittedPercent: 0,
            studentsEnrolled: studentCount,
            missingMarks: studentCount * (cleanTested.filter(p => p.enabled).length || 7),
            classes: targetClasses,
            testedPaperConfigs: cleanTested,
            rankingCriteria: isCustomRanking ? rCriteria : undefined,
            rankingScope: isCustomRanking ? rScope : undefined,
            customRankingSubjectsCount: isCustomRanking ? rCount : undefined,
            perClassRankingSettings: isCustomRanking && rScope === 'per_class' ? perClassSettings : undefined,
            gradingSystem: gradingSys,
            institution_id: currentInstitution?.id,
            institutionId: currentInstitution?.id
        };

        try {
            localStorage.setItem(`eduai_tested_papers_${instId}_${newExamId}`, JSON.stringify(cleanTested));
            localStorage.setItem(`eduai_tested_papers_${instId}`, JSON.stringify(cleanTested));
        } catch (e) { }

        // Construct clean zeroed marks rows for each target class in the new exam
        let freshRows: any[] = [];
        if (matchedStudents.length > 0) {
            freshRows = matchedStudents.map((st, idx) => ({
                admNo: resolveCleanAdmNo(st, idx),
                name: resolveCleanStudentName(st, idx),
                class: getStudentClass(st) || targetClasses[0],
                mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
            }));
            newExam.studentsEnrolled = freshRows.length;
            newExam.missingMarks = freshRows.length * (cleanTested.filter(p => p.enabled).length || 7);
        } else {
            targetClasses.forEach((cName, cIdx) => {
                const sampleNames = ['Amina Kiprop', 'Brian Omondi', 'Cynthia Wambui', 'David Cheruiyot', 'Emmanuel Kamau'];
                sampleNames.forEach((sName, sIdx) => {
                    freshRows.push({
                        admNo: 'N/A',
                        name: `${sName}`,
                        class: cName,
                        mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
                    });
                });
            });
        }

        setExams(prev => {
            const nextExams = [newExam, ...prev];
            try {
                localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
            } catch (e) { }
            syncExamsToCloud(nextExams);
            return nextExams;
        });

        setExamMarksStore(prev => {
            const nextStore = { ...prev, [newExamId]: freshRows };
            try {
                localStorage.setItem(`eduai_exam_broadsheet_${newExamId}`, JSON.stringify(freshRows));
            } catch (e) { }
            return nextStore;
        });

        setBroadsheetStudentRows(freshRows);
        setSelectedExamId(newExamId);
        setSelectedClassFilter(targetClasses[0] || 'all');
        setNewExamName('');
        setIsAddExamModalOpen(false);

        // Save to Database
        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('exam_units', newExam).catch(() => { });
            await apiService.saveModuleRecord('exam_broadsheets', { id: newExamId, examId: newExamId, rows: freshRows, institutionId: currentInstitution.id, institution_id: currentInstitution.id }).catch(() => { });
        }

        try {
            window.dispatchEvent(new CustomEvent('eduai_exam_units_synced', { detail: { examId: newExamId, instId } }));
            window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'exam_units', instId } }));
        } catch (_) {}

        setSaveToastMessage(`✨ Created "${newExam.name}" cleanly for ${targetClasses.length} registered classes!`);
        setTimeout(() => setSaveToastMessage(null), 4000);
    };

    const handleTogglePublish = () => {
        if (!activeExam) return;

        const isCurrentlyPublished = activeExam.status === 'published';

        // If toggling to PUBLISHED, perform incomplete marks validation check first!
        if (!isCurrentlyPublished) {
            const targetClasses = activeExamClasses.length > 0 ? activeExamClasses : (activeExam.classes || []);
            const rowsToTest = (broadsheetStudentRows && broadsheetStudentRows.length > 0)
                ? broadsheetStudentRows
                : (activeExam.id && examMarksStore[activeExam.id] ? examMarksStore[activeExam.id] : []);

            const incompleteStudents: { name: string; admNo: string; missingPapers: string[] }[] = [];

            (rowsToTest || []).forEach(st => {
                const missing: string[] = [];
                const stClass = st.class || (st as any).studentClass || targetClasses[0] || '';

                const applicableSubjects = modalAvailableSubjects.length > 0
                    ? modalAvailableSubjects
                    : subjects.filter(s => isSubjectApplicableToClass({ name: s.name || (s as any).title, code: s.code }, stClass)).map(s => s.name || (s as any).title);

                applicableSubjects.forEach(subName => {
                    const papers = getSubjectPapers(subName);
                    papers.forEach(sp => {
                        const markInfo = getStudentPaperMark(st, sp.key, subName, sp.label);
                        const isEntered = markInfo.hasMark && (markInfo.val > 0 || (st as any)[sp.key] !== undefined);
                        if (!isEntered) {
                            missing.push(sp.label || sp.key);
                        }
                    });
                });

                if (missing.length > 0) {
                    incompleteStudents.push({
                        name: st.name || 'Student',
                        admNo: st.admNo || '',
                        missingPapers: missing
                    });
                }
            });

            // If exam overall submission is already 100% or incompleteStudents is empty, skip alert
            if (incompleteStudents.length > 0 && !(activeExam.submittedPercent && activeExam.submittedPercent >= 100)) {
                const previewList = incompleteStudents.slice(0, 5).map(s => `• ${s.name} (${s.admNo}): missing ${s.missingPapers.slice(0, 2).join(', ')}${s.missingPapers.length > 2 ? '...' : ''}`).join('\n');
                const extraCount = incompleteStudents.length > 5 ? `\n...and ${incompleteStudents.length - 5} more student(s).` : '';
                
                const confirmMsg = `⚠️ INCOMPLETE MARKS DETECTED!\n\nThere are ${incompleteStudents.length} student(s) with incomplete or missing marks in "${activeExam.name}":\n\n${previewList}${extraCount}\n\nDo you want to publish this exam broadsheet anyway?`;

                if (!confirm(confirmMsg)) {
                    return; // Abort publishing!
                }
            }
        }

        const newStatus = isCurrentlyPublished ? ('in_progress' as const) : ('published' as const);

        // Commit active broadsheet student rows into examMarksStore, local storage, and database
        const rawRowsToSave = (broadsheetStudentRows && broadsheetStudentRows.length > 0)
            ? broadsheetStudentRows
            : (examMarksStore[activeExam.id] || []);

        // ── BATCH CONVERSION ON PUBLISH: Compute grades, percentages, mean scores, and rank positions ──
        let rowsToSave = rawRowsToSave;
        if (newStatus === 'published' && rawRowsToSave.length > 0) {
            const targetClasses = activeExamClasses.length > 0 ? activeExamClasses : (activeExam.classes || []);
            const allSubs = modalAvailableSubjects.length > 0
                ? modalAvailableSubjects
                : subjects.map(s => s.name || (s as any).title).filter(Boolean);

            rowsToSave = rawRowsToSave.map(st => {
                const stClass = st.class || (st as any).studentClass || targetClasses[0] || '';
                let totalRawAllSubs = 0;
                let totalMaxAllSubs = 0;
                const subjectMetrics: Record<string, any> = {};

                allSubs.forEach(subName => {
                    const papers = getSubjectPapers(subName);
                    const subMax = papers.reduce((m, p) => m + (p.maxScore || 100), 0) || 100;
                    const subRaw = papers.reduce((sum, p) => {
                        const markInfo = getStudentPaperMark(st, p.key, subName, p.label);
                        const val = (st as any)[p.key] !== undefined ? (st as any)[p.key] : (markInfo.hasMark ? markInfo.val : 0);
                        return sum + (Number(val) || 0);
                    }, 0);

                    const subPct = subMax > 0 ? parseFloat(((subRaw / subMax) * 100).toFixed(1)) : 0;
                    const subGrade = calculateGradeFromScore(subPct, stClass, subName);

                    const cleanSubKey = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    subjectMetrics[`${cleanSubKey}_total`] = subRaw;
                    subjectMetrics[`${cleanSubKey}_pct`] = subPct;
                    subjectMetrics[`${cleanSubKey}_grade`] = subGrade;

                    totalRawAllSubs += subRaw;
                    totalMaxAllSubs += subMax;
                });

                const overallPct = totalMaxAllSubs > 0 ? parseFloat(((totalRawAllSubs / totalMaxAllSubs) * 100).toFixed(1)) : 0;
                const overallGrade = calculateGradeFromScore(overallPct, stClass);

                return {
                    ...st,
                    ...subjectMetrics,
                    totalMarks: totalRawAllSubs,
                    overallPercentage: overallPct,
                    meanScore: overallPct,
                    meanGrade: overallGrade,
                    isPublished: true
                };
            });

            // Assign positions/ranks based on totalMarks
            const sortedByScore = [...rowsToSave].sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
            const rankMap = new Map<string, number>();
            sortedByScore.forEach((r, idx) => {
                rankMap.set(r.admNo, idx + 1);
            });

            rowsToSave = rowsToSave.map(r => ({
                ...r,
                position: rankMap.get(r.admNo) || 1,
                rank: rankMap.get(r.admNo) || 1
            }));

            // Sync enriched rows into state
            setBroadsheetStudentRows(rowsToSave);
        }

        const updatedStore = { ...examMarksStore, [activeExam.id]: rowsToSave };
        setExamMarksStore(updatedStore);
        setUnsavedStudentAdms(new Set());

        try {
            localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(updatedStore));
            window.dispatchEvent(new CustomEvent('eduai_broadsheets_updated', { detail: { examId: activeExam.id, store: updatedStore } }));
        } catch (e) { }

        // Also save a snapshot backup
        if (activeExam && rowsToSave.length > 0) {
            const classesForSnap = activeExamClasses.length > 0 ? activeExamClasses : (activeExam.classes || []);
            snapshotMarks(activeExam.id, classesForSnap, rowsToSave);
        }

        // Save to institution_module_states in Supabase so broadsheet is persistent across devices
        if (currentInstitution?.id && newStatus === 'published' && rowsToSave.length > 0) {
            apiService.saveModuleRecord('institution_module_states', {
                id: `ims_exam_broadsheets_${currentInstitution.id}`,
                institution_id: currentInstitution.id,
                institutionId: currentInstitution.id,
                module_id: 'exam_broadsheets',
                moduleId: 'exam_broadsheets',
                module_name: 'Exam Broadsheets',
                moduleName: 'Exam Broadsheets',
                status: 'active',
                settings: updatedStore,
                stateData: updatedStore
            }).catch(() => { });
        }

        setExams(prev => {
            const nextExams = prev.map(e => {
                if (e.id === activeExam.id) {
                    return {
                        ...e,
                        status: newStatus,
                        isPublished: newStatus === 'published',
                        published: newStatus === 'published',
                        studentsEnrolled: rowsToSave.length || e.studentsEnrolled
                    };
                }
                return e;
            });
            try {
                localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
            } catch (e) { }
            syncExamsToCloud(nextExams);

            const updatedExam = nextExams.find(e => e.id === activeExam.id);
            if (updatedExam && currentInstitution?.id) {
                apiService.saveModuleRecord('exam_units', {
                    ...updatedExam,
                    studentsEnrolled: rowsToSave.length || updatedExam.studentsEnrolled,
                    broadsheetData: rowsToSave
                }).catch(() => { });
            }

            return nextExams;
        });

        try {
            window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'exam_publish', instId: currentInstitution?.id, examId: activeExam.id } }));
        } catch (e) { }

        setSaveToastMessage(newStatus === 'published' ? `🚀 Published "${activeExam.name}" results to the Broadsheet!` : `🔒 Unpublished "${activeExam.name}". Broadsheet hidden.`);
        setTimeout(() => setSaveToastMessage(null), 4000);
    };

    const handleDeleteExam = async () => {
        if (!activeExam) return;
        if (confirm(`Are you sure you want to delete "${activeExam.name}"?`)) {
            const targetId = activeExam.id;
            const examName = activeExam.name;
            const resolvedInstId = currentInstitution?.id || 'default_inst';

            // Compute the filtered list before calling setExams so the value
            // is stable across React StrictMode double-invocations of the updater.
            const nextExams = exams.filter(e => e.id !== targetId);

            // 1. Update local state and localStorage atomically
            setExams(nextExams);
            try {
                localStorage.setItem(`eduai_exam_units_${resolvedInstId}`, JSON.stringify(nextExams));
            } catch (e) { }

            // 2. Update selectedExamId
            if (nextExams.length > 0) {
                setSelectedExamId(nextExams[0].id);
            } else {
                setSelectedExamId('');
            }

            // 3. Hard-delete from cloud (pass institutionId so tombstone key is correct)
            if (currentInstitution?.id) {
                await apiService.deleteModuleRecord('exam_units', targetId, currentInstitution.id).catch(() => { });
                await apiService.deleteModuleRecord('exam_broadsheets', targetId, currentInstitution.id).catch(() => { });
            }

            // 4. Sync cleaned list to cloud — after setExams, never inside the updater
            await syncExamsToCloud(nextExams);

            setSaveToastMessage(`🗑️ Deleted "${examName}".`);
            setTimeout(() => setSaveToastMessage(null), 4000);
        }
    };

    // Dynamic total enrollment for active exam unit - strictly genuine enrolled students
    const activeExamTotalEnrollment = useMemo(() => {
        if (!activeExam) return 0;
        const targetClasses = activeExamClasses.length > 0 ? activeExamClasses : [];
        if (targetClasses.length > 0) {
            const activeStList = allRealStudents.length > 0
                ? allRealStudents.filter(st => !isNonStudentUser(st))
                : (users || []).filter(isStudentUser);

            const matched = activeStList.filter(st => {
                if (isNonStudentUser(st)) return false;
                const stClass = getStudentClass(st);
                return isStudentInTargetClasses(stClass || st, targetClasses);
            });
            if (matched.length > 0) {
                const dedupKeys = new Set(matched.map(s => getStudentDedupKey(s)).filter(Boolean));
                return dedupKeys.size > 0 ? dedupKeys.size : matched.length;
            }
        }

        const totalFromClasses = classPaperRows.reduce((acc, cRow) => acc + (cRow.enrollment || 0), 0);
        if (totalFromClasses > 0) return totalFromClasses;

        return activeExam?.studentsEnrolled || broadsheetStudentRows.filter(r => !isNonStudentUser(r)).length || 0;
    }, [activeExam, activeExamClasses, allRealStudents, users, isStudentInTargetClasses, getStudentClass, getStudentDedupKey, classPaperRows, broadsheetStudentRows]);

    // Automatically cleanse and correct exam enrollment figures from previous teacher-polluted sums
    useEffect(() => {
        if (allRealStudents.length === 0) return;

        const cleansedStudents = allRealStudents.filter(st => !isNonStudentUser(st));
        if (cleansedStudents.length === 0) return;

        setExams(prev => {
            if (!prev || prev.length === 0) return prev;
            let hasChanges = false;
            const corrected = prev.map(exam => {
                const examClasses = (exam.classes && exam.classes.length > 0) ? exam.classes : registeredClasses;
                if (!examClasses || examClasses.length === 0) return exam;

                const genuineEnrolled = cleansedStudents.filter(st => {
                    const stClass = getStudentClass(st);
                    return isStudentInTargetClasses(stClass || st, examClasses);
                });

                const dedup = new Set(genuineEnrolled.map(s => getStudentDedupKey(s)).filter(Boolean));
                const trueCount = dedup.size > 0 ? dedup.size : genuineEnrolled.length;

                if (trueCount > 0 && exam.studentsEnrolled !== trueCount) {
                    hasChanges = true;
                    return { ...exam, studentsEnrolled: trueCount };
                }
                return exam;
            });

            if (hasChanges) {
                try {
                    localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(corrected));
                } catch (e) { }
                syncExamsToCloud(corrected);
                return corrected;
            }
            return prev;
        });
    }, [allRealStudents, registeredClasses, getStudentClass, isStudentInTargetClasses, getStudentDedupKey, instId, syncExamsToCloud]);

    // Dynamic missing marks count for active exam unit
    const activeExamMissingMarks = useMemo(() => {
        if (!activeExam) return 0;
        // If an exam is published or 100% submitted, missing marks is 0
        if (activeExam.status === 'published' || getExamSubmittedPercent(activeExam) >= 100) {
            return 0;
        }

        // Ground truth: each class c has c.enrollment students and c.papers.length papers assigned
        const totalPossibleMarksEntries = classPaperRows.reduce((acc, c) => acc + ((c.enrollment || 0) * (c.papers?.length || 0)), 0);
        if (totalPossibleMarksEntries === 0) return 0;

        let enteredCount = 0;
        classPaperRows.forEach(c => {
            (c.papers || []).forEach((p: any) => {
                const progPct = p.progress || 0;
                enteredCount += Math.round((progPct / 100) * (c.enrollment || 0));
            });
        });

        const missing = totalPossibleMarksEntries - enteredCount;
        return Math.max(0, missing);
    }, [activeExam, classPaperRows, getExamSubmittedPercent]);

    // Stable memoized initial classes and handlers for AddEditExamModal to prevent unnecessary re-render passes
    const initialModalClasses = useMemo(() => {
        return (selectedClassFilter && selectedClassFilter !== 'all')
            ? [selectedClassFilter]
            : (registeredClasses.length > 0 ? [registeredClasses[0]] : []);
    }, [selectedClassFilter, registeredClasses]);

    const handleOpenPapersModal = useCallback(() => setIsPapersModalOpen(true), []);
    const handleOpenStudentPicker = useCallback(() => setIsStudentPickerModalOpen(true), []);
    const handleCloseAddExamModal = useCallback(() => {
        setIsAddExamModalOpen(false);
        setWizardStep(1);
    }, []);

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl">
            {/* Top Action Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            setIsEditingExam(false);
                            setNewExamName('');
                            setSelectedClasses((selectedClassFilter && selectedClassFilter !== 'all') ? [selectedClassFilter] : (registeredClasses.length > 0 ? [registeredClasses[0]] : []));
                            setWizardStep(1);
                            setIsAddExamModalOpen(true);
                        }}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Exam
                    </button>

                    <button
                        type="button"
                        onClick={handleExportBroadsheetCSV}
                        className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Export current active exam broadsheet to CSV"
                    >
                        <DownloadIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export Broadsheet CSV
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Main Master-Detail Grid Layout matching screenshot */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Master Panel: Exams List & Status Groups */}
                <div className="space-y-6">
                    {/* SECTION 1: EXAMS IN PROGRESS */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            EXAMS IN PROGRESS
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {inProgressExams.length === 0 ? (
                                <div className="p-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                                    No exams in progress
                                </div>
                            ) : (
                                inProgressExams.map(exam => {
                                    const isSelected = selectedExamId === exam.id;
                                    return (
                                        <div
                                            key={exam.id}
                                            onClick={() => handleSelectExam(exam.id)}
                                            className={`p-4 cursor-pointer transition-all ${isSelected
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-white'
                                                }`}
                                        >
                                            <h4 className="text-xs font-bold uppercase tracking-tight mb-1">{exam.name}</h4>
                                            <p className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                                {exam.term} • {exam.type} • {getExamSubmittedPercent(exam)}% submitted
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: PUBLISHED EXAMS */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            PUBLISHED EXAMS
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.keys(publishedByYear).length === 0 ? (
                                <div className="p-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                                    No published exams
                                </div>
                            ) : (
                                Object.entries(publishedByYear)
                                    .filter(([_, list]) => list.length > 0)
                                    .sort(([a], [b]) => Number(b) - Number(a))
                                    .map(([yearStr, list]) => {
                                        const yearNum = parseInt(yearStr);
                                        const isExp = expandedYears[yearNum] ?? true;
                                        return (
                                            <div key={yearNum} className="space-y-0.5">
                                                <div
                                                    onClick={() => setExpandedYears(prev => ({ ...prev, [yearNum]: !isExp }))}
                                                    className="px-4 py-3 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between"
                                                >
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{yearStr} Academic Year ({list.length})</span>
                                                    {isExp ? <ChevronDownIcon className="w-4 h-4 text-slate-400" /> : <ChevronRightIcon className="w-4 h-4 text-slate-400" />}
                                                </div>

                                                {isExp && list.length > 0 && (
                                                    <div className="pl-4 space-y-0.5 bg-slate-50/50 dark:bg-slate-950/40 divide-y divide-slate-100 dark:divide-slate-800">
                                                        {list.map(exam => {
                                                            const isSelected = selectedExamId === exam.id;
                                                            return (
                                                                <div
                                                                    key={exam.id}
                                                                    onClick={() => handleSelectExam(exam.id)}
                                                                    className={`p-3 cursor-pointer transition-all ${isSelected
                                                                            ? 'bg-blue-600 text-white font-bold'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                                                        }`}
                                                                >
                                                                    <h5 className="text-xs font-bold uppercase">{exam.name}</h5>
                                                                    <p className={`text-[9px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                                                        {exam.term} • {exam.type} • {exam.studentsEnrolled} students
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Main Panel: Active Selected Exam Dashboard */}
                <div className="lg:col-span-3 space-y-6">
                    {!activeExam ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm space-y-5">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                                <SparklesIcon className="w-8 h-8 opacity-70" />
                            </div>
                            <div className="space-y-1 max-w-md mx-auto">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-tight">No Exams Created</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    No academic exams have been created for this institution yet. Click the button below to set up your first exam unit, classes, and tested papers.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditingExam(false);
                                    setNewExamName('');
                                    setSelectedClasses((selectedClassFilter && selectedClassFilter !== 'all') ? [selectedClassFilter] : (registeredClasses.length > 0 ? [registeredClasses[0]] : []));
                                    setWizardStep(1);
                                    setIsAddExamModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
                            >
                                <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Your First Exam
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header Controls & Exam Title */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h2 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                                                {activeExam.name}
                                            </h2>
                                            {activeExam.status === 'published' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                    <LockClosedIcon className="w-3 h-3 stroke-[2.5]" /> Published (Locked)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                    In Progress • Editable
                                                </span>
                                            )}
                                        </div>
                                        {activeExam.status === 'published' && (
                                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                🔒 Published exams cannot be edited. Click <strong>Unpublish Exam</strong> to modify parameters, classes, or student marks.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 relative">
                                        <button
                                            type="button"
                                            onClick={handleTogglePublish}
                                            className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                                        >
                                            {activeExam?.status === 'published' ? 'Unpublish Exam' : 'Publish Exam'}
                                        </button>

                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsActionsOpen(!isActionsOpen)}
                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                Exam Actions <ChevronDownIcon className="w-4 h-4 stroke-[2.5]" />
                                            </button>
                                            {isActionsOpen && (
                                                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 animate-scale-in">
                                                    <div className="py-1">
                                                        <button
                                                            onClick={() => {
                                                                setIsActionsOpen(false);
                                                                if (activeExam.status === 'published') {
                                                                    alert(`🔒 "${activeExam.name}" is currently published.\n\nPublished exams cannot be edited unless unpublished first. Please click "Unpublish Exam" to unlock editing.`);
                                                                    return;
                                                                }
                                                                setIsEditingExam(true);
                                                                setNewExamName(activeExam.name);
                                                                setNewTerm(activeExam.term);
                                                                setNewAcademicYear(activeExam.year.toString());
                                                                setSelectedClasses(activeExam.classes || registeredClasses);
                                                                if (activeExam.testedPaperConfigs && Array.isArray(activeExam.testedPaperConfigs) && activeExam.testedPaperConfigs.length > 0) {
                                                                    setTestedPaperConfigs(activeExam.testedPaperConfigs);
                                                                } else {
                                                                    try {
                                                                        const savedByExam = localStorage.getItem(`eduai_tested_papers_${instId}_${activeExam.id}`);
                                                                        if (savedByExam) {
                                                                            const parsed = JSON.parse(savedByExam);
                                                                            if (Array.isArray(parsed) && parsed.length > 0) setTestedPaperConfigs(parsed);
                                                                        }
                                                                    } catch (e) { }
                                                                }
                                                                if (activeExam.rankingCriteria) {
                                                                    setUseCustomRanking(true);
                                                                    setCustomRankingCriteria(activeExam.rankingCriteria);
                                                                    if (activeExam.rankingScope) setRankingScope(activeExam.rankingScope);
                                                                    if (activeExam.customRankingSubjectsCount) setCustomRankingSubjectsCount(activeExam.customRankingSubjectsCount);
                                                                    if (activeExam.perClassRankingSettings) setPerClassRankingSettings(activeExam.perClassRankingSettings);
                                                                } else {
                                                                    setUseCustomRanking(false);
                                                                }
                                                                setWizardStep(1);
                                                                setIsAddExamModalOpen(true);
                                                            }}
                                                            className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
                                                                activeExam.status === 'published'
                                                                    ? 'opacity-60 text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 cursor-not-allowed'
                                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer'
                                                            }`}
                                                            title={activeExam.status === 'published' ? 'Published exams cannot be edited unless unpublished first' : 'Edit Exam'}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <PencilIcon className="w-4 h-4 text-slate-400" /> Edit Exam
                                                            </span>
                                                            {activeExam.status === 'published' && (
                                                                <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                                                    <LockClosedIcon className="w-2.5 h-2.5" /> Locked
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button onClick={() => { setIsActionsOpen(false); setIsBroadsheetModalOpen(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                                                            <DocumentTextIcon className="w-4 h-4 text-slate-400" /> View Broadsheet
                                                        </button>
                                                        <button onClick={() => { setIsActionsOpen(false); setIsSendResultsModalOpen(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                                                            <PaperAirplaneIcon className="w-4 h-4 text-slate-400" /> Send Results
                                                        </button>
                                                    </div>
                                                    <div className="py-1">
                                                        <button onClick={() => { setIsActionsOpen(false); handleTogglePublish(); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-600">
                                                            {activeExam?.status === 'published' ? 'Unpublish' : 'Publish'}
                                                        </button>
                                                    </div>
                                                    <div className="py-1">
                                                        <button onClick={() => { setIsActionsOpen(false); handleDeleteExam(); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2">
                                                            <TrashIcon className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top KPI Stat Cards matching screenshot */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                    <h3 className="text-3xl font-black text-blue-600">{activeExamTotalEnrollment}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">STUDENTS ENROLLED</p>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                    <h3 className="text-3xl font-black text-red-500">{activeExamMissingMarks.toLocaleString()}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">MISSING MARKS</p>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                    <h3 className="text-3xl font-black text-emerald-500">{activeExam ? getExamSubmittedPercent(activeExam) : 0}%</h3>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">OF MARKS SUBMITTED</p>
                                </div>
                            </div>

                            {/* 3 Progress Columns matching screenshot with minimal display & View All */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                {/* Column 1: PROGRESS PER TEACHER */}
                                <div className="p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-xs">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">PROGRESS PER TEACHER</h4>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                                                {teacherProgressList.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {(showAllTeachersProgress ? teacherProgressList : teacherProgressList.slice(0, 5)).map((t, idx) => (
                                                <div key={idx} className="group py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                                                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        <span className="truncate pr-2 font-bold max-w-[200px]" title={t.name}>{t.name}</span>
                                                        <span className={`font-mono text-[11px] font-black shrink-0 ${
                                                            t.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                                                            t.progress > 0 ? 'text-blue-600 dark:text-blue-400' :
                                                            'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                            {t.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                t.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                                                t.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                                                t.progress > 0 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                                                'bg-slate-200 dark:bg-slate-800'
                                                            }`}
                                                            style={{ width: `${Math.min(Math.max(t.progress, 0), 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {teacherProgressList.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllTeachersProgress(prev => !prev)}
                                            className="w-full mt-3 py-1.5 px-3 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-blue-200 dark:border-blue-900/60"
                                        >
                                            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllTeachersProgress ? 'rotate-180' : ''}`} />
                                            {showAllTeachersProgress ? 'Show Minimal (5)' : `View All (${teacherProgressList.length})`}
                                        </button>
                                    )}
                                </div>

                                {/* Column 2: PROGRESS BY CLASS */}
                                <div className="p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-xs">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">PROGRESS BY CLASS</h4>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                                                {classProgressList.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {(showAllClassesProgress ? classProgressList : classProgressList.slice(0, 5)).map((c, idx) => (
                                                <div key={idx} className="group py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                                                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        <span className="truncate pr-2 font-bold max-w-[200px]" title={c.name}>{c.name}</span>
                                                        <span className={`font-mono text-[11px] font-black shrink-0 ${
                                                            c.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                                                            c.progress > 0 ? 'text-blue-600 dark:text-blue-400' :
                                                            'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                            {c.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                c.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                                                c.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                                                c.progress > 0 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                                                'bg-slate-200 dark:bg-slate-800'
                                                            }`}
                                                            style={{ width: `${Math.min(Math.max(c.progress, 0), 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {classProgressList.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllClassesProgress(prev => !prev)}
                                            className="w-full mt-3 py-1.5 px-3 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-blue-200 dark:border-blue-900/60"
                                        >
                                            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllClassesProgress ? 'rotate-180' : ''}`} />
                                            {showAllClassesProgress ? 'Show Minimal (5)' : `View All (${classProgressList.length})`}
                                        </button>
                                    )}
                                </div>

                                {/* Column 3: PROGRESS BY SUBJECT */}
                                <div className="p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-xs">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">PROGRESS BY SUBJECT</h4>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                                                {subjectProgressList.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {(showAllSubjectsProgress ? subjectProgressList : subjectProgressList.slice(0, 5)).map((s, idx) => (
                                                <div key={idx} className="group py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                                                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        <span className="truncate pr-2 font-bold max-w-[200px]" title={s.name}>{s.name}</span>
                                                        <span className={`font-mono text-[11px] font-black shrink-0 ${
                                                            s.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                                                            s.progress > 0 ? 'text-blue-600 dark:text-blue-400' :
                                                            'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                            {s.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                s.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                                                s.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                                                s.progress > 0 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                                                'bg-slate-200 dark:bg-slate-800'
                                                            }`}
                                                            style={{ width: `${Math.min(Math.max(s.progress, 0), 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {subjectProgressList.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllSubjectsProgress(prev => !prev)}
                                            className="w-full mt-3 py-1.5 px-3 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-blue-200 dark:border-blue-900/60"
                                        >
                                            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllSubjectsProgress ? 'rotate-180' : ''}`} />
                                            {showAllSubjectsProgress ? 'Show Minimal (5)' : `View All (${subjectProgressList.length})`}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Subtabs & Marks Entry Progress Panel */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                                {/* Subtabs Bar */}
                                <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={() => setActiveSubTab('progress')}
                                        className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${activeSubTab === 'progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Marks Entry Progress
                                    </button>
                                    <button
                                        onClick={() => setActiveSubTab('irregularities')}
                                        className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${activeSubTab === 'irregularities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Irregularities / Missing
                                    </button>
                                    <button
                                        onClick={() => setActiveSubTab('history')}
                                        className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${activeSubTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Edit History
                                    </button>
                                </div>

                                {/* SUBTAB 1: MARKS ENTRY PROGRESS */}
                                {activeSubTab === 'progress' && (
                                    <div className="space-y-4">
                                        {/* Dashboard Grade Filter Pills — shows grades from THIS exam's classes */}
                                        {activeExamAvailableGrades.length > 1 && (
                                            <div className="flex items-center gap-2 flex-wrap pb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Filter Grades:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setDashboardGradeFilter('all')}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        dashboardGradeFilter === 'all'
                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    All Grades
                                                </button>
                                                {activeExamAvailableGrades.map((gName: string) => (
                                                    <button
                                                        key={gName}
                                                        type="button"
                                                        onClick={() => setDashboardGradeFilter(gName)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            dashboardGradeFilter === gName
                                                                ? 'bg-blue-600 text-white shadow-xs'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {gName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                                <thead className="bg-slate-700 text-white font-bold text-xs uppercase">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">Paper</th>
                                                        <th className="px-4 py-3 text-left">Subject Teacher</th>
                                                        <th className="px-4 py-3 text-center w-28">Enrollment</th>
                                                        <th className="px-6 py-3 text-left">Marks Entry Progress</th>
                                                        <th className="px-4 py-3 text-center w-32">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                    {displayClassPaperRows.map(cRow => {
                                                        const isExpanded = expandedClasses[cRow.classKey];
                                                        return (
                                                            <React.Fragment key={cRow.classKey}>
                                                                {/* Class Accordion Header Row */}
                                                                <tr className="bg-slate-100 dark:bg-slate-800/60 font-bold text-xs text-slate-900 dark:text-white">
                                                                    <td className="px-4 py-3 cursor-pointer flex items-center gap-2" onClick={() => setExpandedClasses(prev => ({ ...prev, [cRow.classKey]: !prev[cRow.classKey] }))}>
                                                                        {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-slate-500" /> : <ChevronRightIcon className="w-4 h-4 text-slate-500" />}
                                                                        <span>{cRow.className}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3"></td>
                                                                    <td className="px-4 py-3 text-center font-bold">{cRow.enrollment}</td>
                                                                    <td className="px-6 py-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cRow.overallProgress}% progress</span>
                                                                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${cRow.overallProgress}%` }}></div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const rawCls = cRow.rawClassName || cRow.className.replace(/\s+\d{4}$/, '').trim();
                                                                                const grade = extractGradeLabel(rawCls);
                                                                                if (grade) setSelectedGradeFilter(grade);
                                                                                setSelectedClassFilter(rawCls);
                                                                                setSelectedSubjectFilter('all');
                                                                                setIsBroadsheetModalOpen(true);
                                                                            }}
                                                                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                                        >
                                                                            View Broadsheet
                                                                        </button>
                                                                    </td>
                                                                </tr>

                                                                {/* Class Inner Paper Rows */}
                                                                {isExpanded && cRow.papers.map((p: any) => (
                                                                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs">
                                                                        <td className="px-4 py-3 pl-10 font-bold text-slate-800 dark:text-slate-200">{p.subject}</td>
                                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{p.teacher}</td>
                                                                        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{p.enrollment}</td>
                                                                        <td className="px-6 py-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12">{p.progress}%</span>
                                                                                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.progress}%` }}></div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const rawCls = cRow.rawClassName || cRow.className.replace(/\s+\d{4}$/, '').trim();
                                                                                    const grade = extractGradeLabel(rawCls);
                                                                                    if (grade) setSelectedGradeFilter(grade);
                                                                                    setSelectedClassFilter(rawCls);
                                                                                    setSelectedSubjectFilter(p.subject);
                                                                                    setIsBroadsheetModalOpen(true);
                                                                                }}
                                                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/50 transition-all shadow-2xs active:scale-95 cursor-pointer"
                                                                                title={`Edit and view marks for ${p.subject}`}
                                                                            >
                                                                                <PencilIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                                                <span>Edit Marks</span>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* SUBTAB 2: EXAM IRREGULARITIES */}
                                {activeSubTab === 'irregularities' && (
                                    <div className="space-y-4 py-6 text-center text-slate-400">
                                        <SparklesIcon className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider">No exam irregularities or malpractice cases reported for {activeExam?.name || 'this exam'}.</p>
                                    </div>
                                )}

                                {/* SUBTAB 3: EDIT HISTORY */}
                                {activeSubTab === 'history' && (
                                    <div className="space-y-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                                            <span>Created assessment `{activeExam?.name || 'Exam'}`</span>
                                            <span className="text-slate-400">Today at 08:30 AM</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                                            <span>Marks updated for English (Form 3 Central) by Mdm. Faith Kanguha</span>
                                            <span className="text-slate-400">Today at 10:15 AM</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL 1: CREATE / EDIT EXAM UNIT (ISOLATED TO PREVENT LAG) */}
            <AddEditExamModal
                isOpen={isAddExamModalOpen}
                isEditing={isEditingExam}
                activeExam={activeExam}
                initialClasses={initialModalClasses}
                registeredClasses={registeredClasses}
                availableGrades={availableGrades}
                allRealStudents={allRealStudents}
                extractGradeLabel={extractGradeLabel}
                testedPaperConfigs={testedPaperConfigs}
                setTestedPaperConfigs={setTestedPaperConfigs}
                onOpenPapersModal={handleOpenPapersModal}
                onOpenStudentPicker={handleOpenStudentPicker}
                handleImportEnrolledSubjects={handleImportEnrolledSubjects}
                saveToastMessage={saveToastMessage}
                setSaveToastMessage={setSaveToastMessage}
                onClose={handleCloseAddExamModal}
                onSave={handleCreateExam}
            />

            {/* MODAL 2: PAPERS TO TEST & MAX SCORE CONVERSION CONFIGURATION */}
            {isPapersModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in my-auto flex flex-col max-h-[92vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase">Papers to Test & Max Input Score</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    Target Classes: <span className="font-bold text-blue-600 dark:text-blue-400">{(isAddExamModalOpen ? selectedClasses : (activeExam?.classes && activeExam.classes.length > 0 ? activeExam.classes : [selectedClassFilter])).join(', ') || 'All Sitting Classes'}</span> • Papers strictly match registered subjects.
                                </p>
                            </div>
                            <button onClick={() => setIsPapersModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-72 overflow-y-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Subject</th>
                                            <th className="px-4 py-3 text-left">Paper Component</th>
                                            <th className="px-4 py-3 text-center w-32">Max Input Score</th>
                                            <th className="px-4 py-3 text-center w-36">Convert to 100%</th>
                                            <th className="px-4 py-3 text-center w-16">Tested</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {deduplicatePapers(testedPaperConfigs).map(tp => (
                                            <tr key={tp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{tp.subject}</td>
                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium">{tp.paperName}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={tp.maxInputScore}
                                                            disabled={!tp.enabled}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setTestedPaperConfigs(prev => prev.map(item => (item.id === tp.id || (item.subject.toLowerCase().trim() === tp.subject.toLowerCase().trim() && (item.paperName || 'Paper 1').toLowerCase().trim() === (tp.paperName || 'Paper 1').toLowerCase().trim())) ? { ...item, maxInputScore: val } : item));
                                                            }}
                                                            className="w-16 h-7 px-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold">pts</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={tp.convertToHundred}
                                                            disabled={!tp.enabled}
                                                            onChange={e => {
                                                                setTestedPaperConfigs(prev => prev.map(item => (item.id === tp.id || (item.subject.toLowerCase().trim() === tp.subject.toLowerCase().trim() && (item.paperName || 'Paper 1').toLowerCase().trim() === (tp.paperName || 'Paper 1').toLowerCase().trim())) ? { ...item, convertToHundred: e.target.checked } : item));
                                                            }}
                                                            className="text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                                        />
                                                        <span>&rarr; 100%</span>
                                                    </label>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={tp.enabled}
                                                        onChange={e => {
                                                            setTestedPaperConfigs(prev => prev.map(item => (item.id === tp.id || (item.subject.toLowerCase().trim() === tp.subject.toLowerCase().trim() && (item.paperName || 'Paper 1').toLowerCase().trim() === (tp.paperName || 'Paper 1').toLowerCase().trim())) ? { ...item, enabled: e.target.checked } : item));
                                                        }}
                                                        className="text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quick Add Custom Paper Component & Import Enrolled Subjects */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleImportEnrolledSubjects}
                                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded transition-all flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" /> Use Enrolled Subjects
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const subName = prompt('Enter Subject Name (e.g. Computer Studies):', 'Computer Studies');
                                            if (!subName) return;
                                            const pName = prompt('Enter Paper Name (e.g. Paper 1 Practical):', 'Paper 1');
                                            if (!pName) return;
                                            const maxScore = parseInt(prompt('Enter Max Raw Input Score (e.g. 50):', '50') || '50') || 50;

                                            setTestedPaperConfigs(prev => deduplicatePapers([
                                                ...prev,
                                                { id: `tp_${Date.now()}`, subject: subName, paperName: pName, maxInputScore: maxScore, convertToHundred: true, enabled: true }
                                            ]));
                                        }}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" /> Add Custom Paper Component
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const cleanPapers = deduplicatePapers(testedPaperConfigs);
                                        setTestedPaperConfigs(cleanPapers);
                                        const activeCount = cleanPapers.filter(p => p.enabled).length;

                                        // 1. LocalStorage global and per-exam
                                        try {
                                            localStorage.setItem(`eduai_tested_papers_${instId}`, JSON.stringify(cleanPapers));
                                            if (activeExam?.id) {
                                                localStorage.setItem(`eduai_tested_papers_${instId}_${activeExam.id}`, JSON.stringify(cleanPapers));
                                            }
                                        } catch (e) { }

                                        // 2. Persist to activeExam and exams state if activeExam exists
                                        if (activeExam?.id) {
                                            const updatedExamRecord: ExamUnitRecord = {
                                                ...activeExam,
                                                testedPaperConfigs: cleanPapers,
                                                missingMarks: (activeExam.studentsEnrolled || 0) * (activeCount || 1)
                                            };

                                            setExams(prev => {
                                                const next = prev.map(e => e.id === activeExam.id ? updatedExamRecord : e);
                                                try {
                                                    localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(next));
                                                } catch (err) { }
                                                syncExamsToCloud(next);
                                                return next;
                                            });

                                            if (currentInstitution?.id) {
                                                apiService.saveModuleRecord('exam_units', updatedExamRecord).catch(() => {});
                                                apiService.saveModuleRecord('tested_paper_configs', {
                                                    id: `tpc_${activeExam.id}`,
                                                    institution_id: currentInstitution.id,
                                                    exam_id: activeExam.id,
                                                    papers: cleanPapers,
                                                    updated_at: new Date().toISOString()
                                                }).catch(() => {});
                                            }
                                        }

                                        // 3. User feedback toast
                                        setSaveToastMessage(`✨ Saved papers configuration (${activeCount} active paper${activeCount === 1 ? '' : 's'}).`);
                                        setTimeout(() => setSaveToastMessage(null), 4000);

                                        // 4. Close modal
                                        setIsPapersModalOpen(false);
                                    }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-md transition-all cursor-pointer"
                                >
                                    Save Papers Configuration ({deduplicatePapers(testedPaperConfigs).filter(p => p.enabled).length} Active)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL 3: MARKS ENTRY & BROADSHEET SPREADSHEET */}
            {isBroadsheetModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-7xl w-full max-h-[95vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in flex flex-col my-auto">

                        {/* Toast Alert */}
                        {saveToastMessage && (
                            <div className="bg-emerald-600 text-white px-6 py-3 font-bold text-xs flex justify-between items-center animate-in slide-in-from-top-2">
                                <span>{saveToastMessage}</span>
                                <button type="button" onClick={() => setSaveToastMessage(null)} className="hover:opacity-80">✕</button>
                            </div>
                        )}

                        {/* Title Bar & Subject Filter Selector */}
                        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                                        {selectedSubjectFilter === 'all' ? '📊 Exam Broadsheet Overview' : `📝 Editable Marks Entry: ${selectedSubjectFilter}`}
                                    </h3>
                                    {selectedGradeFilter && selectedGradeFilter !== 'all' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            {selectedGradeFilter}
                                        </span>
                                    )}
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        {selectedClassFilter === 'all'
                                            ? (selectedGradeFilter !== 'all' ? `All ${selectedGradeFilter} Streams` : 'All Streams')
                                            : (extractStreamOnly(selectedClassFilter, selectedGradeFilter !== 'all' ? selectedGradeFilter : undefined) || selectedClassFilter)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {selectedSubjectFilter === 'all'
                                        ? `Viewing full multi-subject broadsheet for ${activeExam?.name || 'this exam'}. Select a subject from the list or dropdown below to enter & edit raw marks.`
                                        : `Type or edit raw marks for ${selectedSubjectFilter} below. Total raw scores and grades calculate live automatically.`}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Student Search Box */}
                                <div className="relative flex items-center">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchStudentQuery}
                                        onChange={(e) => setSearchStudentQuery(e.target.value)}
                                        placeholder="Search student by name or adm..."
                                        className="pl-9 pr-7 py-1.5 w-60 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
                                    />
                                    {searchStudentQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchStudentQuery('')}
                                            className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Grade Selector Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grades:</span>
                                    <select
                                        value={selectedGradeFilter}
                                        onChange={(e) => {
                                            const newG = e.target.value;
                                            setSelectedGradeFilter(newG);
                                            setSelectedClassFilter('all');
                                        }}
                                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">All Grades</option>
                                        {availableGrades.map((gName: string) => (
                                            <option key={gName} value={gName}>{gName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Class/Stream Selector Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Streams:</span>
                                    <select
                                        value={selectedClassFilter}
                                        onChange={(e) => {
                                            const newCls = e.target.value;
                                            setSelectedClassFilter(newCls);
                                            if (newCls !== 'all') {
                                                const g = extractGradeLabel(newCls);
                                                if (g && (!selectedGradeFilter || selectedGradeFilter === 'all')) {
                                                    setSelectedGradeFilter(g);
                                                }
                                            }
                                        }}
                                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">
                                            {selectedGradeFilter !== 'all' ? `All ${selectedGradeFilter} Streams` : 'All Streams'}
                                        </option>
                                        {modalAvailableClasses
                                            .filter(cName => {
                                                const hasStreams = modalAvailableClasses.some(c => !!extractStreamOnly(c, selectedGradeFilter !== 'all' ? selectedGradeFilter : undefined));
                                                if (hasStreams) {
                                                    return !!extractStreamOnly(cName, selectedGradeFilter !== 'all' ? selectedGradeFilter : undefined);
                                                }
                                                return true;
                                            })
                                            .map(cName => {
                                                const streamOnly = extractStreamOnly(cName, selectedGradeFilter !== 'all' ? selectedGradeFilter : undefined);
                                                return (
                                                    <option key={cName} value={cName}>
                                                        {streamOnly || cName}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                </div>

                                {/* Subject Selector Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject:</span>
                                    <select
                                        value={selectedSubjectFilter}
                                        onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">All Subjects (Full Broadsheet)</option>
                                        {modalAvailableSubjects.map(subName => (
                                            <option key={subName} value={subName}>{subName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort Selector Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort:</span>
                                    <select
                                        value={`${sortField}_${sortOrder}`}
                                        onChange={(e) => {
                                            const parts = e.target.value.split('_');
                                            setSortField(parts[0] as 'admNo' | 'name');
                                            setSortOrder(parts[1] as 'asc' | 'desc');
                                        }}
                                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="name_asc">Name (A → Z)</option>
                                        <option value="name_desc">Name (Z → A)</option>
                                        <option value="admNo_asc">Adm No (Ascending 1-9)</option>
                                        <option value="admNo_desc">Adm No (Descending 9-1)</option>
                                    </select>
                                </div>

                                {/* Export & Import Controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleExportBroadsheetCSV}
                                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                        title="Export broadsheet & student marks to CSV / Excel spreadsheet"
                                    >
                                        <DownloadIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Export CSV</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadImportTemplate}
                                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                        title="Download sample CSV template pre-filled with class student list"
                                    >
                                        <DocumentTextIcon className="w-4 h-4 text-slate-500" />
                                        <span>Template</span>
                                    </button>

                                    <div className={`relative px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm overflow-hidden ${
                                        activeExam?.status === 'published' ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                                    }`}>
                                        <UploadIcon className="w-4 h-4 pointer-events-none" />
                                        <span className="pointer-events-none">Import CSV</span>
                                        <input
                                            type="file"
                                            accept=".csv,.txt"
                                            disabled={activeExam?.status === 'published'}
                                            onChange={handleImportMarksCSV}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Import CSV"
                                        />
                                    </div>
                                </div>

                                {selectedSubjectFilter !== 'all' && (
                                    <button
                                        type="button"
                                        disabled={isSavingMarks || activeExam?.status === 'published'}
                                        onClick={() => handleSaveSubjectMarks(selectedSubjectFilter)}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                            unsavedStudentAdms.size > 0
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                    >
                                        {isSavingMarks ? '⏳ Saving...' : unsavedStudentAdms.size > 0 ? `💾 Save ${unsavedStudentAdms.size} Changes` : `✓ ${selectedSubjectFilter} Saved`}
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsBroadsheetModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                                >
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div ref={broadsheetModalBodyRef} className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto">
                            {/* Read-Only Published Banner */}
                            {activeExam?.status === 'published' && (
                                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-sm">
                                    <span className="flex items-center gap-2">
                                        <LockClosedIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        <span><strong>Exam is Published (Read-Only):</strong> Marks and parameters are locked to preserve official results integrity. Click &quot;Unpublish Exam&quot; to make modifications.</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsBroadsheetModalOpen(false);
                                            handleTogglePublish();
                                        }}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex-shrink-0"
                                    >
                                        Unpublish Exam
                                    </button>
                                </div>
                            )}

                            {/* Subject-teacher stream restriction banner */}
                            {teacherSubjectClassMap !== null && (() => {
                                const subKey = selectedSubjectFilter && selectedSubjectFilter !== 'all'
                                    ? Object.keys(teacherSubjectClassMap).find(k => k === selectedSubjectFilter.toLowerCase() || k.includes(selectedSubjectFilter.toLowerCase()) || selectedSubjectFilter.toLowerCase().includes(k))
                                    : null;
                                const visibleClasses = subKey
                                    ? (teacherSubjectClassMap[subKey] || [])
                                    : Object.values(teacherSubjectClassMap).flat();
                                const uniqueClasses = [...new Set(visibleClasses)];
                                if (uniqueClasses.length === 0) {
                                    return (
                                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                                            <span>⚠️</span>
                                            <span>You have not been assigned to any class stream yet. Contact your administrator to set up your subject allocations.</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex flex-wrap items-center gap-2 text-[11px] font-bold text-blue-800 dark:text-blue-300">
                                        <span className="text-blue-500">📌 Your access is restricted to:</span>
                                        {uniqueClasses.map((cls, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-md capitalize">{cls}</span>
                                        ))}
                                        {selectedSubjectFilter && selectedSubjectFilter !== 'all' && (
                                            <span className="ml-1 text-blue-400 font-normal">(for {selectedSubjectFilter})</span>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* SINGLE SUBJECT EDITABLE MODE */}
                            {selectedSubjectFilter !== 'all' ? (
                                <div className="space-y-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                <PencilIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                                                    <span>⚡ Fast Marks Entry: {selectedSubjectFilter}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold">
                                                        Excel Capture Mode
                                                    </span>
                                                </h4>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                    Rapid raw score capture. Enter marks below and click <b>Save Marks</b>. Converted grades, percentages, and rankings are computed when published.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSubjectFilter('all')}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                                        >
                                            View Full Broadsheet
                                        </button>
                                    </div>

                                    {/* Editable Subject Grid */}
                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-96 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-left w-24">Adm No</th>
                                                    <th className="px-4 py-3 text-left">Student Name</th>

                                                    {/* Dynamic Paper Header Columns */}
                                                    {singleSubjectPapers.map((paper: any, pIdx: number) => (
                                                        <th key={pIdx} className="px-4 py-3 text-center bg-indigo-900/90 text-indigo-100 border-x border-indigo-800">
                                                            {paper.label} <span className="text-[10px] text-amber-300 font-bold">(/ {paper.maxScore})</span>
                                                        </th>
                                                    ))}

                                                    <th className="px-4 py-3 text-center bg-slate-800">Raw Score Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                                                {filteredStudentRows.map((st, stIndex) => (
                                                    <StudentSubjectRow
                                                        key={st.admNo || `st-${stIndex}`}
                                                        st={st}
                                                        stIndex={stIndex}
                                                        singleSubjectPapers={singleSubjectPapers}
                                                        singleSubjectMaxTotal={singleSubjectMaxTotal}
                                                        selectedSubjectFilter={selectedSubjectFilter}
                                                        selectedClassFilter={selectedClassFilter}
                                                        activeExamClasses={activeExamClasses}
                                                        isPublished={activeExam?.status === 'published'}
                                                        isUnsaved={unsavedStudentAdms.has(st.admNo)}
                                                        getStudentPaperMark={getStudentPaperMark}
                                                        onUpdateMark={handleUpdateStudentMark}
                                                    />
                                                ))}
                                                {filteredStudentRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={singleSubjectPapers.length + 3} className="px-6 py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                            🔍 No students match "{searchStudentQuery}"
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs font-bold">
                                        <span className="text-slate-600 dark:text-slate-300 px-2">Display Format:</span>
                                        <div className="flex items-center gap-2">
                                            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg transition-all ${marksDisplayMode === 'raw' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <input type="radio" name="displayMode" checked={marksDisplayMode === 'raw'} onChange={() => setMarksDisplayMode('raw')} className="text-blue-600 focus:ring-blue-500" />
                                                <span>Raw Format (e.g. 24/30)</span>
                                            </label>
                                            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg transition-all ${marksDisplayMode === 'converted' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <input type="radio" name="displayMode" checked={marksDisplayMode === 'converted'} onChange={() => setMarksDisplayMode('converted')} className="text-blue-600 focus:ring-blue-500" />
                                                <span>Converted %</span>
                                            </label>
                                            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg transition-all ${marksDisplayMode === 'dual' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <input type="radio" name="displayMode" checked={marksDisplayMode === 'dual'} onChange={() => setMarksDisplayMode('dual')} className="text-blue-600 focus:ring-blue-500" />
                                                <span>Dual View</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-96 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-left w-20">Adm No</th>
                                                    <th className="px-4 py-3 text-left">Student Name</th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>MATH P1 (/30)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('MATHS')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>MATH P2 (/70)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('MATHS')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>ENG P1 (/60)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('English')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>ENG P2 (/80)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('English')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>KISW INSHA (/40)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('Kiswahili')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-4 py-3 text-center">Total Raw</th>
                                                    <th className="px-4 py-3 text-center">Converted %</th>
                                                    <th className="px-4 py-3 text-center">Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                                                {filteredStudentRows.map((st) => {
                                                    const rawTotal = allAvailableSubjectsPapers.reduce((sum, sp) => {
                                                        const markInfo = getStudentPaperMark(st, sp.key, undefined, sp.label);
                                                        const val = (st as any)[sp.key] !== undefined ? (st as any)[sp.key] : (markInfo.hasMark ? markInfo.val : 0);
                                                        return sum + (Number(val) || 0);
                                                    }, 0);
                                                    const convertedPct = allAvailableSubjectsMaxTotal > 0 ? ((rawTotal / allAvailableSubjectsMaxTotal) * 100).toFixed(1) : '0.0';
                                                    const pctNum = parseFloat(convertedPct);
                                                    const grade = pctNum >= 80 ? 'A' : pctNum >= 75 ? 'A-' : pctNum >= 70 ? 'B+' : pctNum >= 65 ? 'B' : pctNum >= 50 ? 'C+' : 'C';

                                                    return (
                                                        <tr key={st.admNo} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{st.admNo}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{st.name}</td>

                                                            {allAvailableSubjectsPapers.map((sp, pIdx) => {
                                                                const markInfo = getStudentPaperMark(st, sp.key, undefined, sp.label);
                                                                const val = (st as any)[sp.key] !== undefined ? (st as any)[sp.key] : (markInfo.hasMark ? markInfo.val : 0);
                                                                return (
                                                                    <td key={pIdx} className="px-3 py-2 text-center bg-slate-50/40 dark:bg-slate-900/40 font-mono font-bold">
                                                                        {val} <span className="text-[10px] text-slate-400 font-normal">/ {sp.maxScore}</span>
                                                                    </td>
                                                                );
                                                            })}

                                                            <td className="px-4 py-3 text-center font-mono font-black text-slate-900 dark:text-white">{rawTotal} / {allAvailableSubjectsMaxTotal}</td>
                                                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600">{convertedPct}%</td>
                                                            <td className="px-4 py-3 text-center font-black text-indigo-600">{grade}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredStudentRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                            🔍 No students match "{searchStudentQuery}"
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">
                                {filteredStudentRows.length} Students listed {searchStudentQuery ? `(Filtered from ${broadsheetStudentRows.length})` : ''} • Real-time database sync enabled
                            </span>
                            <div className="flex items-center gap-3">
                                {selectedSubjectFilter !== 'all' && (
                                    <button
                                        type="button"
                                        disabled={isSavingMarks || activeExam?.status === 'published'}
                                        onClick={() => handleSaveSubjectMarks(selectedSubjectFilter)}
                                        className={`px-5 py-2 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                                            unsavedStudentAdms.size > 0
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                    >
                                        {isSavingMarks ? 'Saving...' : unsavedStudentAdms.size > 0 ? `💾 Save ${unsavedStudentAdms.size} Changes` : `✓ ${selectedSubjectFilter} Saved`}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsBroadsheetModalOpen(false)}
                                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                                >
                                    Close Window
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL 3: CHOOSE FROM STUDENTS */}
            {isStudentPickerModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in my-auto">
                        
                        {/* Header matching exact screenshot styling */}
                        <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Choose from students</h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsStudentPickerModalOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto">
                            {/* Academic Year Filter Bar */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Academic year:</span>
                                <div className="flex-1 max-w-xs">
                                    <select
                                        value={studentPickerYear}
                                        onChange={(e) => setStudentPickerYear(e.target.value)}
                                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                        <option value="2023">2023</option>
                                    </select>
                                </div>
                            </div>

                            {/* Subtabs & Search Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setStudentPickerTab('all_classes')}
                                        className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            studentPickerTab === 'all_classes'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        All Classes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentPickerTab('all_students')}
                                        className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            studentPickerTab === 'all_students'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        All Students
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentPickerTab('all_groups')}
                                        className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            studentPickerTab === 'all_groups'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        All Groups
                                    </button>
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        value={studentPickerSearch}
                                        onChange={(e) => setStudentPickerSearch(e.target.value)}
                                        placeholder="Search students"
                                        className="w-full h-9 pl-9 pr-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                    />
                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                </div>
                            </div>

                            {/* Student Data Table */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 max-h-80 overflow-y-auto shadow-xs">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const allIds = displayStudentsList.map(s => s.id);
                                                            setSelectedStudentIds(allIds);
                                                            const allCls = Array.from(new Set(displayStudentsList.map(s => s.class)));
                                                            setSelectedClasses(prev => Array.from(new Set([...prev, ...allCls])));
                                                        } else {
                                                            setSelectedStudentIds([]);
                                                        }
                                                    }}
                                                    checked={displayStudentsList.length > 0 && selectedStudentIds.length >= displayStudentsList.length}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left w-24">Id</th>
                                            <th className="px-4 py-3 text-left">Name</th>
                                            <th className="px-4 py-3 text-left">Class</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {filteredPickerStudents.map((st) => {
                                            const isChecked = selectedStudentIds.includes(st.id);
                                            return (
                                                <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudentIds(prev => [...prev, st.id]);
                                                                    if (st.class && !selectedClasses.includes(st.class)) {
                                                                        setSelectedClasses(prev => [...prev, st.class]);
                                                                    }
                                                                } else {
                                                                    setSelectedStudentIds(prev => prev.filter(id => id !== st.id));
                                                                }
                                                            }}
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{st.admNo}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{st.name}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">{st.class}</td>
                                                </tr>
                                            );
                                        })}
                                        {filteredPickerStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                                                    No students found matching query.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">
                                {selectedStudentIds.length} student(s) selected
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsStudentPickerModalOpen(false)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                CLASS CHANGE WARNING DIALOG
                Fires when exam classes are changed while marks have been entered.
            ═══════════════════════════════════════════════════════════════════════ */}
            {classChangeWarning && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[10001] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-amber-300 dark:border-amber-700 overflow-hidden">
                        {/* Warning Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-start gap-3">
                            <span className="text-3xl mt-0.5">⚠️</span>
                            <div>
                                <h3 className="text-white font-black text-lg leading-tight">Class Change Detected</h3>
                                <p className="text-amber-100 text-xs font-medium mt-0.5">Marks have already been entered for this exam</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-3">
                                    <strong>{classChangeWarning.rowCount} student mark records</strong> were found for:
                                </p>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {classChangeWarning.oldClasses.map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md text-xs font-bold">{c}</span>
                                    ))}
                                </div>
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">You are changing to:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {classChangeWarning.newClasses.map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-bold">{c}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">🔒 Marks Auto-Archived</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    A backup of all entered marks has been automatically saved under the old class configuration.
                                    You can restore them anytime via the <strong>Restore Backup</strong> button inside the broadsheet.
                                </p>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                Do you want to proceed with changing the class? The broadsheet will reset for the new class roster.
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setClassChangeWarning(null)}
                                className="px-5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                            >
                                Cancel — Keep Old Classes
                            </button>
                            <button
                                type="button"
                                onClick={() => classChangeWarning.proceed()}
                                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
                            >
                                ✅ Proceed — Change Class
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MARKS BACKUP RESTORE PANEL
                Lists all archived snapshots so user can restore any past version.
            ═══════════════════════════════════════════════════════════════════════ */}
            {isBackupPanelOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🗂️</span>
                                <div>
                                    <h3 className="text-white font-black text-base">Marks Backup History</h3>
                                    <p className="text-slate-400 text-xs font-medium">{activeExam?.name || 'Current Exam'}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBackupPanelOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                            {(() => {
                                const snapshots = listSnapshots(selectedExamId);
                                if (snapshots.length === 0) {
                                    return (
                                        <div className="text-center py-12">
                                            <span className="text-5xl block mb-3">📭</span>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No backups found for this exam.</p>
                                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Backups are created automatically each time you save marks.</p>
                                        </div>
                                    );
                                }
                                return [...snapshots].reverse().map((snap, i) => (
                                    <div
                                        key={snap.key}
                                        className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {snap.classes.map(c => (
                                                    <span key={c} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">{c}</span>
                                                ))}
                                                {i === 0 && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">Latest</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {snap.rowCount} students &bull; {snap.savedAt ? new Date(snap.savedAt).toLocaleString() : 'Unknown time'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`Restore ${snap.rowCount} student marks from this backup (${snap.classes.join(', ')})?\n\nThis will overwrite the current broadsheet.`)) {
                                                    restoreFromSnapshot(snap.key);
                                                }
                                            }}
                                            className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-all cursor-pointer active:scale-95 opacity-0 group-hover:opacity-100"
                                        >
                                            ↩ Restore
                                        </button>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] text-slate-400 font-medium text-center">
                                💡 Backups are stored locally in your browser. Clearing browser data will remove them.
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
