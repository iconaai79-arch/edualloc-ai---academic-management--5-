import React, { useState, useMemo } from 'react';
import { EventCategory, EventParticipant, EventSplit } from '../../types';
import { SearchIcon, PrinterIcon, AwardIcon, ClockIcon, BarChart3Icon, AwardSymbol } from '../icons'; // Wait, let's make sure we use existing icons!
// We have: SearchIcon, PrinterIcon, SparklesIcon, ClockIcon, ChartBarIcon, CheckCircleIcon, XIcon, UserIcon, etc. Let's import those!
import { SearchIcon as LucideSearchIcon, PrinterIcon as LucidePrinterIcon, SparklesIcon, ClockIcon, ChartBarIcon, CheckCircleIcon, XIcon, UserIcon } from '../icons';

interface EventLeaderboardProps {
    categories: EventCategory[];
    participants: EventParticipant[];
    splits: EventSplit[];
    eventName: string;
}

export const EventLeaderboard: React.FC<EventLeaderboardProps> = ({
    categories,
    participants,
    splits,
    eventName
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
    const [activeDetailsParticipant, setActiveDetailsParticipant] = useState<EventParticipant | null>(null);
    const [activeCertParticipant, setActiveCertParticipant] = useState<EventParticipant | null>(null);

    const activeCategory = categories.find(c => c.id === selectedCategoryId);

    // Calculate ranking of completed runners for selected category
    const rankedRunners = useMemo(() => {
        const categoryParticipants = participants.filter(p => p.categoryId === selectedCategoryId);
        
        // Filter by completed status, or active started ones
        const list = categoryParticipants.filter(p => {
            const matchesSearch = (p.firstName + ' ' + p.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (p.bibNumber || '').includes(searchQuery);
            const matchesGender = genderFilter === 'all' ? true : p.gender === genderFilter;
            return matchesSearch && matchesGender;
        });

        // Sort runners
        // Completed runners go first, sorted by elapsed finish time
        // Then started runners, sorted by furthest split distance and elapsed time
        return list.map(p => {
            const runnerSplits = splits.filter(s => s.participantId === p.id);
            const finishSplit = runnerSplits.find(s => s.splitName.toLowerCase().includes('finish') || s.splitName.toLowerCase().includes('line'));
            const lastSplit = runnerSplits.length > 0 ? runnerSplits[runnerSplits.length - 1] : null;

            return {
                ...p,
                finishTime: finishSplit ? finishSplit.timeElapsed : null,
                lastDistance: lastSplit ? Number(lastSplit.distanceKm) : 0,
                lastTime: lastSplit ? lastSplit.timeElapsed : '99:99:99',
                splitsCount: runnerSplits.length
            };
        }).sort((a, b) => {
            // Completed runners sort by finish time
            if (a.status === 'completed' && b.status === 'completed') {
                return (a.finishTime || '99:99:99').localeCompare(b.finishTime || '99:99:99');
            }
            if (a.status === 'completed') return -1;
            if (b.status === 'completed') return 1;

            // Started runners sort by distance desc, then time asc
            if (a.status === 'started' && b.status === 'started') {
                if (b.lastDistance !== a.lastDistance) {
                    return b.lastDistance - a.lastDistance;
                }
                return a.lastTime.localeCompare(b.lastTime);
            }
            if (a.status === 'started') return -1;
            if (b.status === 'started') return 1;

            return 0;
        });
    }, [participants, splits, selectedCategoryId, searchQuery, genderFilter]);

    const handlePrintCertificate = (participant: EventParticipant) => {
        setActiveCertParticipant(participant);
        // Delay opening printing options window
        setTimeout(() => {
            const printContent = document.getElementById('certificate-print-area');
            if (printContent) {
                const originalTitle = document.title;
                document.title = `Finisher_Certificate_${participant.bibNumber}_${participant.firstName}`;
                window.print();
                document.title = originalTitle;
            }
        }, 300);
    };

    // Helper to calculate pace min/km
    const calculatePace = (timeStr: string, distanceKm: number) => {
        if (!timeStr || !distanceKm) return '-';
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;

        const totalMinutes = hours * 60 + minutes + seconds / 60;
        const paceDecimal = totalMinutes / distanceKm;
        const paceMins = Math.floor(paceDecimal);
        const paceSecs = Math.round((paceDecimal - paceMins) * 60);

        return `${paceMins}:${paceSecs < 10 ? '0' : ''}${paceSecs} /km`;
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Race Category</label>
                    <select
                        value={selectedCategoryId}
                        onChange={e => setSelectedCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name} ({cat.distanceKm}K)</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Gender</label>
                    <select
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>

                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Search Runner</label>
                    <LucideSearchIcon className="absolute left-3 bottom-3 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search name or BIB..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="text-right text-xs text-slate-400 font-bold py-2">
                    Showing {rankedRunners.length} Participants
                </div>
            </div>

            {/* Leaderboard Grid */}
            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <SparklesIcon className="w-5 h-5 text-amber-500" />
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Official Timing Results Leaderboard</h4>
                </div>

                <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="pb-3 text-center w-12">Rank</th>
                                <th className="pb-3 w-16">BIB</th>
                                <th className="pb-3">Runner</th>
                                <th className="pb-3">Gender</th>
                                <th className="pb-3">Last Checkpoint</th>
                                <th className="pb-3">Pace</th>
                                <th className="pb-3">Official Time</th>
                                <th className="pb-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankedRunners.map((runner, index) => {
                                const splitsCount = splits.filter(s => s.participantId === runner.id).length;
                                const isFinished = runner.status === 'completed';
                                
                                return (
                                    <tr 
                                        key={runner.id}
                                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                                        onClick={() => setActiveDetailsParticipant(runner)}
                                    >
                                        <td className="py-4 text-center font-black text-slate-900 dark:text-white">
                                            {isFinished ? (
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-[10px] ${
                                                    index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300' :
                                                    index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400 border border-slate-300' :
                                                    index === 2 ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-500 border border-amber-200' :
                                                    'bg-slate-50 text-slate-600 dark:bg-slate-900'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 font-mono font-bold text-slate-500 dark:text-slate-400">{runner.bibNumber || 'N/A'}</td>
                                        <td className="py-4 font-bold text-slate-800 dark:text-white">
                                            {runner.firstName} {runner.lastName}
                                        </td>
                                        <td className="py-4 text-slate-500 uppercase text-[10px] font-bold">{runner.gender || 'N/A'}</td>
                                        <td className="py-4">
                                            {runner.splitsCount > 0 ? (
                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded font-black text-[10px]">
                                                    Checkpoint {runner.splitsCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">Not started</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-slate-500 font-mono">
                                            {isFinished ? calculatePace(runner.finishTime || '', activeCategory?.distanceKm || 42.2) : '-'}
                                        </td>
                                        <td className="py-4 font-mono font-black text-slate-800 dark:text-white">
                                            {runner.status === 'completed' ? (
                                                <span className="text-green-600">{runner.finishTime}</span>
                                            ) : runner.status === 'started' ? (
                                                <span className="text-indigo-600 animate-pulse">Running ({runner.lastTime})</span>
                                            ) : (
                                                <span className="text-slate-400">{runner.status.toUpperCase()}</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right" onClick={e => e.stopPropagation()}>
                                            {isFinished && (
                                                <button
                                                    onClick={() => handlePrintCertificate(runner)}
                                                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold rounded-lg text-[10px] transition-all flex items-center gap-1 ml-auto"
                                                >
                                                    <LucidePrinterIcon className="w-3 h-3" /> Certificate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {rankedRunners.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        No finishers matching the selection. Once runners cross checkpoints and the finish line, standings will appear.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Finisher Details Modal */}
            {activeDetailsParticipant && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Split Breakdown</span>
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">BIB {activeDetailsParticipant.bibNumber} - {activeDetailsParticipant.firstName}</h3>
                            </div>
                            <button 
                                onClick={() => setActiveDetailsParticipant(null)}
                                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Overall Status</span>
                                    <span className="font-bold text-slate-800 dark:text-white uppercase">{activeDetailsParticipant.status}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Gender / Age</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{activeDetailsParticipant.gender} (Age {activeDetailsParticipant.age})</span>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-700" />
                            
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Checkpoint Splits</h5>
                                {splits.filter(s => s.participantId === activeDetailsParticipant.id).map((split, i) => (
                                    <div key={split.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 h-4 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center text-[9px] font-bold">{i+1}</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{split.splitName}</span>
                                            <span className="text-slate-400">({Number(split.distanceKm)} KM)</span>
                                        </div>
                                        <div className="font-mono font-bold text-slate-800 dark:text-white">
                                            {split.timeElapsed}
                                        </div>
                                    </div>
                                ))}
                                {splits.filter(s => s.participantId === activeDetailsParticipant.id).length === 0 && (
                                    <div className="text-center py-4 text-slate-400 text-xs">No split data recorded for this runner yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Finisher Certificate Print Node (Hidden normally, styled for window.print) */}
            {activeCertParticipant && (
                <div className="hidden">
                    <div id="certificate-print-area" className="p-16 border-[12px] border-amber-600 rounded-3xl bg-amber-50/20 text-center max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[500px] border-double select-none font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                        <div className="w-16 h-16 border-4 border-amber-600 rounded-full flex items-center justify-center mb-6 text-amber-600 mx-auto font-sans font-black text-lg">Certificate</div>
                        
                        <h1 className="text-4xl font-extrabold text-amber-800 uppercase tracking-widest mb-2" style={{ color: '#78350f' }}>Certificate of Completion</h1>
                        <p className="text-sm italic text-slate-500 mb-8">This certifies that</p>
                        
                        <h2 className="text-3xl font-bold text-slate-800 border-b-2 border-slate-300 pb-2 px-12 inline-block mb-6">{activeCertParticipant.firstName} {activeCertParticipant.lastName}</h2>
                        
                        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6 font-sans">
                            has successfully completed the <span className="font-bold text-slate-800">{eventName}</span>.
                        </p>

                        <div className="grid grid-cols-3 gap-8 w-full max-w-lg mt-8 text-center text-xs border-t border-slate-200 pt-8 font-sans">
                            <div>
                                <span className="block text-slate-400 uppercase tracking-wider text-[9px] font-bold">BIB Number</span>
                                <span className="font-mono text-lg font-black text-slate-800">{activeCertParticipant.bibNumber}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 uppercase tracking-wider text-[9px] font-bold">Race Distance</span>
                                <span className="text-lg font-bold text-slate-800">{activeCategory?.distanceKm} KM</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 uppercase tracking-wider text-[9px] font-bold">Official Finish Time</span>
                                <span className="font-mono text-lg font-black text-green-600">{rankedRunners.find(r => r.id === activeCertParticipant.id)?.finishTime}</span>
                            </div>
                        </div>

                        <div className="mt-16 flex justify-around w-full max-w-lg font-sans text-xs">
                            <div className="border-t border-slate-300 pt-2 px-6">
                                <span className="block italic text-[10px]">Race Director</span>
                                <span className="font-bold text-slate-700">EduAlloc AI Sports</span>
                            </div>
                            <div className="border-t border-slate-300 pt-2 px-6">
                                <span className="block italic text-[10px]">Date of Event</span>
                                <span className="font-bold text-slate-700">May 2026</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
