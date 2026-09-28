import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ExamUnitRecord, TestedPaperConfig } from './ExamUnitsManager';
import { isDemoClassName } from '../../utils/academicUtils';
import { XIcon } from '../icons/XIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

export interface AddEditExamFormData {
    examName: string;
    term: string;
    type: 'CAT' | 'End Term' | 'Inter-school';
    academicYear: string;
    classes: string[];
    testedPaperConfigs: TestedPaperConfig[];
    useCustomRanking: boolean;
    rankingScope: 'overall' | 'per_class';
    customRankingCriteria: 'Points' | 'Total Marks' | 'Mean Score';
    customRankingSubjectsCount: number;
    perClassRankingSettings: Record<string, { criteria: 'Points' | 'Total Marks' | 'Mean Score'; subjectsCount: number; enabled: boolean }>;
    creationMethod: 'raw_marks' | 'combine' | 'excel';
    gradingSystem: string;
    startDate: string;
    submissionDate: string;
}

interface AddEditExamModalProps {
    isOpen: boolean;
    isEditing: boolean;
    activeExam: ExamUnitRecord | null;
    initialClasses?: string[];
    registeredClasses: string[];
    availableGrades: string[];
    allRealStudents: any[];
    extractGradeLabel: (str: string) => string;
    testedPaperConfigs: TestedPaperConfig[];
    setTestedPaperConfigs: React.Dispatch<React.SetStateAction<TestedPaperConfig[]>>;
    onOpenPapersModal: () => void;
    onOpenStudentPicker: () => void;
    handleImportEnrolledSubjects: () => void;
    saveToastMessage: string | null;
    setSaveToastMessage: (msg: string | null) => void;
    onClose: () => void;
    onSave: (data: AddEditExamFormData) => Promise<void> | void;
}

export const AddEditExamModal: React.FC<AddEditExamModalProps> = React.memo(({
    isOpen,
    isEditing,
    activeExam,
    initialClasses,
    registeredClasses,
    availableGrades,
    allRealStudents,
    extractGradeLabel,
    testedPaperConfigs,
    onOpenPapersModal,
    onOpenStudentPicker,
    handleImportEnrolledSubjects,
    saveToastMessage,
    setSaveToastMessage,
    onClose,
    onSave
}) => {
    // Step indicator
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);

    // Form fields
    const [creationMethod, setCreationMethod] = useState<'raw_marks' | 'combine' | 'excel'>('raw_marks');
    const [newExamName, setNewExamName] = useState('');
    const [newExamTypeRadio, setNewExamTypeRadio] = useState<'CAT' | 'End Term' | 'Inter-school'>('CAT');
    const [newAcademicYear, setNewAcademicYear] = useState('2026');
    const [newTerm, setNewTerm] = useState('Term 2');
    const [newGradingSystem, setNewGradingSystem] = useState('Main grading system');
    const [newExamStartDate, setNewExamStartDate] = useState('2026-07-26');
    const [newExamSubmissionDate, setNewExamSubmissionDate] = useState('2026-08-05');

    // Step 2 states
    const [targetStudentSearch, setTargetStudentSearch] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [addExamGradeFilter, setAddExamGradeFilter] = useState<string>('all');

    // Custom ranking criteria
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

    // Ref tracking to only initialize form when modal opens or when editing a different exam
    const prevOpenRef = React.useRef(false);
    const prevExamIdRef = React.useRef<string | null>(null);

    // Initialize/sync form fields ONLY when modal opens or editing exam ID changes
    useEffect(() => {
        if (!isOpen) {
            prevOpenRef.current = false;
            return;
        }

        const justOpened = !prevOpenRef.current;
        const examChanged = isEditing && activeExam?.id !== prevExamIdRef.current;
        prevOpenRef.current = true;
        prevExamIdRef.current = activeExam?.id || null;

        if (!justOpened && !examChanged) {
            return;
        }

        setWizardStep(1);
        if (isEditing && activeExam) {
            setNewExamName(activeExam.name || '');
            setNewTerm(activeExam.term || 'Term 2');
            setNewAcademicYear(activeExam.year ? activeExam.year.toString() : '2026');
            setNewExamTypeRadio(
                activeExam.type === 'End Term' || activeExam.type === 'END TERM'
                    ? 'End Term'
                    : activeExam.type === 'Inter-school' || activeExam.type === 'INTER-SCHOOL'
                    ? 'Inter-school'
                    : 'CAT'
            );
            const cleanExamClasses = (activeExam.classes || []).filter(c => !isDemoClassName(c));
            const cleanInitial = (initialClasses || []).filter(c => !isDemoClassName(c));
            const cleanReg = registeredClasses.filter(c => !isDemoClassName(c));
            setSelectedClasses(cleanExamClasses.length > 0 ? cleanExamClasses : (cleanInitial.length > 0 ? cleanInitial : cleanReg));
            if (activeExam.gradingSystem) setNewGradingSystem(activeExam.gradingSystem);

            if (activeExam.rankingCriteria) {
                setUseCustomRanking(true);
                setCustomRankingCriteria(activeExam.rankingCriteria);
                if (activeExam.rankingScope) setRankingScope(activeExam.rankingScope);
                if (activeExam.customRankingSubjectsCount) setCustomRankingSubjectsCount(activeExam.customRankingSubjectsCount);
                if (activeExam.perClassRankingSettings) setPerClassRankingSettings(activeExam.perClassRankingSettings);
            } else {
                setUseCustomRanking(false);
            }
        } else {
            setNewExamName('');
            setNewTerm('Term 2');
            setNewAcademicYear('2026');
            setNewExamTypeRadio('CAT');
            const cleanInitial = (initialClasses || []).filter(c => !isDemoClassName(c));
            const cleanReg = registeredClasses.filter(c => !isDemoClassName(c));
            setSelectedClasses(cleanInitial.length > 0 ? cleanInitial : (cleanReg.length > 0 ? [cleanReg[0]] : []));
            setUseCustomRanking(false);
            setCreationMethod('raw_marks');
        }
    }, [isOpen, isEditing, activeExam?.id]);

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    const handleSave = () => {
        if (!newExamName.trim()) {
            alert('Please enter an exam name.');
            return;
        }
        if (selectedClasses.length === 0) {
            alert('Please select at least one class sitting this exam.');
            return;
        }

        onSave({
            examName: newExamName.trim(),
            term: newTerm,
            type: newExamTypeRadio,
            academicYear: newAcademicYear,
            classes: selectedClasses,
            testedPaperConfigs,
            useCustomRanking,
            rankingScope,
            customRankingCriteria,
            customRankingSubjectsCount,
            perClassRankingSettings,
            creationMethod,
            gradingSystem: newGradingSystem,
            startDate: newExamStartDate,
            submissionDate: newExamSubmissionDate
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in my-auto flex flex-col max-h-[92vh]">
                {/* Title Bar */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                    <div>
                        <h3 className="font-bold text-base text-slate-800 dark:text-white">{isEditing ? 'Edit exam' : 'Add exam'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {wizardStep} of 2</p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <button type="button" className="hover:text-slate-600 text-lg font-bold">+</button>
                        <button type="button" onClick={onClose} className="hover:text-slate-600 cursor-pointer">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {saveToastMessage && (
                    <div className="bg-emerald-600 text-white px-6 py-2.5 font-bold text-xs flex justify-between items-center animate-in slide-in-from-top-2 shrink-0">
                        <span>{saveToastMessage}</span>
                        <button type="button" onClick={() => setSaveToastMessage(null)} className="hover:opacity-80 text-sm cursor-pointer">✕</button>
                    </div>
                )}

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {wizardStep === 1 ? (
                        /* STEP 1: GENERAL CONFIG */
                        <div className="p-6 space-y-6">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Start by choosing the type of exam you want to create from the three options below.
                            </p>

                            {/* Creation Method Radio Group */}
                            <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="creationMethod"
                                        checked={creationMethod === 'raw_marks'}
                                        onChange={() => setCreationMethod('raw_marks')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Allow teachers to enter raw marks</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="creationMethod"
                                        checked={creationMethod === 'combine'}
                                        onChange={() => setCreationMethod('combine')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Combine existing exams</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="creationMethod"
                                        checked={creationMethod === 'excel'}
                                        onChange={() => setCreationMethod('excel')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Import exam results from Excel</span>
                                </label>
                            </div>

                            {/* Form Fields Table/Grid */}
                            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                {/* Exam Name */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam name</label>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={newExamName}
                                            onChange={e => setNewExamName(e.target.value)}
                                            placeholder="e.g County pre-mock"
                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Exam Type */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam type</label>
                                    <div className="col-span-2 flex items-center gap-6 text-xs text-slate-700 dark:text-slate-300">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="examTypeRadio"
                                                checked={newExamTypeRadio === 'CAT'}
                                                onChange={() => setNewExamTypeRadio('CAT')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>CAT</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="examTypeRadio"
                                                checked={newExamTypeRadio === 'End Term'}
                                                onChange={() => setNewExamTypeRadio('End Term')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>End Term</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="examTypeRadio"
                                                checked={newExamTypeRadio === 'Inter-school'}
                                                onChange={() => setNewExamTypeRadio('Inter-school')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Inter-school</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Academic Year */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Academic year</label>
                                    <div className="col-span-2 relative">
                                        <select
                                            value={newAcademicYear}
                                            onChange={e => setNewAcademicYear(e.target.value)}
                                            className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="2026">2026</option>
                                            <option value="2025">2025</option>
                                            <option value="2024">2024</option>
                                        </select>
                                        <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Term - Isolated local state for zero-lag instant responsiveness */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Term</label>
                                    <div className="col-span-2 relative">
                                        <select
                                            value={newTerm}
                                            onChange={e => setNewTerm(e.target.value)}
                                            className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            <option value="Term 1">Term 1</option>
                                            <option value="Term 2">Term 2</option>
                                            <option value="Term 3">Term 3</option>
                                        </select>
                                        <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Grading System */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Grading system</label>
                                    <div className="col-span-2 relative">
                                        <select
                                            value={newGradingSystem}
                                            onChange={e => setNewGradingSystem(e.target.value)}
                                            className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="Main grading system">Main grading system</option>
                                            <option value="8-4-4 KCSE Grading">8-4-4 KCSE Grading</option>
                                            <option value="CBC Standardized Grading">CBC Standardized Grading</option>
                                        </select>
                                        <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Exam Starts On */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam starts on</label>
                                    <div className="col-span-2">
                                        <input
                                            type="date"
                                            value={newExamStartDate}
                                            onChange={e => setNewExamStartDate(e.target.value)}
                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Marks Submission Deadline */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Marks submission deadline</label>
                                    <div className="col-span-2">
                                        <input
                                            type="date"
                                            value={newExamSubmissionDate}
                                            onChange={e => setNewExamSubmissionDate(e.target.value)}
                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: STUDENTS & PAPERS SCOPE & UNIQUE RANKING CRITERIA */
                        <div className="p-6 space-y-6">
                            {/* Instructions prompt */}
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                Specify the students that will be sitting this exam by entering student names, admission or class name. If not all subjects will be tested, click <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">'Papers to Test'</span> to choose papers being tested. You can also specify a unique ranking criteria to be used on this exam only.
                            </p>

                            {/* Section 1: Student Scope & Search */}
                            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Students Sitting Exam</label>
                                <input
                                    type="text"
                                    value={targetStudentSearch}
                                    onChange={e => setTargetStudentSearch(e.target.value)}
                                    placeholder="Search student names, admission no. or class..."
                                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                />

                                <div className="pt-0.5">
                                    <button
                                        type="button"
                                        onClick={onOpenStudentPicker}
                                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                                    >
                                        <UserGroupIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Choose from students</span>
                                    </button>
                                </div>

                                {/* Search result hint */}
                                {(() => {
                                    const q = targetStudentSearch.trim().toLowerCase();
                                    if (!q) return null;
                                    const matchedStudents = allRealStudents.filter(u => {
                                        const admNo = String((u as any).admissionNumber || (u as any).admNo || (u as any).adm_no || '').toLowerCase();
                                        const name = String((u as any).fullName || (u as any).name || u.email || '').toLowerCase();
                                        return admNo.includes(q) || name.includes(q);
                                    });
                                    if (matchedStudents.length === 0 && !registeredClasses.some(c => c.toLowerCase().includes(q))) {
                                        return <p className="text-[11px] text-red-500 font-medium">No students or classes found matching "{targetStudentSearch}"</p>;
                                    }
                                    if (matchedStudents.length > 0) {
                                        return <p className="text-[11px] text-blue-600 font-semibold">{matchedStudents.length} student{matchedStudents.length > 1 ? 's' : ''} found — their classes are highlighted below</p>;
                                    }
                                    return null;
                                })()}

                                {/* Target Classes Selector with Select All / Clear All */}
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-[11px] font-medium text-slate-500">Classes Sitting Exam ({selectedClasses.length} selected)</span>
                                    <div className="flex gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedClasses(registeredClasses.filter(c => !isDemoClassName(c)))}
                                            className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedClasses([])}
                                            className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                {/* Grade filter buttons for class selection */}
                                {availableGrades.length > 1 && (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                        <span className="text-[10px] font-bold text-slate-400 mr-1">Filter Grades:</span>
                                        <button
                                            type="button"
                                            onClick={() => setAddExamGradeFilter('all')}
                                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                                addExamGradeFilter === 'all'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                            }`}
                                        >
                                            All Grades
                                        </button>
                                        {availableGrades.map((g: string) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setAddExamGradeFilter(g)}
                                                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                                    addExamGradeFilter === g
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                                    {(() => {
                                        const q = targetStudentSearch.trim().toLowerCase();
                                        const studentMatchedClasses = new Set<string>();
                                        if (q) {
                                            allRealStudents.forEach(u => {
                                                const admNo = String((u as any).admissionNumber || (u as any).admNo || (u as any).adm_no || '').toLowerCase();
                                                const name = String((u as any).fullName || (u as any).name || u.email || '').toLowerCase();
                                                if (admNo.includes(q) || name.includes(q)) {
                                                    const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                                                    if (cl) studentMatchedClasses.add(String(cl).trim());
                                                }
                                            });
                                        }
                                        let visibleClasses = (q
                                            ? registeredClasses.filter(c => c.toLowerCase().includes(q) || studentMatchedClasses.has(c))
                                            : registeredClasses).filter(c => !isDemoClassName(c));
                                        if (addExamGradeFilter && addExamGradeFilter !== 'all') {
                                            const normG = extractGradeLabel(addExamGradeFilter).toLowerCase();
                                            visibleClasses = visibleClasses.filter(c => extractGradeLabel(c).toLowerCase() === normG);
                                        }
                                        return visibleClasses.map(cName => {
                                            const isChecked = selectedClasses.includes(cName);
                                            const hasDirectStudentMatch = studentMatchedClasses.has(cName);
                                            return (
                                                <label
                                                    key={cName}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-all ${
                                                        isChecked
                                                            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-xs'
                                                            : hasDirectStudentMatch
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-200 ring-2 ring-amber-400/40'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedClasses([...selectedClasses, cName]);
                                                            } else {
                                                                setSelectedClasses(selectedClasses.filter(c => c !== cName));
                                                            }
                                                        }}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>{cName}</span>
                                                    {hasDirectStudentMatch && (
                                                        <span className="ml-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-1 rounded">MATCH</span>
                                                    )}
                                                </label>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Section 2: Exam Papers */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">Exam Papers</h4>
                                    <p className="text-[10px] text-slate-400">{testedPaperConfigs.filter(p => p.enabled).length} paper components configured for testing</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleImportEnrolledSubjects}
                                        className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <SparklesIcon className="w-4 h-4 text-emerald-500" /> Use Enrolled Subjects
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onOpenPapersModal}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <DocumentTextIcon className="w-4 h-4" /> Papers to Test
                                    </button>
                                </div>
                            </div>

                            {/* Section 3: Unique Ranking Criteria */}
                            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-white">
                                    <input
                                        type="checkbox"
                                        checked={useCustomRanking}
                                        onChange={e => setUseCustomRanking(e.target.checked)}
                                        className="text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span>Specify a unique ranking criteria for this exam only</span>
                                </label>

                                {useCustomRanking && (
                                    <div className="space-y-4 pl-6 pt-1 animate-fade-in">
                                        {/* Scope Radio options: Overall vs Per-Class */}
                                        <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rankingScope"
                                                    checked={rankingScope === 'overall'}
                                                    onChange={() => setRankingScope('overall')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Overall (All sitting classes)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rankingScope"
                                                    checked={rankingScope === 'per_class'}
                                                    onChange={() => setRankingScope('per_class')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Specify unique criteria per class</span>
                                            </label>
                                        </div>

                                        {rankingScope === 'overall' ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Criteria</label>
                                                    <select
                                                        value={customRankingCriteria}
                                                        onChange={e => setCustomRankingCriteria(e.target.value as any)}
                                                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                                    >
                                                        <option value="Points">Points</option>
                                                        <option value="Total Marks">Total Marks</option>
                                                        <option value="Mean Score">Mean Score</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subjects Count</label>
                                                    <select
                                                        value={customRankingSubjectsCount}
                                                        onChange={e => setCustomRankingSubjectsCount(parseInt(e.target.value) || 7)}
                                                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                                    >
                                                        <option value={7}>7 Subjects</option>
                                                        <option value={8}>8 Subjects</option>
                                                        <option value={9}>9 Subjects</option>
                                                        <option value={10}>10 Subjects</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Per Class Table View */
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm max-h-48 overflow-y-auto">
                                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left">Class Name</th>
                                                            <th className="px-3 py-2 text-center w-16">Rank</th>
                                                            <th className="px-3 py-2 text-left">Criteria</th>
                                                            <th className="px-3 py-2 text-center w-24">Subjects</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {selectedClasses.map(cName => {
                                                            const conf = perClassRankingSettings[cName] || { criteria: 'Points', subjectsCount: 7, enabled: true };
                                                            return (
                                                                <tr key={cName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{cName}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={conf.enabled}
                                                                            onChange={e => {
                                                                                setPerClassRankingSettings(prev => ({
                                                                                    ...prev,
                                                                                    [cName]: { ...conf, enabled: e.target.checked }
                                                                                }));
                                                                            }}
                                                                            className="text-blue-600 rounded focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <select
                                                                            value={conf.criteria}
                                                                            disabled={!conf.enabled}
                                                                            onChange={e => {
                                                                                setPerClassRankingSettings(prev => ({
                                                                                    ...prev,
                                                                                    [cName]: { ...conf, criteria: e.target.value as any }
                                                                                }));
                                                                            }}
                                                                            className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold disabled:opacity-50"
                                                                        >
                                                                            <option value="Points">Points</option>
                                                                            <option value="Total Marks">Total Marks</option>
                                                                            <option value="Mean Score">Mean Score</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <select
                                                                            value={conf.subjectsCount}
                                                                            disabled={!conf.enabled}
                                                                            onChange={e => {
                                                                                setPerClassRankingSettings(prev => ({
                                                                                    ...prev,
                                                                                    [cName]: { ...conf, subjectsCount: parseInt(e.target.value) || 7 }
                                                                                }));
                                                                            }}
                                                                            className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-center disabled:opacity-50"
                                                                        >
                                                                            <option value={7}>7</option>
                                                                            <option value={8}>8</option>
                                                                            <option value={9}>9</option>
                                                                            <option value={10}>10</option>
                                                                        </select>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Buttons */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    {wizardStep === 2 ? (
                        <button
                            type="button"
                            onClick={() => setWizardStep(1)}
                            className="px-5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all"
                        >
                            &larr; Back
                        </button>
                    ) : <div></div>}

                    <div className="flex items-center gap-3">
                        {wizardStep === 1 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!newExamName.trim()) {
                                        alert('Please enter an exam name.');
                                        return;
                                    }
                                    setWizardStep(2);
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm transition-all cursor-pointer"
                            >
                                Next &rarr;
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-sm transition-all cursor-pointer"
                            >
                                {isEditing ? 'Save & Update Exam' : 'Save & Create Exam'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
});
