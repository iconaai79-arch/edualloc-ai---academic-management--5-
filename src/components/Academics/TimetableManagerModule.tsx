import React, { useState, useMemo } from 'react';
import type { 
    ExamTimetableEntry, Subject, User, Room, Building, Course, 
    Department, AcademicYear, Semester, Institution, TimetableSettings 
} from '../../types';
import { ExamTimetableGrid } from '../ExamTimetableGrid';
import { 
    Calendar, Sparkles, Printer, DocumentArrowDownIcon, CommandLineIcon, 
    Filter, Search, Clock, Plus, ShieldCheck, CheckCircle2, RefreshCw, Layers
} from 'lucide-react';

export interface TimetableManagerModuleProps {
    entries: ExamTimetableEntry[];
    getSubjectById?: (id: string) => Subject | undefined;
    getLecturerById?: (id: string) => User | undefined;
    getRoomById?: (id: string) => Room | undefined;
    buildings?: Building[];
    courses?: Course[];
    departments?: Department[];
    currentInstitution?: Institution | null;
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    generationMode: 'ai' | 'standard';
    setGenerationMode: (mode: 'ai' | 'standard') => void;
    isLoading: boolean;
    isGeneratingPdf: boolean;
    error: string | null;
    onGenerate: () => void;
    onDownloadPdf: () => void;
    onOpenWizard: () => void;
}

export const TimetableManagerModule: React.FC<TimetableManagerModuleProps> = ({
    entries = [],
    getSubjectById,
    getLecturerById,
    getRoomById,
    buildings = [],
    courses = [],
    departments = [],
    currentInstitution,
    activeAcademicYear,
    activeSemester,
    generationMode,
    setGenerationMode,
    isLoading,
    isGeneratingPdf,
    error,
    onGenerate,
    onDownloadPdf,
    onOpenWizard
}) => {
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'generator' | 'analytics'>('schedule');

    // Filter timetable entries
    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (!e) return false;
            const subject = getSubjectById ? getSubjectById(e.subjectId) : undefined;
            const matchesDept = departmentFilter === 'all' || (subject && subject.departmentId === departmentFilter);
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q || (subject?.name || '').toLowerCase().includes(q) || (subject?.code || '').toLowerCase().includes(q);
            return matchesDept && matchesQuery;
        });
    }, [entries, departmentFilter, searchQuery, getSubjectById]);

    const title = `${activeSemester?.name || 'Term Exam'} Timetable (${activeAcademicYear?.name || 'Academic Year'})`;

    return (
        <div className="space-y-6 text-left font-sans text-slate-900 dark:text-slate-100 no-print">
            {/* ── TIMETABLE MODULE HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 md:p-8 text-white border border-indigo-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/50">
                                Master Timetable Engine • AI Schedule Hub
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-cyan-400" />
                            <span>Timetable Operations & Management</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Current Active Period: <strong className="text-cyan-300">{activeSemester?.name || 'Current Term'} ({activeAcademicYear?.name || 'Academic Year'})</strong>
                        </p>
                    </div>

                    {/* Quick Action Trigger Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={onOpenWizard}
                            className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Timetable Wizard</span>
                        </button>

                        <button
                            onClick={onDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-black uppercase tracking-wider rounded-2xl border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 text-emerald-400" />
                            <span>{isGeneratingPdf ? 'Exporting...' : 'Export PDF'}</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-all"
                            title="Print Timetable"
                        >
                            <Printer className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error / Warning Alert if any */}
            {error && (
                <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-xl">
                    <Clock className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* ── KPI METRICS CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Timetable Slots</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{entries.length}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Assigned Rooms</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{buildings.length || 12}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block">Invigilator Allocations</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{courses.length || 18}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500 block">AI Generator Mode</span>
                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block uppercase">{generationMode}</span>
                </div>
            </div>

            {/* ── SUB-TAB CONTROL BAR ── */}
            <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveSubTab('schedule')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeSubTab === 'schedule'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Schedule Grid View
                    </button>
                    <button
                        onClick={() => setActiveSubTab('generator')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeSubTab === 'generator'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        AI Generator Control
                    </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex items-center gap-3">
                    <div className="relative w-48 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter by unit or code..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <select
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── TAB 1: SCHEDULE GRID VIEW ── */}
            {activeSubTab === 'schedule' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-500" />
                            <span>{title}</span>
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                            Showing {filteredEntries.length} entries
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <ExamTimetableGrid
                            entries={filteredEntries}
                            getSubjectById={getSubjectById}
                            getLecturerById={getLecturerById}
                            getRoomById={getRoomById}
                            buildings={buildings}
                            courses={courses}
                            title={title}
                            currentInstitution={currentInstitution}
                        />
                    </div>
                </div>
            )}

            {/* ── TAB 2: AI GENERATOR CONTROL ── */}
            {activeSubTab === 'generator' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                                AI Timetable Generator Command
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Select scheduling algorithm mode & run conflict-free timetable synthesis.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                            <h4 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400">1. Algorithm Mode Selection</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setGenerationMode('ai')}
                                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                                        generationMode === 'ai'
                                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-transparent shadow-lg font-bold'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <Sparkles className="w-6 h-6" />
                                    <div>
                                        <span className="text-xs font-black uppercase block">AI Neural Mode</span>
                                        <span className="text-[9px] opacity-80 block font-medium">Gemini 2.5 Neural Synthesis</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setGenerationMode('standard')}
                                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                                        generationMode === 'standard'
                                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-transparent shadow-lg font-bold'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <CommandLineIcon className="w-6 h-6" />
                                    <div>
                                        <span className="text-xs font-black uppercase block">Standard Mode</span>
                                        <span className="text-[9px] opacity-80 block font-medium">Rule-Based Deterministic</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                            <h4 className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400">2. Active Period Verification</h4>
                            <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                <p><strong>Academic Year:</strong> {activeAcademicYear?.name || 'Not Configured'}</p>
                                <p><strong>Semester / Term:</strong> {activeSemester?.name || 'Not Configured'}</p>
                                <p><strong>Exam Sessions Defined:</strong> {(activeSemester?.sessions || []).length} Sessions</p>
                            </div>

                            <button
                                onClick={onGenerate}
                                disabled={isLoading}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Sparkles className="w-4.5 h-4.5" />
                                <span>{isLoading ? 'Generating Timetable...' : `Generate Timetable (${generationMode.toUpperCase()})`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
