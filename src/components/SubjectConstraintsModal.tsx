import React, { useState } from 'react';
import type { Subject, TimetableSettings, TimetableConstraint } from '../types';
import { XIcon, PlusIcon, ClockIcon } from './icons/index';

interface SubjectConstraintsModalProps {
    subject: Subject;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings: (settings: TimetableSettings) => void;
    onClose: () => void;
}

export const SubjectConstraintsModal: React.FC<SubjectConstraintsModalProps> = ({
    subject, timetableSettings, onSaveTimetableSettings, onClose
}) => {
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
    };

    const handleDeleteConstraint = (id: string) => {
        const updatedConstraints = (timetableSettings.constraints || []).filter(c => c.id !== id);
        onSaveTimetableSettings({
            ...timetableSettings,
            constraints: updatedConstraints
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-indigo-500" />
                            Subject Time Off
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subject.name} ({subject.code})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 mb-3 tracking-widest">Add Unavailable Period</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Day</label>
                                <select
                                    value={day}
                                    onChange={e => setDay(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-bold py-2.5 px-3 focus:ring-2 focus:ring-indigo-500"
                                >
                                    {timetableSettings.operatingDays.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-bold py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">End Time</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-bold py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddConstraint}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Restriction
                        </button>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest border-b border-slate-100 dark:border-slate-700 pb-2">Active Restrictions</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {subjectConstraints.length === 0 ? (
                                <p className="text-center text-xs text-slate-400 py-4 italic">No time-off restrictions set.</p>
                            ) : (
                                subjectConstraints.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold text-xs">
                                                {c.day?.substring(0, 3)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.startTime} - {c.endTime}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">Unavailable</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteConstraint(c.id)}
                                            className="p-1.5 bg-white dark:bg-slate-800 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
