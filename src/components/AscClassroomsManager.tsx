import React, { useState, useMemo, useEffect } from 'react';
import type { Room, Building, Course, Subject, TimetableEntry, TimetableSettings } from '../types';
import type { AscLessonRow } from './AscSubjectsManager';
import { generatePeriodLabels } from '../utils/timeUtils';
import { apiService } from '../services/apiService';

interface AscRoomPrefs {
    shortCode?: string;
    timeOff?: Record<string, boolean>; // `${dayIdx}_${pIdx}` -> true = blocked (red)
    isShared?: boolean;                // red shared-room icon like aSc (LAB 1, FIELD, LAB 2)
    homeClassKey?: string;
    maxPerDay?: number;
}

interface AscClassroomsManagerProps {
    institutionId: string;
    rooms: Room[];
    buildings: Building[];
    courses: Course[];
    subjects: Subject[];
    timetableEntries?: TimetableEntry[];
    timetableSettings?: TimetableSettings;
    onAddRoom?: (room: Omit<Room, 'id'>) => Promise<void> | void;
    onUpdateRoom?: (room: Room) => Promise<void> | void;
    onDeleteRoom?: (id: string) => Promise<void> | void;
    onSwitchTab?: (tab: 'cards' | 'subjects' | 'classes' | 'classrooms' | 'teachers' | 'relations') => void;
}

const deriveShortRoom = (name: string): string => {
    const clean = (name || '').trim().toUpperCase();
    if (clean.length <= 5) return clean;
    if (clean.includes('FIELD')) return 'FLD';
    if (clean.includes('COMPUTER')) return 'COMP';
    if (clean.includes('LIBRARY')) return 'LIB';
    if (clean.includes('HOME SCIENCE')) return 'HS LAB';
    return clean.slice(0, 5);
};

export const AscClassroomsManager: React.FC<AscClassroomsManagerProps> = ({
    institutionId,
    rooms,
    buildings,
    courses,
    subjects,
    timetableEntries = [],
    timetableSettings,
    onAddRoom,
    onUpdateRoom,
    onDeleteRoom,
    onSwitchTab,
}) => {
    const prefsKey = `eduai_asc_room_prefs_${institutionId || 'default'}`;
    const lessonsKey = `eduai_asc_lessons_${institutionId || 'default'}`;

    const [prefsMap, setPrefsMap] = useState<Record<string, AscRoomPrefs>>(() => {
        try {
            const raw = localStorage.getItem(prefsKey);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {};
    });

    const [ascLessons, setAscLessons] = useState<AscLessonRow[]>(() => {
        try {
            const raw = localStorage.getItem(lessonsKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    });

    const [search, setSearch] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<string>(() => rooms?.[0]?.id || '');

    // Modals
    const [editModal, setEditModal] = useState<{ mode: 'new' | 'edit'; room?: Room } | null>(null);
    const [formName, setFormName] = useState('');
    const [formShort, setFormShort] = useState('');
    const [formCapacity, setFormCapacity] = useState<number>(45);
    const [formBuildingId, setFormBuildingId] = useState('');
    const [formIsShared, setFormIsShared] = useState<boolean>(false);
    const [formRoomType, setFormRoomType] = useState<string>('Classroom');

    const [timeOffModalRoom, setTimeOffModalRoom] = useState<Room | null>(null);
    const [lessonsModalRoom, setLessonsModalRoom] = useState<Room | null>(null);
    const [constraintsModalRoom, setConstraintsModalRoom] = useState<Room | null>(null);
    const [cIsShared, setCIsShared] = useState<boolean>(false);
    const [cMaxPerDay, setCMaxPerDay] = useState<number>(10);
    const [cHomeClass, setCHomeClass] = useState<string>('');

    useEffect(() => {
        if (!selectedRoomId && rooms.length > 0) {
            setSelectedRoomId(rooms[0].id);
        }
    }, [rooms, selectedRoomId]);

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<{ id: string; prefs: Record<string, AscRoomPrefs> }>('asc_room_prefs', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0 && recs[0]?.prefs) {
                    setPrefsMap(recs[0].prefs);
                    try { localStorage.setItem(prefsKey, JSON.stringify(recs[0].prefs)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<AscLessonRow>('asc_subject_lessons', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) setAscLessons(recs);
            })
            .catch(() => {});
    }, [institutionId, prefsKey]);

    const savePrefs = async (next: Record<string, AscRoomPrefs>) => {
        setPrefsMap(next);
        try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch (_) {}
        await apiService.saveModuleRecord('asc_room_prefs', {
            id: `asc_rm_prefs_${institutionId}`,
            institutionId,
            prefs: next,
            updatedAt: new Date().toISOString(),
        }).catch(() => {});
    };

    const operatingDays = useMemo(() => {
        const d = timetableSettings?.operatingDays;
        return Array.isArray(d) && d.length > 0 ? d : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }, [timetableSettings]);

    const periodCount = useMemo(() => {
        try {
            const labels = generatePeriodLabels(timetableSettings!, false) || [];
            const nonBreak = labels.filter((p: any) => !p.isBreak);
            if (nonBreak.length > 0) return Math.min(12, nonBreak.length);
        } catch (_) {}
        return 10;
    }, [timetableSettings]);

    const filteredRooms = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (rooms || []).filter(r => {
            if (!r) return false;
            const short = prefsMap[r.id]?.shortCode || deriveShortRoom(r.name);
            return !q || `${r.name} ${short}`.toLowerCase().includes(q);
        });
    }, [rooms, search, prefsMap]);

    const selectedRoom = useMemo(
        () => (rooms || []).find(r => r && r.id === selectedRoomId) || filteredRooms[0] || null,
        [rooms, selectedRoomId, filteredRooms]
    );

    const getRoomUsage = (room: Room): { placed: number; assigned: number } => {
        const placed = (timetableEntries || []).filter(e => e && e.roomId === room.id).length;
        const assigned = ascLessons
            .filter(l => l.roomId === room.id || (l.roomName || '').toLowerCase().includes(room.name.toLowerCase()))
            .reduce((s, l) => s + (Number(l.count) || 0) * (Number(l.length) || 1), 0);
        return { placed, assigned };
    };

    const openNewModal = () => {
        setFormName('');
        setFormShort('');
        setFormCapacity(45);
        setFormBuildingId(buildings?.[0]?.id || '');
        setFormIsShared(false);
        setFormRoomType('Classroom');
        setEditModal({ mode: 'new' });
    };

    const openEditModal = (room?: Room | null) => {
        const target = room || selectedRoom;
        if (!target) return;
        const p = prefsMap[target.id] || {};
        setFormName(target.name || '');
        setFormShort(p.shortCode || deriveShortRoom(target.name));
        setFormCapacity(target.capacity || 45);
        setFormBuildingId(target.buildingId || buildings?.[0]?.id || '');
        setFormIsShared(Boolean(p.isShared || /lab|field|hall|comp/i.test(target.name)));
        setFormRoomType((target as any).type || 'Classroom');
        setEditModal({ mode: 'edit', room: target });
    };

    const handleSaveRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;
        const cleanShort = formShort.trim().toUpperCase() || deriveShortRoom(formName.trim());

        if (editModal?.mode === 'new') {
            if (onAddRoom) {
                await onAddRoom({
                    name: formName.trim().toUpperCase(),
                    capacity: Number(formCapacity) || 45,
                    type: formRoomType as any,
                    buildingId: formBuildingId || buildings?.[0]?.id || 'default',
                    institutionId,
                } as any);
            }
        } else if (editModal?.room) {
            const target = editModal.room;
            if (onUpdateRoom) {
                await onUpdateRoom({
                    ...target,
                    name: formName.trim().toUpperCase(),
                    capacity: Number(formCapacity) || 45,
                    type: formRoomType as any,
                    buildingId: formBuildingId || target.buildingId,
                } as any);
            }
            await savePrefs({
                ...prefsMap,
                [target.id]: {
                    ...(prefsMap[target.id] || {}),
                    shortCode: cleanShort,
                    isShared: formIsShared,
                }
            });
        }
        setEditModal(null);
    };

    const handleRemoveSelected = async () => {
        if (!selectedRoom || !onDeleteRoom) return;
        if (!window.confirm(`Remove classroom "${selectedRoom.name}"?`)) return;
        await onDeleteRoom(selectedRoom.id);
    };

    const handleRemoveAll = async () => {
        if (!onDeleteRoom || rooms.length === 0) return;
        if (!window.confirm(`Remove ALL ${rooms.length} classroom(s)? This cannot be undone.`)) return;
        for (const r of rooms) {
            await onDeleteRoom(r.id);
        }
    };

    const handleGenerateClassrooms = async () => {
        if (!onAddRoom) return;
        const existingNames = new Set((rooms || []).map(r => (r.name || '').trim().toUpperCase()));
        const toCreate: Array<{ name: string; type: string; capacity: number }> = [];

        // Standard shared rooms
        const defaults = [
            { name: 'LAB 1', type: 'Laboratory', capacity: 45 },
            { name: 'LAB 2', type: 'Laboratory', capacity: 45 },
            { name: 'COMPUTER LAB', type: 'Computer Lab', capacity: 40 },
            { name: 'FIELD', type: 'Field', capacity: 120 },
        ];
        defaults.forEach(d => {
            if (!existingNames.has(d.name)) toCreate.push(d);
        });

        // Home classrooms per class/stream
        (courses || []).forEach(c => {
            const levels = Array.isArray(c?.levels) && c.levels.length > 0 ? c.levels : [];
            if (levels.length === 0) {
                const rName = `${c.name} ROOM`.toUpperCase();
                if (!existingNames.has(rName)) toCreate.push({ name: rName, type: 'Classroom', capacity: 45 });
            } else {
                levels.forEach(l => {
                    const rName = `${l.name} ROOM`.toUpperCase();
                    if (!existingNames.has(rName)) toCreate.push({ name: rName, type: 'Classroom', capacity: 45 });
                });
            }
        });

        if (toCreate.length === 0) {
            alert('All standard labs and home classrooms already exist.');
            return;
        }
        if (!window.confirm(`Generate ${toCreate.length} classroom(s) (Shared Labs, Field & Home Classrooms)?`)) return;
        for (const item of toCreate) {
            await onAddRoom({
                name: item.name,
                type: item.type as any,
                capacity: item.capacity,
                buildingId: buildings?.[0]?.id || 'default',
                institutionId,
            } as any);
        }
    };

    const toggleTimeOffCell = (roomId: string, dayIdx: number, pIdx: number) => {
        const key = `${dayIdx}_${pIdx}`;
        const cur = prefsMap[roomId] || {};
        const nextTimeOff = { ...(cur.timeOff || {}), [key]: !cur.timeOff?.[key] };
        savePrefs({ ...prefsMap, [roomId]: { ...cur, timeOff: nextTimeOff } });
    };

    const toggleTimeOffRow = (roomId: string, dayIdx: number) => {
        const cur = prefsMap[roomId] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = Array.from({ length: periodCount }).every((_, pIdx) => Boolean(timeOff[`${dayIdx}_${pIdx}`]));
        for (let pIdx = 0; pIdx < periodCount; pIdx++) timeOff[`${dayIdx}_${pIdx}`] = !allBlocked;
        savePrefs({ ...prefsMap, [roomId]: { ...cur, timeOff } });
    };

    const toggleTimeOffCol = (roomId: string, pIdx: number) => {
        const cur = prefsMap[roomId] || {};
        const timeOff = { ...(cur.timeOff || {}) };
        const allBlocked = operatingDays.every((_, dIdx) => Boolean(timeOff[`${dIdx}_${pIdx}`]));
        for (let dIdx = 0; dIdx < operatingDays.length; dIdx++) timeOff[`${dIdx}_${pIdx}`] = !allBlocked;
        savePrefs({ ...prefsMap, [roomId]: { ...cur, timeOff } });
    };

    const openConstraints = () => {
        if (!selectedRoom) return;
        const p = prefsMap[selectedRoom.id] || {};
        setCIsShared(Boolean(p.isShared || /lab|field|hall|comp/i.test(selectedRoom.name)));
        setCMaxPerDay(p.maxPerDay ?? 10);
        setCHomeClass(p.homeClassKey || '');
        setConstraintsModalRoom(selectedRoom);
    };

    const handleSaveConstraints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!constraintsModalRoom) return;
        await savePrefs({
            ...prefsMap,
            [constraintsModalRoom.id]: {
                ...(prefsMap[constraintsModalRoom.id] || {}),
                isShared: cIsShared,
                maxPerDay: cMaxPerDay,
                homeClassKey: cHomeClass || undefined,
            }
        });
        setConstraintsModalRoom(null);
    };

    const renderMiniTimeOff = (room: Room) => {
        const timeOff = prefsMap[room.id]?.timeOff || {};
        return (
            <div
                onClick={e => {
                    e.stopPropagation();
                    setSelectedRoomId(room.id);
                    setTimeOffModalRoom(room);
                }}
                title="Click to edit Classroom Time-Off (Green = Available, Red = Unavailable)"
                className="inline-grid border border-slate-700 bg-slate-800 p-[1px] gap-[1px] cursor-pointer hover:scale-105 transition-transform"
                style={{ gridTemplateColumns: `repeat(${Math.min(10, periodCount)}, 6px)` }}
            >
                {operatingDays.slice(0, 5).map((_, dIdx) =>
                    Array.from({ length: Math.min(10, periodCount) }).map((__, pIdx) => {
                        const blocked = Boolean(timeOff[`${dIdx}_${pIdx}`]);
                        return (
                            <span
                                key={`${dIdx}-${pIdx}`}
                                className={`block w-[6px] h-[4px] ${blocked ? 'bg-red-600' : 'bg-lime-500'}`}
                            />
                        );
                    })
                )}
            </div>
        );
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Title Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Classrooms ({filteredRooms.length})
                    </span>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter classrooms or labs..."
                    className="w-64 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                />
            </div>

            {/* 3-Column aSc Workspace */}
            <div className="flex flex-col md:flex-row">
                {/* Left Vertical aSc Icon Rail */}
                <div className="flex md:flex-col items-center justify-center md:justify-start gap-2 p-2.5 bg-slate-200/70 dark:bg-slate-800/80 border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 md:w-20 shrink-0">
                    {[
                        { id: 'subjects', label: 'Subjects', icon: '📘', active: false },
                        { id: 'classes', label: 'Classes', icon: '👥', active: false },
                        { id: 'classrooms', label: 'Rooms', icon: '🚪', active: true },
                        { id: 'teachers', label: 'Teachers', icon: '🎓', active: false },
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => onSwitchTab?.(btn.id as any)}
                            className={`w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase transition-all cursor-pointer ${
                                btn.active
                                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-900 border border-amber-600 shadow'
                                    : 'bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-white border border-transparent'
                            }`}
                        >
                            <span className="text-lg leading-none">{btn.icon}</span>
                            <span>{btn.label}</span>
                        </button>
                    ))}
                </div>

                {/* Center Classrooms Table */}
                <div className="flex-1 p-3 overflow-x-auto">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Enter classrooms :
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden min-h-[380px] max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs select-none">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                <tr>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700">Name</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-20">Short</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-16 text-right">Count</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-24 text-center">Time off</th>
                                    <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 w-16 text-center">Type</th>
                                    <th className="py-1.5 px-2.5 w-28">Building</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredRooms.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-400">
                                            No classrooms added yet. Click <strong>+ New</strong> or <strong>Generate</strong> on the right.
                                        </td>
                                    </tr>
                                ) : filteredRooms.map((room, idx) => {
                                    const isSel = selectedRoom?.id === room.id;
                                    const p = prefsMap[room.id] || {};
                                    const short = p.shortCode || deriveShortRoom(room.name);
                                    const usage = getRoomUsage(room);
                                    const isShared = p.isShared ?? /lab|field|hall|comp/i.test(room.name);
                                    const bld = buildings.find(b => b.id === room.buildingId);

                                    return (
                                        <tr
                                            key={room.id}
                                            onClick={() => setSelectedRoomId(room.id)}
                                            onDoubleClick={() => openEditModal(room)}
                                            className={`cursor-pointer transition-colors ${
                                                isSel
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : idx % 2 === 0
                                                        ? 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                                        : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                            }`}
                                        >
                                            <td className="py-1.5 px-2.5 flex items-center gap-2">
                                                <span className="text-sm leading-none">🚪</span>
                                                <span className="uppercase tracking-tight truncate">{room.name}</span>
                                            </td>
                                            <td className="py-1.5 px-2.5 font-mono uppercase truncate">{short}</td>
                                            <td className="py-1.5 px-2.5 text-right font-mono">{usage.placed}/{usage.assigned}</td>
                                            <td className="py-1 px-2 text-center">{renderMiniTimeOff(room)}</td>
                                            <td className="py-1.5 px-2.5 text-center">
                                                {isShared ? (
                                                    <span title="Shared Room (Lab / Field / Special)" className="inline-block w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] leading-[14px] font-black">⊘</span>
                                                ) : (
                                                    <span title="Standard / Home Classroom" className="text-[10px] opacity-60">—</span>
                                                )}
                                            </td>
                                            <td className="py-1.5 px-2.5 truncate">{bld?.name || ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right aSc Action Button Stack */}
                <div className="w-full md:w-44 p-3 flex flex-row md:flex-col flex-wrap gap-2 bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                        type="button"
                        onClick={openNewModal}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-[11px]">+</span>
                        New
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRoom}
                        onClick={() => openEditModal(selectedRoom)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🚪</span> Edit
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRoom || !onDeleteRoom}
                        onClick={handleRemoveSelected}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[11px]">−</span>
                        Remove
                    </button>

                    <div className="hidden md:block my-2 border-t border-slate-300 dark:border-slate-700" />

                    <button
                        type="button"
                        disabled={!selectedRoom}
                        onClick={() => selectedRoom && setLessonsModalRoom(selectedRoom)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>📚</span> Lessons
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRoom}
                        onClick={() => selectedRoom && setTimeOffModalRoom(selectedRoom)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🕒</span> Time off
                    </button>
                    <button
                        type="button"
                        disabled={!selectedRoom}
                        onClick={openConstraints}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span className="text-purple-600 font-black">#</span> Constraints
                    </button>

                    <div className="hidden md:block my-2 border-t border-slate-300 dark:border-slate-700" />

                    <button
                        type="button"
                        disabled={rooms.length === 0 || !onDeleteRoom}
                        onClick={handleRemoveAll}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <span>🗑️</span> Remove all
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerateClassrooms}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 border-2 border-blue-500 text-xs font-black text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        <span>🚪</span> Generate
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="bg-slate-200/80 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => alert('Manage home classrooms, science labs, computer labs, and sports fields. Click Generate to auto-create standard labs & home rooms for each class.')}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        ❓ Help
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerateClassrooms}
                        className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white shadow-sm cursor-pointer"
                    >
                        📥 Import
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => onSwitchTab?.('cards')}
                    className="px-5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-300 dark:border-slate-600 text-xs font-black text-slate-800 dark:text-white shadow-sm cursor-pointer"
                >
                    Close
                </button>
            </div>

            {/* MODAL 1: NEW / EDIT CLASSROOM */}
            {editModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveRoom} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            {editModal.mode === 'new' ? 'New Classroom' : `Edit Classroom — ${editModal.room?.name}`}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Classroom Name *</label>
                                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. LAB 1, COMPUTER LAB" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold uppercase" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Short *</label>
                                <input type="text" required maxLength={8} value={formShort} onChange={e => setFormShort(e.target.value.toUpperCase())} placeholder="LAB 1" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-black uppercase" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Room Type</label>
                                <select value={formRoomType} onChange={e => setFormRoomType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="Classroom">Classroom</option>
                                    <option value="Laboratory">Science Lab</option>
                                    <option value="Computer Lab">Computer Lab</option>
                                    <option value="Field">Field / PE</option>
                                    <option value="Lecture Hall">Hall</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Building</label>
                                <select value={formBuildingId} onChange={e => setFormBuildingId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">Main Block</option>
                                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-center">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Capacity</label>
                                <input type="number" min={1} value={formCapacity} onChange={e => setFormCapacity(Math.max(1, Number(e.target.value) || 40))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                            </div>
                            <label className="flex items-center gap-2 text-xs font-bold pt-4 cursor-pointer">
                                <input type="checkbox" checked={formIsShared} onChange={e => setFormIsShared(e.target.checked)} className="w-4 h-4 accent-red-600" />
                                <span>Shared Room (Lab / Special)</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase cursor-pointer">OK</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 2: LESSONS IN CLASSROOM */}
            {lessonsModalRoom && (() => {
                const roomLessons = ascLessons.filter(
                    l => l.roomId === lessonsModalRoom.id || (l.roomName || '').toLowerCase().includes(lessonsModalRoom.name.toLowerCase())
                );
                return (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold">Lessons for classroom — {lessonsModalRoom.name}</span>
                                <button type="button" onClick={() => setLessonsModalRoom(null)} className="font-black text-sm px-2 cursor-pointer">×</button>
                            </div>
                            <div className="flex-1 bg-white dark:bg-slate-900 overflow-auto min-h-[240px]">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold">
                                        <tr>
                                            <th className="p-2.5">Subject</th>
                                            <th className="p-2.5">Teacher</th>
                                            <th className="p-2.5">Class</th>
                                            <th className="p-2.5 text-center">Count</th>
                                            <th className="p-2.5 text-center">Length</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {roomLessons.length === 0 ? (
                                            <tr><td colSpan={5} className="p-10 text-center text-slate-400">No specific lessons assigned to <strong>{lessonsModalRoom.name}</strong> yet.</td></tr>
                                        ) : roomLessons.map(l => {
                                            const sub = subjects.find(s => s.id === l.subjectId);
                                            return (
                                                <tr key={l.id}>
                                                    <td className="p-2.5 font-bold uppercase">{sub?.name || l.subjectId}</td>
                                                    <td className="p-2.5">{l.teacherName}</td>
                                                    <td className="p-2.5 font-bold">{l.classLabel}</td>
                                                    <td className="p-2.5 text-center font-mono">{l.count}</td>
                                                    <td className="p-2.5 text-center font-mono">{l.length}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-2.5 flex justify-end">
                                <button type="button" onClick={() => setLessonsModalRoom(null)} className="px-6 py-1.5 rounded border border-slate-400 bg-white dark:bg-slate-700 text-xs font-black cursor-pointer">Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL 3: CLASSROOM TIME OFF */}
            {timeOffModalRoom && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-2xl shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Time Off — {timeOffModalRoom.name}</h3>
                                <p className="text-[11px] text-slate-500">Click cells, days, or period numbers to toggle Available (Green ✓) vs Unavailable (Red ×).</p>
                            </div>
                            <button type="button" onClick={() => setTimeOffModalRoom(null)} className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-black cursor-pointer">Done</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center text-xs select-none">
                                <thead>
                                    <tr>
                                        <th className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900">Day / Period</th>
                                        {Array.from({ length: periodCount }).map((_, pIdx) => (
                                            <th key={pIdx} onClick={() => toggleTimeOffCol(timeOffModalRoom.id, pIdx)} className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-100 cursor-pointer font-black">{pIdx + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {operatingDays.map((day, dIdx) => (
                                        <tr key={day}>
                                            <td onClick={() => toggleTimeOffRow(timeOffModalRoom.id, dIdx)} className="p-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-left hover:bg-indigo-100 cursor-pointer">{day}</td>
                                            {Array.from({ length: periodCount }).map((_, pIdx) => {
                                                const blocked = Boolean(prefsMap[timeOffModalRoom.id]?.timeOff?.[`${dIdx}_${pIdx}`]);
                                                return (
                                                    <td key={pIdx} onClick={() => toggleTimeOffCell(timeOffModalRoom.id, dIdx, pIdx)} className={`p-2 border border-slate-300 dark:border-slate-600 font-black cursor-pointer ${blocked ? 'bg-red-500 text-white' : 'bg-lime-500 text-slate-950'}`}>
                                                        {blocked ? '✕' : '✓'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: CONSTRAINTS */}
            {constraintsModalRoom && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveConstraints} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Constraints — {constraintsModalRoom.name}</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                                <input type="checkbox" checked={cIsShared} onChange={e => setCIsShared(e.target.checked)} className="w-4 h-4 accent-red-600" />
                                <span>Shared Room (Lab / Field / Special)</span>
                            </label>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Max Lessons Per Day</label>
                                <input type="number" min={1} max={12} value={cMaxPerDay} onChange={e => setCMaxPerDay(Math.max(1, Number(e.target.value) || 10))} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Home Room For Class (Optional)</label>
                                <select value={cHomeClass} onChange={e => setCHomeClass(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">None (Shared)</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setConstraintsModalRoom(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase cursor-pointer">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
