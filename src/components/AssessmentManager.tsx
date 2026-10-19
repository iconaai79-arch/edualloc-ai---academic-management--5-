import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { User, Assessment, AssessmentMark, Subject, Course } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { resolveRealStudentClass, naturalClassSort, extractClassAndStream, normalizeStreamName } from '../utils/academicUtils';
import { apiService, safeLocalStorage } from '../services/apiService';
import { 
    ChevronRight, ChevronDown, 
    Search, Sparkles, AlertCircle, Printer, Download,
    FileSpreadsheet, Edit3, Zap, ArrowDown, Users, Check, BookOpen, ArrowLeft
} from 'lucide-react';

interface AssessmentManagerProps {
    user: User;
    isDos?: boolean;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    allocatedSubjects: Subject[];
    allocatedGrades?: string[];
    subjectAllocations?: any[];
    currentInstitution?: any;
    users: User[];
    courses: Course[];
    enrollments?: any[];
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssessment: (assessmentId: string) => void;
    onSaveAssessmentMarks: (assessmentId: string, marksData: { studentId: string; marks: number | null; comments?: string }[]) => void;
    onUpdateAssessment?: (assessmentId: string, data: Partial<Assessment>) => void;
}

interface GradeGroup {
    gradeName: string;
    papers: Assessment[];
    enrollment: number;
    studentsInGrade: User[];
    overallProgressPct: number;
    totalGradedEntries: number;
    totalPossibleEntries: number;
}

interface BroadsheetStudentRow {
    student: User;
    paperScores: Record<string, number | null>;
    total: number;
    averagePct: number;
    gradedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS: STRICT GRADE & STREAM RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
const COMMON_STREAM_KEYWORDS = new Set([
    'east', 'west', 'north', 'south', 'central',
    'a', 'b', 'c', 'd', 'e', 'f',
    'red', 'blue', 'green', 'yellow', 'purple', 'white', 'gold',
    'stream a', 'stream b', 'stream c', 'stream east', 'stream west',
    'faith', 'peace', 'joy', 'hope', 'love'
]);

export const isPureStreamName = (str?: string): boolean => {
    if (!str) return false;
    const clean = str.trim().toLowerCase();
    return COMMON_STREAM_KEYWORDS.has(clean) || /^[a-z]$/i.test(clean);
};

export const isStudentUser = (u: any): boolean => {
    if (!u) return false;
    const r = (u.role || u.userType || u.type || '').toLowerCase().trim();
    const nonStudentRoles = [
        'teacher', 'lecturer', 'instructor', 'tutor', 'trainer',
        'admin', 'super_admin', 'superadmin', 'institution_admin', 'system_admin',
        'staff', 'support_staff', 'principal', 'deputy_principal', 'headmaster',
        'finance_officer', 'bursar', 'accountant', 'librarian', 'driver', 'parent', 'guardian'
    ];
    if (nonStudentRoles.includes(r)) return false;
    if (u.tscNumber || u.tsc_number || u.staffNumber || u.staff_number || u.employeeNumber || u.employee_number) return false;
    if (u.isTeacher || u.isStaff || (u as any).is_staff) return false;

    if (r === 'student' || r === 'learner' || r === 'pupil' || r === 'student_enrollment') return true;
    if (Array.isArray(u.roles) && u.roles.some((role: any) => ['student', 'learner', 'pupil'].includes(String(role).toLowerCase()))) return true;
    if (u.admissionNumber || u.admission_number || u.admNo || u.regNo || u.metadata?.admissionNumber) return true;
    if (u.enrollmentType === 'academic' || u.enrollmentType === 'driving_school') return true;
    return false;
};

export const getStudentGrade = (u: User, courses: Course[]): string => {
    // Check direct property first
    const directGrade = (u as any).gradeLevel || 
                        (u as any).grade || 
                        (u as any).academicLevel || 
                        (u as any).currentClass || 
                        (u as any).class || 
                        (u as any).className || 
                        (u as any).studentClass || 
                        (u as any).metadata?.gradeLevel || 
                        (u as any).metadata?.grade || 
                        (u as any).metadata?.currentClass || 
                        (u as any).metadata?.studentClass || 
                        (u as any).metadata?.className;
    if (directGrade && !isPureStreamName(directGrade)) {
        const parsed = extractClassAndStream(directGrade);
        if (parsed.className && !isPureStreamName(parsed.className)) return parsed.className;
    }

    const rawClass = resolveRealStudentClass(u, [], courses, '');
    if (isPureStreamName(rawClass)) {
        if (u.courseLevelId && courses && courses.length > 0) {
            for (const c of courses) {
                const lvl = (c.levels || []).find(l => l.id === u.courseLevelId);
                if (lvl && lvl.name && !isPureStreamName(lvl.name)) {
                    return extractClassAndStream(lvl.name).className || lvl.name;
                }
            }
        }
        return 'Unassigned Grade';
    }

    const parsed = extractClassAndStream(rawClass);
    if (parsed.className && parsed.className !== 'Unclassified' && parsed.className !== '—' && !isPureStreamName(parsed.className)) {
        return parsed.className;
    }

    const match = rawClass.match(/(?:Grade|Class|Form|Year|Standard|Std|CBC\s*Grade)\s*(\d+)/i);
    if (match) {
        const prefix = match[0].trim();
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    return rawClass && !isPureStreamName(rawClass) ? rawClass : 'Unassigned Grade';
};

export const getStudentStream = (u: User, courses: Course[]): string => {
    const directStream = (u as any).stream || 
                         (u as any).studentStream || 
                         (u as any).classStream || 
                         (u as any).streamName || 
                         (u as any).metadata?.stream || 
                         (u as any).metadata?.streamName || 
                         (u as any).metadata?.classStream;
    if (directStream) {
        return normalizeStreamName(directStream);
    }

    const rawClass = resolveRealStudentClass(u, [], courses, '');
    if (isPureStreamName(rawClass)) {
        return normalizeStreamName(rawClass);
    }

    const parsed = extractClassAndStream(rawClass);
    if (parsed.stream) {
        return normalizeStreamName(parsed.stream);
    }

    return '';
};

export const doesStudentMatchGrade = (u: User, targetGradeName: string, courses: Course[]): boolean => {
    if (!targetGradeName || targetGradeName === 'all') return true;
    const cleanTarget = targetGradeName.toLowerCase().trim();
    const canonicalTarget = extractClassAndStream(targetGradeName).className.toLowerCase().trim();
    const targetDigits = (targetGradeName.match(/\d+/) || [])[0];

    // 1. Direct getStudentGrade
    const stGrade = getStudentGrade(u, courses).toLowerCase().trim();
    const canonicalSt = extractClassAndStream(stGrade).className.toLowerCase().trim();
    if (stGrade === cleanTarget || canonicalSt === canonicalTarget) return true;
    if (cleanTarget.includes(stGrade) || stGrade.includes(cleanTarget)) return true;
    if (canonicalTarget && (canonicalSt.includes(canonicalTarget) || canonicalTarget.includes(canonicalSt))) return true;

    // 2. Direct user and enrollment properties
    const userProps = [
        (u as any).gradeLevel, (u as any).grade, (u as any).academicLevel,
        (u as any).currentClass, (u as any).class, (u as any).className,
        (u as any).form, (u as any).targetClass, (u as any).classLevel,
        (u as any).studentClass,
        (u as any).metadata?.gradeLevel,
        (u as any).metadata?.grade,
        (u as any).metadata?.currentClass,
        (u as any).metadata?.class,
        (u as any).metadata?.className,
        (u as any).metadata?.studentClass
    ].filter(Boolean).map(s => String(s).toLowerCase().trim());

    for (const prop of userProps) {
        if (prop === cleanTarget || prop === canonicalTarget) return true;
        const propCanonical = extractClassAndStream(prop).className.toLowerCase().trim();
        if (propCanonical === canonicalTarget || propCanonical === cleanTarget) return true;
        if (prop.includes(cleanTarget) || cleanTarget.includes(prop)) return true;
    }

    // 3. Course / Level matching
    if (u.courseLevelId && courses && courses.length > 0) {
        for (const c of courses) {
            const lvl = (c.levels || []).find(l => l.id === u.courseLevelId);
            if (lvl && lvl.name) {
                const lName = lvl.name.toLowerCase().trim();
                const lCanonical = extractClassAndStream(lvl.name).className.toLowerCase().trim();
                if (lName === cleanTarget || lCanonical === canonicalTarget || lName.includes(cleanTarget) || cleanTarget.includes(lName)) {
                    return true;
                }
            }
        }
    }

    // 4. Digit check if grade has digits (e.g. "7", "8", "9")
    if (targetDigits) {
        const stDigits = (stGrade.match(/\d+/) || [])[0];
        if (stDigits && stDigits === targetDigits) return true;
        for (const prop of userProps) {
            const pDigits = (prop.match(/\d+/) || [])[0];
            if (pDigits && pDigits === targetDigits) return true;
        }
    }

    return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW ASSESSMENT FORM (FOR ADMIN / DOS)
// ─────────────────────────────────────────────────────────────────────────────
const NewAssessmentForm: React.FC<{
    user: User;
    allocatedSubjects: Subject[];
    availableGrades: string[];
    getEnrollmentForGrade: (g: string, s?: string) => number;
    initialGrade?: string;
    initialSubject?: string;
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onCancel: () => void;
}> = ({ user, allocatedSubjects, availableGrades, getEnrollmentForGrade, initialGrade, initialSubject, onAddAssessment, onCancel }) => {
    const [title, setTitle] = useState('');
    const [subjectId, setSubjectId] = useState(initialSubject && initialSubject !== 'all' ? initialSubject : (allocatedSubjects[0]?.id || ''));
    const [targetGrade, setTargetGrade] = useState(initialGrade && initialGrade !== 'all' ? initialGrade : (availableGrades[0] || 'all'));
    const [type, setType] = useState<string>('End Term');
    const [description, setDescription] = useState('');
    const [maxMarks, setMaxMarks] = useState<number | ''>(100);
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);

    const liveEnrollment = useMemo(() => getEnrollmentForGrade(targetGrade), [targetGrade, getEnrollmentForGrade]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !subjectId || !maxMarks || !assessmentDate) {
            alert('Please fill in all required fields (Subject, Title, Max Marks, Date).');
            return;
        }
        onAddAssessment({
            lecturerId: user.id,
            title: title.trim(),
            subjectId,
            type: type as any,
            description: description.trim(),
            maxMarks: Number(maxMarks),
            assessmentDate,
            status: 'Published' as any,
            ...(targetGrade !== 'all' ? { grade: targetGrade, className: targetGrade, targetClass: targetGrade } : {})
        } as any);
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-850 dark:to-slate-900 p-6 rounded-3xl border border-indigo-100 dark:border-slate-700/80 shadow-md space-y-5 my-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-indigo-100/60 dark:border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Create School Assessment / Exam Paper</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure exam papers for assigned subject teachers to enter raw marks</p>
                    </div>
                </div>
                <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Subject *</label>
                    <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="form-select text-xs">
                        {allocatedSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Target Grade / Class Level *</label>
                    <select value={targetGrade} onChange={e => setTargetGrade(e.target.value)} className="form-select text-xs font-semibold">
                        <option value="all">All School Grades ({getEnrollmentForGrade('all')} total learners)</option>
                        {availableGrades.map(g => (
                            <option key={g} value={g}>
                                {g} ({getEnrollmentForGrade(g)} enrolled learners)
                            </option>
                        ))}
                    </select>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                        <Users className="w-3.5 h-3.5" />
                        <span>Actual Enrollment: <strong>{liveEnrollment} learners</strong> will be registered for this exam</span>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Assessment / Exam Title *</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="form-input text-xs" placeholder="e.g., Term 1 Mid-Term Exam, End of Term Summative Test, CAT 1" />
                </div>

                <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Assessment Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} required className="form-select text-xs capitalize">
                        <option value="Mid Term">Mid Term Exam</option>
                        <option value="End Term">End Term Exam</option>
                        <option value="CAT">Continuous Assessment Test (CAT)</option>
                        <option value="formative">Formative Assessment</option>
                        <option value="summative">Summative Assessment</option>
                        <option value="CBC">CBC Strand Assessment</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Max Marks *</label>
                        <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value === '' ? '' : parseInt(e.target.value, 10))} required min="1" className="form-input text-xs font-bold" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Exam Date *</label>
                        <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} required className="form-input text-xs" />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Description / Syllabus Coverage (Optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="form-input text-xs" placeholder="e.g., Covers curriculum syllabus content..."></textarea>
                </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all">Create Assessment</button>
            </div>
        </form>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ASSESSMENT MODAL
// ─────────────────────────────────────────────────────────────────────────────
const EditAssessmentModal: React.FC<{
    assessment: Assessment;
    allocatedSubjects: Subject[];
    availableGrades: string[];
    getEnrollmentForGrade: (g: string, s?: string) => number;
    onSave: (updated: Assessment) => Promise<void>;
    onCancel: () => void;
}> = ({ assessment, allocatedSubjects, availableGrades, getEnrollmentForGrade, onSave, onCancel }) => {
    const [title, setTitle] = useState(assessment.title);
    const [subjectId, setSubjectId] = useState(assessment.subjectId);
    const [targetGrade, setTargetGrade] = useState(assessment.grade || assessment.className || assessment.targetClass || 'all');
    const [type, setType] = useState<string>(assessment.type || 'End Term');
    const [maxMarks, setMaxMarks] = useState<number | ''>(assessment.maxMarks || 100);
    const [assessmentDate, setAssessmentDate] = useState(assessment.assessmentDate ? assessment.assessmentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(assessment.description || '');
    const [isSaving, setIsSaving] = useState(false);

    const liveEnrollment = useMemo(() => getEnrollmentForGrade(targetGrade), [targetGrade, getEnrollmentForGrade]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !subjectId || !maxMarks || !assessmentDate) {
            alert('Please fill in all required fields (Subject, Title, Max Marks, Date).');
            return;
        }
        setIsSaving(true);
        try {
            const updated: Assessment = {
                ...assessment,
                title: title.trim(),
                subjectId,
                type: type as any,
                maxMarks: Number(maxMarks),
                assessmentDate,
                description: description.trim(),
                grade: targetGrade !== 'all' ? targetGrade : undefined,
                className: targetGrade !== 'all' ? targetGrade : undefined,
                targetClass: targetGrade !== 'all' ? targetGrade : undefined
            };
            await onSave(updated);
            onCancel();
        } catch (err: any) {
            alert('Failed to save assessment changes: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                            <Edit3 className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Edit Examination Paper Details</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update paper title, grade level, and max marks</p>
                        </div>
                    </div>
                    <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Subject *</label>
                            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="form-select text-xs">
                                {allocatedSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Target Grade / Class Level *</label>
                            <select value={targetGrade} onChange={e => setTargetGrade(e.target.value)} className="form-select text-xs font-semibold">
                                <option value="all">All School Grades ({getEnrollmentForGrade('all')} total learners)</option>
                                {availableGrades.map(g => (
                                    <option key={g} value={g}>
                                        {g} ({getEnrollmentForGrade(g)} enrolled learners)
                                    </option>
                                ))}
                            </select>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                <Users className="w-3 h-3" />
                                <span>Enrollment: <strong>{liveEnrollment} learners</strong></span>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Assessment / Exam Title *</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="form-input text-xs" />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Assessment Type</label>
                            <select value={type} onChange={e => setType(e.target.value)} required className="form-select text-xs capitalize">
                                <option value="Mid Term">Mid Term Exam</option>
                                <option value="End Term">End Term Exam</option>
                                <option value="CAT">Continuous Assessment Test (CAT)</option>
                                <option value="formative">Formative Assessment</option>
                                <option value="summative">Summative Assessment</option>
                                <option value="CBC">CBC Strand Assessment</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Max Marks *</label>
                                <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value === '' ? '' : parseInt(e.target.value, 10))} required min="1" className="form-input text-xs font-bold" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Exam Date *</label>
                                <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} required className="form-input text-xs" />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Description / Coverage</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="form-input text-xs"></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ASSESSMENT MANAGER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const AssessmentManager: React.FC<AssessmentManagerProps> = ({
    user,
    isDos = false,
    assessments,
    assessmentMarks,
    allocatedSubjects,
    allocatedGrades = [],
    subjectAllocations = [],
    currentInstitution,
    users = [],
    courses = [],
    enrollments: propEnrollments,
    onAddAssessment,
    onDeleteAssessment,
    onSaveAssessmentMarks,
    onUpdateAssessment
}) => {
    // Local assessments state for instantaneous 0ms UI updates
    const [localAssessments, setLocalAssessments] = useState<Assessment[]>(assessments || []);
    useEffect(() => {
        setLocalAssessments(assessments || []);
    }, [assessments]);

    // Admin / DOS permission check
    const isAdminOrDos = useMemo(() => {
        if (isDos) return true;
        if (!user) return false;
        const role = (user.role || '').toLowerCase();
        const adminRoles = [
            'admin', 'super_admin', 'head_teacher', 'principal', 
            'deputy', 'deputy_hoi_academics', 'cao', 'dos', 'director_of_studies', 'academics_officer', 
            'academic_director', 'managing_director', 'hoi'
        ];
        if (adminRoles.includes(role)) return true;
        const userRoles = Array.isArray((user as any).roles) 
            ? (user as any).roles.map((r: any) => String(r).toLowerCase()) 
            : [];
        if (userRoles.some((r: string) => adminRoles.includes(r))) return true;
        if ((user as any).isDos || (user as any).is_dos || (user as any).isAdmin || (user as any).is_admin) return true;
        return false;
    }, [isDos, user]);

    // UI state
    const [isAdding, setIsAdding] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [marks, setMarks] = useState<Map<string, { marks: number | null; comments: string }>>(new Map());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Broadsheet modal state
    const [broadsheetGrade, setBroadsheetGrade] = useState<string | null>(null);

    // Accordion state
    const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});

    // Marks entry filter and search state
    const [selectedStreamInSheet, setSelectedStreamInSheet] = useState<string>('all');
    const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
    const [showMissingOnlyInMarksheet, setShowMissingOnlyInMarksheet] = useState<boolean>(false);

    // Teacher's allowed subject IDs
    const allowedSubjectIds = useMemo(() => new Set(allocatedSubjects.map(s => s.id)), [allocatedSubjects]);
    const allowedSubjectNames = useMemo(() => new Set(allocatedSubjects.map(s => s.name.trim().toLowerCase())), [allocatedSubjects]);

    // ──────────────────────────────────────────────────────────────────────────
    // RESOLVE ALL REAL LEARNERS (FROM ENROLLMENTS REGISTRY + USERS + LOCALSTORAGE)
    // ──────────────────────────────────────────────────────────────────────────
    const instId = currentInstitution?.id || user?.institutionId || (user as any)?.schoolId || (user as any)?.school_id;
    const [enrollmentsRegistry, setEnrollmentsRegistry] = useState<any[]>(() => {
        if (propEnrollments && Array.isArray(propEnrollments) && propEnrollments.length > 0) {
            return propEnrollments;
        }
        try {
            const keysToTry = [
                instId ? `eduai_student_enrollments_${instId}` : null,
                instId ? `eduai_students_${instId}` : null,
                'eduai_student_enrollments',
                'eduai_student_enrollments_default',
                'student_enrollments',
                'eduai_students',
                'eduai_students_default'
            ].filter(Boolean) as string[];

            for (const k of keysToTry) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            }

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('eduai_student_enrollments_') || key.startsWith('eduai_students_'))) {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    }
                }
            }
        } catch (_) {}
        return [];
    });

    useEffect(() => {
        if (propEnrollments && Array.isArray(propEnrollments) && propEnrollments.length > 0) {
            setEnrollmentsRegistry(propEnrollments);
            return;
        }
        let active = true;
        (async () => {
            let effective: any[] = [];
            if (instId) {
                const [enrList, stList] = await Promise.all([
                    apiService.fetchModuleRecords<any>('student_enrollments', instId).catch(() => []),
                    apiService.fetchModuleRecords<any>('students', instId).catch(() => [])
                ]);
                effective = (enrList && enrList.length > 0) ? enrList : ((stList && stList.length > 0) ? stList : []);
            }
            if (effective.length === 0) {
                const fallbackEnr = await apiService.fetchModuleRecords<any>('student_enrollments').catch(() => []);
                if (fallbackEnr && fallbackEnr.length > 0) effective = fallbackEnr;
            }
            if (!active) return;
            if (effective.length > 0) {
                setEnrollmentsRegistry(effective);
                if (instId) {
                    try {
                        const compact = effective.length > 50 ? effective.slice(0, 50) : effective;
                        safeLocalStorage.setItem(`eduai_student_enrollments_${instId}`, JSON.stringify(compact));
                    } catch (_) {}
                }
            }
        })();
        return () => { active = false; };
    }, [propEnrollments, instId]);

    // Synthesize real students by joining enrollments registry with users prop
    const allStudents = useMemo<User[]>(() => {
        const map = new Map<string, any>();

        // Build quick lookup from users prop for student details
        const userLookup = new Map<string, any>();
        (users || []).forEach((u: any) => {
            if (u?.id) userLookup.set(String(u.id).toLowerCase(), u);
            if (u?.userId) userLookup.set(String(u.userId).toLowerCase(), u);
            const adm = String(u.admissionNumber || u.admission_number || u.admNo || u.metadata?.admissionNumber || u.staffId || '').trim().toLowerCase();
            if (adm) userLookup.set(`adm_${adm}`, u);
        });

        // 1. Ingest enrollments registry
        (enrollmentsRegistry || []).forEach((enr: any, idx: number) => {
            if (!enr) return;
            const adm = String(
                enr.admissionNumber ||
                enr.admission_number ||
                enr.admNo ||
                enr.metadata?.admissionNumber ||
                enr.metadata?.admission_number ||
                enr.metadata?.admNo ||
                enr.id ||
                ''
            ).trim();

            const linkedUser = (enr.userId && userLookup.get(String(enr.userId).toLowerCase())) ||
                               (enr.id && userLookup.get(String(enr.id).toLowerCase())) ||
                               (adm && userLookup.get(`adm_${adm.toLowerCase()}`));

            const name = String(
                linkedUser?.name ||
                enr.studentName ||
                enr.student_name ||
                enr.name ||
                enr.fullName ||
                enr.metadata?.studentName ||
                enr.metadata?.name ||
                enr.metadata?.fullName ||
                linkedUser?.fullName ||
                (adm ? `Student ${adm}` : `Student ${idx + 1}`)
            ).trim();

            const rawClass = String(
                enr.studentClass ||
                enr.gradeLevel ||
                enr.className ||
                enr.class ||
                enr.grade ||
                enr.metadata?.gradeLevel ||
                enr.metadata?.studentClass ||
                enr.metadata?.className ||
                enr.metadata?.class ||
                linkedUser?.gradeLevel ||
                linkedUser?.grade ||
                linkedUser?.currentClass ||
                linkedUser?.class ||
                ''
            ).trim();

            const rawStream = String(
                enr.stream ||
                enr.streamName ||
                enr.classStream ||
                enr.metadata?.stream ||
                enr.metadata?.streamName ||
                linkedUser?.stream ||
                linkedUser?.metadata?.stream ||
                ''
            ).trim();

            const normStream = normalizeStreamName(rawStream);
            const fullClass = normStream && rawClass && !rawClass.toLowerCase().includes(normStream.toLowerCase())
                ? `${rawClass} ${normStream}`
                : (rawClass || normStream);

            const canonicalGrade = extractClassAndStream(rawClass || fullClass).className || rawClass;
            const studentId = enr.userId || linkedUser?.id || enr.studentId || enr.id || (adm ? `adm_${adm}` : `st_${idx}`);

            const stObj: any = {
                ...linkedUser,
                ...enr,
                id: studentId,
                userId: studentId,
                studentId: studentId,
                name: name,
                studentName: name,
                role: 'student',
                admissionNumber: adm,
                admNo: adm,
                gradeLevel: canonicalGrade || rawClass,
                grade: canonicalGrade || rawClass,
                className: fullClass,
                studentClass: fullClass,
                currentClass: fullClass,
                stream: normStream,
                streamName: normStream,
                status: enr.status || linkedUser?.status || 'active',
                metadata: {
                    ...(linkedUser?.metadata || {}),
                    ...(enr.metadata || {}),
                    gradeLevel: canonicalGrade || rawClass,
                    stream: normStream,
                    admissionNumber: adm,
                    studentName: name
                }
            };

            const dedupKey = adm ? `adm_${adm.toLowerCase()}` : (studentId ? `id_${String(studentId).toLowerCase()}` : `idx_${idx}`);
            map.set(dedupKey, stObj);
        });

        // 2. Merge from users prop
        (users || []).filter(isStudentUser).forEach((u: any, idx: number) => {
            const adm = String(u.admissionNumber || u.admission_number || u.admNo || u.metadata?.admissionNumber || u.staffId || '').trim();
            const dedupKey = adm ? `adm_${adm.toLowerCase()}` : (u.id ? `id_${String(u.id).toLowerCase()}` : `usr_${idx}`);

            if (!map.has(dedupKey)) {
                map.set(dedupKey, u);
            } else {
                const existing = map.get(dedupKey);
                map.set(dedupKey, {
                    ...existing,
                    ...u,
                    gradeLevel: existing.gradeLevel || u.gradeLevel || u.grade,
                    grade: existing.grade || u.grade || u.gradeLevel,
                    className: existing.className || u.className || u.currentClass,
                    stream: existing.stream || u.stream,
                    metadata: {
                        ...(existing.metadata || {}),
                        ...(u.metadata || {})
                    }
                });
            }
        });

        return Array.from(map.values());
    }, [enrollmentsRegistry, users]);

    // ──────────────────────────────────────────────────────────────────────────
    // LOAD CLASS EXAM CONFIGS (FROM CURRENT INSTITUTION OR LOCALSTORAGE)
    // ──────────────────────────────────────────────────────────────────────────
    const classExamConfigs = useMemo<any[]>(() => {
        let configs: any[] = (currentInstitution as any)?.classExamConfigs || (currentInstitution as any)?.class_exam_configs;
        if (!configs || !Array.isArray(configs) || configs.length === 0) {
            try {
                const local = localStorage.getItem(`eduai_class_exam_configs_${instId}`) ||
                              localStorage.getItem('eduai_class_exam_configs');
                if (local) {
                    const parsed = JSON.parse(local);
                    if (Array.isArray(parsed) && parsed.length > 0) configs = parsed;
                }
            } catch (_) {}
        }
        return Array.isArray(configs) ? configs : [];
    }, [currentInstitution, instId]);

    // ──────────────────────────────────────────────────────────────────────────
    // CLEAN ACADEMIC GRADES LIST
    // ──────────────────────────────────────────────────────────────────────────
    const allCleanGradesList = useMemo<string[]>(() => {
        const gradesSet = new Set<string>();

        // 1. From allocatedGrades prop
        (allocatedGrades || []).forEach(g => {
            if (g && g.trim() && !isPureStreamName(g)) {
                const canonical = extractClassAndStream(g).className;
                if (canonical && !isPureStreamName(canonical)) gradesSet.add(canonical);
                else gradesSet.add(g.trim());
            }
        });

        // 2. From teacher's subjectAllocations
        const uId = user?.id;
        const uName = (user?.name || '').toLowerCase().trim();
        (subjectAllocations || []).forEach(a => {
            if (!a) return;
            const isMatch = isAdminOrDos || a.teacherId === uId || (uName && a.teacherName && a.teacherName.toLowerCase().trim() === uName);
            if (isMatch) {
                const cName = (a.className || a.class || a.grade || '').trim();
                if (cName && !isPureStreamName(cName)) {
                    const canonical = extractClassAndStream(cName).className;
                    if (canonical && !isPureStreamName(canonical)) gradesSet.add(canonical);
                    else gradesSet.add(cName);
                }
            }
        });

        // 3. From real student records
        (allStudents || []).filter(isStudentUser).forEach(st => {
            const gr = getStudentGrade(st, courses);
            if (gr && gr !== 'Unassigned Grade' && !isPureStreamName(gr)) {
                gradesSet.add(gr);
            }
        });

        // 4. From courses / levels
        (courses || []).forEach(c => {
            (c.levels || []).forEach(l => {
                if (l.name && l.name.trim() && !isPureStreamName(l.name)) {
                    const canonical = extractClassAndStream(l.name).className;
                    if (canonical && !isPureStreamName(canonical)) {
                        gradesSet.add(canonical);
                    }
                }
            });
        });

        // 5. From existing assessments
        (localAssessments || []).forEach(a => {
            const ag = a.grade || a.className || a.targetClass;
            if (ag && ag.trim() && !isPureStreamName(ag)) {
                const canonical = extractClassAndStream(ag).className;
                if (canonical && !isPureStreamName(canonical)) gradesSet.add(canonical);
            }
        });

        // If teacher is allocated specific grades, prioritize those
        if (!isAdminOrDos && allocatedGrades.length > 0) {
            const allocatedClean = allocatedGrades.map(g => extractClassAndStream(g).className || g).filter(g => !isPureStreamName(g));
            if (allocatedClean.length > 0) {
                return naturalClassSort(Array.from(new Set(allocatedClean)));
            }
        }

        return naturalClassSort(Array.from(gradesSet));
    }, [allocatedGrades, subjectAllocations, allStudents, courses, localAssessments, isAdminOrDos, user?.id, user?.name]);

    // ──────────────────────────────────────────────────────────────────────────
    // ACCURATE STUDENT ENROLLMENT GETTER (PER GRADE & PER STREAM)
    const getStudentsInGradeAndStream = useCallback((targetGradeName: string, targetStreamName: string = 'all'): User[] => {
        return (allStudents || []).filter(u => {
            if (!isStudentUser(u)) return false;
            const status = ((u as any).status || '').toLowerCase();
            if (status === 'inactive' || status === 'archived' || status === 'alumni' || status === 'graduated') return false;

            // 1. Grade check
            if (targetGradeName && targetGradeName !== 'all') {
                if (!doesStudentMatchGrade(u, targetGradeName, courses)) {
                    return false;
                }
            }

            // 2. Stream check
            if (targetStreamName && targetStreamName !== 'all') {
                const stStream = getStudentStream(u, courses).toLowerCase().trim();
                const cleanStream = targetStreamName.toLowerCase().trim();
                if (stStream !== cleanStream && !stStream.includes(cleanStream)) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [allStudents, courses]);

    const getEnrollmentCount = useCallback((gradeName: string, streamName: string = 'all'): number => {
        return getStudentsInGradeAndStream(gradeName, streamName).length;
    }, [getStudentsInGradeAndStream]);

    // ──────────────────────────────────────────────────────────────────────────
    // AUTO-RESOLVE PAPERS FOR A GRADE (NEVER SHOWS 0 PAPERS IF DATA EXISTS!)
    // ──────────────────────────────────────────────────────────────────────────
    const getPapersForGrade = useCallback((gradeName: string): Assessment[] => {
        const papersList: Assessment[] = [];
        const paperKeySet = new Set<string>();

        const gClean = gradeName.toLowerCase().trim();
        const gCanonical = extractClassAndStream(gradeName).className.toLowerCase().trim();
        const gDigits = (gradeName.match(/\d+/) || [])[0];

        // Helper to check if paper grade matches gradeName
        const isGradeMatch = (targetG?: string) => {
            if (!targetG) return true;
            const tg = targetG.toLowerCase().trim();
            const tgCanonical = extractClassAndStream(targetG).className.toLowerCase().trim();
            if (tg === gClean || tgCanonical === gCanonical) return true;
            if (tg.includes(gClean) || gClean.includes(tg)) return true;
            if (gDigits && (tg.match(/\d+/) || [])[0] === gDigits) return true;
            return false;
        };

        // 1. First, check localAssessments
        (localAssessments || []).forEach(a => {
            if (!a) return;
            const targetG = a.grade || a.className || a.targetClass || '';
            if (isGradeMatch(targetG)) {
                // Check teacher permissions if not DOS
                if (!isAdminOrDos) {
                    const isSubjectMatch = allowedSubjectIds.has(a.subjectId) ||
                        (a.subjectName && allowedSubjectNames.has(a.subjectName.trim().toLowerCase())) ||
                        a.lecturerId === user.id;
                    if (!isSubjectMatch) return;
                }
                const key = `${a.id || a.title}_${a.subjectId}`.toLowerCase();
                if (!paperKeySet.has(key)) {
                    paperKeySet.add(key);
                    papersList.push(a);
                }
            }
        });

        // 2. Second, check classExamConfigs
        const matchedClassConfig = classExamConfigs.find((c: any) => {
            if (!c) return false;
            const cName = (c.className || c.name || '').toLowerCase().trim();
            return isGradeMatch(cName);
        });

        if (matchedClassConfig && Array.isArray(matchedClassConfig.subjects)) {
            matchedClassConfig.subjects.forEach((s: any) => {
                const sName = s.subjectName || s.name || '';
                const sId = s.subjectId || s.id || '';
                if (!sName && !sId) return;

                // Check if teacher is allocated this subject (or DOS)
                if (!isAdminOrDos) {
                    const isAllowed = (sId && allowedSubjectIds.has(sId)) ||
                                      (sName && allowedSubjectNames.has(sName.trim().toLowerCase()));
                    if (!isAllowed) return;
                }

                const matchedSubObj = allocatedSubjects.find(sub => sub.id === sId || sub.name.toLowerCase().trim() === sName.toLowerCase().trim());
                const realSubId = matchedSubObj?.id || sId || `sub_${sName.replace(/\s+/g, '_').toLowerCase()}`;
                const realSubName = matchedSubObj?.name || sName;

                const papers = Array.isArray(s.papers) && s.papers.length > 0 ? s.papers : ['Paper 1'];
                papers.forEach((p: any, pIdx: number) => {
                    const pName = typeof p === 'string' ? p : (p.name || `Paper ${pIdx + 1}`);
                    const maxScore = typeof p === 'object' && p.maxScore ? Number(p.maxScore) : 100;
                    const fullTitle = `${realSubName} - ${pName}`;

                    // Check if already in papersList
                    const alreadyExists = papersList.some(existing => 
                        existing.title.toLowerCase().trim() === fullTitle.toLowerCase().trim() ||
                        (existing.subjectId === realSubId && existing.title.toLowerCase().includes(pName.toLowerCase()))
                    );

                    if (!alreadyExists) {
                        const dynamicId = `auto_${gradeName}_${realSubId}_${pName}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
                        const syntheticPaper: Assessment = {
                            id: dynamicId,
                            title: fullTitle,
                            subjectId: realSubId,
                            lecturerId: user.id,
                            grade: gradeName,
                            className: gradeName,
                            targetClass: gradeName,
                            type: 'End Term' as any,
                            maxMarks: maxScore,
                            assessmentDate: new Date().toISOString().split('T')[0],
                            status: 'Published' as any,
                            isAutoResolved: true
                        } as any;
                        papersList.push(syntheticPaper);
                    }
                });
            });
        }

        // 3. Third, if no papers were found yet for allocated subjects in this grade, synthesize standard papers!
        const subjectsForThisGrade: Subject[] = [];
        const uId = user?.id;
        const uName = (user?.name || '').toLowerCase().trim();

        (subjectAllocations || []).forEach(a => {
            if (!a) return;
            const isMatch = isAdminOrDos || a.teacherId === uId || (uName && a.teacherName && a.teacherName.toLowerCase().trim() === uName);
            if (isMatch) {
                const aClass = a.className || a.class || a.grade || '';
                if (isGradeMatch(aClass)) {
                    const sub = allocatedSubjects.find(s => s.id === a.subjectId || (a.subjectName && s.name.toLowerCase().trim() === a.subjectName.toLowerCase().trim()));
                    if (sub && !subjectsForThisGrade.some(s => s.id === sub.id)) {
                        subjectsForThisGrade.push(sub);
                    }
                }
            }
        });

        // Fallback: if subjectsForThisGrade is empty, use all teacher's allocatedSubjects
        if (subjectsForThisGrade.length === 0 && allocatedSubjects.length > 0) {
            allocatedSubjects.forEach(sub => subjectsForThisGrade.push(sub));
        }

        subjectsForThisGrade.forEach(sub => {
            const alreadyHasPaper = papersList.some(p => p.subjectId === sub.id || (p as any).subjectName === sub.name);
            if (!alreadyHasPaper) {
                const syntheticPaper: Assessment = {
                    id: `auto_${gradeName}_${sub.id}_main`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
                    title: `${sub.name} - End Term Exam`,
                    subjectId: sub.id,
                    lecturerId: user.id,
                    grade: gradeName,
                    className: gradeName,
                    targetClass: gradeName,
                    type: 'End Term' as any,
                    maxMarks: 100,
                    assessmentDate: new Date().toISOString().split('T')[0],
                    status: 'Published' as any,
                    isAutoResolved: true
                } as any;
                papersList.push(syntheticPaper);
            }
        });

        return papersList;
    }, [localAssessments, classExamConfigs, isAdminOrDos, allowedSubjectIds, allowedSubjectNames, user.id, user?.name, allocatedSubjects, subjectAllocations]);

    // ──────────────────────────────────────────────────────────────────────────
    // GROUP ASSESSMENTS BY GRADE ACCORDION
    // ──────────────────────────────────────────────────────────────────────────
    const gradeGroups = useMemo<GradeGroup[]>(() => {
        return allCleanGradesList.map((gradeName: string): GradeGroup => {
            const papers = getPapersForGrade(gradeName);
            const studentsInGrade = getStudentsInGradeAndStream(gradeName, 'all');
            const enrollment = studentsInGrade.length;

            let totalPossibleEntries = 0;
            let totalGradedEntries = 0;

            papers.forEach((paper: Assessment) => {
                const paperMax = enrollment > 0 ? enrollment : 1;
                totalPossibleEntries += paperMax;

                const gradedCount = (assessmentMarks || []).filter(m => {
                    if (m.assessmentId !== paper.id || m.marks === null || m.marks === undefined) return false;
                    return studentsInGrade.some(st => 
                        st.id === m.studentId || 
                        (st as any).userId === m.studentId || 
                        ((st as any).studentId && (st as any).studentId === m.studentId) ||
                        (st.admissionNumber && (m as any).admissionNumber === st.admissionNumber)
                    );
                }).length;

                totalGradedEntries += Math.min(gradedCount, paperMax);
            });

            const overallProgressPct = totalPossibleEntries > 0 
                ? Math.round((totalGradedEntries / totalPossibleEntries) * 100)
                : 0;

            return {
                gradeName,
                papers,
                enrollment,
                studentsInGrade,
                overallProgressPct,
                totalGradedEntries,
                totalPossibleEntries
            };
        });
    }, [allCleanGradesList, getPapersForGrade, getStudentsInGradeAndStream, assessmentMarks]);

    // Total count of all papers across grades
    const totalPapersCount = useMemo(() => {
        let count = 0;
        gradeGroups.forEach(g => {
            count += g.papers.length;
        });
        return count;
    }, [gradeGroups]);

    // Expand all grades by default initially
    useEffect(() => {
        if (gradeGroups.length > 0 && Object.keys(expandedGrades).length === 0) {
            const initial: Record<string, boolean> = {};
            gradeGroups.forEach((g: GradeGroup) => {
                initial[g.gradeName] = true;
            });
            setExpandedGrades(initial);
        }
    }, [gradeGroups, expandedGrades]);

    const toggleGradeExpand = (gradeName: string) => {
        setExpandedGrades(prev => ({
            ...prev,
            [gradeName]: !prev[gradeName]
        }));
    };

    // ──────────────────────────────────────────────────────────────────────────
    // ELIGIBLE STUDENTS FOR ACTIVE ASSESSMENT (RAW MARKS SHEET)
    // ──────────────────────────────────────────────────────────────────────────
    const targetGradeForSelectedAssessment = useMemo(() => {
        if (!selectedAssessment) return 'all';
        return selectedAssessment.grade || selectedAssessment.className || selectedAssessment.targetClass || 'all';
    }, [selectedAssessment]);

    // Available streams for this assessment's grade
    const availableStreamsInSheet = useMemo<string[]>(() => {
        if (!selectedAssessment) return [];
        const students = getStudentsInGradeAndStream(targetGradeForSelectedAssessment, 'all');
        const set = new Set<string>();
        students.forEach(st => {
            const s = getStudentStream(st, courses);
            if (s) set.add(s);
        });
        return Array.from(set).sort();
    }, [selectedAssessment, targetGradeForSelectedAssessment, getStudentsInGradeAndStream, courses]);

    const eligibleStudentsForAssessment = useMemo(() => {
        if (!selectedAssessment) return [];
        return getStudentsInGradeAndStream(targetGradeForSelectedAssessment, selectedStreamInSheet);
    }, [selectedAssessment, targetGradeForSelectedAssessment, selectedStreamInSheet, getStudentsInGradeAndStream]);

    // Displayed students in marksheet with missing-only filter & search
    const displayedStudentsInMarksEntry = useMemo(() => {
        let list = eligibleStudentsForAssessment;

        if (showMissingOnlyInMarksheet) {
            list = list.filter(st => {
                const entry = marks.get(st.id);
                return !entry || entry.marks === null || entry.marks === undefined;
            });
        }

        if (searchStudentQuery.trim()) {
            const q = searchStudentQuery.toLowerCase().trim();
            list = list.filter(st =>
                (st.name || '').toLowerCase().includes(q) ||
                (st.staffId && st.staffId.toLowerCase().includes(q)) ||
                (st.admissionNumber && st.admissionNumber.toLowerCase().includes(q))
            );
        }

        return list;
    }, [eligibleStudentsForAssessment, showMissingOnlyInMarksheet, searchStudentQuery, marks]);

    // Select assessment for marks entry
    const handleSelectAssessment = useCallback((assessment: Assessment) => {
        setSelectedAssessment(assessment);
        setSelectedStreamInSheet('all');
        setSearchStudentQuery('');
        setShowMissingOnlyInMarksheet(false);
        const initialMarks = new Map<string, { marks: number | null; comments: string }>();
        const existingMarks = (assessmentMarks || []).filter(m => m.assessmentId === assessment.id);
        existingMarks.forEach(mark => {
            if (!mark.studentId) return;
            initialMarks.set(mark.studentId, { marks: mark.marks, comments: mark.comments || '' });
            // Cross-match student by userId, studentId, or admissionNumber
            const matchedSt = allStudents.find(st => 
                st.id === mark.studentId || 
                (st as any).userId === mark.studentId || 
                ((st as any).studentId && (st as any).studentId === mark.studentId) ||
                (st.admissionNumber && (st.admissionNumber === mark.studentId || st.admissionNumber === (mark as any).admissionNumber))
            );
            if (matchedSt) {
                initialMarks.set(matchedSt.id, { marks: mark.marks, comments: mark.comments || '' });
                if ((matchedSt as any).userId) {
                    initialMarks.set((matchedSt as any).userId, { marks: mark.marks, comments: mark.comments || '' });
                }
            }
        });
        setMarks(initialMarks);
    }, [assessmentMarks, allStudents]);

    const handleMarkChange = (studentId: string, value: string) => {
        if (!selectedAssessment) return;
        const numValue = value === '' ? null : parseInt(value, 10);
        if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > selectedAssessment.maxMarks)) {
            return;
        }
        setMarks(prev => new Map(prev).set(studentId, { ...(prev.get(studentId) || { comments: '' }), marks: numValue }));
    };

    const handleCommentChange = (studentId: string, value: string) => {
        setMarks(prev => new Map(prev).set(studentId, { ...(prev.get(studentId) || { marks: null }), comments: value }));
    };

    // Fast fill remaining as zero
    const handleFillRemainingAsZero = () => {
        if (!selectedAssessment) return;
        setMarks(prev => {
            const next = new Map(prev);
            eligibleStudentsForAssessment.forEach(st => {
                const current = next.get(st.id);
                if (!current || current.marks === null || current.marks === undefined) {
                    next.set(st.id, { ...(current || { comments: '' }), marks: 0 });
                }
            });
            return next;
        });
    };

    // Save marks action
    const handleSaveMarks = useCallback(() => {
        if (!selectedAssessment) return;
        setSaveStatus('saving');

        const isAutoResolved = (selectedAssessment as any).isAutoResolved ||
            !localAssessments.some(a => a.id === selectedAssessment.id);

        // If the paper was an auto-resolved paper, persist the assessment header
        if (isAutoResolved) {
            onAddAssessment({
                title: selectedAssessment.title,
                subjectId: selectedAssessment.subjectId,
                type: selectedAssessment.type || ('End Term' as any),
                description: selectedAssessment.description || '',
                maxMarks: selectedAssessment.maxMarks || 100,
                assessmentDate: selectedAssessment.assessmentDate || new Date().toISOString().split('T')[0],
                status: 'Published' as any,
                grade: selectedAssessment.grade,
                className: selectedAssessment.className,
                targetClass: selectedAssessment.targetClass,
                lecturerId: user.id
            } as any);

            setLocalAssessments(prev => {
                if (prev.some(a => a.id === selectedAssessment.id)) return prev;
                return [...prev, selectedAssessment];
            });
        }

        const marksData = Array.from(marks.entries()).map(([studentId, data]) => {
            const matchedSt = allStudents.find(s => s.id === studentId || (s as any).userId === studentId);
            return {
                studentId,
                marks: data.marks,
                comments: data.comments,
                admissionNumber: matchedSt?.admissionNumber,
                userId: (matchedSt as any)?.userId || studentId
            };
        });

        onSaveAssessmentMarks(selectedAssessment.id, marksData);

        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        }, 800);
    }, [selectedAssessment, marks, onSaveAssessmentMarks, onAddAssessment, localAssessments, user.id]);

    // Ctrl+S / Cmd+S Keyboard Shortcut for Saving Marks
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                if (selectedAssessment) {
                    e.preventDefault();
                    handleSaveMarks();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAssessment, handleSaveMarks]);

    // Fast Save Edited Assessment (DOS / Admin Only)
    const handleSaveEditedAssessment = async (updated: Assessment) => {
        if (!isAdminOrDos) {
            alert("Permission denied: Editing exam papers can only be done by the Director of Studies (DOS) or Administrator.");
            return;
        }
        setLocalAssessments(prev => prev.map(a => a.id === updated.id ? updated : a));
        try {
            await apiService.saveModuleRecord('assessments', updated);
            if (onUpdateAssessment) {
                onUpdateAssessment(updated.id, updated);
            }
        } catch (e) {
            console.error("Failed to save edited assessment:", e);
        }
    };

    // Active assessment statistics
    const activeAssessmentStats = useMemo(() => {
        if (!selectedAssessment) return { total: 0, graded: 0, average: 0, avgPercentage: 0 };
        const total = eligibleStudentsForAssessment.length;
        let graded = 0;
        let sumMarks = 0;

        eligibleStudentsForAssessment.forEach(st => {
            const entry = marks.get(st.id);
            if (entry && entry.marks !== null && entry.marks !== undefined) {
                graded++;
                sumMarks += entry.marks;
            }
        });

        const average = graded > 0 ? (sumMarks / graded) : 0;
        const avgPercentage = selectedAssessment.maxMarks > 0 ? ((average / selectedAssessment.maxMarks) * 100) : 0;
        return { total, graded, average, avgPercentage };
    }, [selectedAssessment, eligibleStudentsForAssessment, marks]);

    // Broadsheet Data Calculation
    const broadsheetData = useMemo(() => {
        if (!broadsheetGrade) return null;
        const group: GradeGroup | undefined = gradeGroups.find((g: GradeGroup) => g.gradeName === broadsheetGrade);
        if (!group) return null;

        const students: User[] = group.studentsInGrade;
        const papers: Assessment[] = group.papers;

        const studentRows: BroadsheetStudentRow[] = students.map((st: User): BroadsheetStudentRow => {
            const paperScores: Record<string, number | null> = {};
            let total = 0;
            let gradedCount = 0;

            papers.forEach((paper: Assessment) => {
                const mark = (assessmentMarks || []).find(m => 
                    m.assessmentId === paper.id && (
                        m.studentId === st.id ||
                        ((st as any).userId && m.studentId === (st as any).userId) ||
                        ((st as any).studentId && m.studentId === (st as any).studentId) ||
                        (st.admissionNumber && (m.studentId === st.admissionNumber || (m as any).admissionNumber === st.admissionNumber))
                    )
                );
                if (mark && mark.marks !== null && mark.marks !== undefined) {
                    paperScores[paper.id] = Number(mark.marks);
                    total += Number(mark.marks);
                    gradedCount++;
                } else {
                    paperScores[paper.id] = null;
                }
            });

            const totalMaxMarks = papers.reduce((sum, p) => sum + (p.maxMarks || 100), 0);
            const averagePct = totalMaxMarks > 0 ? (total / totalMaxMarks) * 100 : 0;

            return {
                student: st,
                paperScores,
                total,
                averagePct,
                gradedCount
            };
        });

        studentRows.sort((a, b) => b.total - a.total);

        return {
            gradeName: broadsheetGrade,
            papers,
            rows: studentRows
        };
    }, [broadsheetGrade, gradeGroups, assessmentMarks]);

    const exportBroadsheetCsv = () => {
        if (!broadsheetData) return;
        const headers = ['Position', 'Adm No', 'Student Name', ...broadsheetData.papers.map(p => `${p.title} (/ ${p.maxMarks})`), 'Total', 'Average %'];
        const rows = broadsheetData.rows.map((r, idx) => [
            idx + 1,
            `"${r.student.admissionNumber || r.student.staffId || ''}"`,
            `"${r.student.name}"`,
            ...broadsheetData.papers.map(p => r.paperScores[p.id] !== null ? r.paperScores[p.id] : ''),
            r.total,
            r.averagePct.toFixed(1)
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Broadsheet_${broadsheetData.gradeName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ──────────────────────────────────────────────────────────────────────────
    // VIEW 1: ACTIVE CLASSLIST MARKS ENTRY SHEET
    // ──────────────────────────────────────────────────────────────────────────
    if (selectedAssessment) {
        const subject = allocatedSubjects.find(s => s.id === selectedAssessment.subjectId);

        return (
            <div className="space-y-6 animate-fade-in">
                <style>{`
                    .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                    .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #1e293b; color: white; }
                `}</style>

                {/* Top Navigation & Sheet Header */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <button
                            type="button"
                            onClick={() => setSelectedAssessment(null)}
                            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-black uppercase tracking-wider mt-0.5"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Papers</span>
                        </button>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                                    {targetGradeForSelectedAssessment !== 'all' ? targetGradeForSelectedAssessment : 'Active Grade'}
                                </span>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {selectedAssessment.title}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                                {subject?.name || 'Subject'} ({subject?.code || '—'}) • Out of <strong className="text-slate-800 dark:text-slate-200">{selectedAssessment.maxMarks} marks</strong>
                                {selectedAssessment.assessmentDate && ` • Date: ${new Date(selectedAssessment.assessmentDate).toLocaleDateString()}`}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Enrolled</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{activeAssessmentStats.total}</p>
                        </div>
                        <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Graded</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{activeAssessmentStats.graded}</p>
                        </div>
                        <div className="text-center px-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average</p>
                            <p className="text-sm font-black text-blue-600 dark:text-blue-400">{activeAssessmentStats.avgPercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                {/* Marks Entry Sheet Card */}
                <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    {/* Classlist Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {availableStreamsInSheet.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Stream:</span>
                                    <select
                                        value={selectedStreamInSheet}
                                        onChange={e => setSelectedStreamInSheet(e.target.value)}
                                        className="bg-transparent font-bold text-xs text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                                    >
                                        <option value="all">All Streams</option>
                                        {availableStreamsInSheet.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowMissingOnlyInMarksheet(!showMissingOnlyInMarksheet)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                    showMissingOnlyInMarksheet
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60'
                                }`}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                {showMissingOnlyInMarksheet ? 'Showing Missing Only' : 'Missing Marks Only'}
                            </button>

                            <button
                                type="button"
                                onClick={handleFillRemainingAsZero}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                                Set Unmarked as 0
                            </button>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search learner name or adm..."
                                value={searchStudentQuery}
                                onChange={e => setSearchStudentQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Teacher Guidance Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <ArrowDown className="w-3 h-3" /> Press Enter or Arrow Down to jump to next student
                        </span>
                        <span>Ctrl+S to save marks</span>
                    </div>

                    {/* Active Classlist Table */}
                    <div className="border border-slate-200 dark:border-slate-750 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#243347] text-white uppercase text-[10px] font-black tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-4 w-32">Adm No.</th>
                                    <th className="py-3.5 px-4">Learner Name</th>
                                    <th className="py-3.5 px-4 w-32">Stream</th>
                                    <th className="py-3.5 px-4 w-40">Raw Score (/ {selectedAssessment.maxMarks})</th>
                                    <th className="py-3.5 px-4">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {displayedStudentsInMarksEntry.map((student, idx) => {
                                    const entry = marks.get(student.id) || { marks: null, comments: '' };
                                    const studentStream = getStudentStream(student, courses);

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                                                {student.admissionNumber || student.staffId || '—'}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {studentStream || 'Main Stream'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    id={`score_input_${idx}`}
                                                    type="number"
                                                    min="0"
                                                    max={selectedAssessment.maxMarks}
                                                    value={entry.marks === null || entry.marks === undefined ? '' : entry.marks}
                                                    onChange={e => handleMarkChange(student.id, e.target.value)}
                                                    onFocus={e => e.target.select()}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            const next = document.getElementById(`score_input_${idx + 1}`);
                                                            if (next) {
                                                                (next as HTMLInputElement).focus();
                                                                (next as HTMLInputElement).select();
                                                            }
                                                        } else if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            const prev = document.getElementById(`score_input_${idx - 1}`);
                                                            if (prev) {
                                                                (prev as HTMLInputElement).focus();
                                                                (prev as HTMLInputElement).select();
                                                            }
                                                        }
                                                    }}
                                                    placeholder="—"
                                                    className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-center text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="text"
                                                    value={entry.comments}
                                                    onChange={e => handleCommentChange(student.id, e.target.value)}
                                                    placeholder="Teacher's remark..."
                                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}

                                {displayedStudentsInMarksEntry.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-slate-400">
                                            No learners found matching the current search or filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Save Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 font-medium">
                            Graded <strong className="text-slate-900 dark:text-white">{activeAssessmentStats.graded}</strong> out of <strong className="text-slate-900 dark:text-white">{activeAssessmentStats.total}</strong> enrolled learners.
                        </div>

                        <div className="flex items-center gap-3">
                            {saveStatus === 'saved' && (
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                                    <Check className="w-4 h-4" /> Marks Saved Successfully!
                                </span>
                            )}
                            <button
                                onClick={handleSaveMarks}
                                disabled={saveStatus === 'saving'}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {saveStatus === 'saving' ? 'Saving Marks...' : 'Save Raw Marks (Ctrl+S)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // VIEW 2: MAIN MARKS HUB (CLEAN GRADE ACCORDION & PAPER LIST)
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #1e293b; color: white; }
            `}</style>

            {/* Header: Marks Hub Title & Total Papers Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <span>Marks Hub</span>
                        <span className="text-[10px] px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black uppercase tracking-wider border border-blue-100 dark:border-blue-900/50">
                            {totalPapersCount} Paper{totalPapersCount !== 1 ? 's' : ''}
                        </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Record and manage examination scores for your allocated subjects
                    </p>
                </div>

                {isAdminOrDos && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
                    >
                        <PlusIcon className="w-4 h-4" /> New Assessment
                    </button>
                )}
            </div>

            {/* New Assessment Form (Admin / DOS) */}
            {isAdding && isAdminOrDos && (
                <NewAssessmentForm
                    user={user}
                    allocatedSubjects={allocatedSubjects}
                    availableGrades={allCleanGradesList}
                    getEnrollmentForGrade={getEnrollmentCount}
                    onAddAssessment={onAddAssessment}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            {/* Edit Assessment Modal (DOS / Admin Only) */}
            {editingAssessment && isAdminOrDos && (
                <EditAssessmentModal
                    assessment={editingAssessment}
                    allocatedSubjects={allocatedSubjects}
                    availableGrades={allCleanGradesList}
                    getEnrollmentForGrade={getEnrollmentCount}
                    onSave={handleSaveEditedAssessment}
                    onCancel={() => setEditingAssessment(null)}
                />
            )}

            {/* Main Table: Grade Accordion & Papers List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                        {/* Table Header: Dark Navy */}
                        <div className="bg-[#243347] text-white px-6 py-3.5 flex items-center justify-between text-xs font-black uppercase tracking-wider select-none">
                            <div className="w-[32%] min-w-[190px]">PAPER</div>
                            <div className="w-[20%] min-w-[130px]">SUBJECT TEACHER</div>
                            <div className="w-[14%] min-w-[90px] text-center">ENROLLMENT</div>
                            <div className="w-[22%] min-w-[150px]">MARKS ENTRY PROGRESS</div>
                            <div className="w-[12%] min-w-[90px] text-right">ACTION</div>
                        </div>

                        {/* Grade Groups Accordion Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {gradeGroups.map((group: GradeGroup) => {
                                const isExpanded = !!expandedGrades[group.gradeName];

                                return (
                                    <div key={group.gradeName} className="transition-colors">
                                        {/* Grade Summary Accordion Header */}
                                        <div
                                            onClick={() => toggleGradeExpand(group.gradeName)}
                                            className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer select-none transition-colors border-b border-slate-100/80 dark:border-slate-800/80"
                                        >
                                            {/* Column 1: Chevron + Grade Name + Paper Count */}
                                            <div className="w-[32%] min-w-[190px] flex items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); toggleGradeExpand(group.gradeName); }}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                                    )}
                                                </button>
                                                <span className="font-black text-slate-900 dark:text-white text-sm">
                                                    {group.gradeName}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {group.papers.length} Paper{group.papers.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Column 2: Teacher (Blank on Grade Summary Row) */}
                                            <div className="w-[20%] min-w-[130px] text-slate-400 text-xs"></div>

                                            {/* Column 3: Enrollment */}
                                            <div className="w-[14%] min-w-[90px] text-center font-bold text-slate-900 dark:text-white text-sm">
                                                {group.enrollment} learners
                                            </div>

                                            {/* Column 4: Marks Entry Progress */}
                                            <div className="w-[22%] min-w-[150px] flex items-center gap-3">
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-16">
                                                    {group.overallProgressPct}% progress
                                                </span>
                                                <div className="w-28 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-1 max-w-[120px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            group.overallProgressPct === 100
                                                                ? 'bg-emerald-500'
                                                                : group.overallProgressPct > 0
                                                                ? 'bg-blue-600'
                                                                : 'bg-transparent'
                                                        }`}
                                                        style={{ width: `${group.overallProgressPct}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Column 5: Action (Broadsheet) */}
                                            <div className="w-[12%] min-w-[90px] text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBroadsheetGrade(group.gradeName);
                                                    }}
                                                    className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline cursor-pointer"
                                                >
                                                    View Broadsheet
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Papers for this Grade */}
                                        {isExpanded && (
                                            <div className="bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {group.papers.map((paper: Assessment) => {
                                                    const subject = allocatedSubjects.find(s => s.id === paper.subjectId);
                                                    const teacherUser = users.find(u => u.id === paper.lecturerId);
                                                    const teacherName = teacherUser?.name || user?.name || 'Assigned Subject Teacher';
                                                    
                                                    const gradedCount = (assessmentMarks || []).filter(m => {
                                                        if (m.assessmentId !== paper.id || m.marks === null || m.marks === undefined) return false;
                                                        return group.studentsInGrade.some(st => 
                                                            st.id === m.studentId ||
                                                            (st as any).userId === m.studentId ||
                                                            ((st as any).studentId && (st as any).studentId === m.studentId) ||
                                                            (st.admissionNumber && (m.studentId === st.admissionNumber || (m as any).admissionNumber === st.admissionNumber))
                                                        );
                                                    }).length;

                                                    const paperEnrollment = group.enrollment;
                                                    const paperProgressPct = Math.min(100, Math.round((gradedCount / (paperEnrollment > 0 ? paperEnrollment : 1)) * 100));

                                                    return (
                                                        <div
                                                            key={paper.id}
                                                            className="px-6 py-3.5 pl-12 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                        >
                                                            {/* Paper Title & Subject */}
                                                            <div className="w-[32%] min-w-[190px] flex items-center gap-2.5">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                                                        <span>{paper.title}</span>
                                                                        {isAdminOrDos && (
                                                                            <button
                                                                                type="button"
                                                                                title="Edit exam paper settings (DOS / Admin)"
                                                                                onClick={(e) => { e.stopPropagation(); setEditingAssessment(paper); }}
                                                                                className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                                                            >
                                                                                <Edit3 className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {subject?.name || 'Subject'} • {paper.maxMarks} Marks
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Subject Teacher */}
                                                            <div className="w-[20%] min-w-[130px] text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                                {teacherName}
                                                            </div>

                                                            {/* Enrollment */}
                                                            <div className="w-[14%] min-w-[90px] text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                {paperEnrollment}
                                                            </div>

                                                            {/* Marks Entry Progress */}
                                                            <div className="w-[22%] min-w-[150px] flex items-center gap-3">
                                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-16">
                                                                    {paperProgressPct}% ({gradedCount}/{paperEnrollment})
                                                                </span>
                                                                <div className="w-28 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-1 max-w-[100px]">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            paperProgressPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                                                        }`}
                                                                        style={{ width: `${paperProgressPct}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Action: Enter Marks */}
                                                            <div className="w-[12%] min-w-[90px] flex items-center justify-end gap-2">
                                                                {isAdminOrDos && (
                                                                    <button
                                                                        type="button"
                                                                        title="Delete assessment"
                                                                        onClick={() => {
                                                                            if (window.confirm(`Are you sure you want to delete "${paper.title}"? Associated student marks will also be deleted.`)) {
                                                                                onDeleteAssessment(paper.id);
                                                                            }
                                                                        }}
                                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                                    >
                                                                        <XIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectAssessment(paper)}
                                                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5" />
                                                                    <span>{gradedCount > 0 ? 'Update Marks' : 'Enter Marks'}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {group.papers.length === 0 && (
                                                    <div className="px-12 py-5 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
                                                        <span>No examination papers scheduled for {group.gradeName} yet.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {gradeGroups.length === 0 && (
                                <div className="p-12 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        No allocated grades found for your profile
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        Please ensure your teacher subject and grade allocations are configured by the administration.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Broadsheet Modal */}
            {broadsheetGrade && broadsheetData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                    <span>Class Broadsheet • {broadsheetData.gradeName}</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {broadsheetData.rows.length} Enrolled Learners • {broadsheetData.papers.length} Scheduled Examination Papers
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Print
                                </button>
                                <button
                                    onClick={exportBroadsheetCsv}
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                                <button
                                    onClick={() => setBroadsheetGrade(null)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Scrollable Broadsheet Table */}
                        <div className="p-6 overflow-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#243347] text-white uppercase text-[10px] font-black tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="py-3 px-3">Pos</th>
                                        <th className="py-3 px-3">Adm No.</th>
                                        <th className="py-3 px-3">Student Name</th>
                                        {broadsheetData.papers.map((p: Assessment) => (
                                            <th key={p.id} className="py-3 px-3 text-center">
                                                {p.title}
                                                <div className="text-[9px] text-slate-300 font-normal">/ {p.maxMarks}</div>
                                            </th>
                                        ))}
                                        <th className="py-3 px-3 text-center font-black">Total</th>
                                        <th className="py-3 px-3 text-center font-black">Average %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {broadsheetData.rows.map((row: BroadsheetStudentRow, idx: number) => (
                                        <tr key={row.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                                                {row.student.admissionNumber || row.student.staffId || '—'}
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                                {row.student.name}
                                            </td>
                                            {broadsheetData.papers.map((p: Assessment) => {
                                                const score = row.paperScores[p.id];
                                                return (
                                                    <td key={p.id} className="py-2.5 px-3 text-center font-semibold">
                                                        {score !== null ? (
                                                            <span className="text-slate-900 dark:text-white font-bold">{score}</span>
                                                        ) : (
                                                            <span className="text-slate-300 dark:text-slate-600">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2.5 px-3 text-center font-black text-blue-600 dark:text-blue-400">
                                                {row.total}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-white">
                                                {row.averagePct.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}

                                    {broadsheetData.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={5 + broadsheetData.papers.length} className="py-12 text-center text-slate-400">
                                                No student marks found for {broadsheetData.gradeName}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
                            <button
                                onClick={() => setBroadsheetGrade(null)}
                                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider"
                            >
                                Close Broadsheet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
