import React, { useState, useMemo, useEffect } from 'react';
import type { Assessment, Institution } from '../../types';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { apiService } from '../../services/apiService';

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
        calculationMode: 'percent' | 'average' | 'sum';
        examWeights: Record<string, number>;
        gradingSystem: string;
        termEndDate: string;
        nextTermStartDate: string;
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
    const instId = currentInstitution?.id || 'default_inst';

    // 1. Top filters
    const [academicYear, setAcademicYear] = useState<string>('2026');
    const [selectedTerm, setSelectedTerm] = useState<string>('Term 1'); // 'Term 1', 'Term 2', 'Term 3'
    
    // 2. Calculation Mode
    const [calculationMode, setCalculationMode] = useState<'percent' | 'average' | 'sum'>('percent');
    
    // 3. Selected Exams & Weightage
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
    const [examWeights, setExamWeights] = useState<Record<string, number>>({});
    
    // 4. Grading System & Term Dates
    const [gradingSystem, setGradingSystem] = useState<string>('main grading system');
    const [termEndDate, setTermEndDate] = useState<string>('2026-04-26');
    const [nextTermStartDate, setNextTermStartDate] = useState<string>('2026-04-27');

    // 5. Live Exam records
    const [liveExamUnits, setLiveExamUnits] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
            if (saved) return JSON.parse(saved) || [];
        } catch (e) {}
        return [];
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setLiveExamUnits(records);
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution?.id]);

    // Available exams pool
    const allExams = useMemo(() => {
        const list: any[] = [];
        const seen = new Set<string>();

        (liveExamUnits || []).forEach(e => {
            if (e && e.id && !seen.has(e.id)) {
                seen.add(e.id);
                list.push({
                    id: e.id,
                    title: (e.name || e.title || 'Exam').toUpperCase(),
                    year: String(e.academicYearId || e.academic_year_id || e.year || '2026').substring(0, 4),
                    term: e.term || e.academicTerm || 'Term 1',
                    type: (e.type || e.examType || 'end term').toLowerCase(),
                    addedOn: e.created_at || e.createdAt ? new Date(e.created_at || e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Mar 19 12:01 AM'
                });
            }
        });

        (savedExamUnits || []).forEach(e => {
            if (e && e.id && !seen.has(e.id)) {
                seen.add(e.id);
                list.push({
                    id: e.id,
                    title: (e.name || e.title || 'Exam').toUpperCase(),
                    year: String(e.academicYearId || e.academic_year_id || e.year || '2026').substring(0, 4),
                    term: e.term || e.academicTerm || 'Term 1',
                    type: (e.type || e.examType || 'end term').toLowerCase(),
                    addedOn: 'Mar 19 12:01 AM'
                });
            }
        });

        (assessments || []).forEach(a => {
            if (a && a.id && !seen.has(a.id)) {
                seen.add(a.id);
                list.push({
                    id: a.id,
                    title: (a.title || 'Exam').toUpperCase(),
                    year: String((a as any).year || (a as any).academicYear || '2026').substring(0, 4),
                    term: (a as any).term || (a as any).academicTerm || 'Term 1',
                    type: ((a as any).type || 'mid term').toLowerCase(),
                    addedOn: 'Mar 19 12:01 AM'
                });
            }
        });

        if (list.length === 0) {
            return [
                { id: 'ex_1', title: 'END TERM EXAM', year: '2026', term: 'Term 1', type: 'end term', addedOn: 'Mar 19 12:01 AM' },
                { id: 'ex_2', title: 'MID TERM EXAM', year: '2026', term: 'Term 1', type: 'mid term', addedOn: 'Feb 15 10:30 AM' },
                { id: 'ex_3', title: 'OPENER EXAM', year: '2026', term: 'Term 1', type: 'opener', addedOn: 'Jan 10 08:00 AM' },
                { id: 'ex_4', title: 'MID TERM 2 EXAMINATION', year: '2026', term: 'Term 2', type: 'mid term', addedOn: 'Jun 12 09:15 AM' },
                { id: 'ex_5', title: 'END TERM 2 EXAMINATION', year: '2026', term: 'Term 2', type: 'end term', addedOn: 'Jul 28 11:45 AM' },
                { id: 'ex_6', title: 'END TERM 3 EXAMINATION', year: '2026', term: 'Term 3', type: 'end term', addedOn: 'Nov 02 02:00 PM' }
            ];
        }

        return list;
    }, [liveExamUnits, savedExamUnits, assessments]);

    // Filtered exams for selected year & term
    const termFilteredExams = useMemo(() => {
        if (!selectedTerm) return [];
        const termNorm = selectedTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = allExams.filter(e => {
            const yMatch = String(e.year).includes(academicYear) || academicYear.includes(String(e.year));
            const eTermNorm = String(e.term).toLowerCase().replace(/[^a-z0-9]/g, '');
            const tMatch = eTermNorm === termNorm || eTermNorm.includes(termNorm) || termNorm.includes(eTermNorm);
            return yMatch && tMatch;
        });

        if (matched.length > 0) return matched;

        // Ensure at least sample exams if empty for this term
        return [
            { id: `ex_${termNorm}_end`, title: 'END TERM EXAM', year: academicYear, term: selectedTerm, type: 'end term', addedOn: 'Mar 19 12:01 AM' },
            { id: `ex_${termNorm}_mid`, title: 'MID TERM EXAM', year: academicYear, term: selectedTerm, type: 'mid term', addedOn: 'Feb 15 10:30 AM' },
            { id: `ex_${termNorm}_opn`, title: 'OPENER EXAM', year: academicYear, term: selectedTerm, type: 'opener', addedOn: 'Jan 10 08:00 AM' }
        ];
    }, [allExams, academicYear, selectedTerm]);

    // Initialize selected exams when term changes
    useEffect(() => {
        if (termFilteredExams.length > 0) {
            const firstExam = termFilteredExams[0];
            setSelectedExamIds([firstExam.id]);
            setExamWeights({ [firstExam.id]: 30 });
        } else {
            setSelectedExamIds([]);
            setExamWeights({});
        }
    }, [selectedTerm, academicYear]);

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
            setExamWeights(prev => ({
                ...prev,
                [examId]: prev[examId] || (nextList.length === 1 ? 100 : nextList.length === 2 ? 50 : 30)
            }));
        }
    };

    // Toggle Select All (or up to 3)
    const handleToggleSelectAll = () => {
        if (selectedExamIds.length === termFilteredExams.length || selectedExamIds.length >= 3) {
            setSelectedExamIds([]);
            setExamWeights({});
        } else {
            const toSelect = termFilteredExams.slice(0, 3).map(e => e.id);
            setSelectedExamIds(toSelect);
            const w: Record<string, number> = {};
            toSelect.forEach(id => { w[id] = Math.round(100 / toSelect.length); });
            setExamWeights(w);
        }
    };

    // Handle Generation Action
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationSuccess, setGenerationSuccess] = useState<boolean>(false);

    const handleNext = () => {
        if (selectedExamIds.length === 0) {
            alert('Please select at least one exam to include in the report card.');
            return;
        }

        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setGenerationSuccess(true);
            if (onApplyReportConfig) {
                onApplyReportConfig({
                    academicYear,
                    academicTerm: selectedTerm,
                    selectedExamIds,
                    calculationMode,
                    examWeights,
                    gradingSystem,
                    termEndDate,
                    nextTermStartDate
                });
            }
            setTimeout(() => {
                setGenerationSuccess(false);
                onClose();
            }, 1000);
        }, 1200);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] font-sans">
                {/* Header */}
                <div className="p-6 pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Generate report cards
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl pt-1">
                            You can combine upto three exams in one report card with the total marks being a sum, average or a percent weightage of the exams. The grading system you choose will determine how overall marks and subject marks are graded.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 shrink-0 ml-4">
                        <button
                            type="button"
                            onClick={() => {}}
                            className="text-lg hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-light leading-none"
                            title="Expand"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-lg hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-light leading-none"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                    {/* Top Selectors Bar: Academic Year & Choose Exams To Grade */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Academic Year */}
                        <div className="md:col-span-5 space-y-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                                Academic year
                            </label>
                            <div className="relative">
                                <select
                                    value={academicYear}
                                    onChange={e => setAcademicYear(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                >
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                </select>
                                <span className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                            </div>
                        </div>

                        {/* Choose exams to grade */}
                        <div className="md:col-span-7 space-y-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                                Choose exams to grade
                            </label>
                            <div className="flex items-center gap-6 pt-1">
                                {['Term 1', 'Term 2', 'Term 3'].map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                                        <input
                                            type="radio"
                                            name="term_exams_picker"
                                            value={t}
                                            checked={selectedTerm === t}
                                            onChange={() => setSelectedTerm(t)}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                                        />
                                        <span>{t} exams</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* How to calculate total marks */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                            How to calculate total marks
                        </label>
                        <div className="flex items-center gap-6 pt-0.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                                <input
                                    type="radio"
                                    name="calc_total_marks"
                                    value="percent"
                                    checked={calculationMode === 'percent'}
                                    onChange={() => setCalculationMode('percent')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                                />
                                <span>By percent</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                                <input
                                    type="radio"
                                    name="calc_total_marks"
                                    value="average"
                                    checked={calculationMode === 'average'}
                                    onChange={() => setCalculationMode('average')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                                />
                                <span>By average</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                                <input
                                    type="radio"
                                    name="calc_total_marks"
                                    value="sum"
                                    checked={calculationMode === 'sum'}
                                    onChange={() => setCalculationMode('sum')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                                />
                                <span>By sum</span>
                            </label>
                        </div>
                    </div>

                    {/* Table of Available Exams */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-800">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedExamIds.length > 0 && selectedExamIds.length === Math.min(3, termFilteredExams.length)}
                                            onChange={handleToggleSelectAll}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-3 font-semibold text-slate-700 dark:text-slate-200">Exam</th>
                                    <th className="p-3 font-semibold text-slate-700 dark:text-slate-200">Type</th>
                                    <th className="p-3 font-semibold text-slate-700 dark:text-slate-200">Added On</th>
                                    <th className="p-3 font-semibold text-slate-700 dark:text-slate-200 w-40">Weightage (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                                {termFilteredExams.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                                            No exams found for {selectedTerm} {academicYear}.
                                        </td>
                                    </tr>
                                ) : (
                                    termFilteredExams.map(ex => {
                                        const isSelected = selectedExamIds.includes(ex.id);
                                        return (
                                            <tr
                                                key={ex.id}
                                                className={`transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                                            >
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleExam(ex.id)}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 font-bold text-slate-900 dark:text-white uppercase">
                                                    {ex.title}
                                                </td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                                                    {ex.type}
                                                </td>
                                                <td className="p-3 text-slate-600 dark:text-slate-400">
                                                    {ex.addedOn}
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g 30"
                                                        disabled={!isSelected || calculationMode !== 'percent'}
                                                        value={calculationMode === 'percent' ? (examWeights[ex.id] ?? '') : (calculationMode === 'average' ? 'Avg' : 'Sum')}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                                            setExamWeights(prev => ({
                                                                ...prev,
                                                                [ex.id]: val
                                                            }));
                                                        }}
                                                        className={`w-full px-3 py-1.5 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                            !isSelected || calculationMode !== 'percent'
                                                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                                                        }`}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Settings Row: Grading System, Term Ends On, Next Term Begins On */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
                        {/* Grading system to use */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                                Grading system to use
                            </label>
                            <div className="relative">
                                <select
                                    value={gradingSystem}
                                    onChange={e => setGradingSystem(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                >
                                    <option value="main grading system">main grading system</option>
                                    <option value="cbc_standard">CBC Standard Scale (EE, ME, AE, BE)</option>
                                    <option value="knec_secondary_12pt">KNEC Secondary 12-Point Scale (A to E)</option>
                                    <option value="knec_primary_844">KNEC Primary 8-4-4 Standard Scale</option>
                                </select>
                                <span className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                            </div>
                        </div>

                        {/* Current term ends on */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                                Current term ends on
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 pointer-events-none text-slate-400 text-xs">📅</span>
                                <input
                                    type="date"
                                    value={termEndDate}
                                    onChange={e => setTermEndDate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                />
                            </div>
                        </div>

                        {/* Next term begins on */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                                Next term begins on
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 pointer-events-none text-slate-400 text-xs">📅</span>
                                <input
                                    type="date"
                                    value={nextTermStartDate}
                                    onChange={e => setNextTermStartDate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with Next Button */}
                <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end items-center">
                    <button
                        type="button"
                        disabled={isGenerating || selectedExamIds.length === 0}
                        onClick={handleNext}
                        className={`px-8 py-2 rounded-md font-semibold text-xs border transition-all cursor-pointer shadow-xs ${
                            selectedExamIds.length > 0 && !isGenerating
                            ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600'
                            : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed'
                        }`}
                    >
                        {isGenerating ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin text-sm">⟳</span>
                                <span>Generating...</span>
                            </span>
                        ) : generationSuccess ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>Generated!</span>
                            </span>
                        ) : (
                            <span>Next</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
