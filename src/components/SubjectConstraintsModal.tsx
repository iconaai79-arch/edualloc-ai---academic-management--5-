import React, { useState } from 'react';
import type { Subject, TimetableSettings, TimetableConstraint } from '../types';
import { XIcon } from './icons/XIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';


interface SubjectConstraintsModalProps {
    subject: Subject;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings: (settings: TimetableSettings) => void;
    onClose: () => void;
}

export const SubjectConstraintsModal: React.FC<SubjectConstraintsModalProps> = ({
    subject, timetableSettings, onSaveTimetableSettings, onClose
}) => {
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [day, setDay] = useState('Monday');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('10:00');

    // Filter constraints relevant to this subject (specifically time off)
    const subjectConstraints = (timetableSettings.constraints || []).filter(c =>
        c.type === 'subject_time_off' && c.subjectIds.includes(subject.id)
    );

    const handleAddConstraint = () => {
        const newConstraint: TimetableConstraint = {
            id: `const_${Date.now()}`,
            type: 'subject_time_off',
            subjectIds: [subject.id],
            day,
            startTime,
            endTime,
            description: `Time off for ${subject.name}`
        };

        const updatedConstraints = [...(timetableSettings.constraints || []), newConstraint];
        onSaveTimetableSettings({
            ...timetableSettings,
            constraints: updatedConstraints
        });
        setActiveTab('list');
    };

    const handleDeleteConstraint = (id: string) => {
        const updatedConstraints = (timetableSettings.constraints || []).filter(c => c.id !== id);
        onSaveTimetableSettings({
            ...timetableSettings,
            constraints: updatedConstraints
        });
    };

    const renderListTab = () => (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                <div className="flex justify-between items-center mb-6 pl-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                        <InformationCircleIcon className="w-4 h-4" />
                        Active Blocks
                    </h4>
                    <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">{subjectConstraints.length} Restricted Slots</span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {subjectConstraints.length === 0 ? (
                        <div className="text-center py-20">
                            <ClockIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No restrictions defined</p>
                            <button onClick={() => setActiveTab('add')} className="text-[10px] font-black uppercase text-indigo-600 mt-2 hover:underline">Define New Block</button>
                        </div>
                    ) : (
                        subjectConstraints.map(c => (
                            <div key={c.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800 group transition-all shadow-sm">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center justify-center text-[10px] font-black uppercase">
                                        {c.day?.substring(0, 3)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{c.startTime} — {c.endTime}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unavailable to Schedule</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteConstraint(c.id)}
                                    className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white active:scale-95 shadow-sm"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderAddTab = () => (
        <div className="space-y-8 animate-fade-in-up">
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-8 shadow-inner">
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                            <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
                            Target Day
                        </label>
                        <select
                            value={day}
                            onChange={e => setDay(e.target.value)}
                            className="form-select"
                        >
                            {timetableSettings.operatingDays.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-indigo-500" />
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-indigo-500" />
                                End Time
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="form-input"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleAddConstraint}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-95 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" /> Add Restriction
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>

                {/* Header Section */}
                <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 bg-red-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-red-200 dark:shadow-red-900/40">
                            <ClockIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Subject Time Off</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{subject.name} ({subject.code})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
                        <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-10 border-b border-slate-100 dark:border-slate-800 flex gap-8 bg-slate-50/30 dark:bg-slate-900/30">
                    {(['list', 'add'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 pt-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab === 'list' ? 'Registered Blocks' : 'Define New'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Section */}
                <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
                    {activeTab === 'list' ? renderListTab() : renderAddTab()}
                </div>

                {/* Footer Section */}
                <div className="p-10 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95 shadow-xl"
                    >
                        Save Constraints
                    </button>
                </div>
            </div>

            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #f1f5f9; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; }
                .dark .form-input, .dark .form-select { border-color: #1e293b; background-color: #020617; color: #f1f5f9; }
                .form-input:focus, .form-select:focus { border-color: #4f46e5; outline: none; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
            `}</style>
        </div>
    );
};

