
import React, { useState, useEffect } from 'react';
import type { Institution, AcademicConfig, RankingCriteria } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { EyeIcon } from './icons/EyeIcon';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';

interface AcademicConfigManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
}

export const AcademicConfigManager: React.FC<AcademicConfigManagerProps> = ({ currentInstitution, onUpdateInstitution }) => {
    const [config, setConfig] = useState<AcademicConfig>({
        rankingEnabled: true,
        rankingCriteria: 'total_marks',
        subjectRankingEnabled: true,
        assessmentWeighting: {},
        showAttendance: true,
        showFeeBalance: true,
        defaultIsSummative: false
    });

    const [newWeightName, setNewWeightName] = useState('');
    const [newWeightValue, setNewWeightValue] = useState(0);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        if (currentInstitution?.academicConfig) {
            setConfig(currentInstitution.academicConfig);
        }
    }, [currentInstitution]);

    const handleToggle = (field: keyof AcademicConfig) => {
        setConfig(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleCriteriaChange = (criteria: RankingCriteria) => {
        setConfig(prev => ({ ...prev, rankingCriteria: criteria }));
    };

    const handleAddWeight = () => {
        if (!newWeightName.trim()) return;
        setConfig(prev => ({
            ...prev,
            assessmentWeighting: {
                ...(prev.assessmentWeighting || {}),
                [newWeightName.trim()]: newWeightValue
            }
        }));
        setNewWeightName('');
        setNewWeightValue(0);
    };

    const handleRemoveWeight = (name: string) => {
        setConfig(prev => {
            const next = { ...(prev.assessmentWeighting || {}) };
            delete next[name];
            return { ...prev, assessmentWeighting: next };
        });
    };

    const handleUpdateWeight = (name: string, value: number) => {
        setConfig(prev => ({
            ...prev,
            assessmentWeighting: {
                ...(prev.assessmentWeighting || {}),
                [name]: value
            }
        }));
    };

    const handleSaveChanges = () => {
        if (!currentInstitution || !onUpdateInstitution) return;
        setSaveStatus('saving');
        
        // Total weights validation (optional, maybe they don't want it to sum to 100 yet)
        const total = Object.values(config.assessmentWeighting || {}).reduce((a, b) => a + b, 0);
        if (Object.keys(config.assessmentWeighting || {}).length > 0 && total !== 100) {
            if (!confirm(`Assessment weights total ${total}%. It is recommended they sum to 100%. Save anyway?`)) {
                setSaveStatus('idle');
                return;
            }
        }

        onUpdateInstitution(currentInstitution.id, { 
            academicConfig: config 
        });
        
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };

    const criteriaOptions: { value: RankingCriteria; label: string; description: string }[] = [
        { value: 'total_marks', label: 'Total Marks', description: 'Rank students based on the sum of all marks achieved.' },
        { value: 'points', label: 'Total Points', description: 'Rank based on grading points (e.g., A=12, B=11, etc.).' },
        { value: 'mean_points', label: 'Mean Points', description: 'Rank based on average points across all subjects.' }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                        <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Ranking & Visibility</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure how students are positioned and what is visible on reports.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enable Class Ranking</h4>
                                <p className="text-xs text-slate-500">Calculate and show positions relative to other students.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('rankingEnabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.rankingEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.rankingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enable Subject Ranking</h4>
                                <p className="text-xs text-slate-500">Show student rank within each individual subject.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('subjectRankingEnabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.subjectRankingEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.subjectRankingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Universal Ranking Criteria</label>
                        <div className="grid grid-cols-1 gap-3">
                            {criteriaOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleCriteriaChange(opt.value)}
                                    className={`text-left p-4 rounded-2xl border-2 transition-all ${config.rankingCriteria === opt.value ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}
                                >
                                    <h5 className="text-sm font-black uppercase">{opt.label}</h5>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{opt.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                        <CalculatorIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Manual Assessment Weighting</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Define custom weights for assessments (e.g. CATs, Exams).</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="md:col-span-7">
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Assessment Name / Type</label>
                            <input
                                type="text"
                                value={newWeightName}
                                onChange={e => setNewWeightName(e.target.value)}
                                placeholder="e.g. End Term Exam"
                                className="form-input"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Weight (%)</label>
                            <input
                                type="number"
                                value={newWeightValue}
                                onChange={e => setNewWeightValue(parseInt(e.target.value) || 0)}
                                className="form-input"
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                onClick={handleAddWeight}
                                className="btn-primary w-full h-11 flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" /> Add
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(config.assessmentWeighting || {}).map(([name, weight]) => (
                            <div key={name} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                <div className="flex-grow">
                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white">{name}</h5>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={weight}
                                            onChange={(e) => handleUpdateWeight(name, parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <span className="text-xs font-black text-indigo-600 w-10 text-right">{weight}%</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveWeight(name)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors ml-4"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        {Object.keys(config.assessmentWeighting || {}).length === 0 && (
                            <div className="md:col-span-2 lg:col-span-3 py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-black uppercase text-slate-400">No custom weights defined. All assessments will be weighted equally.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600">
                        <EyeIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Report Content</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toggle integration of extra modules on student reports.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <input
                            type="checkbox"
                            role="switch"
                            checked={config.showAttendance}
                            onChange={() => handleToggle('showAttendance')}
                            className="h-6 w-6 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Integrate Attendance Stats</label>
                            <p className="text-xs text-slate-400">Include summary of student presence on report cards.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <input
                            type="checkbox"
                            checked={config.showFeeBalance}
                            onChange={() => handleToggle('showFeeBalance')}
                            className="h-6 w-6 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Display Fee Balances</label>
                            <p className="text-xs text-slate-400">Show outstanding financial liabilities on official reports.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 items-center">
                {saveStatus === 'saved' && (
                    <span className="text-sm font-black text-emerald-600 flex items-center gap-2 animate-bounce">
                        <CheckIcon className="w-5 h-5" /> SYNCED SUCCESSFUL
                    </span>
                )}
                <button
                    onClick={handleSaveChanges}
                    className="btn-primary h-14 px-12 shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px] font-black"
                    disabled={saveStatus === 'saving'}
                >
                    {saveStatus === 'saving' ? 'UPLOADING...' : 'SAVE ACADEMIC CONFIG'}
                </button>
            </div>

            <style>{`
                .form-input { 
                    display: block; 
                    width: 100%; 
                    height: 2.75rem;
                    border-radius: 0.75rem; 
                    border: 1px solid #e2e8f0; 
                    padding: 0.5rem 1rem; 
                    background-color: white; 
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .dark .form-input { 
                    border-color: #334155; 
                    background-color: #1e293b; 
                    color: white; 
                }
                .form-input:focus {
                    border-color: #4f46e5;
                    ring-color: #4f46e5;
                    outline: none;
                }
                .btn-primary { 
                    padding: 0.5rem 1rem; 
                    background-color: #4f46e5; 
                    color: white; 
                    border-radius: 0.75rem; 
                    font-weight: 800; 
                    border: none; 
                    cursor: pointer; 
                    transition: all 0.2s;
                }
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    background-color: #4338ca;
                }
                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s ease-out;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

