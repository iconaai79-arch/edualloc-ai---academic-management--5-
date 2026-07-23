import React, { useState, useMemo } from 'react';
import type { AcademicYear, Semester, User, Course, Institution } from '../../types';
import { checkPromotionUnlockEligibility, buildDefaultClassProgressionMap, executeBatchStudentPromotion, PromotionCandidate } from '../../services/promotionService';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';
import { XIcon } from '../icons/XIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';

interface StudentPromotionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    activeAcademicYear: AcademicYear | null;
    semesters: Semester[];
    students: User[];
    courses: Course[];
    institution: Institution;
    currentUser: User;
    onPromotionSuccess?: () => void;
}

export const StudentPromotionWizard: React.FC<StudentPromotionWizardProps> = ({
    isOpen,
    onClose,
    activeAcademicYear,
    semesters,
    students,
    courses,
    institution,
    currentUser,
    onPromotionSuccess
}) => {
    // 1. Lock & Eligibility Check
    const [overrideUnlocked, setOverrideUnlocked] = useState(false);
    const eligibility = useMemo(() => {
        return checkPromotionUnlockEligibility(activeAcademicYear, semesters, overrideUnlocked);
    }, [activeAcademicYear, semesters, overrideUnlocked]);

    // 2. Wizard Stepper State
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1: Mapping & Target Year Config
    const [targetYearName, setTargetYearName] = useState(() => {
        const yearNum = new Date().getFullYear();
        return `Academic Year ${yearNum + 1}/${yearNum + 2}`;
    });
    const [targetStartDate, setTargetStartDate] = useState(() => `${new Date().getFullYear() + 1}-01-08`);
    const [targetEndDate, setTargetEndDate] = useState(() => `${new Date().getFullYear() + 1}-11-25`);
    const [progressionRules, setProgressionRules] = useState<Record<string, string>>(() => {
        return buildDefaultClassProgressionMap(courses);
    });

    // Step 2: Student Candidates Roster
    const [classFilter, setClassFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [candidates, setCandidates] = useState<PromotionCandidate[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);

    // Initialize candidates when entering Step 2 or changing rules
    const initializeCandidates = () => {
        const activeStudents = students.filter(s => s.role === 'student' && (s as any).status !== 'inactive' && (s as any).status !== 'graduated');
        const initialCandidates: PromotionCandidate[] = activeStudents.map(s => {
            const cls = (s as any).className || (s as any).gradeLevel || s.metadata?.gradeLevel || 'Unassigned';
            const strm = (s as any).stream || s.metadata?.stream || '';
            const defaultTarget = progressionRules[cls] || 'Next Level';
            const isGrad = defaultTarget === 'Graduated' || cls.toLowerCase().includes('form 4');

            return {
                student: s,
                currentClass: cls,
                currentStream: strm,
                targetClass: isGrad ? 'Alumni' : defaultTarget,
                targetStream: strm,
                action: isGrad ? 'graduated' : 'promoted',
                closingBalance: s.metadata?.openingBalance || 0
            };
        });
        setCandidates(initialCandidates);
    };

    if (!isOpen) return null;

    const filteredCandidates = candidates.filter(c => {
        const matchesClass = classFilter === 'All' || c.currentClass === classFilter;
        const matchesSearch = c.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((c.student as any).admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const updateCandidateAction = (studentId: string, action: PromotionCandidate['action'], targetClass?: string) => {
        setCandidates(prev => prev.map(c => {
            if (c.student.id !== studentId) return c;
            let updatedTarget = targetClass || c.targetClass;
            if (action === 'repeated') updatedTarget = c.currentClass;
            if (action === 'graduated') updatedTarget = 'Alumni';
            if (action === 'withdrawn') updatedTarget = 'Withdrawn';
            return { ...c, action, targetClass: updatedTarget };
        }));
    };

    const handleExecutePromotion = async () => {
        if (!activeAcademicYear) return;
        setIsExecuting(true);
        try {
            const res = await executeBatchStudentPromotion(
                candidates,
                activeAcademicYear,
                targetYearName,
                targetStartDate,
                targetEndDate,
                currentUser.id,
                institution.id
            );
            alert(`🎉 Success! Promoted and rolled over ${res.count} students to ${targetYearName}.`);
            if (onPromotionSuccess) onPromotionSuccess();
            onClose();
        } catch (err: any) {
            alert('Failed to execute student promotion: ' + (err.message || err));
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">
                            🎓
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">End-of-Year Student Promotion Wizard</h3>
                            <p className="text-xs text-slate-400 font-medium">Batch promote students, update class levels, and roll over opening fee balances</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Locked Banner / Screen */}
                {!eligibility.canUnlock ? (
                    <div className="p-10 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center text-4xl shadow-inner">
                            🔒
                        </div>
                        <div className="max-w-lg space-y-2">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Promotion Wizard Locked</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{eligibility.reason}</p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 max-w-md text-xs font-semibold text-amber-800 dark:text-amber-300">
                            💡 Student promotions are restricted during active learning terms to prevent accidental class corruption.
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (confirm("SECURITY OVERRIDE:\nAre you sure you want to unlock student promotions during an active term?")) {
                                    setOverrideUnlocked(true);
                                }
                            }}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md cursor-pointer flex items-center gap-2"
                        >
                            <ShieldCheckIcon className="w-4 h-4" />
                            <span>Unlock via Super-Admin Security Override</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Stepper Bar */}
                        <div className="bg-slate-100 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-8 text-xs font-black uppercase tracking-wider">
                            {[
                                { num: 1, label: '1. Target Year & Progression Rules' },
                                { num: 2, label: '2. Student Exceptions Roster' },
                                { num: 3, label: '3. Financial Rollover Review' },
                                { num: 4, label: '4. Final Execution' }
                            ].map(s => (
                                <div
                                    key={s.num}
                                    className={`flex items-center gap-2 ${step === s.num ? 'text-indigo-600 dark:text-indigo-400 font-black' : step > s.num ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                                >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step === s.num ? 'bg-indigo-600 text-white' : step > s.num ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-800'}`}>{s.num}</span>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Content Body */}
                        <div className="p-8 flex-1 overflow-y-auto space-y-6">
                            {/* STEP 1: Target Year & Rules */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                                        <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">Upcoming Academic Year Setup</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">New Academic Year Name</label>
                                                <input type="text" value={targetYearName} onChange={e => setTargetYearName(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Start Date</label>
                                                <input type="date" value={targetStartDate} onChange={e => setTargetStartDate(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">End Date</label>
                                                <input type="date" value={targetEndDate} onChange={e => setTargetEndDate(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 space-y-4">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Class Progression Mapping Rules</h4>
                                        <p className="text-xs text-slate-500 font-medium">Define automatic class advancement rules for the institution:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(progressionRules).map(([fromCls, toCls]) => (
                                                <div key={fromCls} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-xs font-black text-slate-800 dark:text-white">{fromCls}</span>
                                                    <span className="text-xs font-bold text-slate-400">➔</span>
                                                    <input
                                                        type="text"
                                                        value={toCls}
                                                        onChange={e => setProgressionRules(prev => ({ ...prev, [fromCls]: e.target.value }))}
                                                        className="py-1 px-3 bg-white dark:bg-slate-900 border rounded-lg text-xs font-black text-indigo-600 dark:text-indigo-400 w-36 text-center"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Student Candidates Roster */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-3 flex-1 w-full">
                                            <input
                                                type="text"
                                                placeholder="Search student by name or admission number..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold w-full max-w-xs border outline-none"
                                            />
                                            <select
                                                value={classFilter}
                                                onChange={e => setClassFilter(e.target.value)}
                                                className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold border outline-none"
                                            >
                                                <option value="All">All Current Classes</option>
                                                {Object.keys(progressionRules).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="text-xs font-black text-slate-500">
                                            Showing {filteredCandidates.length} of {candidates.length} Students
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto max-h-[400px] border border-slate-200 dark:border-slate-800 rounded-2xl">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-900 text-white sticky top-0">
                                                <tr>
                                                    <th className="py-3 px-4 uppercase text-[10px] font-black">Student Name</th>
                                                    <th className="py-3 px-4 uppercase text-[10px] font-black">Current Class</th>
                                                    <th className="py-3 px-4 uppercase text-[10px] font-black">Target Class</th>
                                                    <th className="py-3 px-4 uppercase text-[10px] font-black">Closing Balance</th>
                                                    <th className="py-3 px-4 uppercase text-[10px] font-black text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredCandidates.map(c => (
                                                    <tr key={c.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                            {c.student.name}
                                                            <span className="block text-[10px] font-normal text-slate-400">{(c.student as any).admissionNumber || '—'}</span>
                                                        </td>
                                                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{c.currentClass}</td>
                                                        <td className="py-3 px-4 font-black text-indigo-600 dark:text-indigo-400">{c.targetClass}</td>
                                                        <td className={`py-3 px-4 font-black ${c.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            KSh {c.closingBalance.toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <select
                                                                value={c.action}
                                                                onChange={e => updateCandidateAction(c.student.id, e.target.value as PromotionCandidate['action'])}
                                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer ${c.action === 'promoted' ? 'bg-emerald-100 text-emerald-800' : c.action === 'repeated' ? 'bg-amber-100 text-amber-800' : c.action === 'graduated' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'}`}
                                                            >
                                                                <option value="promoted">🟢 Promote</option>
                                                                <option value="repeated">🟡 Repeat Grade</option>
                                                                <option value="graduated">🎓 Graduate (Alumni)</option>
                                                                <option value="withdrawn">🔴 Exit / Withdraw</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Financial Rollover Review */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-center">
                                            <p className="text-[10px] font-black uppercase text-emerald-600">Promoting</p>
                                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{candidates.filter(c => c.action === 'promoted').length}</p>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-center">
                                            <p className="text-[10px] font-black uppercase text-amber-600">Repeating</p>
                                            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{candidates.filter(c => c.action === 'repeated').length}</p>
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-950/40 p-5 rounded-2xl border border-purple-200 dark:border-purple-900/40 text-center">
                                            <p className="text-[10px] font-black uppercase text-purple-600">Graduating</p>
                                            <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">{candidates.filter(c => c.action === 'graduated').length}</p>
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-950/40 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-center">
                                            <p className="text-[10px] font-black uppercase text-rose-600">Withdrawing</p>
                                            <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{candidates.filter(c => c.action === 'withdrawn').length}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Opening Balance Transfer Summary</h4>
                                        <p className="text-slate-500 font-medium">All closing fee balances will be automatically carried forward into the new academic year ({targetYearName}) as opening balances.</p>
                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border flex justify-between font-black">
                                            <span>Total Net Arrears Carried Forward:</span>
                                            <span className="text-rose-600">KSh {candidates.reduce((sum, c) => sum + (c.closingBalance > 0 ? c.closingBalance : 0), 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Execution Confirmation */}
                            {step === 4 && (
                                <div className="space-y-6 text-center py-6 animate-in fade-in duration-200 max-w-xl mx-auto">
                                    <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg">
                                        🚀
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ready to Conclude Year & Promote Students</h4>
                                        <p className="text-xs text-slate-500 font-medium mt-1">This operation will finalize Academic Year {activeAcademicYear?.name}, create {targetYearName}, and update student grade levels.</p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isExecuting}
                                        onClick={handleExecutePromotion}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 cursor-pointer disabled:opacity-50"
                                    >
                                        {isExecuting ? '⏳ Processing Batch Promotion...' : '🎉 Execute Student Promotion & Open New Year'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Navigation Footer */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-8">
                            <button
                                type="button"
                                disabled={step === 1}
                                onClick={() => setStep(prev => (prev - 1) as any)}
                                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                            >
                                Back
                            </button>
                            {step < 4 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (step === 1) initializeCandidates();
                                        setStep(prev => (prev + 1) as any);
                                    }}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
                                >
                                    Next Step ➔
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
