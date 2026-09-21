import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { User, Assessment, AssessmentMark, Subject, Course } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { resolveRealStudentClass, naturalClassSort } from '../utils/academicUtils';
import { 
    CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Filter, 
    Search, Sparkles, AlertCircle, Printer, Download,
    AlertTriangle, FileSpreadsheet, History, CheckCheck
} from 'lucide-react';

interface AssessmentManagerProps {
    user: User;
    isDos?: boolean;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    allocatedSubjects: Subject[];
    allocatedGrades?: string[];
    users: User[];
    courses: Course[];
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssessment: (assessmentId: string) => void;
    onSaveAssessmentMarks: (assessmentId: string, marksData: { studentId: string; marks: number | null; comments?: string }[]) => void;
}

interface MarksAuditLog {
    id: string;
    timestamp: string;
    assessmentTitle: string;
    grade: string;
    subjectName: string;
    savedBy: string;
    gradedCount: number;
    totalCount: number;
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

const NewAssessmentForm: React.FC<{
    user: User;
    allocatedSubjects: Subject[];
    allocatedGrades?: string[];
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onCancel: () => void;
}> = ({ user, allocatedSubjects, allocatedGrades = [], onAddAssessment, onCancel }) => {
    const [title, setTitle] = useState('');
    const [subjectId, setSubjectId] = useState(allocatedSubjects[0]?.id || '');
    const [targetGrade, setTargetGrade] = useState('all');
    const [type, setType] = useState<string>('Mid Term');
    const [description, setDescription] = useState('');
    const [maxMarks, setMaxMarks] = useState<number | ''>(100);
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);

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
            status: 'Draft',
            ...(targetGrade !== 'all' ? { grade: targetGrade, className: targetGrade } : {})
        } as any);
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-850 dark:to-slate-900 p-6 rounded-3xl border border-indigo-100 dark:border-slate-700/80 shadow-md space-y-5 my-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-indigo-100/60 dark:border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Director of Studies • Create School Assessment</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure exam papers for assigned subject teachers to enter marks</p>
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
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Target Grade / Class Level</label>
                    <select value={targetGrade} onChange={e => setTargetGrade(e.target.value)} className="form-select text-xs">
                        <option value="all">All Applicable Grades for this Subject</option>
                        {allocatedGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
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
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="form-input text-xs" placeholder="e.g., Covers Term 1 Weeks 1-6 curriculum content..."></textarea>
                </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 transition-all">Create Assessment</button>
            </div>
        </form>
    );
};

export const AssessmentManager: React.FC<AssessmentManagerProps> = ({
    user,
    isDos = false,
    assessments,
    assessmentMarks,
    allocatedSubjects,
    allocatedGrades = [],
    users,
    courses,
    onAddAssessment,
    onDeleteAssessment,
    onSaveAssessmentMarks
}) => {
    // ──────────────────────────────────────────────────────────────────────────
    // ADMIN / DOS PERMISSION CHECK
    // Fix: When exam is created by DOS, ALL admins & authorized heads can see it
    // ──────────────────────────────────────────────────────────────────────────
    const isAdminOrDos = useMemo(() => {
        if (isDos) return true;
        if (!user) return false;
        const role = (user.role || '').toLowerCase();
        const adminRoles = [
            'admin', 'super_admin', 'head_teacher', 'principal', 
            'deputy', 'dos', 'director_of_studies', 'academics_officer', 
            'academic_director'
        ];
        if (adminRoles.includes(role)) return true;
        const userRoles = Array.isArray((user as any).roles) 
            ? (user as any).roles.map((r: any) => String(r).toLowerCase()) 
            : [];
        if (userRoles.some((r: string) => adminRoles.includes(r))) return true;
        if ((user as any).isDos || (user as any).is_dos || (user as any).isAdmin || (user as any).is_admin) return true;
        return false;
    }, [isDos, user]);

    // Subtabs: 'progress' | 'irregularities' | 'history'
    const [activeSubTab, setActiveSubTab] = useState<'progress' | 'irregularities' | 'history'>('progress');

    // UI state
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [marks, setMarks] = useState<Map<string, { marks: number | null; comments: string }>>(new Map());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Broadsheet modal state
    const [broadsheetGrade, setBroadsheetGrade] = useState<string | null>(null);

    // Accordion state: map of grade -> boolean (default expanded)
    const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});

    // Filter states
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // Marks entry local stream filter & search
    const [marksStreamFilter, setMarksStreamFilter] = useState<string>('all');
    const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

    // Audit logs for EDIT HISTORY tab
    const [auditLogs, setAuditLogs] = useState<MarksAuditLog[]>(() => {
        try {
            const instId = user?.institutionId || 'default';
            const saved = localStorage.getItem(`eduai_marks_audit_history_${instId}`);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return [];
    });

    // Teacher's allowed subject IDs
    const allowedSubjectIds = useMemo(() => new Set(allocatedSubjects.map(s => s.id)), [allocatedSubjects]);
    const allowedSubjectNames = useMemo(() => new Set(allocatedSubjects.map(s => s.name.trim().toLowerCase())), [allocatedSubjects]);

    // ──────────────────────────────────────────────────────────────────────────
    // FILTERED ASSESSMENTS
    // Non-admins only see allocated subjects. Admins & DOS see ALL school exams.
    // ──────────────────────────────────────────────────────────────────────────
    const visibleAssessments = useMemo(() => {
        let list = assessments || [];

        // If not Admin or DOS: teachers can ONLY view assigned subjects for marks entry
        if (!isAdminOrDos) {
            list = list.filter(a => {
                if (!a) return false;
                if (allowedSubjectIds.has(a.subjectId)) return true;
                const matchName = a.subjectName || '';
                if (matchName && allowedSubjectNames.has(matchName.trim().toLowerCase())) return true;
                if (a.lecturerId === user.id) return true;
                return false;
            });
        }

        // Filter by Subject if selected
        if (selectedSubjectFilter !== 'all') {
            list = list.filter(a => a.subjectId === selectedSubjectFilter);
        }

        // Filter by Grade if selected
        if (selectedGradeFilter !== 'all') {
            const gClean = selectedGradeFilter.toLowerCase().trim();
            list = list.filter(a => {
                const targetG = (a.grade || a.className || a.targetClass || '').toLowerCase().trim();
                if (targetG) {
                    return targetG.includes(gClean) || gClean.includes(targetG);
                }
                const matchingLevels = courses.flatMap(c => (c.levels || []).filter(l => l.subjectIds && l.subjectIds.includes(a.subjectId)));
                const levelNames = matchingLevels.map(l => (l.name || '').toLowerCase().trim());
                if (levelNames.some(ln => ln && (ln.includes(gClean) || gClean.includes(ln)))) {
                    return true;
                }
                const studentsInGrade = users.filter(u => u.role === 'student' && resolveRealStudentClass(u, [], courses, '').toLowerCase().includes(gClean));
                return studentsInGrade.length > 0;
            });
        }

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(a => 
                a.title.toLowerCase().includes(q) ||
                (a.grade || '').toLowerCase().includes(q) ||
                (a.className || '').toLowerCase().includes(q)
            );
        }

        return list.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
    }, [assessments, isAdminOrDos, allowedSubjectIds, allowedSubjectNames, user.id, selectedSubjectFilter, selectedGradeFilter, searchQuery, courses, users]);

    // ──────────────────────────────────────────────────────────────────────────
    // GROUP ASSESSMENTS BY CLASS / GRADE FOR THE NEW TABLE VIEW
    // ──────────────────────────────────────────────────────────────────────────
    const gradeGroups = useMemo<GradeGroup[]>(() => {
        const gradeMap = new Map<string, Assessment[]>();

        // 1. Distinct grades from visibleAssessments
        visibleAssessments.forEach(a => {
            const g = (a.grade || a.className || a.targetClass || 'Unassigned Grade').trim();
            if (!gradeMap.has(g)) {
                gradeMap.set(g, []);
            }
            gradeMap.get(g)!.push(a);
        });

        // 2. Also ensure teacher's allocatedGrades appear
        if (allocatedGrades && allocatedGrades.length > 0) {
            allocatedGrades.forEach(g => {
                const trimmed = g.trim();
                if (!gradeMap.has(trimmed)) {
                    const matching = visibleAssessments.filter(a => {
                        const target = (a.grade || a.className || a.targetClass || '').toLowerCase().trim();
                        return target.includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(target);
                    });
                    gradeMap.set(trimmed, matching);
                }
            });
        }

        // 3. If empty, extract from student classes
        if (gradeMap.size === 0) {
            const studentClasses = new Set<string>();
            users.filter(u => u.role === 'student').forEach(st => {
                const c = resolveRealStudentClass(st, [], courses, '');
                if (c && c !== 'Unclassified') studentClasses.add(c);
            });
            studentClasses.forEach(c => gradeMap.set(c, []));
        }

        const sortedKeys: string[] = naturalClassSort(Array.from(gradeMap.keys()));

        return sortedKeys.map((gradeName: string): GradeGroup => {
            const papers = gradeMap.get(gradeName) || [];
            
            const gradeClean = gradeName.toLowerCase().trim();
            const studentsInGrade = users.filter(u => {
                if (u.role !== 'student') return false;
                const studentClass = resolveRealStudentClass(u, [], courses, '').toLowerCase().trim();
                return studentClass === gradeClean || studentClass.includes(gradeClean) || gradeClean.includes(studentClass);
            });

            const enrollment = studentsInGrade.length > 0 ? studentsInGrade.length : (papers.length > 0 ? 1 : 0);

            let totalPossibleEntries = 0;
            let totalGradedEntries = 0;

            papers.forEach((paper: Assessment) => {
                const paperMax = studentsInGrade.length > 0 ? studentsInGrade.length : 1;
                totalPossibleEntries += paperMax;

                const gradedCount = (assessmentMarks || []).filter(m => 
                    m.assessmentId === paper.id && m.marks !== null && m.marks !== undefined
                ).length;
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
    }, [visibleAssessments, allocatedGrades, users, courses, assessmentMarks]);

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
    // ELIGIBLE STUDENTS FOR ACTIVE ASSESSMENT (MARKSHEET)
    // ──────────────────────────────────────────────────────────────────────────
    const eligibleStudentsForAssessment = useMemo(() => {
        if (!selectedAssessment) return [];
        const subjectId = selectedAssessment.subjectId;
        const subject = allocatedSubjects.find(s => s.id === subjectId);
        const cleanSubName = (subject?.name || '').toLowerCase().trim();

        const relevantCourseLevelIds = new Set<string>();
        courses.forEach(course => {
            (course.levels || []).forEach(level => {
                if (level.subjectIds && level.subjectIds.includes(subjectId)) {
                    relevantCourseLevelIds.add(level.id);
                }
            });
        });

        const targetGradeClean = (selectedAssessment.grade || selectedAssessment.className || selectedAssessment.targetClass || '').toLowerCase().trim();

        return users.filter(u => {
            if (u.role !== 'student') return false;

            const studentClass = resolveRealStudentClass(u, [], courses, '');
            const studentClassLower = studentClass.toLowerCase();

            if (targetGradeClean && !studentClassLower.includes(targetGradeClean) && !targetGradeClean.includes(studentClassLower)) {
                return false;
            }

            if (!isAdminOrDos && allocatedGrades && allocatedGrades.length > 0) {
                const inAllocatedGrade = allocatedGrades.some(g => {
                    const gLower = g.toLowerCase().trim();
                    return studentClassLower.includes(gLower) || gLower.includes(studentClassLower);
                });
                if (!inAllocatedGrade) return false;
            }

            if (relevantCourseLevelIds.size > 0 && u.courseLevelId && relevantCourseLevelIds.has(u.courseLevelId)) {
                return true;
            }

            const studentSubs: string[] = (u as any).enrolledSubjects || (u as any).subjects || [];
            if (Array.isArray(studentSubs) && studentSubs.length > 0) {
                if (studentSubs.some(s => s === subjectId || (typeof s === 'string' && s.toLowerCase().trim() === cleanSubName))) {
                    return true;
                }
            }

            if (studentClass && studentClass !== 'Unclassified') {
                return true;
            }

            return false;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedAssessment, allocatedSubjects, courses, users, isAdminOrDos, allocatedGrades]);

    // Distinct streams for active assessment
    const distinctStreamsInSelected = useMemo<string[]>(() => {
        const streams = new Set<string>();
        eligibleStudentsForAssessment.forEach(st => {
            const cls = resolveRealStudentClass(st, [], courses, '');
            if (cls && cls !== 'Unclassified') streams.add(cls);
        });
        return naturalClassSort(Array.from(streams));
    }, [eligibleStudentsForAssessment, courses]);

    // Displayed students in marksheet
    const displayedStudentsInMarksEntry = useMemo(() => {
        let list = eligibleStudentsForAssessment;

        if (marksStreamFilter !== 'all') {
            const cleanStream = marksStreamFilter.toLowerCase().trim();
            list = list.filter(st => {
                const cls = resolveRealStudentClass(st, [], courses, '').toLowerCase();
                return cls === cleanStream || cls.includes(cleanStream);
            });
        }

        if (searchStudentQuery.trim()) {
            const q = searchStudentQuery.toLowerCase().trim();
            list = list.filter(st =>
                st.name.toLowerCase().includes(q) ||
                (st.staffId && st.staffId.toLowerCase().includes(q)) ||
                (st.admissionNumber && st.admissionNumber.toLowerCase().includes(q))
            );
        }

        return list;
    }, [eligibleStudentsForAssessment, marksStreamFilter, searchStudentQuery, courses]);

    // Select assessment for marks entry
    const handleSelectAssessment = useCallback((assessment: Assessment) => {
        setSelectedAssessment(assessment);
        setMarksStreamFilter('all');
        setSearchStudentQuery('');
        const initialMarks = new Map<string, { marks: number | null; comments: string }>();
        const existingMarks = (assessmentMarks || []).filter(m => m.assessmentId === assessment.id);
        existingMarks.forEach(mark => {
            initialMarks.set(mark.studentId, { marks: mark.marks, comments: mark.comments || '' });
        });
        setMarks(initialMarks);
    }, [assessmentMarks]);

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

    // Save marks and append to Edit History audit log
    const handleSaveMarks = () => {
        if (!selectedAssessment) return;
        setSaveStatus('saving');
        const marksData = Array.from(marks.entries()).map(([studentId, data]) => ({
            studentId,
            marks: data.marks,
            comments: data.comments,
        }));
        onSaveAssessmentMarks(selectedAssessment.id, marksData);

        // Record entry in Edit History
        try {
            const instId = user?.institutionId || 'default';
            const subject = allocatedSubjects.find(s => s.id === selectedAssessment.subjectId);
            const gradedCount = marksData.filter(m => m.marks !== null).length;
            const newLog: MarksAuditLog = {
                id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                timestamp: new Date().toISOString(),
                assessmentTitle: selectedAssessment.title,
                grade: selectedAssessment.grade || selectedAssessment.className || selectedAssessment.targetClass || 'All Classes',
                subjectName: subject?.name || 'Subject',
                savedBy: user?.name || user?.email || 'Teacher',
                gradedCount,
                totalCount: eligibleStudentsForAssessment.length
            };
            const updatedLogs = [newLog, ...auditLogs].slice(0, 50);
            setAuditLogs(updatedLogs);
            localStorage.setItem(`eduai_marks_audit_history_${instId}`, JSON.stringify(updatedLogs));
        } catch (_) {}

        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        }, 800);
    };

    // Calculate marks statistics for active assessment
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

    // ──────────────────────────────────────────────────────────────────────────
    // IRREGULARITIES & MISSING MARKS CALCULATION
    // ──────────────────────────────────────────────────────────────────────────
    const irregularitiesList = useMemo(() => {
        const issues: Array<{
            id: string;
            student: User;
            assessment: Assessment;
            subjectName: string;
            studentClass: string;
            status: 'missing' | 'incomplete';
        }> = [];

        visibleAssessments.forEach(assessment => {
            const subject = allocatedSubjects.find(s => s.id === assessment.subjectId);
            const targetGrade = (assessment.grade || assessment.className || assessment.targetClass || '').toLowerCase().trim();

            const eligible = users.filter(u => {
                if (u.role !== 'student') return false;
                const sc = resolveRealStudentClass(u, [], courses, '').toLowerCase();
                if (targetGrade && !sc.includes(targetGrade) && !targetGrade.includes(sc)) return false;
                return true;
            });

            eligible.forEach(st => {
                const markObj = (assessmentMarks || []).find(m => m.assessmentId === assessment.id && m.studentId === st.id);
                if (!markObj || markObj.marks === null || markObj.marks === undefined) {
                    issues.push({
                        id: `${assessment.id}_${st.id}`,
                        student: st,
                        assessment,
                        subjectName: subject?.name || 'Subject',
                        studentClass: resolveRealStudentClass(st, [], courses, ''),
                        status: 'missing'
                    });
                }
            });
        });

        return issues;
    }, [visibleAssessments, allocatedSubjects, users, courses, assessmentMarks]);

    // ──────────────────────────────────────────────────────────────────────────
    // BROADSHEET DATA CALCULATION FOR SELECTED GRADE
    // ──────────────────────────────────────────────────────────────────────────
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
                const mark = (assessmentMarks || []).find(m => m.assessmentId === paper.id && m.studentId === st.id);
                if (mark && mark.marks !== null && mark.marks !== undefined) {
                    paperScores[paper.id] = Number(mark.marks);
                    total += Number(mark.marks);
                    gradedCount++;
                } else {
                    paperScores[paper.id] = null;
                }
            });

            const maxPossible = papers.reduce((acc: number, p: Assessment) => acc + (p.maxMarks || 100), 0);
            const averagePct = maxPossible > 0 ? ((total / maxPossible) * 100) : 0;

            return {
                student: st,
                paperScores,
                total,
                averagePct,
                gradedCount
            };
        }).sort((a: BroadsheetStudentRow, b: BroadsheetStudentRow) => b.total - a.total);

        return {
            gradeName: broadsheetGrade,
            papers,
            rows: studentRows
        };
    }, [broadsheetGrade, gradeGroups, assessmentMarks]);

    // Export broadsheet to CSV
    const exportBroadsheetCsv = () => {
        if (!broadsheetData) return;
        const headers = ['Rank', 'Admission No', 'Student Name', ...broadsheetData.papers.map((p: Assessment) => `"${p.title} (/ ${p.maxMarks})"`), 'Total Marks', 'Average %'];
        const csvRows = [headers.join(',')];

        broadsheetData.rows.forEach((r: BroadsheetStudentRow, idx: number) => {
            const paperCols = broadsheetData.papers.map((p: Assessment) => r.paperScores[p.id] !== null ? r.paperScores[p.id] : '-');
            const row = [
                idx + 1,
                `"${r.student.admissionNumber || r.student.staffId || '-'}"`,
                `"${r.student.name}"`,
                ...paperCols,
                r.total,
                `${r.averagePct.toFixed(1)}%`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `broadsheet_${broadsheetData.gradeName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ──────────────────────────────────────────────────────────────────────────
    // MARKS ENTRY VIEW (WHEN AN ASSESSMENT IS OPENED)
    // ──────────────────────────────────────────────────────────────────────────
    if (selectedAssessment) {
        const subject = allocatedSubjects.find(s => s.id === selectedAssessment.subjectId);
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Back Button & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                    <div>
                        <button
                            onClick={() => setSelectedAssessment(null)}
                            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors mb-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Marks Hub
                        </button>
                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                            <span>{selectedAssessment.title}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold capitalize">
                                {selectedAssessment.type}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                            {subject?.name || 'Subject'} ({subject?.code || '—'}) • Out of <strong className="text-slate-800 dark:text-slate-200">{selectedAssessment.maxMarks} marks</strong> • Date: {new Date(selectedAssessment.assessmentDate).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex items-center gap-3 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Learners</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{activeAssessmentStats.total}</p>
                        </div>
                        <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Graded</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{activeAssessmentStats.graded}</p>
                        </div>
                        <div className="text-center px-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average</p>
                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{activeAssessmentStats.avgPercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                {/* In-Sheet Grade / Stream Filter and Search */}
                <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5 text-indigo-500" /> Class:
                            </span>
                            <button
                                onClick={() => setMarksStreamFilter('all')}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                    marksStreamFilter === 'all'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                All Classes ({eligibleStudentsForAssessment.length})
                            </button>
                            {distinctStreamsInSelected.map((stream: string) => {
                                const countInStream = eligibleStudentsForAssessment.filter(st => resolveRealStudentClass(st, [], courses, '') === stream).length;
                                return (
                                    <button
                                        key={stream}
                                        onClick={() => setMarksStreamFilter(stream)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            marksStreamFilter === stream
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        {stream} ({countInStream})
                                    </button>
                                );
                            })}
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search learner..."
                                value={searchStudentQuery}
                                onChange={e => setSearchStudentQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Marks Table */}
                    <div className="border border-slate-100 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#243347] text-white uppercase text-[10px] font-black tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Adm No.</th>
                                    <th className="py-3 px-4">Learner Name</th>
                                    <th className="py-3 px-4">Class</th>
                                    <th className="py-3 px-4 w-32">Score (/ {selectedAssessment.maxMarks})</th>
                                    <th className="py-3 px-4 w-44">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {displayedStudentsInMarksEntry.map((student, idx) => {
                                    const entry = marks.get(student.id) || { marks: null, comments: '' };
                                    const studentClass = resolveRealStudentClass(student, [], courses, '');

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/30">
                                            <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                                                {student.admissionNumber || student.staffId || '—'}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {studentClass}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={selectedAssessment.maxMarks}
                                                    value={entry.marks === null || entry.marks === undefined ? '' : entry.marks}
                                                    onChange={e => handleMarkChange(student.id, e.target.value)}
                                                    placeholder="—"
                                                    className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center text-xs focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="text"
                                                    value={entry.comments}
                                                    onChange={e => handleCommentChange(student.id, e.target.value)}
                                                    placeholder="Teacher's remark..."
                                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}

                                {displayedStudentsInMarksEntry.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            No eligible learners found for the selected filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Save Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-slate-500 font-medium">
                            Graded <strong className="text-slate-900 dark:text-white">{activeAssessmentStats.graded}</strong> out of <strong className="text-slate-900 dark:text-white">{activeAssessmentStats.total}</strong> learners.
                        </div>

                        <div className="flex items-center gap-3">
                            {saveStatus === 'saved' && (
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                                    <CheckIcon className="w-4 h-4" /> Marks Saved Successfully!
                                </span>
                            )}
                            <button
                                onClick={handleSaveMarks}
                                disabled={saveStatus === 'saving'}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {saveStatus === 'saving' ? 'Saving Marks...' : 'Save Marks'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // MAIN MARKS HUB VIEW (MATCHING USER'S SCREENSHOT)
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #1e293b; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
            `}</style>

            {/* Top Bar: Title & Action (New Assessment for Admin / DOS) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Marks Hub</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold uppercase tracking-wider">
                            {visibleAssessments.length} Paper{visibleAssessments.length !== 1 ? 's' : ''}
                        </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {isAdminOrDos ? 'School examination papers, broadsheets and marks entry overview' : 'Record and manage examination scores for your allocated subjects'}
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
                    allocatedGrades={allocatedGrades}
                    onAddAssessment={onAddAssessment}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* SUBTABS BAR MATCHING USER'S SCREENSHOT                     */}
            {/* MARKS ENTRY PROGRESS | IRREGULARITIES / MISSING | EDIT HISTORY */}
            {/* ────────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-8 border-b border-slate-200 dark:border-slate-800 pb-0">
                <button
                    onClick={() => setActiveSubTab('progress')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                        activeSubTab === 'progress'
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    MARKS ENTRY PROGRESS
                </button>
                <button
                    onClick={() => setActiveSubTab('irregularities')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative flex items-center gap-1.5 ${
                        activeSubTab === 'irregularities'
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <span>IRREGULARITIES / MISSING</span>
                    {irregularitiesList.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                            {irregularitiesList.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveSubTab('history')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                        activeSubTab === 'history'
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    EDIT HISTORY
                </button>
            </div>

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 1: MARKS ENTRY PROGRESS TABLE (SCREENSHOT FORMAT)      */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeSubTab === 'progress' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-1 text-slate-400 font-bold uppercase text-[10px]">
                                <Filter className="w-3.5 h-3.5 text-blue-500" /> Grade:
                            </div>
                            <select
                                value={selectedGradeFilter}
                                onChange={e => setSelectedGradeFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs"
                            >
                                <option value="all">All Grades</option>
                                {allocatedGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>

                            <select
                                value={selectedSubjectFilter}
                                onChange={e => setSelectedSubjectFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs"
                            >
                                <option value="all">All Subjects ({allocatedSubjects.length})</option>
                                {allocatedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="relative w-full sm:w-60">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filter paper or grade..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            />
                        </div>
                    </div>

                    {/* Table Container with Dark Navy Header */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {/* Table Header: Dark Navy */}
                        <div className="bg-[#243347] text-white px-6 py-3.5 grid grid-cols-12 items-center text-xs font-black uppercase tracking-wider select-none">
                            <div className="col-span-12 sm:col-span-4 flex items-center gap-2">PAPER</div>
                            <div className="hidden sm:block sm:col-span-3">SUBJECT TEACHER</div>
                            <div className="hidden sm:block sm:col-span-1 text-center">ENROLLMENT</div>
                            <div className="hidden sm:block sm:col-span-3">MARKS ENTRY PROGRESS</div>
                            <div className="hidden sm:block sm:col-span-1 text-right">ACTION</div>
                        </div>

                        {/* Accordion Rows Grouped by Class/Grade */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {gradeGroups.map((group: GradeGroup) => {
                                const isExpanded = !!expandedGrades[group.gradeName];

                                return (
                                    <div key={group.gradeName} className="transition-colors">
                                        {/* Class Summary Row (Matching Screenshot: > Grade 8 2026 | 174 | 0% progress [bar] | View Broadsheet) */}
                                        <div
                                            onClick={() => toggleGradeExpand(group.gradeName)}
                                            className="px-6 py-4 grid grid-cols-12 items-center hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer select-none transition-colors border-b border-slate-100/80 dark:border-slate-800/80"
                                        >
                                            {/* Column 1: Chevron + Grade Name */}
                                            <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); toggleGradeExpand(group.gradeName); }}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                                    )}
                                                </button>
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {group.gradeName}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                    {group.papers.length} Paper{group.papers.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Column 2: Subject Teacher (Blank on Grade Summary Row as shown in screenshot) */}
                                            <div className="hidden sm:block sm:col-span-3 text-slate-400 text-xs">
                                                {/* Left blank per screenshot design */}
                                            </div>

                                            {/* Column 3: Enrollment */}
                                            <div className="hidden sm:block sm:col-span-1 text-center font-bold text-slate-900 dark:text-white text-sm">
                                                {group.enrollment}
                                            </div>

                                            {/* Column 4: Marks Entry Progress (0% progress + Progress Bar) */}
                                            <div className="hidden sm:flex sm:col-span-3 items-center gap-3">
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-20">
                                                    {group.overallProgressPct}% progress
                                                </span>
                                                <div className="w-32 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-1 max-w-[140px]">
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

                                            {/* Column 5: Action (View Broadsheet Link) */}
                                            <div className="hidden sm:block sm:col-span-1 text-right">
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

                                            {/* Mobile Summary Sub-row */}
                                            <div className="sm:hidden col-span-12 flex items-center justify-between pt-2 text-xs">
                                                <span className="text-slate-500 font-medium">
                                                    Enrolled: <strong className="text-slate-800 dark:text-white">{group.enrollment}</strong> • {group.overallProgressPct}%
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBroadsheetGrade(group.gradeName);
                                                    }}
                                                    className="text-blue-600 font-bold"
                                                >
                                                    View Broadsheet
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Papers Under This Grade */}
                                        {isExpanded && (
                                            <div className="bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {group.papers.map((paper: Assessment) => {
                                                    const subject = allocatedSubjects.find(s => s.id === paper.subjectId);
                                                    const teacherUser = users.find(u => u.id === paper.lecturerId);
                                                    const teacherName = teacherUser?.name || 'Assigned Subject Teacher';
                                                    
                                                    const gradedCount = (assessmentMarks || []).filter(m => 
                                                        m.assessmentId === paper.id && m.marks !== null && m.marks !== undefined
                                                    ).length;
                                                    const paperEnrollment = group.enrollment > 0 ? group.enrollment : 1;
                                                    const paperProgressPct = Math.min(100, Math.round((gradedCount / paperEnrollment) * 100));

                                                    return (
                                                        <div
                                                            key={paper.id}
                                                            className="px-6 py-3 pl-12 grid grid-cols-12 items-center hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                        >
                                                            {/* Paper Title & Subject */}
                                                            <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                <div>
                                                                    <p className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                                                        {paper.title}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {subject?.name || 'Subject'} • {paper.type} • {paper.maxMarks} Marks
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Subject Teacher */}
                                                            <div className="hidden sm:block sm:col-span-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                                {teacherName}
                                                            </div>

                                                            {/* Enrollment */}
                                                            <div className="hidden sm:block sm:col-span-1 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                {group.enrollment}
                                                            </div>

                                                            {/* Marks Entry Progress */}
                                                            <div className="hidden sm:flex sm:col-span-3 items-center gap-3">
                                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-20">
                                                                    {paperProgressPct}% ({gradedCount}/{group.enrollment})
                                                                </span>
                                                                <div className="w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-1 max-w-[120px]">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            paperProgressPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                                                        }`}
                                                                        style={{ width: `${paperProgressPct}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Action: Enter Marks / Update Marks */}
                                                            <div className="col-span-12 sm:col-span-1 flex items-center justify-end gap-2 pt-2 sm:pt-0">
                                                                {isAdminOrDos && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (window.confirm(`Are you sure you want to delete "${paper.title}"? Associated student marks will also be deleted.`)) {
                                                                                onDeleteAssessment(paper.id);
                                                                            }
                                                                        }}
                                                                        className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectAssessment(paper)}
                                                                    className="px-3 py-1.5 rounded-lg bg-[#243347] hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    {gradedCount > 0 ? 'Update Marks' : 'Enter Marks'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {group.papers.length === 0 && (
                                                    <div className="px-12 py-4 text-xs text-slate-400">
                                                        No examination papers scheduled for this grade yet.
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
                                        No assessments found
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        {isAdminOrDos
                                            ? 'Click the "+ New Assessment" button above to configure examination papers and tests for the institution.'
                                            : 'Once the Director of Studies or administrator schedules an assessment for your assigned subjects, it will appear here.'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 2: IRREGULARITIES / MISSING MARKS                      */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeSubTab === 'irregularities' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <div>
                                <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-200 tracking-wider">
                                    Missing Marks & Irregularities Alert
                                </h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Identifies enrolled learners who do not have examination scores recorded for scheduled papers.
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-amber-600 text-white font-black text-xs">
                            {irregularitiesList.length} Missing Record{irregularitiesList.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#243347] text-white uppercase text-[10px] font-black tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Adm No.</th>
                                    <th className="py-3 px-4">Learner Name</th>
                                    <th className="py-3 px-4">Class</th>
                                    <th className="py-3 px-4">Exam Paper</th>
                                    <th className="py-3 px-4">Subject</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {irregularitiesList.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                                            {item.student.admissionNumber || item.student.staffId || '—'}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            {item.student.name}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {item.studentClass}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                            {item.assessment.title}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500">
                                            {item.subjectName}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60">
                                                Marks Missing
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleSelectAssessment(item.assessment)}
                                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors"
                                            >
                                                Enter Mark
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {irregularitiesList.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                            <p className="font-bold text-slate-700 dark:text-slate-300">No Missing Marks Detected</p>
                                            <p className="text-xs text-slate-400">All enrolled learners have marks recorded for current papers.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* TAB 3: EDIT HISTORY                                        */}
            {/* ────────────────────────────────────────────────────────── */}
            {activeSubTab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#243347] text-white uppercase text-[10px] font-black tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Assessment / Paper</th>
                                    <th className="py-3 px-4">Grade</th>
                                    <th className="py-3 px-4">Subject</th>
                                    <th className="py-3 px-4">Recorded By</th>
                                    <th className="py-3 px-4">Records Graded</th>
                                    <th className="py-3 px-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-3 px-4 font-mono text-slate-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            {log.assessmentTitle}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {log.grade}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500">
                                            {log.subjectName}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                            {log.savedBy}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            {log.gradedCount} / {log.totalCount} Learners
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                                                Saved & Synced
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {auditLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                            <p className="font-bold text-slate-700 dark:text-slate-300">No Edit History Recorded Yet</p>
                                            <p className="text-xs text-slate-400">When teachers or admins enter and save marks, audit records will appear here.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* VIEW BROADSHEET MODAL                                      */}
            {/* ────────────────────────────────────────────────────────── */}
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
