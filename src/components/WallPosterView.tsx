
import React, { useState, useMemo } from 'react';
import type { User, Subject, Room, Course, TimetableEntry, TimetableSettings, Department, Institution, AcademicYear, Semester } from '../types';
import { generatePastelColor } from '../utils/colorUtils';
import { timeToMinutes, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { PrinterIcon } from './icons/index';

interface WallPosterViewProps {
    generatedTimetable: TimetableEntry[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    courses: Course[];
    departments: Department[];
    timetableSettings: TimetableSettings;
    institution?: Institution | null;
    academicYear?: AcademicYear | null;
    semester?: Semester | null;
}

type ViewMode = 'class' | 'teacher' | 'room';

export const WallPosterView: React.FC<WallPosterViewProps> = ({
    generatedTimetable = [],
    subjects = [],
    lecturers = [],
    rooms = [],
    courses = [],
    departments = [],
    timetableSettings,
    institution,
    academicYear,
    semester
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('class');
    const [filterDepartment, setFilterDepartment] = useState('all');

    const getSubject = (id: string) => subjects.find(s => s && s.id === id);
    const getLecturer = (id: string) => lecturers.find(u => u && u.id === id);
    const getRoom = (id: string) => rooms.find(r => r && r.id === id);

    const days = timetableSettings?.operatingDays || [];
    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings), [timetableSettings]);
    const displaySlots = useMemo(() => generateDisplaySlots(timetableSettings), [timetableSettings]);
    const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;

    const itemsToRender = useMemo(() => {
        let items: { id: string; title: string; subTitle?: string; data: TimetableEntry[] }[] = [];
        
        const safeCourses = Array.isArray(courses) ? courses : [];
        const safeLecturers = Array.isArray(lecturers) ? lecturers : [];
        const safeRooms = Array.isArray(rooms) ? rooms : [];
        const safeTimetable = Array.isArray(generatedTimetable) ? generatedTimetable : [];

        if (viewMode === 'class') {
            safeCourses.forEach(course => {
                if (!course) return;
                if (filterDepartment !== 'all' && course.departmentId !== filterDepartment) return;
                
                (course.levels || []).forEach(level => {
                    if (!level) return;
                    const levelSubjectIds = new Set(level.subjectIds || []);
                    const entries = safeTimetable.filter(t => t && levelSubjectIds.has(t.subjectId));
                    
                    if (entries.length > 0) {
                        items.push({
                            id: `${course.id}-${level.id}`,
                            title: `${course.name}`,
                            subTitle: level.name,
                            data: entries
                        });
                    }
                });
            });
        } else if (viewMode === 'teacher') {
            safeLecturers.forEach(lecturer => {
                if (!lecturer) return;
                if (filterDepartment !== 'all' && lecturer.departmentId !== filterDepartment) return;
                if (lecturer.role === 'admin') return; 

                const entries = safeTimetable.filter(t => t && t.lecturerId === lecturer.id);
                if (entries.length > 0) {
                    items.push({
                        id: lecturer.id,
                        title: lecturer.name,
                        subTitle: lecturer.staffId,
                        data: entries
                    });
                }
            });
        } else if (viewMode === 'room') {
            safeRooms.forEach(room => {
                if (!room) return;
                const entries = safeTimetable.filter(t => t && t.roomId === room.id);
                if (entries.length > 0) {
                    const totalSlots = days.length * displaySlots.length;
                    const occupied = entries.length; 
                    const util = totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0;

                    items.push({
                        id: room.id,
                        title: room.name,
                        subTitle: `Capacity: ${room.capacity} (${util}% Used)`,
                        data: entries
                    });
                }
            });
        }

        return items.sort((a, b) => a.title.localeCompare(b.title));
    }, [viewMode, filterDepartment, courses, lecturers, rooms, generatedTimetable, displaySlots.length, days.length]);

    const handlePrint = () => {
        window.print();
    };

    const MiniTimetable = ({ item }: { item: typeof itemsToRender[0] }) => {
        return (
            <div className="poster-grid-item border border-slate-400 bg-white mb-4 text-[10px] w-full">
                <div className="bg-slate-800 text-white p-1 text-center print-color-force">
                    <h3 className="font-bold text-sm leading-tight">{item.title}</h3>
                    {item.subTitle && <p className="text-[9px] text-slate-300">{item.subTitle}</p>}
                </div>
                <table className="w-full border-collapse table-fixed">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 print-bg-force">
                            <th className="w-6 border-r border-slate-300 p-0.5"></th>
                            {periodHeaders.map((p, i) => (
                                <th key={i} colSpan={p.colSpan} className="border-r border-slate-300 p-0.5 font-semibold text-slate-700 truncate">
                                    {p.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => {
                            const rowCells: React.ReactNode[] = [];
                            const rowOccupiedSlots = new Set<number>();

                            for (let i = 0; i < displaySlots.length; i++) {
                                const slot = displaySlots[i];
                                const slotStartMinutes = timeToMinutes(slot.start);

                                if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                                const breakHere = (timetableSettings.breaks || []).find(b => 
                                    b && b.status !== 'inactive' && 
                                    timeToMinutes(b.startTime) <= slotStartMinutes && 
                                    timeToMinutes(b.endTime) > slotStartMinutes
                                );

                                if (breakHere && !rowOccupiedSlots.has(slotStartMinutes)) {
                                     const breakStartMinutes = timeToMinutes(breakHere.startTime);
                                     const breakDuration = timeToMinutes(breakHere.endTime) - breakStartMinutes;
                                     const colSpan = Math.max(1, Math.round(breakDuration / cellSpanMinutes));
                                     
                                     rowCells.push(
                                         <td key={`break-${day}-${i}`} colSpan={colSpan} className="border-r border-slate-300 bg-slate-200 p-0 align-middle text-center print-bg-force">
                                             <span className="block -rotate-90 text-[7px] text-slate-500 font-bold tracking-widest uppercase">{breakHere.name.substring(0,3)}</span>
                                         </td>
                                     );
                                     for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(breakStartMinutes + (k * cellSpanMinutes));
                                     i += colSpan - 1;
                                     continue;
                                }

                                const entry = item.data.find(e => 
                                    e && e.day === day && timeToMinutes(e.startTime) === slotStartMinutes
                                );

                                if (entry) {
                                    const subject = getSubject(entry.subjectId);
                                    const duration = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
                                    const colSpan = Math.max(1, Math.round(duration / cellSpanMinutes));
                                    const bgColor = subject ? generatePastelColor(subject.id) : '#fff';
                                    
                                    let contentMain = subject?.shortName || subject?.code || 'N/A';
                                    let contentSub = '';

                                    if (viewMode === 'class') {
                                        contentSub = getLecturer(entry.lecturerId)?.name.split(' ').pop() || '';
                                    } else if (viewMode === 'teacher') {
                                        contentSub = getRoom(entry.roomId)?.name || '';
                                    } else if (viewMode === 'room') {
                                        contentSub = getLecturer(entry.lecturerId)?.name.split(' ').pop() || '';
                                    }

                                    rowCells.push(
                                        <td key={entry.id} colSpan={colSpan} className="border-r border-slate-300 p-0 align-middle text-center print-color-force-cell" style={{ backgroundColor: bgColor }}>
                                            <div className="flex flex-col justify-center h-full p-0.5 overflow-hidden leading-none">
                                                <span className="font-bold text-slate-900 text-[10px]">{contentMain}</span>
                                                <span className="text-[8px] text-slate-700">{contentSub}</span>
                                            </div>
                                        </td>
                                    );
                                    for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                    i += colSpan - 1;
                                } else {
                                     rowCells.push(<td key={`empty-${day}-${i}`} className="border-r border-slate-300 bg-white"></td>);
                                }
                            }
                            return (
                                <tr key={day} className="h-8 border-b border-slate-300">
                                    <td className="border-r border-slate-300 bg-slate-50 font-bold text-slate-600 p-0 text-center text-[8px] uppercase align-middle transform -rotate-90 sm:rotate-0 print-bg-force">
                                        {day.substring(0, 1)}
                                    </td>
                                    {rowCells}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!Array.isArray(generatedTimetable) || generatedTimetable.length === 0) {
        return <div className="p-8 text-center text-slate-500">No timetable data available.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm no-print flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex rounded-md shadow-sm mt-1">
                        <button onClick={() => setViewMode('class')} className={`px-3 py-2 text-sm font-medium border rounded-l-md ${viewMode === 'class' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-slate-700'}`}>By Class</button>
                        <button onClick={() => setViewMode('teacher')} className={`px-3 py-2 text-sm font-medium border-t border-b ${viewMode === 'teacher' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-slate-700'}`}>By Teacher</button>
                        <button onClick={() => setViewMode('room')} className={`px-3 py-2 text-sm font-medium border rounded-r-md ${viewMode === 'room' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-slate-700'}`}>By Room</button>
                    </div>
                </div>
                <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-800 hover:bg-slate-900 focus:outline-none">
                    <PrinterIcon className="w-5 h-5 mr-2" /> Print Posters
                </button>
            </div>
            <div id="wall-poster-container" className="print-container">
                <div className="text-center mb-6 hidden print:block">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase">{institution?.name || 'Timetable'}</h1>
                    <p className="text-sm text-slate-600">{academicYear?.name} {semester?.name}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 print:block">
                    {itemsToRender.map((item) => (
                        <div key={item.id} className="poster-grid-item print:inline-block print:w-[32%] print:align-top print:mr-[1%] print:mb-4" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                            <MiniTimetable item={item} />
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    body * { visibility: hidden; }
                    #wall-poster-container, #wall-poster-container * { visibility: visible; }
                    #wall-poster-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                    .poster-grid-item { break-inside: avoid; page-break-inside: avoid; }
                    .print-color-force { background-color: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-bg-force { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-color-force-cell { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
};
