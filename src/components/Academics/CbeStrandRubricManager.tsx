import type { 
    Institution, User, Subject, Course, AcademicLevel, CbeRubricLevel, CbeStrand, CbeSubStrand, CbeLearningOutcomeAssessment 
} from '../../types';
import { apiService } from '../../services/apiService';
import { 
    Sparkles, BookOpen, Layers, CheckCircle2, AlertCircle, RefreshCw, 
    Printer, Download, Plus, Search, Filter, ShieldCheck, UserCheck, 
    ChevronRight, Award, Sliders, HelpCircle, Edit3, Save, Check
} from 'lucide-react';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';

import { resolveRealStudentAdmNo } from '../../utils/academicUtils';

export interface CbeStrandRubricManagerProps {
    currentInstitution?: Institution | null;
    subjects?: Subject[];
    users?: User[]; // Contains students & teachers
    courses?: Course[];
    academicLevels?: AcademicLevel[];
    currentUser?: User;
    onLogAction?: (action: string) => Promise<void> | void;
}

// ── DEFAULT KICD/CBE STRAND TEMPLATES FOR PRIMARY & JUNIOR SCHOOLS ──
const PRESET_CBE_STRANDS: Record<string, CbeStrand[]> = {
    'mathematics': [
        {
            id: 'str_math_1',
            subjectId: 'math',
            name: 'NUMERACY & NUMBERS',
            code: 'STR-1.0',
            subStrands: [
                { id: 'sub_math_1_1', name: 'Number Concept & Counting (1-100)', learningOutcomes: ['Counts numbers up to 100 accurately', 'Identifies place values of tens and ones'] },
                { id: 'sub_math_1_2', name: 'Addition & Subtraction with Re-Grouping', learningOutcomes: ['Adds two-digit numbers with carrying', 'Solves real-life subtraction word problems'] },
                { id: 'sub_math_1_3', name: 'Fractions & Equal Sharing', learningOutcomes: ['Identifies half, quarter and third fractions', 'Shares objects equally among peers'] }
            ]
        },
        {
            id: 'str_math_2',
            subjectId: 'math',
            name: 'GEOMETRY & MEASUREMENT',
            code: 'STR-2.0',
            subStrands: [
                { id: 'sub_math_2_1', name: 'Length, Mass & Capacity Measurement', learningOutcomes: ['Measures length using standard meters', 'Estimates weight in kilograms'] },
                { id: 'sub_math_2_2', name: 'Money, Shopping & Currency Exchange', learningOutcomes: ['Calculates total bill in Kenya Shillings', 'Gives correct change in school store scenarios'] }
            ]
        }
    ],
    'language': [
        {
            id: 'str_lang_1',
            subjectId: 'lang',
            name: 'LISTENING & SPEAKING',
            code: 'STR-1.0',
            subStrands: [
                { id: 'sub_lang_1_1', name: 'Phonological Awareness & Pronunciation', learningOutcomes: ['Pronounces letter sounds correctly', 'Identifies rhyming words in stories'] },
                { id: 'sub_lang_1_2', name: 'Oral Expression & Storytelling', learningOutcomes: ['Expresses ideas clearly using complete sentences', 'Retells stories sequentially'] }
            ]
        },
        {
            id: 'str_lang_2',
            subjectId: 'lang',
            name: 'READING & LITERACY',
            code: 'STR-2.0',
            subStrands: [
                { id: 'sub_lang_2_1', name: 'Reading Fluency & Vocabulary', learningOutcomes: ['Reads grade-level passages fluently', 'Uses new vocabulary words accurately'] }
            ]
        }
    ],
    'science': [
        {
            id: 'str_sci_1',
            subjectId: 'sci',
            name: 'LIVING THINGS & ENVIRONMENT',
            code: 'STR-1.0',
            subStrands: [
                { id: 'sub_sci_1_1', name: 'Plants & Animals in Local Habitat', learningOutcomes: ['Identifies parts of a flowering plant', 'Categorizes domestic and wild animals'] },
                { id: 'sub_sci_1_2', name: 'Human Body & Hygiene Practices', learningOutcomes: ['Practices proper handwashing & dental hygiene', 'Identifies sensory organs and functions'] }
            ]
        }
    ]
};

export const CbeStrandRubricManager: React.FC<CbeStrandRubricManagerProps> = ({
    currentInstitution,
    subjects = [],
    users = [],
    courses = [],
    academicLevels = [],
    currentUser,
    onLogAction
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Hydrated real students list from database
    const [fetchedStudents, setFetchedStudents] = useState<any[]>([]);
    const [fetchedLevels, setFetchedLevels] = useState<any[]>([]);
    const [fetchedCourses, setFetchedCourses] = useState<any[]>([]);

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('student_enrollments', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('students', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('users', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('academic_levels', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('courses', currentInstitution.id).catch(() => [])
            ]).then(([enrRecords, stRecords, userRecords, lvlRecords, courseRecords]) => {
                if (lvlRecords && lvlRecords.length > 0) setFetchedLevels(lvlRecords);
                if (courseRecords && courseRecords.length > 0) setFetchedCourses(courseRecords);

                const userById = new Map<string, any>();
                [...(stRecords || []), ...(userRecords || []), ...(users || [])].forEach(u => {
                    if (u?.id) userById.set(u.id, u);
                    if (u?.userId) userById.set(u.userId, u);
                });

                const list: any[] = [];
                const seenIds = new Set<string>();

                (enrRecords || []).forEach((enr: any) => {
                    if (!enr) return;
                    const linkedUser = (enr.userId ? userById.get(enr.userId) : null) || (enr.user_id ? userById.get(enr.user_id) : null);
                    const resolvedName =
                        (linkedUser?.name && !linkedUser.name.toLowerCase().startsWith('student ') ? linkedUser.name : null) ||
                        enr.metadata?.studentName ||
                        enr.metadata?.name ||
                        enr.metadata?.fullName ||
                        linkedUser?.name ||
                        enr.name ||
                        '';
                    const resolvedAdm = resolveRealStudentAdmNo(enr, undefined, [...(stRecords || []), ...(userRecords || []), ...(users || [])]) ||
                        resolveRealStudentAdmNo(linkedUser, undefined);
                    const resolvedClass =
                        enr.metadata?.gradeLevel || enr.metadata?.studentClass || enr.metadata?.class ||
                        linkedUser?.studentClass || linkedUser?.classLevel || linkedUser?.grade ||
                        enr.studentClass || enr.gradeLevel || enr.grade || '';

                    const idKey = enr.userId || enr.id;
                    if (idKey && !seenIds.has(idKey)) {
                        seenIds.add(idKey);
                        list.push({
                            ...enr,
                            id: idKey,
                            name: resolvedName,
                            admissionNumber: resolvedAdm !== 'N/A' ? resolvedAdm : enr.admissionNumber,
                            studentClass: resolvedClass,
                            role: 'student'
                        });
                    }
                });

                // Also include user records with role=student
                [...(stRecords || []), ...(userRecords || []), ...(users || [])].forEach(u => {
                    if (u && u.role === 'student') {
                        const idKey = u.id;
                        if (idKey && !seenIds.has(idKey)) {
                            seenIds.add(idKey);
                            const adm = resolveRealStudentAdmNo(u, undefined, enrRecords);
                            list.push({
                                ...u,
                                admissionNumber: adm !== 'N/A' ? adm : u.admissionNumber
                            });
                        }
                    }
                });

                if (list.length > 0) {
                    setFetchedStudents(list);
                }
            }).catch(() => { });
        }
    }, [currentInstitution, users]);

    // 1. Class & Subject Selection State
    const allStudents = useMemo(() => {
        if (fetchedStudents.length > 0) return fetchedStudents;
        return (users || []).filter(u => u && u.role === 'student');
    }, [users, fetchedStudents]);
    const allTeachers = useMemo(() => (users || []).filter(u => u && (u.role === 'teacher' || u.role === 'lecturer' || u.role === 'class_supervisor')), [users]);

    // Extract available classes across all sources
    const classList = useMemo(() => {
        const set = new Set<string>();

        // 1. Levels from props & DB
        [...(academicLevels || []), ...fetchedLevels].forEach(l => {
            if (l && l.name) set.add(l.name.trim());
        });

        // 2. Courses & Sub-streams from props & DB
        [...(courses || []), ...fetchedCourses].forEach(c => {
            if (c && c.name) {
                set.add(c.name.trim());
                (c.levels || []).forEach((l: any) => {
                    if (l && l.name) {
                        set.add(`${c.name.trim()} (${l.name.trim()})`);
                        set.add(`${c.name.trim()} ${l.name.trim()}`);
                    }
                });
            }
        });

        // 3. Classes from Enrolled Students
        allStudents.forEach(s => {
            const cl = s.studentClass || (s as any).classLevel || (s as any).class_name || (s as any).className || (s as any).class || (s as any).grade || (s as any).gradeLevel || s.metadata?.studentClass || s.metadata?.gradeLevel;
            if (cl && typeof cl === 'string' && !cl.startsWith('lvl_') && !cl.startsWith('c_')) {
                set.add(cl.trim());
            }
        });

        // 4. Ensure standard Kenya CBC / 8-4-4 grades are available
        const defaultCBC = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
        defaultCBC.forEach(c => set.add(c));

        // Sort smartly
        const sorted = Array.from(set).sort((a, b) => {
            const getRank = (str: string) => {
                const lower = str.toLowerCase();
                if (lower.startsWith('pp1') || lower.startsWith('playgroup')) return 1;
                if (lower.startsWith('pp2')) return 2;
                const gMatch = lower.match(/grade\s*(\d+)/);
                if (gMatch) return 10 + parseInt(gMatch[1], 10);
                const fMatch = lower.match(/form\s*(\d+)/);
                if (fMatch) return 30 + parseInt(fMatch[1], 10);
                return 50;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
        });

        return ['All Classes', ...sorted];
    }, [courses, fetchedCourses, academicLevels, fetchedLevels, allStudents]);

    const [selectedClass, setSelectedClass] = useState<string>('All Classes');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'sub_math');
    const [selectedStrandId, setSelectedStrandId] = useState<string>('');
    const [selectedSubStrandId, setSelectedSubStrandId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Filtered Students for selected class
    const classStudents = useMemo(() => {
        return allStudents.filter((s, idx) => {
            const stClass = (s.studentClass || (s as any).classLevel || (s as any).class_name || (s as any).className || (s as any).class || s.metadata?.studentClass || '').toLowerCase().trim();
            const selClean = (selectedClass || '').toLowerCase().trim();
            const matchesClass = !selClean || selClean === 'all' || stClass.includes(selClean) || selClean.includes(stClass) || allStudents.length <= 10;
            const q = searchQuery.toLowerCase();
            const adm = resolveRealStudentAdmNo(s, idx, fetchedStudents).toLowerCase();
            const matchesQuery = !q || (s.name || '').toLowerCase().includes(q) || adm.includes(q);
            return matchesClass && matchesQuery;
        });
    }, [allStudents, selectedClass, searchQuery, fetchedStudents]);

    // Active Subject object
    const selectedSubject = useMemo(() => {
        return subjects.find(s => s.id === selectedSubjectId) || subjects[0] || { id: 'sub_math', name: 'Mathematical Activities', code: 'MATH-CBE' };
    }, [subjects, selectedSubjectId]);

    // Active Strands list for selected subject
    const strandsList = useMemo(() => {
        if (selectedSubject.cbeStrands && selectedSubject.cbeStrands.length > 0) {
            return selectedSubject.cbeStrands;
        }
        const nameLower = (selectedSubject.name || '').toLowerCase();
        if (nameLower.includes('lang') || nameLower.includes('english') || nameLower.includes('kiswahili')) {
            return PRESET_CBE_STRANDS['language'];
        }
        if (nameLower.includes('sci') || nameLower.includes('env') || nameLower.includes('tech')) {
            return PRESET_CBE_STRANDS['science'];
        }
        return PRESET_CBE_STRANDS['mathematics'];
    }, [selectedSubject]);

    // Set initial active strand & sub-strand
    useEffect(() => {
        if (strandsList.length > 0) {
            const firstStrand = strandsList[0];
            setSelectedStrandId(firstStrand.id);
            if (firstStrand.subStrands && firstStrand.subStrands.length > 0) {
                setSelectedSubStrandId(firstStrand.subStrands[0].id);
            }
        }
    }, [selectedSubjectId, strandsList]);

    const activeStrand = useMemo(() => {
        return strandsList.find(s => s.id === selectedStrandId) || strandsList[0];
    }, [strandsList, selectedStrandId]);

    const activeSubStrand = useMemo(() => {
        return activeStrand?.subStrands?.find(ss => ss.id === selectedSubStrandId) || activeStrand?.subStrands?.[0];
    }, [activeStrand, selectedSubStrandId]);

    // Local Storage & API Assessment Records State (Key: `${instId}_cbe_assessments_${selectedSubjectId}_${selectedSubStrandId}`)
    const [assessmentsMap, setAssessmentsMap] = useState<Record<string, { score: CbeRubricLevel; remarks: string }>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_cbe_rubrics_${instId}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

    // Save Assessment for a student
    const handleUpdateRubric = (studentId: string, score: CbeRubricLevel, remarks?: string) => {
        const key = `${selectedSubjectId}_${selectedSubStrandId}_${studentId}`;
        setAssessmentsMap(prev => {
            const current = prev[key] || { score: 'ME', remarks: '' };
            const updated = {
                ...prev,
                [key]: {
                    score,
                    remarks: remarks !== undefined ? remarks : (current.remarks || getDefaultRemarkForScore(score))
                }
            };
            localStorage.setItem(`eduai_cbe_rubrics_${instId}`, JSON.stringify(updated));
            return updated;
        });
    };

    const handleUpdateRemark = (studentId: string, remarks: string) => {
        const key = `${selectedSubjectId}_${selectedSubStrandId}_${studentId}`;
        setAssessmentsMap(prev => {
            const current = prev[key] || { score: 'ME', remarks: '' };
            const updated = {
                ...prev,
                [key]: { ...current, remarks }
            };
            localStorage.setItem(`eduai_cbe_rubrics_${instId}`, JSON.stringify(updated));
            return updated;
        });
    };

    // Mass Action: Batch set entire class score
    const handleBatchMarkScore = (score: CbeRubricLevel) => {
        setAssessmentsMap(prev => {
            const updated = { ...prev };
            classStudents.forEach(s => {
                const key = `${selectedSubjectId}_${selectedSubStrandId}_${s.id}`;
                updated[key] = {
                    score,
                    remarks: getDefaultRemarkForScore(score)
                };
            });
            localStorage.setItem(`eduai_cbe_rubrics_${instId}`, JSON.stringify(updated));
            return updated;
        });
        setSaveSuccessMsg(`Batch marked all ${classStudents.length} students as ${score}!`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
    };

    // Save All Assessments to Backend API
    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // Save local assessment records into database / local DB store
            const recordsToSave: CbeLearningOutcomeAssessment[] = [];
            classStudents.forEach(s => {
                const key = `${selectedSubjectId}_${selectedSubStrandId}_${s.id}`;
                const data = assessmentsMap[key];
                if (data) {
                    recordsToSave.push({
                        id: `cbe_rec_${Date.now()}_${s.id}`,
                        institutionId: instId,
                        studentId: s.id,
                        subjectId: selectedSubjectId,
                        strandId: activeStrand?.id || '',
                        subStrandId: activeSubStrand?.id || '',
                        learningOutcomeText: activeSubStrand?.learningOutcomes?.[0] || activeSubStrand?.name,
                        rubricScore: data.score,
                        teacherRemarks: data.remarks,
                        assessedByTeacherId: currentUser?.id || '',
                        assessedAt: new Date().toISOString()
                    });
                }
            });

            await apiService.saveModuleRecords('cbe_outcome_assessments', recordsToSave);
            onLogAction?.(`Saved CBE Formative Learning Rubrics for ${selectedClass} - ${selectedSubject.name}`);
            setSaveSuccessMsg(`Formative Assessment Rubrics saved successfully! (${recordsToSave.length} records)`);
            setTimeout(() => setSaveSuccessMsg(null), 4000);
        } catch (e: any) {
            console.error(e);
            setSaveSuccessMsg(`Saved locally! (${classStudents.length} student records)`);
            setTimeout(() => setSaveSuccessMsg(null), 4000);
        } finally {
            setIsSaving(false);
        }
    };

    // Class Competency Distribution Metrics
    const metrics = useMemo(() => {
        let ee = 0, me = 0, ae = 0, be = 0;
        classStudents.forEach(s => {
            const key = `${selectedSubjectId}_${selectedSubStrandId}_${s.id}`;
            const score = assessmentsMap[key]?.score || 'ME';
            if (score === 'EE') ee++;
            else if (score === 'ME') me++;
            else if (score === 'AE') ae++;
            else if (score === 'BE') be++;
        });
        const total = classStudents.length || 1;
        return {
            ee, me, ae, be, total,
            eePct: Math.round((ee / total) * 100),
            mePct: Math.round((me / total) * 100),
            aePct: Math.round((ae / total) * 100),
            bePct: Math.round((be / total) * 100)
        };
    }, [classStudents, assessmentsMap, selectedSubjectId, selectedSubStrandId]);

    return (
        <div className="space-y-6 text-left font-sans text-slate-900 dark:text-slate-100 no-print">
            {/* ── HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-emerald-950 via-teal-950 to-indigo-950 p-6 md:p-8 text-white border border-emerald-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/50">
                                Competency Based Curriculum (CBC / CBE) • Formative Rubrics
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Award className="w-8 h-8 text-emerald-400" />
                            <span>Strand & Sub-Strand Assessment Matrix</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Assess learner competencies against specific learning outcomes using 4-Level Ministry Standards (EE, ME, AE, BE).
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'Saving Rubrics...' : 'Save Assessment Rubrics'}</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-all cursor-pointer"
                            title="Print Formative Rubric Register"
                        >
                            <Printer className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Success Alert Notification */}
            {saveSuccessMsg && (
                <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-xl animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                </div>
            )}

            {/* ── KPI METRICS: CLASS COMPETENCY DISTRIBUTION ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-950 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block">Exceeding (EE - 4)</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{metrics.ee} <span className="text-xs font-bold text-slate-400 font-mono">({metrics.eePct}%)</span></span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-blue-100 dark:border-blue-950 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-blue-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">Meeting (ME - 3)</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{metrics.me} <span className="text-xs font-bold text-slate-400 font-mono">({metrics.mePct}%)</span></span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-amber-100 dark:border-amber-950 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 block">Approaching (AE - 2)</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{metrics.ae} <span className="text-xs font-bold text-slate-400 font-mono">({metrics.aePct}%)</span></span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-rose-100 dark:border-rose-950 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 block">Below (BE - 1)</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{metrics.be} <span className="text-xs font-bold text-slate-400 font-mono">({metrics.bePct}%)</span></span>
                </div>
            </div>

            {/* ── FILTER CONTROL BAR: CLASS, SUBJECT & STRAND SELECTORS ── */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Class Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Target Class / Stream</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {classList.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    {/* Learning Area / Subject Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Learning Area / Subject</label>
                        <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code || 'CBE'})</option>
                            ))}
                        </select>
                    </div>

                    {/* Student Search */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Search Learner</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filter by student name or adm no..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                {/* ── STRANDS & SUB-STRANDS TABS ── */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 mr-2">Strands:</span>
                        {strandsList.map(st => (
                            <button
                                key={st.id}
                                onClick={() => {
                                    setSelectedStrandId(st.id);
                                    if (st.subStrands && st.subStrands.length > 0) {
                                        setSelectedSubStrandId(st.subStrands[0].id);
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                    selectedStrandId === st.id
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                {st.code ? `${st.code}: ` : ''}{st.name}
                            </button>
                        ))}
                    </div>

                    {/* Sub-Strands selector bar */}
                    {activeStrand && activeStrand.subStrands && activeStrand.subStrands.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pl-4 border-l-2 border-emerald-500">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 shrink-0 mr-2">Sub-Strand:</span>
                            {activeStrand.subStrands.map(subSt => (
                                <button
                                    key={subSt.id}
                                    onClick={() => setSelectedSubStrandId(subSt.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                        selectedSubStrandId === subSt.id
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    📌 {subSt.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── FORMATIVE RUBRIC ENTRY TABLE ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                {/* Table Header & Mass Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-500" />
                            <span>{selectedSubject.name} — {activeStrand?.name}</span>
                        </h3>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            Sub-Strand: {activeSubStrand?.name || 'General Evaluation'}
                        </p>
                        {activeSubStrand?.learningOutcomes && activeSubStrand.learningOutcomes.length > 0 && (
                            <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">
                                Learning Outcome: "{activeSubStrand.learningOutcomes[0]}"
                            </p>
                        )}
                    </div>

                    {/* Batch Actions */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Batch Mark:</span>
                        <button
                            onClick={() => handleBatchMarkScore('ME')}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-black text-[10px] uppercase rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all cursor-pointer"
                        >
                            All ME (3)
                        </button>
                        <button
                            onClick={() => handleBatchMarkScore('EE')}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-black text-[10px] uppercase rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
                        >
                            All EE (4)
                        </button>
                    </div>
                </div>

                {/* Rubric Matrix Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="py-3 px-4">#</th>
                                <th className="py-3 px-4">Learner Name</th>
                                <th className="py-3 px-4">Admission No</th>
                                <th className="py-3 px-4 text-center">Formative Assessment Rubric</th>
                                <th className="py-3 px-4">Qualitative Teacher Remark</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                            {classStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                        No students found in {selectedClass}. Select another class or enroll students.
                                    </td>
                                </tr>
                            ) : (
                                classStudents.map((student, idx) => {
                                    const key = `${selectedSubjectId}_${selectedSubStrandId}_${student.id}`;
                                    const assessment = assessmentsMap[key] || { score: 'ME', remarks: getDefaultRemarkForScore('ME') };
                                    const currentScore = assessment.score;

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3.5 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                                            <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                                                {resolveRealStudentAdmNo(student, idx, fetchedStudents)}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {/* 4-Level CBE Rubric Radio Pills */}
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleUpdateRubric(student.id, 'EE')}
                                                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                                                            currentScore === 'EE'
                                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400'
                                                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        EE (4)
                                                    </button>

                                                    <button
                                                        onClick={() => handleUpdateRubric(student.id, 'ME')}
                                                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                                                            currentScore === 'ME'
                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-400'
                                                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                                                        }`}
                                                    >
                                                        ME (3)
                                                    </button>

                                                    <button
                                                        onClick={() => handleUpdateRubric(student.id, 'AE')}
                                                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                                                            currentScore === 'AE'
                                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-amber-400'
                                                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                                                        }`}
                                                    >
                                                        AE (2)
                                                    </button>

                                                    <button
                                                        onClick={() => handleUpdateRubric(student.id, 'BE')}
                                                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                                                            currentScore === 'BE'
                                                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105 ring-2 ring-rose-400'
                                                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                                                        }`}
                                                    >
                                                        BE (1)
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <input
                                                    type="text"
                                                    value={assessment.remarks}
                                                    onChange={e => handleUpdateRemark(student.id, e.target.value)}
                                                    placeholder="Qualitative remark..."
                                                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Helper: Get standard qualitative feedback based on CBE score
function getDefaultRemarkForScore(score: CbeRubricLevel): string {
    switch (score) {
        case 'EE': return 'Exceeds expectation. Demonstrates thorough mastery and creative application.';
        case 'ME': return 'Meets expectation. Consistently applies learning outcomes independently.';
        case 'AE': return 'Approaches expectation. Requires occasional guidance on complex tasks.';
        case 'BE': return 'Below expectation. Needs continuous support and remedial practice.';
    }
}
