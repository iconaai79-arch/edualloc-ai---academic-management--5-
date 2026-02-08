
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { AcademicYear, Semester, ExamPeriod, Institution } from '../types';
import { PlusIcon, CheckIcon, XIcon, Cog8ToothIcon, CheckCircleIcon, CalendarDaysIcon } from './icons';

interface AcademicYearManagerProps {
    academicYears: AcademicYear[];
    semesters: Semester[];
    onAddAcademicYear?: (data: Omit<AcademicYear, 'id' | 'institutionId' | 'status'>) => void;
    onUpdateAcademicYear?: (yearId: string, data: Partial<Omit<AcademicYear, 'id' | 'institutionId'>>) => void;
    onDeleteAcademicYear?: (yearId: string) => void;
    onAddSemester?: (data: Omit<Semester, 'id' | 'institutionId'>) => void;
    onUpdateSemester?: (semesterId: string, data: Partial<Omit<Semester, 'id' | 'institutionId' | 'academicYearId'>>) => void;
    onDeleteSemester?: (semesterId: string) => void;
    isExamCalendarOnly?: boolean;
    currentInstitution?: Institution | null;
}

const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
};

export const AcademicYearManager: React.FC<AcademicYearManagerProps> = ({
    academicYears, semesters, onAddAcademicYear, onUpdateAcademicYear, onDeleteAcademicYear, onAddSemester, onUpdateSemester, onDeleteSemester, isExamCalendarOnly = false, currentInstitution
}) => {
    const [newYear, setNewYear] = useState({ name: '', startDate: '', endDate: '' });
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [newSemester, setNewSemester] = useState({ name: '', startDate: '', endDate: '', requestDeadline: '', enrollmentDeadline: '' });
    const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
    const [editingSemesterData, setEditingSemesterData] = useState<Semester | null>(null);
    const [addingSemesterTo, setAddingSemesterTo] = useState<string | null>(null);
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);
    const [searchInput, setSearchInput] = useState('');
    const [filterQuery, setFilterQuery] = useState('');
    const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
    const [isAddingYear, setIsAddingYear] = useState(false);
    const [semesterSaveStatus, setSemesterSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const semesterLabel = isSchool ? 'Term' : 'Semester';
    const semesterLabelPlural = isSchool ? 'Terms' : 'Semesters';

    const sortedAcademicYears = useMemo(() => {
        const yearsList = academicYears || [];
        const filtered = filterQuery.trim()
            ? yearsList.filter(year => year.name.toLowerCase().includes(filterQuery.toLowerCase()))
            : yearsList;

        return [...filtered].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [academicYears, filterQuery]);

    const selectedYear = useMemo(() => {
        return (academicYears || []).find(y => y.id === selectedYearId);
    }, [selectedYearId, academicYears]);

    useEffect(() => {
        if (!selectedYearId && sortedAcademicYears.length > 0) {
            setSelectedYearId(sortedAcademicYears[0].id);
        }
    }, [sortedAcademicYears, selectedYearId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (listContainerRef.current && !listContainerRef.current.contains(event.target as Node)) {
                setOpenActionMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSessionChange = (sessionId: string, field: 'name' | 'startDate' | 'endDate', value: string) => {
        setEditingSemesterData(prev => {
            if (!prev) return prev;
            const updatedSessions = (prev.sessions || []).map(session =>
                session.id === sessionId ? { ...session, [field]: value } : session
            );
            return { ...prev, sessions: updatedSessions };
        });
    };

    const handleAddSession = () => {
        setEditingSemesterData(prev => {
            if (!prev) return prev;
            const newSession = {
                id: `session-${Date.now()}-${Math.random()}`,
                name: `Session ${(prev.sessions?.length || 0) + 1}`,
                startDate: '',
                endDate: '',
                examPeriods: []
            };
            return { ...prev, sessions: [...(prev.sessions || []), newSession] };
        });
    };

    const handleDeleteSession = (sessionId: string) => {
        setEditingSemesterData(prev => {
            if (!prev) return prev;
            const updatedSessions = (prev.sessions || []).filter(session => session.id !== sessionId);
            return { ...prev, sessions: updatedSessions };
        });
    };

    const handleExamPeriodChange = (sessionId: string, examPeriodId: string, field: 'name' | 'startDate' | 'endDate', value: string) => {
        setEditingSemesterData(prev => {
            if (!prev) return prev;
            const newSessions = prev.sessions?.map(s => {
                if (s.id === sessionId) {
                    const newExamPeriods = s.examPeriods?.map(ep =>
                        ep.id === examPeriodId ? { ...ep, [field]: value } : ep
                    );
                    return { ...s, examPeriods: newExamPeriods };
                }
                return s;
            });
            return { ...prev, sessions: newSessions };
        });
    };

    const handleAddExamPeriod = (sessionId: string) => {
        setEditingSemesterData(prev => {
            if (!prev) return prev;
            const newSessions = prev.sessions?.map(s => {
                if (s.id === sessionId) {
                    const newExamPeriod: ExamPeriod = {
                        id: `exam-${Date.now()}`,
                        name: `Exams ${(s.examPeriods?.length || 0) + 1}`,
                        startDate: '',
                        endDate: '',
                    };
                    return { ...s, examPeriods: [...(s.examPeriods || []), newExamPeriod] };
                }
                return s;
            });
            return { ...prev, sessions: newSessions };
        });
    };

    const handleDeleteExamPeriod = (sessionId: string, examPeriodId: string) => {
        setEditingSemesterData(prev => {
            if (!prev) return prev;
            const newSessions = prev.sessions?.map(s => {
                if (s.id === sessionId) {
                    const newExamPeriods = s.examPeriods?.filter(ep => ep.id !== examPeriodId);
                    return { ...s, examPeriods: newExamPeriods };
                }
                return s;
            });
            return { ...prev, sessions: newSessions };
        });
    };

    const handleEditSemesterClick = (semester: Semester) => {
        if (editingSemesterId === semester.id) {
            setEditingSemesterId(null);
            setEditingSemesterData(null);
        } else {
            setEditingSemesterId(semester.id);
            setEditingSemesterData(JSON.parse(JSON.stringify(semester))); // Deep copy
        }
    };

    const handleAddYear = (e: React.FormEvent) => {
        e.preventDefault();
        onAddAcademicYear?.(newYear);
        setNewYear({ name: '', startDate: '', endDate: '' });
        setIsAddingYear(false);
    };

    const handleUpdateYear = (yearId: string) => {
        if (!editingYear) return;
        onUpdateAcademicYear?.(yearId, { name: editingYear.name, startDate: editingYear.startDate, endDate: editingYear.endDate });
        setEditingYear(null);
    };

    const handleAddSemesterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addingSemesterTo) return;
        onAddSemester?.({ ...newSemester, academicYearId: addingSemesterTo, status: 'inactive', sessions: [] });
        setNewSemester({ name: '', startDate: '', endDate: '', requestDeadline: '', enrollmentDeadline: '' });
        setAddingSemesterTo(null);
    };

    const handleUpdateSemester = () => {
        if (!editingSemesterData || !onUpdateSemester) return;
        setSemesterSaveStatus('saving');
        setTimeout(() => {
            onUpdateSemester(editingSemesterData.id, {
                name: editingSemesterData.name,
                startDate: editingSemesterData.startDate,
                endDate: editingSemesterData.endDate,
                status: editingSemesterData.status,
                requestDeadline: editingSemesterData.requestDeadline,
                enrollmentDeadline: editingSemesterData.enrollmentDeadline,
                sessions: editingSemesterData.sessions
            });
            setSemesterSaveStatus('saved');
            setTimeout(() => {
                setEditingSemesterId(null);
                setEditingSemesterData(null);
                setSemesterSaveStatus('idle');
            }, 1500);
        }, 500);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <style>{`
                .form-input { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; color: #1e293b; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; transition: filter 0.15s; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.15s; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .btn-danger { padding: 0.5rem; background-color: #dc2626; color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .action-menu-dropdown { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
                .dark .action-menu-dropdown { border-color: #334155; }
            `}</style>

            <div className="md:col-span-1 space-y-6" ref={listContainerRef}>
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Academic Years</h3>
                        {onAddAcademicYear && (
                            <button onClick={() => setIsAddingYear(true)} className="btn-primary inline-flex items-center gap-1 text-xs">
                                <PlusIcon className="w-4 h-4" /> New Year
                            </button>
                        )}
                    </div>

                    {isAddingYear && onAddAcademicYear && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 mb-6 animate-fade-in-up">
                            <h4 className="font-bold text-sm">Initialize Academic Year</h4>
                            <div className="space-y-3">
                                <div><label className="block text-xs font-semibold mb-1">Display Name</label><input type="text" value={newYear.name} onChange={e => setNewYear({ ...newYear, name: e.target.value })} placeholder="e.g., 2024/2025" required className="form-input text-sm" /></div>
                                <div><label className="block text-xs font-semibold mb-1">Effective Start</label><input type="date" value={newYear.startDate} onChange={e => setNewYear({ ...newYear, startDate: e.target.value })} required className="form-input text-sm" /></div>
                                <div><label className="block text-xs font-semibold mb-1">Effective End</label><input type="date" value={newYear.endDate} onChange={e => setNewYear({ ...newYear, endDate: e.target.value })} required className="form-input text-sm" /></div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsAddingYear(false)} className="btn-secondary text-xs">Cancel</button>
                                <button onClick={handleAddYear} className="btn-primary text-xs">Add Year</button>
                            </div>
                        </div>
                    )}

                    <div className="relative mb-4">
                        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setFilterQuery(searchInput)} placeholder="Search years..." className="form-input pr-12 text-sm" />
                        <button onClick={() => setFilterQuery(searchInput)} className="absolute right-2 top-1.5 p-1 text-[var(--color-primary)]"><CheckIcon className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-3">
                        {sortedAcademicYears.map(year => (
                            <div key={year.id} className={`p-4 rounded-xl border transition-all ${selectedYearId === year.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex justify-between items-center">
                                    <button onClick={() => setSelectedYearId(year.id)} className="text-left flex-grow">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white">{year.name}</h4>
                                            {year.status === 'active' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                            {new Date(year.startDate).getFullYear()} - {new Date(year.endDate).getFullYear()}
                                        </p>
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenActionMenu(openActionMenu === year.id ? null : year.id)}
                                            className={`p-1.5 rounded-lg transition-colors ${openActionMenu === year.id ? 'bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            <Cog8ToothIcon className="w-5 h-5 text-slate-500" />
                                        </button>
                                        {openActionMenu === year.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl action-menu-dropdown z-[100] py-2 overflow-hidden animate-fade-in-up">
                                                {onUpdateAcademicYear && year.status !== 'active' && (
                                                    <button onClick={async () => {
                                                        try {
                                                            // Deactivate currently active years first
                                                            const activeYears = academicYears.filter(y => y.status === 'active' && y.id !== year.id);
                                                            for (const ay of activeYears) {
                                                                await onUpdateAcademicYear(ay.id, { status: 'inactive' });
                                                            }
                                                            // Activate target year
                                                            await onUpdateAcademicYear(year.id, { status: 'active' });
                                                            setOpenActionMenu(null);
                                                        } catch (e) {
                                                            console.error("Failed to activate year", e);
                                                            alert(`Failed to activate year: ${e instanceof Error ? e.message : 'Unknown error'}`);
                                                        }
                                                    }} className="w-full text-left px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2">
                                                        <CheckCircleIcon className="w-4 h-4" /> Activate Year
                                                    </button>
                                                )}
                                                {onUpdateAcademicYear && (
                                                    <button onClick={() => { setEditingYear(year); setSelectedYearId(year.id); setOpenActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2">
                                                        <PlusIcon className="w-4 h-4 rotate-45" /> Edit Details
                                                    </button>
                                                )}
                                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                                {onDeleteAcademicYear && (
                                                    <button onClick={() => {
                                                        if (window.confirm(`Permanently delete "${year.name}" and all associated data?`)) {
                                                            onDeleteAcademicYear(year.id);
                                                        }
                                                        setOpenActionMenu(null);
                                                    }} className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                                        <XIcon className="w-4 h-4" /> Delete Year
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {editingYear?.id === year.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in-up">
                                        <input type="text" value={editingYear.name} onChange={e => setEditingYear({ ...editingYear, name: e.target.value })} className="form-input text-xs" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="date" value={editingYear.startDate} onChange={e => setEditingYear({ ...editingYear, startDate: e.target.value })} className="form-input text-xs" />
                                            <input type="date" value={editingYear.endDate} onChange={e => setEditingYear({ ...editingYear, endDate: e.target.value })} className="form-input text-xs" />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingYear(null)} className="btn-secondary text-[10px]">Cancel</button>
                                            <button onClick={() => handleUpdateYear(year.id)} className="btn-primary text-[10px]">Save</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="md:col-span-2">
                {selectedYear ? (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{semesterLabelPlural} Management</h3>
                                <p className="text-xs text-slate-500 mt-1">Configuring schedule for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedYear.name}</span></p>
                            </div>
                            <button onClick={() => setAddingSemesterTo(selectedYear.id)} className="btn-primary inline-flex items-center gap-2 text-sm">
                                <PlusIcon className="w-5 h-5" /> New {semesterLabel}
                            </button>
                        </div>

                        {addingSemesterTo === selectedYear.id && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                                <form onSubmit={handleAddSemesterSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Name</label><input type="text" value={newSemester.name} onChange={e => setNewSemester({ ...newSemester, name: e.target.value })} placeholder={`e.g., ${semesterLabel} 1`} required className="form-input text-sm" /></div>
                                        <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Start Date</label><input type="date" value={newSemester.startDate} onChange={e => setNewSemester({ ...newSemester, startDate: e.target.value })} required className="form-input text-sm" /></div>
                                        <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">End Date</label><input type="date" value={newSemester.endDate} onChange={e => setNewSemester({ ...newSemester, endDate: e.target.value })} required className="form-input text-sm" /></div>
                                    </div>
                                    {!isSchool && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Lecturer Request Deadline</label><input type="date" value={newSemester.requestDeadline} onChange={e => setNewSemester({ ...newSemester, requestDeadline: e.target.value })} className="form-input text-sm" /></div>
                                            <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Student Enrollment Deadline</label><input type="date" value={newSemester.enrollmentDeadline} onChange={e => setNewSemester({ ...newSemester, enrollmentDeadline: e.target.value })} className="form-input text-sm" /></div>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setAddingSemesterTo(null)} className="btn-secondary text-sm">Cancel</button>
                                        <button type="submit" className="btn-primary text-sm">Save {semesterLabel}</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-4">
                            {semesters.filter(s => s.academicYearId === selectedYear.id).map(semester => (
                                <div key={semester.id} className="group border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all hover:border-indigo-300">
                                    <div className="p-4 bg-slate-50/50 dark:bg-slate-700/20 flex flex-wrap gap-4 justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-slate-900 dark:text-white">{semester.name}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[semester.status]}`}>{semester.status}</span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
                                                <span>{new Date(semester.startDate).toLocaleDateString()} - {new Date(semester.endDate).toLocaleDateString()}</span>
                                                {!isSchool && semester.requestDeadline && <span className="font-bold text-indigo-500">Request DL: {new Date(semester.requestDeadline).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {onUpdateSemester && semester.status !== 'active' && (
                                                <button onClick={() => onUpdateSemester(semester.id, { status: 'active' })} className="text-xs font-bold text-green-600 hover:text-green-800">Activate</button>
                                            )}
                                            <button onClick={() => handleEditSemesterClick(semester)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500">
                                                <Cog8ToothIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => onDeleteSemester?.(semester.id)} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg">
                                                <XIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {editingSemesterId === semester.id && editingSemesterData && (
                                        <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 animate-fade-in-up">
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Internal Name</label><input type="text" value={editingSemesterData.name} onChange={e => setEditingSemesterData({ ...editingSemesterData, name: e.target.value })} className="form-input text-sm" /></div>
                                                    <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Start Date</label><input type="date" value={editingSemesterData.startDate} onChange={e => setEditingSemesterData({ ...editingSemesterData, startDate: e.target.value })} className="form-input text-sm" /></div>
                                                    <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">End Date</label><input type="date" value={editingSemesterData.endDate} onChange={e => setEditingSemesterData({ ...editingSemesterData, endDate: e.target.value })} className="form-input text-sm" /></div>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h6 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Academic Sessions</h6>
                                                        <button type="button" onClick={handleAddSession} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                                            <PlusIcon className="w-4 h-4" /> Add Session
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {(editingSemesterData.sessions || []).map((session) => (
                                                            <div key={session.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                                                <div className="flex gap-3 items-end">
                                                                    <div className="flex-grow"><label className="block text-[10px] font-bold text-slate-400 mb-1">Session Name</label><input type="text" value={session.name} onChange={(e) => handleSessionChange(session.id, 'name', e.target.value)} className="form-input text-xs" /></div>
                                                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1">Start</label><input type="date" value={session.startDate} onChange={(e) => handleSessionChange(session.id, 'startDate', e.target.value)} className="form-input text-xs" /></div>
                                                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1">End</label><input type="date" value={session.endDate} onChange={(e) => handleSessionChange(session.id, 'endDate', e.target.value)} className="form-input text-xs" /></div>
                                                                    <button type="button" onClick={() => handleDeleteSession(session.id)} className="p-2 text-red-400 hover:text-red-600"><XIcon className="w-5 h-5" /></button>
                                                                </div>

                                                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-3">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Exam Windows</span>
                                                                        <button type="button" onClick={() => handleAddExamPeriod(session.id)} className="text-[10px] font-bold text-indigo-500 hover:underline">Add Period</button>
                                                                    </div>
                                                                    {(session.examPeriods || []).map(exam => (
                                                                        <div key={exam.id} className="flex gap-2 items-center">
                                                                            <input type="text" value={exam.name} onChange={(e) => handleExamPeriodChange(session.id, exam.id, 'name', e.target.value)} className="form-input text-[10px] h-8 flex-grow" placeholder="Exam Name" />
                                                                            <input type="date" value={exam.startDate} onChange={(e) => handleExamPeriodChange(session.id, exam.id, 'startDate', e.target.value)} className="form-input text-[10px] h-8 w-32" />
                                                                            <input type="date" value={exam.endDate} onChange={(e) => handleExamPeriodChange(session.id, exam.id, 'endDate', e.target.value)} className="form-input text-[10px] h-8 w-32" />
                                                                            <button type="button" onClick={() => handleDeleteExamPeriod(session.id, exam.id)} className="p-1 text-slate-400 hover:text-red-500"><XIcon className="w-4 h-4" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                                                    <button type="button" onClick={() => { setEditingSemesterId(null); setEditingSemesterData(null); }} className="btn-secondary text-sm">Cancel</button>
                                                    <button
                                                        onClick={handleUpdateSemester}
                                                        disabled={semesterSaveStatus === 'saving'}
                                                        className={`btn-primary text-sm ${semesterSaveStatus === 'saved' ? 'bg-green-600' : ''}`}
                                                    >
                                                        {semesterSaveStatus === 'saving' ? 'Syncing...' : semesterSaveStatus === 'saved' ? 'Synced successfully' : 'Save configuration'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <CalendarDaysIcon className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Select an Academic Year</h3>
                    </div>
                )}
            </div>
        </div>
    );
};
