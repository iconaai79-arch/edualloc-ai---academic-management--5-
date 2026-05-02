
import React, { useState, useMemo } from 'react';
import type { Building, Room, TimetableEntry, TimetableSettings, LetterheadConfig, Course } from '../types';
import { timeToMinutes } from '../utils/timeUtils';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { EyeIcon } from './icons/EyeIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

import { generateRoomUtilizationPdf } from '../services/pdfService';

interface RoomUtilizationReportProps {
    buildings: Building[];
    rooms: Room[];
    courses: Course[];
    generatedTimetable: TimetableEntry[];
    timetableSettings: TimetableSettings;
    letterheadConfig: LetterheadConfig | null;
    logoUrl: string | null;
    footerImageUrl: string | null;
    onPreviewPdf?: (url: string, filename: string) => void;
}

// Fixed type for letterheadConfig
interface RoomUtilizationReportPropsFixed extends Omit<RoomUtilizationReportProps, 'letterheadConfig'> {
     letterheadConfig: LetterheadConfig;
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

export const RoomUtilizationReport: React.FC<RoomUtilizationReportPropsFixed> = ({
    buildings,
    rooms,
    courses,
    generatedTimetable,
    timetableSettings,
    letterheadConfig,
    logoUrl,
    footerImageUrl,
    onPreviewPdf
}) => {
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || 'all');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const utilizationData = useMemo(() => {
        const { operatingDays, startTime, endTime } = timetableSettings;
        if (operatingDays.length === 0 || !startTime || !endTime) {
            return [];
        }

        const operatingHoursPerDay = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
        const totalAvailableWeeklyHours = operatingHoursPerDay * operatingDays.length;

        if (totalAvailableWeeklyHours <= 0) {
            return [];
        }

        const roomsInBuilding = rooms.filter(room => selectedBuildingId === 'all' || room.buildingId === selectedBuildingId);

        return roomsInBuilding.map(room => {
            // Find entries for this room - STRICT filtering to ignore Virtual/Overflow rooms in physical stats
            const roomTimetable = generatedTimetable.filter(entry => 
                entry.roomId === room.id && !entry.roomId.startsWith('VR-')
            );

            // Calculate total duration
            const totalOccupiedMinutes = roomTimetable.reduce((acc, entry) => {
                const start = timeToMinutes(entry.startTime);
                const end = timeToMinutes(entry.endTime);
                return acc + (end - start);
            }, 0);

            // COLLISION DETECTION: Check for overlapping entries in the same room at the same time
            let overlapMinutes = 0;
            const sortedEntries = [...roomTimetable].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
            
            for (let i = 0; i < sortedEntries.length; i++) {
                for (let j = i + 1; j < sortedEntries.length; j++) {
                    const a = sortedEntries[i];
                    const b = sortedEntries[j];
                    if (a.day !== b.day) continue;

                    const aStart = timeToMinutes(a.startTime);
                    const aEnd = timeToMinutes(a.endTime);
                    const bStart = timeToMinutes(b.startTime);
                    const bEnd = timeToMinutes(b.endTime);

                    if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
                        overlapMinutes += (Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
                    }
                }
            }

            const totalOccupiedHours = totalOccupiedMinutes / 60;
            const utilizationPercentage = (totalOccupiedHours / totalAvailableWeeklyHours) * 100;

            const usageBreakdown = roomTimetable.reduce((acc, entry) => {
                const course = courses.find(c => 
                    (c.levels || []).some(l => l.id === entry.courseLevelId)
                );
                const level = (course?.levels || []).find(l => l.id === entry.courseLevelId);
                
                const className = course ? `${course.name} ${level?.name || ''}`.trim() : (level?.name || 'Unknown Class');
                acc[className] = (acc[className] || 0) + (timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)) / 60;
                return acc;
            }, {} as Record<string, number>);

            return {
                room,
                totalOccupiedHours,
                utilizationPercentage,
                usageBreakdown,
                overlapCount: overlapMinutes / 60
            };
        }).sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

    }, [selectedBuildingId, buildings, rooms, generatedTimetable, timetableSettings]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const buildingName = selectedBuildingId === 'all' ? 'All Buildings' : buildings.find(b => b.id === selectedBuildingId)?.name || 'Building';
            const pdfUrl = await generateRoomUtilizationPdf(
                utilizationData,
                `Room Utilization Report - ${buildingName}`,
                letterheadConfig,
                footerImageUrl,
                logoUrl
            );
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Room_Utilization_${buildingName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("PDF Generation Error", error);
            alert("Failed to generate PDF");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePreviewPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const buildingName = selectedBuildingId === 'all' ? 'All Buildings' : buildings.find(b => b.id === selectedBuildingId)?.name || 'Building';
            const pdfUrl = await generateRoomUtilizationPdf(
                utilizationData,
                `Room Utilization Report - ${buildingName}`,
                letterheadConfig,
                footerImageUrl,
                logoUrl
            );
            onPreviewPdf?.(pdfUrl, `Room_Utilization_${buildingName.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("PDF Generation Error", error);
            alert("Failed to generate PDF preview");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center no-print">
                <div className="w-full sm:w-64">
                    <label htmlFor="building-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Filter by Building
                    </label>
                    <select
                        id="building-filter"
                        value={selectedBuildingId}
                        onChange={e => setSelectedBuildingId(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600"
                    >
                        <option value="all">All Buildings</option>
                        {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 self-end">
                    <button onClick={handlePrint} className="btn-secondary inline-flex items-center gap-2">
                        <PrinterIcon className="w-5 h-5" /> Print
                    </button>
                    {onPreviewPdf && (
                        <button onClick={handlePreviewPdf} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
                            <EyeIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Preparing...' : 'Preview'}
                        </button>
                    )}
                    <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                        <DocumentArrowDownIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 no-print">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-tight">Class Registry Audit</h4>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest italic">Synchronized Available Classes in Database</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {courses.flatMap(c => c.levels || []).map(l => {
                        const roomName = rooms.find(r => r.id === l.roomId)?.name || 'N/A';
                        return (
                            <div key={l.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">{l.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Room: {roomName}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg printable-area">
                <h3 className="text-xl font-semibold p-4 hidden print:block print:text-black border-b print:border-slate-300">Room Utilization Report</h3>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {utilizationData.length > 0 ? (
                        utilizationData.map(({ room, totalOccupiedHours, utilizationPercentage, usageBreakdown, overlapCount }) => (
                            <li key={room.id} className="p-4 sm:p-6 space-y-4 page-break-inside-avoid">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div>
                                        <p className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-lg">{room.name}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Capacity: {room.capacity}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-grow">
                                                <UtilizationBar percentage={utilizationPercentage} />
                                                {overlapCount > 0 && (
                                                    <p className="text-[9px] font-black text-rose-600 uppercase mt-2 animate-pulse flex items-center gap-1">
                                                        <ExclamationTriangleIcon className="w-3 h-3" /> Critical: {overlapCount.toFixed(1)} hrs of temporal collisions detected (Double Booking)
                                                    </p>
                                                )}
                                            </div>
                                            <div className="w-28 text-right flex-shrink-0">
                                                <p className={`font-black text-xl ${utilizationPercentage > 100 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                                    {utilizationPercentage.toFixed(1)}%
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{totalOccupiedHours.toFixed(1)} Active Hrs/Week</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {Object.keys(usageBreakdown).length > 0 && (
                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Occupancy Attribution Breakdown</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(usageBreakdown).map(([cls, hrs]) => (
                                                <div key={cls} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{cls}</span>
                                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 rounded">{hrs.toFixed(1)}h</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))
                    ) : (
                        <li className="p-10 text-center text-slate-500">
                            No utilization data to display for the selected building. Ensure the timetable is generated and rooms are assigned.
                        </li>
                    )}
                </ul>
            </div>
            <style>{`
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                @media print {
                    .no-print { display: none !important; }
                    .page-break-inside-avoid { page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
};

