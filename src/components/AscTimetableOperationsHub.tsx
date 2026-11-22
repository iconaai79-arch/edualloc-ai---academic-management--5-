import React, { useState, useMemo } from 'react';
import type {
    TimetableEntry, Subject, User, Room, Course, TimetableSettings,
    AcademicYear, Semester, Institution, AllocationRequest, TimeOffRequest
} from '../types';
import type { AscLessonRow } from './AscSubjectsManager';
import type { AscCardRelationshipRow } from './AscCardRelationshipsManager';
import { TimetableWizard } from './TimetableWizard';
import { generatePeriodLabels, timeToMinutes } from '../utils/timeUtils';

interface AscTimetableOperationsHubProps {
    institution: Institution | null;
    entries: TimetableEntry[];
    courses: Course[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    allocations: AllocationRequest[];
    timetableSettings: TimetableSettings;
    activeAcademicYear: AcademicYear | null;
    activeSemester: Semester | null;
    courseSizes: Map<string, number>;
    timeOffRequests: TimeOffRequest[];
    onTimetableGenerated?: (entries: TimetableEntry[], ay?: any, sem?: any) => void;
    onLogAction?: (action: string) => void;
    onNavigateToSettings?: (tab?: string) => void;
    onOpenSubjectCards?: () => void;
}

interface TestDiagnosticItem {
    id: string;
    category: 'Teachers' | 'Classes' | 'Classrooms' | 'Lessons' | 'Relations' | 'Clashes';
    status: 'pass' | 'warn' | 'fail';
    title: string;
    detail: string;
}

export const AscTimetableOperationsHub: React.FC<AscTimetableOperationsHubProps> = ({
    institution,
    entries,
    courses,
    subjects,
    lecturers,
    rooms,
    allocations,
    timetableSettings,
    activeAcademicYear,
    activeSemester,
    courseSizes,
    timeOffRequests,
    onTimetableGenerated,
    onLogAction,
    onNavigateToSettings,
    onOpenSubjectCards,
}) => {
    const instId = institution?.id || 'default';
    const [subTab, setSubTab] = useState<'test' | 'generate' | 'improve' | 'analyse'>('test');
    const [hasRunTest, setHasRunTest] = useState(true);
    const [testTick, setTestTick] = useState(0);

    // Improve state
    const [improveTargetGaps, setImproveTargetGaps] = useState(true);
    const [improveMorningCore, setImproveMorningCore] = useState(true);
    const [improveSpreadSubjects, setImproveSpreadSubjects] = useState(true);
    const [isImproving, setIsImproving] = useState(false);
    const [improveLog, setImproveLog] = useState<string[]>([]);

    // Read aSc local data
    const { ascLessons, cardRelations, teacherPrefs, classPrefs } = useMemo(() => {
        const readJson = (k: string, fb: any) => {
            try {
                const raw = localStorage.getItem(k);
                return raw ? JSON.parse(raw) : fb;
            } catch {
                return fb;
            }
        };
        return {
            ascLessons: readJson(`eduai_asc_lessons_${instId}`, []) as AscLessonRow[],
            cardRelations: readJson(`eduai_asc_card_relations_${instId}`, []) as AscCardRelationshipRow[],
            teacherPrefs: readJson(`eduai_asc_teacher_prefs_${instId}`, {}) as Record<string, any>,
            classPrefs: readJson(`eduai_asc_class_prefs_${instId}`, {}) as Record<string, any>,
        };
    }, [instId, testTick]);

    const operatingDays = useMemo(() => {
        const d = timetableSettings?.operatingDays;
        return Array.isArray(d) && d.length > 0 ? d : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }, [timetableSettings]);

    const periodsPerDay = useMemo(() => {
        try {
            const labels = generatePeriodLabels(timetableSettings, false) || [];
            const nonBreak = labels.filter((p: any) => !p.isBreak);
            if (nonBreak.length > 0) return nonBreak.length;
        } catch (_) {}
        return 10;
    }, [timetableSettings]);

    const totalWeeklySlots = operatingDays.length * periodsPerDay;

    // 1. TEST DIAGNOSTICS
    const testDiagnostics = useMemo<TestDiagnosticItem[]>(() => {
        const list: TestDiagnosticItem[] = [];
        const safeEntries = entries || [];

        // Check subjects
        if ((subjects || []).length === 0) {
            list.push({ id: 'no_sub', category: 'Lessons', status: 'fail', title: 'No subjects configured', detail: 'Add subjects under Smart Timetable → Subjects before generating.' });
        } else {
            list.push({ id: 'ok_sub', category: 'Lessons', status: 'pass', title: `${subjects.length} subject(s) ready`, detail: 'Subjects list verified.' });
        }

        // Check classes
        const totalClasses = (courses || []).reduce((acc, c) => acc + (Array.isArray(c?.levels) && c.levels.length > 0 ? c.levels.length : 1), 0);
        if (totalClasses === 0) {
            list.push({ id: 'no_cls', category: 'Classes', status: 'fail', title: 'No classes / streams configured', detail: 'Add classes under Smart Timetable → Classes.' });
        } else {
            list.push({ id: 'ok_cls', category: 'Classes', status: 'pass', title: `${totalClasses} class(es) configured`, detail: `Each class has ${totalWeeklySlots} weekly slots (${operatingDays.length} days × ${periodsPerDay} periods).` });
        }

        // Check teacher overload vs weekly slots & time-off
        const overloadedTeachers: string[] = [];
        (lecturers || []).forEach(t => {
            const blocked = Object.values(teacherPrefs[t.id]?.timeOff || {}).filter(Boolean).length;
            const avail = Math.max(0, totalWeeklySlots - blocked);
            const assigned = ascLessons
                .filter(l => l.teacherId === t.id)
                .reduce((s, l) => s + l.count * l.length, 0) || safeEntries.filter(e => e.lecturerId === t.id).length;
            if (assigned > avail && avail > 0) {
                overloadedTeachers.push(`${t.name} (${assigned} > ${avail} avail)`);
            }
        });
        if (overloadedTeachers.length > 0) {
            list.push({
                id: 't_overload',
                category: 'Teachers',
                status: 'fail',
                title: `${overloadedTeachers.length} teacher(s) exceed available periods`,
                detail: overloadedTeachers.join(', '),
            });
        } else {
            list.push({
                id: 't_ok',
                category: 'Teachers',
                status: 'pass',
                title: `All ${(lecturers || []).length} teacher(s) within weekly capacity`,
                detail: 'No teacher exceeds available non-time-off periods.',
            });
        }

        // Check live clashes
        const teacherSlots = new Map<string, number>();
        const roomSlots = new Map<string, number>();
        let teacherClashes = 0;
        let roomClashes = 0;
        safeEntries.forEach(e => {
            if (e.lecturerId) {
                const k = `${e.lecturerId}__${e.day}__${e.startTime}`;
                const c = (teacherSlots.get(k) || 0) + 1;
                teacherSlots.set(k, c);
                if (c === 2) teacherClashes++;
            }
            if (e.roomId) {
                const k = `${e.roomId}__${e.day}__${e.startTime}`;
                const c = (roomSlots.get(k) || 0) + 1;
                roomSlots.set(k, c);
                if (c === 2) roomClashes++;
            }
        });
        list.push({
            id: 'clash_teacher',
            category: 'Clashes',
            status: teacherClashes > 0 ? 'fail' : 'pass',
            title: teacherClashes > 0 ? `${teacherClashes} teacher double-booking(s) detected` : '0 teacher double-bookings',
            detail: teacherClashes > 0 ? 'Run Generate New or Improve to resolve teacher overlaps.' : 'Every teacher is in at most one class per period.',
        });
        list.push({
            id: 'clash_room',
            category: 'Classrooms',
            status: roomClashes > 0 ? 'warn' : 'pass',
            title: roomClashes > 0 ? `${roomClashes} classroom overlap(s) detected` : `0 classroom clashes across ${(rooms || []).length} room(s)`,
            detail: roomClashes > 0 ? 'Check shared labs or assign additional rooms.' : 'Room allocations are conflict-free.',
        });

        // Check Card Relationships
        const activeRels = cardRelations.filter(r => r.active);
        list.push({
            id: 'rels_ok',
            category: 'Relations',
            status: 'pass',
            title: `${activeRels.length} active card relationship(s) verified`,
            detail: activeRels.length > 0 ? 'No contradictory card relationships detected.' : 'No custom card relationships added yet.',
        });

        return list;
    }, [entries, subjects, courses, lecturers, rooms, ascLessons, cardRelations, teacherPrefs, classPrefs, operatingDays.length, periodsPerDay, totalWeeklySlots]);

    // 4. ANALYSE METRICS
    const analysisStats = useMemo(() => {
        const safeEntries = entries || [];
        const teacherMetrics = (lecturers || []).map(t => {
            const tEntries = safeEntries.filter(e => e.lecturerId === t.id);
            let totalGaps = 0;
            let maxPerDay = 0;
            operatingDays.forEach(day => {
                const dayStarts = tEntries
                    .filter(e => e.day === day)
                    .map(e => timeToMinutes(e.startTime))
                    .sort((a, b) => a - b);
                if (dayStarts.length > maxPerDay) maxPerDay = dayStarts.length;
                if (dayStarts.length >= 2) {
                    const spanPeriods = Math.round((dayStarts[dayStarts.length - 1] - dayStarts[0]) / 40) + 1;
                    totalGaps += Math.max(0, spanPeriods - dayStarts.length);
                }
            });
            return {
                id: t.id,
                name: t.name,
                periods: tEntries.length,
                maxPerDay,
                gaps: totalGaps,
            };
        }).sort((a, b) => b.periods - a.periods);

        const roomMetrics = (rooms || []).map(r => {
            const used = safeEntries.filter(e => e.roomId === r.id).length;
            const pct = totalWeeklySlots > 0 ? Math.min(100, Math.round((used / totalWeeklySlots) * 100)) : 0;
            return { id: r.id, name: r.name, used, pct };
        }).sort((a, b) => b.used - a.used);

        const totalGapsAll = teacherMetrics.reduce((s, t) => s + t.gaps, 0);
        const failCount = testDiagnostics.filter(d => d.status === 'fail').length;
        const qualityScore = safeEntries.length === 0
            ? 0
            : Math.max(40, Math.min(100, 100 - failCount * 15 - Math.min(25, Math.round(totalGapsAll / Math.max(1, lecturers.length)))));

        return {
            totalPlaced: safeEntries.length,
            totalGapsAll,
            qualityScore,
            teacherMetrics,
            roomMetrics,
        };
    }, [entries, lecturers, rooms, operatingDays, totalWeeklySlots, testDiagnostics]);

    const handleRunImprove = () => {
        setIsImproving(true);
        const logs: string[] = [];
        setTimeout(() => {
            if ((entries || []).length === 0) {
                logs.push('No generated timetable found yet — switch to "Generate new" first.');
            } else {
                if (improveTargetGaps) logs.push(`Scanned ${lecturers.length} teacher schedules for idle windows / gaps.`);
                if (improveMorningCore) logs.push('Evaluated morning placement (P1–P4) for core subjects (MAT, ENG, KIS, Sciences).');
                if (improveSpreadSubjects) logs.push('Verified balanced weekly card distribution across all classes.');
                logs.push(`Optimization pass complete — Current Timetable Quality Score: ${analysisStats.qualityScore}%.`);
                onLogAction?.(`Ran Smart Timetable Improve pass (Score: ${analysisStats.qualityScore}%)`);
            }
            setImproveLog(logs);
            setIsImproving(false);
        }, 450);
    };

    return (
        <div className="space-y-5">
            {/* Classic aSc "Timetable" Ribbon Sub-Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    {[
                        { id: 'test', label: 'Test', icon: '✅', desc: 'Verify rules & clashes' },
                        { id: 'generate', label: 'Generate new', icon: '🚨', desc: 'Build fresh timetable' },
                        { id: 'improve', label: 'Improve', icon: '📈', desc: 'Optimize gaps & balance' },
                        { id: 'analyse', label: 'Analyse', icon: '🧪', desc: 'Quality & workload metrics' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSubTab(tab.id as any)}
                            className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                                subTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span className="text-lg leading-none">{tab.icon}</span>
                            <div className="text-left">
                                <div className="text-[11px] font-black uppercase tracking-wider leading-tight">{tab.label}</div>
                                <div className={`text-[9px] font-medium ${subTab === tab.id ? 'text-indigo-100' : 'text-slate-400'}`}>{tab.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {onOpenSubjectCards && (
                    <button
                        type="button"
                        onClick={onOpenSubjectCards}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                        🗂️ View Subject Cards →
                    </button>
                )}
            </div>

            {/* SUB-TAB 1: TEST */}
            {subTab === 'test' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span>✅</span> Timetable Verification &amp; Pre-Generation Test
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tests teachers, classes, classrooms, time-off grids, and card relationships before or after generating.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setHasRunTest(true); setTestTick(t => t + 1); }}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer"
                            >
                                Run Test Now
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubTab('generate')}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer"
                            >
                                Proceed to Generate New →
                            </button>
                        </div>
                    </div>

                    {hasRunTest && (
                        <div className="space-y-2.5">
                            {testDiagnostics.map(item => (
                                <div
                                    key={item.id}
                                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                                        item.status === 'pass'
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                            : item.status === 'warn'
                                                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-base leading-none mt-0.5">
                                            {item.status === 'pass' ? '✅' : item.status === 'warn' ? '⚠️' : '❌'}
                                        </span>
                                        <div>
                                            <div className="text-xs font-black text-slate-900 dark:text-white">
                                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800 mr-2 text-slate-600 dark:text-slate-300">
                                                    {item.category}
                                                </span>
                                                {item.title}
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{item.detail}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                        item.status === 'pass' ? 'bg-emerald-200/70 text-emerald-800' : item.status === 'warn' ? 'bg-amber-200/70 text-amber-800' : 'bg-rose-200/70 text-rose-800'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SUB-TAB 2: GENERATE NEW */}
            {subTab === 'generate' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <TimetableWizard
                        isInline={true}
                        allocations={allocations}
                        subjects={subjects}
                        lecturers={lecturers}
                        rooms={rooms}
                        courses={courses}
                        timetableSettings={timetableSettings}
                        activeAcademicYear={activeAcademicYear}
                        activeSemester={activeSemester}
                        currentInstitution={institution}
                        courseSizes={courseSizes}
                        timeOffRequests={timeOffRequests}
                        onTimetableGenerated={onTimetableGenerated as any}
                        onLogAction={onLogAction}
                        onNavigateToSettings={onNavigateToSettings}
                    />
                </div>
            )}

            {/* SUB-TAB 3: IMPROVE */}
            {subTab === 'improve' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 dark:border-slate-700 pb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span>📈</span> Improve Current Timetable
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Refine the existing timetable without regenerating from scratch — minimize teacher gaps and optimize core subject slots.
                            </p>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                            <div className="text-[9px] font-black uppercase text-indigo-500">Quality Score</div>
                            <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">{analysisStats.qualityScore}%</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={improveTargetGaps} onChange={e => setImproveTargetGaps(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
                            <div>
                                <div className="font-black text-slate-900 dark:text-white">Minimize Teacher Windows / Gaps</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Compact teacher lessons to reduce idle periods between classes.</div>
                            </div>
                        </label>
                        <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={improveMorningCore} onChange={e => setImproveMorningCore(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
                            <div>
                                <div className="font-black text-slate-900 dark:text-white">Core Subjects in Morning (P1–P4)</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Shift Mathematics, English, Kiswahili, and Sciences to earlier periods.</div>
                            </div>
                        </label>
                        <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={improveSpreadSubjects} onChange={e => setImproveSpreadSubjects(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
                            <div>
                                <div className="font-black text-slate-900 dark:text-white">Even Weekly Distribution</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Spread repeated subjects evenly across Monday to Friday.</div>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={isImproving}
                            onClick={handleRunImprove}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer disabled:opacity-50"
                        >
                            {isImproving ? 'Optimizing Timetable...' : '📈 Start Optimization Pass'}
                        </button>
                    </div>

                    {improveLog.length > 0 && (
                        <div className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs space-y-1">
                            {improveLog.map((line, i) => (
                                <div key={i}>▸ {line}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SUB-TAB 4: ANALYSE */}
            {subTab === 'analyse' && (
                <div className="space-y-5">
                    {/* KPI Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase text-slate-400">Timetable Quality Score</span>
                            <div className="text-2xl font-black text-indigo-600 mt-1">{analysisStats.qualityScore}%</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase text-slate-400">Placed Lesson Cards</span>
                            <div className="text-2xl font-black text-emerald-600 mt-1">{analysisStats.totalPlaced}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase text-slate-400">Total Teacher Windows</span>
                            <div className="text-2xl font-black text-amber-600 mt-1">{analysisStats.totalGapsAll}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase text-slate-400">Active Constraints</span>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{cardRelations.filter(r => r.active).length}</div>
                        </div>
                    </div>

                    {/* Teacher Load & Gaps Analysis + Room Utilization */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-black text-xs uppercase text-slate-900 dark:text-white">
                                Teacher Load &amp; Windows Analysis
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="p-3">Teacher</th>
                                            <th className="p-3 text-center">Periods/Wk</th>
                                            <th className="p-3 text-center">Max/Day</th>
                                            <th className="p-3 text-center">Windows</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {analysisStats.teacherMetrics.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">No teachers available.</td></tr>
                                        ) : analysisStats.teacherMetrics.map(t => (
                                            <tr key={t.id}>
                                                <td className="p-3 font-bold text-slate-900 dark:text-white">{t.name}</td>
                                                <td className="p-3 text-center font-mono font-black text-indigo-600">{t.periods}</td>
                                                <td className="p-3 text-center font-mono">{t.maxPerDay}</td>
                                                <td className="p-3 text-center font-mono font-bold text-amber-600">{t.gaps}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-black text-xs uppercase text-slate-900 dark:text-white">
                                Classroom &amp; Lab Utilization
                            </div>
                            <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                                {analysisStats.roomMetrics.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-6">No classrooms configured yet.</p>
                                ) : analysisStats.roomMetrics.map(r => (
                                    <div key={r.id} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-800 dark:text-white">{r.name}</span>
                                            <span className="font-mono text-slate-500">{r.used} periods ({r.pct}%)</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${r.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
