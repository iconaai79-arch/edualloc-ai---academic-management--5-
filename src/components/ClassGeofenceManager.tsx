import React, { useState, useEffect, useMemo } from 'react';
import type { User, Course, Institution, ClassGeofence } from '../types';
import { 
    MapPin, Navigation, Crosshair, ShieldCheck, AlertCircle, ExternalLink, 
    RefreshCw, Trash2, Edit3, Check, X, Sliders, Globe, Layers, CheckCircle2,
    Search, Info, Sparkles, Building
} from 'lucide-react';
import { 
    loadClassGeofences, 
    saveClassGeofence, 
    deleteClassGeofence, 
    getCurrentDeviceLocation, 
    calculateHaversineDistance 
} from '../utils/geofenceUtils';

interface ClassGeofenceManagerProps {
    institution: Institution;
    courses: Course[];
    currentUser?: User;
    onLogAction?: (action: string) => void;
    onGeofencesUpdated?: (geofences: ClassGeofence[]) => void;
}

interface CalibrationModalState {
    courseId: string;
    className: string;
    stream: string;
    latitude: number | '';
    longitude: number | '';
    radiusMeters: number;
    locationName: string;
    notes: string;
    isDetecting: boolean;
    detectedAccuracy: number | null;
    error: string | null;
}

export const ClassGeofenceManager: React.FC<ClassGeofenceManagerProps> = ({
    institution,
    courses,
    currentUser,
    onLogAction,
    onGeofencesUpdated
}) => {
    const instId = institution?.id || 'default';

    // State for all class geofences
    const [geofences, setGeofences] = useState<ClassGeofence[]>(() => loadClassGeofences(instId));
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStreamFilter, setSelectedStreamFilter] = useState('all');

    // Live Device GPS Tester
    const [gpsTester, setGpsTester] = useState<{
        isLoading: boolean;
        coords: { latitude: number; longitude: number; accuracy: number } | null;
        error: string | null;
    }>({ isLoading: false, coords: null, error: null });

    // Calibration Dialog State
    const [calibrationModal, setCalibrationModal] = useState<CalibrationModalState | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    // Sync state changes upward if needed
    const updateGeofences = (updated: ClassGeofence[]) => {
        setGeofences(updated);
        onGeofencesUpdated?.(updated);
    };

    // Flatten all classes & their streams
    const classRoomEntries = useMemo(() => {
        const entries: Array<{
            key: string;
            courseId: string;
            className: string;
            stream: string;
            geofence: ClassGeofence | null;
        }> = [];

        (courses || []).forEach(course => {
            const courseStreams: string[] = (course as any).streams && Array.isArray((course as any).streams) && (course as any).streams.length > 0
                ? (course as any).streams
                : [''];

            courseStreams.forEach(stream => {
                const sClean = (stream || '').trim();
                const matchedGeofence = geofences.find(g => 
                    g.courseId === course.id && 
                    ((g.stream || '').trim().toLowerCase() === sClean.toLowerCase() || (!g.stream && !sClean))
                ) || null;

                entries.push({
                    key: `${course.id}_${sClean || 'all'}`,
                    courseId: course.id,
                    className: course.name,
                    stream: sClean,
                    geofence: matchedGeofence
                });
            });
        });

        return entries;
    }, [courses, geofences]);

    // Filtered entries
    const filteredEntries = useMemo(() => {
        return classRoomEntries.filter(entry => {
            const matchesSearch = 
                entry.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (entry.stream && entry.stream.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (entry.geofence?.locationName && entry.geofence.locationName.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStream = selectedStreamFilter === 'all' || 
                (entry.stream && entry.stream.toLowerCase() === selectedStreamFilter.toLowerCase());

            return matchesSearch && matchesStream;
        });
    }, [classRoomEntries, searchQuery, selectedStreamFilter]);

    // Statistics
    const stats = useMemo(() => {
        const total = classRoomEntries.length;
        const configured = classRoomEntries.filter(e => e.geofence && e.geofence.latitude && e.geofence.longitude).length;
        const unconfigured = total - configured;
        const avgRadius = configured > 0
            ? Math.round(classRoomEntries.reduce((sum, e) => sum + (e.geofence?.radiusMeters || 40), 0) / configured)
            : 40;
        return { total, configured, unconfigured, avgRadius };
    }, [classRoomEntries]);

    // Handler to run live GPS tester
    const handleRunGpsTest = async () => {
        setGpsTester({ isLoading: true, coords: null, error: null });
        try {
            const loc = await getCurrentDeviceLocation({ enableHighAccuracy: true, timeout: 8000 });
            setGpsTester({ isLoading: false, coords: loc, error: null });
        } catch (err: any) {
            setGpsTester({ isLoading: false, coords: null, error: err?.message || 'Unable to access GPS.' });
        }
    };

    // Quick One-Tap Calibration ("Calibrate Here with Device GPS")
    const handleQuickCalibrateHere = async (entry: typeof classRoomEntries[0]) => {
        try {
            setActionMessage(`Reading live GPS for ${entry.className}${entry.stream ? ` (${entry.stream})` : ''}...`);
            const loc = await getCurrentDeviceLocation({ enableHighAccuracy: true, timeout: 8000 });
            
            const existingGeofence = entry.geofence;
            const updatedItem: ClassGeofence = {
                id: existingGeofence?.id || `geofence_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId: instId,
                courseId: entry.courseId,
                className: entry.className,
                stream: entry.stream || undefined,
                latitude: loc.latitude,
                longitude: loc.longitude,
                radiusMeters: existingGeofence?.radiusMeters || 40,
                locationName: existingGeofence?.locationName || `${entry.className} ${entry.stream || ''}`.trim(),
                updatedBy: currentUser?.name || 'Director of Studies (DOS)',
                updatedAt: new Date().toISOString(),
                notes: `Calibrated with device GPS (detected accuracy: ±${loc.accuracy}m)`
            };

            const updatedList = saveClassGeofence(updatedItem, instId);
            updateGeofences(updatedList);
            onLogAction?.(`Calibrated classroom geofence for ${entry.className} (${entry.stream || 'All'}) to Lat: ${loc.latitude.toFixed(6)}, Lon: ${loc.longitude.toFixed(6)}`);
            
            setActionMessage(`✅ Successfully calibrated ${entry.className}${entry.stream ? ` (${entry.stream})` : ''}! Target radius: ${updatedItem.radiusMeters}m (Accuracy: ±${loc.accuracy}m).`);
            setTimeout(() => setActionMessage(null), 4000);
        } catch (err: any) {
            alert(`GPS Error: ${err?.message || 'Failed to detect current location. Please verify that browser location permission is enabled.'}`);
            setActionMessage(null);
        }
    };

    // Open Manual / Detailed Calibration Dialog
    const handleOpenModal = (entry: typeof classRoomEntries[0]) => {
        setCalibrationModal({
            courseId: entry.courseId,
            className: entry.className,
            stream: entry.stream,
            latitude: entry.geofence?.latitude ?? '',
            longitude: entry.geofence?.longitude ?? '',
            radiusMeters: entry.geofence?.radiusMeters || 40,
            locationName: entry.geofence?.locationName || `${entry.className} ${entry.stream || ''}`.trim(),
            notes: entry.geofence?.notes || '',
            isDetecting: false,
            detectedAccuracy: null,
            error: null
        });
    };

    // Detect GPS inside modal
    const handleModalDetectGps = async () => {
        if (!calibrationModal) return;
        setCalibrationModal(prev => prev ? { ...prev, isDetecting: true, error: null } : null);
        try {
            const loc = await getCurrentDeviceLocation({ enableHighAccuracy: true, timeout: 8000 });
            setCalibrationModal(prev => prev ? {
                ...prev,
                isDetecting: false,
                latitude: loc.latitude,
                longitude: loc.longitude,
                detectedAccuracy: loc.accuracy,
                error: null
            } : null);
        } catch (err: any) {
            setCalibrationModal(prev => prev ? {
                ...prev,
                isDetecting: false,
                error: err?.message || 'Location error'
            } : null);
        }
    };

    // Save from modal
    const handleSaveModal = () => {
        if (!calibrationModal) return;
        const lat = Number(calibrationModal.latitude);
        const lng = Number(calibrationModal.longitude);

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            alert('Please provide valid decimal latitude and longitude coordinates.');
            return;
        }

        const existing = geofences.find(g => 
            g.courseId === calibrationModal.courseId && 
            ((g.stream || '').trim().toLowerCase() === (calibrationModal.stream || '').trim().toLowerCase())
        );

        const item: ClassGeofence = {
            id: existing?.id || `geofence_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            institutionId: instId,
            courseId: calibrationModal.courseId,
            className: calibrationModal.className,
            stream: calibrationModal.stream || undefined,
            latitude: lat,
            longitude: lng,
            radiusMeters: calibrationModal.radiusMeters || 40,
            locationName: calibrationModal.locationName.trim() || `${calibrationModal.className} ${calibrationModal.stream || ''}`.trim(),
            updatedBy: currentUser?.name || 'Director of Studies (DOS)',
            updatedAt: new Date().toISOString(),
            notes: calibrationModal.notes
        };

        const updatedList = saveClassGeofence(item, instId);
        updateGeofences(updatedList);
        onLogAction?.(`Updated geofence boundary for ${calibrationModal.className} (${calibrationModal.stream || 'All'})`);

        setCalibrationModal(null);
        setActionMessage(`✅ Geofence boundary updated for ${item.className}!`);
        setTimeout(() => setActionMessage(null), 3000);
    };

    // Remove Geofence
    const handleDeleteGeofence = (geofenceId: string, className: string) => {
        if (!confirm(`Are you sure you want to remove the geofence boundary for ${className}? Remedial QR scans for this room will no longer enforce GPS proximity.`)) {
            return;
        }
        const updatedList = deleteClassGeofence(geofenceId, instId);
        updateGeofences(updatedList);
        onLogAction?.(`Deleted classroom geofence for ${className}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-left">
            {/* Top Header Card */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-black uppercase tracking-widest">
                            <MapPin className="w-3.5 h-3.5 animate-pulse" />
                            <span>Classroom Spatial Proof-of-Presence</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Class Geofences &amp; GPS Boundary Calibration
                        </h2>
                        <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
                            Configure physical classroom coordinates. When teachers scan student leaders' verification QR badges, the system enforces proof-of-presence within the classroom boundary.
                        </p>
                    </div>

                    {/* Quick GPS Diagnostic Button */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleRunGpsTest}
                            disabled={gpsTester.isLoading}
                            className="px-5 py-3 bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Check your current device GPS coordinates & accuracy"
                        >
                            <Crosshair className={`w-4 h-4 text-emerald-400 ${gpsTester.isLoading ? 'animate-spin' : ''}`} />
                            <span>{gpsTester.isLoading ? 'Sampling GPS...' : 'Test Device GPS Here'}</span>
                        </button>
                    </div>
                </div>

                {/* Live GPS Diagnostic Banner */}
                {gpsTester.coords && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-emerald-950/20 p-3 rounded-2xl border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Device GPS Detected:</span>
                            <span className="font-mono text-white">Lat {gpsTester.coords.latitude.toFixed(6)}, Lon {gpsTester.coords.longitude.toFixed(6)}</span>
                            <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300">
                                Accuracy: ±{gpsTester.coords.accuracy}m
                            </span>
                        </div>
                        <a
                            href={`https://www.google.com/maps?q=${gpsTester.coords.latitude},${gpsTester.coords.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center gap-1"
                        >
                            <span>Verify on Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}

                {gpsTester.error && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>GPS Diagnostic Failed: {gpsTester.error}</span>
                    </div>
                )}
            </div>

            {/* Notification Banner */}
            {actionMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{actionMessage}</span>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Total Academic Rooms</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">{stats.total}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">Classrooms &amp; streams</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm ring-1 ring-emerald-500/20">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest block">Geofences Active</span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{stats.configured}</p>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">Proof-of-presence enforced</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest block">Pending Calibration</span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">{stats.unconfigured}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">GPS coordinates unassigned</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block">Avg. Permitted Radius</span>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">{stats.avgRadius}m</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">Concrete indoor tolerance</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search class, stream, or building location..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Filter:</span>
                    <select
                        value={selectedStreamFilter}
                        onChange={e => setSelectedStreamFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">All Streams</option>
                        {Array.from(new Set(classRoomEntries.map(e => e.stream).filter(Boolean))).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Classrooms Geofence Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="px-6 py-4">Class &amp; Stream</th>
                                <th className="px-6 py-4">Designated Room Name</th>
                                <th className="px-6 py-4">GPS Coordinates</th>
                                <th className="px-6 py-4">Permitted Radius</th>
                                <th className="px-6 py-4">Geofence Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {filteredEntries.map((entry) => {
                                const geo = entry.geofence;
                                const isConfigured = Boolean(geo && geo.latitude && geo.longitude);

                                return (
                                    <tr key={entry.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-850 transition-colors group">
                                        {/* Class & Stream */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                    isConfigured 
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                }`}>
                                                    <Building className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {entry.className}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                        {entry.stream ? `Stream ${entry.stream}` : 'All Streams Combined'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Room Name */}
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                {geo?.locationName || <span className="text-slate-400 font-normal italic">Default Classroom</span>}
                                            </span>
                                            {geo?.updatedAt && (
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    Updated {new Date(geo.updatedAt).toLocaleDateString()} by {geo.updatedBy || 'DOS'}
                                                </p>
                                            )}
                                        </td>

                                        {/* GPS Coordinates */}
                                        <td className="px-6 py-4">
                                            {isConfigured ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                                            {geo!.latitude.toFixed(6)}, {geo!.longitude.toFixed(6)}
                                                        </span>
                                                        <a
                                                            href={`https://www.google.com/maps?q=${geo!.latitude},${geo!.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 p-1"
                                                            title="View on Google Maps"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 font-mono text-[11px] italic">Not Configured</span>
                                            )}
                                        </td>

                                        {/* Radius */}
                                        <td className="px-6 py-4">
                                            {isConfigured ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    ±{geo!.radiusMeters} meters
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px]">Standard 40m</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            {isConfigured ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                                    Geofence Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                                    Uncalibrated
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* One-Tap "Calibrate Here" */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickCalibrateHere(entry)}
                                                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                                    title="Set to your device's live GPS coordinates right now"
                                                >
                                                    <Crosshair className="w-3.5 h-3.5" />
                                                    <span>Calibrate Here</span>
                                                </button>

                                                {/* Detailed Edit */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenModal(entry)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                                                    title="Manually adjust coordinates, radius, or room name"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {/* Clear */}
                                                {isConfigured && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteGeofence(geo!.id, entry.className)}
                                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-all cursor-pointer"
                                                        title="Delete Geofence"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Calibration Dialog Modal */}
            {calibrationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-left">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Calibrate Classroom Geofence
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold">
                                        {calibrationModal.className} {calibrationModal.stream ? `• Stream ${calibrationModal.stream}` : ''}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCalibrationModal(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Room Label */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                    Room / Building Designation
                                </label>
                                <input
                                    type="text"
                                    value={calibrationModal.locationName}
                                    onChange={e => setCalibrationModal(prev => prev ? { ...prev, locationName: e.target.value } : null)}
                                    placeholder="e.g. Senior Block Room 4B / Science Lab 2"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* One-Tap Live GPS Capture Button */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Live Device Capture
                                    </span>
                                    {calibrationModal.detectedAccuracy && (
                                        <span className="text-[9px] font-mono text-emerald-500 font-bold">
                                            Accuracy: ±{calibrationModal.detectedAccuracy}m
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleModalDetectGps}
                                    disabled={calibrationModal.isDetecting}
                                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                    <Crosshair className={`w-4 h-4 ${calibrationModal.isDetecting ? 'animate-spin' : ''}`} />
                                    <span>{calibrationModal.isDetecting ? 'Detecting Coordinates...' : 'Pin to My Current Position'}</span>
                                </button>
                                {calibrationModal.error && (
                                    <p className="text-[10px] text-rose-500 font-medium">{calibrationModal.error}</p>
                                )}
                            </div>

                            {/* Coordinate Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        Latitude (Decimal)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={calibrationModal.latitude}
                                        onChange={e => setCalibrationModal(prev => prev ? { ...prev, latitude: e.target.value === '' ? '' : Number(e.target.value) } : null)}
                                        placeholder="-1.284100"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        Longitude (Decimal)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={calibrationModal.longitude}
                                        onChange={e => setCalibrationModal(prev => prev ? { ...prev, longitude: e.target.value === '' ? '' : Number(e.target.value) } : null)}
                                        placeholder="36.815500"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Radius Slider */}
                            <div className="space-y-1.5 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Permitted Boundary Radius
                                    </label>
                                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                                        {calibrationModal.radiusMeters} meters
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="100"
                                    step="5"
                                    value={calibrationModal.radiusMeters}
                                    onChange={e => setCalibrationModal(prev => prev ? { ...prev, radiusMeters: Number(e.target.value) } : null)}
                                    className="w-full accent-emerald-500 cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                    <span>20m (Tight)</span>
                                    <span>40m (Recommended)</span>
                                    <span>100m (Campus Wing)</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                    40 meters is recommended to account for concrete and tin-roof attenuation while strictly preventing scans from the staffroom or parking lot.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setCalibrationModal(null)}
                                className="px-4 py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveModal}
                                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                            >
                                Save Classroom Boundary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
