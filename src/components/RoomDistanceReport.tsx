
import React, { useMemo, useState } from 'react';
import type { Room, Building, LetterheadConfig } from '../types';
import { calculateDistance } from '../utils/locationUtils';
import { MapIcon, MapPinIcon, ClockIcon, EyeIcon, PrinterIcon } from './icons';
import { generateRoomDistanceReportPdf, generateRoomProximityReportPdf } from '../services/pdfService';

interface RoomDistanceReportProps {
    rooms: Room[];
    buildings: Building[];
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
    onPreviewPdf?: (url: string, filename: string) => void;
}

// Standard walking speed: ~1.4 m/s or ~84 m/min
const WALKING_SPEED_METERS_PER_MIN = 84;

const formatDistance = (meters: number) => {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
};

const formatTime = (meters: number) => {
    const minutes = Math.ceil(meters / WALKING_SPEED_METERS_PER_MIN);
    return `${minutes} min walk`;
};

export const RoomDistanceReport: React.FC<RoomDistanceReportProps> = ({
    rooms,
    buildings,
    letterheadConfig,
    footerImageUrl,
    onPreviewPdf
}) => {
    const [baseRoomId, setBaseRoomId] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingProximity, setIsGeneratingProximity] = useState(false);

    // 1. Identify Buildings and calculate their Centroids if they don't have explicit location
    const buildingLocations = useMemo(() => {
        return buildings.map(b => {
            if (b.location) return { id: b.id, name: b.name, ...b.location, isEstimated: false };

            const roomsInBuilding = rooms.filter(r => r.buildingId === b.id && r.location);
            if (roomsInBuilding.length === 0) return null;

            const avgLat = roomsInBuilding.reduce((sum, r) => sum + r.location!.latitude, 0) / roomsInBuilding.length;
            const avgLon = roomsInBuilding.reduce((sum, r) => sum + r.location!.longitude, 0) / roomsInBuilding.length;

            return { id: b.id, name: b.name, latitude: avgLat, longitude: avgLon, isEstimated: true };
        }).filter(Boolean) as { id: string, name: string, latitude: number, longitude: number, isEstimated: boolean }[];
    }, [buildings, rooms]);

    // 2. Calculate Building-to-Building Matrix
    const buildingMatrix = useMemo(() => {
        return buildingLocations.map(source => {
            const distances = buildingLocations.map(target => {
                if (source.id === target.id) return 0;
                return calculateDistance(source.latitude, source.longitude, target.latitude, target.longitude);
            });
            return { source, distances };
        });
    }, [buildingLocations]);

    // 3. Rooms with location data
    const geocodedRooms = useMemo(() => rooms.filter(r => r.location), [rooms]);

    // 4. Nearest Neighbors for selected room
    const roomNeighbors = useMemo(() => {
        if (!baseRoomId) return [];
        const sourceRoom = rooms.find(r => r.id === baseRoomId);
        if (!sourceRoom || !sourceRoom.location) return [];

        return geocodedRooms
            .filter(r => r.id !== baseRoomId)
            .map(target => ({
                ...target,
                distance: calculateDistance(
                    sourceRoom.location!.latitude,
                    sourceRoom.location!.longitude,
                    target.location!.latitude,
                    target.location!.longitude
                )
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10); // Top 10 closest
    }, [baseRoomId, rooms, geocodedRooms]);

    // 5. General Stats
    const stats = useMemo(() => {
        if (geocodedRooms.length < 2) return null;
        let maxDist = 0;
        let totalDist = 0;
        let count = 0;

        // Simplified average calculation (sample based)
        for (let i = 0; i < geocodedRooms.length; i++) {
            for (let j = i + 1; j < geocodedRooms.length; j++) {
                const d = calculateDistance(
                    geocodedRooms[i].location!.latitude,
                    geocodedRooms[i].location!.longitude,
                    geocodedRooms[j].location!.latitude,
                    geocodedRooms[j].location!.longitude
                );
                if (d > maxDist) maxDist = d;
                totalDist += d;
                count++;
            }
        }
        return {
            maxDistance: maxDist,
            avgDistance: count > 0 ? totalDist / count : 0,
            geocodedCount: geocodedRooms.length,
            maxDistanceText: formatDistance(maxDist),
            avgDistanceText: formatTime(count > 0 ? totalDist / count : 0)
        };
    }, [geocodedRooms]);

    const handlePreviewPdf = async () => {
        setIsGenerating(true);
        try {
            const pdfUrl = await generateRoomDistanceReportPdf(
                stats,
                buildingLocations,
                buildingMatrix,
                "Campus Travel Distance Analysis",
                letterheadConfig,
                footerImageUrl || null
            );
            onPreviewPdf?.(pdfUrl, `Distance_Analysis_Report.pdf`);
        } catch (err) {
            console.error(err);
            alert("Failed to generate PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePreviewProximityPdf = async () => {
        const sourceRoom = rooms.find(r => r.id === baseRoomId);
        if (!sourceRoom || roomNeighbors.length === 0) return;

        setIsGeneratingProximity(true);
        try {
            const formattedNeighbors = roomNeighbors.map(n => ({
                name: n.name,
                buildingName: buildings.find(b => b.id === n.buildingId)?.name || 'Unknown',
                distanceText: formatDistance(n.distance),
                timeText: formatTime(n.distance)
            }));

            const pdfUrl = await generateRoomProximityReportPdf(
                sourceRoom.name,
                formattedNeighbors,
                "Room Proximity Analysis",
                letterheadConfig,
                footerImageUrl || null
            );
            onPreviewPdf?.(pdfUrl, `Proximity_Analysis_${sourceRoom.name}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Failed to generate PDF");
        } finally {
            setIsGeneratingProximity(false);
        }
    };

    if (geocodedRooms.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <MapPinIcon className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">No Location Data</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add GPS coordinates (latitude/longitude) to your rooms or buildings in the Settings tab to generate distance reports.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Campus Logistics Analysis</h3>
                    <p className="text-sm text-slate-500">Geospatial distance mapping between academic facilities.</p>
                </div>

                <div className="flex flex-wrap gap-2 no-print">
                    <button
                        onClick={() => window.print()}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm"
                        title="Print View"
                    >
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handlePreviewPdf}
                        disabled={isGenerating || !stats}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isGenerating ? "Preparing..." : <><EyeIcon className="w-4 h-4" /> PDF Preview</>}
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                            <MapIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mapped Rooms</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.geocodedCount} / {rooms.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                            <ClockIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Campus Walk</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats ? stats.avgDistanceText : 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                            <MapPinIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Max Campus Span</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats ? stats.maxDistanceText : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Building Matrix */}
            {buildingLocations.length > 1 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm overflow-x-auto">
                    <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Inter-Building Distance Matrix</h3>
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 bg-slate-50 dark:bg-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider sticky left-0 z-10">From \ To</th>
                                {buildingLocations.map(b => (
                                    <th key={b.id} className="px-4 py-2 bg-slate-50 dark:bg-slate-700 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                                        {b.name} {b.isEstimated && '*'}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {buildingMatrix.map((row, i) => (
                                <tr key={row.source.id}>
                                    <td className="px-4 py-2 bg-slate-50 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-600">
                                        {row.source.name}
                                    </td>
                                    {row.distances.map((dist, j) => {
                                        const isDiagonal = i === j;
                                        return (
                                            <td key={`${row.source.id}-${j}`} className={`px-4 py-2 text-center text-xs ${isDiagonal ? 'bg-slate-100 dark:bg-slate-900' : ''}`}>
                                                {isDiagonal ? '-' : (
                                                    <div>
                                                        <span className="font-medium block">{formatDistance(dist)}</span>
                                                        <span className="text-slate-500 text-[10px]">{formatTime(dist)}</span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-xs text-slate-500 mt-2">* Indicates location estimated from room coordinates.</p>
                </div>
            )}

            {/* Room Analysis */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Room Proximity Analysis</h3>

                <div className="mb-6 flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Reference Room</label>
                        <select
                            value={baseRoomId}
                            onChange={e => setBaseRoomId(e.target.value)}
                            className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm dark:bg-slate-700 dark:text-white p-2"
                        >
                            <option value="">-- Select a room to view neighbors --</option>
                            {geocodedRooms.sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                                <option key={r.id} value={r.id}>{r.name} (Capacity: {r.capacity})</option>
                            ))}
                        </select>
                    </div>
                    {baseRoomId && (
                        <button
                            onClick={handlePreviewProximityPdf}
                            disabled={isGeneratingProximity || roomNeighbors.length === 0}
                            className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 h-[38px] border-2 border-indigo-100"
                        >
                            {isGeneratingProximity ? "Processing..." : <><EyeIcon className="w-4 h-4" /> Export Proximity PDF</>}
                        </button>
                    )}
                </div>

                {baseRoomId && (
                    <div className="overflow-hidden ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-300 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-white sm:pl-6">Nearest Room</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">Building</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">Distance</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">Est. Walking Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                {roomNeighbors.map((neighbor) => {
                                    const buildingName = buildings.find(b => b.id === neighbor.buildingId)?.name || 'Unknown';
                                    return (
                                        <tr key={neighbor.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 dark:text-white sm:pl-6">
                                                {neighbor.name}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                {buildingName}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                {formatDistance(neighbor.distance)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    {formatTime(neighbor.distance)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
