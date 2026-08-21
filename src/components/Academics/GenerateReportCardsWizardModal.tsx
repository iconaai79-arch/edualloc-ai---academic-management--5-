import React, { useState, useMemo } from 'react';
import type { Assessment, Institution } from '../../types';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface GenerateReportCardsWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentInstitution?: Institution | null;
    assessments?: Assessment[];
    savedExamUnits?: any[];
    onApplyReportConfig?: (config: {
        academicYear: string;
        academicTerm: string;
        selectedExamIds: string[];
        calculationMode: 'average' | 'sum' | 'weightage';
        examWeights: Record<string, number>;
        gradingSystem: string;
        targetClass: string;
    }) => void;
}

export const GenerateReportCardsWizardModal: React.FC<GenerateReportCardsWizardModalProps> = ({
    isOpen,
    onClose,
    currentInstitution,
    assessments = [],
    savedExamUnits = [],
    onApplyReportConfig
}) => {
    // Top-level selections
    const [academicYear, setAcademicYear] = useState<string>('2026');
    const [selectedTerm, setSelectedTerm] = useState<string>(''); // '', 'Term 1', 'Term 2', 'Term 3'
    
    // Step configuration
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
    const [calculationMode, setCalculationMode] = useState<'average' | 'sum' | 'weightage'>('average');
    const [examWeights, setExamWeights] = useState<Record<string, number>>({});
    const [gradingSystem, setGradingSystem] = useState<string>('cbc_standard');
    const [targetClass, setTargetClass] = useState<string>('all');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationSuccess, setGenerationSuccess] = useState<boolean>(false);

    // Available exams pool
    const allExams = useMemo(() => {
        const list: any[] = [];
        const seen = new Set<string>();

        (savedExamUnits || []).forEach(e => {
            if (e && e.id && !seen.has(e.id)) {
                seen.add(e.id);
                list.push({
                    id: e.id,
                    title: e.name || e.title || 'Exam',
                    year: String(e.academicYearId || e.academic_year_id || e.year || '2026').substring(0, 4),
                    term: e.term || e.academicTerm || 'Term 1',
                    type: e.type || e.examType || 'END TERM'
                });
            }
        });

        (assessments || []).forEach(a => {
            if (a && a.id && !seen.has(a.id)) {
                seen.add(a.id);
                list.push({
                    id: a.id,
                    title: a.title,
                    year: String((a as any).year || (a as any).academicYear || '2026').substring(0, 4),
                    term: (a as any).term || (a as any).academicTerm || 'Term 1',
                    type: (a as any).type || 'MID TERM'
                });
            }
        });

        if (list.length === 0) {
            return [
                { id: 'ex_1', title: 'OPENER EXAM', year: '2026', term: 'Term 1', type: 'OPENER' },
                { id: 'ex_2', title: 'MID TERM 1 EXAMINATION', year: '2026', term: 'Term 1', type: 'MID TERM' },
                { id: 'ex_3', title: 'END TERM 1 EXAMINATION', year: '2026', term: 'Term 1', type: 'END TERM' },
                { id: 'ex_4', title: 'MID TERM 2 EXAMINATION', year: '2026', term: 'Term 2', type: 'MID TERM' },
                { id: 'ex_5', title: 'END TERM 2 EXAMINATION', year: '2026', term: 'Term 2', type: 'END TERM' },
                { id: 'ex_6', title: 'END TERM 3 EXAMINATION', year: '2026', term: 'Term 3', type: 'END TERM' },
            ];
        }

        return list;
    }, [savedExamUnits, assessments]);

    // Filtered exams for selected year & term
    const termFilteredExams = useMemo(() => {
        if (!selectedTerm) return [];
        const termNorm = selectedTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
        return allExams.filter(e => {
            const yMatch = String(e.year).includes(academicYear) || academicYear.includes(String(e.year));
            const eTermNorm = String(e.term).toLowerCase().replace(/[^a-z0-9]/g, '');
            const tMatch = eTermNorm === termNorm || eTermNorm.includes(termNorm) || termNorm.includes(eTermNorm);
            return yMatch && tMatch;
        });
    }, [allExams, academicYear, selectedTerm]);

    // Toggle Exam Selection (Up to 3)
    const handleToggleExam = (examId: string) => {
        if (selectedExamIds.includes(examId)) {
            setSelectedExamIds(prev => prev.filter(id => id !== examId));
            setExamWeights(prev => {
                const next = { ...prev };
                delete next[examId];
                return next;
            });
        } else {
            if (selectedExamIds.length >= 3) {
                alert('You can combine up to a maximum of 3 exams in one report card.');
                return;
            }
            const nextList = [...selectedExamIds, examId];
            setSelectedExamIds(nextList);
            
            // Auto calculate equal weights
            const equalWeight = Math.round(100 / nextList.length);
            const weights: Record<string, number> = {};
            nextList.forEach((id, idx) => {
                if (idx === nextList.length - 1) {
                    weights[id] = 100 - (equalWeight * (nextList.length - 1));
                } else {
                    weights[id] = equalWeight;
                }
            });
            setExamWeights(weights);
        }
    };

    // Handle Generate Report Cards
    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setGenerationSuccess(true);
            if (onApplyReportConfig) {
                onApplyReportConfig({
                    academicYear,
                    academicTerm: selectedTerm || 'Term 1',
                    selectedExamIds,
                    calculationMode,
                    examWeights,
                    gradingSystem,
                    targetClass
                });
            }
            setTimeout(() => {
                setGenerationSuccess(false);
                onClose();
            }, 1200);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
                            Generate report cards
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed max-w-xl">
                            You can combine upto three exams in one report card with the total marks being a sum, average or a percent weightage of the exams. The grading system you choose will determine how overall marks and subject marks are graded.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <button
                            type="button"
                            onClick={() => {}}
                            className="p-1 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-light leading-none cursor-pointer"
                            title="Expand"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-light leading-none cursor-pointer"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Top Selectors Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        {/* Academic Year Dropdown */}
                        <div className="sm:col-span-5 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Academic year
                            </label>
                            <div className="relative">
                                <select
                                    value={academicYear}
                                    onChange={e => setAcademicYear(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                >
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                </select>
                                <span className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-xs">▼</span>
                            </div>
                        </div>

                        {/* Choose exams to grade Radio Group */}
                        <div className="sm:col-span-7 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Choose exams to grade
                            </label>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300 pt-1">
                                {['Term 1', 'Term 2', 'Term 3'].map(t => (
                                    <label key={t} className="flex items-center gap-1.5 cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="term_exams_group"
                                            value={t}
                                            checked={selectedTerm === t}
                                            onChange={() => {
                                                setSelectedTerm(t);
                                                setSelectedExamIds([]);
                                            }}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                                        />
                                        <span>{t} exams</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Interactive Stage Box */}
                    <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 min-h-[260px] flex flex-col justify-center items-center">
                        {/* State 1: Initial Prompt When No Term Chosen */}
                        {!selectedTerm && (
                            <div className="text-center space-y-3 py-6 animate-in fade-in">
                                {/* Rounded Blue Sad Face Icon */}
                                <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center mx-auto text-blue-500">
                                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" stroke="none" />
                                        <path d="M9 9h.01" strokeWidth="3.5" />
                                        <path d="M15 9h.01" strokeWidth="3.5" />
                                        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Get started
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Choose both the academic year and term above.
                                </p>
                            </div>
                        )}

                        {/* State 2: Term Selected — Exam Selection & Combination Settings */}
                        {selectedTerm && (
                            <div className="w-full space-y-5 animate-in fade-in">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                            Available {academicYear} {selectedTerm} Examinations ({termFilteredExams.length})
                                        </span>
                                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                            {selectedExamIds.length}/3 selected
                                        </span>
                                    </div>

                                    {termFilteredExams.length === 0 ? (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-xs text-slate-500">
                                            No published exams found for {academicYear} {selectedTerm}. You can select exams from another term or create new exams.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {termFilteredExams.map(ex => {
                                                const isChecked = selectedExamIds.includes(ex.id);
                                                return (
                                                    <label
                                                        key={ex.id}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                                            isChecked
                                                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleExam(ex.id)}
                                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                                        />
                                                        <div className="truncate flex-1">
                                                            <div className="truncate font-bold">{ex.title}</div>
                                                            <div className="text-[10px] text-slate-400 font-normal">{ex.type} • {ex.year}</div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Calculation Mode & Weightage Configuration */}
                                {selectedExamIds.length > 0 && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Exam Marks Calculation Method
                                            </span>
                                            <div className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="calc_mode"
                                                        value="average"
                                                        checked={calculationMode === 'average'}
                                                        onChange={() => setCalculationMode('average')}
                                                        className="text-blue-600"
                                                    />
                                                    <span>Average</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="calc_mode"
                                                        value="sum"
                                                        checked={calculationMode === 'sum'}
                                                        onChange={() => setCalculationMode('sum')}
                                                        className="text-blue-600"
                                                    />
                                                    <span>Sum</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="calc_mode"
                                                        value="weightage"
                                                        checked={calculationMode === 'weightage'}
                                                        onChange={() => setCalculationMode('weightage')}
                                                        className="text-blue-600"
                                                    />
                                                    <span>Percent Weightage</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Weightage Inputs */}
                                        {calculationMode === 'weightage' && (
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {selectedExamIds.map(id => {
                                                    const ex = allExams.find(e => e.id === id);
                                                    return (
                                                        <div key={id} className="space-y-1">
                                                            <span className="text-[10px] font-bold text-slate-500 truncate block">
                                                                {ex?.title || id} (%)
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={examWeights[id] ?? 0}
                                                                onChange={e => setExamWeights(prev => ({
                                                                    ...prev,
                                                                    [id]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                                                }))}
                                                                className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-bold text-slate-800 dark:text-slate-100"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Grading System Selection */}
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Grading System
                                                </label>
                                                <select
                                                    value={gradingSystem}
                                                    onChange={e => setGradingSystem(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                                                >
                                                    <option value="cbc_standard">Standard CBC Scale (EE, ME, AE, BE)</option>
                                                    <option value="knec_secondary">Secondary 12-Point KNEC Scale (A to E)</option>
                                                    <option value="knec_primary_844">Primary KNEC 8-4-4 Standard Scale</option>
                                                    <option value="institution_custom">Institution Custom Grading Scale</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                    Target Class
                                                </label>
                                                <select
                                                    value={targetClass}
                                                    onChange={e => setTargetClass(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                                                >
                                                    <option value="all">All Classes / Whole School</option>
                                                    <option value="PP1">PP1</option>
                                                    <option value="PP2">PP2</option>
                                                    <option value="Grade 1">Grade 1</option>
                                                    <option value="Grade 2">Grade 2</option>
                                                    <option value="Grade 3">Grade 3</option>
                                                    <option value="Grade 4">Grade 4</option>
                                                    <option value="Grade 5">Grade 5</option>
                                                    <option value="Grade 6">Grade 6</option>
                                                    <option value="Grade 7">Grade 7 (JSS)</option>
                                                    <option value="Grade 8">Grade 8 (JSS)</option>
                                                    <option value="Grade 9">Grade 9 (JSS)</option>
                                                    <option value="Form 1">Form 1</option>
                                                    <option value="Form 2">Form 2</option>
                                                    <option value="Form 3">Form 3</option>
                                                    <option value="Form 4">Form 4</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!selectedTerm || selectedExamIds.length === 0 || isGenerating}
                        onClick={handleGenerate}
                        className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                            selectedTerm && selectedExamIds.length > 0 && !isGenerating
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-md'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <span className="animate-spin text-sm">⟳</span>
                                <span>Generating Report Cards...</span>
                            </>
                        ) : generationSuccess ? (
                            <>
                                <CheckCircleIcon className="w-4 h-4 text-emerald-300" />
                                <span>Generated Successfully!</span>
                            </>
                        ) : (
                            <span>Next</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
