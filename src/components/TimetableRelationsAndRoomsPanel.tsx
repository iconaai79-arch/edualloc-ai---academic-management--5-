import React, { useState, useEffect } from 'react';
import type { Room, Building, Subject, Course, User } from '../types';
import { apiService } from '../services/apiService';

interface TimetableClassroomsManagerProps {
    rooms: Room[];
    buildings: Building[];
    courses: Course[];
    onAddRoom?: (room: Omit<Room, 'id'>) => Promise<void> | void;
    onUpdateRoom?: (room: Room) => Promise<void> | void;
    onDeleteRoom?: (id: string) => Promise<void> | void;
    institutionId: string;
}

export const TimetableClassroomsManager: React.FC<TimetableClassroomsManagerProps> = ({
    rooms,
    buildings,
    courses,
    onAddRoom,
    onDeleteRoom,
    institutionId,
}) => {
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState<number>(45);
    const [type, setType] = useState<string>('Classroom');
    const [buildingId, setBuildingId] = useState<string>(buildings?.[0]?.id || '');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredRooms = (rooms || []).filter(r =>
        !search.trim() ||
        `${r.name} ${(r as any).type || ''} ${r.capacity || ''}`.toLowerCase().includes(search.trim().toLowerCase())
    );

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !onAddRoom) return;
        setSaving(true);
        try {
            await onAddRoom({
                name: name.trim(),
                capacity: Number(capacity) || 40,
                type: type as any,
                buildingId: buildingId || buildings?.[0]?.id || 'default',
                institutionId,
            } as any);
            setName('');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Add Classroom / Lab Form */}
            <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            Classrooms, Labs &amp; Shared Rooms ({(rooms || []).length})
                        </h3>
                        <p className="text-xs text-slate-500">
                            Manage home classrooms, science labs, computer rooms, and halls used by the Smart Timetable.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Classroom / Lab Name *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Form 4N Room, Bio Lab 1, Computer Lab"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Room Type</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                        >
                            <option value="Classroom">Home Classroom</option>
                            <option value="Laboratory">Science Laboratory</option>
                            <option value="Computer Lab">Computer Lab</option>
                            <option value="Lecture Hall">Hall / Auditorium</option>
                            <option value="Workshop">Workshop / Home Science</option>
                            <option value="Field">Sports Field / PE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Capacity</label>
                        <input
                            type="number"
                            min={1}
                            value={capacity}
                            onChange={e => setCapacity(Math.max(1, Number(e.target.value) || 40))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving || !onAddRoom}
                            className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow cursor-pointer disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : '+ Add Room'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Rooms Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search classrooms or labs..."
                        className="w-full max-w-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                    />
                    <span className="text-[11px] font-bold text-slate-400">
                        {courses?.length || 0} Classes configured
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3.5">Classroom / Lab</th>
                                <th className="p-3.5">Type</th>
                                <th className="p-3.5">Capacity</th>
                                <th className="p-3.5">Building / Block</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredRooms.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        No classrooms added yet. Add your first classroom or lab above.
                                    </td>
                                </tr>
                            ) : filteredRooms.map(room => {
                                const bld = (buildings || []).find(b => b.id === room.buildingId);
                                return (
                                    <tr key={room.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                                        <td className="p-3.5 font-black text-slate-900 dark:text-white">{room.name}</td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                                                {(room as any).type || 'Classroom'}
                                            </span>
                                        </td>
                                        <td className="p-3.5 font-mono font-bold">{room.capacity || 40} seats</td>
                                        <td className="p-3.5 text-slate-500">{bld?.name || 'Main Block'}</td>
                                        <td className="p-3.5 text-right">
                                            {onDeleteRoom && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`Delete classroom "${room.name}"?`)) {
                                                            onDeleteRoom(room.id);
                                                        }
                                                    }}
                                                    className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-[10px] uppercase cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export interface AscCardRelation {
    id: string;
    institutionId: string;
    ruleType:
        | 'same_time_electives'
        | 'double_lesson'
        | 'not_same_day'
        | 'morning_preferred'
        | 'afternoon_preferred'
        | 'max_per_day';
    title: string;
    subjectIds: string[];
    courseIds: string[];
    teacherId?: string;
    notes?: string;
    active: boolean;
    createdAt: string;
}

interface TimetableRelationsManagerProps {
    institutionId: string;
    subjects: Subject[];
    courses: Course[];
    lecturers: User[];
    onOpenWizard?: () => void;
}

const RULE_TYPE_LABELS: Record<AscCardRelation['ruleType'], { label: string; color: string; desc: string }> = {
    same_time_electives: {
        label: 'Same Time / Parallel Electives',
        color: 'bg-indigo-100 text-indigo-700',
        desc: 'Schedule selected elective subjects simultaneously (e.g. HIS / GEO or AGR / HS / CS / BST).'
    },
    double_lesson: {
        label: 'Double / Consecutive Periods',
        color: 'bg-emerald-100 text-emerald-700',
        desc: 'Keep practical or double lessons back-to-back (e.g. BIO, CHE, PHY lab sessions).'
    },
    not_same_day: {
        label: 'Cannot Be On Same Day',
        color: 'bg-rose-100 text-rose-700',
        desc: 'Prevent selected subjects from colliding on the same day for a class.'
    },
    morning_preferred: {
        label: 'Morning Periods Preferred (P1–P4)',
        color: 'bg-amber-100 text-amber-800',
        desc: 'Prioritize core subjects (MAT, ENG, KIS, Sciences) during morning lessons.'
    },
    afternoon_preferred: {
        label: 'Afternoon Periods Preferred (P6+)',
        color: 'bg-cyan-100 text-cyan-800',
        desc: 'Place PE, Games, Clubs, or practical electives in afternoon periods.'
    },
    max_per_day: {
        label: 'Max 1 Lesson Per Day Per Class',
        color: 'bg-purple-100 text-purple-700',
        desc: 'Spread lessons evenly across the week without repeating the same subject on one day.'
    }
};

export const TimetableRelationsManager: React.FC<TimetableRelationsManagerProps> = ({
    institutionId,
    subjects,
    courses,
    lecturers,
    onOpenWizard,
}) => {
    const storageKey = `eduai_asc_relations_${institutionId || 'default'}`;
    const [relations, setRelations] = useState<AscCardRelation[]>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    });

    const [ruleType, setRuleType] = useState<AscCardRelation['ruleType']>('same_time_electives');
    const [title, setTitle] = useState('');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [teacherId, setTeacherId] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<AscCardRelation>('timetable_relations', institutionId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) {
                    setRelations(recs);
                    try { localStorage.setItem(storageKey, JSON.stringify(recs)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [institutionId, storageKey]);

    const persistRelations = async (next: AscCardRelation[], changed?: AscCardRelation) => {
        setRelations(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
        if (changed) {
            await apiService.saveModuleRecord('timetable_relations', changed).catch(() => {});
        }
    };

    const toggleId = (list: string[], id: string, setter: (v: string[]) => void) => {
        setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    };

    const handleAddRelation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSubjectIds.length === 0) {
            alert('Select at least one subject for this card relationship.');
            return;
        }
        const subjectNames = selectedSubjectIds
            .map(id => (subjects || []).find(s => s.id === id)?.code || (subjects || []).find(s => s.id === id)?.name || id)
            .join(' + ');
        const newRel: AscCardRelation = {
            id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            institutionId,
            ruleType,
            title: title.trim() || `${RULE_TYPE_LABELS[ruleType].label}: ${subjectNames}`,
            subjectIds: selectedSubjectIds,
            courseIds: selectedCourseIds,
            teacherId: teacherId || undefined,
            notes: notes.trim() || undefined,
            active: true,
            createdAt: new Date().toISOString(),
        };
        await persistRelations([newRel, ...relations], newRel);
        setTitle('');
        setSelectedSubjectIds([]);
        setSelectedCourseIds([]);
        setTeacherId('');
        setNotes('');
    };

    const handleToggleActive = async (rel: AscCardRelation) => {
        const updated = { ...rel, active: !rel.active };
        await persistRelations(relations.map(r => r.id === rel.id ? updated : r), updated);
    };

    const handleDelete = (id: string) => {
        const next = relations.filter(r => r.id !== id);
        setRelations(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
    };

    return (
        <div className="space-y-5">
            {/* Add Card Relation Form */}
            <form onSubmit={handleAddRelation} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            Card Relationships &amp; Timetable Constraints ({relations.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                            Define aSc-style card relations such as parallel electives (HIS/GEO, AGR/CS/BST), double lab periods, and morning/afternoon preferences.
                        </p>
                    </div>
                    {onOpenWizard && (
                        <button
                            type="button"
                            onClick={onOpenWizard}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow cursor-pointer"
                        >
                            Apply &amp; Run AI Generator →
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Relationship Rule Type</label>
                        <select
                            value={ruleType}
                            onChange={e => setRuleType(e.target.value as AscCardRelation['ruleType'])}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                        >
                            {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">{RULE_TYPE_LABELS[ruleType].desc}</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Rule Title (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Form 4 Humanities Split (HIS/GEO)"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Specific Teacher (Optional)</label>
                        <select
                            value={teacherId}
                            onChange={e => setTeacherId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                        >
                            <option value="">All Teachers</option>
                            {(lecturers || []).map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Subject Picker Chips */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                        Select Subjects ({selectedSubjectIds.length} chosen) *
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        {(subjects || []).map(s => {
                            const picked = selectedSubjectIds.includes(s.id);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => toggleId(selectedSubjectIds, s.id, setSelectedSubjectIds)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        picked
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                    }`}
                                >
                                    {s.code ? `${s.code} — ` : ''}{s.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Class Picker Chips */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                        Apply to Classes (leave empty for All Classes)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {(courses || []).map(c => {
                            const picked = selectedCourseIds.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggleId(selectedCourseIds, c.id, setSelectedCourseIds)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        picked
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Optional note (e.g. Lab 1 preferred on Tue/Thu)..."
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                    />
                    <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow cursor-pointer"
                    >
                        + Add Relation
                    </button>
                </div>
            </form>

            {/* Saved Relations List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3.5">Rule</th>
                                <th className="p-3.5">Subjects</th>
                                <th className="p-3.5">Classes</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {relations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        No card relationships defined yet. Add parallel elective groups or double-lesson rules above.
                                    </td>
                                </tr>
                            ) : relations.map(rel => {
                                const meta = RULE_TYPE_LABELS[rel.ruleType];
                                return (
                                    <tr key={rel.id} className={!rel.active ? 'opacity-50' : ''}>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${meta.color}`}>
                                                {meta.label}
                                            </span>
                                            <div className="font-bold text-slate-900 dark:text-white mt-1">{rel.title}</div>
                                            {rel.notes && <div className="text-[10px] text-slate-400">{rel.notes}</div>}
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {rel.subjectIds.map(sid => {
                                                    const s = (subjects || []).find(x => x.id === sid);
                                                    return (
                                                        <span key={sid} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono font-bold text-[10px]">
                                                            {s?.code || s?.name || sid}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-bold">
                                            {rel.courseIds.length === 0
                                                ? 'All Classes'
                                                : rel.courseIds.map(cid => (courses || []).find(c => c.id === cid)?.name || cid).join(', ')}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${rel.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {rel.active ? 'Active' : 'Paused'}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(rel)}
                                                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-[10px] uppercase cursor-pointer"
                                                >
                                                    {rel.active ? 'Pause' : 'Enable'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(rel.id)}
                                                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 font-bold text-[10px] uppercase cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
