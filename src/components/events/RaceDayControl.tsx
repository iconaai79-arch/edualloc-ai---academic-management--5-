import React, { useState, useMemo } from 'react';
import { EventCategory, EventParticipant, EventSplit, EventMedicalLog } from '../../types';
import { PlayIcon, CheckCircleIcon, AlertTriangleIcon, ClockIcon, MapIcon, SparklesIcon } from '../icons';

interface RaceDayControlProps {
    eventStatus: 'planning' | 'active' | 'completed' | 'cancelled';
    onUpdateEventStatus: (status: 'planning' | 'active' | 'completed' | 'cancelled') => Promise<void>;
    categories: EventCategory[];
    participants: EventParticipant[];
    splits: EventSplit[];
    onRecordSplit: (data: Partial<EventSplit>) => Promise<void>;
    onUpdateParticipantStatus: (id: string, status: EventParticipant['status']) => Promise<void>;
    onLogMedicalIssue: (data: Partial<EventMedicalLog>) => Promise<void>;
}

export const RaceDayControl: React.FC<RaceDayControlProps> = ({
    eventStatus,
    onUpdateEventStatus,
    categories,
    participants,
    splits,
    onRecordSplit,
    onUpdateParticipantStatus,
    onLogMedicalIssue
}) => {
    const [selectedParticipantId, setSelectedParticipantId] = useState('');
    const [splitName, setSplitName] = useState('10K Split');
    const [splitDistance, setSplitDistance] = useState('10');
    const [splitTime, setSplitTime] = useState('00:45:00');

    // Medical Form State
    const [medParticipantId, setMedParticipantId] = useState('');
    const [medTent, setMedTent] = useState('Tent A');
    const [medDiagnosis, setMedDiagnosis] = useState('Dehydration');
    const [medTreatment, setMedTreatment] = useState('IV Fluids and rest');
    const [medStatus, setMedStatus] = useState<'treated_and_released' | 'under_observation' | 'referred_to_hospital'>('under_observation');

    const [isSimulating, setIsSimulating] = useState(false);

    // Filter participants that are started or checked_in
    const activeParticipantsForTiming = useMemo(() => {
        return participants.filter(p => p.status === 'started' || p.status === 'checked_in');
    }, [participants]);

    const activeParticipantsForMedical = useMemo(() => {
        return participants.filter(p => p.status === 'started' || p.status === 'completed' || p.status === 'checked_in');
    }, [participants]);

    const handleStartRace = async () => {
        if (confirm('Are you sure you want to start the race? This will update the event status to ACTIVE and mark all checked-in participants as STARTED.')) {
            await onUpdateEventStatus('active');
            // Update all checked_in participants to started
            const checkedIn = participants.filter(p => p.status === 'checked_in');
            for (const p of checkedIn) {
                await onUpdateParticipantStatus(p.id, 'started');
            }
        }
    };

    const handleEndRace = async () => {
        if (confirm('Are you sure you want to conclude the race? This will update the event status to COMPLETED.')) {
            await onUpdateEventStatus('completed');
        }
    };

    const handleTriggerSplit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParticipantId) return;

        setIsSimulating(true);

        try {
            await onRecordSplit({
                participantId: selectedParticipantId,
                splitName,
                distanceKm: parseFloat(splitDistance),
                timeElapsed: splitTime
            });

            // If split is finish, mark participant as completed
            if (splitName.toLowerCase().includes('finish')) {
                await onUpdateParticipantStatus(selectedParticipantId, 'completed');
            } else {
                await onUpdateParticipantStatus(selectedParticipantId, 'started');
            }

            // Select next split by default
            if (splitName === '10K Split') {
                setSplitName('Halfway Split');
                setSplitDistance('21.1');
                setSplitTime('01:35:00');
            } else if (splitName === 'Halfway Split') {
                setSplitName('30K Split');
                setSplitDistance('30');
                setSplitTime('02:18:00');
            } else if (splitName === '30K Split') {
                setSplitName('Finish Line');
                setSplitDistance('42.2');
                setSplitTime('03:15:00');
            }

            alert('Split point successfully registered!');
        } catch (err: any) {
            alert('Failed to record split: ' + err.message);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleMedicalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medParticipantId) return;

        try {
            await onLogMedicalIssue({
                participantId: medParticipantId,
                tentNumber: medTent,
                diagnosis: medDiagnosis,
                treatment: medTreatment,
                status: medStatus
            });
            alert('Medical incident successfully logged!');
            // Reset form
            setMedParticipantId('');
            setMedDiagnosis('Dehydration');
            setMedTreatment('IV Fluids and rest');
        } catch (err: any) {
            alert('Failed to log medical issue: ' + err.message);
        }
    };

    // Live metrics
    const stats = useMemo(() => {
        const total = participants.length;
        const started = participants.filter(p => p.status === 'started').length;
        const finished = participants.filter(p => p.status === 'completed').length;
        const dnf = participants.filter(p => p.status === 'dnf' || p.status === 'disqualified').length;
        return { total, started, finished, dnf };
    }, [participants]);

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -z-10"></div>
                
                <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Race Status</span>
                    <h3 className="text-xl font-bold flex items-center gap-2 mt-1">
                        {eventStatus === 'planning' && <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-black uppercase">Planning</span>}
                        {eventStatus === 'active' && <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-black uppercase animate-pulse">Live / Active</span>}
                        {eventStatus === 'completed' && <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-black uppercase">Concluded</span>}
                        {eventStatus === 'cancelled' && <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-black uppercase">Cancelled</span>}
                        Race Day Command Hub
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    {eventStatus === 'planning' && (
                        <button
                            onClick={handleStartRace}
                            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
                        >
                            <PlayIcon className="w-4 h-4" /> Start Official Race
                        </button>
                    )}
                    {eventStatus === 'active' && (
                        <button
                            onClick={handleEndRace}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
                        >
                            <CheckCircleIcon className="w-4 h-4" /> Conclude Official Race
                        </button>
                    )}
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase">Registered Runners</div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.total}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase">On Course</div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.started}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase">Finished</div>
                    <div className="text-2xl font-black text-green-600 mt-1">{stats.finished}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="text-xs text-slate-400 font-bold uppercase">DNF / Disqualified</div>
                    <div className="text-2xl font-black text-red-600 mt-1">{stats.dnf}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RFID Split Simulator */}
                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">RFID / Chip Simulation</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        In a real event, timing mats register BIB crossing events automatically. Use this panel to simulate a runner passing a timing checkpoint.
                    </p>

                    <form onSubmit={handleTriggerSplit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Select Runner</label>
                            <select
                                required
                                value={selectedParticipantId}
                                onChange={e => setSelectedParticipantId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">-- Choose Runner --</option>
                                {activeParticipantsForTiming.map(p => (
                                    <option key={p.id} value={p.id}>
                                        BIB {p.bibNumber || 'N/A'} - {p.firstName} {p.lastName} ({p.status.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Split Name</label>
                                <select
                                    value={splitName}
                                    onChange={e => {
                                        setSplitName(e.target.value);
                                        // Auto adjust distance for standard points
                                        if (e.target.value === '10K Split') { setSplitDistance('10'); setSplitTime('00:45:00'); }
                                        else if (e.target.value === 'Halfway Split') { setSplitDistance('21.1'); setSplitTime('01:35:00'); }
                                        else if (e.target.value === '30K Split') { setSplitDistance('30'); setSplitTime('02:18:00'); }
                                        else if (e.target.value === 'Finish Line') { setSplitDistance('42.2'); setSplitTime('03:15:00'); }
                                    }}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="10K Split">10K Split</option>
                                    <option value="Halfway Split">Halfway (21K)</option>
                                    <option value="30K Split">30K Split</option>
                                    <option value="Finish Line">Finish Line</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Distance (KM)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={splitDistance}
                                    onChange={e => setSplitDistance(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Elapsed Time</label>
                                <input
                                    type="text"
                                    required
                                    value={splitTime}
                                    onChange={e => setSplitTime(e.target.value)}
                                    placeholder="HH:MM:SS"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSimulating || !selectedParticipantId}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            <ClockIcon className="w-4 h-4" /> Log Mat Checkpoint
                        </button>
                    </form>
                </div>

                {/* Medical Emergency Command */}
                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangleIcon className="w-5 h-5" />
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Medical Desk Dispatcher</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Log issues observed by track marshals. Instantly directs first-aid responders to specific runner BIB numbers and coordinate treatment statuses.
                    </p>

                    <form onSubmit={handleMedicalSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Select Runner</label>
                                <select
                                    required
                                    value={medParticipantId}
                                    onChange={e => setMedParticipantId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Choose Runner --</option>
                                    {activeParticipantsForMedical.map(p => (
                                        <option key={p.id} value={p.id}>
                                            BIB {p.bibNumber || 'N/A'} - {p.firstName} {p.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tent Location</label>
                                <select
                                    value={medTent}
                                    onChange={e => setMedTent(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="Tent 1 (Start/Finish)">Tent 1 (Start/Finish)</option>
                                    <option value="Tent 2 (15KM)">Tent 2 (15KM)</option>
                                    <option value="Tent 3 (30KM)">Tent 3 (30KM)</option>
                                    <option value="Mobile Unit B">Mobile Unit B</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Observation / Diagnosis</label>
                                <input
                                    type="text"
                                    required
                                    value={medDiagnosis}
                                    onChange={e => setMedDiagnosis(e.target.value)}
                                    placeholder="e.g. Muscle cramp, Heat exhaustion"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Response Action</label>
                                <input
                                    type="text"
                                    value={medTreatment}
                                    onChange={e => setMedTreatment(e.target.value)}
                                    placeholder="e.g. Massaged and ice applied"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Patient Status</label>
                            <select
                                value={medStatus}
                                onChange={e => setMedStatus(e.target.value as any)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="under_observation">Under Observation ⚠️</option>
                                <option value="treated_and_released">Treated and Released ✅</option>
                                <option value="referred_to_hospital">Referred to Hospital (Critical) 🚨</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={!medParticipantId}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-all shadow-md"
                        >
                            Submit Medical Case
                        </button>
                    </form>
                </div>
            </div>

            {/* Live Runner Board */}
            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <MapIcon className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-bold">Track Runner Position Log</h4>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold">
                                <th className="pb-2">BIB</th>
                                <th className="pb-2">Runner</th>
                                <th className="pb-2">Category</th>
                                <th className="pb-2">Last Mat</th>
                                <th className="pb-2">Elapsed Time</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.filter(p => p.status !== 'registered' && p.status !== 'dns').map(p => {
                                const runnerSplits = splits.filter(s => s.participantId === p.id);
                                const lastSplit = runnerSplits.length > 0 ? runnerSplits[runnerSplits.length - 1] : null;

                                return (
                                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="py-3 font-mono font-bold text-slate-600 dark:text-slate-400">{p.bibNumber || 'N/A'}</td>
                                        <td className="py-3 font-bold text-slate-800 dark:text-white">{p.firstName} {p.lastName}</td>
                                        <td className="py-3 text-slate-500">{p.categoryName || 'General'}</td>
                                        <td className="py-3">
                                            {lastSplit ? (
                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded font-bold">
                                                    {lastSplit.splitName} ({Number(lastSplit.distanceKm)} KM)
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 font-mono text-slate-600 dark:text-slate-400">
                                            {lastSplit ? lastSplit.timeElapsed : '00:00:00'}
                                        </td>
                                        <td className="py-3">
                                            {p.status === 'started' && <span className="text-indigo-600 font-bold animate-pulse">Running</span>}
                                            {p.status === 'completed' && <span className="text-green-600 font-bold">Finished</span>}
                                            {p.status === 'dnf' && <span className="text-red-500 font-bold">DNF</span>}
                                            {p.status === 'disqualified' && <span className="text-red-700 font-black">DSQ</span>}
                                            {p.status === 'checked_in' && <span className="text-slate-500">At Start Line</span>}
                                        </td>
                                        <td className="py-3 text-right space-x-2">
                                            {p.status === 'started' && (
                                                <>
                                                    <button
                                                        onClick={() => onUpdateParticipantStatus(p.id, 'dnf')}
                                                        className="px-2 py-1 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 text-red-600 dark:text-red-400 font-bold rounded text-[10px]"
                                                    >
                                                        Mark DNF
                                                    </button>
                                                    <button
                                                        onClick={() => onUpdateParticipantStatus(p.id, 'disqualified')}
                                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded text-[10px]"
                                                    >
                                                        Disqualify
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {participants.filter(p => p.status !== 'registered' && p.status !== 'dns').length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        No runners started yet. Once checking in is complete and the race starts, runners will appear here.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
