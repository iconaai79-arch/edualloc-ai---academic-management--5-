import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, User, Subject, Course } from '../../types';
import { apiService } from '../../services/apiService';
import { generateLessonPlan, generateSchemeOfWork } from '../../services/geminiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';

export interface LessonPlanRecord {
    id: string;
    teacherId: string;
    teacherName: string;
    subjectId?: string;
    subjectName: string;
    className: string;
    topic: string;
    subtopic: string;
    duration: number;
    learningOutcomes: string[];
    keyQuestions: string[];
    coreCompetencies: string[];
    learningResources: string[];
    trajectory: {
        introduction: string;
        development: string;
        conclusion: string;
    };
    reflection?: string;
    status: 'draft' | 'submitted' | 'approved' | 'revision_requested';
    hodComment?: string;
    institutionId?: string;
    createdAt?: string;
}

export interface SchemeOfWeekItem {
    weekNumber: number;
    lessonNumber: number;
    strand: string;
    subStrand: string;
    outcomes: string;
    experiences: string;
    resources: string;
    assessment: string;
    remarks: string;
}

export interface SchemeOfWorkRecord {
    id: string;
    teacherId: string;
    teacherName: string;
    subjectName: string;
    className: string;
    term: string;
    academicYear: string;
    weeksData: SchemeOfWeekItem[];
    status: 'draft' | 'submitted' | 'approved';
    institutionId?: string;
}

interface TeacherLessonPlanManagerProps {
    currentInstitution?: Institution | null;
    currentUser?: User | null;
    subjects?: Subject[];
    courses?: Course[];
}

export const TeacherLessonPlanManager: React.FC<TeacherLessonPlanManagerProps> = ({
    currentInstitution,
    currentUser,
    subjects = [],
    courses = []
}) => {
    const instId = currentInstitution?.id || 'default_inst';
    const teacherId = currentUser?.id || 'default_teacher';
    const teacherName = currentUser?.name || 'Subject Teacher';

    const [activeTab, setActiveTab] = useState<'lesson_wizard' | 'schemes_wizard' | 'bank'>('lesson_wizard');

    // Lesson Plans State
    const [savedPlans, setSavedPlans] = useState<LessonPlanRecord[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_lesson_plans_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) { }
        return [];
    });

    // Schemes of Work State
    const [savedSchemes, setSavedSchemes] = useState<SchemeOfWorkRecord[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_schemes_of_work_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) { }
        return [];
    });

    // Sync with DB
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<LessonPlanRecord>('teacher_lesson_plans', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setSavedPlans(records);
                    }
                }).catch(() => { });

            apiService.fetchModuleRecords<SchemeOfWorkRecord>('schemes_of_work', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setSavedSchemes(records);
                    }
                }).catch(() => { });
        }
    }, [currentInstitution]);

    // Generator Form State
    const [genSubject, setGenSubject] = useState(subjects[0]?.name || 'Mathematics');
    const [genClass, setGenClass] = useState('Grade 7');
    const [genTopic, setGenTopic] = useState('');
    const [genSubtopic, setGenSubtopic] = useState('');
    const [genDuration, setGenDuration] = useState<number>(40);
    const [isGenerating, setIsGenerating] = useState(false);

    // Active Active Generated Plan
    const [currentPlan, setCurrentPlan] = useState<LessonPlanRecord | null>(null);

    // Schemes Generator Form State
    const [schemeSubject, setSchemeSubject] = useState(subjects[0]?.name || 'Integrated Science');
    const [schemeClass, setSchemeClass] = useState('Form 3');
    const [schemeTerm, setSchemeTerm] = useState('Term 1');
    const [schemeWeeks, setSchemeWeeks] = useState(8);
    const [isGeneratingScheme, setIsGeneratingScheme] = useState(false);
    const [currentScheme, setCurrentScheme] = useState<SchemeOfWorkRecord | null>(null);

    // AI Generate Single Lesson Plan
    const handleGenerateLessonPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!genTopic.trim()) {
            alert('Please enter a topic or strand name.');
            return;
        }

        setIsGenerating(true);
        try {
            const aiResult = await generateLessonPlan(genSubject, genClass, genTopic.trim(), genSubtopic.trim(), genDuration);

            const newRecord: LessonPlanRecord = {
                id: `lp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                teacherId,
                teacherName,
                subjectName: genSubject,
                className: genClass,
                topic: genTopic.trim(),
                subtopic: genSubtopic.trim() || 'Core Sub-strand',
                duration: genDuration,
                learningOutcomes: aiResult.learningOutcomes || [],
                keyQuestions: aiResult.keyQuestions || [],
                coreCompetencies: aiResult.coreCompetencies || [],
                learningResources: aiResult.learningResources || [],
                trajectory: aiResult.trajectory || { introduction: '', development: '', conclusion: '' },
                reflection: '',
                status: 'draft',
                institutionId: currentInstitution?.id,
                createdAt: new Date().toISOString().split('T')[0]
            };

            setCurrentPlan(newRecord);
            const updated = [newRecord, ...savedPlans];
            setSavedPlans(updated);
            try {
                localStorage.setItem(`eduai_lesson_plans_${instId}`, JSON.stringify(updated));
            } catch (e) { }

            if (currentInstitution?.id) {
                await apiService.saveModuleRecord('teacher_lesson_plans', newRecord).catch(() => { });
            }
        } catch (error) {
            console.error('Failed to generate lesson plan:', error);
            alert('An error occurred while generating the AI Lesson Plan. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // AI Generate Scheme of Work Matrix
    const handleGenerateScheme = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingScheme(true);
        try {
            const matrix = await generateSchemeOfWork(schemeSubject, schemeClass, schemeTerm, schemeWeeks);

            const newScheme: SchemeOfWorkRecord = {
                id: `sow_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                teacherId,
                teacherName,
                subjectName: schemeSubject,
                className: schemeClass,
                term: schemeTerm,
                academicYear: '2026',
                weeksData: matrix,
                status: 'draft',
                institutionId: currentInstitution?.id
            };

            setCurrentScheme(newScheme);
            const updated = [newScheme, ...savedSchemes];
            setSavedSchemes(updated);
            try {
                localStorage.setItem(`eduai_schemes_of_work_${instId}`, JSON.stringify(updated));
            } catch (e) { }

            if (currentInstitution?.id) {
                await apiService.saveModuleRecord('schemes_of_work', newScheme).catch(() => { });
            }
        } catch (error) {
            console.error('Failed to generate scheme of work:', error);
        } finally {
            setIsGeneratingScheme(false);
        }
    };

    // Save Reflection Note
    const handleSaveReflection = async (planId: string, reflectionText: string) => {
        const updated = savedPlans.map(p => p.id === planId ? { ...p, reflection: reflectionText } : p);
        setSavedPlans(updated);
        if (currentPlan && currentPlan.id === planId) {
            setCurrentPlan({ ...currentPlan, reflection: reflectionText });
        }
        try {
            localStorage.setItem(`eduai_lesson_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }

        const target = updated.find(p => p.id === planId);
        if (target && currentInstitution?.id) {
            await apiService.saveModuleRecord('teacher_lesson_plans', target).catch(() => { });
        }
    };

    // Submit Plan to HOD
    const handleSubmitToHod = async (planId: string) => {
        const updated = savedPlans.map(p => p.id === planId ? { ...p, status: 'submitted' as const } : p);
        setSavedPlans(updated);
        if (currentPlan && currentPlan.id === planId) {
            setCurrentPlan({ ...currentPlan, status: 'submitted' });
        }
        try {
            localStorage.setItem(`eduai_lesson_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }

        const target = updated.find(p => p.id === planId);
        if (target && currentInstitution?.id) {
            await apiService.saveModuleRecord('teacher_lesson_plans', target).catch(() => { });
        }
        alert('Lesson plan submitted to Head of Department for review & sign-off!');
    };

    const handleDeletePlan = async (planId: string) => {
        if (!window.confirm('Are you sure you want to delete this lesson plan?')) return;
        const updated = savedPlans.filter(p => p.id !== planId);
        setSavedPlans(updated);
        if (currentPlan?.id === planId) setCurrentPlan(null);
        try {
            localStorage.setItem(`eduai_lesson_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }
        if (currentInstitution?.id) {
            await apiService.deleteModuleRecord('teacher_lesson_plans', planId).catch(() => { });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 max-w-2xl">
                    <span className="bg-purple-400/20 text-purple-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-purple-400/30 flex items-center gap-1.5 w-fit">
                        <SparklesIcon className="w-3.5 h-3.5" /> CBC & 8-4-4 Teacher Pedagogy Hub
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                        AI Lesson Plans & Schemes of Work
                    </h2>
                    <p className="text-xs text-purple-100/80 leading-relaxed">
                        Generate structured, curriculum-compliant lesson plans, termly schemes of work, manage post-lesson self-reflection, and submit for HOD review.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setActiveTab('lesson_wizard')}
                        className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
                            activeTab === 'lesson_wizard' ? 'bg-purple-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <BookOpenIcon className="w-4 h-4" /> Single Lesson Plan
                    </button>
                    <button
                        onClick={() => setActiveTab('schemes_wizard')}
                        className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
                            activeTab === 'schemes_wizard' ? 'bg-purple-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <CalendarDaysIcon className="w-4 h-4" /> Schemes of Work
                    </button>
                </div>
            </div>

            {/* TAB NAV */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6 text-xs font-black uppercase tracking-wider">
                <button
                    onClick={() => setActiveTab('lesson_wizard')}
                    className={`pb-3 transition-colors ${activeTab === 'lesson_wizard' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    ⚡ AI Lesson Plan Generator
                </button>
                <button
                    onClick={() => setActiveTab('schemes_wizard')}
                    className={`pb-3 transition-colors ${activeTab === 'schemes_wizard' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    📅 Schemes of Work Matrix
                </button>
                <button
                    onClick={() => setActiveTab('bank')}
                    className={`pb-3 transition-colors ${activeTab === 'bank' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    📁 Saved Archive & HOD Approvals ({savedPlans.length})
                </button>
            </div>

            {/* TAB 1: AI LESSON PLAN BUILDER */}
            {activeTab === 'lesson_wizard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Form */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-md space-y-4">
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-purple-500" /> Lesson Plan Configuration
                        </h3>

                        <form onSubmit={handleGenerateLessonPlan} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Subject / Learning Area *
                                </label>
                                <input
                                    type="text"
                                    value={genSubject}
                                    onChange={e => setGenSubject(e.target.value)}
                                    placeholder="e.g. Mathematics, Integrated Science, English"
                                    className="form-input text-xs font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Class / Grade Stream *
                                </label>
                                <input
                                    type="text"
                                    value={genClass}
                                    onChange={e => setGenClass(e.target.value)}
                                    placeholder="e.g. Grade 7 East, Form 3 B"
                                    className="form-input text-xs font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Topic / Strand *
                                </label>
                                <input
                                    type="text"
                                    value={genTopic}
                                    onChange={e => setGenTopic(e.target.value)}
                                    placeholder="e.g. Photosynthesis, Quadratic Equations"
                                    className="form-input text-xs font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Subtopic / Sub-strand
                                </label>
                                <input
                                    type="text"
                                    value={genSubtopic}
                                    onChange={e => setGenSubtopic(e.target.value)}
                                    placeholder="e.g. Light Reaction Stage"
                                    className="form-input text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Lesson Duration (Minutes)
                                </label>
                                <select
                                    value={genDuration}
                                    onChange={e => setGenDuration(Number(e.target.value))}
                                    className="form-select text-xs font-bold"
                                >
                                    <option value={40}>40 Minutes (Single Period)</option>
                                    <option value={80}>80 Minutes (Double Period)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Generating Lesson Plan...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-4 h-4" /> Generate AI Lesson Plan
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Viewer & Reflection Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        {!currentPlan ? (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-slate-100 dark:border-slate-700 text-center space-y-3">
                                <BookOpenIcon className="w-16 h-16 text-slate-300 mx-auto" />
                                <h4 className="text-base font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                                    No Active Lesson Plan
                                </h4>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    Fill in the lesson details on the left and click **Generate AI Lesson Plan** to create a structured CBC/8-4-4 lesson plan.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-slate-700 pb-4 gap-4">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 block">
                                            {currentPlan.subjectName} • {currentPlan.className} ({currentPlan.duration} mins)
                                        </span>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {currentPlan.topic}
                                        </h3>
                                        <span className="text-xs text-slate-500 font-medium">Subtopic: {currentPlan.subtopic}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.print()}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                                        >
                                            <PrinterIcon className="w-4 h-4" /> Print Plan
                                        </button>
                                        {currentPlan.status === 'draft' && (
                                            <button
                                                onClick={() => handleSubmitToHod(currentPlan.id)}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                                            >
                                                Submit to HOD
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Outcomes & Inquiry Questions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">
                                            🎯 Specific Learning Outcomes (SLOs)
                                        </span>
                                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-medium list-disc list-inside">
                                            {currentPlan.learningOutcomes.map((slo, idx) => (
                                                <li key={idx}>{slo}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                                            ❓ Key Inquiry Questions (KIQs)
                                        </span>
                                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-medium list-disc list-inside">
                                            {currentPlan.keyQuestions.map((kiq, idx) => (
                                                <li key={idx}>{kiq}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Trajectory Steps */}
                                <div className="space-y-3 pt-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        ⏱️ Lesson Trajectory & Flow
                                    </span>

                                    <div className="space-y-3">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                                                Introduction (5 Minutes)
                                            </span>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                {currentPlan.trajectory.introduction}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block mb-1">
                                                Lesson Body & Activities (25 Minutes)
                                            </span>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                {currentPlan.trajectory.development}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block mb-1">
                                                Conclusion & Plenary (10 Minutes)
                                            </span>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                {currentPlan.trajectory.conclusion}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Reflection Section */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        📝 Post-Lesson Teacher Self-Reflection Notes
                                    </label>
                                    <textarea
                                        value={currentPlan.reflection || ''}
                                        onChange={e => handleSaveReflection(currentPlan.id, e.target.value)}
                                        placeholder="Record how the lesson went, student engagement levels, and areas for remediation..."
                                        className="form-input text-xs font-medium"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SCHEMES OF WORK MATRIX */}
            {activeTab === 'schemes_wizard' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-wrap gap-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={schemeSubject}
                                    onChange={e => setSchemeSubject(e.target.value)}
                                    className="form-input text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Class</label>
                                <input
                                    type="text"
                                    value={schemeClass}
                                    onChange={e => setSchemeClass(e.target.value)}
                                    className="form-input text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Term</label>
                                <select
                                    value={schemeTerm}
                                    onChange={e => setSchemeTerm(e.target.value)}
                                    className="form-select text-xs font-bold"
                                >
                                    <option value="Term 1">Term 1</option>
                                    <option value="Term 2">Term 2</option>
                                    <option value="Term 3">Term 3</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateScheme}
                            disabled={isGeneratingScheme}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center gap-2"
                        >
                            {isGeneratingScheme ? 'Generating Scheme...' : '✨ Generate Termly Scheme Matrix'}
                        </button>
                    </div>

                    {currentScheme && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Scheme of Work Matrix — {currentScheme.subjectName} ({currentScheme.className} - {currentScheme.term})
                                </h4>
                                <button onClick={() => window.print()} className="text-xs font-bold text-purple-600 hover:underline">
                                    Print Scheme PDF
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-900 font-black uppercase tracking-widest text-[9px] text-slate-500 border-b border-slate-200">
                                            <th className="p-3">Wk</th>
                                            <th className="p-3">Les</th>
                                            <th className="p-3">Strand / Topic</th>
                                            <th className="p-3">Sub-strand</th>
                                            <th className="p-3">Specific Learning Outcomes</th>
                                            <th className="p-3">Key Learning Experiences</th>
                                            <th className="p-3">Resources</th>
                                            <th className="p-3">Assessment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {currentScheme.weeksData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                                <td className="p-3 font-mono font-bold text-purple-600">{item.weekNumber}</td>
                                                <td className="p-3 font-mono">{item.lessonNumber}</td>
                                                <td className="p-3 font-bold">{item.strand}</td>
                                                <td className="p-3">{item.subStrand}</td>
                                                <td className="p-3 max-w-xs">{item.outcomes}</td>
                                                <td className="p-3 max-w-xs">{item.experiences}</td>
                                                <td className="p-3 text-[10px]">{item.resources}</td>
                                                <td className="p-3 text-[10px]">{item.assessment}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: SAVED ARCHIVE & HOD APPROVALS */}
            {activeTab === 'bank' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {savedPlans.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-2">
                            <BookOpenIcon className="w-12 h-12 mx-auto opacity-30" />
                            <p className="text-xs font-bold uppercase tracking-wider">No lesson plans saved yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4">Subject</th>
                                        <th className="p-4">Class</th>
                                        <th className="p-4">Topic / Strand</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {savedPlans.map(plan => (
                                        <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                            <td className="p-4 font-black text-slate-900 dark:text-white">{plan.subjectName}</td>
                                            <td className="p-4 font-mono">{plan.className}</td>
                                            <td className="p-4 font-bold">{plan.topic}</td>
                                            <td className="p-4 font-mono">{plan.duration} mins</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                    plan.status === 'submitted' ? 'bg-amber-100 text-amber-700' : plan.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {plan.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => { setCurrentPlan(plan); setActiveTab('lesson_wizard'); }}
                                                    className="text-xs font-bold text-purple-600 hover:underline"
                                                >
                                                    View / Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePlan(plan.id)}
                                                    className="text-xs font-bold text-rose-600 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
