import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, User, Course, AcademicLevel, MontessoriAssessmentRecord, MontessoriMilestoneRating } from '../../types';
import { 
    Sparkles, BookOpen, Layers, CheckCircle2, AlertCircle, RefreshCw, 
    Printer, Download, Search, Filter, Award, Save, Check, Baby, 
    GraduationCap, Palette, Music, Dumbbell, Compass, Heart, MessageSquare, 
    ChevronRight, Info, Eye
} from 'lucide-react';
import { 
    DEFAULT_COGNITIVE_MILESTONES, 
    DEFAULT_EMOTIONAL_MILESTONES, 
    DEFAULT_SOCIAL_MILESTONES, 
    DEFAULT_PHYSICAL_MILESTONES, 
    DEFAULT_LANGUAGE_MILESTONES, 
    DEFAULT_MATHEMATICS_MILESTONES,
    MONTESSORI_RATING_DEFINITIONS, 
    createInitialMontessoriRecord 
} from '../../services/montessoriDefaults';
import { 
    generateMontessoriAssessmentReportPdfDataUri, 
    downloadMontessoriAssessmentReportPdf 
} from '../../services/pdfService';
import { apiService } from '../../services/apiService';

export interface MontessoriAssessmentManagerProps {
    currentInstitution?: Institution | null;
    users?: User[];
    courses?: Course[];
    academicLevels?: AcademicLevel[];
    currentUser?: User;
    onLogAction?: (action: string) => Promise<void> | void;
}

type ActiveDomainTab = 'cognitive' | 'emotional' | 'social' | 'physical' | 'languageAndLiteracy' | 'mathematics' | 'activities' | 'preview';

export const MontessoriAssessmentManager: React.FC<MontessoriAssessmentManagerProps> = ({
    currentInstitution,
    users = [],
    courses = [],
    academicLevels = [],
    currentUser,
    onLogAction,
}) => {
    // ── CLASS & STUDENT FILTERS ──
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>('all');
    const [selectedStream, setSelectedStream] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // ── SESSION METADATA ──
    const [term, setTerm] = useState<string>('Term 1');
    const [academicYear, setAcademicYear] = useState<string>(String(new Date().getFullYear()));
    const [activeTab, setActiveTab] = useState<ActiveDomainTab>('cognitive');

    // ── ACTIVE ASSESSMENT RECORD ──
    const [record, setRecord] = useState<MontessoriAssessmentRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [pdfPreviewUri, setPdfPreviewUri] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // ── DATA DISCOVERY & MULTI-SOURCE STUDENT HYDRATION ──
    const [fetchedStudents, setFetchedStudents] = useState<any[]>([]);
    const [fetchedCourses, setFetchedCourses] = useState<Course[]>([]);

    const loadAllLearners = async () => {
        const instId = currentInstitution?.id;
        if (!instId) return;
        setIsLoadingData(true);

        const cleanInstId = instId.replace(/^(br_inst_br_|br_inst_|br_|inst_br_|inst_)/gi, '');

        // 1. Immediately read all localStorage candidate keys to display data with zero latency
        const localEnrCandidates = [
            `eduai_student_enrollments_${instId}`,
            `eduai_student_enrollments_${cleanInstId}`,
            'eduai_student_enrollments_default',
            `eduai_students_${instId}`,
            `eduai_students_${cleanInstId}`,
            'eduai_students_default',
            'eduai_student_enrollments',
            'student_enrollments',
            'eduai_students',
            'students',
            `eduai_users_${instId}`,
            'eduai_users',
            'users'
        ];

        const localCombined: any[] = [];
        localEnrCandidates.forEach(k => {
            try {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        for (const item of parsed) {
                            if (!item || typeof item !== 'object') continue;
                            const itemInst = String(item.institutionId || item.institution_id || '').trim();
                            const cleanItemInst = itemInst.replace(/^(br_inst_br_|br_inst_|br_|inst_br_|inst_)/gi, '').toLowerCase();
                            if (itemInst && itemInst !== instId && cleanItemInst !== cleanInstId) {
                                continue;
                            }
                            localCombined.push(item);
                        }
                    }
                }
            } catch (e) {}
        });

        // 2. Fetch from remote backend in parallel
        try {
            const [enrRemote, stRemote, usrRemote, courseRemote] = await Promise.all([
                apiService.fetchModuleRecords<any>('student_enrollments', instId).catch(() => []),
                apiService.fetchModuleRecords<any>('students', instId).catch(() => []),
                apiService.fetchUsers(instId).catch(() => []),
                apiService.fetchCourses(instId).catch(() => [])
            ]);

            if (courseRemote && courseRemote.length > 0) {
                setFetchedCourses(courseRemote);
            }

            const allMerged = [...localCombined, ...(enrRemote || []), ...(stRemote || []), ...(usrRemote || [])];
            setFetchedStudents(allMerged);
        } catch (e) {
            console.warn('[MontessoriAssessmentManager] Error fetching remote learners:', e);
            setFetchedStudents(localCombined);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        loadAllLearners();
    }, [currentInstitution?.id]);

    // Unified, deduplicated, and normalized list of all pupils
    const allPupils = useMemo(() => {
        const instId = currentInstitution?.id || '';
        const cleanInstId = instId.replace(/^(br_inst_br_|br_inst_|br_|inst_br_|inst_)/gi, '').toLowerCase();

        const map = new Map<string, any>();

        const processCandidate = (c: any) => {
            if (!c || typeof c !== 'object') return;

            // Check institution match
            const cInstId = String(c.institutionId || c.institution_id || '').trim();
            const cleanCInstId = cInstId.replace(/^(br_inst_br_|br_inst_|br_|inst_br_|inst_)/gi, '').toLowerCase();

            if (instId && !instId.startsWith('demo_')) {
                if (!cInstId || (cInstId !== instId && cleanCInstId !== cleanInstId)) {
                    return;
                }
            }

            // Must have student identity traits:
            const adm = (
                c.admissionNumber || 
                c.admission_number || 
                c.admissionNo || 
                c.admission_no || 
                c.admNo || 
                c.adm_no || 
                c.metadata?.admissionNumber || 
                c.metadata?.admission_number || 
                c.metadata?.admNo ||
                ''
            ).trim();

            const role = String(c.role || '').toLowerCase();
            const enrollmentType = String(c.enrollmentType || c.enrollment_type || '').toLowerCase();
            const isStudent = role === 'student' || enrollmentType === 'academic' || !!adm || !!c.studentClass || !!c.gradeLevel || !!c.courseId || !!c.course_id;

            // Exclude non-student staff/admin roles unless an admission number is present
            const isStaff = ['admin', 'super_admin', 'head_teacher', 'teacher', 'lecturer', 'driver', 'nurse', 'accountant', 'finance_officer'].includes(role);
            if (!isStudent || (isStaff && !adm)) return;

            // Resolve pupil name
            const rawName = (
                c.name || 
                c.studentName || 
                c.student_name || 
                c.fullName || 
                c.full_name || 
                c.metadata?.studentName || 
                c.metadata?.fullName || 
                c.metadata?.name || 
                ''
            ).trim();

            const name = rawName && !rawName.toLowerCase().startsWith('student ') ? rawName : (rawName || 'Unnamed Pupil');

            // Unique ID
            const id = String(c.id || c.userId || c.user_id || c.studentId || c.student_id || (adm ? `adm_${adm}` : `pupil_${Math.random().toString(36).substr(2, 6)}`));

            // Resolve class / grade
            const rawClass = (
                c.studentClass || 
                c.student_class || 
                c.gradeLevel || 
                c.grade_level || 
                c.className || 
                c.class_name || 
                c.class || 
                c.classLevel || 
                c.class_level || 
                c.metadata?.studentClass || 
                c.metadata?.student_class || 
                c.metadata?.gradeLevel || 
                c.metadata?.grade_level || 
                c.metadata?.className || 
                c.metadata?.class_name || 
                c.metadata?.class || 
                ''
            ).trim();

            // Resolve curriculum
            const rawCurr = (
                c.curriculum || 
                c.curriculumType || 
                c.curriculum_type || 
                c.metadata?.curriculum || 
                c.metadata?.curriculumType || 
                c.metadata?.curriculum_type || 
                ''
            ).trim();

            const courseId = String(
                c.courseId || 
                c.course_id || 
                c.classId || 
                c.class_id || 
                c.metadata?.courseId || 
                c.metadata?.course_id || 
                c.metadata?.classId || 
                c.metadata?.class_id || 
                ''
            ).trim();

            const stream = (c.stream || c.metadata?.stream || '').trim();

            if (!map.has(id)) {
                map.set(id, {
                    ...c,
                    id,
                    name,
                    admissionNumber: adm || 'ADM-N/A',
                    admissionNo: adm || 'ADM-N/A',
                    studentClass: rawClass,
                    gradeLevel: rawClass,
                    stream,
                    courseId,
                    curriculum: rawCurr,
                    role: 'student',
                    institutionId: cInstId || instId
                });
            } else {
                const existing = map.get(id);
                map.set(id, {
                    ...existing,
                    name: (existing.name === 'Unnamed Pupil' && name !== 'Unnamed Pupil') ? name : existing.name,
                    admissionNumber: existing.admissionNumber === 'ADM-N/A' && adm ? adm : existing.admissionNumber,
                    admissionNo: existing.admissionNo === 'ADM-N/A' && adm ? adm : existing.admissionNo,
                    studentClass: existing.studentClass || rawClass,
                    gradeLevel: existing.gradeLevel || rawClass,
                    stream: existing.stream || stream,
                    courseId: existing.courseId || courseId,
                    curriculum: existing.curriculum || rawCurr
                });
            }
        };

        (users || []).forEach(processCandidate);
        fetchedStudents.forEach(processCandidate);

        return Array.from(map.values());
    }, [users, fetchedStudents, currentInstitution?.id]);

    // Unified list of registered courses
    const allCourses = useMemo(() => {
        const map = new Map<string, Course>();
        (courses || []).forEach(c => { if (c && c.id) map.set(c.id, c); });
        fetchedCourses.forEach(c => { if (c && c.id && !map.has(c.id)) map.set(c.id, c); });
        return Array.from(map.values());
    }, [courses, fetchedCourses]);

    // Extract all distinct student class names from all enrolled students
    const studentClasses = useMemo(() => {
        const classes = new Set<string>();
        allPupils.forEach(u => {
            if (u.studentClass) classes.add(u.studentClass.trim());
        });
        return Array.from(classes);
    }, [allPupils]);

    // Helper: Detect if class or course belongs to British / Montessori curriculum
    const isBritishOrMontessori = (name: string, currType?: string) => {
        const normName = (name || '').toLowerCase();
        const normCurr = (currType || '').toLowerCase();
        if (normCurr.includes('british') || normCurr.includes('montessori') || normCurr.includes('eyfs') || normCurr.includes('igcse') || normCurr.includes('cambridge')) {
            return true;
        }
        return (
            normName.includes('year ') ||
            normName.includes('reception') ||
            normName.includes('eyfs') ||
            normName.includes('foundation stage') ||
            normName.includes('fs1') ||
            normName.includes('fs2') ||
            normName.includes('playgroup') ||
            normName.includes('creche') ||
            normName.includes('kindergarten') ||
            normName.includes('nursery') ||
            normName.includes('pre-unit') ||
            normName.includes('baby class') ||
            normName.includes('montessori') ||
            normName.includes('stage ')
        );
    };

    // Available courses: merge registered courses with any unmapped classes found on students
    const displayCourses = useMemo(() => {
        const list = [...allCourses];
        studentClasses.forEach(cls => {
            const norm = cls.toLowerCase().trim();
            const exists = list.some(c => 
                (c.name || '').toLowerCase().trim() === norm || 
                (c.code || '').toLowerCase().trim() === norm
            );
            if (!exists) {
                const isBritish = isBritishOrMontessori(cls);
                list.push({
                    id: `class_${cls.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    name: cls,
                    code: cls.replace(/\s+/g, '').toUpperCase(),
                    institutionId: currentInstitution?.id || '',
                    curriculumType: isBritish ? 'British & Montessori' : 'Other',
                    levels: []
                } as any);
            }
        });

        // Ensure default British & Early Years classes exist as templates if list is empty
        if (list.length === 0) {
            list.push(
                { id: 'c_eyfs_rec', name: 'Reception (EYFS)', code: 'REC', institutionId: currentInstitution?.id || '', curriculumType: 'British & Montessori', levels: [] } as any,
                { id: 'c_eyfs_y1', name: 'Year 1 (British Curriculum)', code: 'Y1', institutionId: currentInstitution?.id || '', curriculumType: 'British', levels: [] } as any,
                { id: 'c_eyfs_y2', name: 'Year 2 (British Curriculum)', code: 'Y2', institutionId: currentInstitution?.id || '', curriculumType: 'British', levels: [] } as any,
                { id: 'c_eyfs_pg', name: 'Playgroup / Creche', code: 'PG', institutionId: currentInstitution?.id || '', curriculumType: 'British & Montessori', levels: [] } as any,
                { id: 'c_eyfs_fs1', name: 'Foundation Stage 1 (FS1)', code: 'FS1', institutionId: currentInstitution?.id || '', curriculumType: 'British & Montessori', levels: [] } as any
            );
        }

        return list;
    }, [allCourses, studentClasses, currentInstitution?.id]);

    // Default select 'ALL' (All Classes & Learners) to immediately show all learners
    useEffect(() => {
        if (!selectedCourseId) {
            setSelectedCourseId('ALL');
        }
    }, [selectedCourseId]);

    // Active course (if a specific course is selected)
    const currentCourse = useMemo(() => {
        if (!selectedCourseId || selectedCourseId === 'ALL') return null;
        return displayCourses.find(c => c.id === selectedCourseId) || null;
    }, [displayCourses, selectedCourseId]);

    // Available streams for course / institution
    const availableStreams = useMemo(() => {
        const streams = new Set<string>();
        if (currentCourse && currentCourse.streams) {
            currentCourse.streams.forEach(s => streams.add(s));
        }
        allPupils.forEach(u => {
            if (u.stream) streams.add(u.stream);
            if (u.metadata?.stream) streams.add(u.metadata.stream);
        });
        return Array.from(streams).sort();
    }, [currentCourse, allPupils]);

    // Comprehensive student matching across curriculum, courseId, class name, stream, and search
    const enrolledStudents = useMemo(() => {
        if (!allPupils || allPupils.length === 0) return [];

        return allPupils.filter(u => {
            const uClass = (u.studentClass || u.gradeLevel || '').toLowerCase().trim();
            const uCurr = (u.curriculum || '').toLowerCase().trim();

            // 1. Curriculum Filter
            if (selectedCurriculum === 'british') {
                const matchesBritish = 
                    uCurr.includes('british') || 
                    uCurr.includes('montessori') || 
                    uCurr.includes('eyfs') || 
                    uCurr.includes('cambridge') || 
                    uCurr.includes('igcse') ||
                    isBritishOrMontessori(uClass, uCurr);

                const curCourse = displayCourses.find(c => c.id === u.courseId);
                const courseIsBritish = curCourse ? isBritishOrMontessori(curCourse.name, curCourse.curriculumType) : false;

                if (!matchesBritish && !courseIsBritish) return false;
            } else if (selectedCurriculum === 'cbc') {
                const matchesCbc = uCurr.includes('cbc') || uCurr.includes('cbe') || uClass.includes('grade ') || uClass.includes('pp1') || uClass.includes('pp2');
                if (!matchesCbc) return false;
            } else if (selectedCurriculum === '844') {
                const matches844 = uCurr.includes('8-4-4') || uClass.includes('class ') || uClass.includes('form ');
                if (!matches844) return false;
            }

            // 2. Course / Class Filter
            if (selectedCourseId && selectedCourseId !== 'ALL') {
                const curCourse = displayCourses.find(c => c.id === selectedCourseId);
                if (curCourse) {
                    const cId = (curCourse.id || '').toLowerCase().trim();
                    const cName = (curCourse.name || '').toLowerCase().trim();
                    const cCode = (curCourse.code || '').toLowerCase().trim();
                    const cleanCName = cName.replace(/\s*\([^)]*\)/g, '').trim();
                    const uCourseId = (u.courseId || '').toLowerCase().trim();

                    const matchesId = uCourseId && (uCourseId === cId || uCourseId === cCode || uCourseId === cName);
                    const matchesClass = uClass && (
                        uClass === cName ||
                        uClass === cCode ||
                        uClass === cleanCName ||
                        uClass.startsWith(cleanCName) ||
                        cleanCName.startsWith(uClass) ||
                        uClass.includes(cleanCName) ||
                        cleanCName.includes(uClass) ||
                        (cCode && uClass.includes(cCode))
                    );

                    if (!matchesId && !matchesClass) return false;
                }
            }

            // 3. Stream Filter
            if (selectedStream && selectedStream !== 'All') {
                const directStream = (u.stream || '').trim().toLowerCase();
                const target = selectedStream.toLowerCase().trim();
                if (directStream !== target && !uClass.includes(target)) {
                    return false;
                }
            }

            // 4. Search Term Filter (Pupil Name, Admission No, or Class)
            if (searchTerm) {
                const termLower = searchTerm.toLowerCase().trim();
                const name = (u.name || '').toLowerCase();
                const adm = (u.admissionNumber || u.admissionNo || '').toLowerCase();
                if (!name.includes(termLower) && !adm.includes(termLower) && !uClass.includes(termLower)) {
                    return false;
                }
            }

            return true;
        });
    }, [allPupils, selectedCurriculum, selectedCourseId, selectedStream, searchTerm, displayCourses]);

    // Quick seed sample British EYFS pupils if institution has none
    const handleSeedSampleBritishPupils = async () => {
        const instId = currentInstitution?.id || 'demo_institution';
        const samplePupils = [
            {
                id: `pupil_br_${Date.now()}_1`,
                name: 'Liam Alexander',
                admissionNumber: 'BR-2024-001',
                studentClass: 'Reception (EYFS)',
                stream: 'Emerald',
                role: 'student',
                institutionId: instId,
                curriculum: 'British & Montessori',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'Enrolled'
            },
            {
                id: `pupil_br_${Date.now()}_2`,
                name: 'Sophia Grace',
                admissionNumber: 'BR-2024-002',
                studentClass: 'Reception (EYFS)',
                stream: 'Emerald',
                role: 'student',
                institutionId: instId,
                curriculum: 'British & Montessori',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'Enrolled'
            },
            {
                id: `pupil_br_${Date.now()}_3`,
                name: 'Ethan Oliver',
                admissionNumber: 'BR-2024-003',
                studentClass: 'Year 1 (British)',
                stream: 'Ruby',
                role: 'student',
                institutionId: instId,
                curriculum: 'British',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'Enrolled'
            },
            {
                id: `pupil_br_${Date.now()}_4`,
                name: 'Ava Elizabeth',
                admissionNumber: 'BR-2024-004',
                studentClass: 'Year 1 (British)',
                stream: 'Ruby',
                role: 'student',
                institutionId: instId,
                curriculum: 'British',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'Enrolled'
            },
            {
                id: `pupil_br_${Date.now()}_5`,
                name: 'Lucas Noah',
                admissionNumber: 'BR-2024-005',
                studentClass: 'Year 2 (British)',
                stream: 'Sapphire',
                role: 'student',
                institutionId: instId,
                curriculum: 'British',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'Enrolled'
            }
        ];

        try {
            const key = `eduai_student_enrollments_${instId}`;
            const existingRaw = localStorage.getItem(key);
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            const merged = [...samplePupils, ...(Array.isArray(existing) ? existing : [])];
            localStorage.setItem(key, JSON.stringify(merged));

            await apiService.saveModuleRecord('student_enrollments', samplePupils);
            showToast('Sample British EYFS pupils added successfully!');
            await loadAllLearners();
            setSelectedCurriculum('all');
            setSelectedCourseId('ALL');
        } catch (e) {
            console.error('Failed to seed sample British pupils:', e);
            showToast('Sample British EYFS pupils loaded locally!');
            setFetchedStudents(prev => [...samplePupils, ...prev]);
        }
    };

    // Default select first student
    useEffect(() => {
        if (enrolledStudents.length > 0 && (!selectedStudentId || !enrolledStudents.some(s => s.id === selectedStudentId))) {
            setSelectedStudentId(enrolledStudents[0].id);
        }
    }, [enrolledStudents, selectedStudentId]);

    // Selected student object
    const currentStudent = useMemo(() => {
        return enrolledStudents.find(s => s.id === selectedStudentId);
    }, [enrolledStudents, selectedStudentId]);

    // Storage key for caching assessments
    const getStorageKey = (studentId: string, t: string, y: string) => {
        return `montessori_record_${currentInstitution?.id || 'inst'}_${studentId}_${t}_${y}`;
    };

    // Load or initialize record when student, term, or year changes
    useEffect(() => {
        if (!currentStudent) {
            setRecord(null);
            return;
        }

        const key = getStorageKey(currentStudent.id, term, academicYear);
        const cached = localStorage.getItem(key);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setRecord(parsed);
                return;
            } catch (e) {
                console.error("Failed to parse stored montessori record", e);
            }
        }

        // Initialize fresh record
        const initial = createInitialMontessoriRecord(
            currentInstitution?.id || 'inst',
            currentStudent.id,
            currentStudent.name,
            currentCourse?.name || 'Early Years'
        );
        initial.term = term;
        initial.academicYear = academicYear;
        initial.homeroomTutors = currentUser?.name || 'Lead Class Teacher';
        setRecord(initial);
    }, [currentStudent, term, academicYear, currentInstitution, currentCourse, currentUser]);

    // Save assessment record
    const handleSaveRecord = async () => {
        if (!record || !currentStudent) return;
        setIsSaving(true);
        try {
            const key = getStorageKey(currentStudent.id, term, academicYear);
            localStorage.setItem(key, JSON.stringify(record));
            if (onLogAction) {
                await onLogAction(`Saved British & Montessori assessment for ${record.studentName || 'Student'}`);
            }
            showToast(`Assessment saved successfully for ${record.studentName || 'Student'}`);
        } catch (e) {
            console.error(e);
            showToast("Failed to save assessment.");
        } finally {
            setIsSaving(false);
        }
    };

    // Handle rating toggle for milestone
    const handleSetRating = (domainKey: keyof MontessoriAssessmentRecord['domains'], milestoneId: string, rating: MontessoriMilestoneRating) => {
        if (!record) return;
        setRecord(prev => {
            if (!prev) return prev;
            const domain = prev.domains[domainKey];
            const updatedMilestones = domain.milestones.map(m => m.id === milestoneId ? { ...m, rating } : m);
            return {
                ...prev,
                domains: {
                    ...prev.domains,
                    [domainKey]: {
                        ...domain,
                        milestones: updatedMilestones,
                    }
                }
            };
        });
    };

    // Batch set rating for whole domain
    const handleBatchSetDomain = (domainKey: keyof MontessoriAssessmentRecord['domains'], rating: MontessoriMilestoneRating) => {
        if (!record) return;
        setRecord(prev => {
            if (!prev) return prev;
            const domain = prev.domains[domainKey];
            const updatedMilestones = domain.milestones.map(m => ({ ...m, rating }));
            return {
                ...prev,
                domains: {
                    ...prev.domains,
                    [domainKey]: {
                        ...domain,
                        milestones: updatedMilestones,
                    }
                }
            };
        });
        showToast(`Set all ${domainKey} milestones to ${rating}`);
    };

    // Auto-generate AI narrative report
    const handleGenerateAiNarrative = () => {
        if (!record || !currentStudent) return;
        const studentName = currentStudent.name.split(' ')[0] || 'The pupil';
        const sampleNarratives = [
            `${studentName} has demonstrated admirable growth, curiosity, and high engagement throughout this term. During practical life and sensorial tasks, ${studentName} demonstrates remarkable precision and independent initiative. In social interactions, ${studentName} is courteous, cooperative, and shows delightful empathy towards friends. An exemplary term of joyous learning and steady milestone progression!`,
            `${studentName} continues to be a vibrant and enthusiastic member of our classroom family. Great confidence has been observed in communicative language, storytelling, and early mathematical reasoning. ${studentName} embraces new concepts with an inquisitive spirit and participates heartily in expressive art and outdoor games. Keep shining brightly!`,
            `${studentName} has had a wonderfully rewarding term filled with rapid developmental strides. Displays keen problem-solving stamina and fine motor dexterity during Montessori table presentations. Socially, ${studentName} fosters warm friendships, listens thoughtfully during circle time, and approaches co-curricular sports with boundless energy.`,
        ];
        const randomNarrative = sampleNarratives[Math.floor(Math.random() * sampleNarratives.length)];
        setRecord(prev => prev ? ({ ...prev, summaryNarrative: randomNarrative }) : prev);
        showToast("Auto-generated developmental summary narrative!");
    };

    // Download PDF
    const handleDownloadPdf = async () => {
        if (!record) return;
        setIsExporting(true);
        try {
            await downloadMontessoriAssessmentReportPdf(record, currentInstitution || undefined);
            showToast("4-Page Montessori Report Card downloaded!");
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    // Preview PDF
    const handlePreviewPdf = async () => {
        if (!record) return;
        setIsExporting(true);
        try {
            const uri = await generateMontessoriAssessmentReportPdfDataUri(record, currentInstitution || undefined);
            setPdfPreviewUri(uri);
        } catch (e) {
            console.error(e);
            showToast("Failed to preview PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    // Domain stats helper
    const getDomainStats = (domainKey: keyof MontessoriAssessmentRecord['domains']) => {
        if (!record) return { mastered: 0, practicing: 0, learning: 0, total: 0 };
        const milestones = record.domains[domainKey]?.milestones || [];
        const mastered = milestones.filter(m => m.rating === 'M').length;
        const practicing = milestones.filter(m => m.rating === 'P').length;
        const learning = milestones.filter(m => m.rating === 'L').length;
        return { mastered, practicing, learning, total: milestones.length };
    };

    return (
        <div className="space-y-6">
            {/* ── HEADER BANNER ── */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-400/30">
                            <Baby className="w-3.5 h-3.5" />
                            British & Montessori Curriculum
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Early Years Summary Assessment Checklist</h1>
                        <p className="text-slate-300 text-sm max-w-2xl">
                            Developmental milestone rubric tracking across Cognitive, Emotional, Social, Physical, Language & Mathematics domains with 4-page Busy Bumbles printable checklist report cards.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleSaveRecord}
                            disabled={isSaving || !record}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-500/30 active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Assessment'}
                        </button>
                        <button
                            onClick={handlePreviewPdf}
                            disabled={isExporting || !record}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/15"
                        >
                            <Eye className="w-4 h-4" />
                            Preview PDF
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isExporting || !record}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4 text-emerald-600" />
                            {isExporting ? 'Generating...' : 'Export 4-Page PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── TOAST NOTIFICATION ── */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-bounce">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold">{toastMessage}</span>
                </div>
            )}

            {/* ── FILTER & SELECTION TOOLBAR ── */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Curriculum Standard</label>
                    <select
                        value={selectedCurriculum}
                        onChange={e => setSelectedCurriculum(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">All Curricula ({allPupils.length})</option>
                        <option value="british">👶 British & Montessori ({allPupils.filter(p => isBritishOrMontessori(p.studentClass, p.curriculum)).length})</option>
                        <option value="cbc">🇰🇪 CBC / CBE System</option>
                        <option value="844">🎓 8-4-4 System</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Class / Level</label>
                    <select
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="ALL">All Classes & Learners ({enrolledStudents.length})</option>
                        {displayCourses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.curriculumType ? `(${c.curriculumType})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Stream</label>
                    <select
                        value={selectedStream}
                        onChange={e => setSelectedStream(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="All">All Streams</option>
                        {availableStreams.map((s, idx) => (
                            <option key={idx} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Term</label>
                    <select
                        value={term}
                        onChange={e => setTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Academic Year</label>
                    <input
                        type="text"
                        value={academicYear}
                        onChange={e => setAcademicYear(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Search Pupil</label>
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter pupil name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* ── STUDENT SELECTOR & ACTIVE PROFILE CARD ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Pupil List Column */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[480px]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2 px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Pupils ({enrolledStudents.length})</span>
                            {isLoadingData && <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            {currentCourse?.name || (selectedCurriculum === 'british' ? 'British / EYFS' : 'All Classes')}
                        </span>
                    </div>

                    <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 custom-scrollbar">
                        {enrolledStudents.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs space-y-3">
                                <p>No pupils match the selected filter criteria.</p>
                                <div className="flex flex-col gap-2 pt-1">
                                    <button
                                        onClick={() => {
                                            setSelectedCurriculum('all');
                                            setSelectedCourseId('ALL');
                                            setSelectedStream('All');
                                            setSearchTerm('');
                                        }}
                                        className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-200 transition-colors"
                                    >
                                        Show All Pupils
                                    </button>
                                    <button
                                        onClick={handleSeedSampleBritishPupils}
                                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95"
                                    >
                                        🌱 Seed Sample British EYFS Pupils
                                    </button>
                                </div>
                            </div>
                        ) : (
                            enrolledStudents.map(student => {
                                const isSelected = student.id === selectedStudentId;
                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/40 shadow-sm'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="truncate">
                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                                    {student.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {student.admissionNumber || student.admissionNo || 'ADM-N/A'} • {student.stream || 'Stream A'}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Pupil Progress & Assessment Hub */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Active Pupil Header */}
                    {currentStudent && record && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-xl font-black shadow-md shadow-emerald-500/20">
                                    {currentStudent.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{currentStudent.name}</h2>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                            {currentStudent.admissionNumber || currentStudent.admissionNo || 'ADM'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {record.className} • {record.term} {record.academicYear} • Homeroom: {record.homeroomTutors || 'Assigned'}
                                    </p>
                                </div>
                            </div>

                            {/* Milestone Summary Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {Object.entries(MONTESSORI_RATING_DEFINITIONS).map(([code, def]) => {
                                    // Calculate overall count across all 6 domains
                                    let count = 0;
                                    if (record?.domains) {
                                        Object.values(record.domains).forEach(d => {
                                            count += d.milestones.filter(m => m.rating === code).length;
                                        });
                                    }
                                    return (
                                        <div key={code} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                            <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-[10px]">
                                                {code}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-400">{def.label}</span>
                                                <span className="text-xs font-black text-slate-800 dark:text-white">{count}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {[
                            { id: 'cognitive', label: '1. Cognitive', count: '10' },
                            { id: 'emotional', label: '2. Emotional', count: '10' },
                            { id: 'social', label: '3. Social', count: '10' },
                            { id: 'physical', label: '4. Physical', count: '10' },
                            { id: 'languageAndLiteracy', label: '5. Language & Literacy', count: '10' },
                            { id: 'mathematics', label: '6. Mathematics', count: '6' },
                            { id: 'activities', label: 'Co-Curricular & Narrative', count: 'Report' },
                            { id: 'preview', label: 'Live Preview', count: 'Checklist' },
                        ].map(t => {
                            const isActive = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id as ActiveDomainTab)}
                                    className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                                        isActive
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <span>{t.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                        {t.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── ACTIVE TAB CONTENT ── */}
                    {record && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
                            {/* DOMAINS 1 TO 6 RATING TABLE */}
                            {['cognitive', 'emotional', 'social', 'physical', 'languageAndLiteracy', 'mathematics'].includes(activeTab) && (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white capitalize">
                                                {record.domains[activeTab as keyof MontessoriAssessmentRecord['domains']]?.domainName}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Rate each developmental milestone using the standard 5-point Montessori rubric.
                                            </p>
                                        </div>

                                        {/* Quick Batch Actions */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Fill:</span>
                                            <button
                                                onClick={() => handleBatchSetDomain(activeTab as keyof MontessoriAssessmentRecord['domains'], 'P')}
                                                className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[10px] font-black uppercase tracking-wider transition-colors"
                                            >
                                                All Practicing (P)
                                            </button>
                                            <button
                                                onClick={() => handleBatchSetDomain(activeTab as keyof MontessoriAssessmentRecord['domains'], 'M')}
                                                className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-black uppercase tracking-wider transition-colors"
                                            >
                                                All Mastered (M)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Milestones List */}
                                    <div className="space-y-3">
                                        {record.domains[activeTab as keyof MontessoriAssessmentRecord['domains']]?.milestones.map((m, idx) => {
                                            return (
                                                <div
                                                    key={m.id}
                                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-500/30 transition-all"
                                                >
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                                {m.description}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                                Current rating: <span className="font-bold text-emerald-600">{MONTESSORI_RATING_DEFINITIONS[m.rating || 'P']?.label}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Rating Pill Buttons */}
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {(['M', 'P', 'L', 'F', 'NI'] as MontessoriMilestoneRating[]).map(rCode => {
                                                            const isSelected = m.rating === rCode;
                                                            return (
                                                                <button
                                                                    key={rCode}
                                                                    onClick={() => handleSetRating(activeTab as keyof MontessoriAssessmentRecord['domains'], m.id, rCode)}
                                                                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 ${
                                                                        isSelected
                                                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                                                    }`}
                                                                >
                                                                    <span>{rCode}</span>
                                                                    {isSelected && <Check className="w-3 h-3" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* CO-CURRICULAR ACTIVITIES & HOMEROOM REMARK TAB */}
                            {activeTab === 'activities' && (
                                <div className="space-y-6">
                                    <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">Co-Curricular Learning & Homeroom Narrative</h3>
                                        <p className="text-xs text-slate-500">Record experiential learning observations and overarching teacher remarks.</p>
                                    </div>

                                    {/* Activities Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Expressive Arts and Design</label>
                                            <textarea
                                                rows={2}
                                                value={record.activities.expressiveArtsAndDesign || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, activities: { ...prev.activities, expressiveArtsAndDesign: e.target.value } }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Celebrations & Cultural Themes</label>
                                            <textarea
                                                rows={2}
                                                value={record.activities.celebrations || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, activities: { ...prev.activities, celebrations: e.target.value } }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Languages (Kiswahili / French)</label>
                                            <textarea
                                                rows={2}
                                                value={record.activities.languages || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, activities: { ...prev.activities, languages: e.target.value } }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Sports & Movement (Ballet / P.E)</label>
                                            <textarea
                                                rows={2}
                                                value={record.activities.sports || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, activities: { ...prev.activities, sports: e.target.value } }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Sensory & Science Discoveries</label>
                                            <textarea
                                                rows={2}
                                                value={record.activities.experiments || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, activities: { ...prev.activities, experiments: e.target.value } }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Swimming & Water Confidence</label>
                                            <textarea
                                                rows={2}
                                                value={record.activities.swimming || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, activities: { ...prev.activities, swimming: e.target.value } }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Homeroom Narrative & AI Generator */}
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-black uppercase text-slate-900 dark:text-white">Homeroom Teacher's Summary Narrative</label>
                                            <button
                                                onClick={handleGenerateAiNarrative}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-black uppercase tracking-wider transition-colors"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                AI Narrative Assist
                                            </button>
                                        </div>
                                        <textarea
                                            rows={4}
                                            value={record.summaryNarrative || ''}
                                            onChange={e => setRecord(prev => prev ? ({ ...prev, summaryNarrative: e.target.value }) : prev)}
                                            placeholder="Write summary developmental report, notable achievements, personality highlights and encouragement..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>

                                    {/* Homeroom Tutor Name */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Homeroom Tutors / Lead Teachers</label>
                                            <input
                                                type="text"
                                                value={record.homeroomTutors || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, homeroomTutors: e.target.value }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Report Assessment Date</label>
                                            <input
                                                type="date"
                                                value={record.reportDate || ''}
                                                onChange={e => setRecord(prev => prev ? ({ ...prev, reportDate: e.target.value }) : prev)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LIVE PREVIEW TAB */}
                            {activeTab === 'preview' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">Summary Assessment Report Checklist (Busy Bumbles Standard)</h3>
                                            <p className="text-xs text-slate-500">Live preview of the 4-page checklist report card before export.</p>
                                        </div>

                                        <button
                                            onClick={handleDownloadPdf}
                                            disabled={isExporting}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Download 4-Page PDF
                                        </button>
                                    </div>

                                    {/* Preview Checklist Summary */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
                                        <div className="text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-700">
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {currentInstitution?.name || 'Busy Bumbles Nursery School'}
                                            </h4>
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                                                British and Montessori Curriculum • Summary Assessment Checklist
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Pupil: <span className="font-bold text-slate-900 dark:text-white">{record.studentName}</span> • Class: <span className="font-bold">{record.className}</span> • {record.term} {record.academicYear}
                                            </p>
                                        </div>

                                        {/* Domain Score Breakdown */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {Object.entries(record.domains).map(([dKey, dVal], idx) => {
                                                const total = dVal.milestones.length;
                                                const mastered = dVal.milestones.filter(m => m.rating === 'M').length;
                                                const practicing = dVal.milestones.filter(m => m.rating === 'P').length;
                                                const pct = Math.round(((mastered + (practicing * 0.7)) / total) * 100);
                                                return (
                                                    <div key={dKey} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                        <div className="text-xs font-black text-slate-800 dark:text-slate-100 mb-2 truncate">
                                                            {idx + 1}. {dVal.domainName}
                                                        </div>
                                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                                                            <span>Mastery Index</span>
                                                            <span className="text-emerald-600">{pct}%</span>
                                                        </div>
                                                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                                                            <span>{mastered} Mastered</span>
                                                            <span>{practicing} Practicing</span>
                                                            <span>{total - (mastered + practicing)} Developing</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Summary Narrative Preview */}
                                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                            <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Homeroom Remark</div>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                                "{record.summaryNarrative || 'No summary narrative added yet.'}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── MODAL PDF PREVIEW ── */}
            {pdfPreviewUri && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <Baby className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Montessori Assessment 4-Page PDF Preview
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDownloadPdf}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </button>
                                <button
                                    onClick={() => setPdfPreviewUri(null)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-2 bg-slate-200 dark:bg-slate-950 overflow-hidden">
                            <iframe
                                src={pdfPreviewUri}
                                className="w-full h-full rounded-2xl border-0 shadow-inner"
                                title="Montessori PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
