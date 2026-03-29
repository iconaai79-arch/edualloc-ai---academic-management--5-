
import React, { useMemo, useState } from 'react';
import type { Building, Room, TimetableEntry, Subject, User, Course, TimetableSettings } from '../types';
import { timeToMinutes, generatePeriodLabels } from '../utils/timeUtils';
import { generatePastelColor } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';


interface MasterBuildingTimetableProps {
    buildings: Building[];
    rooms: Room[];
    generatedTimetable: TimetableEntry[];
    timetableSettings: TimetableSettings;
    subjects: Subject[];
    lecturers: User[];
    courses: Course[];
}

const UtilizationBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    let colorClass = 'bg-green-500';
    if (percentage > 90) {
        colorClass = 'bg-red-500';
    } else if (percentage > 70) {
        colorClass = 'bg-yellow-500';
    }

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 print:hidden">
            <div
                className={`h-4 rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};

export const MasterBuildingTimetable: React.FC<MasterBuildingTimetableProps> = ({
    buildings = [],
    rooms = [],
    generatedTimetable = [],
    timetableSettings,
    subjects = [],
    lecturers = [],
    courses = [],
}) => {
    const safeBuildings = Array.isArray(buildings) ? buildings.filter(Boolean) : [];
    const safeRooms = Array.isArray(rooms) ? rooms.filter(Boolean) : [];

    const [buildingFilter, setBuildingFilter] = useState('all');
    const [roomFilter, setRoomFilter] = useState('all');
    const [expandedBuildingIds, setExpandedBuildingIds] = useState<Set<string>>(() => new Set(safeBuildings.map(b => b.id)));

    const daysOfWeek = timetableSettings?.operatingDays || [];
    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings, true), [timetableSettings]);
    const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;

    const filteredBuildings = useMemo(() => {
        if (buildingFilter === 'all') {
            return safeBuildings;
        }
        return safeBuildings.filter(b => b.id === buildingFilter);
    }, [safeBuildings, buildingFilter]);

    const filteredRoomsForDropdown = useMemo(() => {
        if (buildingFilter === 'all') return safeRooms;
        return safeRooms.filter(r => r.buildingId === buildingFilter);
    }, [safeRooms, buildingFilter]);

    const roomsToDisplay = useMemo(() => {
        let rooms = safeRooms;
        if (buildingFilter !== 'all') {
            rooms = rooms.filter(r => r.buildingId === buildingFilter);
        }
        if (roomFilter !== 'all') {
            rooms = rooms.filter(r => r.id === roomFilter);
        }
        return rooms;
    }, [safeRooms, buildingFilter, roomFilter]);

    const getCellEntries = (roomId: string, day: string, period: { startTime: string; endTime: string; }) => {
        const periodStartMinutes = timeToMinutes(period.startTime);
        return (Array.isArray(generatedTimetable) ? generatedTimetable : []).filter(e =>
            e && e.roomId === roomId &&
            e.day === day &&
            timeToMinutes(e.startTime) === periodStartMinutes
        );
    };

    const toggleBuildingExpansion = (buildingId: string) => {
        setExpandedBuildingIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(buildingId)) {
                newSet.delete(buildingId);
            } else {
                newSet.add(buildingId);
            }
            return newSet;
        });
    };

    const utilizationData = useMemo(() => {
        if (!timetableSettings) return [];
        const { operatingDays = [], startTime, endTime } = timetableSettings;
        if (operatingDays.length === 0 || !startTime || !endTime) return [];
        const operatingHoursPerDay = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
        const totalAvailableWeeklyHours = operatingHoursPerDay * operatingDays.length;
        if (totalAvailableWeeklyHours <= 0) return [];

        return roomsToDisplay.map(room => {
            const totalOccupiedMinutes = (Array.isArray(generatedTimetable) ? generatedTimetable : [])
                .filter(entry => entry && entry.roomId === room.id)
                .reduce((acc, entry) => acc + (timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)), 0);

            const totalOccupiedHours = totalOccupiedMinutes / 60;
            const utilizationPercentage = (totalOccupiedHours / totalAvailableWeeklyHours) * 100;

            return { room, totalOccupiedHours, utilizationPercentage };
        }).sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
    }, [roomsToDisplay, generatedTimetable, timetableSettings]);

    return (
        <div className="space-y-8">
            <div className="flex justify-end mb-4 no-print gap-4">
                <div className="w-full sm:w-64">
                    <label htmlFor="building-filter-master" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Filter by Building
                    </label>
                    <select
                        id="building-filter-master"
                        value={buildingFilter}
                        onChange={e => {
                            setBuildingFilter(e.target.value);
                            setRoomFilter('all'); // Reset room filter when building changes
                        }}
                        className="mt-1 form-select w-full"
                    >
                        <option value="all">All Buildings</option>
                        {safeBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-64">
                    <label htmlFor="room-filter-master" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Filter by Facility
                    </label>
                    <select
                        id="room-filter-master"
                        value={roomFilter}
                        onChange={e => setRoomFilter(e.target.value)}
                        className="mt-1 form-select w-full"
                    >
                        <option value="all">All Facilities</option>
                        {filteredRoomsForDropdown.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden print:overflow-visible print:shadow-none print:border-none print:break-inside-avoid">
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="min-w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 print:bg-gray-100">
                                <th className="p-2 border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-700/50 z-10 min-w-[150px] print:static print:bg-transparent print:text-black" rowSpan={2}>Building / Room</th>
                                {daysOfWeek.map(day => (
                                    <th key={day} colSpan={periodHeaders.length} className="p-2 border border-slate-200 dark:border-slate-600 font-bold text-slate-900 dark:text-white print:text-black">{day}</th>
                                ))}
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 print:bg-gray-50">
                                {daysOfWeek.map(day => periodHeaders.map(period => (
                                    <th key={`${day}-${period.label}`} className="p-1 border border-slate-200 dark:border-slate-600 font-normal text-[10px] whitespace-normal text-slate-700 dark:text-slate-300 print:text-black">
                                        <span className="font-semibold">{period.label}</span><br />{period.startTime}-{period.endTime}
                                    </th>
                                )))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBuildings.flatMap(building => {
                                const isExpanded = expandedBuildingIds.has(building.id);
                                const buildingRooms = roomsToDisplay.filter(r => r.buildingId === building.id);
                                if (buildingRooms.length === 0) return null;

                                const rows = [
                                    <tr key={`bldg-${building.id}`} className="bg-slate-100 dark:bg-slate-700/50 cursor-pointer no-print" onClick={() => toggleBuildingExpansion(building.id)}>
                                        <td colSpan={1 + (daysOfWeek.length * periodHeaders.length)} className="p-2 border border-slate-200 dark:border-slate-600 font-bold text-left sticky left-0 bg-slate-100 dark:bg-slate-700/50 z-10">
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                {building.name} ({buildingRooms.length} rooms)
                                            </div>
                                        </td>
                                    </tr>,
                                    <tr key={`bldg-print-${building.id}`} className="hidden print:table-row bg-gray-100">
                                        <td colSpan={1 + (daysOfWeek.length * periodHeaders.length)} className="p-2 border border-slate-300 font-bold text-left text-black">
                                            {building.name}
                                        </td>
                                    </tr>
                                ];

                                if (isExpanded || (typeof window !== 'undefined' && window.matchMedia('print').matches)) {
                                    buildingRooms.forEach(room => {
                                        const occupiedSlots = new Set<string>();
                                        rows.push(
                                            <tr key={room.id} className="border-t border-slate-200 dark:border-slate-600 print:border-slate-300">
                                                <td className="p-2 border border-slate-200 dark:border-slate-600 font-medium sticky left-0 bg-white dark:bg-slate-800 z-10 print:static print:bg-transparent print:text-black pl-6">
                                                    {room.name} <span className="text-[10px] text-slate-500 dark:text-slate-400 print:text-black">(Cap: {room.capacity})</span>
                                                </td>
                                                {daysOfWeek.flatMap(day => periodHeaders.map((period, periodIndex) => {
                                                    const slotKey = `${day}-${periodIndex}`;
                                                    if (occupiedSlots.has(slotKey)) return null;

                                                    if (period.isBreak) {
                                                        return (
                                                            <td key={slotKey} className="p-1 border border-slate-200 dark:border-slate-600 text-center align-middle bg-slate-50/50 dark:bg-slate-900/30 print:bg-gray-50">
                                                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest leading-none block mx-auto" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>BREAK</span>
                                                            </td>
                                                        );
                                                    }

                                                    const entries = getCellEntries(room.id, day, period);
                                                    if (entries.length > 0) {
                                                        const primaryEntry = entries[0];
                                                        const duration = timeToMinutes(primaryEntry.endTime) - timeToMinutes(primaryEntry.startTime);
                                                        const colSpan = Math.max(1, Math.round(duration / cellSpanMinutes));

                                                        for (let k = 0; k < colSpan; k++) {
                                                            occupiedSlots.add(`${day}-${periodIndex + k}`);
                                                        }

                                                        return (
                                                            <td key={slotKey} colSpan={colSpan} className="p-1 border border-slate-200 dark:border-slate-600 text-center align-middle print:border-slate-400">
                                                                <div className="flex h-full gap-1">
                                                                    {entries.map(entry => {
                                                                        const subject = (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === entry.subjectId);
                                                                        const lecturer = (Array.isArray(lecturers) ? lecturers : []).find(l => l && l.id === entry.lecturerId);
                                                                        const course = (Array.isArray(courses) ? courses : []).find(c => c && (c.levels || []).some(lvl => (lvl.subjectIds || []).includes(entry.subjectId)));

                                                                        return (
                                                                            <div key={entry.id} className="flex-1 rounded-lg p-1 text-center text-slate-900 print:text-black shadow-sm" style={{ backgroundColor: generatePastelColor(entry.subjectId) }}>
                                                                                <strong className="block text-[9px]">{subject?.shortName || subject?.code}</strong>
                                                                                <span className="block text-[8px]">{getInitials(lecturer?.name || '')}</span>
                                                                                <span className="block text-[8px] opacity-75">{course?.code}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    return <td key={slotKey} className="border border-slate-200 dark:border-slate-600 print:border-slate-300"></td>
                                                }))}
                                            </tr>
                                        );
                                    });
                                }
                                return rows;
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm print:break-inside-avoid print:shadow-none print:border print:border-slate-300">
                <h3 className="text-xl font-semibold mb-4 print:text-black">Room Utilization Summary</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-700 print:bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase print:text-black">Room</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase print:text-black">Capacity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase print:text-black">Occupied Hours/Week</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase print:text-black">Utilization %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300">
                            {utilizationData.map((data, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white print:text-black">{data.room.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 print:text-black">{data.room.capacity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 print:text-black">{data.totalOccupiedHours.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 print:text-black">
                                        <div className="flex items-center gap-2">
                                            <span className="w-12 text-right">{data.utilizationPercentage.toFixed(1)}%</span>
                                            <div className="w-24 hidden sm:block print:hidden">
                                                <UtilizationBar percentage={data.utilizationPercentage} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
