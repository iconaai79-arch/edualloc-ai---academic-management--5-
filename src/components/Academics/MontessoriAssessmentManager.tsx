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
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [pdfPreviewUri, setPdfPreviewUri] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter courses relevant to Early Years / Primary / Montessori / British
    const relevantCourses = useMemo(() => {
        if (!courses || courses.length === 0) return [];
        return courses.filter(c => {
            const name = (c.name || '').toLowerCase();
            const code = (c.code || '').toLowerCase();
            const curr = (c.curriculumType || '').toLowerCase();
            const isEarlyYears = name.includes('playgroup') || name.includes('nursery') || name.includes('kindergarten') || 
                                name.includes('reception') || name.includes('eyfs') || name.includes('foundation') || 
                                name.includes('pre-primary') || name.includes('pp1') || name.includes('pp2') || name.includes('grade');
            const isMontessoriOrBritish = curr.includes('montessori') || curr.includes('british') || curr.includes('cbc');
            return isEarlyYears || isMontessoriOrBritish;
        });
    }, [courses]);

    // Available courses fallback to all courses if relevant is empty
    const displayCourses = relevantCourses.length > 0 ? relevantCourses : courses;

    // Default select first course if unselected
    useEffect(() => {
        if (!selectedCourseId && displayCourses.length > 0) {
            setSelectedCourseId(displayCourses[0].id);
        }
    }, [displayCourses, selectedCourseId]);

    // Active course
    const currentCourse = useMemo(() => {
        return courses.find(c => c.id === selectedCourseId);
    }, [courses, selectedCourseId]);

    // Available streams for course
    const availableStreams = useMemo(() => {
        if (!currentCourse) return [];
        return currentCourse.streams || [];
    }, [currentCourse]);

    // Students matching selected course, stream, and institution
    const enrolledStudents = useMemo(() => {
        if (!users) return [];
        return users.filter(u => {
            if (u.role !== 'student') return false;
            if (currentInstitution && u.institutionId && u.institutionId !== currentInstitution.id) return false;
            if (selectedCourseId && u.courseId !== selectedCourseId) return false;
            if (selectedStream && selectedStream !== 'All' && u.stream && u.stream.toLowerCase() !== selectedStream.toLowerCase()) return false;
            if (searchTerm) {
                const termLower = searchTerm.toLowerCase();
                const name = (u.name || '').toLowerCase();
                const adm = (u.admissionNumber || u.admissionNo || '').toLowerCase();
                if (!name.includes(termLower) && !adm.includes(termLower)) return false;
            }
            return true;
        });
    }, [users, currentInstitution, selectedCourseId, selectedStream, searchTerm]);

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
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Class / Level</label>
                    <select
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
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
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Search Student</label>
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by pupil name..."
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
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Pupils ({enrolledStudents.length})</span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            {currentCourse?.name || 'Class'}
                        </span>
                    </div>

                    <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 custom-scrollbar">
                        {enrolledStudents.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs">No pupils match the filter criteria.</div>
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
