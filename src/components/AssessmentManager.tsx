import React, { useState, useMemo, useCallback } from 'react';
import type { User, Assessment, AssessmentMark, Subject, Course, AssessmentType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { resolveRealStudentClass, naturalClassSort } from '../utils/academicUtils';
import { 
    BookOpen, CheckCircle2, ChevronLeft, Filter, GraduationCap, 
    Layers, Search, ShieldAlert, Sparkles, UserCheck, AlertCircle
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
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [marks, setMarks] = useState<Map<string, { marks: number | null; comments: string }>>(new Map());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Filter states
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
    
    // Marks entry local stream filter & search
    const [marksStreamFilter, setMarksStreamFilter] = useState<string>('all');
    const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

    // Teacher's allowed subject IDs
    const allowedSubjectIds = useMemo(() => new Set(allocatedSubjects.map(s => s.id)), [allocatedSubjects]);
    const allowedSubjectNames = useMemo(() => new Set(allocatedSubjects.map(s => s.name.trim().toLowerCase())), [allocatedSubjects]);

    // Filtered list of assessments for this user
    const visibleAssessments = useMemo(() => {
        let list = assessments || [];

        // REQUIREMENT: Teachers can ONLY view assigned subjects for marks entry
        if (!isDos) {
            list = list.filter(a => {
                if (!a) return false;
                if (allowedSubjectIds.has(a.subjectId)) return true;
                const matchName = (a as any).subjectName || '';
                if (matchName && allowedSubjectNames.has(matchName.trim().toLowerCase())) return true;
                if (a.lecturerId === user.id) return true;
                return false;
            });
        }

        // Filter by Subject if selected
        if (selectedSubjectFilter !== 'all') {
            list = list.filter(a => a.subjectId === selectedSubjectFilter);
        }

        // REQUIREMENT: He can filter per grade based on allocated subjects
        if (selectedGradeFilter !== 'all') {
            const gClean = selectedGradeFilter.toLowerCase().trim();
            list = list.filter(a => {
                const targetG = (a.grade || a.className || (a as any).targetClass || '').toLowerCase().trim();
                if (targetG) {
                    return targetG.includes(gClean) || gClean.includes(targetG);
                }
                // If assessment has no explicit target grade, check if the assessment's subject is taught in selectedGradeFilter
                const matchingLevels = courses.flatMap(c => (c.levels || []).filter(l => l.subjectIds && l.subjectIds.includes(a.subjectId)));
                const levelNames = matchingLevels.map(l => (l.name || '').toLowerCase().trim());
                if (levelNames.some(ln => ln && (ln.includes(gClean) || gClean.includes(ln)))) {
                    return true;
                }
                // Or check if students in selectedGradeFilter are enrolled in this subject
                const studentsInGrade = users.filter(u => u.role === 'student' && resolveRealStudentClass(u, [], courses, '').toLowerCase().includes(gClean));
                return studentsInGrade.length > 0;
            });
        }

        return list.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
    }, [assessments, isDos, allowedSubjectIds, allowedSubjectNames, user.id, selectedSubjectFilter, selectedGradeFilter, courses, users]);

    // Extract all students eligible for the selected assessment
    const eligibleStudentsForAssessment = useMemo(() => {
        if (!selectedAssessment) return [];
        const subjectId = selectedAssessment.subjectId;
        const subject = allocatedSubjects.find(s => s.id === subjectId);
        const cleanSubName = (subject?.name || '').toLowerCase().trim();

        // 1. Course levels containing this subject
        const relevantCourseLevelIds = new Set<string>();
        courses.forEach(course => {
            (course.levels || []).forEach(level => {
                if (level.subjectIds && level.subjectIds.includes(subjectId)) {
                    relevantCourseLevelIds.add(level.id);
                }
            });
        });

        const targetGradeClean = (selectedAssessment.grade || selectedAssessment.className || (selectedAssessment as any).targetClass || '').toLowerCase().trim();

        return users.filter(u => {
            if (u.role !== 'student') return false;

            const studentClass = resolveRealStudentClass(u, [], courses, '');
            const studentClassLower = studentClass.toLowerCase();

            // Check assessment grade restriction if any
            if (targetGradeClean && !studentClassLower.includes(targetGradeClean) && !targetGradeClean.includes(studentClassLower)) {
                return false;
            }

            // If user is a teacher (not DOS) and has allocated grades, filter to teacher's allocated grades
            if (!isDos && allocatedGrades && allocatedGrades.length > 0) {
                const inAllocatedGrade = allocatedGrades.some(g => {
                    const gLower = g.toLowerCase().trim();
                    return studentClassLower.includes(gLower) || gLower.includes(studentClassLower);
                });
                if (!inAllocatedGrade) return false;
            }

            // If assessment is filtered by grade in UI, check that
            if (selectedGradeFilter !== 'all') {
                const gFilter = selectedGradeFilter.toLowerCase().trim();
                if (!studentClassLower.includes(gFilter) && !gFilter.includes(studentClassLower)) {
                    return false;
                }
            }

            // Direct courseLevel match
            if (relevantCourseLevelIds.size > 0 && u.courseLevelId && relevantCourseLevelIds.has(u.courseLevelId)) {
                return true;
            }

            // Direct student enrolled subjects match
            const studentSubs: string[] = (u as any).enrolledSubjects || (u as any).subjects || [];
            if (Array.isArray(studentSubs) && studentSubs.length > 0) {
                if (studentSubs.some(s => s === subjectId || (typeof s === 'string' && s.toLowerCase().trim() === cleanSubName))) {
                    return true;
                }
            }

            // If student has a genuine class assigned
            if (studentClass && studentClass !== 'Unclassified') {
                return true;
            }

            return false;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedAssessment, allocatedSubjects, courses, users, isDos, allocatedGrades, selectedGradeFilter]);

    // Distinct streams/classes among eligible students for in-sheet filter
    const distinctStreamsInSelected = useMemo(() => {
        const streams = new Set<string>();
        eligibleStudentsForAssessment.forEach(st => {
            const cls = resolveRealStudentClass(st, [], courses, '');
            if (cls && cls !== 'Unclassified') streams.add(cls);
        });
        return naturalClassSort(Array.from(streams));
    }, [eligibleStudentsForAssessment, courses]);

    // Filtered students for display in marks entry table
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

    // Select assessment for entering marks
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

    const handleSaveMarks = () => {
        if (!selectedAssessment) return;
        setSaveStatus('saving');
        const marksData = Array.from(marks.entries()).map(([studentId, data]) => ({
            studentId,
            marks: data.marks,
            comments: data.comments,
        }));
        onSaveAssessmentMarks(selectedAssessment.id, marksData);
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        }, 800);
    };

    // Calculate marks statistics for active assessment
    const activeAssessmentStats = useMemo(() => {
        if (!selectedAssessment) return { total: 0, graded: 0, average: 0 };
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
    // MARKS ENTRY VIEW
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
                            <ChevronLeft className="w-4 h-4" /> Back to Assessments
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
                        {/* Class / Stream Switcher Pills */}
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
                            {distinctStreamsInSelected.map(stream => {
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

                        {/* Search Input */}
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                value={searchStudentQuery}
                                onChange={e => setSearchStudentQuery(e.target.value)}
                                placeholder="Search learner..."
                                className="form-input text-xs pl-9 py-2 rounded-xl"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        </div>
                    </div>

                    {/* Marks Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-850">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">#</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Learner Name & Admission</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Grade / Stream</th>
                                    <th className="w-36 px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Score (/{selectedAssessment.maxMarks})</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Teacher Remarks / Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-slate-750 bg-white dark:bg-slate-800">
                                {displayedStudentsInMarksEntry.map((student, idx) => {
                                    const studentMark = marks.get(student.id);
                                    const studentClass = resolveRealStudentClass(student, [], courses, '—');
                                    const currentScore = studentMark?.marks;
                                    const pct = currentScore !== null && currentScore !== undefined ? Math.round((currentScore / selectedAssessment.maxMarks) * 100) : null;

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors">
                                            <td className="px-5 py-3 text-xs font-mono font-bold text-slate-400">{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{student.name}</p>
                                                <p className="text-[10px] font-mono text-slate-400">{student.staffId || student.admissionNumber || 'Adm #'}</p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                    {studentClass}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={currentScore ?? ''}
                                                        onChange={e => handleMarkChange(student.id, e.target.value)}
                                                        min="0"
                                                        max={selectedAssessment.maxMarks}
                                                        className={`form-input text-xs font-black w-20 text-center py-1.5 rounded-xl ${
                                                            currentScore !== null && currentScore !== undefined
                                                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                                                                : 'border-slate-300 dark:border-slate-600'
                                                        }`}
                                                        placeholder={`/ ${selectedAssessment.maxMarks}`}
                                                    />
                                                    {pct !== null && (
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                                            pct >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                            pct >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                        }`}>
                                                            {pct}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <input
                                                    type="text"
                                                    value={studentMark?.comments || ''}
                                                    onChange={e => handleCommentChange(student.id, e.target.value)}
                                                    className="form-input text-xs py-1.5 rounded-xl w-full"
                                                    placeholder="e.g., Exceeds Expectations, Great improvement..."
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}

                                {displayedStudentsInMarksEntry.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                            No learners found matching the selected class or search filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-150 dark:border-slate-700/60">
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
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
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
    // ASSESSMENTS LIST VIEW
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #1e293b; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
            `}</style>

            {/* Header: Title + DOS Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{isDos ? 'Assessments & Examination Papers' : 'My Assigned Assessments'}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold uppercase tracking-wider">
                            {visibleAssessments.length} Paper{visibleAssessments.length !== 1 ? 's' : ''}
                        </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {isDos ? 'Director of Studies (DOS) exam scheduler and paper manager' : 'Enter marks for your allocated subjects and student grade levels'}
                    </p>
                </div>

                {/* REQUIREMENT: new assessment tab should only be seen by the dos */}
                {isDos && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto"
                    >
                        <PlusIcon className="w-4 h-4" /> New Assessment
                    </button>
                )}
            </div>

            {/* New Assessment Form (DOS ONLY) */}
            {isAdding && isDos && (
                <NewAssessmentForm
                    user={user}
                    allocatedSubjects={allocatedSubjects}
                    allocatedGrades={allocatedGrades}
                    onAddAssessment={onAddAssessment}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            {/* Filters Bar: Filter per Grade & Subject based on Allocated Subjects */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Filter className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Filter Allocated Load</span>
                    </div>

                    {(selectedSubjectFilter !== 'all' || selectedGradeFilter !== 'all') && (
                        <button
                            onClick={() => { setSelectedSubjectFilter('all'); setSelectedGradeFilter('all'); }}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Subject Filter */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Assigned Subject
                        </label>
                        <select
                            value={selectedSubjectFilter}
                            onChange={e => setSelectedSubjectFilter(e.target.value)}
                            className="form-select text-xs py-2 rounded-xl"
                        >
                            <option value="all">All Allocated Subjects ({allocatedSubjects.length})</option>
                            {allocatedSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* REQUIREMENT: Filter per grade based on allocated subjects */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Grade / Class Level
                        </label>
                        <select
                            value={selectedGradeFilter}
                            onChange={e => setSelectedGradeFilter(e.target.value)}
                            className="form-select text-xs py-2 rounded-xl"
                        >
                            <option value="all">All Allocated Grades ({allocatedGrades.length})</option>
                            {allocatedGrades.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Grade Quick Filter Pills */}
                {allocatedGrades.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button
                            onClick={() => setSelectedGradeFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                selectedGradeFilter === 'all'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200/50 dark:border-slate-700/50'
                            }`}
                        >
                            All Grades
                        </button>
                        {allocatedGrades.slice(0, 8).map(grade => (
                            <button
                                key={grade}
                                onClick={() => setSelectedGradeFilter(grade)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    selectedGradeFilter === grade
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200/50 dark:border-slate-700/50'
                                }`}
                            >
                                {grade}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Assessment Cards List */}
            <div className="bg-white dark:bg-slate-800/80 shadow-sm rounded-3xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
                <ul className="divide-y divide-slate-150 dark:divide-slate-750">
                    {visibleAssessments.map(assessment => {
                        const subject = allocatedSubjects.find(s => s.id === assessment.subjectId);
                        const marksCount = (assessmentMarks || []).filter(m => m.assessmentId === assessment.id && m.marks !== null).length;
                        const targetG = assessment.grade || assessment.className || (assessment as any).targetClass;

                        return (
                            <li key={assessment.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{assessment.title}</p>
                                        <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/40">
                                            {assessment.type}
                                        </span>
                                        {targetG && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                                                <GraduationCap className="w-3 h-3" /> {targetG}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                            {subject ? `${subject.name} (${subject.code})` : 'Assigned Subject'}
                                        </span>
                                        <span>Date: {new Date(assessment.assessmentDate).toLocaleDateString()}</span>
                                        <span>Max Marks: <strong className="text-slate-700 dark:text-slate-200">{assessment.maxMarks}</strong></span>
                                        {marksCount > 0 ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> {marksCount} Marks Entered
                                            </span>
                                        ) : (
                                            <span className="text-amber-500 font-medium">Pending Marks Entry</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-shrink-0 flex items-center gap-2.5 self-end sm:self-center">
                                    {isDos && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete the assessment "${assessment.title}"? All associated student marks will also be deleted.`)) {
                                                    onDeleteAssessment(assessment.id);
                                                }
                                            }}
                                            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleSelectAssessment(assessment)}
                                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>{marksCount > 0 ? 'Update Marks' : 'Enter Marks'}</span>
                                    </button>
                                </div>
                            </li>
                        );
                    })}

                    {visibleAssessments.length === 0 && (
                        <li className="p-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                {isDos ? 'No assessments found' : 'No assessments scheduled for your allocated subjects'}
                            </p>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                {isDos 
                                    ? 'Click the "+ New Assessment" button above to configure examination papers and tests for the institution.'
                                    : 'Once the Director of Studies (DOS) schedules an assessment for your assigned subjects and grades, it will appear here for marks entry.'
                                }
                            </p>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};
