import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, AcademicLevel, Course, Subject } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface SubjectGroupingConfig {
    enabledYearGroupIds: string[];
    enforceKnecBestSeven: boolean;
    autoCalculateRanks: boolean;
    requireMinScienceCount: number;
    requireMinHumanityCount: number;
    compulsoryGroupIds: string[];
    updatedAt?: string;
}

interface SubjectGroupingManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    academicLevels?: AcademicLevel[];
    courses?: Course[];
    subjects?: Subject[];
}

export const SubjectGroupingManager: React.FC<SubjectGroupingManagerProps> = ({
    currentInstitution,
    onUpdateInstitution,
    academicLevels = [],
    courses = [],
    subjects = []
}) => {
    // Default standard year groups fallback if none defined
    const defaultYearGroups = useMemo(() => [
        { id: 'form_1', name: 'Form 1', code: 'F1', category: 'Secondary' },
        { id: 'form_2', name: 'Form 2', code: 'F2', category: 'Secondary' },
        { id: 'form_3', name: 'Form 3', code: 'F3', category: 'Secondary' },
        { id: 'form_4', name: 'Form 4', code: 'F4', category: 'Secondary' },
        { id: 'grade_7', name: 'Grade 7', code: 'G7', category: 'Junior Secondary' },
        { id: 'grade_8', name: 'Grade 8', code: 'G8', category: 'Junior Secondary' },
        { id: 'grade_9', name: 'Grade 9', code: 'G9', category: 'Junior Secondary' }
    ], []);

    // Active year groups list derived from academicLevels or courses or fallback
    const yearGroups = useMemo(() => {
        if (academicLevels && academicLevels.length > 0) {
            return academicLevels.map(lvl => ({
                id: lvl.id,
                name: lvl.name,
                code: (lvl as any).code || lvl.name,
                category: (lvl as any).levelCategory || 'Secondary'
            }));
        }
        if (courses && courses.length > 0) {
            return courses.map(c => ({
                id: c.id,
                name: c.name,
                code: c.code || c.name,
                category: 'Academic Track'
            }));
        }
        return defaultYearGroups;
    }, [academicLevels, courses, defaultYearGroups]);

    // Initial state from institution profile
    const [config, setConfig] = useState<SubjectGroupingConfig>({
        enabledYearGroupIds: ['form_3', 'form_4'],
        enforceKnecBestSeven: true,
        autoCalculateRanks: true,
        requireMinScienceCount: 2,
        requireMinHumanityCount: 1,
        compulsoryGroupIds: ['mat', 'eng', 'kis']
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        if ((currentInstitution as any)?.subjectGroupingConfig) {
            const saved = (currentInstitution as any).subjectGroupingConfig;
            setConfig({
                enabledYearGroupIds: saved.enabledYearGroupIds || ['form_3', 'form_4'],
                enforceKnecBestSeven: saved.enforceKnecBestSeven ?? true,
                autoCalculateRanks: saved.autoCalculateRanks ?? true,
                requireMinScienceCount: saved.requireMinScienceCount ?? 2,
                requireMinHumanityCount: saved.requireMinHumanityCount ?? 1,
                compulsoryGroupIds: saved.compulsoryGroupIds || ['mat', 'eng', 'kis']
            });
        }
    }, [currentInstitution]);

    const handleToggleYearGroup = (id: string) => {
        setConfig(prev => {
            const exists = prev.enabledYearGroupIds.includes(id);
            const nextIds = exists
                ? prev.enabledYearGroupIds.filter(yId => yId !== id)
                : [...prev.enabledYearGroupIds, id];
            return { ...prev, enabledYearGroupIds: nextIds };
        });
    };

    const handleSelectAllYearGroups = () => {
        setConfig(prev => ({
            ...prev,
            enabledYearGroupIds: yearGroups.map(y => y.id)
        }));
    };

    const handleClearYearGroups = () => {
        setConfig(prev => ({
            ...prev,
            enabledYearGroupIds: []
        }));
    };

    const handleSaveConfig = async () => {
        if (!currentInstitution || !onUpdateInstitution) {
            alert('Institution context missing. Unable to save changes.');
            return;
        }

        setSaveStatus('saving');
        try {
            const updatedPayload = {
                ...config,
                updatedAt: new Date().toISOString()
            };

            await onUpdateInstitution(currentInstitution.id, {
                subjectGroupingConfig: updatedPayload
            } as any);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err: any) {
            console.error('[SubjectGroupingManager] Failed to save configuration:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 4000);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl">
            {/* Header Banner */}
            <div className="p-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <BookOpenIcon className="w-64 h-64 text-white" />
                </div>

                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-200">
                            KNEC Academic Policy Engine
                        </span>
                        <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" /> Best 7 Aggregator
                        </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                        Subject Grouping <span className="text-indigo-400">&</span> Mean Score Rules
                    </h2>

                    <p className="text-xs md:text-sm text-indigo-100/90 leading-relaxed font-medium max-w-3xl">
                        Schools that take KNEC based exams may need to setup subject grouping that determine what subjects to consider while calculating student mean scores. Choose the year groups where subject grouping will be used to rank students.
                    </p>
                </div>
            </div>

            {/* Year Group Selection Card */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                            Target Year Groups / Classes
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Select academic levels where KNEC subject grouping rules apply
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSelectAllYearGroups}
                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={handleClearYearGroups}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>

                {/* Interactive Year Groups Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {yearGroups.map(yg => {
                        const isSelected = config.enabledYearGroupIds.includes(yg.id);
                        return (
                            <div
                                key={yg.id}
                                onClick={() => handleToggleYearGroup(yg.id)}
                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                                    isSelected
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md shadow-indigo-100 dark:shadow-none'
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-70 hover:opacity-100 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {yg.code}
                                    </span>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                        isSelected ? 'bg-indigo-600 text-white scale-110' : 'border-2 border-slate-300 dark:border-slate-700'
                                    }`}>
                                        {isSelected && <CheckIcon className="w-4 h-4 stroke-[3]" />}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{yg.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{yg.category}</p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                                    <span className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                                        {isSelected ? 'Grouping Active' : 'Grouping Inactive'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {config.enabledYearGroupIds.length === 0 && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-400">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-wide">
                            No year groups are selected. Mean score calculation will evaluate all registered subjects without KNEC group filtering.
                        </p>
                    </div>
                )}
            </div>

            {/* KNEC Subject Grouping Rules Config */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                        KNEC Subject Categories & Computation Logic
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Standard KNEC 8-4-4 Grouping Architecture
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Group 1: Compulsory */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-lg">
                                Group 1 (Compulsory)
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">3 Subjects</span>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase">English, Kiswahili, Mathematics</h4>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase">
                            All 3 compulsory subjects are automatically factored into student aggregate points and mean score calculation.
                        </p>
                    </div>

                    {/* Group 2: Sciences */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest rounded-lg">
                                Group 2 (Sciences)
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">Min 2 Subjects</span>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase">Biology, Chemistry, Physics</h4>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase">
                            Takes the best performing 2 science subjects towards student mean grade score.
                        </p>
                    </div>

                    {/* Group 3: Humanities */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest rounded-lg">
                                Group 3 (Humanities)
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">Min 1 Subject</span>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase">History, Geography, CRE / IRE / HRE</h4>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase">
                            Takes the highest scored humanity subject towards candidate total.
                        </p>
                    </div>

                    {/* Group 4 & 5: Technicals & Electives */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-black text-[10px] uppercase tracking-widest rounded-lg">
                                Group 4 & 5 (Technicals & Electives)
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">Best 7th Subject</span>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase">Agriculture, Business Studies, Computer, Foreign Languages</h4>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase">
                            Selects the next best subject from remaining sciences, humanities, or technical electives to complete the 7 subjects total.
                        </p>
                    </div>
                </div>

                {/* Computation Logic Toggles */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-0.5">
                            <label htmlFor="knec-best-7" className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight cursor-pointer">
                                Enforce KNEC Best 7 Subjects Aggregator Rule
                            </label>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Calculates student aggregate marks and mean grade strictly using 7 best compliant subjects
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, enforceKnecBestSeven: !prev.enforceKnecBestSeven }))}
                            className={`w-12 h-6 rounded-full relative transition-all ${config.enforceKnecBestSeven ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.enforceKnecBestSeven ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-0.5">
                            <label htmlFor="auto-calc-ranks" className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight cursor-pointer">
                                Auto-Calculate Class Mean Scores & Student Positions
                            </label>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Automatically re-rank students when exam marks are entered or modified
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, autoCalculateRanks: !prev.autoCalculateRanks }))}
                            className={`w-12 h-6 rounded-full relative transition-all ${config.autoCalculateRanks ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.autoCalculateRanks ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Actions Bar */}
            <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div>
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 animate-fade-in">
                            <CheckCircleIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Subject Grouping Rules Saved & Synchronized</span>
                        </div>
                    )}
                    {saveStatus === 'error' && (
                        <div className="flex items-center gap-2 text-rose-600 animate-fade-in">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Failed to save settings. Please retry.</span>
                        </div>
                    )}
                    {saveStatus === 'idle' && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Changes will take effect immediately across exam ranking modules
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={saveStatus === 'saving'}
                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {saveStatus === 'saving' ? 'Saving Policy...' : 'Save Subject Grouping Rules'}
                </button>
            </div>
        </div>
    );
};
