
import React, { useState, useMemo } from 'react';
import type { Building, Room, TimetableEntry, TimetableSettings, LetterheadConfig } from '../types';
import { timeToMinutes } from '../utils/timeUtils';
import { PrinterIcon, DocumentArrowDownIcon, EyeIcon } from './icons';
import { generateRoomUtilizationPdf } from '../services/pdfService';

interface RoomUtilizationReportProps {
    buildings: Building[];
    rooms: Room[];
    generatedTimetable: TimetableEntry[];
    timetableSettings: TimetableSettings;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    onPreviewPdf?: (url: string, filename: string) => void;
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

export const RoomUtilizationReport: React.FC<RoomUtilizationReportProps> = ({
    buildings,
    rooms,
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
            const roomTimetable = generatedTimetable.filter(entry => entry.roomId === room.id);

            const totalOccupiedMinutes = roomTimetable.reduce((acc, entry) => {
                const start = timeToMinutes(entry.startTime);
                const end = timeToMinutes(entry.endTime);
                return acc + (end - start);
            }, 0);

            const totalOccupiedHours = totalOccupiedMinutes / 60;
            const utilizationPercentage = (totalOccupiedHours / totalAvailableWeeklyHours) * 100;

            return {
                room,
                totalOccupiedHours,
                utilizationPercentage,
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

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg printable-area">
                <h3 className="text-xl font-semibold p-4 hidden print:block print:text-black border-b print:border-slate-300">Room Utilization Report</h3>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {utilizationData.length > 0 ? (
                        utilizationData.map(({ room, totalOccupiedHours, utilizationPercentage }) => (
                            <li key={room.id} className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center page-break-inside-avoid">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{room.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Capacity: {room.capacity}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-grow">
                                            <UtilizationBar percentage={utilizationPercentage} />
                                        </div>
                                        <div className="w-28 text-right flex-shrink-0">
                                            <p className="font-semibold text-lg">{utilizationPercentage.toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{totalOccupiedHours.toFixed(1)} hrs/week</p>
                                        </div>
                                    </div>
                                </div>
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
