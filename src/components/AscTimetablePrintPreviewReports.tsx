import React, { useState, useMemo, useRef } from 'react';
import type { TimetableEntry, Subject, User, Room, Course, TimetableSettings, Institution, AcademicYear } from '../types';
import type { AscSchoolSettings, AscBellPeriodRow } from './AscSchoolSettingsPanel';
import { generatePeriodLabels, timeToMinutes } from '../utils/timeUtils';

export type AscReportKind =
    | 'each_class'
    | 'each_teacher'
    | 'each_classroom'
    | 'each_subject'
    | 'summary_classes'
    | 'summary_teachers'
    | 'summary_classrooms'
    | 'poster_classes'
    | 'poster_teachers'
    | 'poster_classrooms';

interface AscTimetablePrintPreviewReportsProps {
    institution?: Institution | null;
    activeAcademicYear?: AcademicYear | null;
    entries: TimetableEntry[];
    courses: Course[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    timetableSettings: TimetableSettings;
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
}

const REPORT_OPTIONS: Array<{ id: AscReportKind; label: string; icon: string; badge: string }> = [
    { id: 'each_class', label: 'Timetable for each class', icon: '👥', badge: 'Individual' },
    { id: 'each_teacher', label: 'Timetable for each teacher', icon: '🎓', badge: 'Individual' },
    { id: 'each_classroom', label: 'Timetable for each classroom', icon: '🚪', badge: 'Individual' },
    { id: 'each_subject', label: 'Timetable for each subject', icon: '📘', badge: 'Individual' },
    { id: 'summary_classes', label: 'Summary timetable of classes', icon: '👥', badge: 'Summary' },
    { id: 'summary_teachers', label: 'Summary timetable of teachers', icon: '🎓', badge: 'Summary' },
    { id: 'summary_classrooms', label: 'Summary timetable of classrooms', icon: '🚪', badge: 'Summary' },
    { id: 'poster_classes', label: 'Wall poster of classes', icon: '👥', badge: 'Wall Poster' },
    { id: 'poster_teachers', label: 'Wall poster of teachers', icon: '🎓', badge: 'Wall Poster' },
    { id: 'poster_classrooms', label: 'Wall poster of classrooms', icon: '🚪', badge: 'Wall Poster' },
];

const CARD_COLORS = [
    '#0099cc', // KIS cyan-blue
    '#f9c2ff', // MAT soft pink-lilac
    '#f453f4', // CHE vibrant magenta
    '#993333', // ENG maroon-brown
    '#169138', // BIO rich green
    '#c4f1ff', // PHY ice blue
    '#e4f796', // GEO light lime
    '#f99898', // AGRI coral pink
    '#c743a7', // HS orchid
    '#a3f56b', // CS bright lime
    '#57c757', // BST green
    '#6b6bf0', // CRE periwinkle
];
const getCardTint = (key: string) => {
    const k = (key || '').toUpperCase();
    if (k.startsWith('KIS')) return '#0099cc';
    if (k.startsWith('MAT')) return '#f9c2ff';
    if (k.startsWith('CHE')) return '#f453f4';
    if (k.startsWith('ENG')) return '#993333';
    if (k.startsWith('BIO')) return '#169138';
    if (k.startsWith('PHY')) return '#c4f1ff';
    if (k.startsWith('GEO')) return '#e4f796';
    if (k.startsWith('HIS')) return '#4fd1ff';
    if (k.startsWith('AGR')) return '#f99898';
    if (k.startsWith('HS')) return '#c743a7';
    if (k.startsWith('CS') || k.startsWith('COM')) return '#a3f56b';
    if (k.startsWith('BST') || k.startsWith('BUS')) return '#57c757';
    if (k.startsWith('CRE')) return '#8f8ff5';
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    return CARD_COLORS[h % CARD_COLORS.length];
};

const getDayAbbr = (day: string): string => {
    const d = (day || '').trim();
    if (/^day\s*\d+/i.test(d)) return d;
    return d.slice(0, 2);
};

const getShortCode = (sub?: Subject) => {
    if (!sub) return 'SUB';
    if (sub.code && sub.code.trim().length <= 5) return sub.code.trim().toUpperCase();
    return (sub.name || 'SUB').slice(0, 3).toUpperCase();
};

export const AscTimetablePrintPreviewReports: React.FC<AscTimetablePrintPreviewReportsProps> = ({
    institution,
    activeAcademicYear,
    entries,
    courses,
    subjects,
    lecturers,
    rooms,
    timetableSettings,
    getSubjectById,
    getLecturerById,
    getRoomById,
}) => {
    const instId = institution?.id || 'default';
    const [reportKind, setReportKind] = useState<AscReportKind>('each_class');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [modifyOpen, setModifyOpen] = useState(false);

    // Filter & Page Navigation
    const [selectedFilterId, setSelectedFilterId] = useState<string>('all');
    const [pageIndex, setPageIndex] = useState<number>(0);
    const [showAllPages, setShowAllPages] = useState<boolean>(false);

    // Modify Current Report Settings
    const [showColors, setShowColors] = useState(true);
    const [showTeacherNames, setShowTeacherNames] = useState(true);
    const [showRoomNames, setShowRoomNames] = useState(true);
    const [showBellTimes, setShowBellTimes] = useState(true);
    const [showBreaks, setShowBreaks] = useState(true);
    const [showSignatures, setShowSignatures] = useState(true);
    const [zoomPct, setZoomPct] = useState<number>(100);

    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Load aSc School Settings (Bell Times, Breaks, Custom Fields) & Teacher Short Codes
    const { schoolCfg, teacherPrefs } = useMemo(() => {
        let sc: Partial<AscSchoolSettings> = {};
        let tp: Record<string, any> = {};
        try {
            const raw = localStorage.getItem(`eduai_asc_school_settings_${instId}`);
            if (raw) sc = JSON.parse(raw);
        } catch (_) {}
        try {
            const rawT = localStorage.getItem(`eduai_asc_teacher_prefs_${instId}`);
            if (rawT) tp = JSON.parse(rawT);
        } catch (_) {}
        return { schoolCfg: sc, teacherPrefs: tp };
    }, [instId]);

    const getTeacherShortCode = (lecturerId?: string, teacher?: User): string => {
        if (lecturerId && teacherPrefs[lecturerId]?.shortCode) {
            return String(teacherPrefs[lecturerId].shortCode);
        }
        const idx = (lecturers || []).findIndex(l => l.id === lecturerId);
        if (idx >= 0) return String(idx + 1).padStart(2, '0');
        if (teacher?.name) {
            return teacher.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
        }
        return '';
    };

    const operatingDays = useMemo(() => {
        if (Array.isArray(schoolCfg.dayNames) && schoolCfg.dayNames.length > 0) {
            return schoolCfg.showDayNumberInsteadOfName
                ? schoolCfg.dayNames.map((_, i) => `Day ${i + 1}`)
                : schoolCfg.dayNames;
        }
        const d = timetableSettings?.operatingDays;
        return Array.isArray(d) && d.length > 0 ? d : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }, [schoolCfg, timetableSettings]);

    // Build ordered columns (teaching periods + optional breaks)
    const periodCols = useMemo<Array<{ id: string; name: string; short: string; start: string; end: string; isBreak: boolean; teachingIdx: number }>>(() => {
        if (Array.isArray(schoolCfg.bellTimes) && schoolCfg.bellTimes.length > 0) {
            let tIdx = 0;
            return schoolCfg.bellTimes
                .filter((b: AscBellPeriodRow) => showBreaks || !b.isBreak)
                .map((b: any, i: number) => ({
                    id: b.id || `col_${i}`,
                    name: b.name || b.label || String(i + 1),
                    short: b.short || b.name || b.label || String(i + 1),
                    start: b.start || '08:00',
                    end: b.end || '08:40',
                    isBreak: Boolean(b.isBreak),
                    teachingIdx: b.isBreak ? -1 : tIdx++,
                }));
        }
        try {
            const labels = generatePeriodLabels(timetableSettings, showBreaks) || [];
            let tIdx = 0;
            if (labels.length > 0) {
                return labels.map((p: any, i: number) => ({
                    id: `p_${i}`,
                    name: p.isBreak ? (p.label || 'BREAK') : String(tIdx + 1),
                    short: p.isBreak ? 'BRK' : String(tIdx + 1),
                    start: p.startTime,
                    end: p.endTime,
                    isBreak: Boolean(p.isBreak),
                    teachingIdx: p.isBreak ? -1 : tIdx++,
                }));
            }
        } catch (_) {}
        return Array.from({ length: 8 }).map((_, i) => ({
            id: `f_${i}`,
            name: String(i + 1),
            short: String(i + 1),
            start: `${String(8 + i).padStart(2, '0')}:00`,
            end: `${String(8 + i).padStart(2, '0')}:40`,
            isBreak: false,
            teachingIdx: i,
        }));
    }, [schoolCfg, timetableSettings, showBreaks]);

    const teachingCols = useMemo(() => periodCols.filter(c => !c.isBreak), [periodCols]);

    // Flatten classes
    const flatClasses = useMemo(() => {
        const list: Array<{ id: string; courseId: string; levelId: string; name: string; short: string }> = [];
        (courses || []).forEach(c => {
            if (!c) return;
            const lvls = Array.isArray(c.levels) && c.levels.length > 0 ? c.levels : [];
            if (lvls.length === 0) {
                list.push({ id: c.id, courseId: c.id, levelId: c.id, name: c.name, short: c.code || c.name.slice(0, 4).toUpperCase() });
            } else {
                lvls.forEach(l => {
                    if (!l) return;
                    const nm = l.name.toLowerCase().includes(c.name.toLowerCase()) ? l.name : `${c.name} ${l.name}`;
                    list.push({ id: `${c.id}::${l.id}`, courseId: c.id, levelId: String(l.id), name: nm, short: l.name.slice(0, 6).toUpperCase() });
                });
            }
        });
        return list;
    }, [courses]);

    // Helper: match entry to column
    const matchesCol = (entry: TimetableEntry, col: { start: string; end: string; isBreak: boolean }) => {
        if (col.isBreak) return false;
        if (entry.startTime === col.start) return true;
        const es = timeToMinutes(entry.startTime);
        const cs = timeToMinutes(col.start);
        const ce = timeToMinutes(col.end);
        return es >= cs && es < ce;
    };

    // Build Pages for Individual Reports
    const individualPages = useMemo(() => {
        if (reportKind === 'each_class') {
            const list = selectedFilterId === 'all' ? flatClasses : flatClasses.filter(c => c.id === selectedFilterId);
            return list.map(c => ({
                id: c.id,
                title: c.name.toUpperCase(),
                subtitle: `Class Timetable • ${c.short}`,
                entries: (entries || []).filter(e => String(e.levelId || '') === c.levelId || (c.levelId === c.courseId && e.courseId === c.courseId)),
            }));
        }
        if (reportKind === 'each_teacher') {
            const list = selectedFilterId === 'all' ? (lecturers || []) : (lecturers || []).filter(t => t.id === selectedFilterId);
            return list.map(t => ({
                id: t.id,
                title: t.name.toUpperCase(),
                subtitle: `Teacher Timetable • ${(entries || []).filter(e => e.lecturerId === t.id).length} periods / week`,
                entries: (entries || []).filter(e => e.lecturerId === t.id),
            }));
        }
        if (reportKind === 'each_classroom') {
            const list = selectedFilterId === 'all' ? (rooms || []) : (rooms || []).filter(r => r.id === selectedFilterId);
            return list.map(r => ({
                id: r.id,
                title: r.name.toUpperCase(),
                subtitle: `Classroom Timetable • Capacity ${r.capacity || 40}`,
                entries: (entries || []).filter(e => e.roomId === r.id),
            }));
        }
        if (reportKind === 'each_subject') {
            const list = selectedFilterId === 'all' ? (subjects || []) : (subjects || []).filter(s => s.id === selectedFilterId);
            return list.map(s => ({
                id: s.id,
                title: `${s.name.toUpperCase()} (${getShortCode(s)})`,
                subtitle: `Subject Timetable • ${(entries || []).filter(e => e.subjectId === s.id).length} periods / week`,
                entries: (entries || []).filter(e => e.subjectId === s.id),
            }));
        }
        return [];
    }, [reportKind, selectedFilterId, flatClasses, lecturers, rooms, subjects, entries]);

    const isIndividual = reportKind.startsWith('each_');
    const isPoster = reportKind.startsWith('poster_');
    const activeReportMeta = REPORT_OPTIONS.find(r => r.id === reportKind) || REPORT_OPTIONS[0];

    const filterOptions = useMemo(() => {
        if (reportKind.includes('class') && !reportKind.includes('classroom')) {
            return flatClasses.map(c => ({ id: c.id, label: c.name }));
        }
        if (reportKind.includes('teacher')) {
            return (lecturers || []).map(t => ({ id: t.id, label: t.name }));
        }
        if (reportKind.includes('classroom')) {
            return (rooms || []).map(r => ({ id: r.id, label: r.name }));
        }
        return (subjects || []).map(s => ({ id: s.id, label: `${getShortCode(s)} — ${s.name}` }));
    }, [reportKind, flatClasses, lecturers, rooms, subjects]);

    const handlePrintPreview = () => {
        const html = previewContainerRef.current?.innerHTML;
        if (!html) {
            window.print();
            return;
        }
        const win = window.open('', '_blank', 'width=1150,height=800');
        if (!win) {
            window.print();
            return;
        }
        win.document.write(`
            <html><head><title>${schoolCfg.schoolName || institution?.name || 'School'} — ${activeReportMeta.label}</title>
            <style>
                @page { size: landscape; margin: 8mm; }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; padding: 8px; background: #fff; }
                .asc-sheet { page-break-after: always; margin-bottom: 18px; padding: 12px; background: #fff; }
                .asc-sheet:last-child { page-break-after: auto; }
                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                th, td { border: 1.5px solid #000; padding: 0; text-align: center; vertical-align: middle; }
                th { background: #fff; font-weight: 600; padding: 4px 2px; }
                .asc-break-vertical { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 20px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
            </style></head><body>
            ${html}
            <script>setTimeout(() => window.print(), 200);</script>
            </body></html>
        `);
        win.document.close();
    };

    const schoolHeaderName = (schoolCfg.schoolName || institution?.name || 'SCHOOL TIMETABLE').toUpperCase();
    const yearLabel = schoolCfg.academicYear || activeAcademicYear?.name || String(new Date().getFullYear());

    // Render Single Individual A4 Paper Sheet (Exact Authentic aSc Noticeboard Format)
    const renderIndividualSheet = (page: { id: string; title: string; subtitle: string; entries: TimetableEntry[] }) => {
        const regOrSchool = (schoolCfg.registrationName || schoolHeaderName).toUpperCase();
        const todayStr = new Date().toLocaleDateString('en-GB');

        return (
            <div
                key={page.id}
                className="asc-sheet bg-white text-black rounded-sm shadow-2xl border border-slate-300 p-5 sm:p-7 mx-auto max-w-[1160px]"
            >
                {/* Centered Bold Class / Entity Title */}
                <div className="text-center">
                    <h2 className="text-3xl font-normal tracking-wide text-black uppercase leading-tight">
                        {page.title}
                    </h2>
                </div>

                {/* Top-Left Registration / School Name directly above grid */}
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700 mt-1 mb-0.5">
                    <span>{regOrSchool}</span>
                    {reportKind !== 'each_class' && <span className="uppercase">{page.subtitle}</span>}
                </div>

                {/* Authentic aSc Days × Periods + Merged Vertical Breaks Grid */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse table-fixed text-center" style={{ minWidth: '880px' }}>
                        <thead>
                            <tr>
                                <th className="border-[1.5px] border-black w-[72px] bg-white p-1" />
                                {periodCols.map(col => (
                                    <th
                                        key={col.id}
                                        className={`border-[1.5px] border-black bg-white py-1.5 px-0.5 align-middle ${col.isBreak ? 'w-[60px]' : ''}`}
                                    >
                                        <div className={`${col.isBreak ? 'text-[9px] font-bold uppercase leading-tight' : 'text-sm font-normal text-black leading-none'}`}>
                                            {col.name}
                                        </div>
                                        {showBellTimes && (
                                            <div className="text-[9px] font-normal text-slate-700 mt-0.5 whitespace-nowrap">
                                                {col.start} - {col.end}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {operatingDays.map((day, dIdx) => (
                                <tr key={day} className="h-[88px]">
                                    {/* Bold 2-Letter Day Label (Mo, Tu, We, Th, Fr) */}
                                    <td className="border-[1.5px] border-black bg-white text-2xl font-normal text-black align-middle">
                                        {getDayAbbr(day)}
                                    </td>

                                    {periodCols.map(col => {
                                        // Merged tall vertical Break column spanning all days (SHORT BREAK / LONG BREAK / LUNCH)
                                        if (col.isBreak) {
                                            if (dIdx > 0) return null;
                                            const breakText = (col.name.toUpperCase() === 'BREAK' ? 'SHORT BREAK' : col.name.toUpperCase().replace('LUNCH BREAK', 'LUNCH'));
                                            return (
                                                <td
                                                    key={col.id}
                                                    rowSpan={operatingDays.length}
                                                    className="border-[1.5px] border-black bg-white align-middle text-center p-1"
                                                >
                                                    <div className="asc-break-vertical inline-block [writing-mode:vertical-rl] rotate-180 text-xl font-bold tracking-[0.16em] text-black uppercase whitespace-nowrap">
                                                        {breakText}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        const slotEntries = page.entries.filter(e => e.day === day && matchesCol(e, col));
                                        if (slotEntries.length === 0) {
                                            return <td key={col.id} className="border-[1.5px] border-black bg-white h-[88px]" />;
                                        }

                                        // SINGLE SUBJECT CARD — full-bleed color, large centered short code, teacher short code bottom-right
                                        if (slotEntries.length === 1) {
                                            const entry = slotEntries[0];
                                            const sub = getSubjectById(entry.subjectId);
                                            const lec = getLecturerById(entry.lecturerId);
                                            const rm = getRoomById(entry.roomId);
                                            const cls = flatClasses.find(c => c.levelId === String(entry.levelId || '') || c.courseId === entry.courseId);
                                            const code = getShortCode(sub);
                                            const bg = showColors ? getCardTint(code) : '#ffffff';
                                            const tCode = getTeacherShortCode(entry.lecturerId, lec);

                                            return (
                                                <td
                                                    key={col.id}
                                                    style={{ backgroundColor: bg }}
                                                    className="border-[1.5px] border-black p-0 h-[88px] relative align-middle"
                                                >
                                                    <div className="w-full h-full flex flex-col items-center justify-center px-1 relative">
                                                        {showRoomNames && reportKind !== 'each_classroom' && rm && (
                                                            <span className="absolute top-0.5 right-1 text-[8px] font-semibold text-black/80 truncate max-w-[90%]">
                                                                {rm.name}
                                                            </span>
                                                        )}
                                                        <span className="text-lg font-normal text-black tracking-tight leading-none">
                                                            {reportKind === 'each_subject' ? (cls?.short || code) : code}
                                                        </span>
                                                        {reportKind === 'each_teacher' && cls && (
                                                            <span className="text-[10px] font-bold text-black/80 mt-0.5">{cls.short}</span>
                                                        )}
                                                        {showTeacherNames && reportKind !== 'each_teacher' && tCode && (
                                                            <span
                                                                title={lec?.name}
                                                                className="absolute bottom-0.5 right-1 text-[9px] font-semibold text-black"
                                                            >
                                                                {tCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        // SPLIT / MULTI-ELECTIVE CELL (2, 3, or 4 stacked horizontal color bands with dashed dividers)
                                        const visibleSplits = slotEntries.slice(0, 4);
                                        return (
                                            <td key={col.id} className="border-[1.5px] border-black p-0 h-[88px] align-top">
                                                <div className="w-full h-full flex flex-col">
                                                    {visibleSplits.map((entry, sIdx) => {
                                                        const sub = getSubjectById(entry.subjectId);
                                                        const lec = getLecturerById(entry.lecturerId);
                                                        const code = getShortCode(sub);
                                                        const bg = showColors ? getCardTint(code) : '#ffffff';
                                                        const tCode = getTeacherShortCode(entry.lecturerId, lec);
                                                        const isCompact = visibleSplits.length >= 3;
                                                        return (
                                                            <div
                                                                key={entry.id}
                                                                style={{ backgroundColor: bg }}
                                                                className={`flex-1 w-full relative flex items-center justify-center px-1 ${
                                                                    sIdx > 0 ? 'border-t border-dashed border-black/70' : ''
                                                                }`}
                                                            >
                                                                <span className={`${isCompact ? 'text-[11px]' : 'text-sm'} font-normal text-black leading-none`}>
                                                                    {code}
                                                                </span>
                                                                {showTeacherNames && tCode && (
                                                                    <span
                                                                        title={lec?.name}
                                                                        className="absolute bottom-0 right-0.5 text-[8px] font-semibold text-black leading-none"
                                                                    >
                                                                        {tCode}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Classic aSc Bottom Footer Line */}
                <div className="flex items-center justify-between text-[10px] text-slate-800 mt-1">
                    <span>Timetable generated:{todayStr}</span>
                    {showSignatures && (schoolCfg.customFields?.principalName || schoolCfg.customFields?.dosName) && (
                        <span>
                            {schoolCfg.customFields?.principalName ? `Principal: ${schoolCfg.customFields.principalName}` : ''}
                            {schoolCfg.customFields?.principalName && schoolCfg.customFields?.dosName ? ' • ' : ''}
                            {schoolCfg.customFields?.dosName ? `DOS: ${schoolCfg.customFields.dosName}` : ''}
                        </span>
                    )}
                    <span>{schoolCfg.customFields?.footerNote || `${schoolHeaderName} • EduAI Timetables`}</span>
                </div>
            </div>
        );
    };

    // Render Summary / Wall Poster Sheet (Rows = Classes OR Teachers OR Classrooms; Columns = Days × Periods)
    const renderSummaryOrPosterSheet = () => {
        const entityType = reportKind.includes('teacher') ? 'teacher' : reportKind.includes('classroom') ? 'classroom' : 'class';
        const rows = entityType === 'class'
            ? (selectedFilterId === 'all' ? flatClasses : flatClasses.filter(c => c.id === selectedFilterId)).map(c => ({
                id: c.id,
                label: c.short,
                full: c.name,
                entries: (entries || []).filter(e => String(e.levelId || '') === c.levelId || (c.levelId === c.courseId && e.courseId === c.courseId)),
            }))
            : entityType === 'teacher'
                ? (selectedFilterId === 'all' ? lecturers : lecturers.filter(t => t.id === selectedFilterId)).map(t => ({
                    id: t.id,
                    label: t.name,
                    full: t.name,
                    entries: (entries || []).filter(e => e.lecturerId === t.id),
                }))
                : (selectedFilterId === 'all' ? rooms : rooms.filter(r => r.id === selectedFilterId)).map(r => ({
                    id: r.id,
                    label: r.name,
                    full: r.name,
                    entries: (entries || []).filter(e => e.roomId === r.id),
                }));

        return (
            <div className="asc-sheet bg-white text-slate-900 rounded-sm shadow-2xl border border-slate-300 p-5 mx-auto w-full space-y-3">
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{schoolHeaderName} • {yearLabel}</div>
                        <h2 className="text-lg font-black uppercase">{activeReportMeta.label}</h2>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                        <div>{rows.length} {entityType}(s) • {(entries || []).length} lessons</div>
                        <div>{new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-center text-[10px]">
                        <thead>
                            <tr className="bg-slate-200">
                                <th rowSpan={2} className="border border-slate-700 p-1.5 font-black uppercase w-28">
                                    {entityType === 'class' ? 'Class' : entityType === 'teacher' ? 'Teacher' : 'Room'}
                                </th>
                                {operatingDays.map(day => (
                                    <th key={day} colSpan={teachingCols.length} className="border border-slate-700 py-1 font-black uppercase">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-slate-100">
                                {operatingDays.map(day =>
                                    teachingCols.map(col => (
                                        <th key={`${day}_${col.id}`} className="border border-slate-700 py-0.5 px-1 font-bold">
                                            {col.short}
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={1 + operatingDays.length * teachingCols.length} className="p-8 text-slate-400">No records to display.</td></tr>
                            ) : rows.map(row => (
                                <tr key={row.id}>
                                    <td title={row.full} className="border border-slate-700 p-1 font-black bg-slate-50 text-left truncate max-w-[110px]">
                                        {row.label}
                                    </td>
                                    {operatingDays.map(day =>
                                        teachingCols.map(col => {
                                            const slotEntries = row.entries.filter(e => e.day === day && matchesCol(e, col));
                                            if (slotEntries.length === 0) {
                                                return <td key={`${day}_${col.id}`} className="border border-slate-400 h-9 text-slate-300">×</td>;
                                            }
                                            const first = slotEntries[0];
                                            const sub = getSubjectById(first.subjectId);
                                            const code = getShortCode(sub);
                                            return (
                                                <td
                                                    key={`${day}_${col.id}`}
                                                    style={{ backgroundColor: showColors || isPoster ? getCardTint(code) : '#ffffff' }}
                                                    className="border border-slate-600 p-0.5 font-black leading-none"
                                                >
                                                    <div>{slotEntries.map(e => getShortCode(getSubjectById(e.subjectId))).join('/')}</div>
                                                </td>
                                            );
                                        })
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const safePageIndex = Math.min(pageIndex, Math.max(0, individualPages.length - 1));
    const visibleIndividualPages = showAllPages ? individualPages : (individualPages[safePageIndex] ? [individualPages[safePageIndex]] : []);

    return (
        <div className="rounded-2xl border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden bg-slate-200 dark:bg-slate-950">
            {/* Classic aSc Print Preview Ribbon */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center gap-4 relative z-30">
                {/* Print Button */}
                <button
                    type="button"
                    onClick={handlePrintPreview}
                    className="flex flex-col items-center justify-center px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-800 dark:text-blue-300 cursor-pointer"
                >
                    <span className="text-2xl leading-none">🖨️</span>
                    <span className="text-[11px] font-bold mt-0.5">Print ▾</span>
                </button>

                <div className="h-10 w-px bg-slate-300 dark:bg-slate-600" />

                {/* Select Your Report Rich Dropdown (matching aSc screenshot) */}
                <div className="relative">
                    <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-0.5">Select your report</div>
                    <button
                        type="button"
                        onClick={() => { setDropdownOpen(o => !o); setFilterOpen(false); setModifyOpen(false); }}
                        className="w-72 sm:w-80 px-2.5 py-1.5 rounded border-2 border-blue-400 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs font-bold text-slate-900 dark:text-white shadow-xs cursor-pointer"
                    >
                        <span className="flex items-center gap-2 truncate">
                            <span className="text-base leading-none">{activeReportMeta.icon}</span>
                            <span className="truncate">{activeReportMeta.label}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-slate-700 text-blue-800 dark:text-blue-300 text-[10px]">▾</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute left-0 top-full mt-1 w-80 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-lg shadow-2xl z-50 overflow-hidden">
                            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                {REPORT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            setReportKind(opt.id);
                                            setSelectedFilterId('all');
                                            setPageIndex(0);
                                            setDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-xs transition-colors cursor-pointer ${
                                            reportKind === opt.id
                                                ? 'bg-blue-600 text-white font-bold'
                                                : 'hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-900 dark:text-slate-100 font-semibold'
                                        }`}
                                    >
                                        <span className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-base shrink-0">
                                            {opt.icon}
                                        </span>
                                        <span className="flex-1 truncate">{opt.label}</span>
                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                            reportKind === opt.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                                        }`}>
                                            {opt.badge}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => { setDropdownOpen(false); setModifyOpen(true); }}
                                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 text-left text-xs font-bold text-blue-800 dark:text-blue-300 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                            >
                                <span>⚙️</span> Modify current report
                            </button>
                        </div>
                    )}
                </div>

                {/* Filter Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setFilterOpen(o => !o); setDropdownOpen(false); setModifyOpen(false); }}
                        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg cursor-pointer ${
                            selectedFilterId !== 'all' ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                        <span className="text-xl leading-none">🔽</span>
                        <span className="text-[11px] font-bold mt-0.5">Filter</span>
                    </button>
                    {filterOpen && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-400 rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
                            <div className="font-black uppercase text-[10px] text-slate-400">Filter Preview</div>
                            <select
                                value={selectedFilterId}
                                onChange={e => { setSelectedFilterId(e.target.value); setPageIndex(0); setFilterOpen(false); }}
                                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                            >
                                <option value="all">All ({filterOptions.length})</option>
                                {filterOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Modify Current Report Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setModifyOpen(o => !o); setDropdownOpen(false); setFilterOpen(false); }}
                        className="flex flex-col items-center justify-center px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                        <span className="text-xl leading-none">⚙️</span>
                        <span className="text-[11px] font-bold mt-0.5">Modify</span>
                    </button>
                    {modifyOpen && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-400 rounded-xl shadow-2xl p-3.5 z-50 space-y-2 text-xs">
                            <div className="font-black uppercase text-[10px] text-slate-400">Modify Current Report</div>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={showColors} onChange={e => setShowColors(e.target.checked)} className="accent-blue-600" /><span>Color-coded subject cards</span></label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={showTeacherNames} onChange={e => setShowTeacherNames(e.target.checked)} className="accent-blue-600" /><span>Show teacher names</span></label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={showRoomNames} onChange={e => setShowRoomNames(e.target.checked)} className="accent-blue-600" /><span>Show classrooms / labs</span></label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={showBellTimes} onChange={e => setShowBellTimes(e.target.checked)} className="accent-blue-600" /><span>Show bell times</span></label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={showBreaks} onChange={e => setShowBreaks(e.target.checked)} className="accent-blue-600" /><span>Show breaks between lessons</span></label>
                            <label className="flex items-center gap-2 cursor-pointer font-semibold"><input type="checkbox" checked={showSignatures} onChange={e => setShowSignatures(e.target.checked)} className="accent-blue-600" /><span>Show Principal / DOS footer</span></label>
                        </div>
                    )}
                </div>

                {/* Right: Page Navigation & Zoom */}
                <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                    {isIndividual && individualPages.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
                            <button
                                type="button"
                                disabled={showAllPages || safePageIndex <= 0}
                                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                                className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 font-black disabled:opacity-40 cursor-pointer"
                            >
                                ◀
                            </button>
                            <span className="px-2 font-mono font-bold">
                                {showAllPages ? `All ${individualPages.length} pages` : `Page ${safePageIndex + 1} / ${individualPages.length}`}
                            </span>
                            <button
                                type="button"
                                disabled={showAllPages || safePageIndex >= individualPages.length - 1}
                                onClick={() => setPageIndex(p => Math.min(individualPages.length - 1, p + 1))}
                                className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 font-black disabled:opacity-40 cursor-pointer"
                            >
                                ▶
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAllPages(p => !p)}
                                className={`ml-1 px-2 py-0.5 rounded text-[10px] font-black uppercase cursor-pointer ${showAllPages ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-300'}`}
                            >
                                {showAllPages ? 'Single' : 'All'}
                            </button>
                        </div>
                    )}

                    <select
                        value={zoomPct}
                        onChange={e => setZoomPct(Number(e.target.value) || 100)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-[11px]"
                    >
                        <option value={75}>75%</option>
                        <option value={90}>90%</option>
                        <option value={100}>100%</option>
                        <option value={115}>115%</option>
                    </select>
                </div>
            </div>

            {/* Live Gray Print-Preview Canvas */}
            <div className="p-6 overflow-auto min-h-[540px] max-h-[76vh] bg-slate-400/50 dark:bg-slate-950">
                <div
                    ref={previewContainerRef}
                    style={{ transform: zoomPct !== 100 ? `scale(${zoomPct / 100})` : undefined, transformOrigin: 'top center' }}
                    className="space-y-6 transition-transform"
                >
                    {isIndividual ? (
                        visibleIndividualPages.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 text-center text-slate-500 max-w-xl mx-auto shadow">
                                No pages match the current filter. Configure classes/teachers/rooms or generate a timetable first.
                            </div>
                        ) : (
                            visibleIndividualPages.map(page => renderIndividualSheet(page))
                        )
                    ) : (
                        renderSummaryOrPosterSheet()
                    )}
                </div>
            </div>
        </div>
    );
};
