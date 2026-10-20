import React, { useState, useMemo } from 'react';
import type { RemedialAllocation, User, RemedialRateSetting } from '../types';
import { 
    getEligibleSwipeTeachers, 
    checkCancellationCutoff,
    getNextOccurrenceDate
} from '../utils/remedialSubstitutionUtils';
import { 
    X, 
    ArrowLeftRight, 
    UserCheck, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Search, 
    Sparkles, 
    Send,
    Radio,
    BookOpen,
    Lock
} from 'lucide-react';

export interface SwipeLessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    allocation: RemedialAllocation | null;
    currentUser: User | null;
    allTeachers: User[];
    allAllocations: RemedialAllocation[];
    rateSetting?: RemedialRateSetting | null;
    classSubjectAllocations?: any;
    onSubmitSwipe: (params: {
        allocation: RemedialAllocation;
        swapType: 'handover' | 'mutual_trade' | 'open_pool';
        targetTeacher: User | null;
        targetAllocation?: RemedialAllocation | null;
        notes: string;
    }) => Promise<void>;
}

export const SwipeLessonModal: React.FC<SwipeLessonModalProps> = ({
    isOpen,
    onClose,
    allocation,
    currentUser,
    allTeachers,
    allAllocations,
    rateSetting,
    classSubjectAllocations,
    onSubmitSwipe
}) => {
    if (!isOpen || !allocation) return null;

    const [swapType, setSwapType] = useState<'handover' | 'mutual_trade' | 'open_pool'>('handover');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [selectedTargetAllocId, setSelectedTargetAllocId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [reasonNote, setReasonNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const cutoff = useMemo(() => {
        return checkCancellationCutoff(
            allocation.dayOfWeek,
            allocation.startTime,
            rateSetting?.cancellationCutoffHours ?? 3
        );
    }, [allocation, rateSetting]);

    const nextDate = useMemo(() => {
        return getNextOccurrenceDate(allocation.dayOfWeek, allocation.startTime);
    }, [allocation]);

    const eligibleTeachers = useMemo(() => {
        return getEligibleSwipeTeachers({
            allocation,
            currentTeacherId: currentUser?.id || allocation.teacherId,
            candidates: allTeachers || [],
            allAllocations: allAllocations || [],
            rateSetting: rateSetting || undefined,
            classSubjectAllocations
        });
    }, [allocation, currentUser, allTeachers, allAllocations, rateSetting, classSubjectAllocations]);

    const filteredTeachers = useMemo(() => {
        if (!searchQuery.trim()) return eligibleTeachers;
        const q = searchQuery.toLowerCase().trim();
        return eligibleTeachers.filter(t => 
            (t.teacher.name || '').toLowerCase().includes(q) ||
            (t.teacher.email || '').toLowerCase().includes(q) ||
            t.teacher.expertise?.some(e => e.toLowerCase().includes(q))
        );
    }, [eligibleTeachers, searchQuery]);

    const selectedTeacherObj = useMemo(() => {
        return eligibleTeachers.find(t => t.teacher.id === selectedTeacherId) || null;
    }, [eligibleTeachers, selectedTeacherId]);

    const targetAllocationsForSelectedTeacher = useMemo(() => {
        if (!selectedTeacherObj) return [];
        return selectedTeacherObj.remedialAllocations;
    }, [selectedTeacherObj]);

    const selectedTargetAllocationObj = useMemo(() => {
        if (!selectedTargetAllocId) return null;
        return (allAllocations || []).find(a => a.id === selectedTargetAllocId) || null;
    }, [allAllocations, selectedTargetAllocId]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (swapType !== 'open_pool' && !selectedTeacherId) {
            alert('Please select a colleague for this swipe request.');
            return;
        }

        if (swapType === 'mutual_trade' && !selectedTargetAllocId) {
            alert('Please select which of your colleague\'s remedial lessons you wish to swap with.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmitSwipe({
                allocation,
                swapType,
                targetTeacher: selectedTeacherObj?.teacher || null,
                targetAllocation: selectedTargetAllocationObj,
                notes: reasonNote.trim()
            });
            onClose();
        } catch (err: any) {
            alert(err.message || 'Failed to submit swipe request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const QUICK_REASONS = [
        'Official School Duty / Assignment',
        'Academic Seminar / Workshop',
        'Medical Appointment',
        'Co-Curricular / Sports Duty',
        'Personal Engagement'
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fade-in">
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden my-6 transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 p-6 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute right-5 top-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                            Peer Lesson Exchange
                        </span>
                        {!cutoff.canCancel && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/80 text-white text-[9px] font-black uppercase flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Cutoff Passed
                            </span>
                        )}
                    </div>

                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <ArrowLeftRight className="w-6 h-6 text-indigo-200" />
                        Swipe / Swap Remedial Lesson
                    </h2>
                    <p className="text-xs text-indigo-100 mt-1 max-w-xl">
                        Instead of dropping this lesson, hand it over to a certified colleague or propose a mutual slot trade. Prefect verification and remedial tariffs transfer automatically upon peer confirmation.
                    </p>
                </div>

                {/* Source Lesson Badge */}
                <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Lesson to be Swiped
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                    {allocation.subjectName}
                                </span>
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase">
                                    {allocation.className} {allocation.stream && allocation.stream !== 'All Streams' ? `• ${allocation.stream}` : ''}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 font-mono font-medium">
                                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{allocation.dayOfWeek} • {allocation.startTime} - {allocation.endTime}</span>
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 block font-bold">Scheduled Occurrence:</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                {nextDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                    {/* Mode Selector Tabs */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                            Select Swap Method
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setSwapType('handover')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    swapType === 'handover'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <UserCheck className={`w-4 h-4 ${swapType === 'handover' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                    {swapType === 'handover' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                </div>
                                <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Direct Handover</div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ask a specific colleague to cover this lesson</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSwapType('mutual_trade')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    swapType === 'mutual_trade'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <ArrowLeftRight className={`w-4 h-4 ${swapType === 'mutual_trade' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                    {swapType === 'mutual_trade' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                </div>
                                <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Mutual Slot Trade</div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Exchange this slot with peer's remedial slot</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSwapType('open_pool')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    swapType === 'open_pool'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Radio className={`w-4 h-4 ${swapType === 'open_pool' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                    {swapType === 'open_pool' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                </div>
                                <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Open Pool</div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Broadcast to all certified subject teachers</p>
                            </button>
                        </div>
                    </div>

                    {/* Teacher Selector (when handover or mutual_trade) */}
                    {swapType !== 'open_pool' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Choose Colleague ({filteredTeachers.length} Candidates)
                                </label>
                                <div className="relative w-48">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                    <input 
                                        type="text"
                                        placeholder="Search teacher..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-2 pr-1 border border-slate-100 dark:border-slate-800 p-2 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                                {filteredTeachers.length === 0 ? (
                                    <p className="text-center py-6 text-xs text-slate-400 font-bold uppercase">No matching teachers found</p>
                                ) : (
                                    filteredTeachers.map(item => {
                                        const isSelected = selectedTeacherId === item.teacher.id;
                                        return (
                                            <div
                                                key={item.teacher.id}
                                                onClick={() => {
                                                    if (item.isAvailable) {
                                                        setSelectedTeacherId(item.teacher.id);
                                                        setSelectedTargetAllocId('');
                                                    }
                                                }}
                                                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                                    !item.isAvailable
                                                        ? 'opacity-50 bg-slate-100 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800 cursor-not-allowed'
                                                        : isSelected
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md cursor-pointer'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs truncate">
                                                            {item.teacher.name}
                                                        </span>
                                                        {item.isSubjectMatch && (
                                                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                                                isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                                                            }`}>
                                                                Subject Match
                                                            </span>
                                                        )}
                                                        {item.isGradeMatch && (
                                                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                                                isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400'
                                                            }`}>
                                                                Grade Match
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                        {item.conflictReason ? (
                                                            <span className="text-rose-500 font-bold">{item.conflictReason}</span>
                                                        ) : (
                                                            `Available • ${item.remedialAllocations.length} active remedial sessions on timetable`
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    {item.isAvailable ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            isSelected ? 'bg-white text-indigo-700' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                        }`}>
                                                            {isSelected ? 'Selected' : 'Available'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                                                            Busy
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mutual Slot Selection (only when mutual_trade) */}
                    {swapType === 'mutual_trade' && selectedTeacherObj && (
                        <div className="space-y-3 p-4 bg-violet-50/60 dark:bg-violet-950/20 rounded-2xl border border-violet-200 dark:border-violet-900/50">
                            <label className="block text-xs font-black uppercase tracking-wider text-violet-900 dark:text-violet-300">
                                Select {selectedTeacherObj.teacher.name}'s Lesson to Receive in Exchange
                            </label>

                            {targetAllocationsForSelectedTeacher.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">
                                    {selectedTeacherObj.teacher.name} has no other confirmed remedial allocations to swap with. Consider using Direct Handover instead.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                                    {targetAllocationsForSelectedTeacher.map(allocItem => {
                                        const isChosen = selectedTargetAllocId === allocItem.id;
                                        return (
                                            <div
                                                key={allocItem.id}
                                                onClick={() => setSelectedTargetAllocId(allocItem.id)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    isChosen
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 border-violet-200 dark:border-violet-900 hover:border-violet-400'
                                                }`}
                                            >
                                                <div>
                                                    <span className="font-bold text-xs uppercase block">
                                                        {allocItem.subjectName} • {allocItem.className}
                                                    </span>
                                                    <span className={`text-[10px] font-mono ${isChosen ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {allocItem.dayOfWeek} • {allocItem.startTime} - {allocItem.endTime}
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    isChosen ? 'bg-white text-violet-700' : 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
                                                }`}>
                                                    {isChosen ? 'Chosen' : 'Select'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reason / Notes */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Reason for Swipe Request
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {QUICK_REASONS.map(chip => (
                                <button
                                    key={chip}
                                    type="button"
                                    onClick={() => setReasonNote(chip)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                        reasonNote === chip
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={reasonNote}
                            onChange={e => setReasonNote(e.target.value)}
                            placeholder="Provide brief details for your colleague and the Director of Studies (DOS)..."
                            className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-20 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || (swapType !== 'open_pool' && !selectedTeacherId) || (swapType === 'mutual_trade' && !selectedTargetAllocId)}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Send className="w-4 h-4" />
                            {isSubmitting ? 'Sending Request...' : 'Send Swipe Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
